import { Code2, ExternalLink } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

import type { CanvasHtmlItem } from "../../types/canvas"
import { screenDeltaToIframeLocal } from "../../utils/canvasIframeCoordinates"
import {
  buildRefreshRectRequest,
  isCanvasReactNodeMessage,
  type CanvasReactNodeRect,
} from "../../utils/canvasReactNodeBridge"
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
}

export function CanvasHtmlFrame({
  item,
  interactMode,
  activeSelection = null,
  onReactNodeSelect,
  onReactCompileGenerationChange,
  canvasScale = 1,
  onReactNodeResize,
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
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
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
  }, [activeSelection, item.id, sourceHtml, sourceReact, sourceCss, sourceId])

  const frameSource = useMemo(() => {
    if (shouldRenderReact) return compiledReactHtml
    if (shouldRenderInline) return injectedInlineHtml || sourceHtml
    return ""
  }, [compiledReactHtml, injectedInlineHtml, shouldRenderInline, shouldRenderReact, sourceHtml])

  useEffect(() => {
    if (compileStatus !== "ready" || !selectedCanvasId) return
    const iframe = iframeRef.current
    const targetWindow = iframe?.contentWindow
    if (!targetWindow) return
    targetWindow.postMessage(buildRefreshRectRequest(selectedCanvasId), window.location.origin)
  }, [compileStatus, selectedCanvasId, frameSource])
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
