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

const SOURCE_ID_HASH_LEN = 8

/**
 * Deterministic 8-hex-char id-namespace prefix for a sourceId. Pure JS
 * (FNV-1a, 32-bit) — NOT node:crypto, which Vite externalizes in the browser
 * and which crashed the client when this module entered the canvas bundle.
 * This is an id prefix, not a security hash; FNV-1a's 32 bits of entropy
 * match the old "first 8 hex of sha1" collision profile, and the value is
 * recomputed from sourceId on every compile (never persisted), so changing
 * the algorithm is safe.
 */
export function hashSourceId(sourceId: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < sourceId.length; i++) {
    hash ^= sourceId.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(SOURCE_ID_HASH_LEN, "0").slice(0, SOURCE_ID_HASH_LEN)
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
