// U12 group transform. Applies an overlay resize drag to every element in a
// single-iframe multi-selection by running the same read → snap → write
// sequence dispatchCanvasResize uses, once per target, sequentially.
//
// Why sequential + in-memory threading:
// - setClassName is a *literal* mutation, so canvasIds stay positionally
//   stable across writes — no canvasIdMap rebase needed between targets.
// - Each write changes the file mtime; the next write must use the new
//   mtime. We thread the returned source + mtime forward in memory rather
//   than round-tripping through React state between awaits, then push one
//   final onSource*Change so the iframe recompiles once.
// - A failed target does not abort the batch: it keeps the prior threaded
//   source/mtime and the loop continues, so a partial group still applies.
//
// Scope: resize handles only. "move" is a no-op here exactly as in the
// single-node dispatcher (re-positioning isn't expressible as a class).

import type { CanvasOverlayDragKind } from "../components/canvas/CanvasIframeOverlay"
import type { CanvasReactNodeRect } from "./canvasReactNodeBridge"
import type { AstAttributeInfo, AstNodeInfo } from "./canvasAstReader"
import { computeResizeMutation } from "./canvasResizeMutation"
import {
  computeResizeStyleFallback,
  type CanvasSetAttributeStyleMutation,
} from "./canvasResizeStyleMutation"

export interface CanvasGroupResizeTarget {
  canvasId: string
  rect: CanvasReactNodeRect
}

export interface CanvasGroupResizeWriteSuccess {
  sourceKind: "tsx" | "html"
  filePath?: string
  mtimeMs?: number
  mutations: Array<{ type: "setClassName"; value: string } | CanvasSetAttributeStyleMutation>
  appliedMutations: number
  canvasIdMap?: Record<string, string | null>
  prevSourceSnapshot?: string
  nextSourceSnapshot: string
}

export interface CanvasGroupResizeDispatchDeps {
  sourceKind: "tsx" | "html"
  sourceId: string
  sourceReact?: string
  sourceHtml?: string
  filePath?: string
  mtimeMs?: number | null
  onSourceReactChange?: (source: string, mtime?: number) => void
  onSourceHtmlChange?: (source: string, mtime?: number) => void
  /**
   * Fires once per drag gesture (not per target) when at least one write
   * applied, so Cmd-Z undoes the whole group resize in a single step.
   */
  onWriteSuccess?: (result: CanvasGroupResizeWriteSuccess) => void
  fetchImpl?: typeof fetch
}

export interface CanvasGroupResizeResult {
  applied: number
  skipped: number
  errors: string[]
}

export async function dispatchCanvasGroupResize(
  input: {
    kind: CanvasOverlayDragKind
    deltaIframe: { dx: number; dy: number }
    targets: CanvasGroupResizeTarget[]
  },
  deps: CanvasGroupResizeDispatchDeps
): Promise<CanvasGroupResizeResult> {
  if (input.kind === "move") {
    return { applied: 0, skipped: input.targets.length, errors: [] }
  }

  const fetchImpl = deps.fetchImpl ?? fetch
  const fileBacked = Boolean(deps.filePath)
  const isHtml = deps.sourceKind === "html"

  let workingSource = isHtml ? deps.sourceHtml ?? "" : deps.sourceReact ?? ""
  let workingMtime: number | undefined =
    typeof deps.mtimeMs === "number" ? deps.mtimeMs : undefined

  let applied = 0
  let skipped = 0
  const errors: string[] = []
  // Snapshot of the source before the FIRST successful write — the undo
  // target for the whole gesture. For inline sources the initial working
  // source is authoritative; file-backed writes report their own snapshot.
  let gesturePrevSnapshot: string | undefined = fileBacked ? undefined : workingSource
  const appliedMutations: Array<
    { type: "setClassName"; value: string } | CanvasSetAttributeStyleMutation
  > = []

  for (const target of input.targets) {
    try {
      const readResp = await fetchImpl("/api/canvas/ast/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceReact: !isHtml && !fileBacked ? workingSource : undefined,
          sourceHtml: isHtml && !fileBacked ? workingSource : undefined,
          canvasId: target.canvasId,
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
        errors.push(readPayload.error || `Failed to read ${target.canvasId}.`)
        continue
      }
      const classAttr = readPayload.node.attributes.find(
        (a: AstAttributeInfo) => a.name === "className" || a.name === "class"
      )
      // Mirror dispatchCanvasResize: literal class → snap a w-*/h-* class;
      // computed class on an HTML node → merge inline-style px (so group
      // resize stays at parity with single resize); computed class on TSX →
      // skip (React `style` is an object expression, a v4 decision).
      let mutation:
        | { type: "setClassName"; value: string }
        | CanvasSetAttributeStyleMutation
        | null
      if (classAttr && classAttr.kind !== "literal-string") {
        if (!isHtml) {
          skipped += 1
          continue
        }
        const styleAttr = readPayload.node.attributes.find(
          (a: AstAttributeInfo) => a.name === "style"
        )
        mutation = computeResizeStyleFallback({
          kind: input.kind,
          delta: input.deltaIframe,
          rect: { width: target.rect.width, height: target.rect.height },
          style: styleAttr?.value ?? "",
        })
      } else {
        mutation = computeResizeMutation({
          kind: input.kind,
          delta: input.deltaIframe,
          rect: { width: target.rect.width, height: target.rect.height },
          className: classAttr?.value ?? "",
        })
      }
      if (!mutation) {
        skipped += 1
        continue
      }
      const writeResp = await fetchImpl("/api/canvas/ast/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceReact: !isHtml && !fileBacked ? workingSource : undefined,
          sourceHtml: isHtml && !fileBacked ? workingSource : undefined,
          canvasId: target.canvasId,
          sourceId: deps.sourceId,
          mutations: [mutation],
          filePath: fileBacked ? deps.filePath : undefined,
          mtimeMs: fileBacked ? workingMtime : undefined,
        }),
      })
      const writePayload = (await writeResp.json().catch(() => ({}))) as {
        ok?: boolean
        sourceReact?: string
        sourceHtml?: string
        prevSourceSnapshot?: string
        mtimeMs?: number | null
        error?: string
        code?: string
      }
      const nextSource = isHtml ? writePayload.sourceHtml : writePayload.sourceReact
      if (!writeResp.ok || !writePayload.ok || typeof nextSource !== "string") {
        const base = writePayload.error || `Failed to resize ${target.canvasId}.`
        errors.push(
          writePayload.code === "mtime-conflict"
            ? `${base} The file changed on disk since it was loaded.`
            : base
        )
        continue
      }
      if (applied === 0 && gesturePrevSnapshot === undefined) {
        gesturePrevSnapshot = writePayload.prevSourceSnapshot
      }
      workingSource = nextSource
      if (typeof writePayload.mtimeMs === "number") workingMtime = writePayload.mtimeMs
      applied += 1
      appliedMutations.push(mutation)
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `Failed to resize ${target.canvasId}.`)
    }
  }

  if (applied > 0) {
    if (isHtml) deps.onSourceHtmlChange?.(workingSource, workingMtime)
    else deps.onSourceReactChange?.(workingSource, workingMtime)
    deps.onWriteSuccess?.({
      sourceKind: deps.sourceKind,
      filePath: deps.filePath,
      mtimeMs: workingMtime,
      mutations: appliedMutations,
      appliedMutations: applied,
      prevSourceSnapshot: gesturePrevSnapshot,
      nextSourceSnapshot: workingSource,
    })
  }

  return { applied, skipped, errors }
}
