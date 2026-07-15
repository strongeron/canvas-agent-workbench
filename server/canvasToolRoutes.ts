import type { IncomingMessage } from "node:http"
import path from "node:path"

import { readCanvasAstNode } from "../utils/canvasAstReader"
import { injectCanvasHtmlElementIds, readCanvasHtmlNode } from "../utils/canvasHtmlEditor"
import { listProjectDesignTokens, writeProjectDesignToken } from "../utils/canvasTokenCss"
import { applyCanvasAstLoadRequest } from "./canvasAstLoad"
import { applyCanvasAstWriteRequest } from "./canvasAstWrite"
import { applyCanvasComponentCreateRequest } from "./canvasComponentCreate"
import { applyCanvasComponentPromoteRequest } from "./canvasComponentPromote"
import { applyCanvasMarkdownWriteRequest } from "./canvasMarkdownWrite"
import { applyCanvasProjectDetectComponentsDirRequest } from "./canvasProjectDetectComponentsDir"
import { applyCanvasProjectSyncRequest } from "./canvasProjectSync"
import { applyCanvasRegistryListRequest } from "./canvasRegistryList"
import { applyCanvasMcpAppConnectRequest } from "./mcpProxy/canvasMcpAppConnect"
import { applyCanvasMcpAppCredentialsRequest } from "./mcpProxy/canvasMcpAppCredentials"
import { applyCanvasMcpAppDisconnectRequest } from "./mcpProxy/canvasMcpAppDisconnect"
import { applyCanvasMcpAppInvokeToolRequest } from "./mcpProxy/canvasMcpAppInvokeTool"
import { applyCanvasMcpAppLogRequest } from "./mcpProxy/canvasMcpAppLog"
import { readJson, sendJson, type RouteHandler } from "./projectCanvasRoutes"
import { computeWrittenSyncTarget } from "./syncTargetState"

/**
 * The mcp-app request results type `status` loosely (their `ok` is a plain
 * boolean, so TS cannot narrow the failure variant). At runtime failures
 * always carry a status; 500 is the type-level fallback.
 */
const failureStatus = (result: unknown) => {
  const status = (result as { status?: unknown } | null)?.status
  return typeof status === "number" ? status : 500
}

interface CanvasToolRouteOptions {
  workspaceRoot: string
  projectsRoot: string
  /**
   * Localhost/origin guard for the high-risk endpoints (project sync,
   * sync-target, mcp-app) that read or write arbitrary external paths —
   * returns an error string for non-loopback requests, null otherwise.
   */
  rejectIfNotLocalhost: (req: IncomingMessage) => string | null
  /** Vite-coupled esbuild compile — stays owned by vite.config.ts. */
  compileReactCanvasPreview: (input: any) => Promise<{
    html: string
    ids: unknown
    injectionError?: unknown
  }>
  readProjectSyncTarget: (projectDir: string, projectId: string) => Promise<any>
  writeProjectSyncTarget: (projectDir: string, projectId: string, syncTarget: any) => Promise<any>
  revalidateSyncTargetRealpath: (
    syncTarget: any
  ) => Promise<{ ok: boolean; resolvedRealPath?: string }>
}

/**
 * The `/api/canvas/*` tool endpoint group: AST read/load/write, HTML id
 * injection, design tokens, component create/promote, project sync (+
 * detect-components-dir, sync-target), MCP-app proxy, registry listing,
 * markdown writes, and React preview compilation. Handlers were already
 * thin wrappers over server/ modules — this moves the wrappers too.
 * Endpoint URLs and response shapes are frozen — moved verbatim from
 * vite.config.ts (FOX2-75 slice 6).
 */
