// Block-level markdown writer for v3 U6.
//
// Markdown source is parsed with remark-parse into an mdast tree. Top-level
// mdast nodes ARE the "blocks" the user sees and edits (heading, paragraph,
// list, blockquote, code block, thematic break, etc.). The writer exposes:
//
//   - listMarkdownBlocks(source) → block metadata for the panel/overlay
//   - updateMarkdownBlock(source, index, newText) → replace a block with a
//     re-parse of `newText` (keeps inline formatting like **bold**/_em_ intact)
//   - insertMarkdownBlock(source, index, newText) → splice a new block in at
//     index (index === block count appends)
//   - removeMarkdownBlock(source, index) → splice the block out
//   - reorderMarkdownBlocks(source, fromIndex, toIndex) → drag-to-reorder
//
// Round-trip strategy: parse → mutate → remark-stringify. Stringify may
// normalize whitespace and some syntactic choices (the writer is honest
// about this — tests assert structural equivalence, not byte-identity).
//
// This is the pure module slice (U6 slice 1). The endpoint, the bridge
// integration (canvas/edit-start / canvas/edit-commit from U13), and the
// CanvasMarkdownItem inline-edit UI land in follow-up slices.

import { unified } from "unified"
import remarkParse from "remark-parse"
import remarkStringify from "remark-stringify"
import type { Root, RootContent } from "mdast"

export type MarkdownWriteResult =
  | { ok: true; source: string }
  | { ok: false; error: string; code: "bad-input" | "out-of-range" | "parse-error" }

export interface MarkdownBlockInfo {
  /** Zero-based index across top-level mdast nodes. */
  index: number
  /** mdast node type — "heading", "paragraph", "list", "blockquote", "code", etc. */
  type: RootContent["type"]
  /** Re-stringified source of just this block. Useful for previews. */
  source: string
}

export function listMarkdownBlocks(markdownSource: string): MarkdownBlockInfo[] {
  const tree = parseMarkdown(markdownSource)
  return tree.children.map((node, index) => ({
    index,
    type: node.type,
    source: stringifyBlock(node).trimEnd(),
  }))
}

export function updateMarkdownBlock(
  markdownSource: string,
  blockIndex: number,
  newText: string
): MarkdownWriteResult {
  if (!Number.isInteger(blockIndex) || blockIndex < 0) {
    return { ok: false, code: "bad-input", error: "blockIndex must be a non-negative integer" }
  }
  if (typeof newText !== "string") {
    return { ok: false, code: "bad-input", error: "newText must be a string" }
  }

  const tree = parseMarkdown(markdownSource)
  if (blockIndex >= tree.children.length) {
    return { ok: false, code: "out-of-range", error: "blockIndex exceeds the number of top-level blocks" }
  }

  // Re-parse newText so the replacement can itself be a multi-block
  // expression. If newText parses to multiple top-level nodes, splice the
  // whole sequence in (useful when a paragraph edit promotes to a heading
  // by typing `# Title`).
  const incoming = parseMarkdown(newText)
  if (incoming.children.length === 0) {
    // Empty replacement collapses to a remove.
    tree.children.splice(blockIndex, 1)
  } else {
    tree.children.splice(blockIndex, 1, ...incoming.children)
  }

  return { ok: true, source: stringifyMarkdown(tree) }
}

export function insertMarkdownBlock(
  markdownSource: string,
  blockIndex: number,
  newText: string
): MarkdownWriteResult {
  if (!Number.isInteger(blockIndex) || blockIndex < 0) {
    return { ok: false, code: "bad-input", error: "blockIndex must be a non-negative integer" }
  }
  if (typeof newText !== "string" || !newText.trim()) {
    return { ok: false, code: "bad-input", error: "newText must be a non-empty string" }
  }

  const tree = parseMarkdown(markdownSource)
  // blockIndex === children.length is a valid append; only beyond that is
  // out of range.
  if (blockIndex > tree.children.length) {
    return { ok: false, code: "out-of-range", error: "blockIndex exceeds the number of top-level blocks" }
  }

  const incoming = parseMarkdown(newText)
  if (incoming.children.length === 0) {
    return { ok: false, code: "bad-input", error: "newText did not parse to any markdown blocks" }
  }
  tree.children.splice(blockIndex, 0, ...incoming.children)

  return { ok: true, source: stringifyMarkdown(tree) }
}

export function removeMarkdownBlock(
  markdownSource: string,
  blockIndex: number
): MarkdownWriteResult {
  if (!Number.isInteger(blockIndex) || blockIndex < 0) {
    return { ok: false, code: "bad-input", error: "blockIndex must be a non-negative integer" }
  }
  const tree = parseMarkdown(markdownSource)
  if (blockIndex >= tree.children.length) {
    return { ok: false, code: "out-of-range", error: "blockIndex exceeds the number of top-level blocks" }
  }
  tree.children.splice(blockIndex, 1)
  return { ok: true, source: stringifyMarkdown(tree) }
}

export function reorderMarkdownBlocks(
  markdownSource: string,
  fromIndex: number,
  toIndex: number
): MarkdownWriteResult {
  if (!Number.isInteger(fromIndex) || fromIndex < 0) {
    return { ok: false, code: "bad-input", error: "fromIndex must be a non-negative integer" }
  }
  if (!Number.isInteger(toIndex) || toIndex < 0) {
    return { ok: false, code: "bad-input", error: "toIndex must be a non-negative integer" }
  }
  const tree = parseMarkdown(markdownSource)
  if (fromIndex >= tree.children.length || toIndex >= tree.children.length) {
    return { ok: false, code: "out-of-range", error: "fromIndex or toIndex exceeds block count" }
  }
  if (fromIndex === toIndex) {
    return { ok: true, source: markdownSource }
  }
  const [moved] = tree.children.splice(fromIndex, 1)
  tree.children.splice(toIndex, 0, moved)
  return { ok: true, source: stringifyMarkdown(tree) }
}

const parser = unified().use(remarkParse)
const stringifier = unified().use(remarkStringify, {
  bullet: "-",
  emphasis: "_",
  strong: "*",
  fences: true,
  rule: "-",
})

function parseMarkdown(source: string): Root {
  return parser.parse(source) as Root
}

function stringifyMarkdown(tree: Root): string {
  return stringifier.stringify(tree)
}

function stringifyBlock(node: RootContent): string {
  return stringifier.stringify({ type: "root", children: [node] } as Root)
}
