import { RotateCw } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

import type { CanvasMcpAppItem as CanvasMcpAppItemType } from "../../types/canvas"
import { CanvasContextMenu } from "./CanvasContextMenu"
import { CanvasMcpAppCallLog } from "./CanvasMcpAppCallLog"
import { CanvasMcpAppToolPalette } from "./CanvasMcpAppToolPalette"
import { useCanvasItemContextMenu } from "./useCanvasItemContextMenu"

type ResizeHandle = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw"

interface CanvasMcpAppItemProps {
  item: CanvasMcpAppItemType
  projectId: string
  isSelected: boolean
  isMultiSelected?: boolean
  groupColor?: string
  onSelect: (addToSelection?: boolean) => void
  onUpdate: (updates: Partial<Omit<CanvasMcpAppItemType, "id">>) => void
  onRemove: () => void
  onDuplicate: () => void
  onBringToFront: () => void
  scale: number
  interactMode: boolean
}

const MIN_WIDTH = 320
const MIN_HEIGHT = 260

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

export function CanvasMcpAppItem({
  item,
  projectId,
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
}: CanvasMcpAppItemProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [isRotating, setIsRotating] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null)
  const [initialState, setInitialState] = useState({ x: 0, y: 0, width: 0, height: 0, rotation: 0 })
  const { contextMenu, handleContextMenu, closeContextMenu } = useCanvasItemContextMenu({
    isSelected,
    interactMode,
    onSelect,
  })

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (interactMode) return
      if (e.button !== 0) return
      e.stopPropagation()
      if (!e.shiftKey) onSelect(false)
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
        onUpdate({ position: { x: initialState.x + dx, y: initialState.y + dy } })
        return
      }
      if (isResizing && resizeHandle) {
        const dx = (e.clientX - dragStart.x) / scale
        const dy = (e.clientY - dragStart.y) / scale
        let newWidth = initialState.width
        let newHeight = initialState.height
        let newX = initialState.x
        let newY = initialState.y
        if (resizeHandle.includes("e")) newWidth = Math.max(MIN_WIDTH, initialState.width + dx)
        if (resizeHandle.includes("w")) {
          const widthDelta = Math.min(dx, initialState.width - MIN_WIDTH)
          newWidth = initialState.width - widthDelta
          newX = initialState.x + widthDelta
        }
        if (resizeHandle.includes("s")) newHeight = Math.max(MIN_HEIGHT, initialState.height + dy)
        if (resizeHandle.includes("n")) {
          const heightDelta = Math.min(dy, initialState.height - MIN_HEIGHT)
          newHeight = initialState.height - heightDelta
          newY = initialState.y + heightDelta
        }
        onUpdate({ position: { x: newX, y: newY }, size: { width: newWidth, height: newHeight } })
        return
      }
      if (isRotating && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2
        let degrees = (Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180) / Math.PI + 90
        if (e.shiftKey) degrees = Math.round(degrees / 15) * 15
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
      ? "border border-brand-400 ring-2 ring-brand-400/15 shadow-sm"
      : "border border-default hover:shadow-md"

  return (
    <div
      ref={containerRef}
      className={`absolute ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
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
      onContextMenu={handleContextMenu}
      onClick={(e) => {
        if (interactMode) return
        e.stopPropagation()
        if (e.shiftKey) onSelect(true)
      }}
    >
      {groupColor && (
        <div className="absolute -left-1 top-0 h-full w-1 rounded-l" style={{ backgroundColor: groupColor }} />
      )}
      <div className={`relative flex h-full w-full flex-col overflow-hidden rounded-xl bg-white shadow-card ${borderClass}`}>
        <div className="flex items-center justify-between border-b border-default bg-surface-50 px-3 py-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-foreground">{item.appName}</div>
            <div className="truncate text-[11px] text-muted-foreground">
              {item.transport.kind === "http" ? item.transport.url : item.transport.command}
            </div>
          </div>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              item.status === "connected"
                ? "bg-emerald-100 text-emerald-700"
                : item.status === "error"
                  ? "bg-red-100 text-red-700"
                  : item.status === "connecting"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-surface-200 text-muted-foreground"
            }`}
          >
            {item.status}
          </span>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-0 overflow-hidden">
          <div className="overflow-y-auto border-r border-default bg-surface-50 p-3">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Tools
            </div>
            <CanvasMcpAppToolPalette
              projectId={projectId}
              nodeId={item.id}
              tools={item.toolsCache}
              recentCalls={item.recentCalls}
              onCallsUpdate={(recentCalls) => onUpdate({ recentCalls })}
            />
          </div>
          <div className="overflow-y-auto p-3">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Call Log
            </div>
            <CanvasMcpAppCallLog records={item.recentCalls} />
          </div>
        </div>
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
          {Object.entries(HANDLE_POSITIONS).map(([handle, config]) => (
            <div
              key={handle}
              onMouseDown={(event) => handleResizeStart(event, handle as ResizeHandle)}
              className={`absolute h-3 w-3 rounded-full border border-brand-500 bg-white ${config.className}`}
              style={{ cursor: config.cursor }}
            />
          ))}
        </>
      )}

      {contextMenu && (
        <CanvasContextMenu
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={closeContextMenu}
          onBringToFront={() => {
            onBringToFront()
            closeContextMenu()
          }}
          onDuplicate={() => {
            onDuplicate()
            closeContextMenu()
          }}
          onDelete={() => {
            onRemove()
            closeContextMenu()
          }}
        />
      )}
    </div>
  )
}
