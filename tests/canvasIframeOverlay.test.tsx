// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { CanvasIframeOverlay } from "../components/canvas/CanvasIframeOverlay"

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

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  document.body.removeChild(container)
})

function render(node: React.ReactNode): void {
  act(() => {
    root.render(node)
  })
}

function findHandle(kind: string): HTMLElement {
  const el = container.querySelector(`[data-canvas-overlay-handle="${kind}"]`)
  if (!(el instanceof HTMLElement)) {
    throw new Error(`handle "${kind}" not found`)
  }
  return el
}

function dispatchPointer(
  el: HTMLElement,
  type: "pointerdown" | "pointermove" | "pointerup",
  clientX: number,
  clientY: number,
  pointerId = 1
): void {
  // jsdom doesn't ship PointerEvent — synthesize via MouseEvent + extra fields.
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX,
    clientY,
  }) as MouseEvent & { pointerId: number; pointerType: string }
  Object.defineProperty(event, "pointerId", { value: pointerId })
  Object.defineProperty(event, "pointerType", { value: "mouse" })
  act(() => {
    el.dispatchEvent(event)
  })
}

describe("CanvasIframeOverlay", () => {
  it("renders nothing when rect is null", () => {
    render(<CanvasIframeOverlay rect={null} />)
    expect(container.querySelector("[data-testid='canvas-iframe-overlay']")).toBeNull()
  })

  it("renders 8 resize handles + 1 move handle", () => {
    render(
      <CanvasIframeOverlay rect={{ left: 100, top: 50, width: 200, height: 80 }} />
    )
    expect(container.querySelectorAll("[data-canvas-overlay-handle]").length).toBe(9)
    expect(container.querySelector("[data-canvas-overlay-outline='true']")).toBeTruthy()
    for (const kind of ["nw", "n", "ne", "e", "se", "s", "sw", "w", "move"]) {
      expect(findHandle(kind)).toBeTruthy()
    }
  })

  it("positions the SE handle at the bottom-right corner of the rect", () => {
    render(
      <CanvasIframeOverlay rect={{ left: 100, top: 50, width: 200, height: 80 }} />
    )
    const se = findHandle("se")
    // SE handle is offset by half its size so the center sits on the corner.
    expect(se.style.left).toBe(`${200 - 5}px`)
    expect(se.style.top).toBe(`${80 - 5}px`)
  })

  it("positions the N handle at top-center", () => {
    render(
      <CanvasIframeOverlay rect={{ left: 100, top: 50, width: 200, height: 80 }} />
    )
    const n = findHandle("n")
    expect(n.style.left).toBe(`${100 - 5}px`)
    expect(n.style.top).toBe("-5px")
  })

  it("renders the move handle as a compact control instead of covering the whole selection", () => {
    render(
      <CanvasIframeOverlay rect={{ left: 100, top: 50, width: 200, height: 80 }} />
    )
    const move = findHandle("move")
    const outline = container.querySelector("[data-canvas-overlay-outline='true']") as HTMLElement
    expect(move.style.width).toBe("18px")
    expect(move.style.height).toBe("18px")
    expect(move.style.left).toBe("91px")
    expect(move.style.top).toBe("-9px")
    expect(outline.style.pointerEvents).toBe("none")
  })

  it("emits preview deltas on pointermove relative to drag start", () => {
    const onPreview = vi.fn()
    render(
      <CanvasIframeOverlay
        rect={{ left: 100, top: 50, width: 200, height: 80 }}
        onDragPreview={onPreview}
      />
    )
    const se = findHandle("se")
    // jsdom needs these to be valid functions; just no-op them.
    se.setPointerCapture = vi.fn()
    se.hasPointerCapture = vi.fn(() => true)
    se.releasePointerCapture = vi.fn()
    dispatchPointer(se, "pointerdown", 300, 130)
    dispatchPointer(se, "pointermove", 320, 140)
    dispatchPointer(se, "pointermove", 350, 200)
    expect(onPreview).toHaveBeenCalledTimes(2)
    expect(onPreview).toHaveBeenNthCalledWith(1, "se", { dx: 20, dy: 10 })
    expect(onPreview).toHaveBeenNthCalledWith(2, "se", { dx: 50, dy: 70 })
  })

  it("emits a commit delta on pointerup", () => {
    const onCommit = vi.fn()
    render(
      <CanvasIframeOverlay
        rect={{ left: 100, top: 50, width: 200, height: 80 }}
        onDragCommit={onCommit}
      />
    )
    const move = findHandle("move")
    move.setPointerCapture = vi.fn()
    move.hasPointerCapture = vi.fn(() => true)
    move.releasePointerCapture = vi.fn()
    dispatchPointer(move, "pointerdown", 200, 100)
    dispatchPointer(move, "pointermove", 220, 110)
    dispatchPointer(move, "pointerup", 230, 120)
    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(onCommit).toHaveBeenCalledWith("move", { dx: 30, dy: 20 })
  })

  it("ignores pointermove from a different pointerId than the active drag", () => {
    const onPreview = vi.fn()
    render(
      <CanvasIframeOverlay
        rect={{ left: 100, top: 50, width: 200, height: 80 }}
        onDragPreview={onPreview}
      />
    )
    const nw = findHandle("nw")
    nw.setPointerCapture = vi.fn()
    nw.hasPointerCapture = vi.fn(() => true)
    nw.releasePointerCapture = vi.fn()
    dispatchPointer(nw, "pointerdown", 100, 50, 1)
    dispatchPointer(nw, "pointermove", 200, 100, 2)
    expect(onPreview).not.toHaveBeenCalled()
  })

  it("clears drag state after commit (no stray moves emit)", () => {
    const onPreview = vi.fn()
    const onCommit = vi.fn()
    render(
      <CanvasIframeOverlay
        rect={{ left: 0, top: 0, width: 100, height: 50 }}
        onDragPreview={onPreview}
        onDragCommit={onCommit}
      />
    )
    const e = findHandle("e")
    e.setPointerCapture = vi.fn()
    e.hasPointerCapture = vi.fn(() => true)
    e.releasePointerCapture = vi.fn()
    dispatchPointer(e, "pointerdown", 100, 25)
    dispatchPointer(e, "pointerup", 150, 25)
    onPreview.mockClear()
    dispatchPointer(e, "pointermove", 200, 25)
    expect(onPreview).not.toHaveBeenCalled()
    expect(onCommit).toHaveBeenCalledOnce()
  })
})
