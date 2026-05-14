---
title: "Canvas Gallery POC — running goal"
status: active
updated: 2026-05-14 (refresh: U7 numeric prop scrub landed locally)
---

# Running goal

A canvas where every node type (HTML, TSX, markdown, media, mermaid, excalidraw, embed, artboard, component) is editable in place like Figma — click an element, see panel and direct-manipulation affordances, edits round-trip to source files. **Agent parity is mandatory**: every direct-manipulation operation is also exposed as an MCP tool.

## Where the headline lives

- **Spec:** `docs/specs/2026-05-05-canvas-v3-direct-manipulation.md`
- **Plan (detailed):** `docs/plans/2026-05-05-001-feat-canvas-v3-direct-manipulation-plan.md`
- **Branch:** `feat/canvas-figma-like-editing` (pushed to `origin`)
- **Main demo:** drag a TSX element's resize handle → file mutates → iframe re-renders → overlay re-anchors

## Status snapshot

| Layer | State |
|---|---|
| v1 — TSX panel editing (click → AST writer) | shipped (pre-branch) |
| v2 — HTML inline editing, tokens, paste, promote, MCP audit | shipped (pre-branch) |
| **v3 — direct manipulation across node types** | in progress |

### v3 unit status

| Unit | State | What it ships |
|---|---|---|
| U4a | ✅ complete (8 slices, see plan) | iframe overlay drag → class snap → AST write |
| U13 | ✅ complete | bidirectional bridge (refresh-rect, edit-start, edit-commit) |
| U1 | ✅ complete | TSX structural mutations — all 6 helper mutations are implemented; writer/API structural dispatch returns `canvasIdMap` + `prevSourceSnapshot` |
| U2 | 🟡 local writer complete | same 6 mutations on the HTML side via parse5; endpoint path is locally exercised, broader consumer wiring still pending |
| U3 | 🟡 local wiring in progress | canvasIdMap rebase + selection-survival through structural mutations (depends on U1+U2+U13) |
| U4b | not started | drop targets + structural drag (depends on U1+U2+U4a+U13) |
| U5 | 🟡 local host wiring landed | mutation log + undo/redo — pure module `52df964`; CanvasTab now logs file-backed writes, replays stored snapshots via `/api/canvas/ast/write`, wires Cmd-Z/Cmd-Shift-Z, and shows undo/redo toasts |
| U6 | 🟡 local edit controls landed | markdown direct edit — pure block writer `69b1379`, local `/api/canvas/markdown/write` endpoint, rendered block inline edit in markdown items, block reorder controls, and basic formatting buttons (`B`, `I`, `List`) |
| U7 | 🟡 local variant cycling + scrub landed | selected component items now cycle variants with ArrowLeft / ArrowRight, and numeric prop inputs now expose horizontal scrub controls |
| U8–U12 | not started | media crop, artboard reorder, mermaid label edit, MCP audit pass, drop targets, multi-select |

## Open gates before claiming v3 demo "shippable"

1. **Visual verification** of U4a end-to-end in a real browser (drag a button corner, confirm file rewrites + overlay re-anchors). Logic is unit-tested but no human has driven it yet.
2. **Finish U3 follow-through** so a wrap/insert/remove preserves the user's selection and overlay rect continuously across the recompile on every active surface.
3. **Expression-backed resize fallback** for U4a when a TSX node's `className` is computed (`cn(...)`, ternaries, etc.). Missing class attrs now get a snapped `class` / `className` inserted on first resize; computed expressions still no-op.

## Next slice ordering (set 2026-05-14)

Three roughly-independent threads to pick from, prioritized by leverage:

1. **Close the demo gate on the live surface.** Sequence:
   - Browser-verify U5 undo/redo on the source-backed TSX + inline HTML fixtures.
   - Browser-verify U3 continuity for **insert** and **remove** on TSX (wrap is already verified).
   - Decide whether U4a should grow a true inline-style / style-prop fallback for computed class expressions, or whether those nodes stay source-only for resize in v3.
2. **Finish U6 markdown.** The endpoint, inline block edit, block reorder, and basic formatting controls are in; remaining work is polish and deciding whether markdown needs any bridge-style edit protocol at all, given it does not render in an iframe today. Independent of thread 1.
3. **U4b drop targets.** All deps (U1, U2, U4a, U13) are green. Largest of the three but unblocked.

