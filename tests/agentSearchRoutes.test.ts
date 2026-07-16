import { Readable } from "node:stream"
import type { IncomingMessage, ServerResponse } from "node:http"

import { afterEach, describe, expect, it, vi } from "vitest"

import { createAgentSearch } from "../server/agentSearch"
import { createAgentSearchRoutes } from "../server/agentSearchRoutes"

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

function createHarness() {
  const agentSearch = {
    searchWeb: vi.fn(async () => ({ provider: "tavily", results: [{ title: "r1" }] })),
    getRoutePlan: vi.fn(async () => ({
      provider: "mapbox",
      mode: "driving",
      mapUrl: "https://maps",
      embedUrl: "https://embed",
      route: { distanceMeters: 1200 },
    })),
    searchAssets: vi.fn(async () => ({
      provider: "pexels",
      type: "image",
      license: "free",
      results: [{ url: "https://img" }],
    })),
  }
  const importAssetFromRemoteUrl = vi.fn(async () => ({
    mediaUrl: "/media/x.png",
    fileName: "x.png",
    mimeType: "image/png",
    sizeBytes: 10,
    storedAt: "2026-01-01T00:00:00.000Z",
    mediaKind: "image",
  }))
  const handler = createAgentSearchRoutes({ agentSearch, importAssetFromRemoteUrl })
  return { handler, agentSearch, importAssetFromRemoteUrl }
}

async function call(
  handler: ReturnType<typeof createAgentSearchRoutes>,
  method: string,
  url: string,
  body?: unknown
) {
  const req = makeRequest(method, url, body)
  const { res, done } = makeResponse()
  const handled = await handler(req, res, new URL(url, "http://localhost").pathname)
  return { handled, response: handled ? await done : null }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("agent-search routes (FOX2-75 slice 7)", () => {
  it("ignores paths outside the group", async () => {
    const { handler } = createHarness()
    expect((await call(handler, "POST", "/api/projects/create")).handled).toBe(false)
    expect((await call(handler, "GET", "/api/agent/search-web")).handled).toBe(false)
  })

  it("searches the web, requiring a query", async () => {
    const { handler, agentSearch } = createHarness()

    const missing = await call(handler, "POST", "/api/agent/search-web", {})
    expect(missing.response?.statusCode).toBe(400)

    const { response } = await call(handler, "POST", "/api/agent/search-web", {
      query: "  design tools ",
      provider: "tavily",
      maxResults: 3,
    })
    expect(response?.json().results).toHaveLength(1)
    expect(agentSearch.searchWeb).toHaveBeenCalledWith("design tools", {
      provider: "tavily",
      maxResults: 3,
    })
  })

  it("plans routes and surfaces provider failures as 502", async () => {
    const { handler, agentSearch } = createHarness()

    const missing = await call(handler, "POST", "/api/agent/get-route", { origin: "A" })
    expect(missing.response?.statusCode).toBe(400)

    const ok = await call(handler, "POST", "/api/agent/get-route", {
      origin: "A",
      destination: "B",
    })
    expect(ok.response?.json().mapUrl).toBe("https://maps")

    agentSearch.getRoutePlan.mockRejectedValueOnce(new Error("MAPBOX_ACCESS_TOKEN is not configured."))
    const failed = await call(handler, "POST", "/api/agent/get-route", {
      origin: "A",
      destination: "B",
    })
    expect(failed.response?.statusCode).toBe(502)
    expect(failed.response?.json().error).toContain("MAPBOX_ACCESS_TOKEN")
  })

  it("searches assets with the frozen response shape", async () => {
    const { handler } = createHarness()
    const { response } = await call(handler, "POST", "/api/agent/search-assets", {
      query: "fox",
      type: "image",
    })
    const payload = response?.json()
    expect(payload.provider).toBe("pexels")
    expect(payload.type).toBe("image")
    expect(payload.license).toBe("free")
    expect(payload.results).toHaveLength(1)
  })

  it("imports remote assets, honoring a valid mediaKind override", async () => {
    const { handler } = createHarness()

    const missing = await call(handler, "POST", "/api/agent/import-asset", {})
    expect(missing.response?.statusCode).toBe(400)

    const overridden = await call(handler, "POST", "/api/agent/import-asset", {
      url: "https://cdn.example.com/x.png",
      mediaKind: "gif",
    })
    expect(overridden.response?.json().mediaKind).toBe("gif")

    const invalidOverride = await call(handler, "POST", "/api/agent/import-asset", {
      url: "https://cdn.example.com/x.png",
      mediaKind: "not-a-kind",
    })
    expect(invalidOverride.response?.json().mediaKind).toBe("image")
  })
})

describe("agent-search provider dispatch (server/agentSearch.mjs)", () => {
  it("throws a configuration error when no web provider key is set", async () => {
    const { searchWeb } = createAgentSearch({})
    await expect(searchWeb("query")).rejects.toThrow(/No web search provider is configured/)
  })

  it("dispatches to tavily when its key is configured, clamping maxResults", async () => {
    const payload = { results: [{ title: "t", url: "https://a", content: "c" }] }
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(payload),
      json: async () => payload,
    }))
    vi.stubGlobal("fetch", fetchMock)

    const { searchWeb } = createAgentSearch({ TAVILY_API_KEY: "key-1" })
    const result = await searchWeb("foxes", { maxResults: 999 })
    expect(result.provider).toBe("tavily")
    expect(result.results.length).toBeGreaterThan(0)

    const [, init] = fetchMock.mock.calls[0]
    const sent = JSON.parse((init as any).body)
    // 999 clamps to the 20 ceiling.
    expect(sent.max_results).toBeLessThanOrEqual(20)
  })

  it("route planning degrades to url-only links when no maps key is configured", async () => {
    const { getRoutePlan } = createAgentSearch({})
    const plan = await getRoutePlan("A", "B")
    expect(plan.provider).toBe("url-only")
    expect(plan.mapUrl).toContain("google.com/maps")
  })

  it("asset search reports its provider from config", async () => {
    const payload = {
      photos: [
        {
          id: 1,
          url: "https://pexels.com/photo/1",
          alt: "fox",
          src: { large: "https://img", medium: "https://img-m" },
          width: 100,
          height: 100,
          photographer: "A",
        },
      ],
    }
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(payload),
      json: async () => payload,
    }))
    vi.stubGlobal("fetch", fetchMock)

    const { searchAssets } = createAgentSearch({ PEXELS_API_KEY: "key-2" })
    const result = await searchAssets("fox", { type: "image" })
    expect(result.provider).toBeTruthy()
    expect(result.results.length).toBeGreaterThan(0)
  })

  it("keeps the media-kind and filename helpers behaviorally intact", () => {
    const search = createAgentSearch({})
    expect(search.inferMediaKindFromMimeType("image/gif", "")).toBe("gif")
    expect(search.inferMediaKindFromMimeType("video/mp4", "")).toBe("video")
    expect(search.filenameFromRemoteUrl("https://x.com/a/photo.png?v=1", ".bin")).toContain(".png")
  })
})
