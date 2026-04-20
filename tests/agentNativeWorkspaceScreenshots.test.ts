import { PNG } from "pngjs"
import { describe, expect, it } from "vitest"

import {
  buildAgentNativeWorkspaceScreenshotConfig,
  buildFocusedCanvasScreenshotSnapshot,
  cropAgentNativeWorkspaceScreenshotPng,
  normalizeAgentNativeWorkspaceScreenshotCropRect,
} from "../utils/agentNativeWorkspaceScreenshots"

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

  it("writes raw canvas state and viewport override when given a canvas resource envelope", () => {
    const config = buildAgentNativeWorkspaceScreenshotConfig("canvas", "demo", {
      surface: "canvas",
      state: {
        items: [{ id: "item-1" }],
        groups: [],
        nextZIndex: 2,
        selectedIds: [],
      },
      view: {
        transform: {
          scale: 1.5,
          offset: { x: -120, y: 48 },
        },
      },
    })

    expect(config?.storageEntries).toEqual([
      {
        key: "gallery-demo-state",
        value: JSON.stringify({
          items: [{ id: "item-1" }],
          groups: [],
          nextZIndex: 2,
          selectedIds: [],
        }),
      },
      {
        key: "gallery-demo-viewport-override",
        value: JSON.stringify({
          scale: 1.5,
          offset: { x: -120, y: 48 },
        }),
      },
    ])
  })

  it("adds a focused viewport transform for canvas screenshots", () => {
    const snapshot = buildFocusedCanvasScreenshotSnapshot(
      {
        surface: "canvas",
        state: {
          items: [
            {
              id: "item-1",
              position: { x: 120, y: 160 },
              size: { width: 480, height: 320 },
            },
          ],
          groups: [],
          nextZIndex: 2,
          selectedIds: [],
        },
      },
      ["item-1"],
      88,
      "desktop"
    ) as { view?: { transform?: { scale: number; offset: { x: number; y: number } } } }

    expect(snapshot.view?.transform?.scale).toBeGreaterThan(0.1)
    expect(snapshot.view?.transform?.offset.x).toBeTypeOf("number")
    expect(snapshot.view?.transform?.offset.y).toBeTypeOf("number")
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

  it("normalizes screenshot crop rects to the visible viewport", () => {
    expect(
      normalizeAgentNativeWorkspaceScreenshotCropRect(
        { x: -24, y: 16, width: 180, height: 120 },
        { width: 320, height: 200 }
      )
    ).toEqual({
      x: 0,
      y: 16,
      width: 180,
      height: 120,
    })

    expect(
      normalizeAgentNativeWorkspaceScreenshotCropRect(
        { x: 280, y: 170, width: 120, height: 80 },
        { width: 320, height: 200 }
      )
    ).toEqual({
      x: 280,
      y: 170,
      width: 40,
      height: 30,
    })
  })

  it("crops screenshot PNG buffers using viewport-space bounds", () => {
    const source = new PNG({ width: 4, height: 4 })
    for (let y = 0; y < source.height; y += 1) {
      for (let x = 0; x < source.width; x += 1) {
        const index = (source.width * y + x) << 2
        source.data[index] = x * 60
        source.data[index + 1] = y * 60
        source.data[index + 2] = 120
        source.data[index + 3] = 255
      }
    }

    const cropped = cropAgentNativeWorkspaceScreenshotPng(
      PNG.sync.write(source),
      { x: 1, y: 1, width: 2, height: 2 },
      1
    )
    const png = PNG.sync.read(cropped)

    expect(png.width).toBe(2)
    expect(png.height).toBe(2)
    expect(Array.from(png.data.slice(0, 4))).toEqual([60, 60, 120, 255])
    expect(Array.from(png.data.slice(4, 8))).toEqual([120, 60, 120, 255])
    expect(Array.from(png.data.slice(8, 12))).toEqual([60, 120, 120, 255])
    expect(Array.from(png.data.slice(12, 16))).toEqual([120, 120, 120, 255])
  })
})
