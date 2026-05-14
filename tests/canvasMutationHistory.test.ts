import { describe, expect, it } from "vitest"

import type { CanvasHtmlItem } from "../types/canvas"
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

describe("canvasMutationHistory", () => {
  it("summarizes structural mutations for toast copy", () => {
    expect(summarizeSourceMutations([{ type: "wrapSelection", wrapperTag: "section" }])).toBe("wrap node")
    expect(
      summarizeSourceMutations([
        { type: "setTextChild", value: "A" },
        { type: "setClassName", value: "b" },
      ])
    ).toBe("text edit (+1)")
  })

  it("infers source kind from file extension", () => {
    expect(inferSourceKindFromFilePath("components/Card.html")).toBe("html")
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
    ]

    expect(resolveSourceFileMtime(items, "components/Demo.tsx", "tsx")).toBe(123)
    expect(resolveSourceFileMtime(items, "components/Card.html", "html")).toBe(456)
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
    ]

    const reactResult = applySourceSnapshotToItems(items, "components/Demo.tsx", "tsx", "after", 200)
    expect(reactResult.changed).toBe(true)
    expect(reactResult.items[0]?.sourceReact).toBe("after")
    expect(reactResult.items[0]?.sourceReactFileMtime).toBe(200)

    const htmlResult = applySourceSnapshotToItems(items, "components/Card.html", "html", "<p>after</p>", 300)
    expect(htmlResult.changed).toBe(true)
    expect(htmlResult.items[1]?.sourceHtml).toBe("<p>after</p>")
    expect(htmlResult.items[1]?.sourceHtmlFileMtime).toBe(300)
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
    ]

    expect(selectionMatchesLoggedFile({ itemId: "react" }, items, "components/Demo.tsx", "tsx")).toBe(true)
    expect(selectionMatchesLoggedFile({ itemId: "html" }, items, "components/Demo.tsx", "tsx")).toBe(false)
    expect(selectionMatchesLoggedFile({ itemId: "html" }, items, "components/Card.html", "html")).toBe(true)
  })
})
