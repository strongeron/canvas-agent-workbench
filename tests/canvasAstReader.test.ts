import { describe, expect, it } from "vitest"

import { hashSourceId } from "../utils/canvasAstPath"
import { injectCanvasElementIds } from "../vite/plugins/canvas-element-id"
import {
  readCanvasAstNode,
  type AstNodeInfo,
  type AstReadResult,
} from "../utils/canvasAstReader"

const SOURCE_ID = "projects/design-system-foundation/components/ui/Button.tsx"
const HASH = hashSourceId(SOURCE_ID)

/** Discover the canvasId for the Nth element with a given tag in the source. */
function findIdByTag(source: string, tag: string, occurrence = 0): string {
  const result = injectCanvasElementIds(source, { sourceId: SOURCE_ID })
  const matching = result.ids.filter((id) => id.tag === tag)
  if (occurrence >= matching.length) {
    throw new Error(`No ${tag} #${occurrence} in source`)
  }
  return matching[occurrence].canvasId
}

function readByTag(source: string, tag: string, occurrence = 0): AstReadResult {
  return readCanvasAstNode(source, findIdByTag(source, tag, occurrence), { sourceId: SOURCE_ID })
}

describe("readCanvasAstNode — happy path", () => {
  it("reads a simple host element with a literal className", () => {
    const src = `export default function P() { return <button className="p-4 rounded">Hi</button> }`
    const result = readByTag(src, "button")
    expect("error" in result).toBe(false)
    if ("error" in result) return
    const info = result as AstNodeInfo
    expect(info.tag).toBe("button")
    expect(info.isHostElement).toBe(true)
    expect(info.editableInV1).toBe(true)
    const className = info.attributes.find((a) => a.name === "className")
    expect(className).toBeDefined()
    expect(className!.kind).toBe("literal-string")
    expect(className!.value).toBe("p-4 rounded")
    expect(info.textChildren).toBe("Hi")
    expect(info.hasNonTextChildren).toBe(false)
  })

  it("reads a self-closing element with no attributes", () => {
    const src = `export default function P() { return <hr /> }`
    const result = readByTag(src, "hr")
    expect("error" in result).toBe(false)
    if ("error" in result) return
    expect(result.tag).toBe("hr")
    expect(result.attributes).toHaveLength(0)
    expect(result.textChildren).toBe("")
  })

  it("classifies attribute kinds", () => {
    const src = `export default function P() { return <input type="text" maxLength={42} disabled={true} {...rest} /> }`
    const result = readByTag(src, "input")
    expect("error" in result).toBe(false)
    if ("error" in result) return
    const byName = (n: string) => result.attributes.find((a) => a.name === n)
    expect(byName("type")?.kind).toBe("literal-string")
    expect(byName("type")?.value).toBe("text")
    expect(byName("maxLength")?.kind).toBe("literal-number")
    expect(byName("maxLength")?.value).toBe("42")
    expect(byName("disabled")?.kind).toBe("literal-boolean")
    expect(byName("disabled")?.value).toBe("true")
    const spread = result.attributes.find((a) => a.kind === "spread")
    expect(spread).toBeDefined()
    expect(spread!.value).toBe("...rest")
  })

  it("classifies a non-literal expression attribute", () => {
    const src = `export default function P() { const x = 1; return <button onClick={() => x}>x</button> }`
    const result = readByTag(src, "button")
    expect("error" in result).toBe(false)
    if ("error" in result) return
    const onClick = result.attributes.find((a) => a.name === "onClick")
    expect(onClick?.kind).toBe("expression")
  })

  it("reads a custom component (capital tag) and marks isHostElement=false", () => {
    const src = `export default function P() { return <Button variant="primary">Hi</Button> }`
    const result = readByTag(src, "Button")
    expect("error" in result).toBe(false)
    if ("error" in result) return
    expect(result.tag).toBe("Button")
    expect(result.isHostElement).toBe(false)
  })

  it("walks nested JSX and reports hasNonTextChildren correctly", () => {
    const src = `export default function P() { return <section><h2>T</h2><p>b</p></section> }`
    const outer = readByTag(src, "section")
    expect("error" in outer).toBe(false)
    if ("error" in outer) return
    expect(outer.tag).toBe("section")
    expect(outer.hasNonTextChildren).toBe(true)
    expect(outer.textChildren).toBe("")
    const h2 = readByTag(src, "h2")
    expect("error" in h2).toBe(false)
    if ("error" in h2) return
    expect(h2.tag).toBe("h2")
    expect(h2.textChildren).toBe("T")
  })
})

describe("readCanvasAstNode — error paths", () => {
  it("returns error when canvasId prefix doesn't match the sourceId", () => {
    const src = `export default function P() { return <hr /> }`
    const result = readCanvasAstNode(src, "wronghash:0.3.0.0.0", { sourceId: SOURCE_ID })
    expect("error" in result).toBe(true)
    if (!("error" in result)) return
    expect(result.error).toMatch(/sourceId|prefix/i)
  })

  it("returns error when the path doesn't resolve to a node", () => {
    const src = `export default function P() { return <hr /> }`
    const result = readCanvasAstNode(src, `${HASH}:99.99.99`, { sourceId: SOURCE_ID })
    expect("error" in result).toBe(true)
  })

  it("returns error when the resolved node is not a JSX element", () => {
    const src = `export default function P() { const x = 1; return <hr /> }`
    // Path "0" resolves to the function declaration (export default). Not JSX.
    const result = readCanvasAstNode(src, `${HASH}:0`, { sourceId: SOURCE_ID })
    expect("error" in result).toBe(true)
    if (!("error" in result)) return
    expect(result.error).toMatch(/not a jsx/i)
  })

  it("returns error when the source can't be parsed", () => {
    const result = readCanvasAstNode("???not valid???", `${HASH}:0`, { sourceId: SOURCE_ID })
    expect("error" in result).toBe(true)
  })

  it("returns error on malformed canvasId", () => {
    const src = `export default function P() { return <hr /> }`
    const result = readCanvasAstNode(src, "no-colon-here", { sourceId: SOURCE_ID })
    expect("error" in result).toBe(true)
  })
})

describe("readCanvasAstNode — v1 TSX subset", () => {
  it("marks className using cn(...) call expression as not-editable-in-v1 with reason", () => {
    const src = `import { cn } from "x"
export default function P() {
  return <button className={cn("p-4", "rounded")}>x</button>
}`
    const result = readByTag(src, "button")
    expect("error" in result).toBe(false)
    if ("error" in result) return
    const className = result.attributes.find((a) => a.name === "className")
    expect(className?.kind).toBe("expression")
    // The element itself is still editable for prop changes; only the
    // className attribute reports "computed" so the panel shows source-only
    // mode for that one field.
    expect(className?.editableInV1).toBe(false)
    expect(className?.reasonNotEditable).toMatch(/computed|expression|cn\(/i)
  })

  it("marks computed JSX children as hasNonTextChildren and empty textChildren", () => {
    const src = `export default function P({label}: {label: string}) { return <div>{label}</div> }`
    const result = readByTag(src, "div")
    expect("error" in result).toBe(false)
    if ("error" in result) return
    expect(result.tag).toBe("div")
    expect(result.textChildren).toBe("")
    expect(result.hasNonTextChildren).toBe(true)
  })
})
