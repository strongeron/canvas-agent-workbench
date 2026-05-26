import type { CanvasMcpStdioTransport } from "../../../utils/mcpApp"
import { readProjectMeta, writeProjectMetaAtomic } from "./projectMeta"

const BUILTIN_ALLOWED_TOKENS = [
  "@modelcontextprotocol/server-filesystem",
  "claude-code-mcp",
  "@modelcontextprotocol/server-zapier",
  "@linear/mcp-server",
]

function buildSignature(command: string, args: string[] = []) {
  return [command.trim(), ...args.map((arg) => arg.trim()).filter(Boolean)].filter(Boolean).join(" ")
}

export function isBuiltInAllowedTransport(transport: CanvasMcpStdioTransport) {
  // Exact-token match across the command + every arg. Using `signature.includes`
  // here would let a malicious caller smuggle a built-in token as a substring
  // (e.g. `claude-code-mcp-evil` would match `claude-code-mcp`). The signature
  // is still recorded for persistence; the allow check operates on discrete
  // tokens.
  const tokens = [transport.command, ...(transport.args ?? [])]
    .map((token) => token?.trim())
    .filter((token): token is string => Boolean(token))
  return tokens.some((token) => BUILTIN_ALLOWED_TOKENS.includes(token))
}

export async function readPersistedAllowlist(projectDir: string, projectId: string) {
  const meta = await readProjectMeta(projectDir, projectId)
  return Array.isArray(meta.mcpAppStdioAllowlist)
    ? meta.mcpAppStdioAllowlist.filter((entry): entry is string => typeof entry === "string" && !!entry.trim())
    : []
}

export async function isTransportAllowlisted(projectDir: string, projectId: string, transport: CanvasMcpStdioTransport) {
  if (isBuiltInAllowedTransport(transport)) return true
  const persisted = await readPersistedAllowlist(projectDir, projectId)
  const signature = buildSignature(transport.command, transport.args)
  return persisted.includes(signature)
}

export async function persistAllowlistedTransport(
  projectDir: string,
  projectId: string,
  transport: CanvasMcpStdioTransport
) {
  const signature = buildSignature(transport.command, transport.args)
  const meta = await readProjectMeta(projectDir, projectId)
  const current = Array.isArray(meta.mcpAppStdioAllowlist) ? meta.mcpAppStdioAllowlist : []
  if (current.includes(signature)) return signature
  await writeProjectMetaAtomic(projectDir, {
    ...meta,
    mcpAppStdioAllowlist: [...current, signature],
  })
  return signature
}

export function describeTransportSignature(transport: CanvasMcpStdioTransport) {
  return buildSignature(transport.command, transport.args)
}
