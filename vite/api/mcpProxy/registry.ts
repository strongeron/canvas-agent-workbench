import path from "node:path"

import type { CanvasMcpAppTransport, McpCallRecord } from "../../../utils/mcpApp"
import { McpHttpClient } from "./McpHttpClient"
import { McpStdioProcess } from "./McpStdioProcess"
import { readMcpAppCreds } from "./projectMeta"

type McpConnection = McpHttpClient | McpStdioProcess

interface RegistryEntry {
  key: string
  projectId: string
  nodeId: string
  transport: CanvasMcpAppTransport
  connection: McpConnection
  recentCalls: McpCallRecord[]
}

const registry = new Map<string, RegistryEntry>()

function buildKey(projectId: string, nodeId: string) {
  return `${projectId}:${nodeId}`
}

function pushRecentCall(entry: RegistryEntry, record: McpCallRecord) {
  entry.recentCalls = [record, ...entry.recentCalls].slice(0, 100)
}

async function resolveSecret(
  workspaceRoot: string,
  projectId: string,
  transport: CanvasMcpAppTransport
) {
  const ref = transport.kind === "http" ? transport.headersRef : transport.envRef
  if (!ref) return undefined
  const projectDir = path.join(workspaceRoot, "projects", projectId)
  const creds = await readMcpAppCreds(projectDir, projectId)
  return creds[ref]
}

export async function connectMcpAppNode(input: {
  workspaceRoot: string
  projectId: string
  nodeId: string
  transport: CanvasMcpAppTransport
}) {
  const key = buildKey(input.projectId, input.nodeId)
  if (registry.has(key)) {
    await disconnectMcpAppNode({ projectId: input.projectId, nodeId: input.nodeId })
  }
  const secret = await resolveSecret(input.workspaceRoot, input.projectId, input.transport)
  const connection =
    input.transport.kind === "http"
      ? new McpHttpClient(input.transport, { secret })
      : new McpStdioProcess(input.transport, {
          env: secret && typeof secret === "object" && !Array.isArray(secret) ? secret : undefined,
        })
  await connection.connect()
  const tools = await connection.listTools()
  const resources = await connection.listResources().catch(() => [])
  const prompts = await connection.listPrompts().catch(() => [])
  const entry: RegistryEntry = {
    key,
    projectId: input.projectId,
    nodeId: input.nodeId,
    transport: input.transport,
    connection,
    recentCalls: [],
  }
  registry.set(key, entry)
  return {
    status: connection.status,
    tools,
    resources,
    prompts,
    lastError: connection.lastError,
  }
}

export async function disconnectMcpAppNode(input: { projectId: string; nodeId: string }) {
  const key = buildKey(input.projectId, input.nodeId)
  const entry = registry.get(key)
  if (!entry) {
    return { ok: true, recentCalls: [] as McpCallRecord[] }
  }
  await entry.connection.disconnect()
  registry.delete(key)
  return {
    ok: true,
    recentCalls: entry.recentCalls,
  }
}

export function getMcpAppLog(projectId: string, nodeId: string, limit = 20) {
  const entry = registry.get(buildKey(projectId, nodeId))
  return entry ? entry.recentCalls.slice(0, limit) : []
}

export async function invokeMcpAppTool(input: {
  projectId: string
  nodeId: string
  toolName: string
  args: Record<string, unknown>
  redactedArgs: Record<string, unknown>
}) {
  const entry = registry.get(buildKey(input.projectId, input.nodeId))
  if (!entry) {
    throw new Error("MCP app node is not connected.")
  }

  const record: McpCallRecord = {
    id: `mcp-call-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    nodeId: input.nodeId,
    toolName: input.toolName,
    status: "running",
    startedAt: new Date().toISOString(),
    args: input.redactedArgs,
  }
  pushRecentCall(entry, record)

  try {
    const result = await entry.connection.callTool(input.toolName, input.args)
    record.status = "success"
    record.finishedAt = new Date().toISOString()
    record.result = result
    return {
      result,
      recentCalls: entry.recentCalls,
    }
  } catch (error) {
    record.status = "error"
    record.finishedAt = new Date().toISOString()
    record.error = error instanceof Error ? error.message : "Tool invocation failed."
    throw error
  }
}

export async function disconnectAllMcpApps() {
  const currentEntries = Array.from(registry.values())
  await Promise.all(
    currentEntries.map(async (entry) => {
      try {
        await entry.connection.disconnect()
      } catch {
        // best-effort shutdown
      }
    })
  )
  registry.clear()
}
