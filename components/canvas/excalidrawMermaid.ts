import { convertToExcalidrawElements } from "@excalidraw/excalidraw"
import { parseMermaidToExcalidraw } from "@excalidraw/mermaid-to-excalidraw"

import type { CanvasExcalidrawScene } from "../../types/canvas"

function cloneSerializable<T>(value: T): T {
  return JSON.parse(JSON.stringify(value ?? null)) as T
}

export async function convertMermaidSourceToExcalidrawScene(
  source: string
): Promise<CanvasExcalidrawScene> {
  const trimmed = source.trim()
  if (!trimmed) {
    throw new Error("Mermaid source is empty.")
  }

  const parsed = await parseMermaidToExcalidraw(trimmed)
  const elements = convertToExcalidrawElements(parsed.elements || [])

  return {
    elements: cloneSerializable(elements),
    appState: {
      viewBackgroundColor: "#ffffff",
    },
    files: cloneSerializable(parsed.files || {}),
  }
}
