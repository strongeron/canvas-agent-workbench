import { useCallback, useEffect, useRef, useState } from "react"

import type { CanvasComponentItem } from "../../types/canvas"
import type { GalleryEntry, ComponentVariant } from "../../core/types"

/** Props for injected Renderer component */
interface RendererComponentProps {
  componentName: string
  importPath?: string
  variant: ComponentVariant
  propsOverride?: Record<string, unknown>
  onPropsChange?: (props: Record<string, unknown>) => void
  allowOverflow?: boolean
  renderMode?: "canvas" | "minimal"
  showInteractivePanel?: boolean
}

type ResizeHandle = "se"

interface CanvasLayoutComponentItemProps {
  item: CanvasComponentItem
  isSelected: boolean
  onSelect: (addToSelection?: boolean) => void
  onUpdate: (updates: Partial<Omit<CanvasComponentItem, "id">>) => void
  scale: number
  interactMode: boolean
  Renderer: React.ComponentType<RendererComponentProps>
  getComponentById: (id: string) => GalleryEntry | null
}

const MIN_WIDTH = 120
const MIN_HEIGHT = 60

export function CanvasLayoutComponentItem({
  item,
  isSelected,
  onSelect,
  onUpdate,
  scale,
  interactMode,
  Renderer,
  getComponentById,
}: CanvasLayoutComponentItemProps) {
  const [isResizing, setIsResizing] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const component = getComponentById(item.componentId)
  const variant = component?.variants[item.variantIndex]

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, handle: ResizeHandle) => {
      if (interactMode) return
      if (handle !== "se") return
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

    const handleMouseUp = () => {
      setIsResizing(false)
    }

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
      ref={containerRef}
      className="relative h-full w-full"
      onMouseDown={(e) => {
        if (interactMode) return
        if (e.button !== 0) return
        e.stopPropagation()
        if (!e.shiftKey) {
          onSelect(false)
        }
      }}
      onClick={(e) => {
        if (interactMode) return
        e.stopPropagation()
        if (e.shiftKey) {
          onSelect(true)
        }
      }}
    >
      <div className={`h-full w-full rounded-lg bg-white shadow-card ${borderClass}`}>
        <div
          className={`flex h-full w-full items-center justify-center overflow-hidden rounded-lg px-3 py-3 ${
            interactMode ? "pointer-events-auto" : "pointer-events-none"
          }`}
        >
          <div className="w-full">
            {component && variant ? (
              <Renderer
                componentName={component.name}
                importPath={component.importPath}
                variant={variant}
                allowOverflow={false}
                renderMode="canvas"
                propsOverride={item.customProps}
                showInteractivePanel={false}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                Missing component
              </div>
            )}
          </div>
        </div>
      </div>

      {isSelected && !interactMode && (
        <button
          type="button"
          onMouseDown={(e) => handleResizeStart(e, "se")}
          className="absolute -bottom-1 -right-1 h-3 w-3 cursor-nwse-resize rounded-full border border-brand-400 bg-white shadow-sm hover:bg-brand-100"
          aria-label="Resize"
        />
      )}
    </div>
  )
}
