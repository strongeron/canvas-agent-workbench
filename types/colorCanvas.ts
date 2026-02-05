export type ColorCanvasNodeType = "token" | "semantic" | "component" | "relative"
export type ColorCanvasEdgeType = "map" | "contrast"
export type ColorCanvasColorModel = "oklch" | "srgb"

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

export interface ColorCanvasNode {
  id: string
  type: ColorCanvasNodeType
  label: string
  position: { x: number; y: number }
  role?: "text" | "surface" | "border" | "icon" | "accent"
  cssVar?: string
  value?: string
  relative?: RelativeColorSpec
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
