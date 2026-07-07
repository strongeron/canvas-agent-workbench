import { describe, expect, it } from "vitest"

import {
  CANVAS_MUTATION_LOG_LIMITS,
  type CanvasDocumentMutationLogEntry,
  type CanvasMutationLogEntry,
  type CanvasSourceMutationLogEntry,
  canRedo,
  canUndo,
  createMutationLogState,
  peek,
  pushEntry,
  redo,
  undo,
} from "../utils/canvasMutationLog"
import type { CanvasItem } from "../types/canvas"

function entry(
  overrides: Partial<CanvasSourceMutationLogEntry> & { id: string }
): CanvasSourceMutationLogEntry {
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

function sourceEntry(candidate: CanvasMutationLogEntry | null): CanvasSourceMutationLogEntry {
  if (!candidate || candidate.kind === "document") {
    throw new Error("expected a source entry")
  }
  return candidate
}

function documentEntry(
  overrides: Partial<CanvasDocumentMutationLogEntry> & { id: string }
): CanvasDocumentMutationLogEntry {
  return {
    kind: "document",
    id: overrides.id,
    timestamp: overrides.timestamp ?? Date.now(),
    filePath: overrides.filePath ?? "/board.canvas",
    summary: overrides.summary ?? "Move item",
    actor: overrides.actor ?? "user",
    prevDoc: overrides.prevDoc ?? { items: [], groups: [] },
    postDoc: overrides.postDoc ?? { items: [], groups: [] },
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
    expect(sourceEntry(first.entry).prevSourceSnapshot).toBe("C")

    const second = undo(state)
    state = second.state
    expect(second.entry?.id).toBe("2")
    expect(sourceEntry(second.entry).prevSourceSnapshot).toBe("B")

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
    expect(sourceEntry(redone.entry).postSourceSnapshot).toBe("B")
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
      (sum, e) =>
        sum + sourceEntry(e).prevSourceSnapshot.length + sourceEntry(e).postSourceSnapshot.length,
      0
    )
    expect(total).toBeLessThanOrEqual(CANVAS_MUTATION_LOG_LIMITS.maxTotalBytes)
  })
})

describe("CanvasMutationLog — document entries (FOX2-67 PR 1)", () => {
  const bulkyItem = (id: string, payload: string) =>
    ({
      id,
      type: "html",
      sourceMode: "inline",
      sourceHtml: payload,
      position: { x: 0, y: 0 },
      size: { width: 200, height: 100 },
      rotation: 0,
      zIndex: 1,
    }) as unknown as CanvasItem

  it("push/undo/redo treat document entries like any other entry", () => {
    let state = createMutationLogState()
    state = pushEntry(state, entry({ id: "src-1" }))
    state = pushEntry(state, documentEntry({ id: "doc-1", summary: "Move artboard" }))

    const undone = undo(state)
    state = undone.state
    expect(undone.entry?.id).toBe("doc-1")
    expect(undone.entry?.kind).toBe("document")
    expect(canRedo(state)).toBe(true)

    const redone = redo(state)
    expect(redone.entry?.id).toBe("doc-1")
    expect(peek(redone.state)?.id).toBe("doc-1")
  })

  it("counts document snapshots against the global byte cap", () => {
    // Each doc holds a ~15MB item payload on both sides (~30MB per entry as
    // JSON) — the second push must evict the first to stay under 50MB.
    const payload = "x".repeat(15 * 1024 * 1024)
    const doc = { items: [bulkyItem("a", payload)], groups: [] }
    let state = createMutationLogState()
    state = pushEntry(state, documentEntry({ id: "doc-1", prevDoc: doc, postDoc: doc }))
    state = pushEntry(state, documentEntry({ id: "doc-2", prevDoc: doc, postDoc: doc }))

    expect(state.entries.length).toBe(1)
    expect(state.entries[0].id).toBe("doc-2")
  })

  it("applies the per-file cap across mixed kinds sharing a filePath", () => {
    let state = createMutationLogState()
    for (let i = 0; i < CANVAS_MUTATION_LOG_LIMITS.maxEntriesPerFile; i += 1) {
      state = pushEntry(state, entry({ id: `src-${i}`, filePath: "/board.canvas" }))
    }
    state = pushEntry(state, documentEntry({ id: "doc-over", filePath: "/board.canvas" }))

    expect(state.entries.length).toBe(CANVAS_MUTATION_LOG_LIMITS.maxEntriesPerFile)
    expect(state.entries[0].id).toBe("src-1")
    expect(peek(state)?.id).toBe("doc-over")
  })
})
