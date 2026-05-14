/**
 * Click-to-select bridge for React TSX preview iframes.
 *
 * The bridge runs inside the iframe (injected by `compileReactCanvasPreview`
 * at compile time when a sourceId is provided) and posts selection /
 * hover / blur events up to the parent canvas via `window.parent.postMessage`.
 *
 * The parent (CanvasHtmlFrame in U2's wiring) listens for these messages and
 * surfaces the selected element to the canvas's selection state. The
 * property panel (U3) then reads the AST node behind the canvasId and the
 * AST writer (U4) round-trips edits back to the source.
 *
 * Why postMessage:
 * - Click events are user-driven; they fire even when Chrome throttles the
 *   iframe's main thread (yesterday's iframe-throttling investigation).
 * - postMessage is the standard cross-frame channel and works for both
 *   same-origin and cross-origin iframes (even though our React TSX preview
 *   is same-origin via the dev server, this keeps the contract stable).
 *
 * Used by U2 of docs/plans/2026-04-28-001-feat-canvas-figma-like-editing-plan.md.
 */

/** Schema-version of the messages emitted by the bridge. Bump when changed. */
export const CANVAS_NODE_BRIDGE_VERSION = 1

/** All messages from the bridge carry this discriminator at the top level. */
export const CANVAS_NODE_BRIDGE_MARKER = "__canvasReactNodeBridge"

export interface CanvasReactNodeRect {
  x: number
  y: number
  width: number
  height: number
}

interface CanvasReactNodeBaseMessage {
  __canvasReactNodeBridge: true
  version: number
  /** Optional caller-provided fileHint, set at compile time. */
  fileHint?: string
}

export interface CanvasReactNodeSelectMessage extends CanvasReactNodeBaseMessage {
  type: "canvas/select"
  canvasId: string
  tag: string
  rect: CanvasReactNodeRect
}

export interface CanvasReactNodeHoverMessage extends CanvasReactNodeBaseMessage {
  type: "canvas/hover"
  canvasId: string | null
  rect: CanvasReactNodeRect | null
}

export interface CanvasReactNodeReadyMessage extends CanvasReactNodeBaseMessage {
  type: "canvas/ready"
}

/**
 * Emitted by the iframe in response to a parent-driven `canvas/refresh-rect`
 * request. Used by the overlay (U4a) to re-anchor handles after a recompile
 * — selection survives the recompile because canvasIds are stable across the
 * AST-id rebase, but the rect needs a fresh measurement.
 *
 * `rect: null` signals the canvasId is no longer in the DOM (element was
 * removed by a structural mutation that didn't preserve its id).
 */
export interface CanvasReactNodeRectUpdateMessage extends CanvasReactNodeBaseMessage {
  type: "canvas/rect-update"
  canvasId: string
  rect: CanvasReactNodeRect | null
}

/**
 * Emitted by the iframe after a parent-driven `canvas/edit-commit`, carrying
 * the new text content of the element. Markdown/text writers (U6, U10) read
 * this to round-trip the edit back into source.
 */
export interface CanvasReactNodeEditResultMessage extends CanvasReactNodeBaseMessage {
  type: "canvas/edit-result"
  canvasId: string
  text: string
}

/**
 * One sibling element inside the hovered drop-target parent. `index` is the
 * position in the parent's element-children list (text nodes ignored) and is
 * the position the consumer would pass to an `insertChild` mutation to place a
 * dropped node immediately before this sibling.
 */
export interface CanvasReactNodeDropTargetSibling {
  canvasId: string
  rect: CanvasReactNodeRect
  index: number
}

/**
 * Emitted by the iframe in response to a parent-driven
 * `canvas/drop-target-hit-test`. `parentCanvasId: null` means no ancestor at
 * (x, y) carried a `data-canvas-id`. `leaf: true` means the resolved parent
 * has no element children — the consumer should render a "wrap" affordance
 * (wrapSelection mutation) rather than insert-between siblings.
 *
 * `requestId` echoes the request — drop-target hit-tests fire on every
 * `dragover` and the parent needs to discard stale responses.
 */
