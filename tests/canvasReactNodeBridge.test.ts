// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  CANVAS_NODE_BRIDGE_MARKER,
  CANVAS_NODE_BRIDGE_VERSION,
  buildBridgeScript,
  buildHoverMessage,
  buildSelectMessage,
  findNearestCanvasIdAncestor,
  installBridgeForTesting,
  isCanvasReactNodeMessage,
} from "../utils/canvasReactNodeBridge"

// DOM construction helper — avoids innerHTML in tests so we don't trip
// security reminders for test fixtures. All inputs are hardcoded literals
// from the test bodies.
function makeEl(tag: string, attrs: Record<string, string> = {}, text?: string): HTMLElement {
  const el = document.createElement(tag)
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, value)
  }
  if (text != null) el.textContent = text
  return el
}

function clearBody(): void {
  while (document.body.firstChild) document.body.removeChild(document.body.firstChild)
}

describe("isCanvasReactNodeMessage", () => {
  it("accepts well-formed messages", () => {
    expect(
      isCanvasReactNodeMessage({
        [CANVAS_NODE_BRIDGE_MARKER]: true,
        type: "canvas/select",
      })
    ).toBe(true)
  })

  it("rejects messages without the marker", () => {
    expect(isCanvasReactNodeMessage({ type: "canvas/select" })).toBe(false)
    expect(isCanvasReactNodeMessage({ [CANVAS_NODE_BRIDGE_MARKER]: false })).toBe(false)
  })

  it("rejects non-objects", () => {
    expect(isCanvasReactNodeMessage(null)).toBe(false)
    expect(isCanvasReactNodeMessage("hi")).toBe(false)
    expect(isCanvasReactNodeMessage(42)).toBe(false)
  })
})

describe("findNearestCanvasIdAncestor", () => {
  beforeEach(() => clearBody())

  it("finds the matching element when start is itself the match", () => {
    const div = makeEl("div", { "data-canvas-id": "abc:1.2" })
    div.appendChild(makeEl("span", {}, "x"))
    document.body.appendChild(div)
    expect(findNearestCanvasIdAncestor(div)).toBe(div)
  })

  it("walks up to find the nearest matching ancestor", () => {
    const div = makeEl("div", { "data-canvas-id": "abc:1.2" })
    const span = makeEl("span")
    const b = makeEl("b", {}, "x")
    span.appendChild(b)
    div.appendChild(span)
    document.body.appendChild(div)
    expect(findNearestCanvasIdAncestor(b)).toBe(div)
  })

  it("stops at the deepest matching ancestor when nested matches exist", () => {
    const outer = makeEl("div", { "data-canvas-id": "outer:0" })
    const inner = makeEl("section", { "data-canvas-id": "inner:1" })
    const span = makeEl("span", {}, "x")
    inner.appendChild(span)
    outer.appendChild(inner)
    document.body.appendChild(outer)
    expect(findNearestCanvasIdAncestor(span)).toBe(inner)
  })

  it("returns null when no ancestor has data-canvas-id", () => {
    const div = makeEl("div")
    const span = makeEl("span", {}, "x")
    div.appendChild(span)
    document.body.appendChild(div)
    expect(findNearestCanvasIdAncestor(span)).toBeNull()
  })

  it("returns null when start is null", () => {
    expect(findNearestCanvasIdAncestor(null)).toBeNull()
  })
})

describe("buildSelectMessage", () => {
  beforeEach(() => clearBody())

  it("captures canvasId, tag, and rect", () => {
    const button = makeEl("button", { "data-canvas-id": "abc:1.2" }, "x")
    document.body.appendChild(button)
    const msg = buildSelectMessage(button, "fileA")
    expect(msg).toMatchObject({
      [CANVAS_NODE_BRIDGE_MARKER]: true,
      version: CANVAS_NODE_BRIDGE_VERSION,
      type: "canvas/select",
      canvasId: "abc:1.2",
      tag: "button",
      fileHint: "fileA",
    })
    expect(msg.rect).toMatchObject({
      x: expect.any(Number),
      y: expect.any(Number),
      width: expect.any(Number),
      height: expect.any(Number),
    })
  })

  it("falls back to empty canvasId when missing", () => {
    const button = makeEl("button", {}, "x")
    document.body.appendChild(button)
    const msg = buildSelectMessage(button)
    expect(msg.canvasId).toBe("")
  })
})

describe("buildHoverMessage", () => {
  beforeEach(() => clearBody())

  it("emits null canvasId/rect when target is null", () => {
    const msg = buildHoverMessage(null, "fileA")
    expect(msg.canvasId).toBeNull()
    expect(msg.rect).toBeNull()
    expect(msg.type).toBe("canvas/hover")
    expect(msg.fileHint).toBe("fileA")
  })

  it("captures canvasId and rect when target is provided", () => {
    const div = makeEl("div", { "data-canvas-id": "abc:0" }, "x")
    document.body.appendChild(div)
    const msg = buildHoverMessage(div, "fileA")
    expect(msg.canvasId).toBe("abc:0")
    expect(msg.rect).not.toBeNull()
  })
})

