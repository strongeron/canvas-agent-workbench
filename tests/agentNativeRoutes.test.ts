import { Readable } from "node:stream"
import type { IncomingMessage, ServerResponse } from "node:http"

import { describe, expect, it, vi } from "vitest"

import {
  buildCanvasStateSummary,
  buildWorkspaceDebugPayload,
  createAgentNativeRoutes,
  type CanvasAgentProjectStateRecord,
} from "../server/agentNativeRoutes"
import { createAgentNativeWorkspaceStore } from "../server/agentNativeWorkspaceStore"

function makeRequest(method: string, url: string, body?: unknown): IncomingMessage {
  const payload = body === undefined ? [] : [Buffer.from(JSON.stringify(body), "utf8")]
  const req = Readable.from(payload) as unknown as IncomingMessage
  req.method = method
  req.url = url
  req.headers = {}
  return req
}

interface CapturedResponse {
  statusCode: number
  headers: Record<string, string>
  json: () => any
}

function makeResponse(): { res: ServerResponse; done: Promise<CapturedResponse> } {
  const headers: Record<string, string> = {}
  let statusCode = 0
  let resolve: (value: CapturedResponse) => void
  const done = new Promise<CapturedResponse>((r) => {
    resolve = r
  })
  const res = {
    get statusCode() {
      return statusCode
    },
    set statusCode(value: number) {
      statusCode = value
    },
    setHeader(name: string, value: string) {
      headers[name.toLowerCase()] = value
    },
    end(chunk?: unknown) {
      const body = chunk === undefined ? "" : String(chunk)
      resolve({ statusCode, headers, json: () => JSON.parse(body) })
    },
  } as unknown as ServerResponse
  return { res, done }
}

function createHarness(overrides: Partial<Parameters<typeof createAgentNativeRoutes>[0]> = {}) {
  const store = createAgentNativeWorkspaceStore()
  const canvasStateByProject = new Map<string, CanvasAgentProjectStateRecord>()
  const upsertCanvasAgentState = vi.fn((projectId: string, state: any) => {
    const record = {
      projectId,
      state,
      primitives: [],
      themeSnapshot: null,
      updatedAt: new Date().toISOString(),
      sourceClientId: null,
    }
    canvasStateByProject.set(projectId, record)
    return record
  })
  const handler = createAgentNativeRoutes({
    store,
    getCanvasAgentState: (projectId) => canvasStateByProject.get(projectId) || null,
    upsertCanvasAgentState,
    buildCanvasAgentWorkspaceKeys: (projectId) => ({
      canvasWorkspaceKey: `canvas:${projectId}`,
    }),
    captureWorkspaceScreenshot: async () => ({ status: "unavailable" }),
    ...overrides,
  })
  return { handler, store, canvasStateByProject, upsertCanvasAgentState }
}

async function call(
  handler: ReturnType<typeof createAgentNativeRoutes>,
  method: string,
  url: string,
  body?: unknown
) {
  const req = makeRequest(method, url, body)
  const { res, done } = makeResponse()
  const handled = await handler(req, res, new URL(url, "http://localhost").pathname)
  return { handled, response: handled ? await done : null }
}

