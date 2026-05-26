import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"

import type {
  CanvasMcpStdioTransport,
  McpPromptDescriptor,
  McpResourceDescriptor,
  McpToolDescriptor,
} from "../../../utils/mcpApp"
import { buildSafeStdioEnv } from "./stdioEnv"

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

export class McpStdioProcess {
  private client: Client
  private transportInstance: StdioClientTransport | null = null
  status: "disconnected" | "connecting" | "connected" | "error" = "disconnected"
  lastError: string | null = null

  constructor(
    private transport: CanvasMcpStdioTransport,
    private options: {
      env?: Record<string, string>
    } = {}
  ) {
    this.client = new Client({ name: "canvas-mcp-app-proxy", version: "0.1.0" }, { capabilities: {} })
  }

  async connect() {
    this.status = "connecting"
    this.lastError = null
    try {
      const nextTransport = new StdioClientTransport({
        command: this.transport.command,
        args: this.transport.args,
        cwd: this.transport.cwd,
        env: buildSafeStdioEnv(this.options.env),
        stderr: "pipe",
      })
      nextTransport.onerror = (error: Error) => {
        this.status = "error"
        this.lastError = error.message
      }
      nextTransport.onclose = () => {
        if (this.status !== "error") this.status = "disconnected"
      }
      this.transportInstance = nextTransport
      await this.client.connect(nextTransport)
      this.status = "connected"
    } catch (error) {
      this.status = "error"
      this.lastError = error instanceof Error ? error.message : "Failed to connect stdio MCP process."
      throw error
    }
  }

  async disconnect() {
    await this.transportInstance?.close()
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

  get pid() {
    return this.transportInstance?.pid ?? null
  }
}
