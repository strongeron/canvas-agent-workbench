import { Readable } from "node:stream"
import type { IncomingMessage, ServerResponse } from "node:http"

import { describe, expect, it, vi } from "vitest"

import { createCanvasAgentRoutes } from "../server/canvasAgentRoutes"
import {
  createCanvasAgentProjectStore,
  type CanvasAgentProjectStateRecord,
} from "../server/canvasAgentProjectStore"

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
  json: () => any
}

function makeResponse(): { res: ServerResponse; done: Promise<CapturedResponse> } {
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
    setHeader() {},
    end(chunk?: unknown) {
      const body = chunk === undefined ? "" : String(chunk)
      resolve({ statusCode, json: () => JSON.parse(body) })
    },
  } as unknown as ServerResponse
  return { res, done }
}

function makeRecord(projectId: string, overrides: Partial<CanvasAgentProjectStateRecord> = {}) {
  return {
    projectId,
    state: { items: [], groups: [], nextZIndex: 1, selectedIds: [] },
    primitives: [],
    themeSnapshot: null,
    updatedAt: "2026-01-01T00:00:00.000Z",
    sourceClientId: null,
    ...overrides,
  }
}

function createHarness() {
  const projectStore = createCanvasAgentProjectStore()
  const upsertCanvasAgentState = vi.fn((projectId: string, state: any) => {
    const record = makeRecord(projectId, { state })
    projectStore.setState(projectId, record)
    return record
  })
  const applyCanvasAgentOperation = vi.fn(({ projectId }: { projectId: string }) =>
    makeRecord(projectId, { updatedAt: "2026-01-02T00:00:00.000Z" })
  )
  const handler = createCanvasAgentRoutes({
    projectStore,
    upsertCanvasAgentState,
    applyCanvasAgentOperation,
    buildCanvasAgentWorkspaceKeys: (projectId) => ({
      canvasWorkspaceKey: `gallery-${projectId}:canvas`,
    }),
    agentDefinitions: [{ id: "claude", label: "Claude Code" }],
  })
  return { handler, projectStore, upsertCanvasAgentState, applyCanvasAgentOperation }
}

async function call(
  handler: ReturnType<typeof createCanvasAgentRoutes>,
  method: string,
  url: string,
  body?: unknown
) {
  const req = makeRequest(method, url, body)
  const { res, done } = makeResponse()
  const handled = await handler(req, res, new URL(url, "http://localhost").pathname)
  return { handled, response: handled ? await done : null }
}

