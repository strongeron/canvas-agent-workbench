import { buildCanvasWorkspaceStateResource } from "../utils/canvasWorkspaceAdapter"
import { buildCanvasStateSummary } from "./agentNativeRoutes"
import type {
  CanvasAgentProjectStateRecord,
  CanvasAgentProjectStore,
} from "./canvasAgentProjectStore"
import { readJson, sendJson, type RouteHandler } from "./projectCanvasRoutes"

interface CanvasAgentRouteOptions {
  projectStore: CanvasAgentProjectStore
  /** Canvas state writes go through the session subsystem (artifacts, feed). */
  upsertCanvasAgentState: (
    projectId: string,
    state: any,
    sourceClientId: string | null,
    meta: Record<string, unknown>
  ) => CanvasAgentProjectStateRecord
  /** FOX2-74 single validation boundary — schema check, id minting, events. */
  applyCanvasAgentOperation: (input: {
    projectId: string
    operation: unknown
    clientId: string | null
    sessionId: string | null
    source: string
    toolName: string | null
  }) => CanvasAgentProjectStateRecord
  buildCanvasAgentWorkspaceKeys: (projectId: string) => { canvasWorkspaceKey: string }
  agentDefinitions: unknown[]
}

/**
 * The non-session `/api/canvas-agent/*` endpoints: agent definitions, canvas
 * state read/sync, and the operation apply boundary. Sessions, PTY, and the
 * SSE event stream stay in vite.config.ts until the next slice. Endpoint
 * URLs and response shapes are frozen — moved verbatim from vite.config.ts
 * (FOX2-75 slice 4).
 */
export function createCanvasAgentRoutes({
  projectStore,
  upsertCanvasAgentState,
  applyCanvasAgentOperation,
  buildCanvasAgentWorkspaceKeys,
  agentDefinitions,
}: CanvasAgentRouteOptions): RouteHandler {
  return async function handleCanvasAgentRoutes(req, res, pathname) {
    if (req.method === "GET" && pathname === "/api/canvas-agent/agents") {
      sendJson(res, 200, {
        ok: true,
        agents: agentDefinitions,
      })
      return true
    }

    if (req.method === "GET" && pathname === "/api/canvas-agent/state") {
      const requestUrl = new URL(req.url || "", "http://localhost")
      const projectId = requestUrl.searchParams.get("projectId")?.trim()
      if (!projectId) {
        sendJson(res, 400, { error: "projectId query param is required." })
        return true
      }

      const stateRecord = projectStore.getState(projectId)
      sendJson(res, 200, {
        ok: true,
        state: stateRecord
          ? buildCanvasWorkspaceStateResource({
              workspaceKey: buildCanvasAgentWorkspaceKeys(projectId).canvasWorkspaceKey,
              state: stateRecord.state,
              selection: stateRecord.state.selectedIds,
              primitives: stateRecord.primitives,
              themeSnapshot: stateRecord.themeSnapshot,
              stateSummary: buildCanvasStateSummary(stateRecord.state),
            })
          : null,
        primitives: stateRecord?.primitives || [],
        updatedAt: stateRecord?.updatedAt || null,
        sourceClientId: stateRecord?.sourceClientId || null,
      })
      return true
    }

    if (req.method === "POST" && pathname === "/api/canvas-agent/state") {
      try {
        const body = await readJson(req)
        const projectId = typeof body.projectId === "string" ? body.projectId.trim() : ""
        if (!projectId) {
          sendJson(res, 400, { error: "projectId is required." })
          return true
        }

        const nextState =
          body.payload && typeof body.payload === "object" && body.payload.state
            ? body.payload.state
            : body.state
        const nextPrimitives =
          body.payload && typeof body.payload === "object" && Array.isArray(body.payload.primitives)
            ? body.payload.primitives
            : body.primitives
        const nextThemeSnapshot =
          body.payload && typeof body.payload === "object" && body.payload.themeSnapshot
            ? body.payload.themeSnapshot
            : body.themeSnapshot

        const stateRecord = upsertCanvasAgentState(projectId, nextState, body.clientId, {
          source:
            typeof body.source === "string" && body.source.trim() ? body.source.trim() : "canvas-ui",
          primitives: nextPrimitives,
          themeSnapshot: nextThemeSnapshot,
          sessionId:
            typeof body.sessionId === "string" && body.sessionId.trim()
              ? body.sessionId.trim()
              : null,
          toolName:
            typeof body.toolName === "string" && body.toolName.trim() ? body.toolName.trim() : null,
        })
        sendJson(res, 200, {
          ok: true,
          primitives: stateRecord.primitives,
          updatedAt: stateRecord.updatedAt,
        })
      } catch (error: any) {
        sendJson(res, 400, {
          error: error?.message || "Failed to sync canvas state.",
        })
      }
      return true
    }

    if (req.method === "POST" && pathname === "/api/canvas-agent/operations") {
      try {
        const body = await readJson(req)
        const projectId = typeof body.projectId === "string" ? body.projectId.trim() : ""
        const sessionId =
          typeof body.sessionId === "string" && body.sessionId.trim() ? body.sessionId.trim() : null
        const toolName =
          typeof body.toolName === "string" && body.toolName.trim() ? body.toolName.trim() : null
        const source =
          typeof body.source === "string" && body.source.trim()
            ? body.source.trim()
            : toolName
              ? `canvas-tool:${toolName}`
              : "canvas-operation"
        if (!projectId) {
          sendJson(res, 400, { error: "projectId is required." })
          return true
        }

        const updatedRecord = applyCanvasAgentOperation({
          projectId,
          operation: body.operation,
          clientId: body.clientId || null,
          sessionId,
          source,
          toolName,
        })

        sendJson(res, 200, {
          ok: true,
          updatedAt: updatedRecord.updatedAt,
          state: updatedRecord.state,
        })
      } catch (error: any) {
        sendJson(res, 400, {
          error: error?.message || "Failed to apply canvas operation.",
        })
      }
      return true
    }

    return false
  }
}
