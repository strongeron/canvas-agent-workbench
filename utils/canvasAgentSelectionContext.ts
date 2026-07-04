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

export interface CanvasAgentSelectionContextInput {
  projectId?: string | null
  canvasPath?: string | null
  items: CanvasItem[]
  selectedIds: string[]
}

function describeItem(item: CanvasItem) {
  const label =
    ("title" in item && typeof item.title === "string" && item.title.trim()) ||
    ("name" in item && typeof (item as { name?: string }).name === "string" &&
      (item as { name?: string }).name?.trim()) ||
    null
  const position =
    item.position && Number.isFinite(item.position.x) && Number.isFinite(item.position.y)
      ? ` @ (${Math.round(item.position.x)},${Math.round(item.position.y)})`
      : ""
  const size =
    item.size && Number.isFinite(item.size.width) && Number.isFinite(item.size.height)
      ? ` ${Math.round(item.size.width)}x${Math.round(item.size.height)}`
      : ""
  const parent = item.parentId ? ` (parent: ${item.parentId})` : ""
  return `- ${item.id} — ${item.type}${label ? ` "${label}"` : ""}${position}${size}${parent}`
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

  const lines = [
    "Canvas agent context",
    `project: ${projectId?.trim() || "unknown"}`,
    `canvas: ${canvasPath?.trim() || "(unsaved board)"}`,
    `selected items (${selected.length}):`,
    ...selected.map(describeItem),
    "",
    "Use the canvas MCP server: call get_canvas_state (or get_canvas_context) to resolve these ids, then operate on them with tools like update_item, update_markdown_block, update_artboard_layout, or select_items.",
  ]
  return lines.join("\n")
}
