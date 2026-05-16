// Pure geometry for U8 media direct-manipulation. The component converts
// pointer pixels into fractions/seconds and delegates the clamping math here
// so it stays unit-testable without a DOM.
//
// Crop model: a window over the source image expressed as fractions in [0,1]
// ({x,y} = top-left, {w,h} = size). The source file is never touched — the
// crop is applied on display via cropToImageStyle. Corner drags are anchored:
// the opposite corner stays fixed in image space (standard crop-handle feel).

export interface CanvasCropRect {
  x: number
  y: number
  w: number
  h: number
}

export type CanvasCropCorner = "nw" | "ne" | "sw" | "se"
export type CanvasClipEdge = "start" | "end"

/** Smallest crop window, as a fraction of the source (prevents collapse). */
export const CROP_MIN = 0.05

export const FULL_CROP: CanvasCropRect = { x: 0, y: 0, w: 1, h: 1 }

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return value < min ? min : value > max ? max : value
}

/**
 * Clamp an arbitrary crop into a valid window: size in [CROP_MIN, 1] and the
 * window fully inside [0,1]. Undefined → full frame.
 */
export function normalizeCrop(crop?: Partial<CanvasCropRect> | null): CanvasCropRect {
  if (!crop) return { ...FULL_CROP }
  const w = clamp(crop.w ?? 1, CROP_MIN, 1)
  const h = clamp(crop.h ?? 1, CROP_MIN, 1)
  const x = clamp(crop.x ?? 0, 0, 1 - w)
  const y = clamp(crop.y ?? 0, 0, 1 - h)
  return { x, y, w, h }
}

/** True when the crop is (within epsilon of) the whole source — no-op crop. */
export function isFullCrop(crop?: Partial<CanvasCropRect> | null): boolean {
  if (!crop) return true
  const c = normalizeCrop(crop)
  return (
    Math.abs(c.x) < 1e-4 &&
    Math.abs(c.y) < 1e-4 &&
    Math.abs(c.w - 1) < 1e-4 &&
    Math.abs(c.h - 1) < 1e-4
  )
}

/**
 * Apply a corner-handle drag. `dxFrac`/`dyFrac` are deltas already converted
 * to source-image fractions. The corner opposite the dragged one is held
 * fixed; the result is re-normalized so it never collapses or leaves [0,1].
 */
export function applyCropHandleDrag(input: {
  crop?: Partial<CanvasCropRect> | null
  corner: CanvasCropCorner
  dxFrac: number
  dyFrac: number
}): CanvasCropRect {
  const c = normalizeCrop(input.crop)
  const dx = Number.isFinite(input.dxFrac) ? input.dxFrac : 0
  const dy = Number.isFinite(input.dyFrac) ? input.dyFrac : 0
  // Work in edge coordinates so the anchored (opposite) edge is literally
  // left untouched, then convert back to {x,y,w,h}.
  let left = c.x
  let top = c.y
  let right = c.x + c.w
  let bottom = c.y + c.h

  if (input.corner === "nw" || input.corner === "sw") left = c.x + dx
  if (input.corner === "ne" || input.corner === "se") right = c.x + c.w + dx
  if (input.corner === "nw" || input.corner === "ne") top = c.y + dy
  if (input.corner === "sw" || input.corner === "se") bottom = c.y + c.h + dy

  left = clamp(left, 0, 1)
  top = clamp(top, 0, 1)
  right = clamp(right, 0, 1)
  bottom = clamp(bottom, 0, 1)

  // Enforce the min window by pushing the dragged edge back toward the anchor.
  if (right - left < CROP_MIN) {
    if (input.corner === "nw" || input.corner === "sw") left = right - CROP_MIN
    else right = left + CROP_MIN
  }
  if (bottom - top < CROP_MIN) {
    if (input.corner === "nw" || input.corner === "ne") top = bottom - CROP_MIN
    else bottom = top + CROP_MIN
  }

  return normalizeCrop({ x: left, y: top, w: right - left, h: bottom - top })
}

/**
 * CSS for an `<img>` placed absolutely inside an `overflow:hidden` box so the
 * crop window exactly fills that box. Full-frame crop returns an empty object
 * (caller keeps its existing object-fit rendering).
 */
export function cropToImageStyle(
  crop?: Partial<CanvasCropRect> | null
): {
  position?: "absolute"
  width?: string
  height?: string
  left?: string
  top?: string
  maxWidth?: string
  objectFit?: "fill"
} {
  if (isFullCrop(crop)) return {}
  const c = normalizeCrop(crop)
  return {
    position: "absolute",
    width: `${100 / c.w}%`,
    height: `${100 / c.h}%`,
    left: `${(-c.x / c.w) * 100}%`,
    top: `${(-c.y / c.h) * 100}%`,
    maxWidth: "none",
    objectFit: "fill",
  }
}

/**
 * Move one edge of a video clip range by `deltaSec`. Clamped to
 * [0, durationSec] (when a finite duration is known) with a 0.05s minimum
 * gap; if the dragged edge crosses the other, the two swap so the range
 * stays well-ordered.
 */
export function applyClipHandleDrag(input: {
  startSec: number
  endSec: number | null
  durationSec?: number | null
  edge: CanvasClipEdge
  deltaSec: number
}): { startSec: number; endSec: number } {
  const hasDuration =
    typeof input.durationSec === "number" && Number.isFinite(input.durationSec) && input.durationSec > 0
  const max = hasDuration ? (input.durationSec as number) : Number.POSITIVE_INFINITY
  const delta = Number.isFinite(input.deltaSec) ? input.deltaSec : 0
  const baseStart = Math.max(0, input.startSec)
  const baseEnd =
    typeof input.endSec === "number" && Number.isFinite(input.endSec)
      ? input.endSec
      : hasDuration
        ? (input.durationSec as number)
        : baseStart + 1

  let start = baseStart
  let end = baseEnd
  if (input.edge === "start") start = clamp(baseStart + delta, 0, max)
  else end = clamp(baseEnd + delta, 0, max)

  if (start > end) {
    const swapped = Math.min(start, end)
    end = Math.max(start, end)
    start = swapped
  }
  if (end - start < 0.05) {
    if (input.edge === "start") start = Math.max(0, end - 0.05)
    else end = Math.min(max, start + 0.05)
  }
  return { startSec: start, endSec: end }
}
