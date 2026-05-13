import { describe, expect, it } from "vitest"

import {
  computeResizeMutation,
  replaceOrAppendSizeClass,
} from "../utils/canvasResizeMutation"

describe("computeResizeMutation", () => {
  const rect100x40 = { width: 100, height: 40 }

  it("returns null for move handles (out of scope for class-snap)", () => {
    expect(
      computeResizeMutation({
        kind: "move",
        delta: { dx: 50, dy: 50 },
        rect: rect100x40,
        className: "w-32 h-10 rounded",
      })
    ).toBeNull()
  })

  it("returns null for non-finite deltas", () => {
    expect(
      computeResizeMutation({
        kind: "se",
        delta: { dx: NaN, dy: 10 },
        rect: rect100x40,
        className: "w-32 h-10",
      })
    ).toBeNull()
  })

  it("snaps SE drag to next-larger width and height tokens", () => {
    // width: 100 + 28 = 128 → w-32 (px=128)
    // height: 40 + 24 = 64 → h-16 (px=64)
    expect(
      computeResizeMutation({
        kind: "se",
        delta: { dx: 28, dy: 24 },
        rect: rect100x40,
        className: "w-32 h-10 rounded",
      })
    ).toEqual({ type: "setClassName", value: "w-32 h-16 rounded" })
  })

  it("snaps W drag to a wider class (left edge moves left = -dx widens)", () => {
    // width: 100 - (-28) = 128 → w-32
    expect(
      computeResizeMutation({
        kind: "w",
        delta: { dx: -28, dy: 0 },
        rect: rect100x40,
        className: "w-24 h-10",
      })
    ).toEqual({ type: "setClassName", value: "w-32 h-10" })
  })

  it("snaps N drag to a taller height (top edge moves up = -dy heightens)", () => {
    // height: 40 - (-24) = 64 → h-16
    expect(
      computeResizeMutation({
        kind: "n",
        delta: { dx: 0, dy: -24 },
        rect: rect100x40,
        className: "w-24 h-10",
      })
    ).toEqual({ type: "setClassName", value: "w-24 h-16" })
  })

  it("E drag only affects width (height token untouched)", () => {
    expect(
      computeResizeMutation({
        kind: "e",
        delta: { dx: 28, dy: 200 }, // dy ignored
        rect: rect100x40,
        className: "w-24 h-10",
      })
    ).toEqual({ type: "setClassName", value: "w-32 h-10" })
  })

  it("S drag only affects height (width token untouched)", () => {
    expect(
      computeResizeMutation({
        kind: "s",
        delta: { dx: 200, dy: 24 }, // dx ignored
        rect: rect100x40,
        className: "w-24 h-10",
      })
    ).toEqual({ type: "setClassName", value: "w-24 h-16" })
  })

  it("returns null when the snapped class equals the current class (sub-snap drag)", () => {
    // width: 100 + 1 = 101 → still snaps to nearest 96 or 112, but className
    // already has w-24 (96px) so if 101 → 96 it's a no-op write... actually
    // 101 is closer to 96 than 112 so snap=96=w-24, matches current. No-op.
    expect(
      computeResizeMutation({
        kind: "e",
        delta: { dx: 1, dy: 0 },
        rect: { width: 96, height: 40 },
        className: "w-24 h-10",
      })
    ).toBeNull()
  })

  it("appends w-* / h-* when className has no existing size classes", () => {
    expect(
      computeResizeMutation({
        kind: "se",
        delta: { dx: 28, dy: 24 },
        rect: rect100x40,
        className: "rounded bg-blue-500",
      })
    ).toEqual({
      type: "setClassName",
      value: "rounded bg-blue-500 w-32 h-16",
    })
  })

  it("clamps negative dimensions to 0 instead of producing weird snaps", () => {
    // width: 100 - 200 = -100 → clamp to 0 → snap to w-0
    expect(
      computeResizeMutation({
        kind: "w",
        delta: { dx: 200, dy: 0 }, // sw drags right with +dx on w-handle → -200 width
        rect: rect100x40,
        className: "w-24 h-10",
      })
    ).toEqual({ type: "setClassName", value: "w-0 h-10" })
  })
})

describe("replaceOrAppendSizeClass", () => {
  it("replaces an existing w-N class", () => {
    expect(
      replaceOrAppendSizeClass("rounded w-4 bg-white", "w", { token: "8", px: 32 })
    ).toBe("rounded w-8 bg-white")
  })

  it("appends when the class is missing", () => {
    expect(
      replaceOrAppendSizeClass("rounded bg-white", "h", { token: "12", px: 48 })
    ).toBe("rounded bg-white h-12")
  })

  it("does not confuse w-N with min-w-N or max-w-N", () => {
    // The "w-32" within "min-w-32" should NOT be replaced because the regex
    // requires whitespace (or start) before the prefix.
    expect(
      replaceOrAppendSizeClass("min-w-32 bg-white", "w", { token: "4", px: 16 })
    ).toBe("min-w-32 bg-white w-4")
  })

  it("handles fractional tokens like w-1/2", () => {
    expect(
      replaceOrAppendSizeClass("w-1/2 bg-white", "w", { token: "8", px: 32 })
    ).toBe("w-8 bg-white")
  })

  it("collapses internal whitespace to single spaces", () => {
    expect(
      replaceOrAppendSizeClass("  rounded   w-4   bg-white  ", "w", {
        token: "8",
        px: 32,
      })
    ).toBe("rounded w-8 bg-white")
  })

  it("works on an empty className (only the new class is emitted)", () => {
    expect(
      replaceOrAppendSizeClass("", "w", { token: "8", px: 32 })
    ).toBe("w-8")
  })
})
