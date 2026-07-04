import { describe, expect, it } from "vitest"

import { buildCanvasAgentSelectionContext } from "../utils/canvasAgentSelectionContext"
import type { CanvasItem } from "../types/canvas"

const BASE = { rotation: 0, zIndex: 1, position: { x: 10, y: 20 }, size: { width: 300, height: 200 } }

// One item of every CanvasItem type — keep in sync with the union in
// types/canvas.ts (describeDetail also has a compile-time never check).
const ALL_TYPES = [
  {
    ...BASE,
    id: "component-1",
    type: "component",
    componentId: "button",
    variantIndex: 2,
    customProps: { label: "Buy" },
  },
  {
    ...BASE,
    id: "embed-1",
    type: "embed",
    url: "https://example.com",
    embedPreviewMode: "iframe",
    embedFrameStatus: "embeddable",
  },
  {
    ...BASE,
    id: "html-1",
    type: "html",
    title: "Card",
    sourceMode: "react",
    sourceReactFilePath: "projects/demo/components/Card.tsx",
    sourceComponentSlug: "card",
  },
  {
    ...BASE,
    id: "media-1",
    type: "media",
    src: "/assets/hero.png",
    mediaKind: "image",
    sourceUrl: "https://example.com/page",
  },
  {
    ...BASE,
    id: "mermaid-1",
    type: "mermaid",
    source: "graph TD\n  A --> B",
    mermaidTheme: "dark",
  },
  {
    ...BASE,
    id: "excalidraw-1",
    type: "excalidraw",
    scene: { elements: [{}, {}, {}] },
    sourceMermaid: "graph LR\n  X --> Y",
  },
  {
    ...BASE,
    id: "markdown-1",
    type: "markdown",
    title: "Notes",
    source: "# Title\n\nFirst paragraph.\n\nSecond paragraph.",
    sourcePath: "projects/demo/content/notes.md",
  },
  {
    ...BASE,
    id: "mcp-app-1",
    type: "mcp-app",
    appName: "oklch-palette",
    transport: { kind: "stdio", command: "node" },
    status: "connected",
    toolsCache: [{ name: "a" }, { name: "b" }],
  },
  {
    ...BASE,
    id: "artboard-1",
    type: "artboard",
    name: "Hero board",
    themeId: "midnight",
    layout: { display: "flex", direction: "column", gap: 24, padding: 32 },
  },
  {
    ...BASE,
    id: "section-1",
    type: "section",
    name: "Hero section",
    parentId: "artboard-1",
    order: 0,
    layout: { display: "grid", columns: 2, gap: 16 },
  },
] as unknown as CanvasItem[]

describe("buildCanvasAgentSelectionContext", () => {
  it("provides type-specific context for every supported item type", () => {
    const block = buildCanvasAgentSelectionContext({
      projectId: "demo",
      canvasPath: "agent-demo.canvas",
      items: ALL_TYPES,
      selectedIds: ALL_TYPES.map((item) => item.id),
    })

    expect(block).toContain(`selected items (${ALL_TYPES.length}):`)
    // component
    expect(block).toContain("component: button, variant 2, custom props: label")
    // embed
    expect(block).toContain("url: https://example.com, preview: iframe, frame: embeddable")
    // html
    expect(block).toContain(
      "mode: react, react file: projects/demo/components/Card.tsx, component: card"
    )
    // media
    expect(block).toContain("image: /assets/hero.png (from https://example.com/page)")
    // mermaid
    expect(block).toContain("mermaid (dark): graph TD")
    // excalidraw
    expect(block).toContain("3 scene elements, from mermaid: graph LR")
    // markdown
    expect(block).toContain("3 blocks, file: projects/demo/content/notes.md, starts: # Title")
    // mcp-app
    expect(block).toContain("app: oklch-palette, status: connected, 2 tools")
    // artboard with child listing + theme
    expect(block).toContain("layout: flex, column, gap 24, padding 32, theme: midnight, 1 child (section-1)")
    // section with grid layout + parent/order on the base line
    expect(block).toContain('- section-1 — section "Hero section"')
    expect(block).toContain("(parent: artboard-1, order 0)")
    expect(block).toContain("layout: grid, 2 cols, gap 16, 0 children")
  })

  it("filters to the selection and keeps base facts", () => {
    const block = buildCanvasAgentSelectionContext({
      projectId: "demo",
      canvasPath: "agent-demo.canvas",
      items: ALL_TYPES,
      selectedIds: ["markdown-1"],
    })

    expect(block).toContain("selected items (1):")
    expect(block).toContain('- markdown-1 — markdown "Notes" @ (10,20) 300x200')
    expect(block).not.toContain("component-1")
    expect(block).toContain("get_canvas_state")
  })

  it("returns null for an empty selection and falls back for unsaved boards", () => {
    expect(
      buildCanvasAgentSelectionContext({
        projectId: "demo",
        canvasPath: "agent-demo.canvas",
        items: ALL_TYPES,
        selectedIds: [],
      })
    ).toBeNull()

    const block = buildCanvasAgentSelectionContext({
      projectId: null,
      canvasPath: null,
      items: ALL_TYPES,
      selectedIds: ["media-1"],
    })
    expect(block).toContain("project: unknown")
    expect(block).toContain("canvas: (unsaved board)")
  })
})
