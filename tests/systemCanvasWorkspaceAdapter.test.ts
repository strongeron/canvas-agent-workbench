import { describe, expect, it } from "vitest"

import {
  buildSystemCanvasWorkspaceManifest,
  buildSystemCanvasWorkspaceStateResource,
} from "../utils/systemCanvasWorkspaceAdapter"

describe("system canvas workspace adapter", () => {
  it("builds a workspace manifest with the current state summary", () => {
    const manifest = buildSystemCanvasWorkspaceManifest({
      stateSummary: {
        nodeCount: 9,
        edgeCount: 6,
        selection: ["node-1"],
        viewport: { x: 20, y: 40, zoom: 0.8 },
      },
    })

    expect(manifest?.surface).toBe("system-canvas")
    expect(manifest?.currentState.nodeCount).toBe(9)
    expect(manifest?.currentState.edgeCount).toBe(6)
    expect(manifest?.resources.some((resource) => resource.id === "system-canvas-state")).toBe(true)
  })

  it("serializes read-only system canvas state with scale config and sections", () => {
    const resource = buildSystemCanvasWorkspaceStateResource({
      workspaceKey: "gallery-demo:system-canvas",
      rawState: {
        nodes: [],
        edges: [],
        selectedNodeId: null,
        selectedEdgeId: null,
        edgeUndoStack: [],
      },
      stateSummary: {
        nodeCount: 2,
        edgeCount: 1,
        selection: ["node-2", "edge-1"],
      },
      selectedNodeId: "node-2",
      selectedEdgeId: "edge-1",
      viewMode: "system",
      scaleConfig: {
        minViewportPx: 320,
        maxViewportPx: 1440,
        baseUnitPx: 4,
        density: 1,
        typeBaseMinPx: 16,
        typeBaseMaxPx: 18,
        minTypeScaleRatio: 1.2,
        maxTypeScaleRatio: 1.25,
        fontFamilySans: "Inter",
        fontFamilyDisplay: "Poppins",
        fontWeightSans: 400,
        fontWeightDisplay: 650,
        iconStroke: 1.5,
        iconLibrary: "lucide",
      },
      requirements: [{ label: "Type", count: 4, required: 4 }],
      sections: [
        {
          id: "type",
          label: "Type + Icons",
          description: "Capsize and Utopia previews",
          nodeIds: ["node-1", "node-2"],
          x: 120,
          y: 180,
          width: 480,
          height: 320,
        },
      ],
      nodes: [
        {
          id: "node-1",
          type: "semantic",
          label: "Font / Sans Metrics",
          group: "system-support",
          position: { x: 140, y: 200 },
          previewKind: "font-family",
        },
      ],
      edges: [
        {
          id: "edge-1",
          type: "map",
          sourceId: "node-1",
          targetId: "node-2",
          sourceLabel: "Font / Sans Metrics",
          targetLabel: "Type / Base Scale",
          note: "Capsize -> Utopia",
        },
      ],
    })

    expect(resource.surface).toBe("system-canvas")
    expect(resource.rawState.nodes).toEqual([])
    expect(resource.scaleConfig.fontFamilySans).toBe("Inter")
    expect(resource.sections[0]?.label).toBe("Type + Icons")
    expect(resource.edges[0]?.note).toBe("Capsize -> Utopia")
  })
})
