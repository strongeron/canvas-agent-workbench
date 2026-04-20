import { useCallback, useEffect, useState } from "react"

import type { CanvasMarkdownItem as CanvasMarkdownItemType } from "../../types/canvas"
import { CanvasMarkdownPreview } from "./CanvasMarkdownPreview"

interface CanvasLayoutMarkdownItemProps {
  item: CanvasMarkdownItemType
  isSelected: boolean
  onSelect: (addToSelection?: boolean) => void
  onUpdate: (updates: Partial<Omit<CanvasMarkdownItemType, "id">>) => void
  scale: number
  interactMode: boolean
}

const MIN_WIDTH = 280
const MIN_HEIGHT = 180

export function CanvasLayoutMarkdownItem({
  item,
  isSelected,
  onSelect,
  onUpdate,
  scale,
  interactMode,
}: CanvasLayoutMarkdownItemProps) {
  const [isResizing, setIsResizing] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 })

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
      data-canvas-item-id={item.id}
      data-canvas-item-type={item.type}
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
      <div
        className={`relative h-full w-full overflow-hidden rounded-lg bg-white shadow-card ${borderClass}`}
      >
        <CanvasMarkdownPreview
          source={item.source}
          title={item.title}
          background={item.background}
        />
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
