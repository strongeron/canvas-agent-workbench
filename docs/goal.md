---
title: "Canvas Gallery POC — running goal"
status: active
updated: 2026-05-16 (v3 feature-complete: U2/U4a-fallback/U10/U11/U12-group landed; 551 tests green)
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
| U2 | ✅ complete | all 6 HTML structural mutations via parse5; endpoint + `CanvasReactNodePropertyPanel` (sourceKind="html", canvasIdMap rebase) + CanvasTab wiring + tests all present |
| U3 | 🟡 local wiring in progress | canvasIdMap rebase + selection-survival through structural mutations (depends on U1+U2+U13) |
| U4a+ | ✅ complete + computed-class fallback | overlay drag → class snap → AST write; computed-class HTML nodes now fall back to an inline-`style` px write. TSX `style`-object fallback stays a documented decision |
| U4b | 🟡 full path wired, browser-verify pending | drop targets + structural drag; slices 1/2a/2b + 3.2c (render) + 3.2d (mutation dispatch) all landed and unit-tested. Remaining: a human end-to-end browser pass (native HTML5 DnD is not reliably automatable; devtools target crashed mid-smoke) |
| U5 | 🟡 local host wiring landed | mutation log + undo/redo — pure module `52df964`; CanvasTab now logs file-backed writes, replays stored snapshots via `/api/canvas/ast/write`, wires Cmd-Z/Cmd-Shift-Z, and shows undo/redo toasts |
| U6 | 🟡 local edit controls landed | markdown direct edit — pure block writer `69b1379`, local `/api/canvas/markdown/write` endpoint, rendered block inline edit in markdown items, block reorder controls, and basic formatting buttons (`B`, `I`, `List`) |
| U7 | 🟡 local variant cycling + scrub landed | selected component items now cycle variants with ArrowLeft / ArrowRight, and numeric prop inputs now expose horizontal scrub controls |
| U8 | ✅ complete | on-canvas image crop handles (4 corners, non-destructive `crop` field) + video clip start/end scrub-bar handles, plus the existing inspector sliders. Pure `canvasMediaCrop` module + component wiring, unit-tested |
| U9 | 🟡 local gap + reorder controls landed | artboard gap/padding sliders are in the inspector, selected artboards expose a live gap scrub handle, and selected artboard children now expose move controls |
| U10 | ✅ complete | source-backed panel label edit **plus** rendered-SVG inline label edit (click a mermaid node → inline editor → `updateMermaidNodeLabel` patch) |
| U11 | ✅ complete | parity audit reconciled: `update_media_crop` now exposes the `crop` window; docs + manifest document U4a/U4b/U8/U10/U12 agent parity via existing tools (no `drag` tool by design) |
| U12 | ✅ complete | shift-click additive/toggle multi-select + union-rect visualization **plus** group-transform writes: a union-overlay drag resizes every selected node via a sequential, source/mtime-threaded dispatcher with partial-failure summary |

## Status: v3 feature-complete (2026-05-16)

Every plan unit (U1–U13) has its logic landed and unit-tested. **551 tests green; typecheck + lint clean.** What remains is **not build work** — it is verification and one explicit decision:

1. **Browser-verification pass (the demo gate).** No human has driven the live surface for most units. One focused session on the running app (`localhost:5175`) should exercise: U4a resize + U4a computed-class fallback, U3 insert/remove selection continuity, U4b library drag-drop, U5 undo/redo, U8 crop/clip handles, U10 mermaid SVG edit, U12 shift-select + group resize. Native HTML5 DnD (U4b) is not reliably automatable — it needs a person.
2. **U3 continuity** is implemented; verify wrap/insert/remove keep selection + overlay rect across recompile on every surface (only wrap is human-verified).
3. **One open decision (not a gap):** computed-`className` resize falls back to inline `style` for **HTML**; **TSX** stays source-only because React `style` is an object expression needing a separate object-AST mutation. Ship as-is for v3 or open that mutation in v4.

U6 markdown and U9 artboard drag-sort polish are optional ergonomics, not missing primitives.

