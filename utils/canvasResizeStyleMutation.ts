// U4a inline-style resize fallback (HTML only).
//
// computeResizeMutation snaps to a Tailwind w-*/h-* class, but that path is a
// no-op when the element's class attribute is a computed expression
// (cn(...), a ternary, etc.) — there's no literal class string to rewrite.
// For HTML elements the safe, fully-defined fallback is to write explicit
// pixel width/height into the inline `style` attribute (a plain string),
// merging with any existing declarations rather than clobbering them.
//
// TSX is intentionally out of scope here: React `style` is an *object*
// expression (`style={{ width: '4rem' }}`), not a string attribute, so it
// needs a different (object-AST) mutation. Computed-class TSX nodes stay
// source-only for resize in v3 (documented decision).

import type { CanvasOverlayDragKind } from "../components/canvas/CanvasIframeOverlay"

export interface CanvasSetAttributeStyleMutation {
  type: "setAttribute"
  attrName: "style"
  value: string
}

const AFFECTS_WIDTH: Record<CanvasOverlayDragKind, boolean> = {
  nw: true, n: false, ne: true, e: true, se: true, s: false, sw: true, w: true, move: false,
}
const AFFECTS_HEIGHT: Record<CanvasOverlayDragKind, boolean> = {
  nw: true, n: true, ne: true, e: false, se: true, s: true, sw: true, w: false, move: false,
}
// Right/bottom handles grow with +delta; left/top handles grow with -delta.
const WIDTH_SIGN: Record<CanvasOverlayDragKind, 1 | -1 | 0> = {
  e: 1, ne: 1, se: 1, w: -1, nw: -1, sw: -1, n: 0, s: 0, move: 0,
}
const HEIGHT_SIGN: Record<CanvasOverlayDragKind, 1 | -1 | 0> = {
  s: 1, se: 1, sw: 1, n: -1, ne: -1, nw: -1, e: 0, w: 0, move: 0,
}

/** Parse a `style` attribute string into an ordered list of declarations. */
function parseStyle(style: string): Array<[string, string]> {
  const out: Array<[string, string]> = []
  for (const decl of style.split(";")) {
    const idx = decl.indexOf(":")
    if (idx === -1) continue
    const prop = decl.slice(0, idx).trim()
    const value = decl.slice(idx + 1).trim()
    if (prop) out.push([prop, value])
  }
  return out
}

function serializeStyle(decls: Array<[string, string]>): string {
  return decls.map(([p, v]) => `${p}: ${v}`).join("; ")
}

function upsert(decls: Array<[string, string]>, prop: string, value: string): void {
  const existing = decls.find(([p]) => p.toLowerCase() === prop)
  if (existing) existing[1] = value
  else decls.push([prop, value])
}

/**
 * Returns a `setAttribute` mutation that writes snapped pixel width/height
 * into the element's inline style, or null when the drag is a no-op (move
 * handle, non-finite/zero delta, or nothing actually changes).
 */
export function computeResizeStyleFallback(input: {
  kind: CanvasOverlayDragKind
  delta: { dx: number; dy: number }
  rect: { width: number; height: number }
  style: string
}): CanvasSetAttributeStyleMutation | null {
  if (input.kind === "move") return null
  const { dx, dy } = input.delta
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return null

  const decls = parseStyle(input.style)
  let changed = false

  if (AFFECTS_WIDTH[input.kind] && WIDTH_SIGN[input.kind] !== 0) {
    const next = Math.round(input.rect.width + WIDTH_SIGN[input.kind] * dx)
    const clamped = Math.max(1, next)
    if (clamped !== Math.round(input.rect.width)) {
      upsert(decls, "width", `${clamped}px`)
      changed = true
    }
  }
  if (AFFECTS_HEIGHT[input.kind] && HEIGHT_SIGN[input.kind] !== 0) {
    const next = Math.round(input.rect.height + HEIGHT_SIGN[input.kind] * dy)
    const clamped = Math.max(1, next)
    if (clamped !== Math.round(input.rect.height)) {
      upsert(decls, "height", `${clamped}px`)
      changed = true
    }
  }
  if (!changed) return null
  return { type: "setAttribute", attrName: "style", value: serializeStyle(decls) }
}
