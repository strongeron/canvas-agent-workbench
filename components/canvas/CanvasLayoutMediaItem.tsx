import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import type { CanvasMediaItem as CanvasMediaItemType } from "../../types/canvas"
import { getMediaEmbedInfo } from "./mediaStorageService"
import { resolveCanvasMediaSrc } from "./mediaUrl"

interface CanvasLayoutMediaItemProps {
  item: CanvasMediaItemType
  isSelected: boolean
  onSelect: (addToSelection?: boolean) => void
  onUpdate: (updates: Partial<Omit<CanvasMediaItemType, "id">>) => void
  scale: number
  interactMode: boolean
}

const MIN_WIDTH = 180
const MIN_HEIGHT = 120

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

export function CanvasLayoutMediaItem({
  item,
  isSelected,
  onSelect,
  onUpdate,
  scale,
  interactMode,
}: CanvasLayoutMediaItemProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const clipLoopGuardRef = useRef(0)
  const clipStartGuardRef = useRef(0)
  const [isResizing, setIsResizing] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 })
  const [loadError, setLoadError] = useState(false)
  const clipRange = useMemo(
    () => normalizeClipRange(item.clipStartSec, item.clipEndSec),
    [item.clipEndSec, item.clipStartSec]
  )
  const mediaKind = useMemo(() => detectMediaKind(item.src, item.mediaKind), [item.mediaKind, item.src])
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
  const fitClass = objectFitClass(item.objectFit)
  const mediaSrc = useMemo(
    () => resolveCanvasMediaSrc(item.src, { preferDirect: effectiveMediaKind === "video" }),
    [effectiveMediaKind, item.src]
  )
  const posterSrc = useMemo(
    () => (item.poster ? resolveCanvasMediaSrc(item.poster) : undefined),
    [item.poster]
  )

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

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      if (interactMode) return
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
      onUpdate({
        size: {
          width: Math.max(MIN_WIDTH, initialSize.width + dx),
          height: Math.max(MIN_HEIGHT, initialSize.height + dy),
        },
      })
    }

    const handleMouseUp = () => setIsResizing(false)
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [dragStart.x, dragStart.y, initialSize.height, initialSize.width, isResizing, onUpdate, scale])

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
        if (!e.shiftKey) onSelect(false)
      }}
      onClick={(e) => {
        if (interactMode) return
        e.stopPropagation()
        if (e.shiftKey) onSelect(true)
      }}
    >
      <div className={`relative h-full w-full overflow-hidden rounded-lg bg-white shadow-card ${borderClass}`}>
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
        <button
          type="button"
          onMouseDown={handleResizeStart}
          className="absolute -bottom-1 -right-1 h-3 w-3 cursor-nwse-resize rounded-full border border-brand-400 bg-white shadow-sm hover:bg-brand-100"
          aria-label="Resize"
        />
      )}
    </div>
  )
}
