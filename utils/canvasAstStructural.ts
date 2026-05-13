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
      code: "bad-input" | "not-found" | "unsupported-node"
    }

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

  collectJsxOpenings(oldSourceFile, (oldOpening) => {
    const oldStart = oldOpening.getStart(oldSourceFile)
    const oldPath = oldPathMap.get(oldOpening)
    if (oldPath === undefined) return
    const oldId = `${prefix}:${oldPath}`

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
