// @vitest-environment jsdom

import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

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

async function renderSystemCanvas(storageKeyPrefixOverride?: string) {
  const host = document.createElement("div")
  host.style.width = `${DEFAULT_VIEWPORT.width}px`
  host.style.height = `${DEFAULT_VIEWPORT.height}px`
  host.style.display = "flex"
  document.body.appendChild(host)

  const root = createRoot(host)
  const storageKeyPrefix =
    storageKeyPrefixOverride ||
    `system-canvas-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

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
  vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})) as typeof fetch)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
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
  }, 10000)

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
  }, 10000)

  it("applies queued system-canvas agent operations and syncs generated state", async () => {
    const syncedStates: Array<{
      workspaceId: string
      body: Record<string, any>
    }> = []
    let servedOperations = false

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const rawUrl =
        typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
      const requestUrl = new URL(rawUrl, window.location.origin)

      if (
        init?.method !== "POST" &&
        requestUrl.pathname === "/api/agent-native/workspaces/system-canvas/operations"
      ) {
        const cursor = Number.parseInt(requestUrl.searchParams.get("cursor") || "0", 10)
        if (!servedOperations && cursor === 0) {
          servedOperations = true
          return {
            ok: true,
            json: async () => ({
              ok: true,
              workspaceId: "system-canvas",
              workspaceKey: "gallery-demo:system-canvas",
              operations: [
                {
                  id: "op-1",
                  cursor: 1,
                  workspaceId: "system-canvas",
                  workspaceKey: "gallery-demo:system-canvas",
                  createdAt: new Date().toISOString(),
                  operation: {
                    type: "update-scale-config",
                    patch: {
                      typeBaseMinPx: 17,
                      fontFamilyDisplay: "Inter",
                    },
                  },
                },
                {
                  id: "op-2",
                  cursor: 2,
                  workspaceId: "system-canvas",
                  workspaceKey: "gallery-demo:system-canvas",
                  createdAt: new Date().toISOString(),
                  operation: {
                    type: "generate-scale-graph",
                  },
                },
                {
                  id: "op-3",
                  cursor: 3,
                  workspaceId: "system-canvas",
                  workspaceKey: "gallery-demo:system-canvas",
                  createdAt: new Date().toISOString(),
                  operation: {
                    type: "set-view-mode",
                    viewMode: "layout",
                  },
                },
                {
                  id: "op-4",
                  cursor: 4,
                  workspaceId: "system-canvas",
                  workspaceKey: "gallery-demo:system-canvas",
                  createdAt: new Date().toISOString(),
                  operation: {
                    type: "apply-scale-vars",
                  },
                },
              ],
              cursor: 4,
            }),
          } as Response
        }

        return {
          ok: true,
          json: async () => ({
            ok: true,
            workspaceId: "system-canvas",
            workspaceKey: "gallery-demo:system-canvas",
            operations: [],
            cursor: 4,
          }),
        } as Response
      }

      if (
        init?.method !== "POST" &&
        requestUrl.pathname === "/api/agent-native/workspaces/color-audit/operations"
      ) {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            workspaceId: "color-audit",
            workspaceKey: "gallery-demo:color-audit",
            operations: [],
            cursor: 0,
          }),
        } as Response
      }

      if (init?.method === "POST" && requestUrl.pathname.startsWith("/api/agent-native/workspaces/")) {
        const body = JSON.parse(String(init.body || "{}"))
        const match = requestUrl.pathname.match(/^\/api\/agent-native\/workspaces\/([^/]+)\/state$/)
        if (match?.[1]) {
          syncedStates.push({
            workspaceId: match[1],
            body,
          })
        }
        return {
          ok: true,
          json: async () => ({
            ok: true,
            updatedAt: new Date().toISOString(),
          }),
        } as Response
      }

      throw new Error(`Unhandled fetch in system canvas test: ${requestUrl.pathname}`)
    })

    vi.stubGlobal("fetch", fetchMock)

    const { container, cleanup } = await renderSystemCanvas("gallery-demo")

    try {
      await act(async () => {
        await new Promise((resolve) => window.setTimeout(resolve, 1800))
      })
      await flushFrames(8)

      expect(findNode(container, "Layout / Stack Flow")).toBeTruthy()

      const acknowledgedSync = syncedStates.find(
        (entry) =>
          entry.workspaceId === "system-canvas" &&
          entry.body.appliedOperationCursor === 4 &&
          entry.body.payload?.viewMode === "layout"
      )

      expect(acknowledgedSync).toBeTruthy()
      expect(acknowledgedSync?.body.payload?.scaleConfig?.typeBaseMinPx).toBe(17)
      expect(acknowledgedSync?.body.payload?.scaleConfig?.fontFamilyDisplay).toBe("Inter")
      expect(acknowledgedSync?.body.payload?.nodes?.length).toBeGreaterThan(0)
      expect(
        acknowledgedSync?.body.payload?.nodes?.some((node: { label?: string }) =>
          node.label?.includes("Layout / Stack Flow")
        )
      ).toBe(true)
    } finally {
      await cleanup()
    }
  }, 10000)

  it("applies queued system-canvas graph mutations for authored nodes and edges", async () => {
    const syncedStates: Array<{
      workspaceId: string
      body: Record<string, any>
    }> = []
    let servedOperations = false

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const rawUrl =
        typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
      const requestUrl = new URL(rawUrl, window.location.origin)

      if (
        init?.method !== "POST" &&
        requestUrl.pathname === "/api/agent-native/workspaces/system-canvas/operations"
      ) {
        const cursor = Number.parseInt(requestUrl.searchParams.get("cursor") || "0", 10)
        if (!servedOperations && cursor === 0) {
          servedOperations = true
          return {
            ok: true,
            json: async () => ({
              ok: true,
              workspaceId: "system-canvas",
              workspaceKey: "gallery-demo:system-canvas",
              operations: [
                {
                  id: "op-1",
                  cursor: 1,
                  workspaceId: "system-canvas",
                  workspaceKey: "gallery-demo:system-canvas",
                  createdAt: new Date().toISOString(),
                  operation: {
                    type: "create-node",
                    node: {
                      id: "system-node-1",
                      type: "semantic",
                      label: "Agent Support Node",
                      role: "surface",
                      group: "system-support",
                      position: { x: 120, y: 100 },
                    },
                  },
                },
                {
                  id: "op-2",
                  cursor: 2,
                  workspaceId: "system-canvas",
                  workspaceKey: "gallery-demo:system-canvas",
                  createdAt: new Date().toISOString(),
                  operation: {
                    type: "create-node",
                    node: {
                      id: "system-node-2",
                      type: "component",
                      label: "Agent Layout Preview",
                      group: "system-preview",
                      position: { x: 420, y: 120 },
                      preview: {
                        kind: "layout-grid",
                        sectionId: "layout",
                        title: "Agent Layout Grid",
                      },
                    },
                  },
                },
                {
                  id: "op-3",
                  cursor: 3,
                  workspaceId: "system-canvas",
                  workspaceKey: "gallery-demo:system-canvas",
                  createdAt: new Date().toISOString(),
                  operation: {
                    type: "create-edge",
                    edge: {
                      id: "system-edge-1",
                      sourceId: "system-node-1",
                      targetId: "system-node-2",
                      type: "map",
                      rule: {
                        note: "Support -> preview",
                      },
                    },
                  },
                },
                {
                  id: "op-4",
                  cursor: 4,
                  workspaceId: "system-canvas",
                  workspaceKey: "gallery-demo:system-canvas",
                  createdAt: new Date().toISOString(),
                  operation: {
                    type: "update-node",
                    nodeId: "system-node-2",
                    patch: {
                      label: "Agent Layout Preview Updated",
                      position: { x: 480, y: 160 },
                    },
                  },
                },
                {
                  id: "op-5",
                  cursor: 5,
                  workspaceId: "system-canvas",
                  workspaceKey: "gallery-demo:system-canvas",
                  createdAt: new Date().toISOString(),
                  operation: {
                    type: "update-edge",
                    edgeId: "system-edge-1",
                    patch: {
                      rule: {
                        note: "Updated note",
                      },
                    },
                  },
                },
                {
                  id: "op-6",
                  cursor: 6,
                  workspaceId: "system-canvas",
                  workspaceKey: "gallery-demo:system-canvas",
                  createdAt: new Date().toISOString(),
                  operation: {
                    type: "delete-node",
                    nodeId: "system-node-1",
                  },
                },
              ],
              cursor: 6,
            }),
          } as Response
        }

        return {
          ok: true,
          json: async () => ({
            ok: true,
            workspaceId: "system-canvas",
            workspaceKey: "gallery-demo:system-canvas",
            operations: [],
            cursor: 6,
          }),
        } as Response
      }

      if (
        init?.method !== "POST" &&
        requestUrl.pathname === "/api/agent-native/workspaces/color-audit/operations"
      ) {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            workspaceId: "color-audit",
            workspaceKey: "gallery-demo:color-audit",
            operations: [],
            cursor: 0,
          }),
        } as Response
      }

      if (init?.method === "POST" && requestUrl.pathname.startsWith("/api/agent-native/workspaces/")) {
        const body = JSON.parse(String(init.body || "{}"))
        const match = requestUrl.pathname.match(/^\/api\/agent-native\/workspaces\/([^/]+)\/state$/)
        if (match?.[1]) {
          syncedStates.push({
            workspaceId: match[1],
            body,
          })
        }
        return {
          ok: true,
          json: async () => ({
            ok: true,
            updatedAt: new Date().toISOString(),
          }),
        } as Response
      }

      throw new Error(`Unhandled fetch in system canvas graph mutation test: ${requestUrl.pathname}`)
    })

    vi.stubGlobal("fetch", fetchMock)

    const { container, cleanup } = await renderSystemCanvas("gallery-demo")

    try {
      await act(async () => {
        click(findButton(container, "System Canvas"))
      })
      await flushFrames(2)

      await act(async () => {
        await new Promise((resolve) => window.setTimeout(resolve, 1800))
      })
      await flushFrames(8)

      expect(findNode(container, "Agent Layout Preview Updated")).toBeTruthy()
      expect(
        Array.from(container.querySelectorAll("[data-color-node='true']")).some((candidate) =>
          candidate.textContent?.includes("Agent Support Node")
        )
      ).toBe(false)

      const acknowledgedSync = syncedStates.find(
        (entry) =>
          entry.workspaceId === "system-canvas" && entry.body.appliedOperationCursor === 6
      )

      expect(acknowledgedSync).toBeTruthy()
      expect(
        acknowledgedSync?.body.payload?.nodes?.some((node: { label?: string }) =>
          node.label?.includes("Agent Layout Preview Updated")
        )
      ).toBe(true)
      expect(
        acknowledgedSync?.body.payload?.nodes?.some((node: { label?: string }) =>
          node.label?.includes("Agent Support Node")
        )
      ).toBe(false)
      expect(acknowledgedSync?.body.payload?.edges).toHaveLength(0)
    } finally {
      await cleanup()
    }
  }, 10000)
})
