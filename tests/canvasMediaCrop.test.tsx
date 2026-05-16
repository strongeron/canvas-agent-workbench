// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import { CanvasMediaItem } from "../components/canvas/CanvasMediaItem"
import type { CanvasMediaItem as CanvasMediaItemType } from "../types/canvas"
import {
  CROP_MIN,
  FULL_CROP,
  applyClipHandleDrag,
  applyCropHandleDrag,
  cropToImageStyle,
  isFullCrop,
  normalizeCrop,
  type CanvasCropRect,
} from "../utils/canvasMediaCrop"

function expectCropClose(actual: CanvasCropRect, expected: CanvasCropRect) {
  expect(actual.x).toBeCloseTo(expected.x, 6)
  expect(actual.y).toBeCloseTo(expected.y, 6)
  expect(actual.w).toBeCloseTo(expected.w, 6)
  expect(actual.h).toBeCloseTo(expected.h, 6)
}

describe("normalizeCrop", () => {
  it("returns the full frame for undefined/null", () => {
    expect(normalizeCrop()).toEqual(FULL_CROP)
    expect(normalizeCrop(null)).toEqual(FULL_CROP)
  })

  it("clamps size to [CROP_MIN, 1] and keeps the window inside [0,1]", () => {
    expect(normalizeCrop({ x: 0.9, y: 0.9, w: 0.5, h: 0.5 })).toEqual({
      x: 0.5,
      y: 0.5,
      w: 0.5,
      h: 0.5,
    })
    const tiny = normalizeCrop({ x: 0, y: 0, w: 0.001, h: 0.001 })
    expect(tiny.w).toBe(CROP_MIN)
    expect(tiny.h).toBe(CROP_MIN)
  })

  it("coerces non-finite input to a valid window", () => {
    const c = normalizeCrop({ x: Number.NaN, y: Number.NaN, w: Number.NaN, h: Number.NaN })
    expect(Number.isFinite(c.x)).toBe(true)
    expect(c.w).toBeGreaterThanOrEqual(CROP_MIN)
  })
})

describe("isFullCrop", () => {
  it("is true for undefined and the identity window", () => {
    expect(isFullCrop()).toBe(true)
    expect(isFullCrop({ x: 0, y: 0, w: 1, h: 1 })).toBe(true)
  })

  it("is false once a real crop is set", () => {
    expect(isFullCrop({ x: 0.1, y: 0, w: 0.9, h: 1 })).toBe(false)
  })
})

describe("applyCropHandleDrag", () => {
  it("nw corner moves the top-left and keeps the bottom-right anchored", () => {
    const next = applyCropHandleDrag({
      crop: FULL_CROP,
      corner: "nw",
      dxFrac: 0.2,
      dyFrac: 0.1,
    })
    expectCropClose(next, { x: 0.2, y: 0.1, w: 0.8, h: 0.9 })
  })

  it("se corner grows width/height with the top-left anchored", () => {
    const next = applyCropHandleDrag({
      crop: { x: 0.1, y: 0.1, w: 0.4, h: 0.4 },
      corner: "se",
      dxFrac: 0.2,
      dyFrac: 0.3,
    })
    expectCropClose(next, { x: 0.1, y: 0.1, w: 0.6, h: 0.7 })
  })

  it("prevents the window from collapsing past CROP_MIN", () => {
    const next = applyCropHandleDrag({
      crop: { x: 0, y: 0, w: 0.3, h: 0.3 },
      corner: "se",
      dxFrac: -1,
      dyFrac: -1,
    })
    expect(next.w).toBeCloseTo(CROP_MIN, 6)
    expect(next.h).toBeCloseTo(CROP_MIN, 6)
    // top-left anchor unchanged
    expect(next.x).toBeCloseTo(0, 6)
    expect(next.y).toBeCloseTo(0, 6)
  })

  it("clamps a drag that would push an edge outside the source", () => {
    const next = applyCropHandleDrag({
      crop: { x: 0.5, y: 0.5, w: 0.4, h: 0.4 },
      corner: "se",
      dxFrac: 5,
      dyFrac: 5,
    })
    expect(next.x + next.w).toBeLessThanOrEqual(1.0001)
    expect(next.y + next.h).toBeLessThanOrEqual(1.0001)
  })
})

