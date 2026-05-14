// Structural TSX mutations via offset-based string surgery.
//
// Mirrors the design of canvasAstWriter (literal mutations): take the source
// string, find the target ts.Node by canvasId, compute a {start, end, text}
// replacement, apply it. The AST is never reprinted, so trivia outside the
// splice point is byte-identical to the original.
//
// canvasIdMap construction: after the splice, re-parse the new source and
// pair each JSX element in the OLD AST with its counterpart in the NEW AST
// by source position (with offset delta accounting for the splice). Elements
// inside the spliced range map to null.
//
// Slice 1 ships removeJsxNode. Subsequent slices add insertChild,
// reorderSibling, wrapSelection, unwrap, swapTag — each composes the same
// position-arithmetic helpers.

import * as ts from "typescript"

import {
  buildAstPathMap,
  findNodeByCanvasId,
  hashSourceId,
  parseTsxSource,
} from "./canvasAstPath"

export type CanvasStructuralWriteResult =
  | {
      ok: true
      source: string
      /** Map from every JSX element's old canvasId to its new canvasId, or null if removed. */
      canvasIdMap: Record<string, string | null>
    }
  | {
      ok: false
      error: string
      code: "bad-input" | "not-found" | "unsupported-node" | "parse-error"
    }

type JsxExpressionNode = ts.JsxElement | ts.JsxSelfClosingElement | ts.JsxFragment
type StructuralReorderDirection = "up" | "down"
type RebasedRange = {
  oldStart: number
  oldEnd: number
  newStart: number
}
const JSX_TAG_NAME_RE = /^[A-Za-z][A-Za-z0-9_.-]*$/

export function removeJsxNode(
  tsxSource: string,
  canvasId: string,
  options: { sourceId: string }
): CanvasStructuralWriteResult {
  if (!canvasId) {
    return { ok: false, code: "bad-input", error: "canvasId is required" }
  }

  const oldSourceFile = parseTsxSource(tsxSource)
  const target = findNodeByCanvasId(oldSourceFile, canvasId, { sourceId: options.sourceId })
  if (!target) {
    return { ok: false, code: "not-found", error: "canvasId did not resolve to a node" }
  }
  // We accept the opening-element node (which is what canvasIds typically
  // reference) and walk up to the JSX element wrapper. Self-closing elements
  // are removed directly.
  const element = resolveRemovableJsxElement(target)
  if (!element) {
    return {
      ok: false,
      code: "unsupported-node",
      error: "canvasId did not resolve to a JSX element that can be removed",
    }
  }

  const start = element.getStart(oldSourceFile)
  const end = element.getEnd()
  const newSource = `${tsxSource.slice(0, start)}${tsxSource.slice(end)}`

  const canvasIdMap = buildJsxCanvasIdMap(oldSourceFile, newSource, {
    sourceId: options.sourceId,
    spliceStart: start,
    spliceEnd: end,
    spliceReplacementLength: 0,
  })

  return { ok: true, source: newSource, canvasIdMap }
}

