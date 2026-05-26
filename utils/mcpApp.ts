export type McpAppTransportKind = "http" | "stdio"

export interface McpToolDescriptor {
  name: string
  description?: string
  inputSchema?: Record<string, unknown>
}

export interface McpResourceDescriptor {
  uri: string
  name?: string
  title?: string
  description?: string
  mimeType?: string
}

export interface McpPromptDescriptor {
  name: string
  title?: string
  description?: string
  arguments?: Array<{
    name: string
    description?: string
    required?: boolean
  }>
}

export interface McpCallRecord {
  id: string
  nodeId: string
  toolName: string
  status: "running" | "success" | "error"
  startedAt: string
  finishedAt?: string
  args?: Record<string, unknown>
  result?: unknown
  error?: string
}

export interface CanvasMcpHttpTransport {
  kind: "http"
  url: string
  headersRef?: string
}

export interface CanvasMcpStdioTransport {
  kind: "stdio"
  command: string
  args?: string[]
  envRef?: string
  cwd?: string
}

export type CanvasMcpAppTransport = CanvasMcpHttpTransport | CanvasMcpStdioTransport

export interface McpAppPreset {
  id: string
  label: string
  description: string
  transport: CanvasMcpAppTransport
}

export const MCP_APP_STDIO_PRESETS: McpAppPreset[] = [
  {
    id: "filesystem",
    label: "Filesystem MCP",
    description: "Local filesystem access via stdio.",
    transport: {
      kind: "stdio",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-filesystem"],
    },
  },
  {
    id: "claude-code",
    label: "Claude Code MCP",
    description: "Local Claude Code MCP bridge.",
    transport: {
      kind: "stdio",
      command: "claude-code-mcp",
      args: [],
    },
  },
]

export const MCP_APP_HTTP_PRESETS: McpAppPreset[] = [
  {
    id: "zapier",
    label: "Zapier MCP",
    description: "Hosted Zapier MCP endpoint.",
    transport: {
      kind: "http",
      url: "https://mcp.zapier.com",
    },
  },
  {
    id: "linear",
    label: "Linear MCP",
    description: "Hosted Linear MCP endpoint.",
    transport: {
      kind: "http",
      url: "https://mcp.linear.app",
    },
  },
]

export const MCP_APP_PRESETS: McpAppPreset[] = [
  ...MCP_APP_HTTP_PRESETS,
  ...MCP_APP_STDIO_PRESETS,
  {
    id: "custom-http",
    label: "Custom HTTP",
    description: "Any streamable HTTP or SSE MCP server.",
    transport: {
      kind: "http",
      url: "http://127.0.0.1:3001/mcp",
    },
  },
  {
    id: "custom-stdio",
    label: "Custom stdio",
    description: "Any stdio MCP command.",
    transport: {
      kind: "stdio",
      command: "",
      args: [],
    },
  },
]

const REDACT_FIELD_PATTERNS = [
  /token$/i,
  /api[-_]?key$/i,
  /secret$/i,
  /_token$/i,
  /password$/i,
  /^authorization$/i,
  /^cookie$/i,
  /private[-_]?key$/i,
  /client[-_]?secret$/i,
  /bearer$/i,
  /^session$/i,
  /[-_]session$/i,
  /access[-_]?token$/i,
  /refresh[-_]?token$/i,
]

export function isSecretLikeKey(key: string) {
  return REDACT_FIELD_PATTERNS.some((pattern) => pattern.test(key))
}

export function redactMcpValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => redactMcpValue(entry))
  }
  if (!value || typeof value !== "object") return value

  const redactedEntries = Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
    key,
    isSecretLikeKey(key) ? "[redacted]" : redactMcpValue(entry),
  ])
  return Object.fromEntries(redactedEntries)
}

export function normalizeMcpAppName(name: unknown, fallback = "MCP app") {
  return typeof name === "string" && name.trim() ? name.trim() : fallback
}

export function parseJsonObjectInput(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return {}
  const parsed = JSON.parse(trimmed)
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Tool arguments must be a JSON object.")
  }
  return parsed as Record<string, unknown>
}
