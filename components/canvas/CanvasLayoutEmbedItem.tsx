import { useCallback, useEffect, useRef, useState } from "react"

import type { CanvasEmbedItem as CanvasEmbedItemType } from "../../types/canvas"
import { preflightEmbedFramePolicy } from "./embedFramePolicy"
import {
  requestEmbedSnapshot,
  resolveEmbedPreviewMode,
  startEmbedLiveSession,
} from "./embedPreviewService"

interface CanvasLayoutEmbedItemProps {
  item: CanvasEmbedItemType
  isSelected: boolean
  onSelect: (addToSelection?: boolean) => void
  onUpdate: (updates: Partial<Omit<CanvasEmbedItemType, "id">>) => void
  scale: number
  interactMode: boolean
}

type ResizeHandle = "se"

const MIN_WIDTH = 200
const MIN_HEIGHT = 120

export function CanvasLayoutEmbedItem({
  item,
  isSelected,
  onSelect,
  onUpdate,
  scale,
  interactMode,
}: CanvasLayoutEmbedItemProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const onUpdateRef = useRef(onUpdate)
  const preflightInFlightUrlRef = useRef<string | null>(null)
  const snapshotInFlightUrlRef = useRef<string | null>(null)
  const liveInFlightUrlRef = useRef<string | null>(null)
  const [isResizing, setIsResizing] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 })
  const frameStatus = item.embedFrameStatus ?? "unknown"
  const requestedPreviewMode = item.embedPreviewMode ?? "auto"
  const previewMode = resolveEmbedPreviewMode(requestedPreviewMode, frameStatus, item.url)
  const showFrameFallback = frameStatus === "blocked" || frameStatus === "error"
  const captureStatus = item.embedCaptureStatus ?? "idle"
  const captureBadgeLabel = captureStatus === "capturing"
    ? "Capture running"
    : captureStatus === "ready"
      ? "Capture ready"
      : captureStatus === "error"
        ? "Capture failed"
        : null
  const captureBadgeClass = captureStatus === "capturing"
    ? "bg-brand-600/90 text-white"
    : captureStatus === "ready"
      ? "bg-emerald-600/90 text-white"
      : "bg-red-600/90 text-white"

  useEffect(() => {
    onUpdateRef.current = onUpdate
  }, [onUpdate])

  const pushUpdate = useCallback((updates: Partial<Omit<CanvasEmbedItemType, "id">>) => {
    onUpdateRef.current(updates)
  }, [])

  const postToEmbed = useCallback(
    (message: Record<string, unknown>) => {
      const targetOrigin = item.embedOrigin || "*"
      iframeRef.current?.contentWindow?.postMessage(message, targetOrigin)
    },
    [item.embedOrigin]
  )

  const requestEmbedState = useCallback(
    (requestId?: string) => {
      postToEmbed({
        type: "getState",
        requestId,
        version: item.embedStateVersion ?? 1,
      })
    },
    [item.embedStateVersion, postToEmbed]
  )

  useEffect(() => {
    if (!item.url || typeof window === "undefined") return
    try {
      const origin = new URL(item.url, window.location.href).origin
      if (origin && origin !== item.embedOrigin) {
        pushUpdate({ embedOrigin: origin })
      }
    } catch {
      // Ignore invalid URLs
    }
  }, [item.url, item.embedOrigin, pushUpdate])

  useEffect(() => {
    if (!item.url || typeof window === "undefined") return
    const checkedUrl = item.url.trim()
    if (!checkedUrl) return

    const alreadyChecked =
      item.embedFrameCheckedUrl === checkedUrl &&
      (frameStatus === "embeddable" || frameStatus === "blocked" || frameStatus === "error")
    if (alreadyChecked) return
    if (preflightInFlightUrlRef.current === checkedUrl) return

    preflightInFlightUrlRef.current = checkedUrl
    if (!(frameStatus === "checking" && item.embedFrameCheckedUrl === checkedUrl)) {
      pushUpdate({
        embedFrameStatus: "checking",
        embedFrameReason: undefined,
        embedFrameCheckedUrl: checkedUrl,
      })
    }

    void (async () => {
      try {
        const result = await preflightEmbedFramePolicy(checkedUrl, window.location.origin)
        if (result.status === "unknown") return

        pushUpdate({
          embedFrameStatus: result.status,
          embedFrameReason: result.reason,
          embedFrameCheckedAt: result.checkedAt,
          embedFrameCheckedUrl: result.checkedUrl,
        })
      } finally {
        if (preflightInFlightUrlRef.current === checkedUrl) {
          preflightInFlightUrlRef.current = null
        }
      }
    })()
  }, [frameStatus, item.embedFrameCheckedUrl, item.url, pushUpdate])

  useEffect(() => {
    if (!item.url || previewMode !== "snapshot") return
    const sourceUrl = item.url.trim()
    if (!sourceUrl) return

    const sameSource = item.embedSnapshotSourceUrl === sourceUrl
    const status = item.embedSnapshotStatus ?? "idle"
    const shouldFetch =
      !sameSource ||
      status === "idle" ||
      status === "error" ||
      status === "loading" ||
      (status === "ready" && !item.embedSnapshotUrl)
    if (!shouldFetch) return
    if (snapshotInFlightUrlRef.current === sourceUrl) return

    snapshotInFlightUrlRef.current = sourceUrl
    if (!(status === "loading" && sameSource)) {
      pushUpdate({
        embedSnapshotStatus: "loading",
        embedSnapshotReason: undefined,
        embedSnapshotSourceUrl: sourceUrl,
      })
    }

    void (async () => {
      try {
        const result = await requestEmbedSnapshot(
          sourceUrl,
          { width: item.size.width, height: item.size.height }
        )
        if (result.status === "unknown") return
        if (result.status === "ready") {
          pushUpdate({
            embedSnapshotStatus: "ready",
            embedSnapshotUrl: result.imageUrl,
            embedSnapshotReason: result.reason,
            embedSnapshotCapturedAt: result.capturedAt,
            embedSnapshotProvider: result.provider,
            embedSnapshotSourceUrl: result.sourceUrl,
          })
          return
        }
        pushUpdate({
          embedSnapshotStatus: "error",
          embedSnapshotReason: result.reason,
          embedSnapshotCapturedAt: result.capturedAt,
          embedSnapshotSourceUrl: result.sourceUrl,
        })
      } finally {
        if (snapshotInFlightUrlRef.current === sourceUrl) {
          snapshotInFlightUrlRef.current = null
        }
      }
    })()
  }, [
    item.embedSnapshotSourceUrl,
    item.embedSnapshotStatus,
    item.embedSnapshotUrl,
    item.size.height,
    item.size.width,
    item.url,
    pushUpdate,
    previewMode,
  ])

  useEffect(() => {
    if (!item.url || previewMode !== "live") return
    const sourceUrl = item.url.trim()
    if (!sourceUrl) return

    const sameSource = item.embedLiveSourceUrl === sourceUrl
    const status = item.embedLiveStatus ?? "idle"
    const shouldStart =
      !sameSource ||
      status === "idle" ||
      status === "error" ||
      status === "starting" ||
      (status === "active" && !item.embedLiveUrl)
    if (!shouldStart) return
    if (liveInFlightUrlRef.current === sourceUrl) return

    liveInFlightUrlRef.current = sourceUrl
    if (!(status === "starting" && sameSource)) {
      pushUpdate({
        embedLiveStatus: "starting",
        embedLiveReason: undefined,
        embedLiveSourceUrl: sourceUrl,
      })
    }

    void (async () => {
      try {
        const result = await startEmbedLiveSession(sourceUrl)
        if (result.status === "unknown") return
        if (result.status === "active") {
          pushUpdate({
            embedLiveStatus: "active",
            embedLiveReason: result.reason,
            embedLiveUrl: result.sessionUrl,
            embedLiveProvider: result.provider,
            embedLiveSessionId: result.sessionId,
            embedLiveSourceUrl: result.sourceUrl,
            embedLiveStartedAt: result.startedAt,
            embedLiveExpiresAt: result.expiresAt,
          })
          return
        }
        pushUpdate({
          embedLiveStatus: "error",
          embedLiveReason: result.reason,
          embedLiveUrl: undefined,
          embedLiveSessionId: undefined,
          embedLiveProvider: result.provider,
          embedLiveSourceUrl: result.sourceUrl,
          embedLiveStartedAt: result.startedAt,
          embedLiveExpiresAt: undefined,
        })
      } finally {
        if (liveInFlightUrlRef.current === sourceUrl) {
          liveInFlightUrlRef.current = null
        }
      }
    })()
  }, [
    item.embedLiveSourceUrl,
    item.embedLiveStatus,
    item.embedLiveUrl,
    item.url,
    pushUpdate,
    previewMode,
  ])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return
      if (item.embedOrigin && event.origin !== item.embedOrigin) return
      if (!event.data || typeof event.data !== "object") return
      const data = event.data as { type?: string; payload?: unknown; version?: number }
      if (data.type !== "state") return
      pushUpdate({
        embedState: data.payload,
        embedStateVersion: data.version ?? 1,
        embedOrigin: item.embedOrigin ?? event.origin,
      })
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [item.embedOrigin, pushUpdate])

  useEffect(() => {
    const handleRequest = (event: Event) => {
      const detail = (event as CustomEvent<{ requestId?: string; targetId?: string }>).detail
      if (detail?.targetId && detail.targetId !== item.id) return
      requestEmbedState(detail?.requestId)
    }
    window.addEventListener("canvas:request-embed-state", handleRequest as EventListener)
    return () =>
      window.removeEventListener("canvas:request-embed-state", handleRequest as EventListener)
  }, [item.id, requestEmbedState])

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, handle: ResizeHandle) => {
      if (interactMode) return
      if (handle !== "se") return
      e.stopPropagation()
      e.preventDefault()
      onSelect()

      setIsResizing(true)
      setDragStart({ x: e.clientX, y: e.clientY })
      setInitialSize({ width: item.size.width, height: item.size.height })
    },
    [interactMode, item.size.height, item.size.width, onSelect]
  )

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - dragStart.x) / scale
      const dy = (e.clientY - dragStart.y) / scale

      pushUpdate({
        size: {
          width: Math.max(MIN_WIDTH, initialSize.width + dx),
          height: Math.max(MIN_HEIGHT, initialSize.height + dy),
        },
      })
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [dragStart.x, dragStart.y, initialSize.height, initialSize.width, isResizing, pushUpdate, scale])

  const borderClass = isSelected
    ? "border-2 border-brand-500 ring-4 ring-brand-500/20"
    : "border border-default"

  return (
    <div
      className="relative h-full w-full"
      onMouseDown={(e) => {
        if (interactMode) return
        if (e.button !== 0) return
        e.stopPropagation()
        if (!e.shiftKey) {
          onSelect(false)
        }
      }}
      onClick={(e) => {
        if (interactMode) return
        e.stopPropagation()
        if (e.shiftKey) {
          onSelect(true)
        }
      }}
    >
      <div className={`relative h-full w-full overflow-hidden rounded-lg bg-white shadow-card ${borderClass}`}>
        {item.url ? (
          previewMode === "live" ? (
            item.embedLiveStatus === "active" && item.embedLiveUrl ? (
              <iframe
                title={item.title || item.url}
                src={item.embedLiveUrl}
                allow="clipboard-read; clipboard-write; fullscreen"
                className={`h-full w-full ${interactMode ? "pointer-events-auto" : "pointer-events-none"}`}
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-surface-50 p-4 text-center">
                <p className="text-sm font-medium text-foreground">
                  {item.embedLiveStatus === "starting" ? "Starting live session..." : "Live preview unavailable"}
                </p>
                <p className="max-w-[36ch] text-xs text-muted-foreground">
                  {item.embedLiveReason || "Configure a live provider and click Start in the inspector."}
                </p>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  Open in new tab
                </a>
              </div>
            )
          ) : previewMode === "snapshot" ? (
            item.embedSnapshotStatus === "ready" && item.embedSnapshotUrl ? (
              <div className="relative h-full w-full bg-surface-100">
                <img
                  src={item.embedSnapshotUrl}
                  alt={item.title || item.url}
                  className="h-full w-full object-cover"
                  draggable={false}
                />
                <div className="pointer-events-none absolute right-2 top-2 rounded bg-surface-900/80 px-2 py-1 text-[10px] text-white">
                  Snapshot
                </div>
              </div>
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-surface-50 p-4 text-center">
                <p className="text-sm font-medium text-foreground">
                  {item.embedSnapshotStatus === "loading" ? "Capturing snapshot..." : "Snapshot unavailable"}
                </p>
                <p className="max-w-[36ch] text-xs text-muted-foreground">
                  {item.embedSnapshotReason || "Snapshot fallback is loading."}
                </p>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  Open in new tab
                </a>
              </div>
            )
          ) : showFrameFallback ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-surface-50 p-4 text-center">
              <p className="text-sm font-medium text-foreground">Cannot render this site in iframe</p>
              <p className="max-w-[36ch] text-xs text-muted-foreground">
                {item.embedFrameReason || "This website blocks embedding via iframe policy."}
              </p>
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-brand-600 hover:text-brand-700"
              >
                Open in new tab
              </a>
            </div>
          ) : (
            <div className="relative h-full w-full">
              <iframe
                ref={iframeRef}
                title={item.title || item.url}
                src={item.url}
                allow={item.allow}
                sandbox={item.sandbox}
                className={`h-full w-full ${interactMode ? "pointer-events-auto" : "pointer-events-none"}`}
                onLoad={() => {
                  if (item.embedState !== undefined) {
                    postToEmbed({
                      type: "setState",
                      payload: item.embedState,
                      version: item.embedStateVersion ?? 1,
                    })
                  } else {
                    requestEmbedState()
                  }
                }}
              />
              {frameStatus === "checking" && (
                <div className="pointer-events-none absolute right-2 top-2 rounded bg-surface-900/80 px-2 py-1 text-[10px] text-white">
                  Checking iframe policy...
                </div>
              )}
            </div>
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            Add a URL to embed
          </div>
        )}
        {captureBadgeLabel && (
          <div
            className={`pointer-events-none absolute left-2 top-2 rounded px-2 py-1 text-[10px] font-medium ${captureBadgeClass}`}
          >
            {captureBadgeLabel}
          </div>
        )}
      </div>

      {isSelected && !interactMode && (
        <button
          type="button"
          onMouseDown={(e) => handleResizeStart(e, "se")}
          className="absolute -bottom-1 -right-1 h-3 w-3 cursor-nwse-resize rounded-full border border-brand-400 bg-white shadow-sm hover:bg-brand-100"
          aria-label="Resize"
        />
      )}
    </div>
  )
}
