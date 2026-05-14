import { describe, expect, it } from "vitest"

import { cycleVariantIndex } from "../utils/canvasVariantCycle"

describe("cycleVariantIndex", () => {
  it("moves to the previous variant and clamps at zero", () => {
    expect(cycleVariantIndex(2, 4, "previous")).toBe(1)
    expect(cycleVariantIndex(0, 4, "previous")).toBe(0)
  })

  it("moves to the next variant and clamps at the upper bound", () => {
    expect(cycleVariantIndex(1, 4, "next")).toBe(2)
    expect(cycleVariantIndex(3, 4, "next")).toBe(3)
  })

  it("falls back safely for degenerate inputs", () => {
    expect(cycleVariantIndex(0, 0, "next")).toBe(0)
    expect(cycleVariantIndex(0, 1, "next")).toBe(0)
  })
})
