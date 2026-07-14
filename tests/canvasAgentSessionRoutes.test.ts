import { Readable } from "node:stream"
import type { IncomingMessage, ServerResponse } from "node:http"

import { describe, expect, it, vi } from "vitest"

import { createCanvasAgentProjectStore } from "../server/canvasAgentProjectStore"
import {
  createCanvasAgentSessionRoutes,
  type CanvasAgentSseClient,
} from "../server/canvasAgentSessionRoutes"

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

function makeResponse(): {
  res: ServerResponse
  done: Promise<CapturedResponse>
  writes: string[]
} {
  let statusCode = 0
  const writes: string[] = []
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
    write(chunk: unknown) {
      writes.push(String(chunk))
      return true
    },
    end(chunk?: unknown) {
      const body = chunk === undefined ? "" : String(chunk)
      resolve({ statusCode, json: () => JSON.parse(body) })
    },
  } as unknown as ServerResponse
  return { res, done, writes }
}

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    id: "session-1",
    projectId: "demo",
    status: "idle",
    launchCommand: "echo launch",
    cols: 120,
    rows: 32,
    ...overrides,
  }
}

function createHarness(overrides: Partial<Parameters<typeof createCanvasAgentSessionRoutes>[0]> = {}) {
  const session = makeSession()
  const pty = { write: vi.fn(), resize: vi.fn() }
  const clients = new Set<CanvasAgentSseClient>()
  const deps = {
    toolCommand: "canvas-agent",
    defaultTerminal: { cols: 120, rows: 32 },
    platform: "linux" as NodeJS.Platform,
    projectStore: createCanvasAgentProjectStore(),
    getSessions: vi.fn(() => [session]),
    findSession: vi.fn((id: string) => (id === session.id ? session : null)),
    createSession: vi.fn(async (input: any) => makeSession({ id: "session-2", ...input })),
    bootstrapSession: vi.fn(async () => ({ session, created: false })),
    startSession: vi.fn(async () => makeSession({ status: "running" })),
    stopSession: vi.fn(() => makeSession({ status: "stopped" })),
    updateSession: vi.fn((_id: string, updates: any) => makeSession(updates)),
    pushTranscript: vi.fn(),
    getTranscript: vi.fn(() => []),
    getSessionOutput: vi.fn(() => "output-text"),
    getSessionPty: vi.fn(() => pty as any),
    ensureSessionDir: vi.fn(async () => "/tmp/session-dir"),
    broadcastEvent: vi.fn(),
    getEventClients: vi.fn(() => clients),
    getWorkspaceDebug: vi.fn(() => ({ events: [] })),
    getStateHistory: vi.fn(() => []),
    ...overrides,
  }
  return { handler: createCanvasAgentSessionRoutes(deps), deps, session, pty, clients }
}

async function call(
  handler: ReturnType<typeof createCanvasAgentSessionRoutes>,
  method: string,
  url: string,
  body?: unknown
) {
  const req = makeRequest(method, url, body)
  const { res, done } = makeResponse()
  const handled = await handler(req, res, new URL(url, "http://localhost").pathname)
  return { handled, response: handled ? await done : null }
}

