import { describe, expect, it } from "vitest"

import { computeResizeStyleFallback } from "../utils/canvasResizeStyleMutation"

describe("computeResizeStyleFallback", () => {
  it("writes px width+height for an SE drag, merged with existing style", () => {
    const m = computeResizeStyleFallback({
      kind: "se",
      delta: { dx: 20, dy: 30 },
      rect: { width: 100, height: 40 },
      style: "color: red; padding: 4px",
    })
    expect(m).toEqual({
      type: "setAttribute",
      attrName: "style",
      value: "color: red; padding: 4px; width: 120px; height: 70px",
    })
  })

  it("overwrites an existing width declaration in place", () => {
    const m = computeResizeStyleFallback({
      kind: "e",
      delta: { dx: 10, dy: 0 },
      rect: { width: 100, height: 40 },
      style: "width: 100px; color: blue",
    })
    expect(m?.value).toBe("width: 110px; color: blue")
  })

  it("grows width with -dx for a west handle", () => {
    const m = computeResizeStyleFallback({
      kind: "w",
      delta: { dx: -15, dy: 0 },
      rect: { width: 100, height: 40 },
      style: "",
    })
    expect(m?.value).toBe("width: 115px")
  })

  it("returns null for the move handle", () => {
    expect(
      computeResizeStyleFallback({
        kind: "move",
        delta: { dx: 10, dy: 10 },
        rect: { width: 100, height: 40 },
        style: "",
      })
    ).toBeNull()
  })

  it("returns null when nothing actually changes", () => {
    expect(
      computeResizeStyleFallback({
        kind: "e",
        delta: { dx: 0, dy: 0 },
        rect: { width: 100, height: 40 },
        style: "",
      })
    ).toBeNull()
  })

  it("returns null for non-finite deltas", () => {
    expect(
      computeResizeStyleFallback({
        kind: "se",
        delta: { dx: Number.NaN, dy: 5 },
        rect: { width: 100, height: 40 },
        style: "",
      })
    ).toBeNull()
  })

  it("clamps to a 1px minimum", () => {
    const m = computeResizeStyleFallback({
      kind: "e",
      delta: { dx: -500, dy: 0 },
      rect: { width: 100, height: 40 },
      style: "",
    })
    expect(m?.value).toBe("width: 1px")
  })
})