export function insertJsxChild(
  tsxSource: string,
  parentCanvasId: string,
  position: number,
  childSource: string,
  options: { sourceId: string }
): CanvasStructuralWriteResult {
  if (!parentCanvasId) {
    return { ok: false, code: "bad-input", error: "parentCanvasId is required" }
  }
  if (!Number.isInteger(position) || position < 0) {
    return { ok: false, code: "bad-input", error: "position must be a non-negative integer" }
  }
  const trimmedChild = childSource.trim()
  if (!trimmedChild) {
    return { ok: false, code: "bad-input", error: "childSource must not be empty" }
  }
  // Parse-validate childSource as exactly one JSX expression. Parsing it as
  // the initializer directly rejects sibling runs like
  // `<A /><B />` and non-JSX expressions like `hello`.
  const validatedChild = parseSingleJsxExpression(trimmedChild)
  if (!validatedChild.ok) {
    return validatedChild.error
  }

  const oldSourceFile = parseTsxSource(tsxSource)
  const target = findNodeByCanvasId(oldSourceFile, parentCanvasId, { sourceId: options.sourceId })
  if (!target) {
    return { ok: false, code: "not-found", error: "parentCanvasId did not resolve to a node" }
  }
  const parent = resolveJsxElement(target)
  if (!parent || !ts.isJsxElement(parent)) {
    return {
      ok: false,
      code: "unsupported-node",
      error: "parentCanvasId must resolve to a JSX element (not self-closing or fragment)",
    }
  }

  // Existing JSX children excluding whitespace-only JsxText nodes — those
  // are formatting artifacts; we slot the new element between rendered
  // elements rather than between whitespace runs.
  const renderedChildren = parent.children.filter(
    (c) => !(ts.isJsxText(c) && c.text.trim() === "")
  )
  if (position > renderedChildren.length) {
    return { ok: false, code: "bad-input", error: "position is out of range for the parent's children" }
  }

  const { indent: parentIndent, inline } = readChildIndent(tsxSource, parent, oldSourceFile)
  const childWithIndent = inline ? trimmedChild : applyIndent(trimmedChild, parentIndent)

  let insertionOffset: number
  if (renderedChildren.length === 0) {
    // Empty parent — insert just after the opening tag.
    insertionOffset = parent.openingElement.getEnd()
  } else if (position === renderedChildren.length) {
    // Append after the last child.
    insertionOffset = renderedChildren[renderedChildren.length - 1].getEnd()
  } else {
    // Insert before the child currently at this position.
    insertionOffset = renderedChildren[position].getStart(oldSourceFile)
  }

  let insertedText: string
  if (renderedChildren.length === 0) {
    insertedText = inline
      ? trimmedChild
      : `\n${parentIndent}${childWithIndent}\n${parentIndent.slice(0, -2)}`
  } else if (inline) {
    // Parent's content is laid out on the same line as its opening tag
    // (e.g. <button>Click</button>). Splice inline without injecting
    // newlines or "indent" — that would produce a duplicate opening tag
    // because readChildIndent's per-line slice picks up the parent's tag.
    insertedText = trimmedChild
  } else if (position === renderedChildren.length) {
    insertedText = `\n${parentIndent}${childWithIndent}`
  } else {
    insertedText = `${childWithIndent}\n${parentIndent}`
  }

  const newSource = `${tsxSource.slice(0, insertionOffset)}${insertedText}${tsxSource.slice(insertionOffset)}`

  const canvasIdMap = buildJsxCanvasIdMap(oldSourceFile, newSource, {
    sourceId: options.sourceId,
    spliceStart: insertionOffset,
    spliceEnd: insertionOffset,
    spliceReplacementLength: insertedText.length,
  })

  return { ok: true, source: newSource, canvasIdMap }
}

