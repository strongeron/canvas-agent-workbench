import { describe, expect, it } from "vitest"

import { buildCanvasAgentSelectionContext } from "../utils/canvasAgentSelectionContext"
import type { CanvasItem } from "../types/canvas"

const ITEMS = [
  {
    id: "artboard-1",
    type: "artboard",
    name: "Codex was here",
    position: { x: 100.4, y: 120 },
    size: { width: 640, height: 400 },
    rotation: 0,
    zIndex: 1,
  },
  {
    id: "codex-note",
    type: "markdown",
    title: "Codex",
    source: "# Hello",
    parentId: "artboard-1",
    position: { x: 140, y: 200 },
    size: { width: 420, height: 200 },
    rotation: 0,
    zIndex: 2,
  },
  {
    id: "unselected",
    type: "markdown",
    source: "other",
    position: { x: 0, y: 0 },
    size: { width: 100, height: 100 },
    rotation: 0,
    zIndex: 3,
  },
] as unknown as CanvasItem[]

describe("buildCanvasAgentSelectionContext", () => {
  it("builds a paste-ready block for the selected items only", () => {
    const block = buildCanvasAgentSelectionContext({
      projectId: "demo",
      canvasPath: "agent-demo.canvas",
      items: ITEMS,
      selectedIds: ["artboard-1", "codex-note"],
    })

    expect(block).toContain("project: demo")
    expect(block).toContain("canvas: agent-demo.canvas")
    expect(block).toContain("selected items (2):")
    expect(block).toContain('- artboard-1 — artboard "Codex was here" @ (100,120) 640x400')
    expect(block).toContain('- codex-note — markdown "Codex" @ (140,200) 420x200 (parent: artboard-1)')
    expect(block).not.toContain("unselected")
    expect(block).toContain("get_canvas_state")
  })

  it("returns null for an empty selection and falls back for unsaved boards", () => {
    expect(
      buildCanvasAgentSelectionContext({
        projectId: "demo",
        canvasPath: "agent-demo.canvas",
        items: ITEMS,
        selectedIds: [],
      })
    ).toBeNull()

    const block = buildCanvasAgentSelectionContext({
      projectId: null,
      canvasPath: null,
      items: ITEMS,
      selectedIds: ["codex-note"],
    })
    expect(block).toContain("project: unknown")
    expect(block).toContain("canvas: (unsaved board)")
  })
})
