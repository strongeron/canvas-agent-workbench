import type { AgentSearch } from "./agentSearch"
import { readJson, sendJson, type RouteHandler } from "./projectCanvasRoutes"

interface AgentSearchRouteOptions {
  agentSearch: Pick<AgentSearch, "searchWeb" | "getRoutePlan" | "searchAssets">
  /** Media-subsystem import (proxy allowlist + store) — stays in vite.config.ts. */
  importAssetFromRemoteUrl: (
    assetUrl: string,
    preferredFilename?: string
  ) => Promise<{
    mediaUrl: string
    fileName: string
    mimeType: string
    sizeBytes: number
    storedAt: string
    mediaKind: string
  }>
}

/**
 * The `/api/agent/*` search endpoint group: web search, route planning,
 * asset search, and remote asset import. Endpoint URLs and response shapes
 * are frozen — moved verbatim from vite.config.ts (FOX2-75 slice 7).
 */
export function createAgentSearchRoutes({
  agentSearch,
  importAssetFromRemoteUrl,
}: AgentSearchRouteOptions): RouteHandler {
  return async function handleAgentSearchRoutes(req, res, pathname) {
    if (req.method === "POST" && pathname === "/api/agent/search-web") {
      try {
        const body = await readJson(req)
        const query = typeof body.query === "string" ? body.query.trim() : ""
        if (!query) {
          sendJson(res, 400, { error: "query is required." })
          return true
        }
        const results = await agentSearch.searchWeb(query, {
          provider: body.provider,
          maxResults: body.maxResults,
        })
        sendJson(res, 200, {
          ok: true,
          query,
          provider: results.provider,
          results: results.results,
          fetchedAt: new Date().toISOString(),
        })
      } catch (error: any) {
        sendJson(res, 502, { error: error?.message || "Failed to search web." })
      }
      return true
    }

    if (req.method === "POST" && pathname === "/api/agent/get-route") {
      try {
        const body = await readJson(req)
        const origin = typeof body.origin === "string" ? body.origin.trim() : ""
        const destination = typeof body.destination === "string" ? body.destination.trim() : ""
        if (!origin || !destination) {
          sendJson(res, 400, { error: "origin and destination are required." })
          return true
        }
        const route = await agentSearch.getRoutePlan(origin, destination, {
          mode: body.mode,
          provider: body.provider,
        })
        sendJson(res, 200, {
          ok: true,
          origin,
          destination,
          provider: route.provider,
          mode: route.mode,
          mapUrl: route.mapUrl,
          embedUrl: route.embedUrl,
          route: route.route,
          warning: route.warning,
          fetchedAt: new Date().toISOString(),
        })
      } catch (error: any) {
        sendJson(res, 502, { error: error?.message || "Failed to get route." })
      }
      return true
    }

    if (req.method === "POST" && pathname === "/api/agent/search-assets") {
      try {
        const body = await readJson(req)
        const query = typeof body.query === "string" ? body.query.trim() : ""
        if (!query) {
          sendJson(res, 400, { error: "query is required." })
          return true
        }
        const results = await agentSearch.searchAssets(query, {
          type: body.type,
          license: body.license,
          provider: body.provider,
          maxResults: body.maxResults,
        })
        sendJson(res, 200, {
          ok: true,
          query,
          provider: results.provider,
          type: results.type,
          license: results.license,
          results: results.results,
          warnings: results.warnings,
          fetchedAt: new Date().toISOString(),
        })
      } catch (error: any) {
        sendJson(res, 502, { error: error?.message || "Failed to search assets." })
      }
      return true
    }

    if (req.method === "POST" && pathname === "/api/agent/import-asset") {
      try {
        const body = await readJson(req)
        const assetUrl = typeof body.url === "string" ? body.url.trim() : ""
        if (!assetUrl) {
          sendJson(res, 400, { error: "url is required." })
          return true
        }
        const preferredFilename =
          typeof body.filename === "string" && body.filename.trim()
            ? body.filename.trim()
            : undefined
        const imported = await importAssetFromRemoteUrl(assetUrl, preferredFilename)
        const mediaKind =
          typeof body.mediaKind === "string" && ["image", "video", "gif"].includes(body.mediaKind)
            ? body.mediaKind
            : imported.mediaKind

        sendJson(res, 200, {
          ok: true,
          url: assetUrl,
          mediaUrl: imported.mediaUrl,
          fileName: imported.fileName,
          mimeType: imported.mimeType,
          sizeBytes: imported.sizeBytes,
          provider: "remote-import",
          storedAt: imported.storedAt,
          mediaKind,
        })
      } catch (error: any) {
        sendJson(res, 502, { error: error?.message || "Failed to import remote asset." })
      }
      return true
    }

    return false
  }
}
