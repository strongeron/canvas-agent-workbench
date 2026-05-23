import { ChevronDown, ChevronUp } from "lucide-react"
import { useDroppable } from "@dnd-kit/core"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ComponentType } from "react"

import type {
  CanvasItem as CanvasItemType,
  CanvasItemUpdate,
  CanvasComponentItem,
  CanvasEmbedItem as CanvasEmbedItemType,
  CanvasHtmlItem as CanvasHtmlItemType,
  CanvasMermaidItem as CanvasMermaidItemType,
  CanvasExcalidrawItem as CanvasExcalidrawItemType,
  CanvasMarkdownItem as CanvasMarkdownItemType,
  CanvasMediaItem as CanvasMediaItemType,
  CanvasArtboardItem as CanvasArtboardItemType,
  CanvasSectionItem as CanvasSectionItemType,
  CanvasTransform,
  CanvasGroup,
} from "../../types/canvas"
import type { GalleryEntry, ComponentVariant } from "../../core/types"
import { CanvasArtboardItem as CanvasArtboardItemComponent } from "./CanvasArtboardItem"
import { CanvasEmbedItem as CanvasEmbedItemComponent } from "./CanvasEmbedItem"
import { CanvasHtmlItem as CanvasHtmlItemComponent } from "./CanvasHtmlItem"
import { CanvasLayoutComponentItem } from "./CanvasLayoutComponentItem"
import { CanvasLayoutExcalidrawItem } from "./CanvasLayoutExcalidrawItem"
import { CanvasLayoutEmbedItem } from "./CanvasLayoutEmbedItem"
import { CanvasLayoutHtmlItem } from "./CanvasLayoutHtmlItem"
import { CanvasLayoutMediaItem } from "./CanvasLayoutMediaItem"
import { CanvasLayoutMermaidItem } from "./CanvasLayoutMermaidItem"
import { CanvasLayoutMarkdownItem } from "./CanvasLayoutMarkdownItem"
import { CanvasExcalidrawItem as CanvasExcalidrawItemComponent } from "./CanvasExcalidrawItem"
import type {
  CanvasReactNodeGroupResizeEvent,
  CanvasReactNodeResizeEvent,
  CanvasReactNodeSelection,
} from "./CanvasHtmlFrame"
import type { CanvasMarkdownWriteClientResult } from "../../utils/canvasMarkdownWriteClient"
import { isEditableEventTarget } from "../../utils/isEditableEventTarget"
import { CanvasMarkdownItem as CanvasMarkdownItemComponent } from "./CanvasMarkdownItem"
import { CanvasMermaidItem as CanvasMermaidItemComponent } from "./CanvasMermaidItem"
import { CanvasMediaItem as CanvasMediaItemComponent } from "./CanvasMediaItem"
import { CanvasItem } from "./CanvasItem"

interface SelectionBox {
  startX: number
  startY: number
  endX: number
  endY: number
}

