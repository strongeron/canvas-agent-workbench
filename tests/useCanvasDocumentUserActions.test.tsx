// @vitest-environment jsdom

// FOX2-60: agent-feed user-action events derived from the document change
// stream — gesture-end with minimal changed-field payloads, and debounced
// selection-changed.

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import { useCanvasDocumentUserActions } from "../hooks/useCanvasDocumentUserActions"
import type { CanvasDocumentChangeEvent } from "../hooks/useCanvasState"
import type { CanvasItem } from "../types/canvas"

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

const item = (id: string, extra: Partial<CanvasItem> = {}) =>
  ({
    id,
    type: "html",
    sourceMode: "inline",
    sourceHtml: `<p>${id}</p>`,
    position: { x: 0, y: 0 },
    size: { width: 200, height: 100 },
    rotation: 0,
    zIndex: 1,
    ...extra,
  }) as unknown as CanvasItem

function changeEvent(
  meta: { actor?: "user" | "agent" | "history"; source: string },
  prevItems: CanvasItem[],
  nextItems: CanvasItem[]
): CanvasDocumentChangeEvent {
  return {
    meta: { actor: meta.actor ?? "user", source: meta.source },
    prevSnapshot: { items: prevItems, groups: [] },
    nextSnapshot: { items: nextItems, groups: [] },
  }
}

function mountHook(input: {
  emitUserAction: (action: string, payload?: Record<string, unknown>) => void
  getSelectionSnapshot: () => { selectedIds: string[]; items: CanvasItem[] }
}) {
  const probe: { current: ReturnType<typeof useCanvasDocumentUserActions> | null } = {
    current: null,
  }

  function Probe() {
    probe.current = useCanvasDocumentUserActions(input)
    return null
  }

  const container = document.createElement("div")
  document.body.appendChild(container)
  let root: Root
  act(() => {
    root = createRoot(container)
    root.render(<Probe />)
  })
  return {
    probe,
    cleanup: () => {
      act(() => root.unmount())
      container.remove()
    },
  }
}

describe("useCanvasDocumentUserActions (FOX2-60)", () => {
  let cleanup: (() => void) | null = null

  afterEach(() => {
    cleanup?.()
    cleanup = null
    vi.useRealTimers()
  })

  it("emits gesture-end with only the changed fields of the changed items", () => {
    const emitUserAction = vi.fn()
    const mounted = mountHook({
      emitUserAction,
      getSelectionSnapshot: () => ({ selectedIds: [], items: [] }),
    })
    cleanup = mounted.cleanup

    const untouched = item("b")
    mounted.probe.current!(
      changeEvent(
        { source: "gesture:move-item" },
        [item("a"), untouched],
        [item("a", { position: { x: 30, y: 10 } }), untouched]
      )
    )

    expect(emitUserAction).toHaveBeenCalledTimes(1)
    expect(emitUserAction).toHaveBeenCalledWith("gesture-end", {
      source: "gesture:move-item",
      itemIds: ["a"],
      from: { a: { position: { x: 0, y: 0 } } },
      to: { a: { position: { x: 30, y: 10 } } },
    })
  })

  it("includes size and rotation only when they changed", () => {
    const emitUserAction = vi.fn()
    const mounted = mountHook({
      emitUserAction,
      getSelectionSnapshot: () => ({ selectedIds: [], items: [] }),
    })
    cleanup = mounted.cleanup

    mounted.probe.current!(
      changeEvent(
        { source: "gesture:resize-item" },
        [item("a")],
        [item("a", { size: { width: 320, height: 100 }, rotation: 15 })]
      )
    )

    expect(emitUserAction).toHaveBeenCalledWith("gesture-end", {
      source: "gesture:resize-item",
      itemIds: ["a"],
      from: { a: { size: { width: 200, height: 100 }, rotation: 0 } },
      to: { a: { size: { width: 320, height: 100 }, rotation: 15 } },
    })
  })

  it("stays silent for non-user actors and for gestures without geometry changes", () => {
    const emitUserAction = vi.fn()
    const mounted = mountHook({
      emitUserAction,
      getSelectionSnapshot: () => ({ selectedIds: [], items: [] }),
    })
    cleanup = mounted.cleanup

    mounted.probe.current!(
      changeEvent(
        { actor: "agent", source: "gesture:move-item" },
        [item("a")],
        [item("a", { position: { x: 5, y: 5 } })]
      )
    )
    const shared = [item("a")]
    mounted.probe.current!(changeEvent({ source: "gesture:move-item" }, shared, shared))

    expect(emitUserAction).not.toHaveBeenCalled()
  })

  it("debounces selection sources into one selection-changed with the latest selection", () => {
    vi.useFakeTimers()
    const emitUserAction = vi.fn()
    const items = [item("a"), item("b", { type: "artboard" })]
    let selectedIds = ["a"]
    const mounted = mountHook({
      emitUserAction,
      getSelectionSnapshot: () => ({ selectedIds, items }),
    })
    cleanup = mounted.cleanup

    const shared = items
    mounted.probe.current!(changeEvent({ source: "select-item" }, shared, shared))
    vi.advanceTimersByTime(150)
    selectedIds = ["a", "b"]
    mounted.probe.current!(changeEvent({ source: "select-items" }, shared, shared))
    vi.advanceTimersByTime(299)
    expect(emitUserAction).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(emitUserAction).toHaveBeenCalledTimes(1)
    expect(emitUserAction).toHaveBeenCalledWith("selection-changed", {
      selectedIds: ["a", "b"],
      types: ["html", "artboard"],
    })
  })

  it("does not emit selection-changed for non-selection sources", () => {
    vi.useFakeTimers()
    const emitUserAction = vi.fn()
    const mounted = mountHook({
      emitUserAction,
      getSelectionSnapshot: () => ({ selectedIds: [], items: [] }),
    })
    cleanup = mounted.cleanup

    const shared = [item("a")]
    mounted.probe.current!(changeEvent({ source: "update-item" }, shared, shared))
    vi.advanceTimersByTime(500)

    expect(emitUserAction).not.toHaveBeenCalled()
  })
})
