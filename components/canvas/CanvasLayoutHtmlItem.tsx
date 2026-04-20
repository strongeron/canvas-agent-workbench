import { useCallback, useEffect, useState } from "react"

import type { CanvasHtmlItem as CanvasHtmlItemType } from "../../types/canvas"
import { CanvasHtmlFrame } from "./CanvasHtmlFrame"

interface CanvasLayoutHtmlItemProps {
  item: CanvasHtmlItemType
  isSelected: boolean
  onSelect: (addToSelection?: boolean) => void
  onUpdate: (updates: Partial<Omit<CanvasHtmlItemType, "id">>) => void
  scale: number
  interactMode: boolean
}

const MIN_WIDTH = 280
const MIN_HEIGHT = 180

export function CanvasLayoutHtmlItem({
  item,
  isSelected,
  onSelect,
  onUpdate,
  scale,
  interactMode,
}: CanvasLayoutHtmlItemProps) {
  const [isResizing, setIsResizing] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 })

  const handleResizeStart = useCallback(
    (event: React.MouseEvent) => {
      if (interactMode) return
      event.stopPropagation()
      event.preventDefault()
      onSelect()
      setIsResizing(true)
      setDragStart({ x: event.clientX, y: event.clientY })
      setInitialSize({ width: item.size.width, height: item.size.height })
    },
    [interactMode, item.size.height, item.size.width, onSelect]
  )

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (event: MouseEvent) => {
      const dx = (event.clientX - dragStart.x) / scale
      const dy = (event.clientY - dragStart.y) / scale
      onUpdate({
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
  }, [dragStart, initialSize.height, initialSize.width, isResizing, onUpdate, scale])

  return (
    <div
      className={`relative h-full w-full ${isSelected ? "ring-4 ring-brand-500/20" : ""}`}
      data-canvas-item-id={item.id}
      data-canvas-item-type={item.type}
      onClick={(event) => {
        if (interactMode) return
        event.stopPropagation()
        onSelect(event.shiftKey)
      }}
    >
      <CanvasHtmlFrame item={item} interactMode={interactMode} />

      {isSelected && !interactMode ? (
        <>
          <div
            onMouseDown={handleResizeStart}
            className="absolute bottom-0 right-0 h-3 w-3 translate-x-1/2 translate-y-1/2 rounded-full border border-brand-400 bg-white shadow-sm hover:bg-brand-100"
            style={{ cursor: "nwse-resize" }}
          />
          <div className="absolute -bottom-6 left-0 whitespace-nowrap rounded bg-surface-800 px-2 py-0.5 text-xs text-white">
            {Math.round(item.size.width)} × {Math.round(item.size.height)}
          </div>
        </>
      ) : null}
    </div>
  )
}
