import { useEffect, useRef, useState } from "react"

import type { CanvasMermaidTheme } from "../../types/canvas"
import {
  canInlineEditMermaidLabel,
  listMermaidNodeLabels,
  resolveMermaidNodeId,
} from "../../utils/mermaidLabelEditor"
import { renderMermaidSvg } from "./mermaidRenderer"

interface CanvasMermaidPreviewProps {
  source: string
  theme?: CanvasMermaidTheme
  title?: string
  background?: string
  /** U10: when true, clicking a rendered node label opens an inline editor. */
  editable?: boolean
  /** Commit a node-label edit back to the mermaid source. */
  onCommitLabel?: (nodeId: string, nextLabel: string) => void
}

interface MermaidEditState {
  nodeId: string
  value: string
  left: number
  top: number
  width: number
  height: number
}

export function CanvasMermaidPreview({
  source,
  theme,
  title,
  background,
  editable = false,
  onCommitLabel,
}: CanvasMermaidPreviewProps) {
  const [svg, setSvg] = useState<string>("")
  const [error, setError] = useState<string>("")
  const [isRendering, setIsRendering] = useState(false)
  const svgHostRef = useRef<HTMLDivElement | null>(null)
  const [edit, setEdit] = useState<MermaidEditState | null>(null)

  useEffect(() => {
    const trimmed = source.trim()
    if (!trimmed) {
      setSvg("")
      setError("Add Mermaid source to render a diagram.")
      return
    }

    let cancelled = false
    setIsRendering(true)
    setError("")

    void (async () => {
      try {
        const nextSvg = await renderMermaidSvg(trimmed, { theme })
        if (cancelled) return
        setSvg(nextSvg)
        setError("")
      } catch (renderError) {
        if (cancelled) return
        setSvg("")
        setError(
          renderError instanceof Error
            ? renderError.message
            : "Mermaid failed to render this diagram."
        )
      } finally {
        if (!cancelled) {
          setIsRendering(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [source, theme])

  // A re-render (new SVG) invalidates the measured node rect; drop any open
  // inline editor rather than leave it anchored to stale geometry.
  useEffect(() => {
    setEdit(null)
  }, [svg])

  const beginEdit = (target: Element | null) => {
    if (!editable || !onCommitLabel) return
    const host = svgHostRef.current
    if (!host) return
    const nodeId = resolveMermaidNodeId(target)
    if (!nodeId) return
    const current = listMermaidNodeLabels(source).find((l) => l.id === nodeId)
    if (!current || !canInlineEditMermaidLabel(current.label)) return
    let groupEl: Element | null = target
    while (groupEl && !/\bnode\b/.test(groupEl.getAttribute?.("class") ?? "")) {
      groupEl = groupEl.parentElement
    }
    const measured = (groupEl ?? target) as Element
    const nodeRect = measured.getBoundingClientRect()
    const hostRect = host.getBoundingClientRect()
    setEdit({
      nodeId,
      value: current.label,
      left: nodeRect.left - hostRect.left + host.scrollLeft,
      top: nodeRect.top - hostRect.top + host.scrollTop,
      width: Math.max(48, nodeRect.width),
      height: Math.max(24, nodeRect.height),
    })
  }

  const commitEdit = () => {
    if (!edit) return
    const next = edit.value.trim()
    const current = listMermaidNodeLabels(source).find((l) => l.id === edit.nodeId)
    // canInlineEditMermaidLabel gates the *start* on the existing label; the
    // typed value must pass it too, or the regex patcher would splice
    // bracket chars verbatim and produce un-renderable mermaid. Reject
    // silently (cancel the edit) rather than corrupt the source.
    if (next && current && next !== current.label && canInlineEditMermaidLabel(next)) {
      onCommitLabel?.(edit.nodeId, next)
    }
    setEdit(null)
  }

  if (!source.trim()) {
    return (
      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
        Add Mermaid source to render a diagram
      </div>
    )
  }

  return (
    <div
      ref={svgHostRef}
      className="relative h-full w-full overflow-auto"
      style={background ? { background } : undefined}
      onClick={editable && svg ? (e) => beginEdit(e.target as Element) : undefined}
    >
      {svg ? (
        <div
          className="min-h-full min-w-full p-3"
          aria-label={title || "Mermaid diagram"}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center">
          <p className="text-sm font-medium text-foreground">
            {isRendering ? "Rendering Mermaid..." : "Diagram preview unavailable"}
          </p>
          {error && <p className="max-w-[44ch] text-xs text-red-600">{error}</p>}
        </div>
      )}
      {edit && (
        <input
          data-testid="mermaid-label-input"
          autoFocus
          value={edit.value}
          onChange={(e) => setEdit({ ...edit, value: e.target.value })}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              commitEdit()
            } else if (e.key === "Escape") {
              e.preventDefault()
              setEdit(null)
            }
          }}
          className="absolute z-10 rounded border border-brand-500 bg-white px-1 text-center text-xs shadow"
          style={{ left: edit.left, top: edit.top, width: edit.width, height: edit.height }}
        />
      )}
      <div className="pointer-events-none absolute right-2 top-2 rounded bg-surface-900/80 px-2 py-1 text-[10px] text-white">
        Mermaid{theme && theme !== "default" ? ` · ${theme}` : ""}
      </div>
    </div>
  )
}
