// Helpers for consuming the canvas document change stream (FOX2-66):
// identifying the coalesced gesture event, humanizing change sources for
// history summaries (FOX2-67), and diffing snapshots into minimal per-item
// payloads for agent-feed gesture-end events (FOX2-60).

import type { CanvasDocumentSnapshot } from "../hooks/useCanvasState"

/**
 * `endGesture` emits exactly one coalesced event whose source is `"gesture"`
 * (no summary) or `"gesture:<summary>"`. Per-change events inside the gesture
 * keep their mutator source (e.g. `"update-item"`) and only carry
 * `meta.gesture: true`.
 */
export function isCoalescedGestureSource(source: string): boolean {
  return source === "gesture" || source.startsWith("gesture:")
}

/**
 * "add-item" → "Add item", "gesture:move-artboard" → "Move artboard",
 * "delete_items" → "Delete items".
 */
export function humanizeCanvasChangeSource(source: string): string {
  const base = source.startsWith("gesture:") ? source.slice("gesture:".length) : source
  const words = base.replace(/[-_]+/g, " ").trim()
  if (!words) return "Canvas change"
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** Selection mutators that feed the debounced selection-changed feed event (FOX2-60). */
export const CANVAS_SELECTION_SOURCES: ReadonlySet<string> = new Set([
  "select-item",
  "select-items",
  "select-all",
  "clear-selection",
])

/** Only the fields that changed on an item — never the whole item. */
export interface CanvasItemFieldDelta {
  position?: { x: number; y: number }
  size?: { width: number; height: number }
  rotation?: number
  parentId?: string | null
  order?: number | null
}

export interface CanvasDocumentItemDiff {
  itemIds: string[]
  from: Record<string, CanvasItemFieldDelta>
  to: Record<string, CanvasItemFieldDelta>
}

/**
 * Diff two document snapshots into per-item deltas of the geometry/placement
 * fields (position/size/rotation/parentId/order). Created and removed items
 * are not reported — gesture-end only ever mutates existing items.
 */
export function diffDocumentItems(
  prev: CanvasDocumentSnapshot,
  next: CanvasDocumentSnapshot
): CanvasDocumentItemDiff {
  const prevById = new Map(prev.items.map((item) => [item.id, item]))
  const itemIds: string[] = []
  const from: Record<string, CanvasItemFieldDelta> = {}
  const to: Record<string, CanvasItemFieldDelta> = {}

  for (const nextItem of next.items) {
    const prevItem = prevById.get(nextItem.id)
    if (!prevItem || prevItem === nextItem) continue

    const fromDelta: CanvasItemFieldDelta = {}
    const toDelta: CanvasItemFieldDelta = {}
    if (
      prevItem.position.x !== nextItem.position.x ||
      prevItem.position.y !== nextItem.position.y
    ) {
      fromDelta.position = { ...prevItem.position }
      toDelta.position = { ...nextItem.position }
    }
    if (
      prevItem.size.width !== nextItem.size.width ||
      prevItem.size.height !== nextItem.size.height
    ) {
      fromDelta.size = { ...prevItem.size }
      toDelta.size = { ...nextItem.size }
    }
    if (prevItem.rotation !== nextItem.rotation) {
      fromDelta.rotation = prevItem.rotation
      toDelta.rotation = nextItem.rotation
    }
    if ((prevItem.parentId ?? null) !== (nextItem.parentId ?? null)) {
      fromDelta.parentId = prevItem.parentId ?? null
      toDelta.parentId = nextItem.parentId ?? null
    }
    if ((prevItem.order ?? null) !== (nextItem.order ?? null)) {
      fromDelta.order = prevItem.order ?? null
      toDelta.order = nextItem.order ?? null
    }

    if (Object.keys(fromDelta).length === 0) continue
    itemIds.push(nextItem.id)
    from[nextItem.id] = fromDelta
    to[nextItem.id] = toDelta
  }

  return { itemIds, from, to }
}
