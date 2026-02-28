import { RotateCw } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

import type { CanvasEmbedItem as CanvasEmbedItemType } from "../../types/canvas"
import { preflightEmbedFramePolicy } from "./embedFramePolicy"
import {
  requestEmbedSnapshot,
  resolveEmbedPreviewMode,
  startEmbedLiveSession,
} from "./embedPreviewService"

type ResizeHandle = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw"

interface CanvasEmbedItemProps {
  item: CanvasEmbedItemType
  isSelected: boolean
  isMultiSelected?: boolean
  groupColor?: string
  onSelect: (addToSelection?: boolean) => void
  onUpdate: (updates: Partial<Omit<CanvasEmbedItemType, "id">>) => void
  onRemove: () => void
  onDuplicate: () => void
  onBringToFront: () => void
  scale: number
  interactMode: boolean
}

const MIN_WIDTH = 200
const MIN_HEIGHT = 120

const HANDLE_POSITIONS: Record<ResizeHandle, { className: string; cursor: string }> = {
  n: { className: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2", cursor: "ns-resize" },
  ne: { className: "right-0 top-0 translate-x-1/2 -translate-y-1/2", cursor: "nesw-resize" },
  e: { className: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2", cursor: "ew-resize" },
  se: { className: "right-0 bottom-0 translate-x-1/2 translate-y-1/2", cursor: "nwse-resize" },
  s: { className: "left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2", cursor: "ns-resize" },
  sw: { className: "left-0 bottom-0 -translate-x-1/2 translate-y-1/2", cursor: "nesw-resize" },
  w: { className: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2", cursor: "ew-resize" },
  nw: { className: "left-0 top-0 -translate-x-1/2 -translate-y-1/2", cursor: "nwse-resize" },
}

export function CanvasEmbedItem({
  item,
  isSelected,
  isMultiSelected = false,
  groupColor,
  onSelect,
  onUpdate,
  onRemove,
  onDuplicate,
  onBringToFront,
  scale,
  interactMode,
}: CanvasEmbedItemProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const onUpdateRef = useRef(onUpdate)
  const preflightInFlightUrlRef = useRef<string | null>(null)
  const snapshotInFlightUrlRef = useRef<string | null>(null)
  const liveInFlightUrlRef = useRef<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [isRotating, setIsRotating] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null)
  const [initialState, setInitialState] = useState({ x: 0, y: 0, width: 0, height: 0, rotation: 0 })
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

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (interactMode) return
      if (e.button !== 0) return
      e.stopPropagation()

      if (!e.shiftKey) {
        onSelect(false)
      }

      setIsDragging(true)
      setDragStart({ x: e.clientX, y: e.clientY })
      setInitialState({
        x: item.position.x,
        y: item.position.y,
        width: item.size.width,
        height: item.size.height,
        rotation: item.rotation,
      })
    },
    [interactMode, item, onSelect]
  )

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, handle: ResizeHandle) => {
      if (interactMode) return
      e.stopPropagation()
      e.preventDefault()
      onSelect()

      setIsResizing(true)
      setResizeHandle(handle)
      setDragStart({ x: e.clientX, y: e.clientY })
      setInitialState({
        x: item.position.x,
        y: item.position.y,
        width: item.size.width,
        height: item.size.height,
        rotation: item.rotation,
      })
    },
    [interactMode, item, onSelect]
  )

  const handleRotateStart = useCallback(
    (e: React.MouseEvent) => {
      if (interactMode) return
      e.stopPropagation()
      e.preventDefault()
      onSelect()

      setIsRotating(true)
      setInitialState({
        x: item.position.x,
        y: item.position.y,
        width: item.size.width,
        height: item.size.height,
        rotation: item.rotation,
      })
    },
    [interactMode, item, onSelect]
  )

  useEffect(() => {
    if (!isDragging && !isResizing && !isRotating) return

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const dx = (e.clientX - dragStart.x) / scale
        const dy = (e.clientY - dragStart.y) / scale
        pushUpdate({
          position: {
            x: initialState.x + dx,
            y: initialState.y + dy,
          },
        })
      } else if (isResizing && resizeHandle) {
        const dx = (e.clientX - dragStart.x) / scale
        const dy = (e.clientY - dragStart.y) / scale

        let newWidth = initialState.width
        let newHeight = initialState.height
        let newX = initialState.x
        let newY = initialState.y

        if (resizeHandle.includes("e")) {
          newWidth = Math.max(MIN_WIDTH, initialState.width + dx)
        }
        if (resizeHandle.includes("w")) {
          const widthDelta = Math.min(dx, initialState.width - MIN_WIDTH)
          newWidth = initialState.width - widthDelta
          newX = initialState.x + widthDelta
        }
        if (resizeHandle.includes("s")) {
          newHeight = Math.max(MIN_HEIGHT, initialState.height + dy)
        }
        if (resizeHandle.includes("n")) {
          const heightDelta = Math.min(dy, initialState.height - MIN_HEIGHT)
          newHeight = initialState.height - heightDelta
          newY = initialState.y + heightDelta
        }

        pushUpdate({
          position: { x: newX, y: newY },
          size: { width: newWidth, height: newHeight },
        })
      } else if (isRotating && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2
        const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX)
        let degrees = (angle * 180) / Math.PI + 90

        if (e.shiftKey) {
          degrees = Math.round(degrees / 15) * 15
        }

        pushUpdate({ rotation: degrees })
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setIsResizing(false)
      setIsRotating(false)
      setResizeHandle(null)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging, isResizing, isRotating, dragStart, initialState, resizeHandle, scale, pushUpdate])

  const getBorderStyle = () => {
    if (isMultiSelected) {
      return "border-2 border-violet-500 ring-4 ring-violet-500/20"
    }
    if (isSelected) {
      return "border-2 border-brand-500 ring-4 ring-brand-500/20"
    }
    return "border border-default hover:shadow-md"
  }

  return (
    <div
      ref={containerRef}
      className={`absolute ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
      style={{
        left: item.position.x,
        top: item.position.y,
        width: item.size.width,
        height: item.size.height,
        zIndex: item.zIndex,
        transform: `rotate(${item.rotation}deg)`,
        transformOrigin: "center center",
      }}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        if (interactMode) return
        e.stopPropagation()
        if (e.shiftKey) {
          onSelect(true)
        }
      }}
    >
      {groupColor && (
        <div
          className="absolute -left-1 top-0 h-full w-1 rounded-l"
          style={{ backgroundColor: groupColor }}
        />
      )}

      <div
        className={`h-full w-full overflow-hidden rounded-xl border bg-white shadow-card transition-shadow ${getBorderStyle()}`}
      >
        <div className="relative h-full w-full">
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
      </div>

      {isSelected && !interactMode && (
        <>
          {isMultiSelected && (
            <div
              className="absolute -right-2 top-4 flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 text-white shadow-md"
              title="Part of multi-selection"
            >
              <span className="text-[10px] font-bold">+</span>
            </div>
          )}

          <div
            onMouseDown={handleRotateStart}
            className="absolute -top-8 left-1/2 flex h-6 w-6 -translate-x-1/2 cursor-grab items-center justify-center rounded-full border border-brand-300 bg-white shadow-sm hover:bg-brand-50 active:cursor-grabbing"
          >
            <RotateCw className="h-3.5 w-3.5 text-brand-600" />
          </div>

          <div className="absolute -top-6 left-1/2 h-4 w-px -translate-x-1/2 bg-brand-300" />

          {(Object.entries(HANDLE_POSITIONS) as [
            ResizeHandle,
            { className: string; cursor: string }
          ][]).map(([handle, { className, cursor }]) => (
            <div
              key={handle}
              onMouseDown={(e) => handleResizeStart(e, handle)}
              className={`absolute h-3 w-3 rounded-full border border-brand-400 bg-white shadow-sm hover:bg-brand-100 ${className}`}
              style={{ cursor }}
            />
          ))}
        </>
      )}

      {isSelected && !interactMode && (
        <div className="absolute -bottom-6 left-0 whitespace-nowrap rounded bg-surface-800 px-2 py-0.5 text-xs text-white">
          {Math.round(item.size.width)} × {Math.round(item.size.height)} · {Math.round(item.rotation)}°
        </div>
      )}
    </div>
  )
}
