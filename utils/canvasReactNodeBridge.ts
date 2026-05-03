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

export type CanvasReactNodeMessage =
  | CanvasReactNodeSelectMessage
  | CanvasReactNodeHoverMessage
  | CanvasReactNodeReadyMessage

/** Type guard for messages from this bridge. */
export function isCanvasReactNodeMessage(value: unknown): value is CanvasReactNodeMessage {
  if (!value || typeof value !== "object") return false
  const candidate = value as Record<string, unknown>
  return candidate[CANVAS_NODE_BRIDGE_MARKER] === true
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
 * The runtime IIFE that runs inside the iframe. We define it as a function
 * for clarity, then `.toString()` it into a `<script>` block at build time.
 *
 * Note: this function captures no closure state from the outer module — it
 * is fully self-contained when serialized. Any helper it uses must be
 * inlined inside the function body.
 */
function bridgeRuntime(options: { fileHint: string; marker: string; version: number }): void {
  if (typeof window === "undefined" || window.parent === window) return
  // Idempotency guard — if the script is injected twice, the second one
  // becomes a no-op.
  const installedKey = "__canvasReactNodeBridgeInstalled"
  const win = window as unknown as Record<string, unknown>
  if (win[installedKey]) return
  win[installedKey] = true

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
      "*"
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
        "*"
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
      "*"
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
    "*"
  )
}

/**
 * Builds a `<script>` block string ready to inject into the iframe's HTML.
 * The script runs immediately on parse, attaches listeners, and posts a
 * `canvas/ready` message when set up.
 */
export function buildBridgeScript(fileHint: string): string {
  const opts = JSON.stringify({
    fileHint,
    marker: CANVAS_NODE_BRIDGE_MARKER,
    version: CANVAS_NODE_BRIDGE_VERSION,
  })
  // The runtime is fully self-contained; serialize via toString().
  return `<script data-canvas-iframe-bridge="react-node-select">\n;(${bridgeRuntime.toString()})(${opts});\n</script>`
}

// Re-export the runtime symbol for tests that want to drive it directly
// inside a jsdom document. Tests can call `installBridge(window, fileHint)`
// to attach listeners without going through the script-tag injection path.
export function installBridgeForTesting(
  win: Window,
  fileHint: string
): void {
  // We intentionally call the same runtime — but tests run in a jsdom
  // window where `window.parent === window`, so the early-return inside
  // `bridgeRuntime` would skip installation. Tests can override this by
  // stubbing window.parent first.
  const runtime = bridgeRuntime as (options: {
    fileHint: string
    marker: string
    version: number
  }) => void
  runtime.call(win, {
    fileHint,
    marker: CANVAS_NODE_BRIDGE_MARKER,
    version: CANVAS_NODE_BRIDGE_VERSION,
  })
}
