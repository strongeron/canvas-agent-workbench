// @vitest-environment jsdom

import { describe, expect, it } from "vitest"

import {
  canInlineEditMermaidLabel,
  listMermaidNodeLabels,
  resolveMermaidNodeId,
  updateMermaidNodeLabel,
} from "../utils/mermaidLabelEditor"

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

describe("resolveMermaidNodeId (U10)", () => {
  function svgEl(tag: string, attrs: Record<string, string>): Element {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag)
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
    return el
  }

  it("prefers data-id on a node group", () => {
    const g = svgEl("g", { class: "node default", "data-id": "A" })
    const text = svgEl("text", {})
    g.appendChild(text)
    expect(resolveMermaidNodeId(text)).toBe("A")
  })

  it("strips the flowchart- prefix and -<n> suffix from the dom id", () => {
    const g = svgEl("g", { class: "node", id: "flowchart-Start-3" })
    expect(resolveMermaidNodeId(g)).toBe("Start")
  })

  it("returns null when no node ancestor carries an id", () => {
    const g = svgEl("g", { class: "edgePaths" })
    const path = svgEl("path", {})
    g.appendChild(path)
    expect(resolveMermaidNodeId(path)).toBeNull()
    expect(resolveMermaidNodeId(null)).toBeNull()
  })
})

describe("canInlineEditMermaidLabel (U10)", () => {
  it("accepts plain labels", () => {
    expect(canInlineEditMermaidLabel("Search docs")).toBe(true)
  })
  it("rejects empty and bracket-bearing labels", () => {
    expect(canInlineEditMermaidLabel("  ")).toBe(false)
    expect(canInlineEditMermaidLabel("a [b]")).toBe(false)
    expect(canInlineEditMermaidLabel("f(x)")).toBe(false)
  })
})
