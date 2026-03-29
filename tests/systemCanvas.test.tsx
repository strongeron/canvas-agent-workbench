// @vitest-environment jsdom

import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest"

import { ColorCanvasPage } from "../components/color-canvas/ColorCanvasPage"
import type { ThemeToken } from "../types/theme"

const DEFAULT_VIEWPORT = { width: 1360, height: 900 }
const TEST_TOKENS: ThemeToken[] = [
  { label: "Brand 600", cssVar: "--color-brand-600", category: "color", subcategory: "brand" },
  { label: "Brand 500", cssVar: "--color-brand-500", category: "color", subcategory: "brand" },
  { label: "Surface 50", cssVar: "--color-surface-50", category: "color", subcategory: "surface" },
  { label: "Surface 100", cssVar: "--color-surface-100", category: "color", subcategory: "surface" },
  { label: "Foreground", cssVar: "--color-foreground", category: "color", subcategory: "text" },
  {
    label: "Muted Foreground",
    cssVar: "--color-muted-foreground",
    category: "color",
    subcategory: "text",
  },
]

function click(element: Element) {
  element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }))
}

function changeValue(element: HTMLInputElement | HTMLSelectElement, value: string) {
  element.value = value
  element.dispatchEvent(new Event("input", { bubbles: true }))
  element.dispatchEvent(new Event("change", { bubbles: true }))
}

function pointer(
  element: Element,
  type: "pointerdown" | "pointermove" | "pointerup",
  clientX: number,
  clientY: number,
  pointerId = 1
) {
  element.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerId,
      clientX,
      clientY,
    })
  )
}

async function flushFrames(count = 3) {
  for (let index = 0; index < count; index += 1) {
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })
  }
}

function findButton(container: HTMLElement, label: string) {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.trim().includes(label)
  )
  if (!button) {
    throw new Error(`Button "${label}" not found`)
  }
  return button as HTMLButtonElement
}

function findLabelControl(container: HTMLElement, label: string) {
  const labels = Array.from(container.querySelectorAll("label"))
  const field = labels.find((candidate) => candidate.textContent?.includes(label))
  const control = field?.querySelector("input, select")
  if (!field || !control) {
    throw new Error(`Control for label "${label}" not found`)
  }
  return control as HTMLInputElement | HTMLSelectElement
}

function findNode(container: HTMLElement, label: string) {
  const node = Array.from(container.querySelectorAll("[data-color-node='true']")).find((candidate) =>
    candidate.textContent?.includes(label)
  )
  if (!node) {
    throw new Error(`Node "${label}" not found`)
  }
  return node as HTMLElement
}

