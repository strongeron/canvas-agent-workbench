import { RotateCw } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

import type { CanvasExcalidrawItem as CanvasExcalidrawItemType } from "../../types/canvas"
import { CanvasExcalidrawViewport } from "./CanvasExcalidrawViewport"

type ResizeHandle = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw"

interface CanvasExcalidrawItemProps {
  item: CanvasExcalidrawItemType
  isSelected: boolean
  isMultiSelected?: boolean
  groupColor?: string
  onSelect: (addToSelection?: boolean) => void
  onUpdate: (updates: Partial<Omit<CanvasExcalidrawItemType, "id">>) => void
  onRemove: () => void
  onDuplicate: () => void
  onBringToFront: () => void
  scale: number
  interactMode: boolean
}

const MIN_WIDTH = 320
const MIN_HEIGHT = 220

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

export function CanvasExcalidrawItem({
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
}: CanvasExcalidrawItemProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [isRotating, setIsRotating] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null)
  const [initialState, setInitialState] = useState({ x: 0, y: 0, width: 0, height: 0, rotation: 0 })

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
      <div
        className={`relative h-full w-full overflow-hidden rounded-xl bg-white shadow-card transition-shadow ${borderClass}`}
      >
        <CanvasExcalidrawViewport
          title={item.title}
          scene={item.scene}
          interactMode={interactMode}
          onSceneChange={(nextScene) => onUpdate({ scene: nextScene })}
        />
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
