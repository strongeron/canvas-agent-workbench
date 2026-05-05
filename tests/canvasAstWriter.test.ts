import { describe, expect, it } from "vitest"

import { hashSourceId } from "../utils/canvasAstPath"
import {
  writeCanvasAstNode,
  type CanvasAstMutation,
} from "../utils/canvasAstWriter"
import { injectCanvasElementIds } from "../vite/plugins/canvas-element-id"

const SOURCE_ID = "projects/design-system-foundation/components/ui/Button.tsx"
const HASH = hashSourceId(SOURCE_ID)

function findIdByTag(source: string, tag: string, occurrence = 0): string {
  const result = injectCanvasElementIds(source, { sourceId: SOURCE_ID })
  const matching = result.ids.filter((id) => id.tag === tag)
  if (occurrence >= matching.length) {
    throw new Error(`No ${tag} #${occurrence} in source`)
  }
  return matching[occurrence].canvasId
}

function writeByTag(source: string, tag: string, mutations: CanvasAstMutation[], occurrence = 0) {
  return writeCanvasAstNode(source, findIdByTag(source, tag, occurrence), mutations, {
    sourceId: SOURCE_ID,
  })
}

describe("writeCanvasAstNode", () => {
  it("sets plain JSX text without reprinting the rest of the file", () => {
    const src = `export default function P() {
  return <button className="p-4">Hi</button>
}`

    const result = writeByTag(src, "button", [{ type: "setTextChild", value: "Save" }])

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.source).toBe(`export default function P() {
  return <button className="p-4">Save</button>
}`)
  })

  it("leaves a no-op text mutation byte-identical", () => {
    const src = `export default function P() { return <button>Hi</button> }`

    const result = writeByTag(src, "button", [{ type: "setTextChild", value: "Hi" }])

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.appliedMutations).toBe(0)
    expect(result.source).toBe(src)
  })

  it("sets a literal className", () => {
    const src = `export default function P() { return <div className="p-4">Hi</div> }`

    const result = writeByTag(src, "div", [{ type: "setClassName", value: "p-4 rounded" }])

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.source).toContain(`<div className="p-4 rounded">Hi</div>`)
  })

  it("sets string, number, boolean, and identifier props", () => {
    const src = `export default function P() {
  return <Button variant="primary" count={1} disabled={false} tone={brandTone}>Hi</Button>
}`

    const result = writeByTag(src, "Button", [
      { type: "setPropValue", propName: "variant", value: "secondary" },
      { type: "setPropValue", propName: "count", value: 2 },
      { type: "setPropValue", propName: "disabled", value: true },
      { type: "setPropValue", propName: "tone", value: "accentTone", valueKind: "identifier" },
    ])

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.source).toContain(
      `<Button variant="secondary" count={2} disabled={true} tone={accentTone}>Hi</Button>`
    )
  })

  it("rewrites a shorthand boolean prop when set to false", () => {
    const src = `export default function P() { return <input disabled /> }`

    const result = writeByTag(src, "input", [
      { type: "setPropValue", propName: "disabled", value: false },
    ])

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.source).toContain(`<input disabled={false} />`)
  })

  it("rejects computed className expressions without changing source", () => {
    const src = `import { cn } from "./cn"
export default function P() {
  return <div className={cn("p-4", active && "ring")}>Hi</div>
}`

    const result = writeByTag(src, "div", [{ type: "setClassName", value: "p-4 rounded" }])

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("unsupported-expression")
  })

  it("rejects text edits on elements with nested JSX", () => {
    const src = `export default function P() { return <section><h2>Hi</h2></section> }`

    const result = writeByTag(src, "section", [{ type: "setTextChild", value: "Nope" }])

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("unsupported-expression")
  })

  it("returns a not-found error for stale ids", () => {
    const src = `export default function P() { return <hr /> }`

    const result = writeCanvasAstNode(src, `${HASH}:99.99`, [{ type: "setClassName", value: "x" }], {
      sourceId: SOURCE_ID,
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("not-found")
  })
})