export function createCanvasToolRoutes({
  workspaceRoot,
  projectsRoot,
  rejectIfNotLocalhost,
  compileReactCanvasPreview,
  readProjectSyncTarget,
  writeProjectSyncTarget,
  revalidateSyncTargetRealpath,
}: CanvasToolRouteOptions): RouteHandler {
  return async function handleCanvasToolRoutes(req, res, pathname) {
    if (req.method === "POST" && pathname === "/api/canvas/ast/read") {
      try {
        const body = await readJson(req)
        const sourceTsx = typeof body.sourceReact === "string" ? body.sourceReact : ""
        const sourceHtml = typeof body.sourceHtml === "string" ? body.sourceHtml : ""
        const canvasId = typeof body.canvasId === "string" ? body.canvasId : ""
        const sourceId = typeof body.sourceId === "string" ? body.sourceId : ""
        if ((!sourceTsx && !sourceHtml) || !canvasId || !sourceId) {
          sendJson(res, 400, {
            ok: false,
            error: "sourceReact or sourceHtml, canvasId, and sourceId are required.",
          })
          return true
        }
        const result = sourceHtml
          ? readCanvasHtmlNode(sourceHtml, canvasId, { sourceId })
          : readCanvasAstNode(sourceTsx, canvasId, { sourceId })
        if ("error" in result) {
          sendJson(res, 200, { ok: false, error: result.error })
          return true
        }
        sendJson(res, 200, { ok: true, node: result })
      } catch (error: any) {
        sendJson(res, 400, {
          ok: false,
          error: error?.message || "Failed to read AST node.",
        })
      }
      return true
    }

    if (req.method === "POST" && pathname === "/api/canvas/inject-html") {
      try {
        const body = await readJson(req)
        const sourceHtml = typeof body.sourceHtml === "string" ? body.sourceHtml : ""
        const sourceId = typeof body.sourceId === "string" ? body.sourceId : ""
        if (!sourceHtml || !sourceId) {
          sendJson(res, 400, {
            ok: false,
            error: "sourceHtml and sourceId are required.",
          })
          return true
        }
        const result = injectCanvasHtmlElementIds(sourceHtml, {
          sourceId,
          injectBridge: body.injectBridge !== false,
        })
        sendJson(res, 200, {
          ok: true,
          html: result.html,
          ids: result.ids,
        })
      } catch (error: any) {
        sendJson(res, 400, {
          ok: false,
          error: error?.message || "Failed to inject HTML canvas ids.",
        })
      }
      return true
    }

    if (req.method === "POST" && pathname === "/api/canvas/tokens/list") {
      try {
        const body = await readJson(req)
        const result = await listProjectDesignTokens(body, { workspaceRoot })
        if (!result.ok) {
          sendJson(res, result.status, {
            ok: false,
            code: result.code,
            error: result.error,
          })
          return true
        }
        sendJson(res, 200, result)
      } catch (error: any) {
        sendJson(res, 400, {
          ok: false,
          error: error?.message || "Failed to list design tokens.",
        })
      }
      return true
    }

    if (req.method === "POST" && pathname === "/api/canvas/tokens/write") {
      try {
        const body = await readJson(req)
        const result = await writeProjectDesignToken(body, { workspaceRoot })
        if (!result.ok) {
          sendJson(res, result.status, {
            ok: false,
            code: result.code,
            error: result.error,
          })
          return true
        }
        sendJson(res, 200, result)
      } catch (error: any) {
        sendJson(res, 400, {
          ok: false,
          error: error?.message || "Failed to write design token.",
        })
      }
      return true
    }

    if (req.method === "POST" && pathname === "/api/canvas/component/create") {
      try {
        const body = await readJson(req)
        const result = await applyCanvasComponentCreateRequest(body, { workspaceRoot })
        if (!result.ok) {
          sendJson(res, result.status, {
            ok: false,
            code: result.code,
            error: result.error,
          })
          return true
        }
        sendJson(res, 200, result)
      } catch (error: any) {
        sendJson(res, 400, {
          ok: false,
          error: error?.message || "Failed to create component.",
        })
      }
      return true
    }

    if (req.method === "POST" && pathname === "/api/canvas/component/promote") {
      try {
        const body = await readJson(req)
        const result = await applyCanvasComponentPromoteRequest(body, { workspaceRoot })
        if (!result.ok) {
          sendJson(res, result.status, {
            ok: false,
            code: result.code,
            error: result.error,
          })
          return true
        }
        sendJson(res, 200, result)
      } catch (error: any) {
        sendJson(res, 400, {
          ok: false,
          error: error?.message || "Failed to promote subtree.",
        })
      }
      return true
    }

    if (req.method === "POST" && pathname === "/api/canvas/project/sync") {
      // Localhost/origin guard FIRST — this endpoint writes to arbitrary
      // external paths, so a non-loopback request must never reach the
      // handler. The 127.0.0.1 bind is the primary control; this is
      // defense-in-depth.
      const localhostError = rejectIfNotLocalhost(req)
      if (localhostError) {
        sendJson(res, 403, { ok: false, code: "forbidden-origin", error: localhostError })
        return true
      }
      try {
        const body = await readJson(req)
        const result = await applyCanvasProjectSyncRequest(body, { workspaceRoot })
        if (!result.ok) {
          sendJson(res, result.status, {
            ok: false,
            code: result.code,
            error: result.error,
            ...(result.writtenPaths ? { writtenPaths: result.writtenPaths } : {}),
            ...(result.notWritten ? { notWritten: result.notWritten } : {}),
            ...(result.partialFailure ? { partialFailure: true } : {}),
          })
          return true
        }
        sendJson(res, 200, result)
      } catch (error: any) {
        sendJson(res, 400, {
          ok: false,
          error: error?.message || "Failed to sync project.",
        })
      }
      return true
    }

    if (req.method === "POST" && pathname === "/api/canvas/project/detect-components-dir") {
      // Same localhost/origin guard as the sync endpoint — this reads
      // inside an arbitrary external root, so a non-loopback request must
      // never reach the handler.
      const localhostError = rejectIfNotLocalhost(req)
      if (localhostError) {
        sendJson(res, 403, {
          ok: false,
          code: "forbidden-origin",
          error: localhostError,
        })
        return true
      }
      try {
        const body = await readJson(req)
        const result = await applyCanvasProjectDetectComponentsDirRequest(body)
        if (!result.ok) {
          sendJson(res, result.status, {
            ok: false,
            code: result.code,
            error: result.error,
          })
          return true
        }
        sendJson(res, 200, result)
      } catch (error: any) {
        sendJson(res, 400, {
          ok: false,
          error: error?.message || "Failed to detect components directory.",
        })
      }
      return true
    }

    if (req.method === "POST" && pathname === "/api/canvas/project/sync-target") {
      // Read or persist the user-confirmed Root B mapping in
      // `project.json` `meta.syncTarget`. `{ mode: "read" }` returns the
      // (realpath-revalidated) mapping; `{ mode: "write", syncTarget }`
      // persists it. Localhost-guarded like the sibling endpoints.
      const localhostError = rejectIfNotLocalhost(req)
      if (localhostError) {
        sendJson(res, 403, {
          ok: false,
          code: "forbidden-origin",
          error: localhostError,
        })
        return true
      }
      try {
        const body = await readJson(req)
        const projectId =
          typeof body?.projectId === "string" && body.projectId.trim() ? body.projectId.trim() : ""
        if (!projectId) {
          sendJson(res, 400, {
            ok: false,
            code: "bad-input",
            error: "projectId is required.",
          })
          return true
        }
        const projectDir = path.join(projectsRoot, projectId)
        if (body?.mode === "write") {
          // The client-supplied resolvedRealPath is NOT trusted: recompute
          // it server-side via fs.realpath(rootPath) and reject if the
          // root does not resolve. Persisting a client-pinned realpath
          // would defeat the re-sync revalidation.
          const computed = await computeWrittenSyncTarget(body?.syncTarget)
          if (!computed.ok) {
            sendJson(res, 400, {
              ok: false,
              code: "bad-input",
              error: computed.error,
            })
            return true
          }
          const saved = await writeProjectSyncTarget(projectDir, projectId, computed.syncTarget)
          sendJson(res, 200, { ok: true, syncTarget: saved })
          return true
        }
        // Default: read + realpath-revalidate.
        const stored = await readProjectSyncTarget(projectDir, projectId)
        if (!stored) {
          sendJson(res, 200, { ok: true, syncTarget: null })
          return true
        }
        const revalidated = await revalidateSyncTargetRealpath(stored)
        sendJson(res, 200, {
          ok: true,
          syncTarget: stored,
          valid: revalidated.ok,
          ...(revalidated.ok ? { resolvedRealPath: revalidated.resolvedRealPath } : {}),
        })
      } catch (error: any) {
        sendJson(res, 400, {
          ok: false,
          error: error?.message || "Failed to read/write the sync target.",
        })
      }
      return true
    }

    if (req.method === "POST" && pathname === "/api/canvas/mcp-app/connect") {
      const localhostError = rejectIfNotLocalhost(req)
      if (localhostError) {
        sendJson(res, 403, { ok: false, code: "forbidden-origin", error: localhostError })
        return true
      }
      try {
        const body = await readJson(req)
        const result = await applyCanvasMcpAppConnectRequest(body, { workspaceRoot })
        if (!result.ok) {
          sendJson(res, failureStatus(result), result)
          return true
        }
        sendJson(res, 200, result)
      } catch (error: any) {
        sendJson(res, 500, {
          ok: false,
          code: "internal-error",
          error: error?.message || "Failed to connect MCP app.",
        })
      }
      return true
    }

    if (req.method === "POST" && pathname === "/api/canvas/mcp-app/disconnect") {
      const localhostError = rejectIfNotLocalhost(req)
      if (localhostError) {
        sendJson(res, 403, { ok: false, code: "forbidden-origin", error: localhostError })
        return true
      }
      try {
        const body = await readJson(req)
        const result = await applyCanvasMcpAppDisconnectRequest(body)
        if (!result.ok) {
          sendJson(res, failureStatus(result), result)
          return true
        }
        sendJson(res, 200, result)
      } catch (error: any) {
        sendJson(res, 500, {
          ok: false,
          code: "internal-error",
          error: error?.message || "Failed to disconnect MCP app.",
        })
      }
      return true
    }

    if (req.method === "POST" && pathname === "/api/canvas/mcp-app/invoke-tool") {
      const localhostError = rejectIfNotLocalhost(req)
      if (localhostError) {
        sendJson(res, 403, { ok: false, code: "forbidden-origin", error: localhostError })
        return true
      }
      try {
        const body = await readJson(req)
        const result = await applyCanvasMcpAppInvokeToolRequest(body)
        if (!result.ok) {
          sendJson(res, failureStatus(result), result)
          return true
        }
        sendJson(res, 200, result)
      } catch (error: any) {
        sendJson(res, 500, {
          ok: false,
          code: "internal-error",
          error: error?.message || "Failed to invoke MCP app tool.",
        })
      }
      return true
    }

    if (
      (req.method === "POST" && pathname === "/api/canvas/mcp-app/log") ||
      (req.method === "GET" && pathname.startsWith("/api/canvas/mcp-app/log/"))
    ) {
      const localhostError = rejectIfNotLocalhost(req)
      if (localhostError) {
        sendJson(res, 403, { ok: false, code: "forbidden-origin", error: localhostError })
        return true
      }
      try {
        const requestUrl = new URL(req.url || pathname, "http://localhost")
        const body =
          req.method === "POST"
            ? await readJson(req)
            : {
                projectId: requestUrl.searchParams.get("projectId")?.trim() || "",
                nodeId: decodeURIComponent(pathname.split("/").pop() || ""),
                limit: requestUrl.searchParams.get("limit")
                  ? Number(requestUrl.searchParams.get("limit"))
                  : undefined,
              }
        const result = await applyCanvasMcpAppLogRequest(body)
        if (!result.ok) {
          sendJson(res, failureStatus(result), result)
          return true
        }
        sendJson(res, 200, result)
      } catch (error: any) {
        sendJson(res, 500, {
          ok: false,
          code: "internal-error",
          error: error?.message || "Failed to read MCP app log.",
        })
      }
      return true
    }

    if (req.method === "POST" && pathname === "/api/canvas/mcp-app/credentials") {
      const localhostError = rejectIfNotLocalhost(req)
      if (localhostError) {
        sendJson(res, 403, { ok: false, code: "forbidden-origin", error: localhostError })
        return true
      }
      try {
        const body = await readJson(req)
        const result = await applyCanvasMcpAppCredentialsRequest(body, { workspaceRoot })
        if (!result.ok) {
          sendJson(res, failureStatus(result), result)
          return true
        }
        sendJson(res, 200, result)
      } catch (error: any) {
        sendJson(res, 500, {
          ok: false,
          code: "internal-error",
          error: error?.message || "Failed to store MCP app credentials.",
        })
      }
      return true
    }

    if (req.method === "POST" && pathname === "/api/canvas/registry/list") {
      try {
        const body = await readJson(req)
        const result = await applyCanvasRegistryListRequest(body, { workspaceRoot })
        if (!result.ok) {
          sendJson(res, result.status, {
            ok: false,
            code: result.code,
            error: result.error,
          })
          return true
        }
        sendJson(res, 200, result)
      } catch (error: any) {
        sendJson(res, 400, {
          ok: false,
          error: error?.message || "Failed to list registry primitives.",
        })
      }
      return true
    }

    if (req.method === "POST" && pathname === "/api/canvas/ast/load") {
      try {
        const body = await readJson(req)
        const result = await applyCanvasAstLoadRequest(body, { workspaceRoot })
        if (!result.ok) {
          sendJson(res, result.status, {
            ok: false,
            code: result.code,
            error: result.error,
          })
          return true
        }
        sendJson(res, 200, result)
      } catch (error: any) {
        sendJson(res, 400, {
          ok: false,
          error: error?.message || "Failed to load TSX file.",
        })
      }
      return true
    }

    if (req.method === "POST" && pathname === "/api/canvas/ast/write") {
      try {
        const body = await readJson(req)
        const result = await applyCanvasAstWriteRequest(body, { workspaceRoot })
        if (!result.ok) {
          sendJson(res, result.status, {
            ok: false,
            code: result.code,
            error: result.error,
          })
          return true
        }
        sendJson(res, 200, result)
      } catch (error: any) {
        sendJson(res, 400, {
          ok: false,
          error: error?.message || "Failed to write AST node.",
        })
      }
      return true
    }

    if (req.method === "POST" && pathname === "/api/canvas/markdown/write") {
      try {
        const body = await readJson(req)
        const result = await applyCanvasMarkdownWriteRequest(body, { workspaceRoot })
        if (!result.ok) {
          sendJson(res, result.status, {
            ok: false,
            code: result.code,
            error: result.error,
          })
          return true
        }
        sendJson(res, 200, result)
      } catch (error: any) {
        sendJson(res, 400, {
          ok: false,
          error: error?.message || "Failed to write markdown block.",
        })
      }
      return true
    }

    if (req.method === "POST" && pathname === "/api/canvas/compile-react") {
      try {
        const body = await readJson(req)
        const compiled = await compileReactCanvasPreview(body)
        sendJson(res, 200, {
          ok: true,
          html: compiled.html,
          ids: compiled.ids,
          injectionError: compiled.injectionError,
        })
      } catch (error: any) {
        sendJson(res, 400, {
          ok: false,
          error: error?.message || "Failed to compile React preview.",
        })
      }
      return true
    }

    return false
  }
}
