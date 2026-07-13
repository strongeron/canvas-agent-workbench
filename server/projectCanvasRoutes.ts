import type { IncomingMessage, ServerResponse } from "node:http"

import {
  createProjectCanvasFile,
  deleteProjectCanvasFile,
  duplicateProjectCanvasFile,
  importProjectCanvasHtmlBundle,
  listProjectCanvasFiles,
  moveProjectCanvasFile,
  openProjectCanvasFile,
  scanProjectCanvasHtmlBundles,
  saveProjectCanvasFile,
  storeProjectCanvasDocumentAsset,
  updateProjectCanvasFileMetadata,
} from "../utils/canvasFileApi"
import { readCanvasDocumentAsset } from "../utils/canvasFileAssets"

/**
 * FOX2-75: route modules own an endpoint group behind a framework-agnostic
 * `(req, res, pathname) => handled` contract — vite's middleware is a thin
 * adapter, and a standalone node server can mount the same module unchanged.
 */
export type RouteHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string
) => Promise<boolean>

export function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status
  res.setHeader("Content-Type", "application/json")
  res.end(JSON.stringify(payload))
}

export async function readJson(req: IncomingMessage): Promise<any> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(chunk as Buffer)
  }
  if (chunks.length === 0) return {}
  const body = Buffer.concat(chunks).toString("utf8")
  if (!body) return {}
  return JSON.parse(body)
}

interface ProjectCanvasRouteOptions {
  projectsRoot: string
  mediaStoreDir: string
}

/**
 * The `/api/projects/:id/canvases*` endpoint group: canvas-file CRUD,
 * document assets, and HTML-bundle import/scan. Endpoint URLs and response
 * shapes are frozen — moved verbatim from vite.config.ts (FOX2-75 slice 1).
 */
