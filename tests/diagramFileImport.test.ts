import { describe, expect, it } from "vitest"

import {
  inferDiagramFileKind,
  parseExcalidrawFileContent,
  parseMarkdownFileContent,
  parseMermaidFileContent,
} from "../components/canvas/diagramFileImport"

describe("diagram file import helpers", () => {
  it("infers diagram kind from file name", () => {
    expect(inferDiagramFileKind("notes.md")).toBe("markdown")
    expect(inferDiagramFileKind("flow.mmd")).toBe("mermaid")
    expect(inferDiagramFileKind("graph.mermaid")).toBe("mermaid")
    expect(inferDiagramFileKind("board.excalidraw")).toBe("excalidraw")
    expect(inferDiagramFileKind("image.png")).toBeNull()
  })

  it("parses mermaid file content", () => {
    expect(parseMermaidFileContent(" flowchart LR\nA-->B \n")).toBe("flowchart LR\nA-->B")
    expect(() => parseMermaidFileContent("   ")).toThrowError("Mermaid file is empty.")
  })

  it("parses markdown file content", () => {
    expect(parseMarkdownFileContent(" # Title\n\nBody\n")).toBe("# Title\n\nBody")
    expect(() => parseMarkdownFileContent(" \n  ")).toThrowError("Markdown file is empty.")
  })

  it("parses top-level excalidraw scene payload", () => {
    const parsed = parseExcalidrawFileContent(
      JSON.stringify({
        type: "excalidraw",
        title: "System",
        elements: [{ id: "1", type: "rectangle" }],
        appState: { viewBackgroundColor: "#fefefe" },
        files: {},
        sourceMermaid: "flowchart LR\nA-->B",
      })
    )

    expect(Array.isArray(parsed.scene.elements)).toBe(true)
    expect(parsed.title).toBe("System")
    expect(parsed.sourceMermaid).toContain("A-->B")
  })

  it("parses nested scene payload", () => {
    const parsed = parseExcalidrawFileContent(
      JSON.stringify({
        name: "Nested",
        scene: {
          elements: [{ id: "2", type: "ellipse" }],
          appState: {},
          files: {},
        },
      })
    )

    expect(parsed.title).toBe("Nested")
    expect(Array.isArray(parsed.scene.elements)).toBe(true)
    expect(parsed.scene.appState?.viewBackgroundColor).toBe("#ffffff")
  })

  it("fails on invalid excalidraw payload", () => {
    expect(() => parseExcalidrawFileContent("{")).toThrowError("Invalid Excalidraw JSON file.")
    expect(() => parseExcalidrawFileContent(JSON.stringify({ hello: "world" }))).toThrowError(
      "JSON does not contain Excalidraw scene data."
    )
  })
})
