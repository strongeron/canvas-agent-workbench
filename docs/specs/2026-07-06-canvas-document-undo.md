# Canvas-document undo: one Cmd-Z stack for node + source edits

**Date:** 2026-07-06 · **Status:** draft — awaiting approval · **Follows:** FOX2-35 (source undo), FOX2-60 (gesture-end events)

## Problem

Cmd-Z today undoes only *source* mutations (the FOX2-35 snapshot log). Every
document-level operation — add/delete/duplicate/paste nodes, move/resize/
rotate, re-parent, layer reorder, section wrap, group changes — has no history
at all. Users get one undo gesture that silently works for half their edits,
and agents have `undo_source_mutation` but no document equivalent.

## Constraints (what the architecture gives us)

- **Single choke point.** All document mutations flow through `useCanvasState`
  (`addItem`/`updateItem`/`removeItem`/`pasteItems`/`duplicate*`/group ops)
  — including agent operations (`applyOperation`). Nothing mutates items
  outside the hook.
- **Snapshot philosophy already proven.** `canvasMutationLog.ts` stores full
  prev/post source per entry; undo is a snapshot swap, no inverse computation.
  Documents are small (a few KB of JSON), so whole-doc snapshots are cheaper
  than the source snapshots we already keep.
- **Gesture streams need coalescing.** Drag/resize call `updateItem` per
  mousemove; components already track `initialState` at gesture start —
  the exact capture point FOX2-60 needs for from→to events.
- **Two persistence layers.** localStorage state + `.canvas` autosave; the
  FOX2-40 loop taught us restores must mark dirty once, never re-trigger.

## Options

1. **Unified snapshot log (chosen).** Extend the existing mutation-log entry
   to a union: `{kind: "source", …}` | `{kind: "document", prevDoc, postDoc,
   summary, actor}`. One timeline, one Cmd-Z/Cmd-Shift-Z. Document entries
   are pushed per semantic operation (add/delete/paste/re-parent/reorder =
   one entry; drag/resize/gap-scrub = one entry per gesture, captured at the
   FOX2-60 gesture boundaries). Undo restores `{items, groups}` from the
   snapshot through the normal state path so autosave and the event feed see
   it as one ordinary change.
   - *Why:* smallest new machinery, reuses proven eviction/caps/toast/keyboard
     code, users get the single stack they expect, and building it with
     FOX2-60 means gesture instrumentation is written once for both.
2. **Inverse-operation log.** Record each op with a computed inverse. Less
   memory, but every op needs a correct inverse (re-parent + order shifts are
   fiddly), and agent ops would need inverses too. More code, more ways to
   corrupt a document. Rejected for the POC.
3. **Replay from the Obs event log.** Events are observability-shaped, not
   authoritative (FOX2-60 exists precisely because gestures are missing).
   Making them load-bearing couples two systems with different guarantees.
   Rejected; events stay as the audit trail.

## Chosen direction (v1 scope)

- `useCanvasState` grows a `onDocumentChange(prev, next, meta)` hook +
  explicit `beginGesture()/endGesture(summary)` so streams coalesce.
- CanvasTab pushes union entries into the existing log; the Cmd-Z handler
  branches on `kind` (source → existing replay; document → state restore).
- Agent operations are logged as entries too (`actor: "agent"`) — a linear,
  honest timeline; undoing an agent's change is allowed and visible.
- Undo/redo emit `user-action` events (`undo`/`redo`, entry summary) to the
  feed. MCP gains `undo_canvas_change`/parity advertisement in the manifest.
- Caps: reuse per-file/global byte caps; document entries keyed per canvas
  file. In-memory only (reload clears), same as source log today.

## Non-goals (v1)

- Selection, viewport, tool switches, panel visibility — not document state.
- Theme/workspace snapshots (defer; separate snapshot shape).
- Persistent (reload-surviving) history.
- Collaborative/branching undo — timeline is linear.

## Estimate

Two PRs: (1) state-layer history + gesture boundaries — lands FOX2-60's
capture points at the same time; (2) keyboard/UI unification + agent parity +
manifest/docs/tests.
