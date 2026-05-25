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
  const signature = buildSignature(transport.command, transport.args)
  if (BUILTIN_ALLOWED_TOKENS.some((token) => signature.includes(token))) return true
  return BUILTIN_ALLOWED_TOKENS.includes(transport.command.trim())
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
