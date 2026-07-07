// In-memory mutation log for v3 undo/redo (U5), extended for canvas-document
// undo (FOX2-67).
//
// Holds an append-only timeline plus a redo stack over a union of two entry
// kinds:
// - "source" — `{ prevSourceSnapshot, postSourceSnapshot, filePath,
//   mutations, canvasIdMap }`. Undo and redo both rewrite the file using the
//   stored full-source snapshots — no inverse-mutation computation, no AST
//   diffing, so the log handles every mutation kind (literal setClassName,
//   setTextChild, setPropValue, setAttribute, structural
//   insert/remove/reorder/wrap/unwrap/swapTag) uniformly.
// - "document" — `{ prevDoc, postDoc, summary, actor }` whole-document
//   `{ items, groups }` snapshots per semantic canvas operation (one entry
//   per add/delete/paste/re-parent, one per coalesced drag/resize gesture).
//   Undo is a state restore through the normal replaceState path.
// pushEntry/undo/redo/caps are kind-agnostic; only byte accounting branches.
//
// Hard caps:
// - 25 entries per filePath (per-file FIFO when exceeded)
// - 50MB total log byte size (global size-aware FIFO when exceeded —
//   evicts the largest oldest entry first across all files)
//
// The log holds full source per entry, so secrets in code flow into client
// memory until the page reloads. This is a v3 constraint documented in
// the plan.
//
// Storage: in-memory only. Reload clears the log.

import type { CanvasGroup, CanvasItem } from "../types/canvas"

export interface CanvasSourceMutationLogEntry<TMutation = unknown> {
  /**
   * Optional for backward compatibility — entries without a kind are source
   * entries. Producers tag explicitly at push time.
   */
  kind?: "source"
  id: string
  timestamp: number
  filePath: string
  mutations: ReadonlyArray<TMutation>
  prevSourceSnapshot: string
  postSourceSnapshot: string
  canvasIdMap?: Record<string, string | null>
  /** Human-readable summary, used by the toast on undo/redo. */
  summary?: string
}

/** The document portion of canvas state a document entry snapshots. */
export interface CanvasDocumentEntrySnapshot {
  items: CanvasItem[]
  groups: CanvasGroup[]
}

export interface CanvasDocumentMutationLogEntry {
  kind: "document"
  id: string
  timestamp: number
  /** Active `.canvas` file path, or a per-workspace key while unsaved. */
  filePath: string
  /** Human-readable summary, used by the toast on undo/redo. */
  summary: string
  actor: "user" | "agent"
  prevDoc: CanvasDocumentEntrySnapshot
  postDoc: CanvasDocumentEntrySnapshot
}

export type CanvasMutationLogEntry<TMutation = unknown> =
  | CanvasSourceMutationLogEntry<TMutation>
  | CanvasDocumentMutationLogEntry

const MAX_ENTRIES_PER_FILE = 25
const MAX_TOTAL_BYTES = 50 * 1024 * 1024

export interface CanvasMutationLogState<TMutation = unknown> {
  entries: ReadonlyArray<CanvasMutationLogEntry<TMutation>>
  redoStack: ReadonlyArray<CanvasMutationLogEntry<TMutation>>
}

export function createMutationLogState<TMutation = unknown>(): CanvasMutationLogState<TMutation> {
  return { entries: [], redoStack: [] }
}

/**
 * Append a new entry. A push after an undo discards any redo stack (linear
 * undo semantics). Applies per-file and global byte caps via FIFO eviction
 * — per-file drops the oldest entries for that file first; the global cap
 * drops the largest-oldest entry first.
 */
export function pushEntry<TMutation>(
  state: CanvasMutationLogState<TMutation>,
  entry: CanvasMutationLogEntry<TMutation>
): CanvasMutationLogState<TMutation> {
  // Drop any redo stack — a new mutation invalidates the redo timeline.
  const entries = [...state.entries, entry]
  const trimmed = enforceCaps(entries)
  return { entries: trimmed, redoStack: [] }
}

/**
 * Pop the most recent entry into the redo stack and return both the new
 * state and the entry to apply (or null if the log is empty). The caller
 * is responsible for actually rewriting the file using `prevSourceSnapshot`.
 */
export function undo<TMutation>(
  state: CanvasMutationLogState<TMutation>
): { state: CanvasMutationLogState<TMutation>; entry: CanvasMutationLogEntry<TMutation> | null } {
  if (state.entries.length === 0) {
    return { state, entry: null }
  }
  const entry = state.entries[state.entries.length - 1]
  return {
    state: {
      entries: state.entries.slice(0, -1),
      redoStack: [...state.redoStack, entry],
    },
    entry,
  }
}

/**
 * Pop the most recent entry off the redo stack and back onto the timeline.
 * Returns the entry to apply (caller rewrites with `postSourceSnapshot`)
 * or null if there's nothing to redo.
 */
