export interface AgentNativeWorkspaceScreenshotStorageEntry {
  key: string
  value: string
}

export interface AgentNativeWorkspaceScreenshotConfig {
  route: string
  waitForText: string
  storageEntries: AgentNativeWorkspaceScreenshotStorageEntry[]
}

function buildAgentNativeCanvasStorageEntries(projectId: string, snapshot: unknown) {
  if (!snapshot || typeof snapshot !== "object") return []
  return [
    {
      key: `gallery-${projectId}-state`,
      value: JSON.stringify(snapshot),
    },
  ]
}

function buildAgentNativeColorCanvasStorageEntries(
  workspaceId: "color-audit" | "system-canvas",
  projectId: string,
  snapshot: any
) {
  if (!snapshot || typeof snapshot !== "object") return []

  const storageEntries: AgentNativeWorkspaceScreenshotStorageEntry[] = []
  const stateValue =
    snapshot.rawState && typeof snapshot.rawState === "object"
      ? JSON.stringify(snapshot.rawState)
      : null

  if (stateValue) {
    storageEntries.push({
      key: `gallery-${projectId}-color-canvas`,
      value: stateValue,
    })
  }

  storageEntries.push({
    key: `gallery-${projectId}-color-canvas-mode`,
    value: JSON.stringify(workspaceId === "system-canvas" ? "system-canvas" : "color-audit"),
  })

  storageEntries.push({
    key: `gallery-${projectId}-color-canvas-view`,
    value: JSON.stringify(
      workspaceId === "system-canvas" && typeof snapshot.viewMode === "string" && snapshot.viewMode.trim()
        ? snapshot.viewMode.trim()
        : workspaceId === "system-canvas"
          ? "system"
          : "color"
    ),
  })

  if (
    workspaceId === "system-canvas" &&
    snapshot.scaleConfig &&
    typeof snapshot.scaleConfig === "object"
  ) {
    storageEntries.push({
      key: `gallery-${projectId}-design-system-scale`,
      value: JSON.stringify(snapshot.scaleConfig),
    })
  }

  return storageEntries
}

export function buildAgentNativeWorkspaceScreenshotConfig(
  workspaceId: "canvas" | "color-audit" | "system-canvas" | "node-catalog",
  projectId: string,
  snapshot: unknown
): AgentNativeWorkspaceScreenshotConfig | null {
  switch (workspaceId) {
    case "canvas":
      return {
        route: `/canvas?project=${encodeURIComponent(projectId)}`,
        waitForText: "Canvas",
        storageEntries: buildAgentNativeCanvasStorageEntries(projectId, snapshot),
      }
    case "color-audit":
      return {
        route: `/color-canvas?project=${encodeURIComponent(projectId)}`,
        waitForText: "Color Audit",
        storageEntries: buildAgentNativeColorCanvasStorageEntries("color-audit", projectId, snapshot),
      }
    case "system-canvas":
      return {
        route: `/color-canvas?project=${encodeURIComponent(projectId)}`,
        waitForText: "System Canvas",
        storageEntries: buildAgentNativeColorCanvasStorageEntries("system-canvas", projectId, snapshot),
      }
    case "node-catalog":
      return {
        route: `/node-catalog?project=${encodeURIComponent(projectId)}`,
        waitForText: "Node Catalog",
        storageEntries: [],
      }
    default:
      return null
  }
}