describe("agent-native routes (FOX2-75 slice 3)", () => {
  it("ignores paths outside the group", async () => {
    const { handler } = createHarness()
    expect((await call(handler, "GET", "/api/projects/list")).handled).toBe(false)
    expect((await call(handler, "GET", "/api/canvas-agent/state")).handled).toBe(false)
    expect(
      (await call(handler, "GET", "/api/agent-native/workspaces/canvas/unknown-resource")).handled
    ).toBe(false)
  })

  it("serves the global agent-native manifest", async () => {
    const { handler } = createHarness()
    const { response } = await call(handler, "GET", "/api/agent-native/manifest")
    expect(response?.statusCode).toBe(200)
    const payload = response?.json()
    expect(payload.ok).toBe(true)
    expect(payload.manifest).toBeTruthy()
  })

  it("round-trips store-backed workspace state and records the sync event", async () => {
    const { handler } = createHarness()

    const posted = await call(handler, "POST", "/api/agent-native/workspaces/color-audit/state", {
      workspaceKey: "audit-1",
      payload: { stateSummary: { itemCount: 2 }, exportPreview: { tokens: 3 } },
      clientId: "client-a",
    })
    expect(posted.response?.statusCode).toBe(200)
    expect(posted.response?.json().ok).toBe(true)

    const read = await call(
      handler,
      "GET",
      "/api/agent-native/workspaces/color-audit/state?workspaceKey=audit-1"
    )
    expect(read.response?.json().state.exportPreview).toEqual({ tokens: 3 })

    const events = await call(
      handler,
      "GET",
      "/api/agent-native/workspaces/color-audit/events?workspaceKey=audit-1"
    )
    const kinds = events.response?.json().events.map((e: { kind: string }) => e.kind)
    expect(kinds).toContain("state-synced")
  })

  it("rejects state syncs without workspaceKey or payload", async () => {
    const { handler } = createHarness()

    const noKey = await call(handler, "POST", "/api/agent-native/workspaces/color-audit/state", {
      payload: { a: 1 },
    })
    expect(noKey.response?.statusCode).toBe(400)

    const noPayload = await call(
      handler,
      "POST",
      "/api/agent-native/workspaces/color-audit/state",
      { workspaceKey: "audit-1" }
    )
    expect(noPayload.response?.statusCode).toBe(400)
  })

  it("queues and lists operations for operable workspaces only", async () => {
    const { handler } = createHarness()

    const queued = await call(
      handler,
      "POST",
      "/api/agent-native/workspaces/color-audit/operations",
      { workspaceKey: "audit-1", operation: { type: "set-status" }, clientId: "agent-1" }
    )
    expect(queued.response?.statusCode).toBe(200)
    expect(queued.response?.json().operationId).toBeTruthy()

    const listed = await call(
      handler,
      "GET",
      "/api/agent-native/workspaces/color-audit/operations?workspaceKey=audit-1"
    )
    expect(listed.response?.json().operations).toHaveLength(1)

    const missingOperation = await call(
      handler,
      "POST",
      "/api/agent-native/workspaces/color-audit/operations",
      { workspaceKey: "audit-1" }
    )
    expect(missingOperation.response?.statusCode).toBe(400)

    const unsupported = await call(
      handler,
      "POST",
      "/api/agent-native/workspaces/canvas/operations",
      { workspaceKey: "canvas:demo", operation: { type: "noop" } }
    )
    expect(unsupported.response?.statusCode).toBe(404)
  })

  it("acknowledges applied operations reported with a state sync", async () => {
    const { handler, store } = createHarness()

    const queued = await call(
      handler,
      "POST",
      "/api/agent-native/workspaces/color-audit/operations",
      { workspaceKey: "audit-1", operation: { type: "set-status" } }
    )
    const cursor = queued.response?.json().cursor

    await call(handler, "POST", "/api/agent-native/workspaces/color-audit/state", {
      workspaceKey: "audit-1",
      payload: { stateSummary: {} },
      appliedOperationCursor: cursor,
    })

    const pending = store.listPendingOperations("color-audit", "audit-1")
    expect(pending.operations).toHaveLength(0)
  })

  it("accepts semantic user events and skips malformed entries", async () => {
    const { handler } = createHarness()

    const posted = await call(
      handler,
      "POST",
      "/api/agent-native/workspaces/system-canvas/user-events",
      {
        workspaceKey: "sys-1",
        clientId: "browser-1",
        events: [
          { action: "move-node", kind: "user-action", payload: { nodeId: "n1" } },
          { kind: "user-action" },
          { action: "edit-source", kind: "not-a-kind" },
        ],
      }
    )
    expect(posted.response?.statusCode).toBe(200)
    expect(posted.response?.json().accepted).toHaveLength(2)

    const events = await call(
      handler,
      "GET",
      "/api/agent-native/workspaces/system-canvas/events?workspaceKey=sys-1"
    )
    const userEvents = events.response?.json().events.filter(
      (e: { actor: string }) => e.actor === "user"
    )
    expect(userEvents).toHaveLength(2)
    expect(userEvents[1].kind).toBe("user-action")
  })

  it("routes canvas state writes through the session subsystem", async () => {
    const { handler, upsertCanvasAgentState } = createHarness()

    const posted = await call(
      handler,
      "POST",
      "/api/agent-native/workspaces/canvas/state?projectId=demo",
      {
        workspaceKey: "canvas:demo",
        payload: { state: { items: [], selectedIds: [] }, source: "canvas-ui" },
        clientId: "browser-1",
      }
    )
    expect(posted.response?.statusCode).toBe(200)
    expect(upsertCanvasAgentState).toHaveBeenCalledWith(
      "demo",
      { items: [], selectedIds: [] },
      "browser-1",
      expect.objectContaining({ source: "canvas-ui" })
    )
  })

  it("falls back to the legacy canvas-agent state when the store is empty", async () => {
    const { handler, canvasStateByProject } = createHarness()
    canvasStateByProject.set("demo", {
      projectId: "demo",
      state: { items: [{ id: "item-1" }], groups: [], selectedIds: ["item-1"] },
      primitives: [{ id: "prim-1" }],
      themeSnapshot: null,
      updatedAt: "2026-01-01T00:00:00.000Z",
      sourceClientId: null,
    })

    const state = await call(
      handler,
      "GET",
      "/api/agent-native/workspaces/canvas/state?projectId=demo"
    )
    expect(state.response?.statusCode).toBe(200)
    expect(state.response?.json().state).toBeTruthy()
    expect(state.response?.json().updatedAt).toBe("2026-01-01T00:00:00.000Z")

    const selection = await call(
      handler,
      "GET",
      "/api/agent-native/workspaces/canvas/selection?projectId=demo"
    )
    expect(selection.response?.json().selection).toEqual(["item-1"])

    const primitives = await call(
      handler,
      "GET",
      "/api/agent-native/workspaces/canvas/primitives?projectId=demo"
    )
    expect(primitives.response?.json().primitives).toEqual([{ id: "prim-1" }])
  })

  it("scopes workspace-specific resources with 404s", async () => {
    const { handler } = createHarness()

    const selection = await call(
      handler,
      "GET",
      "/api/agent-native/workspaces/color-audit/selection"
    )
    expect(selection.response?.statusCode).toBe(404)

    const sections = await call(
      handler,
      "GET",
      "/api/agent-native/workspaces/color-audit/sections"
    )
    expect(sections.response?.statusCode).toBe(404)

    const exportPreview = await call(
      handler,
      "GET",
      "/api/agent-native/workspaces/canvas/export-preview"
    )
    expect(exportPreview.response?.statusCode).toBe(404)

    const manifest = await call(
      handler,
      "GET",
      "/api/agent-native/workspaces/not-a-workspace/manifest"
    )
    expect(manifest.response?.statusCode).toBe(404)
  })

  it("serves per-workspace manifests", async () => {
    const { handler } = createHarness()
    for (const workspaceId of ["canvas", "color-audit", "system-canvas"]) {
      const { response } = await call(
        handler,
        "GET",
        `/api/agent-native/workspaces/${workspaceId}/manifest`
      )
      expect(response?.statusCode).toBe(200)
      expect(response?.json().manifest).toBeTruthy()
    }
  })

  it("builds the debug payload with pending-operation counts", async () => {
    const { handler, store } = createHarness()

    await call(handler, "POST", "/api/agent-native/workspaces/color-audit/operations", {
      workspaceKey: "audit-1",
      operation: { type: "set-status" },
    })

    const debug = await call(
      handler,
      "GET",
      "/api/agent-native/workspaces/color-audit/debug?workspaceKey=audit-1"
    )
    expect(debug.response?.statusCode).toBe(200)
    expect(debug.response?.json().debug.pendingOperationCount).toBe(1)

    const record = store.getStateRecord("color-audit", "audit-1")
    const direct = buildWorkspaceDebugPayload(store, "color-audit", "audit-1", record)
    expect(direct.pendingOperationCount).toBe(1)
  })

  it("reports screenshot capture availability from the injected capturer", async () => {
    const { handler } = createHarness({
      captureWorkspaceScreenshot: async () => ({ status: "ready", url: "/shot.png" }),
    })
    const ready = await call(
      handler,
      "POST",
      "/api/agent-native/workspaces/canvas/screenshot",
      { projectId: "demo" }
    )
    expect(ready.response?.statusCode).toBe(200)
    expect(ready.response?.json().capture.url).toBe("/shot.png")

    const { handler: unavailableHandler } = createHarness()
    const unavailable = await call(
      unavailableHandler,
      "POST",
      "/api/agent-native/workspaces/canvas/screenshot",
      { projectId: "demo" }
    )
    expect(unavailable.response?.statusCode).toBe(501)
  })

  it("summarizes canvas state shapes defensively", () => {
    expect(buildCanvasStateSummary(null)).toEqual({ itemCount: 0, groupCount: 0, selection: [] })
    expect(
      buildCanvasStateSummary({ items: [1, 2], groups: [1], selectedIds: ["a"] })
    ).toEqual({ itemCount: 2, groupCount: 1, selection: ["a"] })
  })
})
