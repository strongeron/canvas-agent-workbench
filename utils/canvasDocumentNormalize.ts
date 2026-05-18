// Document -> fragment + scoped-CSS normalizer (Unit U9).
//
// Deterministically turns a full `<!doctype html>` working source (what
// `buildNativeComponentShell` emits) into an importable component fragment plus
// a slug-scoped sibling CSS. This is the precondition for clean-export,
// inline-embed, and HTML->TSX (R8, R13).
//
// PURE JS. `utils/**/*.ts` is shared/client code: the client-import guard
// (eslint.config.js) forbids Node builtins here. `parse5` is a normal
// dependency and is the blessed HTML tree library (mirrors
// `utils/canvasHtmlEditor.ts`). The CSS side is a small, self-contained,
// deterministic string scoper — no third-party CSS engine — so the module
// never reaches a Node builtin even transitively, and identical input always
// yields byte-identical output (no time/random/iteration-order
// nondeterminism). One-way only: a fragment is never parsed back to a
// document.

import * as parse5 from "parse5"

type HtmlNode = parse5.DefaultTreeAdapterMap["node"]
type HtmlElement = parse5.DefaultTreeAdapterMap["element"]
type HtmlChildNode = parse5.DefaultTreeAdapterMap["childNode"]
type HtmlParentNode = parse5.DefaultTreeAdapterMap["parentNode"]

/**
 * Typed, deterministic error thrown when a document cannot be normalized
 * (no `<body>`, malformed input). The caller (Sync) aborts the whole
 * selection on this — it is never a silent empty result.
 */
export class CanvasDocumentNormalizeError extends Error {
  readonly code: "no-body" | "parse-error" | "bad-input"

  constructor(code: "no-body" | "parse-error" | "bad-input", message: string) {
    super(message)
    this.name = "CanvasDocumentNormalizeError"
    this.code = code
  }
}

export interface NormalizeDocumentInput {
  sourceHtml: string
  /** Single path-segment-safe slug; becomes the `[data-component="<slug>"]` wrapper. */
  slug: string
}

export interface NormalizedDocument {
  /** `<body>` inner HTML; the root element carries `data-component="<slug>"`. */
  fragmentHtml: string
  /** All document `<style>` rules, scoped under `[data-component="<slug>"]`. Empty string when there were no styles. */
  css: string
  slug: string
}

export interface ComposedPage {
  /** Concatenated child fragments, each wrapped under its own `data-component`. */
  fragmentHtml: string
  /** Per-child-scoped CSS concatenated; each child's rules sit under its own wrapper so scoped CSS cannot collide. */
  css: string
}

// Authoring attributes stripped from the published fragment. EXPLICIT denylist
// only — no broad `data-*` removal. `data-component`, ARIA (`aria-*`, `role`),
// and all semantic attributes are preserved. Mirrors the shipped `data-slot*`
// model and the `data-canvas-id` strip in `extractHtmlSubtree`.
const STRIPPED_EXACT_ATTRS = new Set([
  "data-slot",
  "data-slot-kind",
  "data-slot-accepts",
])
const STRIPPED_PREFIXES = ["data-canvas-"]

function isElementNode(node: HtmlNode): node is HtmlElement {
  return "tagName" in node && typeof node.tagName === "string"
}

function hasChildNodes(node: HtmlNode): node is HtmlParentNode {
  return "childNodes" in node && Array.isArray(node.childNodes)
}

function getTextNodeValue(node: HtmlNode): string {
  return "value" in node && typeof node.value === "string" ? node.value : ""
}

function findFirstElement(root: HtmlNode, tagName: string): HtmlElement | null {
  if (isElementNode(root) && root.tagName === tagName) return root
  if (!hasChildNodes(root)) return null
  for (const child of root.childNodes) {
    const found = findFirstElement(child, tagName)
    if (found) return found
  }
  return null
}

