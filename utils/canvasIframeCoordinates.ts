// Coordinate math for the canvas iframe drag/resize overlay (v3 U4a).
//
// Two transforms compose between a pointer event in the viewport and the
// iframe document the user is editing:
//
//   1. canvasScale (s) — the parent canvas's own zoom (CanvasTab.transform.scale)
//   2. iframeZoom  (t) — any internal zoom the iframe applies to its content
//
// For drag *deltas*, pan/offset cancels out and only the multiplicative
// factors matter: dx_iframe = dx_screen / (s * t). For absolute positioning
// of the overlay on top of an iframe-local element rect, we anchor to the
// iframe element's screen-space bounding rect (which already has both
// transforms baked in by the browser).
//
// Rotation is explicitly out of scope for v3.

export interface CanvasTransform {
  scale: number
  offset: { x: number; y: number }
}

export interface ScreenRect {
  left: number
  top: number
  width: number
  height: number
}

export interface IframeAnchor {
  /** iframe.getBoundingClientRect() — already in viewport (screen) coordinates */
  rect: ScreenRect
  /** Internal zoom applied to the iframe's document (1 if none) */
  zoom: number
}

export interface Point {
  x: number
  y: number
}

export interface Delta {
  dx: number
  dy: number
}

/**
 * Translate a viewport pointer delta into a delta in iframe-document units.
 *
 * Used during drag/resize: the user's cursor moves `dxScreen` viewport pixels,
 * which corresponds to `dxScreen / (canvasScale * iframeZoom)` document pixels.
 */
export function screenDeltaToIframeLocal(
  dxScreen: number,
  dyScreen: number,
  canvasScale: number,
  iframeZoom: number,
): Delta {
  assertFinitePositive(canvasScale, "canvasScale")
  assertFinitePositive(iframeZoom, "iframeZoom")
  const factor = canvasScale * iframeZoom
  return {
    dx: dxScreen / factor,
    dy: dyScreen / factor,
  }
}

/**
 * Translate a viewport point into an iframe-document point.
 *
 * Inverse of {@link iframeLocalPointToScreen}. Used for hit-testing or for
 * mapping where the cursor *started* inside the iframe document at drag-begin.
 */
export function screenPointToIframeLocal(point: Point, anchor: IframeAnchor): Point {
  assertFinitePositive(anchor.zoom, "iframeZoom")
  return {
    x: (point.x - anchor.rect.left) / anchor.zoom,
    y: (point.y - anchor.rect.top) / anchor.zoom,
  }
}

/**
 * Translate an iframe-document point into a viewport point.
 *
 * The iframe's screen rect already has the canvas scale baked in (the browser
 * computes the rect after every CSS transform on every ancestor), so we only
 * apply the iframe-internal zoom here.
 */
export function iframeLocalPointToScreen(point: Point, anchor: IframeAnchor): Point {
  return {
    x: anchor.rect.left + point.x * anchor.zoom,
    y: anchor.rect.top + point.y * anchor.zoom,
  }
}

/**
 * Anchor an iframe-local element rect (reported by the bridge) to viewport
 * coordinates so the overlay can render handles on top of it.
 */
export function iframeLocalRectToScreen(rect: ScreenRect, anchor: IframeAnchor): ScreenRect {
  return {
    left: anchor.rect.left + rect.left * anchor.zoom,
    top: anchor.rect.top + rect.top * anchor.zoom,
    width: rect.width * anchor.zoom,
    height: rect.height * anchor.zoom,
  }
}

function assertFinitePositive(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`canvasIframeCoordinates: ${name} must be a positive finite number (got ${value})`)
  }
}
