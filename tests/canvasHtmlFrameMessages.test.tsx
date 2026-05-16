// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { CanvasHtmlFrame } from "../components/canvas/CanvasHtmlFrame"
import type { CanvasHtmlItem } from "../types/canvas"
import {
  CANVAS_NODE_BRIDGE_MARKER,
  CANVAS_NODE_BRIDGE_VERSION,
  buildRefreshRectRequest,
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

  it("requests canvas/refresh-rect after inline source changes when an active selection exists", async () => {
    fetchMock.mockImplementation(async (_url, init) => {
      const body = JSON.parse(String(init?.body || "{}"))
      return {
        ok: true,
        json: async () => ({
          ok: true,
          html: String(body.sourceHtml || ""),
        }),
      }
    })
    const activeSelection = {
      itemId: "item-1",
      canvasId: "abc:0",
      tag: "button",
      rect: { x: 10, y: 20, width: 100, height: 40 },
      compileGeneration: 1,
    }
    harness = await mount(
      <CanvasHtmlFrame
        item={makeItem({
          sourceMode: "inline",
          sourceHtml: "<button>Click</button>",
          sourceReact: undefined,
        })}
        interactMode
        activeSelection={activeSelection}
      />
    )
    const iframe = harness.container.querySelector("iframe") as HTMLIFrameElement
    const targetWindow = iframe.contentWindow as Window
    const postMessageSpy = vi.fn()
    Object.defineProperty(targetWindow, "postMessage", {
      configurable: true,
      value: postMessageSpy,
    })

    await act(async () => {
      harness?.root.render(
        <CanvasHtmlFrame
          item={makeItem({
            sourceMode: "inline",
            sourceHtml: "<button>Pressed</button>",
            sourceReact: undefined,
          })}
          interactMode
          activeSelection={activeSelection}
        />
      )
    })
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(postMessageSpy).toHaveBeenCalledWith(
      buildRefreshRectRequest("abc:0"),
      window.location.origin
    )
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

describe("CanvasHtmlFrame — U4b library drop-target wiring", () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let harness: Harness | null = null

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        html: '<!doctype html><html><body><div id="root"></div></body></html>',
      }),
    })
    vi.stubGlobal("fetch", fetchMock)
    // dragover schedules the hit-test in a rAF; run it synchronously so the
    // postMessage lands inside the same act() flush.
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0)
      return 1
    })
    vi.stubGlobal("cancelAnimationFrame", () => {})
  })

  afterEach(() => {
    if (harness) {
      harness.cleanup()
      harness = null
    }
    vi.unstubAllGlobals()
  })

  function anchorIframe(iframe: HTMLIFrameElement): { spy: ReturnType<typeof vi.fn> } {
    iframe.getBoundingClientRect = () =>
      ({ left: 100, top: 50, right: 500, bottom: 350, width: 400, height: 300, x: 100, y: 50 }) as DOMRect
    const spy = vi.fn()
    Object.defineProperty(iframe.contentWindow as Window, "postMessage", {
      configurable: true,
      value: spy,
    })
    return { spy }
  }

  function fireDrag(
    el: Element,
    type: "dragover" | "drop" | "dragleave",
    init: { clientX?: number; clientY?: number; relatedTarget?: EventTarget | null } = {}
  ): void {
    const ev = new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: init.clientX ?? 0,
      clientY: init.clientY ?? 0,
    })
    Object.defineProperty(ev, "dataTransfer", {
      configurable: true,
      value: { dropEffect: "", effectAllowed: "" },
    })
    if ("relatedTarget" in init) {
      Object.defineProperty(ev, "relatedTarget", {
        configurable: true,
        value: init.relatedTarget ?? null,
      })
    }
    el.dispatchEvent(ev)
  }

  function getResultRequestId(spy: ReturnType<typeof vi.fn>): string {
    const call = spy.mock.calls.find(
      ([msg]) => msg && msg.type === "canvas/drop-target-hit-test"
    )
    if (!call) throw new Error("no drop-target-hit-test was posted")
    return call[0].requestId as string
  }

  it("does not mount the capture layer until libraryDragActive is true", async () => {
    harness = await mount(<CanvasHtmlFrame item={makeItem()} interactMode={false} />)
    expect(
      harness.container.querySelector("[data-testid='canvas-html-frame-drag-capture']")
    ).toBeNull()

    await act(async () => {
      harness?.root.render(
        <CanvasHtmlFrame item={makeItem()} interactMode={false} libraryDragActive />
      )
    })
    expect(
      harness.container.querySelector("[data-testid='canvas-html-frame-drag-capture']")
    ).not.toBeNull()
  })

  it("posts canvas/drop-target-hit-test with iframe-local coords on dragover", async () => {
    harness = await mount(
      <CanvasHtmlFrame item={makeItem()} interactMode={false} libraryDragActive />
    )
    const iframe = harness.container.querySelector("iframe") as HTMLIFrameElement
    const { spy } = anchorIframe(iframe)
    const capture = harness.container.querySelector(
      "[data-testid='canvas-html-frame-drag-capture']"
    ) as HTMLElement

    await act(async () => {
      fireDrag(capture, "dragover", { clientX: 180, clientY: 130 })
    })

    const call = spy.mock.calls.find(
      ([msg]) => msg && msg.type === "canvas/drop-target-hit-test"
    )
    expect(call).toBeTruthy()
    // 180 - 100 = 80 ; 130 - 50 = 80
    expect(call?.[0]).toMatchObject({
      type: "canvas/drop-target-hit-test",
      x: 80,
      y: 80,
    })
    expect(call?.[1]).toBe(window.location.origin)
  })

  it("divides drop hit-test coords by canvasScale (regression: zoom != 100%)", async () => {
    harness = await mount(
      <CanvasHtmlFrame
        item={makeItem()}
        interactMode={false}
        libraryDragActive
        canvasScale={2}
      />
    )
    const iframe = harness.container.querySelector("iframe") as HTMLIFrameElement
    const { spy } = anchorIframe(iframe)
    const capture = harness.container.querySelector(
      "[data-testid='canvas-html-frame-drag-capture']"
    ) as HTMLElement

    await act(async () => {
      fireDrag(capture, "dragover", { clientX: 180, clientY: 130 })
    })

    const call = spy.mock.calls.find(
      ([msg]) => msg && msg.type === "canvas/drop-target-hit-test"
    )
    // (180 - 100) / 2 = 40 ; (130 - 50) / 2 = 40 — without the /scale fix
    // this would be 80/80 and resolve the wrong iframe element.
    expect(call?.[0]).toMatchObject({ type: "canvas/drop-target-hit-test", x: 40, y: 40 })
  })

  it("renders insert-line zones from a matching canvas/drop-target-result", async () => {
    harness = await mount(
      <CanvasHtmlFrame item={makeItem()} interactMode={false} libraryDragActive />
    )
    const iframe = harness.container.querySelector("iframe") as HTMLIFrameElement
    const { spy } = anchorIframe(iframe)
    const capture = harness.container.querySelector(
      "[data-testid='canvas-html-frame-drag-capture']"
    ) as HTMLElement

    await act(async () => {
      fireDrag(capture, "dragover", { clientX: 180, clientY: 130 })
    })
    const requestId = getResultRequestId(spy)

    await act(async () => {
      postFromIframe(iframe, {
        [CANVAS_NODE_BRIDGE_MARKER]: true,
        version: CANVAS_NODE_BRIDGE_VERSION,
        type: "canvas/drop-target-result",
        requestId,
        parentCanvasId: "stack:0",
        parentRect: { x: 0, y: 0, width: 200, height: 120 },
        siblings: [
          { canvasId: "a:0", rect: { x: 0, y: 0, width: 200, height: 40 }, index: 0 },
          { canvasId: "b:0", rect: { x: 0, y: 60, width: 200, height: 40 }, index: 1 },
        ],
        leaf: false,
      })
    })

    expect(
      harness.container.querySelector("[data-testid='canvas-iframe-drop-zones']")
    ).not.toBeNull()
    // 2 siblings, vertical flow → N+1 = 3 insert lines.
    expect(
      harness.container.querySelectorAll("[data-canvas-drop-zone-index]").length
    ).toBe(3)
  })

  it("renders a wrap zone when the result marks the parent as leaf", async () => {
    harness = await mount(
      <CanvasHtmlFrame item={makeItem()} interactMode={false} libraryDragActive />
    )
    const iframe = harness.container.querySelector("iframe") as HTMLIFrameElement
    const { spy } = anchorIframe(iframe)
    const capture = harness.container.querySelector(
      "[data-testid='canvas-html-frame-drag-capture']"
    ) as HTMLElement

    await act(async () => {
      fireDrag(capture, "dragover", { clientX: 150, clientY: 90 })
    })
    const requestId = getResultRequestId(spy)

    await act(async () => {
      postFromIframe(iframe, {
        [CANVAS_NODE_BRIDGE_MARKER]: true,
        version: CANVAS_NODE_BRIDGE_VERSION,
        type: "canvas/drop-target-result",
        requestId,
        parentCanvasId: "leaf:0",
        parentRect: { x: 5, y: 5, width: 100, height: 30 },
        siblings: [],
        leaf: true,
      })
    })

    const wrap = harness.container.querySelector(
      "[data-testid='canvas-iframe-drop-zone-wrap']"
    ) as HTMLElement
    expect(wrap).not.toBeNull()
    expect(wrap.getAttribute("data-canvas-drop-wrap-canvas-id")).toBe("leaf:0")
  })

  it("discards a drop-target-result whose requestId is stale", async () => {
    harness = await mount(
      <CanvasHtmlFrame item={makeItem()} interactMode={false} libraryDragActive />
    )
    const iframe = harness.container.querySelector("iframe") as HTMLIFrameElement
    anchorIframe(iframe)
    const capture = harness.container.querySelector(
      "[data-testid='canvas-html-frame-drag-capture']"
    ) as HTMLElement

    await act(async () => {
      fireDrag(capture, "dragover", { clientX: 180, clientY: 130 })
    })

    await act(async () => {
      postFromIframe(iframe, {
        [CANVAS_NODE_BRIDGE_MARKER]: true,
        version: CANVAS_NODE_BRIDGE_VERSION,
        type: "canvas/drop-target-result",
        requestId: "stale-id-not-the-latest",
        parentCanvasId: "stack:0",
        parentRect: { x: 0, y: 0, width: 200, height: 120 },
        siblings: [{ canvasId: "a:0", rect: { x: 0, y: 0, width: 200, height: 40 }, index: 0 }],
        leaf: false,
      })
    })

    expect(
      harness.container.querySelector("[data-testid='canvas-iframe-drop-zones']")
    ).toBeNull()
  })

  it("clears zones for a result with a null parent (no ancestor under the cursor)", async () => {
    harness = await mount(
      <CanvasHtmlFrame item={makeItem()} interactMode={false} libraryDragActive />
    )
    const iframe = harness.container.querySelector("iframe") as HTMLIFrameElement
    const { spy } = anchorIframe(iframe)
    const capture = harness.container.querySelector(
      "[data-testid='canvas-html-frame-drag-capture']"
    ) as HTMLElement

    await act(async () => {
      fireDrag(capture, "dragover", { clientX: 180, clientY: 130 })
    })
    const firstRequestId = getResultRequestId(spy)
    await act(async () => {
      postFromIframe(iframe, {
        [CANVAS_NODE_BRIDGE_MARKER]: true,
        version: CANVAS_NODE_BRIDGE_VERSION,
        type: "canvas/drop-target-result",
        requestId: firstRequestId,
        parentCanvasId: "stack:0",
        parentRect: { x: 0, y: 0, width: 200, height: 120 },
        siblings: [{ canvasId: "a:0", rect: { x: 0, y: 0, width: 200, height: 40 }, index: 0 }],
        leaf: false,
      })
    })
    expect(
      harness.container.querySelector("[data-testid='canvas-iframe-drop-zones']")
    ).not.toBeNull()

    await act(async () => {
      fireDrag(capture, "dragover", { clientX: 180, clientY: 130 })
    })
    const secondRequestId = getResultRequestId(spy)
    await act(async () => {
      postFromIframe(iframe, {
        [CANVAS_NODE_BRIDGE_MARKER]: true,
        version: CANVAS_NODE_BRIDGE_VERSION,
        type: "canvas/drop-target-result",
        requestId: secondRequestId,
        parentCanvasId: null,
        parentRect: null,
        siblings: [],
        leaf: false,
      })
    })
    expect(
      harness.container.querySelector("[data-testid='canvas-iframe-drop-zones']")
    ).toBeNull()
  })

  it("tears down the capture layer and zones when libraryDragActive flips to false", async () => {
    harness = await mount(
      <CanvasHtmlFrame item={makeItem()} interactMode={false} libraryDragActive />
    )
    const iframe = harness.container.querySelector("iframe") as HTMLIFrameElement
    const { spy } = anchorIframe(iframe)
    const capture = harness.container.querySelector(
      "[data-testid='canvas-html-frame-drag-capture']"
    ) as HTMLElement
    await act(async () => {
      fireDrag(capture, "dragover", { clientX: 180, clientY: 130 })
    })
    await act(async () => {
      postFromIframe(iframe, {
        [CANVAS_NODE_BRIDGE_MARKER]: true,
        version: CANVAS_NODE_BRIDGE_VERSION,
        type: "canvas/drop-target-result",
        requestId: getResultRequestId(spy),
        parentCanvasId: "stack:0",
        parentRect: { x: 0, y: 0, width: 200, height: 120 },
        siblings: [{ canvasId: "a:0", rect: { x: 0, y: 0, width: 200, height: 40 }, index: 0 }],
        leaf: false,
      })
    })
    expect(
      harness.container.querySelector("[data-testid='canvas-iframe-drop-zones']")
    ).not.toBeNull()

    await act(async () => {
      harness?.root.render(
        <CanvasHtmlFrame item={makeItem()} interactMode={false} libraryDragActive={false} />
      )
    })

    expect(
      harness.container.querySelector("[data-testid='canvas-html-frame-drag-capture']")
    ).toBeNull()
    expect(
      harness.container.querySelector("[data-testid='canvas-iframe-drop-zones']")
    ).toBeNull()
  })

  it("fires onLibraryDropInsert with itemId + parent + index when an insert line is dropped on", async () => {
    const onInsert = vi.fn()
    harness = await mount(
      <CanvasHtmlFrame
        item={makeItem({ id: "frame-9" })}
        interactMode={false}
        libraryDragActive
        onLibraryDropInsert={onInsert}
      />
    )
    const iframe = harness.container.querySelector("iframe") as HTMLIFrameElement
    const { spy } = anchorIframe(iframe)
    const capture = harness.container.querySelector(
      "[data-testid='canvas-html-frame-drag-capture']"
    ) as HTMLElement
    await act(async () => {
      fireDrag(capture, "dragover", { clientX: 180, clientY: 130 })
    })
    await act(async () => {
      postFromIframe(iframe, {
        [CANVAS_NODE_BRIDGE_MARKER]: true,
        version: CANVAS_NODE_BRIDGE_VERSION,
        type: "canvas/drop-target-result",
        requestId: getResultRequestId(spy),
        parentCanvasId: "stack:0",
        parentRect: { x: 0, y: 0, width: 200, height: 120 },
        siblings: [
          { canvasId: "a:0", rect: { x: 0, y: 0, width: 200, height: 40 }, index: 0 },
          { canvasId: "b:0", rect: { x: 0, y: 60, width: 200, height: 40 }, index: 1 },
        ],
        leaf: false,
      })
    })

    const lines = harness.container.querySelectorAll("[data-canvas-drop-zone-index]")
    const lastLine = lines[lines.length - 1] as HTMLElement
    await act(async () => {
      fireDrag(lastLine, "drop")
    })

    expect(onInsert).toHaveBeenCalledWith({
      itemId: "frame-9",
      parentCanvasId: "stack:0",
      index: 2,
    })
  })

  it("fires onLibraryDropWrap with itemId + canvasId when the wrap zone is dropped on", async () => {
    const onWrap = vi.fn()
    harness = await mount(
      <CanvasHtmlFrame
        item={makeItem({ id: "frame-7" })}
        interactMode={false}
        libraryDragActive
        onLibraryDropWrap={onWrap}
      />
    )
    const iframe = harness.container.querySelector("iframe") as HTMLIFrameElement
    const { spy } = anchorIframe(iframe)
    const capture = harness.container.querySelector(
      "[data-testid='canvas-html-frame-drag-capture']"
    ) as HTMLElement
    await act(async () => {
      fireDrag(capture, "dragover", { clientX: 150, clientY: 90 })
    })
    await act(async () => {
      postFromIframe(iframe, {
        [CANVAS_NODE_BRIDGE_MARKER]: true,
        version: CANVAS_NODE_BRIDGE_VERSION,
        type: "canvas/drop-target-result",
        requestId: getResultRequestId(spy),
        parentCanvasId: "leaf:0",
        parentRect: { x: 5, y: 5, width: 100, height: 30 },
        siblings: [],
        leaf: true,
      })
    })

    const wrap = harness.container.querySelector(
      "[data-testid='canvas-iframe-drop-zone-wrap']"
    ) as HTMLElement
    await act(async () => {
      fireDrag(wrap, "drop")
    })

    expect(onWrap).toHaveBeenCalledWith({ itemId: "frame-7", canvasId: "leaf:0" })
  })
})

