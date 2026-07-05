import { describe, expect, it } from "vitest"

import {
  computeLayoutContentHeight,
  computeLayoutHeightOverflow,
} from "../utils/canvasLayoutMetrics"

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
