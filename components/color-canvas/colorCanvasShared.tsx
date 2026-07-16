import { DEFAULT_DESIGN_SYSTEM_SCALE_CONFIG, type DesignSystemScaleConfig } from "../../projects/design-system-foundation/designSystemApi"
import type { ThemeToken } from "../../types/theme"
import type { ColorCanvasEdge, ColorCanvasFrameworkId, ColorCanvasNode, ColorCanvasNodePreview, ColorCanvasPreviewKind, RelativeColorSpec } from "../../types/colorCanvas"
import { type ColorAuditTemplateKitId as SharedColorAuditTemplateKitId } from "../../utils/colorAuditOperations"
import { DEFAULT_COLOR_MODEL, parseColor } from "../../utils/apca"

import { clampValue, displayP3ToSrgb, parseDisplayP3, parseOklch, resolveRelativeOklch, srgbToOklch, wrapDegrees } from "./colorCanvasColorMath"

export interface RGBA {
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

export interface ColorCanvasPageProps {
  tokens: ThemeToken[]
  projectId?: string
  themeStorageKeyPrefix?: string
  catalogOnly?: boolean
}

export type ConnectMode = "map" | "contrast" | null
export type EdgeFilter = "all" | "map" | "contrast"
export type CanvasMode = "color-audit" | "system-canvas"
export type ColorAuditFocusMode = "review" | "build" | "contrast"
export type ColorAuditLayoutMode = "freeform" | "flow" | "center" | "roles"
export type CanvasViewMode =
  | "color"
  | "system"
  | "colors"
  | "type"
  | "layout"
  | "primitives"
  | "standards"
  | "all"
export type ContrastRule = {
  id: string
  label: string
  foregroundRole: NonNullable<ColorCanvasNode["role"]>
  backgroundRole: NonNullable<ColorCanvasNode["role"]>
  targetLc: number
  enabled: boolean
}

export type DisplayEdge = ColorCanvasEdge & { auto?: boolean; ruleId?: string }
export type SystemSectionId = "colors" | "type" | "layout" | "primitives" | "standards"
export type CanvasSectionFrame = {
  id: string
  label: string
  description: string
  nodeIds: string[]
  x: number
  y: number
  width: number
  height: number
}

export type SystemViewportAction = "fit-width" | "bird-view" | null
export type ColorAuditViewportAction = "bird-view" | null
export type TemplateKitId = SharedColorAuditTemplateKitId
export type FunctionalTokenSourceId =
  | "surface"
  | "surface-muted"
  | "text"
  | "text-muted"
  | "border"
  | "accent"
  | "accent-contrast"
export type FunctionalTokenPreset = {
  label: string
  cssVar: string
  role: NonNullable<ColorCanvasNode["role"]>
  source: FunctionalTokenSourceId
  framework: ColorCanvasFrameworkId
  description: string
}

export async function copyTextToClipboard(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Fall through to the legacy selection-based copy path.
    }
  }

  if (typeof document === "undefined") return false

  const textarea = document.createElement("textarea")
  textarea.value = text
  textarea.setAttribute("readonly", "true")
  textarea.style.position = "fixed"
  textarea.style.left = "-9999px"
  textarea.style.top = "0"
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()
  textarea.setSelectionRange(0, text.length)

  try {
    return typeof document.execCommand === "function" ? document.execCommand("copy") : false
  } catch {
    return false
  } finally {
    textarea.remove()
  }
}
export type TemplateSeedKind = "brand" | "accent"
export type TemplateSeedOklch = { l: number; c: number; h: number }
export type ColorNodePortKind = "map" | "contrast" | "dependency"
export type ColorNodePortId =
  | "map-in"
  | "map-out"
  | "contrast-in"
  | "contrast-out"
  | "dependency-in"
  | "dependency-out"

export type NodeCatalogSection = {
  id: string
  mode: CanvasMode
  label: string
  description: string
  nodes: ColorCanvasNode[]
}

export type WorkspaceCatalogSection = {
  id: string
  label: string
  description: string
  items: Array<{
    id: string
    label: string
    kind: string
    description: string
    previewKind:
      | "artboard"
      | "component"
      | "embed"
      | "media"
      | "mermaid"
      | "excalidraw"
      | "markdown"
  }>
}

export type ColorCanvasFileActionModalState = {
  mode: "create" | "save-as" | "rename" | "duplicate"
  targetPath: string | null
  title: string
  folder: string
}

export type ColorCanvasFileDeleteModalState = {
  path: string
  title: string
}

export const DEFAULT_NODE_SIZES: Record<ColorCanvasNode["type"], { width: number; height: number }> = {
  token: { width: 188, height: 86 },
  semantic: { width: 216, height: 102 },
  component: { width: 200, height: 74 },
  relative: { width: 220, height: 122 },
}

export const MIN_NODE_SIZES: Record<ColorCanvasNode["type"], { width: number; height: number }> = {
  token: { width: 170, height: 80 },
  semantic: { width: 196, height: 96 },
  component: { width: 220, height: 140 },
  relative: { width: 216, height: 116 },
}

export const SEMANTIC_PRESETS: Array<{ label: string; role: ColorCanvasNode["role"] }> = [
  { label: "Text / Foreground", role: "text" },
  { label: "Text / Muted", role: "text" },
  { label: "Surface / Base", role: "surface" },
  { label: "Surface / Subtle", role: "surface" },
  { label: "Border / Default", role: "border" },
  { label: "Icon / Default", role: "icon" },
  { label: "Accent / Primary", role: "accent" },
]

export const SURFACE_CANVAS_FILE_ROW_HEIGHT = 56
export const SURFACE_CANVAS_FILE_LIST_HEIGHT = 256

