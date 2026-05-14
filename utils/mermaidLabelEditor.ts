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