describe("canvas-agent session routes (FOX2-75 slice 5)", () => {
  it("ignores paths outside the group", async () => {
    const { handler } = createHarness()
    expect((await call(handler, "GET", "/api/canvas-agent/state?projectId=demo")).handled).toBe(
      false
    )
    expect((await call(handler, "GET", "/api/canvas-agent/agents")).handled).toBe(false)
  })

  it("lists sessions per project and requires projectId", async () => {
    const { handler } = createHarness()

    const missing = await call(handler, "GET", "/api/canvas-agent/sessions")
    expect(missing.response?.statusCode).toBe(400)

    const listed = await call(handler, "GET", "/api/canvas-agent/sessions?projectId=demo")
    expect(listed.response?.json().sessions).toHaveLength(1)
  })

  it("bootstraps with codex default agent and reuseSession default true", async () => {
    const { handler, deps } = createHarness()

    const { response } = await call(handler, "POST", "/api/canvas-agent/bootstrap", {
      projectId: "demo",
    })
    expect(response?.statusCode).toBe(200)
    expect(deps.bootstrapSession).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: "demo", agentId: "codex", reuseSession: true })
    )
  })

  it("creates sessions and broadcasts session-created", async () => {
    const { handler, deps } = createHarness()

    const invalid = await call(handler, "POST", "/api/canvas-agent/sessions", { projectId: "demo" })
    expect(invalid.response?.statusCode).toBe(400)

    const created = await call(handler, "POST", "/api/canvas-agent/sessions", {
      projectId: "demo",
      agentId: "claude",
    })
    expect(created.response?.statusCode).toBe(200)
    expect(deps.broadcastEvent).toHaveBeenCalledWith(
      "demo",
      "session-created",
      expect.objectContaining({ session: expect.objectContaining({ id: "session-2" }) })
    )
  })

  it("serves session output and 404s unknown sessions", async () => {
    const { handler } = createHarness()

    const found = await call(handler, "GET", "/api/canvas-agent/sessions/session-1/output")
    expect(found.response?.json().output).toBe("output-text")

    const missing = await call(handler, "GET", "/api/canvas-agent/sessions/nope/output")
    expect(missing.response?.statusCode).toBe(404)
  })

  it("rejects open-terminal off macOS without touching the filesystem", async () => {
    const { handler, deps } = createHarness({ platform: "linux" })
    const { response } = await call(
      handler,
      "POST",
      "/api/canvas-agent/sessions/session-1/open-terminal"
    )
    expect(response?.statusCode).toBe(400)
    expect(deps.ensureSessionDir).not.toHaveBeenCalled()
  })

  it("serves the debug payload with tool examples", async () => {
    const { handler } = createHarness()
    const { response } = await call(handler, "GET", "/api/canvas-agent/sessions/session-1/debug")
    const debug = response?.json().debug
    expect(debug.output).toBe("output-text")
    expect(debug.toolCommand).toBe("canvas-agent")
    expect(debug.toolExamples[0]).toContain("attach --project demo")
  })

  it("start failures push a transcript entry and mark the session errored", async () => {
    const { handler, deps } = createHarness({
      startSession: vi.fn(async () => {
        throw new Error("spawn failed")
      }),
    })

    const { response } = await call(handler, "POST", "/api/canvas-agent/sessions/session-1/start", {})
    expect(response?.statusCode).toBe(500)
    expect(deps.pushTranscript).toHaveBeenCalledWith("session-1", "session-error", "spawn failed")
    expect(deps.updateSession).toHaveBeenCalledWith(
      "session-1",
      expect.objectContaining({ status: "error", errorMessage: "spawn failed" })
    )
  })

  it("routes input and resize to the PTY, 409ing when not running", async () => {
    const { handler, pty } = createHarness()

    await call(handler, "POST", "/api/canvas-agent/sessions/session-1/input", { input: "ls\n" })
    expect(pty.write).toHaveBeenCalledWith("ls\n")

    const emptyInput = await call(handler, "POST", "/api/canvas-agent/sessions/session-1/input", {})
    expect(emptyInput.response?.statusCode).toBe(400)

    await call(handler, "POST", "/api/canvas-agent/sessions/session-1/resize", {
      cols: 10,
      rows: 4,
    })
    // Clamped to the 40x10 floor.
    expect(pty.resize).toHaveBeenCalledWith(40, 10)

    const { handler: stoppedHandler } = createHarness({ getSessionPty: () => undefined })
    const notRunning = await call(stoppedHandler, "POST", "/api/canvas-agent/sessions/session-1/input", {
      input: "x",
    })
    expect(notRunning.response?.statusCode).toBe(409)
  })

  it("opens an SSE stream, registers the client, and cleans up on close", async () => {
    const { handler, clients } = createHarness()

    const req = makeRequest("GET", "/api/canvas-agent/events?projectId=demo&clientId=client-7")
    const { res, writes } = makeResponse()
    const handled = await handler(
      req,
      res,
      new URL(req.url || "", "http://localhost").pathname
    )
    expect(handled).toBe(true)
    expect(res.statusCode).toBe(200)
    expect(clients.size).toBe(1)
    expect([...clients][0].id).toBe("client-7")
    expect(writes.join("")).toContain("event: hello")
    expect(writes.join("")).toContain('"projectId":"demo"')

    req.emit("close")
    expect(clients.size).toBe(0)
  })

  it("requires projectId for the SSE stream", async () => {
    const { handler } = createHarness()
    const { response } = await call(handler, "GET", "/api/canvas-agent/events")
    expect(response?.statusCode).toBe(400)
  })
})