function collectStyleText(root: HtmlNode, sink: string[]): void {
  if (isElementNode(root) && root.tagName === "style") {
    const text = (root.childNodes ?? [])
      .filter((child) => child.nodeName === "#text")
      .map(getTextNodeValue)
      .join("")
    sink.push(text)
    return
  }
  if (!hasChildNodes(root)) return
  for (const child of root.childNodes) collectStyleText(child, sink)
}

function isStrippedAttr(name: string): boolean {
  if (STRIPPED_EXACT_ATTRS.has(name)) return true
  return STRIPPED_PREFIXES.some((prefix) => name.startsWith(prefix))
}

function stripAuthoringAttributes(node: HtmlChildNode): void {
  if (isElementNode(node)) {
    node.attrs = node.attrs.filter((attr) => !isStrippedAttr(attr.name))
  }
  if (hasChildNodes(node)) {
    for (const child of node.childNodes) stripAuthoringAttributes(child)
  }
}

function getAttribute(element: HtmlElement, name: string): string | null {
  const attr = element.attrs.find((entry) => entry.name === name)
  return attr?.value ?? null
}

function setAttribute(element: HtmlElement, name: string, value: string): void {
  const existing = element.attrs.find((attr) => attr.name === name)
  if (existing) {
    existing.value = value
    return
  }
  element.attrs.push({ name, value })
}

function validateSlug(slug: unknown): string {
  if (typeof slug !== "string" || slug.trim() === "") {
    throw new CanvasDocumentNormalizeError("bad-input", "slug must be a non-empty string")
  }
  // Single path segment guard, mirroring the create-endpoint slug rule.
  if (
    slug.includes("/") ||
    slug.includes("\\") ||
    slug.includes("..") ||
    slug.includes("\0") ||
    slug.startsWith(".") ||
    !/^[A-Za-z0-9._-]+$/.test(slug)
  ) {
    throw new CanvasDocumentNormalizeError(
      "bad-input",
      `slug must be a safe single path segment: ${JSON.stringify(slug)}`
    )
  }
  return slug
}

// --- CSS scoping --------------------------------------------------------
//
// A small, deterministic, self-contained CSS rule splitter. It is NOT a full
// CSS parser; it only needs to handle what `buildNativeComponentShell` emits
// plus the deferred edge rules (`@media`, `@keyframes`, `@font-face`,
// `@supports`, `:root`, `body`, `*`, bare tags). It preserves rule bodies
// verbatim and only rewrites selectors, so output stays readable (no
// minification — explicit scope boundary).

interface CssBlock {
  /** Selector or at-rule prelude (everything before `{`). */
  prelude: string
  /** Raw inner text between the matching braces. */
  body: string
}

/**
 * Split CSS into top-level brace-balanced blocks. Skips strings and comments
 * so braces inside them never break balance. Deterministic: single pass,
 * preserves source order.
 */
function splitCssBlocks(css: string): CssBlock[] {
  const blocks: CssBlock[] = []
  let i = 0
  let prelude = ""
  const n = css.length

  while (i < n) {
    const ch = css[i]

    // Comment.
    if (ch === "/" && css[i + 1] === "*") {
      const end = css.indexOf("*/", i + 2)
      const stop = end === -1 ? n : end + 2
      prelude += css.slice(i, stop)
      i = stop
      continue
    }

    // String literal in a prelude (e.g. attribute selector value).
    if (ch === '"' || ch === "'") {
      const quote = ch
      let j = i + 1
      while (j < n && css[j] !== quote) {
        if (css[j] === "\\") j++
        j++
      }
      prelude += css.slice(i, Math.min(j + 1, n))
      i = j + 1
      continue
    }

    if (ch === "{") {
      // Read a brace-balanced body.
      let depth = 1
      let j = i + 1
      while (j < n && depth > 0) {
        const c = css[j]
        if (c === "/" && css[j + 1] === "*") {
          const end = css.indexOf("*/", j + 2)
          j = end === -1 ? n : end + 2
          continue
        }
        if (c === '"' || c === "'") {
          const quote = c
          j++
          while (j < n && css[j] !== quote) {
            if (css[j] === "\\") j++
            j++
          }
          j++
          continue
        }
        if (c === "{") depth++
        else if (c === "}") depth--
        if (depth === 0) break
        j++
      }
      blocks.push({ prelude: prelude.trim(), body: css.slice(i + 1, j) })
      prelude = ""
      i = j + 1
      continue
    }

    // A stray `}` at top level (malformed) — drop and reset.
    if (ch === "}") {
      prelude = ""
      i++
      continue
    }

    prelude += ch
    i++
  }
  return blocks
}

