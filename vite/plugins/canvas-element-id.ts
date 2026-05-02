/**
 * Injects stable `data-canvas-id` attributes into every JSX element in a TSX
 * source string. The id has the shape `<sourceIdHash>:<astPath>` where:
 *
 *   - `sourceIdHash` is the first 8 chars of sha1(sourceId). The caller picks
 *     `sourceId` — typically the repo-relative file path (for file-backed
 *     React preview nodes) or a canvas item id (for inline-only nodes).
 *   - `astPath` is a dot-separated sequence of child indexes from the source
 *     file root down to the JSX element, e.g. `0.1.2`. Stable under edits
 *     that don't change AST shape between root and JSX (e.g. renaming a
 *     variable, editing a className literal, swapping prop values).
 *
 * The injector is idempotent: existing `data-canvas-id` attributes are
 * overwritten in place rather than duplicated. Production builds never see
 * this plugin — it runs only when the canvas's compile-react endpoint
 * passes `sourceId` (which the canvas does, but production esbuild does
 * not).
 *
 * Used by U1 of docs/plans/2026-04-28-001-feat-canvas-figma-like-editing-plan.md.
 */

import * as ts from "typescript"
import { createHash } from "node:crypto"

export interface InjectCanvasElementIdsOptions {
  /** Stable identifier for this source. Hashed into the id prefix. */
  sourceId: string
}

export interface CanvasElementIdRecord {
  canvasId: string
  tag: string
  /** 0-based line number of the opening `<` in the original source. */
  line: number
  /** 0-based column of the opening `<` in the original source. */
  column: number
}

export interface InjectCanvasElementIdsResult {
  /** Modified TSX source with `data-canvas-id` attributes injected. */
  code: string
  /** Every JSX element that received an id, in source order. */
  ids: CanvasElementIdRecord[]
}

const SOURCE_ID_HASH_LEN = 8

export function hashSourceId(sourceId: string): string {
  return createHash("sha1").update(sourceId).digest("hex").slice(0, SOURCE_ID_HASH_LEN)
}

export function injectCanvasElementIds(
  tsxSource: string,
  options: InjectCanvasElementIdsOptions
): InjectCanvasElementIdsResult {
  if (typeof tsxSource !== "string") {
    throw new TypeError("injectCanvasElementIds: tsxSource must be a string")
  }
  if (!options || typeof options.sourceId !== "string" || !options.sourceId) {
    throw new TypeError("injectCanvasElementIds: options.sourceId is required")
  }

  const sourceFile = ts.createSourceFile(
    "input.tsx",
    tsxSource,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    ts.ScriptKind.TSX
  )
  const sourceIdHash = hashSourceId(options.sourceId)

  // Build a path map for every node we may visit. Path is a dot-separated
  // sequence of child indexes from the source file. The walk order matches
  // ts.forEachChild, which is deterministic.
  const pathMap = new WeakMap<ts.Node, string>()
  pathMap.set(sourceFile, "")

  function walk(parent: ts.Node, parentPath: string): void {
    let index = 0
    ts.forEachChild(parent, (child) => {
      const childPath = parentPath === "" ? `${index}` : `${parentPath}.${index}`
      pathMap.set(child, childPath)
      walk(child, childPath)
      index++
    })
  }
  walk(sourceFile, "")

  type Edit = { start: number; end: number; replacement: string }
  const edits: Edit[] = []
  const ids: CanvasElementIdRecord[] = []

  function visit(node: ts.Node): void {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const path = pathMap.get(node) ?? "?"
      const canvasId = `${sourceIdHash}:${path}`
      const tag = node.tagName.getText(sourceFile)
      const startPos = node.getStart(sourceFile)
      const lineCol = sourceFile.getLineAndCharacterOfPosition(startPos)
      ids.push({ canvasId, tag, line: lineCol.line, column: lineCol.character })

      const existing = node.attributes.properties.find(
        (attr): attr is ts.JsxAttribute =>
          ts.isJsxAttribute(attr) &&
          ts.isIdentifier(attr.name) &&
          attr.name.text === "data-canvas-id"
      )

      if (existing) {
        edits.push({
          start: existing.getStart(sourceFile),
          end: existing.getEnd(),
          replacement: `data-canvas-id="${canvasId}"`,
        })
      } else {
        // Insert right after the tagName (and after any JSX type arguments,
        // i.e. <Component<T> ...>). This places the new attribute first in
        // the attribute list, which is harmless and visually consistent.
        const tagNameEnd = node.tagName.getEnd()
        const typeArgs = node.typeArguments
        const insertAfter =
          typeArgs && typeArgs.length > 0
            ? findClosingAngleAfter(tsxSource, typeArgs[typeArgs.length - 1].getEnd())
            : tagNameEnd
        edits.push({
          start: insertAfter,
          end: insertAfter,
          replacement: ` data-canvas-id="${canvasId}"`,
        })
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)

  // Apply edits in reverse order so positions stay valid.
  edits.sort((a, b) => b.start - a.start)
  let code = tsxSource
  for (const edit of edits) {
    code = code.slice(0, edit.start) + edit.replacement + code.slice(edit.end)
  }

  return { code, ids }
}

/**
 * Given the position of the last type argument's end, scan forward to the `>`
 * that closes the type-argument list. Returns the index immediately after it.
 */
function findClosingAngleAfter(source: string, fromPos: number): number {
  for (let i = fromPos; i < source.length; i++) {
    if (source[i] === ">") return i + 1
  }
  return fromPos
}
