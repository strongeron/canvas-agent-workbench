// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { CanvasHtmlFrame } from "../components/canvas/CanvasHtmlFrame"
import type { CanvasHtmlItem } from "../types/canvas"
import {
  CANVAS_NODE_BRIDGE_MARKER,
  CANVAS_NODE_BRIDGE_VERSION,
} from "../utils/canvasReactNodeBridge"

// React 18+ requires this global to silence "act not configured" warnings
// when using react-dom/client + react.act under jsdom.
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

function makeItem(overrides: Partial<CanvasHtmlItem> = {}): CanvasHtmlItem {
  return {
    id: "item-1",
    type: "html",
    position: { x: 0, y: 0 },
    size: { width: 400, height: 300 },
    rotation: 0,
    zIndex: 0,
    sourceMode: "react",
    sourceReact: "export default function P() { return <button>x</button> }",
    title: "Test preview",
    ...overrides,
  }
}

function postFromIframe(
  iframe: HTMLIFrameElement,
  data: Record<string, unknown>,
  origin: string = window.location.origin
): void {
  const event = new MessageEvent("message", { data, origin })
  Object.defineProperty(event, "source", {
    configurable: true,
    get: () => iframe.contentWindow,
  })
  window.dispatchEvent(event)
}

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
  // Let the compile-react fetch resolve and the iframe mount.
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
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

