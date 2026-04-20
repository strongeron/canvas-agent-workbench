import { PNG } from "pngjs"

export interface AgentNativeWorkspaceScreenshotStorageEntry {
  key: string
  value: string
}

export interface AgentNativeWorkspaceScreenshotConfig {
  route: string
  waitForText: string
  storageEntries: AgentNativeWorkspaceScreenshotStorageEntry[]
}

const AGENT_NATIVE_CANVAS_SCREENSHOT_PRESETS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
} as const

type AgentNativeCanvasScreenshotTarget = keyof typeof AGENT_NATIVE_CANVAS_SCREENSHOT_PRESETS

export interface AgentNativeWorkspaceScreenshotCropRect {
  x: number
  y: number
  width: number
  height: number
}

function extractCanvasStateSnapshot(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== "object") return null
  if (
    "state" in snapshot &&
    snapshot.state &&
    typeof snapshot.state === "object" &&
    Array.isArray((snapshot.state as { items?: unknown[] }).items)
  ) {
    return snapshot.state as {
      items: Array<{ id: string; position: { x: number; y: number }; size: { width: number; height: number } }>
      groups?: unknown[]
      nextZIndex?: number
      selectedIds?: string[]
    }
  }
  if (Array.isArray((snapshot as { items?: unknown[] }).items)) {
    return snapshot as {
      items: Array<{ id: string; position: { x: number; y: number }; size: { width: number; height: number } }>
      groups?: unknown[]
      nextZIndex?: number
      selectedIds?: string[]
    }
  }
  return null
}

export function buildFocusedCanvasScreenshotSnapshot(
  snapshot: unknown,
  itemIds: string[] | null | undefined,
  padding: number | undefined,
  target: AgentNativeCanvasScreenshotTarget
) {
  const ids = Array.isArray(itemIds)
    ? itemIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    : []
  if (ids.length === 0 || !snapshot || typeof snapshot !== "object") return snapshot

  const canvasState = extractCanvasStateSnapshot(snapshot)
  if (!canvasState) return snapshot

  const targetItems = canvasState.items.filter((item) => ids.includes(item.id))
  if (targetItems.length === 0) return snapshot

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  targetItems.forEach((item) => {
    minX = Math.min(minX, item.position.x)
    minY = Math.min(minY, item.position.y)
    maxX = Math.max(maxX, item.position.x + item.size.width)
    maxY = Math.max(maxY, item.position.y + item.size.height)
  })

  const viewport = AGENT_NATIVE_CANVAS_SCREENSHOT_PRESETS[target] || AGENT_NATIVE_CANVAS_SCREENSHOT_PRESETS.desktop
  const safeWidth = Math.max(360, viewport.width - 360)
  const safeHeight = Math.max(280, viewport.height - 220)
  const focusPadding = Number.isFinite(padding) ? Math.max(0, Number(padding)) : 96
  const contentWidth = Math.max(1, maxX - minX)
  const contentHeight = Math.max(1, maxY - minY)
  const scaleX = Math.max(0.1, (safeWidth - focusPadding * 2) / contentWidth)
  const scaleY = Math.max(0.1, (safeHeight - focusPadding * 2) / contentHeight)
  const scale = Math.max(0.1, Math.min(4, Math.min(scaleX, scaleY)))
  const offsetX = (viewport.width - contentWidth * scale) / 2 - minX * scale
  const offsetY = (viewport.height - contentHeight * scale) / 2 - minY * scale

  return {
    ...snapshot,
    view: {
      ...((snapshot as { view?: Record<string, unknown> }).view || {}),
      transform: {
        scale,
        offset: {
          x: offsetX,
          y: offsetY,
        },
      },
    },
  }
}

export function normalizeAgentNativeWorkspaceScreenshotCropRect(
  rect: AgentNativeWorkspaceScreenshotCropRect | null | undefined,
  viewport: { width: number; height: number }
) {
  if (!rect || typeof rect !== "object") return null

  const viewportWidth = Number.isFinite(viewport?.width) ? Math.max(1, Number(viewport.width)) : 1
  const viewportHeight = Number.isFinite(viewport?.height) ? Math.max(1, Number(viewport.height)) : 1

  const rawX = Number.isFinite(rect.x) ? Number(rect.x) : 0
  const rawY = Number.isFinite(rect.y) ? Number(rect.y) : 0
  const rawWidth = Number.isFinite(rect.width) ? Number(rect.width) : 0
  const rawHeight = Number.isFinite(rect.height) ? Number(rect.height) : 0

  const x = Math.max(0, Math.min(viewportWidth, rawX))
  const y = Math.max(0, Math.min(viewportHeight, rawY))
  const maxWidth = Math.max(0, viewportWidth - x)
  const maxHeight = Math.max(0, viewportHeight - y)
  const width = Math.max(0, Math.min(maxWidth, rawWidth))
  const height = Math.max(0, Math.min(maxHeight, rawHeight))

  if (width < 1 || height < 1) return null

  return { x, y, width, height }
}

export function cropAgentNativeWorkspaceScreenshotPng(
  buffer: Buffer,
  rect: AgentNativeWorkspaceScreenshotCropRect,
  deviceScaleFactor = 1
) {
  const source = PNG.sync.read(buffer)
  const safeScale = Number.isFinite(deviceScaleFactor) ? Math.max(1, Math.round(deviceScaleFactor)) : 1
  const scaledX = Math.max(0, Math.min(source.width - 1, Math.floor(rect.x * safeScale)))
  const scaledY = Math.max(0, Math.min(source.height - 1, Math.floor(rect.y * safeScale)))
  const scaledWidth = Math.max(
    1,
    Math.min(source.width - scaledX, Math.ceil(rect.width * safeScale))
  )
  const scaledHeight = Math.max(
    1,
    Math.min(source.height - scaledY, Math.ceil(rect.height * safeScale))
  )

  const output = new PNG({ width: scaledWidth, height: scaledHeight })
  PNG.bitblt(source, output, scaledX, scaledY, scaledWidth, scaledHeight, 0, 0)
  return PNG.sync.write(output)
}

function buildAgentNativeCanvasStorageEntries(projectId: string, snapshot: unknown) {
  const canvasState = extractCanvasStateSnapshot(snapshot)
  if (!canvasState) return []

  const storageEntries: AgentNativeWorkspaceScreenshotStorageEntry[] = [
    {
      key: `gallery-${projectId}-state`,
      value: JSON.stringify(canvasState),
    },
  ]

  const transform =
    snapshot &&
    typeof snapshot === "object" &&
    (snapshot as { view?: { transform?: unknown } }).view?.transform &&
    typeof (snapshot as { view?: { transform?: unknown } }).view?.transform === "object"
      ? (snapshot as { view?: { transform?: unknown } }).view?.transform
      : null

  if (transform) {
    storageEntries.push({
      key: `gallery-${projectId}-viewport-override`,
      value: JSON.stringify(transform),
    })
  }

  return storageEntries
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