export function reorderJsxSibling(
  tsxSource: string,
  canvasId: string,
  direction: StructuralReorderDirection,
  options: { sourceId: string }
): CanvasStructuralWriteResult {
  if (!canvasId) {
    return { ok: false, code: "bad-input", error: "canvasId is required" }
  }
  if (direction !== "up" && direction !== "down") {
    return { ok: false, code: "bad-input", error: "direction must be 'up' or 'down'" }
  }

  const oldSourceFile = parseTsxSource(tsxSource)
  const targetNode = findNodeByCanvasId(oldSourceFile, canvasId, { sourceId: options.sourceId })
  if (!targetNode) {
    return { ok: false, code: "not-found", error: "canvasId did not resolve to a node" }
  }
  const target = resolveJsxElement(targetNode)
  if (!target) {
    return {
      ok: false,
      code: "unsupported-node",
      error: "canvasId did not resolve to a JSX element that can be reordered",
    }
  }
  const parent = target.parent
  if (!parent || (!ts.isJsxElement(parent) && !ts.isJsxFragment(parent))) {
    return {
      ok: false,
      code: "unsupported-node",
      error: "selected JSX element does not have a JSX parent that supports sibling reorder",
    }
  }

  const renderedChildren = parent.children.filter(
    (child) => !(ts.isJsxText(child) && child.text.trim() === "")
  )
  const targetIndex = renderedChildren.findIndex((child) => child === target)
  if (targetIndex < 0) {
    return {
      ok: false,
      code: "unsupported-node",
      error: "selected JSX element did not resolve to a reorderable rendered child",
    }
  }

  const neighborIndex = direction === "up" ? targetIndex - 1 : targetIndex + 1
  if (neighborIndex < 0 || neighborIndex >= renderedChildren.length) {
    return {
      ok: false,
      code: "bad-input",
      error: "direction moves the node out of range for its rendered siblings",
    }
  }

  const first = renderedChildren[Math.min(targetIndex, neighborIndex)]
  const second = renderedChildren[Math.max(targetIndex, neighborIndex)]
  const firstStart = first.getStart(oldSourceFile)
  const firstEnd = first.getEnd()
  const secondStart = second.getStart(oldSourceFile)
  const secondEnd = second.getEnd()
  const firstText = tsxSource.slice(firstStart, firstEnd)
  const betweenText = tsxSource.slice(firstEnd, secondStart)
  const secondText = tsxSource.slice(secondStart, secondEnd)
  const replacementText = `${secondText}${betweenText}${firstText}`
  const newSource = `${tsxSource.slice(0, firstStart)}${replacementText}${tsxSource.slice(secondEnd)}`

  const canvasIdMap = buildJsxCanvasIdMap(oldSourceFile, newSource, {
    sourceId: options.sourceId,
    spliceStart: firstStart,
    spliceEnd: secondEnd,
    spliceReplacementLength: replacementText.length,
    rebasedRanges: [
      {
        oldStart: firstStart,
        oldEnd: firstEnd,
        newStart: firstStart + secondText.length + betweenText.length,
      },
      {
        oldStart: secondStart,
        oldEnd: secondEnd,
        newStart: firstStart,
      },
    ],
  })

  return { ok: true, source: newSource, canvasIdMap }
}

export function wrapJsxNode(
  tsxSource: string,
  canvasId: string,
  wrapperTag: string,
  options: { sourceId: string }
): CanvasStructuralWriteResult {
  if (!canvasId) {
    return { ok: false, code: "bad-input", error: "canvasId is required" }
  }
  if (!JSX_TAG_NAME_RE.test(wrapperTag)) {
    return { ok: false, code: "bad-input", error: "wrapperTag must be a valid JSX tag name" }
  }

  const oldSourceFile = parseTsxSource(tsxSource)
  const targetNode = findNodeByCanvasId(oldSourceFile, canvasId, { sourceId: options.sourceId })
  if (!targetNode) {
    return { ok: false, code: "not-found", error: "canvasId did not resolve to a node" }
  }
  const target = resolveJsxElement(targetNode)
  if (!target) {
    return {
      ok: false,
      code: "unsupported-node",
      error: "canvasId did not resolve to a JSX element that can be wrapped",
    }
  }

  const start = target.getStart(oldSourceFile)
  const end = target.getEnd()
  const targetText = tsxSource.slice(start, end)
  const openingText = `<${wrapperTag}>`
  const closingText = `</${wrapperTag}>`
  const replacementText = `${openingText}${targetText}${closingText}`
  const newSource = `${tsxSource.slice(0, start)}${replacementText}${tsxSource.slice(end)}`

  const canvasIdMap = buildJsxCanvasIdMap(oldSourceFile, newSource, {
    sourceId: options.sourceId,
    spliceStart: start,
    spliceEnd: end,
    spliceReplacementLength: replacementText.length,
    rebasedRanges: [
      {
        oldStart: start,
        oldEnd: end,
        newStart: start + openingText.length,
      },
    ],
  })

  return { ok: true, source: newSource, canvasIdMap }
}

