import type { AgentNativeWorkspaceId } from "../types/agentNative"
import { buildAgentNativeManifest, buildWorkspaceManifest } from "../utils/agentNativeManifest"
import {
  appendAgentNativeWorkspaceEvent,
  listAgentNativeWorkspaceEvents as listWorkspaceEvents,
  listPendingAgentNativeWorkspaceOperations,
} from "../utils/agentNativeWorkspaceEvents"
import { buildFocusedCanvasScreenshotSnapshot } from "../utils/agentNativeWorkspaceScreenshots"
import {
  buildCanvasWorkspaceManifest,
  buildCanvasWorkspaceStateResource,
} from "../utils/canvasWorkspaceAdapter"
import { buildColorAuditWorkspaceManifest } from "../utils/colorAuditWorkspaceAdapter"
import type { AgentNativeWorkspaceStore } from "./agentNativeWorkspaceStore"
import { readJson, sendJson, type RouteHandler } from "./projectCanvasRoutes"

/**
 * Legacy canvas-agent per-project state record — the canvas workspace keeps a
 * parallel store (state + primitives + theme snapshot) owned by the
 * canvas-agent session subsystem, which several routes fall back to when the
 * agent-native store has no record yet.
 */
export interface CanvasAgentProjectStateRecord {
  projectId: string
  state: any
  primitives: any[]
  themeSnapshot: any
  updatedAt: string
  sourceClientId: string | null
}

export const buildCanvasStateSummary = (state: any) => ({
  itemCount: Array.isArray(state?.items) ? state.items.length : 0,
  groupCount: Array.isArray(state?.groups) ? state.groups.length : 0,
  selection: Array.isArray(state?.selectedIds) ? state.selectedIds : [],
})

export const buildWorkspaceDebugPayload = (
  store: AgentNativeWorkspaceStore,
  workspaceId: string,
  workspaceKey: string,
  stateRecord: { updatedAt?: string; payload?: any } | null,
  limit = 60
) => {
  const log = store.getEventLog(workspaceId, workspaceKey)
  const nextLimit = Number.isFinite(limit) ? Math.max(1, Math.min(200, Number(limit))) : 60
  const payload = listWorkspaceEvents(log, 0, nextLimit)
  const pending = listPendingAgentNativeWorkspaceOperations(log, log.appliedCursor)

  return {
    workspaceId,
    workspaceKey,
    cursor: payload.cursor,
    appliedCursor: log.appliedCursor,
    updatedAt: stateRecord?.updatedAt || null,
    stateSummary:
      stateRecord?.payload?.stateSummary && typeof stateRecord.payload.stateSummary === "object"
        ? stateRecord.payload.stateSummary
        : null,
    pendingOperationCount: Array.isArray(pending.operations) ? pending.operations.length : 0,
    events: Array.isArray(payload.events) ? payload.events : [],
  }
}

interface AgentNativeRouteOptions {
  store: AgentNativeWorkspaceStore
  /** Legacy canvas-agent state fallback (canvasAgentStateByProject in vite.config.ts). */
  getCanvasAgentState: (projectId: string) => CanvasAgentProjectStateRecord | null
  /** Canvas workspace writes go through the session subsystem, not the store. */
  upsertCanvasAgentState: (
    projectId: string,
    state: any,
    sourceClientId: string | null,
    meta: Record<string, unknown>
  ) => { updatedAt: string }
  buildCanvasAgentWorkspaceKeys: (projectId: string) => { canvasWorkspaceKey: string }
  captureWorkspaceScreenshot: (input: {
    workspaceId: string
    projectId: string
    target: "desktop" | "mobile"
    origin: string
    focusItemIds?: unknown[]
    cropPadding?: number
    snapshot: any
  }) => Promise<any>
}

/**
 * The `/api/agent-native/*` endpoint group: the global manifest plus
 * per-workspace resources (manifest, state, selection, primitives, sections,
 * export-preview, screenshot, operations, events, user-events, debug).
 * Endpoint URLs and response shapes are frozen — moved verbatim from
 * vite.config.ts (FOX2-75 slice 3).
 */
