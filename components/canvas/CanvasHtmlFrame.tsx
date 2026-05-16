import { Code2, ExternalLink } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import type { CanvasHtmlItem } from "../../types/canvas"
import { screenDeltaToIframeLocal } from "../../utils/canvasIframeCoordinates"
import {
  buildDropTargetHitTestRequest,
  buildRefreshRectRequest,
  isCanvasReactNodeMessage,
  type CanvasReactNodeDropTargetSibling,
  type CanvasReactNodeRect,
} from "../../utils/canvasReactNodeBridge"
import {
  CanvasIframeDropZones,
  type CanvasDropZoneRect,
  type CanvasDropZoneSibling,
} from "./CanvasIframeDropZones"
import {
  CanvasIframeOverlay,
  type CanvasOverlayDragKind,
} from "./CanvasIframeOverlay"

export interface CanvasReactNodeSelection {
  itemId: string
  canvasId: string
  tag: string
  rect: CanvasReactNodeRect
  fileHint?: string
  /**
   * The compile generation this canvasId belongs to. Bumped on every
   * recompile of the source. Downstream consumers (property panel, AST
   * writer) compare this to the current generation and reject stale
   * selections before mutating the source file.
   */
  compileGeneration: number
}

/**
 * Emitted on overlay drag commit (resize handle or move). The delta is in
 * iframe-document units (canvas scale already removed), so the dispatcher
 * can compare it directly against current width/height to compute a snap or
 * inline style mutation.
 */
export interface CanvasReactNodeResizeEvent {
  itemId: string
  canvasId: string
  kind: CanvasOverlayDragKind
  deltaIframe: { dx: number; dy: number }
  /** The element's rect at drag-start, in iframe-document coordinates. */
  rect: CanvasReactNodeRect
}

interface CanvasHtmlFrameProps {
  item: CanvasHtmlItem
  interactMode: boolean
  activeSelection?: CanvasReactNodeSelection | null
  /**
   * Called when the user selects an element inside a React TSX preview node
   * (via the U2 click bridge). The canvas wires this up to the property
   * panel in U3.
   */
  onReactNodeSelect?: (selection: CanvasReactNodeSelection) => void
  onReactCompileGenerationChange?: (itemId: string, generation: number) => void
  /**
   * Canvas zoom (CanvasTab.transform.scale). Used to translate the overlay's
   * viewport-pixel drag delta into iframe-document units. Defaults to 1 so
   * existing call sites and tests keep working until they plumb scale through.
   */
  canvasScale?: number
  /**
   * Called once on pointer-up of an overlay drag (resize/move). Delta is
   * already in iframe-document coordinates. The dispatcher decides whether
   * to round to a Tailwind class or emit inline style and posts the
   * resulting setClassName / setStyle mutation through the AST writer.
   */
  onReactNodeResize?: (event: CanvasReactNodeResizeEvent) => void
  /**
   * U4b slice 3.2c. When true, the frame renders a transparent capture layer
   * over the iframe that intercepts dragover events, hit-tests the iframe via
   * the `canvas/drop-target-hit-test` bridge protocol, and renders the drop
   * zones returned in `canvas/drop-target-result`. Cleared on `false` and on
   * dragleave; the parent owns the drag lifecycle (set on library-panel
   * dragstart, cleared on library-panel dragend).
   */
  libraryDragActive?: boolean
  /** Fires when the user drops a library primitive onto an insert line. */
  onLibraryDropInsert?: (input: { itemId: string; parentCanvasId: string; index: number }) => void
  /** Fires when the user drops a library primitive onto a leaf-parent wrap zone. */
  onLibraryDropWrap?: (input: { itemId: string; canvasId: string }) => void
}

function toDropZoneRect(rect: CanvasReactNodeRect): CanvasDropZoneRect {
  return { left: rect.x, top: rect.y, width: rect.width, height: rect.height }
}

function toDropZoneSibling(sibling: CanvasReactNodeDropTargetSibling): CanvasDropZoneSibling {
  return { canvasId: sibling.canvasId, rect: toDropZoneRect(sibling.rect), index: sibling.index }
}

