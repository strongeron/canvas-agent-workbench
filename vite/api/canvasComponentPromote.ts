import { extractHtmlSubtree } from "../../utils/canvasHtmlEditor"
import {
  applyCanvasComponentCreateRequest,
  type CanvasComponentCreateResponse,
} from "./canvasComponentCreate"

interface CanvasComponentPromoteBody {
  projectId?: unknown
  name?: unknown
  description?: unknown
  sourceHtml?: unknown
  canvasId?: unknown
  sourceId?: unknown
}

interface CanvasComponentPromoteOptions {
  workspaceRoot: string
}

export type CanvasComponentPromoteResponse = CanvasComponentCreateResponse

export async function applyCanvasComponentPromoteRequest(
  body: CanvasComponentPromoteBody,
  options: CanvasComponentPromoteOptions
): Promise<CanvasComponentPromoteResponse> {
  const sourceHtml = typeof body.sourceHtml === "string" ? body.sourceHtml : ""
  const canvasId = typeof body.canvasId === "string" ? body.canvasId : ""
  const sourceId = typeof body.sourceId === "string" ? body.sourceId : ""

  if (!sourceHtml || !canvasId || !sourceId) {
    return {
      ok: false,
      status: 400,
      code: "bad-input",
      error: "sourceHtml, canvasId, and sourceId are required.",
    }
  }

  const extracted = extractHtmlSubtree(sourceHtml, canvasId, { sourceId })
  if (!extracted.ok) {
    return {
      ok: false,
      status: extracted.code === "not-found" ? 404 : 400,
      code: extracted.code,
      error: extracted.error,
    }
  }

  return applyCanvasComponentCreateRequest(
    {
      projectId: body.projectId,
      name: body.name,
      description: body.description,
      format: "html",
      sourceHtml: extracted.subtreeHtml,
    },
    options
  )
}