export function unwrapJsxNode(
  tsxSource: string,
  canvasId: string,
  options: { sourceId: string }
): CanvasStructuralWriteResult {
  if (!canvasId) {
    return { ok: false, code: "bad-input", error: "canvasId is required" }
  }

  const oldSourceFile = parseTsxSource(tsxSource)
  const targetNode = findNodeByCanvasId(oldSourceFile, canvasId, { sourceId: options.sourceId })
  if (!targetNode) {
    return { ok: false, code: "not-found", error: "canvasId did not resolve to a node" }
  }
  const target = resolveJsxElement(targetNode)
  if (!target || !ts.isJsxElement(target)) {
    return {
      ok: false,
      code: "unsupported-node",
      error: "canvasId must resolve to a non-self-closing JSX element to unwrap",
    }
  }

  const start = target.getStart(oldSourceFile)
  const end = target.getEnd()
  const innerStart = target.openingElement.getEnd()
  const innerEnd = target.closingElement.getStart(oldSourceFile)
  const replacementText = tsxSource.slice(innerStart, innerEnd)
  const newSource = `${tsxSource.slice(0, start)}${replacementText}${tsxSource.slice(end)}`

  const canvasIdMap = buildJsxCanvasIdMap(oldSourceFile, newSource, {
    sourceId: options.sourceId,
    spliceStart: start,
    spliceEnd: end,
    spliceReplacementLength: replacementText.length,
    rebasedRanges: [
      {
        oldStart: innerStart,
        oldEnd: innerEnd,
        newStart: start,
      },
    ],
  })

  return { ok: true, source: newSource, canvasIdMap }
}

export function swapJsxTag(
  tsxSource: string,
  canvasId: string,
  newTag: string,
  options: { sourceId: string }
): CanvasStructuralWriteResult {
  if (!canvasId) {
    return { ok: false, code: "bad-input", error: "canvasId is required" }
  }
  if (!JSX_TAG_NAME_RE.test(newTag)) {
    return { ok: false, code: "bad-input", error: "newTag must be a valid JSX tag name" }
  }

  const oldSourceFile = parseTsxSource(tsxSource)
  const targetNode = findNodeByCanvasId(oldSourceFile, canvasId, { sourceId: options.sourceId })
  if (!targetNode) {
    return { ok: false, code: "not-found", error: "canvasId did not resolve to a node" }
  }
  const target = resolveJsxElement(targetNode)
  if (!target) {
    return {
      ok: false,
      code: "unsupported-node",
      error: "canvasId did not resolve to a JSX element that can swap tags",
    }
  }

  if (ts.isJsxSelfClosingElement(target)) {
    const start = target.tagName.getStart(oldSourceFile)
    const end = target.tagName.getEnd()
    const newSource = `${tsxSource.slice(0, start)}${newTag}${tsxSource.slice(end)}`
    const canvasIdMap = buildJsxCanvasIdMap(oldSourceFile, newSource, {
      sourceId: options.sourceId,
      spliceStart: start,
      spliceEnd: end,
      spliceReplacementLength: newTag.length,
    })
    return { ok: true, source: newSource, canvasIdMap }
  }

  const openingStart = target.openingElement.tagName.getStart(oldSourceFile)
  const openingEnd = target.openingElement.tagName.getEnd()
  const closingStart = target.closingElement.tagName.getStart(oldSourceFile)
  const closingEnd = target.closingElement.tagName.getEnd()
  const replacementText = `${newTag}${tsxSource.slice(openingEnd, closingStart)}${newTag}`
  const newSource = `${tsxSource.slice(0, openingStart)}${replacementText}${tsxSource.slice(closingEnd)}`
  const openingDelta = newTag.length - (openingEnd - openingStart)
  const canvasIdMap = buildJsxCanvasIdMap(oldSourceFile, newSource, {
    sourceId: options.sourceId,
    spliceStart: openingStart,
    spliceEnd: closingEnd,
    spliceReplacementLength: replacementText.length,
    rebasedRanges: [
      {
        oldStart: openingEnd,
        oldEnd: closingStart,
        newStart: openingEnd + openingDelta,
      },
    ],
  })

  return { ok: true, source: newSource, canvasIdMap }
}

