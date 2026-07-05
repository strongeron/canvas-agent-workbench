import type { CanvasArtboardItem, CanvasItem, CanvasSectionItem } from "../types/canvas"

type LayoutContainer = Pick<CanvasArtboardItem | CanvasSectionItem, "layout">

/**
 * Height the container's content occupies under its layout rules, from the
 * child items' persisted sizes — the same math the section inspector uses for
 * "hug". Rounded: measured/derived values must never persist fractions into
 * .canvas documents (FOX2-41).
 */
export function computeLayoutContentHeight(
  container: LayoutContainer,
  children: Array<Pick<CanvasItem, "size">>
): number {
  const padding = container.layout.padding ?? 0
  if (children.length === 0) return Math.round(padding * 2)
  const gap = container.layout.gap ?? 0

  if (container.layout.display === "grid") {
    const columns = Math.max(1, container.layout.columns ?? 1)
    const rowCount = Math.ceil(children.length / columns)
    const rowHeights = Array.from({ length: rowCount }, (_, rowIndex) => {
      const rowChildren = children.slice(rowIndex * columns, rowIndex * columns + columns)
      return Math.max(...rowChildren.map((child) => child.size.height), 0)
    })
    return Math.round(
      rowHeights.reduce((sum, height) => sum + height, 0) +
        Math.max(0, rowCount - 1) * gap +
        padding * 2
    )
  }

  if (container.layout.direction !== "row") {
    return Math.round(
      children.reduce((sum, child) => sum + child.size.height, 0) +
        Math.max(0, children.length - 1) * gap +
        padding * 2
    )
  }

  return Math.round(Math.max(...children.map((child) => child.size.height), 0) + padding * 2)
}

/**
 * Pixels by which the container's content overflows its explicit height.
 * Zero or negative means everything fits.
 */
export function computeLayoutHeightOverflow(
  container: LayoutContainer & Pick<CanvasArtboardItem, "size">,
  children: Array<Pick<CanvasItem, "size">>
): number {
  if (children.length === 0) return 0
  return computeLayoutContentHeight(container, children) - Math.round(container.size.height)
}
