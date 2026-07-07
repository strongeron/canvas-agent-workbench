import { ArrowDownToLine, MoveHorizontal, Plus, RotateCw } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useDroppable } from "@dnd-kit/core"

import type {
  CanvasArtboardItem as CanvasArtboardItemType,
  CanvasItem,
} from "../../types/canvas"
import {
  computeLayoutContentHeight,
  computeLayoutHeightOverflow,
} from "../../utils/canvasLayoutMetrics"
import { CanvasContextMenu } from "./CanvasContextMenu"
import { useCanvasItemContextMenu } from "./useCanvasItemContextMenu"

type ResizeHandle = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw"

interface CanvasArtboardItemProps {
  item: CanvasArtboardItemType
  isSelected: boolean
  isMultiSelected?: boolean
  onSelect: (addToSelection?: boolean) => void
  onUpdate: (updates: Partial<Omit<CanvasArtboardItemType, "id">>) => void
  onRemove: () => void
  onDuplicate: () => void
  onBringToFront: () => void
  /** Bracket a mouse-drag mutation stream so history/events coalesce it (FOX2-66). */
  onGestureStart?: () => void
  onGestureEnd?: (summary: string) => void
  scale: number
  interactMode: boolean
  children: React.ReactNode
  /** Child items, for content-height metrics (overflow cue + fit height). */
  childItems?: CanvasItem[]
  /** A library-panel primitive drag (native HTML5 DnD) is in progress. */
  libraryDragActive?: boolean
  /** Drop the active library primitive into this artboard as a new child. */
  onLibraryPrimitiveDrop?: () => void
  /** OS files dropped onto this artboard (media) → new children. */
  onFilesDrop?: (files: File[]) => void
  /** Open the add-into-artboard picker at a viewport position (FOX2-59 method 4). */
  onAddMenuRequest?: (position: { x: number; y: number }) => void
}

const MIN_WIDTH = 320
const MIN_HEIGHT = 240
const GAP_SCRUB_PIXELS_PER_UNIT = 4

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

function getJustifyClass(value?: string) {
  switch (value) {
    case "start":
      return "justify-start"
    case "center":
      return "justify-center"
    case "end":
      return "justify-end"
    case "between":
      return "justify-between"
    default:
      return "justify-start"
  }
}

function getAlignClass(value?: string) {
  switch (value) {
    case "start":
      return "items-start"
    case "center":
      return "items-center"
    case "end":
      return "items-end"
    case "stretch":
      return "items-stretch"
    default:
      return "items-start"
  }
}

function getGridColsClass(count?: number) {
  if (!count || count < 1) return "grid-cols-1"
  if (count === 2) return "grid-cols-2"
  if (count === 3) return "grid-cols-3"
  if (count === 4) return "grid-cols-4"
  return "grid-cols-5"
}

