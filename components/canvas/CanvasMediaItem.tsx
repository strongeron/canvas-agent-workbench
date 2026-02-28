import { RotateCw } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import type { CanvasMediaItem as CanvasMediaItemType } from "../../types/canvas"
import { getMediaEmbedInfo } from "./mediaStorageService"
import { resolveCanvasMediaSrc } from "./mediaUrl"

type ResizeHandle = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw"

interface CanvasMediaItemProps {
  item: CanvasMediaItemType
  isSelected: boolean
  isMultiSelected?: boolean
  groupColor?: string
  onSelect: (addToSelection?: boolean) => void
  onUpdate: (updates: Partial<Omit<CanvasMediaItemType, "id">>) => void
  onRemove: () => void
  onDuplicate: () => void
  onBringToFront: () => void
  scale: number
  interactMode: boolean
}

const MIN_WIDTH = 180
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

function detectMediaKind(src: string, explicitKind?: CanvasMediaItemType["mediaKind"]) {
  if (explicitKind) return explicitKind
  const lower = src.toLowerCase()
  if (lower.endsWith(".gif")) return "gif"
  if (/\.(mp4|webm|mov|m4v|ogg)(\?|#|$)/.test(lower)) return "video"
  return "image"
}

function objectFitClass(objectFit: CanvasMediaItemType["objectFit"]) {
  switch (objectFit) {
    case "contain":
      return "object-contain"
    case "fill":
      return "object-fill"
    default:
      return "object-cover"
  }
}

function parseClipSeconds(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, value)
  }
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return null
    const parsed = Number(trimmed)
    if (Number.isFinite(parsed)) {
      return Math.max(0, parsed)
    }
  }
  return null
}

function normalizeClipRange(startSec?: number, endSec?: number) {
  const safeStart = parseClipSeconds(startSec) ?? 0
  const safeEnd = parseClipSeconds(endSec)
  const normalizedEnd =
    safeEnd !== null && safeEnd > safeStart + 0.05 ? safeEnd : null
  return {
    startSec: safeStart,
    endSec: normalizedEnd,
    hasCustomStart: safeStart > 0,
    hasCustomEnd: normalizedEnd !== null,
  }
}