U8 (media crop/clip), U9 (artboard reorder/gap), U10 (mermaid label), U12 (multi-select) are smaller leaf units that can land in any order after thread 1. **U11 (MCP audit)** is gated on U5–U10 and should land last.

## Implementation notes and progress log

**U1 — structural TSX mutations.**

### Architectural decision (2026-05-13)

The plan's call for `recast` was the wrong frame. The existing `canvasAstWriter` already solves the trivia-preservation problem the plan attributed to `ts.createPrinter` — it does **offset-based string surgery** using `node.getStart()` / `node.getEnd()`, never reprints the AST, leaves everything outside the splice byte-identical. The plan rejected TS-AST because of `ts.createPrinter`, but `ts.createPrinter` is a strawman — there's a third option the plan didn't surface.

All 6 structural mutations are expressible as offset splicing:

| Mutation | Offset operation |
|---|---|
| `removeNode` | Splice out `[node.getStart(), node.getEnd()]` |
| `insertChild` | Splice new text at parent's `openingElement.getEnd()` (or before `closingElement.getStart()`) |
| `reorderSibling` | Two extract-and-replace splices on adjacent slices |
| `wrapSelection` | Two splices: opening wrapper at `getStart`, closing at `getEnd` |
| `unwrap` | Replace wrapper's `[getStart, getEnd]` with inner content's range |
| `swapTag` | Splice tag name in both `openingElement.tagName` and `closingElement.tagName` |

**Chosen: TS-AST + offset-based structural mutations.** Mirrors the existing `canvasAstWriter`'s pattern. Trivia preservation is perfect by construction (no reprint at all). No new dependencies. One AST world. `recast` install reverted.

Options 1 (recast + position-bridge), 2 (TS-factory + ts.createPrinter), and 3 (recast-native canvasIds) were considered and rejected.

First slice: `utils/canvasAstStructural.ts` with `removeJsxNode` + tests. Subsequent slices add `insertChild`, `reorderSibling`, `wrapSelection`, `unwrap`, `swapTag`. Each uses the same `{ start, end, text }` replacement shape the existing writer already returns from `applyReplacements`.

### U1 progress (2026-05-13)

- `897c112` **removeJsxNode** — shipped and committed. Validated the offset-surgery + positional `canvasIdMap` architecture end-to-end.
- `e62c145` completes the remaining TSX structural mutation set in `utils/canvasAstStructural.ts`: `insertChild`, `reorderSibling`, `wrapSelection`, `unwrap`, `swapTag`, each covered by focused unit tests.
- `insertChild` validates `childSource` as a single JSX expression instead of permissive fragment-wrapped parse-only acceptance.
- `writeCanvasAstNode` and `/api/canvas/ast/write` now route one structural mutation at a time through the helper and return `canvasIdMap` + `prevSourceSnapshot`.
- The React node property panel consumes `canvasIdMap` and rebases or clears its active selection after structural writes; `CanvasTab` advances the selection's compile generation on recompile so the rebased id survives the next iframe refresh.
- Remaining work has shifted out of U1 and into U3/UI follow-through: selection rect refresh / overlay re-anchor after structural recompile across all active surfaces.

### U2 progress (2026-05-14)

- Local worktree extends `writeCanvasHtmlNode` with all 6 structural HTML mutations: `insertChild`, `removeNode`, `reorderSibling`, `wrapSelection`, `unwrap`, `swapTag`.
- HTML structural mutations use parse5 tree mutation plus object-identity-based `canvasIdMap` rebasing inside a single parsed fragment, then serialize back to source.
- `/api/canvas/ast/write` is already compatible with the structural HTML shapes; focused endpoint tests now exercise file-backed HTML structural writes and return `canvasIdMap` + `prevSourceSnapshot`.
- Remaining work for U2 is commit/cleanup of this local slice, then UI-level consumers where HTML structural mutations should participate in the same selection/overlay continuity path as TSX.

### U3 progress (2026-05-14)

