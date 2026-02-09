import { describe, expect, it } from "vitest"

import type { RelativeColorSpec } from "../types/colorCanvas"
import {
  applyRelativeChannel,
  isOutOfGamut,
  normalizeRelativeChroma,
  oklchToDisplayP3Css,
  oklchToLinearSrgb,
  parseDisplayP3,
  parseOklch,
  resolveRelativeOklch,
} from "../components/color-canvas/ColorCanvasPage"

describe("color canvas relative helpers", () => {
  it("normalizes chroma percentages into decimal values", () => {
    expect(normalizeRelativeChroma(25)).toBe(0.25)
    expect(normalizeRelativeChroma(-12)).toBe(-0.12)
    expect(normalizeRelativeChroma(0.18)).toBe(0.18)
  })

  it("applies relative channels with inherit, delta, and absolute modes", () => {
    expect(applyRelativeChannel(0.42, "inherit", 80, 100, (value) => value)).toBeCloseTo(0.42)
    expect(applyRelativeChannel(0.42, "delta", 8, 100, (value) => value)).toBeCloseTo(0.5)
    expect(applyRelativeChannel(0.42, "absolute", 75, 100, (value) => value)).toBeCloseTo(0.75)
  })

  it("resolves relative OKLCH specs including clamp and hue wrap", () => {
    const base = { l: 0.6, c: 0.14, h: 350, a: 0.9 }
    const spec: RelativeColorSpec = {
      lMode: "delta",
      lValue: 10,
      cMode: "delta",
      cValue: 8,
      hMode: "delta",
      hValue: 40,
      alphaMode: "delta",
      alphaValue: -20,
    }

    const next = resolveRelativeOklch(base, spec)
    expect(next.l).toBeCloseTo(0.7)
    expect(next.c).toBeCloseTo(0.22)
    expect(next.h).toBeCloseTo(30)
    expect(next.a).toBeCloseTo(0.7)

    const hardClamp = resolveRelativeOklch(base, {
      lMode: "absolute",
      lValue: 130,
      cMode: "absolute",
      cValue: -20,
      hMode: "absolute",
      hValue: -15,
      alphaMode: "absolute",
      alphaValue: 150,
    })
    expect(hardClamp.l).toBe(1)
    expect(hardClamp.c).toBe(0)
    expect(hardClamp.h).toBe(345)
    expect(hardClamp.a).toBe(1)
  })

  it("parses OKLCH strings with percent and numeric alpha", () => {
    expect(parseOklch("oklch(62% 0.17 210 / 80%)")).toEqual({
      l: 0.62,
      c: 0.17,
      h: 210,
      a: 0.8,
    })
    expect(parseOklch("oklch(0.62 0.17 210 / 0.8)")).toEqual({
      l: 0.62,
      c: 0.17,
      h: 210,
      a: 0.8,
    })
    expect(parseOklch("not-a-color")).toBeNull()
  })

  it("parses display-p3 color syntax and preserves alpha", () => {
    expect(parseDisplayP3("color(display-p3 0.2 0.3 0.4 / 0.5)")).toEqual({
      r: 0.2,
      g: 0.3,
      b: 0.4,
      a: 0.5,
    })
    expect(parseDisplayP3("color(display-p3 20% 30% 40%)")).toEqual({
      r: 0.2,
      g: 0.3,
      b: 0.4,
      a: 1,
    })
  })

  it("detects when OKLCH values are outside sRGB gamut", () => {
    const inGamut = oklchToLinearSrgb({ l: 0.6, c: 0.08, h: 220 })
    const outOfGamut = oklchToLinearSrgb({ l: 0.7, c: 0.35, h: 30 })

    expect(isOutOfGamut(inGamut)).toBe(false)
    expect(isOutOfGamut(outOfGamut)).toBe(true)
  })

  it("formats display-p3 output css from OKLCH", () => {
    const css = oklchToDisplayP3Css({ l: 0.7, c: 0.24, h: 320, a: 0.75 })
    expect(css.startsWith("color(display-p3 ")).toBe(true)
    expect(css.includes("/ 0.75")).toBe(true)
  })
})
