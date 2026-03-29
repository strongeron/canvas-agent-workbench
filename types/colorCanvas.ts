export type ColorCanvasNodeType = "token" | "semantic" | "component" | "relative"
export type ColorCanvasEdgeType = "map" | "contrast"
export type ColorCanvasColorModel = "oklch" | "srgb"
export type ColorCanvasPreviewKind =
  | "connector-detail"
  | "font-family"
  | "type-scale"
  | "stroke-pair"
  | "icon-library"
  | "icon-scale"
  | "layout-stack"
  | "layout-grid"
  | "layout-split"
  | "token-standard"
  | "radix-theme"
  | "primitive-text"
  | "primitive-heading"
  | "primitive-button"
  | "primitive-surface"

export type RelativeChannelMode = "inherit" | "delta" | "absolute"

export interface RelativeColorSpec {
  baseId?: string
  model?: ColorCanvasColorModel
  lMode?: RelativeChannelMode
  lValue?: number
  cMode?: RelativeChannelMode
  cValue?: number
  hMode?: RelativeChannelMode
  hValue?: number
  alphaMode?: RelativeChannelMode
  alphaValue?: number
}

export interface ColorCanvasEdgeRule {
  model?: ColorCanvasColorModel
  targetLc?: number
  note?: string
}

export interface ColorCanvasNodePreview {
  kind: ColorCanvasPreviewKind
  sectionId?: "colors" | "type" | "layout" | "primitives" | "standards"
  title?: string
  description?: string
  cssVar?: string
  secondaryVar?: string
  fontFamilyVar?: string
  sampleText?: string
  note?: string
  badge?: string
  iconLibraryId?: string
  iconKeys?: string[]
  size?: "sm" | "md" | "lg"
  variant?: "primary" | "secondary" | "ghost" | "danger"
  gapVar?: string
  paddingVar?: string
  columns?: number
  tokens?: string[]
  code?: string
  codeLanguage?: "json" | "css" | "text"
  mappings?: Array<{ label: string; value: string }>
  scaleItems?: Array<{
    label: string
    cssVar?: string
    secondaryVar?: string
    fontFamilyVar?: string
    iconKey?: string
    sampleText?: string
    pairedLabel?: string
    minPx?: number
    currentPx?: number
    maxPx?: number
  }>
  viewportSamples?: Array<{
    label: string
    viewportPx: number
    fontPx?: number
    lineHeightPx?: number
    iconPx?: number
    gapPx?: number
    paddingPx?: number
    columns?: number
  }>
}

export interface ColorCanvasNode {
  id: string
  type: ColorCanvasNodeType
  label: string
  position: { x: number; y: number }
  size?: { width: number; height: number }
  group?: "color" | "system-support" | "system-preview"
  role?: "text" | "surface" | "border" | "icon" | "accent"
  cssVar?: string
  value?: string
  relative?: RelativeColorSpec
  preview?: ColorCanvasNodePreview
}

export interface ColorCanvasEdge {
  id: string
  sourceId: string
  targetId: string
  type: ColorCanvasEdgeType
  rule?: ColorCanvasEdgeRule
}

export interface ColorCanvasState {
  nodes: ColorCanvasNode[]
  edges: ColorCanvasEdge[]
  selectedNodeId?: string | null
  selectedEdgeId?: string | null
  edgeUndoStack: ColorCanvasEdge[]
}
