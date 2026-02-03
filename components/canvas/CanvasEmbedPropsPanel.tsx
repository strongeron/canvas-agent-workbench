import { ExternalLink, X } from "lucide-react"

interface CanvasEmbedPropsPanelProps {
  url: string
  title?: string
  allow?: string
  sandbox?: string
  embedOrigin?: string
  embedStateVersion?: number
  hasEmbedState?: boolean
  onRequestState?: () => void
  onChange: (updates: { url?: string; title?: string; allow?: string; sandbox?: string }) => void
  onClose: () => void
}

export function CanvasEmbedPropsPanel({
  url,
  title,
  allow,
  sandbox,
  embedOrigin,
  embedStateVersion,
  hasEmbedState,
  onRequestState,
  onChange,
  onClose,
}: CanvasEmbedPropsPanelProps) {
  return (
    <div className="flex h-full w-80 flex-col border-l border-default bg-white">
      <div className="flex items-center justify-between border-b border-default px-4 py-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-foreground">Embed</h3>
          <p className="truncate text-xs text-muted-foreground">Interactive iframe</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="ml-2 rounded p-1 text-muted-foreground hover:bg-surface-100 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => onChange({ url: e.target.value })}
              className="w-full rounded-md border border-default bg-white px-3 py-1.5 text-sm text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
            />
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700"
              >
                Open in new tab
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Title</label>
            <input
              type="text"
              value={title || ""}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="Optional title"
              className="w-full rounded-md border border-default bg-white px-3 py-1.5 text-sm text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Allow</label>
            <input
              type="text"
              value={allow || ""}
              onChange={(e) => onChange({ allow: e.target.value })}
              placeholder="e.g. fullscreen; clipboard-read; autoplay"
              className="w-full rounded-md border border-default bg-white px-3 py-1.5 text-sm text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Sandbox</label>
            <input
              type="text"
              value={sandbox || ""}
              onChange={(e) => onChange({ sandbox: e.target.value })}
              placeholder="e.g. allow-scripts allow-same-origin"
              className="w-full rounded-md border border-default bg-white px-3 py-1.5 text-sm text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
            />
          </div>

          <div className="rounded-md bg-surface-50 px-3 py-2 text-xs text-muted-foreground">
            Use Interact mode to click and scroll inside embeds.
          </div>

          <div className="rounded-md border border-default bg-white px-3 py-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-semibold text-foreground">Embed State</div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {hasEmbedState ? "State captured" : "No state captured yet"}
                </div>
              </div>
              {onRequestState && (
                <button
                  type="button"
                  onClick={onRequestState}
                  className="rounded-md border border-default px-2 py-1 text-[11px] font-medium text-foreground hover:bg-surface-100"
                >
                  Sync State
                </button>
              )}
            </div>
            {embedOrigin && (
              <div className="mt-2 text-[10px] text-muted-foreground">
                Origin: {embedOrigin}
              </div>
            )}
            {embedStateVersion && (
              <div className="mt-1 text-[10px] text-muted-foreground">
                Protocol v{embedStateVersion}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
