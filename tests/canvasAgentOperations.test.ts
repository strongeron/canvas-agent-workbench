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
})
