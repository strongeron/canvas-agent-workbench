// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import {
  useCanvasMutationHistory,
  type CanvasHistoryToast,
} from "../hooks/useCanvasMutationHistory"
import {
  useCanvasState,
  type CanvasChangeMeta,
  type CanvasDocumentChangeEvent,
} from "../hooks/useCanvasState"
import { buildInlineLogKey } from "../utils/canvasMutationHistory"
import type { CanvasGroup, CanvasHtmlItem, CanvasItem, CanvasStateSnapshot } from "../types/canvas"

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
  recordDocumentChange: ReturnType<typeof useCanvasMutationHistory>["recordDocumentChange"]
  mutationLogState: ReturnType<typeof useCanvasMutationHistory>["mutationLogState"]
  handleUndoMutation: ReturnType<typeof useCanvasMutationHistory>["handleUndoMutation"]
  handleRedoMutation: ReturnType<typeof useCanvasMutationHistory>["handleRedoMutation"]
}

function mountHook(input: {
  items: CanvasItem[]
  groups?: CanvasGroup[]
  selectedIds?: string[]
  replaceState: (next: CanvasStateSnapshot, meta?: Partial<CanvasChangeMeta>) => void
  showToast: (toast: CanvasHistoryToast) => void
  emitSourceEdit: (action: string, meta?: Record<string, unknown>) => void
  emitUserAction?: (action: string, meta?: Record<string, unknown>) => void
  documentLogKey?: string
}) {
  const probe: { current: HookProbe | null } = { current: null }

  function Probe() {
    probe.current = useCanvasMutationHistory({
      items: input.items,
      groups: input.groups ?? [],
      nextZIndex: 10,
      selectedIds: input.selectedIds ?? [],
      replaceState: input.replaceState,
      setReactNodeSelection: () => {},
      showToast: input.showToast,
      emitSourceEditRef: { current: input.emitSourceEdit },
      emitUserActionRef: { current: input.emitUserAction ?? (() => {}) },
      documentLogKey: input.documentLogKey ?? "/boards/test.canvas",
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

function documentChangeEvent(
  meta: { actor?: "user" | "agent" | "history"; source: string; gesture?: boolean },
  prevItems: CanvasItem[],
  nextItems: CanvasItem[],
  groups?: { prev: CanvasGroup[]; next: CanvasGroup[] }
): CanvasDocumentChangeEvent {
  // One shared groups reference by default, matching how the store emits
  // unchanged groups.
  const sharedGroups: CanvasDocumentChangeEvent["prevSnapshot"]["groups"] = []
  return {
    meta: { actor: meta.actor ?? "user", source: meta.source, ...(meta.gesture ? { gesture: true } : {}) },
    prevSnapshot: { items: prevItems, groups: groups?.prev ?? sharedGroups },
    nextSnapshot: { items: nextItems, groups: groups?.next ?? sharedGroups },
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

  it("pops a document entry off the timeline when Cmd-Z lands on one (FOX2-67 PR 2)", async () => {
    const replaceState = vi.fn()
    const mounted = mountHook({
      items: [],
      replaceState,
      showToast: vi.fn(),
      emitSourceEdit: vi.fn(),
    })
    cleanup = mounted.cleanup

    await act(async () => {
      mounted.probe.current!.recordDocumentChange(
        documentChangeEvent({ source: "remove-item" }, [HTML_ITEM], [])
      )
    })
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "z", metaKey: true }))
      await Promise.resolve()
    })

    expect(replaceState).toHaveBeenCalledTimes(1)
    expect(mounted.probe.current!.mutationLogState.entries).toHaveLength(0)
    expect(mounted.probe.current!.mutationLogState.redoStack).toHaveLength(1)
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

describe("useCanvasMutationHistory document entries (FOX2-67 PR 1)", () => {
  let cleanup: (() => void) | null = null

  afterEach(() => {
    cleanup?.()
    cleanup = null
  })

  function mountDocumentProbe(documentLogKey?: string) {
    const mounted = mountHook({
      items: [HTML_ITEM],
      replaceState: vi.fn(),
      showToast: vi.fn(),
      emitSourceEdit: vi.fn(),
      documentLogKey,
    })
    cleanup = mounted.cleanup
    return mounted.probe
  }

  const MOVED_ITEM: CanvasHtmlItem = { ...HTML_ITEM, position: { x: 40, y: 12 } }

  it("records a user change as a document entry with humanized summary", async () => {
    const probe = mountDocumentProbe("/boards/demo.canvas")

    await act(async () => {
      probe.current!.recordDocumentChange(
        documentChangeEvent({ source: "add-item" }, [], [HTML_ITEM])
      )
    })

    const entries = probe.current!.mutationLogState.entries
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      kind: "document",
      actor: "user",
      summary: "Add item",
      filePath: "/boards/demo.canvas",
    })
    const entry = entries[0]
    if (entry.kind !== "document") throw new Error("expected a document entry")
    expect(entry.prevDoc.items).toEqual([])
    expect(entry.postDoc.items).toEqual([HTML_ITEM])
  })

  it("records agent operations with actor 'agent'", async () => {
    const probe = mountDocumentProbe()

    await act(async () => {
      probe.current!.recordDocumentChange(
        documentChangeEvent({ actor: "agent", source: "delete_items" }, [HTML_ITEM], [])
      )
    })

    expect(probe.current!.mutationLogState.entries[0]).toMatchObject({
      kind: "document",
      actor: "agent",
      summary: "Delete items",
    })
  })

  it("skips selection-only changes (shared item/group references)", async () => {
    const probe = mountDocumentProbe()
    const sharedItems = [HTML_ITEM]

    await act(async () => {
      probe.current!.recordDocumentChange(
        documentChangeEvent({ source: "select-item" }, sharedItems, sharedItems)
      )
    })

    expect(probe.current!.mutationLogState.entries).toHaveLength(0)
  })

  it("skips history-actor changes (undo restores must not re-log)", async () => {
    const probe = mountDocumentProbe()

    await act(async () => {
      probe.current!.recordDocumentChange(
        documentChangeEvent({ actor: "history", source: "replace-state" }, [HTML_ITEM], [])
      )
    })

    expect(probe.current!.mutationLogState.entries).toHaveLength(0)
  })

  it("skips per-change gesture events but records the coalesced endGesture event", async () => {
    const probe = mountDocumentProbe()

    await act(async () => {
      probe.current!.recordDocumentChange(
        documentChangeEvent({ source: "update-item", gesture: true }, [HTML_ITEM], [MOVED_ITEM])
      )
    })
    expect(probe.current!.mutationLogState.entries).toHaveLength(0)

    await act(async () => {
      probe.current!.recordDocumentChange(
        documentChangeEvent(
          { source: "gesture:move-artboard", gesture: true },
          [HTML_ITEM],
          [MOVED_ITEM]
        )
      )
    })
    const entries = probe.current!.mutationLogState.entries
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ kind: "document", summary: "Move artboard" })
  })
})