U12 (multi-select) is still a small leaf unit that can land independently after thread 1. U8 now has panel trim sliders but still lacks direct crop/trim handles. U9 now has panel sliders plus live gap/reorder controls; full drag-sort remains optional follow-through, not a missing state primitive. U10 now has source-backed panel label edits; rendered-SVG direct edit still remains. U11 now has the first direct-manip MCP wrappers, but the audit is not complete until docs and any remaining missing tool parity are reconciled.

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
- CanvasTab now hosts the in-memory log, records successful file-backed React/HTML node writes from the property panel plus file-backed markdown inline/reorder writes from the canvas surface, and replays exact stored snapshots under the existing workspace + mtime guard.
- Cmd-Z / Cmd-Shift-Z now drive undo/redo at the CanvasTab level, and the shell shows a small toast (`Undid: …` / `Redid: …`) after a successful replay.
- `/api/canvas/ast/write` accepts file-backed `sourceSnapshot` rewrites for TSX/HTML, and `/api/canvas/markdown/write` now accepts the same snapshot-replay path for file-backed markdown history.
- Focused coverage now includes the host helpers (`tests/canvasMutationHistory.test.ts`), snapshot endpoint replay for both AST and markdown (`tests/canvasAstWriteEndpoint.test.ts`, `tests/canvasMarkdownWriteEndpoint.test.ts`), the HTML property-panel success callback (`tests/canvasReactNodePropertyPanel.test.tsx`), and markdown item success logging (`tests/canvasMarkdownItem.test.tsx`).
- The editable-target shortcut guard is now centralized and reused across CanvasTab, CanvasWorkspace, and `useCanvasShortcuts`, so global history/selection shortcuts intentionally yield to focused inputs, textareas, selects, and contenteditable editors.
- Remaining U5 work is now narrower: browser-verify undo/redo on the stable source-backed TSX + inline HTML fixtures. Mermaid and raw props-panel markdown source edits still bypass the snapshot log.

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

### U9 progress (2026-05-14) — artboard gap + reorder controls

- `CanvasArtboardPropsPanel` now renders range sliders alongside the existing numeric inputs for `gap` and `padding`, giving the artboard inspector a faster panel-side layout adjustment path.
- `CanvasArtboardItem` now exposes a selected-state live gap scrub handle in the artboard chrome; horizontal drag updates `layout.gap` through the existing `updateItem` path.
- `CanvasWorkspace` now renders live move-up / move-down controls for selected artboard children and routes them through the existing `handleMoveLayer` order-swap path in `CanvasTab`.
- Focused coverage in `tests/canvasArtboardPropsPanel.test.tsx`, `tests/canvasArtboardItem.test.tsx`, and `tests/canvasWorkspace.test.tsx` asserts slider-driven updates, live scrub updates, zero clamping, and child reorder callback wiring; the existing delete-affordance suite stays green.
- Remaining U9 work is optional polish around drag-sort ergonomics if the current live move controls prove insufficient.

### U10 progress (2026-05-14) — mermaid panel label edit

- Mermaid node labels are now extracted from simple source forms (`A[Label]`, `B{Label}`, `C(Label)`) by `utils/mermaidLabelEditor.ts`.
- `CanvasMermaidPropsPanel` now renders those labels as editable inputs and patches the backing Mermaid source inline as labels change.
- Focused coverage in `tests/mermaidLabelEditor.test.ts` and `tests/canvasMermaidPropsPanel.test.tsx` asserts label extraction, source patching, and panel wiring.
- Remaining U10 work is the direct-manip half from the plan: click a rendered SVG label and edit it in place on the canvas surface.

### U8 progress (2026-05-14) — media panel trim sliders

- `CanvasMediaPropsPanel` now renders slider-backed `clipStartSec` and `clipEndSec` controls for video items alongside the existing numeric inputs.
- Focused coverage in `tests/canvasMediaPropsPanel.test.tsx` asserts both slider paths wire cleanly into `onChange`.
- Remaining U8 work is still the direct-manip half from the plan: visible crop handles for images and live trim handles on the media surface itself.