describe("CanvasHtmlFrame — U12 single-iframe multi-select", () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let harness: Harness | null = null

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        html: '<!doctype html><html><body><div id="root"></div></body></html>',
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

  function postSelect(
    iframe: HTMLIFrameElement,
    canvasId: string,
    rect: { x: number; y: number; width: number; height: number },
    additive?: boolean
  ) {
    postFromIframe(iframe, {
      [CANVAS_NODE_BRIDGE_MARKER]: true,
      version: CANVAS_NODE_BRIDGE_VERSION,
      type: "canvas/select",
      canvasId,
      tag: "div",
      rect,
      fileHint: "item-1",
      ...(additive ? { additive: true } : {}),
    })
  }

  it("keeps the multi-set across parent activeSelection re-creation (regression: U12 dead-on-arrival)", async () => {
    // CanvasTab recreates the activeSelection object on every onReactNodeSelect
    // (every click, incl. shift-click). The multi-set must survive that prop
    // identity change — only a real recompile should clear it. Before the
    // fix, the clear lived in an effect keyed on activeSelection, so the set
    // was wiped the moment the shift-click's onReactNodeSelect round-tripped.
    harness = await mount(<CanvasHtmlFrame item={makeItem()} interactMode={false} />)
    const iframe = harness.container.querySelector("iframe") as HTMLIFrameElement
    await act(async () => {
      postSelect(iframe, "a:0", { x: 10, y: 10, width: 40, height: 20 })
    })
    // Parent reacts to select A by handing back a fresh activeSelection object.
    await act(async () => {
      harness?.root.render(
        <CanvasHtmlFrame
          item={makeItem()}
          interactMode={false}
          activeSelection={{
            itemId: "item-1",
            canvasId: "a:0",
            tag: "div",
            rect: { x: 10, y: 10, width: 40, height: 20 },
            compileGeneration: 1,
          }}
        />
      )
    })
    await act(async () => {
      postSelect(iframe, "b:0", { x: 100, y: 60, width: 30, height: 30 }, true)
    })
    // Parent reacts to select B with yet another fresh activeSelection object.
    await act(async () => {
      harness?.root.render(
        <CanvasHtmlFrame
          item={makeItem()}
          interactMode={false}
          activeSelection={{
            itemId: "item-1",
            canvasId: "b:0",
            tag: "div",
            rect: { x: 100, y: 60, width: 30, height: 30 },
            compileGeneration: 1,
          }}
        />
      )
    })
    const union = harness.container.querySelector(
      "[data-testid='canvas-iframe-multi-select']"
    ) as HTMLElement
    expect(union).not.toBeNull()
    expect(union.getAttribute("data-canvas-multi-select-count")).toBe("2")
  })

  it("renders a union outline + count once two elements are shift-selected", async () => {
    harness = await mount(<CanvasHtmlFrame item={makeItem()} interactMode={false} />)
    const iframe = harness.container.querySelector("iframe") as HTMLIFrameElement
    await act(async () => {
      postSelect(iframe, "a:0", { x: 10, y: 10, width: 40, height: 20 })
    })
    expect(
      harness.container.querySelector("[data-testid='canvas-iframe-multi-select']")
    ).toBeNull()

    await act(async () => {
      postSelect(iframe, "b:0", { x: 100, y: 60, width: 30, height: 30 }, true)
    })
    const union = harness.container.querySelector(
      "[data-testid='canvas-iframe-multi-select']"
    ) as HTMLElement
    expect(union).not.toBeNull()
    expect(union.getAttribute("data-canvas-multi-select-count")).toBe("2")
    // Union spans both rects: x 10..130, y 10..90.
    expect(union.style.left).toBe("10px")
    expect(union.style.top).toBe("10px")
    expect(union.style.width).toBe("120px")
    expect(union.style.height).toBe("80px")
  })

  it("a plain (non-additive) select collapses the multi-set back to one", async () => {
    harness = await mount(<CanvasHtmlFrame item={makeItem()} interactMode={false} />)
    const iframe = harness.container.querySelector("iframe") as HTMLIFrameElement
    await act(async () => {
      postSelect(iframe, "a:0", { x: 0, y: 0, width: 10, height: 10 })
      postSelect(iframe, "b:0", { x: 50, y: 50, width: 10, height: 10 }, true)
    })
    expect(
      harness.container.querySelector("[data-testid='canvas-iframe-multi-select']")
    ).not.toBeNull()

    await act(async () => {
      postSelect(iframe, "c:0", { x: 5, y: 5, width: 10, height: 10 })
    })
    expect(
      harness.container.querySelector("[data-testid='canvas-iframe-multi-select']")
    ).toBeNull()
  })

  it("shift-clicking an already-selected element toggles it back out", async () => {
    harness = await mount(<CanvasHtmlFrame item={makeItem()} interactMode={false} />)
    const iframe = harness.container.querySelector("iframe") as HTMLIFrameElement
    await act(async () => {
      postSelect(iframe, "a:0", { x: 0, y: 0, width: 10, height: 10 })
      postSelect(iframe, "b:0", { x: 50, y: 50, width: 10, height: 10 }, true)
    })
    expect(
      harness.container.querySelector("[data-testid='canvas-iframe-multi-select']")
    ).not.toBeNull()

    await act(async () => {
      postSelect(iframe, "b:0", { x: 50, y: 50, width: 10, height: 10 }, true)
    })
    // Back down to one selection → union indicator gone.
    expect(
      harness.container.querySelector("[data-testid='canvas-iframe-multi-select']")
    ).toBeNull()
  })

  it("drags the union overlay and emits onReactNodeGroupResize with every target (U12 group)", async () => {
    const onGroup = vi.fn()
    harness = await mount(
      <CanvasHtmlFrame
        item={makeItem()}
        interactMode
        onReactNodeGroupResize={onGroup}
      />
    )
    const iframe = harness.container.querySelector("iframe") as HTMLIFrameElement
    await act(async () => {
      postSelect(iframe, "a:0", { x: 0, y: 0, width: 100, height: 40 })
      postSelect(iframe, "b:0", { x: 0, y: 60, width: 100, height: 40 }, true)
    })

    const handle = harness.container.querySelector(
      "[data-canvas-overlay-handle='se']"
    ) as HTMLElement
    expect(handle).not.toBeNull()
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
      fire("pointerdown", 100, 100)
      fire("pointerup", 120, 120)
    })

    expect(onGroup).toHaveBeenCalledTimes(1)
    const arg = onGroup.mock.calls[0][0]
    expect(arg.itemId).toBe("item-1")
    expect(arg.kind).toBe("se")
    expect(arg.targets).toEqual([
      { canvasId: "a:0", rect: { x: 0, y: 0, width: 100, height: 40 } },
      { canvasId: "b:0", rect: { x: 0, y: 60, width: 100, height: 40 } },
    ])
  })

  it("uses the single-node resize path (not group) when only one element is selected", async () => {
    const onGroup = vi.fn()
    const onResize = vi.fn()
    harness = await mount(
      <CanvasHtmlFrame
        item={makeItem()}
        interactMode
        onReactNodeGroupResize={onGroup}
        onReactNodeResize={onResize}
      />
    )
    const iframe = harness.container.querySelector("iframe") as HTMLIFrameElement
    await act(async () => {
      postSelect(iframe, "a:0", { x: 0, y: 0, width: 100, height: 40 })
    })
    const handle = harness.container.querySelector(
      "[data-canvas-overlay-handle='se']"
    ) as HTMLElement
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
      fire("pointerdown", 100, 40)
      fire("pointerup", 120, 60)
    })
    expect(onGroup).not.toHaveBeenCalled()
    expect(onResize).toHaveBeenCalledTimes(1)
  })
})
