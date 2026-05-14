import { RotateCw } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import type { CanvasMarkdownItem as CanvasMarkdownItemType } from "../../types/canvas"
import { listMarkdownBlocks } from "../../utils/canvasMarkdownWriter"
import {
  performCanvasMarkdownWrite,
  type CanvasMarkdownWriteClientResult,
} from "../../utils/canvasMarkdownWriteClient"
import { CanvasContextMenu } from "./CanvasContextMenu"
import { CanvasMarkdownPreview } from "./CanvasMarkdownPreview"
import { useCanvasItemContextMenu } from "./useCanvasItemContextMenu"

type ResizeHandle = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw"

interface CanvasMarkdownItemProps {
  item: CanvasMarkdownItemType
  isSelected: boolean
  isMultiSelected?: boolean
  groupColor?: string
  onSelect: (addToSelection?: boolean) => void
  onUpdate: (updates: Partial<Omit<CanvasMarkdownItemType, "id">>) => void
  onRemove: () => void
  onDuplicate: () => void
  onBringToFront: () => void
  scale: number
  interactMode: boolean
  onWriteSuccess?: (result: CanvasMarkdownWriteClientResult) => void
}

const MIN_WIDTH = 280
const MIN_HEIGHT = 180

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

export function CanvasMarkdownItem({
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
  onWriteSuccess,
}: CanvasMarkdownItemProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [isRotating, setIsRotating] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null)
  const [initialState, setInitialState] = useState({ x: 0, y: 0, width: 0, height: 0, rotation: 0 })
  const [activeBlockIndex, setActiveBlockIndex] = useState<number | null>(null)
  const [editingBlockIndex, setEditingBlockIndex] = useState<number | null>(null)
  const [editingValue, setEditingValue] = useState("")
  const [writeState, setWriteState] = useState<{ status: "idle" | "saving" | "error"; error: string }>({
    status: "idle",
    error: "",
  })
  const { contextMenu, handleContextMenu, closeContextMenu } = useCanvasItemContextMenu({
    isSelected,
    interactMode,
    onSelect,
  })
  const blocks = useMemo(() => listMarkdownBlocks(item.source), [item.source])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (interactMode) return
      if (e.button !== 0) return
      const target = e.target as HTMLElement | null
      if (target?.closest("[data-markdown-block-interactive='true']")) {
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

  useEffect(() => {
    if (editingBlockIndex === null) return
    if (editingBlockIndex >= blocks.length) {
      setEditingBlockIndex(null)
      setEditingValue("")
    }
  }, [blocks.length, editingBlockIndex])

  const commitEditing = useCallback(async () => {
    if (editingBlockIndex === null) return
    setWriteState({ status: "saving", error: "" })
    try {
      const result = await performCanvasMarkdownWrite(
        {
          source: item.source,
          sourcePath: item.sourcePath,
          sourceFileMtime: item.sourceFileMtime,
        },
        {
          action: "update",
          blockIndex: editingBlockIndex,
          newText: editingValue,
        }
      )
      onUpdate({
        source: result.source,
        ...(typeof result.mtimeMs === "number" ? { sourceFileMtime: result.mtimeMs } : {}),
      })
      onWriteSuccess?.(result)
      setWriteState({ status: "idle", error: "" })
      setEditingBlockIndex(null)
      setEditingValue("")
    } catch (error) {
      setWriteState({
        status: "error",
        error: error instanceof Error ? error.message : "Failed to update markdown block.",
      })
    }
  }, [editingBlockIndex, editingValue, item.source, item.sourceFileMtime, item.sourcePath, onUpdate, onWriteSuccess])

  const cancelEditing = useCallback(() => {
    setEditingBlockIndex(null)
    setEditingValue("")
    setWriteState({ status: "idle", error: "" })
  }, [])

  const reorderBlock = useCallback(
    async (direction: "up" | "down") => {
      if (activeBlockIndex === null) return
      const targetIndex = direction === "up" ? activeBlockIndex - 1 : activeBlockIndex + 1
      if (targetIndex < 0 || targetIndex >= blocks.length) return
      setWriteState({ status: "saving", error: "" })
      try {
        const result = await performCanvasMarkdownWrite(
          {
            source: item.source,
            sourcePath: item.sourcePath,
            sourceFileMtime: item.sourceFileMtime,
          },
          {
            action: "reorder",
            fromIndex: activeBlockIndex,
            toIndex: targetIndex,
          }
        )
        onUpdate({
          source: result.source,
          ...(typeof result.mtimeMs === "number" ? { sourceFileMtime: result.mtimeMs } : {}),
        })
        onWriteSuccess?.(result)
        setActiveBlockIndex(targetIndex)
        setWriteState({ status: "idle", error: "" })
      } catch (error) {
        setWriteState({
          status: "error",
          error: error instanceof Error ? error.message : "Failed to reorder markdown blocks.",
        })
      }
    },
    [activeBlockIndex, blocks.length, item.source, item.sourceFileMtime, item.sourcePath, onUpdate, onWriteSuccess]
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
        <div
          className="absolute -left-1 top-0 h-full w-1 rounded-l"
          style={{ backgroundColor: groupColor }}
        />
      )}
      <div
        className={`relative h-full w-full overflow-hidden rounded-xl bg-white shadow-card transition-shadow ${borderClass}`}
      >
        {writeState.status === "error" ? (
          <div className="absolute left-3 right-3 top-3 z-10 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-700">
            {writeState.error}
          </div>
        ) : null}
        <CanvasMarkdownPreview
          source={item.source}
          title={item.title}
          background={item.background}
          activeBlockIndex={activeBlockIndex}
          editingBlockIndex={editingBlockIndex}
          editingValue={editingValue}
          onEditingValueChange={setEditingValue}
          onEditingBlur={() => {
            void commitEditing()
          }}
          onEditingKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault()
              void commitEditing()
              return
            }
            if (event.key === "Escape") {
              event.preventDefault()
              cancelEditing()
            }
          }}
          onBlockClick={(index) => {
            onSelect(false)
            setActiveBlockIndex(index)
          }}
          onBlockDoubleClick={(index) => {
            onSelect(false)
            setActiveBlockIndex(index)
            setEditingBlockIndex(index)
            setEditingValue(blocks[index]?.source || "")
            setWriteState({ status: "idle", error: "" })
          }}
          onMoveBlockUp={() => {
            void reorderBlock("up")
          }}
          onMoveBlockDown={() => {
            void reorderBlock("down")
          }}
          canMoveBlockUp={(index) => index > 0 && writeState.status !== "saving"}
          canMoveBlockDown={(index) => index < blocks.length - 1 && writeState.status !== "saving"}
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

      {contextMenu && (
        <CanvasContextMenu
          position={contextMenu}
          onClose={closeContextMenu}
          onBringToFront={onBringToFront}
          onDuplicate={onDuplicate}
          onDelete={onRemove}
        />
      )}
    </div>
  )
}
