import { buildPrimitiveSnippet, type CanvasRegistryPrimitive } from "./canvasRegistry"

export interface CanvasPrimitiveInstantiateInput {
  title: string
  sourceMode: "inline" | "react"
  sourceHtml?: string
  sourceReact?: string
  sourcePath?: string
  sourceHtmlFilePath?: string
  sourceHtmlFileMtime?: number
}

/**
 * Turn a library primitive into the html-item creation input. File-backed
 * HTML primitives load their source through the AST endpoint (same as the
 * panel's click-to-instantiate); registry primitives get a generated React
 * snippet. Shared by the library panel and the artboard drop target
 * (FOX2-58) so both produce identical items.
 */
export async function buildPrimitiveInstantiateInput(
  primitive: CanvasRegistryPrimitive,
  projectId: string
): Promise<CanvasPrimitiveInstantiateInput> {
  if (primitive.kind === "html" && primitive.filePath) {
    const filePath = `projects/${projectId}/${primitive.filePath}`
    const response = await fetch("/api/canvas/ast/load", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filePath }),
    })
    const payload = (await response.json().catch(() => ({}))) as {
      ok?: boolean
      sourceHtml?: string
      source?: string
      filePath?: string
      mtimeMs?: number
      error?: string
    }
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "Failed to load HTML primitive.")
    }
    return {
      title: primitive.displayName,
      sourceMode: "inline",
      sourceHtml: payload.sourceHtml || payload.source || "",
      sourcePath: filePath,
      sourceHtmlFilePath: payload.filePath || filePath,
      sourceHtmlFileMtime: payload.mtimeMs,
    }
  }

  return {
    title: primitive.displayName,
    sourceMode: "react",
    sourceReact: buildPrimitiveSnippet(primitive),
  }
}
