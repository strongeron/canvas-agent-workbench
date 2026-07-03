import { describe, expect, it } from "vitest"

import {
  insertMarkdownBlock,
  listMarkdownBlocks,
  removeMarkdownBlock,
  reorderMarkdownBlocks,
  updateMarkdownBlock,
} from "../utils/canvasMarkdownWriter"

const fixture = `# Title

A short paragraph with **bold** and _emphasis_.

- one
- two
- three

> a quote

\`\`\`ts
const x = 1
\`\`\`
`

describe("listMarkdownBlocks", () => {
  it("returns one entry per top-level mdast node", () => {
    const blocks = listMarkdownBlocks(fixture)
    expect(blocks.map((b) => b.type)).toEqual([
      "heading",
      "paragraph",
      "list",
      "blockquote",
      "code",
    ])
    expect(blocks.map((b) => b.index)).toEqual([0, 1, 2, 3, 4])
  })

  it("re-stringifies each block to a self-contained snippet", () => {
    const blocks = listMarkdownBlocks(fixture)
    expect(blocks[0].source).toBe("# Title")
    expect(blocks[1].source).toContain("**bold**")
    expect(blocks[2].source).toContain("- one")
  })
})

describe("updateMarkdownBlock", () => {
  it("replaces a paragraph's text", () => {
    const result = updateMarkdownBlock(fixture, 1, "A different paragraph here.")
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.source).toContain("A different paragraph here.")
    expect(result.source).not.toContain("A short paragraph")
    // Other blocks survive structurally.
    expect(result.source).toContain("# Title")
    expect(result.source).toContain("> a quote")
  })

  it("promotes a paragraph to a heading by re-parsing the new text", () => {
    const result = updateMarkdownBlock(fixture, 1, "## Subtitle\n\nA followup paragraph.")
    expect(result.ok).toBe(true)
    if (!result.ok) return
    // The single paragraph block became two blocks (heading + paragraph).
    const blocks = listMarkdownBlocks(result.source)
    expect(blocks.map((b) => b.type)).toEqual([
      "heading", // original
      "heading", // promoted
      "paragraph",
      "list",
      "blockquote",
      "code",
    ])
  })

  it("collapses to a remove when newText is empty", () => {
    const result = updateMarkdownBlock(fixture, 1, "")
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const blocks = listMarkdownBlocks(result.source)
    expect(blocks.map((b) => b.type)).toEqual([
      "heading",
      "list",
      "blockquote",
      "code",
    ])
  })

  it("rejects out-of-range blockIndex", () => {
    const result = updateMarkdownBlock(fixture, 99, "anything")
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("out-of-range")
  })

  it("rejects negative blockIndex", () => {
    const result = updateMarkdownBlock(fixture, -1, "anything")
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("bad-input")
  })
})

describe("insertMarkdownBlock", () => {
  it("splices a new block in at the index and shifts the rest down", () => {
    const result = insertMarkdownBlock(fixture, 1, "New paragraph.")
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const blocks = listMarkdownBlocks(result.source)
    expect(blocks.map((b) => b.type)).toEqual([
      "heading",
      "paragraph",
      "paragraph",
      "list",
      "blockquote",
      "code",
    ])
    expect(blocks[1]?.source).toBe("New paragraph.")
  })

  it("appends when blockIndex equals the block count", () => {
    const count = listMarkdownBlocks(fixture).length
    const result = insertMarkdownBlock(fixture, count, "## Outro")
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const blocks = listMarkdownBlocks(result.source)
    expect(blocks[blocks.length - 1]?.type).toBe("heading")
  })

  it("splices multi-block newText in as a sequence", () => {
    const result = insertMarkdownBlock(fixture, 0, "## Intro\n\nLead-in text.")
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const blocks = listMarkdownBlocks(result.source)
    expect(blocks.slice(0, 2).map((b) => b.type)).toEqual(["heading", "paragraph"])
  })

  it("rejects blockIndex beyond the block count", () => {
    const count = listMarkdownBlocks(fixture).length
    const result = insertMarkdownBlock(fixture, count + 1, "Too far.")
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("out-of-range")
  })

  it("rejects empty newText", () => {
    const result = insertMarkdownBlock(fixture, 0, "   ")
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("bad-input")
  })
})

describe("removeMarkdownBlock", () => {
  it("removes the targeted block and keeps the others in order", () => {
    const result = removeMarkdownBlock(fixture, 2)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const blocks = listMarkdownBlocks(result.source)
    expect(blocks.map((b) => b.type)).toEqual([
      "heading",
      "paragraph",
      "blockquote",
      "code",
    ])
  })

  it("rejects out-of-range index", () => {
    const result = removeMarkdownBlock(fixture, 99)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("out-of-range")
  })
})

describe("reorderMarkdownBlocks", () => {
  it("moves a block from one index to another", () => {
    const result = reorderMarkdownBlocks(fixture, 0, 2)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const blocks = listMarkdownBlocks(result.source)
    // heading moves to position 2; paragraph + list shift left by one each.
    expect(blocks.map((b) => b.type)).toEqual([
      "paragraph",
      "list",
      "heading",
      "blockquote",
      "code",
    ])
  })

  it("is a no-op when fromIndex === toIndex", () => {
    const result = reorderMarkdownBlocks(fixture, 1, 1)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.source).toBe(fixture)
  })

  it("rejects out-of-range fromIndex or toIndex", () => {
    expect(reorderMarkdownBlocks(fixture, 99, 0).ok).toBe(false)
    expect(reorderMarkdownBlocks(fixture, 0, 99).ok).toBe(false)
  })
})