- Fixed a real `srcDoc` bridge bug: the injected iframe runtime was posting `canvas/select` to target origin `"null"`, so source-backed inline HTML previews could emit bridge events without the parent ever receiving them.
- The bridge now resolves parent origin from `document.referrer` first, then falls back safely; focused bridge tests cover the runtime branch and message handler suite remains green.
- Added `projects/demo/canvases/source-backed-inline.canvas` as a stable source-backed verification fixture.
- Added `projects/demo/canvases/source-backed-react.canvas` as a stable TSX-backed verification fixture.
- Browser-verified on `localhost:5182` that:
  - the inline fixture receives injected `data-canvas-id` markers,
  - clicking an iframe element opens the right-hand `HTML node` panel,
  - applying a text edit through that panel round-trips back into the iframe while keeping the node selected.
  - the TSX fixture compiles, receives injected `data-canvas-id` markers, opens the `React node` panel on iframe click, and round-trips a text edit back into the compiled preview while keeping the node selected.
- `CanvasReactNodePropertyPanel` now has focused tests for `canvasIdMap` rebasing and `null` clear semantics, so the U3 selection handoff is covered directly instead of only through endpoint tests.
- `CanvasReactNodePropertyPanel` now exposes all 6 structural mutation entry points on the live surface: `Insert child`, `Delete node`, `Move up`, `Move down`, `Wrap`, `Unwrap`, and `Swap tag`.
- Browser-verified on the TSX fixture that `Wrap` survives the structural recompile: the iframe's injected node count increases, the item stays selected, and the `React node` panel remains open.
- `CanvasHtmlFrame` now re-requests `canvas/refresh-rect` after **inline HTML** source refreshes under an active selection, and the frame message suite covers that path explicitly.
- Remaining U3 work is structural-mutation continuity: verify that wrap/insert/remove rebase the active node and refresh overlay rects without dropping the user's selection.

### Bug fix — insertJsxChild duplicates opening tag on inline parents (2026-05-14, `8d94854`)

Browser verification of "wrap then insert child into rebased button" surfaced a real bug. `readChildIndent` was slicing per-line whitespace before the first rendered child, but for inline JSX (`<button>Click</button>`) the first rendered child is JsxText sitting on the same line as the opening tag. The slice picked up `  <button>` as "indent" and re-injected it into the spliced output, producing a duplicate opening tag and a parse failure on recompile. Fix: `readChildIndent` now returns `{ indent, inline }`; `insertJsxChild` branches on `inline` to splice without surrounding newlines. 3 new regression tests pin both inline-parent paths and the wrap-then-insert composition.

### U5 progress (2026-05-14) — mutation log + undo/redo

- `52df964` ships the pure `canvasMutationLog` module with reducer-shape API: `createMutationLogState`, `pushEntry`, `undo`, `redo`, `peek`, `canUndo`, `canRedo`.
- Each entry holds `prevSourceSnapshot` + `postSourceSnapshot`, so undo/redo is uniform across every mutation kind (literal + structural) — no inverse-mutation computation.
- Hard caps enforced: 25 entries per filePath, 50MB total log byte size (size-aware FIFO eviction, oldest-and-largest-first).
- Linear-undo semantics: push after undo truncates the redo stack.
- 10 unit tests cover push/undo/redo, linear truncation, multi-file interleaved timeline, no-op edge cases, per-file cap, per-file cap independence, global byte-cap eviction.
- CanvasTab now hosts the in-memory log, records successful file-backed React/HTML node writes from the property panel, and replays exact stored snapshots back through `/api/canvas/ast/write` under the existing workspace + mtime guard.
- Cmd-Z / Cmd-Shift-Z now drive undo/redo at the CanvasTab level, and the shell shows a small toast (`Undid: …` / `Redid: …`) after a successful replay.
- `/api/canvas/ast/write` accepts file-backed `sourceSnapshot` rewrites in addition to mutation payloads, so U5 does not need a second file-write endpoint.
- Focused coverage now includes the new host helpers (`tests/canvasMutationHistory.test.ts`), snapshot endpoint replay (`tests/canvasAstWriteEndpoint.test.ts`), and the property-panel success callback used to feed the host log (`tests/canvasReactNodePropertyPanel.test.tsx`).
- Remaining U5 work is proof, not plumbing: browser-verify undo/redo on the stable source-backed fixtures and decide whether mod+Z should intentionally bypass focused text inputs or continue yielding to field-local undo.

### U6 progress (2026-05-14) — markdown writer foundation

