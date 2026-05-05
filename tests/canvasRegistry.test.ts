import { describe, expect, it } from "vitest"

import {
  buildPrimitiveSnippet,
  parseCanvasRegistry,
  type CanvasRegistryPrimitive,
} from "../utils/canvasRegistry"

describe("parseCanvasRegistry", () => {
  it("parses string entries with derived display names", () => {
    const result = parseCanvasRegistry({
      ui: ["primitive/button"],
      page: [],
    })
    expect(result.warnings).toEqual([])
    expect(result.primitives).toHaveLength(1)
    expect(result.primitives[0]).toMatchObject({
      id: "primitive/button",
      displayName: "Button",
      category: "ui",
    })
  })

  it("parses object entries with metadata", () => {
    const result = parseCanvasRegistry({
      ui: [
        {
          id: "primitive/button",
          displayName: "Button",
          filePath: "components/ui/Button.tsx",
          importName: "Button",
          snippet: "<Button />",
          description: "Action button",
        },
      ],
    })
    expect(result.warnings).toEqual([])
    expect(result.primitives[0]).toMatchObject({
      id: "primitive/button",
      displayName: "Button",
      filePath: "components/ui/Button.tsx",
      importName: "Button",
      snippet: "<Button />",
      description: "Action button",
    })
  })

  it("supports a mix of string and object entries", () => {
    const result = parseCanvasRegistry({
      ui: ["primitive/box", { id: "primitive/button", displayName: "Button" }],
    })
    expect(result.primitives.map((p) => p.id)).toEqual([
      "primitive/box",
      "primitive/button",
    ])
  })

  it("warns when entries are missing an id", () => {
    const result = parseCanvasRegistry({ ui: [{ displayName: "Nameless" }] })
    expect(result.primitives).toHaveLength(0)
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it("warns when category is not an array", () => {
    const result = parseCanvasRegistry({ ui: "not-an-array" })
    expect(result.primitives).toHaveLength(0)
    expect(result.warnings).toContain('"ui" entry is not an array.')
  })

  it("returns an empty result for non-objects", () => {
    expect(parseCanvasRegistry(null).primitives).toHaveLength(0)
    expect(parseCanvasRegistry("nope").primitives).toHaveLength(0)
  })
})

describe("buildPrimitiveSnippet", () => {
  const button: CanvasRegistryPrimitive = {
    id: "primitive/button",
    displayName: "Button",
    category: "ui",
    filePath: "components/ui/Button.tsx",
    importName: "Button",
    snippet: "<Button>Click me</Button>",
  }

  it("wraps a snippet with import + default-export Preview", () => {
    const source = buildPrimitiveSnippet(button)
    expect(source).toContain("import { Button }")
    expect(source).toContain("../../projects/design-system-foundation/components/ui/Button")
    expect(source).toContain("export default function Preview()")
    expect(source).toContain("<Button>Click me</Button>")
  })

  it("falls back to a self-closing tag when snippet is missing", () => {
    const source = buildPrimitiveSnippet({
      id: "primitive/button",
      displayName: "Button",
      category: "ui",
      filePath: "components/ui/Button.tsx",
      importName: "Button",
    })
    expect(source).toContain("<Button />")
  })

  it("falls back to a placeholder for entries with no metadata", () => {
    const source = buildPrimitiveSnippet({
      id: "primitive/box",
      displayName: "Box",
      category: "ui",
    })
    expect(source).toContain("<div>Box</div>")
    expect(source).not.toContain("import")
  })
})
