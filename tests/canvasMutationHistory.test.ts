import { describe, expect, it } from "vitest"

import type { CanvasHtmlItem, CanvasMarkdownItem } from "../types/canvas"
import {
  applySourceSnapshotToItems,
  inferSourceKindFromFilePath,
  invertCanvasIdMap,
  resolveSourceFileMtime,
  selectionMatchesLoggedFile,
  summarizeSourceMutations,
} from "../utils/canvasMutationHistory"

function makeHtmlItem(overrides: Partial<CanvasHtmlItem> = {}): CanvasHtmlItem {
  return {
    id: overrides.id ?? "item-1",
    type: "html",
    position: { x: 0, y: 0 },
    size: { width: 320, height: 180 },
    rotation: 0,
    zIndex: 1,
    sourceMode: overrides.sourceMode ?? "react",
    sourceReact: overrides.sourceReact ?? "export default function Demo() { return <button>One</button> }",
    sourceReactFilePath: overrides.sourceReactFilePath ?? "components/Demo.tsx",
    sourceReactFileMtime: overrides.sourceReactFileMtime ?? 100,
    sourceHtml: overrides.sourceHtml ?? "<button>One</button>",
    sourceHtmlFilePath: overrides.sourceHtmlFilePath,
    sourceHtmlFileMtime: overrides.sourceHtmlFileMtime,
    ...overrides,
  }
}

function makeMarkdownItem(overrides: Partial<CanvasMarkdownItem> = {}): CanvasMarkdownItem {
  return {
    id: overrides.id ?? "md-1",
    type: "markdown",
    source: overrides.source ?? "# One\n\nTwo\n",
    title: overrides.title ?? "Doc",
    sourcePath: overrides.sourcePath ?? "docs/demo.md",
    sourceFileMtime: overrides.sourceFileMtime ?? 150,
    position: { x: 0, y: 0 },
    size: { width: 420, height: 280 },
    rotation: 0,
    zIndex: 1,
    ...overrides,
  }
}

describe("canvasMutationHistory", () => {
  it("summarizes structural mutations for toast copy", () => {
    expect(summarizeSourceMutations([{ type: "wrapSelection", wrapperTag: "section" }])).toBe("wrap node")
    expect(
      summarizeSourceMutations([
        { type: "setTextChild", value: "A" },
        { type: "setClassName", value: "b" },
      ])
    ).toBe("text edit (+1)")
    expect(summarizeSourceMutations([{ type: "updateMarkdownBlock", blockIndex: 0, newText: "Hi" }])).toBe(
      "markdown edit"
    )
  })

  it("infers source kind from file extension", () => {
    expect(inferSourceKindFromFilePath("components/Card.html")).toBe("html")
    expect(inferSourceKindFromFilePath("docs/demo.md")).toBe("markdown")
    expect(inferSourceKindFromFilePath("components/Card.tsx")).toBe("tsx")
  })

  it("resolves source file mtimes for file-backed items", () => {
    const items = [
      makeHtmlItem({ id: "react", sourceReactFilePath: "components/Demo.tsx", sourceReactFileMtime: 123 }),
      makeHtmlItem({
        id: "html",
        sourceMode: "inline",
        sourceHtmlFilePath: "components/Card.html",
        sourceHtmlFileMtime: 456,
      }),
      makeMarkdownItem({ id: "markdown", sourcePath: "docs/demo.md", sourceFileMtime: 789 }),
    ]

    expect(resolveSourceFileMtime(items, "components/Demo.tsx", "tsx")).toBe(123)
    expect(resolveSourceFileMtime(items, "components/Card.html", "html")).toBe(456)
    expect(resolveSourceFileMtime(items, "docs/demo.md", "markdown")).toBe(789)
  })

  it("applies snapshot rewrites to matching source-backed items", () => {
    const items = [
      makeHtmlItem({ id: "react", sourceReact: "before", sourceReactFilePath: "components/Demo.tsx" }),
      makeHtmlItem({
        id: "html",
        sourceMode: "inline",
        sourceHtml: "<p>before</p>",
        sourceHtmlFilePath: "components/Card.html",
      }),
      makeMarkdownItem({ id: "markdown", source: "# Before\n", sourcePath: "docs/demo.md" }),
    ]

    const reactResult = applySourceSnapshotToItems(items, "components/Demo.tsx", "tsx", "after", 200)
    expect(reactResult.changed).toBe(true)
    expect(reactResult.items[0]?.type).toBe("html")
    if (reactResult.items[0]?.type !== "html") return
    expect(reactResult.items[0].sourceReact).toBe("after")
    expect(reactResult.items[0].sourceReactFileMtime).toBe(200)

    const htmlResult = applySourceSnapshotToItems(items, "components/Card.html", "html", "<p>after</p>", 300)
    expect(htmlResult.changed).toBe(true)
    expect(htmlResult.items[1]?.type).toBe("html")
    if (htmlResult.items[1]?.type !== "html") return
    expect(htmlResult.items[1].sourceHtml).toBe("<p>after</p>")
    expect(htmlResult.items[1].sourceHtmlFileMtime).toBe(300)

    const markdownResult = applySourceSnapshotToItems(items, "docs/demo.md", "markdown", "# After\n", 400)
    expect(markdownResult.changed).toBe(true)
    expect(markdownResult.items[2]?.type).toBe("markdown")
    if (markdownResult.items[2]?.type !== "markdown") return
    expect(markdownResult.items[2].source).toBe("# After\n")
    expect(markdownResult.items[2].sourceFileMtime).toBe(400)
  })

  it("inverts canvasIdMap and matches selections to file-backed items", () => {
    expect(invertCanvasIdMap({ "old:1": "new:1", "old:2": null })).toEqual({ "new:1": "old:1" })

    const items = [
      makeHtmlItem({ id: "react", sourceReactFilePath: "components/Demo.tsx" }),
      makeHtmlItem({
        id: "html",
        sourceMode: "inline",
        sourceHtmlFilePath: "components/Card.html",
        sourceReactFilePath: undefined,
      }),
      makeMarkdownItem({ id: "markdown", sourcePath: "docs/demo.md" }),
    ]

    expect(selectionMatchesLoggedFile({ itemId: "react" }, items, "components/Demo.tsx", "tsx")).toBe(true)
    expect(selectionMatchesLoggedFile({ itemId: "html" }, items, "components/Demo.tsx", "tsx")).toBe(false)
    expect(selectionMatchesLoggedFile({ itemId: "html" }, items, "components/Card.html", "html")).toBe(true)
    expect(selectionMatchesLoggedFile({ itemId: "markdown" }, items, "docs/demo.md", "markdown")).toBe(true)
  })
})
