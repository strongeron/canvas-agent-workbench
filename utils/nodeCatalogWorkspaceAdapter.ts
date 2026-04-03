import type { WorkspaceManifest, WorkspaceManifestStateSummary } from "../types/agentNative"
import type { ColorCanvasNode } from "../types/colorCanvas"
import { buildWorkspaceManifest } from "./agentNativeManifest"

export interface NodeCatalogNodeResource {
  id: string
  label: string
  type: ColorCanvasNode["type"]
  role?: ColorCanvasNode["role"]
  framework?: ColorCanvasNode["framework"]
  semanticKind?: ColorCanvasNode["semanticKind"]
  group?: ColorCanvasNode["group"]
  previewKind?: string
}

export interface NodeCatalogNodeSectionResource {
  id: string
  mode: "color-audit" | "system-canvas"
  label: string
  description: string
  nodes: NodeCatalogNodeResource[]
}

export interface NodeCatalogWorkspaceItemResource {
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
}

export interface NodeCatalogWorkspaceSectionResource {
  id: string
  label: string
  description: string
  items: NodeCatalogWorkspaceItemResource[]
}

export interface NodeCatalogStatePreviewResource {
  sampleNodeId: string | null
  sampleNodeLabel: string | null
  states: Array<"default" | "selected" | "highlighted" | "dimmed">
}

export interface NodeCatalogWorkspaceStateResource {
  surface: "node-catalog"
  workspaceKey: string
  stateSummary: WorkspaceManifestStateSummary
  workspaceSections: NodeCatalogWorkspaceSectionResource[]
  nodeSections: NodeCatalogNodeSectionResource[]
  statePreview: NodeCatalogStatePreviewResource
}

export function buildNodeCatalogWorkspaceManifest(
  stateResource?: Pick<NodeCatalogWorkspaceStateResource, "stateSummary"> | null
): WorkspaceManifest | null {
  return buildWorkspaceManifest("node-catalog", stateResource?.stateSummary)
}

export function buildNodeCatalogWorkspaceStateResource(input: {
  workspaceKey: string
  stateSummary: WorkspaceManifestStateSummary
  workspaceSections: NodeCatalogWorkspaceSectionResource[]
  nodeSections: NodeCatalogNodeSectionResource[]
  statePreview: NodeCatalogStatePreviewResource
}): NodeCatalogWorkspaceStateResource {
  return {
    surface: "node-catalog",
    workspaceKey: input.workspaceKey,
    stateSummary: input.stateSummary,
    workspaceSections: input.workspaceSections,
    nodeSections: input.nodeSections,
    statePreview: input.statePreview,
  }
}
