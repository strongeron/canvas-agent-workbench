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

  it("wrap_items_in_section wraps shared-parent children at their minimum order", async () => {
    const ops = await loadCanvasAgentOperations()
    const state = {
      items: [
        {
          id: "board-1",
          type: "artboard",
          position: { x: 0, y: 0 },
          size: { width: 1440, height: 900 },
          zIndex: 1,
          layout: { display: "flex", direction: "column", align: "stretch", justify: "start", gap: 24, padding: 32 },
        },
        { id: "a", type: "html", parentId: "board-1", order: 2, size: { width: 300, height: 100 }, position: { x: 0, y: 0 }, zIndex: 2 },
        { id: "b", type: "html", parentId: "board-1", order: 5, size: { width: 300, height: 140 }, position: { x: 0, y: 0 }, zIndex: 3 },
      ],
      groups: [],
      nextZIndex: 4,
      selectedIds: [],
    }

    const result = ops.buildWrapItemsInSectionResult(state, { ids: ["b", "a"] })
    expect(result.ok).toBe(true)
    expect(result.mode).toBe("existing-parent")
    expect(result.parentId).toBe("board-1")
    // Section slots in at the selection's minimum order; items re-order by
    // their existing order, not the ids argument order.
    expect(result.sectionItem).toMatchObject({
      type: "section",
      parentId: "board-1",
      order: 2,
      zIndex: 4,
      layout: { display: "grid", columns: 2 },
      layoutSizing: { width: "fill", height: "hug" },
    })
    expect(result.sectionItem.size.width).toBe(1440 - 32 * 2)
    expect(result.wrappedIds).toEqual(["a", "b"])
    expect(result.updates).toEqual([
      { id: "a", updates: { parentId: result.sectionItem.id, order: 0, position: { x: 0, y: 0 }, rotation: 0 } },
      { id: "b", updates: { parentId: result.sectionItem.id, order: 1, position: { x: 0, y: 0 }, rotation: 0 } },
    ])
  })

  it("wrap_items_in_section wraps freeform items inside their containing artboard", async () => {
    const ops = await loadCanvasAgentOperations()
    const state = {
      items: [
        {
          id: "board-1",
          type: "artboard",
          position: { x: 0, y: 0 },
          size: { width: 1000, height: 800 },
          zIndex: 1,
          layout: { display: "flex", direction: "column", align: "stretch", justify: "start", gap: 24, padding: 20 },
        },
        { id: "child-1", type: "html", parentId: "board-1", order: 0, size: { width: 200, height: 80 }, position: { x: 0, y: 0 }, zIndex: 2 },
        // Freeform, centers inside board-1. lower-y first in wrap order.
        { id: "free-low", type: "html", size: { width: 200, height: 80 }, position: { x: 100, y: 400 }, zIndex: 3 },
        { id: "free-high", type: "markdown", size: { width: 200, height: 80 }, position: { x: 100, y: 100 }, zIndex: 4 },
      ],
      groups: [],
      nextZIndex: 5,
      selectedIds: [],
    }

    const result = ops.buildWrapItemsInSectionResult(state, {
      ids: ["free-low", "free-high"],
      section: { name: "Hero" },
    })
    expect(result.ok).toBe(true)
    expect(result.mode).toBe("freeform-inside-artboard")
    // Appends after the artboard's existing children.
    expect(result.sectionItem).toMatchObject({ name: "Hero", parentId: "board-1", order: 1 })
    // Freeform wrap order is by y, then x.
    expect(result.wrappedIds).toEqual(["free-high", "free-low"])
  })

  it("wrap_items_in_section rejects singles, containers, and mixed parents", async () => {
    const ops = await loadCanvasAgentOperations()
    const state = {
      items: [
        { id: "board-1", type: "artboard", position: { x: 0, y: 0 }, size: { width: 500, height: 500 }, zIndex: 1 },
        { id: "board-2", type: "artboard", position: { x: 600, y: 0 }, size: { width: 500, height: 500 }, zIndex: 2 },
        { id: "a", type: "html", parentId: "board-1", order: 0, size: { width: 100, height: 50 }, position: { x: 0, y: 0 }, zIndex: 3 },
        { id: "b", type: "html", parentId: "board-2", order: 0, size: { width: 100, height: 50 }, position: { x: 0, y: 0 }, zIndex: 4 },
        // Freeform but outside every artboard.
        { id: "stray", type: "html", size: { width: 100, height: 50 }, position: { x: 2000, y: 2000 }, zIndex: 5 },
      ],
      groups: [],
      nextZIndex: 6,
      selectedIds: [],
    }

    expect(ops.buildWrapItemsInSectionResult(state, { ids: ["a"] })).toMatchObject({
      ok: false,
      code: "bad-input",
    })
    expect(
      ops.buildWrapItemsInSectionResult(state, { ids: ["a", "board-1"] })
    ).toMatchObject({ ok: false, code: "bad-input" })
    // Different parents — no shared container.
    expect(ops.buildWrapItemsInSectionResult(state, { ids: ["a", "b"] })).toMatchObject({
      ok: false,
      code: "bad-input",
    })
    expect(ops.buildWrapItemsInSectionResult(state, { ids: ["a", "ghost"] })).toMatchObject({
      ok: false,
      code: "not-found",
    })
  })

  it("update_section_sizing toggles fill/hug and applies explicit sizes like the inspector", async () => {
    const ops = await loadCanvasAgentOperations()
    const state = {
      items: [
        {
          id: "board-1",
          type: "artboard",
          position: { x: 0, y: 0 },
          size: { width: 1000, height: 800 },
          zIndex: 1,
          layout: { display: "flex", direction: "column", align: "stretch", justify: "start", gap: 24, padding: 20 },
        },
        {
          id: "section-1",
          type: "section",
          parentId: "board-1",
          order: 0,
          position: { x: 0, y: 0 },
          size: { width: 400, height: 300 },
          zIndex: 2,
          layout: { display: "grid", columns: 2, align: "stretch", justify: "start", gap: 16, padding: 16 },
        },
      ],
      groups: [],
      nextZIndex: 3,
      selectedIds: [],
    }

    // Fill: parent inner width = 1000 - 20*2; previous size remembered as hug.
    const filled = ops.buildUpdateSectionSizingResult(state, {
      itemId: "section-1",
      widthMode: "fill",
      heightMode: "fill",
    })
    expect(filled.ok).toBe(true)
    expect(filled.updates.size).toEqual({ width: 960, height: 760 })
    expect(filled.updates.layoutSizing).toMatchObject({
      width: "fill",
      height: "fill",
      hugWidth: 400,
      hugHeight: 300,
    })

    // Hug restores the stored size.
    const filledState = ops.applyCanvasRemoteOperationToState(
      state,
      ops.createUpdateItemOperation("section-1", filled.updates)
    )
    const hugged = ops.buildUpdateSectionSizingResult(filledState, {
      itemId: "section-1",
      widthMode: "hug",
    })
    expect(hugged.ok).toBe(true)
    expect(hugged.updates.size.width).toBe(400)
    expect(hugged.updates.layoutSizing.width).toBe("hug")

    // Explicit number = hug at that size, mirroring the panel's inputs.
    const explicit = ops.buildUpdateSectionSizingResult(state, {
      itemId: "section-1",
      width: 512,
    })
    expect(explicit.ok).toBe(true)
    expect(explicit.updates.size.width).toBe(512)
    expect(explicit.updates.layoutSizing).toMatchObject({ width: "hug", hugWidth: 512 })
  })

  it("update_section_sizing rejects non-sections, parentless fill, and conflicting args", async () => {
    const ops = await loadCanvasAgentOperations()
    const state = {
      items: [
        { id: "free-section", type: "section", position: { x: 0, y: 0 }, size: { width: 400, height: 300 }, zIndex: 1, layout: { display: "grid", columns: 1, align: "stretch", justify: "start", gap: 16, padding: 16 } },
        { id: "html-1", type: "html", position: { x: 0, y: 0 }, size: { width: 100, height: 50 }, zIndex: 2 },
      ],
      groups: [],
      nextZIndex: 3,
      selectedIds: [],
    }

    expect(
      ops.buildUpdateSectionSizingResult(state, { itemId: "html-1", widthMode: "hug" })
    ).toMatchObject({ ok: false, code: "not-found" })
    expect(
      ops.buildUpdateSectionSizingResult(state, { itemId: "free-section", widthMode: "fill" })
    ).toMatchObject({ ok: false, code: "bad-input" })
    expect(
      ops.buildUpdateSectionSizingResult(state, {
        itemId: "free-section",
        widthMode: "fill",
        width: 500,
      })
    ).toMatchObject({ ok: false, code: "bad-input" })
    expect(
      ops.buildUpdateSectionSizingResult(state, { itemId: "free-section" })
    ).toMatchObject({ ok: false, code: "bad-input" })
  })

  it("reorder_layer front/back adjust zIndex, up/down swap sibling order", async () => {
    const ops = await loadCanvasAgentOperations()
    const state = {
      items: [
        { id: "free-1", type: "html", position: { x: 0, y: 0 }, zIndex: 2 },
        { id: "free-2", type: "markdown", position: { x: 40, y: 0 }, zIndex: 5 },
        { id: "board-1", type: "artboard", position: { x: 0, y: 400 }, zIndex: 1 },
        { id: "child-a", type: "html", parentId: "board-1", order: 0, zIndex: 3 },
        { id: "child-b", type: "html", parentId: "board-1", order: 1, zIndex: 4 },
      ],
      groups: [],
      nextZIndex: 6,
      selectedIds: [],
    }

    expect(ops.buildReorderLayerResult(state, { id: "free-1", direction: "front" })).toEqual({
      ok: true,
      updates: [{ id: "free-1", updates: { zIndex: 6 } }],
      direction: "front",
    })
    expect(ops.buildReorderLayerResult(state, { id: "free-2", direction: "back" })).toEqual({
      ok: true,
      updates: [{ id: "free-2", updates: { zIndex: 0 } }],
      direction: "back",
    })
    // up/down swap layout order between siblings, exactly like handleMoveLayer.
    expect(ops.buildReorderLayerResult(state, { id: "child-b", direction: "up" })).toEqual({
      ok: true,
      updates: [
        { id: "child-b", updates: { order: 0 } },
        { id: "child-a", updates: { order: 1 } },
      ],
      direction: "up",
    })
  })

  it("reorder_layer rejects freeform up/down, boundary moves, and unknown ids", async () => {
    const ops = await loadCanvasAgentOperations()
    const state = {
      items: [
        { id: "free-1", type: "html", position: { x: 0, y: 0 }, zIndex: 1 },
        { id: "board-1", type: "artboard", position: { x: 0, y: 400 }, zIndex: 2 },
        { id: "child-a", type: "html", parentId: "board-1", order: 0, zIndex: 3 },
      ],
      groups: [],
      nextZIndex: 4,
      selectedIds: [],
    }

    expect(ops.buildReorderLayerResult(state, { id: "free-1", direction: "up" })).toMatchObject({
      ok: false,
      code: "bad-input",
    })
    expect(ops.buildReorderLayerResult(state, { id: "child-a", direction: "up" })).toMatchObject({
      ok: false,
      code: "no-op",
    })
    expect(ops.buildReorderLayerResult(state, { id: "ghost", direction: "front" })).toMatchObject({
      ok: false,
      code: "not-found",
    })
    expect(ops.buildReorderLayerResult(state, { id: "free-1", direction: "sideways" })).toMatchObject({
      ok: false,
      code: "bad-input",
    })
  })

  it("applies theme operations to the workspace theme snapshot (FOX2-54)", async () => {
    const ops = await loadCanvasAgentOperations()
    const empty = { themes: [], activeThemeId: null, tokenValues: { "--color-brand-600": "#4f46e5" } }

    const created = ops.applyCanvasThemeOperationToSnapshot(empty, {
      type: "create_canvas_theme",
      label: "Midnight",
    })
    expect(created.themes).toHaveLength(1)
    expect(created.themes[0]).toMatchObject({
      id: "midnight",
      label: "Midnight",
      vars: { "--color-brand-600": "#4f46e5" },
    })
    expect(created.activeThemeId).toBe("midnight")

    // Same slug algorithm as the browser: collisions get numeric suffixes.
    const collided = ops.applyCanvasThemeOperationToSnapshot(created, {
      type: "create_canvas_theme",
      label: "midnight!",
    })
    expect(collided.themes.map((theme: { id: string }) => theme.id)).toEqual([
      "midnight",
      "midnight-2",
    ])

    const updated = ops.applyCanvasThemeOperationToSnapshot(created, {
      type: "update_canvas_theme_var",
      themeId: "midnight",
      cssVar: "--color-brand-600",
      value: "#1e1b4b",
    })
    expect(updated.themes[0].vars["--color-brand-600"]).toBe("#1e1b4b")

    const cleared = ops.applyCanvasThemeOperationToSnapshot(updated, {
      type: "update_canvas_theme_var",
      themeId: "midnight",
      cssVar: "--color-brand-600",
      value: "",
    })
    expect(cleared.themes[0].vars["--color-brand-600"]).toBeUndefined()

    const deleted = ops.applyCanvasThemeOperationToSnapshot(created, {
      type: "delete_canvas_theme",
      themeId: "midnight",
    })
    expect(deleted.themes).toHaveLength(0)
    expect(deleted.activeThemeId).toBeNull()

    // Non-theme operations return the snapshot untouched (same reference).
    expect(
      ops.applyCanvasThemeOperationToSnapshot(created, { type: "select_items", ids: [] })
    ).toBe(created)
    // Unknown ids are no-ops, not errors.
    expect(
      ops.applyCanvasThemeOperationToSnapshot(created, {
        type: "delete_canvas_theme",
        themeId: "ghost",
      })
    ).toBe(created)
  })
})
