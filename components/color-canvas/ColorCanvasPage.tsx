import { Copy, Link2, Minus, Move, Palette, Plus, RotateCcw, Trash2, Type } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { DesignSystemNodePreview } from "./DesignSystemNodePreview"
import {
  DESIGN_SYSTEM_ICON_LIBRARIES,
  getDesignSystemIconLibraryLabel,
} from "./iconLibraryRegistry"
import { CanvasThemePanel } from "../canvas/CanvasThemePanel"
import { ColorPickerField } from "../color-picker"
import { useCanvasTransform } from "../../hooks/useCanvasTransform"
import { useThemeRegistry } from "../../hooks/useThemeRegistry"
import { useColorCanvasState } from "../../hooks/useColorCanvasState"
import { useLocalStorage } from "../../hooks/useLocalStorage"
import {
  DEFAULT_DESIGN_SYSTEM_SCALE_CONFIG,
  createDesignSystemTokenBundle,
  resolveFluidValuePx,
  type DesignSystemIconLibraryId,
  type DesignSystemScaleConfig,
  type IconScaleToken,
  type LayoutRecipe,
  type SpacingScaleToken,
  type TypographyScaleToken,
} from "../../projects/design-system-foundation/designSystemApi"
import type { ThemeToken } from "../../types/theme"
import type {
  ColorCanvasEdge,
  ColorCanvasNode,
  ColorCanvasNodePreview,
  ColorCanvasPreviewKind,
  ColorCanvasState,
  RelativeColorSpec,
} from "../../types/colorCanvas"
import {
  APCA_TARGETS,
  DEFAULT_CONTRAST_TARGET_LC,
  DEFAULT_COLOR_MODEL,
  apcaContrast,
  formatLc,
  parseColor,
  getApcaStatus,
} from "../../utils/apca"

interface RGBA {
  r: number
  g: number
  b: number
  a: number
}

export interface OklchColor {
  l: number
  c: number
  h: number
  a: number
}

interface ColorCanvasPageProps {
  tokens: ThemeToken[]
  themeStorageKeyPrefix?: string
}

type ConnectMode = "map" | "contrast" | null
type EdgeFilter = "all" | "map" | "contrast"
type CanvasMode = "color-audit" | "system-canvas"
type CanvasViewMode =
  | "color"
  | "system"
  | "colors"
  | "type"
  | "layout"
  | "primitives"
  | "standards"
  | "all"
type ContrastRule = {
  id: string
  label: string
  foregroundRole: NonNullable<ColorCanvasNode["role"]>
  backgroundRole: NonNullable<ColorCanvasNode["role"]>
  targetLc: number
  enabled: boolean
}

type DisplayEdge = ColorCanvasEdge & { auto?: boolean; ruleId?: string }
type SystemSectionId = "colors" | "type" | "layout" | "primitives" | "standards"
type SystemSectionFrame = {
  id: SystemSectionId
  label: string
  description: string
  nodeIds: string[]
  x: number
  y: number
  width: number
  height: number
}

type SystemViewportAction = "fit-width" | "bird-view" | null

const DEFAULT_NODE_SIZES: Record<ColorCanvasNode["type"], { width: number; height: number }> = {
  token: { width: 180, height: 70 },
  semantic: { width: 200, height: 78 },
  component: { width: 200, height: 70 },
  relative: { width: 200, height: 78 },
}

const MIN_NODE_SIZES: Record<ColorCanvasNode["type"], { width: number; height: number }> = {
  token: { width: 160, height: 68 },
  semantic: { width: 180, height: 76 },
  component: { width: 220, height: 140 },
  relative: { width: 200, height: 96 },
}

const SEMANTIC_PRESETS: Array<{ label: string; role: ColorCanvasNode["role"] }> = [
  { label: "Text / Foreground", role: "text" },
  { label: "Text / Muted", role: "text" },
  { label: "Surface / Base", role: "surface" },
  { label: "Surface / Subtle", role: "surface" },
  { label: "Border / Default", role: "border" },
  { label: "Icon / Default", role: "icon" },
  { label: "Accent / Primary", role: "accent" },
]

const DEFAULT_CONTRAST_RULES: ContrastRule[] = [
  {
    id: "text-surface",
    label: "Text on Surface",
    foregroundRole: "text",
    backgroundRole: "surface",
    targetLc: 60,
    enabled: true,
  },
  {
    id: "icon-surface",
    label: "Icon on Surface",
    foregroundRole: "icon",
    backgroundRole: "surface",
    targetLc: 45,
    enabled: true,
  },
  {
    id: "border-surface",
    label: "Border on Surface",
    foregroundRole: "border",
    backgroundRole: "surface",
    targetLc: 30,
    enabled: false,
  },
  {
    id: "accent-surface",
    label: "Accent on Surface",
    foregroundRole: "accent",
    backgroundRole: "surface",
    targetLc: 45,
    enabled: false,
  },
]

const DEFAULT_RELATIVE_SPEC = {
  model: DEFAULT_COLOR_MODEL,
  lMode: "inherit",
  cMode: "inherit",
  hMode: "inherit",
  alphaMode: "inherit",
} as const

const FOUNDATION_ROLE_BLUEPRINTS: Array<{
  cssVar: string
  label: string
  semanticLabel: string
  role: NonNullable<ColorCanvasNode["role"]>
}> = [
  {
    cssVar: "--color-foreground",
    label: "Foreground",
    semanticLabel: "Text / Foreground",
    role: "text",
  },
  {
    cssVar: "--color-surface",
    label: "Surface",
    semanticLabel: "Surface / Base",
    role: "surface",
  },
  {
    cssVar: "--color-border-default",
    label: "Border Default",
    semanticLabel: "Border / Default",
    role: "border",
  },
  {
    cssVar: "--color-brand-600",
    label: "Brand 600",
    semanticLabel: "Accent / Primary",
    role: "accent",
  },
  {
    cssVar: "--color-foreground",
    label: "Foreground",
    semanticLabel: "Icon / Default",
    role: "icon",
  },
]

const CANVAS_MODE_OPTIONS: Array<{ id: CanvasMode; label: string; description: string }> = [
  {
    id: "color-audit",
    label: "Color Audit",
    description: "Token, semantic, and contrast relationships",
  },
  {
    id: "system-canvas",
    label: "System Canvas",
    description: "Scale engine, generated layouts, and primitive previews",
  },
]

const DESIGN_SYSTEM_PRESETS: Array<{
  id: string
  label: string
  description: string
  config: DesignSystemScaleConfig
}> = [
  {
    id: "balanced-ui",
    label: "Balanced UI",
    description: "Default product system with steady body rhythm.",
    config: DEFAULT_DESIGN_SYSTEM_SCALE_CONFIG,
  },
  {
    id: "dense-app",
    label: "Dense App",
    description: "Tighter product UI for dashboards and settings-heavy flows.",
    config: {
      minViewportPx: 320,
      maxViewportPx: 1280,
      baseUnitPx: 4,
      typeBaseMinPx: 15,
      typeBaseMaxPx: 16,
      minTypeScaleRatio: 1.16,
      maxTypeScaleRatio: 1.21,
      density: 0.92,
      fontFamilySans: "Inter",
      fontFamilyDisplay: "Inter",
      fontWeightSans: 400,
      fontWeightDisplay: 625,
      iconLibrary: "lucide",
      iconStroke: 1.4,
    },
  },
  {
    id: "editorial",
    label: "Editorial",
    description: "Looser reading rhythm and stronger display contrast.",
    config: {
      minViewportPx: 360,
      maxViewportPx: 1600,
      baseUnitPx: 5,
      typeBaseMinPx: 17,
      typeBaseMaxPx: 20,
      minTypeScaleRatio: 1.22,
      maxTypeScaleRatio: 1.3,
      density: 1.08,
      fontFamilySans: "Inter",
      fontFamilyDisplay: "Poppins",
      fontWeightSans: 425,
      fontWeightDisplay: 700,
      iconLibrary: "canvas-symbols",
      iconStroke: 1.45,
    },
  },
  {
    id: "campaign",
    label: "Campaign",
    description: "Higher display spread for landing and promo surfaces.",
    config: {
      minViewportPx: 360,
      maxViewportPx: 1440,
      baseUnitPx: 4,
      typeBaseMinPx: 16,
      typeBaseMaxPx: 18,
      minTypeScaleRatio: 1.22,
      maxTypeScaleRatio: 1.32,
      density: 1,
      fontFamilySans: "Inter",
      fontFamilyDisplay: "Poppins",
      fontWeightSans: 400,
      fontWeightDisplay: 725,
      iconLibrary: "canvas-symbols",
      iconStroke: 1.55,
    },
  },
]