async function renderSystemCanvas() {
  const host = document.createElement("div")
  host.style.width = `${DEFAULT_VIEWPORT.width}px`
  host.style.height = `${DEFAULT_VIEWPORT.height}px`
  host.style.display = "flex"
  document.body.appendChild(host)

  const root = createRoot(host)
  const storageKeyPrefix = `system-canvas-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  await act(async () => {
    root.render(
      <div style={{ width: "100%", height: "100%" }}>
        <ColorCanvasPage tokens={TEST_TOKENS} themeStorageKeyPrefix={storageKeyPrefix} />
      </div>
    )
  })

  await flushFrames()

  return {
    container: host,
    cleanup: async () => {
      await act(async () => {
        root.unmount()
      })
      host.remove()
    },
  }
}

let originalPointerEvent: typeof globalThis.PointerEvent | undefined
let originalResizeObserver: typeof globalThis.ResizeObserver | undefined
let originalGetBoundingClientRect: typeof HTMLElement.prototype.getBoundingClientRect
let originalScrollTo: typeof HTMLElement.prototype.scrollTo | undefined
let originalCssDescriptor: PropertyDescriptor | undefined
let originalActEnvironmentDescriptor: PropertyDescriptor | undefined

beforeAll(() => {
  originalPointerEvent = globalThis.PointerEvent
  originalResizeObserver = globalThis.ResizeObserver
  originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect
  originalScrollTo = HTMLElement.prototype.scrollTo
  originalCssDescriptor = Object.getOwnPropertyDescriptor(globalThis, "CSS")
  originalActEnvironmentDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "IS_REACT_ACT_ENVIRONMENT"
  )

  globalThis.PointerEvent = MouseEvent as typeof PointerEvent
  Object.defineProperty(globalThis, "CSS", {
    configurable: true,
    value: {
      supports: () => true,
    } as unknown as typeof CSS,
  })
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
    configurable: true,
    value: true,
  })

  class ResizeObserverMock {
    private readonly callback: ResizeObserverCallback

    constructor(callback: ResizeObserverCallback) {
      this.callback = callback
    }

    observe(target: Element) {
      this.callback([{ target } as ResizeObserverEntry], this as unknown as ResizeObserver)
    }

    disconnect() {}

    unobserve() {}
  }

  globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver

  Object.defineProperty(HTMLElement.prototype, "getBoundingClientRect", {
    configurable: true,
    value() {
      const width =
        Number.parseFloat((this as HTMLElement).style.width || "") ||
        ((this as HTMLElement).tagName === "ASIDE" ? 288 : DEFAULT_VIEWPORT.width)
      const height =
        Number.parseFloat((this as HTMLElement).style.height || "") || DEFAULT_VIEWPORT.height

      return {
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        right: width,
        bottom: height,
        width,
        height,
        toJSON() {
          return this
        },
      }
    },
  })

  Object.defineProperty(HTMLElement.prototype, "scrollTo", {
    configurable: true,
    value(leftOrOptions: number | ScrollToOptions, top?: number) {
      if (typeof leftOrOptions === "number") {
        ;(this as HTMLElement).scrollLeft = leftOrOptions
        ;(this as HTMLElement).scrollTop = top ?? 0
        return
      }

      ;(this as HTMLElement).scrollLeft = leftOrOptions.left ?? 0
      ;(this as HTMLElement).scrollTop = leftOrOptions.top ?? 0
    },
  })

  Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
    configurable: true,
    value() {},
  })

  Object.defineProperty(HTMLElement.prototype, "releasePointerCapture", {
    configurable: true,
    value() {},
  })

  Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
    configurable: true,
    value() {
      return false
    },
  })
})

afterAll(() => {
  globalThis.PointerEvent = originalPointerEvent as typeof PointerEvent
  globalThis.ResizeObserver = originalResizeObserver as typeof ResizeObserver

  Object.defineProperty(HTMLElement.prototype, "getBoundingClientRect", {
    configurable: true,
    value: originalGetBoundingClientRect,
  })

  Object.defineProperty(HTMLElement.prototype, "scrollTo", {
    configurable: true,
    value: originalScrollTo,
  })

  if (originalCssDescriptor) {
    Object.defineProperty(globalThis, "CSS", originalCssDescriptor)
  } else {
    delete (globalThis as { CSS?: unknown }).CSS
  }

  if (originalActEnvironmentDescriptor) {
    Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", originalActEnvironmentDescriptor)
  } else {
    delete (globalThis as { IS_REACT_ACT_ENVIRONMENT?: unknown }).IS_REACT_ACT_ENVIRONMENT
  }
})

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  document.body.innerHTML = ""
})

describe("system canvas", () => {
  it("applies presets, generates the graph, supports view switching, zooming, and dragging", async () => {
    const { container, cleanup } = await renderSystemCanvas()

    try {
      await act(async () => {
        click(findButton(container, "System Canvas"))
      })
      await flushFrames()

      changeValue(findLabelControl(container, "Base min"), "16")
      await act(async () => {
        click(findButton(container, "Dense App"))
      })
      await flushFrames()

      expect(findLabelControl(container, "Base min")).toHaveProperty("value", "15")
      expect(findLabelControl(container, "Display font")).toHaveProperty("value", "Inter")

      await act(async () => {
        click(findButton(container, "Generate scale + preview nodes"))
      })
      await flushFrames(5)

      expect(findNode(container, "Font / Sans Metrics")).toBeTruthy()

      await act(async () => {
        click(findButton(container, "Type"))
      })
      await flushFrames(3)

      const typeNode = findNode(container, "Type / Base Scale")
      const leftBeforeDrag = Number.parseFloat(typeNode.style.left)

      const zoomResetButton = Array.from(container.querySelectorAll("button")).find((candidate) =>
        /^\d+%$/.test(candidate.textContent?.trim() || "")
      ) as HTMLButtonElement | undefined
      const zoomInButton = container.querySelector(
        'button[aria-label="Zoom in"]'
      ) as HTMLButtonElement | null

      expect(zoomResetButton).toBeTruthy()
      expect(zoomInButton).toBeTruthy()

      const zoomBefore = Number.parseInt(zoomResetButton?.textContent?.trim() || "0", 10)

      await act(async () => {
        click(zoomInButton as HTMLButtonElement)
      })
      await flushFrames()

      const zoomAfter = Number.parseInt(zoomResetButton?.textContent?.trim() || "0", 10)
      expect(zoomAfter).toBeGreaterThan(zoomBefore)

      await act(async () => {
        click(zoomResetButton as HTMLButtonElement)
      })
      await flushFrames()

      expect(zoomResetButton?.textContent?.trim()).toBe("100%")

      await act(async () => {
        pointer(typeNode, "pointerdown", 260, 220)
        pointer(typeNode, "pointermove", 360, 280)
        pointer(typeNode, "pointerup", 360, 280)
      })
      await flushFrames()

      expect(Number.parseFloat(findNode(container, "Type / Base Scale").style.left)).not.toBe(
        leftBeforeDrag
      )
    } finally {
      await cleanup()
    }
  })

  it("preserves manual resize across view changes and only resets size on explicit fit width", async () => {
    const { container, cleanup } = await renderSystemCanvas()

    try {
      await act(async () => {
        click(findButton(container, "System Canvas"))
      })
      await flushFrames()

      await act(async () => {
        click(findButton(container, "Generate scale + preview nodes"))
      })
      await flushFrames(5)

      await act(async () => {
        click(findButton(container, "Type"))
      })
      await flushFrames(3)

      const node = findNode(container, "Font / Sans Metrics")
      const resizeHandle = node.querySelector('button[aria-label="Resize node"]') as HTMLButtonElement
      const widthBeforeResize = Number.parseFloat(node.style.width)

      await act(async () => {
        pointer(resizeHandle, "pointerdown", 640, 520)
        pointer(node, "pointermove", 560, 460)
        pointer(node, "pointerup", 560, 460)
      })
      await flushFrames()

      const resizedWidth = Number.parseFloat(findNode(container, "Font / Sans Metrics").style.width)
      expect(resizedWidth).toBeLessThan(widthBeforeResize)

      await act(async () => {
        click(findButton(container, "Layout"))
      })
      await flushFrames(3)
      await act(async () => {
        click(findButton(container, "Type"))
      })
      await flushFrames(3)

      expect(Number.parseFloat(findNode(container, "Font / Sans Metrics").style.width)).toBeCloseTo(
        resizedWidth,
        3
      )

      await act(async () => {
        click(findButton(container, "Fit width"))
      })
      await flushFrames(4)

      expect(Number.parseFloat(findNode(container, "Font / Sans Metrics").style.width)).toBeGreaterThan(
        resizedWidth
      )
    } finally {
      await cleanup()
    }
  })
})
