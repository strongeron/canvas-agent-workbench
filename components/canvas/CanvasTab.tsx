import { DndContext, DragOverlay, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core"
import { useCallback, useState, useMemo, useEffect, useRef } from "react"

import { useCanvasShortcuts, CANVAS_SHORTCUTS } from "../../hooks/useCanvasShortcuts"
import { useCanvasState } from "../../hooks/useCanvasState"
import { useCanvasScenes } from "../../hooks/useCanvasScenes"
import { useCanvasTransform } from "../../hooks/useCanvasTransform"
import type { GalleryEntry, ComponentVariant } from "../../core/types"
import type { DragData, CanvasScene } from "../../types/canvas"
import { CanvasHelpOverlay } from "./CanvasHelpOverlay"
import { CanvasArtboardPropsPanel } from "./CanvasArtboardPropsPanel"
import { CanvasEmbedPropsPanel } from "./CanvasEmbedPropsPanel"
import { CanvasLayersPanel } from "./CanvasLayersPanel"
import { CanvasPropsPanel } from "./CanvasPropsPanel"
import { CanvasScenesPanel } from "./CanvasScenesPanel"
import { CanvasSidebar } from "./CanvasSidebar"
import { CanvasThemePanel, type CanvasThemeOption, type CanvasThemeToken } from "./CanvasThemePanel"
import { CanvasToolbar } from "./CanvasToolbar"
import { CanvasWorkspace } from "./CanvasWorkspace"
import { useLocalStorage } from "../../hooks/useLocalStorage"

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

const DEFAULT_THEMES: CanvasThemeOption[] = [
  {
    id: "thicket",
    label: "Thicket",
    description: "Default gallery theme",
    vars: {},
  },
]

const THEME_TOKENS: CanvasThemeToken[] = [
  { label: "Brand 600", cssVar: "--color-brand-600" },
  { label: "Brand 500", cssVar: "--color-brand-500" },
  { label: "Surface 50", cssVar: "--color-surface-50" },
  { label: "Surface 100", cssVar: "--color-surface-100" },
  { label: "Foreground", cssVar: "--color-foreground" },
  { label: "Muted Foreground", cssVar: "--color-muted-foreground" },
]

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
  /** Optional storage key prefix (for multi-project setups) */
  storageKey?: string
  /** Optional theme storage key prefix (shared across canvases) */
  themeStorageKeyPrefix?: string
  /** Optional project selector */
  projects?: Array<{ id: string; label: string }>
  activeProjectId?: string
  onSelectProject?: (id: string) => void
  onCreateProject?: () => void
  /** Optional handler to open dedicated color canvas view */
  onOpenColorCanvas?: () => void
  /** Optional Paper import handler */
  onImportFromPaper?: (context: PaperImportContext) => Promise<PaperImportResult | null>
}

export interface PaperImportContext {
  projectId?: string
  artboardId?: string | null
  kind?: "ui" | "page"
}

export interface PaperImportResult {
  componentId: string
  variantIndex?: number
  size?: { width: number; height: number }
  position?: { x: number; y: number }
  queueItem?: PaperImportQueueItem
}

export interface PaperImportQueueItem {
  id: string
  name: string
  componentId: string
  projectId?: string
  kind?: "ui" | "page"
  importedAt: string
  source?: {
    fileName?: string
    pageName?: string
    nodeId?: string
  }
}