/**
 * Split a selector list on top-level commas only (commas inside `:not(...)`,
 * `[attr=","]`, etc. must not split). Deterministic single-pass walk.
 */
function splitSelectors(selectorList: string): string[] {
  const out: string[] = []
  let depth = 0
  let buf = ""
  for (let i = 0; i < selectorList.length; i++) {
    const ch = selectorList[i]
    if (ch === "(" || ch === "[") depth++
    else if (ch === ")" || ch === "]") depth--
    if (ch === "," && depth === 0) {
      out.push(buf)
      buf = ""
      continue
    }
    buf += ch
  }
  out.push(buf)
  return out
}

/**
 * Rewrite a single selector so it targets the wrapper or its descendants.
 * `body`/`:root`/`html` collapse to the wrapper itself; `*`, bare tags,
 * classes, ids and everything else become descendants of the wrapper. Never
 * global.
 */
function scopeSingleSelector(selector: string, wrapper: string): string {
  if (selector === "") return ""

  // Whole-document anchors collapse onto the wrapper itself.
  if (selector === "html" || selector === ":root" || selector === "body") {
    return wrapper
  }
  if (selector === "*") {
    // Universal becomes "any descendant of the wrapper", not global.
    return `${wrapper} *`
  }

  // Leading `html `/`body `/`:root ` prefixes are redundant once scoped.
  const stripped = selector.replace(/^\s*(?:html|body|:root)\b\s*(?:>\s*)?/i, "")
  const target = stripped.trim()
  if (target === "") return wrapper
  return `${wrapper} ${target}`
}

/** Names of at-rules whose inner content must NOT be selector-scoped. */
const PASSTHROUGH_AT_RULES = new Set([
  "keyframes",
  "-webkit-keyframes",
  "-moz-keyframes",
  "-o-keyframes",
  "font-face",
  "page",
  "charset",
  "import",
  "namespace",
])

/** At-rules that wrap nested style rules which DO need scoping. */
const CONDITIONAL_AT_RULES = new Set([
  "media",
  "supports",
  "container",
  "layer",
  "scope",
])

function atRuleName(prelude: string): string {
  const match = /^@([A-Za-z-]+)/.exec(prelude)
  return match ? match[1].toLowerCase() : ""
}

function scopeCssText(css: string, wrapper: string): string {
  const blocks = splitCssBlocks(css)
  const out: string[] = []

  for (const block of blocks) {
    if (block.prelude === "") continue

    if (block.prelude.startsWith("@")) {
      const name = atRuleName(block.prelude)
      if (PASSTHROUGH_AT_RULES.has(name)) {
        // Names / font-faces / keyframe stops stay global and verbatim.
        out.push(`${block.prelude} {${block.body}}`)
        continue
      }
      if (CONDITIONAL_AT_RULES.has(name)) {
        const inner = scopeCssText(block.body, wrapper).trim()
        out.push(`${block.prelude} {\n${indent(inner)}\n}`)
        continue
      }
      // Unknown at-rule: keep prelude, scope inner if it has nested rules.
      if (block.body.includes("{")) {
        const inner = scopeCssText(block.body, wrapper).trim()
        out.push(`${block.prelude} {\n${indent(inner)}\n}`)
      } else {
        out.push(`${block.prelude} {${block.body}}`)
      }
      continue
    }

    // A normal style rule. Scope its selector list, keep the body verbatim.
    const scopedSelector = splitSelectors(block.prelude)
      .map((selector) => scopeSingleSelector(selector.trim(), wrapper))
      .filter((selector) => selector !== "")
      .join(",\n")
    if (scopedSelector === "") continue
    out.push(`${scopedSelector} {${block.body}}`)
  }

  return out.join("\n\n")
}

