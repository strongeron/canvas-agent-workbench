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

describe("canvasDocumentNormalize — P1 defect fixes", () => {
  it("(#1) a body <style> never leaks into the fragment; its rule appears scoped in css only", () => {
    const html = `<!doctype html><html><head></head><body><section class="x">hi</section><style>.x{color:red}</style></body></html>`
    const { fragmentHtml, css } = normalizeDocument({ sourceHtml: html, slug: "demo" })
    expect(fragmentHtml).not.toMatch(/<style[\s>]/i)
    expect(fragmentHtml).not.toContain("color:red")
    expect(css).toContain('[data-component="demo"] .x {color:red}')
    // Exactly one scoped rule — the body <style> contributed it once.
    expect(css.split("{").length - 1).toBe(1)
  })

  it("(#2) splitSelectors is quote-aware: a `]` `,` inside an attr value does not split", () => {
    const html = `<!doctype html><html><head><style>[data-x="]"] , .b { color:red }</style></head><body><div class="b" data-x="]">x</div></body></html>`
    const { css } = normalizeDocument({ sourceHtml: html, slug: "demo" })
    expect(css).toContain('[data-component="demo"] [data-x="]"]')
    expect(css).toContain('[data-component="demo"] .b')
    // Two scoped selectors, ONE rule body (the inner `]`/`,` did not split).
    expect(css.split("{").length - 1).toBe(1)
    const head = css.slice(0, css.indexOf("{"))
    expect(head.split(",\n").length).toBe(2)
  })

  it("(#3) a trailing backslash before the closing quote does not overrun into the next rule", () => {
    const html = `<!doctype html><html><head><style>.a[data-q="x\\\\"] { color:red } .survivor { color:blue }</style></head><body><div class="a">x</div><p class="survivor">y</p></body></html>`
    const { css } = normalizeDocument({ sourceHtml: html, slug: "demo" })
    // The rule after the escaped-quote selector survives (scanner bounded).
    // Body text is preserved verbatim, so match the selector head + the rule.
    expect(css).toContain('[data-component="demo"] .survivor {')
    expect(css).toContain("color:blue")
    expect(css.match(/\.survivor/g)?.length).toBe(1)
  })

  it("(#4) statement at-rules without a block are emitted verbatim, not glued onto the next rule", () => {
    const html = `<!doctype html><html><head><style>@import url("x.css"); .a{color:red}</style></head><body><div class="a">x</div></body></html>`
    const { css } = normalizeDocument({ sourceHtml: html, slug: "demo" })
    expect(css).toContain('@import url("x.css");')
    // @import emitted exactly once, verbatim, at the top.
    expect(css.indexOf('@import url("x.css");')).toBe(0)
    expect(css.match(/@import/g)?.length).toBe(1)
    // .a is correctly wrapper-scoped — NOT glued to @import, NOT global.
    expect(css).toContain('[data-component="demo"] .a {color:red}')
    expect(css).not.toMatch(/@import url\("x\.css"\);\s*\.a/)
  })

  it("(#4) @charset / @layer statement at-rules are preserved and the rule scopes", () => {
    const html = `<!doctype html><html><head><style>@charset "utf-8"; @layer a, b; .c{color:green}</style></head><body><div class="c">x</div></body></html>`
    const { css } = normalizeDocument({ sourceHtml: html, slug: "demo" })
    expect(css).toContain('@charset "utf-8";')
    expect(css).toContain("@layer a, b;")
    expect(css).toContain('[data-component="demo"] .c {color:green}')
  })

  it("(#5) leading body/html/:root with an attached qualifier keeps the qualifier; standalone collapses", () => {
    const html = `<!doctype html><html><head><style>body.theme-dark .x{color:red} body .y{margin:0} :root{--c:red}</style></head><body><div class="x">x</div><div class="y">y</div></body></html>`
    const { css } = normalizeDocument({ sourceHtml: html, slug: "slug" })
    // Qualifier preserved (body-state gate not dropped).
    expect(css).toContain('[data-component="slug"].theme-dark .x {color:red}')
    expect(css).not.toMatch(/\[data-component="slug"\] \.x \{color:red\}/)
    // Standalone body/:root collapse to the wrapper.
    expect(css).toContain('[data-component="slug"] .y {margin:0}')
    expect(css).toContain('[data-component="slug"] {--c:red}')
  })

  it("(#8) composeNormalizedPage rejects duplicate child slugs", () => {
    const src = `<!doctype html><html><head><style>section{color:red}</style></head><body><section>x</section></body></html>`
    const a = normalizeDocument({ sourceHtml: src, slug: "dup" })
    const b = normalizeDocument({ sourceHtml: src, slug: "dup" })
    expect(() => composeNormalizedPage([a, b])).toThrowError(
      CanvasDocumentNormalizeError
    )
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
