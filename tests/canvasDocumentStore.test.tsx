// @vitest-environment jsdom

// FOX2-66: CanvasDocumentStore seam — every mutator flows through applyChange,
// the change stream reports tagged prev/next snapshots, and gesture boundaries
// coalesce high-frequency streams into one event.

import { act, useRef } from "react"
import { createRoot } from "react-dom/client"
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"

import { useCanvasState } from "../hooks/useCanvasState"
import type { CanvasDocumentChangeEvent } from "../hooks/useCanvasState"
import type {
  CanvasGroup,
  CanvasItem,
  CanvasItemInput,
  CanvasStateSnapshot,
} from "../types/canvas"

const originalActEnvironmentDescriptor = Object.getOwnPropertyDescriptor(
  globalThis,
  "IS_REACT_ACT_ENVIRONMENT"
)

beforeAll(() => {
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
    value: true,
    configurable: true,
    writable: true,
  })
})

afterAll(() => {
  if (originalActEnvironmentDescriptor) {
    Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", originalActEnvironmentDescriptor)
  } else {
    delete (globalThis as { IS_REACT_ACT_ENVIRONMENT?: unknown }).IS_REACT_ACT_ENVIRONMENT
  }
})

type StateApi = ReturnType<typeof useCanvasState>

function mountHook() {
  const container = document.createElement("div")
  document.body.appendChild(container)
  const root = createRoot(container)
  const ref: { current: StateApi | null } = { current: null }

  function Probe() {
    // Stable key: an inline random key would change every render and trip
    // useLocalStorage's key-change reset effect.
    const keyRef = useRef(`test-doc-store-${Math.random().toString(36).slice(2)}`)
    ref.current = useCanvasState(keyRef.current)
    return null
  }

  act(() => {
    root.render(<Probe />)
  })
  return {
    api: () => ref.current as StateApi,
    cleanup: () => {
      act(() => root.unmount())
      container.remove()
    },
  }
}

const htmlItem = (id: string, x = 0, extra: Partial<CanvasItem> = {}) =>
  ({
    id,
    type: "html",
    sourceMode: "inline",
    sourceHtml: `<p>${id}</p>`,
    position: { x, y: 0 },
    size: { width: 200, height: 100 },
    rotation: 0,
    zIndex: 1,
    ...extra,
  }) as unknown as CanvasItem

const itemInput = (): CanvasItemInput => ({
  type: "html",
  sourceMode: "inline",
  sourceHtml: "<p>new</p>",
  position: { x: 0, y: 0 },
  size: { width: 100, height: 100 },
  rotation: 0,
})

const group = (id: string) =>
  ({
    id,
    name: id,
    position: { x: 0, y: 0 },
    isLocked: false,
    color: "#8b5cf6",
  }) as CanvasGroup

const snapshot = (
  items: CanvasItem[],
  groups: CanvasGroup[] = [],
  selectedIds: string[] = []
): CanvasStateSnapshot => ({ items, groups, selectedIds, nextZIndex: items.length + 1 })

