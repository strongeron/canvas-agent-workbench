import { describe, expect, it } from "vitest"

import {
  acknowledgeAgentNativeWorkspaceOperations,
  appendAgentNativeWorkspaceEvent,
  appendAgentNativeWorkspaceOperationEvent,
  createAgentNativeWorkspaceEventLog,
  listAgentNativeWorkspaceEvents,
  listPendingAgentNativeWorkspaceOperations,
} from "../utils/agentNativeWorkspaceEvents"

describe("agent native workspace events", () => {
  it("uses the event log as the source of truth for pending operations and acknowledgements", () => {
    const log = createAgentNativeWorkspaceEventLog("system-canvas", "gallery-demo:system-canvas")

    const operationOne = appendAgentNativeWorkspaceOperationEvent(log, {
      operation: {
        type: "generate-scale-graph",
      },
      sourceClientId: "session-1",
      source: "canvas-agent-cli",
      actor: "agent",
    })
    const operationTwo = appendAgentNativeWorkspaceOperationEvent(log, {
      operation: {
        type: "create-node",
        node: {
          id: "system-node-1",
          type: "semantic",
          label: "Agent Support",
          position: { x: 120, y: 80 },
        },
      },
      sourceClientId: "session-1",
      source: "canvas-agent-cli",
      actor: "agent",
    })

    const initialPending = listPendingAgentNativeWorkspaceOperations(log, 0)
    expect(initialPending.operations.map((entry) => entry.id)).toEqual([
      operationOne.id,
      operationTwo.id,
    ])

    appendAgentNativeWorkspaceEvent(log, {
      kind: "state-synced",
      actor: "agent",
      source: "workspace-sync",
      sourceClientId: "session-1",
      stateSummary: {
        nodeCount: 1,
        edgeCount: 0,
        selection: ["system-node-1"],
      },
      metadata: null,
    })

    acknowledgeAgentNativeWorkspaceOperations(log, operationTwo.cursor)

    const pendingAfterAck = listPendingAgentNativeWorkspaceOperations(log, 0)
    expect(pendingAfterAck.operations).toHaveLength(0)
    expect(log.appliedCursor).toBe(operationTwo.cursor)

    const eventsAfterAck = listAgentNativeWorkspaceEvents(log, 0, 20)
    expect(eventsAfterAck.events.some((entry) => entry.kind === "operation-applied")).toBe(true)
    expect(eventsAfterAck.events.some((entry) => entry.kind === "state-synced")).toBe(true)
  })
})
