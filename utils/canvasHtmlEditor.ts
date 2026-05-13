import * as parse5 from "parse5"

import { hashSourceId } from "./canvasAstPath"
import { buildBridgeScript } from "./canvasReactNodeBridge"
import type { CanvasAstMutation } from "./canvasAstWriter"

type HtmlNode = parse5.DefaultTreeAdapterMap["node"]
type HtmlElement = parse5.DefaultTreeAdapterMap["element"]
type HtmlChildNode = parse5.DefaultTreeAdapterMap["childNode"]
type HtmlParentNode = parse5.DefaultTreeAdapterMap["parentNode"]

export type CanvasHtmlMutation =
  | CanvasAstMutation
  | { type: "setTextContent"; value: string }
  | { type: "setAttribute"; attrName: string; value: string | number | boolean | null }

export interface CanvasHtmlIdInfo {
  canvasId: string
  tag: string
  path: string
}

export interface CanvasHtmlInjectResult {
  html: string
  ids: CanvasHtmlIdInfo[]
}

export interface CanvasHtmlAttributeInfo {
  name: string
  kind: "literal-string"
  value: string
  rawValue: string
  editableInV1: boolean
  editableInV2: boolean
}

export interface CanvasHtmlNodeInfo {
  canvasId: string
  tag: string
  isHostElement: boolean
  attributes: CanvasHtmlAttributeInfo[]
  className: string
  textContent: string
  textChildren: string
  hasElementChildren: boolean
  hasNonTextChildren: boolean
  editableInV1: boolean
  editableInV2: boolean
  reasonNotEditable?: string
}

export type CanvasHtmlReadResult = CanvasHtmlNodeInfo | { error: string }

export type CanvasHtmlWriteResult =
  | {
      ok: true
      source: string
      appliedMutations: number
      canvasIdMap?: Record<string, string | null>
      prevSourceSnapshot?: string
    }
  | {
      ok: false
      error: string
      code:
        | "bad-input"
        | "not-found"
        | "unsupported-node"
        | "unsupported-mutation"
        | "unsupported-expression"
        | "overlap"
        | "parse-error"
    }

interface Replacement {
  start: number
  end: number
  text: string
}

export function injectCanvasHtmlElementIds(
  sourceHtml: string,
  options: { sourceId: string; injectBridge?: boolean }
): CanvasHtmlInjectResult {
  const fragment = parseHtmlFragment(sourceHtml, false)
  const ids: CanvasHtmlIdInfo[] = []
  const sourceHash = hashSourceId(options.sourceId)

  walkElementChildren(fragment, "", (element, path) => {
    const canvasId = `${sourceHash}:${path}`
    setParse5Attribute(element, "data-canvas-id", canvasId)
    ids.push({ canvasId, tag: element.tagName, path })
  })

  let html = parse5.serialize(fragment)
  if (options.injectBridge !== false) {
    html = appendBridgeToHtml(html, options.sourceId)
  }
  return { html, ids }
}

export function readCanvasHtmlNode(
  sourceHtml: string,
  canvasId: string,
  options: { sourceId: string }
): CanvasHtmlReadResult {
  const resolved = resolveCanvasHtmlElement(sourceHtml, canvasId, options)
  if (!resolved.ok) return { error: resolved.error }
  const element = resolved.element
  const attributes = element.attrs
    .filter((attr) => attr.name !== "data-canvas-id")
    .map((attr) => ({
      name: attr.name,
      kind: "literal-string" as const,
      value: attr.value,
      rawValue: `"${attr.value}"`,
      editableInV1: true,
      editableInV2: true,
    }))
  const elementChildren = getMeaningfulChildren(element).filter(isElementNode)
  const textContent = elementChildren.length === 0 ? getDirectTextContent(element).trim() : ""
  return {
    canvasId,
    tag: element.tagName,
    isHostElement: true,
    attributes,
    className: getParse5Attribute(element, "class") ?? "",
    textContent,
    textChildren: textContent,
    hasElementChildren: elementChildren.length > 0,
    hasNonTextChildren: elementChildren.length > 0,
    editableInV1: true,
    editableInV2: true,
  }
}