export function createProjectCanvasRoutes({
  projectsRoot,
  mediaStoreDir,
}: ProjectCanvasRouteOptions): RouteHandler {
  return async function handleProjectCanvasRoutes(req, res, pathname) {
    const canvasFilesMatch = pathname.match(/^\/api\/projects\/([^/]+)\/canvases$/)
    if (req.method === "GET" && canvasFilesMatch) {
      try {
        const requestUrl = new URL(req.url || "", "http://localhost")
        const projectId = decodeURIComponent(canvasFilesMatch[1])
        const surface = requestUrl.searchParams.get("surface") || ""
        const files = await listProjectCanvasFiles(projectsRoot, projectId, surface)
        sendJson(res, 200, { ok: true, files })
      } catch (error: any) {
        sendJson(res, 500, { error: error?.message || "Failed to list canvas files." })
      }
      return true
    }

    const canvasAssetReadMatch = pathname.match(
      /^\/api\/projects\/([^/]+)\/canvases\/assets\/file$/
    )
    if (req.method === "GET" && canvasAssetReadMatch) {
      try {
        const requestUrl = new URL(req.url || "", "http://localhost")
        const projectId = decodeURIComponent(canvasAssetReadMatch[1])
        const canvasPath = requestUrl.searchParams.get("path") || ""
        const assetName = requestUrl.searchParams.get("asset") || ""
        if (!canvasPath) {
          sendJson(res, 400, { error: "path query param is required." })
          return true
        }
        if (!assetName) {
          sendJson(res, 400, { error: "asset query param is required." })
          return true
        }
        const asset = await readCanvasDocumentAsset(projectsRoot, projectId, canvasPath, assetName)
        res.statusCode = 200
        res.setHeader("content-type", asset.mimeType)
        res.setHeader("cache-control", "public, max-age=31536000, immutable")
        res.end(asset.content)
      } catch (error: any) {
        sendJson(res, 404, { error: error?.message || "Failed to read canvas asset." })
      }
      return true
    }

    const canvasAssetStoreMatch = pathname.match(
      /^\/api\/projects\/([^/]+)\/canvases\/assets\/store$/
    )
    if (req.method === "POST" && canvasAssetStoreMatch) {
      try {
        const projectId = decodeURIComponent(canvasAssetStoreMatch[1])
        const body = await readJson(req)
        const stored = await storeProjectCanvasDocumentAsset(projectsRoot, projectId, body)
        sendJson(res, 200, {
          ok: true,
          mediaUrl: stored.assetUrl,
          assetName: stored.assetName,
          mimeType: stored.mimeType,
          sizeBytes: stored.sizeBytes,
          provider: "canvas-document-asset",
          storedAt: stored.storedAt,
        })
      } catch (error: any) {
        const status =
          error?.message === "path is required." ||
          error?.message === "itemId is required." ||
          error?.message === "dataUrl is required."
            ? 400
            : 500
        sendJson(res, status, { error: error?.message || "Failed to store canvas asset." })
      }
      return true
    }

    const canvasFileReadMatch = pathname.match(/^\/api\/projects\/([^/]+)\/canvases\/file$/)
    if (req.method === "GET" && canvasFileReadMatch) {
      try {
        const requestUrl = new URL(req.url || "", "http://localhost")
        const projectId = decodeURIComponent(canvasFileReadMatch[1])
        const canvasPath = requestUrl.searchParams.get("path") || ""
        const file = await openProjectCanvasFile(projectsRoot, projectId, canvasPath)
        sendJson(res, 200, { ok: true, file })
      } catch (error: any) {
        const status = error?.message === "path query param is required." ? 400 : 500
        sendJson(res, status, { error: error?.message || "Failed to open canvas file." })
      }
      return true
    }

    const canvasFileCreateMatch = pathname.match(/^\/api\/projects\/([^/]+)\/canvases\/create$/)
    if (req.method === "POST" && canvasFileCreateMatch) {
      try {
        const projectId = decodeURIComponent(canvasFileCreateMatch[1])
        const body = await readJson(req)
        const file = await createProjectCanvasFile(projectsRoot, mediaStoreDir, projectId, body)
        sendJson(res, 200, { ok: true, file })
      } catch (error: any) {
        const status = error?.message === "title is required." ? 400 : 500
        sendJson(res, status, { error: error?.message || "Failed to create canvas file." })
      }
      return true
    }

    const canvasFileSaveMatch = pathname.match(/^\/api\/projects\/([^/]+)\/canvases\/save$/)
    if (req.method === "POST" && canvasFileSaveMatch) {
      try {
        const projectId = decodeURIComponent(canvasFileSaveMatch[1])
        const body = await readJson(req)
        const file = await saveProjectCanvasFile(projectsRoot, mediaStoreDir, projectId, body)
        sendJson(res, 200, { ok: true, file })
      } catch (error: any) {
        const status =
          error?.message === "path is required." || error?.message === "document is required."
            ? 400
            : 500
        sendJson(res, status, { error: error?.message || "Failed to save canvas file." })
      }
      return true
    }

    const canvasFileMetadataMatch = pathname.match(
      /^\/api\/projects\/([^/]+)\/canvases\/metadata$/
    )
    if (req.method === "POST" && canvasFileMetadataMatch) {
      try {
        const projectId = decodeURIComponent(canvasFileMetadataMatch[1])
        const body = await readJson(req)
        const file = await updateProjectCanvasFileMetadata(projectsRoot, projectId, body)
        sendJson(res, 200, { ok: true, file })
      } catch (error: any) {
        const status = error?.message === "path is required." ? 400 : 500
        sendJson(res, status, {
          error: error?.message || "Failed to update canvas file metadata.",
        })
      }
      return true
    }

    const canvasFileMoveMatch = pathname.match(/^\/api\/projects\/([^/]+)\/canvases\/move$/)
    if (req.method === "POST" && canvasFileMoveMatch) {
      try {
        const projectId = decodeURIComponent(canvasFileMoveMatch[1])
        const body = await readJson(req)
        const file = await moveProjectCanvasFile(projectsRoot, projectId, body)
        sendJson(res, 200, { ok: true, file })
      } catch (error: any) {
        const status = error?.message === "path is required." ? 400 : 500
        sendJson(res, status, { error: error?.message || "Failed to move canvas file." })
      }
      return true
    }

    const canvasFileDuplicateMatch = pathname.match(
      /^\/api\/projects\/([^/]+)\/canvases\/duplicate$/
    )
    if (req.method === "POST" && canvasFileDuplicateMatch) {
      try {
        const projectId = decodeURIComponent(canvasFileDuplicateMatch[1])
        const body = await readJson(req)
        const file = await duplicateProjectCanvasFile(projectsRoot, projectId, body)
        sendJson(res, 200, { ok: true, file })
      } catch (error: any) {
        const status = error?.message === "path is required." ? 400 : 500
        sendJson(res, status, { error: error?.message || "Failed to duplicate canvas file." })
      }
      return true
    }

    const canvasFileDeleteMatch = pathname.match(/^\/api\/projects\/([^/]+)\/canvases\/delete$/)
    if (req.method === "POST" && canvasFileDeleteMatch) {
      try {
        const projectId = decodeURIComponent(canvasFileDeleteMatch[1])
        const body = await readJson(req)
        const result = await deleteProjectCanvasFile(projectsRoot, projectId, body)
        // The store result may carry its own `ok`; it wins, exactly like the
        // original `{ ok: true, ...result }` spread did.
        sendJson(res, 200, Object.assign({ ok: true }, result))
      } catch (error: any) {
        const status = error?.message === "path is required." ? 400 : 500
        sendJson(res, status, { error: error?.message || "Failed to delete canvas file." })
      }
      return true
    }

    const canvasHtmlBundleImportMatch = pathname.match(
      /^\/api\/projects\/([^/]+)\/canvases\/html-bundle\/import$/
    )
    if (req.method === "POST" && canvasHtmlBundleImportMatch) {
      try {
        const projectId = decodeURIComponent(canvasHtmlBundleImportMatch[1])
        const body = await readJson(req)
        const htmlBundle = await importProjectCanvasHtmlBundle(projectsRoot, projectId, body)
        sendJson(res, 200, { ok: true, htmlBundle })
      } catch (error: any) {
        const status = error?.message === "path is required." ? 400 : 500
        sendJson(res, status, { error: error?.message || "Failed to import HTML bundle." })
      }
      return true
    }

    const canvasHtmlBundleScanMatch = pathname.match(
      /^\/api\/projects\/([^/]+)\/canvases\/html-bundles$/
    )
    if (req.method === "GET" && canvasHtmlBundleScanMatch) {
      try {
        const requestUrl = new URL(req.url || "", "http://localhost")
        const projectId = decodeURIComponent(canvasHtmlBundleScanMatch[1])
        const rootPath = requestUrl.searchParams.get("rootPath") || ""
        const result = await scanProjectCanvasHtmlBundles(projectsRoot, projectId, rootPath)
        sendJson(res, 200, { ok: true, result })
      } catch (error: any) {
        const status = error?.message === "rootPath is required." ? 400 : 500
        sendJson(res, status, { error: error?.message || "Failed to scan HTML bundle library." })
      }
      return true
    }

    return false
  }
}
