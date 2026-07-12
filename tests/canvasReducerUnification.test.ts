import { describe, expect, it } from "vitest"

import {
  applyCanvasRemoteOperationToState,
  collectCanvasCascadeDeleteIds,
} from "../utils/canvasAgentOperations.mjs"

type LooseItem = Record<string, unknown> & { id: string }
type LooseState = {
  items: LooseItem[]
  groups: unknown[]
  nextZIndex: number
  selectedIds: string[]
}

function state(items: LooseItem[], selectedIds: string[] = []): LooseState {
  return { items, groups: [], nextZIndex: 1, selectedIds }
}

function item(id: string, extra: Record<string, unknown> = {}): LooseItem {
  return { id, type: "markdown", position: { x: 0, y: 0 }, ...extra }
}

// FOX2-74: the browser's applyRemoteOperation delegates to this reducer, so
// these tests lock the behaviors that used to live only in the client copy.
describe("shared remote-operation reducer (FOX2-74)", () => {
  it("cascade delete is transitive — grandchildren go with the artboard", () => {
    const board = state([
      item("artboard"),
      item("child", { parentId: "artboard" }),
      item("grandchild", { parentId: "child" }),
      item("bystander"),
    ])

    const ids = collectCanvasCascadeDeleteIds(board, ["artboard"])
    expect([...ids].sort()).toEqual(["artboard", "child", "grandchild"])

    const next = applyCanvasRemoteOperationToState(board, {
      type: "delete_items",
      ids: ["artboard"],
    }) as LooseState
    expect(next.items.map((entry) => entry.id)).toEqual(["bystander"])
  })

  it("delete_items drops removed ids from the selection", () => {
    const board = state([item("a"), item("b")], ["a", "b"])
    const next = applyCanvasRemoteOperationToState(board, {
      type: "delete_items",
      ids: ["a"],
    }) as LooseState
    expect(next.selectedIds).toEqual(["b"])
  })

  it("runs created items through the caller's normalizeItem hook", () => {
    const normalizeItem = (entry: LooseItem) => ({ ...entry, normalized: true })

    const single = applyCanvasRemoteOperationToState(
      state([]),
      { type: "create_item", item: item("one"), select: true },
      { normalizeItem }
    ) as LooseState
    expect(single.items[0]).toMatchObject({ id: "one", normalized: true })
    expect(single.selectedIds).toEqual(["one"])

    const batch = applyCanvasRemoteOperationToState(
      state([]),
      { type: "create_items", items: [item("a"), item("b")] },
      { normalizeItem }
    ) as LooseState
    expect(batch.items.every((entry) => entry.normalized === true)).toBe(true)
  })

  it("keeps content references untouched for browser-side operation types", () => {
    const board = state([item("a")], ["a"])
    for (const type of [
      "set_viewport",
      "focus_items",
      "set_active_theme",
      "set_canvas_tool",
      "undo_source_mutation",
      "redo_canvas_change",
    ]) {
      const next = applyCanvasRemoteOperationToState(board, { type }) as LooseState
      // The browser wrapper compares these references to restore full no-op
      // identity (returning `prev`), so they must come through unchanged.
      expect(next.items).toBe(board.items)
      expect(next.groups).toBe(board.groups)
      expect(next.selectedIds).toBe(board.selectedIds)
      expect(next.nextZIndex).toBe(board.nextZIndex)
    }
  })

  it("bumps nextZIndex from created items like the browser always did", () => {
    const next = applyCanvasRemoteOperationToState(state([]), {
      type: "create_item",
      item: item("top", { zIndex: 41 }),
    }) as LooseState
    expect(next.nextZIndex).toBe(42)
  })
})