const CANVAS_VIEW_OPTIONS: Array<{ id: CanvasViewMode; label: string }> = [
  { id: "color", label: "Color" },
  { id: "system", label: "System" },
  { id: "colors", label: "Colors" },
  { id: "type", label: "Type" },
  { id: "layout", label: "Layout" },
  { id: "primitives", label: "Primitives" },
  { id: "standards", label: "Standards" },
  { id: "all", label: "All" },
]

const SYSTEM_SECTION_ORDER: SystemSectionId[] = [
  "colors",
  "type",
  "layout",
  "primitives",
  "standards",
]

const SYSTEM_SECTION_META: Record<SystemSectionId, { label: string; description: string }> = {
  colors: {
    label: "Colors",
    description: "Seed, rules, and semantic UI roles",
  },
  type: {
    label: "Type + Icons",
    description: "Capsize metrics, Utopia scale, stroke pairing",
  },
  layout: {
    label: "Layouts",
    description: "Recipes driven by spacing, type, and icon rhythm",
  },
  primitives: {
    label: "Primitives",
    description: "UI building blocks rendered at the current scale",
  },
  standards: {
    label: "Standards",
    description: "Token export and adapter bridges",
  },
}

function getPreviewNodeSize(
  kind: ColorCanvasPreviewKind,
  mode: "default" | "fit-width" = "default"
) {
  switch (kind) {
    case "connector-detail":
      return mode === "fit-width" ? { width: 400, height: 240 } : { width: 340, height: 210 }
    case "font-family":
      return mode === "fit-width" ? { width: 440, height: 320 } : { width: 380, height: 286 }
    case "type-scale":
      return mode === "fit-width" ? { width: 450, height: 340 } : { width: 390, height: 306 }
    case "stroke-pair":
      return mode === "fit-width" ? { width: 430, height: 308 } : { width: 370, height: 280 }
    case "icon-library":
      return mode === "fit-width" ? { width: 440, height: 360 } : { width: 390, height: 320 }
    case "icon-scale":
      return mode === "fit-width" ? { width: 390, height: 300 } : { width: 340, height: 260 }
    case "layout-stack":
      return mode === "fit-width" ? { width: 540, height: 560 } : { width: 470, height: 500 }
    case "layout-grid":
      return mode === "fit-width" ? { width: 540, height: 470 } : { width: 470, height: 410 }
    case "layout-split":
      return mode === "fit-width" ? { width: 620, height: 430 } : { width: 540, height: 390 }
    case "primitive-text":
      return mode === "fit-width" ? { width: 430, height: 260 } : { width: 370, height: 230 }
    case "primitive-heading":
      return mode === "fit-width" ? { width: 470, height: 286 } : { width: 410, height: 248 }
    case "primitive-button":
      return mode === "fit-width" ? { width: 390, height: 220 } : { width: 340, height: 196 }
    case "primitive-surface":
      return mode === "fit-width" ? { width: 520, height: 340 } : { width: 460, height: 300 }
    case "token-standard":
      return mode === "fit-width" ? { width: 660, height: 420 } : { width: 560, height: 360 }
    case "radix-theme":
      return mode === "fit-width" ? { width: 640, height: 390 } : { width: 540, height: 340 }
    default:
      return mode === "fit-width" ? { width: 360, height: 260 } : { width: 320, height: 230 }
  }
}

function getCanvasNodeGroup(node: ColorCanvasNode) {
  return node.group ?? "color"
}

function isSystemColorNode(node: ColorCanvasNode) {
  if (getCanvasNodeGroup(node) === "color") return false
  if (node.cssVar?.startsWith("--color-")) return true
  return (
    node.role === "text" ||
    node.role === "surface" ||
    node.role === "border" ||
    node.role === "icon" ||
    node.role === "accent"
  )
}

function isRelationshipCanvasMode(mode: CanvasViewMode) {
  return mode === "color" || mode === "all"
}

function getCanvasModeLabel(mode: CanvasMode) {
  return mode === "color-audit" ? "Color Audit" : "System Canvas"
}

function getPreviewCategory(
  preview?: ColorCanvasNodePreview | null
): Extract<CanvasViewMode, "type" | "layout" | "primitives" | "standards"> | null {
  if (!preview) return null
  if (preview.kind === "connector-detail") {
    return preview.sectionId === "type" ||
      preview.sectionId === "layout" ||
      preview.sectionId === "primitives" ||
      preview.sectionId === "standards"
      ? preview.sectionId
      : null
  }
  switch (preview.kind) {
    case "font-family":
    case "type-scale":
    case "stroke-pair":
    case "icon-library":
    case "icon-scale":
      return "type"
    case "layout-stack":
    case "layout-grid":
    case "layout-split":
      return "layout"
    case "primitive-text":
    case "primitive-heading":
    case "primitive-button":
    case "primitive-surface":
      return "primitives"
    case "token-standard":
    case "radix-theme":
      return "standards"
    default:
      return null
  }
}

function getSystemSectionId(node: ColorCanvasNode): SystemSectionId {
  if (node.preview?.sectionId) {
    return node.preview.sectionId
  }
  if (isSystemColorNode(node) || getCanvasNodeGroup(node) === "color") {
    return "colors"
  }

  const category = getPreviewCategory(node.preview)
  if (category === "layout") return "layout"
  if (category === "primitives") return "primitives"
  if (category === "standards") return "standards"
  return "type"
}

function getSystemSectionNodeSortWeight(node: ColorCanvasNode) {
  const section = getSystemSectionId(node)
  if (section !== "colors") {
    return getPreviewSortWeight(node)
  }

  const label = node.label.toLowerCase()
  if (label.startsWith("color / brand seed")) return 0
  if (label.startsWith("color rule / brand darker")) return 10
  if (label.startsWith("color rule / surface")) return 20
  if (label.startsWith("color rule / text")) return 30
  if (label.startsWith("color rule / border")) return 40
  if (label.startsWith("color / inverse")) return 50

  switch (node.role) {
    case "surface":
      return 60
    case "text":
      return 70
    case "border":
      return 80
    case "icon":
      return 90
    case "accent":
      return 100
    default:
      return 110
  }
}

function getDefaultNodeSize(node: ColorCanvasNode) {
  if (node.group === "system-support") {
    return { width: 260, height: 104 }
  }

  if (!node.preview) {
    return DEFAULT_NODE_SIZES[node.type]
  }

  return getPreviewNodeSize(node.preview.kind)
}

function getFitWidthNodeSize(node: ColorCanvasNode) {
  if (node.group === "system-support") {
    return { width: 280, height: 108 }
  }

  if (!node.preview) {
    return getDefaultNodeSize(node)
  }

  return getPreviewNodeSize(node.preview.kind, "fit-width")
}

function resolveLayoutColumns(baseColumns: number | undefined, viewportPx: number) {
  const desiredColumns = baseColumns ?? 2
  if (viewportPx <= 540) return 1
  if (viewportPx <= 960) return Math.min(2, desiredColumns)
  return desiredColumns
}

function buildViewportSamples(config: DesignSystemScaleConfig) {
  const midpoint = Math.round((config.minViewportPx + config.maxViewportPx) / 2)
  return [
    { label: "Min", viewportPx: config.minViewportPx },
    { label: "Mid", viewportPx: midpoint },
    { label: "Max", viewportPx: config.maxViewportPx },
  ]
}

