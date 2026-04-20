import type { WorkspaceManifest, WorkspaceManifestStateSummary } from "../types/agentNative"
import type {
  CanvasAgentPrimitive,
  CanvasThemeSnapshot,
  CanvasStateSnapshot,
} from "../types/canvas"
import { buildWorkspaceManifest } from "./agentNativeManifest"

export interface CanvasWorkspaceStateResource {
  surface: "canvas"
  workspaceKey: string
  state: CanvasStateSnapshot
  selection: string[]
  primitives: CanvasAgentPrimitive[]
  themeSnapshot: CanvasThemeSnapshot
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
  themeSnapshot?: CanvasThemeSnapshot
  stateSummary: WorkspaceManifestStateSummary
}): CanvasWorkspaceStateResource {
  return {
    surface: "canvas",
    workspaceKey: input.workspaceKey,
    state: input.state,
    selection: Array.isArray(input.selection) ? input.selection : input.state.selectedIds,
    primitives: Array.isArray(input.primitives) ? input.primitives : [],
    themeSnapshot: {
      themes: Array.isArray(input.themeSnapshot?.themes) ? input.themeSnapshot.themes : [],
      activeThemeId:
        typeof input.themeSnapshot?.activeThemeId === "string"
          ? input.themeSnapshot.activeThemeId
          : null,
      tokenValues:
        input.themeSnapshot?.tokenValues && typeof input.themeSnapshot.tokenValues === "object"
          ? input.themeSnapshot.tokenValues
          : {},
    },
    stateSummary: input.stateSummary,
  }
}
