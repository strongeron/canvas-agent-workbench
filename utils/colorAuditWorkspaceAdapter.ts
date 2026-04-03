import type {
  WorkspaceManifest,
  WorkspaceManifestStateSummary,
} from "../types/agentNative"
import type {
  ColorCanvasEdge,
  ColorCanvasFrameworkId,
  ColorCanvasNode,
  ColorCanvasState,
} from "../types/colorCanvas"
import { buildWorkspaceManifest } from "./agentNativeManifest"

export type ColorAuditExportFormat = "css-vars" | "dtcg" | "tailwind" | "shadcn" | "radix"
export type ColorAuditExportColorMode = "resolved" | "oklch"

export const COLOR_AUDIT_EXPORT_FORMAT_OPTIONS: Array<{
  id: ColorAuditExportFormat
  label: string
}> = [
  { id: "css-vars", label: "CSS vars" },
  { id: "dtcg", label: "DTCG JSON" },
  { id: "tailwind", label: "Tailwind" },
  { id: "shadcn", label: "shadcn/ui" },
  { id: "radix", label: "Radix" },
]

export const COLOR_AUDIT_EXPORT_COLOR_MODE_OPTIONS: Array<{
  id: ColorAuditExportColorMode
  label: string
}> = [
  { id: "resolved", label: "Resolved colors" },
  { id: "oklch", label: "OKLCH colors" },
]

export interface ColorAuditWorkflowSummary {
  inputs: number
  relativeRules: number
  functionalAliases: number
  semanticRoles: number
  mappedSemanticRoles: number
  exportableTokens: number
  textRoleReady: boolean
  surfaceRoleReady: boolean
  contrastPairs: number
  frameworkAliasesReady: number
  genericReady: boolean
  frameworkReady: boolean
}

export interface ColorAuditExportEntryResource {
  id: string
  label: string
  cssVar: string
  exportKey: string
  family: "palette" | "relative" | "functional" | "semantic"
  role?: ColorCanvasNode["role"]
  framework?: ColorCanvasFrameworkId
  semanticKind?: ColorCanvasNode["semanticKind"]
  resolvedExpression: string
  oklchExpression?: string
}

export interface ColorAuditNodeResource {
  id: string
  type: ColorCanvasNode["type"]
  label: string
  role?: ColorCanvasNode["role"]
  framework?: ColorCanvasFrameworkId
  semanticKind?: ColorCanvasNode["semanticKind"]
  cssVar?: string
  value?: string
  group?: ColorCanvasNode["group"]
  position: { x: number; y: number }
  size?: { width: number; height: number }
  resolvedExpression?: string | null
  resolvedColor?: string | null
  isDisplayP3?: boolean
}

export interface ColorAuditEdgeResource {
  id: string
  type: ColorCanvasEdge["type"]
  sourceId: string
  targetId: string
  sourceLabel: string
  targetLabel: string
  note?: string
  targetLc?: number
  lc?: number | null
}

export interface ColorAuditExportPreviewResource {
  selectedFormat: ColorAuditExportFormat
  selectedColorMode: ColorAuditExportColorMode
  selectedFormatLabel: string
  tokenCount: number
  genericReady: boolean
  frameworkReady: boolean
  formats: Record<ColorAuditExportFormat, string>
}

export interface ColorAuditWorkspaceStateResource {
  surface: "color-audit"
  workspaceKey: string
  rawState: ColorCanvasState
  stateSummary: WorkspaceManifestStateSummary
  selection: {
    selectedNodeId: string | null
    selectedEdgeId: string | null
  }
  workflow: ColorAuditWorkflowSummary
  nodes: ColorAuditNodeResource[]
  edges: ColorAuditEdgeResource[]
  exportEntries: ColorAuditExportEntryResource[]
  exportPreview: ColorAuditExportPreviewResource
}

export function buildColorAuditWorkspaceManifest(
  stateResource?: Pick<ColorAuditWorkspaceStateResource, "stateSummary"> | null
): WorkspaceManifest | null {
  return buildWorkspaceManifest("color-audit", stateResource?.stateSummary)
}

export function buildColorAuditWorkspaceStateResource(input: {
  workspaceKey: string
  rawState: ColorCanvasState
  stateSummary: WorkspaceManifestStateSummary
  selectedNodeId: string | null
  selectedEdgeId: string | null
  workflow: ColorAuditWorkflowSummary
  nodes: ColorAuditNodeResource[]
  edges: ColorAuditEdgeResource[]
  exportEntries: ColorAuditExportEntryResource[]
  exportPreview: ColorAuditExportPreviewResource
}): ColorAuditWorkspaceStateResource {
  return {
    surface: "color-audit",
    workspaceKey: input.workspaceKey,
    rawState: input.rawState,
    stateSummary: input.stateSummary,
    selection: {
      selectedNodeId: input.selectedNodeId,
      selectedEdgeId: input.selectedEdgeId,
    },
    workflow: input.workflow,
    nodes: input.nodes,
    edges: input.edges,
    exportEntries: input.exportEntries,
    exportPreview: input.exportPreview,
  }
}
