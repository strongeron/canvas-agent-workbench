import { RotateCw } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

import type { CanvasComponentItem } from "../../types/canvas"
import type { GalleryEntry, ComponentVariant } from "../../core/types"
import { CanvasContextMenu } from "./CanvasContextMenu"

/** Props for injected Renderer component */
interface RendererComponentProps {
  componentName: string
  importPath?: string
  variant: ComponentVariant
  allowOverflow?: boolean
  renderMode?: "card" | "standalone" | "canvas"
  propsOverride?: Record<string, unknown>
  onPropsChange?: (props: Record<string, unknown>) => void
  showInteractivePanel?: boolean
  hideHeader?: boolean
  hideFooter?: boolean
}

type ResizeHandle = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw"

interface CanvasItemProps {
  item: CanvasComponentItem
  isSelected: boolean
  isMultiSelected?: boolean
  groupColor?: string
  onSelect: (addToSelection?: boolean) => void
  onUpdate: (updates: Partial<Omit<CanvasComponentItem, "id">>) => void
  onRemove: () => void
  onDuplicate: () => void
  onBringToFront: () => void
  scale: number
  interactMode: boolean
  /** Injected component renderer */
  Renderer: React.ComponentType<RendererComponentProps>
  /** Function to look up component entry by ID */
  getComponentById: (id: string) => GalleryEntry | null
}

const MIN_WIDTH = 100
const MIN_HEIGHT = 50

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

