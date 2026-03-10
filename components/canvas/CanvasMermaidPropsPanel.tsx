import { X } from "lucide-react"

import type { CanvasMermaidItem } from "../../types/canvas"

interface CanvasMermaidPropsPanelProps {
  source: string
  title?: string
  mermaidTheme?: CanvasMermaidItem["mermaidTheme"]
  background?: string
  onChange: (updates: Partial<Omit<CanvasMermaidItem, "id">>) => void
  onConvertToExcalidraw?: () => void
  onClose: () => void
}

const STARTER_FLOW = `flowchart LR
  A[Start] --> B{Need references?}
  B -->|yes| C[Search]
  B -->|no| D[Draft]
  C --> D
  D --> E[Ship]`

export function CanvasMermaidPropsPanel({
  source,
  title,
  mermaidTheme,
  background,
  onChange,
  onConvertToExcalidraw,
  onClose,
}: CanvasMermaidPropsPanelProps) {
  return (
    <div className="flex h-full w-80 flex-col border-l border-default bg-white">
      <div className="flex items-center justify-between border-b border-default px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Mermaid</h3>
          <p className="text-xs text-muted-foreground">Edit source and preview style</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-muted-foreground hover:bg-surface-100 hover:text-foreground"
          aria-label="Close Mermaid panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3 overflow-y-auto p-4">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Title
          </label>
          <input
            type="text"
            value={title || ""}
            onChange={(event) => onChange({ title: event.target.value || undefined })}
            placeholder="Diagram title"
            className="w-full rounded-md border border-default bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Theme
            </label>
            <select
              value={mermaidTheme || "default"}
              onChange={(event) =>
                onChange({
                  mermaidTheme: event.target.value as CanvasMermaidItem["mermaidTheme"],
                })
              }
              className="w-full rounded-md border border-default bg-white px-3 py-2 text-sm text-foreground focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="default">Default</option>
              <option value="neutral">Neutral</option>
              <option value="dark">Dark</option>
              <option value="forest">Forest</option>
              <option value="base">Base</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Background
            </label>
            <input
              type="text"
              value={background || ""}
              onChange={(event) => onChange({ background: event.target.value || undefined })}
              placeholder="#ffffff"
              className="w-full rounded-md border border-default bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        {onConvertToExcalidraw && (
          <button
            type="button"
            onClick={onConvertToExcalidraw}
            className="w-full rounded-md border border-default bg-surface-50 px-3 py-2 text-xs font-semibold text-foreground hover:bg-surface-100"
          >
            Convert to Excalidraw
          </button>
        )}

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Mermaid Source
            </label>
            <button
              type="button"
              onClick={() => onChange({ source: STARTER_FLOW })}
              className="text-[11px] font-semibold text-brand-600 hover:text-brand-700"
            >
              Insert starter
            </button>
          </div>
          <textarea
            value={source}
            onChange={(event) => onChange({ source: event.target.value })}
            rows={18}
            spellCheck={false}
            className="min-h-[280px] w-full rounded-md border border-default bg-white px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <p className="mt-2 text-[11px] text-muted-foreground">
            Supported by Mermaid parser. Invalid syntax shows an error on the node.
          </p>
        </div>
      </div>
    </div>
  )
}
