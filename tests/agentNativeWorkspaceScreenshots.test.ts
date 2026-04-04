import { describe, expect, it } from "vitest"

import { buildAgentNativeWorkspaceScreenshotConfig } from "../utils/agentNativeWorkspaceScreenshots"

describe("agent native workspace screenshots", () => {
  it("builds a canvas screenshot config with persisted board state", () => {
    const config = buildAgentNativeWorkspaceScreenshotConfig("canvas", "demo", {
      items: [{ id: "artboard-1" }],
      groups: [],
      nextZIndex: 2,
      selectedIds: ["artboard-1"],
    })

    expect(config).toMatchObject({
      route: "/canvas?project=demo",
      waitForText: "Canvas",
    })
    expect(config?.storageEntries).toEqual([
      {
        key: "gallery-demo-state",
        value: JSON.stringify({
          items: [{ id: "artboard-1" }],
          groups: [],
          nextZIndex: 2,
          selectedIds: ["artboard-1"],
        }),
      },
    ])
  })

  it("builds a system canvas screenshot config with mode, view, and scale config storage", () => {
    const config = buildAgentNativeWorkspaceScreenshotConfig("system-canvas", "demo", {
      rawState: {
        nodes: [{ id: "node-1" }],
      },
      viewMode: "layout",
      scaleConfig: {
        minViewport: 320,
        maxViewport: 1440,
      },
    })

    expect(config).toMatchObject({
      route: "/color-canvas?project=demo",
      waitForText: "System Canvas",
    })
    expect(config?.storageEntries).toEqual(
      expect.arrayContaining([
        {
          key: "gallery-demo-color-canvas-mode",
          value: JSON.stringify("system-canvas"),
        },
        {
          key: "gallery-demo-color-canvas-view",
          value: JSON.stringify("layout"),
        },
        {
          key: "gallery-demo-design-system-scale",
          value: JSON.stringify({
            minViewport: 320,
            maxViewport: 1440,
          }),
        },
      ])
    )
  })

  it("builds a node catalog screenshot config without injected storage", () => {
    const config = buildAgentNativeWorkspaceScreenshotConfig("node-catalog", "demo", null)

    expect(config).toEqual({
      route: "/node-catalog?project=demo",
      waitForText: "Node Catalog",
      storageEntries: [],
    })
  })
})
