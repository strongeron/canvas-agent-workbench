import { ExternalLink, X } from "lucide-react"
import { useMemo, useState } from "react"
import { getEmbedFrameStatusLabel, type EmbedFrameStatus } from "./embedFramePolicy"
import {
  type EmbedPreviewMode,
  type EmbedSnapshotStatus,
  type EmbedLiveStatus,
  type ResolvedEmbedPreviewMode,
  type EmbedCaptureStatus,
  type EmbedCaptureTarget,
  type EmbedCaptureProvider,
} from "./embedPreviewService"

interface CanvasEmbedPropsPanelProps {
  url: string
  title?: string
  allow?: string
  sandbox?: string
  embedPreviewMode?: EmbedPreviewMode
  resolvedEmbedPreviewMode?: ResolvedEmbedPreviewMode
  embedFrameStatus?: EmbedFrameStatus
  embedFrameReason?: string
  embedFrameCheckedAt?: string
  embedSnapshotStatus?: EmbedSnapshotStatus
  embedSnapshotReason?: string
  embedSnapshotCapturedAt?: string
  embedSnapshotProvider?: string
  embedLiveStatus?: EmbedLiveStatus
  embedLiveReason?: string
  embedLiveProvider?: string
  embedLiveExpiresAt?: string
  embedCaptureStatus?: EmbedCaptureStatus
  embedCaptureReason?: string
  embedCaptureCapturedAt?: string
  embedCaptureProvider?: string
  embedCaptureTargets?: EmbedCaptureTarget[]
  embedOrigin?: string
  embedStateVersion?: number
  hasEmbedState?: boolean
  onCheckFramePolicy?: () => void
  onRefreshSnapshot?: () => void
  onStartLiveSession?: () => void
  onStopLiveSession?: () => void
  onCaptureSnapshots?: (input: {
    targets: EmbedCaptureTarget[]
    provider: EmbedCaptureProvider
  }) => void
  onRequestState?: () => void
  onChange: (updates: {
    url?: string
    title?: string
    allow?: string
    sandbox?: string
    embedPreviewMode?: EmbedPreviewMode
  }) => void
  onClose: () => void
}

