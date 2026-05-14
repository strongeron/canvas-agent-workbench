import { describe, expect, it } from "vitest"

import {
  CANVAS_MUTATION_LOG_LIMITS,
  type CanvasMutationLogEntry,
  canRedo,
  canUndo,
  createMutationLogState,
  peek,
  pushEntry,
  redo,
  undo,
} from "../utils/canvasMutationLog"

function entry(
  overrides: Partial<CanvasMutationLogEntry> & { id: string }
): CanvasMutationLogEntry {
  return {
    id: overrides.id,
    timestamp: overrides.timestamp ?? Date.now(),
    filePath: overrides.filePath ?? "/file.tsx",
    mutations: overrides.mutations ?? [],
    prevSourceSnapshot: overrides.prevSourceSnapshot ?? "before",
    postSourceSnapshot: overrides.postSourceSnapshot ?? "after",
    canvasIdMap: overrides.canvasIdMap,
    summary: overrides.summary,
  }
}

describe("CanvasMutationLog — push / undo / redo", () => {
  it("starts empty", () => {
    const state = createMutationLogState()
    expect(canUndo(state)).toBe(false)
    expect(canRedo(state)).toBe(false)
    expect(peek(state)).toBeNull()
  })

  it("push 3 then undo twice reaches entry 1's pre-state", () => {
    let state = createMutationLogState()
    state = pushEntry(state, entry({ id: "1", prevSourceSnapshot: "A", postSourceSnapshot: "B" }))
    state = pushEntry(state, entry({ id: "2", prevSourceSnapshot: "B", postSourceSnapshot: "C" }))
    state = pushEntry(state, entry({ id: "3", prevSourceSnapshot: "C", postSourceSnapshot: "D" }))

    const first = undo(state)
    state = first.state
    expect(first.entry?.id).toBe("3")
    expect(first.entry?.prevSourceSnapshot).toBe("C")

    const second = undo(state)
    state = second.state
    expect(second.entry?.id).toBe("2")
    expect(second.entry?.prevSourceSnapshot).toBe("B")

    expect(peek(state)?.id).toBe("1")
  })

  it("undo followed by redo restores the most recent post-state", () => {
    let state = createMutationLogState()
    state = pushEntry(state, entry({ id: "1", postSourceSnapshot: "B" }))
    const undid = undo(state)
    state = undid.state
    const redone = redo(state)
    state = redone.state
    expect(redone.entry?.id).toBe("1")
    expect(redone.entry?.postSourceSnapshot).toBe("B")
    expect(peek(state)?.id).toBe("1")
    expect(canRedo(state)).toBe(false)
  })

  it("push after undo truncates the redo stack (linear undo)", () => {
    let state = createMutationLogState()
    state = pushEntry(state, entry({ id: "1" }))
    state = pushEntry(state, entry({ id: "2" }))
    state = undo(state).state
    expect(canRedo(state)).toBe(true)
    state = pushEntry(state, entry({ id: "3" }))
    expect(canRedo(state)).toBe(false)
    expect(peek(state)?.id).toBe("3")
  })

  it("undo with empty log is a safe no-op", () => {
    const state = createMutationLogState()
    const result = undo(state)
    expect(result.entry).toBeNull()
    expect(result.state).toBe(state)
  })

  it("redo with empty redo stack is a safe no-op", () => {
    let state = createMutationLogState()
    state = pushEntry(state, entry({ id: "1" }))
    const result = redo(state)
    expect(result.entry).toBeNull()
    expect(result.state).toBe(state)
  })

  it("interleaved entries from two files: undo follows global timestamp order, not per-file", () => {
    let state = createMutationLogState()
    state = pushEntry(state, entry({ id: "a1", filePath: "/a.tsx", timestamp: 1 }))
    state = pushEntry(state, entry({ id: "b1", filePath: "/b.tsx", timestamp: 2 }))
    state = pushEntry(state, entry({ id: "a2", filePath: "/a.tsx", timestamp: 3 }))
    expect(undo(state).entry?.id).toBe("a2")
    state = undo(state).state
    expect(undo(state).entry?.id).toBe("b1")
  })
})

describe("CanvasMutationLog — caps", () => {
  it("enforces per-file cap of 25 entries (oldest dropped first)", () => {
    let state = createMutationLogState()
    for (let i = 0; i < CANVAS_MUTATION_LOG_LIMITS.maxEntriesPerFile + 3; i += 1) {
      state = pushEntry(state, entry({ id: `${i}` }))
    }
    expect(state.entries.length).toBe(CANVAS_MUTATION_LOG_LIMITS.maxEntriesPerFile)
    // Oldest three (ids 0, 1, 2) should have been dropped.
    expect(state.entries[0].id).toBe("3")
    expect(state.entries[state.entries.length - 1].id).toBe(
      `${CANVAS_MUTATION_LOG_LIMITS.maxEntriesPerFile + 2}`
    )
  })

  it("applies per-file cap independently per filePath", () => {
    let state = createMutationLogState()
    for (let i = 0; i < CANVAS_MUTATION_LOG_LIMITS.maxEntriesPerFile + 3; i += 1) {
      state = pushEntry(state, entry({ id: `a-${i}`, filePath: "/a.tsx" }))
    }
    // /a.tsx is now at cap (25). Push some /b.tsx — they should accumulate
    // without evicting any /a.tsx entries.
    for (let i = 0; i < 5; i += 1) {
      state = pushEntry(state, entry({ id: `b-${i}`, filePath: "/b.tsx" }))
    }
    const aCount = state.entries.filter((e) => e.filePath === "/a.tsx").length
    const bCount = state.entries.filter((e) => e.filePath === "/b.tsx").length
    expect(aCount).toBe(CANVAS_MUTATION_LOG_LIMITS.maxEntriesPerFile)
    expect(bCount).toBe(5)
  })

  it("evicts when total bytes exceed the global cap (size-aware oldest-first)", () => {
    // Pump in 4 entries each holding ~15MB of source. After the 4th, total
    // is ~60MB which exceeds the 50MB cap → at least one eviction.
    const big = "x".repeat(15 * 1024 * 1024)
    let state = createMutationLogState()
    state = pushEntry(
      state,
      entry({ id: "1", prevSourceSnapshot: big, postSourceSnapshot: "" })
    )
    state = pushEntry(
      state,
      entry({ id: "2", prevSourceSnapshot: big, postSourceSnapshot: "" })
    )
    state = pushEntry(
      state,
      entry({ id: "3", prevSourceSnapshot: big, postSourceSnapshot: "" })
    )
    state = pushEntry(
      state,
      entry({ id: "4", prevSourceSnapshot: big, postSourceSnapshot: "" })
    )
    expect(state.entries.length).toBeLessThan(4)
    // Newest entry survives (recent entries are preferred).
    expect(state.entries.find((e) => e.id === "4")).toBeDefined()
    // Total bytes is under cap.
    const total = state.entries.reduce(
      (sum, e) => sum + e.prevSourceSnapshot.length + e.postSourceSnapshot.length,
      0
    )
    expect(total).toBeLessThanOrEqual(CANVAS_MUTATION_LOG_LIMITS.maxTotalBytes)
  })
})
