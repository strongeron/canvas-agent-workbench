# Canvas selection → agent context ("Copy for agent")

**Date:** 2026-07-05 · **Issue:** FOX2-56 · **Status:** approved (user: "track in linear and apply")

## Problem

Agents can read the live selection (`get_canvas_selection`), but users have no
way to *hand* a selection to an agent: nothing to paste into an external
codex/claude session, and no affordance that names the selected frames in a
form agents can resolve. The gap surfaced while testing dual-agent isolation
on `agent-demo.canvas` (user: "do we have a place to track or copy links or
context to agent from selected frames?").

## Constraints

- Must work with the lean-profile sessions (canvas MCP only) — the block can
  only reference tools that server exposes.
- Must not depend on the selection up-sync (FOX2-55) being alive: the copied
  block carries the item facts inline, so a paste is self-sufficient.
- POC budget: one new surface, no new persistence.

## Options

1. **Selection-toolbar button** (chosen) — appears with the existing
   "N selected" actions; one wiring point in `CanvasTab`, works for
   multi-select across item types.
2. Per-item context-menu entry — same payload but requires threading a prop
   through every `Canvas*Item` component (8+ files); defer.
3. Deep link (`/canvas?project=…&items=…`) that selects on open — needs a
   route-level selection resolver; defer.

## Chosen shape

- `utils/canvasAgentSelectionContext.ts` — pure builder:
  project + canvas file header, one line per selected item
  (`id — type "title" @ (x,y) WxH (parent: …)`), and a closing instruction
  ("use the canvas MCP server: get_canvas_state to resolve these ids…").
- `CanvasToolbar` gets `onCopyForAgent` (Bot icon) in the selection actions.
- `CanvasTab` copies the block to the clipboard and emits a
  `copy-agent-context` user-action event (FOX2-45 vocabulary) so agents can
  observe the handoff.

## Non-goals (follow-ups on FOX2-56)

- "Send to active session" (write the block into the in-panel PTY).
- Context-menu parity and deep links.
- Tracking which agent consumed the context.
