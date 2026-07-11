import { describe, expect, it } from "vitest"

import {
  isRenderableCanvasItem,
  KNOWN_CANVAS_ITEM_TYPES,
  validateCanvasAgentOperation,
} from "../utils/canvasOperationSchema.mjs"

function validItem(overrides: Record<string, unknown> = {}) {
  return {
    type: "markdown",
    title: "Doc",
    source: "# Hi",
    position: { x: 10, y: 20 },
    size: { width: 400, height: 300 },
    ...overrides,
  }
}

describe("validateCanvasAgentOperation", () => {
  it("rejects the exact FOX2-72 payload with a structured error", () => {
    // The real-world bug: the item payload accidentally nested under `item`,
    // so the top-level item has no `type` — this sailed through both
    // reducers, minted no id, and bricked the board on every load.
    const result = validateCanvasAgentOperation({
      type: "create_item",
      item: {
        item: validItem(),
        // no type, no position at this level
      },
      select: true,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain("operation.item.type")
  })

  it("rejects non-object operations and missing types", () => {
    expect(validateCanvasAgentOperation(null).ok).toBe(false)
    expect(validateCanvasAgentOperation("create_item" as never).ok).toBe(false)
    expect(validateCanvasAgentOperation({}).ok).toBe(false)
    expect(validateCanvasAgentOperation({ type: "   " }).ok).toBe(false)
  })

  it("rejects unknown operation types with the known list", () => {
    const result = validateCanvasAgentOperation({ type: "explode_board" })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain("create_item")
  })

  it("accepts a valid create_item and mints an id without mutating the input", () => {
    const input = { type: "create_item", item: validItem(), select: true }
    const result = validateCanvasAgentOperation(input)
    expect(result.ok).toBe(true)
    if (result.ok) {
      const operation = result.operation as typeof input & { item: { id?: string } }
      expect(operation.item.id).toMatch(/^canvas-item-/)
      expect(input.item).not.toHaveProperty("id")
    }
  })

  it("keeps an explicit id and rejects blank ones", () => {
    const kept = validateCanvasAgentOperation({
      type: "create_item",
      item: validItem({ id: "my-item" }),
    })
    expect(kept.ok).toBe(true)
    if (kept.ok) {
      expect((kept.operation as { item?: { id?: string } }).item?.id).toBe("my-item")
    }

    expect(
      validateCanvasAgentOperation({ type: "create_item", item: validItem({ id: "  " }) }).ok
    ).toBe(false)
  })

  it("rejects unknown item types instead of coercing to component", () => {
    const result = validateCanvasAgentOperation({
      type: "create_item",
      item: validItem({ type: "hologram" }),
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('"hologram"')
  })

  it("requires numeric positions and well-formed sizes", () => {
    expect(
      validateCanvasAgentOperation({
        type: "create_item",
        item: validItem({ position: undefined }),
      }).ok
    ).toBe(false)
    expect(
      validateCanvasAgentOperation({
        type: "create_item",
        item: validItem({ position: { x: "10", y: 20 } }),
      }).ok
    ).toBe(false)
    expect(
      validateCanvasAgentOperation({
        type: "create_item",
        item: validItem({ position: { x: Number.NaN, y: 0 } }),
      }).ok
    ).toBe(false)
    expect(
      validateCanvasAgentOperation({
        type: "create_item",
        item: validItem({ size: { width: 100 } }),
      }).ok
    ).toBe(false)
  })

  it("validates every entry of create_items and mints missing ids", () => {
    const good = validateCanvasAgentOperation({
      type: "create_items",
      items: [validItem(), validItem({ id: "explicit" })],
    })
    expect(good.ok).toBe(true)
    if (good.ok) {
      const items = (good.operation as { items?: Array<{ id?: string }> }).items ?? []
      expect(items[0]?.id).toMatch(/^canvas-item-/)
      expect(items[1]?.id).toBe("explicit")
    }

    const bad = validateCanvasAgentOperation({
      type: "create_items",
      items: [validItem(), { nope: true }],
    })
    expect(bad.ok).toBe(false)
    if (!bad.ok) expect(bad.error).toContain("items[1]")

    expect(validateCanvasAgentOperation({ type: "create_items", items: [] }).ok).toBe(false)
  })

  it("gates update/delete/select/group/theme shapes", () => {
    expect(validateCanvasAgentOperation({ type: "update_item", updates: {} }).ok).toBe(false)
    expect(validateCanvasAgentOperation({ type: "update_item", id: "a", updates: {} }).ok).toBe(true)
    expect(
      validateCanvasAgentOperation({ type: "update_items", updates: [{ id: "a" }] }).ok
    ).toBe(false)
    expect(validateCanvasAgentOperation({ type: "delete_items", ids: ["a", ""] }).ok).toBe(false)
    expect(validateCanvasAgentOperation({ type: "select_items", ids: ["a"] }).ok).toBe(true)
    expect(validateCanvasAgentOperation({ type: "create_group", group: {} }).ok).toBe(false)
    expect(
      validateCanvasAgentOperation({ type: "create_group", group: { id: "g1" }, itemIds: ["a"] }).ok
    ).toBe(true)
    expect(validateCanvasAgentOperation({ type: "create_canvas_theme" }).ok).toBe(false)
    expect(
      validateCanvasAgentOperation({ type: "update_canvas_theme_var", themeId: "t" }).ok
    ).toBe(false)
    expect(validateCanvasAgentOperation({ type: "delete_canvas_theme", themeId: "t" }).ok).toBe(true)
  })

  it("passes through tool-specific operation types untouched", () => {
    for (const type of ["clear_canvas", "set_viewport", "focus_items", "set_canvas_tool"]) {
      const operation = { type, anything: { goes: true } }
      const result = validateCanvasAgentOperation(operation)
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.operation).toBe(operation)
    }
  })

  it("knows every item type the renderer knows", () => {
    expect([...KNOWN_CANVAS_ITEM_TYPES].sort()).toEqual(
      [
        "embed",
        "html",
        "media",
        "mermaid",
        "excalidraw",
        "markdown",
        "mcp-app",
        "artboard",
        "section",
        "component",
      ].sort()
    )
  })
})

describe("isRenderableCanvasItem", () => {
  it("quarantines items that would crash the board", () => {
    expect(isRenderableCanvasItem(validItem({ id: "ok" }))).toBe(true)
    expect(isRenderableCanvasItem(validItem())).toBe(false) // no id
    expect(isRenderableCanvasItem({ id: "x", type: "markdown" })).toBe(false) // no position
    expect(isRenderableCanvasItem({ item: validItem(), type: "component" })).toBe(false) // FOX2-72 shape
    expect(isRenderableCanvasItem(null)).toBe(false)
  })
})
