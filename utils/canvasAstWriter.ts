import * as ts from "typescript"

import { findNodeByCanvasId, parseTsxSource } from "./canvasAstPath"
import {
  type CanvasStructuralWriteResult,
  insertJsxChild,
  removeJsxNode,
  reorderJsxSibling,
  swapJsxTag,
  unwrapJsxNode,
  wrapJsxNode,
} from "./canvasAstStructural"

export type CanvasAstLiteralMutation =
  | { type: "setTextChild"; value: string }
  | { type: "setClassName"; value: string }
  | {
      type: "setPropValue"
      propName: string
      value: string | number | boolean
      valueKind?: "string" | "number" | "boolean" | "identifier"
    }

export type CanvasAstStructuralMutation =
  | { type: "insertChild"; parentCanvasId?: string; position: number; childSource: string }
  | { type: "removeNode"; canvasId?: string }
  | { type: "reorderSibling"; canvasId?: string; direction: "up" | "down" }
  | { type: "wrapSelection"; canvasId?: string; wrapperTag: string }
  | { type: "unwrap"; canvasId?: string }
  | { type: "swapTag"; canvasId?: string; newTag: string }

export type CanvasAstMutation = CanvasAstLiteralMutation | CanvasAstStructuralMutation

export type CanvasAstWriteResult =
  | {
      ok: true
      source: string
      appliedMutations: number
      canvasIdMap: Record<string, string | null>
      prevSourceSnapshot: string
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

export function writeCanvasAstNode(
  tsxSource: string,
  canvasId: string,
  mutations: CanvasAstMutation[],
  options: { sourceId: string }
): CanvasAstWriteResult {
  if (typeof tsxSource !== "string") {
    return { ok: false, code: "bad-input", error: "tsxSource must be a string" }
  }
  if (!options || typeof options.sourceId !== "string" || !options.sourceId) {
    return { ok: false, code: "bad-input", error: "sourceId is required" }
  }
  if (typeof canvasId !== "string" || !canvasId.includes(":")) {
    return { ok: false, code: "bad-input", error: "Malformed canvasId — expected `<sourceIdHash>:<astPath>`" }
  }
  if (!Array.isArray(mutations) || mutations.length === 0) {
    return { ok: false, code: "bad-input", error: "At least one mutation is required" }
  }

  if (mutations.some(isStructuralMutation)) {
    if (mutations.length !== 1) {
      return {
        ok: false,
        code: "unsupported-mutation",
        error: "Structural mutations must be applied one at a time",
      }
    }
    const structural = applyStructuralMutation(
      tsxSource,
      canvasId,
      mutations[0] as CanvasAstStructuralMutation,
      options
    )
    if (!structural.ok) return structural
    return {
      ok: true,
      source: structural.source,
      appliedMutations: structural.source === tsxSource ? 0 : 1,
      canvasIdMap: structural.canvasIdMap,
      prevSourceSnapshot: tsxSource,
    }
  }

  const sourceFile = parseTsxSource(tsxSource)
  const node = findNodeByCanvasId(sourceFile, canvasId, options)
  if (!node) {
    return {
      ok: false,
      code: "not-found",
      error: "canvasId did not resolve to a node — sourceId mismatch or stale id after edit",
    }
  }
  if (!ts.isJsxOpeningElement(node) && !ts.isJsxSelfClosingElement(node)) {
    return { ok: false, code: "unsupported-node", error: "Resolved node is not a JSX element" }
  }

  const replacements: Replacement[] = []
  for (const mutation of mutations) {
    const next = buildReplacement(sourceFile, node, mutation)
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

  const source = applyReplacements(tsxSource, replacements)
  return {
    ok: true,
    source,
    appliedMutations: replacements.length,
    canvasIdMap: {},
    prevSourceSnapshot: tsxSource,
  }
}

function buildReplacement(
  sourceFile: ts.SourceFile,
  node: ts.JsxOpeningElement | ts.JsxSelfClosingElement,
  mutation: CanvasAstMutation
): { ok: true; replacement: Replacement | null } | Extract<CanvasAstWriteResult, { ok: false }> {
  if (mutation.type === "setTextChild") {
    if (!ts.isJsxOpeningElement(node) || !node.parent || !ts.isJsxElement(node.parent)) {
      return {
        ok: false,
        code: "unsupported-mutation",
        error: "setTextChild requires a non-self-closing JSX element",
      }
    }
    const children = node.parent.children
    const hasNonTextChildren = children.some((child) => !ts.isJsxText(child))
    if (hasNonTextChildren) {
      return {
        ok: false,
        code: "unsupported-expression",
        error: "Text edits are only supported for elements with plain text children",
      }
    }
    let currentText = ""
    for (const child of children) {
      if (ts.isJsxText(child)) currentText += child.text
    }
    currentText = currentText.trim()
    if (currentText === mutation.value) return { ok: true, replacement: null }
    return {
      ok: true,
      replacement: {
        start: node.end,
        end: node.parent.closingElement.pos,
        text: escapeJsxText(mutation.value),
      },
    }
  }

  if (mutation.type === "setClassName") {
    const attr = findJsxAttribute(node, "className")
    if (!attr) {
      return insertStringAttribute(sourceFile, node, "className", mutation.value)
    }
    return replaceStringAttribute(sourceFile, attr, mutation.value, "className")
  }

  if (mutation.type === "setPropValue") {
    if (!mutation.propName || mutation.propName === "data-canvas-id") {
      return { ok: false, code: "bad-input", error: "A mutable propName is required" }
    }
    const attr = findJsxAttribute(node, mutation.propName)
    if (!attr) {
      return {
        ok: false,
        code: "unsupported-mutation",
        error: `Prop "${mutation.propName}" was not found on the selected element`,
      }
    }
    return replacePropAttribute(sourceFile, attr, mutation)
  }

  return { ok: false, code: "unsupported-mutation", error: "Unsupported mutation type" }
}

function isStructuralMutation(mutation: CanvasAstMutation): mutation is CanvasAstStructuralMutation {
  return (
    mutation.type === "insertChild" ||
    mutation.type === "removeNode" ||
    mutation.type === "reorderSibling" ||
    mutation.type === "wrapSelection" ||
    mutation.type === "unwrap" ||
    mutation.type === "swapTag"
  )
}

function applyStructuralMutation(
  tsxSource: string,
  fallbackCanvasId: string,
  mutation: CanvasAstStructuralMutation,
  options: { sourceId: string }
): CanvasStructuralWriteResult {
  if (mutation.type === "insertChild") {
    return insertJsxChild(
      tsxSource,
      mutation.parentCanvasId ?? fallbackCanvasId,
      mutation.position,
      mutation.childSource,
      options
    )
  }
  if (mutation.type === "removeNode") {
    return removeJsxNode(tsxSource, mutation.canvasId ?? fallbackCanvasId, options)
  }
  if (mutation.type === "reorderSibling") {
    return reorderJsxSibling(
      tsxSource,
      mutation.canvasId ?? fallbackCanvasId,
      mutation.direction,
      options
    )
  }
  if (mutation.type === "wrapSelection") {
    return wrapJsxNode(tsxSource, mutation.canvasId ?? fallbackCanvasId, mutation.wrapperTag, options)
  }
  if (mutation.type === "unwrap") {
    return unwrapJsxNode(tsxSource, mutation.canvasId ?? fallbackCanvasId, options)
  }
  return swapJsxTag(tsxSource, mutation.canvasId ?? fallbackCanvasId, mutation.newTag, options)
}

function findJsxAttribute(
  node: ts.JsxOpeningElement | ts.JsxSelfClosingElement,
  name: string
): ts.JsxAttribute | null {
  for (const attr of node.attributes.properties) {
    if (ts.isJsxAttribute(attr) && attr.name.getText() === name) return attr
  }
  return null
}

function replaceStringAttribute(
  sourceFile: ts.SourceFile,
  attr: ts.JsxAttribute,
  value: string,
  label: string
): { ok: true; replacement: Replacement | null } | Extract<CanvasAstWriteResult, { ok: false }> {
  const initializer = attr.initializer
  if (!initializer || !ts.isStringLiteral(initializer)) {
    return {
      ok: false,
      code: "unsupported-expression",
      error: `${label} edits require a string-literal attribute`,
    }
  }
  if (initializer.text === value) return { ok: true, replacement: null }
  return {
    ok: true,
    replacement: {
      start: initializer.getStart(sourceFile),
      end: initializer.getEnd(),
      text: `"${escapeJsxAttribute(value)}"`,
    },
  }
}

function insertStringAttribute(
  sourceFile: ts.SourceFile,
  node: ts.JsxOpeningElement | ts.JsxSelfClosingElement,
  attrName: string,
  value: string
): { ok: true; replacement: Replacement | null } {
  const insertAt = ts.isJsxSelfClosingElement(node) ? node.getEnd() - 2 : node.getEnd() - 1
  return {
    ok: true,
    replacement: {
      start: insertAt,
      end: insertAt,
      text: ` ${attrName}="${escapeJsxAttribute(value)}"`,
    },
  }
}

function replacePropAttribute(
  sourceFile: ts.SourceFile,
  attr: ts.JsxAttribute,
  mutation: Extract<CanvasAstMutation, { type: "setPropValue" }>
): { ok: true; replacement: Replacement | null } | Extract<CanvasAstWriteResult, { ok: false }> {
  const rendered = renderPropValue(mutation)
  if (!rendered.ok) return rendered

  const initializer = attr.initializer
  if (!initializer) {
    if (rendered.value === "true" && rendered.valueKind === "boolean") {
      return { ok: true, replacement: null }
    }
    return {
      ok: true,
      replacement: {
        start: attr.getStart(sourceFile),
        end: attr.getEnd(),
        text: `${attr.name.getText(sourceFile)}=${rendered.attributeText}`,
      },
    }
  }

  if (ts.isStringLiteral(initializer)) {
    if (rendered.valueKind !== "string") {
      return {
        ok: false,
        code: "unsupported-expression",
        error: `Prop "${attr.name.getText(sourceFile)}" is a string-literal attribute; set it with a string value`,
      }
    }
    if (initializer.text === rendered.value) return { ok: true, replacement: null }
    return {
      ok: true,
      replacement: {
        start: initializer.getStart(sourceFile),
        end: initializer.getEnd(),
        text: rendered.attributeText,
      },
    }
  }

  if (!ts.isJsxExpression(initializer) || !initializer.expression) {
    return {
      ok: false,
      code: "unsupported-expression",
      error: `Prop "${attr.name.getText(sourceFile)}" has an unsupported initializer`,
    }
  }

  const expr = initializer.expression
  if (!isSimpleExpression(expr)) {
    return {
      ok: false,
      code: "unsupported-expression",
      error: `Prop "${attr.name.getText(sourceFile)}" uses a computed expression; open source mode to edit it`,
    }
  }

  if (expr.getText(sourceFile) === rendered.value) return { ok: true, replacement: null }
  return {
    ok: true,
    replacement: {
      start: initializer.getStart(sourceFile),
      end: initializer.getEnd(),
      text: rendered.attributeText,
    },
  }
}

function renderPropValue(
  mutation: Extract<CanvasAstMutation, { type: "setPropValue" }>
):
  | { ok: true; value: string; valueKind: "string" | "number" | "boolean" | "identifier"; attributeText: string }
  | Extract<CanvasAstWriteResult, { ok: false }> {
  const valueKind = mutation.valueKind ?? inferValueKind(mutation.value)
  if (valueKind === "string") {
    const value = String(mutation.value)
    return { ok: true, value, valueKind, attributeText: `"${escapeJsxAttribute(value)}"` }
  }
  if (valueKind === "number") {
    const value = String(mutation.value)
    if (!/^-?(?:\d+|\d*\.\d+)$/.test(value)) {
      return { ok: false, code: "bad-input", error: `Invalid numeric prop value: ${value}` }
    }
    return { ok: true, value, valueKind, attributeText: `{${value}}` }
  }
  if (valueKind === "boolean") {
    const value = String(mutation.value)
    if (value !== "true" && value !== "false") {
      return { ok: false, code: "bad-input", error: `Invalid boolean prop value: ${value}` }
    }
    return { ok: true, value, valueKind, attributeText: `{${value}}` }
  }
  const value = String(mutation.value)
  if (!/^[A-Za-z_$][\w$]*$/.test(value)) {
    return { ok: false, code: "bad-input", error: `Invalid identifier prop value: ${value}` }
  }
  return { ok: true, value, valueKind, attributeText: `{${value}}` }
}

function inferValueKind(value: string | number | boolean): "string" | "number" | "boolean" {
  if (typeof value === "number") return "number"
  if (typeof value === "boolean") return "boolean"
  return "string"
}

function isSimpleExpression(node: ts.Expression): boolean {
  return (
    ts.isNumericLiteral(node) ||
    ts.isIdentifier(node) ||
    node.kind === ts.SyntaxKind.TrueKeyword ||
    node.kind === ts.SyntaxKind.FalseKeyword
  )
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

function escapeJsxText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/\{/g, "&#123;")
    .replace(/\}/g, "&#125;")
}

function escapeJsxAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/\{/g, "&#123;")
    .replace(/\}/g, "&#125;")
}
