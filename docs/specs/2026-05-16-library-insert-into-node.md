---
title: "Insert a library component into the selected node (select → Apply)"
date: 2026-05-16
status: draft (awaiting approval)
author: Gleb Stroganov
relates-to: docs/plans/2026-05-05-001-feat-canvas-v3-direct-manipulation-plan.md (U4b)
---

# Problem

A user expects: pick a component from the library, **apply it into the
currently-selected on-canvas component** (between siblings / nested / wrapped),
the way Figma lets you drop one element inside another. Today this does not
work from the surface they reach for, and the reason is a confusion baked into
the product between three different "component" concepts.

## The three component concepts (root of the confusion)

1. **Registry palette entries** — the always-visible left "Components" list
   ("Outline / Ghost / Destructive / Interactive / Badge > …"). These are
   read-only definitions parsed from `registry.json`. Selecting one only
   highlights it as a drag source. They have no rendered DOM, no
   `data-canvas-id`, no backing source node — **nothing to edit in place by
   design.** They are the *source* of new instances, not editable themselves.
2. **Component-type canvas items** — what a dragged palette variant becomes
   on the board. Edited via the **Props panel** (Variant dropdown / Edit JSON)
   only — *not* structurally — because its markup lives in a registry
   component file, not inline source.
3. **Source-backed HTML/TSX nodes** — the `source-backed-inline` /
   `source-backed-react` fixtures. Fully element-by-element editable
   (structural + text/class/attr) because edits round-trip to inline source.
   This is the only category where "edit any element like Figma" is realized.

"I select a component and can't edit it" = the user is on category 1 (palette)
or 2 (component item), expecting category 3 behavior.

## The two-surface wiring gap (evidence-backed, 2026-05-16 screenshots)

| Surface | Tech | Drop behavior |
|---|---|---|
| Left "Components" list (always visible, discoverable) | `@dnd-kit` (`CanvasSidebar.tsx`) → `canvas-workspace` droppable | **Only spawns a new standalone node.** No insert-into-element, no preview. |
| "Library" panel (hidden behind a toolbar toggle) | native HTML5 drag → `activeLibraryDrag` | The *only* surface wired to U4b drop-zones / insert-into-element. |

So the U4b "drag a primitive into an existing element" capability (built,
unit-tested, reviewed) is connected to a surface the user never opens, while
the discoverable surface is hard-wired to "create a standalone node." Result:
dragging a component "onto the current one" does nothing useful and shows no
placement preview — exactly the reported symptom.

The only in-place insert today is the structure panel's bare **Insert child**
with a hand-typed `<span>New</span>` `childSource` — no component menu.

# Constraints

- Reuse the shipped, reviewed U4b dispatch (`dispatchCanvasLibraryDrop`,
  `buildPrimitiveChildSource`, `derivePrimitiveWrapperTag`) and the
  `/api/canvas/ast/write` path. No new writer surface.
- Must be agent-parity-aligned: the human action maps 1:1 to the existing
  `apply_structural_mutation` MCP tool.
- Must be click-driven (not native DnD) so it is unit- and browser-testable —
  native HTML5 cross-iframe DnD cannot be synthesized in automation.
- Only meaningful for category-3 (source-backed) selected nodes; must degrade
  clearly when the selection is a component-item or nothing.

# Options

### A. Component picker + Apply in the structure panel  *(chosen)*
Add to the existing structure panel (where "Insert child" already lives): a
searchable registry component picker + an **Apply** button. On Apply: resolve
the chosen primitive → `buildPrimitiveChildSource` → run the existing
`insertChild` (at the panel's position field) or `wrapSelection` (leaf)
dispatch against the selected source-backed node.
- **+** One click; matches the user's "select → apply" model exactly.
- **+** Pure reuse of shipped infra; no new mutation/endpoint.
- **+** Fully testable (it's a click); permanently sidesteps the
  untestable-native-DnD problem for the common case.
- **+** Tightens human↔agent parity (same mutation as the MCP tool).
- **−** Doesn't give the spatial drag-and-drop "feel"; that stays as the
  secondary follow-up.

### B. Wire the always-visible "Components" list to U4b drop-zones
Make the sidebar `@dnd-kit` list also set `activeLibraryDrag` so dragging a
component over an existing iframe shows the U4b preview and nests it.
- **+** The spatial preview the user expected; most discoverable.
- **−** Native-DnD path → not reliably auto-testable (the standing gate).
- **−** Two drop intents on one drag source (board vs into-element) needs a
  disambiguation rule; larger, riskier.

### C. Do nothing; document the hidden Library panel
- **−** Leaves the discoverable surface dead-ended; doesn't meet the
  expectation. Rejected.

# Chosen direction

**Option A now; Option B as a documented follow-up.** A is small, robust,
testable, reuses reviewed code, and directly answers "select → apply into the
selected component." B is the discoverability/feel improvement layered on top
later, accepting it stays human-verified only.

# Scope

In:
- Registry component picker (search + list, reusing the registry fetch) +
  Apply button, rendered in the structure panel for a source-backed selection.
- Apply runs `insertChild` (uses the existing position field) or, when the
  selected node is a leaf, `wrapSelection`, via `dispatchCanvasLibraryDrop`.
- Disabled/explanatory state when the selection is a component-item or absent,
  naming the three-concept distinction in one line of UI copy.
- Unit tests (picker → Apply → correct mutation shape; leaf vs non-leaf;
  disabled states) + a live browser-clickable path.

Non-goals:
- Option B (sidebar→U4b drag wiring) — separate follow-up.
- Making category-1 palette entries or category-2 component-items structurally
  editable (that is "promote to component" / open-source territory, unchanged).
- Any change to the AST/HTML writer or MCP surface.
