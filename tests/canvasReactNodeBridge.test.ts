// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  CANVAS_NODE_BRIDGE_MARKER,
  CANVAS_NODE_BRIDGE_VERSION,
  buildBridgeScript,
  buildDropTargetHitTestRequest,
  buildEditCommitRequest,
  buildEditStartRequest,
  buildHoverMessage,
  buildRefreshRectRequest,
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

// jsdom (24.x at time of writing) does not implement Document.elementFromPoint,
// so vi.spyOn rejects it. We install a stub directly and the tests that need
// it call setElementFromPoint(el) to control what gets returned.
function setElementFromPoint(target: Element | null): void {
  ;(document as unknown as { elementFromPoint: (x: number, y: number) => Element | null })
    .elementFromPoint = () => target
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

  it("accepts v3 outbound message types (rect-update, edit-result)", () => {
    expect(
      isCanvasReactNodeMessage({
        [CANVAS_NODE_BRIDGE_MARKER]: true,
        type: "canvas/rect-update",
      })
    ).toBe(true)
    expect(
      isCanvasReactNodeMessage({
        [CANVAS_NODE_BRIDGE_MARKER]: true,
        type: "canvas/edit-result",
      })
    ).toBe(true)
  })

  it("accepts canvas/drop-target-result outbound messages", () => {
    expect(
      isCanvasReactNodeMessage({
        [CANVAS_NODE_BRIDGE_MARKER]: true,
        type: "canvas/drop-target-result",
      })
    ).toBe(true)
  })
})