export function CanvasTab({
  Renderer,
  getComponentById,
  entries,
  Button,
  Tooltip,
  storageKey,
  themeStorageKeyPrefix,
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProject,
  onOpenColorCanvas,
  onImportFromPaper,
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
  } = useCanvasState(storageKey ? `${storageKey}-state` : undefined)

  const {
    scenes,
    saveScene,
    renameScene,
    deleteScene,
    duplicateScene,
    exportScene,
    importScene,
  } = useCanvasScenes(storageKey ? `${storageKey}-scenes` : undefined)

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
  const [layersPanelVisible, setLayersPanelVisible] = useState(false)
  const [themePanelVisible, setThemePanelVisible] = useState(false)
  const [interactMode, setInteractMode] = useState(false)
  const [workspaceSize, setWorkspaceSize] = useState({ width: 0, height: 0 })
  const [isImportingPaper, setIsImportingPaper] = useState(false)
  const [importKind, setImportKind] = useState<"ui" | "page">("ui")
  const canvasRootRef = useRef<HTMLDivElement>(null)
  const themeStorageKey = themeStorageKeyPrefix
    ? `${themeStorageKeyPrefix}-theme`
    : storageKey
      ? `${storageKey}-theme`
      : "gallery-canvas-theme"
  const [activeThemeId, setActiveThemeId] = useLocalStorage<string>(themeStorageKey, "thicket")
  const importQueueStorageKey = storageKey
    ? `${storageKey}-imports`
    : "gallery-import-queue"
  const [importQueue, setImportQueue] = useLocalStorage<PaperImportQueueItem[]>(
    importQueueStorageKey,
    []
  )
  const themeListStorageKey = themeStorageKeyPrefix
    ? `${themeStorageKeyPrefix}-themes`
    : storageKey
      ? `${storageKey}-themes`
      : "gallery-canvas-themes"
  const [themes, setThemes] = useLocalStorage<CanvasThemeOption[]>(themeListStorageKey, DEFAULT_THEMES)
  const [tokenValues, setTokenValues] = useState<Record<string, string>>({})

  // Get the first selected item (for props panel - shows single item when one is selected)
  const selectedItem = selectedIds.length === 1
    ? items.find((item) => item.id === selectedIds[0])
    : null
  const selectedComponentItem = selectedItem?.type === "component" ? selectedItem : null
  const selectedEmbedItem = selectedItem?.type === "embed" ? selectedItem : null
  const selectedArtboardItem = selectedItem?.type === "artboard" ? selectedItem : null
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
  const toggleScenes = useCallback(() => {
    setScenesPanelVisible((prev) => {
      const next = !prev
      if (next) {
        setLayersPanelVisible(false)
        setThemePanelVisible(false)
      }
      return next
    })
  }, [])
  const toggleLayers = useCallback(() => {
    setLayersPanelVisible((prev) => {
      const next = !prev
      if (next) {
        setScenesPanelVisible(false)
        setThemePanelVisible(false)
      }
      return next
    })
  }, [])
  const toggleThemePanel = useCallback(() => {
    setThemePanelVisible((prev) => {
      const next = !prev
      if (next) {
        setScenesPanelVisible(false)
        setLayersPanelVisible(false)
      }
      return next
    })
  }, [])
  const toggleInteractMode = useCallback(() => setInteractMode((prev) => !prev), [])

  useEffect(() => {
    if (!themes || themes.length === 0) {
      setThemes(DEFAULT_THEMES)
    }
  }, [themes, setThemes])

  useEffect(() => {
    if (!themes || themes.length === 0) return
    if (!themes.some((theme) => theme.id === activeThemeId)) {
      setActiveThemeId(themes[0].id)
    }
  }, [themes, activeThemeId, setActiveThemeId])

  useEffect(() => {
    if (typeof document === "undefined") return
    const styleId = themeStorageKeyPrefix
      ? `${themeStorageKeyPrefix}-theme-overrides`
      : storageKey
        ? `${storageKey}-theme-overrides`
        : "canvas-theme-overrides"
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null
    if (!styleEl) {
      styleEl = document.createElement("style")
      styleEl.id = styleId
      document.head.appendChild(styleEl)
    }

    const cssText = themes
      .map((theme) => {
        const entries = Object.entries(theme.vars ?? {})
        if (entries.length === 0) return ""
        const body = entries
          .map(([cssVar, value]) => `  ${cssVar}: ${value};`)
          .join("\n")
        return `[data-theme="${theme.id}"] {\n${body}\n}`
      })
      .filter(Boolean)
      .join("\n\n")

    styleEl.textContent = cssText
  }, [themes, storageKey, themeStorageKeyPrefix])

  useEffect(() => {
    if (!canvasRootRef.current) return
    const styles = getComputedStyle(canvasRootRef.current)
    const values: Record<string, string> = {}
    for (const token of THEME_TOKENS) {
      values[token.cssVar] = styles.getPropertyValue(token.cssVar).trim()
    }
    setTokenValues(values)
  }, [activeThemeId, themes])

  const handleImportFromPaper = useCallback(async () => {
    if (!onImportFromPaper || isImportingPaper) return
    setIsImportingPaper(true)
    try {
      const result = await onImportFromPaper({
        projectId: activeProjectId,
        artboardId: selectedArtboardItem?.id ?? null,
        kind: importKind,
      })
      if (!result) return

      const componentId = result.componentId
      const variantIndex = result.variantIndex ?? 0
      const size =
        result.size ?? getDefaultSizeForComponent(componentId, getComponentById)
      const position = result.position ?? { x: 0, y: 0 }

      if (selectedArtboardItem) {
        const siblings = items.filter(
          (item) => item.parentId === selectedArtboardItem.id && item.type !== "artboard"
        )
        const maxOrder = siblings.reduce(
          (max, item) => Math.max(max, item.order ?? 0),
          -1
        )

        addItem({
          type: "component",
          componentId,
          variantIndex,
          position: { x: 0, y: 0 },
          size,
          rotation: 0,
          parentId: selectedArtboardItem.id,
          order: maxOrder + 1,
        })
      } else {
        addItem({
          type: "component",
          componentId,
          variantIndex,
          position,
          size,
          rotation: 0,
        })
      }

      setPropsPanelVisible(true)

      if (result.queueItem) {
        setImportQueue((prev) => {
          const next = [result.queueItem, ...prev.filter((item) => item.id !== result.queueItem?.id)]
          return next.slice(0, 20)
        })
      }
    } finally {
      setIsImportingPaper(false)
    }
  }, [
    activeProjectId,
    addItem,
    getComponentById,
    isImportingPaper,
    items,
    onImportFromPaper,
    selectedArtboardItem,
    setImportQueue,
  ])

  const handleAddImportedComponent = useCallback(
    (componentId: string, variantIndex = 0) => {
      const size = getDefaultSizeForComponent(componentId, getComponentById)

      if (selectedArtboardItem) {
        const siblings = items.filter(
          (item) => item.parentId === selectedArtboardItem.id && item.type !== "artboard"
        )
        const maxOrder = siblings.reduce(
          (max, item) => Math.max(max, item.order ?? 0),
          -1
        )

        addItem({
          type: "component",
          componentId,
          variantIndex,
          position: { x: 0, y: 0 },
          size,
          rotation: 0,
          parentId: selectedArtboardItem.id,
          order: maxOrder + 1,
        })
      } else {
        addItem({
          type: "component",
          componentId,
          variantIndex,
          position: { x: 0, y: 0 },
          size,
          rotation: 0,
        })
      }

      setPropsPanelVisible(true)
    },
    [addItem, getComponentById, items, selectedArtboardItem]
  )

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
    const topLevelItems = items.filter((item) => item.type === "artboard" || !item.parentId)
    fitToView(topLevelItems.map((item) => ({ position: item.position, size: item.size })))
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
    } else if (layersPanelVisible) {
      setLayersPanelVisible(false)
    } else {
      clearSelection()
    }
  }, [showHelp, scenesPanelVisible, layersPanelVisible, clearSelection])

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

  const handleMoveLayer = useCallback(
    (itemId: string, direction: "up" | "down") => {
      const target = items.find((item) => item.id === itemId)
      if (!target?.parentId) return

      const siblings = items
        .filter((item) => item.parentId === target.parentId && item.type !== "artboard")
        .map((item, index) => ({ ...item, order: item.order ?? index }))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

      const currentIndex = siblings.findIndex((item) => item.id === itemId)
      if (currentIndex === -1) return

      const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
      if (swapIndex < 0 || swapIndex >= siblings.length) return

      const current = siblings[currentIndex]
      const swap = siblings[swapIndex]

      updateItem(current.id, { order: swap.order })
      updateItem(swap.id, { order: current.order })
    },
    [items, updateItem]
  )

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

  const handleAddArtboard = useCallback(() => {
    const artboardWidth = 960
    const artboardHeight = 600
    const centerX = (workspaceSize.width / 2 - transform.offset.x) / transform.scale
    const centerY = (workspaceSize.height / 2 - transform.offset.y) / transform.scale
    const artboardCount = items.filter((item) => item.type === "artboard").length

    addItem({
      type: "artboard",
      name: `Artboard ${artboardCount + 1}`,
      position: {
        x: Math.max(0, centerX - artboardWidth / 2),
        y: Math.max(0, centerY - artboardHeight / 2),
      },
      size: { width: artboardWidth, height: artboardHeight },
      rotation: 0,
      background: "white",
      layout: {
        display: "flex",
        direction: "column",
        align: "start",
        justify: "start",
        gap: 16,
        padding: 24,
      },
    })
  }, [
    addItem,
    items,
    transform.offset.x,
    transform.offset.y,
    transform.scale,
    workspaceSize.height,
    workspaceSize.width,
  ])

  const handleOpenColorCanvas = useCallback(() => {
    if (onOpenColorCanvas) {
      onOpenColorCanvas()
      return
    }
    const existingArtboard = items.find(
      (item) => item.type === "artboard" && item.name === "Color Canvas"
    )

    if (existingArtboard) {
      selectItem(existingArtboard.id)
      bringToFront(existingArtboard.id)
      setPropsPanelVisible(true)
      return
    }

    const artboardWidth = 1080
    const artboardHeight = 720
    const centerX = (workspaceSize.width / 2 - transform.offset.x) / transform.scale
    const centerY = (workspaceSize.height / 2 - transform.offset.y) / transform.scale

    addItem({
      type: "artboard",
      name: "Color Canvas",
      position: {
        x: Math.max(0, centerX - artboardWidth / 2),
        y: Math.max(0, centerY - artboardHeight / 2),
      },
      size: { width: artboardWidth, height: artboardHeight },
      rotation: 0,
      background: "var(--color-surface-50)",
      layout: {
        display: "grid",
        columns: 4,
        gap: 16,
        padding: 24,
      },
    })

    setPropsPanelVisible(true)
  }, [
    addItem,
    bringToFront,
    items,
    onOpenColorCanvas,
    selectItem,
    transform.offset.x,
    transform.offset.y,
    transform.scale,
    workspaceSize.height,
    workspaceSize.width,
  ])

  const handleAddTheme = useCallback(
    (label: string) => {
      const normalized = label.trim()
      if (!normalized) return
      const baseId = normalized
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "")
      let nextId = baseId || `theme-${themes.length + 1}`
      let counter = 2
      while (themes.some((theme) => theme.id === nextId)) {
        nextId = `${baseId || "theme"}-${counter}`
        counter += 1
      }

      const activeTheme = themes.find((theme) => theme.id === activeThemeId)
      const newTheme: CanvasThemeOption = {
        id: nextId,
        label: normalized,
        description: "Custom theme",
        vars: { ...(activeTheme?.vars ?? {}) },
      }

      setThemes((prev) => [...prev, newTheme])
      setActiveThemeId(nextId)
    },
    [themes, activeThemeId, setThemes, setActiveThemeId]
  )

  const handleUpdateThemeVar = useCallback(
    (themeId: string, cssVar: string, value: string) => {
      setThemes((prev) =>
        prev.map((theme) => {
          if (theme.id !== themeId) return theme
          const nextVars = { ...(theme.vars ?? {}) }
          const trimmed = value.trim()
          if (!trimmed) {
            delete nextVars[cssVar]
          } else {
            nextVars[cssVar] = trimmed
          }
          return { ...theme, vars: nextVars }
        })
      )
    },
    [setThemes]
  )

  const requestEmbedStates = useCallback(async () => {
    if (typeof window === "undefined") return
    const requestId = `embed-state-${Date.now()}`
    window.dispatchEvent(
      new CustomEvent("canvas:request-embed-state", { detail: { requestId } })
    )
    await new Promise((resolve) => setTimeout(resolve, 250))
  }, [])

  const requestSingleEmbedState = useCallback((targetId: string) => {
    if (typeof window === "undefined") return
    const requestId = `embed-state-${Date.now()}`
    window.dispatchEvent(
      new CustomEvent("canvas:request-embed-state", { detail: { requestId, targetId } })
    )
  }, [])

  // Scene operations
  const handleSaveScene = useCallback(
    async (name: string) => {
      await requestEmbedStates()
      saveScene(name, items, groups)
    },
    [requestEmbedStates, saveScene, items, groups]
  )

  const handleLoadScene = useCallback(
    (scene: CanvasScene) => {
      // Clear current canvas and load scene items
      clearCanvas()
      const idMap = new Map<string, string>()

      const artboards = scene.items.filter((item) => item.type === "artboard")
      const otherItems = scene.items.filter((item) => item.type !== "artboard")

      artboards.forEach((item) => {
        const newId = addItem({
          type: "artboard",
          name: item.name,
          position: { ...item.position },
          size: { ...item.size },
          rotation: item.rotation,
          background: item.background,
          layout: { ...item.layout },
        })
        idMap.set(item.id, newId)
      })

      otherItems.forEach((item) => {
        const parentId = item.parentId ? idMap.get(item.parentId) : undefined

        if (item.type === "embed") {
          const newId = addItem({
            type: "embed",
            url: item.url,
            title: item.title,
            allow: item.allow,
            sandbox: item.sandbox,
            embedState: item.embedState,
            embedOrigin: item.embedOrigin,
            embedStateVersion: item.embedStateVersion,
            position: { ...item.position },
            size: { ...item.size },
            rotation: item.rotation,
            parentId,
            order: item.order,
          })
          idMap.set(item.id, newId)
          return
        }

        const newId = addItem({
          type: "component",
          componentId: item.componentId,
          variantIndex: item.variantIndex,
          position: { ...item.position },
          size: { ...item.size },
          rotation: item.rotation,
          customProps: item.customProps ? { ...item.customProps } : undefined,
          parentId,
          order: item.order,
        })
        idMap.set(item.id, newId)
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
    if (!over) return

    const data = active.data.current as DragData | undefined
    if (!data) return

    // Get the component to determine good default size
    const component = getComponentById(data.componentId)
    if (!component) return

    // Get smart default size based on component's layoutSize
    const defaultSize = getDefaultSizeForComponent(data.componentId, getComponentById)

    if (over.id === "canvas-workspace") {
      // Calculate drop position relative to workspace
      // Use the delta from drag to position the item
      const dropX = (event.delta.x + 200) / transform.scale - transform.offset.x / transform.scale
      const dropY = (event.delta.y + 100) / transform.scale - transform.offset.y / transform.scale

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
      return
    }

    if (typeof over.id === "string" && over.id.startsWith("artboard-")) {
      const artboardId = over.id.replace("artboard-", "")
      const siblings = items.filter(
        (item) => item.parentId === artboardId && item.type !== "artboard"
      )
      const maxOrder = siblings.reduce(
        (max, item) => Math.max(max, item.order ?? 0),
        -1
      )

      addItem({
        type: "component",
        componentId: data.componentId,
        variantIndex: data.variantIndex,
        position: { x: 0, y: 0 },
        size: defaultSize,
        rotation: 0,
        parentId: artboardId,
        order: maxOrder + 1,
      })

      setPropsPanelVisible(true)
    }
  }

  // Get component info for drag overlay
  const dragOverlayComponent = activeDragData ? getComponentById(activeDragData.componentId) : null
  const dragOverlayVariant = dragOverlayComponent?.variants[activeDragData?.variantIndex ?? 0]

  // Show props panel for single selection
  const showPropsPanel =
    selectedItem && propsPanelVisible && !scenesPanelVisible && !layersPanelVisible && !themePanelVisible

  return (
    <div
      ref={canvasRootRef}
      className="relative flex h-full flex-col"
      data-theme={activeThemeId}
      data-canvas-root="true"
    >
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
          onToggleLayers={toggleLayers}
          onToggleThemePanel={toggleThemePanel}
          onToggleInteractMode={toggleInteractMode}
          onAddArtboard={handleAddArtboard}
          onImportFromPaper={onImportFromPaper ? handleImportFromPaper : undefined}
          importKind={importKind}
          onImportKindChange={setImportKind}
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
          layersVisible={layersPanelVisible}
          themePanelVisible={themePanelVisible}
          importingPaper={isImportingPaper}
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
              <CanvasSidebar
                entries={entries}
                onAddEmbed={handleAddEmbed}
                importQueue={importQueue}
                onAddImportedComponent={handleAddImportedComponent}
                onClearImportQueue={() => setImportQueue([])}
                projects={projects}
                activeProjectId={activeProjectId}
                onSelectProject={onSelectProject}
                onCreateProject={onCreateProject}
              />
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
              embedOrigin={selectedEmbedItem.embedOrigin}
              embedStateVersion={selectedEmbedItem.embedStateVersion}
              hasEmbedState={selectedEmbedItem.embedState !== undefined}
              onRequestState={() => requestSingleEmbedState(selectedEmbedItem.id)}
              onChange={(updates) => updateItem(selectedEmbedItem.id, updates)}
              onClose={handleClosePropsPanel}
            />
          )}

          {showPropsPanel && selectedArtboardItem && (
            <CanvasArtboardPropsPanel
              name={selectedArtboardItem.name}
              background={selectedArtboardItem.background}
              layout={selectedArtboardItem.layout}
              size={selectedArtboardItem.size}
              themes={themes}
              themeId={selectedArtboardItem.themeId}
              onImportFromPaper={onImportFromPaper ? handleImportFromPaper : undefined}
              importKind={importKind}
              onImportKindChange={setImportKind}
              importingPaper={isImportingPaper}
              onChange={(updates) => updateItem(selectedArtboardItem.id, updates)}
              onClose={handleClosePropsPanel}
            />
          )}

          {layersPanelVisible && (
            <CanvasLayersPanel
              items={items}
              selectedIds={selectedIds}
              onSelectItem={(id, addToSelection) => {
                selectItem(id, addToSelection)
                if (!addToSelection) setPropsPanelVisible(true)
              }}
              onMoveLayer={handleMoveLayer}
              onClose={() => setLayersPanelVisible(false)}
              getComponentById={getComponentById}
            />
          )}

          {themePanelVisible && (
            <CanvasThemePanel
              themes={themes}
              activeThemeId={activeThemeId}
              onThemeChange={setActiveThemeId}
              onOpenColorCanvas={handleOpenColorCanvas}
              onAddTheme={handleAddTheme}
              onUpdateThemeVar={handleUpdateThemeVar}
              tokenValues={tokenValues}
              tokens={THEME_TOKENS}
              onClose={() => setThemePanelVisible(false)}
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