export interface CanvasReactNodeDropTargetResultMessage extends CanvasReactNodeBaseMessage {
  type: "canvas/drop-target-result"
  requestId: string
  parentCanvasId: string | null
  parentRect: CanvasReactNodeRect | null
  siblings: CanvasReactNodeDropTargetSibling[]
  leaf: boolean
}

export type CanvasReactNodeMessage =
  | CanvasReactNodeSelectMessage
  | CanvasReactNodeHoverMessage
  | CanvasReactNodeReadyMessage
  | CanvasReactNodeRectUpdateMessage
  | CanvasReactNodeEditResultMessage
  | CanvasReactNodeDropTargetResultMessage

/** Type guard for messages from this bridge. Validates the marker AND the
 *  discriminator so consumers get correct narrowing on `message.type`. */
export function isCanvasReactNodeMessage(value: unknown): value is CanvasReactNodeMessage {
  if (!value || typeof value !== "object") return false
  const candidate = value as Record<string, unknown>
  if (candidate[CANVAS_NODE_BRIDGE_MARKER] !== true) return false
  const type = candidate.type
  return (
    type === "canvas/select" ||
    type === "canvas/hover" ||
    type === "canvas/ready" ||
    type === "canvas/rect-update" ||
    type === "canvas/edit-result" ||
    type === "canvas/drop-target-result"
  )
}

/** Walks up from `start`, returning the nearest ancestor with `data-canvas-id`. */
export function findNearestCanvasIdAncestor(start: Element | null): HTMLElement | null {
  let current: Element | null = start
  while (current) {
    if (current instanceof HTMLElement && current.dataset && current.dataset.canvasId) {
      return current
    }
    current = current.parentElement
  }
  return null
}

/** Builds the `select` message for a target element. */
export function buildSelectMessage(
  target: HTMLElement,
  fileHint?: string
): CanvasReactNodeSelectMessage {
  const rect = target.getBoundingClientRect()
  return {
    [CANVAS_NODE_BRIDGE_MARKER]: true,
    version: CANVAS_NODE_BRIDGE_VERSION,
    type: "canvas/select",
    canvasId: target.dataset.canvasId ?? "",
    tag: target.tagName.toLowerCase(),
    rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    fileHint,
  }
}

/** Builds the `hover` message (target may be null to clear hover). */
export function buildHoverMessage(
  target: HTMLElement | null,
  fileHint?: string
): CanvasReactNodeHoverMessage {
  if (!target) {
    return {
      [CANVAS_NODE_BRIDGE_MARKER]: true,
      version: CANVAS_NODE_BRIDGE_VERSION,
      type: "canvas/hover",
      canvasId: null,
      rect: null,
      fileHint,
    }
  }
  const rect = target.getBoundingClientRect()
  return {
    [CANVAS_NODE_BRIDGE_MARKER]: true,
    version: CANVAS_NODE_BRIDGE_VERSION,
    type: "canvas/hover",
    canvasId: target.dataset.canvasId ?? null,
    rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    fileHint,
  }
}

/**
 * Parent → iframe request messages. The parent posts these into the iframe
 * via `iframe.contentWindow.postMessage(msg, iframe.contentWindow.origin)`.
 * The iframe-side runtime validates marker + version before acting.
 */
export interface CanvasReactNodeRefreshRectRequest {
  __canvasReactNodeBridge: true
  version: number
  type: "canvas/refresh-rect"
  canvasId: string
}

export interface CanvasReactNodeEditStartRequest {
  __canvasReactNodeBridge: true
  version: number
  type: "canvas/edit-start"
  canvasId: string
}

export interface CanvasReactNodeEditCommitRequest {
  __canvasReactNodeBridge: true
  version: number
  type: "canvas/edit-commit"
  canvasId: string
}

/**
 * Parent → iframe drop-target hit-test, used by U4b when the user is dragging
 * a library primitive over the iframe. `x` and `y` are in iframe-local
 * coordinates (CanvasIframeOverlay translates screen → iframe-local before
 * sending). The iframe finds the nearest canvas-id ancestor at that point,
 * collects its element children, and posts back a `drop-target-result`.
 *
 * `requestId` is echoed back; the parent fires one of these per `dragover`
 * and must drop stale responses.
 */