export const FUNCTIONAL_TOKEN_PRESETS: Record<ColorCanvasFrameworkId, FunctionalTokenPreset[]> = {
  shadcn: [
    {
      label: "Background",
      cssVar: "--background",
      role: "surface",
      source: "surface",
      framework: "shadcn",
      description: "Base app surface used behind most content.",
    },
    {
      label: "Foreground",
      cssVar: "--foreground",
      role: "text",
      source: "text",
      framework: "shadcn",
      description: "Primary text and icon color on the default background.",
    },
    {
      label: "Card",
      cssVar: "--card",
      role: "surface",
      source: "surface",
      framework: "shadcn",
      description: "Elevated surface for containers and cards.",
    },
    {
      label: "Card Foreground",
      cssVar: "--card-foreground",
      role: "text",
      source: "text",
      framework: "shadcn",
      description: "Readable content color placed on cards.",
    },
    {
      label: "Muted",
      cssVar: "--muted",
      role: "surface",
      source: "surface-muted",
      framework: "shadcn",
      description: "Subtle background for secondary containers and placeholders.",
    },
    {
      label: "Muted Foreground",
      cssVar: "--muted-foreground",
      role: "text",
      source: "text-muted",
      framework: "shadcn",
      description: "Secondary text used on muted and tertiary UI copy.",
    },
    {
      label: "Primary",
      cssVar: "--primary",
      role: "accent",
      source: "accent",
      framework: "shadcn",
      description: "Main action or emphasis background.",
    },
    {
      label: "Primary Foreground",
      cssVar: "--primary-foreground",
      role: "text",
      source: "accent-contrast",
      framework: "shadcn",
      description: "Readable content placed on the primary action color.",
    },
    {
      label: "Accent",
      cssVar: "--accent",
      role: "accent",
      source: "accent",
      framework: "shadcn",
      description: "Interactive hover or selected-state accent surface.",
    },
    {
      label: "Accent Foreground",
      cssVar: "--accent-foreground",
      role: "text",
      source: "accent-contrast",
      framework: "shadcn",
      description: "Readable content placed on accent backgrounds.",
    },
    {
      label: "Border",
      cssVar: "--border",
      role: "border",
      source: "border",
      framework: "shadcn",
      description: "Default border and divider color.",
    },
    {
      label: "Input",
      cssVar: "--input",
      role: "border",
      source: "border",
      framework: "shadcn",
      description: "Input outline or field border color.",
    },
    {
      label: "Ring",
      cssVar: "--ring",
      role: "accent",
      source: "accent",
      framework: "shadcn",
      description: "Focus ring color for interactive controls.",
    },
  ],
  radix: [
    {
      label: "Canvas Background",
      cssVar: "--color-background",
      role: "surface",
      source: "surface",
      framework: "radix",
      description: "App background behind panels and pages.",
    },
    {
      label: "Panel",
      cssVar: "--color-panel",
      role: "surface",
      source: "surface-muted",
      framework: "radix",
      description: "Raised panel surface for cards and settings panes.",
    },
    {
      label: "Text",
      cssVar: "--color-text",
      role: "text",
      source: "text",
      framework: "radix",
      description: "Default Radix text color.",
    },
    {
      label: "Text Muted",
      cssVar: "--color-text-muted",
      role: "text",
      source: "text-muted",
      framework: "radix",
      description: "Muted text for helper copy and metadata.",
    },
    {
      label: "Border",
      cssVar: "--color-border",
      role: "border",
      source: "border",
      framework: "radix",
      description: "Border and separator color for panels and fields.",
    },
    {
      label: "Accent",
      cssVar: "--color-accent",
      role: "accent",
      source: "accent",
      framework: "radix",
      description: "Main accent swatch consumed by Radix Themes.",
    },
    {
      label: "Accent Contrast",
      cssVar: "--color-accent-contrast",
      role: "text",
      source: "accent-contrast",
      framework: "radix",
      description: "Readable text/icon color placed on the accent swatch.",
    },
    {
      label: "Focus",
      cssVar: "--color-focus",
      role: "accent",
      source: "accent",
      framework: "radix",
      description: "Keyboard focus highlight and strong outline state.",
    },
    {
      label: "Icon",
      cssVar: "--color-icon",
      role: "icon",
      source: "text",
      framework: "radix",
      description: "Default icon and glyph tint.",
    },
  ],
}

export const COLOR_TEMPLATE_KITS: Array<{
  id: TemplateKitId
  label: string
  description: string
  framework?: ColorCanvasFrameworkId
}> = [
  {
    id: "starter",
    label: "Starter Ramp",
    description: "Brand seed, accent seed, surface/text rules, and semantic roles.",
  },
  {
    id: "shadcn",
    label: "shadcn/ui",
    description: "Starter ramp plus functional aliases like background, foreground, primary, border, and ring.",
    framework: "shadcn",
  },
  {
    id: "radix",
    label: "Radix Themes",
    description: "Starter ramp plus functional Radix-style background, panel, accent, text, and border aliases.",
    framework: "radix",
  },
]

export const DEFAULT_TEMPLATE_SEEDS: Record<TemplateSeedKind, TemplateSeedOklch> = {
  brand: { l: 0.62, c: 0.19, h: 255 },
  accent: { l: 0.68, c: 0.18, h: 315 },
}

export const TEMPLATE_PREVIEW_BASE_COUNTS = {
  baseColors: 13,
  accentColors: 3,
  semanticRoles: 5,
}

export const COLOR_NODE_PORT_META: Record<
  ColorNodePortId,
  {
    kind: ColorNodePortKind
    direction: "in" | "out"
    label: string
    color: string
  }
> = {
  "dependency-in": {
    kind: "dependency",
    direction: "in",
    label: "Dependency input",
    color: "#94a3b8",
  },
  "dependency-out": {
    kind: "dependency",
    direction: "out",
    label: "Dependency output",
    color: "#94a3b8",
  },
  "map-in": {
    kind: "map",
    direction: "in",
    label: "Map input",
    color: "#818cf8",
  },
  "map-out": {
    kind: "map",
    direction: "out",
    label: "Map output",
    color: "#818cf8",
  },
  "contrast-in": {
    kind: "contrast",
    direction: "in",
    label: "Contrast input",
    color: "#f97316",
  },
  "contrast-out": {
    kind: "contrast",
    direction: "out",
    label: "Contrast output",
    color: "#f97316",
  },
}