export function writeCanvasHtmlNode(
  sourceHtml: string,
  canvasId: string,
  mutations: CanvasHtmlMutation[],
  options: { sourceId: string }
): CanvasHtmlWriteResult {
  if (typeof sourceHtml !== "string") {
    return { ok: false, code: "bad-input", error: "sourceHtml must be a string" }
  }
  if (!options || typeof options.sourceId !== "string" || !options.sourceId) {
    return { ok: false, code: "bad-input", error: "sourceId is required" }
  }
  if (typeof canvasId !== "string" || !canvasId.includes(":")) {
    return { ok: false, code: "bad-input", error: "Malformed canvasId — expected `<sourceIdHash>:<htmlPath>`" }
  }
  if (!Array.isArray(mutations) || mutations.length === 0) {
    return { ok: false, code: "bad-input", error: "At least one mutation is required" }
  }

  const resolved = resolveCanvasHtmlElement(sourceHtml, canvasId, options)
  if (!resolved.ok) return resolved

  const replacements: Replacement[] = []
  for (const mutation of mutations) {
    const next = buildHtmlReplacement(sourceHtml, resolved.element, mutation)
    if (!next.ok) return next
    if (next.replacement) replacements.push(next.replacement)
  }

  const overlap = findOverlap(replacements)
  if (overlap) {
    return {
      ok: false,
      code: "overlap",
      error: `Mutations overlap between source ranges ${overlap[0].start}-${overlap[0].end} and ${overlap[1].start}-${overlap[1].end}`,
    }
  }

  return {
    ok: true,
    source: applyReplacements(sourceHtml, replacements),
    appliedMutations: replacements.length,
    canvasIdMap: {},
    prevSourceSnapshot: sourceHtml,
  }
}

function resolveCanvasHtmlElement(
  sourceHtml: string,
  canvasId: string,
  options: { sourceId: string }
):
  | { ok: true; element: HtmlElement }
  | Extract<CanvasHtmlWriteResult, { ok: false }> {
  let fragment: HtmlParentNode
  try {
    fragment = parseHtmlFragment(sourceHtml, true)
  } catch (error) {
    return {
      ok: false,
      code: "parse-error",
      error: error instanceof Error ? error.message : "Failed to parse HTML.",
    }
  }

  const expectedPrefix = hashSourceId(options.sourceId)
  const colonIdx = canvasId.indexOf(":")
  const prefix = canvasId.slice(0, colonIdx)
  const path = canvasId.slice(colonIdx + 1)
  if (prefix !== expectedPrefix) {
    return { ok: false, code: "not-found", error: "canvasId source hash does not match sourceId" }
  }
  const node = resolveHtmlPath(fragment, path)
  if (!node) {
    return { ok: false, code: "not-found", error: "canvasId did not resolve to an HTML element" }
  }
  if (!isElementNode(node)) {
    return { ok: false, code: "unsupported-node", error: "Resolved node is not an HTML element" }
  }
  if (!node.sourceCodeLocation) {
    return { ok: false, code: "unsupported-node", error: "Resolved element has no source location" }
  }
  return { ok: true, element: node }
}

function buildHtmlReplacement(
  sourceHtml: string,
  element: HtmlElement,
  mutation: CanvasHtmlMutation
): { ok: true; replacement: Replacement | null } | Extract<CanvasHtmlWriteResult, { ok: false }> {
  if (mutation.type === "setTextChild" || mutation.type === "setTextContent") {
    const value = mutation.value
    const location = element.sourceCodeLocation
    if (!location?.startTag || !location.endTag) {
      return {
        ok: false,
        code: "unsupported-mutation",
        error: "Text edits require an element with explicit opening and closing tags",
      }
    }
    const elementChildren = getMeaningfulChildren(element).filter(isElementNode)
    if (elementChildren.length > 0) {
      return {
        ok: false,
        code: "unsupported-expression",
        error: "Text edits are only supported for elements without element children",
      }
    }
    const current = sourceHtml.slice(location.startTag.endOffset, location.endTag.startOffset)
    const next = escapeHtmlText(String(value))
    if (current === next) return { ok: true, replacement: null }
    return {
      ok: true,
      replacement: {
        start: location.startTag.endOffset,
        end: location.endTag.startOffset,
        text: next,
      },
    }
  }

  if (mutation.type === "setClassName") {
    return replaceHtmlAttribute(sourceHtml, element, "class", mutation.value)
  }

  if (mutation.type === "setPropValue") {
    if (!mutation.propName || mutation.propName === "data-canvas-id") {
      return { ok: false, code: "bad-input", error: "A mutable propName is required" }
    }
    return replaceHtmlAttribute(sourceHtml, element, mutation.propName, mutation.value)
  }

  if (mutation.type === "setAttribute") {
    if (!mutation.attrName || mutation.attrName === "data-canvas-id") {
      return { ok: false, code: "bad-input", error: "A mutable attrName is required" }
    }
    return replaceHtmlAttribute(sourceHtml, element, mutation.attrName, mutation.value)
  }

  return { ok: false, code: "unsupported-mutation", error: "Unsupported HTML mutation type" }
}

