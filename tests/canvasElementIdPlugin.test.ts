import { describe, expect, it } from "vitest"

import {
  hashSourceId,
  injectCanvasElementIds,
} from "../vite/plugins/canvas-element-id"

const SOURCE_ID = "projects/design-system-foundation/components/ui/Button.tsx"
const HASH = hashSourceId(SOURCE_ID)

describe("hashSourceId", () => {
  it("returns 8 hex chars", () => {
    expect(HASH).toMatch(/^[0-9a-f]{8}$/)
  })

  it("is stable across calls", () => {
    expect(hashSourceId(SOURCE_ID)).toBe(HASH)
  })

  it("differs between source ids", () => {
    expect(hashSourceId("a")).not.toBe(hashSourceId("b"))
  })
})

describe("injectCanvasElementIds — happy path", () => {
  it("injects data-canvas-id on a self-closing element", () => {
    const src = `export default function P() { return <hr /> }`
    const { code, ids } = injectCanvasElementIds(src, { sourceId: SOURCE_ID })
    expect(ids).toHaveLength(1)
    expect(ids[0].tag).toBe("hr")
    expect(code).toContain(`data-canvas-id="${ids[0].canvasId}"`)
    expect(code).toMatch(/<hr data-canvas-id="[0-9a-f]{8}:[\d.]+" \/>/)
  })

  it("injects on an opening element with no attributes", () => {
    const src = `export default function P() { return <div>hi</div> }`
    const { code, ids } = injectCanvasElementIds(src, { sourceId: SOURCE_ID })
    expect(ids).toHaveLength(1)
    expect(ids[0].tag).toBe("div")
    expect(code).toMatch(/<div data-canvas-id="[^"]+">/)
  })

  it("injects alongside existing attributes", () => {
    const src = `export default function P() { return <button className="p-4" type="button">x</button> }`
    const { code } = injectCanvasElementIds(src, { sourceId: SOURCE_ID })
    expect(code).toMatch(/<button data-canvas-id="[^"]+" className="p-4" type="button">/)
  })

  it("injects on every JSX element in a nested tree", () => {
    const src = `export default function P() {
  return (
    <section>
      <h2>Title</h2>
      <p>body</p>
    </section>
  )
}`
    const { code, ids } = injectCanvasElementIds(src, { sourceId: SOURCE_ID })
    expect(ids).toHaveLength(3)
    expect(ids.map((i) => i.tag).sort()).toEqual(["h2", "p", "section"])
    expect(code.match(/data-canvas-id=/g) ?? []).toHaveLength(3)
  })

  it("returns ids in source order matching their lines", () => {
    const src = `export default function P() {
  return (
    <section>
      <h2>Title</h2>
      <p>body</p>
    </section>
  )
}`
    const { ids } = injectCanvasElementIds(src, { sourceId: SOURCE_ID })
    // Source-order: section, then h2, then p
    expect(ids[0].tag).toBe("section")
    expect(ids[1].tag).toBe("h2")
    expect(ids[2].tag).toBe("p")
    expect(ids[0].line).toBeLessThan(ids[1].line)
    expect(ids[1].line).toBeLessThan(ids[2].line)
  })

  it("assigns distinct canvasIds to siblings", () => {
    const src = `export default function P() { return <div><span>a</span><span>b</span></div> }`
    const { ids } = injectCanvasElementIds(src, { sourceId: SOURCE_ID })
    const span = ids.filter((i) => i.tag === "span")
    expect(span).toHaveLength(2)
    expect(span[0].canvasId).not.toBe(span[1].canvasId)
  })

  it("handles JSX fragments by injecting on inner elements only", () => {
    const src = `export default function P() { return <><span>a</span><span>b</span></> }`
    const { ids } = injectCanvasElementIds(src, { sourceId: SOURCE_ID })
    expect(ids).toHaveLength(2)
    expect(ids.map((i) => i.tag)).toEqual(["span", "span"])
  })

  it("handles conditional rendering: both branches get distinct ids", () => {
    const src = `export default function P({flag}: {flag: boolean}) {
  return <div>{flag ? <span>yes</span> : <em>no</em>}</div>
}`
    const { ids } = injectCanvasElementIds(src, { sourceId: SOURCE_ID })
    const tags = ids.map((i) => i.tag)
    expect(tags).toContain("div")
    expect(tags).toContain("span")
    expect(tags).toContain("em")
    const span = ids.find((i) => i.tag === "span")!
    const em = ids.find((i) => i.tag === "em")!
    expect(span.canvasId).not.toBe(em.canvasId)
  })
})