export function CanvasArtboardItem({
  item,
  isSelected,
  isMultiSelected = false,
  onSelect,
  onUpdate,
  onRemove,
  onDuplicate,
  onBringToFront,
  onGestureStart,
  onGestureEnd,
  scale,
  interactMode,
  children,
  childItems,
  libraryDragActive = false,
  onLibraryPrimitiveDrop,
  onFilesDrop,
  onAddMenuRequest,
}: CanvasArtboardItemProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [isRotating, setIsRotating] = useState(false)
  const [isGapScrubbing, setIsGapScrubbing] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null)
  const [initialState, setInitialState] = useState({ x: 0, y: 0, width: 0, height: 0, rotation: 0 })
  const [gapScrubStart, setGapScrubStart] = useState({ x: 0, gap: 0 })
  // Highlight the artboard while a library primitive is dragged over it
  // (FOX2-58) — the native HTML5 drag has no dnd-kit isOver, so track it here.
  const [isLibraryDropTarget, setIsLibraryDropTarget] = useState(false)
  const { contextMenu, handleContextMenu, closeContextMenu } = useCanvasItemContextMenu({
    isSelected,
    interactMode,
    onSelect,
  })

  const { setNodeRef, isOver } = useDroppable({
    id: `artboard-${item.id}`,
  })

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (interactMode) return
      if (e.button !== 0) return
      if ((e.target as HTMLElement).closest('[data-artboard-child="true"]')) {
        return
      }
      e.stopPropagation()

      if (!e.shiftKey) {
        onSelect(false)
      }

      setIsDragging(true)
      onGestureStart?.()
      setDragStart({ x: e.clientX, y: e.clientY })
      setInitialState({
        x: item.position.x,
        y: item.position.y,
        width: item.size.width,
        height: item.size.height,
        rotation: item.rotation,
      })
    },
    [interactMode, item, onGestureStart, onSelect]
  )

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, handle: ResizeHandle) => {
      if (interactMode) return
      e.stopPropagation()
      e.preventDefault()
      onSelect()

      setIsResizing(true)
      onGestureStart?.()
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
    [interactMode, item, onGestureStart, onSelect]
  )

  const handleRotateStart = useCallback(
    (e: React.MouseEvent) => {
      if (interactMode) return
      e.stopPropagation()
      e.preventDefault()
      onSelect()

      setIsRotating(true)
      onGestureStart?.()
      setInitialState({
        x: item.position.x,
        y: item.position.y,
        width: item.size.width,
        height: item.size.height,
        rotation: item.rotation,
      })
    },
    [interactMode, item, onGestureStart, onSelect]
  )

  const handleGapScrubStart = useCallback(
    (e: React.MouseEvent) => {
      if (interactMode) return
      e.stopPropagation()
      e.preventDefault()
      onSelect()
      setIsGapScrubbing(true)
      onGestureStart?.()
      setGapScrubStart({
        x: e.clientX,
        gap: item.layout.gap ?? 12,
      })
    },
    [interactMode, item.layout.gap, onGestureStart, onSelect]
  )

  useEffect(() => {
    if (!isDragging && !isResizing && !isRotating && !isGapScrubbing) return

    const handleMouseMove = (e: MouseEvent) => {
      if (isGapScrubbing) {
        const dx = (e.clientX - gapScrubStart.x) / scale
        const nextGap = Math.max(
          0,
          gapScrubStart.gap + Math.round(dx / GAP_SCRUB_PIXELS_PER_UNIT)
        )
        onUpdate({
          layout: {
            ...item.layout,
            gap: nextGap,
          },
        })
      } else if (isDragging) {
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

        // Rounded: /scale deltas are fractional and these persist into the
        // document; a fractional artboard height also leaks into children on
        // later fill toggles (FOX2-41).
        onUpdate({
          position: { x: Math.round(newX), y: Math.round(newY) },
          size: { width: Math.round(newWidth), height: Math.round(newHeight) },
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

        onUpdate({ rotation: degrees })
      }
    }

    const handleMouseUp = () => {
      // The effect only runs while a gesture-starting handler set a flag, so
      // end always pairs with a start; the store drops no-change gestures.
      onGestureEnd?.(
        isGapScrubbing
          ? "scrub-gap"
          : isDragging
            ? "move-artboard"
            : isResizing
              ? "resize-artboard"
              : "rotate-artboard"
      )
      setIsDragging(false)
      setIsResizing(false)
      setIsRotating(false)
      setIsGapScrubbing(false)
      setResizeHandle(null)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [
    dragStart,
    gapScrubStart,
    initialState,
    isDragging,
    isGapScrubbing,
    isResizing,
    isRotating,
    item.layout,
    onGestureEnd,
    onUpdate,
    resizeHandle,
    scale,
  ])

  // Layout-derived content height vs the explicit artboard height. When
  // content is taller, the overflow-hidden frame silently clips it — the cue
  // below plus a one-shot "Fit height" is the affordance (FOX2-41). One-shot
  // rather than a persistent hug mode: continuous measure-and-write-back is
  // the same feedback-loop class as the FOX2-40 autosave bug.
  const overflowPx =
    childItems && childItems.length > 0 ? computeLayoutHeightOverflow(item, childItems) : 0
  const handleFitHeight = useCallback(() => {
    if (!childItems || childItems.length === 0) return
    onUpdate({
      size: { ...item.size, height: computeLayoutContentHeight(item, childItems) },
    })
  }, [childItems, item, onUpdate])

  const layout = item.layout
  const layoutClassName =
    layout.display === "flex"
      ? `flex ${layout.direction === "row" ? "flex-row" : "flex-col"} ${getAlignClass(layout.align)} ${getJustifyClass(layout.justify)}`
      : `grid ${getGridColsClass(layout.columns)} ${getAlignClass(layout.align)} ${getJustifyClass(layout.justify)}`

  const borderClass = isSelected
    ? "border border-brand-400 ring-2 ring-brand-400/15 shadow-sm"
    : "border border-default"

  return (
    <div
      ref={(node) => {
        containerRef.current = node
        setNodeRef(node)
      }}
      className={`group absolute ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
      data-canvas-item-id={item.id}
      data-canvas-item-type={item.type}
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
        if ((e.target as HTMLElement).closest('[data-artboard-child="true"]')) {
          return
        }
        e.stopPropagation()
        if (e.shiftKey) {
          onSelect(true)
        } else {
          onSelect(false)
        }
        onBringToFront()
      }}
      onContextMenu={handleContextMenu}
      onDragOver={(e) => {
        if (interactMode) return
        const hasFiles = Array.from(e.dataTransfer?.types || []).includes("Files")
        if (!libraryDragActive && !(hasFiles && onFilesDrop)) return
        e.preventDefault()
        e.stopPropagation()
        if (!isLibraryDropTarget) setIsLibraryDropTarget(true)
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
        setIsLibraryDropTarget(false)
      }}
      onDrop={(e) => {
        setIsLibraryDropTarget(false)
        if (interactMode) return
        const files = Array.from(e.dataTransfer?.files || [])
        if (files.length > 0 && onFilesDrop) {
          e.preventDefault()
          e.stopPropagation()
          onFilesDrop(files)
          return
        }
        if (!libraryDragActive) return
        // Slot drop zones inside html children preventDefault in the target
        // phase but don't stop propagation — a drop they handled must not
        // also create an artboard child (FOX2-58).
        if (e.defaultPrevented) return
        e.preventDefault()
        e.stopPropagation()
        onLibraryPrimitiveDrop?.()
      }}
    >
      <div
        className={`relative h-full w-full overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow ${
          isLibraryDropTarget ? "ring-2 ring-brand-400 ring-offset-2" : borderClass
        }`}
        style={{
          background: item.background || "white",
        }}
        data-theme={item.themeId || undefined}
        data-artboard-id={item.id}
      >
        <div
          className={`h-full w-full ${layoutClassName}`}
          style={{
            gap: layout.gap ?? 12,
            padding: layout.padding ?? 16,
          }}
          data-artboard-content="true"
        >
          {children}
        </div>

        {overflowPx > 1 && !interactMode && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-10 border-b-2 border-dashed border-amber-400 bg-gradient-to-t from-amber-200/60 to-transparent"
            data-artboard-overflow="true"
          />
        )}
      </div>

      {overflowPx > 1 && !interactMode && (
        <div
          className={`absolute -bottom-[26px] left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 transition-opacity duration-100 ${
            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <span className="whitespace-nowrap rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
            Clipped +{overflowPx}px
          </span>
          <button
            type="button"
            data-artboard-handle="true"
            onClick={(e) => {
              e.stopPropagation()
              handleFitHeight()
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="pointer-events-auto flex shrink-0 items-center gap-1 whitespace-nowrap rounded border border-amber-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold leading-none text-amber-700 shadow-sm hover:bg-amber-50"
            title="Grow the artboard to fit its content height"
          >
            <ArrowDownToLine className="h-3 w-3" />
            Fit height
          </button>
        </div>
      )}

      {!interactMode ? (
        <div className="pointer-events-none absolute -top-[24px] left-0 z-20 flex max-w-full items-center gap-1.5">
          <div
            className={`flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none transition-opacity duration-100 ${
              isSelected
                ? "bg-brand-500 text-white opacity-100"
                : "bg-surface-900/80 text-white opacity-0 group-hover:opacity-100"
            }`}
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70" />
            <span className="truncate">{item.name}</span>
            {item.themeId ? (
              <span className="shrink-0 font-normal opacity-70">{item.themeId}</span>
            ) : null}
          </div>
          {isSelected ? (
            <button
              type="button"
              data-artboard-handle="true"
              onMouseDown={handleGapScrubStart}
              className="pointer-events-auto flex shrink-0 cursor-ew-resize items-center gap-1 rounded border border-brand-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-brand-700 shadow-sm hover:bg-brand-50"
              aria-label="Scrub artboard gap"
              title="Scrub artboard gap"
            >
              <MoveHorizontal className="h-3 w-3" />
              Gap {Math.round(layout.gap ?? 12)}
            </button>
          ) : null}
          {isSelected && onAddMenuRequest ? (
            <button
              type="button"
              data-artboard-handle="true"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                const rect = e.currentTarget.getBoundingClientRect()
                onAddMenuRequest({ x: rect.left, y: rect.bottom + 4 })
              }}
              className="pointer-events-auto flex shrink-0 items-center gap-1 rounded border border-brand-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-brand-700 shadow-sm hover:bg-brand-50"
              aria-label="Add to artboard"
              title="Add to artboard"
            >
              <Plus className="h-3 w-3" />
              Add
            </button>
          ) : null}
        </div>
      ) : null}

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

      {isOver && (
        <div className="pointer-events-none absolute inset-2 rounded-xl border-2 border-dashed border-brand-400 bg-brand-50/30" />
      )}

      {contextMenu && (
        <CanvasContextMenu
          position={contextMenu}
          onClose={closeContextMenu}
          onAddHere={
            onAddMenuRequest ? () => onAddMenuRequest(contextMenu) : undefined
          }
          onBringToFront={onBringToFront}
          onDuplicate={onDuplicate}
          onDelete={onRemove}
        />
      )}
    </div>
  )
}
