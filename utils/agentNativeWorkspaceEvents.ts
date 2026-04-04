import type { AgentNativeWorkspaceId, AgentWorkspaceEvent } from "../types/agentNative"

export interface AgentNativeWorkspaceEventRecord<TOperation = unknown> {
  id: string
  cursor: number
  workspaceId: AgentNativeWorkspaceId | string
  workspaceKey: string
  kind: AgentWorkspaceEvent<TOperation>["kind"]
  actor: AgentWorkspaceEvent<TOperation>["actor"]
  source: string
  createdAt: string
  sourceClientId?: string | null
  operation?: TOperation
  stateSummary?: AgentWorkspaceEvent<TOperation>["stateSummary"]
  metadata?: AgentWorkspaceEvent<TOperation>["metadata"]
}

export interface AgentNativeWorkspaceOperationRecord<TOperation = unknown> {
  id: string
  cursor: number
  workspaceId: AgentNativeWorkspaceId | string
  workspaceKey: string
  createdAt: string
  sourceClientId?: string | null
  source?: string | null
  operation: TOperation
}

export interface AgentNativeWorkspaceEventLog<TOperation = unknown> {
  workspaceId: AgentNativeWorkspaceId | string
  workspaceKey: string
  nextCursor: number
  appliedCursor: number
  events: AgentNativeWorkspaceEventRecord<TOperation>[]
}

export function createAgentNativeWorkspaceEventLog(
  workspaceId: AgentNativeWorkspaceId | string,
  workspaceKey: string
): AgentNativeWorkspaceEventLog {
  return {
    workspaceId,
    workspaceKey,
    nextCursor: 1,
    appliedCursor: 0,
    events: [],
  }
}

export function appendAgentNativeWorkspaceEvent<TOperation>(
  log: AgentNativeWorkspaceEventLog<TOperation>,
  event: Omit<
    AgentWorkspaceEvent<TOperation>,
    "workspaceId" | "workspaceKey" | "createdAt" | "id" | "cursor"
  >
): AgentNativeWorkspaceEventRecord<TOperation> {
  const cursor = log.nextCursor
  log.nextCursor += 1
  const record: AgentNativeWorkspaceEventRecord<TOperation> = {
    id: `${String(log.workspaceId)}-event-${cursor}`,
    cursor,
    workspaceId: log.workspaceId,
    workspaceKey: log.workspaceKey,
    createdAt: new Date().toISOString(),
    ...event,
  }
  log.events.push(record)
  if (log.events.length > 500) {
    log.events = log.events.slice(-500)
  }
  return record
}

export function appendAgentNativeWorkspaceOperationEvent<TOperation>(
  log: AgentNativeWorkspaceEventLog<TOperation>,
  input: {
    operation: TOperation
    sourceClientId?: string | null
    source?: string | null
    actor?: "user" | "agent" | "system"
    metadata?: Record<string, unknown> | null
  }
): AgentNativeWorkspaceOperationRecord<TOperation> {
  const event = appendAgentNativeWorkspaceEvent(log, {
    kind: "operation-queued",
    actor: input.actor ?? (input.sourceClientId ? "agent" : "system"),
    source: input.source || "agent-native-operation",
    sourceClientId: input.sourceClientId || null,
    operation: input.operation,
    metadata: input.metadata || null,
    stateSummary: null,
  })

  return {
    id: event.id,
    cursor: event.cursor,
    workspaceId: event.workspaceId,
    workspaceKey: event.workspaceKey,
    createdAt: event.createdAt,
    sourceClientId: event.sourceClientId || null,
    source: event.source || null,
    operation: input.operation,
  }
}

export function listAgentNativeWorkspaceEvents<TOperation>(
  log: AgentNativeWorkspaceEventLog<TOperation>,
  cursor = 0,
  limit = 100
) {
  const nextCursor = Number.isFinite(cursor) ? Number(cursor) : 0
  const nextLimit = Number.isFinite(limit) ? Math.max(1, Math.min(500, Number(limit))) : 100
  const events = log.events.filter((entry) => entry.cursor > nextCursor)
  return {
    events: events.slice(-nextLimit),
    cursor: Math.max(0, log.nextCursor - 1),
  }
}

export function listPendingAgentNativeWorkspaceOperations<TOperation>(
  log: AgentNativeWorkspaceEventLog<TOperation>,
  cursor = 0
) {
  const nextCursor = Number.isFinite(cursor) ? Number(cursor) : 0
  const effectiveCursor = Math.max(nextCursor, log.appliedCursor)
  const operations: AgentNativeWorkspaceOperationRecord<TOperation>[] = log.events
    .filter((entry) => entry.kind === "operation-queued" && entry.cursor > effectiveCursor)
    .map((entry) => ({
      id: entry.id,
      cursor: entry.cursor,
      workspaceId: entry.workspaceId,
      workspaceKey: entry.workspaceKey,
      createdAt: entry.createdAt,
      sourceClientId: entry.sourceClientId || null,
      source: entry.source || null,
      operation: entry.operation as TOperation,
    }))

  return {
    operations,
    cursor: Math.max(0, log.nextCursor - 1),
  }
}

export function acknowledgeAgentNativeWorkspaceOperations<TOperation>(
  log: AgentNativeWorkspaceEventLog<TOperation>,
  cursor = 0
) {
  const nextCursor = Number.isFinite(cursor) ? Number(cursor) : 0
  if (nextCursor <= log.appliedCursor) return log

  const acknowledgedOperations = log.events.filter(
    (entry) =>
      entry.kind === "operation-queued" &&
      entry.cursor > log.appliedCursor &&
      entry.cursor <= nextCursor
  )

  log.appliedCursor = nextCursor

  acknowledgedOperations.forEach((entry) => {
    appendAgentNativeWorkspaceEvent(log, {
      kind: "operation-applied",
      actor: entry.actor,
      source: entry.source || "agent-native-operation",
      sourceClientId: entry.sourceClientId || null,
      operation: entry.operation as TOperation,
      metadata: {
        operationId: entry.id,
      },
      stateSummary: null,
    })
  })

  return log
}