describe("useCanvasMutationHistory + useCanvasState gesture coalescing (FOX2-67 PR 1)", () => {
  let cleanup: (() => void) | null = null

  afterEach(() => {
    cleanup?.()
    cleanup = null
  })

  type StateApi = ReturnType<typeof useCanvasState>

  function mountIntegration() {
    const stateRef: { current: StateApi | null } = { current: null }
    const historyRef: { current: HookProbe | null } = { current: null }

    function Probe() {
      const storageKeyRef = React.useRef(
        `test-doc-history-${Math.random().toString(36).slice(2)}`
      )
      const state = useCanvasState(storageKeyRef.current)
      stateRef.current = state
      historyRef.current = useCanvasMutationHistory({
        items: state.items,
        groups: state.groups,
        nextZIndex: state.nextZIndex,
        selectedIds: state.selectedIds,
        replaceState: state.replaceState,
        setReactNodeSelection: () => {},
        showToast: () => {},
        emitSourceEditRef: { current: () => {} },
        emitUserActionRef: { current: () => {} },
        documentLogKey: "/boards/integration.canvas",
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
    cleanup = () => {
      act(() => root.unmount())
      container.remove()
    }
    return { stateRef, historyRef }
  }

  it("coalesces 5 in-gesture updates into ONE document entry with begin→end docs", () => {
    const { stateRef, historyRef } = mountIntegration()

    act(() => {
      stateRef.current!.replaceState({
        items: [HTML_ITEM],
        groups: [],
        selectedIds: ["html-1"],
        nextZIndex: 2,
      })
    })
    act(() => {
      stateRef.current!.subscribeToDocumentChanges((event) => {
        historyRef.current!.recordDocumentChange(event)
      })
    })

    act(() => {
      stateRef.current!.beginGesture()
      for (let step = 1; step <= 5; step += 1) {
        stateRef.current!.updateItem("html-1", { position: { x: step * 10, y: 0 } })
      }
      stateRef.current!.endGesture("move-item")
    })

    const entries = historyRef.current!.mutationLogState.entries
    expect(entries).toHaveLength(1)
    const entry = entries[0]
    if (entry.kind !== "document") throw new Error("expected a document entry")
    expect(entry.summary).toBe("Move item")
    expect(entry.prevDoc.items[0].position).toEqual({ x: 0, y: 0 })
    expect(entry.postDoc.items[0].position).toEqual({ x: 50, y: 0 })
  })

  it("records nothing for a click-shaped gesture (begin+end without movement)", () => {
    const { stateRef, historyRef } = mountIntegration()

    act(() => {
      stateRef.current!.replaceState({
        items: [HTML_ITEM],
        groups: [],
        selectedIds: [],
        nextZIndex: 2,
      })
    })
    act(() => {
      stateRef.current!.subscribeToDocumentChanges((event) => {
        historyRef.current!.recordDocumentChange(event)
      })
    })

    act(() => {
      stateRef.current!.beginGesture()
      stateRef.current!.endGesture("move-item")
    })

    expect(historyRef.current!.mutationLogState.entries).toHaveLength(0)
  })
})

describe("useCanvasMutationHistory document replay (FOX2-67 PR 2)", () => {
  let cleanup: (() => void) | null = null

  afterEach(() => {
    cleanup?.()
    cleanup = null
  })

  const SECOND_ITEM: CanvasHtmlItem = { ...HTML_ITEM, id: "html-2", title: "Second node" }
  const GROUP: CanvasGroup = {
    id: "group-1",
    name: "Group 1",
    position: { x: 0, y: 0 },
    isLocked: false,
    color: "#3b82f6",
  }

  it("undo restores prevDoc items AND groups with history meta, pruning dangling selection", async () => {
    const replaceState = vi.fn()
    const showToast = vi.fn()
    const emitUserAction = vi.fn()
    const mounted = mountHook({
      items: [HTML_ITEM],
      selectedIds: ["html-1", "ghost-id"],
      replaceState,
      showToast,
      emitSourceEdit: vi.fn(),
      emitUserAction,
    })
    cleanup = mounted.cleanup

    await act(async () => {
      mounted.probe.current!.recordDocumentChange(
        documentChangeEvent({ source: "ungroup" }, [HTML_ITEM, SECOND_ITEM], [HTML_ITEM], {
          prev: [GROUP],
          next: [],
        })
      )
    })
    await act(async () => {
      await mounted.probe.current!.handleUndoMutation()
    })

    expect(replaceState).toHaveBeenCalledTimes(1)
    expect(replaceState).toHaveBeenCalledWith(
      {
        items: [HTML_ITEM, SECOND_ITEM],
        groups: [GROUP],
        nextZIndex: 10,
        // "ghost-id" does not exist in the restored document — pruned.
        selectedIds: ["html-1"],
      },
      { actor: "history", source: "undo-canvas-change" }
    )
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ tone: "info", message: "Undid: Ungroup" })
    )
    expect(emitUserAction).toHaveBeenCalledWith("canvas-undo", {
      summary: "Ungroup",
      actor: "user",
    })
  })

  it("redo restores postDoc with redo meta and emits canvas-redo", async () => {
    const replaceState = vi.fn()
    const showToast = vi.fn()
    const emitUserAction = vi.fn()
    const mounted = mountHook({
      items: [HTML_ITEM, SECOND_ITEM],
      replaceState,
      showToast,
      emitSourceEdit: vi.fn(),
      emitUserAction,
    })
    cleanup = mounted.cleanup

    await act(async () => {
      mounted.probe.current!.recordDocumentChange(
        documentChangeEvent(
          { actor: "agent", source: "delete_items" },
          [HTML_ITEM, SECOND_ITEM],
          [HTML_ITEM]
        )
      )
    })
    await act(async () => {
      await mounted.probe.current!.handleUndoMutation()
    })
    await act(async () => {
      await mounted.probe.current!.handleRedoMutation()
    })

    expect(replaceState).toHaveBeenCalledTimes(2)
    expect(replaceState).toHaveBeenLastCalledWith(
      expect.objectContaining({ items: [HTML_ITEM], groups: [] }),
      { actor: "history", source: "redo-canvas-change" }
    )
    expect(showToast).toHaveBeenLastCalledWith(
      expect.objectContaining({ tone: "info", message: "Redid: Delete items" })
    )
    expect(emitUserAction).toHaveBeenLastCalledWith("canvas-redo", {
      summary: "Delete items",
      actor: "agent",
    })
  })
})

