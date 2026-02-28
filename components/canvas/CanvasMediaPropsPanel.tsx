import { ExternalLink, X } from "lucide-react"

import type { CanvasMediaItem } from "../../types/canvas"
import { getMediaEmbedInfo } from "./mediaStorageService"

interface CanvasMediaPropsPanelProps {
  src: string
  alt?: string
  title?: string
  poster?: string
  mediaKind?: CanvasMediaItem["mediaKind"]
  controls?: boolean
  autoplay?: boolean
  muted?: boolean
  loop?: boolean
  clipStartSec?: number
  clipEndSec?: number
  objectFit?: CanvasMediaItem["objectFit"]
  sourceUrl?: string
  sourceProvider?: string
  sourceCapturedAt?: string
  onChange: (updates: Partial<Omit<CanvasMediaItem, "id" | "type" | "position" | "size" | "rotation" | "zIndex">>) => void
  onClose: () => void
}

export function CanvasMediaPropsPanel({
  src,
  alt,
  title,
  poster,
  mediaKind,
  controls,
  autoplay,
  muted,
  loop,
  clipStartSec,
  clipEndSec,
  objectFit,
  sourceUrl,
  sourceProvider,
  sourceCapturedAt,
  onChange,
  onClose,
}: CanvasMediaPropsPanelProps) {
  const capturedAtLabel = sourceCapturedAt ? new Date(sourceCapturedAt).toLocaleString() : null
  const kind = mediaKind || "image"
  const embedInfo =
    kind === "video"
      ? getMediaEmbedInfo(src, {
          controls,
          autoplay,
          muted,
          loop,
          clipStartSec,
          clipEndSec,
        })
      : null

  const parseSeconds = (value: string): number | undefined => {
    const trimmed = value.trim()
    if (!trimmed) return undefined
    const parsed = Number(trimmed)
    if (!Number.isFinite(parsed)) return undefined
    return Math.max(0, parsed)
  }

  return (
    <div className="flex h-full w-80 flex-col border-l border-default bg-white">
      <div className="flex items-center justify-between border-b border-default px-4 py-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-foreground">Media</h3>
          <p className="truncate text-xs text-muted-foreground">Image / GIF / Video node</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="ml-2 rounded p-1 text-muted-foreground hover:bg-surface-100 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Source URL</label>
          <input
            type="url"
            value={src}
            onChange={(e) => onChange({ src: e.target.value })}
            className="w-full rounded-md border border-default bg-white px-3 py-1.5 text-sm text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
          />
          {src && (
            <a
              href={src}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700"
            >
              Open source
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Type</label>
          <select
            value={kind}
            onChange={(e) => onChange({ mediaKind: e.target.value as CanvasMediaItem["mediaKind"] })}
            className="w-full rounded-md border border-default bg-white px-3 py-1.5 text-sm text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
          >
            <option value="image">Image</option>
            <option value="gif">GIF</option>
            <option value="video">Video</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Display</label>
          <select
            value={objectFit || "cover"}
            onChange={(e) => onChange({ objectFit: e.target.value as CanvasMediaItem["objectFit"] })}
            className="w-full rounded-md border border-default bg-white px-3 py-1.5 text-sm text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
          >
            <option value="cover">Cover</option>
            <option value="contain">Contain</option>
            <option value="fill">Fill</option>
          </select>
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
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Alt text</label>
          <input
            type="text"
            value={alt || ""}
            onChange={(e) => onChange({ alt: e.target.value })}
            placeholder="Descriptive alt text for images"
            className="w-full rounded-md border border-default bg-white px-3 py-1.5 text-sm text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
          />
        </div>

        {kind === "video" && (
          <>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Poster URL</label>
              <input
                type="url"
                value={poster || ""}
                onChange={(e) => onChange({ poster: e.target.value })}
                placeholder="Optional poster image"
                className="w-full rounded-md border border-default bg-white px-3 py-1.5 text-sm text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 rounded-md border border-default px-2 py-2 text-xs text-foreground">
                <input
                  type="checkbox"
                  checked={controls ?? true}
                  onChange={(e) => onChange({ controls: e.target.checked })}
                />
                Controls
              </label>
              <label className="flex items-center gap-2 rounded-md border border-default px-2 py-2 text-xs text-foreground">
                <input
                  type="checkbox"
                  checked={autoplay ?? false}
                  onChange={(e) => onChange({ autoplay: e.target.checked })}
                />
                Autoplay
              </label>
              <label className="flex items-center gap-2 rounded-md border border-default px-2 py-2 text-xs text-foreground">
                <input
                  type="checkbox"
                  checked={muted ?? true}
                  onChange={(e) => onChange({ muted: e.target.checked })}
                />
                Muted
              </label>
              <label className="flex items-center gap-2 rounded-md border border-default px-2 py-2 text-xs text-foreground">
                <input
                  type="checkbox"
                  checked={loop ?? false}
                  onChange={(e) => onChange({ loop: e.target.checked })}
                />
                Loop
              </label>
            </div>

            <div className="rounded-md border border-default bg-surface-50 p-3">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-foreground">
                Clip range (seconds)
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Start</label>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={typeof clipStartSec === "number" ? clipStartSec : ""}
                    onChange={(e) => onChange({ clipStartSec: parseSeconds(e.target.value) })}
                    placeholder="0"
                    className="w-full rounded-md border border-default bg-white px-3 py-1.5 text-sm text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-muted-foreground">End</label>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={typeof clipEndSec === "number" ? clipEndSec : ""}
                    onChange={(e) => onChange({ clipEndSec: parseSeconds(e.target.value) })}
                    placeholder="Optional"
                    className="w-full rounded-md border border-default bg-white px-3 py-1.5 text-sm text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
                  />
                </div>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Loop + Start/End repeats just that segment for direct videos.
              </p>
              {embedInfo?.provider === "youtube" && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  YouTube uses embed params ({`start/end/loop`}).
                </p>
              )}
              {embedInfo?.provider === "vimeo" && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Vimeo supports start + loop; end time is ignored by the player.
                </p>
              )}
            </div>
          </>
        )}

        <div className="rounded-md border border-default bg-surface-50 px-3 py-2 text-xs text-muted-foreground">
          <div className="text-[11px] font-semibold text-foreground">Source pipeline metadata</div>
          <div className="mt-1 text-[11px]">
            For media generated from website capture/transcode providers.
          </div>
          {sourceProvider === "local-session" && (
            <div className="mt-2 text-[11px] text-amber-700">
              Local-session file: available now, but not persisted after full page reload.
            </div>
          )}
          {sourceUrl && <div className="mt-2 text-[11px]">Origin URL: {sourceUrl}</div>}
          {sourceProvider && <div className="text-[11px]">Provider: {sourceProvider}</div>}
          {capturedAtLabel && <div className="text-[11px]">Captured: {capturedAtLabel}</div>}
        </div>
      </div>
    </div>
  )
}