function indent(text: string): string {
  return text
    .split("\n")
    .map((line) => (line === "" ? line : `  ${line}`))
    .join("\n")
}

// --- Public API ---------------------------------------------------------

/**
 * Normalize a full `<!doctype html>` document into an importable fragment plus
 * slug-scoped sibling CSS. Deterministic and one-way.
 *
 * @throws {CanvasDocumentNormalizeError} on bad input, parse failure, or a
 *   document with no `<body>`. Never returns a silent empty result for those.
 */
export function normalizeDocument(input: NormalizeDocumentInput): NormalizedDocument {
  if (!input || typeof input !== "object") {
    throw new CanvasDocumentNormalizeError("bad-input", "input object is required")
  }
  if (typeof input.sourceHtml !== "string" || input.sourceHtml.trim() === "") {
    throw new CanvasDocumentNormalizeError("bad-input", "sourceHtml must be a non-empty string")
  }
  const slug = validateSlug(input.slug)

  let document: HtmlNode
  try {
    document = parse5.parse(input.sourceHtml) as unknown as HtmlNode
  } catch (error) {
    throw new CanvasDocumentNormalizeError(
      "parse-error",
      error instanceof Error ? error.message : "Failed to parse document HTML."
    )
  }

  const body = findFirstElement(document, "body")
  // parse5.parse always synthesizes <html><head><body> for HTML-ish input, so
  // a genuinely absent <body> only happens on non-HTML / structurally broken
  // input. Treat "body with no element content" as the malformed signal too,
  // since a working shell always has a root element.
  if (!body || !hasChildNodes(body)) {
    throw new CanvasDocumentNormalizeError(
      "no-body",
      "Document has no <body> — cannot extract a component fragment."
    )
  }

  const bodyElementChildren = (body.childNodes ?? []).filter(isElementNode)
  if (bodyElementChildren.length === 0) {
    throw new CanvasDocumentNormalizeError(
      "no-body",
      "Document <body> has no element content — nothing to normalize."
    )
  }

  // Collect every document <style> (head or body) in source order.
  const styleTexts: string[] = []
  collectStyleText(document, styleTexts)

  // Build the fragment: strip authoring attrs from all body children, then
  // tag the root element(s) with the wrapper attribute. A single root carries
  // it directly; multiple roots are each tagged so a sibling-root shell still
  // scopes correctly.
  const wrapper = `[data-component="${slug}"]`
  for (const child of body.childNodes ?? []) {
    stripAuthoringAttributes(child)
  }
  for (const element of bodyElementChildren) {
    if (getAttribute(element, "data-component") === null) {
      setAttribute(element, "data-component", slug)
    }
  }

  const fragmentHtml = parse5
    .serialize({
      nodeName: "#document-fragment",
      childNodes: body.childNodes,
    } as HtmlParentNode)
    .trim()

  const mergedCss = styleTexts.join("\n").trim()
  const css = mergedCss === "" ? "" : scopeCssText(mergedCss, wrapper).trim()

  return { fragmentHtml, css, slug }
}

/**
 * Compose multiple already-normalized children into one page fragment plus
 * concatenated per-child-scoped CSS. Each child keeps its own
 * `data-component="<childSlug>"` wrapper so scoped CSS cannot collide across
 * children (the P0 inline-embed collision case). Deterministic: preserves the
 * input order and joins verbatim.
 */
export function composeNormalizedPage(children: NormalizedDocument[]): ComposedPage {
  if (!Array.isArray(children)) {
    throw new CanvasDocumentNormalizeError("bad-input", "children must be an array")
  }
  const fragmentHtml = children.map((child) => child.fragmentHtml).join("\n")
  const css = children
    .map((child) => child.css)
    .filter((cssText) => cssText !== "")
    .join("\n\n")
  return { fragmentHtml, css }
}
