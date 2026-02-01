import { DndContext, DragOverlay, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core"
import { useCallback, useState, useMemo } from "react"

import { useCanvasShortcuts, CANVAS_SHORTCUTS } from "../../hooks/useCanvasShortcuts"
import { useCanvasState } from "../../hooks/useCanvasState"
import { useCanvasScenes } from "../../hooks/useCanvasScenes"
import { useCanvasTransform } from "../../hooks/useCanvasTransform"
import type { GalleryEntry, ComponentVariant } from "../../core/types"
import type { DragData, CanvasScene } from "../../types/canvas"
import { CanvasHelpOverlay } from "./CanvasHelpOverlay"
import { CanvasEmbedPropsPanel } from "./CanvasEmbedPropsPanel"
import { CanvasPropsPanel } from "./CanvasPropsPanel"
import { CanvasScenesPanel } from "./CanvasScenesPanel"
import { CanvasSidebar } from "./CanvasSidebar"
import { CanvasToolbar } from "./CanvasToolbar"
import { CanvasWorkspace } from "./CanvasWorkspace"

/** Props for injected Renderer component */
interface RendererComponentProps {
  componentName: string
  importPath?: string
  variant: ComponentVariant
  propsOverride?: Record<string, unknown>
  onPropsChange?: (props: Record<string, unknown>) => void
}

// Smart size defaults based on component's layoutSize from gallery config
const LAYOUT_SIZE_DEFAULTS: Record<string, { width: number; minHeight: number }> = {
  small: { width: 220, minHeight: 60 },    // badges, buttons, inputs
  medium: { width: 350, minHeight: 120 },  // cards, widgets
  large: { width: 500, minHeight: 200 },   // tables, lists
  full: { width: 600, minHeight: 250 },    // tabs, sidebars, full-width
}

function getDefaultSizeForComponent(
  componentId: string,
  getComponentById: (id: string) => GalleryEntry | null
): { width: number; height: number } {
  const component = getComponentById(componentId)
  const layoutSize = component?.layoutSize || "medium"
  const defaults = LAYOUT_SIZE_DEFAULTS[layoutSize] || LAYOUT_SIZE_DEFAULTS.medium
  return { width: defaults.width, height: defaults.minHeight }
}

interface CanvasTabProps {
  /** Injected component renderer */
  Renderer: React.ComponentType<RendererComponentProps>
  /** Function to look up component entry by ID */
  getComponentById: (id: string) => GalleryEntry | null
  /** All gallery entries for the sidebar */
  entries: GalleryEntry[]
  /** Injected Button component for toolbar/scenes */
  Button: React.ComponentType<any>
  /** Injected Tooltip component for toolbar */
  Tooltip: React.ComponentType<any>
}

export function CanvasTab({
  Renderer,
  getComponentById,
  entries,
  Button,
  Tooltip,
}: CanvasTabProps) {
  const {
    items,
    groups,
    selectedIds,
    addItem,
    updateItem,
    removeItem,
    bringToFront,
    clearCanvas,
    selectItem,
    selectItems,
    selectAll,
    clearSelection,
    createGroup,
    ungroup,
    getGroupBounds,
    getItemGroup,
    removeSelected,
    duplicateSelected,
    duplicateItem,
  } = useCanvasState()

  const {
    scenes,
    saveScene,
    renameScene,
    deleteScene,
    duplicateScene,
    exportScene,
    importScene,
  } = useCanvasScenes()

  const {
    transform,
    zoomIn,
    zoomOut,
    resetZoom,
    pan,
    handleWheel,
    fitToView,
    setWorkspaceDimensions,
  } = useCanvasTransform()

  const [activeDragData, setActiveDragData] = useState<DragData | null>(null)
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [showHelp, setShowHelp] = useState(false)
  const [propsPanelVisible, setPropsPanelVisible] = useState(true)
  const [scenesPanelVisible, setScenesPanelVisible] = useState(false)
  const [interactMode, setInteractMode] = useState(false)
  const [workspaceSize, setWorkspaceSize] = useState({ width: 0, height: 0 })

  // Get the first selected item (for props panel - shows single item when one is selected)
  const selectedItem = selectedIds.length === 1
    ? items.find((item) => item.id === selectedIds[0])
    : null
  const selectedComponentItem = selectedItem?.type === "component" ? selectedItem : null
  const selectedEmbedItem = selectedItem?.type === "embed" ? selectedItem : null
  const selectedComponent = selectedComponentItem ? getComponentById(selectedComponentItem.componentId) : null
  const selectedVariant = selectedComponent?.variants[selectedComponentItem?.variantIndex ?? 0]

  // Get current props for selected item (customProps or default variant props)
  const selectedItemProps = selectedComponentItem?.customProps ?? selectedVariant?.props ?? {}

  // Check if selected items can be grouped (2+ ungrouped items selected)
  const canGroup = useMemo(() => {
    if (selectedIds.length < 2) return false
    // Check if any selected items are already in different groups
    const selectedItems = items.filter((item) => selectedIds.includes(item.id))
    const groupIds = new Set(selectedItems.map((item) => item.groupId).filter(Boolean))
    // Can group if no items are grouped, or all are in the same group
    return groupIds.size === 0
  }, [selectedIds, items])

  // Check if selected items can be ungrouped (all selected are in same group)
  const canUngroup = useMemo(() => {
    if (selectedIds.length === 0) return false
    const selectedItems = items.filter((item) => selectedIds.includes(item.id))
    const groupIds = new Set(selectedItems.map((item) => item.groupId).filter(Boolean))
    return groupIds.size === 1
  }, [selectedIds, items])

  // Handle prop changes for selected item - save to item's customProps
  const handlePropChange = useCallback(
    (propName: string, value: unknown) => {
      if (!selectedComponentItem || !selectedVariant?.props) return

      const currentProps = selectedComponentItem.customProps ?? selectedVariant.props
      const newProps = { ...currentProps, [propName]: value }

      updateItem(selectedComponentItem.id, { customProps: newProps })
    },
    [selectedComponentItem, selectedVariant, updateItem]
  )

  // Reset props to defaults
  const handleResetProps = useCallback(() => {
    if (!selectedComponentItem) return
    // Clear customProps to use default variant props
    updateItem(selectedComponentItem.id, { customProps: undefined })
  }, [selectedComponentItem, updateItem])

  // Handle variant change for selected item
  const handleVariantChange = useCallback(
    (variantIndex: number) => {
      if (!selectedComponentItem) return
      // Change variant and reset custom props
      updateItem(selectedComponentItem.id, {
        variantIndex,
        customProps: undefined,
      })
    },
    [selectedComponentItem, updateItem]
  )

  // Close props panel
  const handleClosePropsPanel = useCallback(() => {
    setPropsPanelVisible(false)
  }, [])

  const toggleSidebar = useCallback(() => setSidebarVisible((prev) => !prev), [])
  const toggleHelp = useCallback(() => setShowHelp((prev) => !prev), [])
  const toggleScenes = useCallback(() => setScenesPanelVisible((prev) => !prev), [])
  const toggleInteractMode = useCallback(() => setInteractMode((prev) => !prev), [])

  const handleDimensionsChange = useCallback(
    (width: number, height: number) => {
      setWorkspaceDimensions(width, height)
      setWorkspaceSize((prev) =>
        prev.width === width && prev.height === height ? prev : { width, height }
      )
    },
    [setWorkspaceDimensions]
  )

  const handleFitToView = useCallback(() => {
    fitToView(items.map((item) => ({ position: item.position, size: item.size })))
  }, [fitToView, items])

  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.length > 0) {
      removeSelected()
    }
  }, [selectedIds, removeSelected])

  const handleEscape = useCallback(() => {
    if (showHelp) {
      setShowHelp(false)
    } else if (scenesPanelVisible) {
      setScenesPanelVisible(false)
    } else {
      clearSelection()
    }
  }, [showHelp, scenesPanelVisible, clearSelection])

  // Group selected items
  const handleGroupSelected = useCallback(() => {
    if (canGroup) {
      createGroup(selectedIds)
    }
  }, [canGroup, selectedIds, createGroup])

  // Ungroup selected items
  const handleUngroupSelected = useCallback(() => {
    if (canUngroup) {
      const selectedItem = items.find((item) => selectedIds.includes(item.id))
      if (selectedItem?.groupId) {
        ungroup(selectedItem.groupId)
      }
    }
  }, [canUngroup, selectedIds, items, ungroup])

  // Handle duplicate
  const handleDuplicate = useCallback(() => {
    if (selectedIds.length > 0) {
      duplicateSelected()
    }
  }, [selectedIds, duplicateSelected])

  const handleAddEmbed = useCallback(
    (url: string) => {
      const embedWidth = 640
      const embedHeight = 360
      const centerX = (workspaceSize.width / 2 - transform.offset.x) / transform.scale
      const centerY = (workspaceSize.height / 2 - transform.offset.y) / transform.scale

      addItem({
        type: "embed",
        url,
        position: {
          x: Math.max(0, centerX - embedWidth / 2),
          y: Math.max(0, centerY - embedHeight / 2),
        },
        size: { width: embedWidth, height: embedHeight },
        rotation: 0,
      })

      setPropsPanelVisible(true)
    },
    [addItem, transform.offset.x, transform.offset.y, transform.scale, workspaceSize.height, workspaceSize.width]
  )

  // Scene operations
  const handleSaveScene = useCallback(
    (name: string) => {
      saveScene(name, items, groups)
    },
    [saveScene, items, groups]
  )

  const handleLoadScene = useCallback(
    (scene: CanvasScene) => {
      // Clear current canvas and load scene items
      clearCanvas()
      // Add items from scene with new IDs
      scene.items.forEach((item) => {
        if (item.type === "embed") {
          addItem({
            type: "embed",
            url: item.url,
            title: item.title,
            allow: item.allow,
            sandbox: item.sandbox,
            position: { ...item.position },
            size: { ...item.size },
            rotation: item.rotation,
          })
          return
        }

        addItem({
          type: "component",
          componentId: item.componentId,
          variantIndex: item.variantIndex,
          position: { ...item.position },
          size: { ...item.size },
          rotation: item.rotation,
          customProps: item.customProps ? { ...item.customProps } : undefined,
        })
      })
      // Note: Groups are not preserved when loading a scene currently
      // This could be enhanced to restore group relationships
      setScenesPanelVisible(false)
    },
    [clearCanvas, addItem]
  )

  // Keyboard shortcuts
  useCanvasShortcuts({
    onToggleSidebar: toggleSidebar,
    onZoomIn: zoomIn,
    onZoomOut: zoomOut,
    onResetZoom: resetZoom,
    onFitToView: handleFitToView,
    onDelete: handleDeleteSelected,
    onEscape: handleEscape,
    onToggleHelp: toggleHelp,
    onSelectAll: selectAll,
    onDuplicate: handleDuplicate,
    onGroup: handleGroupSelected,
    onUngroup: handleUngroupSelected,
    onToggleScenes: toggleScenes,
  })

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as DragData | undefined
    if (data) {
      setActiveDragData(data)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragData(null)

    const { active, over } = event
    if (!over || over.id !== "canvas-workspace") return

    const data = active.data.current as DragData | undefined
    if (!data) return

    // Get the component to determine good default size
    const component = getComponentById(data.componentId)
    if (!component) return

    // Calculate drop position relative to workspace
    // Use the delta from drag to position the item
    const dropX = (event.delta.x + 200) / transform.scale - transform.offset.x / transform.scale
    const dropY = (event.delta.y + 100) / transform.scale - transform.offset.y / transform.scale

    // Get smart default size based on component's layoutSize
    const defaultSize = getDefaultSizeForComponent(data.componentId, getComponentById)

    addItem({
      type: "component",
      componentId: data.componentId,
      variantIndex: data.variantIndex,
      position: { x: Math.max(0, dropX), y: Math.max(0, dropY) },
      size: defaultSize,
      rotation: 0,
    })

    // Open props panel for the newly added item
    setPropsPanelVisible(true)
  }

  // Get component info for drag overlay
  const dragOverlayComponent = activeDragData ? getComponentById(activeDragData.componentId) : null
  const dragOverlayVariant = dragOverlayComponent?.variants[activeDragData?.variantIndex ?? 0]

  // Show props panel for single selection
  const showPropsPanel = selectedItem && propsPanelVisible && !scenesPanelVisible

  return (
    <div className="relative flex h-full flex-col">
      {/* Floating toolbar */}
      <div className="absolute left-1/2 top-3 z-20 -translate-x-1/2">
        <CanvasToolbar
          scale={transform.scale}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onResetZoom={resetZoom}
          onFitToView={handleFitToView}
          onClearCanvas={clearCanvas}
          onToggleSidebar={toggleSidebar}
          onToggleHelp={toggleHelp}
          onToggleScenes={toggleScenes}
          onToggleInteractMode={toggleInteractMode}
          onGroupSelected={handleGroupSelected}
          onUngroupSelected={handleUngroupSelected}
          onDuplicateSelected={handleDuplicate}
          itemCount={items.length}
          selectedCount={selectedIds.length}
          canGroup={canGroup}
          canUngroup={canUngroup}
          interactMode={interactMode}
          sidebarVisible={sidebarVisible}
          scenesVisible={scenesPanelVisible}
          Button={Button}
          Tooltip={Tooltip}
        />
      </div>

      {/* Main content - full width */}
      <div className="flex flex-1 overflow-hidden">
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          {/* Collapsible sidebar */}
          <div
            className={`transition-all duration-200 ease-in-out ${
              sidebarVisible ? "w-72" : "w-0"
            }`}
          >
            <div
              className={`h-full w-72 transition-transform duration-200 ${
                sidebarVisible ? "translate-x-0" : "-translate-x-full"
              }`}
            >
              <CanvasSidebar entries={entries} onAddEmbed={handleAddEmbed} />
            </div>
          </div>

          <CanvasWorkspace
            items={items}
            groups={groups}
            transform={transform}
            interactMode={interactMode}
            Renderer={Renderer}
            getComponentById={getComponentById}
            selectedIds={selectedIds}
            onSelectItem={(id, addToSelection) => {
              selectItem(id, addToSelection)
              // Reopen props panel when selecting a new item
              if (!addToSelection) setPropsPanelVisible(true)
            }}
            onSelectItems={selectItems}
            onClearSelection={clearSelection}
            onUpdateItem={updateItem}
            onRemoveItem={removeItem}
            onDuplicateItem={duplicateItem}
            onBringToFront={bringToFront}
            onPan={pan}
            onWheel={handleWheel}
            onDimensionsChange={handleDimensionsChange}
            getGroupBounds={getGroupBounds}
          />

          {/* Right sidebar - Props Panel (single selection only) */}
          {showPropsPanel && selectedComponentItem && selectedComponent && selectedVariant && (
            <CanvasPropsPanel
              componentName={selectedComponent.name}
              variantName={selectedVariant.name}
              variantIndex={selectedComponentItem.variantIndex}
              component={selectedComponent}
              schema={selectedVariant.interactiveSchema || null}
              values={selectedItemProps}
              onChange={handlePropChange}
              onReset={handleResetProps}
              onClose={handleClosePropsPanel}
              onVariantChange={handleVariantChange}
            />
          )}

          {showPropsPanel && selectedEmbedItem && (
            <CanvasEmbedPropsPanel
              url={selectedEmbedItem.url}
              title={selectedEmbedItem.title}
              allow={selectedEmbedItem.allow}
              sandbox={selectedEmbedItem.sandbox}
              onChange={(updates) => updateItem(selectedEmbedItem.id, updates)}
              onClose={handleClosePropsPanel}
            />
          )}

          {/* Right sidebar - Scenes Panel */}
          {scenesPanelVisible && (
            <CanvasScenesPanel
              scenes={scenes}
              currentItemCount={items.length}
              onSave={handleSaveScene}
              onLoad={handleLoadScene}
              onRename={renameScene}
              onDelete={deleteScene}
              onDuplicate={duplicateScene}
              onExport={(id) => {
                const json = exportScene(id)
                if (json) {
                  navigator.clipboard.writeText(json)
                }
              }}
              onImport={importScene}
              onClose={() => setScenesPanelVisible(false)}
              Button={Button}
            />
          )}

          <DragOverlay>
            {activeDragData && dragOverlayComponent && dragOverlayVariant && (
              <div className="w-64 rounded-lg border border-brand-300 bg-white p-2 opacity-80 shadow-lg">
                <div className="mb-1 text-xs font-medium text-brand-700">
                  {dragOverlayComponent.name}
                </div>
                <div className="overflow-hidden rounded border border-default">
                  <Renderer
                    componentName={dragOverlayComponent.name}
                    importPath={dragOverlayComponent.importPath}
                    variant={dragOverlayVariant}
                    allowOverflow={false}
                    hideHeader
                    hideFooter
                  />
                </div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Help overlay */}
      {showHelp && <CanvasHelpOverlay shortcuts={CANVAS_SHORTCUTS} onClose={toggleHelp} />}
    </div>
  )
}
