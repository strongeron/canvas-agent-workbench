---
title: "Canvas Gallery POC — running goal"
status: active
updated: 2026-05-13
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
| U1 | ⏳ next | TSX structural mutations (insert / remove / reorder / wrap / unwrap / swapTag) — unblocks U3, U4b |
| U2 | not started | same 6 mutations on the HTML side via parse5 |
| U3 | not started | canvasIdMap rebase + selection-survival through structural mutations (depends on U1+U2+U13) |
| U4b | not started | drop targets + structural drag (depends on U1+U2+U4a+U13) |
| U5 | not started | mutation log + undo/redo |
| U6 | not started | markdown direct edit (block + inline) |
| U7–U12 | not started | component variant cycling, media crop, artboard reorder, mermaid label edit, MCP audit pass, drop targets, multi-select |

## Open gates before claiming v3 demo "shippable"

1. **Visual verification** of U4a end-to-end in a real browser (drag a button corner, confirm file rewrites + overlay re-anchors). Logic is unit-tested but no human has driven it yet.
2. **U1 + U3** so a wrap/insert/remove preserves the user's selection across the recompile (currently the canvasId would simply disappear after a structural mutation).
3. **Inline-style fallback** for U4a when an element has no `w-*/h-*` class today (currently no-op; plan calls for inline `style="width: Npx"`).

## Next slice (active)

**U1 — structural TSX mutations.** `recast` installed (`158e208`). Spike confirmed trivia round-trip works on this codebase's TSX, modulo one auto-inserted `;` on `return (...)`.

### Architectural choice surfaced before U1 implementation

The plan has an internal tension between its post-review revisions ("threads `data-canvas-stable-id` through ts.factory") and U1's body ("recast.parse with typescriptParser"). They imply different ASTs — TypeScript AST vs Babel AST — and the existing reader/writer's `canvasId` resolution lives in TS-AST land (`canvasAstPath.ts` walks `ts.forEachChild`).

Options:

1. **Recast (Babel) + position-based bridge** *(proposed direction)* — keep the existing TS-AST canvasId resolution untouched. For each structural mutation: resolve the canvasId via the existing `findNodeByCanvasId` to get a `ts.Node`, read its `pos`/`end`, then locate the same JSXElement in the Babel AST by source position (Babel nodes carry `loc.start`/`loc.end`). Mutate via recast → re-print. Pro: trivia preservation as the plan wants; existing reader/writer untouched. Con: small position-bridge adapter to build and test.

2. **TS-factory only** — use `ts.factory.update*` + accept `ts.createPrinter`'s reformatting. Pro: stays in one AST world. Con: the plan explicitly rejected this for trivia reasons.

3. **Recast-native canvasIds** — drop the existing TS-AST path scheme for structural mutations and assign Babel-AST-based stable ids. Pro: clean single source of truth. Con: breaking change; two parallel id namespaces during transition.

**Choosing (1).** It matches the plan's "recast" call, preserves trivia, doesn't break existing canvasId resolution, and the position-bridge is a small adapter testable in isolation.

First slice will land: position-bridge module (resolve TS-AST canvasId → Babel JSXElement) + `removeNode` mutation + tests. Subsequent slices add insert / reorder / wrap / unwrap / swapTag.

## Out of scope for v3

- Rotation (assumed never in canvas transform)
- Multi-iframe drag-between
- Excalidraw / embed direct edit (delegated to their own tools)
- Responsive class prefixes (`md:w-4` etc.)
- Inline-style fallback semantics for hold-Alt / hold-Cmd modifier keys (post-U4a polish)
