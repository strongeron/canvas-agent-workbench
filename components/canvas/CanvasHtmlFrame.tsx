import { Code2, ExternalLink } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

import type { CanvasHtmlItem } from "../../types/canvas"
import {
  isCanvasReactNodeMessage,
  type CanvasReactNodeRect,
} from "../../utils/canvasReactNodeBridge"

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

interface CanvasHtmlFrameProps {
  item: CanvasHtmlItem
  interactMode: boolean
  /**
   * Called when the user selects an element inside a React TSX preview node
   * (via the U2 click bridge). The canvas wires this up to the property
   * panel in U3.
   */
  onReactNodeSelect?: (selection: CanvasReactNodeSelection) => void
}

export function CanvasHtmlFrame({ item, interactMode, onReactNodeSelect }: CanvasHtmlFrameProps) {
  const title = item.title?.trim() || "HTML bundle"
  const sourceHtml = item.sourceHtml?.trim() || ""
  const sourceReact = item.sourceReact?.trim() || ""
  const sourceCss = item.sourceCss || ""
  const shouldRenderReact = item.sourceMode === "react"
  const shouldRenderInline =
    item.sourceMode === "inline" || (!item.src && Boolean(sourceHtml) && !shouldRenderReact)
  const [compiledReactHtml, setCompiledReactHtml] = useState("")
  const [compileStatus, setCompileStatus] = useState<"idle" | "loading" | "ready" | "error">("idle")
  const [compileError, setCompileError] = useState("")
  const [hoverRect, setHoverRect] = useState<CanvasReactNodeRect | null>(null)
  const [selectionRect, setSelectionRect] = useState<CanvasReactNodeRect | null>(null)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  // U2: the sourceId that drives data-canvas-id injection and the bridge's
  // fileHint. For v1 we use the canvas item id; once registry-backed nodes
  // exist (U6) this becomes the source file path so multiple instances of
  // the same component agree on ids.
  const sourceId = item.id
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
      return
    }

    if (!sourceReact) {
      setCompiledReactHtml("")
      setCompileStatus("error")
      setCompileError("React source is missing.")
      return
    }

    const controller = new AbortController()
    compileGenerationRef.current += 1
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
  }, [shouldRenderReact, sourceReact, sourceCss, title, sourceId])

  // U2: listen for click/hover messages from inside the iframe. Filter by
  // `event.source === iframeRef.current.contentWindow` so messages from
  // other React preview nodes on the canvas don't cross-talk.
  useEffect(() => {
    if (!shouldRenderReact) return
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
      }
    }
    window.addEventListener("message", handler)
    return () => window.removeEventListener("message", handler)
  }, [shouldRenderReact, onReactNodeSelect, item.id])

  // Clear selection when the source changes — the canvasId references an
  // AST node from the previous compile and may not exist in the new one.
  useEffect(() => {
    setSelectionRect(null)
    setHoverRect(null)
  }, [sourceReact, sourceCss, sourceId])

  const frameSource = useMemo(() => {
    if (shouldRenderReact) return compiledReactHtml
    if (shouldRenderInline) return sourceHtml
    return ""
  }, [compiledReactHtml, shouldRenderInline, shouldRenderReact, sourceHtml])
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
            {shouldRenderReact && hoverRect && interactMode && (
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
            {shouldRenderReact && selectionRect && (
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
