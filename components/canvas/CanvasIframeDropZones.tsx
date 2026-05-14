import type React from "react"

// Pure render layer for U4b drop-target visualization. Sits absolutely
// positioned over the iframe; the consumer passes coordinates already
// translated from iframe-local to screen via canvasIframeCoordinates.
//
// For non-leaf parents, renders N+1 insert lines (where N = sibling count):
// one before each sibling and one after the last. Flow orientation is
// inferred from the first two adjacent siblings — y-range overlap means
// row (horizontal flow → vertical lines), no overlap means column
// (vertical flow → horizontal lines). With a single sibling we fall
// back to vertical flow (the common Tailwind/flex column case).
//
// For leaf parents (no element children) renders a dashed "Wrap" bounding
// rect over the parent's full extent. Dropping there means wrapSelection.

export interface CanvasDropZoneRect {
  left: number
  top: number
  width: number
  height: number
}

export interface CanvasDropZoneSibling {
  canvasId: string
  rect: CanvasDropZoneRect
  /** Position in parent's element-children list (matches insertChild position). */
  index: number
}

export interface CanvasDropZoneInsertPoint {
  /** Parent index for the insertChild mutation — node lands BEFORE this index. */
  index: number
  /** Screen-coord rect of the insert line itself. */
  line: CanvasDropZoneRect
  orientation: "horizontal" | "vertical"
}

export interface CanvasIframeDropZonesProps {
  parentCanvasId: string | null
  parentRect: CanvasDropZoneRect | null
  siblings: CanvasDropZoneSibling[]
  leaf: boolean
  onInsert?: (input: { parentCanvasId: string; index: number }) => void
  onWrap?: (input: { canvasId: string }) => void
}

const LINE_THICKNESS = 2

/**
 * Pure: given a parent rect + sibling rects, returns the screen-coord
 * insert-line rects and their target indices. Exported for tests and for
 * the dispatcher in slice 3.3 (which needs to map a drop point to an
 * insert index without rendering).
 */
export function computeDropZoneInsertLines(
  parentRect: CanvasDropZoneRect,
  siblings: CanvasDropZoneSibling[]
): CanvasDropZoneInsertPoint[] {
  if (siblings.length === 0) return []
  const orientation: "horizontal" | "vertical" =
    siblings.length >= 2
      ? detectFlowOrientation(siblings[0].rect, siblings[1].rect)
      : "vertical"
  const lines: CanvasDropZoneInsertPoint[] = []
  if (orientation === "vertical") {
    lines.push({
      index: siblings[0].index,
      orientation,
      line: {
        left: parentRect.left,
        top: siblings[0].rect.top - LINE_THICKNESS / 2,
        width: parentRect.width,
        height: LINE_THICKNESS,
      },
    })
    for (let i = 1; i < siblings.length; i++) {
      const prev = siblings[i - 1].rect
      const cur = siblings[i].rect
      const midTop = (prev.top + prev.height + cur.top) / 2
      lines.push({
        index: siblings[i].index,
        orientation,
        line: {
          left: parentRect.left,
          top: midTop - LINE_THICKNESS / 2,
          width: parentRect.width,
          height: LINE_THICKNESS,
        },
      })
    }
    const last = siblings[siblings.length - 1]
    lines.push({
      index: last.index + 1,
      orientation,
      line: {
        left: parentRect.left,
        top: last.rect.top + last.rect.height - LINE_THICKNESS / 2,
        width: parentRect.width,
        height: LINE_THICKNESS,
      },
    })
    return lines
  }
  lines.push({
    index: siblings[0].index,
    orientation,
    line: {
      left: siblings[0].rect.left - LINE_THICKNESS / 2,
      top: parentRect.top,
      width: LINE_THICKNESS,
      height: parentRect.height,
    },
  })
  for (let i = 1; i < siblings.length; i++) {
    const prev = siblings[i - 1].rect
    const cur = siblings[i].rect
    const midLeft = (prev.left + prev.width + cur.left) / 2
    lines.push({
      index: siblings[i].index,
      orientation,
      line: {
        left: midLeft - LINE_THICKNESS / 2,
        top: parentRect.top,
        width: LINE_THICKNESS,
        height: parentRect.height,
      },
    })
  }
  const last = siblings[siblings.length - 1]
  lines.push({
    index: last.index + 1,
    orientation,
    line: {
      left: last.rect.left + last.rect.width - LINE_THICKNESS / 2,
      top: parentRect.top,
      width: LINE_THICKNESS,
      height: parentRect.height,
    },
  })
  return lines
}

function detectFlowOrientation(
  a: CanvasDropZoneRect,
  b: CanvasDropZoneRect
): "horizontal" | "vertical" {
  const aBottom = a.top + a.height
  const bBottom = b.top + b.height
  const yOverlap = !(b.top >= aBottom || a.top >= bBottom)
  return yOverlap ? "horizontal" : "vertical"
}

export function CanvasIframeDropZones({
  parentCanvasId,
  parentRect,
  siblings,
  leaf,
  onInsert,
  onWrap,
}: CanvasIframeDropZonesProps): React.JSX.Element | null {
  if (!parentRect || !parentCanvasId) return null

  if (leaf) {
    return (
      <div
        data-testid="canvas-iframe-drop-zone-wrap"
        data-canvas-drop-wrap-canvas-id={parentCanvasId}
        onDragOver={(event) => {
          event.preventDefault()
          event.dataTransfer.dropEffect = "copy"
        }}
        onDrop={(event) => {
          event.preventDefault()
          onWrap?.({ canvasId: parentCanvasId })
        }}
        style={{
          position: "absolute",
          left: parentRect.left,
          top: parentRect.top,
          width: parentRect.width,
          height: parentRect.height,
          border: "2px dashed rgb(99, 102, 241)",
          backgroundColor: "rgba(99, 102, 241, 0.06)",
          pointerEvents: "auto",
          zIndex: 30,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 4,
            left: 4,
            padding: "2px 6px",
            fontSize: 10,
            fontWeight: 600,
            color: "white",
            backgroundColor: "rgb(99, 102, 241)",
            borderRadius: 2,
            pointerEvents: "none",
          }}
        >
          Wrap
        </div>
      </div>
    )
  }

  const lines = computeDropZoneInsertLines(parentRect, siblings)
  return (
    <div
      data-testid="canvas-iframe-drop-zones"
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: 0,
        height: 0,
        pointerEvents: "none",
        zIndex: 30,
      }}
    >
      {lines.map((line) => (
        <div
          key={line.index}
          data-canvas-drop-zone-index={line.index}
          data-canvas-drop-zone-orientation={line.orientation}
          onDragOver={(event) => {
            event.preventDefault()
            event.dataTransfer.dropEffect = "copy"
          }}
          onDrop={(event) => {
            event.preventDefault()
            onInsert?.({ parentCanvasId, index: line.index })
          }}
          style={{
            position: "absolute",
            left: line.line.left,
            top: line.line.top,
            width: line.line.width,
            height: line.line.height,
            backgroundColor: "rgb(99, 102, 241)",
            pointerEvents: "auto",
          }}
        />
      ))}
    </div>
  )
}
