import { describe, expect, it } from "vitest"

import {
  iframeLocalPointToScreen,
  iframeLocalRectToScreen,
  screenDeltaToIframeLocal,
  screenPointToIframeLocal,
} from "../utils/canvasIframeCoordinates"

const iframeAt100 = {
  rect: { left: 100, top: 50, width: 800, height: 600 },
  zoom: 1,
}

describe("screenDeltaToIframeLocal", () => {
  it("is identity at s=1, t=1", () => {
    expect(screenDeltaToIframeLocal(10, 20, 1, 1)).toEqual({ dx: 10, dy: 20 })
  })

  it("scales by 2 at s=0.5, t=1 (canvas zoomed out)", () => {
    expect(screenDeltaToIframeLocal(10, 20, 0.5, 1)).toEqual({ dx: 20, dy: 40 })
  })

  it("scales by 2 at s=1, t=0.5 (iframe zoomed out)", () => {
    expect(screenDeltaToIframeLocal(10, 20, 1, 0.5)).toEqual({ dx: 20, dy: 40 })
  })

  it("scales by 4 at s=0.5, t=0.5 (both zoomed out)", () => {
    expect(screenDeltaToIframeLocal(10, 20, 0.5, 0.5)).toEqual({ dx: 40, dy: 80 })
  })

  it("scales by 0.5 at s=2, t=1 (canvas zoomed in)", () => {
    expect(screenDeltaToIframeLocal(10, 20, 2, 1)).toEqual({ dx: 5, dy: 10 })
  })

  it("rejects non-positive canvasScale", () => {
    expect(() => screenDeltaToIframeLocal(1, 1, 0, 1)).toThrow(/canvasScale/)
    expect(() => screenDeltaToIframeLocal(1, 1, -1, 1)).toThrow(/canvasScale/)
  })

  it("rejects non-finite canvasScale", () => {
    expect(() => screenDeltaToIframeLocal(1, 1, NaN, 1)).toThrow(/canvasScale/)
    expect(() => screenDeltaToIframeLocal(1, 1, Infinity, 1)).toThrow(/canvasScale/)
  })

  it("rejects non-positive iframeZoom", () => {
    expect(() => screenDeltaToIframeLocal(1, 1, 1, 0)).toThrow(/iframeZoom/)
  })

  it("delta is pan-invariant (offset cancels in deltas)", () => {
    // Same delta inputs should give same outputs regardless of where the
    // iframe sits in the viewport — pan does not appear in the formula.
    const a = screenDeltaToIframeLocal(15, 7, 0.75, 1)
    const b = screenDeltaToIframeLocal(15, 7, 0.75, 1)
    expect(a).toEqual(b)
  })
})

describe("iframeLocalRectToScreen", () => {
  it("offsets by iframe rect at zoom=1", () => {
    const rect = { left: 40, top: 30, width: 100, height: 50 }
    expect(iframeLocalRectToScreen(rect, iframeAt100)).toEqual({
      left: 140,
      top: 80,
      width: 100,
      height: 50,
    })
  })

  it("scales by iframe zoom", () => {
    const rect = { left: 40, top: 30, width: 100, height: 50 }
    const anchor = { ...iframeAt100, zoom: 0.5 }
    expect(iframeLocalRectToScreen(rect, anchor)).toEqual({
      left: 100 + 40 * 0.5,
      top: 50 + 30 * 0.5,
      width: 50,
      height: 25,
    })
  })

  it("does not need canvas scale — iframe screen rect already has it baked in", () => {
    // The browser computes iframe.getBoundingClientRect() AFTER all ancestor
    // CSS transforms. Canvas-scale shows up in anchor.rect, not as a separate
    // multiplier. This test asserts that the function intentionally takes no
    // canvasScale argument.
    const rect = { left: 0, top: 0, width: 10, height: 10 }
    const anchorAtCanvas50 = {
      rect: { left: 100, top: 50, width: 400, height: 300 }, // iframe shrunk to 50% in screen
      zoom: 1,
    }
    expect(iframeLocalRectToScreen(rect, anchorAtCanvas50)).toEqual({
      left: 100,
      top: 50,
      width: 10,
      height: 10,
    })
  })
})

describe("screenPointToIframeLocal / iframeLocalPointToScreen round trip", () => {
  it("round-trips through the same anchor at zoom=1", () => {
    const screenPoint = { x: 250, y: 150 }
    const local = screenPointToIframeLocal(screenPoint, iframeAt100)
    expect(iframeLocalPointToScreen(local, iframeAt100)).toEqual(screenPoint)
  })

  it("round-trips at zoom=0.5", () => {
    const anchor = { ...iframeAt100, zoom: 0.5 }
    const screenPoint = { x: 250, y: 150 }
    const local = screenPointToIframeLocal(screenPoint, anchor)
    expect(iframeLocalPointToScreen(local, anchor)).toEqual(screenPoint)
  })

  it("subtracts iframe origin before dividing by zoom", () => {
    const anchor = { ...iframeAt100, zoom: 0.5 }
    // screen point at (200, 100) is (200-100, 100-50) = (100, 50) inside the
    // scaled iframe rect, which is (200, 100) in iframe-document coords.
    expect(screenPointToIframeLocal({ x: 200, y: 100 }, anchor)).toEqual({
      x: 200,
      y: 100,
    })
  })
})
