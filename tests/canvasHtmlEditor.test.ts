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
