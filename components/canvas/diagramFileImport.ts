import type { CanvasExcalidrawScene } from "../../types/canvas"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function normalizeBackgroundColor(appState: Record<string, unknown>) {
  const current = appState.viewBackgroundColor
  return typeof current === "string" && current.trim() ? current : "#ffffff"
}

export function inferDiagramFileKind(
  fileName: string,
  mimeType?: string
): "markdown" | "mermaid" | "excalidraw" | null {
  const normalizedName = fileName.trim().toLowerCase()
  if (!normalizedName) return null

  if (
    normalizedName.endsWith(".md") ||
    normalizedName.endsWith(".markdown")
  ) {
    return "markdown"
  }

  if (
    normalizedName.endsWith(".mmd") ||
    normalizedName.endsWith(".mermaid") ||
    normalizedName.endsWith(".mdm")
  ) {
    return "mermaid"
  }

  if (normalizedName.endsWith(".excalidraw")) {
    return "excalidraw"
  }

  const normalizedMime = (mimeType || "").trim().toLowerCase()
  if (normalizedMime === "application/vnd.excalidraw+json") {
    return "excalidraw"
  }

  return null
}

export function parseMermaidFileContent(raw: string): string {
  const source = raw.trim()
  if (!source) {
    throw new Error("Mermaid file is empty.")
  }
  return source
}

export function parseMarkdownFileContent(raw: string): string {
  const source = raw.trim()
  if (!source) {
    throw new Error("Markdown file is empty.")
  }
  return source
}

export function parseExcalidrawFileContent(raw: string): {
  scene: CanvasExcalidrawScene
  title?: string
  sourceMermaid?: string
} {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error("Invalid Excalidraw JSON file.")
  }

  if (!isRecord(parsed)) {
    throw new Error("Invalid Excalidraw payload.")
  }

  const root = parsed
  const sceneSource =
    isRecord(root.scene) && (Array.isArray(root.scene.elements) || isRecord(root.scene.appState))
      ? (root.scene as Record<string, unknown>)
      : root

  const hasSceneShape =
    Array.isArray(sceneSource.elements) || isRecord(sceneSource.appState) || isRecord(sceneSource.files)
  if (!hasSceneShape) {
    throw new Error("JSON does not contain Excalidraw scene data.")
  }

  const appState = isRecord(sceneSource.appState) ? { ...sceneSource.appState } : {}
  const scene: CanvasExcalidrawScene = {
    elements: Array.isArray(sceneSource.elements) ? sceneSource.elements : [],
    appState: {
      ...appState,
      viewBackgroundColor: normalizeBackgroundColor(appState),
    },
    files: isRecord(sceneSource.files) ? sceneSource.files : {},
  }

  const sourceMermaid =
    typeof sceneSource.sourceMermaid === "string"
      ? sceneSource.sourceMermaid
      : typeof root.sourceMermaid === "string"
        ? root.sourceMermaid
        : undefined

  const title =
    typeof root.title === "string"
      ? root.title
      : typeof root.name === "string"
        ? root.name
        : undefined

  return { scene, title, sourceMermaid }
}
