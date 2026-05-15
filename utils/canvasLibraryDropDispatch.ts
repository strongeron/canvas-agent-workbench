// Orchestrates a library-panel drop onto an iframe drop-zone into a single
// structural source mutation:
//
//   drop intent (insert at index | wrap leaf)
//     → build the mutation from the staged primitive
//     → POST /api/canvas/ast/write
//     → onSource*Change callback (parent updates state → recompile fires)
//
// Same surface CanvasReactNodePropertyPanel.applyMutations and
// dispatchCanvasResize already use: the /api/canvas/ast/write endpoint
// discriminates TSX vs HTML via the supplied sourceReact / sourceHtml field,
// and file-backed nodes pass filePath + mtimeMs while inline nodes pass the
// source text directly.
//
// Scope decisions (confirmed with the user, 2026-05-15):
// - Non-leaf parent  → insertChild { parentCanvasId, position, childSource }.
// - Leaf parent      → wrapSelection { canvasId, wrapperTag }, plan-literal.
//   The primitive's props/children are intentionally not represented because
//   wrapSelection only carries a tag name.
// - childSource is the raw primitive snippet; no import is injected, so a drop
//   into a file that does not already import the component surfaces a
//   recompile error via the returned { status: "error" } (same constraint the
//   property panel's manual insertChild already has). Atomic temp+rename on
//   the endpoint means a failed write never corrupts the file.

import type { CanvasAstMutation } from "./canvasAstWriter"
import type { CanvasHtmlMutation } from "./canvasHtmlEditor"
import {
  buildPrimitiveChildSource,
  derivePrimitiveWrapperTag,
  type CanvasRegistryPrimitive,
} from "./canvasRegistry"

export type CanvasLibraryDropIntent =
  | { kind: "insert"; parentCanvasId: string; index: number }
  | { kind: "wrap"; canvasId: string }

export interface CanvasLibraryDropWriteSuccess {
  sourceKind: "tsx" | "html"
  filePath?: string
  mtimeMs?: number
  mutations: Array<CanvasAstMutation | CanvasHtmlMutation>
  appliedMutations: number
  canvasIdMap?: Record<string, string | null>
  prevSourceSnapshot?: string
  nextSourceSnapshot: string
}

export interface CanvasLibraryDropDispatchDeps {
  sourceKind: "tsx" | "html"
  sourceId: string
  sourceReact?: string
  sourceHtml?: string
  filePath?: string
  mtimeMs?: number | null
  /** Called on a successful TSX write with the rewritten source + new mtime. */
  onSourceReactChange?: (source: string, mtime?: number) => void
  /** Called on a successful HTML write with the rewritten source + new mtime. */
  onSourceHtmlChange?: (source: string, mtime?: number) => void
  /** Fires on success so the caller can push a mutation-log entry. */
  onWriteSuccess?: (result: CanvasLibraryDropWriteSuccess) => void
  /** Test seam — defaults to global fetch in production. */
  fetchImpl?: typeof fetch
}

export type CanvasLibraryDropResult =
  | { status: "applied"; mutation: CanvasAstMutation }
  | { status: "error"; error: string }

function buildMutation(
  intent: CanvasLibraryDropIntent,
  primitive: CanvasRegistryPrimitive
): CanvasAstMutation {
  if (intent.kind === "insert") {
    return {
      type: "insertChild",
      parentCanvasId: intent.parentCanvasId,
      position: intent.index,
      childSource: buildPrimitiveChildSource(primitive),
    }
  }
  return {
    type: "wrapSelection",
    canvasId: intent.canvasId,
    wrapperTag: derivePrimitiveWrapperTag(primitive),
  }
}

export async function dispatchCanvasLibraryDrop(
  intent: CanvasLibraryDropIntent,
  primitive: CanvasRegistryPrimitive,
  deps: CanvasLibraryDropDispatchDeps
): Promise<CanvasLibraryDropResult> {
  const fetchImpl = deps.fetchImpl ?? fetch
  const fileBacked = Boolean(deps.filePath)
  const mutation = buildMutation(intent, primitive)

  try {
    const writeResp = await fetchImpl("/api/canvas/ast/write", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceReact: deps.sourceKind === "tsx" && !fileBacked ? deps.sourceReact : undefined,
        sourceHtml: deps.sourceKind === "html" && !fileBacked ? deps.sourceHtml : undefined,
        sourceId: deps.sourceId,
        mutations: [mutation],
        filePath: fileBacked ? deps.filePath : undefined,
        mtimeMs: fileBacked ? deps.mtimeMs : undefined,
      }),
    })
    const writePayload = (await writeResp.json().catch(() => ({}))) as {
      ok?: boolean
      sourceReact?: string
      sourceHtml?: string
      appliedMutations?: number
      canvasIdMap?: Record<string, string | null>
      prevSourceSnapshot?: string
      mtimeMs?: number | null
      error?: string
      code?: string
    }
    const nextSource =
      deps.sourceKind === "html" ? writePayload.sourceHtml : writePayload.sourceReact
    if (!writeResp.ok || !writePayload.ok || typeof nextSource !== "string") {
      const errorMsg = writePayload.error || "Failed to insert dropped primitive."
      return {
        status: "error",
        error:
          writePayload.code === "mtime-conflict"
            ? `${errorMsg} The file changed on disk since it was loaded.`
            : errorMsg,
      }
    }

    const nextMtime = typeof writePayload.mtimeMs === "number" ? writePayload.mtimeMs : undefined
    if (deps.sourceKind === "html") {
      deps.onSourceHtmlChange?.(nextSource, nextMtime)
    } else {
      deps.onSourceReactChange?.(nextSource, nextMtime)
    }
    deps.onWriteSuccess?.({
      sourceKind: deps.sourceKind,
      filePath: deps.filePath,
      mtimeMs: nextMtime,
      mutations: [mutation],
      appliedMutations:
        typeof writePayload.appliedMutations === "number" ? writePayload.appliedMutations : 0,
      canvasIdMap: writePayload.canvasIdMap,
      prevSourceSnapshot: writePayload.prevSourceSnapshot,
      nextSourceSnapshot: nextSource,
    })

    return { status: "applied", mutation }
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Failed to insert dropped primitive.",
    }
  }
}
