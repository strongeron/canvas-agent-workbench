import type { DesignSystemScaleConfig } from "../projects/design-system-foundation/designSystemApi"
import type { WorkspaceManifest, WorkspaceManifestStateSummary } from "../types/agentNative"
import type {
  ColorCanvasEdge,
  ColorCanvasNode,
  ColorCanvasNodePreview,
  ColorCanvasState,
} from "../types/colorCanvas"
import { buildWorkspaceManifest } from "./agentNativeManifest"

export interface SystemCanvasSectionResource {
  id: string
  label: string
  description: string
  nodeIds: string[]
  x: number
  y: number
  width: number
  height: number
}

export interface SystemCanvasNodeResource {
  id: string
  type: ColorCanvasNode["type"]
  label: string
  group?: ColorCanvasNode["group"]
  role?: ColorCanvasNode["role"]
  framework?: ColorCanvasNode["framework"]
  semanticKind?: ColorCanvasNode["semanticKind"]
  cssVar?: string
  value?: string
  position: { x: number; y: number }
  size?: { width: number; height: number }
  previewKind?: ColorCanvasNodePreview["kind"]
  previewSectionId?: ColorCanvasNodePreview["sectionId"]
  resolvedExpression?: string | null
  resolvedColor?: string | null
  isDisplayP3?: boolean
}

export interface SystemCanvasEdgeResource {
  id: string
  type: ColorCanvasEdge["type"]
  sourceId: string
  targetId: string
  sourceLabel: string
  targetLabel: string
  note?: string
}

export interface SystemCanvasRequirementResource {
  label: string
  count: number
  required: number
}

export interface SystemCanvasStateResource {
  surface: "system-canvas"
  workspaceKey: string
  rawState: ColorCanvasState
  stateSummary: WorkspaceManifestStateSummary
  selection: {
    selectedNodeId: string | null
    selectedEdgeId: string | null
  }
  viewMode: string
  scaleConfig: DesignSystemScaleConfig
  requirements: SystemCanvasRequirementResource[]
  sections: SystemCanvasSectionResource[]
  nodes: SystemCanvasNodeResource[]
  edges: SystemCanvasEdgeResource[]
}

export function buildSystemCanvasWorkspaceManifest(
  stateResource?: Pick<SystemCanvasStateResource, "stateSummary"> | null
): WorkspaceManifest | null {
  return buildWorkspaceManifest("system-canvas", stateResource?.stateSummary)
}

export function buildSystemCanvasWorkspaceStateResource(input: {
  workspaceKey: string
  rawState: ColorCanvasState
  stateSummary: WorkspaceManifestStateSummary
  selectedNodeId: string | null
  selectedEdgeId: string | null
  viewMode: string
  scaleConfig: DesignSystemScaleConfig
  requirements: SystemCanvasRequirementResource[]
  sections: SystemCanvasSectionResource[]
  nodes: SystemCanvasNodeResource[]
  edges: SystemCanvasEdgeResource[]
}): SystemCanvasStateResource {
  return {
    surface: "system-canvas",
    workspaceKey: input.workspaceKey,
    rawState: input.rawState,
    stateSummary: input.stateSummary,
    selection: {
      selectedNodeId: input.selectedNodeId,
      selectedEdgeId: input.selectedEdgeId,
    },
    viewMode: input.viewMode,
    scaleConfig: input.scaleConfig,
    requirements: input.requirements,
    sections: input.sections,
    nodes: input.nodes,
    edges: input.edges,
  }
}
