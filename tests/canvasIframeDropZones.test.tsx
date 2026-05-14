// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import {
  CanvasIframeDropZones,
  computeDropZoneInsertLines,
  type CanvasDropZoneRect,
  type CanvasDropZoneSibling,
} from "../components/canvas/CanvasIframeDropZones"

const PARENT_RECT: CanvasDropZoneRect = { left: 100, top: 200, width: 400, height: 300 }

function sib(canvasId: string, index: number, rect: CanvasDropZoneRect): CanvasDropZoneSibling {
  return { canvasId, rect, index }
}

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
  return {
    container,
    root,
    cleanup: () => {
      act(() => {
        root.unmount()
      })
      container.remove()
    },
  }
}

function fakeDataTransfer(): DataTransfer {
  let dropEffectValue = "none"
  return {
    setData() {},
    getData() {
      return ""
    },
    get dropEffect() {
      return dropEffectValue
    },
    set dropEffect(value: string) {
      dropEffectValue = value
    },
  } as unknown as DataTransfer
}

describe("computeDropZoneInsertLines (pure)", () => {
  it("returns N+1 horizontal lines for a vertical (column) flow", () => {
    const siblings = [
      sib("c0", 0, { left: 100, top: 210, width: 400, height: 50 }),
      sib("c1", 1, { left: 100, top: 270, width: 400, height: 50 }),
      sib("c2", 2, { left: 100, top: 330, width: 400, height: 50 }),
    ]
    const lines = computeDropZoneInsertLines(PARENT_RECT, siblings)
    expect(lines).toHaveLength(4)
    expect(lines.map((line) => line.index)).toEqual([0, 1, 2, 3])
    for (const line of lines) {
      expect(line.orientation).toBe("vertical")
      expect(line.line.width).toBe(PARENT_RECT.width)
      expect(line.line.height).toBe(2)
    }
    expect(lines[1].line.top).toBeCloseTo((210 + 50 + 270) / 2 - 1, 5)
  })

  it("returns N+1 vertical lines for a horizontal (row) flow", () => {
    const siblings = [
      sib("c0", 0, { left: 110, top: 210, width: 80, height: 60 }),
      sib("c1", 1, { left: 200, top: 210, width: 80, height: 60 }),
      sib("c2", 2, { left: 290, top: 210, width: 80, height: 60 }),
    ]
    const lines = computeDropZoneInsertLines(PARENT_RECT, siblings)
    expect(lines).toHaveLength(4)
    expect(lines.map((line) => line.index)).toEqual([0, 1, 2, 3])
    for (const line of lines) {
      expect(line.orientation).toBe("horizontal")
      expect(line.line.height).toBe(PARENT_RECT.height)
      expect(line.line.width).toBe(2)
    }
    expect(lines[1].line.left).toBeCloseTo((110 + 80 + 200) / 2 - 1, 5)
  })

  it("falls back to vertical flow with a single sibling", () => {
    const siblings = [sib("c0", 0, { left: 100, top: 210, width: 400, height: 50 })]
    const lines = computeDropZoneInsertLines(PARENT_RECT, siblings)
    expect(lines).toHaveLength(2)
    expect(lines[0].orientation).toBe("vertical")
    expect(lines[0].index).toBe(0)
    expect(lines[1].index).toBe(1)
  })

  it("returns no lines when the parent has no element children", () => {
    expect(computeDropZoneInsertLines(PARENT_RECT, [])).toEqual([])
  })

  it("propagates non-zero sibling indices (parent has non-tagged children before siblings)", () => {
    const siblings = [
      sib("c0", 2, { left: 100, top: 210, width: 400, height: 50 }),
      sib("c1", 3, { left: 100, top: 270, width: 400, height: 50 }),
    ]
    const lines = computeDropZoneInsertLines(PARENT_RECT, siblings)
    expect(lines.map((line) => line.index)).toEqual([2, 3, 4])
  })
})

describe("CanvasIframeDropZones render", () => {
  let harness: Harness | null = null
  afterEach(() => {
    if (harness) {
      harness.cleanup()
      harness = null
    }
  })

  it("renders nothing when parentRect or parentCanvasId is null", async () => {
    harness = await mount(
      <CanvasIframeDropZones
        parentCanvasId={null}
        parentRect={PARENT_RECT}
        siblings={[]}
        leaf={false}
      />
    )
    expect(harness.container.querySelector("[data-testid]")).toBeNull()
  })

  it("renders one zone per insert line and dispatches onInsert on drop", async () => {
    const onInsert = vi.fn()
    const siblings = [
      sib("c0", 0, { left: 100, top: 210, width: 400, height: 50 }),
      sib("c1", 1, { left: 100, top: 270, width: 400, height: 50 }),
    ]
    harness = await mount(
      <CanvasIframeDropZones
        parentCanvasId="parent:0"
        parentRect={PARENT_RECT}
        siblings={siblings}
        leaf={false}
        onInsert={onInsert}
      />
    )
    const zones = harness.container.querySelectorAll<HTMLElement>(
      "[data-canvas-drop-zone-index]"
    )
    expect(zones).toHaveLength(3)
    const midZone = zones[1]
    expect(midZone.getAttribute("data-canvas-drop-zone-index")).toBe("1")
    await act(async () => {
      const event = new Event("drop", { bubbles: true, cancelable: true })
      Object.defineProperty(event, "dataTransfer", { value: fakeDataTransfer() })
      midZone.dispatchEvent(event)
    })
    expect(onInsert).toHaveBeenCalledWith({ parentCanvasId: "parent:0", index: 1 })
  })

  it("renders the wrap affordance for leaf parents and dispatches onWrap on drop", async () => {
    const onWrap = vi.fn()
    harness = await mount(
      <CanvasIframeDropZones
        parentCanvasId="leaf:0"
        parentRect={PARENT_RECT}
        siblings={[]}
        leaf
        onWrap={onWrap}
      />
    )
    const wrap = harness.container.querySelector<HTMLElement>(
      '[data-testid="canvas-iframe-drop-zone-wrap"]'
    )
    expect(wrap).not.toBeNull()
    if (!wrap) return
    expect(wrap.getAttribute("data-canvas-drop-wrap-canvas-id")).toBe("leaf:0")
    await act(async () => {
      const event = new Event("drop", { bubbles: true, cancelable: true })
      Object.defineProperty(event, "dataTransfer", { value: fakeDataTransfer() })
      wrap.dispatchEvent(event)
    })
    expect(onWrap).toHaveBeenCalledWith({ canvasId: "leaf:0" })
  })

  it("preventDefault + dropEffect=copy on dragover so the drop event fires", async () => {
    harness = await mount(
      <CanvasIframeDropZones
        parentCanvasId="parent:0"
        parentRect={PARENT_RECT}
        siblings={[sib("c0", 0, { left: 100, top: 210, width: 400, height: 50 })]}
        leaf={false}
        onInsert={vi.fn()}
      />
    )
    const zone = harness.container.querySelector<HTMLElement>("[data-canvas-drop-zone-index]")
    expect(zone).not.toBeNull()
    if (!zone) return
    const dt = fakeDataTransfer()
    const event = new Event("dragover", { bubbles: true, cancelable: true })
    Object.defineProperty(event, "dataTransfer", { value: dt })
    await act(async () => {
      zone.dispatchEvent(event)
    })
    expect(event.defaultPrevented).toBe(true)
    expect(dt.dropEffect).toBe("copy")
  })
})
