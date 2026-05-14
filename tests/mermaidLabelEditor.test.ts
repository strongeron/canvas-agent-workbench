import { describe, expect, it } from "vitest"

import { listMermaidNodeLabels, updateMermaidNodeLabel } from "../utils/mermaidLabelEditor"

describe("mermaidLabelEditor", () => {
  it("lists unique node labels from simple mermaid source", () => {
    const source = `flowchart LR
  A[Start] --> B{Need references?}
  B -->|yes| C[Search]
  B -->|no| D[Draft]
  C --> D
  D --> E[Ship]`

    expect(listMermaidNodeLabels(source)).toEqual([
      { id: "A", label: "Start" },
      { id: "B", label: "Need references?" },
      { id: "C", label: "Search" },
      { id: "D", label: "Draft" },
      { id: "E", label: "Ship" },
    ])
  })

  it("updates every labeled occurrence of a node id while preserving delimiters", () => {
    const source = `flowchart LR
  A[Start] --> B{Need references?}
  B --> C[Search]
  C --> B{Need references?}`

    expect(updateMermaidNodeLabel(source, "B", "Review")).toBe(`flowchart LR
  A[Start] --> B{Review}
  B --> C[Search]
  C --> B{Review}`)
  })

  it("leaves the source unchanged for blank labels", () => {
    const source = "flowchart LR\n  A[Start] --> B[Ship]"
    expect(updateMermaidNodeLabel(source, "A", "   ")).toBe(source)
  })
})
