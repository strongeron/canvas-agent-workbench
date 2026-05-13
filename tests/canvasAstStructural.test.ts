import * as ts from "typescript"
import { describe, expect, it } from "vitest"

import { hashSourceId, parseTsxSource } from "../utils/canvasAstPath"
import { removeJsxNode } from "../utils/canvasAstStructural"

const SOURCE_ID = "test:fixture-1"

/**
 * Resolve a "human-friendly" element selector to its canvasId in the given
 * source. Walks the AST in source order, counts JSX opening elements with
 * the given tag, and returns the canvasId of the Nth occurrence. Avoids
 * hand-encoding AST paths in test inputs.
 */
function canvasIdOfNthJsx(source: string, tag: string, occurrenceIndex = 0): string {
  const file = parseTsxSource(source)
  const prefix = hashSourceId(SOURCE_ID)
  const matches: string[] = []
  function walk(node: ts.Node, path: string): void {
    let childIndex = 0
    ts.forEachChild(node, (child) => {
      const childPath = path === "" ? `${childIndex}` : `${path}.${childIndex}`
      if (
        (ts.isJsxOpeningElement(child) || ts.isJsxSelfClosingElement(child)) &&
        child.tagName.getText() === tag
      ) {
        matches.push(`${prefix}:${childPath}`)
      }
      walk(child, childPath)
      childIndex += 1
    })
  }
  walk(file, "")
  if (occurrenceIndex >= matches.length) {
    throw new Error(`canvasIdOfNthJsx: ${tag} occurrence ${occurrenceIndex} not found`)
  }
  return matches[occurrenceIndex]
}

describe("removeJsxNode", () => {
  const fixture = `import React from "react"

export default function Card() {
  return (
    <div className="p-4">
      <h1 className="text-lg">Hello</h1>
      <p>World</p>
      <button className="bg-blue-500">Click</button>
    </div>
  )
}
`

  it("removes the targeted JSX element and leaves surrounding text byte-identical outside the splice", () => {
    const pId = canvasIdOfNthJsx(fixture, "p")
    const result = removeJsxNode(fixture, pId, { sourceId: SOURCE_ID })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.source).toContain("<h1 className=\"text-lg\">Hello</h1>")
    expect(result.source).toContain("<button className=\"bg-blue-500\">Click</button>")
    expect(result.source).not.toContain("<p>World</p>")
    // Source byte-identical outside the splice — same import, same export
    // signature, same indentation of remaining siblings.
    expect(result.source.startsWith("import React from \"react\"\n\nexport default function Card() {\n")).toBe(true)
    expect(result.source.includes("    </div>")).toBe(true)
  })

  it("maps the removed canvasId to null", () => {
    const pId = canvasIdOfNthJsx(fixture, "p")
    const result = removeJsxNode(fixture, pId, { sourceId: SOURCE_ID })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.canvasIdMap[pId]).toBeNull()
  })

  it("preserves canvasIds of siblings whose source position is before the splice", () => {
    const h1Id = canvasIdOfNthJsx(fixture, "h1")
    const pId = canvasIdOfNthJsx(fixture, "p")
    const result = removeJsxNode(fixture, pId, { sourceId: SOURCE_ID })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    // h1 sits before the spliced <p>; same AST path in the new tree.
    expect(result.canvasIdMap[h1Id]).toBe(h1Id)
  })

  it("remaps canvasIds of siblings whose source position is after the splice", () => {
    const pId = canvasIdOfNthJsx(fixture, "p")
    const buttonOldId = canvasIdOfNthJsx(fixture, "button")
    const result = removeJsxNode(fixture, pId, { sourceId: SOURCE_ID })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    // The button shifted: its container <div> now has one fewer child, so
    // its AST path in the new tree differs from the old one.
    const buttonNewId = result.canvasIdMap[buttonOldId]
    expect(buttonNewId).not.toBeNull()
    expect(buttonNewId).not.toBe(buttonOldId)
    // Sanity: the new id resolves in the new source via the same prefix
    // and points to a button.
    const buttonNewIdInNew = canvasIdOfNthJsx(result.source, "button")
    expect(buttonNewId).toBe(buttonNewIdInNew)
  })

  it("returns not-found when canvasId does not resolve in the source", () => {
    const result = removeJsxNode(fixture, "deadbeef:0", { sourceId: SOURCE_ID })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("not-found")
  })

  it("returns bad-input on empty canvasId", () => {
    const result = removeJsxNode(fixture, "", { sourceId: SOURCE_ID })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("bad-input")
  })

  it("removes a self-closing JSX element (e.g. <img />)", () => {
    const source = `export default function P() {
  return (
    <div>
      <img src="x" />
      <span>after</span>
    </div>
  )
}
`
    const imgId = canvasIdOfNthJsx(source, "img")
    const result = removeJsxNode(source, imgId, { sourceId: SOURCE_ID })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.source).not.toContain("<img")
    expect(result.source).toContain("<span>after</span>")
    expect(result.canvasIdMap[imgId]).toBeNull()
  })

  it("removes a nested element without disturbing its grandparent's siblings", () => {
    const source = `export default function P() {
  return (
    <section>
      <header>
        <h1>Title</h1>
        <p>Subtitle</p>
      </header>
      <main>main content</main>
    </section>
  )
}
`
    const headerH1Id = canvasIdOfNthJsx(source, "h1")
    const mainOldId = canvasIdOfNthJsx(source, "main")
    const result = removeJsxNode(source, headerH1Id, { sourceId: SOURCE_ID })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.source).toContain("<p>Subtitle</p>")
    expect(result.source).toContain("<main>main content</main>")
    // <main> is in a different branch — its position is after the splice
    // but its AST path within the new tree should also point to a main.
    const mainNewId = result.canvasIdMap[mainOldId]
    expect(mainNewId).not.toBeNull()
    expect(canvasIdOfNthJsx(result.source, "main")).toBe(mainNewId)
  })

  // canvasIds are position-based (see canvasAstPath.ts:21 — "paths are
  // stable under edits that don't change AST shape between root and the
  // target node"). After a structural mutation, an old canvasId may still
  // resolve in the new source but to a different element. Callers MUST use
  // canvasIdMap to rebase rather than reusing the pre-mutation id.
  it("stale-id semantic: old canvasId after remove may resolve to a different element", () => {
    const pId = canvasIdOfNthJsx(fixture, "p")
    const first = removeJsxNode(fixture, pId, { sourceId: SOURCE_ID })
    expect(first.ok).toBe(true)
    if (!first.ok) return
    // After removing <p>, the original pId either no longer resolves OR
    // resolves to the element that now occupies that slot (the <button>).
    // Either way, the canvasIdMap is the source of truth for rebasing —
    // it told the caller pId → null at first-call time.
    expect(first.canvasIdMap[pId]).toBeNull()
  })
})
