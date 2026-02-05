import { describe, expect, it } from "vitest"

import { apcaContrast, parseColor } from "../utils/apca"

describe("apca utils", () => {
  it("parses hex colors", () => {
    expect(parseColor("#fff")).toMatchObject({ r: 1, g: 1, b: 1, a: 1 })
    expect(parseColor("#000000")).toMatchObject({ r: 0, g: 0, b: 0, a: 1 })
  })

  it("computes contrast for high-contrast pairs", () => {
    const value = apcaContrast("rgb(0 0 0)", "rgb(255 255 255)")
    expect(value).not.toBeNull()
    expect(Math.abs(value ?? 0)).toBeGreaterThan(50)
  })
})
