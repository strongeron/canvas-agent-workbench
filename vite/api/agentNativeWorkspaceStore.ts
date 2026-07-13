import {
  acknowledgeAgentNativeWorkspaceOperations as acknowledgeWorkspaceEventOperations,
  appendAgentNativeWorkspaceEvent as appendWorkspaceEvent,
  appendAgentNativeWorkspaceOperationEvent,
  createAgentNativeWorkspaceEventLog,
  listAgentNativeWorkspaceEvents as listWorkspaceEvents,
  listPendingAgentNativeWorkspaceOperations,
} from "../../utils/agentNativeWorkspaceEvents"

export interface AgentNativeWorkspaceStateRecord {
  workspaceId: string
  workspaceKey: string
  payload: any
  updatedAt: string
  sourceClientId: string | null
}

export interface AgentNativeWorkspaceStore {
  getStateRecord(workspaceId: string, workspaceKey?: string | null): AgentNativeWorkspaceStateRecord | null
  upsertState(
    workspaceId: string,
    workspaceKey: string | null | undefined,
    payload: any,
    sourceClientId?: string | null,
    options?: { metadata?: Record<string, unknown> }
  ): AgentNativeWorkspaceStateRecord
  getEventLog(workspaceId: string, workspaceKey?: string | null): any
  listEvents(workspaceId: string, workspaceKey: string | null | undefined, cursor?: number, limit?: number): any
  appendOperation(
    workspaceId: string,
    workspaceKey: string | null | undefined,
    operation: unknown,
    sourceClientId?: string | null,
    source?: string | null,
    options?: {
      actor?: "user" | "agent" | "system"
      sessionId?: string | null
      metadata?: Record<string, unknown> | null
    }
  ): any
  listPendingOperations(workspaceId: string, workspaceKey?: string | null, cursor?: number): any
  acknowledgeOperations(workspaceId: string, workspaceKey?: string | null, cursor?: number): any
}

/**
 * The agent-native workspace store (FOX2-75 slice 2): per-workspace state
 * records and event logs, previously two bare Maps inline in vite.config.ts.
 * Still in-memory — but behind an interface, so persistence across
 * dev-server restarts becomes a swap of this factory rather than a hunt
 * through the middleware. Behavior is moved verbatim: upserting state also
 * appends a `state-synced` event carrying the payload's selection summary.
 */
export function createAgentNativeWorkspaceStore(): AgentNativeWorkspaceStore {
  const stateByKey = new Map<string, AgentNativeWorkspaceStateRecord>()
  const eventsByKey = new Map<string, any>()

  const storageKey = (workspaceId: string, workspaceKey?: string | null) =>
    `${workspaceId}:${workspaceKey || "default"}`

  const normalizeWorkspaceKey = (workspaceKey?: string | null) =>
    typeof workspaceKey === "string" && workspaceKey.trim() ? workspaceKey.trim() : "default"

  const getEventLog = (workspaceId: string, workspaceKey?: string | null) => {
    const normalizedWorkspaceKey = normalizeWorkspaceKey(workspaceKey)
    const key = storageKey(workspaceId, normalizedWorkspaceKey)
    if (!eventsByKey.has(key)) {
      eventsByKey.set(key, createAgentNativeWorkspaceEventLog(workspaceId, normalizedWorkspaceKey))
    }
    return eventsByKey.get(key)
  }

  return {
    getStateRecord(workspaceId, workspaceKey) {
      return stateByKey.get(storageKey(workspaceId, workspaceKey)) || null
    },

    upsertState(workspaceId, workspaceKey, payload, sourceClientId = null, options = {}) {
      const normalizedWorkspaceKey = normalizeWorkspaceKey(workspaceKey)
      const record: AgentNativeWorkspaceStateRecord = {
        workspaceId,
        workspaceKey: normalizedWorkspaceKey,
        payload,
        updatedAt: new Date().toISOString(),
        sourceClientId: sourceClientId || null,
      }
      stateByKey.set(storageKey(workspaceId, normalizedWorkspaceKey), record)
      appendWorkspaceEvent(getEventLog(workspaceId, normalizedWorkspaceKey), {
        kind: "state-synced",
        actor: sourceClientId ? "agent" : "system",
        source: "workspace-sync",
        sourceClientId: sourceClientId || null,
        stateSummary:
          payload?.stateSummary && typeof payload.stateSummary === "object"
            ? payload.stateSummary
            : null,
        metadata: {
          ...(options.metadata && typeof options.metadata === "object" ? options.metadata : {}),
          selectedNodeId:
            typeof payload?.selection?.selectedNodeId === "string"
              ? payload.selection.selectedNodeId
              : null,
          selectedEdgeId:
            typeof payload?.selection?.selectedEdgeId === "string"
              ? payload.selection.selectedEdgeId
              : null,
        },
      })
      return record
    },

    getEventLog,

    listEvents(workspaceId, workspaceKey, cursor = 0, limit = 100) {
      return listWorkspaceEvents(getEventLog(workspaceId, workspaceKey), cursor, limit)
    },

    appendOperation(workspaceId, workspaceKey, operation, sourceClientId = null, source = null, options = {}) {
      return appendAgentNativeWorkspaceOperationEvent(getEventLog(workspaceId, workspaceKey), {
        operation,
        sourceClientId:
          sourceClientId || (typeof options.sessionId === "string" ? options.sessionId : null),
        source: source || null,
        actor:
          options.actor ||
          (sourceClientId || options.sessionId || source === "canvas-ui" ? "agent" : "system"),
        metadata:
          options.metadata && typeof options.metadata === "object" ? options.metadata : null,
      })
    },

    listPendingOperations(workspaceId, workspaceKey, cursor = 0) {
      return listPendingAgentNativeWorkspaceOperations(getEventLog(workspaceId, workspaceKey), cursor)
    },

    acknowledgeOperations(workspaceId, workspaceKey, cursor = 0) {
      return acknowledgeWorkspaceEventOperations(getEventLog(workspaceId, workspaceKey), cursor)
    },
  }
}
