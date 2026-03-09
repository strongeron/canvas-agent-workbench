import { describe, expect, it } from "vitest"

import { getSupportedWebFontFamilies } from "../components/canvas/fontLoader"
import { FONT_PAIR_PRESETS, buildFontPairThemeVars, getFontPairById } from "../components/canvas/fontPairs"

describe("font pair presets", () => {
  it("contains 10 curated starter pairs with unique ids", () => {
    expect(FONT_PAIR_PRESETS).toHaveLength(10)
    const uniqueIds = new Set(FONT_PAIR_PRESETS.map((pair) => pair.id))
    expect(uniqueIds.size).toBe(FONT_PAIR_PRESETS.length)
  })

  it("resolves pair by id", () => {
    const pair = getFontPairById("manrope-inter")
    expect(pair).not.toBeNull()
    expect(pair?.label).toContain("Manrope")
  })

  it("builds theme vars from preset", () => {
    const pair = FONT_PAIR_PRESETS[0]
    const vars = buildFontPairThemeVars(pair)
    expect(vars["--font-family-display"]).toBe(pair.displayFamily)
    expect(vars["--font-family-sans"]).toBe(pair.bodyFamily)
  })

  it("extracts only allowlisted web-font families", () => {
    const supported = getSupportedWebFontFamilies(
      "\"Manrope\", \"Inter\", system-ui, sans-serif"
    )
    expect(supported).toEqual(["Manrope", "Inter"])
  })
})