export function redo<TMutation>(
  state: CanvasMutationLogState<TMutation>
): { state: CanvasMutationLogState<TMutation>; entry: CanvasMutationLogEntry<TMutation> | null } {
  if (state.redoStack.length === 0) {
    return { state, entry: null }
  }
  const entry = state.redoStack[state.redoStack.length - 1]
  return {
    state: {
      entries: [...state.entries, entry],
      redoStack: state.redoStack.slice(0, -1),
    },
    entry,
  }
}

export function peek<TMutation>(
  state: CanvasMutationLogState<TMutation>
): CanvasMutationLogEntry<TMutation> | null {
  return state.entries[state.entries.length - 1] ?? null
}

export function canUndo(state: CanvasMutationLogState<unknown>): boolean {
  return state.entries.length > 0
}

export function canRedo(state: CanvasMutationLogState<unknown>): boolean {
  return state.redoStack.length > 0
}

function enforceCaps<TMutation>(
  entries: ReadonlyArray<CanvasMutationLogEntry<TMutation>>
): ReadonlyArray<CanvasMutationLogEntry<TMutation>> {
  // 1. Per-file cap — drop oldest entries for any file with > MAX_ENTRIES_PER_FILE.
  const perFileTrimmed = applyPerFileCap(entries)
  // 2. Global byte cap — evict the largest-oldest entry until under MAX_TOTAL_BYTES.
  return applyGlobalByteCap(perFileTrimmed)
}

function applyPerFileCap<TMutation>(
  entries: ReadonlyArray<CanvasMutationLogEntry<TMutation>>
): CanvasMutationLogEntry<TMutation>[] {
  const counts = new Map<string, number>()
  for (const entry of entries) {
    counts.set(entry.filePath, (counts.get(entry.filePath) ?? 0) + 1)
  }
  const filesOverCap = new Set<string>()
  for (const [filePath, count] of counts) {
    if (count > MAX_ENTRIES_PER_FILE) filesOverCap.add(filePath)
  }
  if (filesOverCap.size === 0) return [...entries]

  // For each over-cap file, drop the oldest entries until the file is at cap.
  const result: CanvasMutationLogEntry<TMutation>[] = []
  const remaining = new Map<string, number>()
  for (const [filePath, count] of counts) {
    if (filesOverCap.has(filePath)) {
      remaining.set(filePath, count - MAX_ENTRIES_PER_FILE)
    }
  }
  for (const entry of entries) {
    const drop = remaining.get(entry.filePath)
    if (drop && drop > 0) {
      remaining.set(entry.filePath, drop - 1)
      continue
    }
    result.push(entry)
  }
  return result
}

function entryBytes(entry: CanvasMutationLogEntry<unknown>): number {
  // UTF-16 string size dominates; this is the heuristic the plan calls for.
  if (entry.kind === "document") {
    return JSON.stringify(entry.prevDoc).length + JSON.stringify(entry.postDoc).length
  }
  return entry.prevSourceSnapshot.length + entry.postSourceSnapshot.length
}

function applyGlobalByteCap<TMutation>(
  entries: ReadonlyArray<CanvasMutationLogEntry<TMutation>>
): CanvasMutationLogEntry<TMutation>[] {
  let total = 0
  for (const entry of entries) total += entryBytes(entry)
  if (total <= MAX_TOTAL_BYTES) return [...entries]

  // Evict largest-oldest first. We walk entries oldest-to-newest and, for
  // each eviction round, drop the largest entry from the older half until
  // we're under cap. The plan describes this as "size-aware FIFO" — older
  // entries are candidates first, biggest within that pool drops first.
  const survivors: (CanvasMutationLogEntry<TMutation> | null)[] = entries.map((e) => e)
  while (total > MAX_TOTAL_BYTES) {
    let evictIdx = -1
    let evictSize = -1
    // Older entries (lower index) are eviction candidates; among those,
    // pick the biggest. If the oldest is the biggest we're already done in
    // one round.
    for (let i = 0; i < survivors.length; i += 1) {
      const candidate = survivors[i]
      if (!candidate) continue
      const size = entryBytes(candidate)
      if (size > evictSize) {
        evictSize = size
        evictIdx = i
      }
      // Stop scanning older half once we have a candidate from the oldest
      // 50% of survivors — keeps recent entries preferentially.
      const survivorCount = survivors.filter(Boolean).length
      if (evictIdx >= 0 && i >= Math.floor(survivorCount / 2)) break
    }
    if (evictIdx < 0) break
    total -= evictSize
    survivors[evictIdx] = null
  }
  return survivors.filter((e): e is CanvasMutationLogEntry<TMutation> => e !== null)
}

/** Exported for tests. Production callers should not depend on the limit. */
export const CANVAS_MUTATION_LOG_LIMITS = {
  maxEntriesPerFile: MAX_ENTRIES_PER_FILE,
  maxTotalBytes: MAX_TOTAL_BYTES,
} as const
