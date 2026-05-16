export interface MermaidNodeLabel {
  id: string
  label: string
}

const NODE_LABEL_PATTERN = /\b([A-Za-z][\w-]*)\s*([[({])([^[\]{}()]+?)([\])}])/g

export function listMermaidNodeLabels(source: string): MermaidNodeLabel[] {
  const labels: MermaidNodeLabel[] = []
  const seen = new Set<string>()

  for (const match of source.matchAll(NODE_LABEL_PATTERN)) {
    const id = match[1]
    const label = match[3]?.trim()
    if (!id || !label || seen.has(id)) continue
    seen.add(id)
    labels.push({ id, label })
  }

  return labels
}

export function updateMermaidNodeLabel(source: string, nodeId: string, nextLabel: string): string {
  const trimmedLabel = nextLabel.trim()
  if (!trimmedLabel) return source

  const pattern = new RegExp(
    `\\b(${escapeRegExp(nodeId)})\\s*([\\[\\(\\{])([^[\\]{}()]+?)([\\]\\)\\}])`,
    "g"
  )

  return source.replace(pattern, (_, id: string, open: string, _current: string, close: string) => {
    return `${id}${open}${trimmedLabel}${close}`
  })
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * U10: resolve a clicked element inside a rendered mermaid SVG to the mermaid
 * source node id. Mermaid 11.x emits flowchart nodes as
 * `<g class="node ..." data-id="A" id="flowchart-A-0">`. We prefer the
 * explicit `data-id`; otherwise we strip the `flowchart-` prefix and the
 * trailing `-<n>` index mermaid appends to the DOM id. Returns null when no
 * tagged node ancestor exists (caller falls back to the source textarea).
 */
export function resolveMermaidNodeId(start: Element | null): string | null {
  let current: Element | null = start
  while (current) {
    const dataId = current.getAttribute?.("data-id")
    const classList = current.getAttribute?.("class") ?? ""
    const isNodeGroup = /\bnode\b/.test(classList)
    if (dataId && isNodeGroup) return dataId
    if (isNodeGroup) {
      const domId = current.getAttribute?.("id") ?? ""
      const stripped = domId.replace(/^flowchart-/, "").replace(/-\d+$/, "")
      if (stripped) return stripped
    }
    if (dataId && /^[A-Za-z][\w-]*$/.test(dataId)) return dataId
    current = current.parentElement
  }
  return null
}

/**
 * Inline editing only handles the simple `A[Label]` / `A(Label)` / `A{Label}`
 * forms the regex patcher supports. A label that itself contains bracket
 * characters can't round-trip through that regex, so the caller must fall
 * back to the source textarea (plan U10 edge case).
 */
export function canInlineEditMermaidLabel(label: string): boolean {
  const trimmed = label.trim()
  if (!trimmed) return false
  return !/[[\]{}()]/.test(trimmed)
}