### U11 progress (2026-05-14) — MCP wrapper audit, slice 1

- `bin/canvas-mcp-server` now exposes explicit wrappers for landed direct-manip operations instead of forcing agents through only the generic item/html tools:
  - `apply_structural_mutation`
  - `update_markdown_block`
  - `cycle_component_variant`
  - `update_artboard_layout`
  - `update_media_crop`
  - `update_mermaid_label`
- `tests/canvasMcpServer.test.ts` now exercises each wrapper over the stdio MCP harness, including endpoint-backed markdown/structural writes and queue-backed canvas item updates.
- `docs/CANVAS_AGENT_MCP_COMMANDS.md` and `utils/agentNativeManifest.ts` now advertise the new wrapper surface.
- Remaining U11 work is the rest of the parity audit: document any direct-manip gaps that still rely on generic `update_item`, and decide whether later direct crop-handle state deserves a narrower wrapper than the current media trim/display tool.

### U4b progress (2026-05-15) — slices 1/2a/2b + 3.2c bridge↔overlay wiring

- Slices already landed in the prior session: `aeed673` (library drag payload + dragstart wiring), `20d767c` (drop-target hit-test bridge protocol), `917b518` (overlay drop-zone renderer). These were shippable but isolated — nothing rendered a zone from a real drag yet.
- 3.2c wires them end-to-end. `CanvasTab` now tracks `activeLibraryDrag` (set on `CanvasLibraryPanel.onPrimitiveDragStart`, cleared on `onPrimitiveDragEnd`) and threads a `libraryDragActive` boolean plus `onLibraryDropInsert` / `onLibraryDropWrap` through `CanvasWorkspace` → `CanvasHtmlItem` / `CanvasLayoutHtmlItem` → `CanvasHtmlFrame`.
- `CanvasHtmlFrame` mounts a transparent capture layer over the iframe only while `libraryDragActive`. `dragover` translates viewport→iframe-local coords (no scale factor — the canvas transform is applied outside this component) and posts a fresh-`requestId` `canvas/drop-target-hit-test`, rAF-coalesced. The existing message handler now recognizes `canvas/drop-target-result`, discards stale `requestId`s, and renders `CanvasIframeDropZones` from the parent rect + siblings. Zones clear on `libraryDragActive=false` and on a real `dragleave` (relatedTarget-outside guard prevents per-zone flicker).
- Drop intents bubble to `CanvasTab.handleLibraryDropInsert` / `handleLibraryDropWrap`, which currently clear the active drag and `console.debug` the resolved parent + index for the browser-verify pass. **The structural mutation dispatch (POST `/api/canvas/ast/write` with the staged primitive's `childSource` as `insertChild` / `wrapSelection`) is the remaining U4b slice.**
- 9 new focused tests in `tests/canvasHtmlFrameMessages.test.tsx` cover: capture-layer mount gating, hit-test post with translated coords, insert-line render, wrap-zone render, stale-requestId discard, null-parent clear, teardown on drag end, and the insert/wrap drop callbacks. 485 tests green; typecheck + lint clean.

### U4b progress (2026-05-15) — slice 3.2d: structural mutation on drop

- The drop callbacks are no longer debug stubs. `utils/canvasLibraryDropDispatch.ts` is a pure orchestrator that mirrors `dispatchCanvasResize`: it builds the mutation from the staged primitive, POSTs `/api/canvas/ast/write`, threads success through the existing source-change + mutation-log path (`handleReactNodeWriteSuccess`), and returns a structured error surfaced as a `historyToast` in CanvasTab.
- **Insert (non-leaf parent):** `insertChild { parentCanvasId, position: index, childSource }`. **Leaf (wrap zone):** `wrapSelection { canvasId, wrapperTag }` — plan-literal; `wrapSelection` carries only a tag name so the primitive's props/children are intentionally not represented (user-confirmed tradeoff, 2026-05-15).
- `canvasRegistry` gained `buildPrimitiveChildSource` (the raw single-JSX-expression snippet, **not** the `export default` module wrapper `buildPrimitiveSnippet` emits) and `derivePrimitiveWrapperTag`. No import is injected — dropping a component into a file that doesn't already import it surfaces a recompile error via toast, identical to the property panel's existing manual `insertChild` constraint; atomic temp+rename means a failed write never corrupts the file.
- CanvasTab resolves the dropped-into item's source deps (TSX vs inline HTML, file-backed vs inline) the same way the panel + resize dispatch do, and clears `activeLibraryDrag` on drop.
- 13 new tests (7 dispatch: insert/wrap shapes, file-backed, inline-HTML mode, endpoint-reject, mtime-conflict, fetch-throw; 6 registry-helper). 498 tests green; typecheck + lint clean.
- **Verification status:** gallery-poc dev server starts clean on `:5175` and the canvas + library + source-backed fixtures render correctly in real Chrome (screenshot-confirmed). The true end-to-end native drag was **not** automatable — chrome-devtools synthetic events can't carry a real cross-iframe `DataTransfer`, and the devtools target crashed mid-smoke. A human drag-a-primitive-into-the-TSX-fixture pass is the one remaining U4b gate.

### U8 progress (2026-05-16) — on-canvas crop + clip handles

- Added the non-destructive `crop?: {x,y,w,h}` field (fractions in [0,1]) to `CanvasMediaItem`. The source is never mutated; the crop is applied on display.
- `utils/canvasMediaCrop.ts` is a pure module: `normalizeCrop` (clamp to a valid in-bounds window, min `CROP_MIN`), `isFullCrop`, `applyCropHandleDrag` (corner-anchored: the opposite corner stays fixed in image space), `cropToImageStyle` (absolute scaled `<img>` inside the existing overflow-hidden box), and `applyClipHandleDrag` (edge move + clamp to duration + swap + 0.05s min gap).
- `CanvasMediaItem` renders 4 corner crop handles for a selected image and a bottom scrub-bar with start/end handles for a selected native video. Pointer pixels are converted to source fractions / seconds and delegated to the pure module; updates flow through the existing `onUpdate` (canvas-state only — no endpoint, no AST, no bridge). The existing inspector sliders and clip-playback logic are untouched and stay wired.
- 23 tests in `tests/canvasMediaCrop.test.tsx` (16 pure-geometry, 7 component: handle render gating, SE-drag → crop, cropped-image style, video clip-track render, end-handle drag → clip seconds).

### U12 progress (2026-05-16) — single-iframe multi-select model

- Bridge: `canvas/select` now carries an optional `additive` flag. The runtime click listener sets it from `event.shiftKey`; `buildSelectMessage` takes an `additive` param; programmatic `request-select` (MCP / panel keyboard nav) is always a non-additive replace.
- `CanvasHtmlFrame` keeps a `multiSelections` set: a plain select replaces it with one; a shift (additive) select appends, or toggles the element out if already present. ≥2 entries render a read-only dashed **union bounding-rect** outline with an "N selected" badge. The set clears on recompile / selection handoff (stale geometry is dropped, not anchored).
- **Deliberately deferred:** group-transform *writes* (resize/move applying to all N selected) are a separate slice — each element is a distinct AST node needing its own snapped mutation + canvasIdMap rebase, with partial-failure risk. This slice ships the selection primitive + visualization, mirroring how U4b was sliced (render path before dispatch).
- 5 new tests (3 in `tests/canvasHtmlFrameMessages.test.tsx`: union render + count, plain-select collapse, shift-toggle-out; 2 in `tests/canvasReactNodeBridge.test.ts`: `buildSelectMessage` additive, shift-click runtime flag).
- Full scope green: typecheck + lint clean, **526 tests pass**.

### Feature-complete batch (2026-05-16) — U10, U12-group, U4a-fallback, U11, U2-confirm

- **U2 confirmed complete (no build):** HTML structural writer (`canvasHtmlEditor`, 15 tests incl. all 6 mutations + edge/error), endpoint, panel (`sourceKind="html"` + canvasIdMap rebase tests), and CanvasTab wiring were all already present. The old "remaining" line was stale; goal.md corrected.
- **U10 — rendered-SVG mermaid label edit** (`e2c2728`): `resolveMermaidNodeId` (prefers `data-id`, else strips mermaid's `flowchart-<ID>-<n>` dom-id) + `canInlineEditMermaidLabel` (rejects bracket labels the regex patcher can't round-trip) added to `mermaidLabelEditor`. `CanvasMermaidPreview` attaches a click handler to its existing relative container (the pre-existing SVG-injection line left untouched) and positions an inline editor over the measured node rect; clears on re-render. 12 tests.
- **U12 group-transform writes** (`64b0f5f`): `utils/canvasGroupResizeDispatch.ts` loops the multi-selection sequentially, threading rewritten source + mtime in memory between writes (setClassName is literal → ids stable, no canvasIdMap rebase), one final source change, partial-failure summary toast. `CanvasHtmlFrame` anchors the overlay to the union rect when >1 selected; `CanvasReactNodeGroupResizeEvent` threaded through the item/workspace/tab chain. 8 tests.
- **U4a computed-class fallback** (`utils/canvasResizeStyleMutation.ts`): computed-`className` HTML resize now writes merged inline-`style` px via the existing `setAttribute` writer (no new writer surface). TSX stays a documented no-op (React `style` is an object expression — separate v4 decision). 8 tests.
- **U11 parity audit reconciled:** the one real gap — `update_media_crop`'s schema lacked U8's `crop` window (handler already passed it through) — is fixed. `CANVAS_AGENT_MCP_COMMANDS.md` + `agentNativeManifest` now document U4a/U4b/U8/U10/U12 agent parity via existing tools; the deliberate "no `drag` MCP tool" stance is recorded. MCP stdio test now round-trips `crop`.
- **551 tests pass; typecheck + lint clean.** v3 is feature-complete; the only remaining items are the browser-verification pass and the TSX-`style`-object decision.

## Remaining v3 surface

To complete the headline goal ("every node type editable like Figma + agent parity"), the still-needed slices are:

| Unit | Scope of remaining work |
|---|---|
| **U2** (UI consumers) | wire HTML structural mutations into CanvasReactNodePropertyPanel + CanvasHtmlFrame the way TSX is wired today |
| **U3** (continuity) | verify wrap/insert/remove rebase the active selection + refresh overlay rect on every surface, especially after iframe recompile |
| **U4b** (structural drag) | render path is wired end-to-end (drag → hit-test → zones); remaining: dispatch the `insertChild` / `wrapSelection` write on drop using the staged primitive's `childSource` |
| **U5** (CanvasTab wiring) | host the log state, wire Cmd-Z / Cmd-Shift-Z + toast, route undo/redo through the existing AST writer endpoint |
| **U6** (endpoint + UI) | markdown write endpoint, U13 bridge wiring for inline edit, CanvasMarkdownItem affordances |
| **U7** | browser-verify numeric prop scrub on a real component panel now that PointerLock + fallback wiring is in |
| **U8** | ✅ done — on-canvas crop + clip handles landed alongside the panel sliders |
| **U9** | optional drag-sort polish remains; panel-side gap/padding sliders, live gap scrub, and live child reorder controls are already in |
| **U10** | rendered-SVG direct label edit via click/bridge remains; source-backed panel label edit is already in |
| **U11** | complete the parity audit; first explicit MCP wrappers for landed direct-manip operations are already in |
| **U12** | selection model + union-rect visualization done; group-transform writes (resize/move across all selected) remain as a separate slice |

## Out of scope for v3

- Rotation (assumed never in canvas transform)
- Multi-iframe drag-between
- Excalidraw / embed direct edit (delegated to their own tools)
- Responsive class prefixes (`md:w-4` etc.)
- Inline-style fallback semantics for hold-Alt / hold-Cmd modifier keys (post-U4a polish)
