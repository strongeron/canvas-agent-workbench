# Canvas v3 — direct manipulation across all node types

**Date:** 2026-05-05
**Status:** Draft — awaiting approval
**Builds on:** `docs/specs/2026-05-05-canvas-web-native-editing.md` (v2)
**Origin (TSX):** `docs/specs/2026-04-27-canvas-figma-like-editing.md`

---

## Problem

v2 shipped panel-driven editing for HTML and React TSX nodes: click an element → property panel → edit attrs/classes/text → file mutates. That's "Figma's right panel + library + tokens" — strong for code-anchored editing, missing for **direct manipulation**.

What direct manipulation buys:
- Drag a button to a new position inside the iframe (without typing a class name)
- Resize an element with corner handles
- Reorder siblings by dragging up/down
- Wrap a selection in a Stack with one click
- Insert a primitive between two existing elements via drop target
- Multi-select and group-transform

The user goal is a **canvas where every node type — components, markdown, media, mermaid, excalidraw, embed, artboard, HTML, TSX — exposes its content for inline editing with both panel and direct-manipulation affordances**, and the agent has parity with both.

v3's job: extend the AST/HTML writers with structural mutations, ship iframe-side drag/resize affordances, and unify the editing surface across all node types so each one tells the user "yes, you can edit this here."

---

## Constraints

- **Build on v2 infrastructure.** Click bridge, property panel, AST writer, MCP wrapping, registry — all reusable.
- **Per-node-type editability is honest.** Not every node supports every operation. Each type declares what it supports; the panel adapts.
- **Round-trip mandatory.** Every direct-manipulation edit lands in source files (or the canvas state for ephemeral overlays).
- **Agent parity.** Every direct-manipulation action exposes as an MCP tool from day one.
- **No regression.** v1 (TSX) and v2 (HTML/CSS, tokens, paste, promote) keep working; v3 is purely additive.
- **Iframe scaling + throttling realities.** Drag handles must work when the iframe is at `transform: scale(0.x)` and JS is throttled — the bridge runs from the parent, not the iframe.

---

## Node catalog (current state)

| Node type | Content | Edit affordances today | Direct-manip target for v3 |
|---|---|---|---|
| **html** (`sourceMode: react`) | TSX source string + CSS | Click element → panel → attrs/className/text edits → AST write (file or in-memory) | + drag-handles for resize/move; reorder siblings; wrap; swap-tag |
| **html** (`sourceMode: inline`) | HTML source string + CSS | Click element → panel → attrs/classList/text edits → parse5 write | + same as TSX track |
| **html** (`sourceMode: bundle`/`url`) | URL or imported bundle | None (no AST) | None — read-only by design |
| **component** | `componentId` + `variantIndex` + `customProps` | Variant picker, prop overrides | + variant cycling via keyboard; prop drag-edit (numeric scrub) |
| **markdown** | `source` (markdown text) | Source textarea | + inline format toolbar (bold/italic/list); per-block drag reorder; click-to-edit-block |
| **media** (`image`/`video`/`gif`) | `src` + media options | URL, alt, fit | + crop handles on image; clip-trim on video; aspect-ratio drag |
| **mermaid** | Mermaid `source` string | Source textarea + theme picker | + edit node labels by clicking a rendered shape (bridge into mermaid render) |
| **excalidraw** | Excalidraw `scene` JSON | Open in embedded Excalidraw editor | None new — Excalidraw handles its own direct manipulation |
| **embed** | External `url` | Read-only beyond URL/sandbox | None — external content; out of edit scope |
| **artboard** | `name` + `layout` config | Layout panel (flex/grid, gap, padding) | + drag children to reorder within artboard; resize gap via slider |

This catalog drives v3 scope: nodes with **owned source** get direct-manipulation work; nodes that delegate to external tools (Excalidraw, embed) keep current behavior.

---

## Options

### Option A — Ship structural edits in the panel only (no iframe drag handles)

Extend the AST writer for insert/remove/reorder/wrap/unwrap/swap-tag. Surface them as buttons in the property panel ("↑ Move up", "Wrap in Stack", "Delete"). No drag affordance inside the iframe.

**Pros:** Smallest scope. Reuses panel pattern. Doesn't need iframe overlay machinery. Agent parity is automatic.
**Cons:** Not really "Figma-like" — still panel-driven. Users expecting drag-resize won't get it.
**Verdict:** Not chosen — solves only the structural-edit half. Misses the visual affordance the user explicitly asked for.

