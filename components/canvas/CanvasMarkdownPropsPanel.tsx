import { X } from "lucide-react"

import type { CanvasMarkdownItem } from "../../types/canvas"

interface CanvasMarkdownPropsPanelProps {
  source: string
  title?: string
  background?: string
  onChange: (updates: Partial<Omit<CanvasMarkdownItem, "id">>) => void
  onClose: () => void
}

const STARTER_MARKDOWN = `# Canvas Markdown

Use this node for architecture notes, plans, or docs snippets.

## Example Checklist

- Capture context
- Define sections
- Add references

> Tip: Drag a \`.md\` file directly onto canvas.
`

const STARTER_MERMAID_BLOCK = `\n\`\`\`mermaid
flowchart LR
  A[Start] --> B[Node]
\`\`\`
`

export function CanvasMarkdownPropsPanel({
  source,
  title,
  background,
  onChange,
  onClose,
}: CanvasMarkdownPropsPanelProps) {
  return (
    <div className="flex h-full w-80 flex-col border-l border-default bg-white">
      <div className="flex items-center justify-between border-b border-default px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Markdown</h3>
          <p className="text-xs text-muted-foreground">Edit markdown source and style</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-muted-foreground hover:bg-surface-100 hover:text-foreground"
          aria-label="Close Markdown panel"
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
            placeholder="Document title"
            className="w-full rounded-md border border-default bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
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

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Markdown Source
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onChange({ source: `${source.trimEnd()}${STARTER_MERMAID_BLOCK}` })}
                className="text-[11px] font-semibold text-brand-600 hover:text-brand-700"
              >
                Insert mermaid block
              </button>
              <button
                type="button"
                onClick={() => onChange({ source: STARTER_MARKDOWN })}
                className="text-[11px] font-semibold text-brand-600 hover:text-brand-700"
              >
                Insert starter
              </button>
            </div>
          </div>
          <textarea
            value={source}
            onChange={(event) => onChange({ source: event.target.value })}
            rows={18}
            spellCheck={false}
            className="min-h-[280px] w-full rounded-md border border-default bg-white px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>
    </div>
  )
}
