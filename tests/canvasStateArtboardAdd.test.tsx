// @vitest-environment jsdom

import { act, useRef } from "react"
import { createRoot } from "react-dom/client"
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"

import { useCanvasAddHandlers } from "../hooks/useCanvasAddHandlers"
import { useCanvasState } from "../hooks/useCanvasState"
import type { CanvasArtboardItem, CanvasItem, CanvasItemInput } from "../types/canvas"

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
    const keyRef = useRef(`test-${Math.random().toString(36).slice(2)}`)
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

const artboardChild = (id: string, order: number, parentId: string) =>
  ({
    id,
    type: "html",
    sourceMode: "inline",
    sourceHtml: `<p>${id}</p>`,
    parentId,
    order,
    position: { x: 0, y: 0 },
    size: { width: 200, height: 100 },
    rotation: 0,
    zIndex: order + 1,
  }) as unknown as CanvasItem

const freeform = (id: string, x: number) =>
  ({
    id,
    type: "html",
    sourceMode: "inline",
    sourceHtml: `<p>${id}</p>`,
    position: { x, y: 40 },
    size: { width: 200, height: 100 },
    rotation: 0,
    zIndex: 1,
  }) as unknown as CanvasItem

describe("useCanvasState artboard add primitives (FOX2-59)", () => {
  let cleanup: (() => void) | null = null
  afterEach(() => {
    cleanup?.()
    cleanup = null
  })

  it("duplicates an artboard child in place (same parent, next order, reset position)", () => {
    const h = mountHook()
    cleanup = h.cleanup
    act(() => {
      h.api().replaceState({
        items: [artboardChild("child-1", 0, "board-1")],
        groups: [],
        selectedIds: ["child-1"],
        nextZIndex: 2,
      })
    })
    act(() => h.api().duplicateItem("child-1"))

    const items = h.api().items
    const clone = items.find((item) => item.id !== "child-1")
    expect(items).toHaveLength(2)
    expect(clone?.parentId).toBe("board-1")
    expect(clone?.order).toBe(1)
    expect(clone?.position).toEqual({ x: 0, y: 0 })
  })

  it("duplicates a freeform item with the +20 cascade offset", () => {
    const h = mountHook()
    cleanup = h.cleanup
    act(() => {
      h.api().replaceState({
        items: [freeform("free-1", 100)],
        groups: [],
        selectedIds: ["free-1"],
        nextZIndex: 2,
      })
    })
    act(() => h.api().duplicateItem("free-1"))

    const clone = h.api().items.find((item) => item.id !== "free-1")
    expect(clone?.parentId).toBeUndefined()
    expect(clone?.position).toEqual({ x: 120, y: 60 })
  })

  it("pastes into an artboard at the given order and resets position/parent", () => {
    const h = mountHook()
    cleanup = h.cleanup
    const clip = [freeform("src-1", 300)]
    act(() => {
      h.api().replaceState({
        items: [artboardChild("existing", 0, "board-1")],
        groups: [],
        selectedIds: [],
        nextZIndex: 2,
      })
    })
    act(() => h.api().pasteItems(clip, { parentId: "board-1", order: 1 }))

    const pasted = h.api().items.find((item) => item.parentId === "board-1" && item.id !== "existing")
    expect(pasted).toBeTruthy()
    expect(pasted?.order).toBe(1)
    expect(pasted?.position).toEqual({ x: 0, y: 0 })
    expect(h.api().selectedIds).toEqual([pasted?.id])
  })

  it("pastes to open canvas with a cascade offset when no artboard target", () => {
    const h = mountHook()
    cleanup = h.cleanup
    act(() => {
      h.api().replaceState({ items: [], groups: [], selectedIds: [], nextZIndex: 1 })
    })
    act(() => h.api().pasteItems([freeform("src-2", 300)]))

    const pasted = h.api().items[0]
    expect(pasted?.parentId).toBeUndefined()
    expect(pasted?.position).toEqual({ x: 320, y: 60 })
  })
})

const artboard = (id: string) =>
  ({
    id,
    type: "artboard",
    name: id,
    layout: { display: "flex", direction: "column" },
    position: { x: 0, y: 0 },
    size: { width: 800, height: 600 },
    rotation: 0,
    zIndex: 0,
  }) as unknown as CanvasArtboardItem