function replaceHtmlAttribute(
  sourceHtml: string,
  element: HtmlElement,
  attrName: string,
  rawValue: string | number | boolean | null
): { ok: true; replacement: Replacement | null } | Extract<CanvasHtmlWriteResult, { ok: false }> {
  const name = attrName.toLowerCase()
  const location = element.sourceCodeLocation
  if (!location?.startTag) {
    return {
      ok: false,
      code: "unsupported-mutation",
      error: "Attribute edits require an element start tag with source location",
    }
  }

  const attrs = location.attrs ?? {}
  const existing = getParse5Attribute(element, name)
  if (rawValue === null) {
    const attrLocation = attrs[name]
    if (!attrLocation) return { ok: true, replacement: null }
    return {
      ok: true,
      replacement: {
        start: trimLeadingAttributeWhitespace(sourceHtml, attrLocation.startOffset),
        end: attrLocation.endOffset,
        text: "",
      },
    }
  }

  const value = String(rawValue)
  if (existing === value) return { ok: true, replacement: null }
  const rendered = `${name}="${escapeHtmlAttribute(value)}"`
  const attrLocation = attrs[name]
  if (attrLocation) {
    return {
      ok: true,
      replacement: {
        start: attrLocation.startOffset,
        end: attrLocation.endOffset,
        text: rendered,
      },
    }
  }

  const insertAt = location.startTag.endOffset - (sourceHtml[location.startTag.endOffset - 2] === "/" ? 2 : 1)
  return {
    ok: true,
    replacement: {
      start: insertAt,
      end: insertAt,
      text: ` ${rendered}`,
    },
  }
}

function parseHtmlFragment(sourceHtml: string, sourceCodeLocationInfo: boolean): HtmlParentNode {
  return parse5.parseFragment(sourceHtml, { sourceCodeLocationInfo }) as HtmlParentNode
}

function resolveHtmlPath(root: HtmlParentNode, path: string): HtmlChildNode | null {
  if (!path) return null
  const parts = path.split(".")
  let current: HtmlParentNode = root
  for (let i = 0; i < parts.length; i++) {
    const target = Number.parseInt(parts[i], 10)
    if (!Number.isInteger(target) || target < 0) return null
    const children = getMeaningfulChildren(current)
    const child = children[target]
    if (!child) return null
    if (i === parts.length - 1) return child
    if (!hasChildNodes(child)) return null
    current = child
  }
  return null
}

function walkElementChildren(
  parent: HtmlParentNode,
  parentPath: string,
  visitor: (element: HtmlElement, path: string) => void
): void {
  getMeaningfulChildren(parent).forEach((child, index) => {
    const childPath = parentPath ? `${parentPath}.${index}` : `${index}`
    if (!isElementNode(child)) return
    visitor(child, childPath)
    walkElementChildren(child, childPath, visitor)
  })
}

function getMeaningfulChildren(parent: HtmlParentNode): HtmlChildNode[] {
  return (parent.childNodes ?? []).filter((child) => {
    return !(child.nodeName === "#text" && getTextNodeValue(child).trim() === "")
  })
}

function getDirectTextContent(parent: HtmlParentNode): string {
  return (parent.childNodes ?? [])
    .filter((child) => child.nodeName === "#text")
    .map(getTextNodeValue)
    .join("")
}

