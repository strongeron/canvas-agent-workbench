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
  { label: "Brand 100", cssVar: "--color-brand-50", category: "color", subcategory: "brand" },
  { label: "Surface 50", cssVar: "--color-surface-50", category: "color", subcategory: "surface" },
  { label: "Foreground", cssVar: "--color-foreground", category: "color", subcategory: "text" },
]

async function click(element: Element) {
  await act(async () => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }))
  })
}

async function tapCanvasNode(element: Element) {
  await act(async () => {
    element.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        clientX: 24,
        clientY: 24,
        pointerId: 1,
      })
    )
    element.dispatchEvent(
      new PointerEvent("pointerup", {
        bubbles: true,
        cancelable: true,
        clientX: 24,
        clientY: 24,
        pointerId: 1,
      })
    )
  })
}

async function changeValue(element: HTMLInputElement | HTMLSelectElement, value: string) {
  const prototype = Object.getPrototypeOf(element) as HTMLInputElement | HTMLSelectElement
  const valueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set
  if (!valueSetter) {
    throw new Error("Unable to find native value setter")
  }

  await act(async () => {
    valueSetter.call(element, value)
    element.dispatchEvent(new Event("input", { bubbles: true }))
    element.dispatchEvent(new Event("change", { bubbles: true }))
  })
}

async function flushFrames(count = 3) {
  for (let index = 0; index < count; index += 1) {
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })
  }
}

async function pressWindowKey(key: string) {
  await act(async () => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }))
  })
}