export function CanvasMediaItem({
  item,
  isSelected,
  isMultiSelected = false,
  groupColor,
  onSelect,
  onUpdate,
  onRemove: _onRemove,
  onDuplicate: _onDuplicate,
  onBringToFront: _onBringToFront,
  scale,
  interactMode,
}: CanvasMediaItemProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const clipLoopGuardRef = useRef(0)
  const clipStartGuardRef = useRef(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [isRotating, setIsRotating] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null)
  const [initialState, setInitialState] = useState({ x: 0, y: 0, width: 0, height: 0, rotation: 0 })
  const [loadError, setLoadError] = useState(false)
  const clipRange = useMemo(
    () => normalizeClipRange(item.clipStartSec, item.clipEndSec),
    [item.clipEndSec, item.clipStartSec]
  )

  const mediaKind = useMemo(
    () => detectMediaKind(item.src, item.mediaKind),
    [item.mediaKind, item.src]
  )
  const embedInfo = useMemo(
    () =>
      getMediaEmbedInfo(item.src, {
        controls: item.controls,
        autoplay: item.autoplay,
        muted: item.muted,
        loop: item.loop,
        clipStartSec: clipRange.startSec,
        clipEndSec: clipRange.endSec ?? undefined,
      }),
    [clipRange.endSec, clipRange.startSec, item.autoplay, item.controls, item.loop, item.muted, item.src]
  )
  const effectiveMediaKind = embedInfo ? "video" : mediaKind
  const mediaSrc = useMemo(
    () => resolveCanvasMediaSrc(item.src, { preferDirect: effectiveMediaKind === "video" }),
    [effectiveMediaKind, item.src]
  )
  const posterSrc = useMemo(
    () => (item.poster ? resolveCanvasMediaSrc(item.poster) : undefined),
    [item.poster]
  )

  const fitClass = objectFitClass(item.objectFit)

  useEffect(() => {
    setLoadError(false)
  }, [item.src, embedInfo?.embedUrl])

  const seekToClipStart = useCallback((force = false) => {
    if (embedInfo) return
    if (effectiveMediaKind !== "video") return
    const video = videoRef.current
    if (!video) return
    if (!clipRange.hasCustomStart) return

    const duration = Number.isFinite(video.duration) ? video.duration : null
    if (duration !== null && clipRange.startSec >= duration) return

    if (force || Math.abs(video.currentTime - clipRange.startSec) > 0.05) {
      try {
        video.currentTime = clipRange.startSec
      } catch {
        // Ignore seek failures for non-seekable streams.
      }
    }
  }, [clipRange.hasCustomStart, clipRange.startSec, effectiveMediaKind, embedInfo])

  useEffect(() => {
    seekToClipStart(true)
  }, [item.src, seekToClipStart])

  const handleVideoPlay = useCallback(() => {
    seekToClipStart(true)
  }, [seekToClipStart])

  const handleVideoTimeUpdate = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (clipRange.hasCustomStart && video.currentTime + 0.04 < clipRange.startSec) {
      const now = Date.now()
      if (now - clipStartGuardRef.current < 80) return
      clipStartGuardRef.current = now
      seekToClipStart(true)
      return
    }
    if (!clipRange.hasCustomEnd) return
    if (typeof clipRange.endSec !== "number") return
    if (video.currentTime < clipRange.endSec - 0.04) return

    if (item.loop) {
      const now = Date.now()
      if (now - clipLoopGuardRef.current < 80) return
      clipLoopGuardRef.current = now
      try {
        video.currentTime = clipRange.startSec
      } catch {
        // Ignore seek failures for non-seekable streams.
      }
      if (video.paused) {
        void video.play().catch(() => {})
      }
      return
    }

    video.pause()
  }, [clipRange.endSec, clipRange.hasCustomEnd, clipRange.hasCustomStart, clipRange.startSec, item.loop, seekToClipStart])

  const handleVideoEnded = useCallback(() => {
    if (!item.loop) return
    if (!clipRange.hasCustomStart && !clipRange.hasCustomEnd) return
    const video = videoRef.current
    if (!video) return
    try {
      video.currentTime = clipRange.startSec
    } catch {
      // Ignore seek failures for non-seekable streams.
    }
    void video.play().catch(() => {})
  }, [clipRange.hasCustomEnd, clipRange.hasCustomStart, clipRange.startSec, item.loop])

  const useNativeLoop = (item.loop ?? false) && !clipRange.hasCustomStart && !clipRange.hasCustomEnd
  const clipLabel =
    clipRange.hasCustomStart || clipRange.hasCustomEnd
      ? `${clipRange.startSec.toFixed(2)}s${clipRange.hasCustomEnd && clipRange.endSec !== null ? `-${clipRange.endSec.toFixed(2)}s` : "+"}`
      : null

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
        onUpdate({
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

        onUpdate({
          position: { x: newX, y: newY },
          size: { width: newWidth, height: newHeight },
        })
      } else if (isRotating) {
        if (!containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2
        const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX)
        let degrees = (angle * 180) / Math.PI + 90
        if (e.shiftKey) {
          degrees = Math.round(degrees / 15) * 15
        }
        onUpdate({ rotation: degrees })
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
  }, [dragStart, initialState, isDragging, isResizing, isRotating, onUpdate, resizeHandle, scale])

  const borderClass = isMultiSelected
    ? "border-2 border-violet-500 ring-4 ring-violet-500/20"
    : isSelected
      ? "border-2 border-brand-500 ring-4 ring-brand-500/20"
      : "border border-default hover:shadow-md"

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
        if (e.shiftKey) onSelect(true)
      }}
    >
      {groupColor && (
        <div
          className="absolute -left-1 top-0 h-full w-1 rounded-l"
          style={{ backgroundColor: groupColor }}
        />
      )}

      <div className={`relative h-full w-full overflow-hidden rounded-xl bg-white shadow-card transition-shadow ${borderClass}`}>
        {item.src ? (
          loadError ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-surface-50 p-4 text-center">
              <p className="text-sm font-medium text-foreground">Media preview unavailable</p>
              <a
                href={item.src}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-brand-600 hover:text-brand-700"
              >
                Open media source
              </a>
            </div>
          ) : effectiveMediaKind === "video" ? (
            embedInfo ? (
              <iframe
                src={embedInfo.embedUrl}
                title={item.title || `${embedInfo.provider} video`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className={`h-full w-full ${interactMode ? "pointer-events-auto" : "pointer-events-none"}`}
              />
            ) : (
              <video
                ref={videoRef}
                src={mediaSrc}
                poster={posterSrc}
                controls={item.controls ?? true}
                loop={useNativeLoop}
                autoPlay={item.autoplay ?? false}
                muted={item.muted ?? true}
                playsInline
                preload="auto"
                className={`h-full w-full ${fitClass} ${interactMode ? "pointer-events-auto" : "pointer-events-none"}`}
                onLoadedMetadata={() => seekToClipStart(true)}
                onLoadedData={() => seekToClipStart()}
                onCanPlay={() => seekToClipStart()}
                onPlay={handleVideoPlay}
                onTimeUpdate={handleVideoTimeUpdate}
                onEnded={handleVideoEnded}
                onError={() => setLoadError(true)}
              />
            )
          ) : (
            <img
              src={mediaSrc}
              alt={item.alt || item.title || "Media"}
              className={`h-full w-full ${fitClass}`}
              draggable={false}
              onError={() => setLoadError(true)}
            />
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            Add media source URL
          </div>
        )}

        <div className="pointer-events-none absolute right-2 top-2 rounded bg-surface-900/80 px-2 py-1 text-[10px] text-white">
          {embedInfo ? `${embedInfo.provider} embed` : effectiveMediaKind}
        </div>
        {clipLabel && (
          <div className="pointer-events-none absolute bottom-2 right-2 rounded bg-surface-900/80 px-2 py-1 text-[10px] text-white">
            Clip {clipLabel}
          </div>
        )}
      </div>

      {isSelected && !interactMode && (
        <>
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
    </div>
  )
}