export function CanvasHtmlFrame({
  item,
  interactMode,
  activeSelection = null,
  onReactNodeSelect,
  onReactCompileGenerationChange,
  canvasScale = 1,
  onReactNodeResize,
  libraryDragActive = false,
  onLibraryDropInsert,
  onLibraryDropWrap,
}: CanvasHtmlFrameProps) {
  const title = item.title?.trim() || "HTML bundle"
  const sourceHtml = item.sourceHtml?.trim() || ""
  const sourceReact = item.sourceReact?.trim() || ""
  const sourceCss = item.sourceCss || ""
  const shouldRenderReact = item.sourceMode === "react"
  const shouldRenderInline =
    item.sourceMode === "inline" || (!item.src && Boolean(sourceHtml) && !shouldRenderReact)
  const [compiledReactHtml, setCompiledReactHtml] = useState("")
  const [injectedInlineHtml, setInjectedInlineHtml] = useState("")
  const [compileStatus, setCompileStatus] = useState<"idle" | "loading" | "ready" | "error">("idle")
  const [compileError, setCompileError] = useState("")
  const [hoverRect, setHoverRect] = useState<CanvasReactNodeRect | null>(null)
  const [selectionRect, setSelectionRect] = useState<CanvasReactNodeRect | null>(null)
  // Tracks which canvasId the selectionRect belongs to. Read by the overlay's
  // drag-commit callback (so the dispatched resize event carries the right
  // id) and by the rect-update filter (apply only when the message id still
  // matches the active selection).
  const [selectedCanvasId, setSelectedCanvasId] = useState<string | null>(null)
  // U12: single-iframe multi-select. Shift-click appends/toggles; a plain
  // click replaces with one. >1 entry renders a read-only union outline +
  // count badge. Group-transform writes are a separate slice — this slice
  // ships the selection model + visualization only.
  const [multiSelections, setMultiSelections] = useState<
    Array<{ canvasId: string; rect: CanvasReactNodeRect }>
  >([])
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  // U4b drop-target state. `null` means "no target under cursor" (clear zones);
  // a populated value means the bridge resolved an ancestor and we should
  // render either insert lines or a wrap zone over it.
  const [dropTargetState, setDropTargetState] = useState<{
    parentCanvasId: string
    parentRect: CanvasDropZoneRect
    siblings: CanvasDropZoneSibling[]
    leaf: boolean
  } | null>(null)
  // Last requestId we sent on dragover. Responses must echo this exact id;
  // anything else is stale (dragover fires faster than the iframe can reply).
  const dropTargetRequestIdRef = useRef<string | null>(null)
  // rAF-coalesced hit-test scheduler — dragover fires ~60Hz, browsers already
  // throttle it, but coalescing keeps the postMessage rate predictable even
  // under jank.
  const dropTargetRafRef = useRef<number | null>(null)
  const dropTargetPendingCoordsRef = useRef<{ x: number; y: number } | null>(null)
  // U2: the sourceId that drives data-canvas-id injection and the bridge's
  // fileHint. For v1 we use the canvas item id; once registry-backed nodes
  // exist (U6) this becomes the source file path so multiple instances of
  // the same component agree on ids.
  const sourceId = item.sourcePath || item.sourceReactFilePath || item.id
  // Compile generation: bumped every time we kick off a new compile. The
  // parent attaches the *current* generation to outbound selections so a
  // stale canvasId from a previous compile (referencing an AST node that
  // may not exist after recompile) can be rejected by the property panel
  // (U3) and the AST writer (U4) before any source mutation runs.
  const compileGenerationRef = useRef(0)

  useEffect(() => {
    if (!shouldRenderReact) {
      setCompiledReactHtml("")
      setCompileStatus("idle")
      setCompileError("")
      onReactCompileGenerationChange?.(item.id, 0)
      return
    }

    if (!sourceReact) {
      compileGenerationRef.current += 1
      onReactCompileGenerationChange?.(item.id, compileGenerationRef.current)
      setCompiledReactHtml("")
      setCompileStatus("error")
      setCompileError("React source is missing.")
      return
    }

    const controller = new AbortController()
    compileGenerationRef.current += 1
    onReactCompileGenerationChange?.(item.id, compileGenerationRef.current)
    setCompileStatus("loading")
    setCompileError("")

    fetch("/api/canvas/compile-react", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceReact,
        sourceCss,
        title,
        sourceId,
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}))
        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.error || "Failed to compile React source.")
        }
        return String(payload.html || "")
      })
      .then((html) => {
        setCompiledReactHtml(html)
        setCompileStatus("ready")
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        setCompiledReactHtml("")
        setCompileStatus("error")
        setCompileError(error instanceof Error ? error.message : "Failed to compile React source.")
      })

    return () => controller.abort()
  }, [
    item.id,
    onReactCompileGenerationChange,
    shouldRenderReact,
    sourceReact,
    sourceCss,
    title,
    sourceId,
  ])

  useEffect(() => {
    if (!shouldRenderInline || !sourceHtml) {
      setInjectedInlineHtml("")
      return
    }

    const controller = new AbortController()
    compileGenerationRef.current += 1
    onReactCompileGenerationChange?.(item.id, compileGenerationRef.current)
    fetch("/api/canvas/inject-html", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceHtml,
        sourceId,
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}))
        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.error || "Failed to prepare HTML source.")
        }
        return String(payload.html || "")
      })
      .then((html) => setInjectedInlineHtml(html))
      .catch(() => {
        if (controller.signal.aborted) return
        setInjectedInlineHtml(sourceHtml)
      })

    return () => controller.abort()
  }, [item.id, onReactCompileGenerationChange, shouldRenderInline, sourceHtml, sourceId])

  // U2: listen for click/hover messages from inside the iframe. Filter by
  // `event.source === iframeRef.current.contentWindow` so messages from
  // other React preview nodes on the canvas don't cross-talk.
  useEffect(() => {
    if (!activeSelection || activeSelection.itemId !== item.id) {
      setSelectionRect(null)
      setSelectedCanvasId(null)
      setMultiSelections([])
      return
    }
    setSelectedCanvasId(activeSelection.canvasId)
    setSelectionRect(activeSelection.rect)
  }, [activeSelection, item.id])

  useEffect(() => {
    if (!shouldRenderReact && !shouldRenderInline) return
    const handler = (event: MessageEvent) => {
      const iframe = iframeRef.current
      if (!iframe) return
      if (event.source !== iframe.contentWindow) return
      // Defense-in-depth: srcDoc with allow-same-origin inherits the parent
      // origin, so messages should arrive from window.location.origin. The
      // event.source check above is sufficient today, but the origin filter
      // covers future cross-origin preview surfaces (U6 file-backed nodes
      // served from a different host) without protocol changes.
      if (event.origin !== window.location.origin && event.origin !== "null") return
      if (!isCanvasReactNodeMessage(event.data)) return
      const message = event.data
      if (message.type === "canvas/select") {
        setSelectionRect(message.rect)
        setSelectedCanvasId(message.canvasId || null)
        if (message.canvasId) {
          const id = message.canvasId
          const rect = message.rect
          setMultiSelections((current) => {
            if (!message.additive) return [{ canvasId: id, rect }]
            const without = current.filter((s) => s.canvasId !== id)
            // Toggle: shift-clicking an already-selected element removes it.
            if (without.length !== current.length) return without
            return [...current, { canvasId: id, rect }]
          })
        }
        if (onReactNodeSelect && message.canvasId) {
          onReactNodeSelect({
            itemId: item.id,
            canvasId: message.canvasId,
            tag: message.tag,
            rect: message.rect,
            fileHint: message.fileHint,
            compileGeneration: compileGenerationRef.current,
          })
        }
      } else if (message.type === "canvas/hover") {
        setHoverRect(message.rect)
      } else if (message.type === "canvas/drop-target-result") {
        // U4b. Discard stale responses — dragover-driven hit-tests can race.
        if (message.requestId !== dropTargetRequestIdRef.current) return
        if (!message.parentCanvasId || !message.parentRect) {
          setDropTargetState(null)
          return
        }
        setDropTargetState({
          parentCanvasId: message.parentCanvasId,
          parentRect: toDropZoneRect(message.parentRect),
          siblings: message.siblings.map(toDropZoneSibling),
          leaf: message.leaf,
        })
      } else if (message.type === "canvas/rect-update") {
        // U13: iframe re-emitted the rect for a previously-selected element
        // (typically after a recompile). Only apply if it still matches the
        // current selection; ignore stale updates for elements the user has
        // moved on from. rect=null signals the element was removed.
        setSelectedCanvasId((currentId) => {
          if (currentId !== message.canvasId) return currentId
          if (!message.rect) {
            setSelectionRect(null)
            return null
          }
          setSelectionRect(message.rect)
          return currentId
        })
      }
    }
    window.addEventListener("message", handler)
    return () => window.removeEventListener("message", handler)
  }, [shouldRenderInline, shouldRenderReact, onReactNodeSelect, item.id])

  // Source changes invalidate the old measured rect, but the parent may
  // already have rebased the selection id via canvasIdMap. Keep the id if
  // the parent still considers this node selected, clear only the stale
  // geometry, and let U13's refresh-rect request re-anchor after compile.
  useEffect(() => {
    setSelectionRect(activeSelection?.itemId === item.id ? activeSelection.rect : null)
    setSelectedCanvasId(activeSelection?.itemId === item.id ? activeSelection.canvasId : null)
    setHoverRect(null)
    // A recompile invalidates measured rects; drop the multi-set rather than
    // anchor stale geometry (re-shift-click rebuilds it post-compile).
    setMultiSelections([])
  }, [activeSelection, item.id, sourceHtml, sourceReact, sourceCss, sourceId])

  const frameSource = useMemo(() => {
    if (shouldRenderReact) return compiledReactHtml
    if (shouldRenderInline) return injectedInlineHtml || sourceHtml
    return ""
  }, [compiledReactHtml, injectedInlineHtml, shouldRenderInline, shouldRenderReact, sourceHtml])

  const unionRect = useMemo(() => {
    if (multiSelections.length < 2) return null
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const { rect } of multiSelections) {
      minX = Math.min(minX, rect.x)
      minY = Math.min(minY, rect.y)
      maxX = Math.max(maxX, rect.x + rect.width)
      maxY = Math.max(maxY, rect.y + rect.height)
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
  }, [multiSelections])

  const canRefreshSelectionRect = shouldRenderReact
    ? compileStatus === "ready" && Boolean(compiledReactHtml)
    : shouldRenderInline
      ? Boolean(frameSource)
      : false

  useEffect(() => {
    if (!canRefreshSelectionRect || !selectedCanvasId) return
    const iframe = iframeRef.current
    const targetWindow = iframe?.contentWindow
    if (!targetWindow) return
    targetWindow.postMessage(buildRefreshRectRequest(selectedCanvasId), window.location.origin)
  }, [canRefreshSelectionRect, selectedCanvasId, frameSource])

  // U4b. When the library drag ends (drop or cancel), the parent flips
  // `libraryDragActive` back to false. Clear any visible zones and any pending
  // hit-test so a fresh drag starts clean.
  useEffect(() => {
    if (libraryDragActive) return
    setDropTargetState(null)
    dropTargetRequestIdRef.current = null
    dropTargetPendingCoordsRef.current = null
    if (dropTargetRafRef.current !== null) {
      cancelAnimationFrame(dropTargetRafRef.current)
      dropTargetRafRef.current = null
    }
  }, [libraryDragActive])

  const handleLibraryDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      // Without preventDefault the browser refuses the drop and the cursor
      // shows the "not allowed" icon — we want "copy" while a library
      // primitive is in flight.
      event.preventDefault()
      event.dataTransfer.dropEffect = "copy"
      const iframe = iframeRef.current
      const targetWindow = iframe?.contentWindow
      if (!iframe || !targetWindow) return
      // Translate viewport coords into iframe-local document coords. The
      // iframe is rendered at its natural size inside this component — the
      // canvas-level transform happens on a wrapper *outside* CanvasHtmlFrame
      // — so the iframe rect's top-left maps to the iframe document's (0, 0)
      // and no scale factor is needed.
      const rect = iframe.getBoundingClientRect()
      dropTargetPendingCoordsRef.current = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      }
      if (dropTargetRafRef.current !== null) return
      dropTargetRafRef.current = window.requestAnimationFrame(() => {
        dropTargetRafRef.current = null
        const coords = dropTargetPendingCoordsRef.current
        dropTargetPendingCoordsRef.current = null
        if (!coords) return
        const requestId =
          typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()}`
        dropTargetRequestIdRef.current = requestId
        targetWindow.postMessage(
          buildDropTargetHitTestRequest({ requestId, x: coords.x, y: coords.y }),
          window.location.origin
        )
      })
    },
    []
  )

  const handleLibraryDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    // dragleave fires on every child boundary crossing too. Only clear when
    // the pointer truly left the capture layer (relatedTarget is null or
    // outside currentTarget). Otherwise dragging across an insert line would
    // flicker the zones.
    const next = event.relatedTarget
    if (next instanceof Node && event.currentTarget.contains(next)) return
    setDropTargetState(null)
    dropTargetRequestIdRef.current = null
    dropTargetPendingCoordsRef.current = null
    if (dropTargetRafRef.current !== null) {
      cancelAnimationFrame(dropTargetRafRef.current)
      dropTargetRafRef.current = null
    }
  }, [])

  const handleLibraryInsert = useCallback(
    (input: { parentCanvasId: string; index: number }) => {
      onLibraryDropInsert?.({ itemId: item.id, ...input })
    },
    [item.id, onLibraryDropInsert]
  )

  const handleLibraryWrap = useCallback(
    (input: { canvasId: string }) => {
      onLibraryDropWrap?.({ itemId: item.id, ...input })
    },
    [item.id, onLibraryDropWrap]
  )
  const hasRenderableSource = shouldRenderReact
    ? compileStatus === "ready" && Boolean(compiledReactHtml)
    : shouldRenderInline
      ? Boolean(sourceHtml)
      : Boolean(item.src)

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-default bg-white"
      style={{ background: item.background || undefined }}
    >
      <div className="flex items-center justify-between gap-2 border-b border-default bg-surface-50/80 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Code2 className="h-4 w-4 shrink-0 text-brand-600" />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-foreground">{title}</div>
            <div className="truncate text-[11px] text-muted-foreground">
              {shouldRenderReact
                ? compileStatus === "loading"
                  ? "React TSX compiling..."
                  : "React TSX"
                : shouldRenderInline
                  ? "Inline HTML"
                  : item.entryAsset || item.src}
            </div>
          </div>
        </div>
        {item.src ? (
          <a
            href={item.src}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-white hover:text-foreground"
            title="Open bundled HTML"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : null}
      </div>

      <div className="relative min-h-0 flex-1 bg-white">
        {hasRenderableSource ? (
          <>
            <iframe
              ref={iframeRef}
              src={shouldRenderInline || shouldRenderReact ? undefined : item.src}
              srcDoc={shouldRenderInline || shouldRenderReact ? frameSource : undefined}
              title={title}
              sandbox={item.sandbox || "allow-scripts allow-same-origin allow-forms allow-modals allow-popups"}
              className="h-full w-full border-0 bg-white"
            />
            {/* U2: outline overlays for hover and selection. Anchored in
                iframe-document coords; for v1 the iframe is not scaled
                inside CanvasHtmlFrame so these align 1:1. The canvas-level
                wrapper applies its own transform; outlines inside this
                component work for the unscaled local case. */}
            {(shouldRenderReact || shouldRenderInline) && hoverRect && interactMode && (
              <div
                className="pointer-events-none absolute rounded-sm ring-1 ring-brand-400/60"
                style={{
                  left: hoverRect.x,
                  top: hoverRect.y,
                  width: hoverRect.width,
                  height: hoverRect.height,
                }}
              />
            )}
            {(shouldRenderReact || shouldRenderInline) && selectionRect && !interactMode && (
              <div
                className="pointer-events-none absolute rounded-sm ring-2 ring-brand-500"
                style={{
                  left: selectionRect.x,
                  top: selectionRect.y,
                  width: selectionRect.width,
                  height: selectionRect.height,
                }}
              />
            )}
            {(shouldRenderReact || shouldRenderInline) && unionRect && (
              <div
                data-testid="canvas-iframe-multi-select"
                data-canvas-multi-select-count={multiSelections.length}
                className="pointer-events-none absolute rounded-sm border-2 border-dashed border-violet-500 bg-violet-500/5"
                style={{
                  left: unionRect.x,
                  top: unionRect.y,
                  width: unionRect.width,
                  height: unionRect.height,
                }}
              >
                <div className="absolute -top-5 left-0 rounded bg-violet-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {multiSelections.length} selected
                </div>
              </div>
            )}
            {(shouldRenderReact || shouldRenderInline) && selectionRect && interactMode && (
              <CanvasIframeOverlay
                rect={{
                  left: selectionRect.x,
                  top: selectionRect.y,
                  width: selectionRect.width,
                  height: selectionRect.height,
                }}
                onDragCommit={(kind, deltaScreen) => {
                  if (!onReactNodeResize || !selectionRect || !selectedCanvasId) return
                  // iframeZoom is 1 for v3 (the iframe document is not zoomed
                  // internally); canvasScale captures the parent canvas's
                  // own transform.
                  const deltaIframe = screenDeltaToIframeLocal(
                    deltaScreen.dx,
                    deltaScreen.dy,
                    canvasScale,
                    1
                  )
                  onReactNodeResize({
                    itemId: item.id,
                    canvasId: selectedCanvasId,
                    kind,
                    deltaIframe,
                    rect: selectionRect,
                  })
                }}
              />
            )}
            {!interactMode && (
              <div className="absolute inset-0" />
            )}
            {libraryDragActive && (shouldRenderReact || shouldRenderInline) && (
              <div
                data-testid="canvas-html-frame-drag-capture"
                className="absolute inset-0"
                style={{ zIndex: 25 }}
                onDragOver={handleLibraryDragOver}
                onDragLeave={handleLibraryDragLeave}
                onDrop={(event) => {
                  // Drops onto an insert line or wrap zone fire their own
                  // handlers (which stopPropagation by default in React).
                  // This catch-all swallows drops that miss every zone so
                  // the browser doesn't navigate to a JSON payload URL.
                  event.preventDefault()
                }}
              >
                {dropTargetState && (
                  <CanvasIframeDropZones
                    parentCanvasId={dropTargetState.parentCanvasId}
                    parentRect={dropTargetState.parentRect}
                    siblings={dropTargetState.siblings}
                    leaf={dropTargetState.leaf}
                    onInsert={handleLibraryInsert}
                    onWrap={handleLibraryWrap}
                  />
                )}
              </div>
            )}
          </>
        ) : shouldRenderReact && compileStatus === "loading" ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
            Compiling React preview...
          </div>
        ) : shouldRenderReact && compileStatus === "error" ? (
          <div className="flex h-full items-center justify-center px-6 text-center">
            <div className="max-w-md rounded-md border border-red-200 bg-red-50 px-4 py-3 text-left text-xs text-red-700">
              <div className="mb-1 font-semibold">React compile failed</div>
              <pre className="whitespace-pre-wrap font-mono">{compileError}</pre>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
            HTML source is missing.
          </div>
        )}
      </div>
    </div>
  )
}
