import { describe, expect, it } from "vitest"

import { createAgentNativeWorkspaceStore } from "../server/agentNativeWorkspaceStore"

describe("agent-native workspace store (FOX2-75 slice 2)", () => {
  it("round-trips state records per workspace key", () => {
    const store = createAgentNativeWorkspaceStore()
    expect(store.getStateRecord("canvas", "gallery-demo:canvas")).toBeNull()

    const record = store.upsertState(
      "canvas",
      "gallery-demo:canvas",
      { state: { items: [] }, stateSummary: { itemCount: 0 } },
      "client-1"
    )
    expect(record.workspaceKey).toBe("gallery-demo:canvas")
    expect(record.sourceClientId).toBe("client-1")

    const read = store.getStateRecord("canvas", "gallery-demo:canvas")
    expect(read?.payload.stateSummary.itemCount).toBe(0)
    // Different key, different record.
    expect(store.getStateRecord("canvas", "other:canvas")).toBeNull()
  })

  it("blank workspace keys normalize to 'default'", () => {
    const store = createAgentNativeWorkspaceStore()
    store.upsertState("canvas", "   ", { state: {} }, null)
    expect(store.getStateRecord("canvas", undefined)?.workspaceKey).toBe("default")
  })

  it("upserting state appends a state-synced event with the selection summary", () => {
    const store = createAgentNativeWorkspaceStore()
    store.upsertState("canvas", "k", {
      state: {},
      stateSummary: { itemCount: 3 },
      selection: { selectedNodeId: "node-9" },
    })

    const events = store.listEvents("canvas", "k")
    const synced = events.events.find(
      (event: { kind: string }) => event.kind === "state-synced"
    )
    expect(synced).toBeTruthy()
    expect(synced.stateSummary).toEqual({ itemCount: 3 })
    expect(synced.metadata.selectedNodeId).toBe("node-9")
  })

  it("appends, lists, and acknowledges operations through the event log", () => {
    const store = createAgentNativeWorkspaceStore()
    const appended = store.appendOperation(
      "canvas",
      "k",
      { type: "create_item", item: { id: "x" } },
      "client-1",
      "canvas-tool:create_item"
    )
    expect(appended.cursor).toBeGreaterThan(0)

    const pending = store.listPendingOperations("canvas", "k", 0)
    expect(pending.operations).toHaveLength(1)
    expect(pending.operations[0].operation.type).toBe("create_item")

    store.acknowledgeOperations("canvas", "k", appended.cursor)
    const afterAck = store.listPendingOperations("canvas", "k", 0)
    expect(afterAck.operations).toHaveLength(0)
  })

  it("derives the event actor the way the middleware always did", () => {
    const store = createAgentNativeWorkspaceStore()
    store.appendOperation("canvas", "k", { type: "select_items", ids: [] }, "client-1", null)
    store.appendOperation("canvas", "k", { type: "select_items", ids: [] }, null, "canvas-ui")
    store.appendOperation("canvas", "k", { type: "select_items", ids: [] }, null, null)

    const { events } = store.listEvents("canvas", "k")
    const actors = events
      .filter((event: { kind: string }) => event.kind === "operation-queued")
      .map((event: { actor: string }) => event.actor)
    expect(actors).toEqual(["agent", "agent", "system"])
  })
})