describe("useCanvasMutationHistory unified timeline (FOX2-67 PR 2, end-to-end)", () => {
  let cleanup: (() => void) | null = null

  afterEach(() => {
    cleanup?.()
    cleanup = null
  })

  type StateApi = ReturnType<typeof useCanvasState>

  function mountIntegration() {
    const stateRef: { current: StateApi | null } = { current: null }
    const historyRef: { current: HookProbe | null } = { current: null }

    function Probe() {
      const storageKeyRef = React.useRef(
        `test-unified-undo-${Math.random().toString(36).slice(2)}`
      )
      const state = useCanvasState(storageKeyRef.current)
      stateRef.current = state
      historyRef.current = useCanvasMutationHistory({
        items: state.items,
        groups: state.groups,
        nextZIndex: state.nextZIndex,
        selectedIds: state.selectedIds,
        replaceState: state.replaceState,
        setReactNodeSelection: () => {},
        showToast: () => {},
        emitSourceEditRef: { current: () => {} },
        emitUserActionRef: { current: () => {} },
        documentLogKey: "/boards/unified.canvas",
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
    cleanup = () => {
      act(() => root.unmount())
      container.remove()
    }
    return { stateRef, historyRef }
  }

  function seedAndSubscribe(
    stateRef: { current: StateApi | null },
    historyRef: { current: HookProbe | null }
  ) {
    act(() => {
      stateRef.current!.replaceState({
        items: [HTML_ITEM],
        groups: [],
        selectedIds: [],
        nextZIndex: 2,
      })
    })
    act(() => {
      stateRef.current!.subscribeToDocumentChanges((event) => {
        historyRef.current!.recordDocumentChange(event)
      })
    })
  }

  const ADD_ITEM_INPUT = {
    type: "html",
    title: "Added node",
    sourceMode: "inline",
    sourceHtml: "<p>NEW</p>",
    position: { x: 100, y: 100 },
    size: { width: 200, height: 150 },
    rotation: 0,
  } as const

  it("document undo does not push a new entry (history-actor skip, end-to-end through replaceState)", async () => {
    const { stateRef, historyRef } = mountIntegration()
    seedAndSubscribe(stateRef, historyRef)

    act(() => {
      stateRef.current!.addItem(ADD_ITEM_INPUT)
    })
    expect(stateRef.current!.items).toHaveLength(2)
    expect(historyRef.current!.mutationLogState.entries).toHaveLength(1)

    await act(async () => {
      await historyRef.current!.handleUndoMutation()
    })

    expect(stateRef.current!.items).toHaveLength(1)
    // The added item was auto-selected; the restored document no longer
    // contains it, so the selection must not dangle.
    expect(stateRef.current!.selectedIds).toEqual([])
    // The restore ran through replaceState with actor "history" — it must
    // NOT have re-logged (and must not have cleared the redo stack).
    expect(historyRef.current!.mutationLogState.entries).toHaveLength(0)
    expect(historyRef.current!.mutationLogState.redoStack).toHaveLength(1)
  })

  it("interleaves source and document entries on one timeline: undo walks back, redo walks forward", async () => {
    const { stateRef, historyRef } = mountIntegration()
    seedAndSubscribe(stateRef, historyRef)

    // 1. A source edit (inline entry: BEFORE → AFTER), then a document add.
    act(() => {
      historyRef.current!.appendMutationLogEntry(buildInlineEntry())
    })
    act(() => {
      stateRef.current!.addItem(ADD_ITEM_INPUT)
    })
    expect(historyRef.current!.mutationLogState.entries).toHaveLength(2)
    expect(stateRef.current!.items).toHaveLength(2)

    // 2. Cmd-Z pops the document entry (top of the interleaved timeline).
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "z", metaKey: true }))
      await Promise.resolve()
    })
    expect(stateRef.current!.items).toHaveLength(1)
    expect(historyRef.current!.mutationLogState.entries).toHaveLength(1)

    // 3. Cmd-Z again pops the source entry underneath.
    await act(async () => {
      await historyRef.current!.handleUndoMutation()
    })
    const undoneItem = stateRef.current!.items.find((item) => item.id === "html-1")
    expect(undoneItem?.type === "html" && undoneItem.sourceHtml).toBe("<p>BEFORE</p>")
    expect(historyRef.current!.mutationLogState.entries).toHaveLength(0)
    expect(historyRef.current!.mutationLogState.redoStack).toHaveLength(2)

    // 4. Redo walks forward: source edit first, then the document add.
    await act(async () => {
      await historyRef.current!.handleRedoMutation()
    })
    const redoneItem = stateRef.current!.items.find((item) => item.id === "html-1")
    expect(redoneItem?.type === "html" && redoneItem.sourceHtml).toBe("<p>AFTER</p>")
    expect(stateRef.current!.items).toHaveLength(1)

    await act(async () => {
      await historyRef.current!.handleRedoMutation()
    })
    expect(stateRef.current!.items).toHaveLength(2)
    expect(historyRef.current!.mutationLogState.entries).toHaveLength(2)
    expect(historyRef.current!.mutationLogState.redoStack).toHaveLength(0)
  })
})
