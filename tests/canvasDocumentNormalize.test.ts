import { describe, expect, it } from "vitest"

import {
  buildNativeComponentShell,
  NATIVE_COMPONENT_TEMPLATES,
} from "../utils/canvasNativeComponentShell"
import {
  CanvasDocumentNormalizeError,
  composeNormalizedPage,
  normalizeDocument,
} from "../utils/canvasDocumentNormalize"

describe("canvasDocumentNormalize — happy path against real U1 shells", () => {
  it("extracts only the <body> inner as the fragment (no html/head/doctype)", () => {
    const shell = buildNativeComponentShell("card", "Card")
    const { fragmentHtml, css } = normalizeDocument({
      sourceHtml: shell.sourceHtml,
      slug: "card",
    })

    expect(fragmentHtml).not.toMatch(/<!doctype/i)
    expect(fragmentHtml).not.toMatch(/<html[\s>]/i)
    expect(fragmentHtml).not.toMatch(/<head[\s>]/i)
    expect(fragmentHtml).not.toMatch(/<body[\s>]/i)
    expect(fragmentHtml).not.toMatch(/<style[\s>]/i)
    // The root element carries the wrapper attribute.
    expect(fragmentHtml).toMatch(/<article[^>]*data-component="card"/)
    // The shell <style> rules are present in the sibling css.
    expect(css).toContain("box-shadow")
    expect(css).toContain("border-radius")
    expect(css.length).toBeGreaterThan(0)
  })

  it("scopes every selector under [data-component=\"<slug>\"]", () => {
    const shell = buildNativeComponentShell("card", "Card")
    const { css } = normalizeDocument({ sourceHtml: shell.sourceHtml, slug: "card" })

    // Each scoped declaration block starts with the wrapper selector.
    const ruleHeads = css
      .split("}")
      .map((chunk) => chunk.trim())
      .filter((chunk) => chunk.includes("{"))
      .map((chunk) => chunk.slice(0, chunk.indexOf("{")).trim())

    expect(ruleHeads.length).toBeGreaterThan(0)
    for (const head of ruleHeads) {
      // Every comma-separated selector in the head is wrapper-anchored.
      for (const sel of head.split(",")) {
        expect(sel.trim().startsWith('[data-component="card"]')).toBe(true)
      }
    }
  })

  it("strips authoring attributes via the denylist but preserves data-component / semantic attrs", () => {
    const shell = buildNativeComponentShell("card", "Card")
    const { fragmentHtml } = normalizeDocument({
      sourceHtml: shell.sourceHtml,
      slug: "card",
    })

    expect(fragmentHtml).not.toContain("data-slot")
    expect(fragmentHtml).not.toContain("data-slot-kind")
    expect(fragmentHtml).not.toContain("data-slot-accepts")
    expect(fragmentHtml).not.toContain("data-canvas-")
    // Semantic + ARIA preserved.
    expect(fragmentHtml).toContain('href="#"')
    expect(fragmentHtml).toContain('aria-hidden="true"')
    expect(fragmentHtml).toContain('data-component="card"')
  })
})