- `69b1379` ships the pure `canvasMarkdownWriter` module via remark-parse + remark-stringify.
- API: `listMarkdownBlocks`, `updateMarkdownBlock` (paragraph→heading promotion supported by re-parsing newText), `removeMarkdownBlock`, `reorderMarkdownBlocks`.
- Round-trip strategy is parse → mutate top-level mdast children → remark-stringify with stable options. Tests assert structural equivalence, not byte-identity (remark-stringify normalizes whitespace).
- New deps: `unified` ^11, `remark-parse` ^11, `remark-stringify` ^11 (~150KB minified, called out in plan U6).
- 12 unit tests cover happy paths, promotion behaviour, empty-newText collapse, out-of-range / negative input rejection, remove, reorder.
- Local worktree now adds `vite/api/canvasMarkdownWrite.ts` and the matching Vite route at `/api/canvas/markdown/write`.
- Supported actions: `list`, `update`, `remove`, `reorder`, each working against either inline `markdownSource` or a file-backed `.md` path under the workspace root.
- File-backed writes reuse the same temp-write + rename and `mtimeMs` conflict model as the AST writer, so markdown edits can share the same persistence semantics.
- Focused endpoint coverage now lives in `tests/canvasMarkdownWriteEndpoint.test.ts`.
- Rendered markdown blocks in both free-positioned and layout markdown items are now clickable and double-click editable; blur or Cmd/Ctrl+Enter commits through `/api/canvas/markdown/write`, Escape cancels.
- The active block now exposes `Up` / `Down` reorder controls backed by the same endpoint's `reorder` action, so source order updates on the rendered surface without dropping back to the raw textarea panel.
- Inline edit now exposes a minimal formatting row on the active textarea: `B`, `I`, and `List` rewrite the current textarea selection in-place using markdown syntax transforms.
- Markdown items now carry optional `sourcePath` / `sourceImportedAt` / `sourceFileMtime` metadata so inline edits can use file-backed writes when a workspace markdown file exists, otherwise they fall back to inline `markdownSource`.
- Focused UI coverage now lives in `tests/canvasMarkdownItem.test.tsx`.
- Remaining U6 work is polish on the editing ergonomics and then a judgment call on whether any of the U13 `canvas/edit-*` protocol belongs on markdown at all, since the current markdown renderer is direct DOM, not iframe content.

### U7 progress (2026-05-14) — component variant cycling + numeric prop scrub

- Selected component items now cycle variants with `ArrowLeft` / `ArrowRight` in `CanvasTab`, covered by focused unit tests.
- Generic numeric prop controls now render a dedicated scrub affordance with an `ew-resize` cursor; the control requests PointerLock when available and falls back to document-level horizontal drag when it is not.
- Focused coverage now asserts scrub delta application, schema bound clamping, and non-numeric controls omitting the scrub affordance in `tests/propControl.test.tsx`.
- Remaining U7 work is proof, not plumbing: browser-verify scrub behavior on a real component panel now that PointerLock + fallback wiring is in.

## Remaining v3 surface

To complete the headline goal ("every node type editable like Figma + agent parity"), the still-needed slices are:

| Unit | Scope of remaining work |
|---|---|
| **U2** (UI consumers) | wire HTML structural mutations into CanvasReactNodePropertyPanel + CanvasHtmlFrame the way TSX is wired today |
| **U3** (continuity) | verify wrap/insert/remove rebase the active selection + refresh overlay rect on every surface, especially after iframe recompile |
| **U4b** (structural drag) | drop targets between siblings, drag-to-insert at index N — uses U1/U2 mutations |
| **U5** (CanvasTab wiring) | host the log state, wire Cmd-Z / Cmd-Shift-Z + toast, route undo/redo through the existing AST writer endpoint |
| **U6** (endpoint + UI) | markdown write endpoint, U13 bridge wiring for inline edit, CanvasMarkdownItem affordances |
| **U7** | browser-verify numeric prop scrub on a real component panel now that PointerLock + fallback wiring is in |
| **U8** | image crop handles, video clip-trim handles, aspect-ratio drag |
| **U9** | artboard child reorder + gap drag (both canvas-state only via `update_item`) |
| **U10** | mermaid click-to-edit-label via U13 bridge into rendered SVG |
| **U11** | MCP audit pass — verify every new direct-manipulation op is exposed as an MCP tool; agent workflow docs |
| **U12** | shift-click multi-select primitives within one iframe |

## Out of scope for v3

- Rotation (assumed never in canvas transform)
- Multi-iframe drag-between
- Excalidraw / embed direct edit (delegated to their own tools)
- Responsive class prefixes (`md:w-4` etc.)
- Inline-style fallback semantics for hold-Alt / hold-Cmd modifier keys (post-U4a polish)
