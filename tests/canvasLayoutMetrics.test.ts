import { describe, expect, it } from "vitest"

import {
  computeLayoutContentHeight,
  computeLayoutHeightOverflow,
  resolveLayoutChildShellStyle,
} from "../utils/canvasLayoutMetrics"
import type { CanvasItem } from "../types/canvas"

const child = (height: number) => ({ size: { width: 100, height } })

describe("canvas layout metrics", () => {
  it("sums flex-column children with gap and padding", () => {
    const container = {
      layout: { display: "flex" as const, direction: "column" as const, gap: 24, padding: 32 },
    }
    expect(computeLayoutContentHeight(container, [child(200), child(300)])).toBe(
      200 + 300 + 24 + 64
    )
  })

  it("takes the tallest child for flex-row", () => {
    const container = {
      layout: { display: "flex" as const, direction: "row" as const, gap: 24, padding: 16 },
    }
    expect(computeLayoutContentHeight(container, [child(120), child(340)])).toBe(340 + 32)
  })

  it("sums row maxima for grid layouts", () => {
    const container = {
      layout: { display: "grid" as const, columns: 2, gap: 16, padding: 24 },
    }
    // rows: [200, 340] -> 340; [90] -> 90; + gap + padding*2
    expect(
      computeLayoutContentHeight(container, [child(200), child(340), child(90)])
    ).toBe(340 + 90 + 16 + 48)
  })

  it("rounds fractional child heights instead of persisting fractions", () => {
    const container = {
      layout: { display: "flex" as const, direction: "column" as const, gap: 0, padding: 0 },
    }
    expect(computeLayoutContentHeight(container, [child(874.8407805456532)])).toBe(875)
  })

  it("renders component shells at intrinsic fit-content under hug (FOX2-57)", () => {
    const stretchParent = { display: "flex" as const, align: "stretch" as const }
    const componentChild = (layoutSizing?: CanvasItem["layoutSizing"]) =>
      ({
        type: "component",
        size: { width: 220, height: 60 },
        layoutSizing,
      }) as unknown as Pick<CanvasItem, "type" | "size" | "layoutSizing">

    // Unset mode: components hug (not fill), even in stretch/grid parents.
    expect(resolveLayoutChildShellStyle(componentChild(undefined), stretchParent)).toEqual({
      width: "fit-content",
      height: "fit-content",
    })
    // Explicit hug: intrinsic.
    expect(
      resolveLayoutChildShellStyle(componentChild({ width: "hug", height: "hug" }), stretchParent)
    ).toEqual({ width: "fit-content", height: "fit-content" })
    // Fixed: stored px.
    expect(
      resolveLayoutChildShellStyle(
        componentChild({ width: "fixed", height: "fixed" }),
        stretchParent
      )
    ).toEqual({ width: 220, height: 60 })
    // Fill stays opt-in.
    expect(
      resolveLayoutChildShellStyle(componentChild({ width: "fill", height: "hug" }), stretchParent)
    ).toEqual({ width: "100%", height: "fit-content" })
  })

  it("keeps non-component shell semantics, including fill-by-default in stretch parents", () => {
    const stretchParent = { display: "flex" as const, align: "stretch" as const }
    const sectionChild = (layoutSizing?: CanvasItem["layoutSizing"]) =>
      ({
        type: "section",
        size: { width: 896, height: 376 },
        layoutSizing,
      }) as unknown as Pick<CanvasItem, "type" | "size" | "layoutSizing">

    expect(resolveLayoutChildShellStyle(sectionChild(undefined), stretchParent)).toEqual({
      width: "100%",
      height: 376,
    })
    expect(
      resolveLayoutChildShellStyle(sectionChild({ width: "hug", height: "hug" }), stretchParent)
    ).toEqual({ width: 896, height: 376 })
    expect(
      resolveLayoutChildShellStyle(sectionChild({ width: "fixed", height: "fill" }), stretchParent)
    ).toEqual({ width: 896, height: "100%" })
  })

  it("reports height overflow against the explicit container height", () => {
    const container = {
      layout: { display: "flex" as const, direction: "column" as const, gap: 0, padding: 32 },
      size: { width: 960, height: 950.84 },
    }
    // content: 2000 + 64 = 2064; container rounds to 951
    expect(computeLayoutHeightOverflow(container, [child(2000)])).toBe(2064 - 951)
    expect(computeLayoutHeightOverflow(container, [child(400)])).toBeLessThanOrEqual(0)
    expect(computeLayoutHeightOverflow(container, [])).toBe(0)
  })
})
