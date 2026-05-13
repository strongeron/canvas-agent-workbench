import { describe, expect, it } from "vitest"

import { hashSourceId } from "../utils/canvasAstPath"
import {
  injectCanvasHtmlElementIds,
  readCanvasHtmlNode,
  writeCanvasHtmlNode,
} from "../utils/canvasHtmlEditor"

const SOURCE_ID = "projects/demo/components/Card.html"
const HASH = hashSourceId(SOURCE_ID)

function findIdByTag(source: string, tag: string, occurrence = 0): string {
  const result = injectCanvasHtmlElementIds(source, { sourceId: SOURCE_ID, injectBridge: false })
  const matching = result.ids.filter((id) => id.tag === tag)
  if (occurrence >= matching.length) {
    throw new Error(`No ${tag} #${occurrence} in source`)
  }
  return matching[occurrence].canvasId
}

describe("canvas HTML editor", () => {
  it("injects data-canvas-id into served HTML without changing source", () => {
    const source = `<article class="card"><h2>Hello</h2></article>`

    const result = injectCanvasHtmlElementIds(source, { sourceId: SOURCE_ID, injectBridge: false })

    expect(result.html).toContain(`data-canvas-id="${HASH}:0"`)
    expect(result.html).toContain(`data-canvas-id="${HASH}:0.0"`)
    expect(source).not.toContain("data-canvas-id")
  })

  it("keeps element paths stable across whitespace-only formatting changes", () => {
    const compact = `<section><h2>Title</h2><p>Body</p></section>`
    const formatted = `<section>
  <h2>Title</h2>
  <p>Body</p>
</section>`

    const compactIds = injectCanvasHtmlElementIds(compact, { sourceId: SOURCE_ID, injectBridge: false }).ids
    const formattedIds = injectCanvasHtmlElementIds(formatted, { sourceId: SOURCE_ID, injectBridge: false }).ids

    expect(compactIds.map((id) => `${id.tag}:${id.path}`)).toEqual(
      formattedIds.map((id) => `${id.tag}:${id.path}`)
    )
  })

  it("reads HTML node attributes and text", () => {
    const source = `<button class="btn" type="button">Save</button>`
    const canvasId = findIdByTag(source, "button")

    const result = readCanvasHtmlNode(source, canvasId, { sourceId: SOURCE_ID })

    expect("error" in result).toBe(false)
    if ("error" in result) return
    expect(result.tag).toBe("button")
    expect(result.className).toBe("btn")
    expect(result.textContent).toBe("Save")
    expect(result.attributes.map(({ name, value, kind, editableInV1 }) => ({ name, value, kind, editableInV1 }))).toEqual([
      { name: "class", value: "btn", kind: "literal-string", editableInV1: true },
      { name: "type", value: "button", kind: "literal-string", editableInV1: true },
    ])
  })

  it("updates class, attributes, and text through source offsets", () => {
    const source = `<button class="btn" type="button">Save</button>`
    const canvasId = findIdByTag(source, "button")

    const result = writeCanvasHtmlNode(
      source,
      canvasId,
      [
        { type: "setClassName", value: "btn btn-primary" },
        { type: "setPropValue", propName: "type", value: "submit" },
        { type: "setTextContent", value: "Send" },
      ],
      { sourceId: SOURCE_ID }
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.source).toBe(`<button class="btn btn-primary" type="submit">Send</button>`)
    expect(result.prevSourceSnapshot).toBe(source)
    expect(result.canvasIdMap).toEqual({})
  })

  it("adds and removes attributes", () => {
    const source = `<input class="field">`
    const canvasId = findIdByTag(source, "input")

    const added = writeCanvasHtmlNode(
      source,
      canvasId,
      [{ type: "setAttribute", attrName: "placeholder", value: "Email" }],
      { sourceId: SOURCE_ID }
    )
    expect(added.ok).toBe(true)
    if (!added.ok) return
    expect(added.source).toBe(`<input class="field" placeholder="Email">`)

    const removed = writeCanvasHtmlNode(
      added.source,
      canvasId,
      [{ type: "setAttribute", attrName: "class", value: null }],
      { sourceId: SOURCE_ID }
    )
    expect(removed.ok).toBe(true)
    if (!removed.ok) return
    expect(removed.source).toBe(`<input placeholder="Email">`)
  })

  it("removes an HTML element and rebases sibling ids", () => {
    const source = `<div><h2>Hello</h2><p>World</p><button>Click</button></div>`
    const pId = findIdByTag(source, "p")
    const buttonOldId = findIdByTag(source, "button")

    const result = writeCanvasHtmlNode(source, pId, [{ type: "removeNode" }], {
      sourceId: SOURCE_ID,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.source).toBe(`<div><h2>Hello</h2><button>Click</button></div>`)
    expect(result.canvasIdMap?.[pId]).toBeNull()
    const buttonNewId = result.canvasIdMap?.[buttonOldId]
    expect(buttonNewId).toBeTruthy()
    expect(buttonNewId).not.toBe(buttonOldId)
  })

  it("inserts HTML child elements at the requested position", () => {
    const source = `<div><p>World</p><button>Click</button></div>`
    const divId = findIdByTag(source, "div")

    const result = writeCanvasHtmlNode(
      source,
      divId,
      [{ type: "insertChild", position: 1, childSource: `<span>A</span><span>B</span>` }],
      { sourceId: SOURCE_ID }
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.source).toBe(`<div><p>World</p><span>A</span><span>B</span><button>Click</button></div>`)
    expect(result.prevSourceSnapshot).toBe(source)
    expect(Object.keys(result.canvasIdMap ?? {}).length).toBeGreaterThan(0)
  })

  it("rejects insertChild HTML with top-level non-element content", () => {
    const source = `<div><p>World</p></div>`
    const divId = findIdByTag(source, "div")

    const result = writeCanvasHtmlNode(
      source,
      divId,
      [{ type: "insertChild", position: 0, childSource: `hello<span>A</span>` }],
      { sourceId: SOURCE_ID }
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("parse-error")
  })

  it("rejects insertChild HTML with script tags", () => {
    const source = `<div><p>World</p></div>`
    const divId = findIdByTag(source, "div")

    const result = writeCanvasHtmlNode(
      source,
      divId,
      [{ type: "insertChild", position: 0, childSource: `<script>alert(1)</script>` }],
      { sourceId: SOURCE_ID }
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("parse-error")
  })

  it("rejects insertChild HTML when position is out of range", () => {
    const source = `<div><p>World</p></div>`
    const divId = findIdByTag(source, "div")

    const result = writeCanvasHtmlNode(
      source,
      divId,
      [{ type: "insertChild", position: 9, childSource: `<span>A</span>` }],
      { sourceId: SOURCE_ID }
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("bad-input")
  })

  it("reorders an HTML element upward by one sibling", () => {
    const source = `<div><h2>Hello</h2><p>World</p><button>Click</button></div>`
    const pId = findIdByTag(source, "p")

    const result = writeCanvasHtmlNode(source, pId, [{ type: "reorderSibling", direction: "up" }], {
      sourceId: SOURCE_ID,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.source).toBe(`<div><p>World</p><h2>Hello</h2><button>Click</button></div>`)
  })

  it("wraps and unwraps an HTML element while rebasing ids", () => {
    const source = `<div><p>World</p><button>Click</button></div>`
    const pId = findIdByTag(source, "p")

    const wrapped = writeCanvasHtmlNode(source, pId, [{ type: "wrapSelection", wrapperTag: "section" }], {
      sourceId: SOURCE_ID,
    })
    expect(wrapped.ok).toBe(true)
    if (!wrapped.ok) return
    expect(wrapped.source).toBe(`<div><section><p>World</p></section><button>Click</button></div>`)
    const wrappedPId = wrapped.canvasIdMap?.[pId]
    expect(wrappedPId).toBeTruthy()
    expect(wrappedPId).not.toBe(pId)

    const sectionId = findIdByTag(wrapped.source, "section")
    const unwrapped = writeCanvasHtmlNode(wrapped.source, sectionId, [{ type: "unwrap" }], {
      sourceId: SOURCE_ID,
    })
    expect(unwrapped.ok).toBe(true)
    if (!unwrapped.ok) return
    expect(unwrapped.source).toBe(`<div><p>World</p><button>Click</button></div>`)
    expect(unwrapped.canvasIdMap?.[sectionId]).toBeNull()
  })

  it("swaps an HTML tag name in place", () => {
    const source = `<div><p>World</p></div>`
    const pId = findIdByTag(source, "p")

    const result = writeCanvasHtmlNode(source, pId, [{ type: "swapTag", newTag: "span" }], {
      sourceId: SOURCE_ID,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.source).toBe(`<div><span>World</span></div>`)
  })

  it("rejects invalid wrapper and swap tags", () => {
    const source = `<div><p>World</p></div>`
    const pId = findIdByTag(source, "p")

    const wrapped = writeCanvasHtmlNode(source, pId, [{ type: "wrapSelection", wrapperTag: "bad tag" }], {
      sourceId: SOURCE_ID,
    })
    expect(wrapped.ok).toBe(false)
    if (wrapped.ok) return
    expect(wrapped.code).toBe("bad-input")

    const swapped = writeCanvasHtmlNode(source, pId, [{ type: "swapTag", newTag: "script" }], {
      sourceId: SOURCE_ID,
    })
    expect(swapped.ok).toBe(false)
    if (swapped.ok) return
    expect(swapped.code).toBe("bad-input")
  })

  it("rejects stale ids from another source", () => {
    const source = `<button>Save</button>`
    const result = writeCanvasHtmlNode(source, `${HASH}:9.9`, [{ type: "setTextContent", value: "Nope" }], {
      sourceId: "other.html",
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("not-found")
  })
})
