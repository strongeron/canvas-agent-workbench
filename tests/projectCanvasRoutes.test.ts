import os from "node:os"
import path from "node:path"
import { promises as fs } from "node:fs"
import { Readable } from "node:stream"
import type { IncomingMessage, ServerResponse } from "node:http"

import { afterEach, describe, expect, it } from "vitest"

import { createProjectCanvasRoutes } from "../server/projectCanvasRoutes"

const tempDirs: string[] = []

async function createFixtureRoots() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "canvas-routes-"))
  tempDirs.push(root)
  const projectsRoot = path.join(root, "projects")
  const mediaStoreDir = path.join(root, ".canvas-media")
  await fs.mkdir(path.join(projectsRoot, "demo"), { recursive: true })
  await fs.mkdir(mediaStoreDir, { recursive: true })
  return { projectsRoot, mediaStoreDir }
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0, tempDirs.length).map((dir) => fs.rm(dir, { recursive: true, force: true }))
  )
})

function makeRequest(method: string, url: string, body?: unknown): IncomingMessage {
  const payload = body === undefined ? [] : [Buffer.from(JSON.stringify(body), "utf8")]
  const req = Readable.from(payload) as unknown as IncomingMessage
  req.method = method
  req.url = url
  return req
}

interface CapturedResponse {
  statusCode: number
  headers: Record<string, string>
  body: Buffer
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
      const body =
        chunk === undefined
          ? Buffer.alloc(0)
          : Buffer.isBuffer(chunk)
            ? chunk
            : Buffer.from(String(chunk), "utf8")
      resolve({ statusCode, headers, body, json: () => JSON.parse(body.toString("utf8")) })
    },
  } as unknown as ServerResponse
  return { res, done }
}

async function call(
  handler: ReturnType<typeof createProjectCanvasRoutes>,
  method: string,
  url: string,
  body?: unknown
) {
  const req = makeRequest(method, url, body)
  const { res, done } = makeResponse()
  const handled = await handler(req, res, new URL(url, "http://localhost").pathname)
  return { handled, response: handled ? await done : null }
}

// 1×1 transparent PNG.
const PNG_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

describe("project canvas routes (FOX2-75 slice 1)", () => {
  it("ignores paths outside the group", async () => {
    const { projectsRoot, mediaStoreDir } = await createFixtureRoots()
    const handler = createProjectCanvasRoutes({ projectsRoot, mediaStoreDir })

    const { handled } = await call(handler, "GET", "/api/projects/list")
    expect(handled).toBe(false)
  })

  it("create → list → read round-trips a canvas file through the routes", async () => {
    const { projectsRoot, mediaStoreDir } = await createFixtureRoots()
    const handler = createProjectCanvasRoutes({ projectsRoot, mediaStoreDir })

    const created = await call(handler, "POST", "/api/projects/demo/canvases/create", {
      title: "Route Test",
    })
    expect(created.response?.statusCode).toBe(200)
    const createdPath = created.response?.json().file.path
    expect(createdPath).toBe("route-test.canvas")

    const listed = await call(handler, "GET", "/api/projects/demo/canvases")
    expect(listed.response?.json().files.map((f: { path: string }) => f.path)).toContain(
      createdPath
    )

    const read = await call(
      handler,
      "GET",
      `/api/projects/demo/canvases/file?path=${encodeURIComponent(createdPath)}`
    )
    expect(read.response?.statusCode).toBe(200)
    expect(read.response?.json().file.document.meta.title).toBe("Route Test")
  })

  it("returns 400s for missing required fields, not 500s", async () => {
    const { projectsRoot, mediaStoreDir } = await createFixtureRoots()
    const handler = createProjectCanvasRoutes({ projectsRoot, mediaStoreDir })

    const noTitle = await call(handler, "POST", "/api/projects/demo/canvases/create", {})
    expect(noTitle.response?.statusCode).toBe(400)

    const noPath = await call(handler, "GET", "/api/projects/demo/canvases/assets/file")
    expect(noPath.response?.statusCode).toBe(400)

    const savePathless = await call(handler, "POST", "/api/projects/demo/canvases/save", {
      document: {},
    })
    expect(savePathless.response?.statusCode).toBe(400)
  })

  it("stores and serves a document asset with immutable caching", async () => {
    const { projectsRoot, mediaStoreDir } = await createFixtureRoots()
    const handler = createProjectCanvasRoutes({ projectsRoot, mediaStoreDir })

    await call(handler, "POST", "/api/projects/demo/canvases/create", { title: "Assets" })
    const stored = await call(handler, "POST", "/api/projects/demo/canvases/assets/store", {
      path: "assets.canvas",
      itemId: "canvas-item-test-1",
      field: "src",
      fileName: "dot.png",
      dataUrl: PNG_DATA_URL,
    })
    expect(stored.response?.statusCode).toBe(200)
    const assetName = stored.response?.json().assetName
    expect(assetName).toBeTruthy()

    const served = await call(
      handler,
      "GET",
      `/api/projects/demo/canvases/assets/file?path=${encodeURIComponent("assets.canvas")}&asset=${encodeURIComponent(assetName)}`
    )
    expect(served.response?.statusCode).toBe(200)
    expect(served.response?.headers["content-type"]).toBe("image/png")
    expect(served.response?.headers["cache-control"]).toContain("immutable")
    expect(served.response?.body.length).toBeGreaterThan(20)
  })

  it("deletes a canvas file and reports it gone", async () => {
    const { projectsRoot, mediaStoreDir } = await createFixtureRoots()
    const handler = createProjectCanvasRoutes({ projectsRoot, mediaStoreDir })

    await call(handler, "POST", "/api/projects/demo/canvases/create", { title: "Doomed" })
    const deleted = await call(handler, "POST", "/api/projects/demo/canvases/delete", {
      path: "doomed.canvas",
    })
    expect(deleted.response?.statusCode).toBe(200)
    expect(deleted.response?.json().ok).toBe(true)

    const listed = await call(handler, "GET", "/api/projects/demo/canvases")
    expect(listed.response?.json().files).toEqual([])
  })
})
