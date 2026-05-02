---
title: "feat: Canvas Figma-like editing for shadcn-style design systems"
type: feat
status: active
date: 2026-04-28
origin: docs/specs/2026-04-27-canvas-figma-like-editing.md
---

# feat: Canvas Figma-like editing for shadcn-style design systems

## Overview

Layer Figma-like direct manipulation on top of the existing React TSX preview node so that selecting an element in the iframe surfaces a property panel tied to the underlying TSX AST node, edits round-trip back to the source TSX/CSS files, and components compose from primitives → compound → pages. v1 source-of-truth: `projects/design-system-foundation/`. Local-first; agent parity required for every UI action.

---

## Problem Frame

The canvas can already render React components (`sourceMode: "react"` on html canvas nodes) but cannot mutate the source files those components live in. Today, edits in the canvas live only in `.canvas` document state; tomorrow the user expects clicking a button in the iframe to expose its props, dragging it to update its className, and "promote selection to component" to write a new TSX file under `projects/design-system-foundation/components/ui/`. The spec at `docs/specs/2026-04-27-canvas-figma-like-editing.md` lays out the user-facing flows and approved direction (AST round-trip for components; regex patches for tokens).

---

## Requirements Trace

- R1. Editing an element in the iframe surfaces a property panel tied to the underlying TSX AST node (not just the rendered DOM). *(see origin: spec §"What changes for the user")*
- R2. Property panel edits (text content, className, prop overrides on existing JSX elements) write back to the source TSX file on disk.
- R3. Token edits (rename, change value, add/remove) write back to `projects/design-system-foundation/designTokens.ts` and re-cascade through HMR.
- R4. Components from `projects/design-system-foundation/registry.json` are draggable from a library panel onto the canvas.
- R5. "Promote selection to component" extracts a JSX subtree into a new TSX file under `projects/design-system-foundation/components/ui/` and rewrites the original to import it.
- R6. Iframe-driven element selection (click in interact mode → highlight matching AST node → open property panel) works inside React TSX preview nodes.
- R7. Element identification survives both human-driven and agent-driven edits to the same file.
- R8. Every direct-manipulation action is also reachable from the agent through the existing MCP server (`bin/canvas-mcp-server`).
- R9. Editing surfaces work in iframe interact mode without depending on the page's main thread running while throttled.
- R10. Local-first persistence — every edit lands in the local working tree before any sync.

**Origin actors:** human designer (UI direct manipulation), agent (MCP tools), pair (mixed authoring on the same file).
**Origin flows:** F1 click element → property panel; F2 edit prop → source patch; F3 drag primitive from library → canvas + source instantiation; F4 select region → promote to component (file extraction); F5 token edit → cascading HMR re-render.
**Origin acceptance examples:** AE1 click button in iframe of `Button.tsx` → property panel shows `variant`, `size`, `fullWidth`, `children`; edit `variant` to `secondary` → `Button.tsx` updates on disk; iframe re-renders with new variant. AE2 select a `<div className="p-4">` in a page node → click "Promote to component" → new `components/ui/Card.tsx` exists with that subtree; original page now imports `Card`. AE3 rename `--color-brand-600` token to `--color-primary-600` in token panel → `designTokens.ts` updates; all consuming components re-render under HMR with no broken styles.

---

## Scope Boundaries

- v1 source-of-truth project is `projects/design-system-foundation/` only — not arbitrary user projects.
- v1 edits TSX class strings, prop values, JSX text children, and token object literal entries — not arbitrary control flow, hooks, or imports beyond what extraction needs.
- v1 element identification is for owned design-system files, not for full-app iframes (AppSignal, etc.) — we do not try to map their internal React state.
- No component variant systems beyond the `cva`/className convention already in use.
- No multiplayer / presence / comments.
- No prototyping links / click-through flows.
- No auto-layout flex/grid intent — users hand-edit className.

### Deferred to Follow-Up Work

- GitHub sync of edited files: separate plan, post-v1.
- Extracting components out of full-app iframes (AppSignal-style preview): too much DOM noise + runtime React state. Out of v1 entirely.
- JSON-spec → regenerated TSX as an alternative model for agent-only authoring: revisit only if AST round-trip proves insufficient for agents.
- Snapshot-mode editing (editing the static image): not a goal; editing happens in interact mode.

---

## Context & Research

### Relevant Code and Patterns