describe("canvasDocumentNormalize — selector rewriting edges", () => {
  const doc = (style: string, body: string) =>
    `<!doctype html><html><head><style>${style}</style></head><body>${body}</body></html>`

  it("rewrites body{}, *{}, :root{} and bare tags under the wrapper, not global", () => {
    const html = doc(
      ":root{--c:red} body{margin:0} *{box-sizing:border-box} section{color:red}",
      `<section class="x">hi</section>`
    )
    const { css } = normalizeDocument({ sourceHtml: html, slug: "demo" })

    expect(css).toContain('[data-component="demo"] {--c:red}')
    expect(css).toContain('[data-component="demo"] {margin:0}')
    expect(css).toContain('[data-component="demo"] * {box-sizing:border-box}')
    expect(css).toContain('[data-component="demo"] section {color:red}')
    // Nothing global: no rule head equal to a bare tag/star/body.
    const heads = css.split("}").map((c) => c.split("{")[0].trim()).filter(Boolean)
    for (const head of heads) {
      expect(head.includes('[data-component="demo"]')).toBe(true)
    }
  })

  it("scopes comma-separated selector lists per selector", () => {
    const html = doc("h1, h2 .sub { color: blue }", "<h1>t</h1>")
    const { css } = normalizeDocument({ sourceHtml: html, slug: "demo" })
    expect(css).toContain('[data-component="demo"] h1')
    expect(css).toContain('[data-component="demo"] h2 .sub')
  })

  it("does not split selector commas inside :not()/[attr]", () => {
    const html = doc('a:not([href="x,y"]) { color: red }', '<a href="#">a</a>')
    const { css } = normalizeDocument({ sourceHtml: html, slug: "demo" })
    expect(css).toContain('[data-component="demo"] a:not([href="x,y"])')
    // exactly one scoped rule (not split into two by the inner comma)
    const ruleCount = css.split("{").length - 1
    expect(ruleCount).toBe(1)
  })
})

describe("canvasDocumentNormalize — multi-style, @media, @keyframes, @font-face", () => {
  it("merges multiple <style> blocks and scopes @media inner selectors", () => {
    const html = `<!doctype html><html><head>
      <style>body{margin:0}</style>
      <style>@media (max-width: 600px){ section{color:red} *{gap:0} }</style>
      </head><body><section>hi</section></body></html>`
    const { css } = normalizeDocument({ sourceHtml: html, slug: "demo" })

    expect(css).toContain('[data-component="demo"] {margin:0}')
    expect(css).toContain("@media (max-width: 600px)")
    expect(css).toContain('[data-component="demo"] section {color:red}')
    expect(css).toContain('[data-component="demo"] * {gap:0}')
  })

  it("passes @keyframes and @font-face through without scoping their inner selectors", () => {
    const html = `<!doctype html><html><head><style>
      @keyframes spin { from { opacity: 0 } to { opacity: 1 } }
      @font-face { font-family: "X"; src: url(x.woff2) }
      .a { animation: spin 1s }
      </style></head><body><div class="a">x</div></body></html>`
    const { css } = normalizeDocument({ sourceHtml: html, slug: "demo" })

    expect(css).toContain("@keyframes spin")
    // keyframe stops are NOT wrapper-scoped
    expect(css).not.toContain('[data-component="demo"] from')
    expect(css).not.toContain('[data-component="demo"] to')
    expect(css).toContain("@font-face")
    expect(css).toContain('font-family: "X"')
    expect(css).not.toContain('[data-component="demo"] {font-family')
    // the normal rule IS scoped
    expect(css).toContain('[data-component="demo"] .a {')
  })
})

