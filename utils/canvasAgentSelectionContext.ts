import type { CanvasItem } from "../types/canvas"

/**
 * Fired by the shared item context menu; handled once in CanvasTab (which
 * owns selection + project context). Avoids threading a callback through
 * every Canvas*Item component — same pattern as dispatchCanvasResize.
 */
export const CANVAS_COPY_FOR_AGENT_EVENT = "canvas:copy-for-agent"

export function dispatchCanvasCopyForAgent() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(CANVAS_COPY_FOR_AGENT_EVENT))
}

function firstLine(text: string, max = 80) {
  const line = text
    .split("\n")
    .map((part) => part.trim())
    .find(Boolean)
  if (!line) return null
  return line.length > max ? `${line.slice(0, max)}…` : line
}

function describeBase(item: CanvasItem) {
  const label =
    ("title" in item && typeof item.title === "string" && item.title.trim()) ||
    ("name" in item && typeof item.name === "string" && item.name.trim()) ||
    null
  const position =
    item.position && Number.isFinite(item.position.x) && Number.isFinite(item.position.y)
      ? ` @ (${Math.round(item.position.x)},${Math.round(item.position.y)})`
      : ""
  const size =
    item.size && Number.isFinite(item.size.width) && Number.isFinite(item.size.height)
      ? ` ${Math.round(item.size.width)}x${Math.round(item.size.height)}`
      : ""
  const parent = item.parentId
    ? ` (parent: ${item.parentId}${Number.isFinite(item.order) ? `, order ${item.order}` : ""})`
    : ""
  const group = item.groupId ? ` (group: ${item.groupId})` : ""
  return `- ${item.id} — ${item.type}${label ? ` "${label}"` : ""}${position}${size}${parent}${group}`
}

/**
 * One type-specific detail line per item, exhaustively covering every member
 * of the CanvasItem union — the `never` check below turns a newly added item
 * type into a compile error here, so the agent context can't silently go
 * stale.
 */
function describeDetail(item: CanvasItem, allItems: CanvasItem[]): string | null {
  switch (item.type) {
    case "component": {
      const propKeys = item.customProps ? Object.keys(item.customProps) : []
      return `component: ${item.componentId}, variant ${item.variantIndex}${
        propKeys.length ? `, custom props: ${propKeys.join(", ")}` : ""
      }`
    }
    case "embed":
      return `url: ${item.url}${item.embedPreviewMode ? `, preview: ${item.embedPreviewMode}` : ""}${
        item.embedFrameStatus && item.embedFrameStatus !== "unknown"
          ? `, frame: ${item.embedFrameStatus}`
          : ""
      }`
    case "html": {
      const parts = [`mode: ${item.sourceMode ?? (item.src ? "url" : "inline")}`]
      if (item.sourceHtmlFilePath) parts.push(`html file: ${item.sourceHtmlFilePath}`)
      if (item.sourceReactFilePath) parts.push(`react file: ${item.sourceReactFilePath}`)
      if (item.sourcePath) parts.push(`source: ${item.sourcePath}`)
      if (item.entryAsset) parts.push(`entry: ${item.entryAsset}`)
      if (!item.sourceHtmlFilePath && !item.sourceReactFilePath && item.src)
        parts.push(`src: ${item.src}`)
      if (item.sourceComponentSlug) parts.push(`component: ${item.sourceComponentSlug}`)
      return parts.join(", ")
    }
    case "media":
      return `${item.mediaKind ?? "media"}: ${item.src}${
        item.sourceUrl ? ` (from ${item.sourceUrl})` : ""
      }`
    case "mermaid": {
      const preview = firstLine(item.source)
      return `mermaid${item.mermaidTheme ? ` (${item.mermaidTheme})` : ""}${
        preview ? `: ${preview}` : ""
      }`
    }
    case "excalidraw": {
      const elementCount = Array.isArray(item.scene?.elements) ? item.scene.elements.length : 0
      const mermaid = item.sourceMermaid ? firstLine(item.sourceMermaid) : null
      return `${elementCount} scene element${elementCount === 1 ? "" : "s"}${
        mermaid ? `, from mermaid: ${mermaid}` : ""
      }`
    }
    case "markdown": {
      const preview = firstLine(item.source)
      const blocks = item.source.split(/\n{2,}/).filter((part) => part.trim()).length
      return `${blocks} block${blocks === 1 ? "" : "s"}${
        item.sourcePath ? `, file: ${item.sourcePath}` : ""
      }${preview ? `, starts: ${preview}` : ""}`
    }
    case "mcp-app": {
      const toolCount = Array.isArray(item.toolsCache) ? item.toolsCache.length : 0
      return `app: ${item.appName}, status: ${item.status}${
        toolCount ? `, ${toolCount} tools` : ""
      }`
    }
    case "artboard":
    case "section": {
      const children = allItems.filter((child) => child.parentId === item.id)
      const layout = item.layout
      const layoutParts = [
        layout.display,
        layout.display === "grid" && layout.columns ? `${layout.columns} cols` : layout.direction,
        layout.gap != null ? `gap ${layout.gap}` : null,
        layout.padding != null ? `padding ${layout.padding}` : null,
      ].filter(Boolean)
      return `layout: ${layoutParts.join(", ")}${item.themeId ? `, theme: ${item.themeId}` : ""}, ${
        children.length
      } child${children.length === 1 ? "" : "ren"}${
        children.length ? ` (${children.map((child) => child.id).join(", ")})` : ""
      }`
    }
    default: {
      const exhausted: never = item
      return exhausted
    }
  }
}

export interface CanvasAgentSelectionContextInput {
  projectId?: string | null
  canvasPath?: string | null
  items: CanvasItem[]
  selectedIds: string[]
}

/**
 * Paste-ready context block for handing the current canvas selection to an
 * agent (external codex/claude session or the in-panel terminal). The block
 * carries the item facts inline so it stays useful even when the live
 * selection has moved on, and closes with an instruction phrased in the
 * canvas MCP vocabulary every session is bootstrapped with.
 *
 * Returns null when nothing is selected.
 */
export function buildCanvasAgentSelectionContext({
  projectId,
  canvasPath,
  items,
  selectedIds,
}: CanvasAgentSelectionContextInput): string | null {
  const selectedSet = new Set(selectedIds)
  const selected = items.filter((item) => selectedSet.has(item.id))
  if (selected.length === 0) return null

  const itemLines = selected.flatMap((item) => {
    const detail = describeDetail(item, items)
    return detail ? [describeBase(item), `  ${detail}`] : [describeBase(item)]
  })

  const lines = [
    "Canvas agent context",
    `project: ${projectId?.trim() || "unknown"}`,
    `canvas: ${canvasPath?.trim() || "(unsaved board)"}`,
    `selected items (${selected.length}):`,
    ...itemLines,
    "",
    "Use the canvas MCP server: call get_canvas_state (or get_canvas_context) to resolve these ids, then operate on them with tools like update_item, update_markdown_block, update_artboard_layout, read_html_node/update_html_node, or select_items.",
  ]
  return lines.join("\n")
}
