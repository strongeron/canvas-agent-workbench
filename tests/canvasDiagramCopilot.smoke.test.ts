import { describe, expect, it } from "vitest"

import {
  runCreateExcalidrawNodeAction,
  runCreateMermaidNodeAction,
  runRemapExcalidrawFromMermaidAction,
} from "../hooks/copilotCanvasDiagramActions"
import type { CanvasItem, CanvasItemInput, CanvasItemUpdate } from "../types/canvas"

function createInMemoryCanvas() {
  const items: CanvasItem[] = []
  let nextId = 1
  let nextZIndex = 1

  const addItem = (input: CanvasItemInput) => {
    const id = `item-${nextId}`
    nextId += 1
    const created = { ...(input as Record<string, unknown>), id, zIndex: nextZIndex } as CanvasItem
    nextZIndex += 1
    items.push(created)
    return id
  }

  const updateItem = (id: string, updates: CanvasItemUpdate) => {
    const index = items.findIndex((candidate) => candidate.id === id)
    if (index < 0) return
    const next = {
      ...(items[index] as unknown as Record<string, unknown>),
      ...(updates as Record<string, unknown>),
      id,
    } as CanvasItem
    items[index] = next
  }

  return { items, addItem, updateItem }
}

describe("copilot canvas diagram smoke flow", () => {
  it("creates Mermaid + Excalidraw nodes and remaps Excalidraw from Mermaid source", async () => {
    const canvas = createInMemoryCanvas()
    const fakeMermaidConverter = async (source: string) => ({
      elements: [{ id: "node-1", type: "rectangle", source }],
      appState: { viewBackgroundColor: "#ffffff" },
      files: {},
    })

    const mermaidResult = await runCreateMermaidNodeAction(canvas.addItem, {
      source: "flowchart LR\nA[Start] --> B[Draft] --> C[Ship]",
      title: "Pipeline",
    })
    expect(mermaidResult.ok).toBe(true)
    const mermaidId = String(mermaidResult.itemId || "")
    expect(mermaidId).not.toBe("")

    const excalidrawResult = await runCreateExcalidrawNodeAction(canvas.addItem, {
      title: "Pipeline sketch",
    })
    expect(excalidrawResult.ok).toBe(true)
    const excalidrawId = String(excalidrawResult.itemId || "")
    expect(excalidrawId).not.toBe("")

    const remapResult = await runRemapExcalidrawFromMermaidAction(
      {
        items: canvas.items,
        selectedIds: [excalidrawId, mermaidId],
        updateItem: canvas.updateItem,
      },
      {
        excalidrawItemId: excalidrawId,
        mermaidItemId: mermaidId,
      },
      {
        convertMermaidToScene: fakeMermaidConverter,
      }
    )
    expect(remapResult.ok).toBe(true)

    const updated = canvas.items.find((item) => item.id === excalidrawId)
    expect(updated?.type).toBe("excalidraw")
    if (!updated || updated.type !== "excalidraw") {
      throw new Error("Expected excalidraw item after remap.")
    }

    expect(updated.sourceMermaid).toContain("A[Start]")
    expect(Array.isArray(updated.scene?.elements)).toBe(true)
    expect((updated.scene?.elements || []).length).toBeGreaterThan(0)
  })
})
