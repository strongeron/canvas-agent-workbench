interface CanvasStructurePreviewLayout {
  display: "flex" | "grid"
  direction?: "row" | "column"
  gap?: number
  columns?: number
}

interface CanvasStructurePreviewProps {
  layout: CanvasStructurePreviewLayout
}

// Pure, presentational structural thumbnail. Given the artboard `layout` it
// renders N proportional CSS rectangles — never a live render, no data fetch.
//  - flex + row     → a single row of rectangles
//  - flex + column  → a single column of rectangles
//  - grid           → a `columns`-wide grid of rectangles
// The CSS `gap` mirrors the layout gap (clamped so the thumbnail stays legible).
export function CanvasStructurePreview({ layout }: CanvasStructurePreviewProps) {
  const isGrid = layout.display === "grid"
  const columns = isGrid ? Math.max(1, Math.min(5, layout.columns ?? 2)) : 1
  const direction = layout.direction === "row" ? "row" : "column"
  // Clamp the structural gap into a small legible range for the thumbnail.
  const gapPx = Math.max(2, Math.min(10, Math.round((layout.gap ?? 16) / 4)))

  // Rectangle count: grid shows two rows worth of cells; flex shows a small
  // deterministic count so row vs column orientation reads clearly.
  const cellCount = isGrid ? columns * 2 : 3

  const containerStyle: React.CSSProperties = isGrid
    ? {
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: gapPx,
      }
    : {
        display: "flex",
        flexDirection: direction,
        gap: gapPx,
      }

  return (
    <div
      data-testid="canvas-structure-preview"
      data-display={layout.display}
      data-direction={isGrid ? undefined : direction}
      data-columns={isGrid ? columns : undefined}
      data-cells={cellCount}
      role="img"
      aria-label={
        isGrid
          ? `Grid layout with ${columns} column${columns === 1 ? "" : "s"}`
          : `Flex layout, ${direction === "row" ? "row" : "column"} direction`
      }
      className="rounded-md border border-default bg-surface-50 p-2"
      style={{ height: 76 }}
    >
      <div className="h-full w-full" style={containerStyle}>
        {Array.from({ length: cellCount }).map((_, index) => (
          <div
            key={index}
            data-testid="canvas-structure-cell"
            className="rounded-sm border border-brand-200 bg-brand-100"
            style={
              isGrid
                ? { minHeight: 12 }
                : direction === "row"
                  ? { flex: "1 1 0", minWidth: 0 }
                  : { flex: "1 1 0", minHeight: 12 }
            }
          />
        ))}
      </div>
    </div>
  )
}