export function createAgentNativeRoutes({
  store,
  getCanvasAgentState,
  upsertCanvasAgentState,
  buildCanvasAgentWorkspaceKeys,
  captureWorkspaceScreenshot,
}: AgentNativeRouteOptions): RouteHandler {
  return async function handleAgentNativeRoutes(req, res, pathname) {
    if (req.method === "GET" && pathname === "/api/agent-native/manifest") {
      sendJson(res, 200, {
        ok: true,
        manifest: buildAgentNativeManifest(),
      })
      return true
    }

    const workspaceMatch = pathname.match(
      /^\/api\/agent-native\/workspaces\/([^/]+)\/(manifest|state|selection|primitives|sections|export-preview|screenshot|operations|events|user-events|debug)$/
    )
    if (!workspaceMatch) return false

    const workspaceId = decodeURIComponent(workspaceMatch[1])
    const resourceName = workspaceMatch[2]
    const requestUrl = new URL(req.url || "", "http://localhost")
    const requestedWorkspaceKey = requestUrl.searchParams.get("workspaceKey")?.trim() || ""
    const workspaceProjectId = requestUrl.searchParams.get("projectId")?.trim() || "demo"
    const workspaceKey =
      requestedWorkspaceKey ||
      (workspaceId === "canvas"
        ? buildCanvasAgentWorkspaceKeys(workspaceProjectId).canvasWorkspaceKey
        : "default")
    const stateRecord =
      workspaceId === "canvas"
        ? store.getStateRecord(
            workspaceId,
            buildCanvasAgentWorkspaceKeys(workspaceProjectId).canvasWorkspaceKey
          ) || store.getStateRecord(workspaceId, workspaceKey)
        : store.getStateRecord(workspaceId, workspaceKey)

    if (req.method === "POST" && resourceName === "screenshot") {
      try {
        const body = await readJson(req)
        const projectId =
          typeof body.projectId === "string" && body.projectId.trim()
            ? body.projectId.trim()
            : "demo"
        const target =
          typeof body.target === "string" && body.target.trim() === "mobile"
            ? "mobile"
            : "desktop"
        const host = req.headers.host || "127.0.0.1:5173"
        const origin = `http://${host}`
        const capture = await captureWorkspaceScreenshot({
          workspaceId,
          projectId,
          target,
          origin,
          focusItemIds:
            workspaceId === "canvas" && Array.isArray(body.focusItemIds)
              ? body.focusItemIds
              : undefined,
          cropPadding:
            workspaceId === "canvas"
              ? Number.isFinite(body.cropPadding)
                ? Number(body.cropPadding)
                : Number.isFinite(body.focusPadding)
                  ? Number(body.focusPadding)
                  : undefined
              : undefined,
          snapshot:
            workspaceId === "canvas"
              ? buildFocusedCanvasScreenshotSnapshot(
                  body.snapshot ?? null,
                  Array.isArray(body.focusItemIds) ? body.focusItemIds : [],
                  Number.isFinite(body.focusPadding) ? Number(body.focusPadding) : undefined,
                  target
                )
              : body.snapshot ?? null,
        })

        sendJson(res, capture.status === "ready" ? 200 : 501, {
          ok: capture.status === "ready",
          workspaceId,
          capture,
        })
      } catch (error: any) {
        sendJson(res, 400, {
          error: error?.message || "Failed to capture workspace screenshot.",
        })
      }
      return true
    }

    if (resourceName === "operations") {
      if (workspaceId !== "color-audit" && workspaceId !== "system-canvas") {
        sendJson(res, 404, {
          error: "Remote operations are not available for this workspace yet.",
        })
        return true
      }

      if (req.method === "POST") {
        try {
          const body = await readJson(req)
          const nextWorkspaceKey =
            typeof body.workspaceKey === "string" && body.workspaceKey.trim()
              ? body.workspaceKey.trim()
              : ""
          if (!nextWorkspaceKey) {
            sendJson(res, 400, { error: "workspaceKey is required." })
            return true
          }
          if (!body.operation || typeof body.operation !== "object") {
            sendJson(res, 400, { error: "operation is required." })
            return true
          }

          const record = store.appendOperation(
            workspaceId,
            nextWorkspaceKey,
            body.operation,
            body.clientId || null,
            body.source || null
          )

          sendJson(res, 200, {
            ok: true,
            workspaceId,
            workspaceKey: record.workspaceKey,
            operationId: record.id,
            cursor: record.cursor,
            createdAt: record.createdAt,
          })
        } catch (error: any) {
          sendJson(res, 400, {
            error: error?.message || "Failed to queue workspace operation.",
          })
        }
        return true
      }

      if (req.method === "GET") {
        const cursor = Number.parseInt(requestUrl.searchParams.get("cursor") || "0", 10)
        const payload = store.listPendingOperations(workspaceId, workspaceKey, cursor)
        sendJson(res, 200, {
          ok: true,
          workspaceId,
          workspaceKey,
          operations: payload.operations,
          cursor: payload.cursor,
        })
        return true
      }
    }

    if (req.method === "GET" && resourceName === "events") {
      const cursor = Number.parseInt(requestUrl.searchParams.get("cursor") || "0", 10)
      const limit = Number.parseInt(requestUrl.searchParams.get("limit") || "100", 10)
      const payload = store.listEvents(workspaceId, workspaceKey, cursor, limit)
      sendJson(res, 200, {
        ok: true,
        workspaceId,
        workspaceKey,
        events: payload.events,
        cursor: payload.cursor,
      })
      return true
    }

    // Semantic user-action events (FOX2-45): the browser reports
    // user-initiated mutations as operation-shaped payloads so agents
    // can observe what the human did, not just coarse state-synced
    // blobs.
    if (req.method === "POST" && resourceName === "user-events") {
      try {
        const body = await readJson(req)
        const nextWorkspaceKey =
          typeof body.workspaceKey === "string" && body.workspaceKey.trim()
            ? body.workspaceKey.trim()
            : workspaceKey
        if (!nextWorkspaceKey) {
          sendJson(res, 400, { error: "workspaceKey is required." })
          return true
        }
        const incoming = Array.isArray(body.events) ? body.events.slice(0, 50) : []
        // Browser-reported human activity. Default kind is user-action
        // (a semantic UI gesture); source-edit mirrors a mutation-log
        // write (FOX2-46). Both carry actor "user".
        const allowedKinds = new Set(["user-action", "source-edit", "file-lifecycle"])
        const accepted = []
        for (const entry of incoming) {
          if (!entry || typeof entry !== "object") continue
          const action =
            typeof entry.action === "string" && entry.action.trim() ? entry.action.trim() : ""
          if (!action) continue
          const kind = allowedKinds.has(entry.kind) ? entry.kind : "user-action"
          const record = appendAgentNativeWorkspaceEvent(
            store.getEventLog(workspaceId, nextWorkspaceKey),
            {
              kind,
              actor: "user",
              source:
                typeof body.source === "string" && body.source.trim()
                  ? body.source.trim()
                  : "canvas-ui",
              sourceClientId: typeof body.clientId === "string" ? body.clientId : null,
              operation:
                entry.payload && typeof entry.payload === "object" ? entry.payload : null,
              stateSummary: null,
              metadata: {
                action,
                ...(entry.meta && typeof entry.meta === "object" ? entry.meta : {}),
              },
            }
          )
          accepted.push({ id: record.id, cursor: record.cursor })
        }
        sendJson(res, 200, {
          ok: true,
          workspaceId,
          workspaceKey: nextWorkspaceKey,
          accepted,
        })
      } catch (error: any) {
        sendJson(res, 400, {
          error: error?.message || "Failed to record user events.",
        })
      }
      return true
    }

    if (req.method === "GET" && resourceName === "debug") {
      const limit = Number.parseInt(requestUrl.searchParams.get("limit") || "60", 10)
      const fallbackDebugStateRecord =
        workspaceId === "canvas" && !stateRecord
          ? (() => {
              const canvasState = getCanvasAgentState(workspaceProjectId)
              if (!canvasState) return null
              return {
                updatedAt: canvasState.updatedAt,
                payload: {
                  stateSummary: buildCanvasStateSummary(canvasState.state),
                },
              }
            })()
          : stateRecord
      const debug = buildWorkspaceDebugPayload(
        store,
        workspaceId,
        workspaceKey,
        fallbackDebugStateRecord,
        limit
      )
      sendJson(res, 200, {
        ok: true,
        workspaceId,
        workspaceKey,
        debug,
      })
      return true
    }

    if (req.method === "POST" && resourceName === "state") {
      try {
        const body = await readJson(req)
        const nextWorkspaceKey =
          typeof body.workspaceKey === "string" && body.workspaceKey.trim()
            ? body.workspaceKey.trim()
            : ""
        if (!nextWorkspaceKey) {
          sendJson(res, 400, { error: "workspaceKey is required." })
          return true
        }
        if (!body.payload || typeof body.payload !== "object") {
          sendJson(res, 400, { error: "payload is required." })
          return true
        }

        const record =
          workspaceId === "canvas"
            ? upsertCanvasAgentState(workspaceProjectId, body.payload.state, body.clientId || null, {
                source:
                  typeof body.payload?.source === "string" && body.payload.source.trim()
                    ? body.payload.source.trim()
                    : "canvas-ui",
                primitives: body.payload.primitives,
                themeSnapshot: body.payload.themeSnapshot,
                sessionId:
                  typeof body.payload?.sessionId === "string" && body.payload.sessionId.trim()
                    ? body.payload.sessionId.trim()
                    : null,
                toolName:
                  typeof body.payload?.toolName === "string" && body.payload.toolName.trim()
                    ? body.payload.toolName.trim()
                    : null,
              })
            : store.upsertState(workspaceId, nextWorkspaceKey, body.payload, body.clientId || null)

        if (Number.isFinite(body.appliedOperationCursor)) {
          store.acknowledgeOperations(
            workspaceId,
            nextWorkspaceKey,
            Number(body.appliedOperationCursor)
          )
        }

        sendJson(res, 200, {
          ok: true,
          updatedAt: record.updatedAt,
        })
      } catch (error: any) {
        sendJson(res, 400, {
          error: error?.message || "Failed to sync workspace state.",
        })
      }
      return true
    }

    if (req.method === "GET" && resourceName === "state") {
      if (workspaceId === "canvas" && !stateRecord) {
        const canvasState = getCanvasAgentState(workspaceProjectId)
        sendJson(res, 200, {
          ok: true,
          workspaceId,
          workspaceKey,
          state: canvasState
            ? buildCanvasWorkspaceStateResource({
                workspaceKey,
                state: canvasState.state,
                selection: canvasState.state.selectedIds,
                primitives: canvasState.primitives,
                themeSnapshot: canvasState.themeSnapshot,
                stateSummary: buildCanvasStateSummary(canvasState.state),
              })
            : null,
          updatedAt: canvasState?.updatedAt || null,
        })
        return true
      }
      sendJson(res, 200, {
        ok: true,
        workspaceId,
        workspaceKey,
        state: stateRecord?.payload || null,
        updatedAt: stateRecord?.updatedAt || null,
      })
      return true
    }

    if (req.method === "GET" && resourceName === "selection") {
      if (workspaceId !== "canvas") {
        sendJson(res, 404, { error: "Selection is not available for this workspace." })
        return true
      }
      const fallbackCanvasState = getCanvasAgentState(workspaceProjectId)
      const selection = Array.isArray(stateRecord?.payload?.selection)
        ? stateRecord.payload.selection
        : Array.isArray(stateRecord?.payload?.state?.selectedIds)
          ? stateRecord.payload.state.selectedIds
          : Array.isArray(fallbackCanvasState?.state?.selectedIds)
            ? fallbackCanvasState.state.selectedIds
            : []
      sendJson(res, 200, {
        ok: true,
        workspaceId,
        workspaceKey,
        selection,
        updatedAt: stateRecord?.updatedAt || null,
      })
      return true
    }

    if (req.method === "GET" && resourceName === "primitives") {
      if (workspaceId !== "canvas") {
        sendJson(res, 404, { error: "Primitives are not available for this workspace." })
        return true
      }
      const fallbackCanvasState = getCanvasAgentState(workspaceProjectId)
      sendJson(res, 200, {
        ok: true,
        workspaceId,
        workspaceKey,
        primitives: Array.isArray(stateRecord?.payload?.primitives)
          ? stateRecord.payload.primitives
          : Array.isArray(fallbackCanvasState?.primitives)
            ? fallbackCanvasState.primitives
            : [],
        updatedAt: stateRecord?.updatedAt || null,
      })
      return true
    }

    if (req.method === "GET" && resourceName === "sections") {
      if (workspaceId !== "node-catalog") {
        sendJson(res, 404, { error: "Sections are not available for this workspace." })
        return true
      }
      sendJson(res, 200, {
        ok: true,
        workspaceId,
        workspaceKey,
        sections: {
          workspaceSections: stateRecord?.payload?.workspaceSections || [],
          nodeSections: stateRecord?.payload?.nodeSections || [],
        },
        updatedAt: stateRecord?.updatedAt || null,
      })
      return true
    }

    if (req.method === "GET" && resourceName === "export-preview") {
      if (workspaceId !== "color-audit") {
        sendJson(res, 404, { error: "Export preview is not available for this workspace." })
        return true
      }
      sendJson(res, 200, {
        ok: true,
        workspaceId,
        workspaceKey,
        exportPreview: stateRecord?.payload?.exportPreview || null,
        updatedAt: stateRecord?.updatedAt || null,
      })
      return true
    }

    if (req.method === "GET" && resourceName === "manifest") {
      const currentState =
        stateRecord?.payload?.stateSummary ||
        (workspaceId === "canvas"
          ? buildCanvasStateSummary(getCanvasAgentState(workspaceProjectId)?.state)
          : undefined)
      const manifest =
        workspaceId === "canvas"
          ? buildCanvasWorkspaceManifest(
              stateRecord?.payload || (currentState ? { stateSummary: currentState } : null)
            )
          : workspaceId === "color-audit"
            ? buildColorAuditWorkspaceManifest(stateRecord?.payload || null)
            : // Unknown ids from the URL fall through to the 404 below.
              buildWorkspaceManifest(workspaceId as AgentNativeWorkspaceId, currentState)

      if (!manifest) {
        sendJson(res, 404, { error: "Unknown workspace." })
        return true
      }

      sendJson(res, 200, {
        ok: true,
        workspaceId,
        workspaceKey,
        manifest,
        updatedAt: stateRecord?.updatedAt || null,
      })
      return true
    }

    return false
  }
}