describe("parent → iframe request builders", () => {
  it("buildRefreshRectRequest emits canvasId + marker + version", () => {
    expect(buildRefreshRectRequest("abc:1")).toEqual({
      [CANVAS_NODE_BRIDGE_MARKER]: true,
      version: CANVAS_NODE_BRIDGE_VERSION,
      type: "canvas/refresh-rect",
      canvasId: "abc:1",
    })
  })

  it("buildEditStartRequest emits canvasId + marker + version", () => {
    expect(buildEditStartRequest("abc:1").type).toBe("canvas/edit-start")
  })

  it("buildEditCommitRequest emits canvasId + marker + version", () => {
    expect(buildEditCommitRequest("abc:1").type).toBe("canvas/edit-commit")
  })

  it("buildDropTargetHitTestRequest emits requestId, x, y, marker, version", () => {
    expect(buildDropTargetHitTestRequest({ requestId: "r-1", x: 12.5, y: 34 })).toEqual({
      [CANVAS_NODE_BRIDGE_MARKER]: true,
      version: CANVAS_NODE_BRIDGE_VERSION,
      type: "canvas/drop-target-hit-test",
      requestId: "r-1",
      x: 12.5,
      y: 34,
    })
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

  it("omits additive by default and sets it only when requested (U12)", () => {
    const el = makeEl("div", { "data-canvas-id": "x:0" }, "x")
    document.body.appendChild(el)
    expect(buildSelectMessage(el, "fileA").additive).toBeUndefined()
    expect(buildSelectMessage(el, "fileA", false).additive).toBeUndefined()
    expect(buildSelectMessage(el, "fileA", true).additive).toBe(true)
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

  it("escapes </script> in fileHint so HTML cannot break out of the script tag", () => {
    const malicious = "evil</script><img src=x onerror=alert(1)>"
    const out = buildBridgeScript(malicious)
    // There should be exactly one </script> in the output — the legitimate
    // closing tag at the end. The malicious one is escaped to <\/script>.
    const closingTagCount = (out.match(/<\/script>/g) ?? []).length
    expect(closingTagCount).toBe(1)
    expect(out).toContain("evil<\\/script>")
  })

  it("the serialized runtime body does not reference module-scope identifiers", () => {
    // Self-check belt-and-braces: even though buildBridgeScript itself
    // throws if forbidden identifiers leak in, this test surfaces the
    // failure in the test suite if anyone weakens the runtime check.
    const out = buildBridgeScript("fileA")
    // None of the module-scope helpers should appear in the script body
    // (they cannot work — the iframe has no access to them).
    for (const forbidden of [
      "isCanvasReactNodeMessage",
      "findNearestCanvasIdAncestor",
      "buildSelectMessage",
      "buildHoverMessage",
      "escapeScriptInterop",
    ]) {
      expect(out).not.toContain(forbidden)
    }
  })
})

describe("end-to-end: install bridge in jsdom and observe postMessage", () => {
  let parentMock: { postMessage: ReturnType<typeof vi.fn> }
  let originalParent: typeof window.parent
  let originalReferrerDescriptor: PropertyDescriptor | undefined

  beforeEach(() => {
    parentMock = { postMessage: vi.fn() }
    originalParent = window.parent
    originalReferrerDescriptor = Object.getOwnPropertyDescriptor(document, "referrer")
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
    if (originalReferrerDescriptor) {
      Object.defineProperty(document, "referrer", originalReferrerDescriptor)
    } else {
      delete (document as unknown as { referrer?: string }).referrer
    }
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

  it("prevents link activation while the iframe bridge is in edit mode", () => {
    installBridgeForTesting(window, "fileA")
    const link = makeEl("a", { "data-canvas-id": "abc:link", href: "#" }, "Primary")
    document.body.appendChild(link)

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: window.location.origin,
        data: {
          [CANVAS_NODE_BRIDGE_MARKER]: true,
          version: CANVAS_NODE_BRIDGE_VERSION,
          type: "canvas/interaction-mode",
          mode: "edit",
        },
      })
    )

    const event = new MouseEvent("click", { bubbles: true, cancelable: true })
    link.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    const selectCall = parentMock.postMessage.mock.calls.find(
      (call) => call[0]?.type === "canvas/select"
    )
    expect(selectCall![0].canvasId).toBe("abc:link")

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: window.location.origin,
        data: {
          [CANVAS_NODE_BRIDGE_MARKER]: true,
          version: CANVAS_NODE_BRIDGE_VERSION,
          type: "canvas/interaction-mode",
          mode: "interact",
        },
      })
    )
  })

  it("preserves page event handling while the iframe bridge is in interact mode", () => {
    installBridgeForTesting(window, "fileA")
    const button = makeEl("button", { "data-canvas-id": "abc:button" }, "Primary")
    const onButtonClick = vi.fn()
    button.addEventListener("click", onButtonClick)
    document.body.appendChild(button)

    const event = new MouseEvent("click", { bubbles: true, cancelable: true })
    button.dispatchEvent(event)

    expect(onButtonClick).toHaveBeenCalledOnce()
  })

  it("flags a shift-held click as additive (U12) and a plain click as not", () => {
    installBridgeForTesting(window, "fileA")
    const button = makeEl("button", { "data-canvas-id": "abc:1.2" }, "x")
    document.body.appendChild(button)

    parentMock.postMessage.mockClear()
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    const plain = parentMock.postMessage.mock.calls.find(
      (call) => call[0]?.type === "canvas/select"
    )
    expect(plain![0].additive).toBeUndefined()

    parentMock.postMessage.mockClear()
    button.dispatchEvent(new MouseEvent("click", { bubbles: true, shiftKey: true }))
    const shifted = parentMock.postMessage.mock.calls.find(
      (call) => call[0]?.type === "canvas/select"
    )
    expect(shifted![0].additive).toBe(true)
  })

  it("serialized runtime prefers document.referrer when resolving parent origin", () => {
    const out = buildBridgeScript("fileA")
    expect(out).toContain("document.referrer")
    expect(out).toContain("new URL(document.referrer, window.location.href).origin")
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

  it("is idempotent — second install with same fileHint is a no-op", () => {
    installBridgeForTesting(window, "fileA")
    parentMock.postMessage.mockClear()
    installBridgeForTesting(window, "fileA")
    const readyCallsAfter = parentMock.postMessage.mock.calls.filter(
      (call) => call[0]?.type === "canvas/ready"
    )
    expect(readyCallsAfter).toHaveLength(0)
  })

  it("re-installs when fileHint changes (handles same-document hot-swap)", () => {
    installBridgeForTesting(window, "fileA")
    parentMock.postMessage.mockClear()
    installBridgeForTesting(window, "fileB")
    const readyCallsAfter = parentMock.postMessage.mock.calls.filter(
      (call) => call[0]?.type === "canvas/ready"
    )
    expect(readyCallsAfter).toHaveLength(1)
    expect(readyCallsAfter[0][0].fileHint).toBe("fileB")
  })

  it("responds to canvas/request-select by posting canvas/select for the matching element", () => {
    installBridgeForTesting(window, "fileA")
    const button = makeEl("button", { "data-canvas-id": "abc:1.2" }, "x")
    document.body.appendChild(button)
    parentMock.postMessage.mockClear()
    window.dispatchEvent(
      new MessageEvent("message", {
        data: {
          [CANVAS_NODE_BRIDGE_MARKER]: true,
          version: CANVAS_NODE_BRIDGE_VERSION,
          type: "canvas/request-select",
          canvasId: "abc:1.2",
        },
      })
    )
    const selectCall = parentMock.postMessage.mock.calls.find(
      (call) => call[0]?.type === "canvas/select"
    )
    expect(selectCall).toBeDefined()
    expect(selectCall![0].canvasId).toBe("abc:1.2")
  })

  it("ignores canvas/request-select with no matching element", () => {
    installBridgeForTesting(window, "fileA")
    parentMock.postMessage.mockClear()
    window.dispatchEvent(
      new MessageEvent("message", {
        data: {
          [CANVAS_NODE_BRIDGE_MARKER]: true,
          type: "canvas/request-select",
          canvasId: "no-such-id",
        },
      })
    )
    const selectCall = parentMock.postMessage.mock.calls.find(
      (call) => call[0]?.type === "canvas/select"
    )
    expect(selectCall).toBeUndefined()
  })

  it("ignores inbound messages without the bridge marker", () => {
    installBridgeForTesting(window, "fileA")
    const button = makeEl("button", { "data-canvas-id": "abc:1.2" }, "x")
    document.body.appendChild(button)
    parentMock.postMessage.mockClear()
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: "canvas/request-select", canvasId: "abc:1.2" },
      })
    )
    expect(parentMock.postMessage).not.toHaveBeenCalled()
  })

  it("responds to canvas/request-clear by posting null hover", () => {
    installBridgeForTesting(window, "fileA")
    parentMock.postMessage.mockClear()
    window.dispatchEvent(
      new MessageEvent("message", {
        data: {
          [CANVAS_NODE_BRIDGE_MARKER]: true,
          type: "canvas/request-clear",
        },
      })
    )
    const hoverCall = parentMock.postMessage.mock.calls.find(
      (call) => call[0]?.type === "canvas/hover"
    )
    expect(hoverCall).toBeDefined()
    expect(hoverCall![0].canvasId).toBeNull()
    expect(hoverCall![0].rect).toBeNull()
  })

  it("responds to canvas/refresh-rect with canvas/rect-update for the matching element", () => {
    installBridgeForTesting(window, "fileA")
    const button = makeEl("button", { "data-canvas-id": "abc:1.2" }, "x")
    document.body.appendChild(button)
    parentMock.postMessage.mockClear()
    window.dispatchEvent(
      new MessageEvent("message", {
        data: buildRefreshRectRequest("abc:1.2"),
        origin: window.location.origin,
      })
    )
    const updateCall = parentMock.postMessage.mock.calls.find(
      (call) => call[0]?.type === "canvas/rect-update"
    )
    expect(updateCall).toBeDefined()
    expect(updateCall![0].canvasId).toBe("abc:1.2")
    expect(updateCall![0].rect).toMatchObject({
      x: expect.any(Number),
      width: expect.any(Number),
    })
  })

  it("posts canvas/rect-update with rect=null when canvasId is gone", () => {
    installBridgeForTesting(window, "fileA")
    parentMock.postMessage.mockClear()
    window.dispatchEvent(
      new MessageEvent("message", {
        data: buildRefreshRectRequest("no-such-id"),
        origin: window.location.origin,
      })
    )
    const updateCall = parentMock.postMessage.mock.calls.find(
      (call) => call[0]?.type === "canvas/rect-update"
    )
    expect(updateCall).toBeDefined()
    expect(updateCall![0].canvasId).toBe("no-such-id")
    expect(updateCall![0].rect).toBeNull()
  })

  it("canvas/edit-start makes the element contenteditable and focuses it", () => {
    installBridgeForTesting(window, "fileA")
    const h2 = makeEl("h2", { "data-canvas-id": "abc:1.2" }, "Title")
    document.body.appendChild(h2)
    // Spy on focus instead of checking document.activeElement — jsdom doesn't
    // route focus to contenteditable elements without an explicit tabindex,
    // but the production behavior we care about is that .focus() gets called.
    const focusSpy = vi.spyOn(h2, "focus")
    window.dispatchEvent(
      new MessageEvent("message", {
        data: buildEditStartRequest("abc:1.2"),
        origin: window.location.origin,
      })
    )
    expect(h2.contentEditable).toBe("true")
    expect(focusSpy).toHaveBeenCalled()
  })

  it("canvas/edit-commit posts canvas/edit-result with current text and clears contenteditable", () => {
    installBridgeForTesting(window, "fileA")
    const h2 = makeEl("h2", { "data-canvas-id": "abc:1.2" }, "Original")
    document.body.appendChild(h2)
    // Simulate the start → user-edits → commit cycle.
    window.dispatchEvent(
      new MessageEvent("message", {
        data: buildEditStartRequest("abc:1.2"),
        origin: window.location.origin,
      })
    )
    h2.textContent = "Edited"
    parentMock.postMessage.mockClear()
    window.dispatchEvent(
      new MessageEvent("message", {
        data: buildEditCommitRequest("abc:1.2"),
        origin: window.location.origin,
      })
    )
    const resultCall = parentMock.postMessage.mock.calls.find(
      (call) => call[0]?.type === "canvas/edit-result"
    )
    expect(resultCall).toBeDefined()
    expect(resultCall![0].canvasId).toBe("abc:1.2")
    expect(resultCall![0].text).toBe("Edited")
    expect(h2.contentEditable).toBe("false")
  })

  it("canvas/edit-commit is a no-op when the element is gone", () => {
    installBridgeForTesting(window, "fileA")
    parentMock.postMessage.mockClear()
    window.dispatchEvent(
      new MessageEvent("message", {
        data: buildEditCommitRequest("no-such-id"),
        origin: window.location.origin,
      })
    )
    const resultCall = parentMock.postMessage.mock.calls.find(
      (call) => call[0]?.type === "canvas/edit-result"
    )
    expect(resultCall).toBeUndefined()
  })

  it("v3 inbound handlers reject messages with mismatched version", () => {
    installBridgeForTesting(window, "fileA")
    const h2 = makeEl("h2", { "data-canvas-id": "abc:1.2" }, "Title")
    document.body.appendChild(h2)
    parentMock.postMessage.mockClear()
    window.dispatchEvent(
      new MessageEvent("message", {
        data: {
          [CANVAS_NODE_BRIDGE_MARKER]: true,
          version: CANVAS_NODE_BRIDGE_VERSION + 99,
          type: "canvas/edit-start",
          canvasId: "abc:1.2",
        },
        origin: window.location.origin,
      })
    )
    expect(h2.contentEditable).not.toBe("true")
  })

  it("v3 inbound handlers reject messages from foreign origins", () => {
    installBridgeForTesting(window, "fileA")
    const h2 = makeEl("h2", { "data-canvas-id": "abc:1.2" }, "Title")
    document.body.appendChild(h2)
    parentMock.postMessage.mockClear()
    window.dispatchEvent(
      new MessageEvent("message", {
        data: buildEditStartRequest("abc:1.2"),
        origin: "https://evil.example",
      })
    )
    expect(h2.contentEditable).not.toBe("true")
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

  it("canvas/drop-target-hit-test resolves the hovered parent + sibling rects", () => {
    installBridgeForTesting(window, "fileA")
    const parent = makeEl("div", { "data-canvas-id": "parent:0" })
    const childA = makeEl("button", { "data-canvas-id": "child:0" }, "A")
    const childB = makeEl("button", { "data-canvas-id": "child:1" }, "B")
    parent.appendChild(childA)
    parent.appendChild(childB)
    document.body.appendChild(parent)
    // User hovers in the gap between siblings — elementFromPoint returns the
    // parent container directly. findAncestor returns parent, siblings are
    // collected from parent's children.
    setElementFromPoint(parent)
    parentMock.postMessage.mockClear()
    window.dispatchEvent(
      new MessageEvent("message", {
        data: buildDropTargetHitTestRequest({ requestId: "req-1", x: 10, y: 10 }),
        origin: window.location.origin,
      })
    )
    const resultCall = parentMock.postMessage.mock.calls.find(
      (call) => call[0]?.type === "canvas/drop-target-result"
    )
    expect(resultCall).toBeDefined()
    expect(resultCall![0].requestId).toBe("req-1")
    expect(resultCall![0].parentCanvasId).toBe("parent:0")
    expect(resultCall![0].leaf).toBe(false)
    expect(resultCall![0].siblings).toHaveLength(2)
    expect(resultCall![0].siblings[0].canvasId).toBe("child:0")
    expect(resultCall![0].siblings[1].canvasId).toBe("child:1")
  })

  it("canvas/drop-target-hit-test reports leaf: true when parent has no tagged children", () => {
    installBridgeForTesting(window, "fileA")
    const parent = makeEl("button", { "data-canvas-id": "leaf:0" }, "Click")
    document.body.appendChild(parent)
    setElementFromPoint(parent)
    parentMock.postMessage.mockClear()
    window.dispatchEvent(
      new MessageEvent("message", {
        data: buildDropTargetHitTestRequest({ requestId: "req-2", x: 10, y: 10 }),
        origin: window.location.origin,
      })
    )
    const resultCall = parentMock.postMessage.mock.calls.find(
      (call) => call[0]?.type === "canvas/drop-target-result"
    )
    expect(resultCall).toBeDefined()
    expect(resultCall![0].parentCanvasId).toBe("leaf:0")
    expect(resultCall![0].leaf).toBe(true)
    expect(resultCall![0].siblings).toEqual([])
  })

  it("canvas/drop-target-hit-test reports parentCanvasId: null when no ancestor is tagged", () => {
    installBridgeForTesting(window, "fileA")
    const wrapper = makeEl("div")
    const inner = makeEl("span", {}, "hi")
    wrapper.appendChild(inner)
    document.body.appendChild(wrapper)
    vi.spyOn(document, "elementFromPoint").mockReturnValue(inner)
    parentMock.postMessage.mockClear()
    window.dispatchEvent(
      new MessageEvent("message", {
        data: buildDropTargetHitTestRequest({ requestId: "req-3", x: 5, y: 5 }),
        origin: window.location.origin,
      })
    )
    const resultCall = parentMock.postMessage.mock.calls.find(
      (call) => call[0]?.type === "canvas/drop-target-result"
    )
    expect(resultCall).toBeDefined()
    expect(resultCall![0].requestId).toBe("req-3")
    expect(resultCall![0].parentCanvasId).toBeNull()
    expect(resultCall![0].parentRect).toBeNull()
    expect(resultCall![0].siblings).toEqual([])
    expect(resultCall![0].leaf).toBe(false)
  })

  it("canvas/drop-target-hit-test rejects mismatched version", () => {
    installBridgeForTesting(window, "fileA")
    const parent = makeEl("div", { "data-canvas-id": "parent:0" })
    document.body.appendChild(parent)
    setElementFromPoint(parent)
    parentMock.postMessage.mockClear()
    window.dispatchEvent(
      new MessageEvent("message", {
        data: {
          [CANVAS_NODE_BRIDGE_MARKER]: true,
          version: CANVAS_NODE_BRIDGE_VERSION + 99,
          type: "canvas/drop-target-hit-test",
          requestId: "req-bad-version",
          x: 1,
          y: 1,
        },
        origin: window.location.origin,
      })
    )
    const resultCall = parentMock.postMessage.mock.calls.find(
      (call) => call[0]?.type === "canvas/drop-target-result"
    )
    expect(resultCall).toBeUndefined()
  })

  it("canvas/drop-target-hit-test rejects foreign origins", () => {
    installBridgeForTesting(window, "fileA")
    const parent = makeEl("div", { "data-canvas-id": "parent:0" })
    document.body.appendChild(parent)
    setElementFromPoint(parent)
    parentMock.postMessage.mockClear()
    window.dispatchEvent(
      new MessageEvent("message", {
        data: buildDropTargetHitTestRequest({ requestId: "req-evil", x: 1, y: 1 }),
        origin: "https://evil.example",
      })
    )
    const resultCall = parentMock.postMessage.mock.calls.find(
      (call) => call[0]?.type === "canvas/drop-target-result"
    )
    expect(resultCall).toBeUndefined()
  })

  it("canvas/drop-target-hit-test ignores requests with non-finite x/y", () => {
    installBridgeForTesting(window, "fileA")
    parentMock.postMessage.mockClear()
    window.dispatchEvent(
      new MessageEvent("message", {
        data: buildDropTargetHitTestRequest({ requestId: "req-nan", x: NaN, y: 0 }),
        origin: window.location.origin,
      })
    )
    const resultCall = parentMock.postMessage.mock.calls.find(
      (call) => call[0]?.type === "canvas/drop-target-result"
    )
    expect(resultCall).toBeUndefined()
  })
})
