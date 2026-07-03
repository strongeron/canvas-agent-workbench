import { describe, expect, it } from "vitest"

async function loadCanvasAgentOperations() {
  // @ts-ignore local shared CLI/MCP operations core is ESM-only and intentionally consumed directly in tests
  return import("../utils/canvasAgentOperations.mjs")
}

describe("canvas agent operations core", () => {
  it("applies remote operations to canvas state", async () => {
    const ops = await loadCanvasAgentOperations()

    const created = ops.applyCanvasRemoteOperationToState(
      {
        items: [],
        groups: [],
        nextZIndex: 1,
        selectedIds: [],
      },
      ops.createCreateItemOperation({
        id: "item-1",
        type: "artboard",
        name: "Board",
        position: { x: 10, y: 20 },
        size: { width: 320, height: 200 },
        rotation: 0,
        zIndex: 1,
        layout: { display: "flex", direction: "column", align: "stretch", justify: "start", gap: 24, padding: 32 },
      })
    )

    expect(created.items).toHaveLength(1)
    expect(created.selectedIds).toEqual(["item-1"])

    const updated = ops.applyCanvasRemoteOperationToState(
      created,
      ops.createUpdateItemOperation("item-1", { name: "Board Updated" })
    )
    expect(updated.items[0]?.name).toBe("Board Updated")

    const selected = ops.applyCanvasRemoteOperationToState(
      updated,
      ops.createSelectItemsOperation(["item-1"])
    )
    expect(selected.selectedIds).toEqual(["item-1"])

    const cleared = ops.applyCanvasRemoteOperationToState(selected, ops.createClearCanvasOperation())
    expect(cleared.items).toEqual([])
    expect(cleared.selectedIds).toEqual([])
  })

  it("builds artboard items, primitive items, and export output", async () => {
    const ops = await loadCanvasAgentOperations()

    const state = {
      items: [],
      groups: [],
      nextZIndex: 4,
      selectedIds: [],
    }

    const artboard = ops.createArtboardItem(state, {
      name: "Landing Board",
      background: "#fff",
    })
    expect(artboard.type).toBe("artboard")
    expect(artboard.zIndex).toBe(4)
    expect(artboard.layout.display).toBe("flex")

    const primitive = {
      primitiveId: "button",
      entryId: "button-entry",
      name: "Button",
      importPath: "@/components/ui/button",
      sourceId: "@/components/ui/button#Button",
      exportable: true,
      defaultSize: { width: 120, height: 40 },
      variants: [
        {
          name: "Primary",
          props: { children: "Click me", variant: "primary" },
        },
      ],
    }

    const primitiveItem = ops.createPrimitiveCanvasItem(
      {
        items: [artboard],
        groups: [],
        nextZIndex: 5,
        selectedIds: [],
      },
      primitive,
      {
        parentId: artboard.id,
      }
    )

    expect(primitiveItem.type).toBe("component")
    expect(primitiveItem.parentId).toBe(artboard.id)
    expect(primitiveItem.variantIndex).toBe(0)
    expect(primitiveItem.customProps).toBeUndefined()

    const exported = ops.exportCanvasBoard({
      artboardId: artboard.id,
      state: {
        items: [
          artboard,
          {
            ...primitiveItem,
            position: { x: 24, y: 32 },
            size: { width: 120, height: 40 },
          },
        ],
        groups: [],
        nextZIndex: 6,
        selectedIds: [],
      },
      primitives: [primitive],
    })

    expect(exported.componentName).toBe("LandingBoard")
    expect(exported.code).toContain("export function LandingBoard()")
    expect(exported.code).toContain("import { Button }")
  })

  it("builds inline html items from source", async () => {
    const ops = await loadCanvasAgentOperations()

    const item = ops.createHtmlCanvasItem(
      {
        items: [],
        groups: [],
        nextZIndex: 7,
        selectedIds: [],
      },
      {
        title: "Inline card",
        sourceHtml: "<!doctype html><html><body><main>Hello</main></body></html>",
      }
    )

    expect(item.type).toBe("html")
    expect(item.zIndex).toBe(7)
    expect(item.src).toBeUndefined()
    expect(item.sourceMode).toBe("inline")
    expect(item.sourceHtml).toContain("<main>Hello</main>")
  })

  it("builds react html items from TSX source", async () => {
    const ops = await loadCanvasAgentOperations()

    const item = ops.createHtmlCanvasItem(
      {
        items: [],
        groups: [],
        nextZIndex: 8,
        selectedIds: [],
      },
      {
        title: "React card",
        sourceReact: "export default function Preview() { return <main>Hello</main> }",
        sourceCss: "main { padding: 24px; }",
      }
    )

    expect(item.type).toBe("html")
    expect(item.zIndex).toBe(8)
    expect(item.src).toBeUndefined()
    expect(item.sourceMode).toBe("react")
    expect(item.sourceReact).toContain("function Preview")
    expect(item.sourceCss).toContain("padding")
  })

  it("duplicate_items clears mcp-app connection state so the clone starts cold", async () => {
    const ops = await loadCanvasAgentOperations()
    const state = {
      items: [
        {
          id: "mcp-1",
          type: "mcp-app",
          position: { x: 10, y: 10 },
          zIndex: 2,
          status: "connected",
          lastError: "stale error",
          toolsCache: [{ name: "search" }],
          resourcesCache: [{ uri: "res://x" }],
          promptsCache: [{ name: "p" }],
          recentCalls: [{ id: "call-1" }],
          transport: { kind: "http", url: "http://127.0.0.1:9/mcp", headersRef: "h1" },
        },
      ],
      groups: [],
      nextZIndex: 5,
      selectedIds: [],
    }

    const result = ops.buildDuplicateItemsResult(state, { ids: ["mcp-1"] })
    expect(result.ok).toBe(true)
    const clone = result.items[0]
    expect(clone.id).not.toBe("mcp-1")
    // A cloned MCP-app node shares no live proxy connection — it must start cold.
    expect(clone.status).toBe("disconnected")
    expect(clone.lastError).toBeUndefined()
    expect(clone.toolsCache).toBeUndefined()
    expect(clone.resourcesCache).toBeUndefined()
    expect(clone.promptsCache).toBeUndefined()
    expect(clone.recentCalls).toBeUndefined()
    // Transport config (ref-only, no secrets) is preserved.
    expect(clone.transport).toEqual({
      kind: "http",
      url: "http://127.0.0.1:9/mcp",
      headersRef: "h1",
    })
  })

  it("move_items_into_artboard re-parents after current children and resets position/rotation", async () => {
    const ops = await loadCanvasAgentOperations()
    const state = {
      items: [
        {
          id: "board-1",
          type: "artboard",
          name: "Board",
          position: { x: 0, y: 0 },
          size: { width: 1440, height: 900 },
          zIndex: 1,
        },
        // Existing child with order 2 — moved items must append AFTER it.
        { id: "child-1", type: "html", parentId: "board-1", order: 2, zIndex: 2 },
        { id: "free-1", type: "html", position: { x: 50, y: 60 }, rotation: 15, zIndex: 3 },
        { id: "free-2", type: "markdown", position: { x: 90, y: 10 }, zIndex: 4 },
        // Already inside the target — must be skipped, not re-ordered.
        { id: "child-2", type: "html", parentId: "board-1", order: 0, zIndex: 5 },
        { id: "board-2", type: "artboard", position: { x: 2000, y: 0 }, zIndex: 6 },
      ],
      groups: [],
      nextZIndex: 7,
      selectedIds: [],
    }

    const result = ops.buildMoveItemsIntoArtboardResult(state, {
      ids: ["free-1", "free-2", "child-2", "board-2"],
      artboardId: "board-1",
    })
    expect(result.ok).toBe(true)
    expect(result.movedIds).toEqual(["free-1", "free-2"])
    expect(result.updates).toEqual([
      {
        id: "free-1",
        updates: { parentId: "board-1", order: 3, position: { x: 0, y: 0 }, rotation: 0 },
      },
      {
        id: "free-2",
        updates: { parentId: "board-1", order: 4, position: { x: 0, y: 0 }, rotation: 0 },
      },
    ])

    // The batch applies through the shared state applier.
    const next = ops.applyCanvasRemoteOperationToState(
      state,
      ops.createUpdateItemsOperation(result.updates, true)
    )
    const moved = next.items.find((item: { id: string }) => item.id === "free-1")
    expect(moved).toMatchObject({ parentId: "board-1", order: 3, rotation: 0 })
    expect(next.selectedIds).toEqual(["free-1", "free-2"])
  })

  it("move_items_into_artboard rejects missing artboards and empty movable sets", async () => {
    const ops = await loadCanvasAgentOperations()
    const state = {
      items: [
        { id: "board-1", type: "artboard", position: { x: 0, y: 0 }, zIndex: 1 },
        { id: "child-1", type: "html", parentId: "board-1", order: 0, zIndex: 2 },
      ],
      groups: [],
      nextZIndex: 3,
      selectedIds: [],
    }

    expect(ops.buildMoveItemsIntoArtboardResult(state, { ids: ["child-1"] })).toMatchObject({
      ok: false,
      code: "bad-input",
    })
    expect(
      ops.buildMoveItemsIntoArtboardResult(state, { ids: ["child-1"], artboardId: "nope" })
    ).toMatchObject({ ok: false, code: "not-found" })
    // Everything in ids is either the artboard itself or already a child.
    expect(
      ops.buildMoveItemsIntoArtboardResult(state, {
        ids: ["child-1", "board-1"],
        artboardId: "board-1",
      })
    ).toMatchObject({ ok: false, code: "not-found" })
  })
})