function isNodeVisibleInCanvasView(node: ColorCanvasNode, mode: CanvasViewMode) {
  if (mode === "all") return true
  const group = getCanvasNodeGroup(node)
  if (mode === "color") return group === "color"
  if (mode === "colors") return isSystemColorNode(node) || node.preview?.sectionId === "colors"
  if (mode === "system") return group === "system-support" || group === "system-preview"
  return getPreviewCategory(node.preview) === mode
}

function getPreviewSortWeight(node: ColorCanvasNode) {
  if (!node.preview) {
    return getCanvasNodeGroup(node) === "system-support" ? 90 : 100
  }
  if (node.preview.kind === "connector-detail") {
    const label = node.label.toLowerCase()
    if (label.includes("color")) return 5
    if (label.includes("capsize")) return 5
    if (label.includes("utopia")) return 15
    if (label.includes("icon")) return 25
    if (label.includes("layout")) return 35
    if (label.includes("primitive")) return 45
    if (label.includes("standard")) return 55
    return 60
  }
  switch (node.preview.kind) {
    case "font-family":
      return 0
    case "type-scale":
      return 10
    case "stroke-pair":
      return 20
    case "icon-library":
      return 25
    case "icon-scale":
      return 30
    case "layout-stack":
      return 40
    case "layout-grid":
      return 50
    case "layout-split":
      return 60
    case "primitive-text":
      return 70
    case "primitive-heading":
      return 80
    case "primitive-button":
      return 90
    case "primitive-surface":
      return 100
    case "token-standard":
      return 110
    case "radix-theme":
      return 120
    default:
      return 130
  }
}

function formatPreviewKindLabel(kind: ColorCanvasPreviewKind) {
  switch (kind) {
    case "connector-detail":
      return "System logic"
    case "font-family":
      return "Font metrics"
    case "type-scale":
      return "Type scale"
    case "stroke-pair":
      return "Stroke pairing"
    case "icon-library":
      return "Icon library"
    case "icon-scale":
      return "Icon scale"
    case "layout-stack":
      return "Stack layout"
    case "layout-grid":
      return "Grid layout"
    case "layout-split":
      return "Split layout"
    case "token-standard":
      return "DTCG export"
    case "radix-theme":
      return "Radix bridge"
    case "primitive-text":
      return "Text primitive"
    case "primitive-heading":
      return "Heading primitive"
    case "primitive-button":
      return "Button primitive"
    case "primitive-surface":
      return "Surface primitive"
    default:
      return "Generated preview"
  }
}

function matchesDesignSystemConfig(
  current: DesignSystemScaleConfig,
  target: DesignSystemScaleConfig
) {
  return (
    current.minViewportPx === target.minViewportPx &&
    current.maxViewportPx === target.maxViewportPx &&
    current.baseUnitPx === target.baseUnitPx &&
    current.typeBaseMinPx === target.typeBaseMinPx &&
    current.typeBaseMaxPx === target.typeBaseMaxPx &&
    current.minTypeScaleRatio === target.minTypeScaleRatio &&
    current.maxTypeScaleRatio === target.maxTypeScaleRatio &&
    current.density === target.density &&
    current.fontFamilySans === target.fontFamilySans &&
    current.fontFamilyDisplay === target.fontFamilyDisplay &&
    current.fontWeightSans === target.fontWeightSans &&
    current.fontWeightDisplay === target.fontWeightDisplay &&
    current.iconLibrary === target.iconLibrary &&
    current.iconStroke === target.iconStroke
  )
}

function getNodeMinSize(node: ColorCanvasNode) {
  const base = MIN_NODE_SIZES[node.type]
  if (!node.preview) return base

  switch (node.preview.kind) {
    case "token-standard":
    case "radix-theme":
      return { width: 300, height: 200 }
    case "primitive-surface":
      return { width: 280, height: 180 }
    default:
      return { width: Math.max(base.width, 220), height: Math.max(base.height, 140) }
  }
}

function buildSystemFlowLayout(
  nodes: ColorCanvasNode[],
  getNodeSize: (node: ColorCanvasNode) => { width: number; height: number },
  viewportWidth = 1440
) {
  const positions: Record<string, { x: number; y: number }> = {}
  const sections: SystemSectionFrame[] = []
  const activeSectionIds = SYSTEM_SECTION_ORDER.filter((sectionId) =>
    nodes.some((node) => getSystemSectionId(node) === sectionId)
  )

  let cursorX = 40
  let maxHeight = 0

  SYSTEM_SECTION_ORDER.forEach((sectionId) => {
    const sectionNodes = nodes
      .filter((node) => getSystemSectionId(node) === sectionId)
      .sort((a, b) => {
        const weight = getSystemSectionNodeSortWeight(a) - getSystemSectionNodeSortWeight(b)
        return weight !== 0 ? weight : a.label.localeCompare(b.label)
      })

    if (sectionNodes.length === 0) return

    const meta = SYSTEM_SECTION_META[sectionId]
    const sectionStartX = cursorX
    const sectionStartY = 88
    let rowX = sectionStartX
    let rowY = sectionStartY
    let rowHeight = 0
    let maxRowWidth = 220
    const sectionInnerWidth =
      activeSectionIds.length <= 1
        ? Math.max(760, viewportWidth - 160)
        : Math.max(420, Math.min(620, viewportWidth - 220))

    sectionNodes.forEach((node) => {
      const size = getNodeSize(node)
      if (rowX > sectionStartX && rowX + size.width > sectionStartX + sectionInnerWidth) {
        rowX = sectionStartX
        rowY += rowHeight + 20
        rowHeight = 0
      }

      positions[node.id] = { x: rowX, y: rowY }
      rowX += size.width + 20
      rowHeight = Math.max(rowHeight, size.height)
      maxRowWidth = Math.max(maxRowWidth, rowX - sectionStartX - 20)
    })

    const sectionHeight = Math.max(180, rowY - sectionStartY + rowHeight)
    const sectionWidth =
      activeSectionIds.length <= 1
        ? Math.max(220, sectionInnerWidth)
        : Math.max(220, Math.min(sectionInnerWidth, maxRowWidth))

    sections.push({
      id: sectionId,
      label: meta.label,
      description: meta.description,
      nodeIds: sectionNodes.map((node) => node.id),
      x: sectionStartX - 16,
      y: 32,
      width: sectionWidth + 32,
      height: sectionHeight + 72,
    })

    cursorX += sectionWidth + 72
    maxHeight = Math.max(maxHeight, sectionHeight + 104)
  })

  return {
    positions,
    sections,
    width: Math.max(1280, cursorX + 80),
    height: Math.max(880, maxHeight + 80),
  }
}

