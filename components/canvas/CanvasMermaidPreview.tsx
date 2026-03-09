import { useEffect, useState } from "react"

import type { CanvasMermaidTheme } from "../../types/canvas"
import { renderMermaidSvg } from "./mermaidRenderer"

interface CanvasMermaidPreviewProps {
  source: string
  theme?: CanvasMermaidTheme
  title?: string
  background?: string
}

export function CanvasMermaidPreview({
  source,
  theme,
  title,
  background,
}: CanvasMermaidPreviewProps) {
  const [svg, setSvg] = useState<string>("")
  const [error, setError] = useState<string>("")
  const [isRendering, setIsRendering] = useState(false)

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

  if (!source.trim()) {
    return (
      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
        Add Mermaid source to render a diagram
      </div>
    )
  }

  return (
    <div
      className="relative h-full w-full overflow-auto"
      style={background ? { background } : undefined}
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
      <div className="pointer-events-none absolute right-2 top-2 rounded bg-surface-900/80 px-2 py-1 text-[10px] text-white">
        Mermaid{theme && theme !== "default" ? ` · ${theme}` : ""}
      </div>
    </div>
  )
}