describe("useCanvasState change stream meta (FOX2-66)", () => {
  let cleanup: (() => void) | null = null
  afterEach(() => {
    cleanup?.()
    cleanup = null
  })

  const groupedSeed = () =>
    snapshot(
      [htmlItem("a", 0, { groupId: "g-1" }), htmlItem("b", 300, { groupId: "g-1" })],
      [group("g-1")],
      ["a"]
    )

  const cases: Array<{
    source: string
    actor?: "user" | "agent" | "history"
    seed?: CanvasStateSnapshot
    invoke: (api: StateApi) => void
  }> = [
    {
      source: "add-item",
      invoke: (api) => api.addItem(itemInput()),
    },
    { source: "update-item", invoke: (api) => api.updateItem("a", { position: { x: 9, y: 9 } }) },
    { source: "remove-item", invoke: (api) => api.removeItem("a") },
    { source: "bring-to-front", invoke: (api) => api.bringToFront("a") },
    { source: "select-item", invoke: (api) => api.selectItem("b") },
    { source: "select-items", invoke: (api) => api.selectItems(["a", "b"]) },
    { source: "select-all", invoke: (api) => api.selectAll() },
    { source: "clear-selection", invoke: (api) => api.clearSelection() },
    { source: "create-group", invoke: (api) => api.createGroup(["a", "b"]) },
    { source: "ungroup", seed: groupedSeed(), invoke: (api) => api.ungroup("g-1") },
    {
      source: "update-group",
      seed: groupedSeed(),
      invoke: (api) => api.updateGroup("g-1", { name: "renamed" }),
    },
    { source: "toggle-group-lock", seed: groupedSeed(), invoke: (api) => api.toggleGroupLock("g-1") },
    { source: "select-group", seed: groupedSeed(), invoke: (api) => api.selectGroup("g-1") },
    { source: "move-group", seed: groupedSeed(), invoke: (api) => api.moveGroup("g-1", 10, 10) },
    { source: "remove-selected", invoke: (api) => api.removeSelected() },
    { source: "move-selected", invoke: (api) => api.moveSelected(5, 5) },
    { source: "duplicate-selected", invoke: (api) => api.duplicateSelected() },
    { source: "duplicate-item", invoke: (api) => api.duplicateItem("a") },
    { source: "paste-items", invoke: (api) => api.pasteItems([htmlItem("clip-1", 50)]) },
    { source: "clear-canvas", invoke: (api) => api.clearCanvas() },
    { source: "replace-state", invoke: (api) => api.replaceState(snapshot([htmlItem("z")])) },
    {
      source: "delete_items",
      actor: "agent",
      invoke: (api) => api.applyRemoteOperation({ type: "delete_items", ids: ["a"] }),
    },
    {
      source: "update_item",
      actor: "agent",
      invoke: (api) =>
        api.applyRemoteOperation({
          type: "update_item",
          id: "a",
          updates: { position: { x: 1, y: 1 } },
        }),
    },
  ]

  for (const testCase of cases) {
    it(`${testCase.source} fires the stream as ${testCase.actor ?? "user"}/${testCase.source}`, () => {
      const h = mountHook()
      cleanup = h.cleanup
      act(() => {
        h.api().replaceState(testCase.seed ?? snapshot([htmlItem("a"), htmlItem("b", 300)], [], ["a"]))
      })

      const events: CanvasDocumentChangeEvent[] = []
      h.api().subscribeToDocumentChanges((event) => events.push(event))
      act(() => testCase.invoke(h.api()))

      expect(events).toHaveLength(1)
      expect(events[0].meta).toEqual({ actor: testCase.actor ?? "user", source: testCase.source })
    })
  }

  it("replaceState merges caller-supplied meta over the default", () => {
    const h = mountHook()
    cleanup = h.cleanup
    const events: CanvasDocumentChangeEvent[] = []
    h.api().subscribeToDocumentChanges((event) => events.push(event))

    act(() => h.api().replaceState(snapshot([htmlItem("a")]), { actor: "history" }))
    act(() => h.api().replaceState(snapshot([]), { actor: "history", source: "file-load" }))

    expect(events[0].meta).toEqual({ actor: "history", source: "replace-state" })
    expect(events[1].meta).toEqual({ actor: "history", source: "file-load" })
  })

  it("emits prev/next document snapshots around the change", () => {
    const h = mountHook()
    cleanup = h.cleanup
    act(() => h.api().replaceState(snapshot([htmlItem("a")])))

    const events: CanvasDocumentChangeEvent[] = []
    h.api().subscribeToDocumentChanges((event) => events.push(event))
    act(() => h.api().removeItem("a"))

    expect(events).toHaveLength(1)
    expect(events[0].prevSnapshot.items.map((item) => item.id)).toEqual(["a"])
    expect(events[0].nextSnapshot.items).toEqual([])
    expect(Object.keys(events[0].prevSnapshot).sort()).toEqual(["groups", "items"])
  })

  it("stops delivering events after unsubscribe, without affecting other listeners", () => {
    const h = mountHook()
    cleanup = h.cleanup
    const first: CanvasDocumentChangeEvent[] = []
    const second: CanvasDocumentChangeEvent[] = []
    const unsubscribeFirst = h.api().subscribeToDocumentChanges((event) => first.push(event))
    h.api().subscribeToDocumentChanges((event) => second.push(event))

    act(() => h.api().replaceState(snapshot([htmlItem("a")])))
    unsubscribeFirst()
    act(() => h.api().removeItem("a"))

    expect(first).toHaveLength(1)
    expect(second).toHaveLength(2)
  })

  it("mutates state normally with no listeners subscribed", () => {
    const h = mountHook()
    cleanup = h.cleanup
    act(() => h.api().replaceState(snapshot([])))
    act(() => h.api().pasteItems([htmlItem("clip-1")]))

    expect(h.api().items).toHaveLength(1)
  })

  it("composes same-tick mutations on each other's output", () => {
    const h = mountHook()
    cleanup = h.cleanup
    act(() => h.api().replaceState(snapshot([])))
    act(() => {
      h.api().addItem(itemInput())
      h.api().addItem(itemInput())
    })

    expect(h.api().items).toHaveLength(2)
  })
})

