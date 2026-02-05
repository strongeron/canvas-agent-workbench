import { DndContext, DragOverlay, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core"
import { useCallback, useEffect, useState, useMemo, useRef } from "react"

import { useCanvasShortcuts, CANVAS_SHORTCUTS } from "../../hooks/useCanvasShortcuts"
import { useCanvasState } from "../../hooks/useCanvasState"
import { useCanvasScenes } from "../../hooks/useCanvasScenes"
import { useCanvasTransform } from "../../hooks/useCanvasTransform"
import { useLocalStorage } from "../../hooks/useLocalStorage"
import type { GalleryEntry, ComponentVariant } from "../../core/types"
import type { DragData, CanvasScene } from "../../types/canvas"
import { CanvasHelpOverlay } from "./CanvasHelpOverlay"
import { CanvasArtboardPropsPanel, type ColorAuditPair, type LiveAuditPair } from "./CanvasArtboardPropsPanel"
import { CanvasEmbedPropsPanel } from "./CanvasEmbedPropsPanel"
import { CanvasLayersPanel } from "./CanvasLayersPanel"
import { CanvasPropsPanel } from "./CanvasPropsPanel"
import { CanvasScenesPanel } from "./CanvasScenesPanel"
import { CanvasSidebar } from "./CanvasSidebar"
import { CanvasThemePanel } from "./CanvasThemePanel"
import { CanvasToolbar } from "./CanvasToolbar"
import { CanvasWorkspace } from "./CanvasWorkspace"
import { useThemeRegistry } from "../../hooks/useThemeRegistry"
import type { ThemeOption, ThemeToken } from "../../types/theme"
import {
  apcaContrast,
  DEFAULT_CONTRAST_TARGET_LC,
  getApcaStatus,
  parseColor,
} from "../../utils/apca"

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

// Smart size defaults based on component's layoutSize from gallery config
const LAYOUT_SIZE_DEFAULTS: Record<string, { width: number; minHeight: number }> = {
  small: { width: 220, minHeight: 60 },    // badges, buttons, inputs
  medium: { width: 350, minHeight: 120 },  // cards, widgets
  large: { width: 500, minHeight: 200 },   // tables, lists
  full: { width: 600, minHeight: 250 },    // tabs, sidebars, full-width
}

const DEFAULT_THEMES: ThemeOption[] = [
  {
    id: "thicket",
    label: "Thicket",
    description: "Default gallery theme",
    vars: {},
    groupId: "thicket",
  },
  {
    id: "thicket-light",
    label: "Light UI",
    description: "Thicket preset",
    vars: {},
    groupId: "thicket",
  },
  {
    id: "thicket-dark",
    label: "Dark UI",
    description: "Thicket preset",
    vars: {},
    groupId: "thicket",
  },
]

const DEFAULT_THEME_TOKENS: ThemeToken[] = [
  { label: "Brand 600", cssVar: "--color-brand-600", category: "color", subcategory: "brand" },
  { label: "Brand 500", cssVar: "--color-brand-500", category: "color", subcategory: "brand" },
  { label: "Surface 50", cssVar: "--color-surface-50", category: "color", subcategory: "surface" },
  { label: "Surface 100", cssVar: "--color-surface-100", category: "color", subcategory: "surface" },
  { label: "Foreground", cssVar: "--color-foreground", category: "color", subcategory: "text" },
  { label: "Muted Foreground", cssVar: "--color-muted-foreground", category: "color", subcategory: "text" },
]

function buildColorAuditPairs(
  tokens: ThemeToken[],
  tokenValues: Record<string, string>
): ColorAuditPair[] {
  const colorTokens = tokens.filter((token) => token.category === "color" && token.cssVar)
  const textTokens = colorTokens.filter(
    (token) =>
      token.subcategory === "text" ||
      /text|foreground/i.test(token.label)
  )
  const surfaceTokens = colorTokens.filter(
    (token) =>
      token.subcategory === "surface" ||
      /surface|canvas/i.test(token.label)
  )

  const pairs: ColorAuditPair[] = []
  for (const text of textTokens) {
    for (const surface of surfaceTokens) {
      const textValue = text.cssVar ? tokenValues[text.cssVar] : undefined
      const surfaceValue = surface.cssVar ? tokenValues[surface.cssVar] : undefined
      const contrast =
        textValue && surfaceValue ? apcaContrast(textValue, surfaceValue) : null
      pairs.push({
        id: `${text.cssVar}-${surface.cssVar}`,
        textLabel: text.label,
        surfaceLabel: surface.label,
        textValue,
        surfaceValue,
        contrast,
        status: getApcaStatus(contrast, DEFAULT_CONTRAST_TARGET_LC),
      })
    }
  }

  return pairs.slice(0, 24)
}

function isTransparent(color: string | null | undefined) {
  if (!color || color === "transparent") return true
  const parsed = parseColor(color)
  if (!parsed) return false
  return parsed.a <= 0.01
}

function extractGradientColor(backgroundImage: string) {
  if (!backgroundImage || backgroundImage === "none") return null
  const matches = [
    backgroundImage.match(/#([0-9a-f]{3,8})/i)?.[0] ?? null,
    backgroundImage.match(/rgba?\([^)]+\)/i)?.[0] ?? null,
    backgroundImage.match(/hsla?\([^)]+\)/i)?.[0] ?? null,
  ]
  return matches.find(Boolean) || null
}

