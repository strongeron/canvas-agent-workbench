---
title: v3 direct-manipulation — human browser-verification checklist
date: 2026-07-02
status: partial (automated co-pass run 2026-07-02 via chrome-devtools; human-gesture steps + one finding remain)
---

# v3 browser-verification pass

This is the one remaining gate on the v3 "every node type editable like
Figma" milestone (`docs/goal.md`). All units are implemented and
unit-tested; most have never been driven by a human on the live surface.
U4b native drag-drop is the item that *cannot* be automated (synthetic
events can't carry a real cross-iframe `DataTransfer`), so this pass needs
a person.

**2026-07-02 automated co-pass:** an agent drove the live app on
`localhost:5173` through the Chrome DevTools protocol and verified every
panel-driven and click-driven step below. Steps marked HUMAN resist
synthetic dispatch for a second reason discovered during the pass: the
resize/group-resize overlay handles use `setPointerCapture`, which throws
on synthetic pointerIds — so all overlay *drag gestures* (steps 1, 2, 22),
not just native DnD (7–11), need a person.

## Setup

1. `npm run dev` — open the canvas at the port Vite prints (default
   `http://localhost:5173/canvas?project=demo`).
2. Open the stored canvas fixtures from the sidebar file library:
   - `source-backed-inline.canvas` — inline HTML iframe fixture
   - `source-backed-react.canvas` — TSX-backed compiled fixture
3. **Enable Edit mode** — the `</>` (code) toolbar button. Element-level
   selection inside iframes only works in Edit mode; in the default Select
   tool, clicks select the whole item. (Discovered during the co-pass;
   worth a hint in the UI.)
4. Keep DevTools console open; any red error during a step fails that step.

## Checklist

Mark each Result as PASS / FAIL (+ a note on what you saw).

### U4a — overlay resize + computed-class fallback

| # | Step | Expected | Result |
|---|---|---|---|
| 1 | On the TSX fixture, click an element inside the iframe, drag a resize handle | Width class snaps (e.g. `w-64`), file mutates, iframe re-renders, overlay re-anchors to the same node | **HUMAN** — overlay handles use pointer capture; agent can't drive the drag |
| 2 | On the inline HTML fixture, pick a node whose size comes from a computed class (no literal `w-*`), drag resize | Falls back to an inline `style` px write; node resizes; no error toast | **HUMAN** — same |

### U3 — structural mutation selection continuity

| # | Step | Expected | Result |
|---|---|---|---|
| 3 | Select a node in the TSX fixture, panel → `Wrap` | Node count increases, selection + panel survive recompile | **PASS** (2026-07-02 agent) — markers 5→6, `h1` wrapped in `div`, panel + selection survived |
| 4 | Same node → `Insert child` | Child appears, selection stays on parent, overlay rect refreshes | **PASS** — `<span>New</span>` landed at position 0 inside the still-selected `h1` after the wrap rebase |
| 5 | Select a node → `Delete node` | Node gone, selection clears or moves predictably, no stale overlay rect | **PASS** — `h1`+span removed (7→5 markers), panel closed, no stale overlay |
| 6 | Repeat 4–5 on the inline HTML fixture | Same continuity behavior via the parse5 path | NOT RUN — left for the human pass |

### U4b — library drag-drop (THE human-only gate)

| # | Step | Expected | Result |
|---|---|---|---|
| 7 | Start dragging a primitive from the library panel over the TSX fixture iframe | Drop zones render: insert lines between siblings, wrap zone on leaf nodes; zones clear on drag-leave | **HUMAN** |
| 8 | Drop on an insert line inside a non-leaf parent | `insertChild` write lands; new element renders at that index | **HUMAN** |
| 9 | Drop on a leaf's wrap zone | `wrapSelection` with the wrapper tag only (props/children intentionally dropped — documented tradeoff) | **HUMAN** |
| 10 | Drop a component the file doesn't import | Recompile error surfaces as a toast; file not corrupted (atomic write) | **HUMAN** |
| 11 | Press Escape / release outside mid-drag | No stuck drop zones (document-level dragend safety net) | **HUMAN** |

### U5 — undo/redo

| # | Step | Expected | Result |
|---|---|---|---|
| 12 | After steps 1 and 4, press Cmd-Z twice | Each undo replays the prev snapshot, toast `Undid: …`, iframe reverts | **FINDING — see below.** Inconsistent on the inline-sourced fixture; toasts never observed |
| 13 | Cmd-Shift-Z | Redo restores, toast `Redid: …` | **FINDING** — redo never observed applying |
| 14 | Focus a textarea/input, press Cmd-Z | Field-local undo, canvas history does NOT fire (editable-target guard) | **PASS** — handler yields (`defaultPrevented` false) when target is a textarea |

### U7 — numeric prop scrub

| # | Step | Expected | Result |
|---|---|---|---|
| 15 | Select a component item with a numeric prop, drag the scrub affordance horizontally | Value scrubs with PointerLock (or document-drag fallback); respects schema min/max | NOT RUN — no component item on the fixture; also a pointer gesture |
| 16 | Selected component item: ArrowLeft / ArrowRight | Variants cycle | NOT RUN — needs a component item |

### U8 — media crop / clip handles

| # | Step | Expected | Result |
|---|---|---|---|
| 17 | Select an image item, drag the SE corner crop handle | Crop window shrinks anchored to NW corner; source file untouched (display-only crop) | **PASS** — all 4 handles render on selection; synthetic SE drag applied a corner-anchored display crop (img → 106.7%×110.2%, anchored NW); source untouched. Crop handles use plain mouse events, so they ARE agent-drivable (unlike the overlay handles) |
| 18 | Select a video item, drag clip start/end handles on the scrub bar | Clip range updates, min 0.05s gap enforced, playback honors range | NOT RUN — no video handy |

### U10 — mermaid rendered-SVG label edit

| # | Step | Expected | Result |
|---|---|---|---|
| 19 | Click a node label inside a rendered mermaid diagram | Inline editor appears over the measured rect; commit patches the mermaid source | **PASS** — full round trip: clicked `Start` label → inline editor → committed `Begin` → item source now `A[Begin]`, SVG + panel labels updated |
| 20 | Try a label containing brackets `[...]` | Inline edit rejected (regex patcher can't round-trip brackets) — panel edit still works | **PASS** — committed `Be[gin]` was rejected; source unchanged, no crash |

### U12 — multi-select + group resize

| # | Step | Expected | Result |
|---|---|---|---|
| 21 | Shift-click 3 elements in one iframe | Dashed union rect + "N selected" badge; shift-click again toggles one out | **PASS** — union rect + "2 selected" badge; shift-click toggles out and re-adds correctly |
| 22 | Drag the union overlay's resize handle | All selected nodes get sequential width writes; single source-change event; selection survives | **HUMAN** — pointer-capture gesture |
| 23 | Make one write fail (e.g. include a computed-class TSX node) | Partial-failure summary toast; other nodes still written | **HUMAN** — depends on 22 |

## Findings from the 2026-07-02 automated co-pass

1. **U5 undo/redo does not work on inline-sourced items (P1-candidate).**
   The `source-backed-react.canvas` fixture item is actually *inline*
   (`sourceReact` only — no `sourcePath`/`sourceReactFilePath`).
   `handleReactNodeWriteSuccess` (CanvasTab) early-returns when
   `!result.filePath`, so inline structural writes are never pushed to the
   mutation log — Cmd-Z after a wrap on a freshly-loaded page is a silent
   no-op (verified: the keydown handler runs and `preventDefault`s, then
   `undo()` finds no entry; no toast, no error). Confusingly, in the first
   session-half a chain of three undos DID restore state, then stopped
   working after a redo-on-empty attempt + reload — the exact conditions
   under which inline writes do/don't reach the log need a focused debug.
   Decision needed: (a) make the endpoint return a synthetic filePath for
   inline items so they log, (b) rename/re-back the fixture with a real
   file so the checklist tests the intended path, or both.
2. **Undo/redo toasts were never observed** — even during the undo chain
   that visibly restored state, no `Undid: …` toast appeared within its
   1.5s window. Re-check by human (may be a probe artifact, may be broken).
3. **Overlay drag handles are agent-opaque.** `CanvasIframeOverlay` uses
   `setPointerCapture(event.pointerId)` first thing in `beginDrag`; a
   synthetic PointerEvent's pointerId has no active pointer, so the call
   throws and the drag never starts. Fine for humans, but it means the
   MCP/agent surface genuinely cannot emulate steps 1/2/22 as gestures —
   they're covered by `apply_structural_mutation`/`update_item` instead
   (the documented no-`drag`-tool stance). The *media crop* handles
   (mousedown + document mousemove) don't have this problem.
4. **Edit-mode gate is invisible.** Element selection silently does
   nothing in the default Select tool; nothing hints that Edit mode
   (the `</>` toolbar toggle) exists. Consider a hint when a user clicks
   an iframe in Select mode, and a Setup note (added above).
5. Housekeeping from the pass: leftover test artifacts live only in the
   app-local autosave of `source-backed-react` (a wrap `div` in the card's
   source; the git fixture file is untouched). Discard by not saving, or
   reset the card's TSX in the panel.

## After the pass

- Record results in this file, flip `status:` to `complete`.
- Any FAIL becomes a bug slice — file it against the owning unit in
  `docs/goal.md`.
- If all green: update `docs/goal.md` status line — v3 is then *verified*
  feature-complete, and the only open v3 decision left is the TSX
  `style`-object mutation (ship as-is vs open in v4).
- Remaining human slice after the co-pass: steps 1, 2, 6, 7–11, 15–18,
  22–23 — plus a decision on Finding 1.