- `components/canvas/CanvasHtmlFrame.tsx` — html canvas node with `sourceMode: "react"`, `sourceReact`, `sourceCss`. The iframe rendering target.
- `components/canvas/CanvasHtmlPropsPanel.tsx` — current side-panel editor for inline HTML / React TSX / CSS. Property panel work piggybacks on this.
- `components/canvas/CanvasEmbedDebugSection.tsx` — recent precedent for an in-canvas inspector that reads from the iframe (`document.querySelector('iframe[data-canvas-embed-id="..."]')`). Mirror the same pattern for the new property panel.
- `vite.config.ts` — `/api/canvas/compile-react` endpoint (esbuild bundle of TSX into runnable JS for the iframe). Element-id injection plugin will sit in this pipeline.
- `bin/canvas-mcp-server` — agent-facing MCP server. Tool registration shape: `{ name, description, inputSchema }`. Add new tools mirroring each UI action (R8).
- `projects/design-system-foundation/components/ui/{Button,Box,Stack,Text,Heading,Surface}.tsx` — current primitives (props, variantStyles, cn() helper). Edits target these files.
- `projects/design-system-foundation/registry.json` — flat list of `"primitive/<name>"` strings. Must extend with metadata (props schema, default props, category) for the library panel.
- `projects/design-system-foundation/designTokens.ts` — token export. Flat object literals; regex-patchable.
- `utils/iframeProxyShims.ts` — recent shim pattern. The click-to-select bridge will follow the same idempotent injection model, but for React TSX preview nodes (not the full-app proxy).

### Institutional Learnings