export function CanvasItem({
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
  Renderer,
  getComponentById,
}: CanvasItemProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const hasFittedOnMount = useRef(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [isRotating, setIsRotating] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null)
  const [initialState, setInitialState] = useState({ x: 0, y: 0, width: 0, height: 0, rotation: 0 })
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  const component = getComponentById(item.componentId)
  const variant = component?.variants[item.variantIndex]

  // Check if this variant has interactive controls
  const hasInteractiveSchema = !!variant?.interactiveSchema

  // Handle dragging
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (interactMode) return
      if (e.button !== 0) return
      e.stopPropagation()

      // Select on mousedown (not onClick) to enable immediate drag of unselected items
      // Don't toggle on shift here - let onClick handle shift-toggle to avoid double-toggle
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
    [item, onSelect]
  )

  // Handle resize
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
    [item, onSelect]
  )

  // Handle rotation
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
    [item, onSelect]
  )

  // Handle right-click context menu
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      onSelect() // Select item on right-click
      setContextMenu({ x: e.clientX, y: e.clientY })
    },
    [onSelect]
  )

  // Fit to content handler for context menu
  const handleFitToContent = useCallback(() => {
    if (contentRef.current) {
      const rect = contentRef.current.getBoundingClientRect()
      onUpdate({
        size: {
          width: Math.max(MIN_WIDTH, rect.width / scale + 24),
          height: Math.max(MIN_HEIGHT, rect.height / scale + 24),
        },
      })
    }
  }, [scale, onUpdate])

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

        // Calculate new dimensions based on handle
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

        // Snap to 15 degree increments when holding Shift
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

  // Auto-fit to content on mount (one-time only)
  useEffect(() => {
    if (hasFittedOnMount.current || !contentRef.current) return
    hasFittedOnMount.current = true

    // Wait for content to render, then measure and fit
    requestAnimationFrame(() => {
      if (contentRef.current) {
        const rect = contentRef.current.getBoundingClientRect()
        const fittedWidth = Math.max(MIN_WIDTH, rect.width / scale + 24)
        const fittedHeight = Math.max(MIN_HEIGHT, rect.height / scale + 24)

        // Only update if significantly different from current size
        if (
          Math.abs(fittedWidth - item.size.width) > 20 ||
          Math.abs(fittedHeight - item.size.height) > 20
        ) {
          onUpdate({
            size: { width: fittedWidth, height: fittedHeight },
          })
        }
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- Only run once on mount

  if (!component || !variant) {
    return (
      <div
        ref={containerRef}
        className="absolute rounded-lg border-2 border-dashed border-red-300 bg-red-50 p-4"
        style={{
          left: item.position.x,
          top: item.position.y,
          width: item.size.width,
          height: item.size.height,
          zIndex: item.zIndex,
        }}
      >
        <p className="text-sm text-red-600">Component not found</p>
      </div>
    )
  }

  // Determine border color based on state
  const getBorderStyle = () => {
    if (isMultiSelected) {
      return "border-2 border-violet-500 ring-4 ring-violet-500/20"
    }
    if (isSelected) {
      return "border-2 border-brand-500 ring-4 ring-brand-500/20"
    }
    return "border border-default hover:shadow-md"
  }

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
        // Only handle shift-click here for multi-select toggle
        // Regular selection is handled in mouseDown
        if (e.shiftKey) {
          onSelect(true)
        }
      }}
      onContextMenu={handleContextMenu}
    >
      {/* Group indicator stripe */}
      {groupColor && (
        <div
          className="absolute -left-1 top-0 h-full w-1 rounded-l"
          style={{ backgroundColor: groupColor }}
        />
      )}

      {/* Component content - minimal wrapper, component renders as-is */}
      <div
        className={`h-full w-full rounded-xl border bg-white shadow-card transition-shadow ${getBorderStyle()}`}
      >
        {/* Full width container - overflow hidden here to not clip ring */}
        <div
          ref={contentRef}
          className={`flex h-full w-full items-center justify-center overflow-hidden rounded-xl px-3 py-3 ${
            interactMode ? "pointer-events-auto" : "pointer-events-none"
          }`}
        >
          <div className="w-full">
            <Renderer
              componentName={component.name}
              importPath={component.importPath}
              variant={variant}
              allowOverflow={false}
              renderMode="canvas"
              propsOverride={item.customProps}
              showInteractivePanel={false}
            />
          </div>
        </div>
      </div>

      {/* Controls shown when selected */}
      {isSelected && !interactMode && (
        <>
          {/* Interactive indicator (shows when component has interactive schema) */}
          {hasInteractiveSchema && (
            <div
              className="absolute -left-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-white shadow-md"
              title="Interactive - edit props in sidebar"
            >
              <span className="text-[10px] font-bold">i</span>
            </div>
          )}

          {/* Multi-select indicator */}
          {isMultiSelected && (
            <div
              className="absolute -right-2 top-4 flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 text-white shadow-md"
              title="Part of multi-selection"
            >
              <span className="text-[10px] font-bold">+</span>
            </div>
          )}

          {/* Rotation handle */}
          <div
            onMouseDown={handleRotateStart}
            className="absolute -top-8 left-1/2 flex h-6 w-6 -translate-x-1/2 cursor-grab items-center justify-center rounded-full border border-brand-300 bg-white shadow-sm hover:bg-brand-50 active:cursor-grabbing"
          >
            <RotateCw className="h-3.5 w-3.5 text-brand-600" />
          </div>

          {/* Rotation line */}
          <div className="absolute -top-6 left-1/2 h-4 w-px -translate-x-1/2 bg-brand-300" />

          {/* Resize handles */}
          {(Object.entries(HANDLE_POSITIONS) as [ResizeHandle, { className: string; cursor: string }][]).map(
            ([handle, { className, cursor }]) => (
              <div
                key={handle}
                onMouseDown={(e) => handleResizeStart(e, handle)}
                className={`absolute h-3 w-3 rounded-full border border-brand-400 bg-white shadow-sm hover:bg-brand-100 ${className}`}
                style={{ cursor }}
              />
            )
          )}
        </>
      )}

      {/* Info badge */}
      {isSelected && !interactMode && (
        <div className="absolute -bottom-6 left-0 whitespace-nowrap rounded bg-surface-800 px-2 py-0.5 text-xs text-white">
          {Math.round(item.size.width)} × {Math.round(item.size.height)} · {Math.round(item.rotation)}°
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <CanvasContextMenu
          position={contextMenu}
          onClose={() => setContextMenu(null)}
          onFitToContent={handleFitToContent}
          onBringToFront={onBringToFront}
          onDuplicate={onDuplicate}
          onDelete={onRemove}
        />
      )}
    </div>
  )
}
