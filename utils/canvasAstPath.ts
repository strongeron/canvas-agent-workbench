/**
 * Shared AST-path encoding for canvas-id round-tripping.
 *
 * U1's element-id Vite plugin (vite/plugins/canvas-element-id.ts) injects
 * `data-canvas-id="<sourceIdHash>:<astPath>"` attributes during compile.
 * U3's reader (utils/canvasAstReader.ts) and U4's writer use this module
 * to walk back from a `canvasId` to the matching `ts.Node`. Keeping the
 * encoding in one place ensures the writer and reader can never drift
 * apart silently.
 *
 * Path format: dot-separated child indexes from the source file root,
 * derived from `ts.forEachChild` visit order. `""` is the source file
 * itself; `"0.3.1"` is the second child of the fourth child of the first
 * child of the source file.
 *
 * Stability: paths are stable under edits that don't change AST shape
 * between root and the target node (e.g. renaming a variable, editing a
 * className literal, swapping prop values). Adding a wrapper element or
 * a new statement above the JSX changes the path. This is intentional —
 * the canvas's selection state is invalidated on recompile, so a stale
 * canvasId from before the edit cannot reach the writer.
 */

import * as ts from "typescript"
import { createHash } from "node:crypto"

const SOURCE_ID_HASH_LEN = 8

/** First 8 hex chars of sha1(sourceId). Stable, collision-resistant for v1. */
export function hashSourceId(sourceId: string): string {
  return createHash("sha1").update(sourceId).digest("hex").slice(0, SOURCE_ID_HASH_LEN)
}

/**
 * Walks the source file once and returns a WeakMap from each visited node
 * to its dot-separated AST path. Visit order matches `ts.forEachChild`.
 */
export function buildAstPathMap(sourceFile: ts.SourceFile): WeakMap<ts.Node, string> {
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
  return pathMap
}

/**
 * Resolves a `canvasId` (`<hash>:<astPath>`) back to its `ts.Node` in the
 * given source file. The `sourceId` argument is hashed and matched against
 * the canvasId prefix to catch cases where a stale canvasId from a
 * different file sneaks in.
 *
 * Returns null when the prefix doesn't match, the path is malformed, or the
 * node no longer exists at that path (e.g. after edits that change AST
 * shape).
 */
export function findNodeByCanvasId(
  sourceFile: ts.SourceFile,
  canvasId: string,
  options: { sourceId: string }
): ts.Node | null {
  const expectedPrefix = hashSourceId(options.sourceId)
  const colonIdx = canvasId.indexOf(":")
  if (colonIdx <= 0) return null
  const prefix = canvasId.slice(0, colonIdx)
  const path = canvasId.slice(colonIdx + 1)
  if (prefix !== expectedPrefix) return null
  return resolvePath(sourceFile, path)
}

/** Walks from the source file root following the dot-separated indexes. */
function resolvePath(sourceFile: ts.SourceFile, path: string): ts.Node | null {
  if (path === "") return sourceFile
  const parts = path.split(".")
  let current: ts.Node = sourceFile
  for (const part of parts) {
    const target = Number.parseInt(part, 10)
    if (!Number.isInteger(target) || target < 0) return null
    let found: ts.Node | null = null
    let index = 0
    ts.forEachChild(current, (child) => {
      if (index === target) found = child
      index++
    })
    if (!found) return null
    current = found
  }
  return current
}

/** Parses TSX source into a SourceFile suitable for path-map operations. */
export function parseTsxSource(tsxSource: string, fileName = "input.tsx"): ts.SourceFile {
  return ts.createSourceFile(
    fileName,
    tsxSource,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    ts.ScriptKind.TSX
  )
}