function resolveBackgroundColor(element: Element, root: HTMLElement, fallback: string) {
  let node: Element | null = element
  while (node && node !== root) {
    const styles = getComputedStyle(node)
    const bgImage = styles.backgroundImage
    const bg = styles.backgroundColor
    if (bgImage && bgImage !== "none") {
      const gradientColor = extractGradientColor(bgImage)
      return gradientColor || bg
    }
    if (!isTransparent(bg)) {
      return bg
    }
    node = node.parentElement
  }
  return isTransparent(fallback) ? "rgb(255, 255, 255)" : fallback
}

function buildLiveAuditPairs(
  root: HTMLElement,
  content: HTMLElement,
  targetLc: number
): LiveAuditPair[] {
  const baseBackground = getComputedStyle(root).backgroundColor
  const pairs = new Map<string, LiveAuditPair>()
  const elements = Array.from(content.querySelectorAll("*"))
  const limit = Math.min(elements.length, 300)

  for (let i = 0; i < limit; i += 1) {
    const element = elements[i]
    const style = getComputedStyle(element)
    if ((element as Element).closest("[data-artboard-handle='true']")) continue
    if ((element as Element).closest("[data-canvas-ignore='true']")) continue

    if (style.display === "none" || style.visibility === "hidden") continue
    if (Number(style.opacity) <= 0.05) continue

    if (element instanceof SVGElement) {
      const fill = style.fill === "currentColor" ? style.color : style.fill
      const stroke = style.stroke === "currentColor" ? style.color : style.stroke
      const foreground =
        fill && fill !== "none" && !isTransparent(fill) ? fill : stroke
      if (!foreground || foreground === "none" || isTransparent(foreground)) {
        continue
      }
      const backgroundColor = resolveBackgroundColor(element, root, baseBackground)
      const contrast = apcaContrast(foreground, backgroundColor)
      const key = `svg:${foreground}|${backgroundColor}`
      const label =
        element.getAttribute("aria-label") ||
        element.getAttribute("data-icon") ||
        "SVG Icon"
      const existing = pairs.get(key)
      if (existing) {
        existing.count += 1
        continue
      }
      pairs.set(key, {
        id: key,
        sample: label,
        textValue: foreground,
        surfaceValue: backgroundColor,
        contrast,
        status: getApcaStatus(contrast, targetLc),
        count: 1,
      })
      continue
    }

    if (!(element instanceof HTMLElement)) continue

    const textNodes = Array.from(element.childNodes).filter(
      (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()
    )
    if (textNodes.length === 0) continue

    const textSample = textNodes
      .map((node) => node.textContent?.trim() || "")
      .join(" ")
      .trim()
    if (!textSample) continue

    const textColor = style.color
    if (!textColor || isTransparent(textColor)) continue

    const backgroundColor = resolveBackgroundColor(element, root, baseBackground)
    const contrast = apcaContrast(textColor, backgroundColor)
    const key = `${textColor}|${backgroundColor}`
    const existing = pairs.get(key)
    if (existing) {
      existing.count += 1
      if (existing.sample.length < textSample.length) {
        existing.sample = textSample.slice(0, 60)
      }
      continue
    }

    pairs.set(key, {
      id: key,
      sample: textSample.slice(0, 60),
      textValue: textColor,
      surfaceValue: backgroundColor,
      contrast,
      status: getApcaStatus(contrast, targetLc),
      count: 1,
    })
  }

  return Array.from(pairs.values()).slice(0, 24)
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
  /** Optional storage key prefix (for multi-project setups) */
  storageKey?: string
  /** Optional theme storage key prefix (shared across canvases) */
  themeStorageKeyPrefix?: string
  /** Optional theme token list (full token set) */
  themeTokens?: ThemeToken[]
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
  themeTokens,
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
  const importQueueStorageKey = storageKey
    ? `${storageKey}-imports`
    : "gallery-import-queue"
  const [importQueue, setImportQueue] = useLocalStorage<PaperImportQueueItem[]>(
    importQueueStorageKey,
    []
  )
  const resolvedThemeTokens = themeTokens && themeTokens.length > 0 ? themeTokens : DEFAULT_THEME_TOKENS
  const {
    themes,
    activeThemeId,
    setActiveThemeId,
    tokenValues,
    getTokenValuesForTheme,
    addTheme,
    updateThemeVar,
  } =
    useThemeRegistry({
      storageKeyPrefix: themeStorageKeyPrefix ?? storageKey,
      tokens: resolvedThemeTokens,
      defaultThemes: DEFAULT_THEMES,
      rootRef: canvasRootRef,
    })

  // Get the first selected item (for props panel - shows single item when one is selected)
  const selectedItem = selectedIds.length === 1
    ? items.find((item) => item.id === selectedIds[0])
    : null
  const selectedComponentItem = selectedItem?.type === "component" ? selectedItem : null
  const selectedEmbedItem = selectedItem?.type === "embed" ? selectedItem : null
  const selectedArtboardItem = selectedItem?.type === "artboard" ? selectedItem : null
  const selectedComponent = selectedComponentItem ? getComponentById(selectedComponentItem.componentId) : null
  const selectedVariant = selectedComponent?.variants[selectedComponentItem?.variantIndex ?? 0]
  const artboardThemeId = selectedArtboardItem?.themeId || activeThemeId
  const [artboardTokenValues, setArtboardTokenValues] = useState<Record<string, string>>(tokenValues)
  const [liveAuditPairs, setLiveAuditPairs] = useState<LiveAuditPair[]>([])

  useEffect(() => {
    if (!selectedArtboardItem) {
      setArtboardTokenValues(tokenValues)
      return
    }
    setArtboardTokenValues(getTokenValuesForTheme(artboardThemeId))
  }, [selectedArtboardItem, artboardThemeId, getTokenValuesForTheme, tokenValues])

  const artboardAuditPairs = useMemo(
    () =>
      selectedArtboardItem
        ? buildColorAuditPairs(resolvedThemeTokens, artboardTokenValues)
        : [],
    [selectedArtboardItem, resolvedThemeTokens, artboardTokenValues]
  )

  useEffect(() => {
    if (!selectedArtboardItem || !canvasRootRef.current) {
      setLiveAuditPairs([])
      return
    }

    const root = canvasRootRef.current.querySelector<HTMLElement>(
      `[data-artboard-id="${selectedArtboardItem.id}"]`
    )
    const content = root?.querySelector<HTMLElement>("[data-artboard-content='true']")

    if (!root || !content) {
      setLiveAuditPairs([])
      return
    }

    const frame = requestAnimationFrame(() => {
      setLiveAuditPairs(buildLiveAuditPairs(root, content, DEFAULT_CONTRAST_TARGET_LC))
    })

    return () => cancelAnimationFrame(frame)
  }, [selectedArtboardItem, items, themePanelVisible])

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
        const queueItem = result.queueItem
        setImportQueue((prev) => {
          const next = [queueItem, ...prev.filter((item) => item.id !== queueItem.id)]
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
              activeThemeId={activeThemeId}
              themeId={selectedArtboardItem.themeId}
              colorAuditPairs={artboardAuditPairs}
              auditTargetLc={DEFAULT_CONTRAST_TARGET_LC}
              liveAuditPairs={liveAuditPairs}
              liveAuditTargetLc={DEFAULT_CONTRAST_TARGET_LC}
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
              onAddTheme={addTheme}
              onUpdateThemeVar={updateThemeVar}
              tokenValues={tokenValues}
              tokens={resolvedThemeTokens}
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