describe("CanvasHtmlFrame — React TSX preview message handler", () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let harness: Harness | null = null

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        html: "<!doctype html><html><body><div id=\"root\"></div></body></html>",
        ids: [{ canvasId: "abc:0", tag: "button", line: 0, column: 0 }],
      }),
    })
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => {
    if (harness) {
      harness.cleanup()
      harness = null
    }
    vi.unstubAllGlobals()
  })

  it("forwards canvas/select messages from its iframe to onReactNodeSelect", async () => {
    const onSelect = vi.fn()
    harness = await mount(
      <CanvasHtmlFrame item={makeItem()} interactMode onReactNodeSelect={onSelect} />
    )
    const iframe = harness.container.querySelector("iframe") as HTMLIFrameElement
    expect(iframe).toBeTruthy()

    await act(async () => {
      postFromIframe(iframe, {
        [CANVAS_NODE_BRIDGE_MARKER]: true,
        version: CANVAS_NODE_BRIDGE_VERSION,
        type: "canvas/select",
        canvasId: "abc:0",
        tag: "button",
        rect: { x: 1, y: 2, width: 50, height: 24 },
        fileHint: "item-1",
      })
    })

    expect(onSelect).toHaveBeenCalledWith({
      itemId: "item-1",
      canvasId: "abc:0",
      tag: "button",
      rect: { x: 1, y: 2, width: 50, height: 24 },
      fileHint: "item-1",
      compileGeneration: expect.any(Number),
    })
    // Generation should be ≥ 1 after at least one compile.
    expect(onSelect.mock.calls[0][0].compileGeneration).toBeGreaterThanOrEqual(1)
  })

  it("ignores messages whose source is not the component's iframe (cross-talk guard)", async () => {
    const onSelect = vi.fn()
    harness = await mount(
      <CanvasHtmlFrame item={makeItem()} interactMode onReactNodeSelect={onSelect} />
    )
    await act(async () => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            [CANVAS_NODE_BRIDGE_MARKER]: true,
            version: CANVAS_NODE_BRIDGE_VERSION,
            type: "canvas/select",
            canvasId: "wrong:0",
            tag: "button",
            rect: { x: 0, y: 0, width: 0, height: 0 },
          },
        })
      )
    })
    expect(onSelect).not.toHaveBeenCalled()
  })

  it("ignores messages whose origin does not match", async () => {
    const onSelect = vi.fn()
    harness = await mount(
      <CanvasHtmlFrame item={makeItem()} interactMode onReactNodeSelect={onSelect} />
    )
    const iframe = harness.container.querySelector("iframe") as HTMLIFrameElement
    await act(async () => {
      postFromIframe(
        iframe,
        {
          [CANVAS_NODE_BRIDGE_MARKER]: true,
          version: CANVAS_NODE_BRIDGE_VERSION,
          type: "canvas/select",
          canvasId: "abc:0",
          tag: "button",
          rect: { x: 0, y: 0, width: 0, height: 0 },
        },
        "https://evil.example.com"
      )
    })
    expect(onSelect).not.toHaveBeenCalled()
  })

  it("ignores messages without the bridge marker", async () => {
    const onSelect = vi.fn()
    harness = await mount(
      <CanvasHtmlFrame item={makeItem()} interactMode onReactNodeSelect={onSelect} />
    )
    const iframe = harness.container.querySelector("iframe") as HTMLIFrameElement
    await act(async () => {
      postFromIframe(iframe, {
        type: "canvas/select",
        canvasId: "abc:0",
        tag: "button",
        rect: { x: 0, y: 0, width: 0, height: 0 },
      })
    })
    expect(onSelect).not.toHaveBeenCalled()
  })

  it("does not call onReactNodeSelect for canvas/hover messages", async () => {
    const onSelect = vi.fn()
    harness = await mount(
      <CanvasHtmlFrame item={makeItem()} interactMode onReactNodeSelect={onSelect} />
    )
    const iframe = harness.container.querySelector("iframe") as HTMLIFrameElement
    await act(async () => {
      postFromIframe(iframe, {
        [CANVAS_NODE_BRIDGE_MARKER]: true,
        version: CANVAS_NODE_BRIDGE_VERSION,
        type: "canvas/hover",
        canvasId: "abc:0",
        rect: { x: 0, y: 0, width: 0, height: 0 },
      })
    })
    expect(onSelect).not.toHaveBeenCalled()
  })

  it("does not call onReactNodeSelect when canvasId is empty", async () => {
    const onSelect = vi.fn()
    harness = await mount(
      <CanvasHtmlFrame item={makeItem()} interactMode onReactNodeSelect={onSelect} />
    )
    const iframe = harness.container.querySelector("iframe") as HTMLIFrameElement
    await act(async () => {
      postFromIframe(iframe, {
        [CANVAS_NODE_BRIDGE_MARKER]: true,
        version: CANVAS_NODE_BRIDGE_VERSION,
        type: "canvas/select",
        canvasId: "",
        tag: "div",
        rect: { x: 0, y: 0, width: 0, height: 0 },
      })
    })
    expect(onSelect).not.toHaveBeenCalled()
  })

  it("passes sourceId equal to item.id when fetching compile-react", async () => {
    harness = await mount(
      <CanvasHtmlFrame item={makeItem({ id: "preview-42" })} interactMode />
    )
    expect(fetchMock).toHaveBeenCalled()
    const [, init] = fetchMock.mock.calls[0]
    const body = JSON.parse(String(init.body))
    expect(body.sourceId).toBe("preview-42")
  })

  it("reports a new compile generation when React source changes", async () => {
    const onGenerationChange = vi.fn()
    harness = await mount(
      <CanvasHtmlFrame
        item={makeItem()}
        interactMode
        onReactCompileGenerationChange={onGenerationChange}
      />
    )

    expect(onGenerationChange).toHaveBeenCalledWith("item-1", 1)

    await act(async () => {
      harness?.root.render(
        <CanvasHtmlFrame
          item={makeItem({
            sourceReact: "export default function P() { return <button>next</button> }",
          })}
          interactMode
          onReactCompileGenerationChange={onGenerationChange}
        />
      )
    })
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(onGenerationChange).toHaveBeenCalledWith("item-1", 2)
  })

  async function selectInIframe(
    iframe: HTMLIFrameElement,
    canvasId: string,
    rect = { x: 10, y: 20, width: 100, height: 40 }
  ): Promise<void> {
    await act(async () => {
      postFromIframe(iframe, {
        [CANVAS_NODE_BRIDGE_MARKER]: true,
        version: CANVAS_NODE_BRIDGE_VERSION,
        type: "canvas/select",
        canvasId,
        tag: "button",
        rect,
        fileHint: "item-1",
      })
    })
  }

  it("renders CanvasIframeOverlay (8 handles + move) when interactMode is on and an element is selected", async () => {
    harness = await mount(
      <CanvasHtmlFrame item={makeItem()} interactMode onReactNodeSelect={vi.fn()} />
    )
    const iframe = harness.container.querySelector("iframe") as HTMLIFrameElement
    await selectInIframe(iframe, "abc:0")
    expect(
      harness.container.querySelectorAll("[data-canvas-overlay-handle]").length
    ).toBe(9)
  })

  it("renders the plain selection ring (no overlay) when interactMode is off", async () => {
    harness = await mount(
      <CanvasHtmlFrame item={makeItem()} interactMode={false} onReactNodeSelect={vi.fn()} />
    )
    const iframe = harness.container.querySelector("iframe") as HTMLIFrameElement
    await selectInIframe(iframe, "abc:0")
    expect(
      harness.container.querySelectorAll("[data-canvas-overlay-handle]").length
    ).toBe(0)
    // The static ring uses ring-2 ring-brand-500; assert its class is present.
    expect(
      harness.container.querySelector(".ring-brand-500")
    ).not.toBeNull()
  })

  it("applies canvas/rect-update to selectionRect when canvasId matches the active selection", async () => {
    harness = await mount(
      <CanvasHtmlFrame item={makeItem()} interactMode onReactNodeSelect={vi.fn()} />
    )
    const iframe = harness.container.querySelector("iframe") as HTMLIFrameElement
    await selectInIframe(iframe, "abc:0", { x: 10, y: 20, width: 100, height: 40 })
    // The overlay anchors to the rect via inline style on the testid element.
    let overlay = harness.container.querySelector(
      "[data-testid='canvas-iframe-overlay']"
    ) as HTMLElement
    expect(overlay.style.width).toBe("100px")

    await act(async () => {
      postFromIframe(iframe, {
        [CANVAS_NODE_BRIDGE_MARKER]: true,
        version: CANVAS_NODE_BRIDGE_VERSION,
        type: "canvas/rect-update",
        canvasId: "abc:0",
        rect: { x: 12, y: 24, width: 150, height: 50 },
      })
    })

    overlay = harness.container.querySelector(
      "[data-testid='canvas-iframe-overlay']"
    ) as HTMLElement
    expect(overlay.style.width).toBe("150px")
    expect(overlay.style.height).toBe("50px")
    expect(overlay.style.left).toBe("12px")
  })

  it("ignores canvas/rect-update for a canvasId that is not the active selection", async () => {
    harness = await mount(
      <CanvasHtmlFrame item={makeItem()} interactMode onReactNodeSelect={vi.fn()} />
    )
    const iframe = harness.container.querySelector("iframe") as HTMLIFrameElement
    await selectInIframe(iframe, "abc:0", { x: 10, y: 20, width: 100, height: 40 })
    await act(async () => {
      postFromIframe(iframe, {
        [CANVAS_NODE_BRIDGE_MARKER]: true,
        version: CANVAS_NODE_BRIDGE_VERSION,
        type: "canvas/rect-update",
        canvasId: "different-id",
        rect: { x: 999, y: 999, width: 999, height: 999 },
      })
    })
    const overlay = harness.container.querySelector(
      "[data-testid='canvas-iframe-overlay']"
    ) as HTMLElement
    expect(overlay.style.width).toBe("100px")
  })

  it("clears the selection when canvas/rect-update arrives with rect=null for the active id", async () => {
    harness = await mount(
      <CanvasHtmlFrame item={makeItem()} interactMode onReactNodeSelect={vi.fn()} />
    )
    const iframe = harness.container.querySelector("iframe") as HTMLIFrameElement
    await selectInIframe(iframe, "abc:0")
    await act(async () => {
      postFromIframe(iframe, {
        [CANVAS_NODE_BRIDGE_MARKER]: true,
        version: CANVAS_NODE_BRIDGE_VERSION,
        type: "canvas/rect-update",
        canvasId: "abc:0",
        rect: null,
      })
    })
    expect(
      harness.container.querySelector("[data-testid='canvas-iframe-overlay']")
    ).toBeNull()
  })

  async function dragOverlayHandle(
    container: HTMLDivElement,
    handleKind: string,
    start: { x: number; y: number },
    end: { x: number; y: number }
  ): Promise<void> {
    const handle = container.querySelector(
      `[data-canvas-overlay-handle="${handleKind}"]`
    ) as HTMLElement
    if (!handle) throw new Error(`handle "${handleKind}" not in DOM`)
    handle.setPointerCapture = vi.fn()
    handle.hasPointerCapture = vi.fn(() => true)
    handle.releasePointerCapture = vi.fn()
    function fire(type: "pointerdown" | "pointerup", x: number, y: number) {
      const ev = new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
      }) as MouseEvent & { pointerId: number; pointerType: string }
      Object.defineProperty(ev, "pointerId", { value: 1 })
      Object.defineProperty(ev, "pointerType", { value: "mouse" })
      handle.dispatchEvent(ev)
    }
    await act(async () => {
      fire("pointerdown", start.x, start.y)
      fire("pointerup", end.x, end.y)
    })
  }

  it("emits onReactNodeResize with iframe-local delta on overlay drag commit (canvasScale=1)", async () => {
    const onResize = vi.fn()
    harness = await mount(
      <CanvasHtmlFrame
        item={makeItem()}
        interactMode
        onReactNodeSelect={vi.fn()}
        onReactNodeResize={onResize}
      />
    )
    const iframe = harness.container.querySelector("iframe") as HTMLIFrameElement
    await selectInIframe(iframe, "abc:0", { x: 10, y: 20, width: 100, height: 40 })
    await dragOverlayHandle(harness.container, "se", { x: 110, y: 60 }, { x: 130, y: 80 })
    expect(onResize).toHaveBeenCalledTimes(1)
    expect(onResize).toHaveBeenCalledWith({
      itemId: "item-1",
      canvasId: "abc:0",
      kind: "se",
      deltaIframe: { dx: 20, dy: 20 },
      rect: { x: 10, y: 20, width: 100, height: 40 },
    })
  })

  it("scales the drag delta by 1/canvasScale (zoomed-out canvas = larger iframe delta)", async () => {
    const onResize = vi.fn()
    harness = await mount(
      <CanvasHtmlFrame
        item={makeItem()}
        interactMode
        canvasScale={0.5}
        onReactNodeSelect={vi.fn()}
        onReactNodeResize={onResize}
      />
    )
    const iframe = harness.container.querySelector("iframe") as HTMLIFrameElement
    await selectInIframe(iframe, "abc:0", { x: 0, y: 0, width: 100, height: 100 })
    await dragOverlayHandle(harness.container, "e", { x: 100, y: 50 }, { x: 110, y: 50 })
    expect(onResize).toHaveBeenCalledTimes(1)
    // 10px on screen at 0.5 canvas zoom = 20px in iframe document.
    expect(onResize.mock.calls[0][0].deltaIframe).toEqual({ dx: 20, dy: 0 })
  })

  it("does nothing on drag commit when no element is selected", async () => {
    const onResize = vi.fn()
    harness = await mount(
      <CanvasHtmlFrame
        item={makeItem()}
        interactMode
        onReactNodeSelect={vi.fn()}
        onReactNodeResize={onResize}
      />
    )
    // No selection sent — overlay should not render, so handle query will fail.
    expect(
      harness.container.querySelector("[data-canvas-overlay-handle='se']")
    ).toBeNull()
    expect(onResize).not.toHaveBeenCalled()
  })

  it("does not attach the message listener for bundle/url item modes", async () => {
    const onSelect = vi.fn()
    harness = await mount(
      <CanvasHtmlFrame
        item={makeItem({
          sourceMode: "bundle",
          sourceReact: undefined,
          src: "/some/bundle/index.html",
        })}
        interactMode
        onReactNodeSelect={onSelect}
      />
    )
    const iframe = harness.container.querySelector("iframe") as HTMLIFrameElement
    await act(async () => {
      postFromIframe(iframe, {
        [CANVAS_NODE_BRIDGE_MARKER]: true,
        version: CANVAS_NODE_BRIDGE_VERSION,
        type: "canvas/select",
        canvasId: "abc:0",
        tag: "button",
        rect: { x: 0, y: 0, width: 0, height: 0 },
      })
    })
    expect(onSelect).not.toHaveBeenCalled()
  })
})
