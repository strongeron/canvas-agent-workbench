---
title: "feat: Canvas v3 — direct manipulation across all node types"
type: feat
status: active
date: 2026-05-05
origin: docs/specs/2026-05-05-canvas-v3-direct-manipulation.md
deepened: 2026-05-05
---

## Progress log

Tracks what has actually shipped against this plan. Dates are commit dates.

### 2026-05-13 — branch prep + foundation units

Branch `feat/canvas-figma-like-editing` was cleaned of stale uncommitted state, then three foundation units of v3 shipped behind it. Test suite at 291/291 on this date; lint and typecheck clean throughout. (As of 2026-05-14, after U1/U2/U3/U5/U6 slices landed, the suite is at 413/413.)

**Cleanup (precondition):**
- `be7fc7c` HEAD repair — committed local-scan source files (`utils/localScanConfig.js`, `components/local-scan/*`, `demo/favicon.svg`) that committed config already imported but were never staged
- `13003c2` Wired Tailwind content scan, favicon, and Tailwind v4 `bg-linear-to-*` compat shim
- `41fd5f7` Canvas selected-state polish + token consistency in props panel
- `5ae7616` `.gitignore` expansion (machine-local scan output, caches, review screenshots)
- `226afb8` Seeded `projects/demo/canvases/**` as starter fixture
- `d045232` Dead-import cleanup in `PortableComponentRenderer` / `PortableGalleryPage`

**v3 foundation shipped:**
- `22a8e6a` **U4a — pure coordinate math.** `utils/canvasIframeCoordinates.ts` with `screenDeltaToIframeLocal`, `screenPointToIframeLocal`, `iframeLocalPointToScreen`, `iframeLocalRectToScreen`. 15 golden tests cover `s ∈ {0.5, 1, 2} × t ∈ {0.5, 1, 2}` and the pan-invariance of deltas. Rotation explicitly excluded.
- `8cf8de2` **U13 — bidirectional bridge.** `utils/canvasReactNodeBridge.ts` extended with three new inbound handlers (`canvas/refresh-rect`, `canvas/edit-start`, `canvas/edit-commit`) plus two new outbound message types (`canvas/rect-update`, `canvas/edit-result`). New v3 handlers gate on marker + version + origin; legacy `canvas/request-select` / `canvas/request-clear` keep their permissive contract for U8 MCP back-compat. Module also exports `buildRefreshRectRequest` / `buildEditStartRequest` / `buildEditCommitRequest` builders so consumers don't reach into the wire format. 11 new bridge tests.
- `145c266` **U4a — overlay UI.** `components/canvas/CanvasIframeOverlay.tsx` is a pure-render component: takes a screen-coord rect, draws 8 corner/edge resize handles + a center move handle, captures pointer events via `setPointerCapture` so drag survives iframe boundaries, and emits screen-coord deltas through `onDragPreview` / `onDragCommit`. 8 render + pointer tests.

**U4a split (decision made during implementation):**
The plan's single U4a unit was split into eight slices for cleaner review and test isolation:
1. **Math** (`22a8e6a`) — pure functions, no DOM, no React. 15 golden tests.
2. **Overlay UI** (`145c266`) — pure render, no coordinate-system knowledge, no writer integration. 8 render/pointer tests.
3. **Frame integration** (`f3aac50`) — CanvasHtmlFrame hosts the overlay in interact mode, applies `canvas/rect-update` to re-anchor.
4. **canvasScale + delta plumb** (`5a53545`) — overlay → iframe-local delta translation; new `onReactNodeResize` typed callback.
5. **Snap table** (`3aa4dab`) — pure Tailwind v3 size scale + `nearestSnap(px)` resolver. 12 tests.
6. **Delta translator** (`2f39979`) — `computeResizeMutation` produces a `setClassName` or null no-op. 16 tests.
7. **Dispatcher** (`e4c6bbc`) — `dispatchCanvasResize` orchestrates read → translate → write through existing endpoints. 9 mocked-fetch tests.
8. **End-to-end wiring** (`1416c78`) — props threaded through `CanvasWorkspace → items → frame`; `CanvasTab.handleReactNodeResize` mirrors the existing property-panel source-state pattern.

**End-to-end flow now closed.** User drag → overlay screen delta → iframe-local delta → AST read → snap → AST write → source rewrite → iframe recompile → bridge re-emits rect → overlay re-anchors. Pending visual verification in a browser.

---

## Post-review revisions (round 1)

This plan was reviewed via `ce-doc-review` (6 personas: coherence, feasibility, design, security, scope-guardian, adversarial). Material changes applied below:

- **canvasIdMap is identity-based, not positional.** Wrap/insert/reorder cannot be paired by positional walk because AST-path ids shift in non-trivial ways (every descendant changes after a wrap). U1+U2 now thread a `data-canvas-stable-id` attribute through ts.factory / parse5 mutations and use it for old→new id mapping. Hash-based ids are still used for *initial* injection; structural mutations carry stable ids forward.
- **TSX trivia preservation: chosen `recast`.** `ts.createPrinter` reformats the parent subtree on reprint, which destroys the trivia the offset writer carefully preserves. recast preserves untouched-node source byte-for-byte and only re-prints touched nodes. Decision moves out of risk row into Key Technical Decisions.
- **Bridge protocol is bidirectional in v3** — added new U13 (parent→iframe message handlers). U3, U4, U6 all depend on it. The original "reused as-is" claim was wrong.
- **U4 split into U4a + U4b.** U4a (drag-resize via existing setClassName writer + coordinate math) has zero structural deps and lands first to de-risk coord math early. U4b (drop targets + structural drag) depends on U1+U2.
- **U9 corrected.** Artboard children are CanvasItems in canvas state, not source-file DOM nodes. Removed false U1+U2 dependency; uses existing `update_item` operation. `canvasArtboardWrite.ts` removed from output.
- **Mutation log: byte-snapshot, hard memory cap.** Resolved the line 135 vs 449 contradiction. Stores `{ preMutationSource, postMutationSource }` per entry. Caps at 25 entries per file and 50MB total log size with size-aware FIFO eviction. The "decide after profiling" phrasing removed.
- **Inline-edit lock substrate specified** — vite dev-server in-memory map keyed by file path with 5s heartbeat from the editing UI; expires on missed heartbeats.
- **Workspace-containment guard explicit on every new endpoint.** Each new write endpoint imports `resolveWorkspacePath` from `vite/api/canvasAstWrite.ts` with a per-endpoint extension allowlist.
- **CanvasHtmlFrame scale prop interface change called out.** v3 adds `canvasScale: number` to `CanvasHtmlFrameProps`; CanvasTab supplies it from the canvas transform.
- **Coordinate math: pan included, rotation excluded.** Scope boundary: v3 assumes `canvas transform = scale ∘ translate` only (no rotation).
- **U12 anchored to new R14** (visual feedback during library drag) — was previously orphaned with no requirement backing.
- **U6 markdown deps surfaced** — `unified` + `remark-parse` + `remark-stringify` listed under Dependencies, not just package.json modify; test scenarios grounded against the realistic R7 scope (plain block edits + reorder + bold).
- **Spec mismatch resolved**: artboard "promote layout" (spec line 194) is **out of v3** and noted in spec follow-up.
- **U8 `canvasMediaWrite.ts` removed** — media crop/clip is canvas-state only via `update_item`. No new endpoint.
- **Mermaid label edit fallback criterion added** — if bridge cannot see SVG `data-id` attributes after U13 lands, U10 falls back to source-textarea-only without further bridge work.
- **Memory/security note on mutation log**: log entries hold full file source; documented as v3 constraint that secrets-in-source flow into client memory.

Findings deferred to per-phase implementation checklists (design states, panel layouts, structural-button affordances, snap-guide visuals): captured in each unit's "UX details to specify" line where applicable; not load-bearing for plan approval.

---

# feat: Canvas v3 — direct manipulation across all node types

## Overview

Extend the shipped v1+v2 canvas editing infrastructure with **direct-manipulation affordances** — drag handles, resize anchors, structural AST mutations, inline text edit, undo/redo — across the 8 canvas node types. The goal: every node type that owns its source surfaces visible direct-manipulation tools (not just panel buttons), and the agent has parity with each.

This is purely additive. v1 (TSX track U1–U6), v2 (web-native P1–P4, P6–P8), and the shipped click bridge / property panel / writers all keep working unchanged. v3 adds new mutation types, a parent-side iframe overlay, a mutation log, and per-node-type editing surfaces.

---

## Problem Frame

v2 ships "Figma's right panel + library + tokens." Click → panel → edit → save works for HTML and React TSX nodes. What's missing is **direct visual manipulation**: drag elements inside the iframe, resize with corner handles, reorder siblings by dragging, wrap a selection in a Stack, scrub numeric props. Every operation today requires a panel or a class-name typed into a text field.

