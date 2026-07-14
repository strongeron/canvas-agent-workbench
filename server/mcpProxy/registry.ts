import path from "node:path"

import type { CanvasMcpAppTransport, McpCallRecord } from "../../utils/mcpApp"
import { redactMcpValue } from "../../utils/mcpApp"
import { McpHttpClient } from "./McpHttpClient"
import { McpStdioProcess } from "./McpStdioProcess"
import { readMcpAppCreds } from "./projectMeta"
import { validateInFlightDepth } from "./recursionBound"

type McpConnection = McpHttpClient | McpStdioProcess

interface RegistryEntry {
  key: string
  projectId: string
  nodeId: string
  transport: CanvasMcpAppTransport
  connection: McpConnection
  recentCalls: McpCallRecord[]
  inflight: number
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

export const INVOKE_TIMEOUT_MS = 60_000
// Bounds the connect handshake (spawn/connect + the initial list calls).
// stdio has no internal timeout and HTTP's listTools is unbounded, so a slow
// or unresponsive MCP server would otherwise hold the HTTP request open
// indefinitely.
export const CONNECT_TIMEOUT_MS = 15_000

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`))
    }, ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })
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

  // If connect() or the initial list calls fail we MUST tear down the
  // partially-initialized transport — otherwise stdio child processes leak
  // and HTTP streams keep heartbeats running forever, eventually
  // exhausting file descriptors or sockets.
  try {
    await withTimeout(connection.connect(), CONNECT_TIMEOUT_MS, "mcp connect")
    const tools = await withTimeout(connection.listTools(), CONNECT_TIMEOUT_MS, "mcp listTools")
    const resources = await withTimeout(
      connection.listResources(),
      CONNECT_TIMEOUT_MS,
      "mcp listResources"
    ).catch(() => [])
    const prompts = await withTimeout(
      connection.listPrompts(),
      CONNECT_TIMEOUT_MS,
      "mcp listPrompts"
    ).catch(() => [])
    const entry: RegistryEntry = {
      key,
      projectId: input.projectId,
      nodeId: input.nodeId,
      transport: input.transport,
      connection,
      recentCalls: [],
      inflight: 0,
    }
    registry.set(key, entry)
    return {
      status: connection.status,
      tools,
      resources,
      prompts,
      lastError: connection.lastError,
    }
  } catch (error) {
    try {
      await connection.disconnect()
    } catch {
      // best-effort cleanup of the partial connection
    }
    throw error
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

  const depthGate = validateInFlightDepth(entry.inflight)
  if (!depthGate.ok) {
    const err = new Error(depthGate.error) as Error & { code?: string; status?: number }
    err.code = depthGate.code
    err.status = depthGate.status
    throw err
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
  entry.inflight += 1

  try {
    const result = await withTimeout(
      entry.connection.callTool(input.toolName, input.args),
      INVOKE_TIMEOUT_MS,
      `tool ${input.toolName}`
    )
    record.status = "success"
    record.finishedAt = new Date().toISOString()
    // Stored / log-exposed result must be redacted — the raw result may
    // contain tokens that the embedded server echoed back. The raw result
    // is still returned to the caller of this function (the agent that
    // initiated the invoke), so the agent receives the full body once,
    // but anything queried later through getMcpAppLog or recentCalls is
    // already scrubbed.
    record.result = redactMcpValue(result)
    return {
      result,
      recentCalls: entry.recentCalls,
    }
  } catch (error) {
    record.status = "error"
    record.finishedAt = new Date().toISOString()
    record.error = error instanceof Error ? error.message : "Tool invocation failed."
    throw error
  } finally {
    entry.inflight = Math.max(0, entry.inflight - 1)
  }
}

/**
 * Test-only: install a fake connection in the registry without exercising
 * real transport spawn / network. Returns a teardown function.
 */
export function __setRegistryEntryForTest(input: {
  projectId: string
  nodeId: string
  connection: {
    callTool: (toolName: string, args: Record<string, unknown>) => Promise<unknown>
    disconnect?: () => Promise<void>
  }
}) {
  const key = buildKey(input.projectId, input.nodeId)
  const entry: RegistryEntry = {
    key,
    projectId: input.projectId,
    nodeId: input.nodeId,
    transport: { kind: "http", url: "http://test.invalid" },
    connection: input.connection as unknown as McpConnection,
    recentCalls: [],
    inflight: 0,
  }
  registry.set(key, entry)
  return () => {
    registry.delete(key)
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
