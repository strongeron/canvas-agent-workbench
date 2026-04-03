import { describe, expect, it } from "vitest"

import {
  buildNodeCatalogWorkspaceManifest,
  buildNodeCatalogWorkspaceStateResource,
} from "../utils/nodeCatalogWorkspaceAdapter"

describe("node catalog workspace adapter", () => {
  it("builds a workspace manifest with the current state summary", () => {
    const manifest = buildNodeCatalogWorkspaceManifest({
      stateSummary: {
        itemCount: 7,
        nodeCount: 21,
        groupCount: 6,
        selection: [],
        viewport: { x: 40, y: 80, zoom: 0.9 },
      },
    })

    expect(manifest?.surface).toBe("node-catalog")
    expect(manifest?.currentState.itemCount).toBe(7)
    expect(manifest?.currentState.nodeCount).toBe(21)
    expect(manifest?.currentState.groupCount).toBe(6)
    expect(manifest?.resources.some((resource) => resource.id === "node-catalog-state")).toBe(true)
  })

  it("serializes workspace sections, node sections, and state preview", () => {
    const resource = buildNodeCatalogWorkspaceStateResource({
      workspaceKey: "gallery-demo-node-catalog",
      stateSummary: {
        itemCount: 7,
        nodeCount: 5,
        groupCount: 3,
        selection: [],
      },
      workspaceSections: [
        {
          id: "canvas-workspace",
          label: "Canvas Workspace",
          description: "General board items and embeds.",
          items: [
            {
              id: "workspace-media",
              label: "Media Asset",
              kind: "media",
              description: "Image or video asset card.",
              previewKind: "media",
            },
          ],
        },
      ],
      nodeSections: [
        {
          id: "starter-ramp",
          mode: "color-audit",
          label: "Starter Ramp",
          description: "Template-generated color nodes.",
          nodes: [
            {
              id: "node-1",
              label: "Surface / Base",
              type: "semantic",
              semanticKind: "role",
              previewKind: "color-preview",
            },
          ],
        },
      ],
      statePreview: {
        sampleNodeId: "node-1",
        sampleNodeLabel: "Surface / Base",
        states: ["default", "selected", "highlighted", "dimmed"],
      },
    })

    expect(resource.surface).toBe("node-catalog")
    expect(resource.workspaceKey).toBe("gallery-demo-node-catalog")
    expect(resource.workspaceSections[0]?.items[0]?.label).toBe("Media Asset")
    expect(resource.nodeSections[0]?.nodes[0]?.label).toBe("Surface / Base")
    expect(resource.statePreview.states).toEqual([
      "default",
      "selected",
      "highlighted",
      "dimmed",
    ])
  })
})