This is the core of what users mean when they say "Figma-like." The spec at `docs/specs/2026-05-05-canvas-v3-direct-manipulation.md` lays out the user-facing surface: a parent-side overlay rendering 8 resize anchors + drag handle on the selected element, with all drag operations emitting the same mutations the panel emits. Per-node-type, each surface declares what direct-manipulation it supports (HTML/TSX get full structural + drag, markdown gets inline-edit + reorder, media gets crop + trim, etc.).

---

## Current state of the system (as-built review)

Before planning new work, this is what's actually shipped and reusable:

### Mutation writers (reusable, need extension)

- **`utils/canvasAstWriter.ts`** (343 lines) — TSX writer. Offset-based string-replacement model with overlap rejection (`findOverlap`). `CanvasAstMutation` is a closed union: `setTextChild | setClassName | setPropValue`. **No insertion API, no reparent API, no canvasId-rebase strategy.** Extending it for structural edits (insert child, remove, reorder) means moving from offset-replacements to a node-replacement-and-reprint model — see U1 below.
- **`utils/canvasHtmlEditor.ts`** (500 lines) — HTML writer using parse5. Already richer than the TSX writer: supports `setTextContent`, `setAttribute`, `setClassName`, `setTextChild`, `setPropValue`. Source-location-aware (`element.sourceCodeLocation.startTag/endTag`). The recently-fixed `resolveHtmlPath` indexes children by position. Extending it for structural edits is easier than TSX because parse5 round-trips serialization cleanly — see U2 below.

### Click bridge (reusable as-is)

- **`utils/canvasReactNodeBridge.ts`** (400 lines) — postMessage protocol with versioning, marker-based filtering, and a built-in `buildBridgeScript()` that emits a self-contained click-handler injectable into both `<script>`-loaded TSX previews and parse5-injected inline HTML. Messages today: `canvas/select`, `canvas/hover`, `canvas/ready`. The protocol already filters by `event.source === iframeRef.current.contentWindow` and supports throttled hover. **Reusable for v3** — drag operations don't need new message types because drag computes from rect deltas on the parent side.

### Iframe rendering + selection state (foundation for overlay)

- **`components/canvas/CanvasHtmlFrame.tsx`** (318 lines) — already tracks `selectionRect` and `hoverRect` in component state, anchored to the iframe via the bridge. Already renders selection/hover outlines as absolute-positioned overlays *on the parent canvas* (lines 273–290). This is the foundation v3's `CanvasIframeOverlay` extends — instead of just rendering an outline, the overlay also renders 8 resize anchors + a drag handle attached to the selection rect.

### Type model (extension targets)

- **`types/canvas.ts`** — 8 item types: component, embed, html, media, mermaid, excalidraw, markdown, artboard. Each has source/content fields specific to its kind. v3 adds:
  - `mutationLogId?: string` to `CanvasItemBase` (links into the global mutation log for undo)
  - `crop?: { x, y, w, h }` and `clip?: { startSec, endSec }` already partially exist on `CanvasMediaItem` — need confirmation they're used end-to-end

### What's *not* there and must be invented

- **Structural mutations** in either writer (insert, remove, reorder, wrap, unwrap, swap-tag).
- **canvasIdMap rebase** — the writers today just return new source; they don't tell the panel "the element you had selected is now at id X."
- **CanvasIframeOverlay component** — the resize anchors + drag handle UI doesn't exist.
- **Pointer-event coordinate translation** — converting mouse moves on the parent canvas (which has its own scale/pan) to source mutations (in iframe-local coords, possibly under their own scale).
- **CanvasMutationLog** — append-only event log tying together mutations across files and node types for undo/redo.
- **Per-node-type direct-manip plumbing** for markdown blocks, media crop, mermaid labels, artboard reorder, component scrub.

---

## Requirements Trace

- R1. Click an element in an HTML or TSX iframe → 8 resize anchors + drag handle render on the parent canvas, anchored to the selection rect. *(see origin: spec §"Architecture sketch")*
- R2. Dragging a resize anchor emits a mutation that updates the element's size in source. The mutation goes through the same writer the panel uses.
- R3. Dragging the drag handle emits a position mutation that updates the element's position (inline style or via class changes per element type).
- R4. The property panel offers buttons for structural edits — `Insert child`, `Remove`, `Move ↑`, `Move ↓`, `Wrap in Stack`, `Unwrap`, `Swap tag` — for the selected element.
- R5. After any structural mutation, the writer returns a `canvasIdMap` so the property panel rebases its current selection to the new id of the same node (or null if the node was removed).
- R6. Cmd-Z reverts the last mutation across any node type. Cmd-Shift-Z redoes. History is in-memory and survives canvas state edits but not page reloads.
- R7. Markdown nodes support click-to-inline-edit on rendered blocks; format toolbar (bold/italic/list); drag-to-reorder blocks. Source markdown updates.
- R8. Component nodes support keyboard variant cycling and numeric prop scrub (drag a number field to change value).
- R9. Media nodes support image crop handles (persisted as crop metadata) and video clip-trim handles.
- R10. Artboard children can be drag-reordered within the artboard. Gap is drag-adjustable.
- R11. Mermaid nodes support clicking a rendered node label to edit it inline; source mermaid updates.
- R12. Every direct-manipulation action is reachable through MCP — agent calls produce identical results to UI drags.
- R13. Iframe scaling (item rendered at 50% / 100% / 200% canvas zoom) does not break pointer math — handles stay anchored, drags compute correctly. Coordinate math also handles canvas pan offset; **rotation is explicitly out of scope** (canvas transform = scale ∘ translate only).
- R14. Drop-target visual feedback — when a primitive is dragged from the library or another canvas item, drop-zone insert lines render between siblings of the hovered parent, and a wrap affordance highlights leaf elements. Clears on drop or cancel.

**Phase mapping (spec V → plan U):** V1→U1+U2, V2→U4a, V3→U5, V4→U6, V5→U7, V6→U8, V7→U9, V8→U10, V9→U11. New U-IDs introduced by the plan (no spec-V counterpart): U3 (canvasIdMap rebase + selection state propagation, infra), U4b + U12 (drop targets, deferred from spec primitives section), U13 (bridge bidirectional protocol, infrastructure prereq).

**Origin actors:** human designer (drags, scrubs, clicks); agent (MCP-driven mutations); pair (mixed sessions on same source).
**Origin flows:** F1 click → handles render; F2 drag-resize → source mutates → iframe re-renders → handles re-anchor; F3 click structural button → AST mutation → canvasIdMap rebase → selection follows; F4 Cmd-Z → mutation log replays inverse.
**Origin acceptance examples:** AE1 click a button in an HTML iframe → 8 anchors render → drag a corner → element class changes from `w-32` to `w-48` → file updates → iframe re-renders. AE2 select a text block → click "Wrap in Stack" → JSX/HTML wraps the selection → canvas shows the new Stack. AE3 drag a media node's crop handle → crop metadata persists → screenshot/export uses the crop. AE4 Cmd-Z after a wrap → reverts.

---

## Scope Boundaries