function parseSingleJsxExpression(
  childSource: string
): { ok: true; node: JsxExpressionNode } | { ok: false; error: Extract<CanvasStructuralWriteResult, { ok: false }> } {
  const probe = ts.createSourceFile(
    "probe.tsx",
    `const __probe = (${childSource});`,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ false,
    ts.ScriptKind.TSX
  )
  if ((probe as unknown as { parseDiagnostics: ts.Diagnostic[] }).parseDiagnostics?.length > 0) {
    return { ok: false, error: { ok: false, code: "parse-error", error: "childSource does not parse as JSX" } }
  }

  const statement = probe.statements[0]
  if (!statement || !ts.isVariableStatement(statement)) {
    return { ok: false, error: { ok: false, code: "parse-error", error: "childSource must be a single JSX expression" } }
  }
  const declaration = statement.declarationList.declarations[0]
  if (!declaration?.initializer) {
    return { ok: false, error: { ok: false, code: "parse-error", error: "childSource must be a single JSX expression" } }
  }

  let expression: ts.Expression = declaration.initializer
  while (ts.isParenthesizedExpression(expression)) {
    expression = expression.expression
  }

  if (
    ts.isJsxElement(expression) ||
    ts.isJsxSelfClosingElement(expression) ||
    ts.isJsxFragment(expression)
  ) {
    return { ok: true, node: expression }
  }

  return { ok: false, error: { ok: false, code: "parse-error", error: "childSource must be a single JSX expression" } }
}

function resolveJsxElement(node: ts.Node): ts.JsxElement | ts.JsxSelfClosingElement | null {
  if (ts.isJsxOpeningElement(node) && node.parent && ts.isJsxElement(node.parent)) {
    return node.parent
  }
  if (ts.isJsxSelfClosingElement(node)) return node
  if (ts.isJsxElement(node)) return node
  return null
}

function readChildIndent(
  source: string,
  parent: ts.JsxElement,
  sourceFile: ts.SourceFile
): { indent: string; inline: boolean } {
  // Look at the first rendered child. If it sits on the same source line as
  // the opening tag's end (`<button>Click...`), the parent is laid out
  // inline — the per-line indent slice would include the opening tag and
  // re-injecting it as "indent" duplicates the tag. Signal that to the
  // caller so the splice stays single-line.
  const rendered = parent.children.find(
    (c) => !(ts.isJsxText(c) && c.text.trim() === "")
  )
  if (rendered) {
    const openingEnd = parent.openingElement.getEnd()
    const childStart = rendered.getStart(sourceFile)
    const openingLine = ts.getLineAndCharacterOfPosition(sourceFile, openingEnd - 1).line
    const childLine = ts.getLineAndCharacterOfPosition(sourceFile, childStart).line
    if (openingLine === childLine) {
      return { indent: "", inline: true }
    }
    const lineStart = source.lastIndexOf("\n", childStart - 1) + 1
    return { indent: source.slice(lineStart, childStart), inline: false }
  }
  // Empty parent — derive indent from the opening tag's line + 2 spaces
  // (matches the dominant project style for block layouts). If the parent's
  // opening and closing tags sit on the same line (single-line empty
  // element), keep insertions inline so we don't reformat the surrounding
  // source.
  const openingStart = parent.openingElement.getStart(sourceFile)
  const openingLine = ts.getLineAndCharacterOfPosition(sourceFile, openingStart).line
  if (parent.closingElement) {
    const closingLine = ts.getLineAndCharacterOfPosition(
      sourceFile,
      parent.closingElement.getStart(sourceFile)
    ).line
    if (openingLine === closingLine) {
      return { indent: "", inline: true }
    }
  }
  const lineStart = source.lastIndexOf("\n", openingStart - 1) + 1
  return { indent: source.slice(lineStart, openingStart) + "  ", inline: false }
}

function applyIndent(text: string, indent: string): string {
  const lines = text.split("\n")
  if (lines.length <= 1) return text
  return [lines[0], ...lines.slice(1).map((line) => (line ? `${indent}${line}` : line))].join("\n")
}