function getTextNodeValue(node: HtmlNode): string {
  return "value" in node && typeof node.value === "string" ? node.value : ""
}

function isElementNode(node: HtmlNode): node is HtmlElement {
  return "tagName" in node && typeof node.tagName === "string"
}

function hasChildNodes(node: HtmlNode): node is HtmlParentNode {
  return "childNodes" in node && Array.isArray(node.childNodes)
}

function setParse5Attribute(element: HtmlElement, name: string, value: string): void {
  const existing = element.attrs.find((attr) => attr.name === name)
  if (existing) {
    existing.value = value
    return
  }
  element.attrs.push({ name, value })
}

function getParse5Attribute(element: HtmlElement, name: string): string | null {
  const attr = element.attrs.find((entry) => entry.name === name)
  return attr?.value ?? null
}

function appendBridgeToHtml(html: string, sourceId: string): string {
  const bridge = buildBridgeScript(sourceId)
  if (/<\/body\s*>/i.test(html)) {
    return html.replace(/<\/body\s*>/i, `${bridge}</body>`)
  }
  return `${html}${bridge}`
}

function trimLeadingAttributeWhitespace(source: string, start: number): number {
  let next = start
  while (next > 0 && /[ \t\r\n]/.test(source[next - 1])) next--
  return next
}

function findOverlap(replacements: Replacement[]): [Replacement, Replacement] | null {
  const sorted = [...replacements].sort((a, b) => a.start - b.start)
  for (let index = 1; index < sorted.length; index++) {
    const previous = sorted[index - 1]
    const current = sorted[index]
    if (current.start < previous.end) return [previous, current]
  }
  return null
}

function applyReplacements(source: string, replacements: Replacement[]): string {
  return [...replacements]
    .sort((a, b) => b.start - a.start)
    .reduce((next, replacement) => {
      return `${next.slice(0, replacement.start)}${replacement.text}${next.slice(replacement.end)}`
    }, source)
}

export type CanvasHtmlExtractResult =
  | { ok: true; subtreeHtml: string; tag: string }
  | {
      ok: false
      error: string
      code:
        | "bad-input"
        | "not-found"
        | "unsupported-node"
        | "unsupported-mutation"
        | "unsupported-expression"
        | "overlap"
        | "parse-error"
    }

/**
 * Extract a JSX-style subtree from an HTML source by canvasId. Returns the
 * cleaned HTML for the matching element (with `data-canvas-id` attributes
 * stripped recursively). Used by the promote-to-component flow.
 */
export function extractHtmlSubtree(
  sourceHtml: string,
  canvasId: string,
  options: { sourceId: string }
): CanvasHtmlExtractResult {
  if (typeof sourceHtml !== "string") {
    return { ok: false, code: "bad-input", error: "sourceHtml must be a string" }
  }
  if (!options || typeof options.sourceId !== "string" || !options.sourceId) {
    return { ok: false, code: "bad-input", error: "sourceId is required" }
  }
  if (typeof canvasId !== "string" || !canvasId.includes(":")) {
    return { ok: false, code: "bad-input", error: "Malformed canvasId" }
  }

  const resolved = resolveCanvasHtmlElement(sourceHtml, canvasId, options)
  if (!resolved.ok) return resolved

  // Walk the matched element and remove data-canvas-id from itself and all
  // descendants so the extracted subtree is portable.
  stripCanvasIdAttribute(resolved.element)

  const subtreeHtml = parse5.serialize({
    nodeName: "#document-fragment",
    childNodes: [resolved.element],
  } as HtmlParentNode)

  return { ok: true, subtreeHtml: subtreeHtml.trim(), tag: resolved.element.tagName }
}

function stripCanvasIdAttribute(element: HtmlElement): void {
  element.attrs = element.attrs.filter((attr) => attr.name !== "data-canvas-id")
  for (const child of element.childNodes) {
    if (isElementNode(child)) stripCanvasIdAttribute(child)
  }
}

function escapeHtmlText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;")
}

function escapeHtmlAttribute(value: string): string {
  return escapeHtmlText(value).replace(/"/g, "&quot;")
}