type AddHandlersApi = ReturnType<typeof useCanvasAddHandlers>

function mountAddHandlers(options: {
  items: CanvasItem[]
  selectedIds?: string[]
  selectedArtboardItem?: CanvasArtboardItem | null
}) {
  const container = document.createElement("div")
  document.body.appendChild(container)
  const root = createRoot(container)
  const ref: { current: AddHandlersApi | null } = { current: null }
  const added: CanvasItemInput[] = []
  const events: Array<{ action: string; payload?: Record<string, unknown> }> = []

  function Probe() {
    ref.current = useCanvasAddHandlers({
      items: options.items,
      selectedIds: options.selectedIds ?? [],
      selectedArtboardItem: options.selectedArtboardItem ?? null,
      addItem: (item) => {
        added.push(item)
        return `added-${added.length}`
      },
      transform: { scale: 1, offset: { x: 0, y: 0 } },
      workspaceSize: { width: 1200, height: 800 },
      activeProjectId: "project-1",
      activeCanvasFilePath: null,
      ensureCanvasFileMaterialized: async () => null,
      emitUserAction: (action, payload) => {
        events.push({ action, payload })
      },
      emitFileLifecycle: () => {},
      setPropsPanelVisible: () => {},
      setSidebarVisible: () => {},
      setHistoryToast: () => {},
      importCanvasHtmlBundle: async () => {
        throw new Error("not used in these tests")
      },
      refreshCanvasFiles: async () => {},
      runCanvasPersistenceTask: (task) => task(),
    })
    return null
  }

  act(() => {
    root.render(<Probe />)
  })
  return {
    api: () => ref.current as AddHandlersApi,
    added,
    events,
    cleanup: () => {
      act(() => root.unmount())
      container.remove()
    },
  }
}

describe("useCanvasAddHandlers explicit-target convention (FOX2-63)", () => {
  let cleanup: (() => void) | null = null
  afterEach(() => {
    cleanup?.()
    cleanup = null
  })

  it("adds an embed into the artboard flow when given an explicit parentId", () => {
    const h = mountAddHandlers({
      items: [artboard("board-a"), artboardChild("child-1", 0, "board-a")],
    })
    cleanup = h.cleanup
    act(() => h.api().handleAddEmbed("https://example.com", { parentId: "board-a" }))

    expect(h.added).toHaveLength(1)
    expect(h.added[0]).toMatchObject({ type: "embed", parentId: "board-a", order: 1 })
    expect(h.events).toContainEqual({
      action: "create-item",
      payload: { itemType: "embed", parentId: "board-a", target: "artboard" },
    })
  })

  it("explicit parentId wins over a different selected artboard", () => {
    const boardB = artboard("board-b")
    const h = mountAddHandlers({
      items: [artboard("board-a"), boardB, artboardChild("child-1", 3, "board-a")],
      selectedIds: ["board-b"],
      selectedArtboardItem: boardB,
    })
    cleanup = h.cleanup
    act(() =>
      h.api().handleAddMcpApp({
        transport: { kind: "http", url: "https://example.com/mcp" },
        parentId: "board-a",
      })
    )

    expect(h.added).toHaveLength(1)
    expect(h.added[0]).toMatchObject({ type: "mcp-app", parentId: "board-a", order: 4 })
  })

  it("falls back to the selected artboard when no explicit parentId is given", () => {
    const boardA = artboard("board-a")
    const h = mountAddHandlers({
      items: [boardA],
      selectedIds: ["board-a"],
      selectedArtboardItem: boardA,
    })
    cleanup = h.cleanup
    act(() => h.api().handleAddExcalidraw())

    expect(h.added).toHaveLength(1)
    expect(h.added[0]).toMatchObject({ type: "excalidraw", parentId: "board-a", order: 0 })
    expect(h.events).toContainEqual({
      action: "create-item",
      payload: { itemType: "excalidraw", parentId: "board-a", target: "artboard" },
    })
  })

  it("stays freeform when nothing is selected and no parentId is passed", () => {
    const h = mountAddHandlers({ items: [artboard("board-a")] })
    cleanup = h.cleanup
    act(() => h.api().handleAddEmbed("https://example.com"))

    expect(h.added).toHaveLength(1)
    expect(h.added[0].parentId).toBeUndefined()
    expect(h.events).toHaveLength(0)
  })
})