function resolveRemovableJsxElement(node: ts.Node): ts.JsxElement | ts.JsxSelfClosingElement | null {
  // canvasIds typically reference the JsxOpeningElement; walk up to the
  // enclosing JsxElement so the splice covers both opening and closing tags.
  if (ts.isJsxOpeningElement(node) && node.parent && ts.isJsxElement(node.parent)) {
    return node.parent
  }
  if (ts.isJsxSelfClosingElement(node)) return node
  if (ts.isJsxElement(node)) return node
  return null
}

/**
 * For every JSX element in the OLD AST, compute its OLD canvasId and its NEW
 * canvasId (or null if the element falls inside the spliced range).
 *
 * Position-arithmetic strategy:
 * - If oldStart < spliceStart, the element's source position is unchanged
 *   → look up the matching node in the new AST by walking to that position.
 * - If oldStart >= spliceEnd, the position shifted by
 *   (spliceReplacementLength - (spliceEnd - spliceStart)) bytes
 *   → look up the matching node in the new AST at the adjusted position.
 * - If spliceStart <= oldStart < spliceEnd, the element was removed
 *   → map to null.
 */
function buildJsxCanvasIdMap(
  oldSourceFile: ts.SourceFile,
  newSource: string,
  options: {
    sourceId: string
    spliceStart: number
    spliceEnd: number
    spliceReplacementLength: number
    rebasedRanges?: RebasedRange[]
  }
): Record<string, string | null> {
  const prefix = hashSourceId(options.sourceId)
  const oldPathMap = buildAstPathMap(oldSourceFile)
  const map: Record<string, string | null> = {}

  const newSourceFile = parseTsxSource(newSource)
  const newPathMap = buildAstPathMap(newSourceFile)
  const newJsxByStart = new Map<number, ts.Node>()
  collectJsxOpenings(newSourceFile, (node) => {
    newJsxByStart.set(node.getStart(newSourceFile), node)
  })

  const sliceLength = options.spliceEnd - options.spliceStart
  const positionDelta = options.spliceReplacementLength - sliceLength
  const rebasedRanges = options.rebasedRanges ?? []

  collectJsxOpenings(oldSourceFile, (oldOpening) => {
    const oldStart = oldOpening.getStart(oldSourceFile)
    const oldPath = oldPathMap.get(oldOpening)
    if (oldPath === undefined) return
    const oldId = `${prefix}:${oldPath}`

    const rebasedRange = rebasedRanges.find(
      (range) => oldStart >= range.oldStart && oldStart < range.oldEnd
    )
    if (rebasedRange) {
      const expectedNewStart = rebasedRange.newStart + (oldStart - rebasedRange.oldStart)
      const matchedNew = newJsxByStart.get(expectedNewStart)
      const newPath = matchedNew ? newPathMap.get(matchedNew) : undefined
      map[oldId] = newPath !== undefined ? `${prefix}:${newPath}` : null
      return
    }

    if (oldStart >= options.spliceStart && oldStart < options.spliceEnd) {
      map[oldId] = null
      return
    }

    const expectedNewStart =
      oldStart < options.spliceStart ? oldStart : oldStart + positionDelta
    const matchedNew = newJsxByStart.get(expectedNewStart)
    if (!matchedNew) {
      // Source position arithmetic failed — element exists in old AST but
      // not at the expected new position. Possible only if surgery removed
      // structure we didn't anticipate; signal as missing rather than guess.
      map[oldId] = null
      return
    }
    const newPath = newPathMap.get(matchedNew)
    map[oldId] = newPath !== undefined ? `${prefix}:${newPath}` : null
  })

  return map
}

function collectJsxOpenings(
  sourceFile: ts.SourceFile,
  visit: (node: ts.JsxOpeningElement | ts.JsxSelfClosingElement) => void
): void {
  function walk(node: ts.Node): void {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      visit(node)
    }
    ts.forEachChild(node, walk)
  }
  walk(sourceFile)
}
