import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"

import type {
  CanvasMcpHttpTransport,
  McpPromptDescriptor,
  McpResourceDescriptor,
  McpToolDescriptor,
} from "../../../utils/mcpApp"

// Strip request-smuggling primitives and other framing headers an attacker
// could inject through a stored credential object. Forwarding `Host` lets
// the caller pivot to an unrelated vhost; `Content-Length` /
// `Transfer-Encoding` enables request smuggling against upstream proxies;
// `Connection` / `Upgrade` can flip the connection into a different
// protocol mid-stream.
const HEADER_DENYLIST = new Set([
  "host",
  "content-length",
  "transfer-encoding",
  "connection",
  "upgrade",
  "te",
  "trailer",
  "proxy-connection",
  "expect",
])

// Conservative allowlist: things a real MCP server might legitimately
// require as auth / negotiation. Anything outside this list is dropped.
const HEADER_ALLOWLIST_PREFIXES = ["x-", "accept", "accept-"]
const HEADER_ALLOWLIST_EXACT = new Set(["authorization", "user-agent"])

function isAllowedHeaderName(name: string): boolean {
  const lower = name.toLowerCase()
  if (HEADER_DENYLIST.has(lower)) return false
  if (HEADER_ALLOWLIST_EXACT.has(lower)) return true
  return HEADER_ALLOWLIST_PREFIXES.some((prefix) => lower.startsWith(prefix))
}

export function filterHeaders(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [name, value] of Object.entries(headers)) {
    if (typeof name !== "string" || typeof value !== "string") continue
    if (!isAllowedHeaderName(name)) continue
    // Defense in depth: reject embedded CR / LF (header-splitting).
    if (/[\r\n]/.test(value)) continue
    out[name] = value
  }
  return out
}

function toHeaders(secret: string | Record<string, string> | undefined) {
  if (!secret) return undefined
  if (typeof secret === "string") return filterHeaders({ Authorization: secret })
  return filterHeaders(secret)
}

function mapTools(payload: any): McpToolDescriptor[] {
  return Array.isArray(payload?.tools)
    ? payload.tools.map((tool: any) => ({
        name: tool.name,
        description: tool.description,
        inputSchema:
          tool.inputSchema && typeof tool.inputSchema === "object" ? tool.inputSchema : undefined,
      }))
    : []
}

function mapResources(payload: any): McpResourceDescriptor[] {
  return Array.isArray(payload?.resources)
    ? payload.resources.map((resource: any) => ({
        uri: resource.uri,
        name: resource.name,
        title: resource.title,
        description: resource.description,
        mimeType: resource.mimeType,
      }))
    : []
}

function mapPrompts(payload: any): McpPromptDescriptor[] {
  return Array.isArray(payload?.prompts)
    ? payload.prompts.map((prompt: any) => ({
        name: prompt.name,
        title: prompt.title,
        description: prompt.description,
        arguments: Array.isArray(prompt.arguments) ? prompt.arguments : undefined,
      }))
    : []
}

export class McpHttpClient {
  private client: Client
  private transportInstance: any = null
  status: "disconnected" | "connecting" | "connected" | "error" = "disconnected"
  lastError: string | null = null

  constructor(
    private transport: CanvasMcpHttpTransport,
    private options: {
      secret?: string | Record<string, string>
      reconnect?: boolean
    } = {}
  ) {
    this.client = new Client({ name: "canvas-mcp-app-proxy", version: "0.1.0" }, { capabilities: {} })
  }

  private async connectWithTransport(kind: "streamable" | "sse") {
    const headers = toHeaders(this.options.secret)
    const url = new URL(this.transport.url)
    const transport =
      kind === "streamable"
        ? new StreamableHTTPClientTransport(url, {
            requestInit: headers ? { headers } : undefined,
          })
        : new SSEClientTransport(url, {
            requestInit: headers ? { headers } : undefined,
            eventSourceInit: headers ? { fetch: (input, init) => fetch(input, { ...init, headers }) } : undefined,
          })
    transport.onerror = (error: Error) => {
      this.status = "error"
      this.lastError = error.message
    }
    transport.onclose = () => {
      if (this.status !== "error") this.status = "disconnected"
    }
    await this.client.connect(transport)
    this.transportInstance = transport
  }

  async connect() {
    this.status = "connecting"
    this.lastError = null
    try {
      await this.connectWithTransport("streamable")
      this.status = "connected"
    } catch (streamableError) {
      try {
        await this.connectWithTransport("sse")
        this.status = "connected"
      } catch (sseError) {
        this.status = "error"
        this.lastError =
          sseError instanceof Error
            ? sseError.message
            : streamableError instanceof Error
              ? streamableError.message
              : "Failed to connect to MCP HTTP transport."
        throw sseError
      }
    }
  }

  async disconnect() {
    await this.transportInstance?.close?.()
    this.transportInstance = null
    this.status = "disconnected"
  }

  async listTools() {
    return mapTools(await this.client.listTools())
  }

  async listResources() {
    return mapResources(await this.client.listResources())
  }

  async listPrompts() {
    return mapPrompts(await this.client.listPrompts())
  }

  async callTool(toolName: string, args: Record<string, unknown>) {
    return this.client.callTool({ name: toolName, arguments: args })
  }
}