describe("buildBridgeScript", () => {
  it("returns a <script> tag with the marker attribute", () => {
    const out = buildBridgeScript("fileA")
    expect(out).toMatch(/^<script data-canvas-iframe-bridge="react-node-select">/)
    expect(out).toMatch(/<\/script>$/)
  })

  it("embeds the fileHint inside the script options", () => {
    const out = buildBridgeScript("projects/foo/bar.tsx")
    expect(out).toContain('"fileHint":"projects/foo/bar.tsx"')
  })

  it("embeds the marker constant so iframe + parent share the same wire format", () => {
    const out = buildBridgeScript("fileA")
    expect(out).toContain(`"marker":"${CANVAS_NODE_BRIDGE_MARKER}"`)
    expect(out).toContain(`"version":${CANVAS_NODE_BRIDGE_VERSION}`)
  })
})

describe("end-to-end: install bridge in jsdom and observe postMessage", () => {
  let parentMock: { postMessage: ReturnType<typeof vi.fn> }
  let originalParent: typeof window.parent

  beforeEach(() => {
    parentMock = { postMessage: vi.fn() }
    originalParent = window.parent
    Object.defineProperty(window, "parent", {
      configurable: true,
      get: () => parentMock,
    })
    clearBody()
    delete (window as unknown as Record<string, unknown>)
      .__canvasReactNodeBridgeInstalled
  })

  afterEach(() => {
    Object.defineProperty(window, "parent", {
      configurable: true,
      value: originalParent,
    })
  })

  it("posts canvas/ready on install", () => {
    installBridgeForTesting(window, "fileA")
    const readyCall = parentMock.postMessage.mock.calls.find(
      (call) => call[0]?.type === "canvas/ready"
    )
    expect(readyCall).toBeDefined()
    expect(readyCall![0].fileHint).toBe("fileA")
  })

  it("posts canvas/select on click on a tagged element", () => {
    installBridgeForTesting(window, "fileA")
    const button = makeEl("button", { "data-canvas-id": "abc:1.2" }, "x")
    document.body.appendChild(button)
    parentMock.postMessage.mockClear()
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    const selectCall = parentMock.postMessage.mock.calls.find(
      (call) => call[0]?.type === "canvas/select"
    )
    expect(selectCall).toBeDefined()
    expect(selectCall![0].canvasId).toBe("abc:1.2")
    expect(selectCall![0].tag).toBe("button")
    expect(selectCall![0].fileHint).toBe("fileA")
  })

  it("walks up to the nearest tagged ancestor on click", () => {
    installBridgeForTesting(window, "fileA")
    const outer = makeEl("div", { "data-canvas-id": "outer:0" })
    const span = makeEl("span")
    const b = makeEl("b", {}, "nope")
    span.appendChild(b)
    outer.appendChild(span)
    document.body.appendChild(outer)
    parentMock.postMessage.mockClear()
    b.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    const selectCall = parentMock.postMessage.mock.calls.find(
      (call) => call[0]?.type === "canvas/select"
    )
    expect(selectCall).toBeDefined()
    expect(selectCall![0].canvasId).toBe("outer:0")
    expect(selectCall![0].tag).toBe("div")
  })

  it("does NOT post canvas/select on click outside any tagged element", () => {
    installBridgeForTesting(window, "fileA")
    const div = makeEl("div")
    const span = makeEl("span", {}, "nope")
    div.appendChild(span)
    document.body.appendChild(div)
    parentMock.postMessage.mockClear()
    span.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    const selectCall = parentMock.postMessage.mock.calls.find(
      (call) => call[0]?.type === "canvas/select"
    )
    expect(selectCall).toBeUndefined()
  })

  it("is idempotent — second install is a no-op", () => {
    installBridgeForTesting(window, "fileA")
    parentMock.postMessage.mockClear()
    installBridgeForTesting(window, "fileA")
    const readyCallsAfter = parentMock.postMessage.mock.calls.filter(
      (call) => call[0]?.type === "canvas/ready"
    )
    expect(readyCallsAfter).toHaveLength(0)
  })

  it("does not install when window.parent === window (top-level page)", () => {
    Object.defineProperty(window, "parent", {
      configurable: true,
      get: () => window,
    })
    delete (window as unknown as Record<string, unknown>)
      .__canvasReactNodeBridgeInstalled
    parentMock.postMessage.mockClear()
    installBridgeForTesting(window, "fileA")
    const button = makeEl("button", { "data-canvas-id": "abc" }, "x")
    document.body.appendChild(button)
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    expect(parentMock.postMessage).not.toHaveBeenCalled()
  })
})
