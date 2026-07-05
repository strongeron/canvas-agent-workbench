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
      const width = Math.round(Math.max(MIN_WIDTH, initialSize.width + dx))
      const height = Math.round(Math.max(MIN_HEIGHT, initialSize.height + dy))

      // Dragging is an explicit size choice: both axes leave intrinsic hug
      // and become "fixed" so the shell stops tracking the rendered
      // component (FOX2-57). "Hug content" in the inspector returns to
      // intrinsic.
      onUpdate({
        size: { width, height },
        layoutSizing: {
          ...item.layoutSizing,
          width: "fixed",
          height: "fixed",
          hugWidth: width,
          hugHeight: height,
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
  }, [
    dragStart.x,
    dragStart.y,
    initialSize.height,
    initialSize.width,
    isResizing,
    item.layoutSizing,
    onUpdate,
    scale,
  ])

  // One-shot measured backfill (FOX2-57): under intrinsic hug the shell is
  // fit-content, so the stored size never drives rendering — but agents,
  // export, and the layout metrics read item.size. Measure the real rendered
  // box (offsetWidth/Height are layout px, immune to the canvas zoom
  // transform) and write it back once when it drifts by more than 1px.
  // Writing does not change the fit-content render, so this converges
  // immediately — no measure->write->re-render loop.
  const widthMode = item.layoutSizing?.width ?? "hug"
  const heightMode = item.layoutSizing?.height ?? "hug"
  useEffect(() => {
    if (widthMode !== "hug" && heightMode !== "hug") return
    const frame = requestAnimationFrame(() => {
      const node = containerRef.current
      if (!node) return
      const measuredWidth = node.offsetWidth
      const measuredHeight = node.offsetHeight
      if (!measuredWidth || !measuredHeight) return
      const size = { ...item.size }
      let changed = false
      if (widthMode === "hug" && Math.abs(measuredWidth - item.size.width) > 1) {
        size.width = Math.round(measuredWidth)
        changed = true
      }
      if (heightMode === "hug" && Math.abs(measuredHeight - item.size.height) > 1) {
        size.height = Math.round(measuredHeight)
        changed = true
      }
      if (changed) {
        onUpdate({ size })
      }
    })
    return () => cancelAnimationFrame(frame)
  }, [
    heightMode,
    item.componentId,
    item.customProps,
    item.size,
    item.variantIndex,
    onUpdate,
    widthMode,
  ])

  // No card chrome around layout components (FOX2-57): the shell is
  // invisible — you see and operate on the component itself. Selection and
  // hover are outlines, which don't participate in layout, so they never
  // change the intrinsic (fit-content) size the shell hugs.
  const selectionClass = isSelected
    ? "outline outline-2 outline-brand-400 rounded"
    : "outline-none hover:outline hover:outline-1 hover:outline-brand-300 rounded"

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full ${interactMode ? "" : selectionClass}`}
      data-canvas-item-id={item.id}
      data-canvas-item-type={item.type}
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
      <div
        className={`flex h-full w-full items-center justify-center ${
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
            <div className="flex h-full w-full items-center justify-center rounded border border-dashed border-default px-3 py-2 text-xs text-muted-foreground">
              Missing component
            </div>
          )}
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
