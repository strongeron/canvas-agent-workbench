import { describe, expect, it } from "vitest"

import {
  TAILWIND_DEFAULT_SIZE_SCALE,
  formatSizeClass,
  nearestSnap,
} from "../utils/tailwindSnapTable"

describe("TAILWIND_DEFAULT_SIZE_SCALE", () => {
  it("is sorted ascending by px", () => {
    for (let i = 1; i < TAILWIND_DEFAULT_SIZE_SCALE.length; i += 1) {
      expect(TAILWIND_DEFAULT_SIZE_SCALE[i].px).toBeGreaterThanOrEqual(
        TAILWIND_DEFAULT_SIZE_SCALE[i - 1].px
      )
    }
  })

  it("includes the canonical Tailwind anchor entries", () => {
    const byToken = new Map(TAILWIND_DEFAULT_SIZE_SCALE.map((e) => [e.token, e.px]))
    expect(byToken.get("0")).toBe(0)
    expect(byToken.get("px")).toBe(1)
    expect(byToken.get("1")).toBe(4)
    expect(byToken.get("4")).toBe(16)
    expect(byToken.get("16")).toBe(64)
    expect(byToken.get("96")).toBe(384)
  })
})

describe("nearestSnap", () => {
  it("returns exact match when px is in the table", () => {
    expect(nearestSnap(16)).toEqual({ token: "4", px: 16 })
    expect(nearestSnap(0)).toEqual({ token: "0", px: 0 })
    expect(nearestSnap(384)).toEqual({ token: "96", px: 384 })
  })

  it("snaps to the closest entry below the next anchor", () => {
    // halfway between 16 (w-4) and 20 (w-5) — 17 is closer to 16
    expect(nearestSnap(17).token).toBe("4")
    expect(nearestSnap(19).token).toBe("5")
  })

  it("ties between two entries resolve to the smaller one (first match wins)", () => {
    // 18 is exactly between 16 and 20 — first match scan picks 16.
    expect(nearestSnap(18).token).toBe("4")
  })

  it("clamps non-finite input to 0", () => {
    expect(nearestSnap(NaN).token).toBe("0")
    expect(nearestSnap(Infinity).token).toBe("0")
    expect(nearestSnap(-Infinity).token).toBe("0")
  })

  it("clamps negative input to 0", () => {
    expect(nearestSnap(-100).token).toBe("0")
  })

  it("snaps to the largest entry when input exceeds the scale", () => {
    expect(nearestSnap(10000).token).toBe("96")
  })

  it("throws on empty scale (programmer error, not user error)", () => {
    expect(() => nearestSnap(10, [])).toThrow(/non-empty/)
  })
})

describe("formatSizeClass", () => {
  it("formats numeric tokens with the prefix", () => {
    expect(formatSizeClass("w", { token: "4", px: 16 })).toBe("w-4")
    expect(formatSizeClass("h", { token: "32", px: 128 })).toBe("h-32")
  })

  it("formats fractional tokens", () => {
    expect(formatSizeClass("w", { token: "0.5", px: 2 })).toBe("w-0.5")
  })

  it("formats the px token (1px special case)", () => {
    expect(formatSizeClass("h", { token: "px", px: 1 })).toBe("h-px")
  })
})