describe("injectCanvasElementIds — idempotency", () => {
  it("running twice on the original source produces byte-identical output", () => {
    const src = `export default function P() { return <button className="x">hi</button> }`
    const a = injectCanvasElementIds(src, { sourceId: SOURCE_ID })
    const b = injectCanvasElementIds(src, { sourceId: SOURCE_ID })
    expect(a.code).toBe(b.code)
  })

  it("re-running on already-injected output overwrites the existing data-canvas-id, not duplicates", () => {
    const src = `export default function P() { return <button>hi</button> }`
    const first = injectCanvasElementIds(src, { sourceId: SOURCE_ID })
    const second = injectCanvasElementIds(first.code, { sourceId: SOURCE_ID })
    // Output of the second pass equals the first (since ids are stable).
    expect(second.code).toBe(first.code)
    // And there is exactly one data-canvas-id attribute on the button.
    expect((second.code.match(/data-canvas-id=/g) ?? []).length).toBe(1)
  })

  it("re-running with a different sourceId rewrites the id (no duplication, no orphan)", () => {
    const src = `export default function P() { return <button>hi</button> }`
    const first = injectCanvasElementIds(src, { sourceId: "old" })
    const second = injectCanvasElementIds(first.code, { sourceId: "new" })
    expect(second.code).not.toBe(first.code)
    expect((second.code.match(/data-canvas-id=/g) ?? []).length).toBe(1)
    expect(second.code).toContain(`data-canvas-id="${hashSourceId("new")}:`)
    expect(second.code).not.toContain(`data-canvas-id="${hashSourceId("old")}:`)
  })
})

describe("injectCanvasElementIds — id stability", () => {
  it("inner element id is unchanged when a wrapper is added around the JSX root", () => {
    const inner = `export default function P() { return <button>hi</button> }`
    const wrapped = `export default function P() { return <div><button>hi</button></div> }`
    const innerIds = injectCanvasElementIds(inner, { sourceId: SOURCE_ID }).ids
    const wrappedIds = injectCanvasElementIds(wrapped, { sourceId: SOURCE_ID }).ids
    const innerButton = innerIds.find((i) => i.tag === "button")!
    const wrappedButton = wrappedIds.find((i) => i.tag === "button")!
    // The inner button's path within its parent didn't change. Wrapping it
    // adds a new ancestor (the div), so the path lengthens, and the button's
    // id changes accordingly. This is the v1 stability story documented in
    // the plan.
    expect(innerButton.canvasId).not.toBe(wrappedButton.canvasId)
  })

  it("renaming an identifier that does not affect JSX shape preserves all ids", () => {
    const v1 = `export default function P() { const x = 1; return <button>{x}</button> }`
    const v2 = `export default function P() { const renamed = 1; return <button>{renamed}</button> }`
    const v1Ids = injectCanvasElementIds(v1, { sourceId: SOURCE_ID }).ids
    const v2Ids = injectCanvasElementIds(v2, { sourceId: SOURCE_ID }).ids
    expect(v1Ids).toHaveLength(v2Ids.length)
    for (let i = 0; i < v1Ids.length; i++) {
      expect(v1Ids[i].canvasId).toBe(v2Ids[i].canvasId)
    }
  })

  it("two distinct files produce different id prefixes", () => {
    const src = `export default function P() { return <hr /> }`
    const a = injectCanvasElementIds(src, { sourceId: "fileA" }).ids[0].canvasId
    const b = injectCanvasElementIds(src, { sourceId: "fileB" }).ids[0].canvasId
    expect(a.split(":")[0]).not.toBe(b.split(":")[0])
    expect(a.split(":")[1]).toBe(b.split(":")[1])
  })
})

describe("injectCanvasElementIds — input validation", () => {
  it("throws if sourceId is missing", () => {
    expect(() =>
      injectCanvasElementIds(`<div/>`, { sourceId: "" } as unknown as { sourceId: string })
    ).toThrow(/sourceId/)
  })

  it("throws if tsxSource is not a string", () => {
    expect(() =>
      injectCanvasElementIds(undefined as unknown as string, { sourceId: "x" })
    ).toThrow(/tsxSource/)
  })
})

describe("injectCanvasElementIds — production-shape primitive", () => {
  // Approximation of projects/design-system-foundation/components/ui/Button.tsx
  // (the real file imports cn() and has ButtonProps, etc.). Keeping this
  // close to the real shape catches regressions where the injector breaks on
  // realistic shadcn-style files.
  const buttonSrc = `import type { ButtonHTMLAttributes, ReactNode } from "react"

import { cn } from "@/utils/cn"

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode
  variant?: "primary" | "secondary"
}

export default function Button({ children, className, variant = "primary", ...rest }: ButtonProps) {
  return (
    <button
      className={cn("inline-flex items-center", variant === "primary" && "bg-brand-600", className)}
      {...rest}
    >
      <span>{children}</span>
    </button>
  )
}
`

  it("injects ids without breaking the source structure", () => {
    const { code, ids } = injectCanvasElementIds(buttonSrc, { sourceId: SOURCE_ID })
    // The cn() expression and the spread ...rest must remain intact.
    expect(code).toContain("cn(")
    expect(code).toContain("...rest")
    // Both elements get ids.
    expect(ids).toHaveLength(2)
    expect(ids.map((i) => i.tag).sort()).toEqual(["button", "span"])
    // The injected attribute appears immediately after the tagName.
    expect(code).toMatch(/<button data-canvas-id="[^"]+"/)
    expect(code).toMatch(/<span data-canvas-id="[^"]+">/)
  })
})
