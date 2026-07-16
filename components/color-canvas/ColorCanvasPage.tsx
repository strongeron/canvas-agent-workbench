import { Copy, Eye, FileText, Minus, Move, Palette, Plus, RefreshCw, RotateCcw, Save, Star, Trash2, Type, X } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { DesignSystemNodePreview } from "./DesignSystemNodePreview"
import { DESIGN_SYSTEM_ICON_LIBRARIES, getDesignSystemIconLibraryLabel } from "./iconLibraryRegistry"
import { CanvasFileActionDialog, CanvasFileDeleteDialog } from "../canvas/CanvasFileDialogs"
import { CanvasThemePanel } from "../canvas/CanvasThemePanel"
import { ColorPickerField } from "../color-picker"
import { useAgentNativeWorkspaceOperations, type AgentNativeWorkspaceOperationRecord } from "../../hooks/useAgentNativeWorkspaceOperations"
import { useCanvasFileBrowserState } from "../../hooks/useCanvasFileBrowserState"
import { useCanvasFiles } from "../../hooks/useCanvasFiles"
import { useAgentNativeWorkspaceSync } from "../../hooks/useAgentNativeWorkspaceSync"
import { useCanvasTransform } from "../../hooks/useCanvasTransform"
import { useThemeRegistry } from "../../hooks/useThemeRegistry"
import { useColorCanvasState } from "../../hooks/useColorCanvasState"
import { useLocalStorage } from "../../hooks/useLocalStorage"
import { DEFAULT_DESIGN_SYSTEM_SCALE_CONFIG, createDesignSystemTokenBundle, resolveFluidValuePx, type DesignSystemIconLibraryId, type DesignSystemScaleConfig, type IconScaleToken, type LayoutRecipe, type SpacingScaleToken, type TypographyScaleToken } from "../../projects/design-system-foundation/designSystemApi"
import type { ThemeToken } from "../../types/theme"
import type { ColorCanvasEdge, ColorCanvasFrameworkId, ColorCanvasNode, ColorCanvasNodePreview, ColorCanvasPreviewKind, ColorCanvasState } from "../../types/colorCanvas"
import type { CanvasDocumentSurface, ColorCanvasFileDocumentData, ColorCanvasFileViewState, ColorCanvasWorkspaceFileDocument } from "../../types/canvas"
import { buildColorAuditWorkspaceStateResource, COLOR_AUDIT_EXPORT_COLOR_MODE_OPTIONS, COLOR_AUDIT_EXPORT_FORMAT_OPTIONS, type ColorAuditExportColorMode, type ColorAuditExportEntryResource, type ColorAuditExportFormat, type ColorAuditWorkflowSummary, type ColorAuditNodeResource, type ColorAuditEdgeResource } from "../../utils/colorAuditWorkspaceAdapter"
import { applyColorAuditOperation, type ColorAuditOperation } from "../../utils/colorAuditOperations"
import { buildSystemCanvasWorkspaceStateResource, type SystemCanvasEdgeResource, type SystemCanvasNodeResource } from "../../utils/systemCanvasWorkspaceAdapter"
import { applySystemCanvasGraphOperation, isSystemCanvasViewMode, sanitizeSystemCanvasConfigPatch, type SystemCanvasOperation, type SystemCanvasViewMode } from "../../utils/systemCanvasOperations"
import { buildNodeCatalogWorkspaceStateResource, type NodeCatalogNodeSectionResource, type NodeCatalogWorkspaceSectionResource } from "../../utils/nodeCatalogWorkspaceAdapter"
import { APCA_TARGETS, DEFAULT_CONTRAST_TARGET_LC, DEFAULT_COLOR_MODEL, apcaContrast, formatLc, parseColor, getApcaStatus } from "../../utils/apca"

import { CANVAS_MODE_OPTIONS, CANVAS_VIEW_OPTIONS, COLOR_AUDIT_FOCUS_OPTIONS, COLOR_AUDIT_LANE_META, COLOR_AUDIT_LAYOUT_OPTIONS, COLOR_TEMPLATE_KITS, CanvasMode, CanvasSectionFrame, CanvasViewMode, ColorAuditFocusMode, ColorAuditLayoutMode, ColorAuditViewportAction, ColorCanvasFileActionModalState, ColorCanvasFileDeleteModalState, ColorCanvasPageProps, ColorNodePortId, ConnectMode, ContrastRule, DEFAULT_CONTRAST_RULES, DEFAULT_RELATIVE_SPEC, DEFAULT_TEMPLATE_SEEDS, DESIGN_SYSTEM_PRESETS, DisplayEdge, EdgeFilter, FOUNDATION_ROLE_BLUEPRINTS, FUNCTIONAL_TOKEN_PRESETS, FunctionalTokenPreset, NodeCatalogSection, RGBA, SEMANTIC_PRESETS, SURFACE_CANVAS_FILE_LIST_HEIGHT, SURFACE_CANVAS_FILE_ROW_HEIGHT, SYSTEM_SECTION_META, SYSTEM_SECTION_ORDER, SystemSectionId, SystemViewportAction, TEMPLATE_PREVIEW_BASE_COUNTS, TemplateKitId, TemplateSeedKind, TemplateSeedOklch, WorkspaceCatalogSection, assignNestedToken, buildColorAuditLayout, buildColorAuditManualCatalogSection, buildColorConnectionPath, buildSystemFlowLayout, buildTemplateCatalogSection, buildViewportSamples, copyTextToClipboard, deriveTemplateSeedOklch, formatFunctionalTokenLabel, formatOklchCssValue, formatTemplateSeedOklch, getCanvasModeLabel, getCanvasNodeGroup, getCatalogFrameMetrics, getCatalogPortIds, getColorAuditStructuredLaneId, getColorNodePortPosition, getDefaultNodeSize, getDisplayNodeLabelFromNode, getEdgePortIds, getFitWidthNodeSize, getFrameworkLabel, getNodeFamilyLabel, getNodeMinSize, getPortIdsForConnectMode, getPreviewNodeSize, getSystemSectionId, getTemplateKitPreview, inferColorAuditRoleLane, inferContrastIntent, isFunctionalTokenNode, isNodeVisibleInCanvasView, isRelationshipCanvasMode, matchesDesignSystemConfig, resolveLayoutColumns, slugifyTokenLabel, stripFrameworkPrefix, toCamelCaseTokenKey } from "./colorCanvasShared"
import { displayP3ToSrgb, getNextPosition, isOutOfGamut, nodeMatchesRole, normalizeRelativeChroma, oklchToDisplayP3Css, oklchToLinearSrgb, oklchToSrgb, parseDisplayP3, parseOklch, resolveRelativeOklch, rgbaToCss, rgbaToHex, srgbToOklch, wrapDegrees } from "./colorCanvasColorMath"
import { ColorNode } from "./ColorNode"
import { WorkspaceCatalogCard } from "./WorkspaceCatalogCard"

export * from "./colorCanvasColorMath"
export type { OklchColor } from "./colorCanvasShared"

