# Canvas Figma-like editing for shadcn-style design systems

**Date:** 2026-04-27
**Status:** Draft — needs approval before `ce-plan`
**Author:** Gleb + Claude session

## Problem

Today the canvas can render React components as preview nodes (`sourceMode: "react"`) and display whole apps via iframe-with-proxy. What it can't do is **mutate components** the way Figma mutates frames: select an element, drag/resize it, edit text, change a token, extract a region into a reusable component, and have those changes flow back to a real, owned source file the user (or any agent / CI) can commit.

We want a Figma-like editing layer where:
1. The **source of truth** is real React + CSS files in a local project (shadcn model: copy-paste, owned, primitive-based).
2. The canvas surfaces those files as **live, editable nodes**.
3. Edits on the canvas — by hand, by agent, or both pairing — patch the underlying source.
4. The composition flow is **tokens → primitives → compound components → pages**, with iframe preview at every level.
5. Persistence is **local-first**, with optional GitHub sync as the collaboration/backup layer.

## Constraints

- **Web-native primitives only** — no proprietary node types invented by the canvas; everything compiles to React + CSS variables + Tailwind.
- **Agent-native parity** — every action a human can take in the UI must be reachable from the agent through MCP. (CLAUDE.md rule, already enforced for existing canvas mutations.)
- **shadcn approach** — components are owned source files in the user's project, not opaque library imports. Edits are TSX/CSS string mutations, not opaque metadata changes.
- **Iframe preview is the only render surface** for both single-component nodes (existing React TSX preview) and full-page nodes (existing local-app proxy + snapshot fallback).
- **Chrome iframe-throttling reality** (yesterday's investigation): when a node is in `interact` mode and on-screen, JS runs normally. When it's a small thumbnail far from the viewport, JS may be paused mid-effect. Editing UX must work in **interact mode** and not depend on the iframe's main thread running for the snapshot/thumbnail state.
- **Roles fluid**: human-only authoring, agent-only authoring, and pair authoring are all first-class. No "agent mode" toggle.
- **Local-first**: every edit lands in the local working tree first. GitHub sync is opt-in and explicit (does not happen on every edit).

## Existing scaffolding (verified)

- `projects/design-system-foundation/` — shadcn-style folder layout: `designTokens.ts`, `components/`, `configs/`, `registry.json`. Ready to be the source-of-truth project for v1.
- `projects/app-signal-mobile/`, `projects/appsignal-local/` — real-app projects already wired through the canvas proxy.
- `components/canvas/CanvasHtmlFrame.tsx` (just landed) — html canvas nodes with `sourceMode: "react"`, `sourceReact`, `sourceCss`, compiled via `/api/canvas/compile-react`.
- `components/canvas/embedPreviewService.ts` — full-page Playwright snapshot capture, now artboard-aware (yesterday's commit).
- `bin/canvas-mcp-server` — agent-facing MCP surface that already exposes `create_item`, `update_item`, `list_primitives`, etc.
- **No existing GitHub sync** infrastructure was found by grep. The user's "we have sync" likely refers to the local-scan/project-watcher that auto-discovers local app folders. This spec assumes GitHub sync is **net-new** in scope and proposes the smallest viable shape; if it's already partially built, we'll discover that during `ce-plan`.

## What changes for the user

A canvas project becomes a **bidirectional view** of a design-system source folder. Examples of the new flows:

- Drop a `Button` primitive node from the design-system-foundation project onto the canvas → it imports `projects/design-system-foundation/components/button.tsx`, renders it in an iframe, exposes its props.
- Click the button in the iframe (interact mode) → properties panel shows: text, variant, size, className. Edit text → the source file `button.tsx`'s default export's children update on disk.
- Drag-resize a card frame → padding/gap classes update in the className string of the source file.
- Select a region of a page node → "extract to component" → agent (or human) creates a new TSX file, replaces the region with the new import, both files saved to disk.
- Change a design token in the tokens panel → `designTokens.ts` updates → all dependent components recompile.
- Hit "Sync to GitHub" → committed working tree pushed to a configured remote repo on a feature branch.

## Three options for the edit-to-source bridge

The hardest design choice is how to translate canvas-level edits (drags, resizes, text changes, prop tweaks) into TSX source mutations. Three plausible models, ranked by how much we trust the AST.

### Option A — String / regex patches over TSX

Treat TSX as a string. For each edit type, define a deterministic patch (e.g. text edit → swap `>old<` for `>new<` in the JSX child position; className tweak → regex-replace the `className=""` value of the targeted element).

- **Pros**: Trivial to implement, no TS compiler dependency. Fast. Works for shadcn-style files which are flat and predictable.
- **Cons**: Brittle on anything beyond simple JSX. Multi-line JSX, comments, conditional className expressions, computed children break the regex. No semantic understanding of "the same element across renders".

### Option B — TS AST round-trip via `ts-morph` or babel

Parse TSX into AST, mutate the matching JSX node, serialize back. Use a stable element id (data attribute injected at compile time) to round-trip canvas edits to the right AST node.

- **Pros**: Robust against formatting variation. Handles attributes, conditionals, fragments. Same approach Figma → React tools (Builder.io, Locofy) use.
- **Cons**: Heavier dependency, slower edits (parse + serialize per change), can regress code formatting if not paired with a formatter pass. Needs a stable element-identification strategy.

### Option C — Edit a rich intermediate (JSON spec) → regenerate TSX

Don't edit TSX directly. Edit a structured "scene graph" (e.g. JSON: `{type: "Button", props: {...}, children: [...]}`), and have a deterministic generator render TSX from it. The TSX file becomes a generated artifact.

- **Pros**: Cleanest editing model. Same scene graph used in canvas, agent, and source generation.
- **Cons**: Loses "owned source file" property — the user can no longer hand-edit the TSX, because edits get clobbered by the next regenerate. Breaks the shadcn model. Forces every component into a single representation that may not survive complex hand-written logic.

## Recommended direction

**Start with B (AST round-trip) for component source files; fall back to A (string patch) for tokens.** Concretely:

- **Phase 1 — primitives & compound components**: AST-driven editor for TSX. We inject a build-time `data-canvas-id` attribute via the Vite plugin; canvas edits map to AST nodes by that id. Only edits that round-trip cleanly are surfaced as direct-manipulation actions in the canvas; everything else opens the source in a side editor.
- **Phase 2 — tokens**: `designTokens.ts` is already a flat object literal. Use string/regex patches for token edits — much simpler, and tokens don't need the JSX-aware machinery.
- **Phase 3 — page composition**: pages are arrangements of component instances. Edits at the page level become AST mutations to the page's TSX file (which is a flat tree of imported components with prop overrides). Same engine as Phase 1.

We **explicitly reject Option C** for v1 because it breaks shadcn's "owned source" promise. We may revisit a JSON-spec layer for **agent-authored components only**, where the agent emits the spec and a generator writes the TSX — but the user-authored TSX always remains the source of truth.

## Scope (v1)

In:
- One designated source-of-truth project (start with `projects/design-system-foundation/`).
- TSX node editing: text content, className, prop overrides on existing JSX elements.
- Token editing: rename, change value, add/remove token.
- Component instantiation on canvas (drag from library panel, place on board).
- Property panel for the selected element (tied to the underlying JSX node, not the rendered DOM).
- Iframe-driven element selection (click in interact mode → highlight matching AST node → open property panel).
- Saving edits writes to disk via existing canvas file API + a new TSX-write API.
- "Promote selection to component" — extract a JSX subtree into a new TSX file, replace with import.
- Agent parity: every direct-manipulation action is also exposed as an MCP tool.

Out (v2 or later):
- GitHub sync. Spec it later as a separate slice; v1 ships local-only.
- Auto-layout / flex/grid intent-driven editing (we hand-edit className for now).
- Multiplayer / presence.
- Variant systems beyond shadcn's `cva` pattern.
- Prototyping links / click-through flows.
- Extracting components out of full-app iframes (the AppSignal-style preview): too much DOM noise and React internal state to map cleanly. v1 scope is limited to **owned design-system files**, not arbitrary websites.

## Non-goals

- We are not building a Figma replacement. The model is "Figma-like edits, real React output", not "feature parity with Figma".
- We are not creating a new component model. shadcn's primitive + cva pattern is the model.
- We are not solving Chrome iframe throttling. Editing happens in interact mode (on-screen, JS running). Snapshot/thumbnail rendering is unaffected by the editing layer.

## Open questions for review

1. **Element identification across edits**: data-attribute injection vs. AST path stability vs. comment markers — which is most robust against agent-driven and human-driven edits both happening on the same file? (Lean: data attribute injected by Vite plugin during canvas-targeted dev builds, stripped from production builds.)
2. **Single-file vs. multi-file edits**: when a canvas edit affects both a token and the consuming component, do we batch into one save, or save them independently and let HMR re-render? (Lean: independent saves; HMR is good at this.)
3. **Component library discovery**: how does the canvas know what's available to drop? (`registry.json` already exists in `design-system-foundation/`. Lean: extend that registry as the single source of truth, agent reads it via MCP.)
4. **Page-level vs. component-level editing surface**: do they share one canvas, or split into two modes? (Lean: one canvas; nodes themselves carry "this is a primitive instance" vs. "this is a page composition" metadata. Agent and UI behave the same way.)
5. **The `.canvas` file's relationship to source files**: is the `.canvas` file a save of the editing session (camera position, selection, layouts), or does it author the source files? (Lean: save of session — source files are independent and live under `projects/<name>/components/`. The `.canvas` references them by relative path.)

## What I want from your review

- Confirm or push back on the **B + A hybrid** direction.
- Tell me if any of the **Out of scope** items must move into v1.
- Answer or redirect any of the **5 open questions** above.
- Confirm the source-of-truth project is `projects/design-system-foundation/` for v1 (vs. spinning up a fresh one).

Once approved, I'll move to `ce-plan` with this spec as the reference.
