// Translates an overlay drag-commit into a setClassName mutation by snapping
// the new dimensions to the nearest Tailwind w-* / h-* class.
//
// Inputs:
//   - kind:      the handle the user dragged (nw, n, ne, e, se, s, sw, w, move)
//   - delta:     drag delta in iframe-document units (already canvas-scale-
//                normalized — see screenDeltaToIframeLocal)
//   - rect:      the element's iframe-document rect at drag-start
//   - className: the element's full class attribute as a string
//
// Output: a CanvasAstMutation ({ type: "setClassName", value: newClassName })
// or null when the operation is a no-op (move handle, sub-snap delta, or
// nothing actually changes).
//
// Scope (slice 2b-ii):
//   - move handles → null (re-positioning via class isn't expressible; needs
//     inline style or layout-system mutation, both deferred)
//   - drags that snap back to the same class → null (no write)
//   - non-finite or zero deltas → null
//
// Non-goals:
//   - Inline-style fallback for elements without w-*/h-* (next slice)
//   - Position class snap (top-*, left-*, etc.) for move
//   - Multi-class composition (e.g. responsive prefixes like md:w-4)

import {
  TAILWIND_DEFAULT_SIZE_SCALE,
  type TailwindSnapEntry,
  formatSizeClass,
  nearestSnap,
} from "./tailwindSnapTable"

import type { CanvasOverlayDragKind } from "../components/canvas/CanvasIframeOverlay"

/** Narrow shape of the only mutation computeResizeMutation produces today. */
export interface CanvasSetClassNameMutation {
  type: "setClassName"
  value: string
}

export interface ResizeMutationInput {
  kind: CanvasOverlayDragKind
  delta: { dx: number; dy: number }
  rect: { width: number; height: number }
  className: string
}

// Which dimensions a handle affects. Move handles affect position only and
// are not handled here; they return null at the top of computeResizeMutation.
const HANDLE_AFFECTS_WIDTH: Record<CanvasOverlayDragKind, boolean> = {
  nw: true, n: false, ne: true, e: true, se: true, s: false, sw: true, w: true,
  move: false,
}
const HANDLE_AFFECTS_HEIGHT: Record<CanvasOverlayDragKind, boolean> = {
  nw: true, n: true, ne: true, e: false, se: true, s: true, sw: true, w: false,
  move: false,
}
// Handles on the right (e, ne, se) grow width with +dx; handles on the left
// (w, nw, sw) grow width with -dx (the left edge moves outward).
const HANDLE_WIDTH_SIGN: Record<CanvasOverlayDragKind, 1 | -1 | 0> = {
  nw: -1, n: 0, ne: 1, e: 1, se: 1, s: 0, sw: -1, w: -1, move: 0,
}
// Handles on the bottom (s, se, sw) grow height with +dy; top handles shrink.
const HANDLE_HEIGHT_SIGN: Record<CanvasOverlayDragKind, 1 | -1 | 0> = {
  nw: -1, n: -1, ne: -1, e: 0, se: 1, s: 1, sw: 1, w: 0, move: 0,
}

export function computeResizeMutation(
  input: ResizeMutationInput,
  scale: ReadonlyArray<TailwindSnapEntry> = TAILWIND_DEFAULT_SIZE_SCALE
): CanvasSetClassNameMutation | null {
  if (input.kind === "move") return null
  if (!Number.isFinite(input.delta.dx) || !Number.isFinite(input.delta.dy)) return null

  const widthAffected = HANDLE_AFFECTS_WIDTH[input.kind]
  const heightAffected = HANDLE_AFFECTS_HEIGHT[input.kind]
  const widthSign = HANDLE_WIDTH_SIGN[input.kind]
  const heightSign = HANDLE_HEIGHT_SIGN[input.kind]

  let nextClassName = input.className
  let changed = false

  if (widthAffected) {
    const newPx = Math.max(0, input.rect.width + widthSign * input.delta.dx)
    const snapped = nearestSnap(newPx, scale)
    const updated = replaceOrAppendSizeClass(nextClassName, "w", snapped)
    if (updated !== nextClassName) {
      nextClassName = updated
      changed = true
    }
  }

  if (heightAffected) {
    const newPx = Math.max(0, input.rect.height + heightSign * input.delta.dy)
    const snapped = nearestSnap(newPx, scale)
    const updated = replaceOrAppendSizeClass(nextClassName, "h", snapped)
    if (updated !== nextClassName) {
      nextClassName = updated
      changed = true
    }
  }

  if (!changed) return null
  return { type: "setClassName", value: nextClassName }
}

/**
 * If className already contains a `<prefix>-<token>` class, replace it with
 * the snapped one. Otherwise append. Whitespace between classes is collapsed
 * to a single space to keep the writer output stable across edits.
 *
 * Exported for tests; production callers should use computeResizeMutation.
 */
export function replaceOrAppendSizeClass(
  className: string,
  prefix: "w" | "h",
  entry: TailwindSnapEntry
): string {
  const target = formatSizeClass(prefix, entry)
  // Match `<prefix>-<token>` where <token> is letters/digits/dot/slash (covers
  // numeric, "px", and fractional Tailwind tokens). Word boundaries on both
  // sides so `min-w-4` and `max-w-4` are not mistaken for `w-4`.
  const re = new RegExp(`(^|\\s)${prefix}-[\\w./]+(?=\\s|$)`)
  const trimmed = className.trim().replace(/\s+/g, " ")
  if (re.test(trimmed)) {
    return trimmed.replace(re, (match) => {
      const leading = match.startsWith(" ") ? " " : ""
      return `${leading}${target}`
    })
  }
  return trimmed.length === 0 ? target : `${trimmed} ${target}`
}
