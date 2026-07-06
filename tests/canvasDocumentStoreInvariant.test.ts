// FOX2-66: source-level invariant — no document state write may escape the
// applyChange seam in useCanvasState. The undo layer (FOX2-67) and gesture
// events (FOX2-60) rely on every mutation flowing through that single path;
// a raw setter call added anywhere else would silently bypass them.

import { readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

const SOURCE_PATH = path.join(__dirname, "..", "hooks", "useCanvasState.ts")

// Every public mutator wraps its transition in exactly one applyChange call.
// Update this list (and nothing else) when adding a mutator.
const EXPECTED_APPLY_CHANGE_CALLERS = [
  "addItem",
  "updateItem",
  "removeItem",
  "bringToFront",
  "selectItem",
  "selectItems",
  "selectAll",
  "clearSelection",
  "createGroup",
  "ungroup",
  "updateGroup",
  "toggleGroupLock",
  "selectGroup",
  "moveGroup",
  "removeSelected",
  "moveSelected",
  "duplicateSelected",
  "duplicateItem",
  "pasteItems",
  "clearCanvas",
  "replaceState",
  "applyRemoteOperation",
]

describe("CanvasDocumentStore write-path invariant (FOX2-66)", () => {
  const source = readFileSync(SOURCE_PATH, "utf8")
  const lines = source.split("\n")

  it("has no setState wrapper outside applyChange", () => {
    const offenders = lines
      .map((line, index) => ({ line, lineNumber: index + 1 }))
      .filter(({ line }) => /\bsetState\s*\(/.test(line))
    expect(offenders).toEqual([])
  })

  it("calls the raw localStorage setter exactly once, inside applyChange", () => {
    const callLines = lines
      .map((line, index) => ({ line, lineNumber: index + 1 }))
      .filter(
        ({ line }) =>
          /\bsetRawState\s*\(/.test(line) && !line.includes("useLocalStorage")
      )
    expect(callLines).toHaveLength(1)

    const applyChangeStart = lines.findIndex((line) =>
      line.includes("const applyChange = useCallback(")
    )
    expect(applyChangeStart).toBeGreaterThanOrEqual(0)
    // The applyChange block ends at its dependency array.
    const applyChangeEnd = lines.findIndex(
      (line, index) => index > applyChangeStart && line.includes("[emitDocumentChange, setRawState]")
    )
    expect(applyChangeEnd).toBeGreaterThan(applyChangeStart)

    const callLineNumber = callLines[0].lineNumber
    expect(callLineNumber).toBeGreaterThan(applyChangeStart + 1)
    expect(callLineNumber).toBeLessThan(applyChangeEnd + 1)
  })

  it("routes every mutator through applyChange", () => {
    const applyChangeCalls = source.match(/\bapplyChange\(/g) ?? []
    expect(applyChangeCalls).toHaveLength(EXPECTED_APPLY_CHANGE_CALLERS.length)

    for (const mutator of EXPECTED_APPLY_CHANGE_CALLERS) {
      expect(source).toContain(`const ${mutator} = useCallback(`)
    }
  })

  it("keeps localStorage behind a single hook instance", () => {
    const storageHookUses = source.match(/useLocalStorage</g) ?? []
    expect(storageHookUses).toHaveLength(1)
  })
})
