import type { CanvasMcpStdioTransport } from "../../../utils/mcpApp"
import { readProjectMeta, writeProjectMetaAtomic } from "./projectMeta"

const BUILTIN_ALLOWED_TOKENS = [
  "@modelcontextprotocol/server-filesystem",
  "claude-code-mcp",
  "@modelcontextprotocol/server-zapier",
  "@linear/mcp-server",
]

// Safe runners that may be used to launch a built-in MCP server token. A bare
// `sh`, `bash`, `zsh`, `env`, etc. is NOT in this list — those let a caller
// smuggle arbitrary shell commands as args.
const BUILTIN_ALLOWED_RUNNERS = new Set([
  "npx",
  "node",
  "bun",
  "deno",
  "python3",
  "python",
])

function buildSignature(command: string, args: string[] = []) {
  return [command.trim(), ...args.map((arg) => arg.trim()).filter(Boolean)].filter(Boolean).join(" ")
}

function basenameOf(commandPath: string) {
  // Path-traversal-safe: just strip everything up to the last `/` or `\`.
  const trimmed = commandPath.trim()
  const idx = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"))
  return idx >= 0 ? trimmed.slice(idx + 1) : trimmed
}

function firstPositionalArg(args: string[]): string | undefined {
  // Skip well-known npx/runner flags and any flag-prefixed token.
  for (const raw of args) {
    if (raw === undefined || raw === null) continue
    const token = String(raw).trim()
    if (!token) continue
    if (token === "-y" || token === "--yes") continue
    if (token.startsWith("-")) continue
    return token
  }
  return undefined
}

export function isBuiltInAllowedTransport(transport: CanvasMcpStdioTransport) {
  const command = transport.command?.trim() ?? ""
  if (!command) return false
  const commandBase = basenameOf(command)

  // Case 1: direct invocation of an allowed token as the command itself
  // (e.g. `{ command: "claude-code-mcp", args: [] }`). The command must
  // exactly equal an allowed token — substring match would reintroduce the
  // CVE.
  if (BUILTIN_ALLOWED_TOKENS.includes(command) || BUILTIN_ALLOWED_TOKENS.includes(commandBase)) {
    return true
  }

  // Case 2: a safe runner launching an allowed token. The first NON-FLAG
  // positional argument (after stripping `-y`/`--yes`/flag-prefixed args)
  // MUST exactly equal an allowed token. This blocks
  // `sh -c "rm -rf ~" @modelcontextprotocol/server-filesystem`-style
  // smuggling because (a) `sh` is not a runner, and (b) even if it were,
  // the first positional arg would be `rm -rf ~`, not the token.
  if (!BUILTIN_ALLOWED_RUNNERS.has(command) && !BUILTIN_ALLOWED_RUNNERS.has(commandBase)) {
    return false
  }
  const args = Array.isArray(transport.args) ? transport.args.map((arg) => String(arg ?? "")) : []
  const first = firstPositionalArg(args)
  return Boolean(first && BUILTIN_ALLOWED_TOKENS.includes(first))
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
