import { Readable } from "node:stream"
import type { IncomingMessage, ServerResponse } from "node:http"

import { describe, expect, it, vi } from "vitest"

import { createCanvasToolRoutes } from "../server/canvasToolRoutes"

vi.mock("../server/mcpProxy/canvasMcpAppLog", () => ({
  applyCanvasMcpAppLogRequest: vi.fn(async (body: any) => ({
    ok: true,
    entries: [],
    echo: body,
  })),
}))

import { applyCanvasMcpAppLogRequest } from "../server/mcpProxy/canvasMcpAppLog"

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

function createHarness(overrides: Partial<Parameters<typeof createCanvasToolRoutes>[0]> = {}) {
  const handler = createCanvasToolRoutes({
    workspaceRoot: process.cwd(),
    projectsRoot: `${process.cwd()}/projects`,
    rejectIfNotLocalhost: () => null,
    compileReactCanvasPreview: async () => ({ html: "<div>ok</div>", ids: ["a"] }),
    readProjectSyncTarget: async () => null,
    writeProjectSyncTarget: async (_dir, _id, syncTarget) => syncTarget,
    revalidateSyncTargetRealpath: async () => ({ ok: true, resolvedRealPath: "/real" }),
    ...overrides,
  })
  return handler
}

async function call(
  handler: ReturnType<typeof createCanvasToolRoutes>,
  method: string,
  url: string,
  body?: unknown
) {
  const req = makeRequest(method, url, body)
  const { res, done } = makeResponse()
  const handled = await handler(req, res, new URL(url, "http://localhost").pathname)
  return { handled, response: handled ? await done : null }
}

describe("canvas tool routes (FOX2-75 slice 6)", () => {
  it("ignores paths outside the group", async () => {
    const handler = createHarness()
    expect((await call(handler, "GET", "/api/canvas-agent/agents")).handled).toBe(false)
    expect((await call(handler, "POST", "/api/projects/create")).handled).toBe(false)
  })

  it("reads AST/HTML nodes and 400s on missing fields", async () => {
    const handler = createHarness()

    const missing = await call(handler, "POST", "/api/canvas/ast/read", { canvasId: "c" })
    expect(missing.response?.statusCode).toBe(400)

    const html = await call(handler, "POST", "/api/canvas/ast/read", {
      sourceHtml: '<div data-canvas-id="node-1">hi</div>',
      canvasId: "c",
      sourceId: "node-1",
    })
    expect(html.response?.statusCode).toBe(200)
  })

  it("injects canvas ids into HTML sources", async () => {
    const handler = createHarness()
    const { response } = await call(handler, "POST", "/api/canvas/inject-html", {
      sourceHtml: "<section><button>Go</button></section>",
      sourceId: "src-1",
    })
    expect(response?.statusCode).toBe(200)
    expect(response?.json().html).toContain("data-canvas-id")
  })

  it("guards the high-risk endpoints with the injected localhost check", async () => {
    const handler = createHarness({ rejectIfNotLocalhost: () => "Blocked origin." })

    for (const [method, url] of [
      ["POST", "/api/canvas/project/sync"],
      ["POST", "/api/canvas/project/detect-components-dir"],
      ["POST", "/api/canvas/project/sync-target"],
      ["POST", "/api/canvas/mcp-app/connect"],
      ["POST", "/api/canvas/mcp-app/invoke-tool"],
      ["GET", "/api/canvas/mcp-app/log/node-1"],
    ] as const) {
      const { response } = await call(handler, method, url, {})
      expect(response?.statusCode, url).toBe(403)
      expect(response?.json().code, url).toBe("forbidden-origin")
    }
  })

  it("sync-target read returns the revalidated mapping", async () => {
    const handler = createHarness({
      readProjectSyncTarget: async () => ({ rootPath: "/ext/app" }),
    })

    const noProject = await call(handler, "POST", "/api/canvas/project/sync-target", {})
    expect(noProject.response?.statusCode).toBe(400)

    const { response } = await call(handler, "POST", "/api/canvas/project/sync-target", {
      projectId: "demo",
    })
    const payload = response?.json()
    expect(payload.syncTarget).toEqual({ rootPath: "/ext/app" })
    expect(payload.valid).toBe(true)
    expect(payload.resolvedRealPath).toBe("/real")
  })

  it("sync-target write recomputes the realpath server-side and rejects bad roots", async () => {
    const handler = createHarness()
    const { response } = await call(handler, "POST", "/api/canvas/project/sync-target", {
      projectId: "demo",
      mode: "write",
      syncTarget: { rootPath: "/definitely/not/a/real/path" },
    })
    expect(response?.statusCode).toBe(400)
    expect(response?.json().code).toBe("bad-input")
  })

  it("shapes mcp-app log GET params into the request body", async () => {
    const handler = createHarness()
    const { response } = await call(
      handler,
      "GET",
      "/api/canvas/mcp-app/log/node%2D9?projectId=demo&limit=5"
    )
    expect(response?.statusCode).toBe(200)
    expect(applyCanvasMcpAppLogRequest).toHaveBeenCalledWith({
      projectId: "demo",
      nodeId: "node-9",
      limit: 5,
    })
  })

  it("compiles React previews through the injected vite-coupled compiler", async () => {
    const handler = createHarness()
    const { response } = await call(handler, "POST", "/api/canvas/compile-react", {
      sourceReact: "export default () => <div/>",
    })
    expect(response?.statusCode).toBe(200)
    expect(response?.json().html).toBe("<div>ok</div>")
  })
})
