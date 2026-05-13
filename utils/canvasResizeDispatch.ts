// Orchestrates a single overlay drag-commit into a source-file mutation:
//
//   resize event
//     → POST /api/canvas/ast/read  (fetch the element's current className)
//     → computeResizeMutation        (snap to a Tailwind w-* / h-* class)
//     → POST /api/canvas/ast/write   (apply the setClassName mutation)
//     → onSourceChange callback      (parent updates state → recompile fires)
//
// Pure orchestration: takes the resize event plus the parent's source
// state + change callbacks as inputs, talks to the existing AST endpoints
// (same surface CanvasReactNodePropertyPanel.applyMutations already uses),
// and returns a structured result so callers can show toasts / mark
// "saving…" UI without depending on this module's internals.
//
// Scope:
// - TSX (sourceKind="tsx") and HTML (sourceKind="html") both supported by
//   re-using the existing /api/canvas/ast/read + /api/canvas/ast/write
//   endpoints, which already discriminate on sourceKind via the supplied
//   sourceReact / sourceHtml field.
// - File-backed nodes use filePath + mtimeMs; inline-source nodes pass
//   sourceReact/sourceHtml directly. Mirrors the existing applyMutations
//   pattern in CanvasReactNodePropertyPanel.
// - No-op writes are short-circuited before the network round-trip.

import type { CanvasReactNodeResizeEvent } from "../components/canvas/CanvasHtmlFrame"
import type { AstAttributeInfo, AstNodeInfo } from "./canvasAstReader"
import { computeResizeMutation } from "./canvasResizeMutation"

export interface CanvasResizeDispatchDeps {
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
  /** Test seam — defaults to global fetch in production. */
  fetchImpl?: typeof fetch
}

export type CanvasResizeDispatchResult =
  | { status: "applied"; mutation: { type: "setClassName"; value: string } }
  | { status: "no-op"; reason: "move-handle" | "sub-snap" | "no-class-attr" | "non-literal-class" }
  | { status: "error"; error: string }

export async function dispatchCanvasResize(
  event: CanvasReactNodeResizeEvent,
  deps: CanvasResizeDispatchDeps
): Promise<CanvasResizeDispatchResult> {
  if (event.kind === "move") {
    return { status: "no-op", reason: "move-handle" }
  }

  const fetchImpl = deps.fetchImpl ?? fetch
  const fileBacked = Boolean(deps.filePath)

  try {
    // 1. Read the element so we know its current className.
    const readResp = await fetchImpl("/api/canvas/ast/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceReact: deps.sourceKind === "tsx" && !fileBacked ? deps.sourceReact : undefined,
        sourceHtml: deps.sourceKind === "html" && !fileBacked ? deps.sourceHtml : undefined,
        canvasId: event.canvasId,
        sourceId: deps.sourceId,
        filePath: fileBacked ? deps.filePath : undefined,
      }),
    })
    const readPayload = (await readResp.json().catch(() => ({}))) as {
      ok?: boolean
      node?: AstNodeInfo
      error?: string
    }
    if (!readResp.ok || !readPayload.ok || !readPayload.node) {
      return { status: "error", error: readPayload.error || "Failed to read AST node." }
    }
    const classNameAttr = readPayload.node.attributes.find(
      (a: AstAttributeInfo) => a.name === "className" || a.name === "class"
    )
    if (!classNameAttr) {
      return { status: "no-op", reason: "no-class-attr" }
    }
    // Only literal-string className can be safely rewritten by setClassName
    // today. Expression className (e.g. cn("p-4", isOpen && "bg-red")) needs
    // a richer mutation; deferred.
    if (classNameAttr.kind !== "literal-string") {
      return { status: "no-op", reason: "non-literal-class" }
    }

    // 2. Compute the mutation.
    const mutation = computeResizeMutation({
      kind: event.kind,
      delta: event.deltaIframe,
      rect: { width: event.rect.width, height: event.rect.height },
      className: classNameAttr.value,
    })
    if (!mutation) {
      return { status: "no-op", reason: "sub-snap" }
    }

    // 3. Apply via the writer.
    const writeResp = await fetchImpl("/api/canvas/ast/write", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceReact: deps.sourceKind === "tsx" && !fileBacked ? deps.sourceReact : undefined,
        sourceHtml: deps.sourceKind === "html" && !fileBacked ? deps.sourceHtml : undefined,
        canvasId: event.canvasId,
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
      mtimeMs?: number | null
      error?: string
      code?: string
    }
    const nextSource =
      deps.sourceKind === "html" ? writePayload.sourceHtml : writePayload.sourceReact
    if (!writeResp.ok || !writePayload.ok || typeof nextSource !== "string") {
      const errorMsg = writePayload.error || "Failed to apply resize mutation."
      return {
        status: "error",
        error:
          writePayload.code === "mtime-conflict"
            ? `${errorMsg} The file changed on disk since it was loaded.`
            : errorMsg,
      }
    }

    // 4. Push the rewritten source upward so the iframe recompiles.
    const nextMtime = typeof writePayload.mtimeMs === "number" ? writePayload.mtimeMs : undefined
    if (deps.sourceKind === "html") {
      deps.onSourceHtmlChange?.(nextSource, nextMtime)
    } else {
      deps.onSourceReactChange?.(nextSource, nextMtime)
    }

    return { status: "applied", mutation }
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Failed to apply resize mutation.",
    }
  }
}
