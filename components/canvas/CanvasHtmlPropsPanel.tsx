import { ExternalLink, Trash2, X } from "lucide-react"

interface CanvasHtmlPropsPanelProps {
  src: string
  title?: string
  sandbox?: string
  background?: string
  entryAsset?: string
  sourcePath?: string
  sourceImportedAt?: string
  onChange: (updates: {
    src?: string
    title?: string
    sandbox?: string
    background?: string
  }) => void
  onDelete: () => void
  onClose: () => void
}

export function CanvasHtmlPropsPanel({
  src,
  title,
  sandbox,
  background,
  entryAsset,
  sourcePath,
  sourceImportedAt,
  onChange,
  onDelete,
  onClose,
}: CanvasHtmlPropsPanelProps) {
  const importedAtLabel = sourceImportedAt ? new Date(sourceImportedAt).toLocaleString() : null

  return (
    <div className="flex h-full w-80 flex-col border-l border-default bg-white">
      <div className="flex items-center justify-between border-b border-default px-4 py-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-foreground">HTML bundle</h3>
          <p className="truncate text-xs text-muted-foreground">Local HTML/CSS/JS node</p>
        </div>
        <div className="ml-2 flex items-center gap-1">
          <button
            type="button"
            onClick={onDelete}
            className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600"
            aria-label="Delete HTML bundle"
            title="Delete HTML bundle"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-surface-100 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Title</label>
          <input
            type="text"
            value={title || ""}
            onChange={(event) => onChange({ title: event.target.value })}
            placeholder="HTML bundle"
            className="w-full rounded-md border border-default bg-white px-3 py-1.5 text-sm text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
          />
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Source URL</label>
          <input
            type="url"
            value={src}
            onChange={(event) => onChange({ src: event.target.value })}
            className="w-full rounded-md border border-default bg-white px-3 py-1.5 text-sm text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
          />
          {src ? (
            <a
              href={src}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700"
            >
              Open bundled entry
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Sandbox</label>
          <input
            type="text"
            value={sandbox || ""}
            onChange={(event) => onChange({ sandbox: event.target.value })}
            placeholder="allow-scripts allow-same-origin allow-forms allow-modals"
            className="w-full rounded-md border border-default bg-white px-3 py-1.5 text-sm text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
          />
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Background</label>
          <input
            type="text"
            value={background || ""}
            onChange={(event) => onChange({ background: event.target.value })}
            placeholder="#ffffff or oklch(...)"
            className="w-full rounded-md border border-default bg-white px-3 py-1.5 text-sm text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
          />
        </div>

        <div className="rounded-md border border-default bg-surface-50 px-3 py-3 text-xs text-muted-foreground">
          <div>
            <span className="font-semibold text-foreground">Entry asset:</span>{" "}
            {entryAsset || "Not tracked"}
          </div>
          {sourcePath ? (
            <div className="mt-2">
              <span className="font-semibold text-foreground">Imported from:</span> {sourcePath}
            </div>
          ) : null}
          {importedAtLabel ? (
            <div className="mt-2">
              <span className="font-semibold text-foreground">Imported at:</span> {importedAtLabel}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
