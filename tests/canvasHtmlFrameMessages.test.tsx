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

  it("does not attach the message listener for non-React item modes", async () => {
    const onSelect = vi.fn()
    harness = await mount(
      <CanvasHtmlFrame
        item={makeItem({
          sourceMode: "inline",
          sourceReact: undefined,
          sourceHtml: "<button>x</button>",
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
