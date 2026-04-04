import type { WorkspaceManifest, WorkspaceManifestStateSummary } from "../types/agentNative"
import type {
  CanvasAgentPrimitive,
  CanvasStateSnapshot,
} from "../types/canvas"
import { buildWorkspaceManifest } from "./agentNativeManifest"

export interface CanvasWorkspaceStateResource {
  surface: "canvas"
  workspaceKey: string
  state: CanvasStateSnapshot
  selection: string[]
  primitives: CanvasAgentPrimitive[]
  stateSummary: WorkspaceManifestStateSummary
}

export function buildCanvasWorkspaceManifest(
  stateResource?: Pick<CanvasWorkspaceStateResource, "stateSummary"> | null
): WorkspaceManifest | null {
  return buildWorkspaceManifest("canvas", stateResource?.stateSummary)
}

export function buildCanvasWorkspaceStateResource(input: {
  workspaceKey: string
  state: CanvasStateSnapshot
  selection?: string[]
  primitives?: CanvasAgentPrimitive[]
  stateSummary: WorkspaceManifestStateSummary
}): CanvasWorkspaceStateResource {
  return {
    surface: "canvas",
    workspaceKey: input.workspaceKey,
    state: input.state,
    selection: Array.isArray(input.selection) ? input.selection : input.state.selectedIds,
    primitives: Array.isArray(input.primitives) ? input.primitives : [],
    stateSummary: input.stateSummary,
  }
}
