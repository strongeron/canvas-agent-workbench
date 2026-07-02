import type React from "react"
import { useRef } from "react"

// 8 corner/edge resize handles + 1 center-of-element drag handle.
// Pointer math is done by the consumer using utils/canvasIframeCoordinates.
// This component only emits screen-coord deltas relative to drag start.

export type CanvasOverlayResizeHandle =
  | "nw"
  | "n"
  | "ne"
  | "e"
  | "se"
  | "s"
  | "sw"
  | "w"

export type CanvasOverlayDragKind = CanvasOverlayResizeHandle | "move"

export interface CanvasOverlayRect {
  left: number
  top: number
  width: number
  height: number
}

export interface CanvasOverlayDelta {
  dx: number
  dy: number
}

export interface CanvasIframeOverlayProps {
  /**
   * Selection rect in viewport (screen) coordinates. Pass null to hide.
   * Consumers anchoring to iframe-local element rects should convert via
   * `iframeLocalRectToScreen` from utils/canvasIframeCoordinates.
   */
  rect: CanvasOverlayRect | null
  /** Live screen-coord delta from drag-start. Fires on every pointermove. */
  onDragPreview?: (kind: CanvasOverlayDragKind, delta: CanvasOverlayDelta) => void
  /** Final screen-coord delta from drag-start. Fires once on pointerup. */
  onDragCommit?: (kind: CanvasOverlayDragKind, delta: CanvasOverlayDelta) => void
}

interface HandleSpec {
  kind: CanvasOverlayDragKind
  cursor: string
  /** position relative to the rect, in [0..1] for each axis */
  ax: number
  ay: number
}

const RESIZE_HANDLES: HandleSpec[] = [
  { kind: "nw", cursor: "nwse-resize", ax: 0, ay: 0 },
  { kind: "n", cursor: "ns-resize", ax: 0.5, ay: 0 },
  { kind: "ne", cursor: "nesw-resize", ax: 1, ay: 0 },
  { kind: "e", cursor: "ew-resize", ax: 1, ay: 0.5 },
  { kind: "se", cursor: "nwse-resize", ax: 1, ay: 1 },
  { kind: "s", cursor: "ns-resize", ax: 0.5, ay: 1 },
  { kind: "sw", cursor: "nesw-resize", ax: 0, ay: 1 },
  { kind: "w", cursor: "ew-resize", ax: 0, ay: 0.5 },
]

const HANDLE_SIZE = 10
const MOVE_HANDLE_SIZE = 18

interface DragState {
  kind: CanvasOverlayDragKind
  startX: number
  startY: number
  pointerId: number
}

export function CanvasIframeOverlay({
  rect,
  onDragPreview,
  onDragCommit,
}: CanvasIframeOverlayProps): React.JSX.Element | null {
  // Drag state lives in a ref so pointermove handlers can read it without
  // re-rendering on every frame. The overlay is purely a controlled view.
  const dragRef = useRef<DragState | null>(null)

  if (!rect) return null

  function beginDrag(kind: CanvasOverlayDragKind) {
    return (event: React.PointerEvent<HTMLDivElement>) => {
      event.stopPropagation()
      // Canceling pointerdown suppresses the compatibility mousedown the
      // browser would fire next — otherwise that mousedown bubbles to the
      // item wrapper's onMouseDown and starts an item move/resize underneath
      // the element drag (whole node moves while a handle is dragged).
      event.preventDefault()
      // setPointerCapture lets us keep getting pointermove even when the
      // cursor leaves the handle (or the iframe boundary).
      event.currentTarget.setPointerCapture(event.pointerId)
      dragRef.current = {
        kind,
        startX: event.clientX,
        startY: event.clientY,
        pointerId: event.pointerId,
      }
    }
  }

  // Some engines fire compatibility mouse events even for a canceled
  // pointerdown; keep them from reaching the item wrapper either way.
  function stopMouseDown(event: React.MouseEvent<HTMLDivElement>) {
    event.stopPropagation()
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    onDragPreview?.(drag.kind, {
      dx: event.clientX - drag.startX,
      dy: event.clientY - drag.startY,
    })
  }

  function endDrag(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const delta = {
      dx: event.clientX - drag.startX,
      dy: event.clientY - drag.startY,
    }
    dragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    onDragCommit?.(drag.kind, delta)
  }

  return (
    <div
      data-testid="canvas-iframe-overlay"
      style={{
        position: "absolute",
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        // The container itself is transparent to pointer events so clicks on
        // the iframe area between handles still reach the iframe; only the
        // handles re-enable pointer events.
        pointerEvents: "none",
        zIndex: 20,
      }}
    >
      <div
        data-canvas-overlay-outline="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          border: "1px solid rgb(96 165 250)",
          background: "transparent",
        }}
      />
      <div
        data-canvas-overlay-handle="move"
        onPointerDown={beginDrag("move")}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onMouseDown={stopMouseDown}
        style={{
          position: "absolute",
          left: Math.max(0, rect.width / 2 - MOVE_HANDLE_SIZE / 2),
          top: -MOVE_HANDLE_SIZE / 2,
          width: MOVE_HANDLE_SIZE,
          height: MOVE_HANDLE_SIZE,
          cursor: "move",
          pointerEvents: "auto",
          background: "white",
          border: "1px solid rgb(96 165 250)",
          borderRadius: 999,
          boxSizing: "border-box",
          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.15)",
        }}
      />
      {RESIZE_HANDLES.map((spec) => (
        <div
          key={spec.kind}
          data-canvas-overlay-handle={spec.kind}
          onPointerDown={beginDrag(spec.kind)}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onMouseDown={stopMouseDown}
          style={{
            position: "absolute",
            left: rect.width * spec.ax - HANDLE_SIZE / 2,
            top: rect.height * spec.ay - HANDLE_SIZE / 2,
            width: HANDLE_SIZE,
            height: HANDLE_SIZE,
            cursor: spec.cursor,
            pointerEvents: "auto",
            background: "white",
            border: "1px solid rgb(96 165 250)",
            borderRadius: 2,
            boxSizing: "border-box",
          }}
        />
      ))}
    </div>
  )
}