async function renderColorCanvas() {
  const host = document.createElement("div")
  host.style.width = `${DEFAULT_VIEWPORT.width}px`
  host.style.height = `${DEFAULT_VIEWPORT.height}px`
  host.style.display = "flex"
  document.body.appendChild(host)

  const root = createRoot(host)
  const storageKeyPrefix = `color-canvas-review-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

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

async function renderColorCanvasCatalog() {
  const host = document.createElement("div")
  host.style.width = `${DEFAULT_VIEWPORT.width}px`
  host.style.height = `${DEFAULT_VIEWPORT.height}px`
  host.style.display = "flex"
  document.body.appendChild(host)

  const root = createRoot(host)
  const storageKeyPrefix = `color-canvas-catalog-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  await act(async () => {
    root.render(
      <div style={{ width: "100%", height: "100%" }}>
        <ColorCanvasPage
          tokens={TEST_TOKENS}
          themeStorageKeyPrefix={storageKeyPrefix}
          catalogOnly
        />
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

function findButton(container: HTMLElement, label: string) {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.trim().includes(label)
  )
  if (!button) {
    throw new Error(`Button "${label}" not found`)
  }
  return button as HTMLButtonElement
}

function findCanvasNode(container: HTMLElement, label: string) {
  const node = Array.from(container.querySelectorAll('[data-color-node="true"]')).find((candidate) =>
    candidate.textContent?.includes(label)
  )
  if (!node) {
    throw new Error(`Canvas node "${label}" not found`)
  }
  return node as HTMLElement
}

let originalPointerEvent: typeof globalThis.PointerEvent | undefined
let originalResizeObserver: typeof globalThis.ResizeObserver | undefined
let originalGetBoundingClientRect: typeof HTMLElement.prototype.getBoundingClientRect
let originalScrollTo: typeof HTMLElement.prototype.scrollTo | undefined
let originalSetPointerCapture: typeof HTMLElement.prototype.setPointerCapture | undefined
let originalReleasePointerCapture: typeof HTMLElement.prototype.releasePointerCapture | undefined
let originalCssDescriptor: PropertyDescriptor | undefined
let originalActEnvironmentDescriptor: PropertyDescriptor | undefined
let originalClipboardDescriptor: PropertyDescriptor | undefined
let copiedClipboardText = ""

beforeAll(() => {
  originalPointerEvent = globalThis.PointerEvent
  originalResizeObserver = globalThis.ResizeObserver
  originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect
  originalScrollTo = HTMLElement.prototype.scrollTo
  originalSetPointerCapture = HTMLElement.prototype.setPointerCapture
  originalReleasePointerCapture = HTMLElement.prototype.releasePointerCapture
  originalCssDescriptor = Object.getOwnPropertyDescriptor(globalThis, "CSS")
  originalClipboardDescriptor = Object.getOwnPropertyDescriptor(globalThis.navigator, "clipboard")
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
  Object.defineProperty(globalThis.navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: async (text: string) => {
        copiedClipboardText = text
      },
    },
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

  Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
    configurable: true,
    value: originalSetPointerCapture,
  })

  Object.defineProperty(HTMLElement.prototype, "releasePointerCapture", {
    configurable: true,
    value: originalReleasePointerCapture,
  })

  if (originalCssDescriptor) {
    Object.defineProperty(globalThis, "CSS", originalCssDescriptor)
  } else {
    delete (globalThis as { CSS?: unknown }).CSS
  }

  if (originalClipboardDescriptor) {
    Object.defineProperty(globalThis.navigator, "clipboard", originalClipboardDescriptor)
  } else {
    Reflect.deleteProperty(globalThis.navigator as object, "clipboard")
  }

  if (originalActEnvironmentDescriptor) {
    Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", originalActEnvironmentDescriptor)
  } else {
    delete (globalThis as { IS_REACT_ACT_ENVIRONMENT?: unknown }).IS_REACT_ACT_ENVIRONMENT
  }
})

beforeEach(() => {
  window.localStorage.clear()
  copiedClipboardText = ""
})

afterEach(() => {
  document.body.innerHTML = ""
})

describe("color canvas review flow", () => {
  it("shows template kits, functional token palettes, and updates preview when a token override changes", async () => {
    const { container, cleanup } = await renderColorCanvas()

    expect(container.textContent).toContain("Review")
    expect(container.textContent).toContain("Build graph")
    expect(container.textContent).toContain("Contrast audit")
    expect(container.textContent).toContain("Flow lanes")
    expect(container.textContent).toContain("Center cluster")
    expect(container.textContent).toContain("Role lanes")
    expect(container.textContent).toContain("Template kit")
    expect(container.textContent).toContain("Template preview")
    expect(container.textContent).toContain("31 total nodes")
    expect(container.textContent).toContain("Add Nodes")
    expect(container.textContent).toContain("Framework Aliases")
    expect(container.textContent).toContain("Functional Alias")
    expect(container.textContent).toContain("Color Audit workflow")
    expect(container.textContent).toContain("Export formats")
    expect(container.textContent).toContain("Export scope")
    expect(container.textContent).toContain("Only mapped semantic roles and functional aliases are included.")
    expect(container.textContent).toContain("Preview export")
    expect(container.textContent).toContain("CSS vars")
    expect(container.textContent).toContain("DTCG JSON")
    expect(container.textContent).toContain("OKLCH colors")
    expect(container.textContent).toContain("shadcn/ui")
    expect(container.textContent).toContain("Radix")
    expect(container.textContent).toContain("brand")
    expect(container.textContent).toContain("surface")
    expect(container.querySelector('button[aria-label="Zoom out"]')).not.toBeNull()
    expect(container.textContent).toContain("Bird view")

    await click(findButton(container, "Brand 100"))
    await flushFrames()

    const overrideInput = container.querySelector(
      'input[placeholder="e.g. #1d4ed8 or rgb(0 0 0)"]'
    ) as HTMLInputElement | null
    expect(overrideInput).not.toBeNull()

    await changeValue(overrideInput!, "#112233")
    await flushFrames()

    expect(container.textContent).toContain("Quick preview edit")
    expect(container.textContent).toContain("rgb(17 34 51)")
    expect(container.textContent).toContain("Advanced color expression")

    await cleanup()
  })

  it("allows semantic nodes to receive a local override", async () => {
    const { container, cleanup } = await renderColorCanvas()

    await click(findButton(container, "Text / Foreground"))
    await flushFrames()

    const overrideInput = container.querySelector(
      'input[placeholder="e.g. #1d4ed8 or rgb(0 0 0)"]'
    ) as HTMLInputElement | null

    expect(overrideInput).not.toBeNull()

    await cleanup()
  })

  it("keeps template OKLCH sliders in sync with brand input", async () => {
    const { container, cleanup } = await renderColorCanvas()

    const brandInput = container.querySelector(
      'input[placeholder="e.g. #1d4ed8 or oklch(60% 0.18 240)"]'
    ) as HTMLInputElement | null
    const brandHueSlider = container.querySelector(
      'input[aria-label="Brand hue"]'
    ) as HTMLInputElement | null

    expect(brandInput).not.toBeNull()
    expect(brandHueSlider).not.toBeNull()

    await changeValue(brandHueSlider!, "240")
    await flushFrames()

    expect(brandInput?.value).toContain("oklch(")
    expect(brandInput?.value).toContain("240")

    await cleanup()
  })

  it("generates template nodes from the visible default brand seed even before typing a brand value", async () => {
    const { container, cleanup } = await renderColorCanvas()

    await click(findButton(container, "Generate template nodes"))
    await flushFrames(4)

    expect(container.textContent).toContain("Brand Seed")
    expect(container.textContent).toContain("Surface / Base")

    const brandInput = container.querySelector(
      'input[placeholder="e.g. #1d4ed8 or oklch(60% 0.18 240)"]'
    ) as HTMLInputElement | null
    expect(brandInput?.value).toContain("oklch(")

    await cleanup()
  })

  it("generates template nodes and shows visual comparisons for the selected color", async () => {
    const { container, cleanup } = await renderColorCanvas()

    const brandInput = container.querySelector(
      'input[placeholder="e.g. #1d4ed8 or oklch(60% 0.18 240)"]'
    ) as HTMLInputElement | null
    const accentInput = container.querySelector(
      'input[placeholder="Optional secondary brand"]'
    ) as HTMLInputElement | null

    expect(brandInput).not.toBeNull()
    expect(accentInput).not.toBeNull()

    await changeValue(brandInput!, "#1d4ed8")
    await changeValue(accentInput!, "#7c3aed")
    await click(findButton(container, "Generate template nodes"))
    await flushFrames(4)

    const backgroundNode = findCanvasNode(container, "Background")
    expect(backgroundNode.textContent).toContain("shadcn/ui")
    expect(backgroundNode.textContent).not.toContain("shadcn/ui / Background")

    expect(findButton(container, "Flow lanes").className).toContain("bg-brand-50")
    expect(findButton(container, "Map").className).toContain("bg-brand-50")

    const edgeBadge = Array.from(container.querySelectorAll("button")).find((candidate) =>
      candidate.textContent?.includes("Semantic role")
    )
    expect(edgeBadge).not.toBeNull()

    await click(edgeBadge!)
    await flushFrames()

    expect(container.querySelectorAll('[data-edge-highlighted="true"]').length).toBeGreaterThanOrEqual(2)
    expect(container.querySelectorAll('[data-edge-dimmed="true"]').length).toBeGreaterThan(0)
    expect(container.textContent).toContain("Edge type")
    expect(container.textContent).toContain("map")

    await tapCanvasNode(findCanvasNode(container, "Background"))
    await flushFrames(2)

    expect(container.textContent).toContain("Mapped from")
    expect(container.textContent).toContain("Feeds")
    expect(container.textContent).toContain("Foreground vs background review")
    expect(container.textContent).toContain("Foreground tokens on selected background")
    expect(container.textContent).toContain("Connected contrast checks")
    expect(container.textContent).toContain("Background")
    expect(container.textContent).toContain("Generic export")
    expect(container.textContent).toContain("Framework export")

    await cleanup()
  })

  it("opens an export preview dialog and copies the same payload shown in the preview", async () => {
    const { container, cleanup } = await renderColorCanvas()

    await click(findButton(container, "Generate template nodes"))
    await flushFrames(4)

    await click(findButton(container, "Preview export"))
    await flushFrames()

    const dialog = container.querySelector('[role="dialog"][aria-label="Export preview"]')
    expect(dialog).not.toBeNull()
    expect(dialog?.textContent).toContain("What you will copy")
    expect(dialog?.textContent).toContain("Live preview of the payload")

    await click(findButton(dialog as HTMLElement, "DTCG JSON"))
    await flushFrames()

    const exportPreview = dialog?.querySelector("pre")
    expect(exportPreview?.textContent).toContain('"color"')

    await click(findButton(dialog as HTMLElement, "Copy export"))
    await flushFrames()

    expect(copiedClipboardText).toBe(exportPreview?.textContent ?? "")

    await cleanup()
  })

  it("deletes the selected node with the keyboard", async () => {
    const { container, cleanup } = await renderColorCanvas()

    await click(findButton(container, "Generate template nodes"))
    await flushFrames(4)

    await tapCanvasNode(findCanvasNode(container, "Brand Seed"))
    await flushFrames()

    expect(container.textContent).toContain("Brand Seed")

    await pressWindowKey("Delete")
    await flushFrames(2)

    expect(
      Array.from(container.querySelectorAll('[data-color-node="true"]')).some((candidate) =>
        candidate.textContent?.includes("Brand Seed")
      )
    ).toBe(false)

    await cleanup()
  })

  it("keeps framework identity in the pill while using short titles for Radix aliases", async () => {
    const { container, cleanup } = await renderColorCanvas()

    await click(findButton(container, "Radix Themes"))
    await flushFrames()

    await click(findButton(container, "Generate template nodes"))
    await flushFrames(4)

    const panelNode = findCanvasNode(container, "Panel")
    expect(panelNode.textContent).toContain("Radix")
    expect(panelNode.textContent).not.toContain("Radix / Panel")

    await cleanup()
  })

  it("opens a node catalog for the current view", async () => {
    const { container, cleanup } = await renderColorCanvas()

    await click(findButton(container, "Generate template nodes"))
    await flushFrames(4)

    await click(findButton(container, "Node catalog"))
    await flushFrames()

    const dialog = container.querySelector('[role="dialog"][aria-label="Node catalog"]')
    expect(dialog).not.toBeNull()
    expect(dialog?.textContent).toContain("State preview")
    expect(dialog?.textContent).toContain("Current view nodes")
    expect(dialog?.textContent).toContain("Functional alias · shadcn/ui")
    expect(dialog?.textContent).toContain("Background")

    await cleanup()
  })

  it("renders a dedicated node catalog with starter, shadcn, radix, and system sections", async () => {
    const { container, cleanup } = await renderColorCanvasCatalog()

    expect(container.textContent).toContain("Node catalog")
    expect(container.textContent).toContain("Canvas Workspace")
    expect(container.textContent).toContain("Canvas / Workspace basics")
    expect(container.textContent).toContain("Canvas / Rich content")
    expect(container.textContent).toContain("Artboard")
    expect(container.textContent).toContain("Media Asset")
    expect(container.textContent).toContain("Mermaid Diagram")
    expect(container.textContent).toContain("Excalidraw Sketch")
    expect(container.textContent).toContain("Markdown Note")
    expect(container.textContent).toContain("Template / Starter Ramp")
    expect(container.textContent).toContain("Template / shadcn/ui")
    expect(container.textContent).toContain("Template / Radix Themes")
    expect(container.textContent).toContain("System Canvas / Standards")
    expect(container.textContent).toContain("System Canvas / Type + Icons")
    expect(container.textContent).toContain("Functional · shadcn/ui")
    expect(container.textContent).toContain("Functional · Radix")
    expect(container.textContent).toContain("Token Standard / DTCG")
    expect(container.textContent).toContain("Radix / Theme Bridge")

    await cleanup()
  })
})