describe("canvas-agent routes (FOX2-75 slice 4)", () => {
  it("ignores paths outside the group, including session endpoints", async () => {
    const { handler } = createHarness()
    expect((await call(handler, "GET", "/api/canvas-agent/sessions")).handled).toBe(false)
    expect((await call(handler, "GET", "/api/canvas-agent/events?projectId=demo")).handled).toBe(
      false
    )
    expect((await call(handler, "GET", "/api/agent-native/manifest")).handled).toBe(false)
  })

  it("lists the injected agent definitions", async () => {
    const { handler } = createHarness()
    const { response } = await call(handler, "GET", "/api/canvas-agent/agents")
    expect(response?.statusCode).toBe(200)
    expect(response?.json().agents).toEqual([{ id: "claude", label: "Claude Code" }])
  })

  it("requires projectId on state reads and returns null state for unknown projects", async () => {
    const { handler } = createHarness()

    const missing = await call(handler, "GET", "/api/canvas-agent/state")
    expect(missing.response?.statusCode).toBe(400)

    const empty = await call(handler, "GET", "/api/canvas-agent/state?projectId=demo")
    expect(empty.response?.statusCode).toBe(200)
    expect(empty.response?.json().state).toBeNull()
    expect(empty.response?.json().primitives).toEqual([])
  })

  it("serves the stored state as a workspace resource", async () => {
    const { handler, projectStore } = createHarness()
    projectStore.setState(
      "demo",
      makeRecord("demo", {
        state: { items: [{ id: "a" }], groups: [], nextZIndex: 2, selectedIds: ["a"] },
        primitives: [{ id: "prim-1" }],
        sourceClientId: "browser-1",
      })
    )

    const { response } = await call(handler, "GET", "/api/canvas-agent/state?projectId=demo")
    const payload = response?.json()
    expect(payload.ok).toBe(true)
    expect(payload.state).toBeTruthy()
    expect(payload.primitives).toEqual([{ id: "prim-1" }])
    expect(payload.sourceClientId).toBe("browser-1")
  })

  it("syncs state through the session subsystem, unwrapping payload envelopes", async () => {
    const { handler, upsertCanvasAgentState } = createHarness()

    const posted = await call(handler, "POST", "/api/canvas-agent/state", {
      projectId: "demo",
      clientId: "browser-1",
      payload: {
        state: { items: [], groups: [], nextZIndex: 1, selectedIds: [] },
        primitives: [{ id: "p1" }],
        themeSnapshot: { themes: [] },
      },
      sessionId: "session-9",
      toolName: "sync_state",
    })
    expect(posted.response?.statusCode).toBe(200)
    expect(upsertCanvasAgentState).toHaveBeenCalledWith(
      "demo",
      { items: [], groups: [], nextZIndex: 1, selectedIds: [] },
      "browser-1",
      expect.objectContaining({
        primitives: [{ id: "p1" }],
        themeSnapshot: { themes: [] },
        sessionId: "session-9",
        toolName: "sync_state",
        source: "canvas-ui",
      })
    )

    const missingProject = await call(handler, "POST", "/api/canvas-agent/state", {})
    expect(missingProject.response?.statusCode).toBe(400)
  })

  it("routes operations through the FOX2-74 apply boundary and derives tool sources", async () => {
    const { handler, applyCanvasAgentOperation } = createHarness()

    const applied = await call(handler, "POST", "/api/canvas-agent/operations", {
      projectId: "demo",
      operation: { type: "create_item" },
      toolName: "create_item",
      sessionId: "session-9",
    })
    expect(applied.response?.statusCode).toBe(200)
    expect(applied.response?.json().updatedAt).toBe("2026-01-02T00:00:00.000Z")
    expect(applyCanvasAgentOperation).toHaveBeenCalledWith({
      projectId: "demo",
      operation: { type: "create_item" },
      clientId: null,
      sessionId: "session-9",
      source: "canvas-tool:create_item",
      toolName: "create_item",
    })

    const missingProject = await call(handler, "POST", "/api/canvas-agent/operations", {
      operation: { type: "create_item" },
    })
    expect(missingProject.response?.statusCode).toBe(400)
  })

  it("surfaces apply-boundary rejections as HTTP 400 (FOX2-72 regression shape)", async () => {
    const { handler, applyCanvasAgentOperation } = createHarness()
    applyCanvasAgentOperation.mockImplementation(() => {
      throw new Error("Rejected canvas operation: item.type is required.")
    })

    const rejected = await call(handler, "POST", "/api/canvas-agent/operations", {
      projectId: "demo",
      operation: { type: "create_item" },
    })
    expect(rejected.response?.statusCode).toBe(400)
    expect(rejected.response?.json().error).toContain("Rejected canvas operation")
  })
})

describe("canvas-agent project store", () => {
  it("round-trips state and primitives independently per project", () => {
    const store = createCanvasAgentProjectStore()
    expect(store.getState("a")).toBeNull()
    expect(store.getPrimitives("a")).toEqual([])

    store.setState("a", makeRecord("a"))
    store.setPrimitives("a", [{ id: "p" }])
    expect(store.getState("a")?.projectId).toBe("a")
    expect(store.getPrimitives("a")).toEqual([{ id: "p" }])
    expect(store.getState("b")).toBeNull()
  })
})
