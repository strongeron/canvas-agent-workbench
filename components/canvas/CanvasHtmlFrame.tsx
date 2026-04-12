import { Code2, ExternalLink } from "lucide-react"

import type { CanvasHtmlItem } from "../../types/canvas"

interface CanvasHtmlFrameProps {
  item: CanvasHtmlItem
  interactMode: boolean
}

export function CanvasHtmlFrame({ item, interactMode }: CanvasHtmlFrameProps) {
  const title = item.title?.trim() || "HTML bundle"

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
              {item.entryAsset || item.src}
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
        {item.src ? (
          <iframe
            src={item.src}
            title={title}
            sandbox={item.sandbox || "allow-scripts allow-same-origin allow-forms allow-modals"}
            className={`h-full w-full border-0 bg-white ${
              interactMode ? "pointer-events-auto" : "pointer-events-none"
            }`}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
            HTML bundle source is missing.
          </div>
        )}
      </div>
    </div>
  )
}
