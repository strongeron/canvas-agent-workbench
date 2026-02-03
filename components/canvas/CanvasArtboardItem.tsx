import { RotateCw } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useDroppable } from "@dnd-kit/core"

import type { CanvasArtboardItem as CanvasArtboardItemType } from "../../types/canvas"

type ResizeHandle = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw"

interface CanvasArtboardItemProps {
  item: CanvasArtboardItemType
  isSelected: boolean
  isMultiSelected?: boolean
  onSelect: (addToSelection?: boolean) => void
  onUpdate: (updates: Partial<Omit<CanvasArtboardItemType, "id">>) => void
  onBringToFront: () => void
  scale: number
  interactMode: boolean
  children: React.ReactNode
}

const MIN_WIDTH = 320
const MIN_HEIGHT = 240

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
  onBringToFront,
  scale,
  interactMode,
  children,
}: CanvasArtboardItemProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [isRotating, setIsRotating] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null)
  const [initialState, setInitialState] = useState({ x: 0, y: 0, width: 0, height: 0, rotation: 0 })

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
  }, [isDragging, isResizing, isRotating, dragStart, initialState, resizeHandle, scale, onUpdate])

  const layout = item.layout
  const layoutClassName =
    layout.display === "flex"
      ? `flex ${layout.direction === "row" ? "flex-row" : "flex-col"} ${getAlignClass(layout.align)} ${getJustifyClass(layout.justify)}`
      : `grid ${getGridColsClass(layout.columns)}`

  const borderClass = isSelected
    ? "border-2 border-brand-500 ring-4 ring-brand-500/20"
    : "border border-default"

  return (
    <div
      ref={(node) => {
        containerRef.current = node
        setNodeRef(node)
      }}
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
    >
      <div
        className={`relative h-full w-full overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow ${borderClass}`}
        style={{
          background: item.background || "white",
        }}
      >
        <div
          data-artboard-handle="true"
          className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-md bg-white/90 px-2 py-1 text-[11px] font-semibold text-foreground shadow-sm"
        >
          <span className="h-2 w-2 rounded-full bg-brand-500" />
          {item.name}
        </div>

        <div
          className={`h-full w-full ${layoutClassName}`}
          style={{
            gap: layout.gap ?? 12,
            padding: layout.padding ?? 16,
          }}
        >
          {children}
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

      {isOver && (
        <div className="pointer-events-none absolute inset-2 rounded-xl border-2 border-dashed border-brand-400 bg-brand-50/30" />
      )}
    </div>
  )
}