export function ColorCanvasPage({
  tokens,
  projectId,
  themeStorageKeyPrefix,
  catalogOnly = false,
}: ColorCanvasPageProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const workspaceRef = useRef<HTMLDivElement>(null)
  const workspaceCanvasRef = useRef<HTMLDivElement>(null)
  const colorProbeRef = useRef<HTMLSpanElement>(null)
  const surfaceCanvasListRef = useRef<HTMLDivElement>(null)
  const [tokenQuery, setTokenQuery] = useState("")
  const [surfaceCanvasSearchQuery, setSurfaceCanvasSearchQuery] = useState("")
  const [surfaceCanvasListScrollTop, setSurfaceCanvasListScrollTop] = useState(0)
  const [connectMode, setConnectMode] = useState<ConnectMode>(null)
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null)
  const [connectDrag, setConnectDrag] = useState<{ active: boolean; x: number; y: number }>({
    active: false,
    x: 0,
    y: 0,
  })
  const [showDependencies, setShowDependencies] = useState(true)
  const [showFullLabels, setShowFullLabels] = useState(false)
  const [templateBrand, setTemplateBrand] = useState("")
  const [templateAccent, setTemplateAccent] = useState("")
  const [templateKitId, setTemplateKitId] = useLocalStorage<TemplateKitId>(
    themeStorageKeyPrefix
      ? `${themeStorageKeyPrefix}-color-canvas-template-kit`
      : "gallery-color-canvas-template-kit",
    "shadcn"
  )
  const [selectedColorAuditExportFormat, setSelectedColorAuditExportFormat] =
    useLocalStorage<ColorAuditExportFormat>(
      themeStorageKeyPrefix
        ? `${themeStorageKeyPrefix}-color-canvas-export-format`
        : "gallery-color-canvas-export-format",
      "css-vars"
    )
  const [selectedColorAuditExportColorMode, setSelectedColorAuditExportColorMode] =
    useLocalStorage<ColorAuditExportColorMode>(
      themeStorageKeyPrefix
        ? `${themeStorageKeyPrefix}-color-canvas-export-color-mode`
        : "gallery-color-canvas-export-color-mode",
      "oklch"
    )
  const [selectedAutoEdgeId, setSelectedAutoEdgeId] = useState<string | null>(null)
  const [newThemeName, setNewThemeName] = useState("")
  const [copiedColorAuditExportFormat, setCopiedColorAuditExportFormat] =
    useState<ColorAuditExportFormat | null>(null)
  const [showColorAuditExportPreview, setShowColorAuditExportPreview] = useState(false)
  const [showNodeCatalog, setShowNodeCatalog] = useState(false)

  const sessionsKey = themeStorageKeyPrefix
    ? `${themeStorageKeyPrefix}-color-canvas-sessions`
    : "gallery-color-canvas-sessions"
  const activeSessionKey = themeStorageKeyPrefix
    ? `${themeStorageKeyPrefix}-color-canvas-session`
    : "gallery-color-canvas-session"

  const [sessions, setSessions] = useLocalStorage<Record<
    string,
    { id: string; name: string; state: ColorCanvasState; updatedAt: string }
  >>(sessionsKey, {})
  const [activeSessionId, setActiveSessionId] = useLocalStorage<string>(activeSessionKey, "")
  const [contrastRules, setContrastRules] = useLocalStorage<ContrastRule[]>(
    themeStorageKeyPrefix
      ? `${themeStorageKeyPrefix}-color-canvas-contrast-rules`
      : "gallery-color-canvas-contrast-rules",
    DEFAULT_CONTRAST_RULES
  )
  const [autoContrastEnabled, setAutoContrastEnabled] = useLocalStorage<boolean>(
    themeStorageKeyPrefix
      ? `${themeStorageKeyPrefix}-color-canvas-contrast-auto`
      : "gallery-color-canvas-contrast-auto",
    true
  )
  const [designSystemConfig, setDesignSystemConfig] = useLocalStorage<DesignSystemScaleConfig>(
    themeStorageKeyPrefix
      ? `${themeStorageKeyPrefix}-design-system-scale`
      : "gallery-design-system-scale",
    DEFAULT_DESIGN_SYSTEM_SCALE_CONFIG
  )
  const [canvasMode, setCanvasMode] = useLocalStorage<CanvasMode>(
    themeStorageKeyPrefix
      ? `${themeStorageKeyPrefix}-color-canvas-mode`
      : "gallery-color-canvas-mode",
    "color-audit"
  )
  const [canvasViewMode, setCanvasViewMode] = useLocalStorage<CanvasViewMode>(
    themeStorageKeyPrefix
      ? `${themeStorageKeyPrefix}-color-canvas-view`
      : "gallery-color-canvas-view",
    "color"
  )
  const [showAdvancedAuditControls, setShowAdvancedAuditControls] = useLocalStorage<boolean>(
    themeStorageKeyPrefix
      ? `${themeStorageKeyPrefix}-color-canvas-audit-advanced`
      : "gallery-color-canvas-audit-advanced",
    false
  )
  const [colorAuditLayoutMode, setColorAuditLayoutMode] = useLocalStorage<ColorAuditLayoutMode>(
    themeStorageKeyPrefix
      ? `${themeStorageKeyPrefix}-color-canvas-audit-layout`
      : "gallery-color-canvas-audit-layout",
    "freeform"
  )
  const [viewNodePositions, setViewNodePositions] = useLocalStorage<
    Record<string, { x: number; y: number }>
  >(
    themeStorageKeyPrefix
      ? `${themeStorageKeyPrefix}-color-canvas-view-positions`
      : "gallery-color-canvas-view-positions",
    {}
  )
  const {
    transform: colorAuditTransform,
    zoomTo: zoomColorAuditTo,
    resetZoom: resetColorAuditZoom,
    handleWheel: handleColorAuditCanvasWheelInput,
    fitToView: fitColorAuditToView,
    centerOn: centerColorAuditOn,
    panTo: panColorAuditTo,
    setWorkspaceDimensions: setColorAuditWorkspaceDimensions,
  } = useCanvasTransform()
  const {
    transform: systemCanvasTransform,
    zoomTo: zoomSystemCanvasTo,
    resetZoom: resetSystemCanvasZoom,
    handleWheel: handleSystemCanvasWheelInput,
    fitToView: fitSystemCanvasToView,
    centerOn: centerSystemCanvasOn,
    panTo: panSystemCanvasTo,
    setWorkspaceDimensions: setSystemCanvasWorkspaceDimensions,
  } = useCanvasTransform()
  const [systemCanvasViewportSize, setSystemCanvasViewportSize] = useState({
    width: 0,
    height: 0,
  })
  const [pendingColorAuditViewportAction, setPendingColorAuditViewportAction] =
    useState<ColorAuditViewportAction>(null)
  const [pendingColorAuditLayoutMode, setPendingColorAuditLayoutMode] = useState<
    Exclude<ColorAuditLayoutMode, "freeform"> | null
  >(null)
  const [pendingSystemViewportAction, setPendingSystemViewportAction] =
    useState<SystemViewportAction>(null)
  const lastSystemAutoFitKeyRef = useRef<string | null>(null)

  const emptyState = useMemo<ColorCanvasState>(
    () => ({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      selectedEdgeId: null,
      edgeUndoStack: [],
    }),
    []
  )
  const [themePanelVisible, setThemePanelVisible] = useState(false)
  const [edgeFilter, setEdgeFilter] = useState<EdgeFilter>("all")
  const [panelMode, setPanelMode] = useState<"inspector" | "audit">("inspector")

  const colorTokens = useMemo(
    () => tokens.filter((token) => token.category === "color"),
    [tokens]
  )

  const {
    themes,
    activeThemeId,
    setActiveThemeId,
    setThemes,
    tokenValues,
    getTokenValuesForTheme,
    addTheme,
    updateThemeVar,
  } = useThemeRegistry({
      storageKeyPrefix: themeStorageKeyPrefix,
      tokens,
      defaultThemes: [
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
      ],
      rootRef,
    })

  const {
    nodes,
    edges,
    state,
    selectedNodeId,
    selectedEdgeId,
    addTokenNode,
    addSemanticNode,
    addComponentNode,
    addTypedEdge,
    addEdge,
    addNode,
    removeNode,
    removeEdge,
    undoRemoveEdge,
    canUndoEdgeRemoval,
    updateEdgeRule,
    selectNode,
    selectEdge,
    moveNode,
    updateNode,
    updateNodeLabel,
    updateNodeValue,
    updateNodeRole,
    clearSelection,
    applyStateOperation,
    replaceState,
  } = useColorCanvasState(
    themeStorageKeyPrefix
      ? `${themeStorageKeyPrefix}-color-canvas`
      : "gallery-color-canvas"
  )
  const {
    files: allCanvasFiles,
    isLoading: canvasFilesLoading,
    error: canvasFilesError,
    refreshFiles: refreshCanvasFiles,
    openCanvasFile,
    createCanvasFile,
    saveCanvasFile,
    updateCanvasFileMetadata,
    moveCanvasFile,
    duplicateCanvasFile,
    deleteCanvasFile,
  } = useCanvasFiles<ColorCanvasFileDocumentData, ColorCanvasFileViewState>(projectId)
  type ColorCanvasSurface = Extract<CanvasDocumentSurface, "color-audit" | "system-canvas">
  const colorSurface: ColorCanvasSurface =
    canvasMode === "color-audit" ? "color-audit" : "system-canvas"
  const surfaceCanvasFiles = useMemo(
    () => allCanvasFiles.filter((file) => file.surface === colorSurface),
    [allCanvasFiles, colorSurface]
  )
  const [activeSurfaceCanvasFiles, setActiveSurfaceCanvasFiles] = useState<
    Record<
      ColorCanvasSurface,
      {
        path: string
        document: ColorCanvasWorkspaceFileDocument
      } | null
    >
  >({
    "color-audit": null,
    "system-canvas": null,
  })
  const [lastSavedSurfaceCanvasFileSignatures, setLastSavedSurfaceCanvasFileSignatures] =
    useState<Record<ColorCanvasSurface, string | null>>({
      "color-audit": null,
      "system-canvas": null,
    })
  const [surfaceCanvasFileActionModal, setSurfaceCanvasFileActionModal] =
    useState<ColorCanvasFileActionModalState | null>(null)
  const [surfaceCanvasFileDeleteModal, setSurfaceCanvasFileDeleteModal] =
    useState<ColorCanvasFileDeleteModalState | null>(null)
  const [surfaceCanvasFileActionError, setSurfaceCanvasFileActionError] = useState<string | null>(
    null
  )
  const [surfaceCanvasFileDeleteError, setSurfaceCanvasFileDeleteError] = useState<string | null>(
    null
  )
  const [surfaceCanvasFileActionBusy, setSurfaceCanvasFileActionBusy] = useState(false)
  const [surfaceCanvasFileDeleteBusy, setSurfaceCanvasFileDeleteBusy] = useState(false)
  const activeSurfaceCanvasFile = activeSurfaceCanvasFiles[colorSurface]
  const lastSavedSurfaceCanvasFileSignature =
    lastSavedSurfaceCanvasFileSignatures[colorSurface]
  const colorCanvasFileBrowser = useCanvasFileBrowserState(
    themeStorageKeyPrefix || `gallery-${projectId || "color-canvas"}`,
    surfaceCanvasFiles,
    activeSurfaceCanvasFiles[colorSurface]?.path ?? null,
    colorSurface
  )
  const filteredSurfaceCanvasFiles = useMemo(() => {
    if (!surfaceCanvasSearchQuery.trim()) return colorCanvasFileBrowser.visibleFiles
    const query = surfaceCanvasSearchQuery.trim().toLowerCase()
    return colorCanvasFileBrowser.visibleFiles.filter((file) => {
      const folderPath = file.path.split("/").slice(0, -1).join("/")
      return (
        file.title.toLowerCase().includes(query) ||
        file.path.toLowerCase().includes(query) ||
        folderPath.toLowerCase().includes(query)
      )
    })
  }, [colorCanvasFileBrowser.visibleFiles, surfaceCanvasSearchQuery])
  const visibleSurfaceCanvasRange = useMemo(() => {
    const startIndex = Math.max(
      0,
      Math.floor(surfaceCanvasListScrollTop / SURFACE_CANVAS_FILE_ROW_HEIGHT) - 4
    )
    const viewportRows =
      Math.ceil(SURFACE_CANVAS_FILE_LIST_HEIGHT / SURFACE_CANVAS_FILE_ROW_HEIGHT) + 8
    const endIndex = Math.min(filteredSurfaceCanvasFiles.length, startIndex + viewportRows)
    return { startIndex, endIndex }
  }, [filteredSurfaceCanvasFiles.length, surfaceCanvasListScrollTop])
  const visibleSurfaceCanvasFiles = useMemo(
    () =>
      filteredSurfaceCanvasFiles.slice(
        visibleSurfaceCanvasRange.startIndex,
        visibleSurfaceCanvasRange.endIndex
      ),
    [
      filteredSurfaceCanvasFiles,
      visibleSurfaceCanvasRange.endIndex,
      visibleSurfaceCanvasRange.startIndex,
    ]
  )

  const filteredTokens = useMemo(() => {
    if (!tokenQuery.trim()) return colorTokens
    const lower = tokenQuery.trim().toLowerCase()
    return colorTokens.filter((token) => {
      const haystack = [token.label, token.cssVar, token.subcategory].join(" ").toLowerCase()
      return haystack.includes(lower)
    })
  }, [colorTokens, tokenQuery])

  const buildColorCanvasFilePayload = useCallback((): {
    document: ColorCanvasFileDocumentData
    view: ColorCanvasFileViewState
  } => {
    return {
      document: {
        state,
        canvasMode,
        canvasViewMode,
        colorAuditLayoutMode,
        templateKitId,
        autoContrastEnabled,
        contrastRules,
        designSystemConfig,
        viewNodePositions,
      },
      view: {
        colorAuditTransform,
        systemCanvasTransform,
      },
    }
  }, [
    autoContrastEnabled,
    canvasMode,
    canvasViewMode,
    colorAuditLayoutMode,
    colorAuditTransform,
    contrastRules,
    designSystemConfig,
    state,
    systemCanvasTransform,
    templateKitId,
    viewNodePositions,
  ])

  const currentColorCanvasFileSignature = useMemo(
    () => JSON.stringify(buildColorCanvasFilePayload()),
    [buildColorCanvasFilePayload]
  )
  const activeSurfaceCanvasFilePath = activeSurfaceCanvasFile?.path ?? null
  const activeSurfaceCanvasFileTitle = activeSurfaceCanvasFile?.document.meta.title ?? null
  const colorCanvasFileDirty =
    activeSurfaceCanvasFile !== null &&
    lastSavedSurfaceCanvasFileSignature !== currentColorCanvasFileSignature

  const applySurfaceCanvasFile = useCallback(
    (file: { path: string; document: ColorCanvasWorkspaceFileDocument }) => {
      const nextDocument = file.document.document
      replaceState(nextDocument.state)
      setCanvasMode(nextDocument.canvasMode)
      if (nextDocument.canvasViewMode) {
        setCanvasViewMode(nextDocument.canvasViewMode as CanvasViewMode)
      }
      if (nextDocument.colorAuditLayoutMode) {
        setColorAuditLayoutMode(nextDocument.colorAuditLayoutMode as ColorAuditLayoutMode)
      }
      if (nextDocument.templateKitId) {
        setTemplateKitId(nextDocument.templateKitId as TemplateKitId)
      }
      if (typeof nextDocument.autoContrastEnabled === "boolean") {
        setAutoContrastEnabled(nextDocument.autoContrastEnabled)
      }
      if (Array.isArray(nextDocument.contrastRules)) {
        setContrastRules(nextDocument.contrastRules as ContrastRule[])
      }
      if (nextDocument.designSystemConfig) {
        setDesignSystemConfig(nextDocument.designSystemConfig)
      }
      if (nextDocument.viewNodePositions) {
        setViewNodePositions(nextDocument.viewNodePositions)
      }
      if (file.document.view?.colorAuditTransform) {
        zoomColorAuditTo(file.document.view.colorAuditTransform.scale)
        panColorAuditTo(
          file.document.view.colorAuditTransform.offset.x,
          file.document.view.colorAuditTransform.offset.y
        )
      } else {
        resetColorAuditZoom()
      }
      if (file.document.view?.systemCanvasTransform) {
        zoomSystemCanvasTo(file.document.view.systemCanvasTransform.scale)
        panSystemCanvasTo(
          file.document.view.systemCanvasTransform.offset.x,
          file.document.view.systemCanvasTransform.offset.y
        )
      } else {
        resetSystemCanvasZoom()
      }
      const nextSurface: ColorCanvasSurface =
        file.document.surface === "system-canvas" ? "system-canvas" : "color-audit"
      setActiveSurfaceCanvasFiles((current) => ({
        ...current,
        [nextSurface]: file,
      }))
      setLastSavedSurfaceCanvasFileSignatures((current) => ({
        ...current,
        [nextSurface]: JSON.stringify({
          document: nextDocument,
          view: file.document.view ?? {},
        }),
      }))
    },
    [
      panColorAuditTo,
      panSystemCanvasTo,
      replaceState,
      resetColorAuditZoom,
      resetSystemCanvasZoom,
      setAutoContrastEnabled,
      setCanvasMode,
      setCanvasViewMode,
      setColorAuditLayoutMode,
      setContrastRules,
      setDesignSystemConfig,
      setTemplateKitId,
      setViewNodePositions,
      zoomColorAuditTo,
      zoomSystemCanvasTo,
    ]
  )

  const handleOpenSurfaceCanvasFile = useCallback(
    async (filePath: string) => {
      try {
        const file = await openCanvasFile(filePath)
        applySurfaceCanvasFile(file as { path: string; document: ColorCanvasWorkspaceFileDocument })
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to open canvas file."
        if (typeof window !== "undefined") {
          window.alert(message)
        }
      }
    },
    [applySurfaceCanvasFile, openCanvasFile]
  )

  const handleCreateSurfaceCanvasFile = useCallback(async () => {
    if (!projectId) return
    setSurfaceCanvasFileActionError(null)
    setSurfaceCanvasFileActionModal({
      mode: "create",
      targetPath: null,
      title: canvasMode === "color-audit" ? "Color Audit" : "System Canvas",
      folder: "",
    })
  }, [canvasMode, projectId])

  const handleSaveSurfaceCanvasFile = useCallback(async () => {
    if (!projectId) return
    const payload = buildColorCanvasFilePayload()
    try {
      if (!activeSurfaceCanvasFile) {
        setSurfaceCanvasFileActionError(null)
        setSurfaceCanvasFileActionModal({
          mode: "save-as",
          targetPath: null,
          title: canvasMode === "color-audit" ? "Color Audit" : "System Canvas",
          folder: "",
        })
        return
      }

      if (activeSurfaceCanvasFile.document.surface !== colorSurface) {
        throw new Error(
          `Open file surface mismatch. "${activeSurfaceCanvasFile.document.meta.title}" belongs to ${activeSurfaceCanvasFile.document.surface}, not ${colorSurface}.`
        )
      }

      const saved = await saveCanvasFile(activeSurfaceCanvasFile.path, {
        ...activeSurfaceCanvasFile.document,
        surface: colorSurface,
        document: payload.document,
        view: payload.view,
      })
      setActiveSurfaceCanvasFiles((current) => ({
        ...current,
        [colorSurface]: saved as { path: string; document: ColorCanvasWorkspaceFileDocument },
      }))
      setLastSavedSurfaceCanvasFileSignatures((current) => ({
        ...current,
        [colorSurface]: JSON.stringify(payload),
      }))
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save canvas file."
      if (typeof window !== "undefined") {
        window.alert(message)
      }
    }
  }, [
    activeSurfaceCanvasFile,
    buildColorCanvasFilePayload,
    canvasMode,
    colorSurface,
    projectId,
    saveCanvasFile,
  ])

  const handleToggleSurfaceCanvasFavorite = useCallback(
    async (filePath: string) => {
      const target = surfaceCanvasFiles.find((file) => file.path === filePath)
      if (!target) return
      try {
        const updated = await updateCanvasFileMetadata(filePath, {
          favorite: !target.favorite,
        })
        setActiveSurfaceCanvasFiles((current) => {
          const nextEntries = { ...current }
          for (const surfaceId of Object.keys(nextEntries) as ColorCanvasSurface[]) {
            if (nextEntries[surfaceId]?.path === filePath) {
              nextEntries[surfaceId] =
                updated as { path: string; document: ColorCanvasWorkspaceFileDocument }
            }
          }
          return nextEntries
        })
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to update canvas favorite."
        if (typeof window !== "undefined") {
          window.alert(message)
        }
      }
    },
    [surfaceCanvasFiles, updateCanvasFileMetadata]
  )

  const handleRenameSurfaceCanvasFile = useCallback(
    async (filePath: string) => {
      const target = surfaceCanvasFiles.find((file) => file.path === filePath)
      if (!target) return
      const currentFolder = filePath.split("/").slice(0, -1).join("/")
      setSurfaceCanvasFileActionError(null)
      setSurfaceCanvasFileActionModal({
        mode: "rename",
        targetPath: filePath,
        title: target.title,
        folder: currentFolder,
      })
    },
    [surfaceCanvasFiles]
  )

  const handleDuplicateSurfaceCanvasFile = useCallback(
    async (filePath: string) => {
      const target = surfaceCanvasFiles.find((file) => file.path === filePath)
      if (!target) return
      const currentFolder = filePath.split("/").slice(0, -1).join("/")
      setSurfaceCanvasFileActionError(null)
      setSurfaceCanvasFileActionModal({
        mode: "duplicate",
        targetPath: filePath,
        title: `${target.title} Copy`,
        folder: currentFolder,
      })
    },
    [surfaceCanvasFiles]
  )

  const handleDeleteSurfaceCanvasFile = useCallback(
    async (filePath: string) => {
      const target = surfaceCanvasFiles.find((file) => file.path === filePath)
      if (!target) return
      setSurfaceCanvasFileDeleteError(null)
      setSurfaceCanvasFileDeleteModal({
        path: filePath,
        title: target.title,
      })
    },
    [surfaceCanvasFiles]
  )

  const handleSubmitSurfaceCanvasFileActionModal = useCallback(async () => {
    if (!surfaceCanvasFileActionModal || !projectId) return
    const nextTitle =
      surfaceCanvasFileActionModal.title.trim() ||
      (canvasMode === "color-audit" ? "Color Audit" : "System Canvas")
    const nextFolder = surfaceCanvasFileActionModal.folder.trim()

    setSurfaceCanvasFileActionBusy(true)
    setSurfaceCanvasFileActionError(null)
    try {
      if (surfaceCanvasFileActionModal.mode === "create") {
        const payload = buildColorCanvasFilePayload()
        const file = await createCanvasFile({
          title: nextTitle,
          folder: nextFolder || undefined,
          surface: colorSurface,
          document: payload.document,
          view: payload.view,
        })
        setActiveSurfaceCanvasFiles((current) => ({
          ...current,
          [colorSurface]: file as { path: string; document: ColorCanvasWorkspaceFileDocument },
        }))
        setLastSavedSurfaceCanvasFileSignatures((current) => ({
          ...current,
          [colorSurface]: JSON.stringify(payload),
        }))
      } else if (surfaceCanvasFileActionModal.mode === "save-as") {
        const payload = buildColorCanvasFilePayload()
        const created = await createCanvasFile({
          title: nextTitle,
          folder: nextFolder || undefined,
          surface: colorSurface,
          document: payload.document,
          view: payload.view,
        })
        setActiveSurfaceCanvasFiles((current) => ({
          ...current,
          [colorSurface]: created as { path: string; document: ColorCanvasWorkspaceFileDocument },
        }))
        setLastSavedSurfaceCanvasFileSignatures((current) => ({
          ...current,
          [colorSurface]: JSON.stringify(payload),
        }))
      } else if (
        surfaceCanvasFileActionModal.mode === "rename" &&
        surfaceCanvasFileActionModal.targetPath
      ) {
        const target = surfaceCanvasFiles.find(
          (file) => file.path === surfaceCanvasFileActionModal.targetPath
        )
        if (!target) {
          throw new Error("Canvas file no longer exists.")
        }
        const currentFolder =
          surfaceCanvasFileActionModal.targetPath.split("/").slice(0, -1).join("/")
        if (target.title === nextTitle && currentFolder === nextFolder) {
          setSurfaceCanvasFileActionModal(null)
          return
        }
        const moved = await moveCanvasFile(surfaceCanvasFileActionModal.targetPath, {
          title: nextTitle,
          folder: nextFolder,
        })
        setActiveSurfaceCanvasFiles((current) => {
          const nextEntries = { ...current }
          for (const surfaceId of Object.keys(nextEntries) as ColorCanvasSurface[]) {
            if (nextEntries[surfaceId]?.path === surfaceCanvasFileActionModal.targetPath) {
              nextEntries[surfaceId] =
                moved as { path: string; document: ColorCanvasWorkspaceFileDocument }
            }
          }
          return nextEntries
        })
        colorCanvasFileBrowser.replaceTrackedPath(surfaceCanvasFileActionModal.targetPath, moved.path)
      } else if (
        surfaceCanvasFileActionModal.mode === "duplicate" &&
        surfaceCanvasFileActionModal.targetPath
      ) {
        const duplicated = await duplicateCanvasFile(surfaceCanvasFileActionModal.targetPath, {
          title: nextTitle,
          folder: nextFolder,
        })
        applySurfaceCanvasFile(
          duplicated as { path: string; document: ColorCanvasWorkspaceFileDocument }
        )
      }

      setSurfaceCanvasFileActionModal(null)
    } catch (error) {
      setSurfaceCanvasFileActionError(
        error instanceof Error ? error.message : "Failed to update canvas file."
      )
    } finally {
      setSurfaceCanvasFileActionBusy(false)
    }
  }, [
    applySurfaceCanvasFile,
    buildColorCanvasFilePayload,
    canvasMode,
    colorCanvasFileBrowser,
    colorSurface,
    createCanvasFile,
    duplicateCanvasFile,
    moveCanvasFile,
    projectId,
    surfaceCanvasFileActionModal,
    surfaceCanvasFiles,
  ])

  const handleConfirmSurfaceCanvasFileDelete = useCallback(async () => {
    if (!surfaceCanvasFileDeleteModal) return
    setSurfaceCanvasFileDeleteBusy(true)
    setSurfaceCanvasFileDeleteError(null)
    try {
      await deleteCanvasFile(surfaceCanvasFileDeleteModal.path)
      colorCanvasFileBrowser.removeTrackedPath(surfaceCanvasFileDeleteModal.path)
      setActiveSurfaceCanvasFiles((current) => {
        const nextEntries = { ...current }
        for (const surfaceId of Object.keys(nextEntries) as ColorCanvasSurface[]) {
          if (nextEntries[surfaceId]?.path === surfaceCanvasFileDeleteModal.path) {
            nextEntries[surfaceId] = null
          }
        }
        return nextEntries
      })
      setLastSavedSurfaceCanvasFileSignatures((current) => {
        const nextEntries = { ...current }
        for (const surfaceId of Object.keys(nextEntries) as ColorCanvasSurface[]) {
          if (activeSurfaceCanvasFiles[surfaceId]?.path === surfaceCanvasFileDeleteModal.path) {
            nextEntries[surfaceId] = null
          }
        }
        return nextEntries
      })
      setSurfaceCanvasFileDeleteModal(null)
    } catch (error) {
      setSurfaceCanvasFileDeleteError(
        error instanceof Error ? error.message : "Failed to delete canvas file."
      )
    } finally {
      setSurfaceCanvasFileDeleteBusy(false)
    }
  }, [
    activeSurfaceCanvasFiles,
    colorCanvasFileBrowser,
    deleteCanvasFile,
    surfaceCanvasFileDeleteModal,
  ])

  const handleCloseSurfaceCanvasFileActionModal = useCallback(() => {
    if (surfaceCanvasFileActionBusy) return
    setSurfaceCanvasFileActionModal(null)
    setSurfaceCanvasFileActionError(null)
  }, [surfaceCanvasFileActionBusy])

  const handleCloseSurfaceCanvasFileDeleteModal = useCallback(() => {
    if (surfaceCanvasFileDeleteBusy) return
    setSurfaceCanvasFileDeleteModal(null)
    setSurfaceCanvasFileDeleteError(null)
  }, [surfaceCanvasFileDeleteBusy])

  useEffect(() => {
    setActiveSurfaceCanvasFiles({
      "color-audit": null,
      "system-canvas": null,
    })
    setLastSavedSurfaceCanvasFileSignatures({
      "color-audit": null,
      "system-canvas": null,
    })
    setSurfaceCanvasFileActionModal(null)
    setSurfaceCanvasFileDeleteModal(null)
    setSurfaceCanvasFileActionError(null)
    setSurfaceCanvasFileDeleteError(null)
  }, [projectId])
  const groupedFilteredTokens = useMemo(() => {
    const groups = new Map<string, ThemeToken[]>()
    filteredTokens.forEach((token) => {
      const key = token.subcategory || "other"
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)?.push(token)
    })
    return Array.from(groups.entries()).map(([id, groupTokens]) => ({
      id,
      label: id.replace(/[-_]/g, " "),
      tokens: groupTokens,
    }))
  }, [filteredTokens])
  const selectedTemplateKit = useMemo(
    () => COLOR_TEMPLATE_KITS.find((kit) => kit.id === templateKitId) ?? COLOR_TEMPLATE_KITS[0],
    [templateKitId]
  )
  const selectedTemplatePreview = useMemo(
    () => getTemplateKitPreview(selectedTemplateKit, Boolean(templateAccent.trim())),
    [selectedTemplateKit, templateAccent]
  )
  const templateBrandSeed = useMemo(
    () => deriveTemplateSeedOklch(templateBrand, DEFAULT_TEMPLATE_SEEDS.brand),
    [templateBrand]
  )
  const templateAccentSeed = useMemo(
    () => deriveTemplateSeedOklch(templateAccent, DEFAULT_TEMPLATE_SEEDS.accent),
    [templateAccent]
  )

  useEffect(() => {
    const nodesToNormalize = nodes.filter((node) => {
      if (!isFunctionalTokenNode(node)) return false
      return stripFrameworkPrefix(node.label, node.framework) !== node.label
    })

    if (nodesToNormalize.length === 0) return

    nodesToNormalize.forEach((node) => {
      updateNode(node.id, {
        label: stripFrameworkPrefix(node.label, node.framework),
      })
    })
  }, [nodes, updateNode])

  const tokensByCssVar = useMemo(() => {
    return tokens.reduce<Record<string, ThemeToken>>((acc, token) => {
      acc[token.cssVar] = token
      return acc
    }, {})
  }, [tokens])

  const designSystem = useMemo(
    () => createDesignSystemTokenBundle(designSystemConfig),
    [designSystemConfig]
  )
  const activeFontWeightSans =
    designSystemConfig.fontWeightSans || DEFAULT_DESIGN_SYSTEM_SCALE_CONFIG.fontWeightSans
  const activeFontWeightDisplay =
    designSystemConfig.fontWeightDisplay || DEFAULT_DESIGN_SYSTEM_SCALE_CONFIG.fontWeightDisplay
  const activeIconLibraryId =
    designSystemConfig.iconLibrary || DEFAULT_DESIGN_SYSTEM_SCALE_CONFIG.iconLibrary
  const activeDesignSystemPresetId = useMemo(
    () =>
      DESIGN_SYSTEM_PRESETS.find((preset) =>
        matchesDesignSystemConfig(designSystemConfig, preset.config)
      )?.id ?? null,
    [designSystemConfig]
  )
  const activeAuditFocusMode = useMemo<ColorAuditFocusMode | null>(() => {
    if (
      connectMode === null &&
      edgeFilter === "all" &&
      showDependencies &&
      autoContrastEnabled &&
      !showFullLabels
    ) {
      return "review"
    }
    if (
      connectMode === "map" &&
      edgeFilter === "map" &&
      showDependencies &&
      !showFullLabels
    ) {
      return "build"
    }
    if (
      connectMode === "contrast" &&
      edgeFilter === "contrast" &&
      autoContrastEnabled &&
      !showFullLabels
    ) {
      return "contrast"
    }
    return null
  }, [autoContrastEnabled, connectMode, edgeFilter, showDependencies, showFullLabels])
  const effectiveCanvasViewMode = useMemo<CanvasViewMode>(() => {
    if (canvasMode === "color-audit") return "color"
    if (canvasViewMode === "color") return "system"
    return canvasViewMode
  }, [canvasMode, canvasViewMode])
  const systemCanvasViewOptions = useMemo(
    () => CANVAS_VIEW_OPTIONS.filter((option) => option.id !== "color"),
    []
  )
  const isRelationshipMode = isRelationshipCanvasMode(effectiveCanvasViewMode)
  const colorAuditTransformEnabled = canvasMode === "color-audit"
  const systemCanvasTransformEnabled = canvasMode === "system-canvas" && !isRelationshipMode
  const workspaceTransformEnabled = colorAuditTransformEnabled || systemCanvasTransformEnabled
  const activeCanvasTransform = colorAuditTransformEnabled
    ? colorAuditTransform
    : systemCanvasTransformEnabled
      ? systemCanvasTransform
      : null
  const viewportToCanvasPosition = useCallback((clientX: number, clientY: number) => {
    const workspace = workspaceRef.current
    if (!workspace) return { x: clientX, y: clientY }
    const rect = workspace.getBoundingClientRect()
    if (colorAuditTransformEnabled) {
      return {
        x: (clientX - rect.left - colorAuditTransform.offset.x) / colorAuditTransform.scale,
        y: (clientY - rect.top - colorAuditTransform.offset.y) / colorAuditTransform.scale,
      }
    }
    if (systemCanvasTransformEnabled) {
      return {
        x: (clientX - rect.left - systemCanvasTransform.offset.x) / systemCanvasTransform.scale,
        y: (clientY - rect.top - systemCanvasTransform.offset.y) / systemCanvasTransform.scale,
      }
    }
    return {
      x: clientX - rect.left + workspace.scrollLeft,
      y: clientY - rect.top + workspace.scrollTop,
    }
  }, [
    colorAuditTransform.offset.x,
    colorAuditTransform.offset.y,
    colorAuditTransform.scale,
    colorAuditTransformEnabled,
    systemCanvasTransform.offset.x,
    systemCanvasTransform.offset.y,
    systemCanvasTransform.scale,
    systemCanvasTransformEnabled,
  ])
  const getViewPositionKey = useCallback(
    (nodeId: string, viewMode = effectiveCanvasViewMode) =>
      `${activeSessionId || "default"}:${canvasMode}:${viewMode}:${nodeId}`,
    [activeSessionId, canvasMode, effectiveCanvasViewMode]
  )
  const getNodeSize = useCallback((node: ColorCanvasNode) => node.size ?? getDefaultNodeSize(node), [])
  const scrollWorkspaceTo = useCallback((left: number, top: number) => {
    const workspace = workspaceRef.current
    if (!workspace) return
    if (colorAuditTransformEnabled) {
      panColorAuditTo(
        32 - Math.max(0, left) * colorAuditTransform.scale,
        36 - Math.max(0, top) * colorAuditTransform.scale
      )
      return
    }
    if (systemCanvasTransformEnabled) {
      panSystemCanvasTo(
        32 - Math.max(0, left) * systemCanvasTransform.scale,
        36 - Math.max(0, top) * systemCanvasTransform.scale
      )
      return
    }
    workspace.scrollTo({
      left: Math.max(0, Math.round(left)),
      top: Math.max(0, Math.round(top)),
    })
  }, [
    colorAuditTransform.scale,
    colorAuditTransformEnabled,
    panColorAuditTo,
    panSystemCanvasTo,
    systemCanvasTransform.scale,
    systemCanvasTransformEnabled,
  ])

  const scrollWorkspaceToNode = useCallback(
    (node: ColorCanvasNode | null) => {
      if (!node) return
      const workspace = workspaceRef.current
      if (!workspace) return
      const size = getNodeSize(node)
      if (colorAuditTransformEnabled) {
        centerColorAuditOn(node.position.x + size.width / 2, node.position.y + size.height / 2)
        return
      }
      if (systemCanvasTransformEnabled) {
        centerSystemCanvasOn(node.position.x + size.width / 2, node.position.y + size.height / 2)
        return
      }
      scrollWorkspaceTo(node.position.x - 32, Math.max(0, node.position.y - (workspace.clientHeight - size.height) / 2))
    },
    [
      centerColorAuditOn,
      centerSystemCanvasOn,
      colorAuditTransformEnabled,
      getNodeSize,
      scrollWorkspaceTo,
      systemCanvasTransformEnabled,
    ]
  )

  useEffect(() => {
    const workspace = workspaceRef.current
    if (!workspace) return

    const updateDimensions = () => {
      const { width, height } = workspace.getBoundingClientRect()
      setSystemCanvasViewportSize({ width, height })
      setColorAuditWorkspaceDimensions(width, height)
      setSystemCanvasWorkspaceDimensions(width, height)
    }

    updateDimensions()

    const resizeObserver =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateDimensions) : null
    resizeObserver?.observe(workspace)
    window.addEventListener("resize", updateDimensions)

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener("resize", updateDimensions)
    }
  }, [setColorAuditWorkspaceDimensions, setSystemCanvasWorkspaceDimensions])

  const updateDesignSystemConfig = useCallback(
    (key: keyof DesignSystemScaleConfig, rawValue: string | number) => {
      setDesignSystemConfig((prev) => ({ ...prev, [key]: rawValue as never }))
    },
    [setDesignSystemConfig]
  )
  const applyDesignSystemPreset = useCallback(
    (preset: DesignSystemScaleConfig) => {
      setDesignSystemConfig(preset)
      lastSystemAutoFitKeyRef.current = null
      setPendingSystemViewportAction("fit-width")
    },
    [setDesignSystemConfig]
  )

  const getNextCustomCssVar = useCallback(
    (prefix: string) => {
      const base = `--color-${prefix}`
      if (!nodes.some((node) => node.cssVar === base)) return base
      let index = 2
      while (nodes.some((node) => node.cssVar === `${base}-${index}`)) {
        index += 1
      }
      return `${base}-${index}`
    },
    [nodes]
  )

  const getNextCssVarFrom = useCallback(
    (cssVar?: string) => {
      if (!cssVar) return undefined
      if (!nodes.some((node) => node.cssVar === cssVar)) return cssVar
      let index = 2
      let candidate = `${cssVar}-${index}`
      while (nodes.some((node) => node.cssVar === candidate)) {
        index += 1
        candidate = `${cssVar}-${index}`
      }
      return candidate
    },
    [nodes]
  )

  const supportsRelativeColor = useMemo(() => {
    if (typeof CSS === "undefined" || typeof CSS.supports !== "function") return false
    return CSS.supports("color", "oklch(from white l c h)")
  }, [])
  const supportsDisplayP3 = useMemo(() => {
    if (typeof CSS === "undefined" || typeof CSS.supports !== "function") return false
    return CSS.supports("color", "color(display-p3 1 1 1)")
  }, [])

  const resolveCssColor = useCallback((value: string): string | null => {
    if (!value) return null
    if (typeof window === "undefined") return null
    const trimmed = value.trim()
    if (
      typeof CSS !== "undefined" &&
      typeof CSS.supports === "function" &&
      !trimmed.startsWith("var(") &&
      !CSS.supports("color", trimmed)
    ) {
      return null
    }
    const probe = colorProbeRef.current
    if (!probe) return null
    probe.style.color = value
    const computed = getComputedStyle(probe).color
    return computed || null
  }, [])

  useEffect(() => {
    if (Object.keys(sessions).length === 0) {
      const id = `session-${Date.now()}`
      setSessions({
        [id]: {
          id,
          name: "Session 1",
          state: state ?? emptyState,
          updatedAt: new Date().toISOString(),
        },
      })
      setActiveSessionId(id)
      return
    }
    if (activeSessionId && sessions[activeSessionId]) return
    const [firstId] = Object.keys(sessions)
    if (firstId) {
      setActiveSessionId(firstId)
      replaceState(sessions[firstId].state)
    }
  }, [activeSessionId, emptyState, replaceState, sessions, setActiveSessionId, setSessions, state])

  const upsertNode = useCallback(
    (config: {
      type: ColorCanvasNode["type"]
      cssVar?: string
      label: string
      value?: string
      role?: ColorCanvasNode["role"]
      framework?: ColorCanvasNode["framework"]
      semanticKind?: ColorCanvasNode["semanticKind"]
      relative?: ColorCanvasNode["relative"]
      size?: ColorCanvasNode["size"]
      group?: ColorCanvasNode["group"]
      preview?: ColorCanvasNodePreview
      position?: { x: number; y: number }
    }) => {
      const existing = config.cssVar
        ? nodes.find((node) => node.cssVar === config.cssVar && node.type === config.type)
        : nodes.find((node) => node.label === config.label && node.type === config.type)
      if (existing) {
        updateNode(existing.id, {
          label: config.label,
          value: config.value ?? existing.value,
          cssVar: config.cssVar ?? existing.cssVar,
          role: config.role ?? existing.role,
          framework: config.framework ?? existing.framework,
          semanticKind: config.semanticKind ?? existing.semanticKind,
          relative: config.relative ?? existing.relative,
          size: config.size ?? existing.size,
          group: config.group ?? existing.group,
          preview: config.preview ?? existing.preview,
        })
        return existing.id
      }
      return addNode({
        type: config.type,
        label: config.label,
        cssVar: config.cssVar,
        value: config.value,
        role: config.role,
        framework: config.framework,
        semanticKind: config.semanticKind,
        relative: config.relative,
        size: config.size,
        group: config.group,
        preview: config.preview,
        position: config.position ?? getNextPosition(nodes),
      })
    },
    [addNode, nodes, updateNode]
  )

  const nodesById = useMemo(() => {
    return nodes.reduce<Record<string, ColorCanvasNode>>((acc, node) => {
      acc[node.id] = node
      return acc
    }, {})
  }, [nodes])

  const ensureEdge = useCallback(
    (
      sourceId: string,
      targetId: string,
      type: ColorCanvasEdge["type"],
      rule?: ColorCanvasEdge["rule"]
    ) => {
      const existingEdge = edges.find((edge) => {
        if (edge.type !== type) return false
        if (edge.sourceId === sourceId && edge.targetId === targetId) return true
        if (type === "contrast" && edge.sourceId === targetId && edge.targetId === sourceId) return true
        return false
      })
      if (existingEdge) {
        if (rule) {
          updateEdgeRule(existingEdge.id, rule)
        }
        return
      }
      addEdge({ sourceId, targetId, type, rule })
    },
    [addEdge, edges, updateEdgeRule]
  )

  const normalizeChromaValue = useCallback((value: number) => normalizeRelativeChroma(value), [])

  const buildRelativeExpression = useCallback(
    (baseExpression: string, node: ColorCanvasNode) => {
      if (node.type !== "relative") return null
      const spec = node.relative ?? {}
      const model = spec.model ?? DEFAULT_COLOR_MODEL
      if (model !== "oklch") return null

      const channel = (
        mode: string | undefined,
        value: number | undefined,
        keyword: string,
        formatter: (value: number) => string
      ) => {
        if (!mode || mode === "inherit") return keyword
        if (value === undefined || Number.isNaN(value)) return keyword
        const formatted = formatter(value)
        if (mode === "absolute") return formatted
        return `calc(${keyword} + ${formatted})`
      }

      const l = channel(spec.lMode, spec.lValue, "l", (val) => `${val}%`)
      const c = channel(spec.cMode, spec.cValue, "c", (val) => `${normalizeChromaValue(val)}`)
      const h = channel(spec.hMode, spec.hValue, "h", (val) => `${val}deg`)
      const a = channel(spec.alphaMode, spec.alphaValue, "alpha", (val) => `${val}%`)

      return `oklch(from ${baseExpression} ${l} ${c} ${h} / ${a})`
    },
    [normalizeChromaValue]
  )

  const getNodeColorExpression = useCallback(
    (nodeId: string, visited = new Set<string>()): string | null => {
      if (visited.has(nodeId)) return null
      visited.add(nodeId)

      const node = nodesById[nodeId]
      if (!node) return null

      if (node.type === "token") {
        if (node.value) return node.value
        if (node.cssVar) return `var(${node.cssVar})`
        return null
      }

      if (node.type === "semantic") {
        if (node.value) return node.value
        const mappingEdges = edges.filter((edge) => edge.type === "map" && edge.targetId === node.id)
        for (const mappingEdge of mappingEdges) {
          const resolved = getNodeColorExpression(mappingEdge.sourceId, new Set(visited))
          if (resolved) return resolved
        }
        return node.value ?? null
      }

      if (node.type === "relative") {
        if (node.value) {
          return node.value
        }
        const baseId = node.relative?.baseId
        const baseExpression = baseId
          ? getNodeColorExpression(baseId, visited)
          : null
        if (!baseExpression) return null
        return buildRelativeExpression(baseExpression, node)
      }

      return node.value ?? null
    },
    [buildRelativeExpression, edges, nodesById]
  )

  const resolveExpressionColor = useCallback(
    (expression: string): RGBA | null => {
      if (expression.startsWith("color(display-p3")) {
        const p3 = parseDisplayP3(expression)
        if (p3) return displayP3ToSrgb(p3)
      }
      const resolved = resolveCssColor(expression)
      if (resolved) return parseColor(resolved)
      const parsed = parseColor(expression)
      if (parsed) return parsed
      const oklch = parseOklch(expression)
      if (oklch) return oklchToSrgb(oklch)
      return null
    },
    [resolveCssColor]
  )

  const resolveNodeOklch = useCallback(
    (
      nodeId: string,
      visited = new Set<string>()
    ): { l: number; c: number; h: number; a: number } | null => {
      if (visited.has(nodeId)) return null
      visited.add(nodeId)
      const node = nodesById[nodeId]
      if (!node) return null

      const parseToOklch = (value: string) => {
        const parsed = parseOklch(value)
        if (parsed) return parsed
        if (value.startsWith("color(display-p3")) {
          const p3 = parseDisplayP3(value)
          if (p3) {
            const oklch = srgbToOklch(displayP3ToSrgb(p3))
            if (oklch) return { ...oklch, a: p3.a }
          }
        }
        const rgba = resolveExpressionColor(value)
        if (rgba) {
          const oklch = srgbToOklch(rgba)
          if (oklch) return { ...oklch, a: rgba.a }
        }
        return null
      }

      if (node.type === "token") {
        if (node.value) return parseToOklch(node.value)
        const themeValue = node.cssVar ? tokenValues[node.cssVar] : undefined
        if (themeValue) return parseToOklch(themeValue)
        if (node.cssVar) {
          const resolved = resolveCssColor(`var(${node.cssVar})`)
          if (!resolved) return null
          const rgba = parseColor(resolved)
          if (!rgba) return null
          const oklch = srgbToOklch(rgba)
          if (!oklch) return null
          return { ...oklch, a: rgba.a }
        }
        return null
      }

      if (node.type === "semantic") {
        if (node.value) return parseToOklch(node.value)
        const mappingEdges = edges.filter((edge) => edge.type === "map" && edge.targetId === node.id)
        for (const mappingEdge of mappingEdges) {
          const resolved = resolveNodeOklch(mappingEdge.sourceId, new Set(visited))
          if (resolved) return resolved
        }
        return null
      }

      if (node.type === "relative") {
        if (node.value) {
          const override = parseToOklch(node.value)
          if (override) return override
        }
        const baseId = node.relative?.baseId
        if (!baseId) return null
        const base = resolveNodeOklch(baseId, visited)
        if (!base) return null
        const spec = node.relative ?? {}
        return resolveRelativeOklch(base, spec)
      }

      return null
    },
    [edges, nodesById, resolveCssColor, resolveExpressionColor, tokenValues]
  )

  const resolveNodeRgba = useCallback(
    (nodeId: string, visited = new Set<string>()): RGBA | null => {
      if (visited.has(nodeId)) return null
      visited.add(nodeId)

      const node = nodesById[nodeId]
      if (!node) return null

      if (node.type === "token") {
        if (node.value) return resolveExpressionColor(node.value)
        const themeValue = node.cssVar ? tokenValues[node.cssVar] : undefined
        if (themeValue) return resolveExpressionColor(themeValue)
        if (node.cssVar) return resolveExpressionColor(`var(${node.cssVar})`)
        return null
      }

      if (node.type === "semantic") {
        if (node.value) return resolveExpressionColor(node.value)
        const mappingEdges = edges.filter((edge) => edge.type === "map" && edge.targetId === node.id)
        for (const mappingEdge of mappingEdges) {
          const resolved = resolveNodeRgba(mappingEdge.sourceId, new Set(visited))
          if (resolved) return resolved
        }
        return null
      }

      if (node.type === "relative") {
        if (node.value) {
          const override = resolveExpressionColor(node.value)
          if (override) return override
        }
        const oklch = resolveNodeOklch(node.id)
        if (!oklch) return null
        const rgb = oklchToSrgb(oklch)
        if (!rgb) return null
        return { ...rgb, a: oklch.a }
      }

      return null
    },
    [edges, nodesById, resolveExpressionColor, resolveNodeOklch, tokenValues]
  )

  const getNodeColor = useCallback(
    (nodeId: string): string | null => {
      const expression = getNodeColorExpression(nodeId)
      if (expression?.startsWith("color(display-p3")) {
        return expression
      }
      const oklch = resolveNodeOklch(nodeId)
      if (oklch) {
        const linearSrgb = oklchToLinearSrgb(oklch)
        if (supportsDisplayP3 && isOutOfGamut(linearSrgb)) {
          return oklchToDisplayP3Css(oklch)
        }
        const rgb = oklchToSrgb(oklch)
        if (rgb) return rgbaToCss({ ...rgb, a: oklch.a })
      }
      if (expression) {
        const resolved = resolveCssColor(expression)
        if (resolved) return resolved
      }
      const fallback = resolveNodeRgba(nodeId)
      if (fallback) return rgbaToCss(fallback)
      if (expression && parseColor(expression)) return expression
      return null
    },
    [getNodeColorExpression, resolveCssColor, resolveNodeOklch, resolveNodeRgba, supportsDisplayP3]
  )

  const getNodeIsP3 = useCallback(
    (nodeId: string) => {
      const expression = getNodeColorExpression(nodeId)
      if (expression?.startsWith("color(display-p3")) return true
      const oklch = resolveNodeOklch(nodeId)
      if (!oklch) return false
      return isOutOfGamut(oklchToLinearSrgb(oklch))
    },
    [getNodeColorExpression, resolveNodeOklch]
  )

  const getNodeLabel = useCallback(
    (nodeId: string) => getDisplayNodeLabelFromNode(nodesById[nodeId]) || nodeId,
    [nodesById]
  )

  const getEdgeContrastRaw = useCallback(
    (sourceId: string, targetId: string) => {
      const sourceRgba = resolveNodeRgba(sourceId)
      const targetRgba = resolveNodeRgba(targetId)
      if (!sourceRgba || !targetRgba) {
        const sourceFallback = getNodeColor(sourceId)
        const targetFallback = getNodeColor(targetId)
        if (!sourceFallback || !targetFallback) return null
        return apcaContrast(sourceFallback, targetFallback)
      }
      return apcaContrast(rgbaToCss(sourceRgba), rgbaToCss(targetRgba))
    },
    [getNodeColor, resolveNodeRgba]
  )

  const getEdgeContrast = useCallback(
    (edge: ColorCanvasEdge) => {
      if (edge.type !== "contrast") return null
      const source = nodesById[edge.sourceId]
      const target = nodesById[edge.targetId]
      if (!source || !target) return null

      let textNode = source
      let surfaceNode = target

      if (source.role === "surface" || target.role === "text") {
        textNode = target
        surfaceNode = source
      }

      return getEdgeContrastRaw(textNode.id, surfaceNode.id)
    },
    [getEdgeContrastRaw, nodesById]
  )

  const getEdgeContrastPair = useCallback(
    (edge: DisplayEdge) => ({
      forward: getEdgeContrastRaw(edge.sourceId, edge.targetId),
      reverse: getEdgeContrastRaw(edge.targetId, edge.sourceId),
    }),
    [getEdgeContrastRaw]
  )

  const getEdgeTarget = useCallback(
    (edge: ColorCanvasEdge) => edge.rule?.targetLc ?? DEFAULT_CONTRAST_TARGET_LC,
    []
  )

  const handleAddToken = (token: ThemeToken) => {
    const position = getNextPosition(nodes)
    addTokenNode(token.label, token.cssVar, position)
  }

  const handleAddSeedNode = useCallback(
    (kind: "brand" | "accent") => {
      const position = getNextPosition(nodes)
      const fallbackValue =
        kind === "brand"
          ? formatTemplateSeedOklch(templateBrandSeed)
          : formatTemplateSeedOklch(templateAccentSeed)
      const nodeId = addNode({
        type: "token",
        label: kind === "brand" ? "Brand Seed" : "Accent Seed",
        cssVar: kind === "brand" ? "--color-brand-500" : "--color-accent-500",
        value:
          (kind === "brand" ? templateBrand.trim() : templateAccent.trim()) || fallbackValue,
        position,
      })
      selectNode(nodeId)
    },
    [addNode, nodes, selectNode, templateAccent, templateAccentSeed, templateBrand, templateBrandSeed]
  )

  const handleAddCustomToken = () => {
    const position = getNextPosition(nodes)
    addNode({
      type: "token",
      label: "Custom Token",
      cssVar: getNextCustomCssVar("custom"),
      value: "",
      position,
    })
  }

  const handleAddRelativeToken = () => {
    const position = getNextPosition(nodes)
    addNode({
      type: "relative",
      label: "Relative Token",
      cssVar: getNextCustomCssVar("relative"),
      position,
      relative: {
        model: DEFAULT_COLOR_MODEL,
        lMode: "inherit",
        cMode: "inherit",
        hMode: "inherit",
        alphaMode: "inherit",
      },
    })
  }

  const handleAddCustomFunctionalAlias = () => {
    const position = getNextPosition(nodes)
    const nodeId = addNode({
      type: "semantic",
      label: "Functional Alias",
      cssVar: getNextCustomCssVar("alias"),
      semanticKind: "functional",
      position,
    })
    selectNode(nodeId)
  }

  const handleAddFunctionalToken = useCallback(
    (preset: FunctionalTokenPreset) => {
      const position = getNextPosition(nodes)
      const nodeId = addNode({
        type: "semantic",
        label: formatFunctionalTokenLabel(preset),
        cssVar: preset.cssVar,
        role: preset.role,
        framework: preset.framework,
        semanticKind: "functional",
        position,
      })
      selectNode(nodeId)
    },
    [addNode, nodes, selectNode]
  )

  const handleAddFunctionalFrameworkSet = useCallback(
    (framework: ColorCanvasFrameworkId) => {
      const startPosition = getNextPosition(nodes)
      FUNCTIONAL_TOKEN_PRESETS[framework].forEach((preset, index) => {
        const position = {
          x: startPosition.x + (index % 2) * 228,
          y: startPosition.y + Math.floor(index / 2) * 92,
        }
        addNode({
          type: "semantic",
          label: formatFunctionalTokenLabel(preset),
          cssVar: preset.cssVar,
          role: preset.role,
          framework: preset.framework,
          semanticKind: "functional",
          position,
        })
      })
    },
    [addNode, nodes]
  )

  const handleTemplateSeedSliderChange = useCallback(
    (
      kind: TemplateSeedKind,
      channel: keyof TemplateSeedOklch,
      rawValue: number
    ) => {
      const current =
        kind === "brand"
          ? deriveTemplateSeedOklch(templateBrand, DEFAULT_TEMPLATE_SEEDS.brand)
          : deriveTemplateSeedOklch(templateAccent, DEFAULT_TEMPLATE_SEEDS.accent)
      const nextSeed = {
        ...current,
        [channel]: channel === "h" ? wrapDegrees(rawValue) : rawValue,
      }
      const formatted = formatTemplateSeedOklch(nextSeed)
      if (kind === "brand") {
        setTemplateBrand(formatted)
        return
      }
      setTemplateAccent(formatted)
    },
    [templateAccent, templateBrand]
  )

  const resetColorAuditAfterTemplateGeneration = useCallback(() => {
    setShowAdvancedAuditControls(false)
    setConnectMode(null)
    setConnectSourceId(null)
    setConnectDrag({ active: false, x: 0, y: 0 })
    setSelectedAutoEdgeId(null)
    setPanelMode("inspector")
    setShowDependencies(true)
    setAutoContrastEnabled(false)
    setShowFullLabels(false)
    setEdgeFilter("map")
    setColorAuditLayoutMode("flow")
    setPendingColorAuditLayoutMode("flow")
    setPendingColorAuditViewportAction("bird-view")
  }, [
    setAutoContrastEnabled,
    setColorAuditLayoutMode,
    setPendingColorAuditLayoutMode,
    setShowAdvancedAuditControls,
  ])

  const handleGenerateTemplate = () => {
    const brandValue = templateBrand.trim() || formatTemplateSeedOklch(templateBrandSeed)
    const accentValue = templateAccent.trim()
    applyStateOperation((prev) =>
      applyColorAuditOperation(prev, {
        type: "generate-template",
        templateKitId,
        brandColor: brandValue,
        accentColor: accentValue || undefined,
      })
    )
    resetColorAuditAfterTemplateGeneration()
    if (!templateBrand.trim()) {
      setTemplateBrand(brandValue)
    }
  }

  const applyDesignSystemThemeVars = useCallback(() => {
    if (!activeThemeId) return
    setThemes((prev) =>
      prev.map((theme) =>
        theme.id === activeThemeId
          ? {
              ...theme,
              vars: {
                ...(theme.vars ?? {}),
                ...designSystem.cssVars,
              },
            }
          : theme
      )
    )
  }, [activeThemeId, designSystem.cssVars, setThemes])

  const handleGenerateDesignSystem = useCallback(() => {
    applyDesignSystemThemeVars()

    const maxBottom = nodes.reduce((currentMax, node) => {
      const size = getNodeSize(node)
      return Math.max(currentMax, node.position.y + size.height)
    }, 60)

    let index = 0
    const startY = maxBottom + 96
    const positionFor = () => {
      const col = index % 3
      const row = Math.floor(index / 3)
      index += 1
      return {
        x: 120 + col * 320,
        y: startY + row * 240,
      }
    }

    const semanticIds = FOUNDATION_ROLE_BLUEPRINTS.reduce<
      Partial<Record<NonNullable<ColorCanvasNode["role"]>, string>>
    >((acc, blueprint) => {
      const tokenMeta = tokensByCssVar[blueprint.cssVar]
      const tokenId = upsertNode({
        type: "token",
        cssVar: blueprint.cssVar,
        label: tokenMeta?.label || blueprint.label,
        position: positionFor(),
      })
      const semanticId = upsertNode({
        type: "semantic",
        label: blueprint.semanticLabel,
        role: blueprint.role,
        semanticKind: "role",
        group: "system-support",
        position: positionFor(),
      })
      ensureEdge(tokenId, semanticId, "map")
      acc[blueprint.role] = semanticId
      return acc
    }, {})

    const resolveThemeTokenValue = (cssVar: string, fallback?: string) =>
      tokenValues[cssVar] || fallback || `var(${cssVar})`

    const brandSeedId = upsertNode({
      type: "token",
      label: "Color / Brand Seed",
      value: resolveThemeTokenValue("--color-brand-500"),
      group: "system-support",
      position: positionFor(),
    })
    const brandDarkId = upsertNode({
      type: "relative",
      label: "Color Rule / Brand Darker",
      group: "system-support",
      position: positionFor(),
      relative: {
        model: DEFAULT_COLOR_MODEL,
        baseId: brandSeedId,
        lMode: "delta",
        lValue: -6,
        cMode: "delta",
        cValue: -3,
        hMode: "inherit",
        alphaMode: "inherit",
      },
    })
    const surfaceRuleId = upsertNode({
      type: "relative",
      label: "Color Rule / Surface",
      group: "system-support",
      position: positionFor(),
      relative: {
        model: DEFAULT_COLOR_MODEL,
        baseId: brandSeedId,
        lMode: "absolute",
        lValue: 98,
        cMode: "absolute",
        cValue: 2,
        hMode: "inherit",
        alphaMode: "inherit",
      },
    })
    const textRuleId = upsertNode({
      type: "relative",
      label: "Color Rule / Text",
      group: "system-support",
      position: positionFor(),
      relative: {
        model: DEFAULT_COLOR_MODEL,
        baseId: brandSeedId,
        lMode: "absolute",
        lValue: 20,
        cMode: "absolute",
        cValue: 0,
        hMode: "inherit",
        alphaMode: "inherit",
      },
    })
    const borderRuleId = upsertNode({
      type: "relative",
      label: "Color Rule / Border",
      group: "system-support",
      position: positionFor(),
      relative: {
        model: DEFAULT_COLOR_MODEL,
        baseId: brandSeedId,
        lMode: "absolute",
        lValue: 82,
        cMode: "absolute",
        cValue: 1,
        hMode: "inherit",
        alphaMode: "absolute",
        alphaValue: 60,
      },
    })
    const inverseSeedId = upsertNode({
      type: "token",
      label: "Color / Inverse",
      value: resolveThemeTokenValue("--color-inverse", "#ffffff"),
      group: "system-support",
      position: positionFor(),
    })

    if (semanticIds.accent) {
      ensureEdge(brandDarkId, semanticIds.accent, "map")
    }
    if (semanticIds.surface) {
      ensureEdge(surfaceRuleId, semanticIds.surface, "map")
    }
    if (semanticIds.text) {
      ensureEdge(textRuleId, semanticIds.text, "map")
    }
    if (semanticIds.border) {
      ensureEdge(borderRuleId, semanticIds.border, "map")
    }
    if (semanticIds.icon) {
      ensureEdge(textRuleId, semanticIds.icon, "map")
    }

    const baseType = designSystem.typography.find((step) => step.id === "base")
    const displayType = designSystem.typography.find((step) => step.id === "3xl")
    const iconMd = designSystem.icons.find((icon) => icon.id === "md")
    const activeIconLibraryLabel = getDesignSystemIconLibraryLabel(activeIconLibraryId)
    const recommendedStrokeRange =
      activeFontWeightSans <= 400
        ? "1.25-1.5px"
        : activeFontWeightSans <= 450
          ? "1.4-1.75px"
          : "1.6-2px"
    const responsiveViewports = buildViewportSamples(designSystem.config)
    const spacingByVar = designSystem.spacing.reduce<Record<string, SpacingScaleToken>>((acc, step) => {
      acc[step.cssVar] = step
      return acc
    }, {})
    const baseIconScale = designSystem.icons.find((icon) => icon.id === "md") ?? designSystem.icons[0]
    const displayIconScale = designSystem.icons.find((icon) => icon.id === "xl") ?? designSystem.icons.at(-1)

    const buildTypeScaleItems = (fontFamilyKey?: TypographyScaleToken["fontFamilyKey"]) =>
      designSystem.typography
        .filter((step) => !fontFamilyKey || step.fontFamilyKey === fontFamilyKey)
        .map((step) => ({
          label: step.label,
          cssVar: step.cssVar,
          secondaryVar: step.lineHeightVar,
          fontFamilyVar: step.fontFamilyVar,
          sampleText: step.sampleText,
          minPx: step.minPx,
          currentPx: resolveFluidValuePx(
            step.minPx,
            step.maxPx,
            designSystem.config.minViewportPx,
            designSystem.config.maxViewportPx,
            Math.round((designSystem.config.minViewportPx + designSystem.config.maxViewportPx) / 2)
          ),
          maxPx: step.maxPx,
        }))

    const buildTypeViewportSamples = (step?: TypographyScaleToken) =>
      step
        ? responsiveViewports.map((sample) => ({
            label: sample.label,
            viewportPx: sample.viewportPx,
            fontPx: resolveFluidValuePx(
              step.minPx,
              step.maxPx,
              designSystem.config.minViewportPx,
              designSystem.config.maxViewportPx,
              sample.viewportPx
            ),
            lineHeightPx: resolveFluidValuePx(
              step.lineHeightMinPx,
              step.lineHeightMaxPx,
              designSystem.config.minViewportPx,
              designSystem.config.maxViewportPx,
              sample.viewportPx
            ),
          }))
        : []

    const buildIconScaleItems = () =>
      designSystem.icons.map((icon, index) => ({
        label: icon.label,
        cssVar: icon.cssVar,
        iconKey: (["search", "action", "grid", "accent"] as const)[index] || "action",
        pairedLabel:
          designSystem.typography.find((step) => step.id === icon.pairedTypographyId)?.label ||
          icon.pairedTypographyId,
        minPx: icon.minPx,
        currentPx: resolveFluidValuePx(
          icon.minPx,
          icon.maxPx,
          designSystem.config.minViewportPx,
          designSystem.config.maxViewportPx,
          Math.round((designSystem.config.minViewportPx + designSystem.config.maxViewportPx) / 2)
        ),
        maxPx: icon.maxPx,
      }))

    const buildIconViewportSamples = (icon?: IconScaleToken) =>
      icon
        ? responsiveViewports.map((sample) => ({
            label: sample.label,
            viewportPx: sample.viewportPx,
            iconPx: resolveFluidValuePx(
              icon.minPx,
              icon.maxPx,
              designSystem.config.minViewportPx,
              designSystem.config.maxViewportPx,
              sample.viewportPx
            ),
          }))
        : []

    const buildLayoutViewportSamples = (
      recipe: LayoutRecipe,
      typographyStep: TypographyScaleToken | undefined,
      iconStep: IconScaleToken | undefined
    ) => {
      const gapToken = spacingByVar[recipe.gapVar]
      const paddingToken = spacingByVar[recipe.paddingVar]

      return responsiveViewports.map((sample) => ({
        label: sample.label,
        viewportPx: sample.viewportPx,
        fontPx: typographyStep
          ? resolveFluidValuePx(
              typographyStep.minPx,
              typographyStep.maxPx,
              designSystem.config.minViewportPx,
              designSystem.config.maxViewportPx,
              sample.viewportPx
            )
          : undefined,
        lineHeightPx: typographyStep
          ? resolveFluidValuePx(
              typographyStep.lineHeightMinPx,
              typographyStep.lineHeightMaxPx,
              designSystem.config.minViewportPx,
              designSystem.config.maxViewportPx,
              sample.viewportPx
            )
          : undefined,
        iconPx: iconStep
          ? resolveFluidValuePx(
              iconStep.minPx,
              iconStep.maxPx,
              designSystem.config.minViewportPx,
              designSystem.config.maxViewportPx,
              sample.viewportPx
            )
          : undefined,
        gapPx: gapToken
          ? resolveFluidValuePx(
              gapToken.minPx,
              gapToken.maxPx,
              designSystem.config.minViewportPx,
              designSystem.config.maxViewportPx,
              sample.viewportPx
            )
          : undefined,
        paddingPx: paddingToken
          ? resolveFluidValuePx(
              paddingToken.minPx,
              paddingToken.maxPx,
              designSystem.config.minViewportPx,
              designSystem.config.maxViewportPx,
              sample.viewportPx
            )
          : undefined,
        columns:
          recipe.direction === "grid"
            ? resolveLayoutColumns(recipe.columns, sample.viewportPx)
            : recipe.id === "hero-split"
              ? sample.viewportPx <= 720
                ? 1
                : 2
              : 1,
      }))
    }

    const previewNodeSize = (kind: ColorCanvasPreviewKind) =>
      getPreviewNodeSize(kind, "fit-width")

    const previewNodes: Array<{
      key: string
      label: string
      preview: ColorCanvasNodePreview
      size: { width: number; height: number }
      role?: NonNullable<ColorCanvasNode["role"]>
    }> = [
      {
        key: "logic-colors",
        label: "Explain / Color Roles",
        size: previewNodeSize("connector-detail"),
        preview: {
          kind: "connector-detail",
          sectionId: "colors",
          badge: "Role logic",
          note: "Brand seed becomes semantic UI roles through relative OKLCH rules and semantic mapping.",
          tokens: ["--color-brand-500", "--color-surface", "--color-foreground", "--color-border-default"],
          mappings: [
            { label: "Seed", value: "Brand 500 and inverse tokens" },
            { label: "Rule layer", value: "Brand darker, surface, text, border" },
            { label: "Semantic output", value: "surface, text, border, accent, icon" },
            { label: "Result", value: "UI roles stay coherent as brand input changes" },
          ],
          codeLanguage: "text",
          code:
            "seed -> relative OKLCH rules -> semantic roles\n" +
            "brand -> surface/text/border/accent/icon\n" +
            "contrast rules then validate the semantic pairings",
        },
      },
      {
        key: "logic-capsize",
        label: "Explain / Capsize",
        size: previewNodeSize("connector-detail"),
        preview: {
          kind: "connector-detail",
          sectionId: "type",
          badge: "Capsize",
          note: "Capsize turns font metrics into line-height and trim decisions, so baseline rhythm is not guessed.",
          tokens: ["--font-family-sans", "--font-family-display", "--line-height-base", "--line-height-3xl"],
          mappings: [
            { label: "Input", value: "capHeight, ascent, descent, lineGap" },
            { label: "Output", value: "cap trim, baseline trim, line-height clamp" },
            { label: "Why", value: "Text aligns by metrics, not by arbitrary CSS leading" },
          ],
          codeLanguage: "text",
          code:
            "precomputeValues({ fontSize, leading, fontMetrics })\n" +
            "=> capHeightTrim + baselineTrim + leading values",
        },
      },
      {
        key: "logic-utopia",
        label: "Explain / Utopia",
        size: previewNodeSize("connector-detail"),
        preview: {
          kind: "connector-detail",
          sectionId: "type",
          badge: "Utopia",
          note: "Utopia drives the fluid steps. One base size and ratio range expands into the full responsive scale.",
          tokens: ["--font-size-base", "--font-size-3xl", "--space-400", "--icon-size-md"],
          mappings: [
            { label: "Base", value: `${designSystem.config.typeBaseMinPx}-${designSystem.config.typeBaseMaxPx}px` },
            {
              label: "Ratio range",
              value: `${designSystem.config.minTypeScaleRatio}-${designSystem.config.maxTypeScaleRatio}`,
            },
            {
              label: "Viewport",
              value: `${designSystem.config.minViewportPx}-${designSystem.config.maxViewportPx}px`,
            },
            { label: "Result", value: "Type, space, and icons scale without breakpoints" },
          ],
          codeLanguage: "text",
          code:
            "fluid(step) = clamp(min, intercept + slope * vw, max)\n" +
            "step size comes from baseSize * ratio^step",
        },
      },
      {
        key: "logic-icons",
        label: "Explain / Icon Pairing",
        size: previewNodeSize("connector-detail"),
        preview: {
          kind: "connector-detail",
          sectionId: "type",
          badge: "Icon rule",
          note: "Icon containers follow paired text line-height, and stroke width is tuned against font weight.",
          tokens: ["--icon-size-sm", "--icon-size-md", "--icon-size-lg", "--icon-stroke"],
          mappings: [
            { label: "Pairing", value: "sm -> Text SM, md -> Text Base, lg/xl -> display tiers" },
            { label: "Stroke", value: designSystem.cssVars["--icon-stroke"] || "—" },
            { label: "Library", value: activeIconLibraryLabel },
            { label: "Result", value: "Icons stay optically consistent with the selected font weights" },
          ],
          codeLanguage: "text",
          code:
            "icon size = paired text line-height\n" +
            "icon stroke = tuned to body/display weight and optical area",
        },
      },
      {
        key: "logic-layout",
        label: "Explain / Layout Response",
        size: previewNodeSize("connector-detail"),
        preview: {
          kind: "connector-detail",
          sectionId: "layout",
          badge: "Responsive recipe",
          note: "Layouts consume fluid gap and padding tokens, then adapt columns and splits at viewport checkpoints.",
          tokens: ["--space-300", "--space-500", "--space-600", "--icon-size-md"],
          mappings: [
            { label: "Spacing source", value: "Fluid space scale from base unit + density" },
            { label: "Type source", value: "Body and display tiers from Utopia + Capsize" },
            { label: "Behavior", value: "Grid compresses columns, split stacks to one column on small widths" },
          ],
          codeLanguage: "text",
          code:
            "layout = space tokens + type tokens + icon tokens\n" +
            "viewport checkpoints then decide columns / split behavior",
        },
      },
      {
        key: "logic-primitives",
        label: "Explain / Primitive Contract",
        size: previewNodeSize("connector-detail"),
        preview: {
          kind: "connector-detail",
          sectionId: "primitives",
          badge: "Primitive contract",
          note: "Primitives are not hardcoded demos. They consume the same token contract generated by the scale engine.",
          tokens: ["--font-size-base", "--size-control-md", "--radius", "--color-surface"],
          mappings: [
            { label: "Type", value: "font-family, font-size, line-height tokens" },
            { label: "Control", value: "size-control and space tokens" },
            { label: "Surface", value: "surface, border, radius, shadow tokens" },
          ],
        },
      },
      {
        key: "logic-standards",
        label: "Explain / Export Bridge",
        size: previewNodeSize("connector-detail"),
        preview: {
          kind: "connector-detail",
          sectionId: "standards",
          badge: "Adapter logic",
          note: "The same generated scale is exported as a DTCG-style token doc and mapped into Radix variables.",
          tokens: ["--ds-font-size-base", "--default-font-family", "--font-size-3", "--space-4"],
          mappings: [
            { label: "Source", value: "Generated ds-scale tokens" },
            { label: "Export", value: "DTCG-style JSON + alias vars" },
            { label: "Adapter", value: "Radix Themes variable bridge" },
          ],
        },
      },
      {
        key: "font-sans",
        label: "Font / Sans Metrics",
        size: previewNodeSize("font-family"),
        preview: {
          kind: "font-family",
          badge: "Capsize metrics",
          cssVar: "--font-size-base",
          secondaryVar: "--line-height-base",
          fontFamilyVar: "--font-family-sans",
          sampleText: baseType?.sampleText,
          note: "Font node exposes trim data and body-size coupling.",
          scaleItems: buildTypeScaleItems("sans"),
          viewportSamples: buildTypeViewportSamples(baseType),
          tokens: ["--font-family-sans", "--font-size-base", "--line-height-base", "--color-foreground"],
          mappings: [
            { label: "Cap trim", value: baseType?.capHeightTrim || "—" },
            { label: "Baseline trim", value: baseType?.baselineTrim || "—" },
            { label: "Fluid size", value: baseType?.clamp || "—" },
            { label: "Body weight", value: String(activeFontWeightSans) },
          ],
        },
      },
      {
        key: "font-display",
        label: "Font / Display Metrics",
        size: previewNodeSize("font-family"),
        preview: {
          kind: "font-family",
          badge: "Capsize metrics",
          cssVar: "--font-size-3xl",
          secondaryVar: "--line-height-3xl",
          fontFamilyVar: "--font-family-display",
          sampleText: displayType?.sampleText,
          note: "Display family node uses the same API but a different metric profile.",
          scaleItems: buildTypeScaleItems("display"),
          viewportSamples: buildTypeViewportSamples(displayType),
          tokens: [
            "--font-family-display",
            "--font-size-3xl",
            "--line-height-3xl",
            "--color-foreground",
          ],
          mappings: [
            { label: "Cap trim", value: displayType?.capHeightTrim || "—" },
            { label: "Baseline trim", value: displayType?.baselineTrim || "—" },
            { label: "Fluid size", value: displayType?.clamp || "—" },
            { label: "Display weight", value: String(activeFontWeightDisplay) },
          ],
        },
      },
      {
        key: "type-base",
        label: "Type / Base Scale",
        role: "text",
        size: previewNodeSize("type-scale"),
        preview: {
          kind: "type-scale",
          badge: "Utopia + Capsize",
          cssVar: "--font-size-base",
          secondaryVar: "--line-height-base",
          fontFamilyVar: "--font-family-sans",
          sampleText: baseType?.sampleText,
          note: baseType ? `${baseType.minPx}-${baseType.maxPx}px fluid size` : undefined,
          scaleItems: buildTypeScaleItems(),
          viewportSamples: buildTypeViewportSamples(baseType),
          tokens: ["--font-family-sans", "--font-size-base", "--line-height-base", "--color-foreground"],
          mappings: [
            { label: "Base min", value: `${designSystem.config.typeBaseMinPx}px` },
            { label: "Base max", value: `${designSystem.config.typeBaseMaxPx}px` },
            {
              label: "Ratio",
              value: `${designSystem.config.minTypeScaleRatio}-${designSystem.config.maxTypeScaleRatio}`,
            },
            { label: "Weight", value: String(activeFontWeightSans) },
          ],
          codeLanguage: "text",
          code:
            "size(step) = round_to_grid(typeBase * ratio^step, baseUnit)\n" +
            `step=0\nclamp=${baseType?.clamp || "—"}\nviewport=${designSystem.config.minViewportPx}-${designSystem.config.maxViewportPx}px`,
        },
      },
      {
        key: "type-display",
        label: "Type / Display Scale",
        role: "text",
        size: previewNodeSize("type-scale"),
        preview: {
          kind: "type-scale",
          badge: "Utopia + Capsize",
          cssVar: "--font-size-3xl",
          secondaryVar: "--line-height-3xl",
          fontFamilyVar: "--font-family-display",
          sampleText: displayType?.sampleText,
          note: displayType ? `${displayType.minPx}-${displayType.maxPx}px fluid size` : undefined,
          scaleItems: buildTypeScaleItems(),
          viewportSamples: buildTypeViewportSamples(displayType),
          tokens: [
            "--font-family-display",
            "--font-size-3xl",
            "--line-height-3xl",
            "--color-foreground",
          ],
          mappings: [
            { label: "Step", value: "4" },
            {
              label: "Responsive clamp",
              value: displayType?.clamp || "—",
            },
            { label: "Display weight", value: String(activeFontWeightDisplay) },
          ],
          codeLanguage: "text",
          code:
            "utopiaClamp(min, max, minViewport, maxViewport)\n" +
            `step=4\nclamp=${displayType?.clamp || "—"}`,
        },
      },
      {
        key: "stroke-pair",
        label: "Icon / Stroke Pair",
        role: "icon",
        size: previewNodeSize("stroke-pair"),
        preview: {
          kind: "stroke-pair",
          badge: "Font + icon pair",
          cssVar: "--icon-size-md",
          fontFamilyVar: "--font-family-sans",
          secondaryVar: "--font-size-base",
          paddingVar: "--line-height-base",
          iconLibraryId: activeIconLibraryId,
          sampleText: "Stroke weight tracks the body rhythm.",
          note: "Use this node to match icon container, stroke, and body metrics.",
          scaleItems: buildIconScaleItems(),
          viewportSamples: buildIconViewportSamples(baseIconScale),
          tokens: [
            "--icon-size-md",
            "--icon-stroke",
            "--font-family-sans",
            "--font-size-base",
            "--line-height-base",
          ],
          mappings: [
            { label: "Stroke", value: designSystem.cssVars["--icon-stroke"] || "—" },
            { label: "Paired type", value: "Text Base" },
            { label: "Icon clamp", value: iconMd?.clamp || "—" },
            { label: "Body weight", value: String(activeFontWeightSans) },
            { label: "Display weight", value: String(activeFontWeightDisplay) },
            { label: "Suggested stroke", value: recommendedStrokeRange },
          ],
        },
      },
      {
        key: "icon-library",
        label: "Icon / Library",
        role: "icon",
        size: previewNodeSize("icon-library"),
        preview: {
          kind: "icon-library",
          badge: "Icon library",
          cssVar: "--icon-size-md",
          iconLibraryId: activeIconLibraryId,
          iconKeys: ["type", "grid", "split", "accent", "action", "search"],
          note: `${activeIconLibraryLabel} icons are applied to the current preview graph.`,
          scaleItems: buildIconScaleItems(),
          viewportSamples: buildIconViewportSamples(baseIconScale),
          tokens: ["--icon-size-md", "--icon-stroke", "--color-foreground"],
          mappings: [
            { label: "Library", value: activeIconLibraryLabel },
            { label: "Stroke", value: designSystem.cssVars["--icon-stroke"] || "—" },
            { label: "Scale tier", value: iconMd?.clamp || "—" },
          ],
        },
      },
      {
        key: "icon-scale",
        label: "Icon / Action Scale",
        role: "icon",
        size: previewNodeSize("icon-scale"),
        preview: {
          kind: "icon-scale",
          badge: "Icon tier",
          cssVar: "--icon-size-md",
          iconLibraryId: activeIconLibraryId,
          note: iconMd ? `${iconMd.minPx}-${iconMd.maxPx}px aligned to body line height` : undefined,
          scaleItems: buildIconScaleItems(),
          viewportSamples: buildIconViewportSamples(baseIconScale),
          tokens: ["--icon-size-md", "--icon-stroke", "--color-foreground"],
          mappings: [
            { label: "Optical area", value: iconMd ? `${iconMd.opticalMinPx}-${iconMd.opticalMaxPx}px` : "—" },
            { label: "Paired tier", value: iconMd?.pairedTypographyId || "—" },
            { label: "Library", value: activeIconLibraryLabel },
            { label: "Suggested stroke", value: recommendedStrokeRange },
          ],
        },
      },
      {
        key: "layout-stack",
        label: "Layout / Stack Flow",
        size: previewNodeSize("layout-stack"),
        preview: {
          kind: "layout-stack",
          badge: "Layout recipe",
          gapVar: "--space-300",
          paddingVar: "--space-400",
          iconLibraryId: activeIconLibraryId,
          note: "Default column rhythm for surfaces and settings panels.",
          viewportSamples: buildLayoutViewportSamples(
            designSystem.layouts.find((layout) => layout.id === "stack-flow") ?? designSystem.layouts[0],
            baseType,
            baseIconScale
          ),
          tokens: [
            "--space-300",
            "--space-400",
            "--font-size-base",
            "--line-height-base",
            "--icon-size-md",
            "--color-surface",
            "--color-border-default",
          ],
          mappings: [
            { label: "Body size", value: baseType?.clamp || "—" },
            { label: "Gap", value: designSystem.cssVars["--space-300"] || "—" },
            { label: "Icons", value: activeIconLibraryLabel },
          ],
        },
      },
      {
        key: "layout-grid",
        label: "Layout / Feature Grid",
        size: previewNodeSize("layout-grid"),
        preview: {
          kind: "layout-grid",
          badge: "Layout recipe",
          gapVar: "--space-400",
          paddingVar: "--space-500",
          columns: 3,
          iconLibraryId: activeIconLibraryId,
          note: "Card grid driven by fluid spacing tokens.",
          viewportSamples: buildLayoutViewportSamples(
            designSystem.layouts.find((layout) => layout.id === "feature-grid") ?? designSystem.layouts[0],
            baseType,
            baseIconScale
          ),
          tokens: [
            "--space-400",
            "--space-500",
            "--font-size-base",
            "--icon-size-md",
            "--color-surface",
            "--color-border-default",
          ],
          mappings: [
            { label: "Body size", value: baseType?.clamp || "—" },
            { label: "Columns", value: "3" },
            { label: "Icons", value: activeIconLibraryLabel },
          ],
        },
      },
      {
        key: "layout-split",
        label: "Layout / Hero Split",
        size: previewNodeSize("layout-split"),
        preview: {
          kind: "layout-split",
          badge: "Layout recipe",
          gapVar: "--space-600",
          paddingVar: "--space-600",
          iconLibraryId: activeIconLibraryId,
          note: "Two-column editorial split built from the same spacing scale.",
          viewportSamples: buildLayoutViewportSamples(
            designSystem.layouts.find((layout) => layout.id === "hero-split") ?? designSystem.layouts[0],
            displayType,
            displayIconScale
          ),
          tokens: [
            "--space-600",
            "--font-size-3xl",
            "--line-height-3xl",
            "--icon-size-xl",
            "--color-surface",
            "--color-border-default",
          ],
          mappings: [
            { label: "Display size", value: displayType?.clamp || "—" },
            { label: "Gap", value: designSystem.cssVars["--space-600"] || "—" },
            { label: "Icons", value: activeIconLibraryLabel },
          ],
        },
      },
      {
        key: "dtcg",
        label: "Token Standard / DTCG",
        size: previewNodeSize("token-standard"),
        preview: {
          kind: "token-standard",
          badge: "DTCG export",
          note: "Design tokens exported as a standard document with cssVar + alias metadata.",
          tokens: ["--ds-font-size-base", "--ds-space-400", "--ds-radius-lg"],
          mappings: [
            { label: "Token count", value: String(designSystem.tokens.length) },
            { label: "Alias vars", value: String(Object.keys(designSystem.aliasVars).length) },
            { label: "Spec", value: "DTCG-style JSON" },
          ],
          codeLanguage: "json",
          code: designSystem.dtcgJson,
        },
      },
      {
        key: "radix",
        label: "Radix / Theme Bridge",
        size: previewNodeSize("radix-theme"),
        preview: {
          kind: "radix-theme",
          badge: "Radix adapter",
          note: "Maps ds-scale aliases into Radix Themes variables and accent tokens.",
          tokens: ["--default-font-family", "--font-size-3", "--space-4", "--accent-9"],
          mappings: designSystem.radix.mappings.slice(0, 8).map((mapping) => ({
            label: mapping.radixVar,
            value: mapping.sourceVar,
          })),
          codeLanguage: "css",
          code: `${designSystem.radix.layersCssText}\n\n${designSystem.radix.cssText}`,
        },
      },
      {
        key: "primitive-text",
        label: "Primitive / Text",
        role: "text",
        size: previewNodeSize("primitive-text"),
        preview: {
          kind: "primitive-text",
          badge: "Primitive",
          sampleText: "The same token contract now renders directly on the canvas.",
          tokens: ["--font-family-sans", "--font-size-base", "--line-height-base", "--color-foreground"],
        },
      },
      {
        key: "primitive-heading",
        label: "Primitive / Heading",
        role: "text",
        size: previewNodeSize("primitive-heading"),
        preview: {
          kind: "primitive-heading",
          badge: "Primitive",
          sampleText: "Generated display primitives",
          tokens: [
            "--font-family-display",
            "--font-size-3xl",
            "--line-height-3xl",
            "--color-foreground",
          ],
        },
      },
      {
        key: "primitive-button",
        label: "Primitive / Button",
        role: "accent",
        size: previewNodeSize("primitive-button"),
        preview: {
          kind: "primitive-button",
          badge: "Primitive",
          size: "md",
          variant: "primary",
          sampleText: "Preview CTA",
          tokens: [
            "--size-control-md",
            "--space-300",
            "--radius",
            "--color-brand-600",
            "--color-inverse",
          ],
        },
      },
      {
        key: "primitive-surface",
        label: "Primitive / Surface",
        role: "surface",
        size: previewNodeSize("primitive-surface"),
        preview: {
          kind: "primitive-surface",
          badge: "Primitive",
          sampleText: "Preview generated from the design-system API",
          note: "Surface, border, radius, shadow, and type are all resolved from generated vars.",
          tokens: [
            "--space-500",
            "--radius-lg",
            "--shadow-card",
            "--color-surface",
            "--color-border-default",
            "--color-foreground",
          ],
        },
      },
    ]

    const previewNodeIds: Record<string, string> = {}
    previewNodes.forEach((definition) => {
      const previewId = upsertNode({
        type: "component",
        label: definition.label,
        size: definition.size,
        group: "system-preview",
        preview: definition.preview,
        position: positionFor(),
      })
      previewNodeIds[definition.key] = previewId

      if (definition.role && semanticIds[definition.role]) {
        ensureEdge(semanticIds[definition.role] as string, previewId, "map")
      }
    })

    if (brandSeedId && previewNodeIds["logic-colors"]) {
      ensureEdge(brandSeedId, previewNodeIds["logic-colors"], "map", { note: "Seed rules" })
    }
    if (previewNodeIds["logic-colors"] && semanticIds.surface) {
      ensureEdge(previewNodeIds["logic-colors"], semanticIds.surface, "map", { note: "Surface role" })
    }
    if (previewNodeIds["logic-colors"] && semanticIds.text) {
      ensureEdge(previewNodeIds["logic-colors"], semanticIds.text, "map", { note: "Text role" })
    }
    if (previewNodeIds["logic-colors"] && semanticIds.border) {
      ensureEdge(previewNodeIds["logic-colors"], semanticIds.border, "map", { note: "Border role" })
    }
    if (previewNodeIds["logic-colors"] && semanticIds.accent) {
      ensureEdge(previewNodeIds["logic-colors"], semanticIds.accent, "map", { note: "Accent role" })
    }
    if (previewNodeIds["logic-colors"] && semanticIds.icon) {
      ensureEdge(previewNodeIds["logic-colors"], semanticIds.icon, "map", { note: "Icon role" })
    }

    if (previewNodeIds["font-sans"] && previewNodeIds["logic-capsize"]) {
      ensureEdge(previewNodeIds["font-sans"], previewNodeIds["logic-capsize"], "map", { note: "Metrics" })
    }
    if (previewNodeIds["font-display"] && previewNodeIds["logic-capsize"]) {
      ensureEdge(previewNodeIds["font-display"], previewNodeIds["logic-capsize"], "map", { note: "Metrics" })
    }
    if (previewNodeIds["logic-capsize"] && previewNodeIds["type-base"]) {
      ensureEdge(previewNodeIds["logic-capsize"], previewNodeIds["type-base"], "map", { note: "Trim + leading" })
    }
    if (previewNodeIds["logic-capsize"] && previewNodeIds["type-display"]) {
      ensureEdge(previewNodeIds["logic-capsize"], previewNodeIds["type-display"], "map", { note: "Trim + leading" })
    }
    if (previewNodeIds["logic-utopia"] && previewNodeIds["type-base"]) {
      ensureEdge(previewNodeIds["logic-utopia"], previewNodeIds["type-base"], "map", { note: "Clamp formula" })
    }
    if (previewNodeIds["logic-utopia"] && previewNodeIds["type-display"]) {
      ensureEdge(previewNodeIds["logic-utopia"], previewNodeIds["type-display"], "map", { note: "Clamp formula" })
    }
    if (previewNodeIds["type-base"] && previewNodeIds["stroke-pair"]) {
      ensureEdge(previewNodeIds["type-base"], previewNodeIds["stroke-pair"], "map", { note: "Body pair" })
    }
    if (previewNodeIds["type-display"] && previewNodeIds["logic-utopia"]) {
      ensureEdge(previewNodeIds["font-display"], previewNodeIds["logic-utopia"], "map", { note: "Scale inputs" })
    }
    if (previewNodeIds["font-sans"] && previewNodeIds["logic-utopia"]) {
      ensureEdge(previewNodeIds["font-sans"], previewNodeIds["logic-utopia"], "map", { note: "Scale inputs" })
    }
    if (previewNodeIds["stroke-pair"] && previewNodeIds["logic-icons"]) {
      ensureEdge(previewNodeIds["stroke-pair"], previewNodeIds["logic-icons"], "map", { note: "Stroke rule" })
    }
    if (previewNodeIds["logic-icons"] && previewNodeIds["icon-library"]) {
      ensureEdge(previewNodeIds["logic-icons"], previewNodeIds["icon-library"], "map", { note: "Library" })
    }
    if (previewNodeIds["logic-icons"] && previewNodeIds["icon-scale"]) {
      ensureEdge(previewNodeIds["logic-icons"], previewNodeIds["icon-scale"], "map", { note: "Scale tiers" })
    }
    if (previewNodeIds["logic-layout"] && previewNodeIds["layout-stack"]) {
      ensureEdge(previewNodeIds["logic-layout"], previewNodeIds["layout-stack"], "map", { note: "Responsive recipe" })
    }
    if (previewNodeIds["logic-layout"] && previewNodeIds["layout-grid"]) {
      ensureEdge(previewNodeIds["logic-layout"], previewNodeIds["layout-grid"], "map", { note: "Responsive recipe" })
    }
    if (previewNodeIds["logic-layout"] && previewNodeIds["layout-split"]) {
      ensureEdge(previewNodeIds["logic-layout"], previewNodeIds["layout-split"], "map", { note: "Responsive recipe" })
    }
    if (previewNodeIds["type-base"] && previewNodeIds["logic-layout"]) {
      ensureEdge(previewNodeIds["type-base"], previewNodeIds["logic-layout"], "map", { note: "Type rhythm" })
    }
    if (previewNodeIds["icon-scale"] && previewNodeIds["logic-layout"]) {
      ensureEdge(previewNodeIds["icon-scale"], previewNodeIds["logic-layout"], "map", { note: "Icon rhythm" })
    }
    if (previewNodeIds["layout-stack"] && previewNodeIds["logic-primitives"]) {
      ensureEdge(previewNodeIds["layout-stack"], previewNodeIds["logic-primitives"], "map", { note: "Compose" })
    }
    if (previewNodeIds["layout-grid"] && previewNodeIds["logic-primitives"]) {
      ensureEdge(previewNodeIds["layout-grid"], previewNodeIds["logic-primitives"], "map", { note: "Compose" })
    }
    if (previewNodeIds["layout-split"] && previewNodeIds["logic-primitives"]) {
      ensureEdge(previewNodeIds["layout-split"], previewNodeIds["logic-primitives"], "map", { note: "Compose" })
    }
    if (previewNodeIds["logic-primitives"] && previewNodeIds["primitive-text"]) {
      ensureEdge(previewNodeIds["logic-primitives"], previewNodeIds["primitive-text"], "map", { note: "Token contract" })
    }
    if (previewNodeIds["logic-primitives"] && previewNodeIds["primitive-heading"]) {
      ensureEdge(previewNodeIds["logic-primitives"], previewNodeIds["primitive-heading"], "map", { note: "Token contract" })
    }
    if (previewNodeIds["logic-primitives"] && previewNodeIds["primitive-button"]) {
      ensureEdge(previewNodeIds["logic-primitives"], previewNodeIds["primitive-button"], "map", { note: "Token contract" })
    }
    if (previewNodeIds["logic-primitives"] && previewNodeIds["primitive-surface"]) {
      ensureEdge(previewNodeIds["logic-primitives"], previewNodeIds["primitive-surface"], "map", { note: "Token contract" })
    }
    if (previewNodeIds["primitive-button"] && inverseSeedId) {
      ensureEdge(inverseSeedId, previewNodeIds["primitive-button"], "map", { note: "Inverse text" })
    }
    if (previewNodeIds["dtcg"] && previewNodeIds["logic-standards"]) {
      ensureEdge(previewNodeIds["dtcg"], previewNodeIds["logic-standards"], "map", { note: "Alias export" })
    }
    if (previewNodeIds["logic-standards"] && previewNodeIds["radix"]) {
      ensureEdge(previewNodeIds["logic-standards"], previewNodeIds["radix"], "map", { note: "Adapter bridge" })
    }
    if (previewNodeIds["radix"] && previewNodeIds["primitive-button"]) {
      ensureEdge(previewNodeIds["radix"], previewNodeIds["primitive-button"], "map", { note: "Example consumer" })
    }
    setCanvasViewMode("system")
    setCanvasMode("system-canvas")
    setEdgeFilter("map")
    setConnectMode(null)
    setConnectSourceId(null)
    setConnectDrag({ active: false, x: 0, y: 0 })
    setSelectedAutoEdgeId(null)
    lastSystemAutoFitKeyRef.current = null
    setPendingSystemViewportAction("fit-width")
  }, [
    designSystem.aliasVars,
    designSystem.cssVars,
    designSystem.config,
    designSystem.dtcgJson,
    applyDesignSystemThemeVars,
    activeFontWeightDisplay,
    activeFontWeightSans,
    activeIconLibraryId,
    designSystem.icons,
    designSystem.layouts,
    designSystem.radix.cssText,
    designSystem.radix.layersCssText,
    designSystem.radix.mappings,
    designSystem.spacing,
    designSystem.tokens,
    designSystem.typography,
    ensureEdge,
    getNodeSize,
    nodes,
    setCanvasMode,
    setCanvasViewMode,
    setPendingSystemViewportAction,
    tokenValues,
    tokensByCssVar,
    upsertNode,
  ])

  const handleSaveSession = () => {
    if (!activeSessionId) return
    const current = sessions[activeSessionId]
    setSessions((prev) => ({
      ...prev,
      [activeSessionId]: {
        id: activeSessionId,
        name: current?.name || "Session",
        state: state ?? emptyState,
        updatedAt: new Date().toISOString(),
      },
    }))
  }

  const handleNewSession = () => {
    const nextIndex = Object.keys(sessions).length + 1
    const id = `session-${Date.now()}`
    const name = `Session ${nextIndex}`
    setSessions((prev) => ({
      ...prev,
      [id]: {
        id,
        name,
        state: emptyState,
        updatedAt: new Date().toISOString(),
      },
    }))
    setActiveSessionId(id)
    replaceState(emptyState)
  }

  const handleClearSession = () => {
    replaceState(emptyState)
    if (!activeSessionId) return
    setSessions((prev) => ({
      ...prev,
      [activeSessionId]: {
        id: activeSessionId,
        name: prev[activeSessionId]?.name || "Session",
        state: emptyState,
        updatedAt: new Date().toISOString(),
      },
    }))
  }

  const handleDeleteSession = () => {
    if (!activeSessionId) return
    setSessions((prev) => {
      const next = { ...prev }
      delete next[activeSessionId]
      return next
    })
    const remaining = Object.keys(sessions).filter((id) => id !== activeSessionId)
    if (remaining.length > 0) {
      const nextId = remaining[0]
      setActiveSessionId(nextId)
      replaceState(sessions[nextId].state)
    } else {
      handleNewSession()
    }
  }

  const handleAddSemantic = (preset: { label: string; role: ColorCanvasNode["role"] }) => {
    const position = getNextPosition(nodes)
    addSemanticNode(preset.label, preset.role, position)
  }

  const handleWorkspaceClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-color-node='true']")) return
    clearSelection()
    setConnectSourceId(null)
    setSelectedAutoEdgeId(null)
  }

  const handleNodeClick = (nodeId: string) => {
    selectNode(nodeId)
    setSelectedAutoEdgeId(null)
  }

  const handleConnectTarget = useCallback(
    (nodeId: string) => {
      if (!connectMode) return

      if (!connectSourceId) {
        setConnectSourceId(nodeId)
        return
      }

      if (connectSourceId === nodeId) {
        setConnectSourceId(null)
        return
      }

      const sourceNode = nodesById[connectSourceId]
      const targetNode = nodesById[nodeId]
      if (!sourceNode || !targetNode) return

      if (connectMode === "map") {
        let sourceId = connectSourceId
        let targetId = nodeId

        if (sourceNode.type === "component" && targetNode.type === "semantic") {
          sourceId = nodeId
          targetId = connectSourceId
        }

        if (
          sourceNode.type === "semantic" &&
          (targetNode.type === "token" || targetNode.type === "relative")
        ) {
          sourceId = nodeId
          targetId = connectSourceId
        }

        addTypedEdge(sourceId, targetId, "map")
        setConnectSourceId(null)
        return
      }

      if (connectMode === "contrast") {
        addTypedEdge(connectSourceId, nodeId, "contrast")
        setConnectSourceId(null)
      }
    },
    [addTypedEdge, connectMode, connectSourceId, nodesById]
  )

  const handleConnectStart = (nodeId: string, event: React.PointerEvent) => {
    if (!connectMode) return
    event.preventDefault()
    event.stopPropagation()
    setConnectSourceId(nodeId)
    const point = viewportToCanvasPosition(event.clientX, event.clientY)
    setConnectDrag({
      active: true,
      x: point.x,
      y: point.y,
    })
  }

  const handleEdgeBadgeClick = (edge: DisplayEdge) => {
    if (edge.auto) {
      selectEdge(null)
      setSelectedAutoEdgeId(edge.id)
      return
    }
    setSelectedAutoEdgeId(null)
    selectEdge(edge.id)
  }

  const handleEdgeFilterChange = (nextFilter: EdgeFilter) => {
    setEdgeFilter(nextFilter)
    if (selectedEdgeId) {
      const selected = edges.find((edge) => edge.id === selectedEdgeId)
      if (selected && nextFilter !== "all" && selected.type !== nextFilter) {
        selectEdge(null)
      }
    }
    if (selectedAutoEdgeId && nextFilter === "map") {
      setSelectedAutoEdgeId(null)
    }
  }

  const applyAuditFocusMode = useCallback(
    (mode: ColorAuditFocusMode) => {
      setShowAdvancedAuditControls(false)
      setConnectSourceId(null)
      setConnectDrag({ active: false, x: 0, y: 0 })

      if (mode === "review") {
        setConnectMode(null)
        setEdgeFilter("all")
        setShowDependencies(true)
        setAutoContrastEnabled(true)
        setShowFullLabels(false)
        setPanelMode("inspector")
        return
      }

      if (mode === "build") {
        setConnectMode("map")
        setEdgeFilter("map")
        setShowDependencies(true)
        setAutoContrastEnabled(false)
        setShowFullLabels(false)
        setPanelMode("inspector")
        return
      }

      setConnectMode("contrast")
      setEdgeFilter("contrast")
      setShowDependencies(false)
      setAutoContrastEnabled(true)
      setShowFullLabels(false)
      setPanelMode("audit")
    },
    [setAutoContrastEnabled, setShowAdvancedAuditControls]
  )

  const handleCanvasViewModeChange = useCallback(
    (nextMode: CanvasViewMode) => {
      setCanvasViewMode(nextMode)
      setConnectMode(null)
      setConnectSourceId(null)
      setConnectDrag({ active: false, x: 0, y: 0 })
      if (!isRelationshipCanvasMode(nextMode)) {
        setSelectedAutoEdgeId(null)
        setEdgeFilter("map")
        lastSystemAutoFitKeyRef.current = null
        setPendingSystemViewportAction("fit-width")
      }
    },
    [setCanvasViewMode]
  )

  const handleCanvasModeChange = useCallback(
    (nextMode: CanvasMode) => {
      setCanvasMode(nextMode)
      setConnectMode(null)
      setConnectSourceId(null)
      setConnectDrag({ active: false, x: 0, y: 0 })
      setSelectedAutoEdgeId(null)
      if (nextMode === "color-audit") {
        setCanvasViewMode("color")
        setPendingColorAuditViewportAction("bird-view")
        return
      }
      if (canvasViewMode === "color") {
        setCanvasViewMode("system")
      }
      setEdgeFilter("map")
      lastSystemAutoFitKeyRef.current = null
      setPendingSystemViewportAction("fit-width")
    },
    [canvasViewMode, setCanvasMode, setCanvasViewMode]
  )

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable) {
        return
      }
      if ((event.key === "Backspace" || event.key === "Delete") && selectedEdgeId) {
        event.preventDefault()
        removeEdge(selectedEdgeId)
        return
      }
      if ((event.key === "Backspace" || event.key === "Delete") && selectedNodeId) {
        event.preventDefault()
        removeNode(selectedNodeId)
        return
      }
      const isUndo = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z"
      if (isUndo && canUndoEdgeRemoval) {
        event.preventDefault()
        undoRemoveEdge()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedEdgeId, selectedNodeId, removeEdge, removeNode, undoRemoveEdge, canUndoEdgeRemoval])

  const selectedNode = selectedNodeId ? nodesById[selectedNodeId] : null
  const manualEdges = useMemo<DisplayEdge[]>(
    () => edges.map((edge) => ({ ...edge, auto: false })),
    [edges]
  )
  const visibleNodes = useMemo(() => {
    const baseVisibleNodes = nodes.filter((node) =>
      isNodeVisibleInCanvasView(node, effectiveCanvasViewMode)
    )

    if (
      canvasMode !== "system-canvas" ||
      effectiveCanvasViewMode === "system" ||
      effectiveCanvasViewMode === "all"
    ) {
      return baseVisibleNodes
    }

    const rootIds = new Set(baseVisibleNodes.map((node) => node.id))
    const relatedIds = new Set(rootIds)

    edges.forEach((edge) => {
      const source = nodesById[edge.sourceId]
      const target = nodesById[edge.targetId]
      if (!source || !target) return

      if (rootIds.has(edge.sourceId) && getCanvasNodeGroup(target) !== "color") {
        relatedIds.add(edge.targetId)
      }
      if (rootIds.has(edge.targetId) && getCanvasNodeGroup(source) !== "color") {
        relatedIds.add(edge.sourceId)
      }
    })

    return nodes.filter((node) => relatedIds.has(node.id))
  }, [canvasMode, edges, effectiveCanvasViewMode, nodes, nodesById])
  const autoLayoutPlan = useMemo(() => {
    if (isRelationshipMode) {
      return {
        positions: {} as Record<string, { x: number; y: number }>,
        sections: [] as CanvasSectionFrame[],
        width: 1280,
        height: 880,
      }
    }

    return buildSystemFlowLayout(
      visibleNodes,
      getNodeSize,
      Math.max(systemCanvasViewportSize.width, 960)
    )
  }, [getNodeSize, isRelationshipMode, systemCanvasViewportSize.width, visibleNodes])
  const renderedNodes = useMemo(() => {
    if (visibleNodes.length === 0) return visibleNodes
    if (isRelationshipMode) return visibleNodes

    return visibleNodes.map((node) => ({
      ...node,
      position: viewNodePositions[getViewPositionKey(node.id)] ?? autoLayoutPlan.positions[node.id] ?? node.position,
    }))
  }, [autoLayoutPlan.positions, getViewPositionKey, isRelationshipMode, viewNodePositions, visibleNodes])
  const renderedNodesById = useMemo(() => {
    return renderedNodes.reduce<Record<string, ColorCanvasNode>>((acc, node) => {
      acc[node.id] = node
      return acc
    }, {})
  }, [renderedNodes])
  const nodeCatalogGroups = useMemo(() => {
    const groups = new Map<
      string,
      { id: string; label: string; weight: number; nodes: ColorCanvasNode[] }
    >()

    renderedNodes.forEach((node) => {
      const meta = (() => {
        if (node.preview) {
          return { id: "preview", label: "Preview", weight: 70 }
        }
        if (node.group === "system-support") {
          return { id: "system-support", label: "System support", weight: 60 }
        }
        if (node.type === "token") {
          return { id: "palette", label: "Palette input", weight: 10 }
        }
        if (node.type === "relative") {
          return { id: "relative", label: "Relative rule", weight: 20 }
        }
        if (isFunctionalTokenNode(node)) {
          const frameworkLabel = getFrameworkLabel(node.framework)
          return {
            id: `functional-${node.framework ?? "custom"}`,
            label: frameworkLabel ? `Functional alias · ${frameworkLabel}` : "Functional alias",
            weight: 30,
          }
        }
        if (node.type === "semantic") {
          return { id: "semantic", label: "Semantic role", weight: 40 }
        }
        if (node.type === "component") {
          return { id: "component", label: "Component example", weight: 50 }
        }
        return { id: "other", label: "Other", weight: 80 }
      })()

      if (!groups.has(meta.id)) {
        groups.set(meta.id, { ...meta, nodes: [] })
      }
      groups.get(meta.id)?.nodes.push(node)
    })

    return Array.from(groups.values())
      .sort((left, right) => left.weight - right.weight || left.label.localeCompare(right.label))
      .map((group) => ({
        ...group,
        nodes: [...group.nodes].sort((left, right) =>
          getDisplayNodeLabelFromNode(left).localeCompare(getDisplayNodeLabelFromNode(right))
        ),
      }))
  }, [renderedNodes])
  const nodeCatalogSampleNode = useMemo(() => {
    if (selectedNode && renderedNodesById[selectedNode.id]) {
      return renderedNodesById[selectedNode.id]
    }
    return renderedNodes[0] ?? null
  }, [renderedNodes, renderedNodesById, selectedNode])
  const allNodeCatalogSections = useMemo(() => {
    if (!catalogOnly) return [] as NodeCatalogSection[]

    const baseType = designSystem.typography.find((step) => step.id === "base")
    const displayType = designSystem.typography.find((step) => step.id === "3xl")
    const iconMd = designSystem.icons.find((icon) => icon.id === "md") ?? designSystem.icons[0]
    const iconXl = designSystem.icons.find((icon) => icon.id === "xl") ?? designSystem.icons.at(-1)
    const activeIconLibraryLabel = getDesignSystemIconLibraryLabel(activeIconLibraryId)
    const recommendedStrokeRange =
      activeFontWeightSans >= 600 ? "1.75-2px" : activeFontWeightSans <= 350 ? "1-1.25px" : "1.5px"
    const sampleViewports = [
      designSystem.config.minViewportPx,
      Math.round((designSystem.config.minViewportPx + designSystem.config.maxViewportPx) / 2),
      designSystem.config.maxViewportPx,
    ]

    const buildTypeViewportSamples = (step?: TypographyScaleToken) =>
      step
        ? sampleViewports.map((viewportPx, index) => ({
            label: index === 0 ? "Min" : index === 1 ? "Mid" : "Max",
            viewportPx,
            fontPx: resolveFluidValuePx(
              step.minPx,
              step.maxPx,
              designSystem.config.minViewportPx,
              designSystem.config.maxViewportPx,
              viewportPx
            ),
            lineHeightPx: resolveFluidValuePx(
              step.lineHeightMinPx,
              step.lineHeightMaxPx,
              designSystem.config.minViewportPx,
              designSystem.config.maxViewportPx,
              viewportPx
            ),
          }))
        : []

    const buildIconViewportSamples = (icon?: IconScaleToken) =>
      icon
        ? sampleViewports.map((viewportPx, index) => ({
            label: index === 0 ? "Min" : index === 1 ? "Mid" : "Max",
            viewportPx,
            iconPx: resolveFluidValuePx(
              icon.minPx,
              icon.maxPx,
              designSystem.config.minViewportPx,
              designSystem.config.maxViewportPx,
              viewportPx
            ),
          }))
        : []

    const buildLayoutViewportSamples = (
      recipe: LayoutRecipe | undefined,
      step?: TypographyScaleToken,
      icon?: IconScaleToken
    ) =>
      !recipe
        ? []
        : sampleViewports.map((viewportPx, index) => ({
            label: index === 0 ? "Min" : index === 1 ? "Mid" : "Max",
            viewportPx,
            fontPx: step
              ? resolveFluidValuePx(
                  step.minPx,
                  step.maxPx,
                  designSystem.config.minViewportPx,
                  designSystem.config.maxViewportPx,
                  viewportPx
                )
              : undefined,
            iconPx: icon
              ? resolveFluidValuePx(
                  icon.minPx,
                  icon.maxPx,
                  designSystem.config.minViewportPx,
                  designSystem.config.maxViewportPx,
                  viewportPx
                )
              : undefined,
            gapPx: resolveFluidValuePx(
              designSystem.spacing.find((space) => space.cssVar === recipe.gapVar)?.minPx ?? 0,
              designSystem.spacing.find((space) => space.cssVar === recipe.gapVar)?.maxPx ?? 0,
              designSystem.config.minViewportPx,
              designSystem.config.maxViewportPx,
              viewportPx
            ),
            paddingPx: resolveFluidValuePx(
              designSystem.spacing.find((space) => space.cssVar === recipe.paddingVar)?.minPx ?? 0,
              designSystem.spacing.find((space) => space.cssVar === recipe.paddingVar)?.maxPx ?? 0,
              designSystem.config.minViewportPx,
              designSystem.config.maxViewportPx,
              viewportPx
            ),
            columns:
              recipe.direction === "grid"
                ? resolveLayoutColumns(recipe.columns, viewportPx)
                : recipe.id === "hero-split"
                  ? viewportPx <= 720
                    ? 1
                    : 2
                  : 1,
          }))

    const buildPreviewNode = (
      id: string,
      label: string,
      preview: ColorCanvasNodePreview,
      role?: NonNullable<ColorCanvasNode["role"]>
    ): ColorCanvasNode => ({
      id,
      type: "component",
      label,
      role,
      group: "system-preview",
      preview,
      size: getPreviewNodeSize(preview.kind, "fit-width"),
      position: { x: 0, y: 0 },
    })

    const resolveSystemColorValue = (cssVar: string, fallback: string) =>
      tokenValues[cssVar] || fallback

    const colorSupportSection: NodeCatalogSection = {
      id: "system-support",
      mode: "system-canvas",
      label: "System Canvas / Support nodes",
      description: "Color seeds, relative rules, and semantic support roles that feed the preview graph.",
      nodes: [
        {
          id: "catalog-system-brand-seed",
          type: "token",
          label: "Color / Brand Seed",
          value: resolveSystemColorValue("--color-brand-500", formatTemplateSeedOklch(DEFAULT_TEMPLATE_SEEDS.brand)),
          group: "system-support",
          position: { x: 0, y: 0 },
        },
        {
          id: "catalog-system-brand-darker",
          type: "relative",
          label: "Color Rule / Brand Darker",
          value: resolveSystemColorValue("--color-brand-600", "oklch(56% 0.16 255)"),
          group: "system-support",
          relative: {
            model: DEFAULT_COLOR_MODEL,
            baseId: "catalog-system-brand-seed",
            lMode: "delta",
            lValue: -6,
            cMode: "delta",
            cValue: -3,
            hMode: "inherit",
            alphaMode: "inherit",
          },
          position: { x: 0, y: 0 },
        },
        {
          id: "catalog-system-surface-rule",
          type: "relative",
          label: "Color Rule / Surface",
          role: "surface",
          value: resolveSystemColorValue("--color-surface", "oklch(98% 0.01 255)"),
          group: "system-support",
          relative: {
            model: DEFAULT_COLOR_MODEL,
            baseId: "catalog-system-brand-seed",
            lMode: "absolute",
            lValue: 98,
            cMode: "absolute",
            cValue: 1,
            hMode: "inherit",
            alphaMode: "inherit",
          },
          position: { x: 0, y: 0 },
        },
        {
          id: "catalog-system-text-rule",
          type: "relative",
          label: "Color Rule / Text",
          role: "text",
          value: resolveSystemColorValue("--color-foreground", "oklch(20% 0 255)"),
          group: "system-support",
          relative: {
            model: DEFAULT_COLOR_MODEL,
            baseId: "catalog-system-brand-seed",
            lMode: "absolute",
            lValue: 20,
            cMode: "absolute",
            cValue: 0,
            hMode: "inherit",
            alphaMode: "inherit",
          },
          position: { x: 0, y: 0 },
        },
        {
          id: "catalog-system-border-rule",
          type: "relative",
          label: "Color Rule / Border",
          role: "border",
          value: resolveSystemColorValue("--color-border-default", "oklch(82% 0.01 255 / 60%)"),
          group: "system-support",
          relative: {
            model: DEFAULT_COLOR_MODEL,
            baseId: "catalog-system-brand-seed",
            lMode: "absolute",
            lValue: 82,
            cMode: "absolute",
            cValue: 1,
            hMode: "inherit",
            alphaMode: "absolute",
            alphaValue: 60,
          },
          position: { x: 0, y: 0 },
        },
        {
          id: "catalog-system-inverse",
          type: "relative",
          label: "Color / Inverse",
          role: "text",
          value: resolveSystemColorValue("--color-inverse", "oklch(99% 0.01 255)"),
          group: "system-support",
          relative: {
            model: DEFAULT_COLOR_MODEL,
            baseId: "catalog-system-brand-seed",
            lMode: "absolute",
            lValue: 99,
            cMode: "absolute",
            cValue: 1,
            hMode: "inherit",
            alphaMode: "inherit",
          },
          position: { x: 0, y: 0 },
        },
        ...FOUNDATION_ROLE_BLUEPRINTS.map((blueprint) => ({
          id: `catalog-system-role-${slugifyTokenLabel(blueprint.semanticLabel)}`,
          type: "semantic" as const,
          label: blueprint.semanticLabel,
          role: blueprint.role,
          semanticKind: "role" as const,
          value: resolveSystemColorValue(blueprint.cssVar, blueprint.role === "surface" ? "oklch(98% 0.01 255)" : blueprint.role === "border" ? "oklch(82% 0.01 255 / 60%)" : blueprint.role === "accent" ? "oklch(56% 0.16 255)" : "oklch(20% 0 255)"),
          group: "system-support" as const,
          position: { x: 0, y: 0 },
        })),
      ],
    }

    const typeScaleItems = designSystem.typography.slice(0, 5).map((item) => ({
      label: item.label,
      cssVar: item.cssVar,
      secondaryVar: item.lineHeightVar,
      fontFamilyVar: item.fontFamilyKey === "display" ? "--font-family-display" : "--font-family-sans",
      sampleText: item.sampleText,
      minPx: item.minPx,
      maxPx: item.maxPx,
    }))

    const iconScaleItems = designSystem.icons.slice(0, 4).map((item) => ({
      label: item.label,
      cssVar: item.cssVar,
      iconKey: item.id === "sm" ? "search" : item.id === "md" ? "grid" : item.id === "lg" ? "accent" : "action",
      pairedLabel: item.pairedTypographyId,
      minPx: item.minPx,
      maxPx: item.maxPx,
    }))

    const explainersSection: NodeCatalogSection = {
      id: "system-explainers",
      mode: "system-canvas",
      label: "System Canvas / Explainers",
      description: "Connector-detail nodes that explain how Utopia, Capsize, color roles, layout response, and export bridges work.",
      nodes: [
        buildPreviewNode("catalog-preview-explain-colors", "Explain / Color Roles", {
          kind: "connector-detail",
          sectionId: "colors",
          badge: "Role logic",
          note: "Brand seed becomes semantic UI roles through relative OKLCH rules and mapping.",
          tokens: ["--color-brand-500", "--color-surface", "--color-foreground", "--color-border-default"],
        }),
        buildPreviewNode("catalog-preview-explain-capsize", "Explain / Capsize", {
          kind: "connector-detail",
          sectionId: "type",
          badge: "Capsize",
          note: "Font metrics drive cap trim, baseline trim, and line-height rhythm.",
          tokens: ["--font-family-sans", "--line-height-base", "--line-height-3xl"],
        }),
        buildPreviewNode("catalog-preview-explain-utopia", "Explain / Utopia", {
          kind: "connector-detail",
          sectionId: "type",
          badge: "Utopia",
          note: "A fluid type ratio expands into responsive type, spacing, and icon scales.",
          tokens: ["--font-size-base", "--font-size-3xl", "--space-400", "--icon-size-md"],
        }),
        buildPreviewNode("catalog-preview-explain-icons", "Explain / Icon Pairing", {
          kind: "connector-detail",
          sectionId: "type",
          badge: "Icon rule",
          note: "Icon container and stroke stay optically matched to the chosen font weights.",
          tokens: ["--icon-size-md", "--icon-stroke", "--font-size-base"],
        }),
        buildPreviewNode("catalog-preview-explain-layout", "Explain / Layout Response", {
          kind: "connector-detail",
          sectionId: "layout",
          badge: "Responsive recipe",
          note: "Layouts consume fluid spacing and type tokens instead of fixed breakpoint-only values.",
          tokens: ["--space-300", "--space-500", "--font-size-base"],
        }),
        buildPreviewNode("catalog-preview-explain-primitives", "Explain / Primitive Contract", {
          kind: "connector-detail",
          sectionId: "primitives",
          badge: "Primitive contract",
          note: "Primitives read the same generated token contract that the preview graph exposes.",
          tokens: ["--size-control-md", "--radius", "--color-surface"],
        }),
        buildPreviewNode("catalog-preview-explain-standards", "Explain / Export Bridge", {
          kind: "connector-detail",
          sectionId: "standards",
          badge: "Adapter logic",
          note: "Generated tokens bridge into DTCG documents and framework-specific variable layers.",
          tokens: ["--ds-font-size-base", "--default-font-family", "--space-4"],
        }),
      ],
    }

    const typeSection: NodeCatalogSection = {
      id: "system-type",
      mode: "system-canvas",
      label: "System Canvas / Type + Icons",
      description: "Font metrics, fluid type scales, icon stroke pairing, library selection, and icon tiers.",
      nodes: [
        buildPreviewNode("catalog-preview-font-sans", "Font / Sans Metrics", {
          kind: "font-family",
          badge: "Capsize metrics",
          cssVar: "--font-size-base",
          secondaryVar: "--line-height-base",
          fontFamilyVar: "--font-family-sans",
          sampleText: baseType?.sampleText,
          scaleItems: typeScaleItems,
          viewportSamples: buildTypeViewportSamples(baseType),
          mappings: [
            { label: "Body weight", value: String(activeFontWeightSans) },
            { label: "Fluid size", value: baseType?.clamp || "—" },
          ],
        }),
        buildPreviewNode("catalog-preview-font-display", "Font / Display Metrics", {
          kind: "font-family",
          badge: "Capsize metrics",
          cssVar: "--font-size-3xl",
          secondaryVar: "--line-height-3xl",
          fontFamilyVar: "--font-family-display",
          sampleText: displayType?.sampleText,
          scaleItems: typeScaleItems,
          viewportSamples: buildTypeViewportSamples(displayType),
          mappings: [
            { label: "Display weight", value: String(activeFontWeightDisplay) },
            { label: "Fluid size", value: displayType?.clamp || "—" },
          ],
        }),
        buildPreviewNode("catalog-preview-type-base", "Type / Base Scale", {
          kind: "type-scale",
          badge: "Utopia + Capsize",
          cssVar: "--font-size-base",
          secondaryVar: "--line-height-base",
          fontFamilyVar: "--font-family-sans",
          sampleText: baseType?.sampleText,
          note: baseType ? `${baseType.minPx}-${baseType.maxPx}px fluid size` : undefined,
          scaleItems: typeScaleItems,
          viewportSamples: buildTypeViewportSamples(baseType),
        }, "text"),
        buildPreviewNode("catalog-preview-type-display", "Type / Display Scale", {
          kind: "type-scale",
          badge: "Utopia + Capsize",
          cssVar: "--font-size-3xl",
          secondaryVar: "--line-height-3xl",
          fontFamilyVar: "--font-family-display",
          sampleText: displayType?.sampleText,
          note: displayType ? `${displayType.minPx}-${displayType.maxPx}px fluid size` : undefined,
          scaleItems: typeScaleItems,
          viewportSamples: buildTypeViewportSamples(displayType),
        }, "text"),
        buildPreviewNode("catalog-preview-stroke-pair", "Icon / Stroke Pair", {
          kind: "stroke-pair",
          badge: "Font + icon pair",
          cssVar: "--icon-size-md",
          secondaryVar: "--font-size-base",
          fontFamilyVar: "--font-family-sans",
          paddingVar: "--line-height-base",
          iconLibraryId: activeIconLibraryId,
          sampleText: "Stroke weight tracks the body rhythm.",
          scaleItems: iconScaleItems,
          viewportSamples: buildIconViewportSamples(iconMd),
          mappings: [
            { label: "Stroke", value: designSystem.cssVars["--icon-stroke"] || "—" },
            { label: "Suggested stroke", value: recommendedStrokeRange },
          ],
        }, "icon"),
        buildPreviewNode("catalog-preview-icon-library", "Icon / Library", {
          kind: "icon-library",
          badge: "Icon library",
          cssVar: "--icon-size-md",
          iconLibraryId: activeIconLibraryId,
          iconKeys: ["type", "grid", "split", "accent", "action", "search"],
          note: `${activeIconLibraryLabel} icons are active for the preview graph.`,
          scaleItems: iconScaleItems,
          viewportSamples: buildIconViewportSamples(iconMd),
        }, "icon"),
        buildPreviewNode("catalog-preview-icon-scale", "Icon / Action Scale", {
          kind: "icon-scale",
          badge: "Icon tier",
          cssVar: "--icon-size-md",
          iconLibraryId: activeIconLibraryId,
          note: iconMd ? `${iconMd.minPx}-${iconMd.maxPx}px aligned to body line height` : undefined,
          scaleItems: iconScaleItems,
          viewportSamples: buildIconViewportSamples(iconMd),
          mappings: [
            { label: "Paired tier", value: iconMd?.pairedTypographyId || "—" },
            { label: "Large tier", value: iconXl?.pairedTypographyId || "—" },
          ],
        }, "icon"),
      ],
    }

    const stackLayout = designSystem.layouts.find((layout) => layout.id === "stack-flow")
    const gridLayout = designSystem.layouts.find((layout) => layout.id === "feature-grid")
    const splitLayout = designSystem.layouts.find((layout) => layout.id === "hero-split")

    const layoutSection: NodeCatalogSection = {
      id: "system-layout",
      mode: "system-canvas",
      label: "System Canvas / Layouts",
      description: "Responsive layout recipes built from the same fluid type, space, and icon system.",
      nodes: [
        buildPreviewNode("catalog-preview-layout-stack", "Layout / Stack Flow", {
          kind: "layout-stack",
          badge: "Layout recipe",
          gapVar: "--space-300",
          paddingVar: "--space-400",
          iconLibraryId: activeIconLibraryId,
          viewportSamples: buildLayoutViewportSamples(stackLayout, baseType, iconMd),
        }),
        buildPreviewNode("catalog-preview-layout-grid", "Layout / Feature Grid", {
          kind: "layout-grid",
          badge: "Layout recipe",
          gapVar: "--space-400",
          paddingVar: "--space-500",
          columns: 3,
          iconLibraryId: activeIconLibraryId,
          viewportSamples: buildLayoutViewportSamples(gridLayout, baseType, iconMd),
        }),
        buildPreviewNode("catalog-preview-layout-split", "Layout / Hero Split", {
          kind: "layout-split",
          badge: "Layout recipe",
          gapVar: "--space-600",
          paddingVar: "--space-600",
          iconLibraryId: activeIconLibraryId,
          viewportSamples: buildLayoutViewportSamples(splitLayout, displayType, iconXl),
        }),
      ],
    }

    const primitivesSection: NodeCatalogSection = {
      id: "system-primitives",
      mode: "system-canvas",
      label: "System Canvas / Primitives",
      description: "Web-native primitives that consume the generated token contract directly.",
      nodes: [
        buildPreviewNode("catalog-preview-primitive-text", "Primitive / Text", {
          kind: "primitive-text",
          badge: "Primitive",
          sampleText: "The same token contract now renders directly on the canvas.",
        }, "text"),
        buildPreviewNode("catalog-preview-primitive-heading", "Primitive / Heading", {
          kind: "primitive-heading",
          badge: "Primitive",
          sampleText: "Generated display primitives",
        }, "text"),
        buildPreviewNode("catalog-preview-primitive-button", "Primitive / Button", {
          kind: "primitive-button",
          badge: "Primitive",
          sampleText: "Preview CTA",
          size: "md",
          variant: "primary",
        }, "accent"),
        buildPreviewNode("catalog-preview-primitive-surface", "Primitive / Surface", {
          kind: "primitive-surface",
          badge: "Primitive",
          sampleText: "Preview generated from the design-system API",
          note: "Surface, border, radius, shadow, and type all resolve from generated vars.",
        }, "surface"),
      ],
    }

    const standardsSection: NodeCatalogSection = {
      id: "system-standards",
      mode: "system-canvas",
      label: "System Canvas / Standards",
      description: "Export and adapter nodes for DTCG-style tokens and Radix Themes bridges.",
      nodes: [
        buildPreviewNode("catalog-preview-dtcg", "Token Standard / DTCG", {
          kind: "token-standard",
          badge: "DTCG export",
          note: "Design tokens exported as a standard document with cssVar + alias metadata.",
          mappings: [
            { label: "Token count", value: String(designSystem.tokens.length) },
            { label: "Alias vars", value: String(Object.keys(designSystem.aliasVars).length) },
          ],
          codeLanguage: "json",
          code: designSystem.dtcgJson,
        }),
        buildPreviewNode("catalog-preview-radix", "Radix / Theme Bridge", {
          kind: "radix-theme",
          badge: "Radix adapter",
          note: "Maps ds-scale aliases into Radix Themes variables and accent tokens.",
          mappings: designSystem.radix.mappings.slice(0, 8).map((mapping) => ({
            label: mapping.radixVar,
            value: mapping.sourceVar,
          })),
          codeLanguage: "css",
          code: `${designSystem.radix.layersCssText}\n\n${designSystem.radix.cssText}`,
        }),
      ],
    }

    return [
      buildColorAuditManualCatalogSection(),
      ...COLOR_TEMPLATE_KITS.map((kit) => buildTemplateCatalogSection(kit)),
      colorSupportSection,
      explainersSection,
      typeSection,
      layoutSection,
      primitivesSection,
      standardsSection,
    ]
  }, [
    activeFontWeightDisplay,
    activeFontWeightSans,
    activeIconLibraryId,
    catalogOnly,
    designSystem.aliasVars,
    designSystem.config.maxViewportPx,
    designSystem.config.minViewportPx,
    designSystem.cssVars,
    designSystem.dtcgJson,
    designSystem.icons,
    designSystem.layouts,
    designSystem.radix.cssText,
    designSystem.radix.layersCssText,
    designSystem.radix.mappings,
    designSystem.spacing,
    designSystem.tokens.length,
    designSystem.typography,
    tokenValues,
  ])
  const allNodeCatalogNodes = useMemo(
    () => allNodeCatalogSections.flatMap((section) => section.nodes),
    [allNodeCatalogSections]
  )
  const workspaceCatalogSections = useMemo<WorkspaceCatalogSection[]>(
    () => [
      {
        id: "canvas-workspace-basics",
        label: "Canvas / Workspace basics",
        description: "Top-level freeform and grouped items in the general Canvas mode.",
        items: [
          {
            id: "workspace-artboard",
            label: "Artboard",
            kind: "Layout container",
            description: "Groups sections, layout children, and theme/audit context on one board.",
            previewKind: "artboard",
          },
          {
            id: "workspace-component",
            label: "Component Variant",
            kind: "Interactive component",
            description: "A rendered gallery component variant with props, states, and layout placement.",
            previewKind: "component",
          },
          {
            id: "workspace-embed",
            label: "Embed Preview",
            kind: "External content",
            description: "Website or app preview via iframe, live mode, or captured snapshot.",
            previewKind: "embed",
          },
        ],
      },
      {
        id: "canvas-workspace-rich-content",
        label: "Canvas / Rich content",
        description: "Media, notes, and diagram surfaces available in the main Canvas workspace.",
        items: [
          {
            id: "workspace-media",
            label: "Media Asset",
            kind: "Image / video / GIF",
            description: "Dropped or imported visual assets with fit, poster, and playback controls.",
            previewKind: "media",
          },
          {
            id: "workspace-mermaid",
            label: "Mermaid Diagram",
            kind: "Diagram node",
            description: "Structured Mermaid source rendered directly on the board and editable in props.",
            previewKind: "mermaid",
          },
          {
            id: "workspace-excalidraw",
            label: "Excalidraw Sketch",
            kind: "Wireframe / whiteboard",
            description: "Loose wireframes, rough flows, and diagram sketches stored as Excalidraw scenes.",
            previewKind: "excalidraw",
          },
          {
            id: "workspace-markdown",
            label: "Markdown Note",
            kind: "Documentation node",
            description: "Notes, specs, and imported markdown files that live beside components and diagrams.",
            previewKind: "markdown",
          },
        ],
      },
    ],
    []
  )
  const nodeCatalogWorkspaceKey = themeStorageKeyPrefix || "gallery-node-catalog"
  const nodeCatalogWorkspaceSectionResources = useMemo<NodeCatalogWorkspaceSectionResource[]>(
    () =>
      workspaceCatalogSections.map((section) => ({
        id: section.id,
        label: section.label,
        description: section.description,
        items: section.items.map((item) => ({
          id: item.id,
          label: item.label,
          kind: item.kind,
          description: item.description,
          previewKind: item.previewKind,
        })),
      })),
    [workspaceCatalogSections]
  )
  const nodeCatalogNodeSectionResources = useMemo<NodeCatalogNodeSectionResource[]>(
    () =>
      allNodeCatalogSections.map((section) => ({
        id: section.id,
        mode: section.mode,
        label: section.label,
        description: section.description,
        nodes: section.nodes.map((node) => ({
          id: node.id,
          label: getDisplayNodeLabelFromNode(node),
          type: node.type,
          role: node.role,
          framework: node.framework,
          semanticKind: node.semanticKind,
          group: node.group,
          previewKind: node.preview?.kind,
        })),
      })),
    [allNodeCatalogSections]
  )
  const scrollToCatalogSection = useCallback((id: string) => {
    if (typeof document === "undefined") return
    document.getElementById(`node-catalog-section-${id}`)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    })
  }, [])
  const allNodeCatalogNodesById = useMemo(
    () =>
      allNodeCatalogNodes.reduce<Record<string, ColorCanvasNode>>((acc, node) => {
        acc[node.id] = node
        return acc
      }, {}),
    [allNodeCatalogNodes]
  )
  const nodeCatalogPreviewNode = useMemo(
    () => allNodeCatalogNodes.find((node) => node.preview) ?? allNodeCatalogNodes[0] ?? null,
    [allNodeCatalogNodes]
  )
  const nodeCatalogWorkspaceStateResource = useMemo(
    () =>
      buildNodeCatalogWorkspaceStateResource({
        workspaceKey: nodeCatalogWorkspaceKey,
        stateSummary: {
          selection: [],
          itemCount: workspaceCatalogSections.reduce(
            (total, section) => total + section.items.length,
            0
          ),
          nodeCount: allNodeCatalogSections.reduce(
            (total, section) => total + section.nodes.length,
            0
          ),
          groupCount: workspaceCatalogSections.length + allNodeCatalogSections.length,
        },
        workspaceSections: nodeCatalogWorkspaceSectionResources,
        nodeSections: nodeCatalogNodeSectionResources,
        statePreview: {
          sampleNodeId: nodeCatalogPreviewNode?.id ?? null,
          sampleNodeLabel: nodeCatalogPreviewNode
            ? getDisplayNodeLabelFromNode(nodeCatalogPreviewNode)
            : null,
          states: ["default", "selected", "highlighted", "dimmed"],
        },
      }),
    [
      allNodeCatalogSections,
      nodeCatalogNodeSectionResources,
      nodeCatalogPreviewNode,
      nodeCatalogWorkspaceKey,
      nodeCatalogWorkspaceSectionResources,
      workspaceCatalogSections,
    ]
  )
  const getCatalogNodeColor = useCallback(
    (nodeId: string) => allNodeCatalogNodesById[nodeId]?.value || null,
    [allNodeCatalogNodesById]
  )
  const getCatalogNodeExpression = useCallback((nodeId: string) => {
    const node = allNodeCatalogNodesById[nodeId]
    if (!node) return null
    return node.value || (node.cssVar ? `var(${node.cssVar})` : null)
  }, [allNodeCatalogNodesById])
  const getCatalogNodeIsP3 = useCallback((nodeId: string) => {
    const node = allNodeCatalogNodesById[nodeId]
    if (!node?.value) return false
    if (node.value.startsWith("color(display-p3")) return true
    const parsed = parseOklch(node.value)
    return parsed ? isOutOfGamut(oklchToLinearSrgb(parsed)) : false
  }, [allNodeCatalogNodesById])
  const getCatalogNodeLabel = useCallback(
    (nodeId: string) => getDisplayNodeLabelFromNode(allNodeCatalogNodesById[nodeId]) || nodeId,
    [allNodeCatalogNodesById]
  )
  const systemSectionFrames = useMemo(() => {
    if (isRelationshipMode) return [] as CanvasSectionFrame[]

    return SYSTEM_SECTION_ORDER.reduce<CanvasSectionFrame[]>((acc, sectionId) => {
      const sectionNodes = renderedNodes.filter((node) => getSystemSectionId(node) === sectionId)
      if (sectionNodes.length === 0) return acc

      const meta = SYSTEM_SECTION_META[sectionId]
      const bounds = sectionNodes.reduce(
        (result, node) => {
          const size = getNodeSize(node)
          return {
            minX: Math.min(result.minX, node.position.x),
            minY: Math.min(result.minY, node.position.y),
            maxX: Math.max(result.maxX, node.position.x + size.width),
            maxY: Math.max(result.maxY, node.position.y + size.height),
          }
        },
        {
          minX: Number.POSITIVE_INFINITY,
          minY: Number.POSITIVE_INFINITY,
          maxX: 0,
          maxY: 0,
        }
      )

      acc.push({
        id: sectionId,
        label: meta.label,
        description: meta.description,
        nodeIds: sectionNodes.map((node) => node.id),
        x: Math.max(16, bounds.minX - 16),
        y: Math.max(16, bounds.minY - 52),
        width: bounds.maxX - bounds.minX + 32,
        height: bounds.maxY - bounds.minY + 76,
      })
      return acc
    }, [])
  }, [getNodeSize, isRelationshipMode, renderedNodes])
  const colorAuditSectionFrames = useMemo(() => {
    if (
      canvasMode !== "color-audit" ||
      isRelationshipMode ||
      colorAuditLayoutMode === "freeform"
    ) {
      return [] as CanvasSectionFrame[]
    }

    const laneMeta = COLOR_AUDIT_LANE_META[colorAuditLayoutMode]
    const laneOrder = Object.keys(laneMeta)

    return laneOrder.reduce<CanvasSectionFrame[]>((acc, laneId) => {
      const laneNodes = renderedNodes.filter((node) => {
        if (colorAuditLayoutMode === "flow" || colorAuditLayoutMode === "center") {
          return getColorAuditStructuredLaneId(node, colorAuditLayoutMode) === laneId
        }
        return inferColorAuditRoleLane(node) === laneId
      })
      if (laneNodes.length === 0) return acc

      const bounds = laneNodes.reduce(
        (result, node) => {
          const size = getNodeSize(node)
          return {
            minX: Math.min(result.minX, node.position.x),
            minY: Math.min(result.minY, node.position.y),
            maxX: Math.max(result.maxX, node.position.x + size.width),
            maxY: Math.max(result.maxY, node.position.y + size.height),
          }
        },
        {
          minX: Number.POSITIVE_INFINITY,
          minY: Number.POSITIVE_INFINITY,
          maxX: 0,
          maxY: 0,
        }
      )

      const meta = laneMeta[laneId]
      acc.push({
        id: laneId,
        label: meta.label,
        description: meta.description,
        nodeIds: laneNodes.map((node) => node.id),
        x: Math.max(16, bounds.minX - 16),
        y: Math.max(16, bounds.minY - 52),
        width: bounds.maxX - bounds.minX + 32,
        height: bounds.maxY - bounds.minY + 76,
      })
      return acc
    }, [])
  }, [canvasMode, colorAuditLayoutMode, getNodeSize, isRelationshipMode, renderedNodes])
  const visibleSectionFrames = canvasMode === "color-audit" ? colorAuditSectionFrames : systemSectionFrames
  const canvasContentSize = useMemo(() => {
    const maxX = renderedNodes.reduce(
      (currentMax, node) => Math.max(currentMax, node.position.x + getNodeSize(node).width),
      0
    )
    const maxY = renderedNodes.reduce(
      (currentMax, node) => Math.max(currentMax, node.position.y + getNodeSize(node).height),
      0
    )
    const sectionMaxX = visibleSectionFrames.reduce(
      (currentMax, section) => Math.max(currentMax, section.x + section.width),
      0
    )
    const sectionMaxY = visibleSectionFrames.reduce(
      (currentMax, section) => Math.max(currentMax, section.y + section.height),
      0
    )

    return {
      width: Math.max(
        1280,
        systemCanvasViewportSize.width + 96,
        autoLayoutPlan.width,
        maxX + 160,
        sectionMaxX + 120
      ),
      height: Math.max(
        880,
        systemCanvasViewportSize.height + 96,
        autoLayoutPlan.height,
        maxY + 160,
        sectionMaxY + 120
      ),
    }
  }, [
    autoLayoutPlan.height,
    autoLayoutPlan.width,
    getNodeSize,
    renderedNodes,
    systemCanvasViewportSize.height,
    systemCanvasViewportSize.width,
    visibleSectionFrames,
  ])
  const systemCanvasViewportItems = useMemo(
    () => [
      ...renderedNodes.map((node) => ({
        position: node.position,
        size: getNodeSize(node),
      })),
      ...visibleSectionFrames.map((section) => ({
        position: { x: section.x, y: section.y },
        size: { width: section.width, height: section.height },
      })),
    ],
    [getNodeSize, renderedNodes, visibleSectionFrames]
  )
  const visibleNodeIds = useMemo(() => new Set(renderedNodes.map((node) => node.id)), [renderedNodes])
  const handleArrangeColorAudit = useCallback(
    (mode: ColorAuditLayoutMode) => {
      setColorAuditLayoutMode(mode)
      if (mode === "freeform") return
      const viewportWidth = systemCanvasViewportSize.width || workspaceRef.current?.clientWidth || 1280
      const positions = buildColorAuditLayout(visibleNodes, getNodeSize, mode, viewportWidth)
      visibleNodes.forEach((node) => {
        const position = positions[node.id]
        if (!position) return
        moveNode(node.id, position)
      })
      setPendingColorAuditViewportAction("bird-view")
    },
    [
      getNodeSize,
      moveNode,
      setColorAuditLayoutMode,
      setPendingColorAuditViewportAction,
      systemCanvasViewportSize.width,
      visibleNodes,
    ]
  )
  const systemNodeRequirements = useMemo(
    () => [
      {
        label: "Color rules",
        count: nodes.filter(
          (node) =>
            node.group === "system-support" &&
            (node.label.startsWith("Color /") || node.label.startsWith("Color Rule /"))
        ).length,
        required: 5,
      },
      {
        label: "Support roles",
        count: nodes.filter(
          (node) => node.group === "system-support" && node.type === "semantic"
        ).length,
        required: 5,
      },
      {
        label: "Font metrics",
        count: nodes.filter((node) => node.preview?.kind === "font-family").length,
        required: 2,
      },
      {
        label: "Type scales",
        count: nodes.filter((node) => node.preview?.kind === "type-scale").length,
        required: 2,
      },
      {
        label: "Icon system",
        count: nodes.filter(
          (node) =>
            node.preview?.kind === "stroke-pair" ||
            node.preview?.kind === "icon-scale" ||
            node.preview?.kind === "icon-library"
        ).length,
        required: 3,
      },
      {
        label: "Layouts",
        count: nodes.filter(
          (node) =>
            node.preview?.kind === "layout-stack" ||
            node.preview?.kind === "layout-grid" ||
            node.preview?.kind === "layout-split"
        ).length,
        required: 3,
      },
      {
        label: "Primitives",
        count: nodes.filter(
          (node) =>
            node.preview?.kind === "primitive-text" ||
            node.preview?.kind === "primitive-heading" ||
            node.preview?.kind === "primitive-button" ||
            node.preview?.kind === "primitive-surface"
        ).length,
        required: 4,
      },
      {
        label: "Standards",
        count: nodes.filter(
          (node) =>
            node.preview?.kind === "token-standard" || node.preview?.kind === "radix-theme"
        ).length,
        required: 2,
      },
    ],
    [nodes]
  )
  const selectedEdge = selectedEdgeId
    ? manualEdges.find((edge) => edge.id === selectedEdgeId) ?? null
    : null
  const selectedPreviewRgba = selectedNode ? resolveNodeRgba(selectedNode.id) : null
  const selectedPreviewColor = selectedNode ? getNodeColor(selectedNode.id) : null
  const selectedPreviewIsP3 = selectedNode ? getNodeIsP3(selectedNode.id) : false
  const previewSurfaceReferenceColor =
    tokenValues["--color-surface-50"] ||
    tokenValues["--color-surface"] ||
    tokenValues["--background"] ||
    "#ffffff"
  const previewForegroundReferenceColor =
    tokenValues["--color-foreground"] ||
    tokenValues["--foreground"] ||
    tokenValues["--color-text"] ||
    "#111827"
  const previewInverseReferenceColor =
    tokenValues["--color-foreground-inverse"] ||
    tokenValues["--primary-foreground"] ||
    "#ffffff"
  const selectedQuickEditRgba = useMemo(() => {
    if (selectedPreviewRgba) return selectedPreviewRgba
    if (!selectedNode) return null

    const fallbackExpression =
      selectedNode.value || (selectedNode.cssVar ? tokenValues[selectedNode.cssVar] : "") || ""

    return fallbackExpression ? resolveExpressionColor(fallbackExpression) : null
  }, [resolveExpressionColor, selectedNode, selectedPreviewRgba, tokenValues])
  const selectedQuickEditHex = selectedQuickEditRgba ? rgbaToHex(selectedQuickEditRgba) : "#000000"
  const relativeSpec =
    selectedNode?.type === "relative"
      ? { ...DEFAULT_RELATIVE_SPEC, ...(selectedNode.relative ?? {}) }
      : null
  const autoContrastEdges = useMemo<DisplayEdge[]>(() => {
    if (!autoContrastEnabled || !isRelationshipMode) return []
    const activeRules = contrastRules.filter((rule) => rule.enabled)
    if (activeRules.length === 0) return []
    const manualContrastEdges = manualEdges.filter((edge) => edge.type === "contrast")
    const manualPairKeys = new Set(
      manualContrastEdges.map((edge) => [edge.sourceId, edge.targetId].sort().join("|"))
    )
    const seen = new Set<string>()
    const nextEdges: DisplayEdge[] = []
    activeRules.forEach((rule) => {
      const foregroundNodes = nodes.filter(
        (node) =>
          node.type !== "component" &&
          nodeMatchesRole(node, rule.foregroundRole) &&
          Boolean(getNodeColor(node.id))
      )
      const backgroundNodes = nodes.filter(
        (node) =>
          node.type !== "component" &&
          nodeMatchesRole(node, rule.backgroundRole) &&
          Boolean(getNodeColor(node.id))
      )
      foregroundNodes.forEach((foreground) => {
        backgroundNodes.forEach((background) => {
          if (foreground.id === background.id) return
          if (getEdgeContrastRaw(foreground.id, background.id) === null) return
          const pairKey = [foreground.id, background.id].sort().join("|")
          if (manualPairKeys.has(pairKey)) return
          const edgeId = `auto-${rule.id}-${foreground.id}-${background.id}`
          if (seen.has(edgeId)) return
          seen.add(edgeId)
          nextEdges.push({
            id: edgeId,
            sourceId: foreground.id,
            targetId: background.id,
            type: "contrast",
            rule: { model: DEFAULT_COLOR_MODEL, targetLc: rule.targetLc },
            auto: true,
            ruleId: rule.id,
          })
        })
      })
    })
    return nextEdges
  }, [
    autoContrastEnabled,
    contrastRules,
    getEdgeContrastRaw,
    getNodeColor,
    isRelationshipMode,
    manualEdges,
    nodes,
  ])

  const resolvedSelectedAutoEdge = useMemo(() => {
    if (!selectedAutoEdgeId) return null
    return autoContrastEdges.find((edge) => edge.id === selectedAutoEdgeId) ?? null
  }, [autoContrastEdges, selectedAutoEdgeId])

  const selectedEdgeData = resolvedSelectedAutoEdge ?? selectedEdge
  const hasActiveEdgeSelection = selectedEdgeData !== null
  const highlightedConnectionNodeIds = useMemo(() => {
    if (!selectedEdgeData) return new Set<string>()
    return new Set([selectedEdgeData.sourceId, selectedEdgeData.targetId])
  }, [selectedEdgeData])

  const visibleEdges: DisplayEdge[] = useMemo(() => {
    const supportsContrastEdges = isRelationshipMode
    const manual =
      edgeFilter === "all"
        ? manualEdges
        : manualEdges.filter((edge) => edge.type === edgeFilter)

    const filteredManual = manual.filter((edge) => {
      if (!visibleNodeIds.has(edge.sourceId) || !visibleNodeIds.has(edge.targetId)) return false
      if (!supportsContrastEdges && edge.type === "contrast") return false
      return true
    })

    if (edgeFilter === "map" || !supportsContrastEdges) return filteredManual

    return [
      ...filteredManual,
      ...autoContrastEdges.filter(
        (edge) => visibleNodeIds.has(edge.sourceId) && visibleNodeIds.has(edge.targetId)
      ),
    ]
  }, [autoContrastEdges, edgeFilter, isRelationshipMode, manualEdges, visibleNodeIds])

  const contrastEdges: DisplayEdge[] = useMemo(() => {
    if (!isRelationshipMode) return []
    const manual = manualEdges.filter(
      (edge) =>
        edge.type === "contrast" &&
        visibleNodeIds.has(edge.sourceId) &&
        visibleNodeIds.has(edge.targetId)
    )
    const auto = autoContrastEdges.filter(
      (edge) => visibleNodeIds.has(edge.sourceId) && visibleNodeIds.has(edge.targetId)
    )
    return [...manual, ...auto]
  }, [autoContrastEdges, isRelationshipMode, manualEdges, visibleNodeIds])
  const nodeContrastEdges = useMemo(() => {
    if (!selectedNode) return []
    return contrastEdges.filter(
      (edge) => edge.sourceId === selectedNode.id || edge.targetId === selectedNode.id
    )
  }, [contrastEdges, selectedNode])
  const selectedNodeIncomingMapEdges = useMemo(() => {
    if (!selectedNode) return []
    return edges.filter(
      (edge) =>
        edge.type === "map" &&
        edge.targetId === selectedNode.id &&
        Boolean(nodesById[edge.sourceId])
    )
  }, [edges, nodesById, selectedNode])
  const selectedNodeOutgoingMapEdges = useMemo(() => {
    if (!selectedNode) return []
    return edges.filter(
      (edge) =>
        edge.type === "map" &&
        edge.sourceId === selectedNode.id &&
        Boolean(nodesById[edge.targetId])
    )
  }, [edges, nodesById, selectedNode])
  const getContrastRuleForRoles = useCallback(
    (
      foregroundRole?: NonNullable<ColorCanvasNode["role"]>,
      backgroundRole?: NonNullable<ColorCanvasNode["role"]>
    ) => {
      if (!foregroundRole || !backgroundRole) return null
      return (
        contrastRules.find(
          (rule) =>
            rule.enabled &&
            rule.foregroundRole === foregroundRole &&
            rule.backgroundRole === backgroundRole
        ) ?? null
      )
    },
    [contrastRules]
  )
  const selectedForegroundComparisons = useMemo(() => {
    if (!selectedNode || selectedNode.type === "component" || selectedNode.preview) return []
    const selectedColor = getNodeColor(selectedNode.id)
    if (!selectedColor) return []
    const selectedIntent = inferContrastIntent(selectedNode)
    if (selectedIntent === "background") return []

    return nodes
      .filter(
        (node) =>
          node.id !== selectedNode.id &&
          node.type !== "component" &&
          !node.preview &&
          Boolean(getNodeColor(node.id)) &&
          inferContrastIntent(node) !== "foreground"
      )
      .map((node) => ({
        node,
        comparisonColor: getNodeColor(node.id) as string,
        lc: getEdgeContrastRaw(selectedNode.id, node.id),
        rule: getContrastRuleForRoles(selectedNode.role, node.role),
      }))
      .sort((left, right) => {
        const leftRuleScore = Number(Boolean(left.rule))
        const rightRuleScore = Number(Boolean(right.rule))
        if (leftRuleScore !== rightRuleScore) return rightRuleScore - leftRuleScore
        if ((left.node.role || "") !== (right.node.role || "")) {
          return (left.node.role || "").localeCompare(right.node.role || "")
        }
        return left.node.label.localeCompare(right.node.label)
      })
  }, [getContrastRuleForRoles, getEdgeContrastRaw, getNodeColor, nodes, selectedNode])
  const selectedBackgroundComparisons = useMemo(() => {
    if (!selectedNode || selectedNode.type === "component" || selectedNode.preview) return []
    const selectedColor = getNodeColor(selectedNode.id)
    if (!selectedColor) return []
    const selectedIntent = inferContrastIntent(selectedNode)
    if (selectedIntent === "foreground") return []

    return nodes
      .filter(
        (node) =>
          node.id !== selectedNode.id &&
          node.type !== "component" &&
          !node.preview &&
          Boolean(getNodeColor(node.id)) &&
          inferContrastIntent(node) !== "background"
      )
      .map((node) => ({
        node,
        comparisonColor: getNodeColor(node.id) as string,
        lc: getEdgeContrastRaw(node.id, selectedNode.id),
        rule: getContrastRuleForRoles(node.role, selectedNode.role),
      }))
      .sort((left, right) => {
        const leftRuleScore = Number(Boolean(left.rule))
        const rightRuleScore = Number(Boolean(right.rule))
        if (leftRuleScore !== rightRuleScore) return rightRuleScore - leftRuleScore
        if ((left.node.role || "") !== (right.node.role || "")) {
          return (left.node.role || "").localeCompare(right.node.role || "")
        }
        return left.node.label.localeCompare(right.node.label)
      })
  }, [getContrastRuleForRoles, getEdgeContrastRaw, getNodeColor, nodes, selectedNode])
  const colorAuditExportEntries = useMemo<ColorAuditExportEntryResource[]>(() => {
    const usedCssVars = new Set<string>()

    return nodes
      .filter((node) => node.type !== "component" && !node.preview)
      .flatMap((node) => {
        const resolvedExpression = getNodeColorExpression(node.id) || getNodeColor(node.id)
        if (!resolvedExpression) return []

        const family: ColorAuditExportEntryResource["family"] =
          node.type === "token"
            ? "palette"
            : node.type === "relative"
              ? "relative"
              : isFunctionalTokenNode(node)
                ? "functional"
                : "semantic"

        const fallbackCssVar =
          node.cssVar ||
          (family === "semantic"
            ? `--semantic-${slugifyTokenLabel(node.label)}`
            : family === "functional"
              ? `--alias-${slugifyTokenLabel(node.label)}`
              : family === "relative"
                ? `--rule-${slugifyTokenLabel(node.label)}`
                : `--token-${slugifyTokenLabel(node.label)}`)

        if (usedCssVars.has(fallbackCssVar)) return []
        usedCssVars.add(fallbackCssVar)

        return [
          {
            id: node.id,
            label: node.label,
            cssVar: fallbackCssVar,
            exportKey: fallbackCssVar.replace(/^--/, ""),
            family,
            role: node.role,
            framework: node.framework,
            semanticKind: node.semanticKind,
            resolvedExpression,
            oklchExpression: (() => {
              const oklch = resolveNodeOklch(node.id)
              return oklch ? formatOklchCssValue(oklch) : undefined
            })(),
          },
        ]
      })
  }, [getNodeColor, getNodeColorExpression, nodes, resolveNodeOklch])
  const colorAuditProjectExportEntries = useMemo(() => {
    return colorAuditExportEntries.filter((entry) => {
      if (entry.family === "palette" || entry.family === "relative") return false
      const hasMapping = edges.some((edge) => edge.type === "map" && edge.targetId === entry.id)
      const hasOverride = Boolean(nodesById[entry.id]?.value)
      return hasMapping || hasOverride
    })
  }, [colorAuditExportEntries, edges, nodesById])
  const colorAuditWorkflow = useMemo(() => {
    const inputs = nodes.filter((node) => node.type === "token" && !node.preview)
    const relativeRules = nodes.filter((node) => node.type === "relative" && !node.preview)
    const functionalAliases = nodes.filter((node) => isFunctionalTokenNode(node) && !node.preview)
    const semanticRoles = nodes.filter(
      (node) => node.type === "semantic" && node.semanticKind !== "functional" && !node.preview
    )
    const mappedSemanticRoles = semanticRoles.filter((node) =>
      edges.some((edge) => edge.type === "map" && edge.targetId === node.id)
    )
    const textRoleReady = semanticRoles.some(
      (node) => node.role === "text" && Boolean(getNodeColor(node.id))
    )
    const surfaceRoleReady = semanticRoles.some(
      (node) => node.role === "surface" && Boolean(getNodeColor(node.id))
    )
    const frameworkAliasesReady = functionalAliases.filter((node) =>
      edges.some((edge) => edge.type === "map" && edge.targetId === node.id)
    ).length

    return {
      inputs: inputs.length,
      relativeRules: relativeRules.length,
      functionalAliases: functionalAliases.length,
      semanticRoles: semanticRoles.length,
      mappedSemanticRoles: mappedSemanticRoles.length,
      exportableTokens: colorAuditProjectExportEntries.length,
      textRoleReady,
      surfaceRoleReady,
      contrastPairs: contrastEdges.filter((edge) => getEdgeContrast(edge) !== null).length,
      frameworkAliasesReady,
      genericReady:
        inputs.length > 0 &&
        textRoleReady &&
        surfaceRoleReady &&
        colorAuditProjectExportEntries.length > 0,
      frameworkReady:
        functionalAliases.length > 0 &&
        frameworkAliasesReady > 0 &&
        textRoleReady &&
        surfaceRoleReady,
    }
  }, [colorAuditProjectExportEntries.length, contrastEdges, edges, getEdgeContrast, getNodeColor, nodes])
  const colorAuditExportFormats = useMemo(() => {
    const formatEntryExpression = (entry: ColorAuditExportEntryResource) =>
      selectedColorAuditExportColorMode === "oklch"
        ? entry.oklchExpression || entry.resolvedExpression
        : entry.resolvedExpression
    const projectEntries = colorAuditProjectExportEntries
    const cssVarsText =
      projectEntries.length === 0
        ? "/* No mapped semantic roles or functional aliases are ready to export yet. */"
        : `:root {\n${projectEntries
            .map((entry) => `  ${entry.cssVar}: ${formatEntryExpression(entry)};`)
            .join("\n")}\n}`

    const dtcgRoot: Record<string, unknown> = {}
    projectEntries.forEach((entry) => {
      const path = [
        entry.family,
        entry.framework ? entry.framework : null,
        entry.exportKey.replace(/^color-/, ""),
      ].filter(Boolean) as string[]
      assignNestedToken(dtcgRoot, path, {
        $value: formatEntryExpression(entry),
        $type: "color",
        $extensions: {
          cssVar: entry.cssVar,
          role: entry.role ?? null,
          framework: entry.framework ?? null,
          semanticKind: entry.semanticKind ?? null,
        },
      })
    })
    const dtcgText =
      projectEntries.length === 0
        ? '{\n  "color": {}\n}'
        : JSON.stringify({ color: dtcgRoot }, null, 2)

    const tailwindLines = projectEntries
      .filter((entry) => entry.family === "functional" || entry.family === "semantic")
      .map((entry) => {
        const baseKey =
          entry.family === "functional"
            ? entry.cssVar.replace(/^--/, "")
            : slugifyTokenLabel(entry.label)
        return `      ${toCamelCaseTokenKey(baseKey)}: "${formatEntryExpression(entry)}",`
      })
    const tailwindText =
      tailwindLines.length === 0
        ? "export default {\n  theme: {\n    extend: {\n      colors: {},\n    },\n  },\n}\n"
        : `export default {\n  theme: {\n    extend: {\n      colors: {\n${tailwindLines.join("\n")}\n      },\n    },\n  },\n}\n`

    const frameworkVars = (framework: ColorCanvasFrameworkId) => {
      const entries = projectEntries.filter((entry) => entry.framework === framework)
      if (entries.length === 0) {
        return `/* No mapped ${getFrameworkLabel(framework)} aliases are ready to export yet. */`
      }
      return `:root {\n${entries
        .map((entry) => `  ${entry.cssVar}: ${formatEntryExpression(entry)};`)
        .join("\n")}\n}`
    }

    return {
      "css-vars": cssVarsText,
      dtcg: dtcgText,
      tailwind: tailwindText,
      shadcn: frameworkVars("shadcn"),
      radix: frameworkVars("radix"),
    } satisfies Record<ColorAuditExportFormat, string>
  }, [colorAuditProjectExportEntries, selectedColorAuditExportColorMode])
  const selectedColorAuditExportText = colorAuditExportFormats[selectedColorAuditExportFormat]
  const selectedColorAuditExportFormatLabel =
    COLOR_AUDIT_EXPORT_FORMAT_OPTIONS.find((option) => option.id === selectedColorAuditExportFormat)
      ?.label ?? "Export"
  const colorAuditWorkspaceKey = themeStorageKeyPrefix
    ? `${themeStorageKeyPrefix}:color-audit`
    : "gallery-color-audit"
  const colorAuditWorkspaceNodes = useMemo(
    () =>
      nodes.filter(
        (node) =>
          !node.preview && node.group !== "system-support" && node.group !== "system-preview"
      ),
    [nodes]
  )
  const colorAuditWorkspaceNodeIds = useMemo(
    () => new Set(colorAuditWorkspaceNodes.map((node) => node.id)),
    [colorAuditWorkspaceNodes]
  )
  const colorAuditWorkspaceEdges = useMemo(
    () =>
      edges.filter(
        (edge) =>
          colorAuditWorkspaceNodeIds.has(edge.sourceId) && colorAuditWorkspaceNodeIds.has(edge.targetId)
      ),
    [colorAuditWorkspaceNodeIds, edges]
  )
  const colorAuditWorkspaceNodeResources = useMemo<ColorAuditNodeResource[]>(
    () =>
      colorAuditWorkspaceNodes.map((node) => ({
        id: node.id,
        type: node.type,
        label: node.label,
        role: node.role,
        framework: node.framework,
        semanticKind: node.semanticKind,
        cssVar: node.cssVar,
        value: node.value,
        group: node.group,
        position: node.position,
        size: node.size,
        resolvedExpression: getNodeColorExpression(node.id),
        resolvedColor: getNodeColor(node.id),
        isDisplayP3: getNodeIsP3(node.id),
      })),
    [colorAuditWorkspaceNodes, getNodeColorExpression, getNodeColor, getNodeIsP3]
  )
  const colorAuditWorkspaceEdgeResources = useMemo<ColorAuditEdgeResource[]>(
    () =>
      colorAuditWorkspaceEdges.map((edge) => ({
        id: edge.id,
        type: edge.type,
        sourceId: edge.sourceId,
        targetId: edge.targetId,
        sourceLabel: getDisplayNodeLabelFromNode(nodesById[edge.sourceId]) || edge.sourceId,
        targetLabel: getDisplayNodeLabelFromNode(nodesById[edge.targetId]) || edge.targetId,
        note: edge.rule?.note,
        targetLc: edge.rule?.targetLc,
        lc: edge.type === "contrast" ? getEdgeContrast(edge) : null,
      })),
    [colorAuditWorkspaceEdges, getEdgeContrast, nodesById]
  )
  const colorAuditWorkspaceStateResource = useMemo(
    () =>
      buildColorAuditWorkspaceStateResource({
        workspaceKey: colorAuditWorkspaceKey,
        rawState: state,
        stateSummary: {
          nodeCount: colorAuditWorkspaceNodes.length,
          edgeCount: colorAuditWorkspaceEdges.length,
          selection: [selectedNodeId, selectedEdgeId].filter(Boolean) as string[],
          viewport: colorAuditTransformEnabled
            ? {
                x: colorAuditTransform.offset.x,
                y: colorAuditTransform.offset.y,
                zoom: colorAuditTransform.scale,
              }
            : undefined,
        },
        selectedNodeId: selectedNodeId ?? null,
        selectedEdgeId: selectedEdgeId ?? null,
        workflow: colorAuditWorkflow satisfies ColorAuditWorkflowSummary,
        nodes: colorAuditWorkspaceNodeResources,
        edges: colorAuditWorkspaceEdgeResources,
        exportEntries: colorAuditProjectExportEntries,
        exportPreview: {
          selectedFormat: selectedColorAuditExportFormat,
          selectedColorMode: selectedColorAuditExportColorMode,
          selectedFormatLabel: selectedColorAuditExportFormatLabel,
          tokenCount: colorAuditProjectExportEntries.length,
          genericReady: colorAuditWorkflow.genericReady,
          frameworkReady: colorAuditWorkflow.frameworkReady,
          formats: colorAuditExportFormats,
        },
      }),
    [
      colorAuditExportFormats,
      colorAuditTransform.offset.x,
      colorAuditTransform.offset.y,
      colorAuditProjectExportEntries,
      colorAuditTransform.scale,
      colorAuditTransformEnabled,
      colorAuditWorkflow,
      colorAuditWorkspaceEdgeResources,
      colorAuditWorkspaceEdges.length,
      colorAuditWorkspaceKey,
      colorAuditWorkspaceNodeResources,
      colorAuditWorkspaceNodes.length,
      selectedColorAuditExportColorMode,
      selectedColorAuditExportFormat,
      selectedColorAuditExportFormatLabel,
      selectedEdgeId,
      selectedNodeId,
      state,
    ]
  )
  const handleAgentColorAuditOperations = useCallback(
    (
      operations: Array<{
        operation: ColorAuditOperation
      }>
    ) => {
      let generatedTemplateBrandColor: string | undefined
      let generatedTemplateAccentColor: string | undefined
      let didGenerateTemplate = false

      applyStateOperation((prev) =>
        operations.reduce((nextState, entry) => {
          if (entry.operation?.type === "generate-template") {
            generatedTemplateBrandColor = entry.operation.brandColor
            generatedTemplateAccentColor = entry.operation.accentColor
            didGenerateTemplate = true
          }
          return applyColorAuditOperation(nextState, entry.operation)
        }, prev)
      )

      if (didGenerateTemplate) {
        resetColorAuditAfterTemplateGeneration()
        if (generatedTemplateBrandColor?.trim()) {
          setTemplateBrand(generatedTemplateBrandColor.trim())
        }
        setTemplateAccent(generatedTemplateAccentColor?.trim() || "")
      }
    },
    [
      applyStateOperation,
      resetColorAuditAfterTemplateGeneration,
      setTemplateAccent,
      setTemplateBrand,
    ]
  )
  const { lastAppliedCursor: colorAuditOperationCursor } =
    useAgentNativeWorkspaceOperations<ColorAuditOperation>({
    workspaceId: "color-audit",
    workspaceKey: colorAuditWorkspaceKey,
    enabled: !catalogOnly,
    onOperations: handleAgentColorAuditOperations,
  })
  useAgentNativeWorkspaceSync({
    workspaceId: "color-audit",
    workspaceKey: colorAuditWorkspaceKey,
    payload: colorAuditWorkspaceStateResource,
    appliedOperationCursor: colorAuditOperationCursor,
    enabled: !catalogOnly,
  })
  useAgentNativeWorkspaceSync({
    workspaceId: "node-catalog",
    workspaceKey: nodeCatalogWorkspaceKey,
    payload: nodeCatalogWorkspaceStateResource,
    enabled: catalogOnly,
  })
  const systemCanvasWorkspaceKey = themeStorageKeyPrefix
    ? `${themeStorageKeyPrefix}:system-canvas`
    : "gallery-system-canvas"
  const systemCanvasNodes = useMemo(
    () =>
      nodes.filter(
        (node) =>
          node.preview ||
          node.group === "system-support" ||
          node.group === "system-preview"
      ),
    [nodes]
  )
  const systemCanvasNodeIds = useMemo(
    () => new Set(systemCanvasNodes.map((node) => node.id)),
    [systemCanvasNodes]
  )
  const systemCanvasEdges = useMemo(
    () =>
      edges.filter(
        (edge) =>
          systemCanvasNodeIds.has(edge.sourceId) && systemCanvasNodeIds.has(edge.targetId)
      ),
    [edges, systemCanvasNodeIds]
  )
  const systemCanvasRenderedNodesById = useMemo(
    () =>
      renderedNodes.reduce<Record<string, ColorCanvasNode>>((acc, node) => {
        acc[node.id] = node
        return acc
      }, {}),
    [renderedNodes]
  )
  const systemCanvasNodeResources = useMemo<SystemCanvasNodeResource[]>(
    () =>
      systemCanvasNodes.map((node) => {
        const renderedNode = systemCanvasRenderedNodesById[node.id]
        return {
          id: node.id,
          type: node.type,
          label: node.label,
          group: node.group,
          role: node.role,
          framework: node.framework,
          semanticKind: node.semanticKind,
          cssVar: node.cssVar,
          value: node.value,
          position: renderedNode?.position || node.position,
          size: node.size,
          previewKind: node.preview?.kind,
          previewSectionId: node.preview?.sectionId,
          resolvedExpression: getNodeColorExpression(node.id),
          resolvedColor: getNodeColor(node.id),
          isDisplayP3: getNodeIsP3(node.id),
        }
      }),
    [getNodeColor, getNodeColorExpression, getNodeIsP3, systemCanvasNodes, systemCanvasRenderedNodesById]
  )
  const systemCanvasEdgeResources = useMemo<SystemCanvasEdgeResource[]>(
    () =>
      systemCanvasEdges.map((edge) => ({
        id: edge.id,
        type: edge.type,
        sourceId: edge.sourceId,
        targetId: edge.targetId,
        sourceLabel: getDisplayNodeLabelFromNode(nodesById[edge.sourceId]) || edge.sourceId,
        targetLabel: getDisplayNodeLabelFromNode(nodesById[edge.targetId]) || edge.targetId,
        note: edge.rule?.note,
      })),
    [nodesById, systemCanvasEdges]
  )
  const selectedSystemNodeId =
    selectedNodeId && systemCanvasNodeIds.has(selectedNodeId) ? selectedNodeId : null
  const selectedSystemEdgeId =
    selectedEdgeId && systemCanvasEdges.some((edge) => edge.id === selectedEdgeId) ? selectedEdgeId : null
  const systemCanvasStateResource = useMemo(
    () =>
      buildSystemCanvasWorkspaceStateResource({
        workspaceKey: systemCanvasWorkspaceKey,
        rawState: state,
        stateSummary: {
          nodeCount: systemCanvasNodes.length,
          edgeCount: systemCanvasEdges.length,
          selection: [selectedSystemNodeId, selectedSystemEdgeId].filter(Boolean) as string[],
          viewport:
            canvasMode === "system-canvas"
              ? {
                  x: systemCanvasTransform.offset.x,
                  y: systemCanvasTransform.offset.y,
                  zoom: systemCanvasTransform.scale,
                }
              : undefined,
        },
        selectedNodeId: selectedSystemNodeId,
        selectedEdgeId: selectedSystemEdgeId,
        viewMode: canvasViewMode,
        scaleConfig: designSystemConfig,
        requirements: systemNodeRequirements,
        sections: systemSectionFrames,
        nodes: systemCanvasNodeResources,
        edges: systemCanvasEdgeResources,
      }),
    [
      canvasMode,
      canvasViewMode,
      designSystemConfig,
      selectedSystemEdgeId,
      selectedSystemNodeId,
      systemCanvasEdgeResources,
      systemCanvasEdges.length,
      systemCanvasNodeResources,
      systemCanvasNodes.length,
      systemCanvasTransform.offset.x,
      systemCanvasTransform.offset.y,
      systemCanvasTransform.scale,
      systemCanvasWorkspaceKey,
      systemNodeRequirements,
      systemSectionFrames,
      state,
    ]
  )
  const [pendingSystemAgentOperations, setPendingSystemAgentOperations] = useState<
    AgentNativeWorkspaceOperationRecord<SystemCanvasOperation>[]
  >([])
  const [systemCanvasOperationCursor, setSystemCanvasOperationCursor] = useState(0)
  const handleAgentSystemCanvasOperations = useCallback(
    (operations: AgentNativeWorkspaceOperationRecord<SystemCanvasOperation>[]) => {
      setPendingSystemAgentOperations((prev) => {
        const knownIds = new Set(prev.map((entry) => entry.id))
        const next = [...prev]

        for (const entry of operations) {
          if (knownIds.has(entry.id)) continue
          knownIds.add(entry.id)
          next.push(entry)
        }

        return next
      })
    },
    []
  )
  useAgentNativeWorkspaceOperations<SystemCanvasOperation>({
    workspaceId: "system-canvas",
    workspaceKey: systemCanvasWorkspaceKey,
    enabled: !catalogOnly,
    onOperations: handleAgentSystemCanvasOperations,
  })

  useEffect(() => {
    setPendingSystemAgentOperations([])
    setSystemCanvasOperationCursor(0)
  }, [systemCanvasWorkspaceKey])

  useEffect(() => {
    if (catalogOnly || pendingSystemAgentOperations.length === 0) return

    const [entry] = pendingSystemAgentOperations
    const finish = () => {
      setSystemCanvasOperationCursor((prev) => Math.max(prev, entry.cursor))
      setPendingSystemAgentOperations((prev) =>
        prev.filter((candidate) => candidate.id !== entry.id)
      )
    }

    switch (entry.operation.type) {
      case "update-scale-config": {
        const patch = sanitizeSystemCanvasConfigPatch(entry.operation.patch)
        if (Object.keys(patch).length > 0) {
          setDesignSystemConfig((prev) => ({ ...prev, ...patch }))
        }
        finish()
        return
      }
      case "set-view-mode": {
        const nextView: SystemCanvasViewMode = isSystemCanvasViewMode(entry.operation.viewMode)
          ? entry.operation.viewMode
          : "system"
        setCanvasMode("system-canvas")
        handleCanvasViewModeChange(nextView)
        finish()
        return
      }
      case "apply-scale-vars": {
        applyDesignSystemThemeVars()
        finish()
        return
      }
      case "generate-scale-graph": {
        handleGenerateDesignSystem()
        finish()
        return
      }
      case "create-node":
      case "update-node":
      case "delete-node":
      case "create-edge":
      case "update-edge":
      case "delete-edge": {
        applyStateOperation((prev) => applySystemCanvasGraphOperation(prev, entry.operation))
        finish()
        return
      }
      default: {
        finish()
      }
    }
  }, [
    applyStateOperation,
    applyDesignSystemThemeVars,
    catalogOnly,
    handleCanvasViewModeChange,
    handleGenerateDesignSystem,
    pendingSystemAgentOperations,
    setCanvasMode,
    setDesignSystemConfig,
  ])
  useAgentNativeWorkspaceSync({
    workspaceId: "system-canvas",
    workspaceKey: systemCanvasWorkspaceKey,
    payload: systemCanvasStateResource,
    appliedOperationCursor: systemCanvasOperationCursor,
    enabled: !catalogOnly,
  })
  const dependencyEdges = useMemo(() => {
    return nodes
      .filter((node) => node.type === "relative" && node.relative?.baseId)
      .map((node) => ({
        id: `dependency-${node.id}`,
        sourceId: node.relative?.baseId as string,
        targetId: node.id,
      }))
  }, [nodes])
  const visibleDependencyEdges = useMemo(() => {
    if (!isRelationshipMode) return []
    return dependencyEdges.filter(
      (edge) => visibleNodeIds.has(edge.sourceId) && visibleNodeIds.has(edge.targetId)
    )
  }, [dependencyEdges, isRelationshipMode, visibleNodeIds])
  const nodePortUsage = useMemo(() => {
    const usage: Record<string, Set<ColorNodePortId>> = {}
    const register = (nodeId: string, portId: ColorNodePortId) => {
      if (!usage[nodeId]) {
        usage[nodeId] = new Set<ColorNodePortId>()
      }
      usage[nodeId]?.add(portId)
    }

    if (showDependencies) {
      visibleDependencyEdges.forEach((edge) => {
        register(edge.sourceId, "dependency-out")
        register(edge.targetId, "dependency-in")
      })
    }

    visibleEdges.forEach((edge) => {
      if (edge.type === "map") {
        register(edge.sourceId, "map-out")
        register(edge.targetId, "map-in")
        return
      }
      register(edge.sourceId, "contrast-out")
      register(edge.targetId, "contrast-in")
    })

    if (connectMode) {
      renderedNodes.forEach((node) => {
        getPortIdsForConnectMode(node, connectMode).forEach((portId) => register(node.id, portId))
      })
    }

    return Object.fromEntries(
      Object.entries(usage).map(([nodeId, ports]) => [nodeId, Array.from(ports)])
    ) as Record<string, ColorNodePortId[]>
  }, [connectMode, renderedNodes, showDependencies, visibleDependencyEdges, visibleEdges])

  useEffect(() => {
    if (!selectedNodeId || visibleNodeIds.has(selectedNodeId)) return
    selectNode(null)
  }, [selectNode, selectedNodeId, visibleNodeIds])

  useEffect(() => {
    if (!selectedEdgeId) return
    if (visibleEdges.some((edge) => edge.id === selectedEdgeId)) return
    selectEdge(null)
  }, [selectEdge, selectedEdgeId, visibleEdges])

  useEffect(() => {
    if (!selectedAutoEdgeId) return
    if (visibleEdges.some((edge) => edge.id === selectedAutoEdgeId)) return
    setSelectedAutoEdgeId(null)
  }, [selectedAutoEdgeId, visibleEdges])

  useEffect(() => {
    if (pendingColorAuditLayoutMode === null) return
    if (canvasMode !== "color-audit" || visibleNodes.length === 0) return
    const viewportWidth = systemCanvasViewportSize.width || workspaceRef.current?.clientWidth || 1280
    const positions = buildColorAuditLayout(
      visibleNodes,
      getNodeSize,
      pendingColorAuditLayoutMode,
      viewportWidth
    )
    visibleNodes.forEach((node) => {
      const position = positions[node.id]
      if (!position) return
      moveNode(node.id, position)
    })
    setPendingColorAuditLayoutMode(null)
    setPendingColorAuditViewportAction("bird-view")
  }, [
    canvasMode,
    getNodeSize,
    moveNode,
    pendingColorAuditLayoutMode,
    systemCanvasViewportSize.width,
    visibleNodes,
  ])

  useEffect(() => {
    if (canvasMode !== "system-canvas" || isRelationshipMode) return
    scrollWorkspaceTo(0, 0)
  }, [canvasMode, effectiveCanvasViewMode, isRelationshipMode, scrollWorkspaceTo])

  const handleColorAuditWorkspaceWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      if (!colorAuditTransformEnabled) return
      handleColorAuditCanvasWheelInput(event)
    },
    [colorAuditTransformEnabled, handleColorAuditCanvasWheelInput]
  )
  const handleSystemWorkspaceWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      if (!systemCanvasTransformEnabled) return
      if (!(event.ctrlKey || event.metaKey)) {
        const nestedScrollTarget = (event.target as HTMLElement | null)?.closest(
          "[data-system-preview-scroll='true']"
        ) as HTMLElement | null
        if (nestedScrollTarget) {
          const canScrollVertically = nestedScrollTarget.scrollHeight > nestedScrollTarget.clientHeight + 1
          const canScrollHorizontally = nestedScrollTarget.scrollWidth > nestedScrollTarget.clientWidth + 1
          const prefersVerticalScroll = Math.abs(event.deltaY) >= Math.abs(event.deltaX)

          if (prefersVerticalScroll && canScrollVertically) {
            const maxTop = nestedScrollTarget.scrollHeight - nestedScrollTarget.clientHeight
            const isScrollingPastTop = event.deltaY < 0 && nestedScrollTarget.scrollTop <= 0
            const isScrollingPastBottom =
              event.deltaY > 0 && nestedScrollTarget.scrollTop >= maxTop - 1
            if (!isScrollingPastTop && !isScrollingPastBottom) return
          }

          if (!prefersVerticalScroll && canScrollHorizontally) {
            const maxLeft = nestedScrollTarget.scrollWidth - nestedScrollTarget.clientWidth
            const isScrollingPastLeft = event.deltaX < 0 && nestedScrollTarget.scrollLeft <= 0
            const isScrollingPastRight =
              event.deltaX > 0 && nestedScrollTarget.scrollLeft >= maxLeft - 1
            if (!isScrollingPastLeft && !isScrollingPastRight) return
          }
        }
      }

      handleSystemCanvasWheelInput(event)
    },
    [handleSystemCanvasWheelInput, systemCanvasTransformEnabled]
  )
  const handleWorkspaceWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      if (colorAuditTransformEnabled) {
        handleColorAuditWorkspaceWheel(event)
        return
      }
      if (systemCanvasTransformEnabled) {
        handleSystemWorkspaceWheel(event)
      }
    },
    [
      colorAuditTransformEnabled,
      handleColorAuditWorkspaceWheel,
      handleSystemWorkspaceWheel,
      systemCanvasTransformEnabled,
    ]
  )
  const handleColorAuditZoomOut = useCallback(() => {
    const centerX = systemCanvasViewportSize.width / 2 || undefined
    const centerY = systemCanvasViewportSize.height / 2 || undefined
    zoomColorAuditTo(colorAuditTransform.scale / 1.2, centerX, centerY)
  }, [
    colorAuditTransform.scale,
    systemCanvasViewportSize.height,
    systemCanvasViewportSize.width,
    zoomColorAuditTo,
  ])
  const handleColorAuditZoomIn = useCallback(() => {
    const centerX = systemCanvasViewportSize.width / 2 || undefined
    const centerY = systemCanvasViewportSize.height / 2 || undefined
    zoomColorAuditTo(colorAuditTransform.scale * 1.2, centerX, centerY)
  }, [
    colorAuditTransform.scale,
    systemCanvasViewportSize.height,
    systemCanvasViewportSize.width,
    zoomColorAuditTo,
  ])
  const handleResetColorAuditZoom = useCallback(() => {
    resetColorAuditZoom()
    panColorAuditTo(32, 36)
  }, [panColorAuditTo, resetColorAuditZoom])
  const fitColorAuditViewportToVisibleNodes = useCallback(
    (padding = 72) => {
      if (!colorAuditTransformEnabled || systemCanvasViewportItems.length === 0) return
      fitColorAuditToView(systemCanvasViewportItems, padding)
    },
    [colorAuditTransformEnabled, fitColorAuditToView, systemCanvasViewportItems]
  )
  const handleColorAuditBirdView = useCallback(() => {
    fitColorAuditViewportToVisibleNodes(72)
  }, [fitColorAuditViewportToVisibleNodes])
  const handleSystemZoomOut = useCallback(() => {
    const centerX = systemCanvasViewportSize.width / 2 || undefined
    const centerY = systemCanvasViewportSize.height / 2 || undefined
    zoomSystemCanvasTo(systemCanvasTransform.scale / 1.2, centerX, centerY)
  }, [systemCanvasTransform.scale, systemCanvasViewportSize.height, systemCanvasViewportSize.width, zoomSystemCanvasTo])
  const handleSystemZoomIn = useCallback(() => {
    const centerX = systemCanvasViewportSize.width / 2 || undefined
    const centerY = systemCanvasViewportSize.height / 2 || undefined
    zoomSystemCanvasTo(systemCanvasTransform.scale * 1.2, centerX, centerY)
  }, [systemCanvasTransform.scale, systemCanvasViewportSize.height, systemCanvasViewportSize.width, zoomSystemCanvasTo])
  const handleResetSystemZoom = useCallback(() => {
    resetSystemCanvasZoom()
    panSystemCanvasTo(32, 36)
  }, [panSystemCanvasTo, resetSystemCanvasZoom])
  const fitSystemViewportToVisibleNodes = useCallback(
    (padding = 72) => {
      if (!systemCanvasTransformEnabled || systemCanvasViewportItems.length === 0) return
      fitSystemCanvasToView(systemCanvasViewportItems, padding)
    },
    [fitSystemCanvasToView, systemCanvasTransformEnabled, systemCanvasViewportItems]
  )
  const handleSystemBirdView = useCallback(() => {
    fitSystemViewportToVisibleNodes(72)
  }, [fitSystemViewportToVisibleNodes])

  const handleQuickConnect = useCallback(
    (roleA: NonNullable<ColorCanvasNode["role"]>, roleB: NonNullable<ColorCanvasNode["role"]>) => {
      const roleNodesA = visibleNodes.filter(
        (node) => node.type !== "component" && nodeMatchesRole(node, roleA)
      )
      const roleNodesB = visibleNodes.filter(
        (node) => node.type !== "component" && nodeMatchesRole(node, roleB)
      )
      roleNodesA.forEach((source) => {
        roleNodesB.forEach((target) => {
          if (source.id === target.id) return
          ensureEdge(source.id, target.id, "contrast", {
            model: DEFAULT_COLOR_MODEL,
            targetLc: DEFAULT_CONTRAST_TARGET_LC,
          })
        })
      })
    },
    [ensureEdge, visibleNodes]
  )
  const handleDisplayNodeMove = useCallback(
    (id: string, position: { x: number; y: number }) => {
      if (!isRelationshipMode) {
        setViewNodePositions((prev) => ({
          ...prev,
          [getViewPositionKey(id)]: position,
        }))
        return
      }
      moveNode(id, position)
    },
    [getViewPositionKey, isRelationshipMode, moveNode, setViewNodePositions]
  )
  const handleNodeResize = useCallback(
    (id: string, size: { width: number; height: number }) => {
      updateNode(id, { size })
    },
    [updateNode]
  )
  const handleAutoArrangeVisibleNodes = useCallback(() => {
    if (isRelationshipMode) return
    setViewNodePositions((prev) => {
      const next = { ...prev }
      visibleNodes.forEach((node) => {
        const position = autoLayoutPlan.positions[node.id]
        if (!position) return
        next[getViewPositionKey(node.id)] = position
      })
      return next
    })
    if (systemCanvasTransformEnabled) {
      fitSystemCanvasToView(
        [
          ...visibleNodes.map((node) => ({
            position: autoLayoutPlan.positions[node.id] ?? node.position,
            size: getNodeSize(node),
          })),
          ...autoLayoutPlan.sections.map((section) => ({
            position: { x: section.x, y: section.y },
            size: { width: section.width, height: section.height },
          })),
        ],
        56
      )
      return
    }
    scrollWorkspaceTo(0, 0)
  }, [
    autoLayoutPlan.positions,
    autoLayoutPlan.sections,
    fitSystemCanvasToView,
    getNodeSize,
    getViewPositionKey,
    isRelationshipMode,
    scrollWorkspaceTo,
    setViewNodePositions,
    systemCanvasTransformEnabled,
    visibleNodes,
  ])
  const handleFitWidthVisibleNodes = useCallback(() => {
    if (isRelationshipMode) return
    const fittedLayout = buildSystemFlowLayout(
      visibleNodes,
      getFitWidthNodeSize,
      Math.max(systemCanvasViewportSize.width, 960)
    )

    visibleNodes.forEach((node) => {
      updateNode(node.id, { size: getFitWidthNodeSize(node) })
    })

    setViewNodePositions((prev) => {
      const next = { ...prev }
      visibleNodes.forEach((node) => {
        const position = fittedLayout.positions[node.id]
        if (!position) return
        next[getViewPositionKey(node.id)] = position
      })
      return next
    })
    if (systemCanvasTransformEnabled) {
    fitSystemCanvasToView(
        [
          ...visibleNodes.map((node) => ({
            position: fittedLayout.positions[node.id] ?? node.position,
            size: getFitWidthNodeSize(node),
          })),
          ...fittedLayout.sections.map((section) => ({
            position: { x: section.x, y: section.y },
            size: { width: section.width, height: section.height },
          })),
        ],
        72
      )
      return
    }
    scrollWorkspaceTo(0, 0)
  }, [
    fitSystemCanvasToView,
    getViewPositionKey,
    isRelationshipMode,
    scrollWorkspaceTo,
    setViewNodePositions,
    systemCanvasViewportSize.width,
    systemCanvasTransformEnabled,
    updateNode,
    visibleNodes,
  ])

  useEffect(() => {
    if (canvasMode !== "system-canvas" || isRelationshipMode || visibleNodes.length === 0) return
    const autoFitKey = `${effectiveCanvasViewMode}:${visibleNodes.length}:${systemCanvasViewportSize.width}:${systemCanvasViewportSize.height}`
    if (lastSystemAutoFitKeyRef.current === autoFitKey) return
    lastSystemAutoFitKeyRef.current = autoFitKey
    setPendingSystemViewportAction("fit-width")
  }, [
    canvasMode,
    effectiveCanvasViewMode,
    isRelationshipMode,
    systemCanvasViewportSize.height,
    systemCanvasViewportSize.width,
    visibleNodes.length,
  ])

  useEffect(() => {
    if (pendingColorAuditViewportAction !== "bird-view") return
    if (canvasMode !== "color-audit" || visibleNodes.length === 0) return
    if (systemCanvasViewportSize.width === 0 || systemCanvasViewportSize.height === 0) return

    const frameId = window.requestAnimationFrame(() => {
      fitColorAuditViewportToVisibleNodes(64)
      setPendingColorAuditViewportAction(null)
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [
    canvasMode,
    fitColorAuditViewportToVisibleNodes,
    pendingColorAuditViewportAction,
    systemCanvasViewportSize.height,
    systemCanvasViewportSize.width,
    visibleNodes.length,
  ])

  useEffect(() => {
    if (pendingSystemViewportAction !== "fit-width") return
    if (canvasMode !== "system-canvas" || isRelationshipMode || visibleNodes.length === 0) return
    if (systemCanvasViewportSize.width === 0 || systemCanvasViewportSize.height === 0) return

    const frameId = window.requestAnimationFrame(() => {
      fitSystemViewportToVisibleNodes(56)
      setPendingSystemViewportAction(null)
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [
    canvasMode,
    fitSystemViewportToVisibleNodes,
    isRelationshipMode,
    pendingSystemViewportAction,
    systemCanvasViewportSize.height,
    systemCanvasViewportSize.width,
    visibleNodes.length,
  ])

  const handleJumpToSystemSection = useCallback(
    (sectionId: SystemSectionId) => {
      const section = systemSectionFrames.find((entry) => entry.id === sectionId)
      if (!section) return
      scrollWorkspaceTo(section.x - 16, section.y - 16)
    },
    [scrollWorkspaceTo, systemSectionFrames]
  )
  const handleJumpToSelectedNode = useCallback(() => {
    if (!selectedNode) return
    scrollWorkspaceToNode(selectedNode)
  }, [scrollWorkspaceToNode, selectedNode])

  const handleApplyToTheme = useCallback(() => {
    if (!activeThemeId) return
    const updates: Array<{ cssVar: string; value: string }> = []

    nodes.forEach((node) => {
      if (!node.cssVar) return
      if (node.type === "relative" || node.type === "semantic") {
        const expression = getNodeColorExpression(node.id)
        if (expression) updates.push({ cssVar: node.cssVar, value: expression })
        return
      }
      if (node.type === "token" && node.value) {
        updates.push({ cssVar: node.cssVar, value: node.value })
      }
    })

    updates.forEach((update) => updateThemeVar(activeThemeId, update.cssVar, update.value))
  }, [activeThemeId, getNodeColorExpression, nodes, updateThemeVar])

  const handleSaveThemeFromCanvas = useCallback(() => {
    const label = newThemeName.trim()
    const fallbackLabel = `Canvas Theme ${themes.length + 1}`
    const nextLabel = label || fallbackLabel
    const baseId = nextLabel
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "")
    let nextId = baseId || `theme-${themes.length + 1}`
    let counter = 2
    while (themes.some((theme) => theme.id === nextId)) {
      nextId = `${baseId || "theme"}-${counter}`
      counter += 1
    }

    const baseVars = getTokenValuesForTheme(activeThemeId)
    const nextVars: Record<string, string> = { ...baseVars }
    nodes.forEach((node) => {
      if (!node.cssVar) return
      if (node.type === "relative" || node.type === "semantic") {
        const expression = getNodeColorExpression(node.id)
        if (expression) nextVars[node.cssVar] = expression
        return
      }
      if (node.type === "token" && node.value) {
        nextVars[node.cssVar] = node.value
      }
    })

    const newTheme = {
      id: nextId,
      label: nextLabel,
      description: "From Color Canvas",
      vars: nextVars,
      groupId: nextId,
    }

    setThemes((prev) => [...prev, newTheme])
    setActiveThemeId(nextId)
    setNewThemeName("")
  }, [
    activeThemeId,
    getNodeColorExpression,
    getTokenValuesForTheme,
    newThemeName,
    nodes,
    setActiveThemeId,
    setThemes,
    themes,
  ])

  const resolveEdgeLabel = useCallback(
    (edge: DisplayEdge) => {
      const source = nodesById[edge.sourceId]
      const target = nodesById[edge.targetId]
      const fallback = `${getDisplayNodeLabelFromNode(source)} → ${getDisplayNodeLabelFromNode(target)}`
      if (!edge.auto) return fallback
      const rule = contrastRules.find((entry) => entry.id === edge.ruleId)
      return rule ? `${rule.label} · ${fallback}` : fallback
    },
    [contrastRules, nodesById]
  )

  const resolveEdgeBadgeLabel = useCallback(
    (edge: DisplayEdge, contrast: number | null) => {
      if (edge.type === "contrast") return formatLc(contrast)
      if (edge.rule?.note) return edge.rule.note

      const source = nodesById[edge.sourceId]
      const target = nodesById[edge.targetId]
      if (target && isFunctionalTokenNode(target)) {
        const frameworkLabel = getFrameworkLabel(target.framework)
        return frameworkLabel ? `${frameworkLabel} alias` : "Functional alias"
      }
      if (target?.type === "semantic") {
        return "Semantic role"
      }
      if (source?.type === "component" || target?.type === "component") {
        return "Component map"
      }
      return "Map"
    },
    [nodesById]
  )

  const handleDuplicateNode = useCallback(
    (node: ColorCanvasNode) => {
      const offset = { x: node.position.x + 24, y: node.position.y + 24 }
      const baseLabel = node.label.endsWith(" copy") ? node.label : `${node.label} copy`
      const nextCssVar =
        node.type === "token" || node.type === "relative"
          ? getNextCssVarFrom(node.cssVar)
          : node.cssVar
      addNode({
        type: node.type,
        label: baseLabel,
        cssVar: nextCssVar,
        value: node.value,
        role: node.role,
        framework: node.framework,
        semanticKind: node.semanticKind,
        relative: node.relative,
        size: node.size,
        group: node.group,
        preview: node.preview,
        position: offset,
      })
    },
    [addNode, getNextCssVarFrom]
  )
  const handleCopyColorAuditExport = useCallback(async () => {
    const text = selectedColorAuditExportText
    if (!text) return
    try {
      const copied = await copyTextToClipboard(text)
      if (!copied) throw new Error("copy failed")
      setCopiedColorAuditExportFormat(selectedColorAuditExportFormat)
      window.setTimeout(() => {
        setCopiedColorAuditExportFormat((current) =>
          current === selectedColorAuditExportFormat ? null : current
        )
      }, 1200)
    } catch {
      setCopiedColorAuditExportFormat(null)
    }
  }, [selectedColorAuditExportFormat, selectedColorAuditExportText])

  useEffect(() => {
    if (!showColorAuditExportPreview) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowColorAuditExportPreview(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [showColorAuditExportPreview])

  useEffect(() => {
    if (!showNodeCatalog) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowNodeCatalog(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [showNodeCatalog])

  useEffect(() => {
    if (!connectDrag.active) return
    const handlePointerMove = (event: PointerEvent) => {
      const point = viewportToCanvasPosition(event.clientX, event.clientY)
      setConnectDrag((prev) => ({
        ...prev,
        x: point.x,
        y: point.y,
      }))
    }
    const handlePointerUp = (event: PointerEvent) => {
      const el = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null
      const nodeEl = el?.closest("[data-color-node='true']") as HTMLElement | null
      const targetId = nodeEl?.dataset.nodeId
      if (targetId) {
        handleConnectTarget(targetId)
      } else {
        setConnectSourceId(null)
      }
      setConnectDrag((prev) => ({ ...prev, active: false }))
    }
    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)
    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
    }
  }, [connectDrag.active, handleConnectTarget, viewportToCanvasPosition])

  if (catalogOnly) {
    const colorAuditSections = allNodeCatalogSections.filter((section) => section.mode === "color-audit")
    const systemSections = allNodeCatalogSections.filter((section) => section.mode === "system-canvas")
    const colorAuditNodeCount = colorAuditSections.reduce((total, section) => total + section.nodes.length, 0)
    const systemNodeCount = systemSections.reduce((total, section) => total + section.nodes.length, 0)
    const workspaceItemCount = workspaceCatalogSections.reduce(
      (total, section) => total + section.items.length,
      0
    )

    return (
      <div
        ref={rootRef}
        className="flex h-full min-h-0 w-full min-w-0 bg-surface-100"
        data-node-catalog-root="true"
        data-theme={activeThemeId}
        style={designSystem.cssVars as React.CSSProperties}
      >
        <aside className="flex w-80 min-h-0 flex-col border-r border-default bg-white">
          <div className="border-b border-default px-4 py-4">
            <div className="text-sm font-semibold text-foreground">Node catalog</div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Dedicated review page for every node family available across Color Audit, System Canvas, and the general Canvas workspace.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="rounded-xl border border-default bg-surface-50 px-3 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Coverage
              </div>
              <div className="mt-3 grid gap-2">
                <div className="rounded-lg border border-default bg-white px-3 py-2">
                  <div className="text-[11px] font-semibold text-foreground">Color Audit</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {colorAuditSections.length} sections · {colorAuditNodeCount} nodes
                  </div>
                </div>
                <div className="rounded-lg border border-default bg-white px-3 py-2">
                  <div className="text-[11px] font-semibold text-foreground">System Canvas</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {systemSections.length} sections · {systemNodeCount} nodes
                  </div>
                </div>
                <div className="rounded-lg border border-default bg-white px-3 py-2">
                  <div className="text-[11px] font-semibold text-foreground">Canvas Workspace</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {workspaceCatalogSections.length} sections · {workspaceItemCount} item types
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-default bg-surface-50 px-3 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Color Audit templates
              </div>
              <div className="mt-2 space-y-2">
                {COLOR_TEMPLATE_KITS.map((kit) => {
                  const preview = getTemplateKitPreview(kit, true)
                  return (
                    <div key={kit.id} className="rounded-lg border border-default bg-white px-3 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs font-semibold text-foreground">{kit.label}</div>
                        <span className="rounded-full bg-surface-50 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          {preview.totalNodes}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{kit.description}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                          {preview.colorNodes} colors
                        </span>
                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                          {preview.semanticRoles} roles
                        </span>
                        {preview.functionalTokens > 0 && (
                          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                            {preview.functionalTokens} aliases
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-default bg-surface-50 px-3 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Review state
              </div>
              <div className="mt-2 text-[11px] leading-5 text-muted-foreground">
                This page shows the real card treatments for titles, pills, previews, connector ports, and state styles without needing to generate a graph first.
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-default bg-surface-50 px-3 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Jump to section
              </div>
              <div className="mt-3 space-y-3">
                <button
                  type="button"
                  onClick={() => scrollToCatalogSection("state-preview")}
                  className="w-full rounded-lg border border-default bg-white px-3 py-2 text-left text-xs font-semibold text-foreground hover:bg-surface-50"
                >
                  State preview
                </button>

                <div>
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Canvas Workspace
                  </div>
                  <div className="space-y-1.5">
                    {workspaceCatalogSections.map((section) => (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => scrollToCatalogSection(section.id)}
                        className="flex w-full items-center justify-between rounded-lg border border-default bg-white px-3 py-2 text-left hover:bg-surface-50"
                      >
                        <span className="min-w-0 text-xs font-medium text-foreground">{section.label}</span>
                        <span className="ml-2 rounded-full bg-surface-50 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          {section.items.length}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Color Audit
                  </div>
                  <div className="space-y-1.5">
                    {colorAuditSections.map((section) => (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => scrollToCatalogSection(section.id)}
                        className="flex w-full items-center justify-between rounded-lg border border-default bg-white px-3 py-2 text-left hover:bg-surface-50"
                      >
                        <span className="min-w-0 text-xs font-medium text-foreground">{section.label}</span>
                        <span className="ml-2 rounded-full bg-surface-50 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          {section.nodes.length}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    System Canvas
                  </div>
                  <div className="space-y-1.5">
                    {systemSections.map((section) => (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => scrollToCatalogSection(section.id)}
                        className="flex w-full items-center justify-between rounded-lg border border-default bg-white px-3 py-2 text-left hover:bg-surface-50"
                      >
                        <span className="min-w-0 text-xs font-medium text-foreground">{section.label}</span>
                        <span className="ml-2 rounded-full bg-surface-50 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          {section.nodes.length}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto max-w-[1680px] space-y-8">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Catalog
              </div>
              <h1 className="mt-2 text-2xl font-semibold text-foreground">Canvas node catalog</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                Review every node type we support today: manual color-audit inputs, template-generated Starter Ramp, shadcn/ui and Radix alias graphs, the full System Canvas support and preview nodes, plus the general Canvas workspace items such as artboards, Mermaid diagrams, wireframes, media, embeds, and markdown notes.
              </p>
            </div>

            {nodeCatalogPreviewNode ? (
              <section
                id="node-catalog-section-state-preview"
                data-node-catalog-state-preview="true"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-foreground">State preview</div>
                    <p className="text-xs text-muted-foreground">
                      Default, selected, highlighted, and dimmed treatments for the current node card renderer.
                    </p>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {([
                    { id: "default", label: "Default", selected: false, highlighted: false, dimmed: false },
                    { id: "selected", label: "Selected", selected: true, highlighted: false, dimmed: false },
                    { id: "highlighted", label: "Highlighted", selected: false, highlighted: true, dimmed: false },
                    { id: "dimmed", label: "Dimmed", selected: false, highlighted: false, dimmed: true },
                  ] as const).map((statePreview) => {
                    const size = getNodeSize(nodeCatalogPreviewNode)
                    const frame = getCatalogFrameMetrics(size)
                    const sampleNode = {
                      ...nodeCatalogPreviewNode,
                      position: { x: frame.inset, y: frame.inset },
                    }
                    return (
                      <div key={statePreview.id} className="rounded-xl border border-default bg-white px-3 py-3">
                        <div className="mb-2 text-xs font-semibold text-foreground">{statePreview.label}</div>
                        <div
                          className="relative overflow-auto rounded-lg bg-surface-50 p-3"
                          style={{ minHeight: frame.height, minWidth: Math.min(frame.width, 360) }}
                        >
                          <div style={{ position: "relative", width: frame.width, height: frame.height }}>
                            <ColorNode
                              node={sampleNode}
                              size={size}
                              minSize={getNodeMinSize(nodeCatalogPreviewNode)}
                              portIds={getCatalogPortIds(nodeCatalogPreviewNode)}
                              resolveColor={getCatalogNodeColor}
                              resolveIsP3={getCatalogNodeIsP3}
                              resolveExpression={getCatalogNodeExpression}
                              resolveLabel={getCatalogNodeLabel}
                              selected={statePreview.selected}
                              highlighted={statePreview.highlighted}
                              dimmed={statePreview.dimmed}
                              connectActive={false}
                              connectMode={null}
                              connectDragging={false}
                              connectSourceId={null}
                              movable={false}
                              onMove={() => {}}
                              onResize={() => {}}
                              onClick={() => {}}
                              onConnectStart={() => {}}
                              showFullLabels
                              toCanvasPosition={(x, y) => ({ x, y })}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            ) : null}

            <section id="node-catalog-section-canvas-workspace">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-foreground">Canvas Workspace</div>
                  <p className="text-xs text-muted-foreground">
                    {workspaceCatalogSections.length} sections · {workspaceItemCount} item types
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {workspaceCatalogSections.map((section) => (
                  <section
                    key={section.id}
                    id={`node-catalog-section-${section.id}`}
                    className="rounded-2xl border border-default bg-white px-4 py-4 shadow-sm"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-foreground">{section.label}</div>
                        <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">
                          {section.description}
                        </p>
                      </div>
                      <span className="rounded-full bg-surface-50 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
                        {section.items.length}
                      </span>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {section.items.map((item) => (
                        <WorkspaceCatalogCard key={item.id} item={item} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </section>

            {[
              { id: "color-audit", label: "Color Audit", sections: colorAuditSections },
              { id: "system-canvas", label: "System Canvas", sections: systemSections },
            ].map((group) => (
              <section key={group.id}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-foreground">{group.label}</div>
                    <p className="text-xs text-muted-foreground">
                      {group.sections.length} sections · {group.sections.reduce((total, section) => total + section.nodes.length, 0)} nodes
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  {group.sections.map((section) => (
                    <section
                      key={section.id}
                      id={`node-catalog-section-${section.id}`}
                      className="rounded-2xl border border-default bg-white px-4 py-4 shadow-sm"
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-foreground">{section.label}</div>
                          <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">
                            {section.description}
                          </p>
                        </div>
                        <span className="rounded-full bg-surface-50 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
                          {section.nodes.length}
                        </span>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {section.nodes.map((node) => {
                          const size = getNodeSize(node)
                          const frame = getCatalogFrameMetrics(size)
                          const staticNode = {
                            ...node,
                            position: { x: frame.inset, y: frame.inset },
                          }
                          return (
                            <div key={node.id} className="rounded-xl border border-default bg-surface-50 px-3 py-3">
                              <div className="mb-2 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                                <span className="truncate">{getDisplayNodeLabelFromNode(node)}</span>
                                <span className="rounded-full bg-white px-2 py-0.5 font-semibold">
                                  {node.type}
                                </span>
                              </div>
                              <div
                                className="relative overflow-auto rounded-lg bg-white/70 p-3"
                                style={{ minHeight: frame.height, minWidth: Math.min(frame.width, 360) }}
                              >
                                <div style={{ position: "relative", width: frame.width, height: frame.height }}>
                                  <ColorNode
                                    node={staticNode}
                                    size={size}
                                    minSize={getNodeMinSize(node)}
                                    portIds={getCatalogPortIds(node)}
                                    resolveColor={getCatalogNodeColor}
                                    resolveIsP3={getCatalogNodeIsP3}
                                    resolveExpression={getCatalogNodeExpression}
                                    resolveLabel={getCatalogNodeLabel}
                                    selected={false}
                                    highlighted={false}
                                    dimmed={false}
                                    connectActive={false}
                                    connectMode={null}
                                    connectDragging={false}
                                    connectSourceId={null}
                                    movable={false}
                                    onMove={() => {}}
                                    onResize={() => {}}
                                    onClick={() => {}}
                                    onConnectStart={() => {}}
                                    showFullLabels
                                    toCanvasPosition={(x, y) => ({ x, y })}
                                  />
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div
      ref={rootRef}
      className="flex h-full min-h-0 w-full min-w-0 bg-surface-100"
      data-theme={activeThemeId}
    >
      <aside className="flex w-72 min-h-0 flex-col border-r border-default bg-white">
        <div className="border-b border-default px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">{getCanvasModeLabel(canvasMode)}</h2>
              <p className="text-xs text-muted-foreground">
                {canvasMode === "color-audit"
                  ? "Tokens + roles graph"
                  : "Scale engine + rendered preview graph"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setThemePanelVisible(true)}
              className="rounded-md border border-default bg-white p-1.5 text-muted-foreground hover:bg-surface-50"
              aria-label="Open theme editor"
            >
              <Palette className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="border-b border-default px-4 py-3">
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Theme</label>
          <select
            value={activeThemeId}
            onChange={(e) => setActiveThemeId(e.target.value)}
            className="w-full rounded-md border border-default bg-white px-3 py-1.5 text-sm text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
          >
            {themes.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.label}
              </option>
            ))}
          </select>
          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={canvasMode === "color-audit" ? handleApplyToTheme : applyDesignSystemThemeVars}
              className="rounded-md border border-brand-200 bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100"
            >
              {canvasMode === "color-audit" ? "Apply to Theme" : "Apply scale vars"}
            </button>
            {canvasMode === "color-audit" && !supportsRelativeColor && (
              <span className="text-[10px] font-medium text-amber-600">
                Relative colors not supported in this browser.
              </span>
            )}
          </div>
          {canvasMode === "color-audit" ? (
            <div className="mt-3 space-y-2 rounded-md border border-default bg-surface-50 px-2 py-2">
              <div className="text-[11px] font-medium text-muted-foreground">Save as new theme</div>
              <input
                type="text"
                value={newThemeName}
                onChange={(e) => setNewThemeName(e.target.value)}
                placeholder="Theme name"
                className="w-full rounded-md border border-default bg-white px-2 py-1 text-xs text-foreground"
              />
              <button
                type="button"
                onClick={handleSaveThemeFromCanvas}
                className="w-full rounded-md border border-default bg-white px-2 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-50"
              >
                Save theme from canvas
              </button>
            </div>
          ) : (
            <div className="mt-3 rounded-md border border-default bg-surface-50 px-3 py-2 text-[11px] leading-5 text-muted-foreground">
              System Canvas applies the generated Utopia, Capsize, and adapter vars to the active
              theme, then previews the resulting primitives on the canvas.
            </div>
          )}
        </div>

        {projectId && (
          <div className="border-b border-default px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Canvas files
              </h3>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    void refreshCanvasFiles()
                  }}
                  className="rounded p-1 text-muted-foreground hover:bg-surface-100 hover:text-foreground"
                  aria-label="Refresh canvas files"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${canvasFilesLoading ? "animate-spin" : ""}`} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleSaveSurfaceCanvasFile()
                  }}
                  className="rounded p-1 text-muted-foreground hover:bg-surface-100 hover:text-foreground"
                  aria-label="Save canvas file"
                >
                  <Save className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleCreateSurfaceCanvasFile()
                  }}
                  className="rounded p-1 text-muted-foreground hover:bg-surface-100 hover:text-foreground"
                  aria-label="Create canvas file"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <input
                type="text"
                value={surfaceCanvasSearchQuery}
                onChange={(e) => setSurfaceCanvasSearchQuery(e.target.value)}
                placeholder={`Search ${canvasMode === "color-audit" ? "color audit" : "system"} files...`}
                className="w-full rounded-md border border-default bg-white px-2 py-1.5 text-xs text-foreground"
              />
              <div className="rounded-md border border-default bg-surface-50 px-3 py-2">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Current file
                </div>
                <div className="mt-1 truncate text-sm font-medium text-foreground">
                  {activeSurfaceCanvasFileTitle || "Unsaved canvas"}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {activeSurfaceCanvasFilePath || "Create or save a real .canvas file for this surface."}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {colorCanvasFileDirty ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                      Unsaved changes
                    </span>
                  ) : !activeSurfaceCanvasFilePath ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                      Local draft
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      Saved
                    </span>
                  )}
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    {canvasMode === "color-audit" ? "Color Audit" : "System Canvas"}
                  </span>
                  {activeSurfaceCanvasFilePath && activeSurfaceCanvasFileTitle ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          void handleRenameSurfaceCanvasFile(activeSurfaceCanvasFilePath)
                        }}
                        className="rounded-full p-1 text-muted-foreground hover:bg-white hover:text-foreground"
                        aria-label={`Rename or move ${activeSurfaceCanvasFileTitle}`}
                        title="Rename or move"
                      >
                        <Move className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void handleDuplicateSurfaceCanvasFile(activeSurfaceCanvasFilePath)
                        }}
                        className="rounded-full p-1 text-muted-foreground hover:bg-white hover:text-foreground"
                        aria-label={`Duplicate ${activeSurfaceCanvasFileTitle}`}
                        title="Duplicate"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void handleDeleteSurfaceCanvasFile(activeSurfaceCanvasFilePath)
                        }}
                        className="rounded-full p-1 text-muted-foreground hover:bg-white hover:text-rose-600"
                        aria-label={`Delete ${activeSurfaceCanvasFileTitle}`}
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
              {canvasFilesError ? (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {canvasFilesError}
                </div>
              ) : null}
              {colorCanvasFileBrowser.openTabs.length > 0 ? (
                <div className="rounded-md border border-default bg-white px-2 py-2">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Open tabs
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {colorCanvasFileBrowser.openTabs.map((file) => {
                      const isActive = activeSurfaceCanvasFilePath === file.path
                      return (
                        <span
                          key={file.path}
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] ${
                            isActive
                              ? "border-brand-300 bg-brand-50 text-brand-700"
                              : "border-default bg-surface-50 text-foreground"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              void handleOpenSurfaceCanvasFile(file.path)
                            }}
                            className="truncate"
                          >
                            {file.title}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              void handleRenameSurfaceCanvasFile(file.path)
                            }}
                            className="rounded-full p-0.5 text-muted-foreground hover:bg-white hover:text-foreground"
                            aria-label={`Rename or move ${file.title}`}
                            title="Rename or move"
                          >
                            <Move className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              void handleDuplicateSurfaceCanvasFile(file.path)
                            }}
                            className="rounded-full p-0.5 text-muted-foreground hover:bg-white hover:text-foreground"
                            aria-label={`Duplicate ${file.title}`}
                            title="Duplicate"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => colorCanvasFileBrowser.closeOpenTab(file.path)}
                            className="rounded-full p-0.5 text-muted-foreground hover:bg-white"
                            aria-label={`Close ${file.title}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      )
                    })}
                  </div>
                </div>
              ) : null}
              {colorCanvasFileBrowser.recentFiles.length > 0 ? (
                <div className="rounded-md border border-default bg-white px-2 py-2">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Recent
                  </div>
                  <div className="space-y-1">
                    {colorCanvasFileBrowser.recentFiles.slice(0, 4).map((file) => (
                      <button
                        key={file.path}
                        type="button"
                        onClick={() => {
                          void handleOpenSurfaceCanvasFile(file.path)
                        }}
                        className="flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-xs text-foreground hover:bg-surface-50"
                      >
                        <span className="truncate">{file.title}</span>
                        <span className="ml-2 shrink-0 text-[10px] text-muted-foreground">
                          {file.path.split("/").slice(0, -1).join("/") || "root"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {colorCanvasFileBrowser.favoriteFiles.length > 0 ? (
                <div className="rounded-md border border-default bg-white px-2 py-2">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Favorites
                  </div>
                  <div className="space-y-1">
                    {colorCanvasFileBrowser.favoriteFiles.map((file) => (
                      <button
                        key={file.path}
                        type="button"
                        onClick={() => {
                          void handleOpenSurfaceCanvasFile(file.path)
                        }}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs text-foreground hover:bg-surface-50"
                      >
                        <Star className="h-3.5 w-3.5 shrink-0 fill-current text-amber-500" />
                        <span className="truncate">{file.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {colorCanvasFileBrowser.folderTreeEntries.length > 0 ? (
                <div className="rounded-md border border-default bg-white px-2 py-2">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Folder tree
                  </div>
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => colorCanvasFileBrowser.setSelectedFolder("all")}
                      className={`flex w-full items-center justify-between rounded-md border px-2 py-1 text-left text-[11px] ${
                        colorCanvasFileBrowser.selectedFolder === "all"
                          ? "border-brand-300 bg-brand-50 text-brand-700"
                          : "border-default bg-surface-50 text-foreground"
                      }`}
                    >
                      <span>All files</span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {surfaceCanvasFiles.length}
                      </span>
                    </button>
                    {colorCanvasFileBrowser.folderTreeEntries.map((entry) => (
                      <button
                        key={entry.folder}
                        type="button"
                        onClick={() => colorCanvasFileBrowser.setSelectedFolder(entry.folder)}
                        className={`flex w-full items-center justify-between rounded-md border px-2 py-1 text-left text-[11px] ${
                          colorCanvasFileBrowser.selectedFolder === entry.folder
                            ? "border-brand-300 bg-brand-50 text-brand-700"
                            : "border-default bg-surface-50 text-foreground"
                        }`}
                        style={{ paddingLeft: `${8 + entry.depth * 14}px` }}
                      >
                        <span className="truncate">{entry.label}</span>
                        <span className="ml-2 shrink-0 text-[10px] text-muted-foreground">
                          {entry.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <div
                ref={surfaceCanvasListRef}
                onScroll={(event) => setSurfaceCanvasListScrollTop(event.currentTarget.scrollTop)}
                className="overflow-y-auto rounded-md border border-default bg-white"
                style={{ maxHeight: SURFACE_CANVAS_FILE_LIST_HEIGHT }}
              >
                {filteredSurfaceCanvasFiles.length === 0 ? (
                  <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                    {canvasFilesLoading ? "Loading canvas files…" : "No files for this surface yet"}
                  </div>
                ) : (
                  <div
                    className="relative"
                    style={{ height: filteredSurfaceCanvasFiles.length * SURFACE_CANVAS_FILE_ROW_HEIGHT }}
                  >
                    {visibleSurfaceCanvasFiles.map((file, index) => {
                      const absoluteIndex = visibleSurfaceCanvasRange.startIndex + index
                      const folderPath = file.path.split("/").slice(0, -1).join("/")
                      const isActive = activeSurfaceCanvasFilePath === file.path
                      return (
                        <div
                          key={file.path}
                          className={`absolute left-0 right-0 flex items-start gap-2 border-b border-default px-3 py-2 ${
                            isActive ? "bg-brand-50" : "hover:bg-surface-50"
                          }`}
                          style={{ top: absoluteIndex * SURFACE_CANVAS_FILE_ROW_HEIGHT }}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              void handleOpenSurfaceCanvasFile(file.path)
                            }}
                            className="flex min-w-0 flex-1 items-start gap-2 text-left"
                          >
                            <FileText className={`mt-0.5 h-4 w-4 shrink-0 ${isActive ? "text-brand-700" : "text-muted-foreground"}`} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-foreground">
                                {file.title}
                              </span>
                              <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                                {folderPath || "root"} · {file.itemCount} nodes
                              </span>
                            </span>
                          </button>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                void handleToggleSurfaceCanvasFavorite(file.path)
                              }}
                              className={`rounded-full p-1 ${
                                file.favorite ? "text-amber-500" : "text-muted-foreground hover:bg-white"
                              }`}
                              aria-label={`${file.favorite ? "Unfavorite" : "Favorite"} ${file.title}`}
                            >
                              <Star className={`h-3.5 w-3.5 ${file.favorite ? "fill-current" : ""}`} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                void handleRenameSurfaceCanvasFile(file.path)
                              }}
                              className="rounded-full p-1 text-muted-foreground hover:bg-white hover:text-foreground"
                              aria-label={`Rename or move ${file.title}`}
                              title="Rename or move"
                            >
                              <Move className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                void handleDuplicateSurfaceCanvasFile(file.path)
                              }}
                              className="rounded-full p-1 text-muted-foreground hover:bg-white hover:text-foreground"
                              aria-label={`Duplicate ${file.title}`}
                              title="Duplicate"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                void handleDeleteSurfaceCanvasFile(file.path)
                              }}
                              className="rounded-full p-1 text-muted-foreground hover:bg-white hover:text-rose-600"
                              aria-label={`Delete ${file.title}`}
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="border-b border-default px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Sessions
            </h3>
            <span className="text-[11px] text-muted-foreground">
              {Object.keys(sessions).length}
            </span>
          </div>
          <select
            value={activeSessionId}
            onChange={(e) => {
              const nextId = e.target.value
              if (!nextId) return
              if (activeSessionId) {
                setSessions((prev) => ({
                  ...prev,
                  [activeSessionId]: {
                    id: activeSessionId,
                    name: prev[activeSessionId]?.name || "Session",
                    state: state ?? emptyState,
                    updatedAt: new Date().toISOString(),
                  },
                }))
              }
              setActiveSessionId(nextId)
              replaceState(sessions[nextId]?.state ?? emptyState)
            }}
            className="w-full rounded-md border border-default bg-white px-2 py-1.5 text-xs text-foreground"
          >
            {Object.values(sessions).map((session) => (
              <option key={session.id} value={session.id}>
                {session.name}
              </option>
            ))}
          </select>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSaveSession}
              className="rounded-md border border-default bg-white px-2 py-1 text-xs font-semibold text-foreground hover:bg-surface-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={handleNewSession}
              className="rounded-md border border-default bg-white px-2 py-1 text-xs font-semibold text-foreground hover:bg-surface-50"
            >
              New
            </button>
            <button
              type="button"
              onClick={handleClearSession}
              className="rounded-md border border-default bg-white px-2 py-1 text-xs font-semibold text-foreground hover:bg-surface-50"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleDeleteSession}
              className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
            >
              Delete
            </button>
          </div>
        </div>

        {canvasMode === "color-audit" && (
          <div className="border-b border-default px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Theme Template
              </h3>
              <span className="text-[11px] text-muted-foreground">{selectedTemplateKit.label}</span>
            </div>
            <div className="space-y-2">
              <div className="rounded-xl border border-default bg-surface-50 px-3 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Template kit
                </div>
                <div className="mt-2 space-y-2">
                  {COLOR_TEMPLATE_KITS.map((kit) => {
                    const active = templateKitId === kit.id
                    const preview = getTemplateKitPreview(kit, Boolean(templateAccent.trim()))
                    return (
                      <button
                        key={kit.id}
                        type="button"
                        onClick={() => setTemplateKitId(kit.id)}
                        className={`w-full rounded-xl border px-3 py-2 text-left transition-colors ${
                          active
                            ? "border-brand-500 bg-brand-50"
                            : "border-default bg-white hover:bg-surface-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs font-semibold text-foreground">{kit.label}</div>
                          {active && (
                            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-brand-700">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-[11px] leading-5 text-muted-foreground">
                          {kit.description}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-semibold text-muted-foreground">
                          <span className="rounded-full bg-surface-50 px-2 py-0.5">
                            {preview.colorNodes} colors
                          </span>
                          <span className="rounded-full bg-surface-50 px-2 py-0.5">
                            {preview.semanticRoles} roles
                          </span>
                          {preview.functionalTokens > 0 && (
                            <span className="rounded-full bg-surface-50 px-2 py-0.5">
                              {preview.functionalTokens} framework
                            </span>
                          )}
                          <span className="rounded-full bg-surface-50 px-2 py-0.5">
                            {preview.totalNodes} total nodes
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="rounded-md border border-default bg-surface-50 px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Template preview
                  </div>
                  <div className="text-[11px] font-semibold text-foreground">
                    {selectedTemplatePreview.totalNodes} nodes
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded-md border border-default bg-white px-2 py-2">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Colors
                    </div>
                    <div className="mt-1 font-semibold text-foreground">
                      {selectedTemplatePreview.colorNodes}
                    </div>
                  </div>
                  <div className="rounded-md border border-default bg-white px-2 py-2">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Roles
                    </div>
                    <div className="mt-1 font-semibold text-foreground">
                      {selectedTemplatePreview.semanticRoles}
                    </div>
                  </div>
                  <div className="rounded-md border border-default bg-white px-2 py-2">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Framework
                    </div>
                    <div className="mt-1 font-semibold text-foreground">
                      {selectedTemplatePreview.functionalTokens}
                    </div>
                  </div>
                  <div className="rounded-md border border-default bg-white px-2 py-2">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Accent bonus
                    </div>
                    <div className="mt-1 font-semibold text-foreground">
                      {templateAccent.trim()
                        ? `+${TEMPLATE_PREVIEW_BASE_COUNTS.accentColors}`
                        : `0 / +${TEMPLATE_PREVIEW_BASE_COUNTS.accentColors}`}
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                  Brand color
                </label>
                <ColorPickerField
                  value={templateBrand}
                  onChange={setTemplateBrand}
                  placeholder="e.g. #1d4ed8 or oklch(60% 0.18 240)"
                  className="w-full rounded-md border border-default bg-white px-2 py-1.5 text-xs text-foreground"
                />
                <div className="mt-2 rounded-md border border-default bg-surface-50 px-3 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] font-semibold text-foreground">Brand OKLCH</div>
                    <div className="flex items-center gap-2">
                      <span
                        className="h-5 w-5 rounded border border-default"
                        style={{ background: formatTemplateSeedOklch(templateBrandSeed) }}
                      />
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {formatTemplateSeedOklch(templateBrandSeed)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    <label className="block text-[10px] text-muted-foreground">
                      Lightness {Math.round(templateBrandSeed.l * 100)}%
                      <input
                        aria-label="Brand lightness"
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={Math.round(templateBrandSeed.l * 100)}
                        onChange={(e) =>
                          handleTemplateSeedSliderChange(
                            "brand",
                            "l",
                            Number(e.target.value) / 100
                          )
                        }
                        className="mt-1 w-full"
                      />
                    </label>
                    <label className="block text-[10px] text-muted-foreground">
                      Chroma {templateBrandSeed.c.toFixed(3)}
                      <input
                        aria-label="Brand chroma"
                        type="range"
                        min="0"
                        max="0.32"
                        step="0.005"
                        value={templateBrandSeed.c}
                        onChange={(e) =>
                          handleTemplateSeedSliderChange(
                            "brand",
                            "c",
                            Number(e.target.value)
                          )
                        }
                        className="mt-1 w-full"
                      />
                    </label>
                    <label className="block text-[10px] text-muted-foreground">
                      Hue {Math.round(templateBrandSeed.h)}°
                      <input
                        aria-label="Brand hue"
                        type="range"
                        min="0"
                        max="360"
                        step="1"
                        value={templateBrandSeed.h}
                        onChange={(e) =>
                          handleTemplateSeedSliderChange(
                            "brand",
                            "h",
                            Number(e.target.value)
                          )
                        }
                        className="mt-1 w-full"
                      />
                    </label>
                  </div>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                  Accent color (optional)
                </label>
                <ColorPickerField
                  value={templateAccent}
                  onChange={setTemplateAccent}
                  placeholder="Optional secondary brand"
                  className="w-full rounded-md border border-default bg-white px-2 py-1.5 text-xs text-foreground"
                />
                <div className="mt-2 rounded-md border border-default bg-surface-50 px-3 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] font-semibold text-foreground">Accent OKLCH</div>
                    <div className="flex items-center gap-2">
                      <span
                        className="h-5 w-5 rounded border border-default"
                        style={{ background: formatTemplateSeedOklch(templateAccentSeed) }}
                      />
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {formatTemplateSeedOklch(templateAccentSeed)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    <label className="block text-[10px] text-muted-foreground">
                      Lightness {Math.round(templateAccentSeed.l * 100)}%
                      <input
                        aria-label="Accent lightness"
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={Math.round(templateAccentSeed.l * 100)}
                        onChange={(e) =>
                          handleTemplateSeedSliderChange(
                            "accent",
                            "l",
                            Number(e.target.value) / 100
                          )
                        }
                        className="mt-1 w-full"
                      />
                    </label>
                    <label className="block text-[10px] text-muted-foreground">
                      Chroma {templateAccentSeed.c.toFixed(3)}
                      <input
                        aria-label="Accent chroma"
                        type="range"
                        min="0"
                        max="0.32"
                        step="0.005"
                        value={templateAccentSeed.c}
                        onChange={(e) =>
                          handleTemplateSeedSliderChange(
                            "accent",
                            "c",
                            Number(e.target.value)
                          )
                        }
                        className="mt-1 w-full"
                      />
                    </label>
                    <label className="block text-[10px] text-muted-foreground">
                      Hue {Math.round(templateAccentSeed.h)}°
                      <input
                        aria-label="Accent hue"
                        type="range"
                        min="0"
                        max="360"
                        step="1"
                        value={templateAccentSeed.h}
                        onChange={(e) =>
                          handleTemplateSeedSliderChange(
                            "accent",
                            "h",
                            Number(e.target.value)
                          )
                        }
                        className="mt-1 w-full"
                      />
                    </label>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleAddSeedNode("brand")}
                  className="rounded-md border border-default bg-white px-2 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-50"
                >
                  Add brand seed
                </button>
                <button
                  type="button"
                  onClick={() => handleAddSeedNode("accent")}
                  className="rounded-md border border-default bg-white px-2 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-50"
                >
                  Add accent seed
                </button>
              </div>
              <button
                type="button"
                onClick={handleGenerateTemplate}
                className="w-full rounded-md border border-default bg-white px-2 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-50"
              >
                Generate template nodes
              </button>
              <div className="rounded-md border border-default bg-surface-50 px-3 py-2 text-[11px] leading-5 text-muted-foreground">
                Generates inputs, relative rules, and {selectedTemplateKit.framework ? `${getFrameworkLabel(selectedTemplateKit.framework)} functional aliases` : "semantic starter roles"} that you can remap manually on the canvas.
              </div>
            </div>
          </div>
        )}

        {canvasMode === "system-canvas" && (
          <div className="border-b border-default px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Design System API
            </h3>
            <span className="text-[11px] text-muted-foreground">
              {designSystem.typography.length} type · {designSystem.icons.length} icon ·{" "}
              {designSystem.layouts.length} layout
            </span>
          </div>
          <div className="rounded-xl border border-default bg-surface-50 px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Presets
                </div>
                <div className="mt-1 text-[11px] leading-5 text-muted-foreground">
                  Start from a tuned profile, then adjust the raw scale inputs below.
                </div>
              </div>
              <button
                type="button"
                onClick={() => applyDesignSystemPreset(DEFAULT_DESIGN_SYSTEM_SCALE_CONFIG)}
                className="rounded-full border border-default px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-white"
              >
                Reset
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {DESIGN_SYSTEM_PRESETS.map((preset) => {
                const active = activeDesignSystemPresetId === preset.id
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyDesignSystemPreset(preset.config)}
                    className={`w-full rounded-xl border px-3 py-2 text-left transition-colors ${
                      active
                        ? "border-brand-500 bg-brand-50"
                        : "border-default bg-white hover:bg-surface-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-semibold text-foreground">{preset.label}</div>
                      {active && (
                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-brand-700">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-[11px] leading-5 text-muted-foreground">
                      {preset.description}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-md border border-default bg-surface-50 px-2 py-2">
              <div className="font-semibold text-foreground">
                {designSystemConfig.typeBaseMinPx}-{designSystemConfig.typeBaseMaxPx}px
              </div>
              <div className="text-muted-foreground">Base size range</div>
            </div>
            <div className="rounded-md border border-default bg-surface-50 px-2 py-2">
              <div className="font-semibold text-foreground">
                {designSystemConfig.minTypeScaleRatio}-{designSystemConfig.maxTypeScaleRatio}
              </div>
              <div className="text-muted-foreground">Type ratio range</div>
            </div>
            <div className="rounded-md border border-default bg-surface-50 px-2 py-2">
              <div className="font-semibold text-foreground">
                {designSystemConfig.fontWeightSans} / {designSystemConfig.fontWeightDisplay}
              </div>
              <div className="text-muted-foreground">Body / display weight</div>
            </div>
            <div className="rounded-md border border-default bg-surface-50 px-2 py-2">
              <div className="font-semibold text-foreground">
                {getDesignSystemIconLibraryLabel(activeIconLibraryId)}
              </div>
              <div className="text-muted-foreground">Icon library</div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="text-[11px] text-muted-foreground">
              Min viewport
              <input
                type="number"
                value={designSystemConfig.minViewportPx}
                onChange={(e) => updateDesignSystemConfig("minViewportPx", Number(e.target.value))}
                className="mt-1 w-full rounded-md border border-default bg-white px-2 py-1 text-xs text-foreground"
              />
            </label>
            <label className="text-[11px] text-muted-foreground">
              Max viewport
              <input
                type="number"
                value={designSystemConfig.maxViewportPx}
                onChange={(e) => updateDesignSystemConfig("maxViewportPx", Number(e.target.value))}
                className="mt-1 w-full rounded-md border border-default bg-white px-2 py-1 text-xs text-foreground"
              />
            </label>
            <label className="text-[11px] text-muted-foreground">
              Base unit
              <input
                type="number"
                step="1"
                value={designSystemConfig.baseUnitPx}
                onChange={(e) => updateDesignSystemConfig("baseUnitPx", Number(e.target.value))}
                className="mt-1 w-full rounded-md border border-default bg-white px-2 py-1 text-xs text-foreground"
              />
            </label>
            <label className="text-[11px] text-muted-foreground">
              Density
              <input
                type="number"
                step="0.05"
                value={designSystemConfig.density}
                onChange={(e) => updateDesignSystemConfig("density", Number(e.target.value))}
                className="mt-1 w-full rounded-md border border-default bg-white px-2 py-1 text-xs text-foreground"
              />
            </label>
            <label className="text-[11px] text-muted-foreground">
              Base min
              <input
                type="number"
                step="1"
                value={designSystemConfig.typeBaseMinPx}
                onChange={(e) => updateDesignSystemConfig("typeBaseMinPx", Number(e.target.value))}
                className="mt-1 w-full rounded-md border border-default bg-white px-2 py-1 text-xs text-foreground"
              />
            </label>
            <label className="text-[11px] text-muted-foreground">
              Base max
              <input
                type="number"
                step="1"
                value={designSystemConfig.typeBaseMaxPx}
                onChange={(e) => updateDesignSystemConfig("typeBaseMaxPx", Number(e.target.value))}
                className="mt-1 w-full rounded-md border border-default bg-white px-2 py-1 text-xs text-foreground"
              />
            </label>
            <label className="text-[11px] text-muted-foreground">
              Ratio min
              <input
                type="number"
                step="0.01"
                value={designSystemConfig.minTypeScaleRatio}
                onChange={(e) =>
                  updateDesignSystemConfig("minTypeScaleRatio", Number(e.target.value))
                }
                className="mt-1 w-full rounded-md border border-default bg-white px-2 py-1 text-xs text-foreground"
              />
            </label>
            <label className="text-[11px] text-muted-foreground">
              Ratio max
              <input
                type="number"
                step="0.01"
                value={designSystemConfig.maxTypeScaleRatio}
                onChange={(e) =>
                  updateDesignSystemConfig("maxTypeScaleRatio", Number(e.target.value))
                }
                className="mt-1 w-full rounded-md border border-default bg-white px-2 py-1 text-xs text-foreground"
              />
            </label>
            <label className="text-[11px] text-muted-foreground">
              Sans font
              <select
                value={designSystemConfig.fontFamilySans}
                onChange={(e) => updateDesignSystemConfig("fontFamilySans", e.target.value)}
                className="mt-1 w-full rounded-md border border-default bg-white px-2 py-1 text-xs text-foreground"
              >
                <option value="Inter">Inter</option>
                <option value="Poppins">Poppins</option>
              </select>
            </label>
            <label className="text-[11px] text-muted-foreground">
              Display font
              <select
                value={designSystemConfig.fontFamilyDisplay}
                onChange={(e) => updateDesignSystemConfig("fontFamilyDisplay", e.target.value)}
                className="mt-1 w-full rounded-md border border-default bg-white px-2 py-1 text-xs text-foreground"
              >
                <option value="Poppins">Poppins</option>
                <option value="Inter">Inter</option>
              </select>
            </label>
            <label className="text-[11px] text-muted-foreground">
              Body weight
              <input
                type="number"
                step="25"
                min={350}
                max={550}
                value={activeFontWeightSans}
                onChange={(e) => updateDesignSystemConfig("fontWeightSans", Number(e.target.value))}
                className="mt-1 w-full rounded-md border border-default bg-white px-2 py-1 text-xs text-foreground"
              />
            </label>
            <label className="text-[11px] text-muted-foreground">
              Display weight
              <input
                type="number"
                step="25"
                min={500}
                max={800}
                value={activeFontWeightDisplay}
                onChange={(e) =>
                  updateDesignSystemConfig("fontWeightDisplay", Number(e.target.value))
                }
                className="mt-1 w-full rounded-md border border-default bg-white px-2 py-1 text-xs text-foreground"
              />
            </label>
            <label className="col-span-2 text-[11px] text-muted-foreground">
              Icon library
              <select
                value={activeIconLibraryId}
                onChange={(e) =>
                  updateDesignSystemConfig("iconLibrary", e.target.value as DesignSystemIconLibraryId)
                }
                className="mt-1 w-full rounded-md border border-default bg-white px-2 py-1 text-xs text-foreground"
              >
                {DESIGN_SYSTEM_ICON_LIBRARIES.map((library) => (
                  <option key={library.id} value={library.id}>
                    {library.label}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-[10px] text-muted-foreground">
                {DESIGN_SYSTEM_ICON_LIBRARIES.find(
                  (library) => library.id === activeIconLibraryId
                )?.description || "Switch the preview icon set used across system nodes."}
              </span>
            </label>
            <label className="col-span-2 text-[11px] text-muted-foreground">
              Icon stroke
              <input
                type="number"
                step="0.05"
                value={designSystemConfig.iconStroke}
                onChange={(e) => updateDesignSystemConfig("iconStroke", Number(e.target.value))}
                className="mt-1 w-full rounded-md border border-default bg-white px-2 py-1 text-xs text-foreground"
              />
            </label>
          </div>
          <div className="mt-3 rounded-md border border-default bg-surface-50 px-3 py-2 text-[11px] text-muted-foreground">
            Utopia-style clamps drive the fluid font/icon scale. Capsize metrics drive line-height
            tokens and trims for the current font pair.
          </div>
          <button
            type="button"
            onClick={handleGenerateDesignSystem}
            className="mt-3 w-full rounded-md border border-default bg-white px-2 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-50"
          >
            Generate scale + preview nodes
          </button>
          </div>
        )}

        {canvasMode === "color-audit" && (
          <div className="border-b border-default px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tokens
            </h3>
            <span className="text-[11px] text-muted-foreground">{filteredTokens.length}</span>
          </div>
          <input
            type="text"
            value={tokenQuery}
            onChange={(e) => setTokenQuery(e.target.value)}
            placeholder="Filter color tokens"
            className="w-full rounded-md border border-default bg-white px-3 py-1.5 text-xs text-foreground placeholder:text-muted focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
          />
          </div>
        )}

        <div className="px-4 py-3">
          {canvasMode === "color-audit" ? (
            <>
              <div className="rounded-xl border border-default bg-surface-50 px-3 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Add Nodes
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddSeedNode("brand")}
                    className="flex items-center gap-2 rounded-md border border-default bg-white px-2 py-2 text-left text-xs text-foreground hover:bg-surface-50"
                  >
                    <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="flex-1 truncate font-medium">Brand Seed</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddSeedNode("accent")}
                    className="flex items-center gap-2 rounded-md border border-default bg-white px-2 py-2 text-left text-xs text-foreground hover:bg-surface-50"
                  >
                    <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="flex-1 truncate font-medium">Accent Seed</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAddCustomToken}
                    className="flex items-center gap-2 rounded-md border border-default bg-white px-2 py-2 text-left text-xs text-foreground hover:bg-surface-50"
                  >
                    <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="flex-1 truncate font-medium">Custom Token</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAddRelativeToken}
                    className="flex items-center gap-2 rounded-md border border-default bg-white px-2 py-2 text-left text-xs text-foreground hover:bg-surface-50"
                  >
                    <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="flex-1 truncate font-medium">Relative Rule</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAddCustomFunctionalAlias}
                    className="flex items-center gap-2 rounded-md border border-default bg-white px-2 py-2 text-left text-xs text-foreground hover:bg-surface-50"
                  >
                    <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="flex-1 truncate font-medium">Functional Alias</span>
                  </button>
                </div>
                <div className="mt-2 text-[10px] leading-5 text-muted-foreground">
                  Inputs feed the graph. Map them into functional aliases, then connect those into semantic roles and components.
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Framework Aliases
                </h3>
                {Object.entries(FUNCTIONAL_TOKEN_PRESETS).map(([frameworkId, presets]) => (
                  <div
                    key={frameworkId}
                    className="rounded-xl border border-default bg-surface-50 px-3 py-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-semibold text-foreground">
                          {getFrameworkLabel(frameworkId as ColorCanvasFrameworkId)}
                        </div>
                        <div className="text-[10px] leading-5 text-muted-foreground">
                          Preset functional aliases used by popular component libraries.
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleAddFunctionalFrameworkSet(frameworkId as ColorCanvasFrameworkId)
                        }
                        className="rounded-full border border-default bg-white px-2.5 py-1 text-[10px] font-semibold text-muted-foreground hover:bg-surface-50"
                      >
                        Add set
                      </button>
                    </div>
                    <div className="mt-2 space-y-2">
                      {presets.map((preset) => (
                        <button
                          key={preset.cssVar}
                          type="button"
                          onClick={() => handleAddFunctionalToken(preset)}
                          className="flex w-full items-start gap-2 rounded-md border border-default bg-white px-2 py-2 text-left text-xs text-foreground hover:bg-surface-50"
                        >
                          <Plus className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium">{preset.label}</div>
                            <div className="truncate text-[10px] text-muted-foreground">
                              {preset.cssVar} · {preset.description}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Semantic Roles
                </h3>
                <div className="space-y-2">
                  {SEMANTIC_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handleAddSemantic(preset)}
                      className="flex w-full items-center gap-2 rounded-md border border-default bg-white px-2 py-2 text-left text-xs text-foreground hover:bg-surface-50"
                    >
                      <Type className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1 truncate font-medium">{preset.label}</span>
                      <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Token Library
                </h3>
                <div className="space-y-2">
                  {groupedFilteredTokens.map((group) => (
                    <div key={group.id} className="space-y-2">
                      <div className="flex items-center justify-between px-1">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {group.label}
                        </div>
                        <div className="text-[10px] text-muted-foreground">{group.tokens.length}</div>
                      </div>
                      {group.tokens.map((token) => (
                        <button
                          key={token.cssVar}
                          type="button"
                          onClick={() => handleAddToken(token)}
                          className="flex w-full items-center gap-2 rounded-md border border-default bg-white px-2 py-2 text-left text-xs text-foreground hover:bg-surface-50"
                        >
                          <span
                            className="h-4 w-4 rounded border border-default"
                            style={{
                              background: tokenValues[token.cssVar] || `var(${token.cssVar})`,
                            }}
                          />
                          <span className="flex-1 truncate font-medium">{token.label}</span>
                          <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Components
                </h3>
                <button
                  type="button"
                  onClick={() => addComponentNode("Button / Primary", getNextPosition(nodes))}
                  className="flex w-full items-center gap-2 rounded-md border border-default bg-white px-2 py-2 text-left text-xs text-foreground hover:bg-surface-50"
                >
                  <Move className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 truncate font-medium">Button / Primary</span>
                  <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>

              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-3">
                  <div className="text-xs font-semibold text-foreground">Color Audit workflow</div>
                  <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                    Build or generate palette inputs, map them into functional aliases or semantic
                    roles, verify coverage and contrast, then export the resolved token set into the
                    format your project needs.
                  </p>
                </div>

                <div className="rounded-xl border border-default bg-surface-50 px-3 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Coverage
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-foreground">
                    <div className="rounded-md border border-default bg-white px-2 py-2">
                      <div className="font-semibold">{colorAuditWorkflow.inputs}</div>
                      <div className="text-muted-foreground">Inputs</div>
                    </div>
                    <div className="rounded-md border border-default bg-white px-2 py-2">
                      <div className="font-semibold">{colorAuditWorkflow.relativeRules}</div>
                      <div className="text-muted-foreground">Relative rules</div>
                    </div>
                    <div className="rounded-md border border-default bg-white px-2 py-2">
                      <div className="font-semibold">{colorAuditWorkflow.functionalAliases}</div>
                      <div className="text-muted-foreground">Functional aliases</div>
                    </div>
                    <div className="rounded-md border border-default bg-white px-2 py-2">
                      <div className="font-semibold">{colorAuditWorkflow.semanticRoles}</div>
                      <div className="text-muted-foreground">Semantic roles</div>
                    </div>
                    <div className="rounded-md border border-default bg-white px-2 py-2">
                      <div className="font-semibold">{colorAuditWorkflow.mappedSemanticRoles}</div>
                      <div className="text-muted-foreground">Mapped roles</div>
                    </div>
                    <div className="rounded-md border border-default bg-white px-2 py-2">
                      <div className="font-semibold">{colorAuditWorkflow.exportableTokens}</div>
                      <div className="text-muted-foreground">Exportable tokens</div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between rounded-md border border-default bg-white px-2 py-2 text-[11px]">
                      <div>
                        <div className="font-medium text-foreground">Generic export</div>
                        <div className="text-muted-foreground">
                          Needs inputs plus text and surface roles with resolved colors.
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          colorAuditWorkflow.genericReady
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {colorAuditWorkflow.genericReady ? "Ready" : "Incomplete"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-md border border-default bg-white px-2 py-2 text-[11px]">
                      <div>
                        <div className="font-medium text-foreground">Framework export</div>
                        <div className="text-muted-foreground">
                          Needs mapped functional aliases before exporting shadcn or Radix vars.
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          colorAuditWorkflow.frameworkReady
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {colorAuditWorkflow.frameworkReady ? "Ready" : "Incomplete"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-default bg-surface-50 px-3 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Export formats
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowColorAuditExportPreview(true)}
                        className="inline-flex items-center gap-1 rounded-full border border-default bg-white px-2.5 py-1 text-[10px] font-semibold text-muted-foreground hover:bg-surface-50"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Preview export
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyColorAuditExport}
                        className="inline-flex items-center gap-1 rounded-full border border-default bg-white px-2.5 py-1 text-[10px] font-semibold text-muted-foreground hover:bg-surface-50"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {copiedColorAuditExportFormat === selectedColorAuditExportFormat
                          ? "Copied"
                          : "Copy"}
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 rounded-md border border-default bg-white px-2 py-2 text-[11px]">
                    <div>
                      <div className="font-medium text-foreground">Export scope</div>
                      <div className="text-muted-foreground">
                        Only mapped semantic roles and functional aliases are included.
                      </div>
                    </div>
                    <span className="rounded-full bg-surface-50 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {colorAuditProjectExportEntries.length} tokens
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {COLOR_AUDIT_EXPORT_FORMAT_OPTIONS.map((format) => (
                      <button
                        key={format.id}
                        type="button"
                        onClick={() => setSelectedColorAuditExportFormat(format.id)}
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                          selectedColorAuditExportFormat === format.id
                            ? "border-brand-500 bg-brand-50 text-brand-700"
                            : "border-default bg-white text-muted-foreground hover:bg-surface-50"
                        }`}
                      >
                        {format.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {COLOR_AUDIT_EXPORT_COLOR_MODE_OPTIONS.map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setSelectedColorAuditExportColorMode(mode.id)}
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                          selectedColorAuditExportColorMode === mode.id
                            ? "border-brand-500 bg-brand-50 text-brand-700"
                            : "border-default bg-white text-muted-foreground hover:bg-surface-50"
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 rounded-md border border-default bg-white px-3 py-2">
                    <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all text-[10px] leading-5 text-foreground">
                      {selectedColorAuditExportText}
                    </pre>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-3">
                <div className="text-xs font-semibold text-foreground">System Canvas workflow</div>
                <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                  Tune the scale engine, generate nodes, then switch between Colors, Type,
                  Layout, Primitives, and Standards views to inspect the output.
                </p>
              </div>
              <div className="rounded-xl border border-default bg-surface-50 px-3 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Current output
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-foreground">
                  <div className="rounded-md border border-default bg-white px-2 py-2">
                    <div className="font-semibold">{designSystem.typography.length}</div>
                    <div className="text-muted-foreground">Type steps</div>
                  </div>
                  <div className="rounded-md border border-default bg-white px-2 py-2">
                    <div className="font-semibold">{designSystem.icons.length}</div>
                    <div className="text-muted-foreground">Icon steps</div>
                  </div>
                  <div className="rounded-md border border-default bg-white px-2 py-2">
                    <div className="font-semibold">{designSystem.layouts.length}</div>
                    <div className="text-muted-foreground">Layouts</div>
                  </div>
                  <div className="rounded-md border border-default bg-white px-2 py-2">
                    <div className="font-semibold">{designSystem.tokens.length}</div>
                    <div className="text-muted-foreground">Tokens</div>
                  </div>
                  <div className="rounded-md border border-default bg-white px-2 py-2">
                    <div className="font-semibold">{activeFontWeightSans}</div>
                    <div className="text-muted-foreground">Body weight</div>
                  </div>
                  <div className="rounded-md border border-default bg-white px-2 py-2">
                    <div className="font-semibold">{activeFontWeightDisplay}</div>
                    <div className="text-muted-foreground">Display weight</div>
                  </div>
                  <div className="col-span-2 rounded-md border border-default bg-white px-2 py-2">
                    <div className="font-semibold">
                      {getDesignSystemIconLibraryLabel(activeIconLibraryId)}
                    </div>
                    <div className="text-muted-foreground">Active icon library</div>
                  </div>
                  <div className="col-span-2 rounded-md border border-default bg-white px-2 py-2">
                    <div className="font-semibold">{designSystem.cssVars["--icon-stroke"]}</div>
                    <div className="text-muted-foreground">Icon stroke matched to current weights</div>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-default bg-surface-50 px-3 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Required nodes
                </div>
                <div className="mt-2 space-y-2">
                  {systemNodeRequirements.map((requirement) => {
                    const complete = requirement.count >= requirement.required
                    return (
                      <div
                        key={requirement.label}
                        className="flex items-center justify-between rounded-md border border-default bg-white px-2 py-2 text-[11px]"
                      >
                        <div>
                          <div className="font-medium text-foreground">{requirement.label}</div>
                          <div className="text-muted-foreground">
                            Need {requirement.required} in graph
                          </div>
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            complete
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {requirement.count}/{requirement.required}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
        </div>
      </aside>

      <main className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-default bg-white px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Canvas mode:</span>
            {CANVAS_MODE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => handleCanvasModeChange(option.id)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                  canvasMode === option.id
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-default text-muted-foreground hover:bg-surface-50"
                }`}
                title={option.description}
              >
                {option.label}
              </button>
            ))}
          </div>
          {canvasMode === "system-canvas" ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Canvas view:</span>
              {systemCanvasViewOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleCanvasViewModeChange(option.id)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    effectiveCanvasViewMode === option.id
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-default text-muted-foreground hover:bg-surface-50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">
              Color Audit keeps the token graph, roles, and contrast checks in one workspace.
            </div>
          )}
          {isRelationshipMode ? (
            <>
              {canvasMode === "color-audit" && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">Focus:</span>
                  {COLOR_AUDIT_FOCUS_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => applyAuditFocusMode(option.id)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                        activeAuditFocusMode === option.id
                          ? "border-brand-500 bg-brand-50 text-brand-700"
                          : "border-default text-muted-foreground hover:bg-surface-50"
                      }`}
                      title={option.description}
                    >
                      {option.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setShowAdvancedAuditControls((prev) => !prev)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                      showAdvancedAuditControls
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-default text-muted-foreground hover:bg-surface-50"
                    }`}
                  >
                    {showAdvancedAuditControls ? "Hide advanced" : "Advanced"}
                  </button>
                </div>
              )}
              {(canvasMode !== "color-audit" || showAdvancedAuditControls) && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">Connect mode:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setConnectMode(connectMode === "map" ? null : "map")
                      setConnectSourceId(null)
                      setConnectDrag({ active: false, x: 0, y: 0 })
                    }}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                      connectMode === "map"
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-default text-muted-foreground hover:bg-surface-50"
                    }`}
                  >
                    Token → Role
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConnectMode(connectMode === "contrast" ? null : "contrast")
                      setConnectSourceId(null)
                      setConnectDrag({ active: false, x: 0, y: 0 })
                    }}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                      connectMode === "contrast"
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-default text-muted-foreground hover:bg-surface-50"
                    }`}
                  >
                    Contrast
                  </button>
                  {connectMode && (
                    <span className="text-[11px] text-muted-foreground">
                      {connectSourceId ? "Select target (or drag)" : "Select source"}
                    </span>
                  )}
                </div>
              )}
              {(canvasMode !== "color-audit" || (showAdvancedAuditControls && connectMode)) && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">Quick connect:</span>
                  <button
                    type="button"
                    onClick={() => handleQuickConnect("text", "surface")}
                    className="rounded-full border border-default px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-surface-50"
                  >
                    Text ↔ Surface
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickConnect("icon", "surface")}
                    className="rounded-full border border-default px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-surface-50"
                  >
                    Icon ↔ Surface
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickConnect("accent", "surface")}
                    className="rounded-full border border-default px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-surface-50"
                  >
                    Accent ↔ Surface
                  </button>
                </div>
              )}
              {canvasMode === "color-audit" && !showAdvancedAuditControls && (
                <div className="text-xs text-muted-foreground">
                  Use the focus presets for review. Advanced reveals direct connect tools and quick connect.
                </div>
              )}
            </>
          ) : (
            <div className="text-xs text-muted-foreground">
              System views are arranged as a left-to-right flow: colors, type, layouts, primitives, then standards.
            </div>
          )}
          {canvasMode === "system-canvas" && !isRelationshipMode && systemSectionFrames.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Jump to:</span>
              <button
                type="button"
                onClick={() => scrollWorkspaceTo(0, 0)}
                className="rounded-full border border-default px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-surface-50"
              >
                Start
              </button>
              {systemSectionFrames.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => handleJumpToSystemSection(section.id as SystemSectionId)}
                  className="rounded-full border border-default px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-surface-50"
                  title={section.description}
                >
                  {section.label}
                </button>
              ))}
              <button
                type="button"
                onClick={handleJumpToSelectedNode}
                disabled={!selectedNode || !visibleNodeIds.has(selectedNode.id)}
                className="rounded-full border border-default px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-surface-50 disabled:opacity-50"
              >
                Selection
              </button>
            </div>
          )}
          {canvasMode === "system-canvas" && !isRelationshipMode && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Zoom:</span>
              <button
                type="button"
                onClick={handleSystemZoomOut}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-default text-muted-foreground hover:bg-surface-50"
                aria-label="Zoom out"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleResetSystemZoom}
                className="rounded-full border border-default px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-surface-50"
              >
                {Math.round(systemCanvasTransform.scale * 100)}%
              </button>
              <button
                type="button"
                onClick={handleSystemZoomIn}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-default text-muted-foreground hover:bg-surface-50"
                aria-label="Zoom in"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleSystemBirdView}
                disabled={visibleNodes.length === 0}
                className="rounded-full border border-default px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-surface-50 disabled:opacity-50"
              >
                Bird view
              </button>
            </div>
          )}
          {canvasMode === "color-audit" && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Zoom:</span>
              <button
                type="button"
                onClick={handleColorAuditZoomOut}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-default text-muted-foreground hover:bg-surface-50"
                aria-label="Zoom out"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleResetColorAuditZoom}
                className="rounded-full border border-default px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-surface-50"
              >
                {Math.round(colorAuditTransform.scale * 100)}%
              </button>
              <button
                type="button"
                onClick={handleColorAuditZoomIn}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-default text-muted-foreground hover:bg-surface-50"
                aria-label="Zoom in"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleColorAuditBirdView}
                disabled={visibleNodes.length === 0}
                className="rounded-full border border-default px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-surface-50 disabled:opacity-50"
              >
                Bird view
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Edges:</span>
            {(isRelationshipMode
              ? (["all", "map", "contrast"] as const)
              : (["map"] as const)
            ).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => handleEdgeFilterChange(filter)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                  edgeFilter === filter
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-default text-muted-foreground hover:bg-surface-50"
                }`}
              >
                {filter === "all" ? "All" : filter === "map" ? "Map" : "Contrast"}
              </button>
            ))}
            <button
              type="button"
              onClick={undoRemoveEdge}
              disabled={!canUndoEdgeRemoval}
              className="flex items-center gap-2 rounded-full border border-default px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-surface-50 disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Undo
            </button>
            {canvasMode === "color-audit" && (
              <>
                <span className="ml-1 text-xs font-semibold text-muted-foreground">Arrange:</span>
                {COLOR_AUDIT_LAYOUT_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleArrangeColorAudit(option.id)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                      colorAuditLayoutMode === option.id
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-default text-muted-foreground hover:bg-surface-50"
                    }`}
                    title={option.description}
                  >
                    {option.label}
                  </button>
                ))}
              </>
            )}
            {isRelationshipMode && (canvasMode !== "color-audit" || showAdvancedAuditControls) && (
              <>
                <button
                  type="button"
                  onClick={() => setShowDependencies((prev) => !prev)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    showDependencies
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-default text-muted-foreground hover:bg-surface-50"
                  }`}
                >
                  Dependencies
                </button>
                <button
                  type="button"
                  onClick={() => setAutoContrastEnabled((prev) => !prev)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    autoContrastEnabled
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-default text-muted-foreground hover:bg-surface-50"
                  }`}
                >
                  Auto contrast
                </button>
              </>
            )}
            {(canvasMode !== "color-audit" || showAdvancedAuditControls) && (
              <button
                type="button"
                onClick={() => setShowFullLabels((prev) => !prev)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                  showFullLabels
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-default text-muted-foreground hover:bg-surface-50"
                }`}
              >
                Full labels
              </button>
            )}
            {canvasMode === "system-canvas" && (
              <>
                <button
                  type="button"
                  onClick={handleAutoArrangeVisibleNodes}
                  disabled={isRelationshipMode || visibleNodes.length === 0}
                  className="rounded-full border border-default px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-surface-50 disabled:opacity-50"
                >
                  Auto arrange
                </button>
                <button
                  type="button"
                  onClick={handleFitWidthVisibleNodes}
                  disabled={isRelationshipMode || visibleNodes.length === 0}
                  className="rounded-full border border-default px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-surface-50 disabled:opacity-50"
                >
                  Fit width
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setShowNodeCatalog(true)}
              disabled={renderedNodes.length === 0}
              className="rounded-full border border-default px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-surface-50 disabled:opacity-50"
            >
              Node catalog
            </button>
          </div>
        </div>

        <div
          ref={workspaceRef}
          className={`relative min-h-0 min-w-0 flex-1 overscroll-contain ${
            workspaceTransformEnabled ? "overflow-hidden" : "overflow-auto"
          } ${
            isRelationshipMode
              ? "bg-[radial-gradient(circle_at_top,#f8fbfa,transparent_55%)]"
              : "bg-[radial-gradient(circle_at_top,#f8fbff,transparent_55%)]"
          }`}
          onClick={handleWorkspaceClick}
          onWheel={workspaceTransformEnabled ? handleWorkspaceWheel : undefined}
        >
          <div
            ref={workspaceCanvasRef}
            className={`relative min-h-full min-w-full ${
              workspaceTransformEnabled ? "absolute left-0 top-0 origin-top-left" : ""
            }`}
            style={
              workspaceTransformEnabled && activeCanvasTransform
                ? {
                    width: canvasContentSize.width,
                    height: canvasContentSize.height,
                    transform: `translate(${activeCanvasTransform.offset.x}px, ${activeCanvasTransform.offset.y}px) scale(${activeCanvasTransform.scale})`,
                  }
                : { width: canvasContentSize.width, height: canvasContentSize.height }
            }
          >
            {!isRelationshipMode &&
              visibleSectionFrames.map((section) => (
                <div
                  key={`section-${section.id}`}
                  className="pointer-events-none absolute"
                  style={{
                    left: section.x,
                    top: Math.max(16, section.y),
                  }}
                >
                  <div
                    className={`inline-flex items-center gap-3 rounded-full px-3 py-1 shadow-sm backdrop-blur ${
                      canvasMode === "color-audit"
                        ? "border border-emerald-200/80 bg-white/92"
                        : "border border-default bg-white/90"
                    }`}
                  >
                    <div className="text-[10px] font-semibold uppercase text-muted-foreground">
                      {section.label}
                    </div>
                    <div className="max-w-[220px] truncate text-[10px] text-muted-foreground">
                      {section.description}
                    </div>
                    <span className="rounded-full bg-surface-50 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {section.nodeIds.length}
                    </span>
                  </div>
                </div>
              ))}
            <svg
              className="absolute inset-0"
              width={canvasContentSize.width}
              height={canvasContentSize.height}
            >
              {showDependencies &&
                visibleDependencyEdges.map((edge) => {
                  const source = renderedNodesById[edge.sourceId]
                  const target = renderedNodesById[edge.targetId]
                  if (!source || !target) return null
                  const sourceSize = getNodeSize(source)
                  const targetSize = getNodeSize(target)
                  const ports = getEdgePortIds("dependency")
                  const sourcePort = getColorNodePortPosition(source, sourceSize, ports.source)
                  const targetPort = getColorNodePortPosition(target, targetSize, ports.target)
                  const routed = buildColorConnectionPath(sourcePort, targetPort, "dependency")
                  return (
                    <g key={edge.id}>
                      <path
                        d={routed.path}
                        fill="none"
                        stroke="#94a3b8"
                        strokeWidth={1.5}
                        strokeDasharray="3 4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={hasActiveEdgeSelection ? 0.16 : 0.9}
                      />
                      <circle
                        cx={sourcePort.x}
                        cy={sourcePort.y}
                        r={3.5}
                        fill="#94a3b8"
                        opacity={hasActiveEdgeSelection ? 0.16 : 0.9}
                      />
                      <circle
                        cx={targetPort.x}
                        cy={targetPort.y}
                        r={3.5}
                        fill="white"
                        stroke="#94a3b8"
                        strokeWidth={2}
                        opacity={hasActiveEdgeSelection ? 0.16 : 0.9}
                      />
                    </g>
                  )
                })}
              {visibleEdges.map((edge) => {
                const source = renderedNodesById[edge.sourceId]
                const target = renderedNodesById[edge.targetId]
                if (!source || !target) return null
                const sourceSize = getNodeSize(source)
                const targetSize = getNodeSize(target)
                const kind = edge.type === "contrast" ? "contrast" : "map"
                const ports = getEdgePortIds(kind)
                const sourcePort = getColorNodePortPosition(source, sourceSize, ports.source)
                const targetPort = getColorNodePortPosition(target, targetSize, ports.target)
                const routed = buildColorConnectionPath(sourcePort, targetPort, kind)
                const stroke = kind === "map" ? "#818cf8" : "#f97316"
                const isSelectedEdge =
                  selectedEdgeId === edge.id || selectedAutoEdgeId === edge.id
                return (
                  <g key={edge.id}>
                    <path
                      d={routed.path}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={14}
                      className="cursor-pointer"
                      onClick={(event) => {
                        event.stopPropagation()
                        handleEdgeBadgeClick(edge)
                      }}
                    />
                    <path
                      d={routed.path}
                      fill="none"
                      stroke={stroke}
                      strokeWidth={isSelectedEdge ? 3 : 2}
                      strokeDasharray={edge.type === "contrast" ? "6 4" : ""}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={hasActiveEdgeSelection && !isSelectedEdge ? 0.18 : 1}
                    />
                    <circle
                      cx={sourcePort.x}
                      cy={sourcePort.y}
                      r={3.5}
                      fill={stroke}
                      className="cursor-pointer"
                      opacity={hasActiveEdgeSelection && !isSelectedEdge ? 0.18 : 1}
                      onClick={(event) => {
                        event.stopPropagation()
                        handleEdgeBadgeClick(edge)
                      }}
                    />
                    <circle
                      cx={targetPort.x}
                      cy={targetPort.y}
                      r={3.5}
                      fill="white"
                      stroke={stroke}
                      strokeWidth={2}
                      className="cursor-pointer"
                      opacity={hasActiveEdgeSelection && !isSelectedEdge ? 0.18 : 1}
                      onClick={(event) => {
                        event.stopPropagation()
                        handleEdgeBadgeClick(edge)
                      }}
                    />
                    {isSelectedEdge ? (
                      <>
                        {routed.controlPoints?.map((point: { x: number; y: number }, index: number) => (
                          <circle
                            key={`${edge.id}-control-${index}`}
                            cx={point.x}
                            cy={point.y}
                            r={3}
                            fill="#ffffff"
                            stroke={stroke}
                            strokeWidth={1.5}
                            className="cursor-pointer"
                            onClick={(event) => {
                              event.stopPropagation()
                              handleEdgeBadgeClick(edge)
                            }}
                          />
                        ))}
                        <circle
                          cx={routed.midPoint.x}
                          cy={routed.midPoint.y}
                          r={4}
                          fill={stroke}
                          className="cursor-pointer"
                          onClick={(event) => {
                            event.stopPropagation()
                            handleEdgeBadgeClick(edge)
                          }}
                        />
                      </>
                    ) : null}
                  </g>
                )
              })}
              {connectMode && connectSourceId && connectDrag.active && (() => {
                const source = renderedNodesById[connectSourceId]
                if (!source) return null
                const sourceSize = getNodeSize(source)
                const kind = connectMode === "contrast" ? "contrast" : "map"
                const ports = getEdgePortIds(kind)
                const sourcePort = getColorNodePortPosition(source, sourceSize, ports.source)
                const routed = buildColorConnectionPath(sourcePort, connectDrag, kind)
                const stroke = kind === "map" ? "#818cf8" : "#f97316"
                return (
                  <g>
                    <path
                      d={routed.path}
                      fill="none"
                      stroke={stroke}
                      strokeWidth={2}
                      strokeDasharray="4 4"
                    />
                    <circle cx={sourcePort.x} cy={sourcePort.y} r={3.5} fill={stroke} />
                  </g>
                )
              })()}
            </svg>

            {visibleEdges.map((edge) => {
              const source = renderedNodesById[edge.sourceId]
              const target = renderedNodesById[edge.targetId]
              if (!source || !target) return null
              const sourceSize = getNodeSize(source)
              const targetSize = getNodeSize(target)
              const kind = edge.type === "contrast" ? "contrast" : "map"
              const ports = getEdgePortIds(kind)
              const sourcePort = getColorNodePortPosition(source, sourceSize, ports.source)
              const targetPort = getColorNodePortPosition(target, targetSize, ports.target)
              const routed = buildColorConnectionPath(sourcePort, targetPort, kind)
              const contrast = getEdgeContrast(edge)
              const label = resolveEdgeBadgeLabel(edge, contrast)
              const absValue = contrast ? Math.abs(contrast) : 0
              const badgeClass =
                edge.type === "contrast"
                  ? absValue >= 60
                    ? "bg-emerald-100 text-emerald-700"
                    : absValue >= 30
                      ? "bg-amber-100 text-amber-700"
                      : "bg-rose-100 text-rose-700"
                  : "bg-indigo-100 text-indigo-700"

              return (
                <button
                  key={`${edge.id}-badge`}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    handleEdgeBadgeClick(edge)
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full px-2 py-1 text-[10px] font-semibold shadow-sm ${badgeClass}`}
                  style={{
                    left: routed.badgeX,
                    top: routed.badgeY,
                    opacity:
                      hasActiveEdgeSelection &&
                      selectedEdgeId !== edge.id &&
                      selectedAutoEdgeId !== edge.id
                        ? 0.28
                        : 1,
                  }}
                >
                  {label}
                </button>
              )
            })}

            {renderedNodes.map((node) => (
              <ColorNode
                key={node.id}
                node={node}
                size={getNodeSize(node)}
                minSize={getNodeMinSize(node)}
                portIds={nodePortUsage[node.id] ?? []}
                resolveColor={getNodeColor}
                resolveIsP3={getNodeIsP3}
                resolveExpression={getNodeColorExpression}
                resolveLabel={getNodeLabel}
                selected={selectedNodeId === node.id}
                highlighted={highlightedConnectionNodeIds.has(node.id)}
                dimmed={
                  hasActiveEdgeSelection &&
                  !highlightedConnectionNodeIds.has(node.id) &&
                  selectedNodeId !== node.id
                }
                connectActive={isRelationshipMode && connectMode !== null}
                connectMode={connectMode}
                connectDragging={connectDrag.active}
                connectSourceId={connectSourceId}
                movable
                onMove={handleDisplayNodeMove}
                onResize={handleNodeResize}
                onClick={handleNodeClick}
                onConnectStart={handleConnectStart}
                showFullLabels={showFullLabels}
                toCanvasPosition={viewportToCanvasPosition}
              />
            ))}
            {renderedNodes.length === 0 && (
              <div className="absolute left-1/2 top-1/2 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-dashed border-default bg-white/90 px-5 py-6 text-center shadow-sm">
                <div className="text-sm font-semibold text-foreground">
                  {canvasMode === "color-audit" ? "Canvas is empty" : "No nodes in this view yet"}
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {canvasMode === "color-audit"
                  ? "Add token, semantic, or relative nodes to build the color graph."
                  : "Use Design System API → Generate scale + preview nodes, then switch between Colors, Type, Layout, Primitives, or Standards views."}
              </p>
            </div>
          )}
          </div>
        </div>
      </main>

      <aside className="flex w-72 flex-col border-l border-default bg-white">
        {themePanelVisible ? (
          <CanvasThemePanel
            themes={themes}
            activeThemeId={activeThemeId}
            onThemeChange={setActiveThemeId}
            onOpenColorCanvas={() => {}}
            onAddTheme={addTheme}
            onUpdateThemeVar={updateThemeVar}
            tokenValues={tokenValues}
            tokens={tokens}
            onClose={() => setThemePanelVisible(false)}
          />
        ) : (
          <div className="flex h-full flex-col">
            <div className="border-b border-default px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {panelMode === "audit" ? "Audit" : "Inspector"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {panelMode === "audit" ? "APCA contrast report" : "Node + edge details"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex rounded-full border border-default bg-white p-0.5 text-[10px] font-semibold">
                    {(["inspector", "audit"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setPanelMode(mode)}
                        className={`rounded-full px-2 py-0.5 ${
                          panelMode === mode
                            ? "bg-gray-900 text-white"
                            : "text-gray-600 hover:bg-surface-50"
                        }`}
                      >
                        {mode === "audit" ? "Audit" : "Inspect"}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setThemePanelVisible(true)}
                    className="rounded-md border border-default bg-white px-2 py-1 text-xs font-semibold text-foreground hover:bg-surface-50"
                  >
                    Themes
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 text-xs text-foreground">
              {panelMode === "audit" ? (
                <div className="space-y-3">
                  {contrastEdges.length === 0 ? (
                    <div className="rounded-md border border-dashed border-default bg-white px-3 py-2 text-xs text-muted-foreground">
                      Add contrast edges to see APCA status.
                    </div>
                  ) : (
                    contrastEdges.map((edge) => {
                      const contrast = getEdgeContrast(edge)
                      const target = getEdgeTarget(edge)
                      const status = getApcaStatus(contrast, target)
                      const statusClass =
                        status === "pass"
                          ? "bg-emerald-100 text-emerald-700"
                          : status === "fail"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-slate-100 text-slate-600"
                      const label = resolveEdgeLabel(edge)

                      return (
                        <button
                          key={edge.id}
                          type="button"
                          onClick={() => {
                            if (edge.auto) {
                              selectEdge(null)
                              setSelectedAutoEdgeId(edge.id)
                            } else {
                              setSelectedAutoEdgeId(null)
                              selectEdge(edge.id)
                            }
                            setPanelMode("inspector")
                          }}
                          className="flex w-full items-center justify-between gap-2 rounded-md border border-default bg-white px-3 py-2 text-left text-xs hover:bg-surface-50"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-xs font-semibold text-foreground">{label}</div>
                            <div className="text-[11px] text-muted-foreground">
                              Target Lc {target}
                            </div>
                          </div>
                          <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${statusClass}`}>
                            {formatLc(contrast)}
                          </span>
                        </button>
                      )
                    })
                  )}
                </div>
              ) : (
                <>
                  <div className="mb-4 rounded-md border border-default bg-white px-3 py-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-foreground">Contrast rules</div>
                        <div className="text-[11px] text-muted-foreground">
                          Auto edges based on roles
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAutoContrastEnabled((prev) => !prev)}
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                          autoContrastEnabled
                            ? "border-brand-500 bg-brand-50 text-brand-700"
                            : "border-default text-muted-foreground"
                        }`}
                      >
                        {autoContrastEnabled ? "On" : "Off"}
                      </button>
                    </div>
                    <div className="space-y-2">
                      {contrastRules.map((rule) => (
                        <div key={rule.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={rule.enabled}
                            disabled={!autoContrastEnabled}
                            onChange={(e) =>
                              setContrastRules((prev) =>
                                prev.map((entry) =>
                                  entry.id === rule.id
                                    ? { ...entry, enabled: e.target.checked }
                                    : entry
                                )
                              )
                            }
                          />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[11px] font-semibold text-foreground">
                              {rule.label}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {rule.foregroundRole} → {rule.backgroundRole}
                            </div>
                          </div>
                          <select
                            value={rule.targetLc}
                            disabled={!autoContrastEnabled}
                            onChange={(e) =>
                              setContrastRules((prev) =>
                                prev.map((entry) =>
                                  entry.id === rule.id
                                    ? { ...entry, targetLc: Number(e.target.value) }
                                    : entry
                                )
                              )
                            }
                            className="rounded-md border border-default bg-white px-2 py-1 text-[11px] text-foreground"
                          >
                            {APCA_TARGETS.map((target) => (
                              <option key={target} value={target}>
                                Lc {target}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>

                  {!selectedNode && !selectedEdgeData && (
                    <div className="rounded-md border border-dashed border-default bg-white px-3 py-2 text-xs text-muted-foreground">
                      Select a node or edge to inspect details.
                    </div>
                  )}

                  {selectedNode && (
                    <div className="space-y-3">
                      <div>
                        <div className="text-[11px] text-muted-foreground">Preview</div>
                        <div className="mt-1 flex items-center gap-2 rounded-md border border-default bg-surface-50 px-2 py-1">
                          <div
                            className="h-5 w-5 rounded border border-default"
                            style={{ background: selectedPreviewColor || "transparent" }}
                          />
                          <div className="min-w-0 flex-1 truncate text-[11px] font-mono text-foreground">
                            {selectedPreviewColor || "—"}
                          </div>
                          {selectedPreviewIsP3 && (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                              P3
                            </span>
                          )}
                        </div>
                        {!selectedPreviewColor && selectedNode.type === "relative" && !supportsRelativeColor && (
                          <div className="mt-1 text-[10px] text-amber-600">
                            Relative colors are not supported in this browser, so preview may be empty.
                          </div>
                        )}
                        {!selectedNode.preview && (
                          <div className="mt-1 text-[10px] text-muted-foreground">
                            Use Quick preview edit for local review. Apply to Theme persists node values back into the active theme.
                          </div>
                        )}
                        {selectedNode.preview && (
                          <DesignSystemNodePreview preview={selectedNode.preview} />
                        )}
                      </div>
                      {!selectedNode.preview && selectedNode.type !== "component" && (
                        <div className="rounded-md border border-default bg-surface-50 px-3 py-3">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <div className="text-[11px] font-semibold text-foreground">Quick preview edit</div>
                              <div className="text-[10px] text-muted-foreground">
                                Writes a local override to this node.
                              </div>
                            </div>
                            {selectedNode.value && (
                              <button
                                type="button"
                                onClick={() => updateNodeValue(selectedNode.id, "")}
                                className="rounded-md border border-default bg-white px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:bg-surface-50"
                              >
                                Clear override
                              </button>
                            )}
                          </div>
                          <div className="mt-3 flex items-center gap-3">
                            <input
                              type="color"
                              value={selectedQuickEditHex}
                              onChange={(e) => updateNodeValue(selectedNode.id, e.target.value)}
                              className="h-9 w-12 rounded border border-default bg-white"
                              aria-label="Quick color override"
                            />
                            <div className="text-[10px] leading-5 text-muted-foreground">
                              {selectedQuickEditRgba
                                ? `Starts from ${selectedQuickEditHex}. Use the field below for OKLCH, P3, or full expressions.`
                                : "No resolved color yet. Pick a starting color here to create a local override."}
                            </div>
                          </div>
                        </div>
                      )}
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Label</label>
                        <input
                          type="text"
                          value={selectedNode.label}
                          onChange={(e) => updateNodeLabel(selectedNode.id, e.target.value)}
                          className="w-full rounded-md border border-default bg-white px-2 py-1 text-xs text-foreground"
                        />
                      </div>
                      <div>
                        <div className="text-[11px] text-muted-foreground">Type</div>
                        <div className="text-xs font-semibold text-foreground">{selectedNode.type}</div>
                      </div>
                      {!selectedNode.preview && (
                        <div>
                          <div className="text-[11px] text-muted-foreground">Node family</div>
                          <div className="text-xs font-semibold text-foreground">
                            {getNodeFamilyLabel(selectedNode)}
                          </div>
                        </div>
                      )}
                      {!selectedNode.preview && selectedNode.type !== "component" && (
                        <div>
                          <div className="text-[11px] text-muted-foreground">Mapping</div>
                          {selectedNodeIncomingMapEdges.length === 0 &&
                          selectedNodeOutgoingMapEdges.length === 0 ? (
                            <div className="mt-1 rounded-md border border-dashed border-default bg-white px-2 py-1 text-[11px] text-muted-foreground">
                              No map edges for this node yet.
                            </div>
                          ) : (
                            <div className="mt-1 space-y-2">
                              {selectedNodeIncomingMapEdges.length > 0 && (
                                <div>
                                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    Mapped from
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {selectedNodeIncomingMapEdges.map((edge) => {
                                      const source = nodesById[edge.sourceId]
                                      if (!source) return null
                                      return (
                                        <button
                                          key={edge.id}
                                          type="button"
                                          onClick={() => selectNode(source.id)}
                                          className="rounded-full border border-default bg-white px-2 py-1 text-[10px] font-semibold text-foreground hover:bg-surface-50"
                                        >
                                          {getDisplayNodeLabelFromNode(source)}
                                        </button>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}
                              {selectedNodeOutgoingMapEdges.length > 0 && (
                                <div>
                                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    Feeds
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {selectedNodeOutgoingMapEdges.map((edge) => {
                                      const target = nodesById[edge.targetId]
                                      if (!target) return null
                                      return (
                                        <button
                                          key={edge.id}
                                          type="button"
                                          onClick={() => selectNode(target.id)}
                                          className="rounded-full border border-default bg-white px-2 py-1 text-[10px] font-semibold text-foreground hover:bg-surface-50"
                                        >
                                          {getDisplayNodeLabelFromNode(target)}
                                        </button>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      {selectedNode.preview && (
                        <div className="rounded-md border border-default bg-surface-50 px-3 py-2">
                          <div className="text-[11px] font-semibold text-foreground">
                            {selectedNode.preview.badge || "Generated preview"}
                          </div>
                          {(selectedNode.preview.note || selectedNode.preview.description) && (
                            <div className="mt-1 text-[11px] text-muted-foreground">
                              {selectedNode.preview.note || selectedNode.preview.description}
                            </div>
                          )}
                          {selectedNode.preview.tokens && selectedNode.preview.tokens.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {selectedNode.preview.tokens.map((token) => (
                                <span
                                  key={token}
                                  className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-muted-foreground"
                                >
                                  {token}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {!selectedNode.preview && selectedNode.type !== "component" && (
                        <div>
                          <div className="text-[11px] text-muted-foreground">
                            Foreground vs background review
                          </div>
                          {selectedForegroundComparisons.length === 0 &&
                          selectedBackgroundComparisons.length === 0 ? (
                            <div className="mt-1 rounded-md border border-dashed border-default bg-white px-2 py-1 text-[11px] text-muted-foreground">
                              Assign a role or add more complementary colors to compare foreground tokens with background tokens.
                            </div>
                          ) : (
                            <div className="mt-1 max-h-96 space-y-3 overflow-auto pr-1">
                              {selectedForegroundComparisons.length > 0 && (
                                <div className="space-y-2">
                                  <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    Selected as foreground
                                  </div>
                                  {selectedForegroundComparisons.map((comparison) => {
                                    const target = comparison.rule?.targetLc ?? null
                                    const status = getApcaStatus(
                                      comparison.lc,
                                      target ?? DEFAULT_CONTRAST_TARGET_LC
                                    )
                                    const badgeClass =
                                      status === "pass"
                                        ? "bg-emerald-100 text-emerald-700"
                                        : status === "fail"
                                          ? "bg-rose-100 text-rose-700"
                                          : "bg-slate-100 text-slate-600"
                                    return (
                                      <div
                                        key={`fg-${comparison.node.id}`}
                                        className="rounded-md border border-default bg-white px-2 py-2"
                                      >
                                        <div className="flex items-center justify-between gap-2">
                                          <div className="flex min-w-0 items-center gap-2">
                                            <span
                                              className="h-4 w-4 rounded border border-default"
                                              style={{ background: selectedPreviewColor || "transparent" }}
                                            />
                                            <span
                                              className="h-4 w-4 rounded border border-default"
                                              style={{ background: comparison.comparisonColor }}
                                            />
                                            <span className="truncate text-xs font-semibold text-foreground">
                                              On {getDisplayNodeLabelFromNode(comparison.node)}
                                            </span>
                                          </div>
                                          <div className="text-[10px] text-muted-foreground">
                                            {comparison.node.role
                                              ? `${comparison.node.role[0].toUpperCase()}${comparison.node.role.slice(1)} bg`
                                              : "Background candidate"}
                                          </div>
                                        </div>
                                        <div
                                          className="mt-2 rounded-md border border-default px-2 py-2 text-xs font-semibold"
                                          style={{
                                            background: comparison.comparisonColor,
                                            color: selectedPreviewColor || previewForegroundReferenceColor,
                                          }}
                                        >
                                          Selected foreground on{" "}
                                          {getDisplayNodeLabelFromNode(comparison.node)}
                                        </div>
                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                          <span
                                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeClass}`}
                                          >
                                            {formatLc(comparison.lc)}
                                          </span>
                                          <span className="text-[10px] text-muted-foreground">
                                            {target ? `Target Lc ${target}` : "Reference only"}
                                          </span>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                              {selectedBackgroundComparisons.length > 0 && (
                                <div className="space-y-2">
                                  <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    Foreground tokens on selected background
                                  </div>
                                  {selectedBackgroundComparisons.map((comparison) => {
                                    const target = comparison.rule?.targetLc ?? null
                                    const status = getApcaStatus(
                                      comparison.lc,
                                      target ?? DEFAULT_CONTRAST_TARGET_LC
                                    )
                                    const badgeClass =
                                      status === "pass"
                                        ? "bg-emerald-100 text-emerald-700"
                                        : status === "fail"
                                          ? "bg-rose-100 text-rose-700"
                                          : "bg-slate-100 text-slate-600"
                                    return (
                                      <div
                                        key={`bg-${comparison.node.id}`}
                                        className="rounded-md border border-default bg-white px-2 py-2"
                                      >
                                        <div className="flex items-center justify-between gap-2">
                                          <div className="flex min-w-0 items-center gap-2">
                                            <span
                                              className="h-4 w-4 rounded border border-default"
                                              style={{ background: comparison.comparisonColor }}
                                            />
                                            <span
                                              className="h-4 w-4 rounded border border-default"
                                              style={{ background: selectedPreviewColor || "transparent" }}
                                            />
                                            <span className="truncate text-xs font-semibold text-foreground">
                                              {getDisplayNodeLabelFromNode(comparison.node)} on selected
                                            </span>
                                          </div>
                                          <div className="text-[10px] text-muted-foreground">
                                            {comparison.node.role
                                              ? `${comparison.node.role[0].toUpperCase()}${comparison.node.role.slice(1)} fg`
                                              : "Foreground candidate"}
                                          </div>
                                        </div>
                                        <div
                                          className="mt-2 rounded-md border border-default px-2 py-2 text-xs font-semibold"
                                          style={{
                                            background: selectedPreviewColor || previewSurfaceReferenceColor,
                                            color: comparison.comparisonColor,
                                          }}
                                        >
                                          {getDisplayNodeLabelFromNode(comparison.node)} on selected background
                                        </div>
                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                          <span
                                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeClass}`}
                                          >
                                            {formatLc(comparison.lc)}
                                          </span>
                                          <span className="text-[10px] text-muted-foreground">
                                            {target ? `Target Lc ${target}` : "Reference only"}
                                          </span>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      <div>
                        <div className="text-[11px] text-muted-foreground">Connected contrast checks</div>
                        {nodeContrastEdges.length === 0 ? (
                          <div className="mt-1 rounded-md border border-dashed border-default bg-white px-2 py-1 text-[11px] text-muted-foreground">
                            No contrast edges for this node yet.
                          </div>
                        ) : (
                          <div className="mt-1 space-y-2">
                            {nodeContrastEdges.map((edge) => {
                              const pair = getEdgeContrastPair(edge)
                              const target = getEdgeTarget(edge)
                              const forwardStatus = getApcaStatus(pair.forward, target)
                              const reverseStatus = getApcaStatus(pair.reverse, target)
                              const forwardClass =
                                forwardStatus === "pass"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : forwardStatus === "fail"
                                    ? "bg-rose-100 text-rose-700"
                                    : "bg-slate-100 text-slate-600"
                              const reverseClass =
                                reverseStatus === "pass"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : reverseStatus === "fail"
                                    ? "bg-rose-100 text-rose-700"
                                    : "bg-slate-100 text-slate-600"
                              const source = nodesById[edge.sourceId]
                              const targetNode = nodesById[edge.targetId]
                              const forwardLabel = `${getDisplayNodeLabelFromNode(source)} → ${getDisplayNodeLabelFromNode(targetNode)}`
                              const reverseLabel = `${getDisplayNodeLabelFromNode(targetNode)} → ${getDisplayNodeLabelFromNode(source)}`
                              const isPrimary =
                                edge.auto
                                  ? edge.sourceId === selectedNode.id
                                  : edge.sourceId === selectedNode.id
                              return (
                                <button
                                  key={edge.id}
                                  type="button"
                                  onClick={() => {
                                    if (edge.auto) {
                                      selectEdge(null)
                                      setSelectedAutoEdgeId(edge.id)
                                    } else {
                                      setSelectedAutoEdgeId(null)
                                      selectEdge(edge.id)
                                    }
                                  }}
                                  className="w-full rounded-md border border-default bg-white px-2 py-2 text-left text-[11px] hover:bg-surface-50"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="truncate text-xs font-semibold text-foreground">
                                      {resolveEdgeLabel(edge)}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground">Required Lc {target}</div>
                                  </div>
                                  <div className="mt-1 flex flex-wrap items-center gap-2">
                                    <span
                                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${forwardClass}`}
                                    >
                                      {formatLc(pair.forward)}
                                    </span>
                                    <span className={`text-[10px] ${isPrimary ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                                      Actual (Fg→Bg): {forwardLabel}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                      {forwardStatus === "pass" ? "Pass" : forwardStatus === "fail" ? "Fail" : "—"}
                                    </span>
                                  </div>
                                  <div className="mt-1 flex flex-wrap items-center gap-2">
                                    <span
                                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${reverseClass}`}
                                    >
                                      {formatLc(pair.reverse)}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                      Actual (Bg→Fg): {reverseLabel}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                      {reverseStatus === "pass" ? "Pass" : reverseStatus === "fail" ? "Fail" : "—"}
                                    </span>
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                      {!selectedNode.preview && (
                        <div>
                          <div className="text-[11px] text-muted-foreground">Resolved expression</div>
                          <div className="rounded-md border border-default bg-surface-50 px-2 py-1 text-[11px] font-mono text-foreground">
                            {getNodeColorExpression(selectedNode.id) || "—"}
                          </div>
                        </div>
                      )}
                      {selectedNode.type !== "component" && (
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                            Role
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { value: "", label: "Unspecified" },
                              { value: "text", label: "Text" },
                              { value: "surface", label: "Surface" },
                              { value: "border", label: "Border" },
                              { value: "icon", label: "Icon" },
                              { value: "accent", label: "Accent" },
                            ].map((option) => {
                              const active = (selectedNode.role || "") === option.value
                              const previewStyle =
                                option.value === "text"
                                  ? {
                                      background: previewSurfaceReferenceColor,
                                      color: selectedPreviewColor || previewForegroundReferenceColor,
                                      borderColor: "rgba(148, 163, 184, 0.35)",
                                    }
                                  : option.value === "surface"
                                    ? {
                                        background: selectedPreviewColor || previewSurfaceReferenceColor,
                                        color: previewForegroundReferenceColor,
                                        borderColor: "rgba(148, 163, 184, 0.35)",
                                      }
                                    : option.value === "border"
                                      ? {
                                          background: previewSurfaceReferenceColor,
                                          color: previewForegroundReferenceColor,
                                          border: `2px solid ${selectedPreviewColor || previewForegroundReferenceColor}`,
                                        }
                                      : option.value === "icon"
                                        ? {
                                            background: previewSurfaceReferenceColor,
                                            color: selectedPreviewColor || previewForegroundReferenceColor,
                                            borderColor: "rgba(148, 163, 184, 0.35)",
                                          }
                                        : option.value === "accent"
                                          ? {
                                              background: selectedPreviewColor || previewSurfaceReferenceColor,
                                              color: previewInverseReferenceColor,
                                              borderColor: "rgba(148, 163, 184, 0.35)",
                                            }
                                          : {
                                              background: "white",
                                              color: selectedPreviewColor || previewForegroundReferenceColor,
                                              borderColor: "rgba(148, 163, 184, 0.35)",
                                            }
                              return (
                                <button
                                  key={option.label}
                                  type="button"
                                  onClick={() =>
                                    updateNodeRole(
                                      selectedNode.id,
                                      (option.value || undefined) as ColorCanvasNode["role"]
                                    )
                                  }
                                  className={`rounded-md border px-2 py-2 text-left transition-colors ${
                                    active
                                      ? "border-brand-500 bg-brand-50"
                                      : "border-default bg-white hover:bg-surface-50"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-[11px] font-semibold text-foreground">
                                      {option.label}
                                    </span>
                                    <span
                                      className="h-3.5 w-3.5 rounded-full border border-default"
                                      style={{ background: selectedPreviewColor || "transparent" }}
                                    />
                                  </div>
                                  <div
                                    className="mt-2 flex h-9 items-center justify-center rounded-md border text-[10px] font-semibold"
                                    style={previewStyle}
                                  >
                                    {option.value === "text"
                                      ? "Aa"
                                      : option.value === "surface"
                                        ? "Surface"
                                        : option.value === "border"
                                          ? "Border"
                                          : option.value === "icon"
                                            ? "Icon"
                                            : option.value === "accent"
                                              ? "Accent"
                                              : "No role"}
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                          <div className="mt-1 text-[10px] text-muted-foreground">
                            Roles drive auto-contrast rules and decide whether this color is reviewed as foreground, background, or both.
                          </div>
                        </div>
                      )}

                      {(selectedNode.type === "token" || selectedNode.type === "relative") && (
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">CSS Variable</label>
                          <input
                            type="text"
                            value={selectedNode.cssVar || ""}
                            onChange={(e) =>
                              updateNode(selectedNode.id, { cssVar: e.target.value })
                            }
                            className="w-full rounded-md border border-default bg-white px-2 py-1 text-xs text-foreground"
                            placeholder="e.g. --color-foreground"
                          />
                        </div>
                      )}

                      {(selectedNode.type === "token" || selectedNode.type === "semantic") && (
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                            Advanced color expression
                          </label>
                          <ColorPickerField
                            value={selectedNode.value || ""}
                            onChange={(value) => updateNodeValue(selectedNode.id, value)}
                            className="w-full rounded-md border border-default bg-white px-2 py-1 text-xs text-foreground"
                            placeholder="e.g. #1d4ed8 or rgb(0 0 0)"
                          />
                          <div className="mt-1 text-[10px] text-muted-foreground">
                            Use this for OKLCH, Display-P3, or a manual CSS color string. Quick preview edit above is the faster review path.
                          </div>
                        </div>
                      )}

                      {selectedNode.type === "relative" && relativeSpec && (
                        <div className="space-y-3">
                          <div>
                            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                              Expression override (optional)
                            </label>
                            <ColorPickerField
                              value={selectedNode.value || ""}
                              onChange={(value) => updateNodeValue(selectedNode.id, value)}
                              className="w-full rounded-md border border-default bg-white px-2 py-1 text-xs text-foreground"
                              placeholder="oklch(from var(--color-brand-500) l c h / alpha)"
                            />
                            {selectedNode.value && (
                              <button
                                type="button"
                                onClick={() => updateNodeValue(selectedNode.id, "")}
                                className="mt-2 rounded-md border border-default bg-white px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-surface-50"
                              >
                                Clear override
                              </button>
                            )}
                          </div>
                          <div>
                            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Base node</label>
                            <select
                              value={relativeSpec.baseId || ""}
                              onChange={(e) =>
                                updateNode(selectedNode.id, {
                                  relative: { ...relativeSpec, baseId: e.target.value || undefined },
                                })
                              }
                              className="w-full rounded-md border border-default bg-white px-2 py-1 text-xs text-foreground"
                            >
                              <option value="">Select base</option>
                              {nodes
                                .filter((node) => node.id !== selectedNode.id)
                                .map((node) => (
                                  <option key={node.id} value={node.id}>
                                    {getDisplayNodeLabelFromNode(node)} ({node.type})
                                  </option>
                                ))}
                            </select>
                          </div>

                          {([
                            { key: "l", label: "Lightness", unit: "%", modeKey: "lMode", valueKey: "lValue" },
                            { key: "c", label: "Chroma", unit: "%", modeKey: "cMode", valueKey: "cValue" },
                            { key: "h", label: "Hue", unit: "deg", modeKey: "hMode", valueKey: "hValue" },
                            { key: "alpha", label: "Alpha", unit: "%", modeKey: "alphaMode", valueKey: "alphaValue" },
                          ] as const).map((channel) => (
                            <div key={channel.key} className="grid grid-cols-[90px_1fr_64px] items-center gap-2">
                              <div className="text-[11px] font-medium text-muted-foreground">{channel.label}</div>
                              <select
                                value={relativeSpec[channel.modeKey] || "inherit"}
                                onChange={(e) =>
                                  updateNode(selectedNode.id, {
                                    relative: {
                                      ...relativeSpec,
                                      [channel.modeKey]: e.target.value,
                                    },
                                  })
                                }
                                className="rounded-md border border-default bg-white px-2 py-1 text-xs text-foreground"
                              >
                                <option value="inherit">Inherit</option>
                                <option value="delta">Delta</option>
                                <option value="absolute">Absolute</option>
                              </select>
                              <input
                                type="number"
                                value={
                                  relativeSpec[channel.valueKey] !== undefined
                                    ? String(relativeSpec[channel.valueKey])
                                    : ""
                                }
                                onChange={(e) => {
                                  const nextValue =
                                    e.target.value === "" ? undefined : Number(e.target.value)
                                  updateNode(selectedNode.id, {
                                    relative: {
                                      ...relativeSpec,
                                      [channel.valueKey]: nextValue,
                                    },
                                  })
                                }}
                                className="rounded-md border border-default bg-white px-2 py-1 text-xs text-foreground"
                                placeholder={channel.key === "c" ? "0.08" : channel.unit}
                              />
                            </div>
                          ))}
                          <div className="text-[11px] text-muted-foreground">
                            Relative syntax: oklch(from base l c h / alpha)
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Chroma uses 0–0.4 range. Values above 1 are treated as percentages.
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleDuplicateNode(selectedNode)}
                          className="flex items-center gap-2 rounded-md border border-default bg-white px-2 py-1 text-xs font-semibold text-foreground hover:bg-surface-50"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Duplicate
                        </button>
                        <button
                          type="button"
                          onClick={() => removeNode(selectedNode.id)}
                          className="flex items-center gap-2 rounded-md border border-default bg-white px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedEdgeData && (
                    <div className="space-y-3">
                      <div>
                        <div className="text-[11px] text-muted-foreground">Edge type</div>
                        <div className="text-xs font-semibold text-foreground">
                          {selectedEdgeData.type}
                          {selectedEdgeData.auto ? " · auto" : ""}
                        </div>
                      </div>
                      {selectedEdgeData.type === "contrast" && (
                        <>
                          <div>
                            <div className="text-[11px] text-muted-foreground">APCA (approx)</div>
                            <div className="space-y-1 text-xs font-semibold text-foreground">
                              <div>
                                Foreground → Background: {formatLc(getEdgeContrast(selectedEdgeData))}
                              </div>
                              <div className="text-[11px] font-normal text-muted-foreground">
                                Background → Foreground:{" "}
                                {formatLc(
                                  getEdgeContrast({
                                    ...selectedEdgeData,
                                    sourceId: selectedEdgeData.targetId,
                                    targetId: selectedEdgeData.sourceId,
                                  })
                                )}
                              </div>
                            </div>
                            {(() => {
                              const source = nodesById[selectedEdgeData.sourceId]
                              const target = nodesById[selectedEdgeData.targetId]
                              const sourceColor = getNodeColor(selectedEdgeData.sourceId)
                              const targetColor = getNodeColor(selectedEdgeData.targetId)
                              return (
                                <div className="mt-2 rounded-md border border-default bg-surface-50 px-2 py-2">
                                  <div className="text-[11px] font-semibold text-foreground">
                                    Resolved pair
                                  </div>
                                  <div className="mt-2 flex items-center gap-2 text-[11px] text-foreground">
                                    <span
                                      className="h-4 w-4 rounded border border-default"
                                      style={{ background: sourceColor || "transparent" }}
                                    />
                                    <span className="truncate">
                                      {getDisplayNodeLabelFromNode(source)}
                                    </span>
                                  </div>
                                  <div className="mt-1 flex items-center gap-2 text-[11px] text-foreground">
                                    <span
                                      className="h-4 w-4 rounded border border-default"
                                      style={{ background: targetColor || "transparent" }}
                                    />
                                    <span className="truncate">
                                      {getDisplayNodeLabelFromNode(target)}
                                    </span>
                                  </div>
                                  {!sourceColor || !targetColor ? (
                                    <div className="mt-2 text-[10px] text-muted-foreground">
                                      One side of this contrast pair does not currently resolve to a color.
                                    </div>
                                  ) : null}
                                </div>
                              )
                            })()}
                          </div>
                          <div>
                            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                              Required Lc
                            </label>
                            {selectedEdgeData.auto ? (
                              <div className="rounded-md border border-default bg-surface-50 px-2 py-1 text-[11px] font-semibold text-foreground">
                                Lc {getEdgeTarget(selectedEdgeData)}
                              </div>
                            ) : (
                              <select
                                value={getEdgeTarget(selectedEdgeData)}
                                onChange={(e) =>
                                  updateEdgeRule(selectedEdgeData.id, { targetLc: Number(e.target.value) })
                                }
                                className="w-full rounded-md border border-default bg-white px-2 py-1 text-xs text-foreground"
                              >
                                {APCA_TARGETS.map((target) => (
                                  <option key={target} value={target}>
                                    Lc {target}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                          <div>
                            <div className="text-[11px] text-muted-foreground">Pair</div>
                            <div className="text-xs font-semibold text-foreground">
                              {resolveEdgeLabel(selectedEdgeData)}
                            </div>
                          </div>
                          <div>
                            <div className="text-[11px] text-muted-foreground">Model</div>
                            <div className="rounded-md border border-default bg-surface-50 px-2 py-1 text-[11px] font-semibold text-foreground">
                              OKLCH (default)
                            </div>
                          </div>
                        </>
                      )}
                      {!selectedEdgeData.auto ? (
                        <button
                          type="button"
                          onClick={() => removeEdge(selectedEdgeData.id)}
                          className="flex items-center gap-2 rounded-md border border-default bg-white px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove edge
                        </button>
                      ) : (
                        <div className="rounded-md border border-dashed border-default bg-surface-50 px-2 py-1 text-[11px] text-muted-foreground">
                          Auto edges are generated from contrast rules.
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </aside>

      <CanvasFileActionDialog
        open={surfaceCanvasFileActionModal !== null}
        mode={surfaceCanvasFileActionModal?.mode ?? "create"}
        surfaceLabel={canvasMode === "color-audit" ? "Color Audit" : "System Canvas"}
        titleValue={surfaceCanvasFileActionModal?.title ?? ""}
        folderValue={surfaceCanvasFileActionModal?.folder ?? ""}
        error={surfaceCanvasFileActionError}
        busy={surfaceCanvasFileActionBusy}
        onTitleChange={(value) =>
          setSurfaceCanvasFileActionModal((current) =>
            current ? { ...current, title: value } : current
          )
        }
        onFolderChange={(value) =>
          setSurfaceCanvasFileActionModal((current) =>
            current ? { ...current, folder: value } : current
          )
        }
        onClose={handleCloseSurfaceCanvasFileActionModal}
        onSubmit={handleSubmitSurfaceCanvasFileActionModal}
      />

      <CanvasFileDeleteDialog
        open={surfaceCanvasFileDeleteModal !== null}
        title={surfaceCanvasFileDeleteModal?.title ?? ""}
        path={surfaceCanvasFileDeleteModal?.path ?? ""}
        error={surfaceCanvasFileDeleteError}
        busy={surfaceCanvasFileDeleteBusy}
        onClose={handleCloseSurfaceCanvasFileDeleteModal}
        onConfirm={handleConfirmSurfaceCanvasFileDelete}
      />

      {showNodeCatalog ? (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center bg-black/35 px-6 py-8"
          onClick={() => setShowNodeCatalog(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Node catalog"
            className="flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-default bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-default px-5 py-4">
              <div>
                <div className="text-sm font-semibold text-foreground">Node catalog</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Review the current canvas view as a clean list of node cards, titles, pills, and state treatments.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close node catalog"
                onClick={() => setShowNodeCatalog(false)}
                className="rounded-full border border-default bg-white p-2 text-muted-foreground hover:bg-surface-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[280px,minmax(0,1fr)]">
              <div className="border-b border-default bg-surface-50 px-5 py-4 lg:border-b-0 lg:border-r">
                <div className="rounded-xl border border-default bg-white px-3 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Current view
                  </div>
                  <div className="mt-2 text-xs font-semibold text-foreground">
                    {canvasMode === "color-audit" ? "Color Audit" : "System Canvas"}
                  </div>
                  <div className="mt-1 text-[11px] leading-5 text-muted-foreground">
                    {renderedNodes.length} nodes in the current view, grouped by family for design review.
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    State preview
                  </div>
                  {nodeCatalogSampleNode ? (
                    <div className="mt-2 space-y-3">
                      {([
                        { id: "default", label: "Default", selected: false, highlighted: false, dimmed: false },
                        { id: "selected", label: "Selected", selected: true, highlighted: false, dimmed: false },
                        { id: "highlighted", label: "Highlighted", selected: false, highlighted: true, dimmed: false },
                        { id: "dimmed", label: "Dimmed", selected: false, highlighted: false, dimmed: true },
                      ] as const).map((statePreview) => {
                        const sampleNode = { ...nodeCatalogSampleNode, position: { x: 0, y: 0 } }
                        const size = getNodeSize(nodeCatalogSampleNode)
                        return (
                          <div key={statePreview.id} className="rounded-xl border border-default bg-white px-3 py-3">
                            <div className="mb-2 text-[11px] font-semibold text-foreground">
                              {statePreview.label}
                            </div>
                            <div
                              className="relative overflow-auto rounded-lg bg-surface-50 p-2"
                              style={{ width: "100%", minHeight: size.height + 16 }}
                            >
                              <div style={{ position: "relative", width: size.width, height: size.height }}>
                                <ColorNode
                                  node={sampleNode}
                                  size={size}
                                  minSize={getNodeMinSize(nodeCatalogSampleNode)}
                                  portIds={nodePortUsage[nodeCatalogSampleNode.id] ?? []}
                                  resolveColor={getNodeColor}
                                  resolveIsP3={getNodeIsP3}
                                  resolveExpression={getNodeColorExpression}
                                  resolveLabel={getNodeLabel}
                                  selected={statePreview.selected}
                                  highlighted={statePreview.highlighted}
                                  dimmed={statePreview.dimmed}
                                  connectActive={false}
                                  connectMode={null}
                                  connectDragging={false}
                                  connectSourceId={null}
                                  movable={false}
                                  onMove={() => {}}
                                  onResize={() => {}}
                                  onClick={() => {}}
                                  onConnectStart={() => {}}
                                  showFullLabels={showFullLabels}
                                  toCanvasPosition={(x, y) => ({ x, y })}
                                />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="mt-2 rounded-md border border-dashed border-default bg-white px-3 py-2 text-[11px] text-muted-foreground">
                      Add or generate nodes to review card states.
                    </div>
                  )}
                </div>
              </div>

              <div className="min-h-0 overflow-y-auto px-5 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Current view nodes
                </div>
                {nodeCatalogGroups.length === 0 ? (
                  <div className="mt-2 rounded-md border border-dashed border-default bg-white px-3 py-2 text-[11px] text-muted-foreground">
                    No nodes in the current view yet.
                  </div>
                ) : (
                  <div className="mt-3 space-y-5">
                    {nodeCatalogGroups.map((group) => (
                      <section key={group.id}>
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div className="text-xs font-semibold text-foreground">{group.label}</div>
                          <span className="rounded-full bg-surface-50 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                            {group.nodes.length}
                          </span>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          {group.nodes.map((node) => {
                            const size = getNodeSize(node)
                            const staticNode = { ...node, position: { x: 0, y: 0 } }
                            return (
                              <div key={node.id} className="rounded-xl border border-default bg-surface-50 px-3 py-3">
                                <div className="mb-2 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                                  <span className="truncate">{getDisplayNodeLabelFromNode(node)}</span>
                                  <span className="rounded-full bg-white px-2 py-0.5 font-semibold">
                                    {node.type}
                                  </span>
                                </div>
                                <div
                                  className="relative overflow-auto rounded-lg bg-white/70 p-2"
                                  style={{ minHeight: size.height + 16 }}
                                >
                                  <div style={{ position: "relative", width: size.width, height: size.height }}>
                                    <ColorNode
                                      node={staticNode}
                                      size={size}
                                      minSize={getNodeMinSize(node)}
                                      portIds={nodePortUsage[node.id] ?? []}
                                      resolveColor={getNodeColor}
                                      resolveIsP3={getNodeIsP3}
                                      resolveExpression={getNodeColorExpression}
                                      resolveLabel={getNodeLabel}
                                      selected={selectedNodeId === node.id}
                                      highlighted={highlightedConnectionNodeIds.has(node.id)}
                                      dimmed={false}
                                      connectActive={false}
                                      connectMode={null}
                                      connectDragging={false}
                                      connectSourceId={null}
                                      movable={false}
                                      onMove={() => {}}
                                      onResize={() => {}}
                                      onClick={() => {}}
                                      onConnectStart={() => {}}
                                      showFullLabels={showFullLabels}
                                      toCanvasPosition={(x, y) => ({ x, y })}
                                    />
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </section>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showColorAuditExportPreview ? (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center bg-black/35 px-6 py-8"
          onClick={() => setShowColorAuditExportPreview(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Export preview"
            className="flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-default bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-default px-5 py-4">
              <div>
                <div className="text-sm font-semibold text-foreground">Export preview</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Review exactly what will be copied before exporting tokens into your project.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close export preview"
                onClick={() => setShowColorAuditExportPreview(false)}
                className="rounded-full border border-default bg-white p-2 text-muted-foreground hover:bg-surface-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid min-h-0 flex-1 gap-0 md:grid-cols-[260px,minmax(0,1fr)]">
              <div className="border-b border-default bg-surface-50 px-5 py-4 md:border-b-0 md:border-r">
                <div className="rounded-xl border border-default bg-white px-3 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    What you will copy
                  </div>
                  <div className="mt-2 text-xs font-semibold text-foreground">
                    {selectedColorAuditExportFormatLabel}
                  </div>
                  <div className="mt-1 text-[11px] leading-5 text-muted-foreground">
                    Only mapped semantic roles and functional aliases are included.
                  </div>
                  <div className="mt-2 inline-flex rounded-full bg-surface-50 px-2 py-1 text-[10px] font-semibold text-muted-foreground">
                    {colorAuditProjectExportEntries.length} tokens
                  </div>
                </div>

                <div className="mt-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Format
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {COLOR_AUDIT_EXPORT_FORMAT_OPTIONS.map((format) => (
                      <button
                        key={format.id}
                        type="button"
                        onClick={() => setSelectedColorAuditExportFormat(format.id)}
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                          selectedColorAuditExportFormat === format.id
                            ? "border-brand-500 bg-brand-50 text-brand-700"
                            : "border-default bg-white text-muted-foreground hover:bg-surface-50"
                        }`}
                      >
                        {format.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Color mode
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {COLOR_AUDIT_EXPORT_COLOR_MODE_OPTIONS.map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setSelectedColorAuditExportColorMode(mode.id)}
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                          selectedColorAuditExportColorMode === mode.id
                            ? "border-brand-500 bg-brand-50 text-brand-700"
                            : "border-default bg-white text-muted-foreground hover:bg-surface-50"
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex min-h-0 flex-col px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-foreground">
                      {selectedColorAuditExportFormatLabel}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Live preview of the payload that the copy action will use.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyColorAuditExport}
                    className="inline-flex items-center gap-1 rounded-full border border-default bg-white px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-surface-50"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copiedColorAuditExportFormat === selectedColorAuditExportFormat
                      ? "Copied"
                      : "Copy export"}
                  </button>
                </div>
                <div className="mt-3 min-h-0 flex-1 rounded-xl border border-default bg-surface-950/95 px-4 py-4">
                  <pre className="h-full overflow-auto whitespace-pre-wrap break-all text-[11px] leading-6 text-surface-50">
                    {selectedColorAuditExportText}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <span
        ref={colorProbeRef}
        aria-hidden
        className="pointer-events-none absolute -left-[9999px] top-0 h-0 w-0 opacity-0"
      />
    </div>
  )
}