describe("canvasDocumentNormalize — inline-embed collision (the P0 case)", () => {
  it("two children with identical bare section{} rules scope to distinct wrappers", () => {
    const sourceHtml = `<!doctype html><html><head><style>section{color:red;padding:1rem}</style></head><body><section>child</section></body></html>`

    const a = normalizeDocument({ sourceHtml, slug: "alpha" })
    const b = normalizeDocument({ sourceHtml, slug: "beta" })
    const page = composeNormalizedPage([a, b])

    expect(page.css).toContain('[data-component="alpha"] section {color:red;padding:1rem}')
    expect(page.css).toContain('[data-component="beta"] section {color:red;padding:1rem}')
    // No unscoped/global `section { ... }` survives to collide.
    expect(page.css).not.toMatch(/(^|\n)\s*section\s*\{/)
    // Both child fragments embedded with their own wrappers.
    expect(page.fragmentHtml).toContain('data-component="alpha"')
    expect(page.fragmentHtml).toContain('data-component="beta"')
  })
})

describe("canvasDocumentNormalize — no-style and determinism", () => {
  it("returns empty css (not an error) when there is no <style>", () => {
    const html = `<!doctype html><html><head></head><body><div>plain</div></body></html>`
    const result = normalizeDocument({ sourceHtml: html, slug: "demo" })
    expect(result.css).toBe("")
    expect(result.fragmentHtml).toContain('<div data-component="demo">plain</div>')
  })

  it("is deterministic: identical input -> byte-identical output across runs", () => {
    const shell = buildNativeComponentShell("section", "Section")
    const a = normalizeDocument({ sourceHtml: shell.sourceHtml, slug: "section" })
    const b = normalizeDocument({ sourceHtml: shell.sourceHtml, slug: "section" })
    expect(a.fragmentHtml).toBe(b.fragmentHtml)
    expect(a.css).toBe(b.css)
  })
})

describe("canvasDocumentNormalize — errors", () => {
  it("throws a typed deterministic error when there is no <body> content", () => {
    expect(() =>
      normalizeDocument({ sourceHtml: "not html at all", slug: "demo" })
    ).toThrowError(CanvasDocumentNormalizeError)

    try {
      normalizeDocument({ sourceHtml: "not html at all", slug: "demo" })
      throw new Error("expected throw")
    } catch (error) {
      expect(error).toBeInstanceOf(CanvasDocumentNormalizeError)
      expect((error as CanvasDocumentNormalizeError).code).toBe("no-body")
    }
  })

  it("throws on empty body element content", () => {
    const html = `<!doctype html><html><head></head><body>   </body></html>`
    expect(() => normalizeDocument({ sourceHtml: html, slug: "demo" })).toThrowError(
      CanvasDocumentNormalizeError
    )
  })

  it("throws bad-input on empty source or unsafe slug", () => {
    expect(() => normalizeDocument({ sourceHtml: "", slug: "demo" })).toThrowError(
      CanvasDocumentNormalizeError
    )
    const shell = buildNativeComponentShell("card", "Card")
    expect(() =>
      normalizeDocument({ sourceHtml: shell.sourceHtml, slug: "../escape" })
    ).toThrowError(CanvasDocumentNormalizeError)
    expect(() =>
      normalizeDocument({ sourceHtml: shell.sourceHtml, slug: "a/b" })
    ).toThrowError(CanvasDocumentNormalizeError)
  })
})

describe("canvasDocumentNormalize — coverage over every U1 template id", () => {
  const elementParts = [
    "div",
    "section",
    "header",
    "footer",
    "figure",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "p",
    "span",
    "ul",
    "ol",
    "li",
    "a",
    "button",
    "img",
    "svg",
    "video",
  ] as const

  const templateIds = NATIVE_COMPONENT_TEMPLATES.map((t) => t.id)
  const allIds = [...new Set([...templateIds, ...elementParts])]

  it.each(allIds)("normalizes the %s shell: non-empty fragment, deterministic, no throw", (id) => {
    const shell = buildNativeComponentShell(id, "Sample Title")
    const slug = String(id).replace(/[^A-Za-z0-9._-]/g, "-")

    const first = normalizeDocument({ sourceHtml: shell.sourceHtml, slug })
    const second = normalizeDocument({ sourceHtml: shell.sourceHtml, slug })

    expect(first.fragmentHtml.length).toBeGreaterThan(0)
    expect(first.fragmentHtml).not.toMatch(/<body[\s>]/i)
    expect(first.fragmentHtml).not.toMatch(/<style[\s>]/i)
    expect(first.fragmentHtml).toContain(`data-component="${slug}"`)
    expect(first.fragmentHtml).not.toContain("data-slot")
    // CSS, when present, is fully wrapper-scoped (no global leakage).
    if (first.css !== "") {
      const heads = first.css
        .split("}")
        .map((c) => c.split("{")[0].trim())
        .filter((c) => c !== "" && !c.startsWith("@"))
      for (const head of heads) {
        for (const sel of head.split(",")) {
          expect(sel.trim().startsWith(`[data-component="${slug}"]`)).toBe(true)
        }
      }
    }
    // Determinism.
    expect(second.fragmentHtml).toBe(first.fragmentHtml)
    expect(second.css).toBe(first.css)
  })
})
