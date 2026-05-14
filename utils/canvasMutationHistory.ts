import type { CanvasHtmlItem } from "../types/canvas"
import type { CanvasAstMutation } from "./canvasAstWriter"
import type { CanvasHtmlMutation } from "./canvasHtmlEditor"

export type CanvasSourceMutation = CanvasAstMutation | CanvasHtmlMutation

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
                    : "swap tag"
  return mutations.length > 1 ? `${label} (+${mutations.length - 1})` : label
}

export function inferSourceKindFromFilePath(filePath: string): "tsx" | "html" {
  return filePath.toLowerCase().endsWith(".html") ? "html" : "tsx"
}

export function resolveSourceFileMtime(
  items: CanvasHtmlItem[],
  filePath: string,
  kind: "tsx" | "html"
): number | undefined {
  const match = items.find((item) =>
    kind === "html" ? item.sourceHtmlFilePath === filePath : item.sourceReactFilePath === filePath
  )
  return kind === "html" ? match?.sourceHtmlFileMtime : match?.sourceReactFileMtime
}

export function applySourceSnapshotToItems(
  items: CanvasHtmlItem[],
  filePath: string,
  kind: "tsx" | "html",
  source: string,
  mtimeMs?: number
): { items: CanvasHtmlItem[]; changed: boolean } {
  let changed = false
  const nextItems = items.map((item) => {
    if (kind === "html") {
      if (item.sourceHtmlFilePath !== filePath) return item
      changed = true
      return {
        ...item,
        sourceMode: "inline" as const,
        sourceHtml: source,
        ...(typeof mtimeMs === "number" ? { sourceHtmlFileMtime: mtimeMs } : {}),
      }
    }
    if (item.sourceReactFilePath !== filePath) return item
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
  items: CanvasHtmlItem[],
  filePath: string,
  kind: "tsx" | "html"
): boolean {
  const item = items.find((candidate) => candidate.id === selection.itemId)
  if (!item) return false
  return kind === "html" ? item.sourceHtmlFilePath === filePath : item.sourceReactFilePath === filePath
}
