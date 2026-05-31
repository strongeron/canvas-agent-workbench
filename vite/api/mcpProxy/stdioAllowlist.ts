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

// Per-runner whitelist of flags permitted BEFORE the MCP server token.
// Everything else that is flag-shaped before the token is rejected, because
// fused payloads like `node --eval=<code>`, `python -c<code>`, or
// `npx --package=<evil>` would otherwise be skipped over and let a trailing
// allowed token satisfy the allowlist while the runner executes the smuggled
// code/package.
const RUNNER_PRETOKEN_FLAGS: Record<string, Set<string>> = {
  npx: new Set(["-y", "--yes"]),
  node: new Set(),
  bun: new Set(),
  deno: new Set(),
  python: new Set(),
  python3: new Set(),
}

// Resolve the first positional (the MCP server token) ONLY when every flag
// preceding it is in the runner's safe set. Returns undefined (→ reject) if any
// unrecognized flag precedes the token. `--flag=value` and attached short flags
// (`-c<code>`) are compared by their flag head so a fused payload cannot slip
// past as "just another flag to skip".
function resolveRunnerToken(runner: string, args: string[]): string | undefined {
  const safe = RUNNER_PRETOKEN_FLAGS[runner] ?? new Set<string>()
  for (const raw of args) {
    if (raw === undefined || raw === null) continue
    const token = String(raw).trim()
    if (!token) continue
    if (token.startsWith("-")) {
      const flagHead = token.split("=", 1)[0]
      if (!safe.has(flagHead)) return undefined
      continue
    }
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

  // Case 2: a safe runner launching an allowed token. Every flag preceding the
  // token must be in the runner's safe set, and the first positional MUST
  // exactly equal an allowed token. This blocks both
  // `sh -c "rm -rf ~" @modelcontextprotocol/server-filesystem` (sh is not a
  // runner) and `node --eval=<code> @modelcontextprotocol/server-filesystem`
  // (the unrecognized `--eval` flag before the token is rejected).
  if (!BUILTIN_ALLOWED_RUNNERS.has(command) && !BUILTIN_ALLOWED_RUNNERS.has(commandBase)) {
    return false
  }
  const runner = BUILTIN_ALLOWED_RUNNERS.has(command) ? command : commandBase
  const args = Array.isArray(transport.args) ? transport.args.map((arg) => String(arg ?? "")) : []
  const first = resolveRunnerToken(runner, args)
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
