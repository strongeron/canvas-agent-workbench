/**
 * Paper MCP client module (stdio transport).
 *
 * Provide the MCP server spec via env var:
 *
 *   PAPER_MCP_SERVER_SPEC=/path/to/paper_server.py
 *
 * This module spawns:
 *
 *   mcp run <spec> --transport stdio
 *
 * You can override the command/args:
 *
 *   PAPER_MCP_SERVER_COMMAND=/path/to/mcp
 *   PAPER_MCP_SERVER_ARGS_JSON='["run","/path/to/paper.py","--transport","stdio"]'
 *
 * Then run:
 *
 *   PAPER_MCP_SERVER_SPEC=/path/to/paper_server.py npm run dev:paper
 */

import { spawn } from "node:child_process"

const DEFAULT_PROTOCOL_VERSION = "2025-06-18"

let clientPromise = null

function parseJsonMaybe(value) {
  if (typeof value !== "string") return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function buildServerCommand() {
  const command = process.env.PAPER_MCP_SERVER_COMMAND || "mcp"
  const argsJson = parseJsonMaybe(process.env.PAPER_MCP_SERVER_ARGS_JSON)
  if (Array.isArray(argsJson) && argsJson.length > 0) {
    return { command, args: argsJson }
  }

  const argsRaw = process.env.PAPER_MCP_SERVER_ARGS
  if (typeof argsRaw === "string" && argsRaw.trim()) {
    return { command, args: argsRaw.trim().split(/\s+/g) }
  }

  const spec = process.env.PAPER_MCP_SERVER_SPEC
  if (!spec) {
    throw new Error(
      "Missing PAPER_MCP_SERVER_SPEC. Set a Paper MCP server spec path or provide PAPER_MCP_SERVER_ARGS(_JSON)."
    )
  }

  return {
    command,
    args: ["run", spec, "--transport", "stdio"],
  }
}

function unwrapToolResult(result) {
  if (!result || typeof result !== "object") return result
  if (Array.isArray(result.content) && result.content.length > 0) {
    const first = result.content[0]
    if (first?.type === "json" && first.json !== undefined) {
      return first.json
    }
    if (typeof first?.json !== "undefined") {
      return first.json
    }
    if (typeof first?.text === "string") {
      const trimmed = first.text.trim()
      if (
        (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
        (trimmed.startsWith("[") && trimmed.endsWith("]"))
      ) {
        const parsed = parseJsonMaybe(trimmed)
        if (parsed !== null) return parsed
      }
      return first.text
    }
  }
  if (result.data !== undefined) return result.data
  return result
}

function createMcpClient() {
  const { command, args } = buildServerCommand()
  const child = spawn(command, args, {
    stdio: ["pipe", "pipe", "pipe"],
    env: process.env,
  })

  let buffer = ""
  let nextId = 1
  let initialized = false
  const pending = new Map()

  const safeRejectAll = (error) => {
    for (const { reject } of pending.values()) {
      reject(error)
    }
    pending.clear()
  }

  child.stdout.setEncoding("utf8")
  child.stdout.on("data", (chunk) => {
    buffer += chunk
    let lineEnd = buffer.indexOf("\n")
    while (lineEnd >= 0) {
      const line = buffer.slice(0, lineEnd).trim()
      buffer = buffer.slice(lineEnd + 1)
      lineEnd = buffer.indexOf("\n")
      if (!line) continue
      let message
      try {
        message = JSON.parse(line)
      } catch (error) {
        console.warn("[paper mcp] Failed to parse message:", error)
        continue
      }

      if (message && typeof message.id !== "undefined") {
        const entry = pending.get(message.id)
        if (!entry) continue
        pending.delete(message.id)
        if (message.error) {
          entry.reject(new Error(message.error.message || "MCP error"))
        } else {
          entry.resolve(message.result)
        }
      }
    }
  })

  child.stderr.setEncoding("utf8")
  child.stderr.on("data", (chunk) => {
    const trimmed = String(chunk).trim()
    if (trimmed) {
      console.warn("[paper mcp]", trimmed)
    }
  })

  child.on("exit", (code) => {
    safeRejectAll(new Error(`Paper MCP process exited (${code ?? "unknown"})`))
  })

  function send(message) {
    child.stdin.write(`${JSON.stringify(message)}\n`)
  }

  function request(method, params) {
    return new Promise((resolve, reject) => {
      const id = nextId
      nextId += 1
      pending.set(id, { resolve, reject })
      send({ jsonrpc: "2.0", id, method, params })
    })
  }

  async function initialize() {
    if (initialized) return
    const protocolVersion = process.env.PAPER_MCP_PROTOCOL || DEFAULT_PROTOCOL_VERSION
    await request("initialize", {
      protocolVersion,
      capabilities: { extensions: { "io.modelcontextprotocol/ui": { mimeTypes: ["text/html;profile=mcp-app"] } } },
      clientInfo: { name: "gallery-poc", version: "0.1.0" },
    })
    send({ jsonrpc: "2.0", method: "notifications/initialized" })
    initialized = true
  }

  async function callTool(name, args) {
    await initialize()
    const result = await request("tools/call", {
      name,
      arguments: args ?? {},
    })
    if (result?.isError) {
      throw new Error(result?.error || "Paper MCP tool error")
    }
    return unwrapToolResult(result)
  }

  return { callTool }
}

async function getClient() {
  if (!clientPromise) {
    clientPromise = Promise.resolve(createMcpClient())
  }
  return clientPromise
}

function toolName(baseName) {
  const prefix = process.env.PAPER_MCP_TOOL_PREFIX || ""
  return `${prefix}${baseName}`
}

const paperClient = {
  async getBasicInfo() {
    const client = await getClient()
    return client.callTool(toolName("getBasicInfo"), {})
  },
  async getSelection() {
    const client = await getClient()
    return client.callTool(toolName("getSelection"), {})
  },
  async getNodeInfo(nodeId) {
    const client = await getClient()
    return client.callTool(toolName("getNodeInfo"), { nodeId })
  },
  async getChildren(nodeId) {
    const client = await getClient()
    return client.callTool(toolName("getChildren"), { nodeId })
  },
  async getScreenshot(nodeId) {
    const client = await getClient()
    return client.callTool(toolName("getScreenshot"), { nodeId })
  },
  async getJSX(nodeId, format) {
    const client = await getClient()
    const args = { nodeId }
    if (format) {
      args.format = format
    }
    return client.callTool(toolName("getJSX"), args)
  },
  async getComputedStyles(nodeIds) {
    const client = await getClient()
    return client.callTool(toolName("getComputedStyles"), { nodeIds })
  },
  async getFillImage(nodeId) {
    const client = await getClient()
    return client.callTool(toolName("getFillImage"), { nodeId })
  },
}

export default paperClient