export function ColorCanvasPage({ tokens, themeStorageKeyPrefix }: ColorCanvasPageProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const workspaceRef = useRef<HTMLDivElement>(null)
  const workspaceCanvasRef = useRef<HTMLDivElement>(null)
  const colorProbeRef = useRef<HTMLSpanElement>(null)
  const [tokenQuery, setTokenQuery] = useState("")
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
  const [selectedAutoEdgeId, setSelectedAutoEdgeId] = useState<string | null>(null)
  const [newThemeName, setNewThemeName] = useState("")

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
  const [viewNodePositions, setViewNodePositions] = useLocalStorage<
    Record<string, { x: number; y: number }>
  >(
    themeStorageKeyPrefix
      ? `${themeStorageKeyPrefix}-color-canvas-view-positions`
      : "gallery-color-canvas-view-positions",
    {}
  )
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
    replaceState,
  } = useColorCanvasState(
    themeStorageKeyPrefix
      ? `${themeStorageKeyPrefix}-color-canvas`
      : "gallery-color-canvas"
  )

  const filteredTokens = useMemo(() => {
    if (!tokenQuery.trim()) return colorTokens
    const lower = tokenQuery.trim().toLowerCase()
    return colorTokens.filter((token) => {
      const haystack = [token.label, token.cssVar, token.subcategory].join(" ").toLowerCase()
      return haystack.includes(lower)
    })
  }, [colorTokens, tokenQuery])

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
  const systemCanvasTransformEnabled =
    canvasMode === "system-canvas" && !isRelationshipMode
  const viewportToCanvasPosition = useCallback((clientX: number, clientY: number) => {
    const workspace = workspaceRef.current
    if (!workspace) return { x: clientX, y: clientY }
    const rect = workspace.getBoundingClientRect()
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
  }, [panSystemCanvasTo, systemCanvasTransform.scale, systemCanvasTransformEnabled])

  const scrollWorkspaceToNode = useCallback(
    (node: ColorCanvasNode | null) => {
      if (!node) return
      const workspace = workspaceRef.current
      if (!workspace) return
      const size = getNodeSize(node)
      if (systemCanvasTransformEnabled) {
        centerSystemCanvasOn(node.position.x + size.width / 2, node.position.y + size.height / 2)
        return
      }
      scrollWorkspaceTo(node.position.x - 32, Math.max(0, node.position.y - (workspace.clientHeight - size.height) / 2))
    },
    [centerSystemCanvasOn, getNodeSize, scrollWorkspaceTo, systemCanvasTransformEnabled]
  )

  useEffect(() => {
    const workspace = workspaceRef.current
    if (!workspace) return

    const updateDimensions = () => {
      const { width, height } = workspace.getBoundingClientRect()
      setSystemCanvasViewportSize({ width, height })
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
  }, [setSystemCanvasWorkspaceDimensions])

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
        const mappingEdge = edges.find(
          (edge) => edge.type === "map" && edge.targetId === node.id
        )
        if (mappingEdge) {
          return getNodeColorExpression(mappingEdge.sourceId, visited)
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
        const mappingEdge = edges.find(
          (edge) => edge.type === "map" && edge.targetId === node.id
        )
        if (mappingEdge) {
          return resolveNodeOklch(mappingEdge.sourceId, visited)
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
    [edges, nodesById, resolveCssColor, resolveExpressionColor]
  )

  const resolveNodeRgba = useCallback(
    (nodeId: string, visited = new Set<string>()): RGBA | null => {
      if (visited.has(nodeId)) return null
      visited.add(nodeId)

      const node = nodesById[nodeId]
      if (!node) return null

      if (node.type === "token") {
        if (node.value) return resolveExpressionColor(node.value)
        if (node.cssVar) return resolveExpressionColor(`var(${node.cssVar})`)
        return null
      }

      if (node.type === "semantic") {
        if (node.value) return resolveExpressionColor(node.value)
        const mappingEdge = edges.find(
          (edge) => edge.type === "map" && edge.targetId === node.id
        )
        if (mappingEdge) {
          return resolveNodeRgba(mappingEdge.sourceId, visited)
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
    [edges, nodesById, resolveExpressionColor, resolveNodeOklch]
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
    (nodeId: string) => nodesById[nodeId]?.label || nodeId,
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

  const handleGenerateTemplate = () => {
    const brandValue = templateBrand.trim()
    if (!brandValue) return
    let offset = 0
    const positionFor = () => {
      const baseX = 120
      const baseY = 80
      const spacingX = 220
      const spacingY = 120
      const index = nodes.length + offset
      offset += 1
      const col = index % 3
      const row = Math.floor(index / 3)
      return {
        x: baseX + col * spacingX,
        y: baseY + row * spacingY,
      }
    }

    const brandBaseId = upsertNode({
      type: "token",
      label: "Brand 500",
      cssVar: "--color-brand-500",
      value: brandValue,
      position: positionFor(),
    })

    const brandScale = [
      { cssVar: "--color-brand-300", label: "Brand 300", l: 16, c: -4 },
      { cssVar: "--color-brand-400", label: "Brand 400", l: 8, c: -2 },
      { cssVar: "--color-brand-600", label: "Brand 600", l: -6, c: -3 },
      { cssVar: "--color-brand-700", label: "Brand 700", l: -12, c: -5 },
    ]

    brandScale.forEach((entry) => {
      upsertNode({
        type: "relative",
        label: entry.label,
        cssVar: entry.cssVar,
        position: positionFor(),
        relative: {
          model: DEFAULT_COLOR_MODEL,
          baseId: brandBaseId,
          lMode: "delta",
          lValue: entry.l,
          cMode: "delta",
          cValue: entry.c,
          hMode: "inherit",
          alphaMode: "inherit",
        },
      })
    })

    const surfaceScale = [
      { cssVar: "--color-surface-50", label: "Surface 50", l: 98, c: 2 },
      { cssVar: "--color-surface-100", label: "Surface 100", l: 96, c: 3 },
      { cssVar: "--color-surface-200", label: "Surface 200", l: 92, c: 4 },
    ]

    surfaceScale.forEach((entry) => {
      upsertNode({
        type: "relative",
        label: entry.label,
        cssVar: entry.cssVar,
        position: positionFor(),
        relative: {
          model: DEFAULT_COLOR_MODEL,
          baseId: brandBaseId,
          lMode: "absolute",
          lValue: entry.l,
          cMode: "absolute",
          cValue: entry.c,
          hMode: "inherit",
          alphaMode: "inherit",
        },
      })
    })

    const textScale = [
      { cssVar: "--color-foreground", label: "Text Primary", l: 20 },
      { cssVar: "--color-muted-foreground", label: "Text Secondary", l: 40 },
    ]

    textScale.forEach((entry) => {
      upsertNode({
        type: "relative",
        label: entry.label,
        cssVar: entry.cssVar,
        position: positionFor(),
        relative: {
          model: DEFAULT_COLOR_MODEL,
          baseId: brandBaseId,
          lMode: "absolute",
          lValue: entry.l,
          cMode: "absolute",
          cValue: 0,
          hMode: "inherit",
          alphaMode: "inherit",
        },
      })
    })

    const accentValue = templateAccent.trim()
    if (accentValue) {
      const accentBaseId = upsertNode({
        type: "token",
        label: "Accent 500",
        cssVar: "--color-accent-500",
        value: accentValue,
        position: positionFor(),
      })

      const accentScale = [
        { cssVar: "--color-accent-400", label: "Accent 400", l: 8, c: -2 },
        { cssVar: "--color-accent-600", label: "Accent 600", l: -6, c: -3 },
      ]
      accentScale.forEach((entry) => {
        upsertNode({
          type: "relative",
          label: entry.label,
          cssVar: entry.cssVar,
          position: positionFor(),
          relative: {
            model: DEFAULT_COLOR_MODEL,
            baseId: accentBaseId,
            lMode: "delta",
            lValue: entry.l,
            cMode: "delta",
            cValue: entry.c,
            hMode: "inherit",
            alphaMode: "inherit",
          },
        })
      })
    }

    const accentSemanticId = upsertNode({
      type: "semantic",
      label: "Accent / Primary",
      role: "accent",
      position: positionFor(),
    })
    ensureEdge(brandBaseId, accentSemanticId, "map")
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
      const isUndo = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z"
      if (isUndo && canUndoEdgeRemoval) {
        event.preventDefault()
        undoRemoveEdge()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedEdgeId, removeEdge, undoRemoveEdge, canUndoEdgeRemoval])

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
        sections: [] as SystemSectionFrame[],
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
  const systemSectionFrames = useMemo(() => {
    if (isRelationshipMode) return [] as SystemSectionFrame[]

    return SYSTEM_SECTION_ORDER.reduce<SystemSectionFrame[]>((acc, sectionId) => {
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
  const canvasContentSize = useMemo(() => {
    const maxX = renderedNodes.reduce(
      (currentMax, node) => Math.max(currentMax, node.position.x + getNodeSize(node).width),
      0
    )
    const maxY = renderedNodes.reduce(
      (currentMax, node) => Math.max(currentMax, node.position.y + getNodeSize(node).height),
      0
    )
    const sectionMaxX = systemSectionFrames.reduce(
      (currentMax, section) => Math.max(currentMax, section.x + section.width),
      0
    )
    const sectionMaxY = systemSectionFrames.reduce(
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
    systemSectionFrames,
  ])
  const systemCanvasViewportItems = useMemo(
    () => [
      ...renderedNodes.map((node) => ({
        position: node.position,
        size: getNodeSize(node),
      })),
      ...systemSectionFrames.map((section) => ({
        position: { x: section.x, y: section.y },
        size: { width: section.width, height: section.height },
      })),
    ],
    [getNodeSize, renderedNodes, systemSectionFrames]
  )
  const visibleNodeIds = useMemo(() => new Set(renderedNodes.map((node) => node.id)), [renderedNodes])
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
  const selectedPreviewColor = selectedNode ? getNodeColor(selectedNode.id) : null
  const selectedPreviewIsP3 = selectedNode ? getNodeIsP3(selectedNode.id) : false
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
        (node) => node.type !== "component" && nodeMatchesRole(node, rule.foregroundRole)
      )
      const backgroundNodes = nodes.filter(
        (node) => node.type !== "component" && nodeMatchesRole(node, rule.backgroundRole)
      )
      foregroundNodes.forEach((foreground) => {
        backgroundNodes.forEach((background) => {
          if (foreground.id === background.id) return
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
  }, [autoContrastEnabled, contrastRules, isRelationshipMode, manualEdges, nodes])

  const resolvedSelectedAutoEdge = useMemo(() => {
    if (!selectedAutoEdgeId) return null
    return autoContrastEdges.find((edge) => edge.id === selectedAutoEdgeId) ?? null
  }, [autoContrastEdges, selectedAutoEdgeId])

  const selectedEdgeData = resolvedSelectedAutoEdge ?? selectedEdge

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
    if (canvasMode !== "system-canvas" || isRelationshipMode) return
    scrollWorkspaceTo(0, 0)
  }, [canvasMode, effectiveCanvasViewMode, isRelationshipMode, scrollWorkspaceTo])

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
      if (node.type === "relative") {
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
      if (node.type === "relative") {
        const expression = getNodeColorExpression(node.id)
        if (expression) nextVars[node.cssVar] = expression
        return
      }
      if ((node.type === "token" || node.type === "semantic") && node.value) {
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
      const fallback = `${source?.label ?? "Unknown"} → ${target?.label ?? "Unknown"}`
      if (!edge.auto) return fallback
      const rule = contrastRules.find((entry) => entry.id === edge.ruleId)
      return rule ? `${rule.label} · ${fallback}` : fallback
    },
    [contrastRules, nodesById]
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
        relative: node.relative,
        size: node.size,
        group: node.group,
        preview: node.preview,
        position: offset,
      })
    },
    [addNode, getNextCssVarFrom]
  )

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
            <span className="text-[11px] text-muted-foreground">Brand seed</span>
          </div>
          <div className="space-y-2">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Brand color</label>
              <ColorPickerField
                value={templateBrand}
                onChange={setTemplateBrand}
                placeholder="e.g. #1d4ed8 or oklch(60% 0.18 240)"
                className="w-full rounded-md border border-default bg-white px-2 py-1.5 text-xs text-foreground"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Accent color (optional)</label>
              <ColorPickerField
                value={templateAccent}
                onChange={setTemplateAccent}
                placeholder="Optional secondary brand"
                className="w-full rounded-md border border-default bg-white px-2 py-1.5 text-xs text-foreground"
              />
            </div>
            <button
              type="button"
              onClick={handleGenerateTemplate}
              className="w-full rounded-md border border-default bg-white px-2 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-50"
            >
              Generate template nodes
            </button>
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
              <div className="space-y-2">
                {filteredTokens.map((token) => (
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

              <div className="mt-4 space-y-2">
                <button
                  type="button"
                  onClick={handleAddCustomToken}
                  className="flex w-full items-center gap-2 rounded-md border border-default bg-white px-2 py-2 text-left text-xs text-foreground hover:bg-surface-50"
                >
                  <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="flex-1 truncate font-medium">Custom Token</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddRelativeToken}
                  className="flex w-full items-center gap-2 rounded-md border border-default bg-white px-2 py-2 text-left text-xs text-foreground hover:bg-surface-50"
                >
                  <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="flex-1 truncate font-medium">Relative Token</span>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                    OKLCH
                  </span>
                </button>
              </div>

              <div className="mt-6">
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

              <div className="mt-6">
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
                  onClick={() => handleJumpToSystemSection(section.id)}
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
            {isRelationshipMode && (
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
          </div>
        </div>

        <div
          ref={workspaceRef}
          className={`relative min-h-0 min-w-0 flex-1 overscroll-contain ${
            systemCanvasTransformEnabled ? "overflow-hidden" : "overflow-auto"
          } ${
            isRelationshipMode
              ? "bg-[radial-gradient(circle_at_top,#f8fbfa,transparent_55%)]"
              : "bg-[radial-gradient(circle_at_top,#f8fbff,transparent_55%)]"
          }`}
          onClick={handleWorkspaceClick}
          onWheel={systemCanvasTransformEnabled ? handleSystemWorkspaceWheel : undefined}
        >
          <div
            ref={workspaceCanvasRef}
            className={`relative min-h-full min-w-full ${
              systemCanvasTransformEnabled ? "absolute left-0 top-0 origin-top-left" : ""
            }`}
            style={
              systemCanvasTransformEnabled
                ? {
                    width: canvasContentSize.width,
                    height: canvasContentSize.height,
                    transform: `translate(${systemCanvasTransform.offset.x}px, ${systemCanvasTransform.offset.y}px) scale(${systemCanvasTransform.scale})`,
                  }
                : { width: canvasContentSize.width, height: canvasContentSize.height }
            }
          >
            {!isRelationshipMode &&
              systemSectionFrames.map((section) => (
                <div
                  key={`section-${section.id}`}
                  className="pointer-events-none absolute"
                  style={{
                    left: section.x,
                    top: Math.max(16, section.y),
                  }}
                >
                  <div className="inline-flex items-center gap-3 rounded-full border border-default bg-white/90 px-3 py-1 shadow-sm backdrop-blur">
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
                  const x1 = source.position.x + sourceSize.width / 2
                  const y1 = source.position.y + sourceSize.height / 2
                  const x2 = target.position.x + targetSize.width / 2
                  const y2 = target.position.y + targetSize.height / 2
                  return (
                    <line
                      key={edge.id}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="#94a3b8"
                      strokeWidth={1.5}
                      strokeDasharray="3 4"
                    />
                  )
                })}
              {visibleEdges.map((edge) => {
                const source = renderedNodesById[edge.sourceId]
                const target = renderedNodesById[edge.targetId]
                if (!source || !target) return null
                const sourceSize = getNodeSize(source)
                const targetSize = getNodeSize(target)
                const x1 = source.position.x + sourceSize.width / 2
                const y1 = source.position.y + sourceSize.height / 2
                const x2 = target.position.x + targetSize.width / 2
                const y2 = target.position.y + targetSize.height / 2
                const stroke = edge.type === "map" ? "#a5b4fc" : "#f97316"
                return (
                  <line
                    key={edge.id}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={stroke}
                    strokeWidth={2}
                    strokeDasharray={edge.type === "contrast" ? "6 4" : ""}
                  />
                )
              })}
              {connectMode && connectSourceId && connectDrag.active && (() => {
                const source = renderedNodesById[connectSourceId]
                if (!source) return null
                const sourceSize = getNodeSize(source)
                const x1 = source.position.x + sourceSize.width / 2
                const y1 = source.position.y + sourceSize.height / 2
                return (
                  <line
                    x1={x1}
                    y1={y1}
                    x2={connectDrag.x}
                    y2={connectDrag.y}
                    stroke="#94a3b8"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                  />
                )
              })()}
            </svg>

            {visibleEdges.map((edge) => {
              const source = renderedNodesById[edge.sourceId]
              const target = renderedNodesById[edge.targetId]
              if (!source || !target) return null
              const sourceSize = getNodeSize(source)
              const targetSize = getNodeSize(target)
              const x1 = source.position.x + sourceSize.width / 2
              const y1 = source.position.y + sourceSize.height / 2
              const x2 = target.position.x + targetSize.width / 2
              const y2 = target.position.y + targetSize.height / 2
              const midX = (x1 + x2) / 2
              const midY = (y1 + y2) / 2
              const contrast = getEdgeContrast(edge)
              const label = edge.type === "contrast" ? formatLc(contrast) : edge.rule?.note || "Map"
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
                  onClick={() => handleEdgeBadgeClick(edge)}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full px-2 py-1 text-[10px] font-semibold shadow-sm ${badgeClass}`}
                  style={{ left: midX, top: midY }}
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
                resolveColor={getNodeColor}
                resolveIsP3={getNodeIsP3}
                resolveExpression={getNodeColorExpression}
                resolveLabel={getNodeLabel}
                selected={selectedNodeId === node.id}
                connectActive={isRelationshipMode && connectMode !== null}
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
                        {selectedNode.preview && (
                          <DesignSystemNodePreview preview={selectedNode.preview} />
                        )}
                      </div>
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
                      <div>
                        <div className="text-[11px] text-muted-foreground">Contrast checks</div>
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
                              const forwardLabel = `${source?.label ?? "Unknown"} → ${targetNode?.label ?? "Unknown"}`
                              const reverseLabel = `${targetNode?.label ?? "Unknown"} → ${source?.label ?? "Unknown"}`
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
                          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Role</label>
                          <select
                            value={selectedNode.role || ""}
                            onChange={(e) =>
                              updateNodeRole(selectedNode.id, e.target.value as ColorCanvasNode["role"])
                            }
                            className="w-full rounded-md border border-default bg-white px-2 py-1 text-xs text-foreground"
                          >
                            <option value="">Unspecified</option>
                            <option value="text">Text</option>
                            <option value="surface">Surface</option>
                            <option value="border">Border</option>
                            <option value="icon">Icon</option>
                            <option value="accent">Accent</option>
                          </select>
                          <div className="mt-1 text-[10px] text-muted-foreground">
                            Roles drive auto-contrast rules.
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

                      {selectedNode.type === "token" && (
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Value Override</label>
                          <ColorPickerField
                            value={selectedNode.value || ""}
                            onChange={(value) => updateNodeValue(selectedNode.id, value)}
                            className="w-full rounded-md border border-default bg-white px-2 py-1 text-xs text-foreground"
                            placeholder="e.g. #1d4ed8 or rgb(0 0 0)"
                          />
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
                                    {node.label} ({node.type})
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

                      {selectedNode.type === "semantic" && (
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Color Override</label>
                          <ColorPickerField
                            value={selectedNode.value || ""}
                            onChange={(value) => updateNodeValue(selectedNode.id, value)}
                            className="w-full rounded-md border border-default bg-white px-2 py-1 text-xs text-foreground"
                            placeholder="e.g. rgb(0 0 0)"
                          />
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

      <span
        ref={colorProbeRef}
        aria-hidden
        className="pointer-events-none absolute -left-[9999px] top-0 h-0 w-0 opacity-0"
      />
    </div>
  )
}

function nodeMatchesRole(node: ColorCanvasNode, role: NonNullable<ColorCanvasNode["role"]>) {
  if (node.role === role) return true
  const haystack = `${node.label} ${node.cssVar ?? ""}`.toLowerCase()
  const keywords: Record<NonNullable<ColorCanvasNode["role"]>, string[]> = {
    text: ["text", "foreground", "content", "fg"],
    surface: ["surface", "background", "canvas", "bg"],
    border: ["border", "stroke"],
    icon: ["icon"],
    accent: ["accent", "brand", "primary", "secondary"],
  }
  return keywords[role].some((keyword) => haystack.includes(keyword))
}

function getNextPosition(nodes: ColorCanvasNode[]) {
  const baseX = 120
  const baseY = 80
  const spacingX = 220
  const spacingY = 120
  const index = nodes.length
  const col = index % 3
  const row = Math.floor(index / 3)
  return {
    x: baseX + col * spacingX,
    y: baseY + row * spacingY,
  }
}

function formatRelativeChannel(
  mode: string | undefined,
  value: number | undefined,
  unit: string,
  transform: (value: number) => number = (val) => val
) {
  if (!mode || mode === "inherit") return "inherit"
  if (value === undefined || Number.isNaN(value)) return "inherit"
  const nextValue = transform(value)
  if (Number.isNaN(nextValue)) return "inherit"
  const sign = mode === "delta" && nextValue > 0 ? "+" : ""
  return `${sign}${nextValue}${unit}`
}

function clampValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function wrapDegrees(value: number) {
  const mod = value % 360
  return mod < 0 ? mod + 360 : mod
}

export function normalizeRelativeChroma(value: number) {
  if (Number.isNaN(value)) return value
  if (Math.abs(value) > 1) return value / 100
  return value
}

export function applyRelativeChannel(
  baseValue: number,
  mode: string | undefined,
  value: number | undefined,
  percentScale: number,
  normalize: (value: number) => number
) {
  if (!mode || mode === "inherit") return baseValue
  if (value === undefined || Number.isNaN(value)) return baseValue
  const normalized = normalize(value)
  if (mode === "absolute") {
    return normalized / percentScale
  }
  return baseValue + normalized / percentScale
}

export function resolveRelativeOklch(
  base: OklchColor,
  spec: RelativeColorSpec
): OklchColor {
  const nextL = applyRelativeChannel(base.l, spec.lMode, spec.lValue, 100, (value) => value)
  const nextC = applyRelativeChannel(base.c, spec.cMode, spec.cValue, 1, (value) =>
    normalizeRelativeChroma(value)
  )
  const nextH = applyRelativeChannel(base.h, spec.hMode, spec.hValue, 1, (value) => value)
  const nextA = applyRelativeChannel(base.a, spec.alphaMode, spec.alphaValue, 100, (value) => value)
  return {
    l: clampValue(nextL ?? base.l, 0, 1),
    c: Math.max(0, nextC ?? base.c),
    h: wrapDegrees(nextH ?? base.h),
    a: clampValue(nextA ?? base.a, 0, 1),
  }
}

function rgbaToCss(color: RGBA) {
  const r = Math.round(clampValue(color.r, 0, 1) * 255)
  const g = Math.round(clampValue(color.g, 0, 1) * 255)
  const b = Math.round(clampValue(color.b, 0, 1) * 255)
  const a = clampValue(color.a, 0, 1)
  if (a >= 1) return `rgb(${r} ${g} ${b})`
  return `rgb(${r} ${g} ${b} / ${Number(a.toFixed(3))})`
}

export function parseOklch(input: string): { l: number; c: number; h: number; a: number } | null {
  const match = input.trim().toLowerCase().match(/^oklch\(([^)]+)\)$/)
  if (!match) return null
  const body = match[1]
  const [channelsPart, alphaPart] = body.split("/")
  const parts = channelsPart.trim().split(/\s+/).filter(Boolean)
  if (parts.length < 3) return null
  const parsePercent = (raw: string) => {
    const value = parseFloat(raw)
    if (Number.isNaN(value)) return null
    if (raw.includes("%") || value > 1) return value / 100
    return value
  }
  const parseHue = (raw: string) => {
    const value = parseFloat(raw)
    if (Number.isNaN(value)) return null
    return value
  }
  const l = parsePercent(parts[0])
  if (l === null) return null
  const c = parsePercent(parts[1])
  if (c === null) return null
  const h = parseHue(parts[2])
  if (h === null) return null
  let a = 1
  if (alphaPart) {
    const alphaRaw = alphaPart.trim()
    if (alphaRaw) {
      const alphaValue = parseFloat(alphaRaw)
      if (Number.isNaN(alphaValue)) return null
      a = alphaRaw.includes("%") || alphaValue > 1 ? alphaValue / 100 : alphaValue
    }
  }
  return { l: clampValue(l, 0, 1), c: Math.max(0, c), h, a: clampValue(a, 0, 1) }
}

export function parseDisplayP3(input: string): RGBA | null {
  const match = input.trim().toLowerCase().match(/^color\(display-p3\s+([^)]+)\)$/)
  if (!match) return null
  const body = match[1].trim()
  const normalized = body.replace(/\s*\/\s*/g, " / ")
  const tokens = normalized.split(/\s+/).filter(Boolean)
  const slashIndex = tokens.indexOf("/")
  const channels = slashIndex !== -1 ? tokens.slice(0, slashIndex) : tokens
  const alphaToken = slashIndex !== -1 ? tokens[slashIndex + 1] : undefined
  if (channels.length < 3) return null

  const parseChannel = (raw: string) => {
    if (raw.endsWith("%")) {
      return clampValue(parseFloat(raw) / 100, 0, 1)
    }
    const numeric = parseFloat(raw)
    if (Number.isNaN(numeric)) return null
    return clampValue(numeric, 0, 1)
  }

  const r = parseChannel(channels[0])
  const g = parseChannel(channels[1])
  const b = parseChannel(channels[2])
  if (r === null || g === null || b === null) return null
  let a = 1
  if (alphaToken) {
    const alphaValue = parseFloat(alphaToken)
    if (!Number.isNaN(alphaValue)) {
      a = alphaToken.includes("%") || alphaValue > 1 ? alphaValue / 100 : alphaValue
      a = clampValue(a, 0, 1)
    }
  }
  return { r, g, b, a }
}

export function displayP3ToSrgb(color: RGBA): RGBA {
  const r = srgbToLinear(clampValue(color.r, 0, 1))
  const g = srgbToLinear(clampValue(color.g, 0, 1))
  const b = srgbToLinear(clampValue(color.b, 0, 1))

  const x = 0.4865709486 * r + 0.2656676932 * g + 0.1982172852 * b
  const y = 0.2289745641 * r + 0.6917385218 * g + 0.0792869141 * b
  const z = 0.0451133819 * g + 1.0439443689 * b

  const rLinear = 3.2409699419 * x - 1.5373831776 * y - 0.4986107603 * z
  const gLinear = -0.9692436363 * x + 1.8759675015 * y + 0.0415550574 * z
  const bLinear = 0.0556300797 * x - 0.2039769589 * y + 1.0569715142 * z

  return {
    r: clampValue(linearToSrgb(rLinear), 0, 1),
    g: clampValue(linearToSrgb(gLinear), 0, 1),
    b: clampValue(linearToSrgb(bLinear), 0, 1),
    a: color.a,
  }
}

export function oklchToLinearSrgb(color: { l: number; c: number; h: number }) {
  const L = clampValue(color.l, 0, 1)
  const C = Math.max(0, color.c)
  const H = (wrapDegrees(color.h) * Math.PI) / 180
  const a = C * Math.cos(H)
  const b = C * Math.sin(H)

  const lRoot = L + 0.3963377774 * a + 0.2158037573 * b
  const mRoot = L - 0.1055613458 * a - 0.0638541728 * b
  const sRoot = L - 0.0894841775 * a - 1.291485548 * b

  const l = lRoot ** 3
  const m = mRoot ** 3
  const s = sRoot ** 3

  return {
    r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  }
}

export function isOutOfGamut(color: { r: number; g: number; b: number }) {
  return color.r < 0 || color.r > 1 || color.g < 0 || color.g > 1 || color.b < 0 || color.b > 1
}

export function oklchToDisplayP3Css(color: { l: number; c: number; h: number; a?: number }) {
  const L = clampValue(color.l, 0, 1)
  const C = Math.max(0, color.c)
  const H = (wrapDegrees(color.h) * Math.PI) / 180
  const aLab = C * Math.cos(H)
  const bLab = C * Math.sin(H)

  const lRoot = L + 0.3963377774 * aLab + 0.2158037573 * bLab
  const mRoot = L - 0.1055613458 * aLab - 0.0638541728 * bLab
  const sRoot = L - 0.0894841775 * aLab - 1.291485548 * bLab

  const l = lRoot ** 3
  const m = mRoot ** 3
  const s = sRoot ** 3

  const x = 1.2270138511 * l - 0.5577999807 * m + 0.281256149 * s
  const y = -0.0405801784 * l + 1.1122568696 * m - 0.0716766787 * s
  const z = -0.0763812845 * l - 0.4214819784 * m + 1.5861632204 * s

  const rLinear = 2.4934969119 * x - 0.9313836179 * y - 0.4027107845 * z
  const gLinear = -0.8294889696 * x + 1.7626640603 * y + 0.0236246858 * z
  const bLinear = 0.0358458302 * x - 0.0761723893 * y + 0.956884524 * z

  const r = clampValue(linearToSrgb(rLinear), 0, 1)
  const g = clampValue(linearToSrgb(gLinear), 0, 1)
  const b = clampValue(linearToSrgb(bLinear), 0, 1)
  const alpha = clampValue(color.a ?? 1, 0, 1)
  const format = (value: number) => Number(value.toFixed(4))
  if (alpha >= 1) return `color(display-p3 ${format(r)} ${format(g)} ${format(b)})`
  return `color(display-p3 ${format(r)} ${format(g)} ${format(b)} / ${format(alpha)})`
}

function srgbToLinear(channel: number) {
  if (channel <= 0.04045) return channel / 12.92
  return Math.pow((channel + 0.055) / 1.055, 2.4)
}

function linearToSrgb(channel: number) {
  if (channel <= 0.0031308) return channel * 12.92
  return 1.055 * Math.pow(channel, 1 / 2.4) - 0.055
}

export function srgbToOklch(color: RGBA): { l: number; c: number; h: number } | null {
  const r = srgbToLinear(clampValue(color.r, 0, 1))
  const g = srgbToLinear(clampValue(color.g, 0, 1))
  const b = srgbToLinear(clampValue(color.b, 0, 1))

  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b

  const lRoot = Math.cbrt(l)
  const mRoot = Math.cbrt(m)
  const sRoot = Math.cbrt(s)

  const L = 0.2104542553 * lRoot + 0.793617785 * mRoot - 0.0040720468 * sRoot
  const A = 1.9779984951 * lRoot - 2.428592205 * mRoot + 0.4505937099 * sRoot
  const B = 0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.808675766 * sRoot

  const C = Math.sqrt(A * A + B * B)
  const H = wrapDegrees((Math.atan2(B, A) * 180) / Math.PI)
  return { l: clampValue(L, 0, 1), c: C, h: H }
}

export function oklchToSrgb(color: { l: number; c: number; h: number; a?: number }): RGBA | null {
  const L = clampValue(color.l, 0, 1)
  const C = Math.max(0, color.c)
  const H = (wrapDegrees(color.h) * Math.PI) / 180
  const a = C * Math.cos(H)
  const bLab = C * Math.sin(H)

  const lRoot = L + 0.3963377774 * a + 0.2158037573 * bLab
  const mRoot = L - 0.1055613458 * a - 0.0638541728 * bLab
  const sRoot = L - 0.0894841775 * a - 1.291485548 * bLab

  const l = lRoot ** 3
  const m = mRoot ** 3
  const s = sRoot ** 3

  const rLinear = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
  const gLinear = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
  const bLinear = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s

  const r = clampValue(linearToSrgb(rLinear), 0, 1)
  const g = clampValue(linearToSrgb(gLinear), 0, 1)
  const bOut = clampValue(linearToSrgb(bLinear), 0, 1)
  return { r, g, b: bOut, a: color.a ?? 1 }
}
function ColorNode({
  node,
  size,
  minSize,
  toCanvasPosition,
  resolveColor,
  resolveIsP3,
  resolveExpression,
  resolveLabel,
  selected,
  connectActive,
  connectDragging,
  connectSourceId,
  movable,
  onMove,
  onResize,
  onClick,
  onConnectStart,
  showFullLabels,
}: {
  node: ColorCanvasNode
  size: { width: number; height: number }
  minSize: { width: number; height: number }
  toCanvasPosition: (clientX: number, clientY: number) => { x: number; y: number }
  resolveColor: (nodeId: string) => string | null
  resolveIsP3: (nodeId: string) => boolean
  resolveExpression: (nodeId: string) => string | null
  resolveLabel: (nodeId: string) => string
  selected: boolean
  connectActive: boolean
  connectDragging: boolean
  connectSourceId: string | null
  movable: boolean
  onMove: (id: string, position: { x: number; y: number }) => void
  onResize: (id: string, size: { width: number; height: number }) => void
  onClick: (id: string) => void
  onConnectStart: (id: string, event: React.PointerEvent) => void
  showFullLabels: boolean
}) {
  const draggingRef = useRef(false)
  const resizingRef = useRef(false)
  const offsetRef = useRef({ x: 0, y: 0 })
  const resizeStartRef = useRef({
    x: 0,
    y: 0,
    width: size.width,
    height: size.height,
  })
  const releasePointerCapture = (event: React.PointerEvent) => {
    const candidates = [event.target as HTMLElement | null, event.currentTarget as HTMLElement | null]
    candidates.forEach((candidate) => {
      if (candidate?.hasPointerCapture?.(event.pointerId)) {
        candidate.releasePointerCapture(event.pointerId)
      }
    })
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation()
    if (!movable) return
    if (resizingRef.current) return
    draggingRef.current = true
    const point = toCanvasPosition(e.clientX, e.clientY)
    offsetRef.current = {
      x: point.x - node.position.x,
      y: point.y - node.position.y,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (resizingRef.current) {
      const point = toCanvasPosition(e.clientX, e.clientY)
      const nextWidth = Math.max(
        minSize.width,
        Math.round(resizeStartRef.current.width + (point.x - resizeStartRef.current.x))
      )
      const nextHeight = Math.max(
        minSize.height,
        Math.round(resizeStartRef.current.height + (point.y - resizeStartRef.current.y))
      )
      onResize(node.id, {
        width: nextWidth,
        height: nextHeight,
      })
      return
    }
    if (!draggingRef.current) return
    const point = toCanvasPosition(e.clientX, e.clientY)
    onMove(node.id, {
      x: point.x - offsetRef.current.x,
      y: point.y - offsetRef.current.y,
    })
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (resizingRef.current) {
      resizingRef.current = false
      releasePointerCapture(e)
      return
    }
    if (!movable) {
      onClick(node.id)
      return
    }
    if (connectDragging) {
      return
    }
    if (!draggingRef.current) {
      onClick(node.id)
      return
    }
    draggingRef.current = false
    releasePointerCapture(e)
    onClick(node.id)
  }

  const colorSample = resolveColor(node.id)
  const isP3 = resolveIsP3(node.id)
  const expression = resolveExpression(node.id)
  const normalizeChroma = (value: number) => {
    const normalized = Math.abs(value) > 1 ? value / 100 : value
    return Number(normalized.toFixed(3))
  }
  const relativeSummary = (() => {
    if (node.type !== "relative" || !node.relative) return null
    const parts = [
      { label: "L", value: formatRelativeChannel(node.relative.lMode, node.relative.lValue, "%") },
      {
        label: "C",
        value: formatRelativeChannel(node.relative.cMode, node.relative.cValue, "", normalizeChroma),
      },
      { label: "H", value: formatRelativeChannel(node.relative.hMode, node.relative.hValue, "°") },
      { label: "A", value: formatRelativeChannel(node.relative.alphaMode, node.relative.alphaValue, "%") },
    ]
    const changed = parts.filter((part) => part.value !== "inherit")
    if (changed.length === 0) return "Inherits base"
    return changed.map((part) => `${part.label} ${part.value}`).join(" · ")
  })()
  const relativeBaseLabel =
    showFullLabels && node.type === "relative" && node.relative?.baseId
      ? `From ${resolveLabel(node.relative.baseId)}`
      : null
  const labelLine = node.preview
    ? node.preview.description ||
      node.preview.note ||
      formatPreviewKindLabel(node.preview.kind)
    : showFullLabels
      ? expression || node.cssVar || node.role || node.type
      : node.cssVar || node.role || node.type
  const surfaceClass = node.preview
    ? selected
      ? "border-sky-500 bg-sky-50 shadow-md ring-1 ring-sky-200"
      : "border-sky-200 bg-sky-50/80 shadow-sm"
    : node.group === "system-support"
      ? selected
        ? "border-emerald-500 bg-emerald-50 shadow-md ring-1 ring-emerald-200"
        : "border-emerald-200 bg-emerald-50/80 shadow-sm"
      : selected
        ? "border-brand-500 bg-white shadow-md"
        : "border-default bg-white shadow-sm"
  const groupBadge =
    node.group === "system-support"
      ? "System support"
      : node.preview
        ? "Preview"
        : null
  const handleResizePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    onClick(node.id)
    draggingRef.current = false
    resizingRef.current = true
    const point = toCanvasPosition(e.clientX, e.clientY)
    resizeStartRef.current = {
      x: point.x,
      y: point.y,
      width: size.width,
      height: size.height,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  return (
    <div
      data-color-node="true"
      data-node-id={node.id}
      role="button"
      tabIndex={0}
      className={`absolute overflow-hidden rounded-xl border px-3 py-3 transition-shadow ${
        surfaceClass
      } ${connectSourceId === node.id ? "ring-2 ring-brand-400" : ""} ${
        movable ? "cursor-move" : "cursor-pointer"
      }`}
      style={{
        width: size.width,
        height: size.height,
        left: node.position.x,
        top: node.position.y,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {connectActive && (
        <>
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation()
              onConnectStart(node.id, e)
            }}
            className="absolute -left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border border-brand-300 bg-white shadow-sm hover:border-brand-500"
            aria-label="Start connection"
          />
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation()
              onConnectStart(node.id, e)
            }}
            className="absolute -right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border border-brand-300 bg-white shadow-sm hover:border-brand-500"
            aria-label="Finish connection"
          />
        </>
      )}
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex items-center gap-2">
          {!node.preview && (
            <div
              className="h-6 w-6 rounded border border-default"
              style={{ background: colorSample || "transparent" }}
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-foreground">{node.label}</div>
            <div
              className="truncate text-[10px] text-muted-foreground"
              title={showFullLabels ? labelLine : undefined}
            >
              {labelLine}
            </div>
            {node.type === "relative" && (
              <div className="mt-1 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-semibold text-amber-700">
                Relative
              </div>
            )}
            {relativeSummary && (
              <div className="mt-1 truncate text-[9px] text-muted-foreground">{relativeSummary}</div>
            )}
            {relativeBaseLabel && (
              <div className="mt-1 truncate text-[9px] text-muted-foreground">{relativeBaseLabel}</div>
            )}
          </div>
          {groupBadge && !node.preview?.badge && (
            <span className="rounded-full bg-white/80 px-2 py-0.5 text-[9px] font-semibold text-muted-foreground">
              {groupBadge}
            </span>
          )}
          {node.preview?.badge && (
            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[9px] font-semibold text-sky-700">
              {node.preview.badge}
            </span>
          )}
          {isP3 && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-semibold text-emerald-700">
              P3
            </span>
          )}
          <Link2 className="h-4 w-4 text-muted-foreground" />
        </div>
        {node.preview && (
          <div
            className="min-h-0 flex-1 overflow-auto pr-1"
            data-system-preview-scroll="true"
          >
            <DesignSystemNodePreview preview={node.preview} />
          </div>
        )}
      </div>
      <button
        type="button"
        onPointerDown={handleResizePointerDown}
        className="absolute bottom-1.5 right-1.5 h-4 w-4 rounded-sm border border-default bg-white/90 text-muted-foreground shadow-sm hover:border-brand-400 hover:text-foreground"
        aria-label="Resize node"
      >
        <span className="pointer-events-none absolute bottom-0.5 right-0.5 text-[9px] leading-none">
          ↘
        </span>
      </button>
    </div>
  )
}