describe("cropToImageStyle", () => {
  it("returns an empty style for a full-frame crop", () => {
    expect(cropToImageStyle()).toEqual({})
    expect(cropToImageStyle(FULL_CROP)).toEqual({})
  })

  it("maps a crop window to an absolutely-positioned scaled image", () => {
    const style = cropToImageStyle({ x: 0.25, y: 0, w: 0.5, h: 0.5 })
    expect(style).toMatchObject({
      position: "absolute",
      width: "200%",
      height: "200%",
      left: "-50%",
      top: "0%",
      objectFit: "fill",
    })
  })
})

describe("applyClipHandleDrag", () => {
  it("moves the start edge and clamps to >= 0", () => {
    expect(
      applyClipHandleDrag({ startSec: 2, endSec: 8, durationSec: 10, edge: "start", deltaSec: -5 })
    ).toEqual({ startSec: 0, endSec: 8 })
  })

  it("moves the end edge and clamps to the duration", () => {
    expect(
      applyClipHandleDrag({ startSec: 2, endSec: 8, durationSec: 10, edge: "end", deltaSec: 5 })
    ).toEqual({ startSec: 2, endSec: 10 })
  })

  it("swaps when the dragged edge crosses the other", () => {
    const r = applyClipHandleDrag({
      startSec: 2,
      endSec: 8,
      durationSec: 10,
      edge: "start",
      deltaSec: 9,
    })
    expect(r.startSec).toBeLessThan(r.endSec)
  })

  it("enforces a minimum 0.05s gap", () => {
    const r = applyClipHandleDrag({
      startSec: 4,
      endSec: 4.01,
      durationSec: 10,
      edge: "end",
      deltaSec: -1,
    })
    expect(r.endSec - r.startSec).toBeGreaterThanOrEqual(0.05 - 1e-9)
  })

  it("treats a null endSec as the duration when known", () => {
    const r = applyClipHandleDrag({
      startSec: 3,
      endSec: null,
      durationSec: 12,
      edge: "start",
      deltaSec: 1,
    })
    expect(r).toEqual({ startSec: 4, endSec: 12 })
  })
})

const originalActEnvironmentDescriptor = Object.getOwnPropertyDescriptor(
  globalThis,
  "IS_REACT_ACT_ENVIRONMENT"
)
beforeAll(() => {
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
    configurable: true,
    writable: true,
    value: true,
  })
})
afterAll(() => {
  if (originalActEnvironmentDescriptor) {
    Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", originalActEnvironmentDescriptor)
  } else {
    delete (globalThis as { IS_REACT_ACT_ENVIRONMENT?: unknown }).IS_REACT_ACT_ENVIRONMENT
  }
})

interface Harness {
  container: HTMLDivElement
  root: Root
  cleanup: () => void
}

async function mount(element: React.ReactElement): Promise<Harness> {
  const container = document.createElement("div")
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(element)
  })
  await act(async () => {
    await Promise.resolve()
  })
  return {
    container,
    root,
    cleanup: () => {
      act(() => root.unmount())
      container.remove()
    },
  }
}

function makeMediaItem(overrides: Partial<CanvasMediaItemType> = {}): CanvasMediaItemType {
  return {
    id: "media-1",
    type: "media",
    position: { x: 0, y: 0 },
    size: { width: 400, height: 300 },
    rotation: 0,
    zIndex: 0,
    src: "https://example.com/photo.png",
    ...overrides,
  }
}

const noopProps = {
  onRemove: () => {},
  onDuplicate: () => {},
  onBringToFront: () => {},
  scale: 1,
  interactMode: false,
}

function fireMouse(target: EventTarget, type: string, x: number, y: number) {
  target.dispatchEvent(
    new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 })
  )
}