describe("useCanvasState gesture boundaries (FOX2-66)", () => {
  let cleanup: (() => void) | null = null
  afterEach(() => {
    cleanup?.()
    cleanup = null
  })

  it("tags per-change events and emits one coalesced event at endGesture", () => {
    const h = mountHook()
    cleanup = h.cleanup
    act(() => h.api().replaceState(snapshot([htmlItem("a")], [], ["a"])))

    const events: CanvasDocumentChangeEvent[] = []
    h.api().subscribeToDocumentChanges((event) => events.push(event))

    act(() => {
      h.api().beginGesture()
      h.api().updateItem("a", { position: { x: 10, y: 0 } })
      h.api().updateItem("a", { position: { x: 20, y: 0 } })
      h.api().endGesture("drag-item")
    })

    expect(events).toHaveLength(3)
    expect(events[0].meta).toEqual({ actor: "user", source: "update-item", gesture: true })
    expect(events[1].meta).toEqual({ actor: "user", source: "update-item", gesture: true })

    const coalesced = events[2]
    expect(coalesced.meta).toEqual({ actor: "user", source: "gesture:drag-item", gesture: true })
    expect(coalesced.prevSnapshot.items[0].position).toEqual({ x: 0, y: 0 })
    expect(coalesced.nextSnapshot.items[0].position).toEqual({ x: 20, y: 0 })
  })

  it("labels the coalesced event plain 'gesture' when no summary is given", () => {
    const h = mountHook()
    cleanup = h.cleanup
    act(() => h.api().replaceState(snapshot([htmlItem("a")])))

    const events: CanvasDocumentChangeEvent[] = []
    h.api().subscribeToDocumentChanges((event) => events.push(event))
    act(() => {
      h.api().beginGesture()
      h.api().updateItem("a", { position: { x: 5, y: 5 } })
      h.api().endGesture()
    })

    expect(events.at(-1)?.meta.source).toBe("gesture")
  })

  it("skips the coalesced event when nothing changed during the gesture", () => {
    const h = mountHook()
    cleanup = h.cleanup
    act(() => h.api().replaceState(snapshot([htmlItem("a")])))

    const events: CanvasDocumentChangeEvent[] = []
    h.api().subscribeToDocumentChanges((event) => events.push(event))
    act(() => {
      h.api().beginGesture()
      h.api().endGesture("noop")
    })

    expect(events).toHaveLength(0)
  })

  it("skips the coalesced event when the gesture only touched selection", () => {
    const h = mountHook()
    cleanup = h.cleanup
    act(() => h.api().replaceState(snapshot([htmlItem("a")])))

    const events: CanvasDocumentChangeEvent[] = []
    h.api().subscribeToDocumentChanges((event) => events.push(event))
    act(() => {
      h.api().beginGesture()
      h.api().selectItem("a")
      h.api().endGesture("selection")
    })

    expect(events).toHaveLength(1)
    expect(events[0].meta).toEqual({ actor: "user", source: "select-item", gesture: true })
  })

  it("does not tag changes made after endGesture", () => {
    const h = mountHook()
    cleanup = h.cleanup
    act(() => h.api().replaceState(snapshot([htmlItem("a")])))

    const events: CanvasDocumentChangeEvent[] = []
    h.api().subscribeToDocumentChanges((event) => events.push(event))
    act(() => {
      h.api().beginGesture()
      h.api().updateItem("a", { position: { x: 5, y: 5 } })
      h.api().endGesture("drag")
      h.api().updateItem("a", { position: { x: 6, y: 6 } })
    })

    expect(events.at(-1)?.meta).toEqual({ actor: "user", source: "update-item" })
  })
})