function getJustifyClass(value?: string) {
  switch (value) {
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

/** Props for injected Renderer component */
interface RendererComponentProps {
  componentName: string
  importPath?: string
  variant: ComponentVariant
  propsOverride?: Record<string, unknown>
  onPropsChange?: (props: Record<string, unknown>) => void
}

interface CanvasWorkspaceProps {
  items: CanvasItemType[]
  groups: CanvasGroup[]
  transform: CanvasTransform
  interactMode: boolean
  editMode?: boolean
  selectedIds: string[]
  onSelectItem: (id: string, addToSelection?: boolean) => void
  onSelectItems: (ids: string[]) => void
  onClearSelection: () => void
  onUpdateItem: (id: string, updates: CanvasItemUpdate) => void
  onRemoveItem: (id: string) => void
  onRemoveSelected: () => void
  onDuplicateItem: (id: string) => void
  onBringToFront: (id: string) => void
  onMoveLayer?: (id: string, direction: "up" | "down") => void
  onPan: (deltaX: number, deltaY: number) => void
  onWheel: (e: React.WheelEvent) => void
  onDimensionsChange?: (width: number, height: number) => void
  getGroupBounds: (groupId: string) => { x: number; y: number; width: number; height: number } | null
  /** Injected component renderer */
  Renderer: ComponentType<RendererComponentProps>
  /** Function to look up component entry by ID */
  getComponentById: (id: string) => GalleryEntry | null
  /** Optional native file drop handler for media assets */
  onDropMediaFiles?: (input: {
    files: File[]
    position: { x: number; y: number }
  }) => void | Promise<void>
  activeReactNodeSelection?: CanvasReactNodeSelection | null
  onReactNodeSelect?: (selection: CanvasReactNodeSelection) => void
  onReactCompileGenerationChange?: (itemId: string, generation: number) => void
  onReactNodeResize?: (event: CanvasReactNodeResizeEvent) => void
  onReactNodeGroupResize?: (event: CanvasReactNodeGroupResizeEvent) => void
  onMarkdownWriteSuccess?: (result: CanvasMarkdownWriteClientResult) => void
  libraryDragActive?: boolean
  onLibraryDropInsert?: (input: { itemId: string; parentCanvasId: string; index: number }) => void
  onLibraryDropWrap?: (input: { itemId: string; canvasId: string }) => void
}

export function CanvasWorkspace({
  items,
  groups,
  transform,
  interactMode,
  editMode = false,
  selectedIds,
  onSelectItem,
  onSelectItems,
  onClearSelection,
  onUpdateItem,
  onRemoveItem,
  onRemoveSelected,
  onDuplicateItem,
  onBringToFront,
  onMoveLayer,
  onPan,
  onWheel,
  onDimensionsChange,
  getGroupBounds,
  Renderer,
  getComponentById,
  onDropMediaFiles,
  activeReactNodeSelection = null,
  onReactNodeSelect,
  onReactCompileGenerationChange,
  onReactNodeResize,
  onReactNodeGroupResize,
  onMarkdownWriteSuccess,
  libraryDragActive = false,
  onLibraryDropInsert,
  onLibraryDropWrap,
}: CanvasWorkspaceProps) {
  const workspaceRef = useRef<HTMLDivElement>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [isSpaceHeld, setIsSpaceHeld] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null)
  const [isSelecting, setIsSelecting] = useState(false)
  const [isFileDragOver, setIsFileDragOver] = useState(false)

  const { setNodeRef, isOver } = useDroppable({
    id: "canvas-workspace",
  })

  // Report dimensions on mount and resize
  useEffect(() => {
    const updateDimensions = () => {
      if (workspaceRef.current && onDimensionsChange) {
        const { width, height } = workspaceRef.current.getBoundingClientRect()
        onDimensionsChange(width, height)
      }
    }

    updateDimensions()
    window.addEventListener("resize", updateDimensions)
    return () => window.removeEventListener("resize", updateDimensions)
  }, [onDimensionsChange])

  // Handle spacebar for pan mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (interactMode) return
      if (e.code === "Space" && !e.repeat) {
        // Don't trigger when typing in inputs
        if (isEditableEventTarget(e.target)) {
          return
        }
        e.preventDefault()
        setIsSpaceHeld(true)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpaceHeld(false)
        setIsPanning(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [interactMode])

  const artboards = useMemo(
    () => items.filter((item) => item.type === "artboard") as CanvasArtboardItemType[],
    [items]
  )
  const layoutContainers = useMemo(
    () =>
      items.filter(
        (item): item is CanvasArtboardItemType | CanvasSectionItemType =>
          item.type === "artboard" || item.type === "section"
      ),
    [items]
  )
  const freeformItems = useMemo(
    () => items.filter((item) => item.type !== "artboard" && item.type !== "section" && !item.parentId),
    [items]
  )
  const sortedArtboards = useMemo(() => [...artboards].sort((a, b) => a.zIndex - b.zIndex), [artboards])
  const sortedFreeformItems = useMemo(
    () => [...freeformItems].sort((a, b) => a.zIndex - b.zIndex),
    [freeformItems]
  )
  const selectableItems = useMemo(
    () => [...sortedArtboards, ...sortedFreeformItems],
    [sortedArtboards, sortedFreeformItems]
  )

  const getArtboardChildren = useCallback(
    (artboardId: string) => {
      return items
        .filter(
          (
            item
          ): item is
            | CanvasComponentItem
            | CanvasEmbedItemType
            | CanvasHtmlItemType
            | CanvasMediaItemType
            | CanvasMermaidItemType
            | CanvasExcalidrawItemType
            | CanvasMarkdownItemType
            | CanvasSectionItemType =>
            item.type !== "artboard" && item.parentId === artboardId
        )
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    },
    [items]
  )

  const renderLayoutChild = useCallback(
    (
      child:
        | CanvasComponentItem
        | CanvasEmbedItemType
        | CanvasHtmlItemType
        | CanvasMediaItemType
        | CanvasMermaidItemType
        | CanvasExcalidrawItemType
        | CanvasMarkdownItemType
        | CanvasSectionItemType,
      index: number,
      siblingCount: number
    ) => {
      const isSelected = selectedIds.includes(child.id)
      const showReorderControls = isSelected && !interactMode && Boolean(onMoveLayer)
      const childShellClassName = "relative"
      const parentLayoutContainer = layoutContainers.find((container) => container.id === child.parentId)
      const parentLayout = parentLayoutContainer?.layout
      const widthMode = child.layoutSizing?.width
      const heightMode = child.layoutSizing?.height
      const shouldStretchChild =
        widthMode === "fill" ||
        (!widthMode && (parentLayout?.align === "stretch" || parentLayout?.display === "grid"))
      const shouldFillChildHeight = heightMode === "fill"
      const childShellStyle = {
        width: shouldStretchChild ? "100%" : child.size.width,
        height: shouldFillChildHeight ? "100%" : child.size.height,
      }

      if (child.type === "section") {
        const nestedChildren = getArtboardChildren(child.id)
        return (
          <div
            key={child.id}
            className={childShellClassName}
            style={childShellStyle}
            data-artboard-child="true"
          >
            <LayoutSectionBox
              item={child}
              isSelected={isSelected}
              interactMode={interactMode}
              onSelect={(addToSelection) => onSelectItem(child.id, addToSelection)}
            >
              {nestedChildren.map((nestedChild, nestedIndex) =>
                renderLayoutChild(nestedChild, nestedIndex, nestedChildren.length)
              )}
            </LayoutSectionBox>
            {showReorderControls ? (
              <ArtboardChildReorderControls
                disableUp={index === 0}
                disableDown={index === siblingCount - 1}
                onMoveUp={() => onMoveLayer?.(child.id, "up")}
                onMoveDown={() => onMoveLayer?.(child.id, "down")}
              />
            ) : null}
          </div>
        )
      }

      if (child.type === "embed") {
        return (
          <div
            key={child.id}
            className={childShellClassName}
            style={childShellStyle}
            data-artboard-child="true"
          >
            <CanvasLayoutEmbedItem
              item={child}
              isSelected={isSelected}
              onSelect={(addToSelection) => onSelectItem(child.id, addToSelection)}
              onUpdate={(updates) => onUpdateItem(child.id, updates)}
              scale={transform.scale}
              interactMode={interactMode}
            />
            {showReorderControls ? (
              <ArtboardChildReorderControls
                disableUp={index === 0}
                disableDown={index === siblingCount - 1}
                onMoveUp={() => onMoveLayer?.(child.id, "up")}
                onMoveDown={() => onMoveLayer?.(child.id, "down")}
              />
            ) : null}
          </div>
        )
      }

      if (child.type === "media") {
        return (
          <div
            key={child.id}
            className={childShellClassName}
            style={childShellStyle}
            data-artboard-child="true"
          >
            <CanvasLayoutMediaItem
              item={child}
              isSelected={isSelected}
              onSelect={(addToSelection) => onSelectItem(child.id, addToSelection)}
              onUpdate={(updates) => onUpdateItem(child.id, updates)}
              scale={transform.scale}
              interactMode={interactMode}
            />
            {showReorderControls ? (
              <ArtboardChildReorderControls
                disableUp={index === 0}
                disableDown={index === siblingCount - 1}
                onMoveUp={() => onMoveLayer?.(child.id, "up")}
                onMoveDown={() => onMoveLayer?.(child.id, "down")}
              />
            ) : null}
          </div>
        )
      }

      if (child.type === "html") {
        return (
          <div
            key={child.id}
            className={childShellClassName}
            style={childShellStyle}
            data-artboard-child="true"
          >
            <CanvasLayoutHtmlItem
              item={child}
              isSelected={isSelected}
              onSelect={(addToSelection) => onSelectItem(child.id, addToSelection)}
              onUpdate={(updates) => onUpdateItem(child.id, updates)}
              scale={transform.scale}
              interactMode={interactMode}
              editMode={editMode}
              activeReactNodeSelection={activeReactNodeSelection}
              onReactNodeSelect={onReactNodeSelect}
              onReactCompileGenerationChange={onReactCompileGenerationChange}
              onReactNodeResize={onReactNodeResize}
              onReactNodeGroupResize={onReactNodeGroupResize}
              libraryDragActive={libraryDragActive}
              onLibraryDropInsert={onLibraryDropInsert}
              onLibraryDropWrap={onLibraryDropWrap}
            />
            {showReorderControls ? (
              <ArtboardChildReorderControls
                disableUp={index === 0}
                disableDown={index === siblingCount - 1}
                onMoveUp={() => onMoveLayer?.(child.id, "up")}
                onMoveDown={() => onMoveLayer?.(child.id, "down")}
              />
            ) : null}
          </div>
        )
      }

      if (child.type === "mermaid") {
        return (
          <div
            key={child.id}
            className={childShellClassName}
            style={childShellStyle}
            data-artboard-child="true"
          >
            <CanvasLayoutMermaidItem
              item={child}
              isSelected={isSelected}
              onSelect={(addToSelection) => onSelectItem(child.id, addToSelection)}
              onUpdate={(updates) => onUpdateItem(child.id, updates)}
              scale={transform.scale}
              interactMode={interactMode}
            />
            {showReorderControls ? (
              <ArtboardChildReorderControls
                disableUp={index === 0}
                disableDown={index === siblingCount - 1}
                onMoveUp={() => onMoveLayer?.(child.id, "up")}
                onMoveDown={() => onMoveLayer?.(child.id, "down")}
              />
            ) : null}
          </div>
        )
      }

      if (child.type === "excalidraw") {
        return (
          <div
            key={child.id}
            className={childShellClassName}
            style={childShellStyle}
            data-artboard-child="true"
          >
            <CanvasLayoutExcalidrawItem
              item={child}
              isSelected={isSelected}
              onSelect={(addToSelection) => onSelectItem(child.id, addToSelection)}
              onUpdate={(updates) => onUpdateItem(child.id, updates)}
              scale={transform.scale}
              interactMode={interactMode}
            />
            {showReorderControls ? (
              <ArtboardChildReorderControls
                disableUp={index === 0}
                disableDown={index === siblingCount - 1}
                onMoveUp={() => onMoveLayer?.(child.id, "up")}
                onMoveDown={() => onMoveLayer?.(child.id, "down")}
              />
            ) : null}
          </div>
        )
      }

      if (child.type === "markdown") {
        return (
          <div
            key={child.id}
            className={childShellClassName}
            style={childShellStyle}
            data-artboard-child="true"
          >
            <CanvasLayoutMarkdownItem
              item={child}
              isSelected={isSelected}
              onSelect={(addToSelection) => onSelectItem(child.id, addToSelection)}
              onUpdate={(updates) => onUpdateItem(child.id, updates)}
              scale={transform.scale}
              interactMode={interactMode}
              onWriteSuccess={onMarkdownWriteSuccess}
            />
            {showReorderControls ? (
              <ArtboardChildReorderControls
                disableUp={index === 0}
                disableDown={index === siblingCount - 1}
                onMoveUp={() => onMoveLayer?.(child.id, "up")}
                onMoveDown={() => onMoveLayer?.(child.id, "down")}
              />
            ) : null}
          </div>
        )
      }

      return (
        <div
          key={child.id}
          className={childShellClassName}
          style={childShellStyle}
          data-artboard-child="true"
        >
          <CanvasLayoutComponentItem
            item={child}
            isSelected={isSelected}
            onSelect={(addToSelection) => onSelectItem(child.id, addToSelection)}
            onUpdate={(updates) => onUpdateItem(child.id, updates)}
            scale={transform.scale}
            interactMode={interactMode}
            Renderer={Renderer}
            getComponentById={getComponentById}
          />
          {showReorderControls ? (
            <ArtboardChildReorderControls
              disableUp={index === 0}
              disableDown={index === siblingCount - 1}
              onMoveUp={() => onMoveLayer?.(child.id, "up")}
              onMoveDown={() => onMoveLayer?.(child.id, "down")}
            />
          ) : null}
        </div>
      )
    },
    [
      activeReactNodeSelection,
      getArtboardChildren,
      layoutContainers,
      selectedIds,
      interactMode,
      editMode,
      onSelectItem,
      onUpdateItem,
      onReactCompileGenerationChange,
      onReactNodeSelect,
      onReactNodeResize,
      onReactNodeGroupResize,
      onMoveLayer,
      onMarkdownWriteSuccess,
      Renderer,
      getComponentById,
      transform.scale,
      libraryDragActive,
      onLibraryDropInsert,
      onLibraryDropWrap,
    ]
  )

  useEffect(() => {
    if (!interactMode) return
    setIsPanning(false)
    setIsSelecting(false)
    setSelectionBox(null)
    setIsSpaceHeld(false)
  }, [interactMode])

  // Convert screen coordinates to canvas coordinates
  const screenToCanvas = useCallback(
    (screenX: number, screenY: number) => {
      if (!workspaceRef.current) return { x: 0, y: 0 }
      const rect = workspaceRef.current.getBoundingClientRect()
      return {
        x: (screenX - rect.left - transform.offset.x) / transform.scale,
        y: (screenY - rect.top - transform.offset.y) / transform.scale,
      }
    },
    [transform]
  )

  // Check if an item intersects with the selection box
  const itemIntersectsBox = useCallback(
    (item: CanvasItemType, box: SelectionBox) => {
      const boxLeft = Math.min(box.startX, box.endX)
      const boxRight = Math.max(box.startX, box.endX)
      const boxTop = Math.min(box.startY, box.endY)
      const boxBottom = Math.max(box.startY, box.endY)

      const itemRight = item.position.x + item.size.width
      const itemBottom = item.position.y + item.size.height

      return !(
        item.position.x > boxRight ||
        itemRight < boxLeft ||
        item.position.y > boxBottom ||
        itemBottom < boxTop
      )
    },
    []
  )

  // Handle panning with middle mouse button or spacebar + drag
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (interactMode) return
      // Middle mouse button or space + left click = pan
      if (e.button === 1 || (e.button === 0 && isSpaceHeld)) {
        e.preventDefault()
        setIsPanning(true)
        setPanStart({ x: e.clientX, y: e.clientY })
        return
      }

      // Left click on empty canvas = start selection box or clear selection
      if (e.button === 0 && e.target === e.currentTarget) {
        const canvasPos = screenToCanvas(e.clientX, e.clientY)
        setSelectionBox({
          startX: canvasPos.x,
          startY: canvasPos.y,
          endX: canvasPos.x,
          endY: canvasPos.y,
        })
        setIsSelecting(true)

        // If not holding shift, we'll clear selection when mouse up (if no drag)
      }
    },
    [interactMode, isSpaceHeld, screenToCanvas]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (interactMode) return
      if (isPanning) {
        const dx = e.clientX - panStart.x
        const dy = e.clientY - panStart.y
        onPan(dx, dy)
        setPanStart({ x: e.clientX, y: e.clientY })
        return
      }

      if (isSelecting && selectionBox) {
        const canvasPos = screenToCanvas(e.clientX, e.clientY)
        setSelectionBox((prev) =>
          prev
            ? {
                ...prev,
                endX: canvasPos.x,
                endY: canvasPos.y,
              }
            : null
        )
      }
    },
    [interactMode, isPanning, panStart, onPan, isSelecting, selectionBox, screenToCanvas]
  )

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (interactMode) return
      if (isPanning) {
        setIsPanning(false)
        return
      }

      if (isSelecting && selectionBox) {
        // Check if it was a drag or just a click
        const dragDistance = Math.sqrt(
          Math.pow(selectionBox.endX - selectionBox.startX, 2) +
            Math.pow(selectionBox.endY - selectionBox.startY, 2)
        )

        if (dragDistance > 5) {
          // It was a drag - select items in box
          const selectedItemIds = selectableItems
            .filter((item) => itemIntersectsBox(item, selectionBox))
            .map((item) => item.id)

          if (e.shiftKey) {
            // Add to existing selection
            const combined = [...new Set([...selectedIds, ...selectedItemIds])]
            onSelectItems(combined)
          } else {
            onSelectItems(selectedItemIds)
          }
        } else if (!e.shiftKey) {
          // It was just a click on empty space - clear selection
          onClearSelection()
        }

        setSelectionBox(null)
        setIsSelecting(false)
      }
    },
    [
      isPanning,
      isSelecting,
      selectionBox,
      selectableItems,
      selectedIds,
      itemIntersectsBox,
      onSelectItems,
      onClearSelection,
      interactMode,
    ]
  )

  const handleMouseLeave = useCallback(() => {
    if (interactMode) return
    setIsPanning(false)
    if (isSelecting) {
      setSelectionBox(null)
      setIsSelecting(false)
    }
  }, [interactMode, isSelecting])

  const handleNativeDragEnter = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (!onDropMediaFiles) return
      const hasFiles = Array.from(e.dataTransfer?.types || []).includes("Files")
      if (!hasFiles) return
      e.preventDefault()
      e.stopPropagation()
      setIsFileDragOver(true)
    },
    [onDropMediaFiles]
  )

  const handleNativeDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (!onDropMediaFiles) return
      const hasFiles = Array.from(e.dataTransfer?.types || []).includes("Files")
      if (!hasFiles) return
      e.preventDefault()
      e.stopPropagation()
      e.dataTransfer.dropEffect = "copy"
      if (!isFileDragOver) {
        setIsFileDragOver(true)
      }
    },
    [isFileDragOver, onDropMediaFiles]
  )

  const handleNativeDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    const nextTarget = e.relatedTarget as Node | null
    if (nextTarget && e.currentTarget.contains(nextTarget)) return
    setIsFileDragOver(false)
  }, [])

  const handleNativeDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (!onDropMediaFiles) return
      const files = Array.from(e.dataTransfer?.files || [])
      if (files.length === 0) return

      e.preventDefault()
      e.stopPropagation()
      setIsFileDragOver(false)

      const position = screenToCanvas(e.clientX, e.clientY)
      void onDropMediaFiles({ files, position })
    },
    [onDropMediaFiles, screenToCanvas]
  )

  // Determine cursor based on state
  const getCursor = () => {
    if (interactMode) return "cursor-auto"
    if (isPanning) return "cursor-grabbing"
    if (isSpaceHeld) return "cursor-grab"
    if (isSelecting) return "cursor-crosshair"
    return "cursor-default"
  }

  // Get selection box style (in screen coordinates)
  const getSelectionBoxStyle = () => {
    if (!selectionBox || !workspaceRef.current) return {}

    const left = Math.min(selectionBox.startX, selectionBox.endX) * transform.scale + transform.offset.x
    const top = Math.min(selectionBox.startY, selectionBox.endY) * transform.scale + transform.offset.y
    const width = Math.abs(selectionBox.endX - selectionBox.startX) * transform.scale
    const height = Math.abs(selectionBox.endY - selectionBox.startY) * transform.scale

    return {
      left,
      top,
      width,
      height,
    }
  }

  return (
    <div
      ref={(node) => {
        workspaceRef.current = node
        setNodeRef(node)
      }}
      className={`relative h-full flex-1 overflow-hidden ${getCursor()} ${
        isOver || isFileDragOver ? "bg-brand-50/30" : "bg-surface-50"
      }`}
      style={{
        backgroundImage: `
          radial-gradient(circle, var(--color-border-default) 1px, transparent 1px)
        `,
        backgroundSize: `${24 * transform.scale}px ${24 * transform.scale}px`,
        backgroundPosition: `${transform.offset.x}px ${transform.offset.y}px`,
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onWheel={interactMode ? undefined : onWheel}
      onDragEnter={handleNativeDragEnter}
      onDragOver={handleNativeDragOver}
      onDragLeave={handleNativeDragLeave}
      onDrop={handleNativeDrop}
    >
      {/* Transform container */}
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          transform: `translate(${transform.offset.x}px, ${transform.offset.y}px) scale(${transform.scale})`,
        }}
      >
        {/* Group bounding boxes */}
        {groups.map((group) => {
          const bounds = getGroupBounds(group.id)
          if (!bounds) return null

          return (
            <div
              key={group.id}
              className="pointer-events-none absolute rounded-lg border-2 border-dashed"
              style={{
                left: bounds.x - 8,
                top: bounds.y - 24,
                width: bounds.width + 16,
                height: bounds.height + 32,
                borderColor: group.color,
                backgroundColor: `${group.color}08`,
              }}
            >
              <div
                className="absolute -top-0.5 left-2 rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
                style={{ backgroundColor: group.color }}
              >
                {group.name}
              </div>
            </div>
          )
        })}

        {/* Canvas items */}
      {sortedArtboards.map((item) => {
        const children = getArtboardChildren(item.id)
        return (
          <CanvasArtboardItemComponent
            key={item.id}
            item={item}
            isSelected={selectedIds.includes(item.id)}
            isMultiSelected={selectedIds.length > 1 && selectedIds.includes(item.id)}
            onSelect={(addToSelection) => {
              onSelectItem(item.id, addToSelection)
              onBringToFront(item.id)
            }}
            onUpdate={(updates: Partial<Omit<CanvasArtboardItemType, "id">>) =>
              onUpdateItem(item.id, updates)
            }
            onRemove={() =>
              selectedIds.length > 1 && selectedIds.includes(item.id)
                ? onRemoveSelected()
                : onRemoveItem(item.id)
            }
            onDuplicate={() => onDuplicateItem(item.id)}
            onBringToFront={() => onBringToFront(item.id)}
            scale={transform.scale}
            interactMode={interactMode}
          >
            {children.map((child, index) => renderLayoutChild(child, index, children.length))}
          </CanvasArtboardItemComponent>
        )
      })}

      {sortedFreeformItems.map((item) => {
          const commonProps = {
            isSelected: selectedIds.includes(item.id),
            isMultiSelected: selectedIds.length > 1 && selectedIds.includes(item.id),
            groupColor: item.groupId
              ? groups.find((g) => g.id === item.groupId)?.color
              : undefined,
            onSelect: (addToSelection?: boolean) => {
              onSelectItem(item.id, addToSelection)
              onBringToFront(item.id)
            },
            onRemove: () =>
              selectedIds.length > 1 && selectedIds.includes(item.id)
                ? onRemoveSelected()
                : onRemoveItem(item.id),
            onDuplicate: () => onDuplicateItem(item.id),
            onBringToFront: () => onBringToFront(item.id),
            scale: transform.scale,
            interactMode,
                editMode,
          }

          if (item.type === "embed") {
            return (
              <CanvasEmbedItemComponent
                key={item.id}
                {...commonProps}
                item={item as CanvasEmbedItemType}
                onUpdate={(updates: Partial<Omit<CanvasEmbedItemType, "id">>) =>
                  onUpdateItem(item.id, updates)
                }
              />
            )
          }

          if (item.type === "html") {
            return (
              <CanvasHtmlItemComponent
                key={item.id}
                {...commonProps}
                item={item as CanvasHtmlItemType}
                onUpdate={(updates: Partial<Omit<CanvasHtmlItemType, "id">>) =>
                  onUpdateItem(item.id, updates)
                }
                activeReactNodeSelection={activeReactNodeSelection}
                onReactNodeSelect={onReactNodeSelect}
                onReactCompileGenerationChange={onReactCompileGenerationChange}
                onReactNodeResize={onReactNodeResize}
                onReactNodeGroupResize={onReactNodeGroupResize}
                libraryDragActive={libraryDragActive}
                onLibraryDropInsert={onLibraryDropInsert}
                onLibraryDropWrap={onLibraryDropWrap}
              />
            )
          }

          if (item.type === "media") {
            return (
              <CanvasMediaItemComponent
                key={item.id}
                {...commonProps}
                item={item as CanvasMediaItemType}
                onUpdate={(updates: Partial<Omit<CanvasMediaItemType, "id">>) =>
                  onUpdateItem(item.id, updates)
                }
              />
            )
          }

          if (item.type === "mermaid") {
            return (
              <CanvasMermaidItemComponent
                key={item.id}
                {...commonProps}
                item={item as CanvasMermaidItemType}
                onUpdate={(updates: Partial<Omit<CanvasMermaidItemType, "id">>) =>
                  onUpdateItem(item.id, updates)
                }
              />
            )
          }

          if (item.type === "excalidraw") {
            return (
              <CanvasExcalidrawItemComponent
                key={item.id}
                {...commonProps}
                item={item as CanvasExcalidrawItemType}
                onUpdate={(updates: Partial<Omit<CanvasExcalidrawItemType, "id">>) =>
                  onUpdateItem(item.id, updates)
                }
              />
            )
          }

          if (item.type === "markdown") {
            return (
              <CanvasMarkdownItemComponent
                key={item.id}
                {...commonProps}
                item={item as CanvasMarkdownItemType}
                onUpdate={(updates: Partial<Omit<CanvasMarkdownItemType, "id">>) =>
                  onUpdateItem(item.id, updates)
                }
                onWriteSuccess={onMarkdownWriteSuccess}
              />
            )
          }

          return (
            <CanvasItem
              key={item.id}
              {...commonProps}
              item={item as CanvasComponentItem}
              onUpdate={(updates: Partial<Omit<CanvasComponentItem, "id">>) =>
                onUpdateItem(item.id, updates)
              }
              Renderer={Renderer}
              getComponentById={getComponentById}
            />
          )
        })}
      </div>

      {/* Selection box */}
      {isSelecting && selectionBox && (
        <div
          className="pointer-events-none absolute rounded border-2 border-brand-500 bg-brand-100/30"
          style={getSelectionBoxStyle()}
        />
      )}

      {/* Empty state */}
      {items.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-xl border-2 border-dashed border-default bg-white/90 px-10 py-8 text-center shadow-sm backdrop-blur-sm">
            <p className="text-lg font-semibold text-foreground">
              Drag components from the sidebar
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Scroll to pan • ⌘+Scroll to zoom • Space+drag to pan
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Shift+click for multi-select • Drag to box-select
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Drop image/video/GIF, `.md`, `.mmd`, or `.excalidraw` files on canvas
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Paste screenshots with Cmd/Ctrl+V
            </p>
            <p className="mt-3 text-xs text-muted">
              Press{" "}
              <kbd className="rounded border border-default bg-surface-100 px-1.5 py-0.5 font-mono text-[10px]">
                ?
              </kbd>{" "}
              for all shortcuts
            </p>
          </div>
        </div>
      )}

      {/* Drop indicator */}
      {(isOver || isFileDragOver) && (
        <div className="pointer-events-none absolute inset-4 rounded-xl border-2 border-dashed border-brand-400 bg-brand-50/30" />
      )}

      {/* Coordinates display (bottom right) */}
      <div className="absolute bottom-3 right-3 flex items-center gap-2 rounded-md bg-white/90 px-2 py-1 text-[10px] font-mono text-muted shadow-sm backdrop-blur-sm">
        <span>x: {Math.round(-transform.offset.x / transform.scale)}</span>
        <span>y: {Math.round(-transform.offset.y / transform.scale)}</span>
        {selectedIds.length > 1 && (
          <>
            <span className="text-brand-600">•</span>
            <span className="text-brand-600">{selectedIds.length} selected</span>
          </>
        )}
      </div>
    </div>
  )
}