- **Canvas iframe throttling (yesterday's investigation, captured in `Inbox/raw/2026-04-26 Canvas iframe animations — Chrome throttling and the limits of shimming.md`):** Chrome pauses JS in scaled/offscreen iframes. The editing layer cannot rely on iframe-side timers, RAF, or queueMicrotask running. **Implication for this plan:** the iframe's selection bridge must use `postMessage` from the parent (which survives throttling) for outbound actions. Click events inside the iframe still fire because they're driven by the user's input, not by JS schedulers.
- **Same-origin proxy / `allow-same-origin` is required** for the parent to read the iframe's `contentDocument`. The React TSX preview node is already same-origin (served by the dev server), so parent → iframe DOM access works.
- **In-app debug panels with copy-to-clipboard pay for themselves fast.** The inspector built yesterday for iframe diagnostics turned a hard-to-reproduce bug into a 30-minute investigation. Apply the same "first-class diagnostic" mindset to the AST round-trip: when a save round-trips badly, we want a panel showing what changed before/after.

### External References

- `ts-morph` (https://ts-morph.com/) — high-level TypeScript Compiler API wrapper. Cleaner than raw `typescript` API for AST mutation; preserves formatting reasonably well via `Project.save()`. Used by Builder.io, NX, and similar tooling for TSX manipulation.
- `recast` (https://github.com/benjamn/recast) — AST round-trip preserving formatting and comments; alternative if ts-morph drops trivia. Decision deferred to U4 once we test ts-morph behavior on real `Button.tsx`.
- shadcn/ui composition pattern — relevant primitives (Button, Card, Input) are flat function components with a `cn(...)` className helper and explicit prop types. Our primitives match this shape, so AST mutation patterns from shadcn-targeted tools translate directly.

---

## Key Technical Decisions

- **AST library: ts-morph.** Prefer over raw babel for ergonomics. If formatting drift becomes a problem in U4, swap to recast (decision-point flagged in U4's risks).
- **Element identification: data-canvas-id attribute, injected by a Vite plugin into the compile-react pipeline only.** The id is a stable hash of `<file path> + <AST node path>`, computed at compile time. Production builds never see the attribute. Resolves spec open question 1 (data-attr wins over AST-path-only because it survives JSX shape changes when a wrapper is added/removed; data-attr propagates to the DOM where the click happens).
- **Selection bridge: `postMessage` from iframe → parent on click in interact mode.** Iframe injects a small click handler that finds the nearest ancestor with a `data-canvas-id`, posts `{type: "canvas/select", canvasId, rect}` to the parent. Parent looks up the canvas-id in its in-memory map (built when the file is compiled), opens the property panel.
- **Save model: independent saves per file with HMR-driven re-render.** Resolves spec open question 2. The ts-morph `Project` is shared per editing session, but each save is a single `sourceFile.saveSync()` call. HMR handles cascade re-renders for token changes.
- **Component library discovery: extend `registry.json` with per-primitive metadata.** Resolves spec open question 3. Each entry becomes `{path, name, category, propsSchema, defaultProps}`. The MCP `list_primitives` tool reads from the same registry.
- **Single canvas, node metadata distinguishes "primitive instance" vs. "page composition".** Resolves spec open question 4. Both edit through the same property panel; the panel adapts to what the AST node actually is.
- **`.canvas` file is session state, not source-of-truth.** Resolves spec open question 5. It records camera position, selection, layout. Source files are referenced by repo-relative path. Reopening the `.canvas` file re-reads source from disk.
- **TSX subset enforced for v1 editing surface:** flat function components (no nested function components), JSX with literal classNames (no computed className expressions outside `cn(...)`), explicit prop types. Files violating this open in source-only mode (no direct manipulation), with a clear panel notice. This keeps the AST mutation surface small enough to ship reliably in v1.
- **Concurrent-edit conflict policy: last-write-wins, surface a warning when the file changed on disk between read and write.** Both human edits (saved file changes) and agent edits go through the same TSX-write API which holds a per-file mtime token. If the token doesn't match on save, the API rejects and the panel shows a "file changed externally — reload" notice. Document at U4.

---

## Open Questions

### Resolved During Planning

- *Element identification mechanism* — resolved: data-canvas-id attribute injected by Vite plugin (decided above).
- *Single-file vs. multi-file edits batching* — resolved: independent per-file saves, HMR handles cascade.
- *Component library discovery* — resolved: extended `registry.json` is the single source of truth.
- *Page-level vs. component-level editing surface* — resolved: one canvas, node metadata differentiates.
- *`.canvas` file relationship to source files* — resolved: session state only; references files by path.
- *AST library choice* — resolved: ts-morph for v1, with recast as fallback if formatting drift is unacceptable.

### Deferred to Implementation

- Exact regex shape for token patches in `designTokens.ts` — depends on how the file's actual structure (object literal? array of records?) interacts with the chosen mutation strategy. Decided in U5.
- Whether `cn()` calls in className strings can be safely string-mutated, or require AST-level call expression awareness — decided in U4 by looking at `Button.tsx` and similar primitives.
- Exact set of MCP tool names and shapes for U8 — depends on which UI actions land first in U2–U7.
- Whether the data-canvas-id Vite plugin should run in normal dev (always on) or only when the canvas is open (gated by env or query param) — decided in U1, depending on cost of the AST traversal during regular dev iteration.
- Whether ts-morph's default `manipulationSettings` preserve enough trivia, or whether `Project` needs custom settings — discovered in U4 testing.

---

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

```
                  ┌────────────────────────────────────────────────────────────────┐
                  │                            Canvas (parent)                     │
                  │                                                                │
  Library panel ──┤ ↳ drag primitive  ──→  emit "instantiate" → AST insert        │
                  │ ↳ select node     ←──  postMessage("canvas/select", id)       │
                  │ ↳ property panel  ──→  emit "patch"  → AST mutate → save      │
                  │ ↳ token panel     ──→  regex patch → save designTokens.ts     │
                  │ ↳ promote to comp ──→  AST extract subtree to new file        │
                  │                                                                │
                  │                          MCP server (parity)                  │
                  │   create_react_node, update_react_node, list_design_tokens,   │
                  │   patch_design_token, instantiate_primitive, promote_to_comp  │
                  └────────────┬─────────────────────────────────────┬─────────────┘
                               │                                     │
              compile-react    ▼                                     ▼   write TSX/CSS
              (esbuild +       ───────────────────────────────────  via ts-morph
               id injection                                          (with mtime
               Vite plugin)    ┌─────────────────────────────────┐   token check)
                               │                                 │
                               │       Iframe (preview)          │
                               │                                 │
                               │  React TSX preview node         │
                               │  + injected click bridge        │
                               │  (data-canvas-id resolves to    │
                               │   AST node on parent side)      │
                               │                                 │
                               └─────────────────────────────────┘

         Source files (single source of truth, edited in place)
         projects/design-system-foundation/
           ├── components/ui/{Button,Box,Stack,...}.tsx
           ├── designTokens.ts
           └── registry.json (extended with metadata)
```

Two key data flows the diagram emphasizes:

1. **Click → property panel.** The iframe knows nothing about AST. It finds `data-canvas-id` on the clicked element and `postMessage`s up. The parent has an in-memory map (`canvasId → AST node ref`) populated when the file was compiled, and uses it to drive the property panel.

2. **Edit → save.** All write paths (UI panel, MCP tool, library drag, extraction) go through one TSX-write API on the dev server, which uses ts-morph to mutate and save. The mtime check guards against concurrent edits.

---

## Implementation Units

- U1. **data-canvas-id injection via Vite plugin**

**Goal:** Every JSX element in TSX files compiled through `/api/canvas/compile-react` gets a stable `data-canvas-id` attribute injected at compile time. The id is a hash of `<file path> + <AST node path>`. Production builds never see this attribute (gated to canvas-targeted compilation only).

**Requirements:** R1, R6, R7

**Dependencies:** None.

**Files:**
- Create: `vite/plugins/canvas-element-id.ts` — Vite plugin that runs in the compile-react pipeline only.
- Create: `tests/canvasElementIdPlugin.test.ts` — unit tests for stable id generation.
- Modify: `vite.config.ts` — wire plugin into the `/api/canvas/compile-react` endpoint's esbuild context, behind a flag/option.

**Approach:**
- Plugin walks the JSX AST after esbuild's TSX→JS transform (or before, via a TypeScript transformer — pick whichever ts-morph gives us cleaner access to JSX paths).
- Id format: `<8-char hash of repo-relative file path>:<dot-separated AST path>`. Example: `a3f0e1b2:default.body.0.children.1`.
- Stability rule: the id depends on AST shape, not formatting. Adding/removing a wrapper element keeps deeper ids stable (their AST path within the new wrapper is preserved).
- Plugin only runs when the compile request includes `?canvas=1` or equivalent flag — production builds untouched.

**Patterns to follow:**
- `vite.config.ts:5290–5340` (proxy HTML rewrite + shim injection) — same idempotent / gated pattern, but at compile time instead of HTTP response time.
- `utils/iframeProxyShims.ts` — example of a self-contained injectable that survives multiple invocations.

**Test scenarios:**
- *Happy path:* compile `Button.tsx` with the plugin enabled → every `<button>`, `<span>`, `<div>` JSX node has a `data-canvas-id` attribute in the output.
- *Happy path:* same file compiled twice → ids are byte-identical.
- *Edge case:* JSX node already has a `data-canvas-id` attr (e.g. from a previous round-trip in source) → plugin overwrites with the AST-path-derived id, does not duplicate.
- *Edge case:* file with computed className via `cn(...)` → plugin still injects id; className handling is U4's concern.
- *Edge case:* file with conditional rendering (`{flag && <Foo/>}`) → both branches get distinct ids based on AST path.
- *Stability:* add a wrapper `<div>` around an existing element → the wrapper gets a new id; the inner element's id is unchanged because its AST path within the new wrapper still resolves the same.
- *Stability:* rename a variable that doesn't affect JSX shape → all ids unchanged.
- Covers AE1. Compile `Button.tsx` → the `<button>` element in the output has a `data-canvas-id` that the U2 click bridge can resolve.

**Verification:**
- Compiling `projects/design-system-foundation/components/ui/Button.tsx` through the canvas pipeline produces output containing `data-canvas-id` on the button JSX element.
- Production build (`npm run build`) contains zero `data-canvas-id` attributes.
- The id for the same JSX node in two consecutive compiles is byte-identical.

---

- U2. **Click-to-select bridge (iframe → parent)**

**Goal:** A click inside a React TSX preview node iframe (in interact mode) selects the matching AST node on the parent canvas. Hover highlights the element with a thin outline.

**Requirements:** R1, R6, R9

**Dependencies:** U1.

**Files:**
- Create: `utils/canvasReactNodeBridge.ts` — injectable script string (mirroring `utils/iframeProxyShims.ts`'s shape) plus a parent-side handler module.
- Modify: `vite.config.ts` — inject the bridge into the compile-react output (same compile-time path as U1).
- Modify: `components/canvas/CanvasHtmlFrame.tsx` — listen for `canvas/select` and `canvas/hover` postMessages from the iframe; surface selection state up to the canvas.
- Create: `tests/canvasReactNodeBridge.test.ts` — unit test for click handler + postMessage payload shape.

**Approach:**
- Iframe-side script attaches a single delegated `click` listener at `document` level, finds nearest ancestor with `data-canvas-id`, posts `{type: "canvas/select", canvasId, rect, fileHint}` to `window.parent`.
- Hover listener throttled (`mousemove` + `requestAnimationFrame`) — note: throttling pauses with the iframe, but hover is not load-bearing if it stalls (gracefully degrades).
- Parent: each `CanvasHtmlFrame` registers its iframe and the file-id map (which file's compiled output is loaded). On postMessage, the parent looks up `(fileId, canvasId)` and opens the property panel for the matched AST node.
- Visual highlight: thin outline rendered as an absolute-positioned overlay on the parent canvas, anchored to the iframe's reported `rect`, accounting for iframe scale.

**Patterns to follow:**
- `components/canvas/CanvasEmbedDebugSection.tsx` — same parent-reads-from-iframe pattern (via `data-canvas-embed-id`), here generalized to `data-canvas-id` lookups.
- `utils/iframeProxyShims.ts` — postMessage-driven escape hatch for parent control of iframe behavior.

**Test scenarios:**
- *Happy path:* click a `<button>` in the iframe → parent receives `{type: "canvas/select", canvasId: "...", rect, fileHint}`.
- *Edge case:* click on an element with no `data-canvas-id` (e.g. a text node) → bridge walks up to nearest ancestor that has one.
- *Edge case:* click on the iframe's body with no JSX-rendered ancestor at all → posts a "no selection" message; parent clears selection.
- *Integration:* render a node compiled from `Button.tsx`, click the button → parent's selection state contains the right `canvasId`. Compile `Card.tsx`, render, click an inner element → parent's selection state matches that inner element's id.
- *Throttling robustness:* Even if the iframe is offscreen and JS is throttled, the click event still posts (clicks are user-driven, not scheduler-driven). Verified by integration test that puts the iframe at `transform: scale(0.1)` and confirms click still postMessages.
- Covers AE1. Click button in iframe of `Button.tsx` → selection event reaches parent.

**Verification:**
- Manual: open canvas with a Button preview node, click the button in interact mode, confirm selection outline appears on the parent.
- Property panel for U3 receives the right node identifier.

---

- U3. **Property panel tied to AST node**

**Goal:** When a node is selected (U2), the canvas property panel shows the AST-level shape of the selected JSX element: tag name, attributes (with type info from JSX prop types where available), text children. Edits to fields stage a patch; "Apply" hits U4's save API. Falls back to source-only mode for files violating the v1 TSX subset.

**Requirements:** R1, R2

**Dependencies:** U1, U2.

**Files:**
- Create: `components/canvas/CanvasReactNodePropertyPanel.tsx` — the new panel.
- Modify: `components/canvas/CanvasHtmlPropsPanel.tsx` — host the new panel when a React TSX node has an active in-iframe selection.
- Create: `utils/canvasAstReader.ts` — given a file path + canvas id, return AST node info (tag, props, children) without mutating. Uses ts-morph.
- Create: `tests/canvasAstReader.test.ts` — unit tests for reading element shape from real primitive files.

**Approach:**
- Panel structure: header (tag name + file path), props table (attribute name, type, value, edit input), text children textarea (if element has only text children), warning banner if the file is in source-only mode.
- AST reader: opens the source file in ts-morph, walks to the AST node by canvasId path-decode, returns a JSON description. Read-only — no save responsibility.
- TSX subset detection: a separate validator function returns `{ supported: boolean, reason?: string }` for a given file. Files outside the subset render the panel in "source only" mode (link to open in editor; no inline edit fields).

**Execution note:** Test-first for `canvasAstReader` against real `Button.tsx` / `Card.tsx` fixtures — the unit's correctness is hard to inspect without test cases.

**Patterns to follow:**
- `components/canvas/CanvasEmbedPropsPanel.tsx` — section structure, copy/refresh buttons, status pills.
- `components/canvas/CanvasArtboardPropsPanel.tsx` — selection-driven property panel layout.

**Test scenarios:**
- *Happy path:* select the `<button>` in `Button.tsx` → panel shows `tag: button, props: {className, type, ...spread of ButtonHTMLAttributes}, children: <span>...`.
- *Happy path:* select a primitive's root element → panel reads its variant/size/fullWidth props from the function's prop type.
- *Edge case:* select a node whose parent is a `cn(...)` className expression → panel shows the className field with a "computed expression" indicator and disabled inline edit (link to source mode).
- *Edge case:* select a node in a file that violates the v1 subset (nested function component) → panel shows the source-only mode banner with a "Open file" button.
- *Integration:* edit the `variant` field in the panel → staged patch is shown, "Apply" passes a structured `{ canvasId, prop, newValue }` to U4's API.
- *Stability:* when U4 saves a file, U3 re-reads the AST and the panel updates without losing the user's pending text-input focus (debounced refresh).
- Covers AE1. Click button in iframe → property panel shows variant, size, fullWidth, children.

**Verification:**
- Manual: select Button, see expected props; select Card's inner div, see className + child count.
- Files violating the subset render the source-only banner instead of crashing.

---

- U4. **AST write-back for text/className/prop edits**

**Goal:** A single TSX-write API on the dev server accepts `{filePath, canvasId, mutations[]}`, applies them via ts-morph, and saves the file. Concurrent-edit safety via mtime token. The property panel (U3), MCP tools (U8), and library drag (U6) all go through this one path.

**Requirements:** R2, R7, R10

**Dependencies:** U1, U3.

**Files:**
- Create: `utils/canvasAstWriter.ts` — ts-morph-based mutation logic.
- Create: `vite/api/canvasAstWrite.ts` — Vite middleware exposing `/api/canvas/ast/write`.
- Modify: `vite.config.ts` — register the new endpoint.
- Modify: `package.json` — add `ts-morph` to `devDependencies`.
- Create: `tests/canvasAstWriter.test.ts` — unit tests for each mutation type.

**Approach:**
- Mutation types in v1: `setTextChild` (replace JSX element's text child), `setClassName` (replace `className=""` literal value), `setPropValue` (replace a prop value literal — string, number, boolean, or simple identifier), `setSpreadProps` (rebuild a single attribute when value is non-trivial).
- Element targeting: the writer accepts a `canvasId` and resolves it back to the AST node by re-walking the file with the same hashing logic as U1 (extracted into a shared helper to guarantee parity).
- Concurrency: API requires `mtime` from the client (returned by U3's reader). On save, re-stat the file; if mtime changed since the read, return 409 with a body the panel can show: "File changed externally; reload to continue editing."
- Atomicity: write to a temp file, then `fs.rename` (atomic on same filesystem). Rolling-back unsaved AST changes if the write fails.
- Formatting preservation: rely on ts-morph's `Project` defaults first. Run a real-world test on `Button.tsx` early. If formatting drift is unacceptable, swap to recast for round-trips and re-verify (decision-point flagged in this unit's risks).

**Execution note:** Test-first against real primitives. Compare before/after files byte-for-byte after a no-op mutation cycle to catch trivia loss.

**Patterns to follow:**
- `vite.config.ts:5394–5453` (existing snapshot capture API) — endpoint shape, body parsing, error handling.
- `components/canvas/embedPreviewService.ts` — typed client wrapper around an API call (use the same shape for the panel ↔ writer client).

**Test scenarios:**
- *Happy path:* set text child of the button in `Button.tsx` → file content changes only inside the JSX child; everything else byte-identical.
- *Happy path:* set className of an element from `"p-4"` to `"p-4 rounded"` → only that string literal changes.
- *Happy path:* set `variant` prop default in `Button.tsx` → only the relevant default changes.
- *Edge case:* className inside `cn("p-4", variant === "primary" && "bg-brand")` → mutation rejected with structured error that the panel surfaces; nothing is written.
- *Edge case:* file mtime mismatch → 409 returned; file unchanged on disk.
- *Error path:* invalid canvasId (not in file) → 400 with clear error; nothing written.
- *Error path:* write fails partway (disk full, permissions) → temp file cleaned up; original unchanged.
- *Integration:* round-trip `Button.tsx`: read AST, set text child to same value, save → file is byte-identical to original (no formatting drift). If this fails, escalate to recast swap.
- *Concurrency:* two simultaneous mutations from different mtime tokens → first wins; second gets 409.
- Covers AE1. Edit `variant` to `secondary` in panel → `Button.tsx` updates on disk; iframe re-renders.

**Verification:**
- Round-trip test on every primitive in `projects/design-system-foundation/components/ui/` — each must survive a no-op cycle byte-identically.
- Manual: edit variant in panel, watch the iframe HMR-re-render with the new variant.

---

- U5. **Token editor with regex patches**

**Goal:** A token panel shows entries from `projects/design-system-foundation/designTokens.ts`. Edits (rename, change value, add, remove) write back via deterministic regex/string patches — not ts-morph, since the file is a flat object literal and regex is simpler. HMR re-renders the iframe.

**Requirements:** R3

**Dependencies:** U4 (for the consistent write API surface; tokens use a different writer internally but the same API shape and mtime-safety story).

**Files:**
- Create: `components/canvas/CanvasTokenPanel.tsx` — the panel.
- Create: `utils/canvasTokenWriter.ts` — regex/string-based mutation for `designTokens.ts`.
- Create: `vite/api/canvasTokenWrite.ts` — endpoint `/api/canvas/tokens/write`.
- Modify: `vite.config.ts` — register endpoint.
- Modify: `components/canvas/CanvasSidebar.tsx` (or equivalent) — surface the new panel.
- Create: `tests/canvasTokenWriter.test.ts` — unit tests for each mutation.

**Approach:**
- Token model: each entry in `designTokens.ts` is a `{name, value, cssVar, category, subcategory, description?}` object. Mutations are: change `value`, change `cssVar` (rename), add entry, remove entry.
- Regex strategy: locate the entry by `name: "..."` literal anchor; replace the `value: "..."` field within that record's brace block. For renames, replace the literal everywhere (including consumer files referencing the cssVar — flagged as a multi-file edit, see Risks).
- Same mtime-token concurrency model as U4.
- HMR cascade: HMR is already wired through Vite for these files; saves trigger re-render automatically.

**Test scenarios:**
- *Happy path:* change `Surface`'s `value` from `"rgb(252, 254, 253)"` to `"rgb(255, 255, 255)"` → only that record's value field changes.
- *Happy path:* rename `--color-brand-600` to `--color-primary-600` → all occurrences in `designTokens.ts` updated; **no other files modified in v1** (cross-file rename deferred — see Deferred Implementation note).
- *Happy path:* add a new token → appended to the appropriate category array, file still parses.
- *Edge case:* token name appears as a substring of another token name (`Surface` inside `Surface Dim`) → regex anchored on full record boundary, not substring.
- *Error path:* file mtime mismatch → 409.
- *Integration:* edit a token value used by a primitive → HMR re-renders the iframe with the new value visible.
- Covers AE3. Rename `--color-brand-600` → `designTokens.ts` updates; consuming components re-render under HMR with no broken styles.

**Verification:**
- Manual: change a color token value, watch the iframe update.
- Token rename in v1 only updates `designTokens.ts`; consuming `.tsx` files using the old cssVar still work because both names continue to be CSS vars resolved at runtime — confirm by inspection. If rename must cascade across `.tsx` files, defer to a follow-up unit (noted in Deferred to Implementation).

---

- U6. **Component instantiation from registry**

**Goal:** A library panel lists primitives from `projects/design-system-foundation/registry.json` (extended with metadata). Dragging a primitive onto the canvas creates a new React TSX preview node whose source TSX imports and renders that primitive with default props.

**Requirements:** R4

**Dependencies:** U1, U4 (uses the AST writer to construct the new preview node's source TSX).

**Files:**
- Create: `components/canvas/CanvasLibraryPanel.tsx` — the new panel.
- Modify: `projects/design-system-foundation/registry.json` — extend each entry with `{path, name, category, propsSchema, defaultProps}`. Document the schema.
- Create: `utils/canvasRegistry.ts` — typed reader for the extended registry.
- Modify: `bin/canvas-mcp-server` — `list_primitives` tool returns the extended metadata (parity with the UI).
- Create: `tests/canvasRegistry.test.ts` — unit tests for parsing and validating registry entries.

**Approach:**
- Library panel renders a categorized grid (primitives, then later compound components, then pages).
- Drag from library → drop on canvas creates a new html canvas node with `sourceMode: "react"`, `sourceReact` containing `import { Button } from "../../../projects/design-system-foundation/components/ui/Button"; export default function Preview() { return <Button>Click me</Button>; }`. Default props from the registry fill in the JSX.
- Same node type as existing React TSX preview, just with auto-generated source.

**Test scenarios:**
- *Happy path:* registry parses cleanly; `list_primitives` MCP tool returns matching data.
- *Happy path:* drag `primitive/button` onto canvas → new node created with sensible default TSX importing Button and rendering with default props.
- *Edge case:* primitive with required props missing from registry's `defaultProps` → panel highlights the entry as "incomplete metadata" and refuses to instantiate.
- *Integration:* instantiated node compiles (passes through `/api/canvas/compile-react`) and renders without errors.
- Covers AE2 partially (instantiation half — promotion is U7).

**Verification:**
- Manual: drag every primitive onto the canvas; each renders.
- `list_primitives` over MCP returns the same data the UI uses.

---

- U7. **"Promote selection to component" extraction**

**Goal:** With a JSX subtree selected (U2), "Promote to component" creates a new TSX file under `projects/design-system-foundation/components/ui/`, moves the subtree into it as a function component, and rewrites the original file to import the new component.

**Requirements:** R5

**Dependencies:** U1, U3, U4 (uses the AST writer for both the new-file write and the original-file rewrite).

**Files:**
- Create: `utils/canvasComponentExtractor.ts` — ts-morph-based extraction logic.
- Create: `vite/api/canvasComponentExtract.ts` — endpoint `/api/canvas/component/extract`.
- Modify: `vite.config.ts` — register endpoint.
- Modify: `components/canvas/CanvasReactNodePropertyPanel.tsx` (from U3) — add the "Promote to component" action.
- Create: `tests/canvasComponentExtractor.test.ts` — unit tests for the extractor.

**Approach:**
- Input: source file path, canvasId of the subtree root, proposed new component name.
- Identify referenced identifiers in the subtree (props, helpers, types). For v1, refuse extraction if the subtree references any local variable or function that isn't a top-level import; this keeps extraction to "self-contained JSX trees" and avoids accidental closure capture.
- Generate the new TSX file: imports propagated from the original, function component with detected props, JSX body = the extracted subtree.
- Rewrite the original file: replace the subtree with `<NewComponent />` and add the import line.
- Both files saved through U4's API atomically (or as close as possible — both saves succeed, or the original rolls back).

**Execution note:** Test-first, with fixtures of progressively complex subtrees. The "what counts as referenced" detection logic is the riskiest part.

**Test scenarios:**
- *Happy path:* extract a `<div className="p-4 rounded"><Button>Hi</Button></div>` from a page → new `Card.tsx` file with that JSX, original page imports `Card` and replaces the subtree with `<Card />`.
- *Happy path:* extract a subtree with a string prop from the parent → detect the prop, generate `interface CardProps { label: string }`, original passes `<Card label="Hi" />`.
- *Edge case:* subtree references a local variable (`const computed = ...; return <div>{computed}</div>`) → extraction refused with structured error: "subtree references local variable `computed`; lift it before extracting".
- *Edge case:* requested name collides with existing file → return 409; UI prompts for a new name.
- *Edge case:* subtree contains `data-canvas-id` attributes from U1 → strip them in the new file (they get re-injected at compile time).
- *Error path:* atomic save fails partway (new file written, original rewrite fails) → new file is rolled back (deleted); error surfaced.
- *Integration:* extract → both files compile → canvas re-renders → user can select the new `<Card />` instance and edit its `label` prop via U3's panel.
- Covers AE2. Select region → "Promote to component" → new `Card.tsx` exists; original imports it.

**Verification:**
- Manual: extract a real subtree from a fixture page; both files exist, both compile, original renders identically.
- Round-trip: extract, then revert by hand → diff is clean.

---

- U8. **Agent parity (MCP tools)**

**Goal:** Every UI action above is exposed as an MCP tool on `bin/canvas-mcp-server`. Agents can do everything a human can do.

**Requirements:** R8

**Dependencies:** U3, U4, U5, U6, U7 — depends on the underlying APIs being stable.

**Files:**
- Modify: `bin/canvas-mcp-server` — register new tools; each tool calls the same dev-server APIs the UI uses.
- Modify: `docs/CANVAS_AGENT_MCP_COMMANDS.md` — document new tools and workflows.
- Create: `tests/canvasMcpServer.figmaTools.test.ts` — black-box test for each tool against a fixture project.

**Approach:**
- New tools: `read_react_node`, `update_react_node` (combines text/className/prop edits), `list_design_tokens`, `update_design_token`, `instantiate_primitive`, `promote_to_component`, `list_canvas_selectable_files` (which TSX files in the design-system project are editable in v1 vs. source-only).
- Tools call the same `/api/canvas/...` endpoints the UI uses — no parallel implementation. The MCP server is a typed RPC into the dev server.
- Agent-side guidance in `docs/CANVAS_AGENT_MCP_COMMANDS.md`: how to query a node, propose an edit, apply it, and verify via the existing `capture_canvas_items_screenshot` tool.

**Test scenarios:**
- *Happy path (one per tool):* a fixture file is read, mutated, verified to have changed correctly.
- *Integration:* an end-to-end fixture: agent lists primitives → instantiates a Button → updates its variant → promotes its parent div to a Card → reads back the resulting file structure.
- *Concurrency:* an agent and a UI edit posted in parallel — the second one fails with 409 (proves both go through the same mtime-guarded API).
- *Documentation:* every new tool is listed in `docs/CANVAS_AGENT_MCP_COMMANDS.md` with a usage prompt pattern.

**Verification:**
- All new tools work end-to-end from a Codex / Claude session.
- Existing canvas MCP tools still work (regression check).

---

## System-Wide Impact

- **Interaction graph:** the dev server gains four new endpoints under `/api/canvas/` (`ast/write`, `tokens/write`, `component/extract`, plus reads). Each is mtime-token-guarded. Same shape as existing canvas endpoints.
- **Error propagation:** all writers return structured errors; the property panel and library panel surface them as toasts/banners. MCP tools propagate the same error shapes for agents.
- **State lifecycle risks:** concurrent edits between UI and agent — guarded by mtime tokens (U4 design). Half-finished extractions — atomic rollback in U7.
- **API surface parity:** every UI endpoint is mirrored by an MCP tool (U8). The MCP tool calls the same HTTP endpoint as the UI — no parallel implementation paths to drift.
- **Integration coverage:** unit tests cover writers in isolation; an end-to-end integration test (U8) exercises a full UI → API → file → recompile → iframe re-render → AST re-read cycle.
- **Unchanged invariants:** the existing React TSX preview node behavior (compile-react endpoint, sourceReact/sourceCss editing in `CanvasHtmlPropsPanel`) is preserved — this plan adds direct manipulation; it does not replace the existing source-editing flow. Existing `.canvas` file format is unchanged. The `bin/canvas-mcp-server` keeps all existing tools.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| ts-morph drops trivia (comments, blank lines) on round-trip and reformats files. | U4 has a no-op round-trip test on every primitive. If any file fails byte-identity, swap to recast. Decision-point flagged. |
| `data-canvas-id`s collide across files (different files generate the same hash for the same path-shape). | Hash includes file path, not just AST path. U1 test asserts uniqueness across all primitives + a fixture page. |
| AST path is unstable when a wrapper element is added/removed mid-tree. | The id format derives from AST path *within* the JSX root. Adding a wrapper changes only the wrapper's id; descendants keep theirs because the path resolves through the new wrapper. U1 test exercises this. |
| Concurrent human + agent edits to the same file produce a save conflict. | Mtime token returned with every read; saves rejected on mismatch with a clear "reload" prompt. U4 + U8 tests cover this. |
| Token rename cascades: cssVar names in primitives' className strings break if `designTokens.ts` renames them but consuming files aren't updated. | v1 tokens are CSS variables resolved at runtime — renaming the JS-side `cssVar` field doesn't actually break consumers, because `var(--color-brand-600)` is in the CSS, not the TSX. Document this clearly in U5. Cross-file rename is deferred. |
| `cn(...)` className expressions can't be string-mutated safely. | U3 detects them and falls back to source-only mode for that specific element. U4 rejects mutations targeting computed expressions with a structured error. |
| Vite plugin overhead slows down every dev compile. | Plugin gated to canvas-targeted compiles only (`?canvas=1`). Production and normal dev unaffected. |
| Iframe throttling pauses our injected click bridge. | Click events are user-driven and post regardless of throttling state. Hover degradation is acceptable. Documented. |
| Files violating the v1 TSX subset (nested function components, JSX expressions in className) frustrate users who can't edit them inline. | Source-only mode banner makes the limitation explicit in the panel, with a "Open file" button and a documented expansion path for v2. |
| Agent and UI might both call the same AST writer simultaneously. | Both go through the same dev-server endpoint; the endpoint serializes per-file via a simple in-memory mutex around the read-mutate-save sequence. |
| Component extraction (U7) generates type-incorrect TSX (missing imports, wrong prop types). | Extraction generates straightforward shapes only (string/number/boolean props in v1). Subtrees with non-trivial JS expressions are refused. Unit tests on real fixtures. |

---

## Documentation / Operational Notes

- Update `docs/CANVAS_AGENT_MCP_COMMANDS.md` with the new tools and a "Designing components with the agent" workflow section.
- Update `projects/design-system-foundation/registry.json` schema and document it in `projects/design-system-foundation/README.md` (create the README if absent).
- Add a short "Editing primitives in the canvas" section to project-level docs (location TBD during U6 — likely `docs/CANVAS_FIGMA_LIKE_EDITING.md`).
- The TSX subset enforced for v1 must be documented user-visibly so contributors know which patterns are editable inline vs. source-only.

---

## Sources & References

- **Origin spec:** `docs/specs/2026-04-27-canvas-figma-like-editing.md`
- **Iframe throttling investigation:** `Inbox/raw/2026-04-26 Canvas iframe animations — Chrome throttling and the limits of shimming.md` (Obsidian vault)
- **Existing infrastructure**: `components/canvas/CanvasHtmlFrame.tsx`, `components/canvas/CanvasHtmlPropsPanel.tsx`, `components/canvas/CanvasEmbedDebugSection.tsx`, `vite.config.ts` (`/api/canvas/compile-react`), `bin/canvas-mcp-server`, `projects/design-system-foundation/`.
- **External:** ts-morph (https://ts-morph.com/), recast (https://github.com/benjamn/recast), shadcn/ui composition pattern.