export function CanvasEmbedPropsPanel({
  url,
  title,
  allow,
  sandbox,
  embedPreviewMode,
  resolvedEmbedPreviewMode,
  embedFrameStatus,
  embedFrameReason,
  embedFrameCheckedAt,
  embedSnapshotStatus,
  embedSnapshotReason,
  embedSnapshotCapturedAt,
  embedSnapshotProvider,
  embedLiveStatus,
  embedLiveReason,
  embedLiveProvider,
  embedLiveExpiresAt,
  embedCaptureStatus,
  embedCaptureReason,
  embedCaptureCapturedAt,
  embedCaptureProvider,
  embedCaptureTargets,
  embedOrigin,
  embedStateVersion,
  hasEmbedState,
  onCheckFramePolicy,
  onRefreshSnapshot,
  onStartLiveSession,
  onStopLiveSession,
  onCaptureSnapshots,
  onRequestState,
  onChange,
  onClose,
}: CanvasEmbedPropsPanelProps) {
  const checkedAtLabel = embedFrameCheckedAt
    ? new Date(embedFrameCheckedAt).toLocaleString()
    : null
  const snapshotCapturedAtLabel = embedSnapshotCapturedAt
    ? new Date(embedSnapshotCapturedAt).toLocaleString()
    : null
  const liveExpiresAtLabel = embedLiveExpiresAt
    ? new Date(embedLiveExpiresAt).toLocaleString()
    : null
  const captureCapturedAtLabel = embedCaptureCapturedAt
    ? new Date(embedCaptureCapturedAt).toLocaleString()
    : null
  const [captureTargetMode, setCaptureTargetMode] = useState<"desktop" | "mobile" | "both">("both")
  const [captureProviderMode, setCaptureProviderMode] = useState<EmbedCaptureProvider>("auto")
  const captureTargets = useMemo<EmbedCaptureTarget[]>(() => {
    if (captureTargetMode === "both") return ["desktop", "mobile"]
    return [captureTargetMode]
  }, [captureTargetMode])
  const captureTargetsLabel = embedCaptureTargets?.length
    ? embedCaptureTargets.join(" + ")
    : "desktop + mobile"

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
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Preview mode</label>
            <select
              value={embedPreviewMode || "auto"}
              onChange={(e) =>
                onChange({ embedPreviewMode: e.target.value as EmbedPreviewMode })
              }
              className="w-full rounded-md border border-default bg-white px-3 py-1.5 text-sm text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
            >
              <option value="auto">Auto (iframe, then snapshot fallback)</option>
              <option value="iframe">Iframe only</option>
              <option value="snapshot">Snapshot only</option>
              <option value="live">Live session</option>
            </select>
            <div className="mt-1 text-[11px] text-muted-foreground">
              Active renderer: {resolvedEmbedPreviewMode || "iframe"}
            </div>
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
            Use Interact mode to click and scroll when iframe/live preview is active.
          </div>

          <div className="rounded-md border border-default bg-white px-3 py-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-semibold text-foreground">Frame policy</div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {getEmbedFrameStatusLabel(embedFrameStatus)}
                </div>
              </div>
              {onCheckFramePolicy && (
                <button
                  type="button"
                  onClick={onCheckFramePolicy}
                  className="rounded-md border border-default px-2 py-1 text-[11px] font-medium text-foreground hover:bg-surface-100"
                >
                  Recheck
                </button>
              )}
            </div>
            {embedFrameReason && (
              <div className="mt-2 text-[11px] text-muted-foreground">
                {embedFrameReason}
              </div>
            )}
            {checkedAtLabel && (
              <div className="mt-1 text-[10px] text-muted-foreground">
                Last checked: {checkedAtLabel}
              </div>
            )}
          </div>

          <div className="rounded-md border border-default bg-white px-3 py-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-semibold text-foreground">URL capture</div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Status: {embedCaptureStatus || "idle"}
                </div>
              </div>
              {onCaptureSnapshots && (
                <button
                  type="button"
                  onClick={() =>
                    onCaptureSnapshots({
                      targets: captureTargets,
                      provider: captureProviderMode,
                    })
                  }
                  disabled={!url.trim() || embedCaptureStatus === "capturing"}
                  className="rounded-md border border-default px-2 py-1 text-[11px] font-medium text-foreground hover:bg-surface-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {embedCaptureStatus === "capturing" ? "Capturing..." : "Capture"}
                </button>
              )}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <span className="block text-[10px] font-medium text-muted-foreground">Targets</span>
                <select
                  value={captureTargetMode}
                  onChange={(e) => setCaptureTargetMode(e.target.value as "desktop" | "mobile" | "both")}
                  className="w-full rounded-md border border-default bg-white px-2 py-1 text-[11px] text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
                >
                  <option value="both">Desktop + Mobile</option>
                  <option value="desktop">Desktop</option>
                  <option value="mobile">Mobile</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="block text-[10px] font-medium text-muted-foreground">Provider</span>
                <select
                  value={captureProviderMode}
                  onChange={(e) => setCaptureProviderMode(e.target.value as EmbedCaptureProvider)}
                  className="w-full rounded-md border border-default bg-white px-2 py-1 text-[11px] text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
                >
                  <option value="auto">Auto (Playwright → fetch)</option>
                  <option value="playwright">Playwright only</option>
                  <option value="fetch">Fetch fallback only</option>
                </select>
              </label>
            </div>
            <div className="mt-2 text-[10px] text-muted-foreground">
              Last targets: {captureTargetsLabel}
            </div>
            {embedCaptureProvider && (
              <div className="mt-1 text-[10px] text-muted-foreground">
                Provider: {embedCaptureProvider}
              </div>
            )}
            {embedCaptureReason && (
              <div className="mt-1 text-[11px] text-muted-foreground">{embedCaptureReason}</div>
            )}
            {captureCapturedAtLabel && (
              <div className="mt-1 text-[10px] text-muted-foreground">
                Captured: {captureCapturedAtLabel}
              </div>
            )}
          </div>

          <div className="rounded-md border border-default bg-white px-3 py-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-semibold text-foreground">Snapshot fallback</div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Status: {embedSnapshotStatus || "idle"}
                </div>
              </div>
              {onRefreshSnapshot && (
                <button
                  type="button"
                  onClick={onRefreshSnapshot}
                  className="rounded-md border border-default px-2 py-1 text-[11px] font-medium text-foreground hover:bg-surface-100"
                >
                  Refresh
                </button>
              )}
            </div>
            {embedSnapshotProvider && (
              <div className="mt-1 text-[10px] text-muted-foreground">
                Provider: {embedSnapshotProvider}
              </div>
            )}
            {embedSnapshotReason && (
              <div className="mt-1 text-[11px] text-muted-foreground">
                {embedSnapshotReason}
              </div>
            )}
            {snapshotCapturedAtLabel && (
              <div className="mt-1 text-[10px] text-muted-foreground">
                Captured: {snapshotCapturedAtLabel}
              </div>
            )}
          </div>

          <div className="rounded-md border border-default bg-white px-3 py-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-semibold text-foreground">Live session</div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Status: {embedLiveStatus || "idle"}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {onStartLiveSession && (
                  <button
                    type="button"
                    onClick={onStartLiveSession}
                    className="rounded-md border border-default px-2 py-1 text-[11px] font-medium text-foreground hover:bg-surface-100"
                  >
                    Start
                  </button>
                )}
                {onStopLiveSession && (
                  <button
                    type="button"
                    onClick={onStopLiveSession}
                    className="rounded-md border border-default px-2 py-1 text-[11px] font-medium text-foreground hover:bg-surface-100"
                  >
                    Stop
                  </button>
                )}
              </div>
            </div>
            {embedLiveProvider && (
              <div className="mt-1 text-[10px] text-muted-foreground">
                Provider: {embedLiveProvider}
              </div>
            )}
            {embedLiveReason && (
              <div className="mt-1 text-[11px] text-muted-foreground">
                {embedLiveReason}
              </div>
            )}
            {liveExpiresAtLabel && (
              <div className="mt-1 text-[10px] text-muted-foreground">
                Expires: {liveExpiresAtLabel}
              </div>
            )}
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
