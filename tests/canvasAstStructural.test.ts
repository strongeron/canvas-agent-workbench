import * as ts from "typescript"
import { describe, expect, it } from "vitest"

import { hashSourceId, parseTsxSource } from "../utils/canvasAstPath"
import {
  insertJsxChild,
  removeJsxNode,
  reorderJsxSibling,
  swapJsxTag,
  unwrapJsxNode,
  wrapJsxNode,
} from "../utils/canvasAstStructural"

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

  it("inserts a JSX child at the given position", () => {
    const divId = canvasIdOfNthJsx(fixture, "div")
    const result = insertJsxChild(fixture, divId, 1, "<span>Inserted</span>", {
      sourceId: SOURCE_ID,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.source).toMatch(/<h1[^>]*>Hello<\/h1>\s+<span>Inserted<\/span>\s+<p>World<\/p>/)
  })

  it("appends a JSX child when position equals children.length", () => {
    const divId = canvasIdOfNthJsx(fixture, "div")
    const result = insertJsxChild(fixture, divId, 3, "<footer>end</footer>", {
      sourceId: SOURCE_ID,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.source).toMatch(/<button[^>]*>Click<\/button>\s+<footer>end<\/footer>/)
  })

  it("prepends a JSX child at position 0", () => {
    const divId = canvasIdOfNthJsx(fixture, "div")
    const result = insertJsxChild(fixture, divId, 0, "<header>top</header>", {
      sourceId: SOURCE_ID,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const divOpenIdx = result.source.indexOf("<div")
    const headerIdx = result.source.indexOf("<header>top</header>")
    const h1Idx = result.source.indexOf("<h1")
    expect(divOpenIdx).toBeLessThan(headerIdx)
    expect(headerIdx).toBeLessThan(h1Idx)
  })

  it("inserts into an empty JSX parent (no existing children)", () => {
    const source = `export default function P() {
  return (
    <div className="empty">
    </div>
  )
}
`
    const divId = canvasIdOfNthJsx(source, "div")
    const result = insertJsxChild(source, divId, 0, "<span>only</span>", {
      sourceId: SOURCE_ID,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.source).toContain("<span>only</span>")
    expect(result.source).toMatch(/<div className="empty">[\s\S]*<span>only<\/span>[\s\S]*<\/div>/)
  })

  it("rejects childSource that does not parse as JSX (parse-error)", () => {
    const divId = canvasIdOfNthJsx(fixture, "div")
    const result = insertJsxChild(fixture, divId, 0, "this is not jsx <<<", {
      sourceId: SOURCE_ID,
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("parse-error")
  })

  it("rejects childSource with multiple sibling JSX expressions", () => {
    const divId = canvasIdOfNthJsx(fixture, "div")
    const result = insertJsxChild(fixture, divId, 0, "<span>A</span><span>B</span>", {
      sourceId: SOURCE_ID,
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("parse-error")
  })

  it("rejects childSource that is not a JSX expression", () => {
    const divId = canvasIdOfNthJsx(fixture, "div")
    const result = insertJsxChild(fixture, divId, 0, 'import x from "y"', {
      sourceId: SOURCE_ID,
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("parse-error")
  })

  it("rejects position out of range", () => {
    const divId = canvasIdOfNthJsx(fixture, "div")
    const result = insertJsxChild(fixture, divId, 99, "<span>x</span>", {
      sourceId: SOURCE_ID,
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("bad-input")
  })

  it("rejects empty childSource", () => {
    const divId = canvasIdOfNthJsx(fixture, "div")
    const result = insertJsxChild(fixture, divId, 0, "   ", {
      sourceId: SOURCE_ID,
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("bad-input")
  })

  it("rejects insertion into a self-closing element", () => {
    const source = `export default function P() { return (<div><img src="x" /></div>) }`
    const imgId = canvasIdOfNthJsx(source, "img")
    const result = insertJsxChild(source, imgId, 0, "<span>nope</span>", {
      sourceId: SOURCE_ID,
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("unsupported-node")
  })

  it("produces a canvasIdMap that pairs old↔new for siblings around the insertion", () => {
    const divId = canvasIdOfNthJsx(fixture, "div")
    const h1Id = canvasIdOfNthJsx(fixture, "h1")
    const buttonOldId = canvasIdOfNthJsx(fixture, "button")
    const result = insertJsxChild(fixture, divId, 1, "<span>mid</span>", {
      sourceId: SOURCE_ID,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    // h1 sits before the insertion → canvasId unchanged.
    expect(result.canvasIdMap[h1Id]).toBe(h1Id)
    // button shifted (one more sibling before it) → new id.
    const buttonNewId = result.canvasIdMap[buttonOldId]
    expect(buttonNewId).not.toBeNull()
    expect(buttonNewId).not.toBe(buttonOldId)
    expect(canvasIdOfNthJsx(result.source, "button")).toBe(buttonNewId)
  })

  // Browser-surfaced bug: inserting into a parent whose first rendered child
  // is JsxText on the same line as the opening tag (the inline-element case
  // like `<button>Click</button>`) used to splice the parent's prefix text
  // (including the opening tag) back into the source as "indent", producing
  // duplicate `<button>` opens and a parse failure on the next compile.
  it("inserts into an inline JSX parent (text child on same line as opening tag) without duplicating the opening tag", () => {
    const inlineSource = `export default function P() {
  return (
    <div>
      <button>Click</button>
    </div>
  )
}
`
    const buttonId = canvasIdOfNthJsx(inlineSource, "button")
    const result = insertJsxChild(inlineSource, buttonId, 0, "<span>x</span>", {
      sourceId: SOURCE_ID,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    // Output still parses (canvasIdMap built without crashing proves the new
    // AST is valid, but assert structurally too).
    expect(result.source).toMatch(/<button><span>x<\/span>Click<\/button>/)
    // Defensive: only one <button> and one </button> in the file.
    expect(result.source.match(/<button\b/g)?.length).toBe(1)
    expect(result.source.match(/<\/button>/g)?.length).toBe(1)
  })

  it("appends into an inline JSX parent without splicing the opening tag back in", () => {
    const inlineSource = `export default function P() { return <div><button>Click</button></div> }
`
    const buttonId = canvasIdOfNthJsx(inlineSource, "button")
    const result = insertJsxChild(inlineSource, buttonId, 1, "<span>x</span>", {
      sourceId: SOURCE_ID,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.source).toMatch(/<button>Click<span>x<\/span><\/button>/)
    expect(result.source.match(/<button\b/g)?.length).toBe(1)
    expect(result.source.match(/<\/button>/g)?.length).toBe(1)
  })

  // Compositional bug surfaced in the browser (wrap → insert sequence):
  // wrapJsxNode emits inline `<Wrapper><button>x</button></Wrapper>` (no
  // newlines), then inserting into the rebased button hits the inline-parent
  // path. End-to-end this is the workflow that broke; pin it.
  it("wrap-then-insert: wrapping a button then inserting into the rebased button still produces parseable source", () => {
    const source = `export default function P() {
  return (
    <div>
      <button>Click</button>
    </div>
  )
}
`
    const buttonOldId = canvasIdOfNthJsx(source, "button")
    const wrapped = wrapJsxNode(source, buttonOldId, "Wrapper", { sourceId: SOURCE_ID })
    expect(wrapped.ok).toBe(true)
    if (!wrapped.ok) return
    const buttonNewId = wrapped.canvasIdMap[buttonOldId]
    expect(buttonNewId).not.toBeNull()
    if (!buttonNewId) return
    const inserted = insertJsxChild(wrapped.source, buttonNewId, 0, "<span>x</span>", {
      sourceId: SOURCE_ID,
    })
    expect(inserted.ok).toBe(true)
    if (!inserted.ok) return
    expect(inserted.source).toContain("<Wrapper>")
    expect(inserted.source).toContain("</Wrapper>")
    expect(inserted.source.match(/<button\b/g)?.length).toBe(1)
    expect(inserted.source.match(/<\/button>/g)?.length).toBe(1)
    expect(inserted.source).toMatch(/<button><span>x<\/span>Click<\/button>/)
  })

  it("reorders a JSX child upward by one rendered sibling", () => {
    const pId = canvasIdOfNthJsx(fixture, "p")
    const h1OldId = canvasIdOfNthJsx(fixture, "h1")
    const pOldId = pId
    const result = reorderJsxSibling(fixture, pId, "up", { sourceId: SOURCE_ID })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.source).toMatch(/<p>World<\/p>\s+<h1[^>]*>Hello<\/h1>/)
    const pNewId = result.canvasIdMap[pOldId]
    const h1NewId = result.canvasIdMap[h1OldId]
    expect(pNewId).not.toBeNull()
    expect(h1NewId).not.toBeNull()
    expect(pNewId).not.toBe(pOldId)
    expect(h1NewId).not.toBe(h1OldId)
    expect(canvasIdOfNthJsx(result.source, "p")).toBe(pNewId)
    expect(canvasIdOfNthJsx(result.source, "h1")).toBe(h1NewId)
  })

  it("reorders a JSX child downward by one rendered sibling", () => {
    const pId = canvasIdOfNthJsx(fixture, "p")
    const buttonOldId = canvasIdOfNthJsx(fixture, "button")
    const result = reorderJsxSibling(fixture, pId, "down", { sourceId: SOURCE_ID })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.source).toMatch(/<button[^>]*>Click<\/button>\s+<p>World<\/p>/)
    const pNewId = result.canvasIdMap[pId]
    const buttonNewId = result.canvasIdMap[buttonOldId]
    expect(pNewId).not.toBeNull()
    expect(buttonNewId).not.toBeNull()
    expect(pNewId).not.toBe(pId)
    expect(buttonNewId).not.toBe(buttonOldId)
    expect(canvasIdOfNthJsx(result.source, "p")).toBe(pNewId)
    expect(canvasIdOfNthJsx(result.source, "button")).toBe(buttonNewId)
  })

  it("rejects moving the first rendered sibling upward", () => {
    const h1Id = canvasIdOfNthJsx(fixture, "h1")
    const result = reorderJsxSibling(fixture, h1Id, "up", { sourceId: SOURCE_ID })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("bad-input")
  })

  it("rejects moving the last rendered sibling downward", () => {
    const buttonId = canvasIdOfNthJsx(fixture, "button")
    const result = reorderJsxSibling(fixture, buttonId, "down", { sourceId: SOURCE_ID })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("bad-input")
  })

  it("wraps a JSX node and rebases the wrapped subtree ids", () => {
    const pId = canvasIdOfNthJsx(fixture, "p")
    const result = wrapJsxNode(fixture, pId, "section", { sourceId: SOURCE_ID })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.source).toContain("<section><p>World</p></section>")
    const pNewId = result.canvasIdMap[pId]
    expect(pNewId).not.toBeNull()
    expect(pNewId).not.toBe(pId)
    expect(canvasIdOfNthJsx(result.source, "p")).toBe(pNewId)
  })

  it("rejects wrapping with an invalid JSX tag name", () => {
    const pId = canvasIdOfNthJsx(fixture, "p")
    const result = wrapJsxNode(fixture, pId, "bad tag", { sourceId: SOURCE_ID })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("bad-input")
  })

  it("unwraps a JSX node, removes the wrapper id, and rebases child ids", () => {
    const source = `export default function P() {
  return (
    <div>
      <section>
        <p>World</p>
        <button>Click</button>
      </section>
    </div>
  )
}
`
    const sectionId = canvasIdOfNthJsx(source, "section")
    const pOldId = canvasIdOfNthJsx(source, "p")
    const buttonOldId = canvasIdOfNthJsx(source, "button")
    const result = unwrapJsxNode(source, sectionId, { sourceId: SOURCE_ID })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.source).not.toContain("<section>")
    expect(result.canvasIdMap[sectionId]).toBeNull()
    const pNewId = result.canvasIdMap[pOldId]
    const buttonNewId = result.canvasIdMap[buttonOldId]
    expect(pNewId).not.toBeNull()
    expect(buttonNewId).not.toBeNull()
    expect(canvasIdOfNthJsx(result.source, "p")).toBe(pNewId)
    expect(canvasIdOfNthJsx(result.source, "button")).toBe(buttonNewId)
  })

  it("rejects unwrapping a self-closing node", () => {
    const source = `export default function P() { return (<div><img src="x" /></div>) }`
    const imgId = canvasIdOfNthJsx(source, "img")
    const result = unwrapJsxNode(source, imgId, { sourceId: SOURCE_ID })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("unsupported-node")
  })

  it("swaps an element tag while preserving children and rebasing descendants", () => {
    const divId = canvasIdOfNthJsx(fixture, "div")
    const buttonOldId = canvasIdOfNthJsx(fixture, "button")
    const result = swapJsxTag(fixture, divId, "section", { sourceId: SOURCE_ID })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.source).toContain('<section className="p-4">')
    expect(result.source).toContain("</section>")
    expect(result.source).not.toContain('<div className="p-4">')
    const buttonNewId = result.canvasIdMap[buttonOldId]
    expect(buttonNewId).toBe(buttonOldId)
    expect(canvasIdOfNthJsx(result.source, "button")).toBe(buttonNewId)
  })

  it("swaps a self-closing element tag", () => {
    const source = `export default function P() { return (<div><img src="x" /></div>) }`
    const imgId = canvasIdOfNthJsx(source, "img")
    const result = swapJsxTag(source, imgId, "video", { sourceId: SOURCE_ID })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.source).toContain("<video src=\"x\" />")
  })

  it("rejects swapping to an invalid tag name", () => {
    const divId = canvasIdOfNthJsx(fixture, "div")
    const result = swapJsxTag(fixture, divId, "bad tag", { sourceId: SOURCE_ID })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("bad-input")
  })
})

describe("removeJsxNode (stale-id semantic)", () => {
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