function ArtboardChildReorderControls({
  disableUp,
  disableDown,
  onMoveUp,
  onMoveDown,
}: {
  disableUp: boolean
  disableDown: boolean
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  return (
    <div className="absolute -right-2 top-2 z-20 flex flex-col gap-1">
      <button
        type="button"
        data-artboard-child-reorder="true"
        onMouseDown={(event) => {
          event.stopPropagation()
          event.preventDefault()
        }}
        onClick={(event) => {
          event.stopPropagation()
          onMoveUp()
        }}
        disabled={disableUp}
        className="flex h-6 w-6 items-center justify-center rounded-full border border-default bg-white text-muted-foreground shadow-sm hover:bg-surface-100 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Move child up"
        title="Move child up"
      >
        <ChevronUp className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        data-artboard-child-reorder="true"
        onMouseDown={(event) => {
          event.stopPropagation()
          event.preventDefault()
        }}
        onClick={(event) => {
          event.stopPropagation()
          onMoveDown()
        }}
        disabled={disableDown}
        className="flex h-6 w-6 items-center justify-center rounded-full border border-default bg-white text-muted-foreground shadow-sm hover:bg-surface-100 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Move child down"
        title="Move child down"
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function LayoutSectionBox({
  item,
  isSelected,
  interactMode,
  onSelect,
  children,
}: {
  item: CanvasSectionItemType
  isSelected: boolean
  interactMode: boolean
  onSelect: (addToSelection?: boolean) => void
  children: React.ReactNode
}) {
  const layout = item.layout
  const layoutClassName =
    layout.display === "flex"
      ? `flex ${layout.direction === "row" ? "flex-row" : "flex-col"} ${getAlignClass(layout.align)} ${getJustifyClass(layout.justify)}`
      : `grid ${getGridColsClass(layout.columns)} ${getAlignClass(layout.align)} ${getJustifyClass(layout.justify)}`

  return (
    <div
      className={`relative h-full w-full overflow-hidden rounded-xl bg-white ${
        isSelected ? "ring-2 ring-brand-500" : "border border-default"
      }`}
      style={{ background: item.background || "white" }}
      data-canvas-item-id={item.id}
      data-canvas-item-type={item.type}
      onClick={(event) => {
        if (interactMode) return
        event.stopPropagation()
        onSelect(event.shiftKey)
      }}
    >
      <div
        className={`h-full w-full ${layoutClassName}`}
        style={{ gap: layout.gap ?? 12, padding: layout.padding ?? 16 }}
      >
        {children}
      </div>
    </div>
  )
}
