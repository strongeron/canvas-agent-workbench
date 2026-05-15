import { describe, expect, it } from "vitest"

import {
  buildPrimitiveChildSource,
  buildPrimitiveSnippet,
  derivePrimitiveWrapperTag,
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
      kind: "tsx",
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
      kind: "tsx",
    })
  })

  it("parses HTML entries with co-located CSS metadata", () => {
    const result = parseCanvasRegistry({
      ui: [
        {
          id: "primitive/card",
          displayName: "Card",
          kind: "html",
          filePath: "components/Card.html",
          cssPath: "components/Card.css",
          componentSlug: "card",
        },
      ],
    })

    expect(result.warnings).toEqual([])
    expect(result.primitives[0]).toMatchObject({
      id: "primitive/card",
      kind: "html",
      filePath: "components/Card.html",
      cssPath: "components/Card.css",
      componentSlug: "card",
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
    kind: "tsx",
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
      kind: "tsx",
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
      kind: "tsx",
    })
    expect(source).toContain("<div>Box</div>")
    expect(source).not.toContain("import")
  })
})

describe("buildPrimitiveChildSource", () => {
  it("returns the raw snippet (a single JSX expression, no module wrapper)", () => {
    expect(
      buildPrimitiveChildSource({
        id: "primitive/button",
        displayName: "Button",
        category: "ui",
        kind: "tsx",
        importName: "Button",
        snippet: '<Button variant="primary">Click me</Button>',
      })
    ).toBe('<Button variant="primary">Click me</Button>')
  })

  it("falls back to a self-closing import-name element when snippet is missing", () => {
    expect(
      buildPrimitiveChildSource({
        id: "primitive/box",
        displayName: "Box",
        category: "ui",
        kind: "tsx",
        importName: "Box",
      })
    ).toBe("<Box />")
  })

  it("falls back to an escaped placeholder div with no metadata", () => {
    expect(
      buildPrimitiveChildSource({
        id: "primitive/thing",
        displayName: "A<B{x}",
        category: "ui",
        kind: "tsx",
      })
    ).toBe("<div>A&lt;B&#123;x&#125;</div>")
  })
})

describe("derivePrimitiveWrapperTag", () => {
  it("prefers a valid importName", () => {
    expect(
      derivePrimitiveWrapperTag({
        id: "primitive/stack",
        displayName: "Stack",
        category: "ui",
        kind: "tsx",
        importName: "Stack",
        snippet: "<Stack><span>x</span></Stack>",
      })
    ).toBe("Stack")
  })

  it("derives the root tag from the snippet when importName is absent", () => {
    expect(
      derivePrimitiveWrapperTag({
        id: "primitive/card",
        displayName: "Card",
        category: "ui",
        kind: "tsx",
        snippet: "  <section className=\"card\">body</section>",
      })
    ).toBe("section")
  })

  it("falls back to div when nothing yields a valid tag", () => {
    expect(
      derivePrimitiveWrapperTag({
        id: "primitive/empty",
        displayName: "Empty",
        category: "ui",
        kind: "tsx",
      })
    ).toBe("div")
  })
})