export const DEFAULT_CONTRAST_RULES: ContrastRule[] = [
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

export const DEFAULT_RELATIVE_SPEC = {
  model: DEFAULT_COLOR_MODEL,
  lMode: "inherit",
  cMode: "inherit",
  hMode: "inherit",
  alphaMode: "inherit",
} as const

export const FOUNDATION_ROLE_BLUEPRINTS: Array<{
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

export const CANVAS_MODE_OPTIONS: Array<{ id: CanvasMode; label: string; description: string }> = [
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

export const COLOR_AUDIT_FOCUS_OPTIONS: Array<{
  id: ColorAuditFocusMode
  label: string
  description: string
}> = [
  {
    id: "review",
    label: "Review",
    description: "Browse tokens, roles, and edges with sensible defaults for audit.",
  },
  {
    id: "build",
    label: "Build graph",
    description: "Token → role mapping focus with connection tools ready.",
  },
  {
    id: "contrast",
    label: "Contrast audit",
    description: "Contrast-only focus for APCA review.",
  },
]

export const COLOR_AUDIT_LAYOUT_OPTIONS: Array<{
  id: ColorAuditLayoutMode
  label: string
  description: string
}> = [
  {
    id: "freeform",
    label: "Freeform",
    description: "Keep the current manual placement.",
  },
  {
    id: "flow",
    label: "Flow lanes",
    description: "Arrange inputs, functional aliases, semantic roles, and components left to right.",
  },
  {
    id: "center",
    label: "Center cluster",
    description: "Keep seed colors in the middle and place framework aliases, roles, and consumers around them.",
  },
  {
    id: "roles",
    label: "Role lanes",
    description: "Group nodes by surface/text/border/accent/icon families.",
  },
]

export const COLOR_AUDIT_LANE_META: Record<
  Exclude<ColorAuditLayoutMode, "freeform">,
  Record<string, { label: string; description: string }>
> = {
  flow: {
    inputs: {
      label: "Inputs",
      description: "Theme tokens and relative sources that feed the graph.",
    },
    functional: {
      label: "Functional Tokens",
      description: "Framework-style tokens such as background, foreground, border, and primary.",
    },
    roles: {
      label: "Roles",
      description: "Semantic color roles that drive UI meaning and contrast rules.",
    },
    components: {
      label: "Components",
      description: "UI examples that consume semantic roles.",
    },
  },
  center: {
    inputs: {
      label: "Seed hub",
      description: "Brand, accent, and derived palette sources stay in the middle of the system.",
    },
    functional: {
      label: "Framework tokens",
      description: "Framework aliases orbit the hub so adapter tokens are easier to isolate.",
    },
    roles: {
      label: "Semantic roles",
      description: "Semantic UI roles stay opposite the framework aliases for mapping review.",
    },
    components: {
      label: "Consumers",
      description: "UI examples remain downstream from the semantic layer.",
    },
  },
  roles: {
    brand: {
      label: "Brand",
      description: "Brand and seed colors that anchor the palette.",
    },
    surface: {
      label: "Surface",
      description: "Background and surface tokens used behind content.",
    },
    text: {
      label: "Text",
      description: "Foreground and readable text roles.",
    },
    border: {
      label: "Border",
      description: "Divider and outline tokens.",
    },
    accent: {
      label: "Accent",
      description: "Interactive or emphasis colors.",
    },
    icon: {
      label: "Icon",
      description: "Icon and glyph-related tokens or roles.",
    },
    other: {
      label: "Other",
      description: "Ungrouped colors and utility nodes.",
    },
    components: {
      label: "Components",
      description: "UI examples that reference the color system.",
    },
  },
}

export const DESIGN_SYSTEM_PRESETS: Array<{
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

export const CANVAS_VIEW_OPTIONS: Array<{ id: CanvasViewMode; label: string }> = [
  { id: "color", label: "Color" },
  { id: "system", label: "System" },
  { id: "colors", label: "Colors" },
  { id: "type", label: "Type" },
  { id: "layout", label: "Layout" },
  { id: "primitives", label: "Primitives" },
  { id: "standards", label: "Standards" },
  { id: "all", label: "All" },
]

export const SYSTEM_SECTION_ORDER: SystemSectionId[] = [
  "colors",
  "type",
  "layout",
  "primitives",
  "standards",
]

export const SYSTEM_SECTION_META: Record<SystemSectionId, { label: string; description: string }> = {
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

export function getPreviewNodeSize(
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

export function getCanvasNodeGroup(node: ColorCanvasNode) {
  return node.group ?? "color"
}

export function isSystemColorNode(node: ColorCanvasNode) {
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

export function isRelationshipCanvasMode(mode: CanvasViewMode) {
  return mode === "color" || mode === "all"
}

export function getCanvasModeLabel(mode: CanvasMode) {
  return mode === "color-audit" ? "Color Audit" : "System Canvas"
}

export function getFrameworkLabel(framework?: ColorCanvasFrameworkId) {
  if (framework === "shadcn") return "shadcn/ui"
  if (framework === "radix") return "Radix"
  return null
}

export function stripFrameworkPrefix(label: string, framework?: ColorCanvasFrameworkId) {
  const frameworkLabel = getFrameworkLabel(framework)
  if (!frameworkLabel) return label
  const prefix = `${frameworkLabel} / `
  return label.startsWith(prefix) ? label.slice(prefix.length) : label
}

export function getDisplayNodeLabelFromNode(
  node?: Pick<ColorCanvasNode, "label" | "framework"> | null
) {
  if (!node) return "Unknown"
  return stripFrameworkPrefix(node.label, node.framework)
}

export function formatFunctionalTokenLabel(preset: FunctionalTokenPreset) {
  return stripFrameworkPrefix(preset.label, preset.framework)
}

export function isFunctionalTokenNode(node: ColorCanvasNode) {
  return node.type === "semantic" && (node.semanticKind === "functional" || Boolean(node.framework))
}

export function getNodeFamilyLabel(node: ColorCanvasNode, variant: "badge" | "full" = "full") {
  if (node.preview) return node.preview.badge || "Preview"
  if (node.group === "system-support") return "System support"
  if (node.type === "relative") return variant === "badge" ? "Relative rule" : "Relative rule"
  if (isFunctionalTokenNode(node)) {
    const frameworkLabel = getFrameworkLabel(node.framework)
    if (frameworkLabel) {
      return variant === "badge" ? `Functional · ${frameworkLabel}` : `Functional alias · ${frameworkLabel}`
    }
    return variant === "badge" ? "Functional" : "Functional alias"
  }
  if (node.type === "semantic") return "Semantic role"
  if (node.type === "component") return "Component example"
  return "Palette input"
}

export function getNodeFamilyBadgeClass(node: ColorCanvasNode) {
  if (node.type === "relative") return "bg-amber-100 text-amber-700"
  if (isFunctionalTokenNode(node)) return "bg-violet-100 text-violet-700"
  if (node.type === "semantic") return "bg-indigo-100 text-indigo-700"
  if (node.group === "system-support") return "bg-white/80 text-muted-foreground"
  return "bg-slate-100 text-slate-700"
}

export function slugifyTokenLabel(label: string) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function toCamelCaseTokenKey(value: string) {
  return value
    .replace(/^-+/, "")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part, index) =>
      index === 0 ? part.toLowerCase() : `${part.slice(0, 1).toUpperCase()}${part.slice(1).toLowerCase()}`
    )
    .join("")
}

export function assignNestedToken(
  target: Record<string, unknown>,
  path: string[],
  value: unknown
) {
  let cursor: Record<string, unknown> = target
  path.forEach((segment, index) => {
    if (index === path.length - 1) {
      cursor[segment] = value
      return
    }
    const next = cursor[segment]
    if (!next || typeof next !== "object" || Array.isArray(next)) {
      cursor[segment] = {}
    }
    cursor = cursor[segment] as Record<string, unknown>
  })
}

export function formatOklchCssValue(color: { l: number; c: number; h: number; a?: number }) {
  const lightness = Number((color.l * 100).toFixed(1))
  const chroma = Number(color.c.toFixed(3))
  const hue = Number(color.h.toFixed(1))
  const alpha = color.a ?? 1
  if (alpha >= 1) return `oklch(${lightness}% ${chroma} ${hue})`
  return `oklch(${lightness}% ${chroma} ${hue} / ${Number(alpha.toFixed(3))})`
}

export function inferContrastIntent(node: ColorCanvasNode): "foreground" | "background" | "both" {
  if (node.role === "text" || node.role === "icon" || node.role === "border") return "foreground"
  if (node.role === "surface") return "background"
  if (node.role === "accent") return "both"

  const haystack = `${node.label} ${node.cssVar ?? ""}`.toLowerCase()
  if (
    haystack.includes("text") ||
    haystack.includes("foreground") ||
    haystack.includes("border") ||
    haystack.includes("icon")
  ) {
    return "foreground"
  }
  if (
    haystack.includes("surface") ||
    haystack.includes("background") ||
    haystack.includes("canvas") ||
    haystack.includes("brand") ||
    haystack.includes("accent")
  ) {
    return "background"
  }
  return "both"
}

export function deriveTemplateSeedOklch(value: string, fallback: TemplateSeedOklch) {
  const trimmed = value.trim()
  if (!trimmed) return fallback

  const parsedOklch = parseOklch(trimmed)
  if (parsedOklch) {
    return { l: parsedOklch.l, c: parsedOklch.c, h: parsedOklch.h }
  }

  const parsedP3 = trimmed.startsWith("color(display-p3") ? parseDisplayP3(trimmed) : null
  const parsedColor = parsedP3 ? displayP3ToSrgb(parsedP3) : parseColor(trimmed)
  if (!parsedColor) return fallback
  return srgbToOklch(parsedColor) ?? fallback
}

export function formatTemplateSeedOklch(seed: TemplateSeedOklch) {
  const lightness = Number((clampValue(seed.l, 0, 1) * 100).toFixed(1))
  const chroma = Number(Math.max(0, seed.c).toFixed(3))
  const hue = Number(wrapDegrees(seed.h).toFixed(1))
  return `oklch(${lightness}% ${chroma} ${hue})`
}

export function inferColorAuditRoleLane(node: ColorCanvasNode) {
  if (node.type === "component") return "components"
  if (isFunctionalTokenNode(node)) return node.role ?? "other"
  if (node.role) return node.role
  const haystack = `${node.label} ${node.cssVar ?? ""}`.toLowerCase()
  if (haystack.includes("brand")) return "brand"
  if (haystack.includes("surface")) return "surface"
  if (haystack.includes("text") || haystack.includes("foreground")) return "text"
  if (haystack.includes("border")) return "border"
  if (haystack.includes("accent")) return "accent"
  if (haystack.includes("icon")) return "icon"
  return "other"
}

export function getColorAuditStructuredLaneId(
  node: ColorCanvasNode,
  mode: Extract<ColorAuditLayoutMode, "flow" | "center">
) {
  if (mode !== "flow" && mode !== "center") return "inputs"
  if (node.type === "component") return "components"
  if (isFunctionalTokenNode(node)) return "functional"
  if (node.type === "semantic") return "roles"
  return "inputs"
}

export function getTemplateKitPreview(kit: (typeof COLOR_TEMPLATE_KITS)[number], includeAccent: boolean) {
  const colorNodes =
    TEMPLATE_PREVIEW_BASE_COUNTS.baseColors +
    (includeAccent ? TEMPLATE_PREVIEW_BASE_COUNTS.accentColors : 0)
  const functionalTokens = kit.framework ? FUNCTIONAL_TOKEN_PRESETS[kit.framework].length : 0
  const semanticRoles = TEMPLATE_PREVIEW_BASE_COUNTS.semanticRoles

  return {
    colorNodes,
    functionalTokens,
    semanticRoles,
    totalNodes: colorNodes + functionalTokens + semanticRoles,
  }
}

export function buildTemplateCatalogSection(
  kit: (typeof COLOR_TEMPLATE_KITS)[number]
): NodeCatalogSection {
  const sectionId = `template-${kit.id}`
  const brandSeed = { ...DEFAULT_TEMPLATE_SEEDS.brand, a: 1 }
  const accentSeed = { ...DEFAULT_TEMPLATE_SEEDS.accent, a: 1 }
  const brandSeedValue = formatTemplateSeedOklch(DEFAULT_TEMPLATE_SEEDS.brand)
  const accentSeedValue = formatTemplateSeedOklch(DEFAULT_TEMPLATE_SEEDS.accent)

  const makeRelativeNode = (config: {
    slug: string
    label: string
    cssVar: string
    role?: ColorCanvasNode["role"]
    baseId: string
    baseColor: OklchColor
    relative: RelativeColorSpec
  }): ColorCanvasNode => ({
    id: `${sectionId}-${config.slug}`,
    type: "relative",
    label: config.label,
    cssVar: config.cssVar,
    role: config.role,
    value: formatOklchCssValue(resolveRelativeOklch(config.baseColor, config.relative)),
    relative: {
      ...config.relative,
      baseId: config.baseId,
    },
    position: { x: 0, y: 0 },
  })

  const brandSeedNode: ColorCanvasNode = {
    id: `${sectionId}-brand-seed`,
    type: "token",
    label: "Brand Seed",
    cssVar: "--color-brand-500",
    value: brandSeedValue,
    position: { x: 0, y: 0 },
  }

  const accentSeedNode: ColorCanvasNode = {
    id: `${sectionId}-accent-seed`,
    type: "token",
    label: "Accent Seed",
    cssVar: "--color-accent-500",
    value: accentSeedValue,
    position: { x: 0, y: 0 },
  }

  const relativeNodes = [
    makeRelativeNode({
      slug: "brand-300",
      label: "Brand / 300",
      cssVar: "--color-brand-300",
      baseId: brandSeedNode.id,
      baseColor: brandSeed,
      relative: {
        model: DEFAULT_COLOR_MODEL,
        lMode: "delta",
        lValue: 16,
        cMode: "delta",
        cValue: -4,
        hMode: "inherit",
        alphaMode: "inherit",
      },
    }),
    makeRelativeNode({
      slug: "brand-400",
      label: "Brand / 400",
      cssVar: "--color-brand-400",
      baseId: brandSeedNode.id,
      baseColor: brandSeed,
      relative: {
        model: DEFAULT_COLOR_MODEL,
        lMode: "delta",
        lValue: 8,
        cMode: "delta",
        cValue: -2,
        hMode: "inherit",
        alphaMode: "inherit",
      },
    }),
    makeRelativeNode({
      slug: "brand-600",
      label: "Brand / 600",
      cssVar: "--color-brand-600",
      baseId: brandSeedNode.id,
      baseColor: brandSeed,
      relative: {
        model: DEFAULT_COLOR_MODEL,
        lMode: "delta",
        lValue: -6,
        cMode: "delta",
        cValue: -3,
        hMode: "inherit",
        alphaMode: "inherit",
      },
    }),
    makeRelativeNode({
      slug: "brand-700",
      label: "Brand / 700",
      cssVar: "--color-brand-700",
      baseId: brandSeedNode.id,
      baseColor: brandSeed,
      relative: {
        model: DEFAULT_COLOR_MODEL,
        lMode: "delta",
        lValue: -12,
        cMode: "delta",
        cValue: -5,
        hMode: "inherit",
        alphaMode: "inherit",
      },
    }),
    makeRelativeNode({
      slug: "surface-base",
      label: "Surface / Base",
      cssVar: "--color-surface-50",
      role: "surface",
      baseId: brandSeedNode.id,
      baseColor: brandSeed,
      relative: {
        model: DEFAULT_COLOR_MODEL,
        lMode: "absolute",
        lValue: 98,
        cMode: "absolute",
        cValue: 2,
        hMode: "inherit",
        alphaMode: "inherit",
      },
    }),
    makeRelativeNode({
      slug: "surface-elevated",
      label: "Surface / Elevated",
      cssVar: "--color-surface-100",
      role: "surface",
      baseId: brandSeedNode.id,
      baseColor: brandSeed,
      relative: {
        model: DEFAULT_COLOR_MODEL,
        lMode: "absolute",
        lValue: 96,
        cMode: "absolute",
        cValue: 3,
        hMode: "inherit",
        alphaMode: "inherit",
      },
    }),
    makeRelativeNode({
      slug: "surface-muted",
      label: "Surface / Muted",
      cssVar: "--color-surface-200",
      role: "surface",
      baseId: brandSeedNode.id,
      baseColor: brandSeed,
      relative: {
        model: DEFAULT_COLOR_MODEL,
        lMode: "absolute",
        lValue: 92,
        cMode: "absolute",
        cValue: 4,
        hMode: "inherit",
        alphaMode: "inherit",
      },
    }),
    makeRelativeNode({
      slug: "text-primary",
      label: "Text / Primary",
      cssVar: "--color-foreground",
      role: "text",
      baseId: brandSeedNode.id,
      baseColor: brandSeed,
      relative: {
        model: DEFAULT_COLOR_MODEL,
        lMode: "absolute",
        lValue: 20,
        cMode: "absolute",
        cValue: 0,
        hMode: "inherit",
        alphaMode: "inherit",
      },
    }),
    makeRelativeNode({
      slug: "text-secondary",
      label: "Text / Secondary",
      cssVar: "--color-muted-foreground",
      role: "text",
      baseId: brandSeedNode.id,
      baseColor: brandSeed,
      relative: {
        model: DEFAULT_COLOR_MODEL,
        lMode: "absolute",
        lValue: 40,
        cMode: "absolute",
        cValue: 0,
        hMode: "inherit",
        alphaMode: "inherit",
      },
    }),
    makeRelativeNode({
      slug: "text-inverse",
      label: "Text / Inverse",
      cssVar: "--color-foreground-inverse",
      role: "text",
      baseId: brandSeedNode.id,
      baseColor: brandSeed,
      relative: {
        model: DEFAULT_COLOR_MODEL,
        lMode: "absolute",
        lValue: 99,
        cMode: "absolute",
        cValue: 1,
        hMode: "inherit",
        alphaMode: "inherit",
      },
    }),
    makeRelativeNode({
      slug: "border-default",
      label: "Border / Default",
      cssVar: "--color-border-default",
      role: "border",
      baseId: brandSeedNode.id,
      baseColor: brandSeed,
      relative: {
        model: DEFAULT_COLOR_MODEL,
        lMode: "absolute",
        lValue: 82,
        cMode: "absolute",
        cValue: 1,
        hMode: "inherit",
        alphaMode: "absolute",
        alphaValue: 60,
      },
    }),
    makeRelativeNode({
      slug: "accent-primary",
      label: "Accent / Primary",
      cssVar: "--color-accent-primary",
      role: "accent",
      baseId: accentSeedNode.id,
      baseColor: accentSeed,
      relative: {
        model: DEFAULT_COLOR_MODEL,
        lMode: "inherit",
        cMode: "inherit",
        hMode: "inherit",
        alphaMode: "inherit",
      },
    }),
  ]

  const findValue = (cssVar: string) =>
    relativeNodes.find((node) => node.cssVar === cssVar)?.value || null

  const sourceValues: Record<FunctionalTokenSourceId, string> = {
    surface: findValue("--color-surface-50") || brandSeedValue,
    "surface-muted": findValue("--color-surface-200") || brandSeedValue,
    text: findValue("--color-foreground") || brandSeedValue,
    "text-muted": findValue("--color-muted-foreground") || brandSeedValue,
    border: findValue("--color-border-default") || brandSeedValue,
    accent: findValue("--color-accent-primary") || accentSeedValue,
    "accent-contrast": findValue("--color-foreground-inverse") || accentSeedValue,
  }

  const frameworkNodes = kit.framework
    ? FUNCTIONAL_TOKEN_PRESETS[kit.framework].map((preset) => ({
        id: `${sectionId}-${slugifyTokenLabel(`${kit.framework}-${preset.label}`)}`,
        type: "semantic" as const,
        label: formatFunctionalTokenLabel(preset),
        cssVar: preset.cssVar,
        role: preset.role,
        framework: preset.framework,
        semanticKind: "functional" as const,
        value: sourceValues[preset.source],
        position: { x: 0, y: 0 },
      }))
    : []

  const roleValue = (fallbackCssVar: string, frameworkCssVar?: string) =>
    frameworkCssVar
      ? frameworkNodes.find((node) => node.cssVar === frameworkCssVar)?.value || findValue(fallbackCssVar)
      : findValue(fallbackCssVar)

  const semanticNodes: ColorCanvasNode[] = [
    {
      id: `${sectionId}-semantic-text`,
      type: "semantic",
      label: "Text / Foreground",
      role: "text",
      semanticKind: "role",
      value: roleValue("--color-foreground", kit.framework === "shadcn" ? "--foreground" : kit.framework === "radix" ? "--color-text" : undefined) || brandSeedValue,
      position: { x: 0, y: 0 },
    },
    {
      id: `${sectionId}-semantic-surface`,
      type: "semantic",
      label: "Surface / Base",
      role: "surface",
      semanticKind: "role",
      value: roleValue("--color-surface-50", kit.framework === "shadcn" ? "--background" : kit.framework === "radix" ? "--color-background" : undefined) || brandSeedValue,
      position: { x: 0, y: 0 },
    },
    {
      id: `${sectionId}-semantic-border`,
      type: "semantic",
      label: "Border / Default",
      role: "border",
      semanticKind: "role",
      value: roleValue("--color-border-default", kit.framework === "shadcn" ? "--border" : kit.framework === "radix" ? "--color-border" : undefined) || brandSeedValue,
      position: { x: 0, y: 0 },
    },
    {
      id: `${sectionId}-semantic-accent`,
      type: "semantic",
      label: "Accent / Primary",
      role: "accent",
      semanticKind: "role",
      value: roleValue("--color-accent-primary", kit.framework === "shadcn" ? "--primary" : kit.framework === "radix" ? "--color-accent" : undefined) || accentSeedValue,
      position: { x: 0, y: 0 },
    },
    {
      id: `${sectionId}-semantic-icon`,
      type: "semantic",
      label: "Icon / Default",
      role: "icon",
      semanticKind: "role",
      value: roleValue("--color-foreground", kit.framework === "radix" ? "--color-icon" : undefined) || brandSeedValue,
      position: { x: 0, y: 0 },
    },
  ]

  return {
    id: sectionId,
    mode: "color-audit",
    label: `Template / ${kit.label}`,
    description: kit.description,
    nodes: [brandSeedNode, accentSeedNode, ...relativeNodes, ...frameworkNodes, ...semanticNodes],
  }
}

export function buildColorAuditManualCatalogSection(): NodeCatalogSection {
  const brandSeed = { ...DEFAULT_TEMPLATE_SEEDS.brand, a: 1 }
  const brandSeedId = "catalog-manual-brand-seed"
  return {
    id: "color-audit-manual",
    mode: "color-audit",
    label: "Color Audit / Manual nodes",
    description: "Nodes you can add by hand before mapping into functional aliases and semantic roles.",
    nodes: [
      {
        id: brandSeedId,
        type: "token",
        label: "Brand Seed",
        cssVar: "--color-brand-500",
        value: formatTemplateSeedOklch(DEFAULT_TEMPLATE_SEEDS.brand),
        position: { x: 0, y: 0 },
      },
      {
        id: "catalog-manual-accent-seed",
        type: "token",
        label: "Accent Seed",
        cssVar: "--color-accent-500",
        value: formatTemplateSeedOklch(DEFAULT_TEMPLATE_SEEDS.accent),
        position: { x: 0, y: 0 },
      },
      {
        id: "catalog-manual-custom-token",
        type: "token",
        label: "Custom Token",
        cssVar: "--color-custom-token",
        value: "#5b7fff",
        position: { x: 0, y: 0 },
      },
      {
        id: "catalog-manual-relative",
        type: "relative",
        label: "Relative Token",
        cssVar: "--color-relative-token",
        value: formatOklchCssValue(
          resolveRelativeOklch(brandSeed, {
            model: DEFAULT_COLOR_MODEL,
            baseId: brandSeedId,
            lMode: "delta",
            lValue: 8,
            cMode: "delta",
            cValue: -2,
            hMode: "inherit",
            alphaMode: "inherit",
          })
        ),
        relative: {
          model: DEFAULT_COLOR_MODEL,
          baseId: brandSeedId,
          lMode: "delta",
          lValue: 8,
          cMode: "delta",
          cValue: -2,
          hMode: "inherit",
          alphaMode: "inherit",
        },
        position: { x: 0, y: 0 },
      },
      {
        id: "catalog-manual-functional-alias",
        type: "semantic",
        label: "Functional Alias",
        cssVar: "--color-functional-alias",
        semanticKind: "functional",
        value: formatTemplateSeedOklch(DEFAULT_TEMPLATE_SEEDS.brand),
        position: { x: 0, y: 0 },
      },
      {
        id: "catalog-manual-semantic-role",
        type: "semantic",
        label: "Text / Foreground",
        role: "text",
        semanticKind: "role",
        value: "oklch(20% 0 255)",
        position: { x: 0, y: 0 },
      },
    ],
  }
}

export function getCatalogPortIds(node: ColorCanvasNode): ColorNodePortId[] {
  if (node.preview) return []
  if (node.group === "system-support") {
    if (node.type === "token") return ["dependency-out", "map-out"]
    if (node.type === "relative") return ["dependency-in", "map-out"]
    if (node.type === "semantic") return ["map-in", "map-out"]
  }
  if (node.type === "token") return ["map-out"]
  if (node.type === "relative") return ["dependency-in", "map-out", "contrast-in", "contrast-out"]
  if (node.type === "semantic") return ["map-in", "map-out", "contrast-in", "contrast-out"]
  if (node.type === "component") return ["map-in"]
  return []
}

export function getCatalogFrameMetrics(size: { width: number; height: number }) {
  const inset = 12
  return {
    inset,
    width: size.width + inset * 2,
    height: size.height + inset * 2,
  }
}

export function clampPortInset(size: { width: number; height: number }, desired: number, axis: "x" | "y") {
  const length = axis === "x" ? size.width : size.height
  return Math.max(26, Math.min(length - 26, desired))
}

export function getColorNodePortOffset(size: { width: number; height: number }, portId: ColorNodePortId) {
  const mapY = clampPortInset(size, Math.max(42, size.height * 0.5), "y")
  const dependencyInX = clampPortInset(size, 34, "x")
  const dependencyOutX = clampPortInset(size, size.width - 34, "x")
  const contrastInX = clampPortInset(size, 34, "x")
  const contrastOutX = clampPortInset(size, size.width - 34, "x")
  switch (portId) {
    case "map-in":
      return { x: 0, y: mapY }
    case "map-out":
      return { x: size.width, y: mapY }
    case "dependency-in":
      return { x: dependencyInX, y: 0 }
    case "dependency-out":
      return { x: dependencyOutX, y: 0 }
    case "contrast-in":
      return { x: contrastInX, y: size.height }
    case "contrast-out":
      return { x: contrastOutX, y: size.height }
    default:
      return { x: size.width / 2, y: size.height / 2 }
  }
}

export function buildPolylinePath(points: Array<{ x: number; y: number }>) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ")
}

export function getColorNodePortPosition(
  node: ColorCanvasNode,
  size: { width: number; height: number },
  portId: ColorNodePortId
) {
  const offset = getColorNodePortOffset(size, portId)
  return {
    x: node.position.x + offset.x,
    y: node.position.y + offset.y,
  }
}

export function getEdgePortIds(kind: ColorNodePortKind) {
  switch (kind) {
    case "dependency":
      return {
        source: "dependency-out" as const,
        target: "dependency-in" as const,
      }
    case "contrast":
      return {
        source: "contrast-out" as const,
        target: "contrast-in" as const,
      }
    case "map":
    default:
      return {
        source: "map-out" as const,
        target: "map-in" as const,
      }
  }
}

export function buildColorConnectionPath(
  source: { x: number; y: number },
  target: { x: number; y: number },
  kind: ColorNodePortKind
) {
  if (kind === "dependency") {
    const stub = 16
    const lift = Math.max(28, Math.abs(target.y - source.y) * 0.24 + 28)
    const viaY = Math.min(source.y, target.y) - lift
    const points = [
      source,
      { x: source.x, y: source.y - stub },
      { x: source.x, y: viaY },
      { x: target.x, y: viaY },
      { x: target.x, y: target.y - stub },
      target,
    ]
    return {
      path: buildPolylinePath(points),
      badgeX: (source.x + target.x) / 2,
      badgeY: viaY - 10,
      midPoint: {
        x: (source.x + target.x) / 2,
        y: viaY,
      },
      controlPoints: points.slice(1, -1),
    }
  }

  if (kind === "contrast") {
    const stub = 16
    const drop = Math.max(28, Math.abs(target.y - source.y) * 0.24 + 28)
    const viaY = Math.max(source.y, target.y) + drop
    const points = [
      source,
      { x: source.x, y: source.y + stub },
      { x: source.x, y: viaY },
      { x: target.x, y: viaY },
      { x: target.x, y: target.y + stub },
      target,
    ]
    return {
      path: buildPolylinePath(points),
      badgeX: (source.x + target.x) / 2,
      badgeY: viaY + 10,
      midPoint: {
        x: (source.x + target.x) / 2,
        y: viaY,
      },
      controlPoints: points.slice(1, -1),
    }
  }

  const direction = target.x >= source.x ? 1 : -1
  const stub = 18 * direction
  const midX = source.x + (target.x - source.x) / 2
  const points = [
    source,
    { x: source.x + stub, y: source.y },
    { x: midX, y: source.y },
    { x: midX, y: target.y },
    { x: target.x - stub, y: target.y },
    target,
  ]
  return {
    path: buildPolylinePath(points),
    badgeX: midX,
    badgeY: (source.y + target.y) / 2,
    midPoint: {
      x: midX,
      y: (source.y + target.y) / 2,
    },
    controlPoints: points.slice(1, -1),
  }
}

export function getPortIdsForConnectMode(node: ColorCanvasNode, mode: ConnectMode): ColorNodePortId[] {
  if (mode === "map") {
    if (node.type === "component") return ["map-in"]
    if (node.type === "semantic") return ["map-in", "map-out"]
    return ["map-out"]
  }

  if (mode === "contrast") {
    if (node.type === "component") return []
    return ["contrast-in", "contrast-out"]
  }

  return []
}

export function buildColorAuditLayout(
  nodes: ColorCanvasNode[],
  getNodeSize: (node: ColorCanvasNode) => { width: number; height: number },
  mode: Exclude<ColorAuditLayoutMode, "freeform">,
  viewportWidth: number
) {
  const positions: Record<string, { x: number; y: number }> = {}
  const itemGapY = 18
  const itemGapX = 26
  const startX = 48
  const startY = 52
  const lanes =
    mode === "flow" || mode === "center"
      ? ["inputs", "functional", "roles", "components"]
      : ["brand", "surface", "text", "border", "accent", "icon", "other", "components"]
  const columns =
    mode === "flow"
      ? 4
      : mode === "center"
        ? 1
      : Math.max(2, Math.min(3, Math.floor(Math.max(viewportWidth, 960) / 360)))

  const grouped = lanes.reduce<Record<string, ColorCanvasNode[]>>((acc, lane) => {
    acc[lane] = []
    return acc
  }, {})

  nodes.forEach((node) => {
    const lane =
      mode === "flow" || mode === "center"
        ? getColorAuditStructuredLaneId(node, mode)
        : inferColorAuditRoleLane(node)
    const safeLane = grouped[lane] ? lane : "other"
    grouped[safeLane].push(node)
  })

  if (mode === "center") {
    const canvasWidth = Math.max(viewportWidth, 1280)
    const centerX = canvasWidth / 2
    const clusterAnchors: Record<string, { x: number; y: number; columns: number }> = {
      inputs: { x: centerX - 180, y: 140, columns: 2 },
      functional: { x: centerX - 580, y: 320, columns: 2 },
      roles: { x: centerX + 180, y: 320, columns: 2 },
      components: { x: centerX - 180, y: 620, columns: 3 },
    }

    lanes.forEach((lane) => {
      const laneNodes = grouped[lane]
        .slice()
        .sort((left, right) => left.label.localeCompare(right.label))
      const anchor = clusterAnchors[lane] ?? { x: startX, y: startY, columns: 2 }
      const columnCount = Math.max(1, anchor.columns)

      laneNodes.forEach((node, index) => {
        const size = getNodeSize(node)
        const column = index % columnCount
        const row = Math.floor(index / columnCount)
        positions[node.id] = {
          x: anchor.x + column * (260 + itemGapX),
          y: anchor.y + row * (size.height + itemGapY),
        }
      })
    })

    return positions
  }

  lanes.forEach((lane, index) => {
    const laneNodes = grouped[lane]
      .slice()
      .sort((left, right) => left.label.localeCompare(right.label))
    const column = index % columns
    const row = Math.floor(index / columns)
    let cursorY = startY + row * 360
    const cursorX = startX + column * 320

    laneNodes.forEach((node) => {
      const size = getNodeSize(node)
      positions[node.id] = {
        x: cursorX,
        y: cursorY,
      }
      cursorY += size.height + itemGapY
    })
  })

  return positions
}

export function getPreviewCategory(
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

export function getSystemSectionId(node: ColorCanvasNode): SystemSectionId {
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

export function getSystemSectionNodeSortWeight(node: ColorCanvasNode) {
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

export function getDefaultNodeSize(node: ColorCanvasNode) {
  if (node.group === "system-support") {
    return { width: 260, height: 104 }
  }

  if (!node.preview) {
    return DEFAULT_NODE_SIZES[node.type]
  }

  return getPreviewNodeSize(node.preview.kind)
}

export function getFitWidthNodeSize(node: ColorCanvasNode) {
  if (node.group === "system-support") {
    return { width: 280, height: 108 }
  }

  if (!node.preview) {
    return getDefaultNodeSize(node)
  }

  return getPreviewNodeSize(node.preview.kind, "fit-width")
}

export function resolveLayoutColumns(baseColumns: number | undefined, viewportPx: number) {
  const desiredColumns = baseColumns ?? 2
  if (viewportPx <= 540) return 1
  if (viewportPx <= 960) return Math.min(2, desiredColumns)
  return desiredColumns
}

export function buildViewportSamples(config: DesignSystemScaleConfig) {
  const midpoint = Math.round((config.minViewportPx + config.maxViewportPx) / 2)
  return [
    { label: "Min", viewportPx: config.minViewportPx },
    { label: "Mid", viewportPx: midpoint },
    { label: "Max", viewportPx: config.maxViewportPx },
  ]
}

export function isNodeVisibleInCanvasView(node: ColorCanvasNode, mode: CanvasViewMode) {
  if (mode === "all") return true
  const group = getCanvasNodeGroup(node)
  if (mode === "color") return group === "color"
  if (mode === "colors") return isSystemColorNode(node) || node.preview?.sectionId === "colors"
  if (mode === "system") return group === "system-support" || group === "system-preview"
  return getPreviewCategory(node.preview) === mode
}

export function getPreviewSortWeight(node: ColorCanvasNode) {
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

export function formatPreviewKindLabel(kind: ColorCanvasPreviewKind) {
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

export function matchesDesignSystemConfig(
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

export function getNodeMinSize(node: ColorCanvasNode) {
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

export function buildSystemFlowLayout(
  nodes: ColorCanvasNode[],
  getNodeSize: (node: ColorCanvasNode) => { width: number; height: number },
  viewportWidth = 1440
) {
  const positions: Record<string, { x: number; y: number }> = {}
  const sections: CanvasSectionFrame[] = []
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