- **No structural mutations on excalidraw or embed nodes.** Excalidraw delegates to its own editor; embed is read-only external content.
- **No drag handles on the canvas item itself.** Existing canvas item drag (positioning whole nodes on the board) is unchanged. v3 adds drag handles *inside* the iframe on individual rendered elements.
- **No auto-layout intent inference.** Users still hand-edit className for flex/grid switches. (Matches v2's stance.)
- **No multi-iframe multi-select.** Selection is single-iframe + single-element (with Shift-click for multi within one iframe). Cross-iframe multi-select is its own design.
- **No persistent undo across page reloads.** Mutation log is in-memory per session.
- **No cross-file undo for promote-with-rewrite.** Per-file undo only; cross-file mutations sit at the boundary of v3.
- **No new node types.** v3 keeps the 8-type list closed.
- **No plugin / extension API.** Built-in node types only.

### Deferred to Follow-Up Work

- **Persistent mutation log** (across reloads) — v4 conversation.
- **Cross-iframe multi-select + group transform** — separate spec.
- **Snap-to-grid (full alignment system)** — sibling-edge guides only in v3.
- **Promote-with-parent-rewrite** for HTML — still needs runtime include mechanism.
- **TSX direct-manipulation drag** beyond literal class mutations — v3 ships TSX class/style edits via drag, but not full JSX restructuring through drag (use panel buttons for that).

---

## Context & Research

### Relevant Code and Patterns

- `utils/canvasAstWriter.ts` — TSX offset-based writer. v3 extends with structural mutations; needs node-replacement-and-reprint model alongside existing offset model (see U1).
- `utils/canvasHtmlEditor.ts` — parse5 HTML writer. v3 adds insert/remove/reorder/wrap/unwrap/swap-tag using parse5's tree manipulation + serialize round-trip (see U2).
- `utils/canvasReactNodeBridge.ts` — postMessage protocol. Reused as-is in v3.
- `components/canvas/CanvasHtmlFrame.tsx` lines 273–290 — existing parent-canvas overlay rendering (selection/hover outlines). v3's `CanvasIframeOverlay` is built on this same anchoring approach.
- `components/canvas/CanvasReactNodePropertyPanel.tsx` — panel that hosts Apply for AST mutations. v3 adds structural-edit buttons here.
- `vite/api/canvasAstWrite.ts` — endpoint with mtime guard + atomic temp+rename. Pattern for v3's new endpoints (markdown/write, media/crop, etc.).
- `bin/canvas-mcp-server` lines 290–390 — MCP tool registration pattern (`read_html_node`, `update_html_node`, `create_component_from_*`, `promote_to_component`). v3 mirrors for new operations.

### Institutional Learnings

- **Iframe throttling** — `Inbox/raw/2026-04-26 Canvas iframe animations — Chrome throttling and the limits of shimming.md`: scaled/offscreen iframes pause JS. Implications for v3: drag math runs from the parent (which doesn't throttle); user drag events are not affected because they're input-driven, not scheduler-driven.
- **canvasId stability** — U1's `data-canvas-id` is a hash of `<file path>:<AST path>`. Adding a wrapper element keeps deeper ids stable; structural mutations *break* this. v3's `canvasIdMap` is the resolution: writers return old→new id mapping per mutation.
- **In-app inspectors pay for themselves** — the iframe debug panel from v1+v2 caught real bugs fast. v3 should ship with a "show me the active mutation log" diagnostic from day one (build-into-the-panel, no separate window).

### External References

- Excalidraw selection + resize tooling — model for the 8-anchor pattern, but built parent-side rather than within the canvas iframe.
- Builder.io's drag-into-existing-element flow — drop-zone visualization between siblings; v3 mirrors the visual pattern (insert lines between rendered children when a primitive is dragged from the library).
- mdast (`unified` ecosystem) for U6's markdown block AST — well-typed, supports round-trip, supports remark plugins for extension.

---

## Key Technical Decisions

- **Two writers, two mutation models.** TSX stays offset-based for literal mutations (existing) and gains a node-replacement model for structural (new) using **recast** (preserves trivia for untouched siblings; only re-prints mutated subtrees). HTML uses parse5 throughout. Dispatch by file extension is unchanged.
- **AST library: recast.** Chosen over `ts.factory` + `createPrinter` (which reformats the parent subtree, dropping comments and blank lines) and over ts-morph (~30MB+ install, same trivia semantics as the raw printer). recast adds ~5MB and round-trips trivia for unchanged nodes. Scope: only the mutated node region is reprinted; everything else stays as raw source slices.
- **canvasIdMap is identity-based, not positional.** Every JSX/HTML element gets a stable identity attribute (`data-canvas-stable-id`) injected during structural mutations and threaded through ts-factory / parse5 mutation calls. Initial canvasIds are still hash-derived (existing v1+v2 behavior); structural mutations carry the stable id forward and the writer returns `canvasIdMap[oldHashId] = newHashId | null` resolved via stable ids. Hash ids are recomputed for the new tree; stable ids let the writer pair semantically-identical nodes across the mutation boundary.
- **Mutation envelope.** Every writer returns `{ ok, source, appliedMutations, canvasIdMap, prevSourceSnapshot }` where `canvasIdMap[oldId] = newId | null` (empty for non-structural mutations) and `prevSourceSnapshot` is the source text before the mutation (used by U5 for undo).
- **Drag math runs parent-side.** The bridge reports element rects; pointer events fire on the parent canvas. No iframe-side drag handlers — they wouldn't survive throttling and would confuse coordinate translation. The overlay is a pure parent component anchored to bridge-reported rects.
- **Bridge is bidirectional in v3.** v1+v2 protocol was iframe→parent only. v3 adds parent→iframe messages: `canvas/refresh-rect` (re-emit a rect for a given canvasId after recompile), `canvas/edit-start` (turn on contenteditable on the matched element), `canvas/edit-commit` (signal to release contenteditable). Inbound handlers are added to the injected bridge script with the same versioning + origin filtering. New U13 owns this work.
- **Mutation log: byte-snapshot, hard memory cap.** `CanvasMutationLog` lives in `CanvasTab` state, indexed by file path. Each entry: `{ id, timestamp, filePath, mutations, canvasIdMap, prevSourceSnapshot, postSourceSnapshot }`. **Cap: 25 entries per file, 50MB total log size; size-aware FIFO eviction (largest oldest entry evicted first).** Documented constraint: log entries hold full source; secrets in source code flow into client memory and are reachable by any same-origin script — v3 ships with this limitation.
- **Inline text edit uses contenteditable on the iframe element.** Bridge sends `canvas/edit-start`; iframe sets `contenteditable="true"` on the matched element; commit on blur sends `canvas/edit-commit` with the new text → writer mutation. No textarea overlay (visual position would drift).
- **Inline-edit lock substrate**: vite dev-server in-memory map `Map<absoluteFilePath, { until: timestamp, sessionId: string }>`. Editing UI sends a heartbeat every 5s; lock auto-expires 8s after last heartbeat (gives 1 retry slack). MCP tool calls and direct API writes consult the same map and return 409 `inline-edit-active` when the file is locked by another session. Browser tab close → no heartbeat → lock expires within 8s.
- **Workspace-containment guard everywhere.** Every new file-write endpoint imports `resolveWorkspacePath` from `vite/api/canvasAstWrite.ts` with a per-endpoint extension allowlist (markdown writes accept `.md` only, etc.). Specified per-endpoint in U6/U10/U11.
- **`childSource` parse validation on write.** insertChild and wrapSelection mutations parse the supplied `childSource` before splicing — TSX through recast/typescript, HTML through parse5. Invalid source returns 400 `parse-error` with no file change. Top-level imports/scripts in `childSource` are rejected (HTML disallows `<script>` and `<iframe>`; TSX rejects `ImportDeclaration` outside the root module).
- **Markdown uses mdast (unified/remark).** New runtime deps: `unified`, `remark-parse`, `remark-stringify`. Combined ~150KB minified. Justified by R7 scope (block reorder + inline format toolbar): regex-based block splitter would handle reorder but not inline `strong`/`emphasis`/`list` wrapping cleanly.
- **Component prop scrub uses a numeric drag-to-edit input.** Detect "numeric prop" by the prop's TypeScript type (number | percentage | em/rem string with leading number). Visual cue: drag-icon next to the input. Implementation: pointer-down + `requestPointerLock()` for unbounded drag; cumulative delta updates the value through the existing `setPropValue` mutation. (Lock applied on the parent panel input, not the iframe — no sandbox attribute change required.)

---

## Open Questions

### Resolved During Planning

- **Snap-to-grid scope** — sibling-edge guides only in v3; full grid system deferred. Keeps the alignment engine narrow.
- **Multi-select scope** — single-iframe only via Shift-click; cross-iframe deferred.
- **Inline-edit conflict policy** — file is locked for writes during active inline edit (60s timeout); agent writes return 409 with `inline-edit-active` code.
- **Markdown AST library** — mdast (unified ecosystem). Small dep, typed, round-trip clean.
- **Component scrub UX cue** — drag-icon next to numeric inputs in the panel. PointerLock for the drag itself.

### Deferred to Implementation

- **Exact pointer-coordinate math under nested transforms** — the iframe is inside the canvas, which has its own pan/zoom. The raw `getBoundingClientRect()` on the parent gives transformed coords; verify the math at 50% / 100% / 200% canvas zoom × 50% / 100% / 200% iframe zoom in U4 testing.
- **Rect-stale-during-drag handling** — when a re-render fires mid-drag (because a className changed), the rect may shift. Decide in U4: pause re-render during active drag, or rebase on each frame from new bridge messages.
- **Undo log ergonomics** — should undo replay through the writer (slow but correct) or store inverse source bytes (fast but doubles memory)? Decide in U5 after profiling a 100-mutation session.
- **Markdown block-level boundary detection** — does each top-level mdast node count as one block, or are list items siblings of their parent list? Decide in U6 by writing the test cases first.
- **Mermaid label edit click target** — mermaid renders SVG; the click target is `<text>` inside `<g>`. Verify which element the bridge sees and whether to extend bridge to handle SVG-namespaced data attributes.

---

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

```
                     ┌────────────────── Canvas (parent, scale s) ──────────────────┐
                     │                                                              │
                     │   ┌─────────────────────┐    ┌──────────────────────────┐    │
   property panel ───┤   │ Property Panel      │    │ CanvasIframeOverlay      │    │
                     │   │ - attrs/classes     │    │ ┌──┐                ┌──┐ │    │
                     │   │ - text editor       │    │ │NW│      drag      │NE│ │    │
                     │   │ - structural btns:  │    │ └──┘    handle      └──┘ │    │
                     │   │   ↑ ↓ Wrap Unwrap   │    │      (anchored to        │    │
                     │   │   Insert Remove     │    │       bridge rect)       │    │
                     │   │   Swap tag          │    │ ┌──┐                ┌──┐ │    │
                     │   │ - undo/redo         │    │ │SW│                │SE│ │    │
                     │   └────────┬────────────┘    │ └──┘                └──┘ │    │
                     │            │                 └────────────┬─────────────┘    │
                     │            ▼                              ▼                  │
                     │   ┌──────────────────────────────────────────────────┐       │
                     │   │ Mutation router                                  │       │
                     │   │ in: { fileKind, mutation, canvasId }             │       │
                     │   │ out: { source, canvasIdMap, logEntry }           │       │
                     │   │ ─ dispatches to canvasAstWriter (TSX)            │       │
                     │   │ ─ dispatches to canvasHtmlEditor (HTML)          │       │
                     │   │ ─ dispatches to canvasMarkdownWriter (md)        │       │
                     │   │ ─ dispatches to mediaCropWriter (media)          │       │
                     │   │ ─ pushes onto CanvasMutationLog                  │       │
                     │   └──────────────────────┬───────────────────────────┘       │
                     │                          ▼                                   │
                     │   /api/canvas/{ast,html,markdown,media,artboard}/write       │
                     │   /api/canvas/component/{props,variant}                      │
                     │   ─ all carry mtime + return canvasIdMap                     │
                     │                                                              │
                     │   MCP tools mirror every endpoint (parity)                   │
                     └──────────────────────────────────────────────────────────────┘
                                              │
                                              ▼
                     ┌──── Iframe (preview, scale t inside canvas s) ───────────────┐
                     │                                                              │
                     │   click → bridge → postMessage("canvas/select", rect)        │
                     │   inline-edit → contenteditable on element → blur commits    │
                     │                                                              │
                     │   no drag handlers iframe-side; pointer events fire on       │
                     │   the parent canvas, not the iframe DOM.                     │
                     └──────────────────────────────────────────────────────────────┘
```

Coordinate math sketch:

- Canvas at scale `s` (canvas zoom), iframe at scale `t` (item zoom) inside the canvas.
- The bridge reports rects in iframe-local coords.
- The overlay renders at `parentRect = iframeOnCanvas.position + bridgeRect * t * s`.
- A pointer move of `(dx_screen, dy_screen)` translates to `(dx_screen / (s * t), dy_screen / (s * t))` in iframe-local coords.
- Rect math is verified by golden tests at 50% / 100% / 200% on each axis.

---

## Output Structure

```
utils/
  canvasAstWriter.ts                  (modify — add structural mutations + recast integration)
  canvasHtmlEditor.ts                 (modify — add structural mutations)
  canvasReactNodeBridge.ts            (modify — bidirectional message handlers in injected script)
  canvasMarkdownWriter.ts             (new — mdast-based block + inline mutations)
  canvasMutationLog.ts                (new — append-only log with byte snapshots)
  canvasIframeCoordinates.ts          (new — pointer ↔ iframe coordinate math)
  canvasInlineEditLock.ts             (new — vite dev-server in-memory lock map + heartbeat)

components/canvas/
  CanvasIframeOverlay.tsx             (new — 8 resize anchors + drag handle)
  CanvasReactNodePropertyPanel.tsx    (modify — structural-edit buttons + undo/redo + lock toast)
  CanvasMarkdownItem.tsx              (modify — inline-edit + block reorder)
  CanvasMermaidItem.tsx               (modify — clickable label edit)
  CanvasMediaItem.tsx                 (modify — crop + clip handles via canvas-state update)
  CanvasArtboardItem.tsx              (modify — child reorder via update_item; gap drag)
  CanvasHtmlFrame.tsx                 (modify — host overlay; new canvasScale prop)

vite/api/
  canvasMarkdownWrite.ts              (new — uses resolveWorkspacePath with .md allowlist)
  canvasInlineEditLock.ts             (new — POST endpoints for acquire/release/heartbeat)
  canvasAstWrite.ts                   (modify — extended mutation dispatch + lock check)

bin/
  canvas-mcp-server                   (modify — register apply_structural_mutation, etc.)
  canvas-agent-runtime.mjs            (modify — runtime helpers)

tests/
  canvasAstStructural.test.ts         (new)
  canvasHtmlStructural.test.ts        (new)
  canvasMarkdownWriter.test.ts        (new)
  canvasMutationLog.test.ts           (new)
  canvasIframeCoordinates.test.ts     (new — pan + scale, no rotation)
  canvasIframeOverlay.test.tsx        (new)
  canvasInlineEditLock.test.ts        (new)
  canvasReactNodeBridge.test.ts       (modify — bidirectional protocol)

types/canvas.ts                       (modify — mutationLogId on CanvasItemBase, crop/clip on CanvasMediaItem)

docs/CANVAS_AGENT_MCP_COMMANDS.md     (modify — direct-manipulation workflows)
```

---

## Implementation Units

- U1. **Structural AST mutations for TSX (recast + identity tracking)**  *(implementation revised 2026-05-13: offset-based TS-AST surgery chosen over recast — see `docs/goal.md` § U1 architectural decision. Existing `canvasAstWriter` already preserves trivia via `node.getStart()/getEnd()` + `applyReplacements`; structural mutations extend that pattern instead of introducing a Babel AST. The recast-based body below is preserved for context.)*

**Goal:** Extend `canvasAstWriter` with `insertChild`, `removeNode`, `reorderSibling`, `wrapSelection`, `unwrap`, `swapTag` mutations. Each returns a `canvasIdMap: Record<string, string | null>` mapping old→new ids and a `prevSourceSnapshot` for the mutation log. Existing offset-based literal-mutation path is unchanged; structural mutations use **recast** (preserves trivia for untouched siblings) + identity-based id tracking (`data-canvas-stable-id` threaded through factory mutations).

**Requirements:** R4, R5

**Dependencies:** None (extends existing writer; recast is a new dep).

**Files:**
- Modify: `utils/canvasAstWriter.ts`
- Modify: `package.json` — add `recast` (~5MB)
- Create: `tests/canvasAstStructural.test.ts`

**Approach:**
- Add new union members to `CanvasAstMutation`: `{ type: "insertChild", parentCanvasId, position, childSource }`, `{ type: "removeNode", canvasId }`, `{ type: "reorderSibling", canvasId, direction: "up" | "down" }`, `{ type: "wrapSelection", canvasId, wrapperTag, wrapperAttrs? }`, `{ type: "unwrap", canvasId }`, `{ type: "swapTag", canvasId, newTag }`.
- For structural mutations: parse the source via `recast.parse(source, { parser: typescriptParser })`, locate the AST node by canvasId, mutate the tree (insert/remove/reorder/wrap/unwrap/replace), then `recast.print(ast).code`. recast emits unmodified subtrees as raw source slices and only reprints touched nodes.
- **Identity-based canvasIdMap:** before mutation, walk the AST and assign every JSX element a `data-canvas-stable-id={hash(initialAstPath)}` attribute (transient, not written to disk — kept in a WeakMap keyed by AST node). Carry stable ids forward through factory.update calls. After mutation, recompute the hash-based canvasId for the new AST and pair old→new by stable id.
- **Parse validation on `childSource`:** parse via recast/typescript before splicing. Reject if (a) parse fails (`parse-error` 400), (b) contains top-level `ImportDeclaration` (`unsupported-source` 400), (c) is not a single JSX expression.

**Execution note:** Test-first. Real fixtures (`Button.tsx`, a small page with multiple JSX children) so each mutation type is verified end-to-end before integration. Specifically test the trivia preservation claim: a no-op insertChild + removeNode round-trip must be byte-identical for sibling source outside the mutation point.

**Patterns to follow:**
- Existing `writeCanvasAstNode` envelope shape.
- `injectCanvasElementIds` for the canvasId hash logic on the new AST.
- recast's `prettyPrint` config to match the project's existing TS style.

**Test scenarios:**
- *Happy path:* insert a `<span>Hello</span>` as the first child of a `<div>` → file mutates → canvasIdMap shows the new span's id and updated ids for shifted siblings.
- *Happy path:* remove a JSX element → file mutates → canvasIdMap[removed.id] === null; siblings re-indexed.
- *Happy path:* reorderSibling moves a child up by one → file mutates → both swapped siblings have new ids in the map.
- *Happy path:* wrapSelection wraps an element in `<Stack>` → wrapper takes the selected position; original element becomes wrapper's child with a new id.
- *Happy path:* unwrap lifts a wrapper's children to its position → wrapper id removed; children get new ids.
- *Happy path:* swapTag changes `<div>` to `<section>` → element id may change (depending on whether tag is part of the hash); className/children preserved byte-identical except the tag.
- *Edge case:* insertChild into an element with `cn(...)` className expression → mutation succeeds; children unaffected by computed className.
- *Edge case:* wrap a selection that includes a JSX expression (`{flag && <Foo/>}`) → expression preserved as wrapper child.
- *Error path:* insertChild with malformed `childSource` → 400 with parse-error code; file unchanged.
- *Error path:* reorderSibling at out-of-range index → 400; file unchanged.
- *Integration:* round-trip a full file through one structural mutation + literal mutation → file is byte-identical after no-op cycle.
- *Stability:* same source + same mutation → same `canvasIdMap` (deterministic).

**Verification:**
- All 6 structural mutation types pass round-trip tests on real primitive files.
- `canvasIdMap` is non-empty for every structural mutation.
- Existing literal mutations still pass (no regression).

---

- U2. **Structural HTML mutations**

**Goal:** Extend `canvasHtmlEditor` with the same 6 structural mutations as U1, but using parse5 tree operations + serialize round-trip. Same envelope shape (canvasIdMap returned).

**Requirements:** R4, R5

**Dependencies:** None.

**Files:**
- Modify: `utils/canvasHtmlEditor.ts`
- Create: `tests/canvasHtmlStructural.test.ts`

**Approach:**
- Add `insertChild`, `removeNode`, `reorderSibling`, `wrapSelection`, `unwrap`, `swapTag` to `CanvasHtmlMutation`.
- For each, parse the source via `parseFragment` with `sourceCodeLocationInfo: true`, mutate the parse5 tree, run `serialize()`, return new source + canvasIdMap.
- **Identity-based canvasIdMap (mirrors U1):** assign a `data-canvas-stable-id` attribute (transient, in-memory only — stripped before serialize) on every element pre-mutation; carry through tree mutations; re-hash post-mutation; pair old→new by stable id.
- Reuse the existing `walkElementChildren` walker for canvasId rebuilding.
- **`childSource` validation:** parse the supplied HTML via `parseFragment`; reject if it contains `<script>`, `<iframe>`, or top-level non-element nodes (parse-error 400).

**Patterns to follow:**
- Existing `writeCanvasHtmlNode` shape.
- `extractHtmlSubtree` (P7) — already serializes a subtree cleanly; extend the same approach for wrap/unwrap.
- `resolveHtmlPath` (post-fix in P7) — index-based path resolution.

**Test scenarios:**
- *Happy path:* insert `<button>X</button>` as first child of `<section>` → serialized HTML has the new button; canvasIdMap shows new ids.
- *Happy path:* remove an element → file mutates; sibling ids re-indexed.
- *Happy path:* reorderSibling swaps two divs → tree order changes; ids in map swap.
- *Happy path:* wrap two adjacent elements in a `<div class="stack">` → parser fixups don't introduce extra tags.
- *Happy path:* unwrap a `<div>` with two children → children become siblings of the original parent.
- *Happy path:* swapTag from `<div>` to `<section>` → all attrs preserved; descendant ids preserved.
- *Edge case:* insertChild into an empty element (e.g. `<button></button>`) — works, child becomes first.
- *Edge case:* wrap a selection that's an only-child → wrapper takes the slot.
- *Edge case:* wrap across non-adjacent siblings → reject with `unsupported-mutation` code.
- *Error path:* swapTag to a tag that requires self-closing (e.g., `<div>` → `<input>`) → reject with code; better safety than silent transform.
- *Integration:* parse-mutate-serialize-reparse-mutate again → still works without trivia drift.

**Verification:**
- Each structural mutation tested against real fixtures (a page with 2-3 levels of nesting).
- canvasIdMap is non-empty for structural mutations.
- Round-trip on a real file (parse + serialize + parse) is stable.

---

- U13. **Bidirectional bridge protocol (parent → iframe handlers)**  *(shipped `8cf8de2`)*

**Goal:** Extend `canvasReactNodeBridge` so the parent can send messages *into* the iframe: `canvas/refresh-rect` (re-emit a rect for a given canvasId), `canvas/edit-start` (set contenteditable on the matched element), `canvas/edit-commit` (release contenteditable). The injected bridge script gains a `window.addEventListener("message", ...)` block with the same versioning + origin filtering as outbound messages.

**Requirements:** R5 (handoff), R7 (inline edit), R13 (rect re-anchor after recompile)

**Dependencies:** None.

**Files:**
- Modify: `utils/canvasReactNodeBridge.ts` — extend `buildBridgeScript` with inbound handlers; add `CanvasReactNodeRefreshRectMessage`, `CanvasReactNodeEditStartMessage`, `CanvasReactNodeEditCommitMessage` types.
- Modify: `tests/canvasReactNodeBridge.test.ts` — verify inbound message handling with valid/invalid versions, missing markers, foreign origins.

**Approach:**
- Inbound message contract: parent posts `{ marker: CANVAS_NODE_BRIDGE_MARKER, version: CANVAS_NODE_BRIDGE_VERSION, type: "canvas/refresh-rect" | "canvas/edit-start" | "canvas/edit-commit", canvasId, ... }` to the iframe via `iframe.contentWindow.postMessage`.
- Iframe-side handler validates marker + version + origin; on `canvas/refresh-rect`, queries DOM by `[data-canvas-id="..."]` and re-emits the rect via the existing outbound `canvas/select` (or a new `canvas/rect-update` for clarity); on `canvas/edit-start`, sets `contentEditable="true"` on the matched element + focuses it; on `canvas/edit-commit`, reads the new text + posts back as `canvas/edit-result`, then sets `contentEditable="false"`.
- Add `CanvasReactNodeFrame` (parent helper hook in components/canvas/) that exposes `requestRectRefresh(canvasId)`, `startInlineEdit(canvasId)`, `commitInlineEdit()`.

**Test scenarios:**
- *Happy path:* parent posts `canvas/refresh-rect` for an existing canvasId → iframe responds with current rect.
- *Edge case:* canvasId not in DOM → iframe posts `canvas/select` with rect=null (signaling stale).
- *Edge case:* mismatched version → message ignored.
- *Edge case:* origin not in allowlist → message ignored.
- *Integration:* parent sends `canvas/edit-start` → element becomes contenteditable + focused; user types; blur emits `canvas/edit-result` with the typed text.

**Verification:**
- Bridge protocol round-trip works in both directions.
- No regression in existing outbound flows.

---

- U3. **canvasIdMap rebase + selection state propagation**

**Goal:** When a writer returns `canvasIdMap`, the property panel and any active selection automatically rebase to the new ids without re-clicking. The mutation envelope from U1+U2 carries through endpoints to the panel; bridge requests fresh rects after iframe recompiles.

**Requirements:** R5

**Dependencies:** U1, U2, U13.

**Files:**
- Modify: `vite/api/canvasAstWrite.ts` (carry canvasIdMap through response)
- Modify: `components/canvas/CanvasReactNodePropertyPanel.tsx` (consume canvasIdMap on Apply)
- Modify: `components/canvas/CanvasTab.tsx` (selection state rebase)
- Modify: `components/canvas/CanvasHtmlFrame.tsx` (selectionRect re-fetch via bridge after rebase)

**Approach:**
- Endpoint response includes `{ source, canvasIdMap }`.
- `CanvasReactNodePropertyPanel.applyMutations` consumes `canvasIdMap` and calls `onSelectionChange(canvasIdMap[currentSelection.canvasId])`.
- If the new id is null (element removed), panel closes selection. If non-null, panel re-fetches the AST for the new id.
- `CanvasHtmlFrame` doesn't need changes for rebasing — the iframe re-renders, the bridge will report a new rect on next click. But for in-place rebase (no click), the parent sends a `canvas/refresh-rect` message asking the iframe to re-emit the rect for a given canvasId.

**Test scenarios:**
- *Happy path:* user has element X selected; panel applies a wrap mutation; canvasIdMap[X] = X' (new id); panel switches selection to X' without user re-clicking.
- *Happy path:* user has element X selected; remove mutation; canvasIdMap[X] = null; panel clears selection cleanly.
- *Edge case:* canvasIdMap is empty (literal mutation) → no selection change.
- *Integration:* sequential mutations (wrap → swap-tag) — panel rebases through both.

**Verification:**
- Manual: select a button, wrap it in Stack, observe panel still shows the button (now nested) without re-clicking.
- Manual: remove a button, observe panel closes selection cleanly.

---

- U4a. **CanvasIframeOverlay — resize + move handles (de-risked, ships first)**  *(complete: math `22a8e6a`; overlay UI `145c266`; frame integration `f3aac50`; canvasScale plumbing `5a53545`; snap table `3aa4dab`; delta translator `2f39979`; dispatcher `e4c6bbc`; end-to-end wiring `1416c78`)*

**Goal:** Render 8 resize anchors + 1 drag handle on the parent canvas, anchored to the selected iframe element's rect. Pointer events on the overlay translate (with scale-aware math, including pan offset) into mutations using the **existing** `setClassName` / `setStyle` writers (no structural mutations needed). Lands first to de-risk the coordinate math, which is the highest-risk piece of the overlay system.

**Requirements:** R1, R2, R3, R13

**Dependencies:** U13 (bidirectional bridge — overlay needs `canvas/refresh-rect` to re-anchor after recompile).

**Files:**
- Create: `components/canvas/CanvasIframeOverlay.tsx`
- Create: `utils/canvasIframeCoordinates.ts`
- Create: `tests/canvasIframeCoordinates.test.ts`
- Create: `tests/canvasIframeOverlay.test.tsx`
- Modify: `components/canvas/CanvasHtmlFrame.tsx` (host the overlay)

**Approach:**
- Overlay is a sibling of the iframe inside `CanvasHtmlFrame`'s container, positioned absolutely. It reads the iframe rect (from `iframe.getBoundingClientRect()`) and the bridge-reported element rect, computes the on-screen rect, and renders 8 corner/edge anchors + a center drag handle.
- `CanvasHtmlFrame` gains a `canvasScale: number` prop supplied by `CanvasTab` from the canvas transform; the overlay reads this for delta translation.
- Pointer-down on a corner → resize mode. Track `pointermove` on the parent (with `setPointerCapture`). On `pointerup`, compute final delta, emit `setClassName` or `setStyle` via existing writer.
- Pointer-down on drag handle → move mode (same flow, position only).
- Coordinate math lives in `canvasIframeCoordinates.ts` — pure functions tested at 50% / 100% / 200% canvas zoom × 50% / 100% / 200% iframe zoom × non-zero pan offset. **Rotation is out of scope** (asserted in tests).
- Drag-resize emits **commit-on-release**, not per-frame. During the drag the overlay paints an optimistic preview rect so the user sees the new size before the iframe recompiles. Iframe rect rebases via U13's `canvas/refresh-rect` after compile-react completes.
- **Tailwind-class snap table**: read from `tailwind.config.js` `theme.spacing` + `theme.width` + `theme.height` at server boot; closest snap is the nearest enumerated value to the dragged delta. If the element has no `w-*`/`h-*` class, drag emits inline `style="width: <px>"`. Documented heuristic; user can override per-edit by holding Alt to force inline style or Cmd to force class snap.

**Execution note:** Coordinate math is high-risk. Test-first with golden numeric cases.

**Patterns to follow:**
- Existing `selectionRect` overlay rendering in `CanvasHtmlFrame.tsx` lines 273–290.
- Excalidraw-style 8-anchor pattern (visual).
- React's `setPointerCapture` for drag-while-cursor-leaves-iframe.

**Test scenarios:**
- *Happy path:* coordinate math at scale s=1, t=1 — pointer move (dx, dy) translates to (dx, dy) iframe-local.
- *Happy path:* coordinate math at s=0.5, t=1 — (dx, dy) screen → (2dx, 2dy) iframe-local.
- *Happy path:* coordinate math at s=1, t=0.5 — (dx, dy) screen → (2dx, 2dy) iframe-local.
- *Happy path:* coordinate math at s=0.5, t=0.5 — (dx, dy) screen → (4dx, 4dy) iframe-local.
- *Happy path:* drag NE corner → resize delta + position delta both emitted.
- *Happy path:* drag the drag handle → only position delta emitted.
- *Edge case:* pointer leaves iframe during drag → still tracked via setPointerCapture.
- *Edge case:* selection cleared mid-drag → drag aborts cleanly.
- *Integration:* drag a button corner → file mutates → iframe re-renders → overlay re-anchors to the new rect.
- *Covers AE1.* Click button in iframe → 8 anchors render → drag a corner → element class changes from `w-32` to `w-48` → file updates → iframe re-renders.

**Verification:**
- Coordinate-math golden tests pass.
- Manual: verify at 50% / 100% / 200% canvas zoom that drag math feels right.
- Manual: drag a button across an iframe boundary; capture continues without snap-back.

---

- U5. **CanvasMutationLog + undo/redo**

**Goal:** Append-only mutation log keyed by file path. Cmd-Z undoes the last mutation (across any file/node type). Cmd-Shift-Z redoes. Session-bounded.

**Requirements:** R6

**Dependencies:** U1, U2 (mutation envelope is finalized).

**Files:**
- Create: `utils/canvasMutationLog.ts`
- Create: `tests/canvasMutationLog.test.ts`
- Modify: `components/canvas/CanvasTab.tsx` (host log state, wire keyboard shortcuts)

**Approach:**
- `CanvasMutationLog` exports a small reducer-like API: `pushEntry(entry)`, `undo()`, `redo()`, `peek()`.
- Each entry: `{ id, timestamp, filePath, mutations, prevSourceSnapshot, postSourceSnapshot, canvasIdMap }`.
- **Hard cap: 25 entries per file, 50MB total log size**, with size-aware FIFO eviction (largest oldest entry first). Documented constraint: log holds full source — secrets in code reach client memory.
- Undo: re-write the file with `prevSourceSnapshot` (single endpoint call, no inverse-mutation computation).
- Redo: re-write with `postSourceSnapshot`.
- Eviction: when redo stack is non-empty and a new mutation lands, redo entries beyond the new mutation are dropped (standard linear undo).
- Cmd-Z / Cmd-Shift-Z global shortcuts — handled at `CanvasTab` level so they work regardless of which panel is focused. Visual feedback: small toast (`"Undid: <mutation summary>"`) for ~1.5s.
- Storage: in-memory only. Reload clears the log (documented as v3 constraint).

**Patterns to follow:**
- Existing keyboard-handling in `CanvasTab.tsx` (look for `KeyboardEvent` listeners).

**Test scenarios:**
- *Happy path:* push 3 entries → undo twice → state matches entry 1's pre-state.
- *Happy path:* undo then redo → state matches post-state of last entry.
- *Happy path:* mutation after undo → log truncates redo stack from that point.
- *Edge case:* undo with empty log → no-op.
- *Edge case:* redo with empty redo stack → no-op.
- *Edge case:* mutations across two different files interleaved → undo follows global timestamp order, not per-file order.
- *Integration:* full panel → mutation → undo → state restored end-to-end.

**Verification:**
- Manual: edit a class, edit text, change a token, Cmd-Z three times → all three reverted in reverse order.

---

- U6. **Markdown direct edit (block + inline)**

**Goal:** Click a rendered markdown block (heading, paragraph, list item) → inline edit (via U13's `canvas/edit-start`); format toolbar (bold/italic/list); drag-to-reorder blocks. Source markdown updates via mdast.

**Requirements:** R7

**Dependencies:** U13 (bidirectional bridge for `canvas/edit-start` + `canvas/edit-commit`). Otherwise independent of TSX/HTML work.

**External deps added (U6):** `unified`, `remark-parse`, `remark-stringify` — combined ~150KB minified. Justified by R7 scope: regex-based block splitter would handle reorder but not inline `strong`/`emphasis`/`list` wrapping cleanly.

**Files:**
- Create: `utils/canvasMarkdownWriter.ts`
- Create: `vite/api/canvasMarkdownWrite.ts` — uses `resolveWorkspacePath(filePath, workspaceRoot, [".md"])` for path guard; mtime guard; atomic temp+rename; consults `canvasInlineEditLock` map and returns 409 `inline-edit-active` if locked.
- Create: `tests/canvasMarkdownWriter.test.ts`
- Modify: `components/canvas/CanvasMarkdownItem.tsx`
- Modify: `vite.config.ts` (register endpoint)
- Modify: `package.json` (add deps above)

**Approach:**
- Parse the markdown source into mdast via remark-parse.
- Each top-level mdast node = one block. Click triggers `canvas/edit-start` via U13; user types; blur posts `canvas/edit-result` → writer recomputes mdast → re-serializes via remark-stringify.
- Drag-reorder swaps block positions in the mdast tree → re-serialize.
- Format toolbar: select text → wrap in `strong`/`emphasis` mdast nodes. Toolbar appears on text selection within an active inline-edit (positioned floating above selection); dismisses on blur or click outside.
- MCP tool: `update_markdown_block` (block path + new content / new type).

**Test scenarios:**
- *Happy path:* edit a paragraph's text → source updates with new content; rest unchanged.
- *Happy path:* reorder block index 1 with index 0 → source has them swapped.
- *Happy path:* select word → bold → wrapped in `**word**`.
- *Edge case:* edit a block with embedded code (`code` inline) → code preserved.
- *Edge case:* reorder across list/paragraph boundaries → stays well-formed.
- *Integration:* edit → reload from disk → state matches.

**Verification:**
- Manual: type into a paragraph, blur, source updates.
- Manual: drag a list item up; markdown reflects the new order.

---

- U7. **Component variant cycling + numeric prop scrub**

**Goal:** Component nodes support keyboard variant cycling (← / → keys when selected) and drag-to-scrub on numeric props in the panel.

**Requirements:** R8

**Dependencies:** None.

**Files:**
- Modify: `components/canvas/CanvasReactNodePropertyPanel.tsx` (or component-specific panel)
- Modify: `components/canvas/CanvasTab.tsx` (variant keyboard shortcuts)
- Create: `tests/canvasComponentScrub.test.tsx`

**Approach:**
- Variant cycling: when a `CanvasComponentItem` is selected, ← / → keys decrement/increment `variantIndex` (clamped to bounds).
- Numeric prop scrub: detect props of type `number` in the registry. Render a dedicated input with a drag-icon. PointerLock + cumulative delta updates the value via existing `setPropValue` mutation.
- Visual cue: drag-icon on the input; cursor changes to `ew-resize` on hover.

**Test scenarios:**
- *Happy path:* component selected, press ← → variant decrements; press → returns.
- *Happy path:* drag scrub a numeric input → value updates → setPropValue fires.
- *Edge case:* variant index would go below 0 or above max → clamped, no-op.
- *Edge case:* non-numeric input → no scrub UI.

**Verification:**
- Manual: select a component with 3 variants; press → twice; variant cycles; capture cycles back.

---

- U8. **Media crop + clip handles**

**Goal:** Image canvas items support crop handles (4 corners, persisted as `crop: { x, y, w, h }`). Video canvas items support clip-trim handles on a scrub bar (start/end seconds).

**Requirements:** R9

**Dependencies:** None.

**Files:**
- Modify: `components/canvas/CanvasMediaItem.tsx`
- Modify: `components/canvas/CanvasMediaPropsPanel.tsx`
- Modify: `types/canvas.ts` (confirm `crop` field; add if needed)
- Create: `tests/canvasMediaCrop.test.tsx`

**Approach:**
- Image crop: render 4 corner handles overlaid on the rendered image. Drag updates the `crop` field on the canvas item via existing `update_item` operation — canvas state only, no source file mutation, **no new endpoint**.
- Video clip: render a horizontal scrub bar with start/end handles. Drag updates `clipStartSec` / `clipEndSec` via `update_item`.
- Both are non-destructive: original src is unchanged; rendering applies the crop/clip on display.

**Test scenarios:**
- *Happy path:* drag image NW crop handle → crop.x and crop.y update; rendered image shows the cropped region.
- *Happy path:* drag video clip start to 5s → clipStartSec = 5; video starts at 5s on play.
- *Edge case:* crop region collapsed to zero size → handle prevents (min 10px).
- *Edge case:* clip end before clip start → swap.

**Verification:**
- Manual: crop a marketing image; export-board uses the cropped region.

---

- U9. **Artboard child reorder + gap drag (canvas-state only)**

**Goal:** Drag children inside an artboard to reorder. Drag the artboard's gap value via slider/scrub. **No source-file mutation** — artboard children are `CanvasItem` objects in canvas state with `parentId` and `order` fields.

**Requirements:** R10

**Dependencies:** None. Uses existing `CanvasRemoteOperation.update_item` to mutate `order` field.

**Files:**
- Modify: `components/canvas/CanvasArtboardItem.tsx`
- Modify: `components/canvas/CanvasArtboardPropsPanel.tsx`

**Approach:**
- Each child gets a drag handle at top-left. Drag → reorder by computing new `order` value, dispatch `update_item` operation.
- Gap slider on the panel + drag-scrub on the artboard's edge → updates `layout.gap` via `update_item`; live preview from canvas state.
- No new endpoint, no AST writer changes — this is pure canvas-state manipulation.

**Test scenarios:**
- *Happy path:* drag child 0 to position 2 → `order` field on each child updates; rendering reflects new order.
- *Happy path:* scrub gap from 8 to 24 → `layout.gap` updates; live re-render.
- *Edge case:* reorder past artboard bounds → clamped.

**Verification:**
- Manual: build a 3-card artboard; reorder by drag; verify canvas state.

---

- U10. **Mermaid inline label edit**

**Goal:** Click a rendered mermaid node label → inline edit → mermaid source updates.

**Requirements:** R11

**Dependencies:** None.

**Files:**
- Modify: `components/canvas/CanvasMermaidItem.tsx`

**Approach:**
- After mermaid renders SVG, attach a click handler at the SVG root that walks up to find the `<g>` with mermaid's `data-id`. **Bridge does not see SVG attributes** (current bridge uses `instanceof HTMLElement` + `data-canvas-id`); U10 uses a parallel SVG-specific click handler in the iframe-side mermaid render code, with a small lookup table mapping mermaid `data-id` → mdast position in source.
- On click → render an inline input over the label → commit blur → regex-replace in source.
- For complex mermaid syntax (links, decorators), labels live inside specific node types (`A[Label]`, `B((Label))`). The replace must respect those forms.

**Fallback criterion:** if the SVG-side click handler cannot reliably resolve mermaid's `data-id` to a source position (different mermaid versions emit different attributes), U10 ships **source-textarea-only** (existing behavior unchanged) and inline label edit is deferred to a future pass. Verification: fixture-test with mermaid 11.x; if rendering doesn't expose stable per-node ids, fall back. The SVG-bridge expansion is **not** in U13's scope.

**Test scenarios:**
- *Happy path:* click a flowchart node → edit label → source's `A[Old]` becomes `A[New]`.
- *Edge case:* label contains brackets → reject inline edit; fall back to source textarea.
- *Edge case:* mermaid render fails for the new source → revert + show error.

**Verification:**
- Manual: edit a node label in a flowchart; observe re-render.

---

- U11. **MCP audit + agent workflow docs**

**Goal:** Every direct-manipulation action has an MCP tool with full input/output parity. Update agent workflow docs.

**Requirements:** R12

**Dependencies:** U1–U10.

**Files:**
- Modify: `bin/canvas-mcp-server` (register new tools)
- Modify: `bin/canvas-agent-runtime.mjs` (runtime helpers)
- Modify: `docs/CANVAS_AGENT_MCP_COMMANDS.md` (workflows)

**Approach:**
- New MCP tools mirror endpoints: `apply_structural_mutation` (TSX or HTML, with the structural mutation discriminator), `update_markdown_block`, `update_media_crop` (canvas-state via update_item), `update_artboard_layout` (canvas-state), `update_mermaid_label`, `cycle_component_variant`.
- `apply_structural_mutation` is a thin wrapper over the existing AST/HTML write endpoints — no new endpoint, just exposing the new mutation types via MCP. The same `childSource` validation applies (HTML primitive parsing rejects `<script>`/`<iframe>`; TSX rejects top-level imports).
- Each tool returns `canvasIdMap` so an agent driving multiple sequential mutations rebases its target ids automatically.
- **Trust boundary note:** MCP `childSource` is parsed and validated identically to UI-supplied source; agent and UI cannot cross the validation boundary. Acceptable in v3's local-first model; documented constraint.
- Doc updates: a "Direct manipulation via the agent" section walks through structural mutations end-to-end.

**Test scenarios:**
- *Per-tool integration:* fixture file → MCP tool call → file mutates as expected.
- *Sequencing:* agent calls insert + reorder + wrap on same file → all three land; canvasIdMap updates between calls.
- *Concurrency:* agent + UI mutation simultaneously → mtime guard catches; second one gets 409.

**Verification:**
- All new tools work end-to-end from a Codex / Claude session against fixtures.
- `CANVAS_AGENT_MCP_COMMANDS.md` lists every new tool.

---

- U4b. **Drop targets + drag-into-existing-element (structural insert via drag)**

**Goal:** Extend `CanvasIframeOverlay` to render insert-zones between siblings of the hovered element when dragging from the library panel. Drop fires an `insertChild` mutation (U1 or U2 depending on file kind). Hovering a leaf element with no siblings shows a "wrap" affordance instead.

**Requirements:** R14, R4 (structural via drag)

**Dependencies:** U1, U2, U4a, U13.

**Files:**
- Modify: `components/canvas/CanvasIframeOverlay.tsx`
- Modify: `components/canvas/CanvasLibraryPanel.tsx` (drag source + dragstart payload)

**Approach:**
- During `dragstart` from the library panel, the overlay enters drop-target mode: render thin horizontal/vertical insert lines between each pair of rendered siblings of the hovered parent element. The parent is determined by walking up from the pointer's iframe-local coordinates.
- On `drop`, dispatch `insertChild` mutation with the hovered parent's canvasId + the computed position.
- For leaf elements with no siblings, render a wrap affordance (highlighted bounding rect + "Wrap" label) that fires a `wrapSelection` mutation on drop.
- Drop targets disappear on `dragend` (drop or cancel).

**Test scenarios:**
- *Happy path:* drag a Button from library over a Stack with 2 children → 3 insert lines render → drop on the second line → Button inserts at index 1 → file mutates → canvasIdMap pairs the new button with a fresh id.
- *Edge case:* drag over a leaf element → wrap affordance only.
- *Edge case:* drag-cancelled (Esc, drop off-canvas) → drop targets clear.

**Verification:**
- Manual: drag a primitive into an existing artboard; observe insert lines; drop; verify source.

---

- U12. **Shift-click multi-select primitives (within one iframe)**

**Goal:** Shift-click adds an element to the current selection (single-iframe only). Multi-element selection allows group-transform via the overlay (resize/move applies to all). Cross-iframe selection is explicitly out of scope.

**Requirements:** R14 (cross-element interactions during drag).

**Dependencies:** U4a (overlay), U13 (bridge).

**Files:**
- Modify: `components/canvas/CanvasIframeOverlay.tsx`
- Modify: `components/canvas/CanvasLibraryPanel.tsx` (drag source)
- Create: `tests/canvasDropTargets.test.tsx`

**Approach:**
- During `dragstart` from the library, `CanvasIframeOverlay` enters drop-target mode: render thin horizontal/vertical insert lines between each pair of rendered siblings of the hovered parent.
- On `drop`, fire `insertChild` mutation (U1/U2) with the hovered parent + position.
- Shift-click multi-select: track a `selection: CanvasReactNodeSelection[]` array in the panel state. Group transforms (resize, move) apply to all selected.

**Test scenarios:**
- *Happy path:* drag Button from library over a Stack → insert lines render between Stack children → drop on the second line → Button inserts at index 1.
- *Happy path:* Shift-click a sibling → both elements selected; resize moves both.
- *Edge case:* drag over a leaf element with no children → no insert lines (only a "wrap" affordance).
- *Edge case:* multi-select with elements at different sizes → resize handles render around the union bounding rect.

**Verification:**
- Manual: drag a primitive into an existing artboard; observe insert lines; drop; verify source.

---

## System-Wide Impact

- **Interaction graph:** new mutation routes (`/api/canvas/markdown/write`, `/api/canvas/media/write`, `/api/canvas/artboard/write`) plus extended mutation envelopes on existing AST/HTML endpoints. All carry mtime guards consistent with existing endpoints.
- **Error propagation:** structural mutations can fail more visibly than literal ones (parse errors, malformed wrapping). All return structured error codes (`unsupported-mutation`, `parse-error`, `inline-edit-active`); panel surfaces as toasts.
- **State lifecycle risks:** half-finished structural mutations cannot leave the file invalid (atomic temp+rename guarantees this); but the mutation log entry must roll back if the writer fails. U5's tests cover this.
- **API surface parity:** every new endpoint is mirrored as MCP. Audit in U11.
- **Integration coverage:** end-to-end tests exercise the full UI → bridge → endpoint → file → recompile → re-render → re-anchor cycle. U4's tests cover the most fragile leg (coordinate math).
- **Unchanged invariants:** existing literal mutations (text/className/prop) still pass through the same writers. v1+v2 endpoints, MCP tools, panel logic remain operational.

---

## Risks & Dependencies

| Risk | Mitigation |
|---|---|
| Coordinate math is fragile under nested transforms (canvas zoom × iframe zoom × pan). | Pure functions in `canvasIframeCoordinates.ts` with golden tests at 50%/100%/200% on each axis × non-zero pan. **Rotation is out of scope** (asserted in tests). |
| Element rect goes stale mid-drag when mutation triggers re-render. | Commit-on-release: drag math runs parent-side without source mutation until pointerup. Optimistic preview rect on the overlay covers the recompile gap. After write, U13's `canvas/refresh-rect` re-anchors. |
| TSX structural mutations would destroy trivia if reprinted via `ts.createPrinter`. | **Resolved**: use **recast** which preserves trivia for untouched siblings and only re-prints touched nodes. recast is added to deps in U1 (~5MB). |
| canvasIdMap could mispair after wrap/insert (positional walk fails). | **Resolved**: identity-based pairing via `data-canvas-stable-id` threaded through ts-factory / parse5 mutations. Stable id maps old→new across mutations regardless of structural shape change. |
| Multiple iframes on canvas all listening to drag — perf/conflict. | Bridge already filters by `event.source`. U13 confirms inbound handlers also filter by message marker + version + origin. |
| Inline-edit lock isolation across processes (MCP server vs UI). | **Resolved**: lock substrate is a vite dev-server in-memory map (`canvasInlineEditLock.ts`) consulted by every write endpoint and the MCP server. 5s heartbeat + 8s timeout. |
| Agent parity for drag — agents don't drag, they set values. | Drag emits the same `setStyle` / `setClassName` / structural mutation an MCP tool calls directly. No new MCP "drag" tool. |
| Component prop scrub vs. text input ambiguity. | Numeric props get scrub (detected by registry/type info); string/enum inputs/selects. |
| Snap-to-edge guides clutter the iframe at small zoom. | Render only when drag is in progress; fade out within 1s of drag-end. |
| Undo log memory growth on large files. | **Hard cap: 25 entries per file, 50MB total log size**, size-aware FIFO eviction. Documented constraint: secrets in source flow into client memory. |
| Mermaid SVG click-target semantics differ from HTML. | U10 ships a parallel SVG click handler; if mermaid versions don't expose stable per-node ids, fallback to source-textarea-only (no bridge changes required). |
| Cross-iframe multi-select would mean coordinate translation across the canvas. | Explicitly out of scope for v3. Single-iframe only. |
| Persistent undo would need server-side log + per-user state. | Out of scope for v3. v4 follow-up (no spec yet). |
| Path traversal on new write endpoints. | Every new write endpoint imports `resolveWorkspacePath` with a per-endpoint extension allowlist (markdown: `.md`, etc.). Guard explicitly named in each endpoint's Files list. |
| Stored XSS via `childSource` in insertChild/wrapSelection. | Parse-validate every `childSource` before splicing. HTML rejects `<script>`/`<iframe>`; TSX rejects top-level imports. Returns 400 `parse-error` or `unsupported-source` with no file change. |

---

## Documentation / Operational Notes

- Update `docs/CANVAS_AGENT_MCP_COMMANDS.md` with the new tools and a "Direct manipulation via the agent" section walking through the structural mutation flow end-to-end (covered in U11).
- Update the canvas user-facing notes (location TBD during U11) with a "Direct manipulation tour" — keyboard shortcuts (Cmd-Z, ← →, Shift-click), drag affordances, when the panel takes over vs the iframe overlay.
- The TSX subset enforced for v1+v2 stays — structural mutations only support the same subset (flat function components, literal classNames, no computed expressions outside `cn(...)`).

---

## Sources & References

- **Origin spec:** [docs/specs/2026-05-05-canvas-v3-direct-manipulation.md](../specs/2026-05-05-canvas-v3-direct-manipulation.md)
- **v2 spec:** `docs/specs/2026-05-05-canvas-web-native-editing.md`
- **v1 spec:** `docs/specs/2026-04-27-canvas-figma-like-editing.md`
- **v1+v2 plan:** `docs/plans/2026-04-28-001-feat-canvas-figma-like-editing-plan.md`
- **Click bridge protocol:** `utils/canvasReactNodeBridge.ts`
- **AST writer (TSX):** `utils/canvasAstWriter.ts`
- **HTML editor:** `utils/canvasHtmlEditor.ts`
- **iframe rendering + selection state:** `components/canvas/CanvasHtmlFrame.tsx`
- **Iframe throttling investigation:** `Inbox/raw/2026-04-26 Canvas iframe animations — Chrome throttling and the limits of shimming.md` (Obsidian vault)
