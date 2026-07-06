// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import {
  useCanvasMutationHistory,
  type CanvasHistoryToast,
} from "../hooks/useCanvasMutationHistory"
import { buildInlineLogKey } from "../utils/canvasMutationHistory"
import type { CanvasHtmlItem, CanvasItem, CanvasStateSnapshot } from "../types/canvas"

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

const HTML_ITEM: CanvasHtmlItem = {
  id: "html-1",
  type: "html",
  title: "Inline node",
  sourceMode: "inline",
  sourceHtml: "<p>AFTER</p>",
  position: { x: 0, y: 0 },
  size: { width: 400, height: 300 },
  rotation: 0,
  zIndex: 1,
}

interface HookProbe {
  appendMutationLogEntry: ReturnType<typeof useCanvasMutationHistory>["appendMutationLogEntry"]
  handleUndoMutation: ReturnType<typeof useCanvasMutationHistory>["handleUndoMutation"]
  handleRedoMutation: ReturnType<typeof useCanvasMutationHistory>["handleRedoMutation"]
}

function mountHook(input: {
  items: CanvasItem[]
  replaceState: (next: CanvasStateSnapshot) => void
  showToast: (toast: CanvasHistoryToast) => void
  emitSourceEdit: (action: string, meta?: Record<string, unknown>) => void
}) {
  const probe: { current: HookProbe | null } = { current: null }

  function Probe() {
    probe.current = useCanvasMutationHistory({
      items: input.items,
      groups: [],
      nextZIndex: 10,
      selectedIds: [],
      replaceState: input.replaceState,
      setReactNodeSelection: () => {},
      showToast: input.showToast,
      emitSourceEditRef: { current: input.emitSourceEdit },
    })
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

function buildInlineEntry() {
  return {
    id: "entry-1",
    timestamp: 1,
    filePath: buildInlineLogKey("html", "html-1"),
    // The undo/redo path never reads mutations; summary is set explicitly.
    mutations: [],
    prevSourceSnapshot: "<p>BEFORE</p>",
    postSourceSnapshot: "<p>AFTER</p>",
    canvasIdMap: {},
    summary: "text edit",
  }
}

describe("useCanvasMutationHistory (FOX2-62 extraction)", () => {
  let cleanup: (() => void) | null = null

  afterEach(() => {
    cleanup?.()
    cleanup = null
  })

  it("undoes an inline entry via the window Cmd-Z binding", async () => {
    const replaceState = vi.fn()
    const showToast = vi.fn()
    const emitSourceEdit = vi.fn()
    const mounted = mountHook({ items: [HTML_ITEM], replaceState, showToast, emitSourceEdit })
    cleanup = mounted.cleanup

    await act(async () => {
      mounted.probe.current!.appendMutationLogEntry(buildInlineEntry())
    })

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "z", metaKey: true }))
      await Promise.resolve()
    })

    expect(replaceState).toHaveBeenCalledTimes(1)
    const restored = replaceState.mock.calls[0][0] as { items: CanvasHtmlItem[] }
    expect(restored.items.find((item) => item.id === "html-1")?.sourceHtml).toBe("<p>BEFORE</p>")
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ tone: "info", message: "Undid: text edit" })
    )
    expect(emitSourceEdit).toHaveBeenCalledWith(
      "source-undo",
      expect.objectContaining({ target: "inline" })
    )
  })

  it("redoes via Cmd-Shift-Z after an undo", async () => {
    const replaceState = vi.fn()
    const showToast = vi.fn()
    const emitSourceEdit = vi.fn()
    const mounted = mountHook({ items: [HTML_ITEM], replaceState, showToast, emitSourceEdit })
    cleanup = mounted.cleanup

    await act(async () => {
      mounted.probe.current!.appendMutationLogEntry(buildInlineEntry())
    })
    await act(async () => {
      await mounted.probe.current!.handleUndoMutation()
    })

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "z", metaKey: true, shiftKey: true }))
      await Promise.resolve()
    })

    expect(replaceState).toHaveBeenCalledTimes(2)
    const redone = replaceState.mock.calls[1][0] as { items: CanvasHtmlItem[] }
    expect(redone.items.find((item) => item.id === "html-1")?.sourceHtml).toBe("<p>AFTER</p>")
    expect(showToast).toHaveBeenLastCalledWith(
      expect.objectContaining({ tone: "info", message: "Redid: text edit" })
    )
  })

  it("ignores Cmd-Z while typing in an editable target", async () => {
    const replaceState = vi.fn()
    const showToast = vi.fn()
    const mounted = mountHook({
      items: [HTML_ITEM],
      replaceState,
      showToast,
      emitSourceEdit: () => {},
    })
    cleanup = mounted.cleanup

    await act(async () => {
      mounted.probe.current!.appendMutationLogEntry(buildInlineEntry())
    })

    const input = document.createElement("input")
    document.body.appendChild(input)
    await act(async () => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "z", metaKey: true, bubbles: true })
      )
      await Promise.resolve()
    })
    input.remove()

    expect(replaceState).not.toHaveBeenCalled()
  })
})