export interface CanvasReactNodeDropTargetHitTestRequest {
  __canvasReactNodeBridge: true
  version: number
  type: "canvas/drop-target-hit-test"
  requestId: string
  x: number
  y: number
}

export function buildRefreshRectRequest(canvasId: string): CanvasReactNodeRefreshRectRequest {
  return {
    [CANVAS_NODE_BRIDGE_MARKER]: true,
    version: CANVAS_NODE_BRIDGE_VERSION,
    type: "canvas/refresh-rect",
    canvasId,
  }
}

export function buildEditStartRequest(canvasId: string): CanvasReactNodeEditStartRequest {
  return {
    [CANVAS_NODE_BRIDGE_MARKER]: true,
    version: CANVAS_NODE_BRIDGE_VERSION,
    type: "canvas/edit-start",
    canvasId,
  }
}

export function buildEditCommitRequest(canvasId: string): CanvasReactNodeEditCommitRequest {
  return {
    [CANVAS_NODE_BRIDGE_MARKER]: true,
    version: CANVAS_NODE_BRIDGE_VERSION,
    type: "canvas/edit-commit",
    canvasId,
  }
}

export function buildDropTargetHitTestRequest(input: {
  requestId: string
  x: number
  y: number
}): CanvasReactNodeDropTargetHitTestRequest {
  return {
    [CANVAS_NODE_BRIDGE_MARKER]: true,
    version: CANVAS_NODE_BRIDGE_VERSION,
    type: "canvas/drop-target-hit-test",
    requestId: input.requestId,
    x: input.x,
    y: input.y,
  }
}

/**
 * The runtime IIFE that runs inside the iframe. We define it as a function
 * for clarity, then `.toString()` it into a `<script>` block at build time.
 *
 * Note: this function captures no closure state from the outer module — it
 * is fully self-contained when serialized. Any helper it uses must be
 * inlined inside the function body.
 */
