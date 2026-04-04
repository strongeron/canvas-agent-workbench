import { describe, expect, it } from "vitest"

import {
  buildCanvasWorkspaceManifest,
  buildCanvasWorkspaceStateResource,
} from "../utils/canvasWorkspaceAdapter"

describe("canvas workspace adapter", () => {
  it("builds a typed canvas workspace state resource", () => {
    const resource = buildCanvasWorkspaceStateResource({
      workspaceKey: "gallery-demo:canvas",
      state: {
        items: [{ id: "item-1", type: "markdown", source: "# Hello", position: { x: 10, y: 20 }, size: { width: 320, height: 180 }, rotation: 0, zIndex: 1 }],
        groups: [],
        nextZIndex: 2,
        selectedIds: ["item-1"],
      },
      primitives: [
        {
          primitiveId: "text",
          entryId: "text-entry",
          name: "Text",
          category: "Typography",
          importPath: "@/components/Text",
          family: "text",
          level: "primitive",
          tokenUsage: ["--font-family-sans"],
          variants: [],
        },
      ],
      stateSummary: {
        itemCount: 1,
        groupCount: 0,
        selection: ["item-1"],
      },
    })

    expect(resource).toMatchObject({
      surface: "canvas",
      workspaceKey: "gallery-demo:canvas",
      selection: ["item-1"],
      stateSummary: {
        itemCount: 1,
      },
    })
    expect(resource.state.items).toHaveLength(1)
    expect(resource.primitives).toHaveLength(1)
  })

  it("builds a canvas manifest from the workspace state summary", () => {
    const manifest = buildCanvasWorkspaceManifest({
      stateSummary: {
        itemCount: 3,
        groupCount: 1,
        selection: ["item-1"],
      },
    })

    expect(manifest?.surface).toBe("canvas")
    expect(manifest?.currentState).toMatchObject({
      itemCount: 3,
      groupCount: 1,
      selection: ["item-1"],
    })
  })
})
