import type { CanvasHtmlItem, CanvasMarkdownItem } from "../types/canvas"
import type { CanvasAstMutation } from "./canvasAstWriter"
import type { CanvasHtmlMutation } from "./canvasHtmlEditor"
import type { CanvasMarkdownMutation } from "./canvasMarkdownWriteClient"

export type CanvasSourceMutation = CanvasAstMutation | CanvasHtmlMutation | CanvasMarkdownMutation
type CanvasSourceBackedItem = CanvasHtmlItem | CanvasMarkdownItem
export type CanvasSourceKind = "tsx" | "html" | "markdown"

export function summarizeSourceMutations(mutations: ReadonlyArray<CanvasSourceMutation>): string {
  const first = mutations[0]
  if (!first) return "source edit"
  const label =
    first.type === "setTextChild" || first.type === "setTextContent"
      ? "text edit"
      : first.type === "setClassName"
        ? "class edit"
        : first.type === "setAttribute" || first.type === "setPropValue"
          ? "property edit"
          : first.type === "insertChild"
            ? "insert child"
            : first.type === "removeNode"
              ? "delete node"
              : first.type === "reorderSibling"
                ? "reorder node"
                : first.type === "wrapSelection"
                  ? "wrap node"
                  : first.type === "unwrap"
                    ? "unwrap node"
                    : first.type === "swapTag"
                      ? "swap tag"
                      : first.type === "updateMarkdownBlock"
                        ? "markdown edit"
                        : "reorder block"
  return mutations.length > 1 ? `${label} (+${mutations.length - 1})` : label
}

export function inferSourceKindFromFilePath(filePath: string): CanvasSourceKind {
  const lower = filePath.toLowerCase()
  if (lower.endsWith(".html")) return "html"
  if (lower.endsWith(".md")) return "markdown"
  return "tsx"
}

export function resolveSourceFileMtime(
  items: CanvasSourceBackedItem[],
  filePath: string,
  kind: CanvasSourceKind
): number | undefined {
  const match = items.find((item) => {
    if (kind === "html") return item.type === "html" && item.sourceHtmlFilePath === filePath
    if (kind === "markdown") return item.type === "markdown" && item.sourcePath === filePath
    return item.type === "html" && item.sourceReactFilePath === filePath
  })
  if (!match) return undefined
  if (kind === "html" && match.type === "html") return match.sourceHtmlFileMtime
  if (kind === "markdown" && match.type === "markdown") return match.sourceFileMtime
  return match.type === "html" ? match.sourceReactFileMtime : undefined
}

export function applySourceSnapshotToItems(
  items: CanvasSourceBackedItem[],
  filePath: string,
  kind: CanvasSourceKind,
  source: string,
  mtimeMs?: number
): { items: CanvasSourceBackedItem[]; changed: boolean } {
  let changed = false
  const nextItems = items.map((item) => {
    if (kind === "html") {
      if (item.type !== "html" || item.sourceHtmlFilePath !== filePath) return item
      changed = true
      return {
        ...item,
        sourceMode: "inline" as const,
        sourceHtml: source,
        ...(typeof mtimeMs === "number" ? { sourceHtmlFileMtime: mtimeMs } : {}),
      }
    }
    if (kind === "markdown") {
      if (item.type !== "markdown" || item.sourcePath !== filePath) return item
      changed = true
      return {
        ...item,
        source,
        ...(typeof mtimeMs === "number" ? { sourceFileMtime: mtimeMs } : {}),
      }
    }
    if (item.type !== "html" || item.sourceReactFilePath !== filePath) return item
    changed = true
    return {
      ...item,
      sourceMode: "react" as const,
      sourceReact: source,
      ...(typeof mtimeMs === "number" ? { sourceReactFileMtime: mtimeMs } : {}),
    }
  })
  return { items: nextItems, changed }
}

export function invertCanvasIdMap(canvasIdMap: Record<string, string | null>): Record<string, string | null> {
  const inverted: Record<string, string | null> = {}
  for (const [from, to] of Object.entries(canvasIdMap)) {
    if (to !== null) inverted[to] = from
  }
  return inverted
}

export function selectionMatchesLoggedFile(
  selection: { itemId: string },
  items: CanvasSourceBackedItem[],
  filePath: string,
  kind: CanvasSourceKind
): boolean {
  const item = items.find((candidate) => candidate.id === selection.itemId)
  if (!item) return false
  if (kind === "html") return item.type === "html" && item.sourceHtmlFilePath === filePath
  if (kind === "markdown") return item.type === "markdown" && item.sourcePath === filePath
  return item.type === "html" && item.sourceReactFilePath === filePath
}