function bridgeRuntime(options: { fileHint: string; marker: string; version: number }): void {
  if (typeof window === "undefined" || window.parent === window) return
  // Idempotency guard. The flag stores the fileHint of the active install
  // so a same-document re-install with a different fileHint can replace the
  // listeners (otherwise stale fileHints would be emitted on every event).
  // For srcDoc-driven recompile this is moot — the iframe document is
  // replaced and the flag goes with it — but DOM-level updates that reuse
  // the document (or future hot-swap paths) are handled correctly.
  //
  // Limitation: this bridge only attaches to the top-level document of the
  // iframe. JSX rendered inside a nested user iframe (the preview source
  // contains its own <iframe>) is not reachable; clicks there fall through
  // and produce no canvas/select message. Documented for U3+ so we don't
  // chase phantom bugs when nested previews show up.
  const installedKey = "__canvasReactNodeBridgeInstalled"
  const win = window as unknown as Record<string, unknown>
  if (win[installedKey] === options.fileHint) return
  win[installedKey] = options.fileHint

  function findAncestor(start: Element | null): HTMLElement | null {
    let current: Element | null = start
    while (current) {
      if (
        current instanceof HTMLElement &&
        current.dataset &&
        current.dataset.canvasId
      ) {
        return current
      }
      current = current.parentElement
    }
    return null
  }

  // Outbound postMessage target:
  // - srcDoc previews can report `window.location.origin === "null"` even
  //   when they were injected by our same-origin app, so prefer the
  //   parent's URL from document.referrer.
  // - If referrer is absent, fall back to the current origin when usable.
  // - Final fallback is "*" so the bridge still functions in odd sandboxed
  //   environments, while inbound v3 handlers stay version-gated.
  let targetOrigin = "*"
  if (document.referrer) {
    try {
      targetOrigin = new URL(document.referrer, window.location.href).origin
    } catch {
      targetOrigin = "*"
    }
  } else if (window.location.origin && window.location.origin !== "null") {
    targetOrigin = window.location.origin
  } else {
    try {
      const parentOrigin = (window.parent as Window).location?.origin
      if (parentOrigin && parentOrigin !== "null") {
        targetOrigin = parentOrigin
      }
    } catch {
      targetOrigin = "*"
    }
  }

  function postSelect(el: HTMLElement) {
    const rect = el.getBoundingClientRect()
    window.parent.postMessage(
      {
        [options.marker]: true,
        version: options.version,
        type: "canvas/select",
        canvasId: el.dataset.canvasId ?? "",
        tag: el.tagName.toLowerCase(),
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        fileHint: options.fileHint,
      },
      targetOrigin
    )
  }

  function postHover(el: HTMLElement | null) {
    if (!el) {
      window.parent.postMessage(
        {
          [options.marker]: true,
          version: options.version,
          type: "canvas/hover",
          canvasId: null,
          rect: null,
          fileHint: options.fileHint,
        },
        targetOrigin
      )
      return
    }
    const rect = el.getBoundingClientRect()
    window.parent.postMessage(
      {
        [options.marker]: true,
        version: options.version,
        type: "canvas/hover",
        canvasId: el.dataset.canvasId ?? null,
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        fileHint: options.fileHint,
      },
      targetOrigin
    )
  }

  let lastHoverId: string | null = null
  let rafScheduled = false
  let pendingMoveTarget: EventTarget | null = null

  function flushHover() {
    rafScheduled = false
    const el = findAncestor(pendingMoveTarget as Element | null)
    const id = el?.dataset.canvasId ?? null
    if (id !== lastHoverId) {
      lastHoverId = id
      postHover(el)
    }
  }

  document.addEventListener(
    "click",
    (event) => {
      const el = findAncestor(event.target as Element | null)
      if (!el) return
      // We do NOT preventDefault — clicks should still work for the page's
      // own JS. The canvas opens the property panel as a side-effect.
      postSelect(el)
    },
    true
  )

  document.addEventListener(
    "mousemove",
    (event) => {
      pendingMoveTarget = event.target
      if (rafScheduled) return
      rafScheduled = true
      // requestAnimationFrame may be throttled when the iframe is offscreen;
      // if so, hover updates pause but click still works (it doesn't go
      // through rAF). Documented limitation.
      window.requestAnimationFrame(flushHover)
    },
    true
  )

  document.addEventListener(
    "mouseleave",
    () => {
      // Clear pendingMoveTarget so a queued rAF flush can't re-emit the
      // hover we just cleared (would cause one-frame ring flicker).
      pendingMoveTarget = null
      lastHoverId = null
      postHover(null)
    },
    true
  )

  // Announce we're ready so the parent can stop showing a "compiling…" state.
  window.parent.postMessage(
    {
      [options.marker]: true,
      version: options.version,
      type: "canvas/ready",
      fileHint: options.fileHint,
    },
    targetOrigin
  )

  // Inbound channel: the parent can drive selection/hover programmatically
  // (used by U8's MCP tools and by the property panel's keyboard navigation),
  // and as of v3/U13 drive rect re-anchoring + inline-edit start/commit.
  // Messages are filtered by the same marker as our outbound traffic so
  // unrelated postMessages don't trigger anything; new (v3) handlers also
  // gate on origin so cross-window leaks can't drive contenteditable on
  // somebody else's iframe.
  function findById(id: string): HTMLElement | null {
    if (!id) return null
    const escaped = (window as unknown as { CSS?: { escape?: (s: string) => string } }).CSS?.escape
      ? (window as unknown as { CSS: { escape: (s: string) => string } }).CSS.escape(id)
      : id.replace(/(["\\])/g, "\\$1")
    const el = document.querySelector(`[data-canvas-id="${escaped}"]`)
    return el instanceof HTMLElement ? el : null
  }

  function postRectUpdate(canvasId: string, el: HTMLElement | null): void {
    const rect = el?.getBoundingClientRect()
    window.parent.postMessage(
      {
        [options.marker]: true,
        version: options.version,
        type: "canvas/rect-update",
        canvasId,
        rect: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null,
        fileHint: options.fileHint,
      },
      targetOrigin
    )
  }

  function postEditResult(canvasId: string, text: string): void {
    window.parent.postMessage(
      {
        [options.marker]: true,
        version: options.version,
        type: "canvas/edit-result",
        canvasId,
        text,
        fileHint: options.fileHint,
      },
      targetOrigin
    )
  }

  function postDropTargetResult(input: {
    requestId: string
    parentEl: HTMLElement | null
  }): void {
    const parentEl = input.parentEl
    if (!parentEl) {
      window.parent.postMessage(
        {
          [options.marker]: true,
          version: options.version,
          type: "canvas/drop-target-result",
          requestId: input.requestId,
          parentCanvasId: null,
          parentRect: null,
          siblings: [],
          leaf: false,
          fileHint: options.fileHint,
        },
        targetOrigin
      )
      return
    }
    const parentRect = parentEl.getBoundingClientRect()
    const siblings: Array<{
      canvasId: string
      rect: { x: number; y: number; width: number; height: number }
      index: number
    }> = []
    let index = 0
    let child: Element | null = parentEl.firstElementChild
    while (child) {
      if (child instanceof HTMLElement) {
        const id = child.dataset.canvasId
        if (id) {
          const childRect = child.getBoundingClientRect()
          siblings.push({
            canvasId: id,
            rect: {
              x: childRect.x,
              y: childRect.y,
              width: childRect.width,
              height: childRect.height,
            },
            index,
          })
        }
      }
      child = child.nextElementSibling
      index += 1
    }
    window.parent.postMessage(
      {
        [options.marker]: true,
        version: options.version,
        type: "canvas/drop-target-result",
        requestId: input.requestId,
        parentCanvasId: parentEl.dataset.canvasId ?? null,
        parentRect: {
          x: parentRect.x,
          y: parentRect.y,
          width: parentRect.width,
          height: parentRect.height,
        },
        siblings,
        leaf: siblings.length === 0,
        fileHint: options.fileHint,
      },
      targetOrigin
    )
  }

  window.addEventListener("message", function (event) {
    const data = event.data as Record<string, unknown> | null
    if (!data || data[options.marker] !== true) return
    const type = data.type
    // v3 inbound handlers require version match + origin allowlist (parent
    // origin only). Legacy handlers (request-select/request-clear) keep
    // their permissive contract for backwards compatibility with U8 MCP.
    const isV3Handler =
      type === "canvas/refresh-rect" ||
      type === "canvas/edit-start" ||
      type === "canvas/edit-commit" ||
      type === "canvas/drop-target-hit-test"
    if (isV3Handler) {
      if (data.version !== options.version) return
      if (targetOrigin !== "*" && event.origin && event.origin !== targetOrigin) return
    }

    if (type === "canvas/request-select") {
      const id = typeof data.canvasId === "string" ? data.canvasId : ""
      const el = findById(id)
      if (el) postSelect(el)
    } else if (type === "canvas/request-clear") {
      lastHoverId = null
      pendingMoveTarget = null
      postHover(null)
    } else if (type === "canvas/refresh-rect") {
      const id = typeof data.canvasId === "string" ? data.canvasId : ""
      if (!id) return
      postRectUpdate(id, findById(id))
    } else if (type === "canvas/edit-start") {
      const id = typeof data.canvasId === "string" ? data.canvasId : ""
      const el = findById(id)
      if (!el) return
      el.contentEditable = "true"
      el.focus()
    } else if (type === "canvas/edit-commit") {
      const id = typeof data.canvasId === "string" ? data.canvasId : ""
      const el = findById(id)
      if (!el) return
      const text = el.textContent ?? ""
      el.contentEditable = "false"
      el.blur()
      postEditResult(id, text)
    } else if (type === "canvas/drop-target-hit-test") {
      const requestId = typeof data.requestId === "string" ? data.requestId : ""
      const x = typeof data.x === "number" ? data.x : NaN
      const y = typeof data.y === "number" ? data.y : NaN
      if (!requestId || !Number.isFinite(x) || !Number.isFinite(y)) return
      const hit = document.elementFromPoint(x, y)
      postDropTargetResult({ requestId, parentEl: findAncestor(hit) })
    }
  })
}

/**
 * Builds a `<script>` block string ready to inject into the iframe's HTML.
 * The script runs immediately on parse, attaches listeners, and posts a
 * `canvas/ready` message when set up.
 *
 * Security: any string interpolated inside a `<script>` block must escape
 * `</script>` so a hostile payload (e.g. a maliciously-crafted canvas item
 * id flowing through `fileHint`) cannot break out of the script context and
 * inject HTML in the iframe's same-origin window.
 */
export function buildBridgeScript(fileHint: string): string {
  const runtimeText = bridgeRuntime.toString()
  assertSelfContainedRuntime(runtimeText)
  const opts = escapeScriptInterop(
    JSON.stringify({
      fileHint,
      marker: CANVAS_NODE_BRIDGE_MARKER,
      version: CANVAS_NODE_BRIDGE_VERSION,
    })
  )
  const runtimeBody = escapeScriptInterop(runtimeText)
  return `<script data-canvas-iframe-bridge="react-node-select">\n;(${runtimeBody})(${opts});\n</script>`
}

/**
 * Closure-capture self-check. The bridge runtime is `.toString()`'d into a
 * `<script>` block at build time and runs inside an iframe with no access to
 * the outer module scope. If a future contributor accidentally references
 * a module-level identifier, the serialized text passes type-checking but
 * crashes at runtime in the iframe with no diagnostic. This guard scans the
 * serialized text for known module-scope identifiers and throws at build
 * time if any appear, surfacing the bug before the canvas tries to render.
 *
 * Allowed identifiers used inside the runtime (these are intentional and
 * must NOT be flagged): the parameter `options`, locals defined inside the
 * IIFE, and globals like `window`, `document`, `Element`, `HTMLElement`,
 * `MouseEvent`, `requestAnimationFrame`, `performance`, `MessageEvent`,
 * `CSS`, `Record` (used only in a type cast — erased at runtime), and the
 * imported constants which we serialize via the `options` parameter rather
 * than capturing.
 */
function assertSelfContainedRuntime(runtimeText: string): void {
  const forbidden = [
    "CANVAS_NODE_BRIDGE_MARKER",
    "CANVAS_NODE_BRIDGE_VERSION",
    "isCanvasReactNodeMessage",
    "findNearestCanvasIdAncestor",
    "buildSelectMessage",
    "buildHoverMessage",
    "buildBridgeScript",
    "buildDropTargetHitTestRequest",
    "installBridgeForTesting",
    "escapeScriptInterop",
    "assertSelfContainedRuntime",
  ]
  for (const name of forbidden) {
    if (runtimeText.includes(name)) {
      throw new Error(
        `bridgeRuntime captured module-scope identifier "${name}" — the runtime is .toString()'d into a script tag and cannot reference outer scope. Inline the value or pass it via options.`
      )
    }
  }
}

/**
 * Replace any `</` sequence with the equivalent JS string-escaped form so
 * the result is safe to inline inside a `<script>` block. The HTML parser
 * scans for `</script>` (and other end-tag-like sequences) literally; a
 * single backslash before the slash is enough to defeat the match while
 * leaving JS semantics unchanged inside string and regex literals. Function
 * source returned by `.toString()` does not normally contain `</`, but a
 * future regex literal or string in the runtime could.
 */
function escapeScriptInterop(s: string): string {
  return s.replace(/<\//g, "<\\/")
}

// Re-export the runtime symbol for tests that want to drive it directly
// inside a jsdom document. Tests can call `installBridgeForTesting(window,
// fileHint)` to attach listeners without going through the script-tag
// injection path.
//
// Note: tests run in a jsdom window where `window.parent === window`, so
// the early-return inside `bridgeRuntime` would skip installation. Tests
// must stub `window.parent` first.
export function installBridgeForTesting(win: Window, fileHint: string): void {
  bridgeRuntime.call(win, {
    fileHint,
    marker: CANVAS_NODE_BRIDGE_MARKER,
    version: CANVAS_NODE_BRIDGE_VERSION,
  })
}