### Option B — Iframe drag handles + structural panel buttons (CHOSEN)

Ship both. Panel buttons for structural edits (insert/remove/reorder/wrap/unwrap/swap-tag). Iframe-side drag handles overlaid on the parent canvas (not inside the iframe DOM) for resize/move, anchored to iframe-reported element rects via the U2 bridge.

**Pros:** Real direct manipulation. Each node type gets the right tool — panel-only for nodes without rendered DOM (markdown), drag for HTML/TSX, both for components.
**Cons:** Iframe overlay machinery is non-trivial — coordinate translation under scaling, cursor anchors, drag throttling, multi-iframe (one canvas may have many). Higher implementation cost than A.
**Verdict:** Chosen — the goal explicitly named direct manipulation; A doesn't deliver that.

### Option C — Embed a real DOM editor library (e.g., GrapesJS, Builder.io's Mitosis)

Adopt a third-party visual editor and adapt our AST writer to its mutation events.

**Pros:** Heavy lifting done. Drag/resize/reorder included.
**Cons:** Massive dependency footprint. Locks our AST schema to theirs. Hard to make agent-native (their event models aren't designed for MCP). Existing v2 work doesn't compose with their internal state model. License + maintenance burden.
**Verdict:** Not chosen — premature optimization in the wrong direction; the direct-manip surface is bounded enough to build ourselves.

---

## Chosen direction (Option B)

**Two parallel work streams:**

1. **Structural mutation pipeline** — extends `canvasAstWriter` (TSX) and `canvasHtmlEditor` (HTML) with new mutation types: `insertChild`, `removeNode`, `reorderSibling`, `wrapSelection`, `unwrap`, `swapTag`. Each mutation returns a `canvasIdMap: { oldId: newId | null }` so the property panel rebases its selection in place after structural changes.

2. **Iframe drag-handle overlay** — a new parent-side `CanvasIframeOverlay` component renders 8 resize anchors + drag handle on top of the iframe, anchored to the selected element's rect (reported by the bridge). Pointer events translate iframe coordinates → canvas coordinates accounting for scale. Drag emits `setStyle` mutations (size/position) that go through the same writer.

**Per-node-type rollout:**

- **html (react) + html (inline)** — full direct manipulation (drag/resize, structural edits, panel buttons).
- **component** — variant cycling + numeric prop scrub (drag a number field). Direct-manip on the rendered DOM is out of scope (the rendered output is owned by the component definition; edit those via the html branch when authoring).
- **markdown** — block-level reorder + inline format toolbar. Direct-manip on the rendered HTML is read-only; edits flow through the markdown source.
- **media** — image crop handles, video clip trim handles, aspect-ratio resize.
- **mermaid** — click rendered node to edit label inline; structural edits via panel.
- **artboard** — drag children to reorder, drag gap slider; layout config remains in panel.
- **excalidraw, embed** — unchanged (delegate to external tooling).

**Mutation tracking:** every mutation returns an event payload the canvas state can consume to update selection + history. v3 introduces `CanvasMutationLog` (append-only, in-memory) so undo/redo works without re-reading source files on every step.

---

### Architecture sketch

```
┌─────────────────── Canvas (parent) ────────────────────┐
│                                                        │
│   ┌─────────────────────┐    ┌──────────────────────┐  │
│   │ Property Panel      │    │ CanvasIframeOverlay  │  │
│   │ - attrs/classes     │    │ - resize anchors     │  │
│   │ - structural buttons│    │ - drag handle        │  │
│   │   (insert, wrap,    │    │ - anchored to rect   │  │
│   │    reorder, ...)    │    │   from bridge        │  │
│   └──────────┬──────────┘    └──────────┬───────────┘  │
│              │                          │              │
│              ▼                          ▼              │
│   ┌────────────────────────────────────────────────┐   │
│   │ Mutation router → AST/HTML writers             │   │
│   │ - returns canvasIdMap for selection rebase     │   │
│   │ - emits CanvasMutationLog event                │   │
│   └────────────────┬───────────────────────────────┘   │
│                    ▼                                   │
│   ┌────────────────────────────────────────────────┐   │
│   │ /api/canvas/{ast,html}/write (structural ops)  │   │
│   │ /api/canvas/markdown/write   (block ops)       │   │
│   │ /api/canvas/media/write      (crop/trim)       │   │
│   │ /api/canvas/component/{props,variant} (write)  │   │
│   └────────────────┬───────────────────────────────┘   │
│                    ▼                                   │
│      MCP tools mirror every endpoint (parity)          │
└────────────────────────────────────────────────────────┘
```

---

## Phases

| # | Phase | Days | Demo at end |
|---|---|---|---|
| **V1** | **Structural AST writer extension (TSX + HTML)** | 4–5 | Panel buttons: Insert child, Remove, Move ↑/↓, Wrap in `<Stack>`, Unwrap, Swap tag. Both writers return `canvasIdMap`. Selection rebases automatically. |
| **V2** | **CanvasIframeOverlay (resize + move on selected element)** | 3–4 | Click element → 8 resize anchors + drag handle render on the parent canvas, anchored to the iframe rect. Drag emits `setStyle` mutations. Works under iframe scaling. |
| **V3** | **CanvasMutationLog + undo/redo** | 2 | Cmd-Z reverts the last mutation across any node type; Cmd-Shift-Z redoes. History survives canvas state edits but not file reloads. |
| **V4** | **Markdown direct edit** | 2 | Click a markdown block → inline edit; format toolbar (bold/italic/list). Drag block to reorder. Source markdown updates. |
| **V5** | **Component variant + prop scrub** | 2 | Numeric props get a drag-to-scrub UI (like Blender). Variant cycling via panel + keyboard. |
| **V6** | **Media crop + video clip handles** | 2 | Image crop with corner handles persisted as crop metadata; video clip-start/end via scrub-on-rail. |
| **V7** | **Artboard child reorder via drag** | 1 | Drag children inside an artboard to reorder. Gap slider. |
| **V8** | **Mermaid label inline edit** | 1 | Click a rendered Mermaid node → edit its label → mermaid source updates. |
| **V9** | **MCP audit + agent workflow docs** | 1 | Every direct-manip action has an MCP tool; agent can drive the whole loop. |

**Total core:** ~18–20 days.

---

## Per-node-type catalog (the surface area v3 promises)

For each node, this is what "edit" should mean by end of v3:

### html (sourceMode: react | inline)
- ✅ v2: attr/class/text edits via panel
- 🆕 v3: insert child / remove / reorder siblings / wrap in Stack / unwrap / swap tag (panel buttons)
- 🆕 v3: drag to move element within parent; resize via 8-corner handles on iframe overlay
- 🆕 v3: undo/redo across mutations

### component
- ✅ v1: variant picker, prop overrides via panel
- 🆕 v3: variant cycling via keyboard arrows; numeric prop scrub (drag-to-edit number)
- 🆕 v3: structural edits flow through the underlying source file (Button.tsx / Card.html), not through `customProps`

### markdown
- ✅ v0: source textarea
- 🆕 v3: click a rendered block (heading, paragraph, list item) → inline edit; format toolbar; block reorder via drag
- 🆕 v3: structural mutations on the markdown AST: insert block, remove block, change block type (h1 → h2 → p)

### media
- ✅ v0: src, alt, fit, clip-start/end
- 🆕 v3: image crop with persisted crop metadata (no destructive edit)
- 🆕 v3: video clip-trim handles on a scrub-bar
- 🆕 v3: aspect-ratio-locked resize

### mermaid
- ✅ v0: source textarea + theme
- 🆕 v3: click rendered node label → inline edit → source updates
- 🆕 v3: drag rendered node → updates layout hint in source (if mermaid supports it)

### artboard
- ✅ v0: layout config (flex/grid, gap, padding) via panel
- 🆕 v3: drag children to reorder
- 🆕 v3: drag-resize gap with live preview
- 🆕 v3: artboard-level "promote layout" — extract the artboard as a new HTML/TSX primitive

### excalidraw
- ✅ v0: open in embedded Excalidraw editor (delegates direct manipulation to Excalidraw itself)
- 🚫 v3: no new affordances — Excalidraw is the right tool for this surface

### embed
- ✅ v0: URL + sandbox + snapshot fallback
- 🚫 v3: no new affordances — external content, not authorable here

---

## Direct-manipulation primitives (shared across types)

Built once, reused by every node type that opts in:

- **Selection box** — current iframe overlay (rect from bridge), drawn on parent canvas.
- **Resize handles** — 8 anchors (4 corners + 4 edges); pointer events translated to mutation calls.
- **Drag handle** — center grab point on the selection; drag emits position deltas.
- **Drop targets** — when dragging from library or another node, render insert-zones between siblings.
- **Multi-select** — Shift-click to add to selection; group-transform (resize/move applies to all).
- **Snap guides** — visual lines at common positions (sibling edges, parent center, parent edges). Lightweight; no full alignment engine.
- **Inline-edit target** — for text content (heading, paragraph, button label), double-click → contenteditable on the iframe element; commit on blur → write back through AST.

These primitives are the v3 win. Each individual feature (V1–V9) reuses them; total cost is in the primitives, not per-feature.

---

## Risks & open questions

| Risk | Mitigation |
|---|---|
| Iframe scaling makes pointer-event coordinate math fragile | Use `getBoundingClientRect()` from the parent (which knows the iframe's transformed rect) and divide by scale; verify with golden tests at 50% / 100% / 200% |
| Element rect goes stale during drag (recompile re-renders the iframe) | Pause re-render during active drag; resume + rebase canvasId on drag end |
| Multi-iframe canvases (many HTML items) all listening to drag events | Bridge already filters by `event.source === iframeRef.current.contentWindow`; v3 confirms this scales |
| Structural edits invalidate existing canvasIds en masse | The mutation envelope returns `canvasIdMap`; the panel + selection state walk it on every write |
| Markdown direct edit conflicts with source-textarea edit | Lock the textarea while inline edit is active; broadcast cursor position |
| Component prop scrub vs. text input ambiguity | Numeric props get scrub; string/enum props get input/select. Detect by registered prop type |
| Undo/redo across cross-file mutations (e.g., promote-with-rewrite) | v3 ships per-file undo only; cross-file undo deferred to v4 |
| Agent parity for drag operations | Drag emits the same `setStyle` mutation an MCP tool can call directly with absolute values. The agent doesn't drag; it sets the final state. |

### Open questions

1. **Snap-to-grid vs. free positioning** — should drag snap to a default grid (8px), to sibling edges, to nothing? Likely sibling-edges + alignment guides for v3; full grid system deferred.
2. **Multi-select scope** — within one iframe only, or across iframes on the canvas? Single-iframe in v3; cross-iframe multi-select is its own design pass.
3. **Inline-edit conflicts** — what happens if the agent writes a class while the user is mid-drag? Lock the file during active drag (60s timeout); reject conflicting writes with a message.
4. **Component prop scrub UX** — how does the user know which props are scrubbable? Visual cue (a small drag-icon next to numeric inputs in the panel).
5. **Markdown block AST** — use a real markdown AST library (mdast) or regex-based block detection? Likely mdast for correctness; introduces a dep.
6. **Undo persistence** — survive page reload? In-memory only for v3 (user accepts session-bounded); persistent undo log is a v4 conversation.

---

## Scope

### In scope (v3 core)

- Structural mutation pipeline (TSX + HTML writers): insertChild, removeNode, reorderSibling, wrapSelection, unwrap, swapTag, with `canvasIdMap` rebase.
- CanvasIframeOverlay with 8-anchor resize + drag handle, scale-aware pointer math.
- CanvasMutationLog with per-file undo/redo (Cmd-Z / Cmd-Shift-Z).
- Markdown inline-edit + block reorder.
- Component variant cycling + numeric prop scrub.
- Media crop + clip-trim handles.
- Artboard child reorder + gap slider.
- Mermaid inline label edit.
- MCP parity for every new operation; docs update.

### Deferred / out-of-scope

- **Excalidraw + embed** — no new affordances (delegate to external tools).
- **Cross-iframe multi-select** — single-iframe only in v3.
- **Persistent undo across reload** — session-bounded; v4 conversation.
- **Cross-file mutations in undo** — per-file only.
- **Snap-to-grid (full alignment system)** — sibling-edge guides only.
- **Auto-layout intent inference** — explicitly out (matches v2's stance).
- **Promote-with-parent-rewrite** — still deferred (needs runtime include mechanism).
- **Custom plugin / extension API for new node types** — v3 keeps the type list closed.
- **Drag handles on the canvas item itself** (not the iframe content) — already exists; v3 doesn't change canvas item drag.

---

## References

- v1 spec: `docs/specs/2026-04-27-canvas-figma-like-editing.md`
- v2 spec: `docs/specs/2026-05-05-canvas-web-native-editing.md`
- v1 AST writer: `utils/canvasAstWriter.ts`
- v2 HTML editor: `utils/canvasHtmlEditor.ts`
- v2 click bridge: `utils/canvasReactNodeBridge.ts`
- Agent workflow docs: `docs/CANVAS_AGENT_MCP_COMMANDS.md`
- Node type definitions: `types/canvas.ts`