describe("CanvasMediaItem — crop handles (image)", () => {
  let harness: Harness | null = null
  afterEach(() => {
    harness?.cleanup()
    harness = null
  })

  it("renders 4 crop handles for a selected image", async () => {
    harness = await mount(
      <CanvasMediaItem
        item={makeMediaItem()}
        isSelected
        onSelect={() => {}}
        onUpdate={() => {}}
        {...noopProps}
      />
    )
    expect(harness.container.querySelectorAll("[data-canvas-crop-handle]").length).toBe(4)
  })

  it("does not render crop handles when not selected", async () => {
    harness = await mount(
      <CanvasMediaItem
        item={makeMediaItem()}
        isSelected={false}
        onSelect={() => {}}
        onUpdate={() => {}}
        {...noopProps}
      />
    )
    expect(harness.container.querySelectorAll("[data-canvas-crop-handle]").length).toBe(0)
  })

  it("dragging the SE crop handle calls onUpdate with a crop window", async () => {
    const onUpdate = vi.fn()
    harness = await mount(
      <CanvasMediaItem
        item={makeMediaItem({ crop: { x: 0, y: 0, w: 0.5, h: 0.5 } })}
        isSelected
        onSelect={() => {}}
        onUpdate={onUpdate}
        {...noopProps}
      />
    )
    const se = harness.container.querySelector(
      "[data-canvas-crop-handle='se']"
    ) as HTMLElement
    await act(async () => {
      fireMouse(se, "mousedown", 200, 150)
    })
    await act(async () => {
      fireMouse(document, "mousemove", 240, 150)
      fireMouse(document, "mouseup", 240, 150)
    })
    expect(onUpdate).toHaveBeenCalled()
    const arg = onUpdate.mock.calls.at(-1)?.[0]
    expect(arg.crop).toBeDefined()
    expect(typeof arg.crop.w).toBe("number")
    expect(arg.crop.w).toBeGreaterThan(0.5)
  })

  it("applies an absolute scaled style to the image when cropped", async () => {
    harness = await mount(
      <CanvasMediaItem
        item={makeMediaItem({ crop: { x: 0.25, y: 0, w: 0.5, h: 0.5 } })}
        isSelected={false}
        onSelect={() => {}}
        onUpdate={() => {}}
        {...noopProps}
      />
    )
    const img = harness.container.querySelector("img") as HTMLImageElement
    expect(img.style.position).toBe("absolute")
    expect(img.style.width).toBe("200%")
  })
})

describe("CanvasMediaItem — clip scrub bar (video)", () => {
  let harness: Harness | null = null
  afterEach(() => {
    harness?.cleanup()
    harness = null
  })

  it("renders a clip track with start/end handles for a selected native video", async () => {
    harness = await mount(
      <CanvasMediaItem
        item={makeMediaItem({ src: "https://example.com/clip.mp4", mediaKind: "video" })}
        isSelected
        onSelect={() => {}}
        onUpdate={() => {}}
        {...noopProps}
      />
    )
    expect(harness.container.querySelector("[data-canvas-clip-track]")).not.toBeNull()
    expect(harness.container.querySelector("[data-canvas-clip-handle='start']")).not.toBeNull()
    expect(harness.container.querySelector("[data-canvas-clip-handle='end']")).not.toBeNull()
  })

  it("does not render the clip track for an image", async () => {
    harness = await mount(
      <CanvasMediaItem
        item={makeMediaItem()}
        isSelected
        onSelect={() => {}}
        onUpdate={() => {}}
        {...noopProps}
      />
    )
    expect(harness.container.querySelector("[data-canvas-clip-track]")).toBeNull()
  })

  it("dragging the end clip handle calls onUpdate with clip seconds", async () => {
    const onUpdate = vi.fn()
    harness = await mount(
      <CanvasMediaItem
        item={makeMediaItem({
          src: "https://example.com/clip.mp4",
          mediaKind: "video",
          clipStartSec: 1,
          clipEndSec: 5,
        })}
        isSelected
        onSelect={() => {}}
        onUpdate={onUpdate}
        {...noopProps}
      />
    )
    const end = harness.container.querySelector(
      "[data-canvas-clip-handle='end']"
    ) as HTMLElement
    await act(async () => {
      fireMouse(end, "mousedown", 300, 280)
    })
    await act(async () => {
      fireMouse(document, "mousemove", 260, 280)
      fireMouse(document, "mouseup", 260, 280)
    })
    expect(onUpdate).toHaveBeenCalled()
    const arg = onUpdate.mock.calls.at(-1)?.[0]
    expect(typeof arg.clipStartSec).toBe("number")
    expect(typeof arg.clipEndSec).toBe("number")
    expect(arg.clipStartSec).toBeLessThanOrEqual(arg.clipEndSec)
  })
})
