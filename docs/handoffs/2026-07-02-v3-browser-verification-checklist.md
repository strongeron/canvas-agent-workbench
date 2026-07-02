---
title: v3 direct-manipulation — human browser-verification checklist
date: 2026-07-02
status: pending (fill in Result column during the session)
---

# v3 browser-verification pass

This is the one remaining gate on the v3 "every node type editable like
Figma" milestone (`docs/goal.md`). All units are implemented and
unit-tested; most have never been driven by a human on the live surface.
U4b native drag-drop is the item that *cannot* be automated (synthetic
events can't carry a real cross-iframe `DataTransfer`), so this pass needs
a person.

## Setup

1. `npm run dev` — open the canvas at the port Vite prints (default
   `http://localhost:5173/canvas?project=demo`).
2. Open the stored canvas fixtures from the sidebar file library:
   - `source-backed-inline.canvas` — inline HTML iframe fixture
   - `source-backed-react.canvas` — TSX-backed compiled fixture
3. Keep DevTools console open; any red error during a step fails that step.

## Checklist

Mark each Result as PASS / FAIL (+ a note on what you saw).

### U4a — overlay resize + computed-class fallback

| # | Step | Expected | Result |
|---|---|---|---|
| 1 | On the TSX fixture, click an element inside the iframe, drag a resize handle | Width class snaps (e.g. `w-64`), file mutates, iframe re-renders, overlay re-anchors to the same node | |
| 2 | On the inline HTML fixture, pick a node whose size comes from a computed class (no literal `w-*`), drag resize | Falls back to an inline `style` px write; node resizes; no error toast | |

### U3 — structural mutation selection continuity

| # | Step | Expected | Result |
|---|---|---|---|
| 3 | Select a node in the TSX fixture, panel → `Wrap` | Node count increases, selection + panel survive recompile (already verified once — re-confirm) | |
| 4 | Same node → `Insert child` | Child appears, selection stays on parent, overlay rect refreshes | |
| 5 | Select a node → `Delete node` | Node gone, selection clears or moves predictably, no stale overlay rect | |
| 6 | Repeat 4–5 on the inline HTML fixture | Same continuity behavior via the parse5 path | |

### U4b — library drag-drop (THE human-only gate)

| # | Step | Expected | Result |
|---|---|---|---|
| 7 | Start dragging a primitive from the library panel over the TSX fixture iframe | Drop zones render: insert lines between siblings, wrap zone on leaf nodes; zones clear on drag-leave | |
| 8 | Drop on an insert line inside a non-leaf parent | `insertChild` write lands; new element renders at that index | |
| 9 | Drop on a leaf's wrap zone | `wrapSelection` with the wrapper tag only (props/children intentionally dropped — documented tradeoff) | |
| 10 | Drop a component the file doesn't import | Recompile error surfaces as a toast; file not corrupted (atomic write) | |
| 11 | Press Escape / release outside mid-drag | No stuck drop zones (document-level dragend safety net) | |

### U5 — undo/redo

| # | Step | Expected | Result |
|---|---|---|---|
| 12 | After steps 1 and 4, press Cmd-Z twice | Each undo replays the prev snapshot, toast `Undid: …`, iframe reverts | |
| 13 | Cmd-Shift-Z | Redo restores, toast `Redid: …` | |
| 14 | Focus a textarea/input, press Cmd-Z | Field-local undo, canvas history does NOT fire (editable-target guard) | |

### U7 — numeric prop scrub

| # | Step | Expected | Result |
|---|---|---|---|
| 15 | Select a component item with a numeric prop, drag the scrub affordance horizontally | Value scrubs with PointerLock (or document-drag fallback); respects schema min/max | |
| 16 | Selected component item: ArrowLeft / ArrowRight | Variants cycle | |

### U8 — media crop / clip handles

| # | Step | Expected | Result |
|---|---|---|---|
| 17 | Select an image item, drag the SE corner crop handle | Crop window shrinks anchored to NW corner; source file untouched (display-only crop) | |
| 18 | Select a video item, drag clip start/end handles on the scrub bar | Clip range updates, min 0.05s gap enforced, playback honors range | |

### U10 — mermaid rendered-SVG label edit

| # | Step | Expected | Result |
|---|---|---|---|
| 19 | Click a node label inside a rendered mermaid diagram | Inline editor appears over the measured rect; commit patches the mermaid source | |
| 20 | Try a label containing brackets `[...]` | Inline edit rejected (regex patcher can't round-trip brackets) — panel edit still works | |

### U12 — multi-select + group resize

| # | Step | Expected | Result |
|---|---|---|---|
| 21 | Shift-click 3 elements in one iframe | Dashed union rect + "3 selected" badge; shift-click again toggles one out | |
| 22 | Drag the union overlay's resize handle | All selected nodes get sequential width writes; single source-change event; selection survives | |
| 23 | Make one write fail (e.g. include a computed-class TSX node) | Partial-failure summary toast; other nodes still written | |

## After the pass

- Record results in this file, flip `status:` to `complete`.
- Any FAIL becomes a bug slice — file it against the owning unit in
  `docs/goal.md`.
- If all green: update `docs/goal.md` status line — v3 is then *verified*
  feature-complete, and the only open v3 decision left is the TSX
  `style`-object mutation (ship as-is vs open in v4).
