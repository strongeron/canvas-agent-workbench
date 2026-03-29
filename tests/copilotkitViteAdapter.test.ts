import { Readable } from "node:stream"

import { CopilotRuntime, createCopilotEndpointSingleRoute } from "@copilotkitnext/runtime"
import { describe, expect, it, vi } from "vitest"

import {
  createCopilotViteMiddleware,
  createWebRequestFromNode,
} from "../utils/copilotkitViteAdapter"

function createNodeLikeRequest(options: {
  method?: string
  url?: string
  headers?: Record<string, string>
  body?: unknown
  streamBody?: string
  complete?: boolean
} = {}) {
  const req = Readable.from(
    options.streamBody ? [Buffer.from(options.streamBody, "utf8")] : []
  ) as Readable & {
    method?: string
    url?: string
    headers?: Record<string, string>
    socket?: { encrypted?: boolean }
    body?: unknown
    complete?: boolean
  }

  req.method = options.method ?? "POST"
  req.url = options.url ?? "/api/copilotkit"
  req.headers = {
    host: "localhost:5191",
    ...(options.headers ?? {}),
  }
  req.socket = { encrypted: false }
  req.complete = options.complete

  if (options.body !== undefined) {
    req.body = options.body
  }

  return req
}

async function invokeInfo(request: Request) {
  const app = createCopilotEndpointSingleRoute({
    runtime: new CopilotRuntime({ agents: {} }),
    basePath: "/api/copilotkit",
  })

  const response = await app.fetch(request)
  const payload = (await response.json()) as Record<string, unknown>

  return { response, payload }
}

describe("copilotkit vite adapter", () => {
  it("preserves unread JSON streams even when Vite marks the request complete", async () => {
    const nodeRequest = createNodeLikeRequest({
      headers: { "content-type": "application/json" },
      streamBody: JSON.stringify({ method: "info" }),
      complete: true,
    })

    const request = createWebRequestFromNode(nodeRequest as any)
    const { response, payload } = await invokeInfo(request)

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({
      version: expect.any(String),
      agents: {},
      audioFileTranscriptionEnabled: false,
    })
  })

  it("serializes parsed request bodies back into the single-route envelope", async () => {
    const nodeRequest = createNodeLikeRequest({
      body: { method: "info" },
    })

    const request = createWebRequestFromNode(nodeRequest as any)
    const { response, payload } = await invokeInfo(request)

    expect(request.headers.get("content-type")).toBe("application/json")
    expect(response.status).toBe(200)
    expect(payload.version).toEqual(expect.any(String))
  })

  it("passes through non-copilot requests without initializing the runtime", async () => {
    const ensureRuntime = vi.fn(async () => {})
    const sendJson = vi.fn()
    const next = vi.fn()
    const middleware = createCopilotViteMiddleware({
      ensureRuntime,
      getRuntimeHandler: () => null,
      getRuntimeError: () => null,
      sendJson,
    })

    await middleware({ url: "/api/other" } as any, {} as any, next)

    expect(ensureRuntime).not.toHaveBeenCalled()
    expect(sendJson).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledOnce()
    expect(next).toHaveBeenCalledWith()
  })

  it("returns a 501 response when the runtime did not initialize", async () => {
    const ensureRuntime = vi.fn(async () => {})
    const sendJson = vi.fn()
    const next = vi.fn()
    const middleware = createCopilotViteMiddleware({
      ensureRuntime,
      getRuntimeHandler: () => null,
      getRuntimeError: () => "Copilot provider missing",
      sendJson,
    })
    const res = {} as any

    await middleware({ url: "/api/copilotkit" } as any, res, next)

    expect(ensureRuntime).toHaveBeenCalledOnce()
    expect(sendJson).toHaveBeenCalledWith(res, 501, {
      error: "Copilot provider missing",
    })
    expect(next).not.toHaveBeenCalled()
  })
})
