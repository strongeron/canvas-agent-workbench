# Canvas web-native editing (v2 of canvas Figma-like editing)

**Date:** 2026-05-05
**Status:** Draft — awaiting approval
**Supersedes (in scope, not in spirit):** `docs/specs/2026-04-27-canvas-figma-like-editing.md` — that spec is React-TSX-first; this spec keeps the React-TSX track but reframes web-native HTML/CSS as the **primary** authoring surface.

---

## Problem

The user wants the canvas to be a **component lifecycle environment**:

1. Generate a component with AI.
2. Bring an existing component (paste code).
3. Compose a new one from primitives on the canvas.
4. Edit any of the above visually — fonts, colors, layout, structure.
5. Sync edits back to source files.
6. Iterate with the agent (full parity).

The substrate is **web-native**: HTML elements + CSS classes + CSS custom properties. React TSX is supported but not the default. **This is a forecast bet**, not a current-pain bet — the existing project (`design-system-foundation`) is TSX, and U1–U6 ship TSX editing successfully. We're betting that future projects, pasted snippets, and externally-plugged repos will more often be plain HTML+CSS than React, so the primary authoring surface should match. If the forecast is wrong, the dual-track architecture still ships TSX-first projects without regression.

What's shipped today (U1–U6 of the prior spec) is React-TSX-first. The infrastructure (click bridge, property panel UX, atomic write+mtime, registry parser, MCP tool pattern) is reusable, but the writers, the registry content, and the `data-canvas-id` injection are React-TSX-specific. The HTML inline mode exists but has no per-element editing.

## Constraints

- **Web-native first.** HTML+CSS as the lingua franca for primitives, tokens, and layout. React TSX = parallel track for stateful components.
- **Primary source of tokens, per project.** `tokens.css` is the project baseline; canvas-scoped sidecar files and component-scoped CSS layer over it via the cascade. Token edits land in the appropriate layer based on selection state, and iframes refresh on write.
- **Multi-source projects.** A project's components can live locally in `projects/<id>/components/` or be plugged from a remote git repo (deferred to a later phase).
- **Round-trip mandatory.** Every visual edit lands in a source file on disk; no ephemeral canvas-only state for component edits.
- **Agent parity.** Every UI action ships as an MCP tool. New endpoints are wrapped from day one.
- **Existing work is not torn out.** U1–U6 (React-TSX track) keeps working; new HTML track is built alongside.
- **Local-first.** No cloud sync, no live collaboration in v1.

## Options

### Option A — HTML/CSS as the only track, retire React-TSX support

Migrate everything to HTML+CSS. Drop the React-TSX writer and primitives.

**Pros:** Simplest mental model, smallest surface area going forward.
**Cons:** Throws away U1–U6 work and breaks teams already authoring TSX components in `projects/design-system-foundation/components/ui/`. The Button.tsx etc. are real artifacts in use.
**Verdict:** Not chosen — pragmatically wasteful.

### Option B — HTML/CSS first, React-TSX as a secondary track (CHOSEN)

Build a parallel HTML+CSS authoring pipeline that mirrors the React-TSX one, dispatching by file extension. Both tracks share infrastructure (click bridge, panel shell, write API, MCP wrapping). Token authoring lives in `tokens.css` only — the React-TSX `designTokens.ts` becomes derived (or stays as a parallel for teams that want it).

**Pros:** Preserves shipped work. Web-native is genuinely simpler for the writer (parse5 round-trips formatting better than ts-morph). Tokens unify on CSS vars — what the runtime actually uses.
**Cons:** Two writers to maintain. Two sets of registry entries. Slightly heavier infrastructure.
**Verdict:** Chosen — best balance of preserving work, matching user goal, and minimizing total surface.

### Option C — Unified abstract IR (HTML/TSX both compile to the same canvas IR)

Define a canvas IR (intermediate representation) that both HTML and TSX projects compile to and edit through. Writes flow back to the original file format via a code generator.

**Pros:** Single editor, single writer.
**Cons:** Massive scope. The IR design alone is a multi-week effort. Any real codebase has details (TSX prop types, HTML data attributes, CSS scope, IDs) that are hard to round-trip through an IR. High risk of formatting drift on save.
**Verdict:** Not chosen — premature abstraction.

## Chosen direction

**Option B.** Parallel tracks; web-native primary; shared infrastructure. Phased delivery with agent parity at each step.

### Project structure

```
projects/<projectId>/
  project.json                 # metadata
  registry.json                # local + remote primitives (extended schema)
  tokens.css                   # CSS custom properties (single source of truth)
  components/
    *.html                     # web-native primitives
    *.css                      # per-component or shared styles
    *.tsx                      # React-TSX primitives (existing track)
  .repos/                      # cached remote-repo plugs (gitignored, future)
    <repo-name>/
```

### Token model — project-level for v2; multi-layer cascade deferred

**v2 ships project-level tokens only.** A single `projects/<id>/tokens.css` per project holds top-level `:root { --token: value; }` declarations. Loaded by every canvas in the project. The token panel reads and writes this one file; mtime guard + atomic rename + MCP tool wrapping match the existing AST writer pattern.

**Deferred to a follow-up phase** (not in v2): canvas-scoped overrides via sidecar `<canvasName>.tokens.css`, and component-scoped overrides via co-located component CSS. Both are valid extensions but they ship UX surface (layer indicator, layer-aware writes, sidecar lifecycle, empty-component-CSS state) for use cases that don't yet exist. The CSS cascade architecture leaves the door open — adding either layer later is purely additive (new files participate in the cascade naturally; the panel grows a layer picker).

Existing `designTokens.ts` in `projects/design-system-foundation/` is left alone. A new `tokens.css` is added next to it as the editable layer; the TS file remains as a legacy consumer surface and can be regenerated/deprecated later. v2 ships a derive-on-write step that keeps `designTokens.ts` in sync with token edits, so existing TSX components don't fall out of date.

### Component editing model

- **Click → property panel** works for both `.html` and `.tsx` files.
- **HTML files**: A new `/api/canvas/inject-html` endpoint (or in-process function) takes `sourceHtml`, runs parse5 + `data-canvas-id` injection, and returns the augmented HTML. `CanvasHtmlFrame` hands that to `srcDoc`. This mirrors the React track's `compile-react` pipeline — Vite middleware injection at request time would not fire for `srcDoc` iframes (no GET to intercept). Property panel reads from the live iframe DOM (truth at click time). Writes go through an HTML writer that mutates the source file (parse5 round-trip).
- **TSX files**: existing pipeline (U1–U4) continues unchanged.
- **Dispatch by file extension** in the `/api/canvas/ast/write` endpoint. Supported in v2: `.html`, `.css`, `.tsx`. `.jsx` is treated as `.tsx`. Anything else (`.mdx`, `.vue`, `.astro`, extensionless) returns a clear `unsupported-extension` error; expansion path is documented in v3.
- **HTML canvasId stability policy:**
  - Use parse5 `parseFragment` (not `parse`) so we don't auto-insert `<html>/<head>/<body>` wrappers on body-only fragments.
  - Whitespace-only text nodes do **not** count toward child indices — id paths are stable across formatting changes that only adjust whitespace.
  - `data-canvas-id` is written into the served copy (the `srcDoc` payload) only, never into the source file on disk.
- **Token-write shadow paths** (`/api/canvas/tokens/write`):
  - File missing + no mtime sent → create it, return new mtime.
  - File present + no mtime sent → reject (409, `mtime-required`) to avoid accidentally clobbering an externally-edited file.
  - File present + mtime mismatch → 409 `mtime-conflict` (existing pattern).
  - CSS parse failure on input → 400 `parse-error`, file untouched.
  - Atomic rename failure → 500 `write-failed`, temp file cleaned up.

### Composition model

- **Library panel** lists registry primitives — both `.html` and `.tsx` entries.
- **Click to instantiate** drops a new canvas node referencing the primitive.
- **Promote selection to component** extracts a subtree (HTML fragment OR JSX subtree) into a new file under `components/` and rewrites the original to reference it (P7).

### Registry schema

`projects/<id>/registry.json` entries are objects with these fields:

- `id` (required) — namespaced identifier (e.g., `primitive/button`)
- `displayName` (required) — human-readable label
- `kind: "html" | "tsx"` (required) — dispatch hint; defaults to `"tsx"` for backwards-compat with existing string-form entries
- For `kind: "tsx"`: `filePath`, `importName`, optional `snippet`
- For `kind: "html"`: `filePath` (`.html`), optional `cssPath` (`.css`, defaults to sibling `<name>.css` if it exists), `componentSlug` (used as the `[data-component=...]` selector token when the future component-scope CSS layer ships)
- `description` (optional)

Example HTML entry:

```json
{
  "id": "primitive/card",
  "displayName": "Card",
  "kind": "html",
  "filePath": "components/Card.html",
  "cssPath": "components/Card.css",
  "componentSlug": "card",
  "description": "Padded card surface"
}
```

The `componentSlug` field reserves the namespace for the deferred component-scope CSS layer; v2 ships it but does not require it for instantiation.

### data-component attribute (reserved for future component-scope CSS)

HTML primitives are authored with `data-component="<slug>"` on their root element. Authors set this manually (matches the `componentSlug` in the registry entry). v2 does not consume this attribute — it's reserved so the multi-layer cascade can ship later as additive CSS without retroactive injection.

### Bring-your-own / paste flow

- A "Paste component" dialog: HTML textarea + CSS textarea + name field.
- Save creates `projects/<id>/components/<name>.html` (+ optional `.css`) and instantiates a canvas node referencing it.
- Same dialog accepts a TSX paste (saves as `.tsx`); writer dispatches by what the user picks.

### AI iteration

- Agent calls existing MCP tools to:
  - Read canvas state (which nodes exist, what's selected)
  - Read source files (`/api/canvas/ast/load`)
  - Mutate (`/api/canvas/ast/write`, `/api/canvas/tokens/write`)
  - Instantiate primitives (`instantiate_primitive` MCP tool)
  - Promote subtrees (`promote_to_component`)
- "Describe to generate": agent uses its existing skills to write HTML/CSS, calls a new `create_component_from_html` tool that writes the file + drops a canvas node. Same for TSX.

## Scope

### In scope (v2)

- HTML/CSS authoring pipeline (`data-canvas-id` injection, click bridge, property panel, literal-mutation writer, MCP tools).
- `tokens.css` as project-level token source-of-truth, with full CRUD + agent parity. Multi-layer cascade (canvas + component overrides) deferred.
- Library panel listing both HTML and TSX primitives.
- Paste-as-new-component dialog.
- Promote subtree to component.
- MCP audit + documentation.

### Deferred / non-goals

- **Structural edits** (insert/remove/reorder/wrap/unwrap/swap-tag) — deferred to a v3 spec; v2 ships only literal-property mutations.
- **Multi-layer token cascade** (canvas-scoped sidecar + component-scoped CSS) — deferred until a concrete user story surfaces.
- Remote repo plug-in (cached `.repos/`). Architecture leaves space; not built in v2.
- Multiplayer / presence / comments.
- Prototyping links / click-through flows.
- Full `tokens.css` migration of `design-system-foundation` (existing TSX project keeps `designTokens.ts`, kept in sync via derive-on-write from P1).
- Visual drag-handles / resize handles in the iframe (Figma-style transform tooling). The property panel is the primary edit surface; iframe drag is its own spec.
- Auto-layout intent inference (no "make this a flex column" heuristics — users edit className).
- Computed-style introspection beyond declared values.

### Tracks-and-phases

| Phase | Slice | Days | Acceptance |
|---|---|---|---|
| **P1** | **Color tokens via project `tokens.css`** | 1–2 | Panel reads/writes `projects/<id>/tokens.css`; mtime guard; workspace-containment + extension allowlist (extended to `.html`, `.css`, `tokens.css`); parent broadcasts cache-busted refresh over the U2 bridge so each iframe re-loads its tokens-css `<link>`; derive-on-write keeps `designTokens.ts` in sync. **MCP**: `list_design_tokens`, `update_design_token` |
| **P2** | **Typography + spacing tokens via `tokens.css`** | 1 | Same panel handles font-family/size/spacing tokens; same writer (one CSS file). **MCP**: token list/write tools extended for new categories (no new tools) |
| **P3** | **HTML element-id injection + click bridge** | 2 | Click any element in an `.html` canvas node → property panel opens with tag/attrs/classes. **MCP**: `list_canvas_selectable_files` (which `.html` files are editable), reuse existing click bridge |
| **P4** | **HTML property panel + writer (literal mutations)** | 2–3 | Edit attrs/classList/textContent → save to `.html` file; mtime guard; workspace-containment + `.html`/`.css` allowlist. **MCP**: `read_html_node`, `update_html_node` (mirrors existing `read_react_node`/`update_react_node`) |
| **P6** | **Paste-as-new-component dialog + file-creation endpoint** | 2 | Modal accepts HTML/CSS/TSX → new `POST /api/canvas/component/create` endpoint validates path, atomic-writes file under `components/`, appends to `registry.json` → instantiates node. Iframes rendering paste-originated items omit `allow-same-origin` from the sandbox so injected scripts cannot reach API endpoints. **MCP**: `create_component_from_html`, `create_component_from_tsx` |
| **P7** | **Promote subtree to component** | 2 | Right-click → "Promote" → new file + parent rewrite. **MCP**: `promote_to_component` |
| **P8** | **MCP audit + agent workflow docs** | 1 | Verify every UI action has an agent equivalent (tools added in P1–P7); `CANVAS_AGENT_MCP_COMMANDS.md` updated with end-to-end "Designing with the agent" workflow. **No new tools added in P8** — this is consolidation and docs only |
| **P9** *(optional)* | **Remote-repo plug-in** | 3–5 | Add a git URL → clone into `.repos/` → registry merged into project view |

**Total core (P1–P4, P6–P8):** ~11–14 days.

**Cut from v2 (originally P5):** Structural edits (insert/remove/reorder/wrap/unwrap/swap-tag) are deferred to a separate v3 spec. Reasons: (a) the user goals (generate / bring / compose / edit / sync / iterate) are served by P1–P4 + P6–P7 without structural editing in the property panel — composition happens via the library + paste flow + promote, and "edit" maps to literal-property mutations (className, attrs, text); (b) extending the offset-based AST writer to structural mutations is a rewrite, not an extension, and 3–4 days was wrong-budgeted; (c) we'd rather ship a tight v2 and revisit structural editing once we know which subset is actually load-bearing for users.

## UX details to specify during phase work

The spec is directional on UX; each phase's PR fills in the specifics. The implementer (and reviewer) must cover at minimum:

- **Token panel (P1+P2)** — loading, empty (no `tokens.css` yet, with create-CTA copy), mtime-conflict (with reload affordance), and write-error states. First-run behavior when `tokens.css` doesn't exist on disk.
- **HTML property panel (P4)** — mirror the existing `CanvasReactNodePropertyPanel` shell (idle / loading / ready / error / stale). Decide reuse-vs-clone in P4's first day; default is to extract the panel shell as a shared component.
- **Paste dialog (P6)** — entry point (toolbar button + library-panel "+ New from paste"), format picker (HTML / TSX radio), name-conflict resolution (rename prompt vs reject), success exit (close + focus the new canvas node), validation error path (malformed HTML, empty name).
- **Library panel kind distinction** — visual badge or section split for HTML vs TSX entries; empty state when registry is empty.
- **Promote-subtree affordance (P7)** — context menu inside iframe vs panel button when an element is selected. Decide in P7; default to a panel button to avoid iframe context-menu plumbing.
- **"Describe to generate" flow (cross-cutting AI iteration)** — entry point (existing copilot panel), in-progress state (the agent is writing code — the canvas shows a spinner on the placeholder node), success landing (panel auto-opens on the new node), error recovery (agent emits invalid HTML → surface in the placeholder with retry).

These are deferred from spec approval. They are **not deferred from each phase's PR** — every phase ships with its UX states defined and reviewed.

## Resolved decisions

| # | Question | Decision |
|---|---|---|
| 1 | Tokens for design-system-foundation | **Project-level `tokens.css`** in v2; `designTokens.ts` kept in sync via derive-on-write. Multi-layer cascade (canvas/component overrides) deferred until user-story emerges. |
| 2 | HTML parser | **parse5** — W3C-compliant, best round-trip fidelity. |
| 3 | CSS scope for components | **Co-located** `Button.html` + `Button.css`. |
| 4 | Registry schema | **Single `registry.json`** with `kind: "html" \| "tsx"` field; backwards-compat existing `filePath`/`importName`. |
| 5 | Structural edits in v2 | **Cut from v2** — deferred to a v3 spec. v2 ships literal-property mutations only. |
| 6 | Iframe drag affordance | **Defer**, separate spec when it's the next priority. |
| 7 | Track strategy long-term | **HTML primary + TSX secondary; both first-class peers.** Accept ~30% dual-writer overhead on every structural feature. No sunset planned for either track. |
| 8 | Web-native premise framing | **Forecast bet**, not current-pain bet. The primacy claim is a forward-looking architectural commitment based on expected future projects; existing TSX projects ship without regression. |

## Deferred / Open Questions

### From 2026-05-05 review

Items raised during the document review that are deferred to implementation phases or future spec iterations:

- **parse5 round-trip fidelity** — The "best round-trip fidelity" claim is unverified for real-world HTML inputs (attribute quoting/case, whitespace between elements, void-element rewriting, entity normalization, mixed CRLF/LF). P3's first day should run a fidelity spike against 5–10 real HTML files showing minimal byte diffs after no-op edit cycles. If fidelity is unacceptable, evaluate domhandler+dom-serializer or a custom token-preserving walker.
- **Agent MCP auth boundary** — "Local-first" needs to translate to a concrete decision: dev server binds to `localhost` only (not `0.0.0.0`); document this as a hard constraint. Consider a same-origin or shared-secret check on all file-mutation endpoints. Decision required during P1 (first endpoint that mutates files).
- **Agent superset risk** — MCP tools accept paths the UI cannot produce (e.g., writing outside `components/`). At P8 audit, define an explicit allowlist of paths/operations at the MCP layer with the UI's affordances as the upper bound.
- **canvasId rebase strategy** — Deferred along with structural edits (cut from v2). When v3 introduces structural mutations, each writer must return a `canvasIdMap: { oldId: newId | null }` so the property panel can rewrite its active selection in place.
- **HTML property panel reuse evaluation** — In P4, evaluate whether the existing `CanvasReactNodePropertyPanel` shell (stale banner, error banner, write state, refresh) can be reused via a pluggable reader/writer strategy before committing to a separate component. Default: extract the shell as a shared component.
- **iframe multiplicity broadcast model** — Multiple HTML iframes per canvas all need their own `tokens.css` `<link>` and re-load on token write. P1's parent-side broadcast over the U2 bridge handles this — verify it during P1 implementation; document the message shape.
- **P9 remote-repo threat model** — Before P9 is planned, add: URL scheme allowlist (https:// only), no submodule recursion, `.repos/` is read-only source material (never auto-executed), registry.json from remote repos validated against the same schema with `importPath` sandboxed to the cloned subtree.
- **Phase ordering independence** — Document explicitly that P3+P4 can ship before P1 (HTML editing doesn't depend on tokens). When `tokens.css` doesn't exist for a project, the canvas operates without errors; the token panel shows the empty-state CTA.
- **Cut-paste across parents** — Deferred along with structural edits (cut from v2). Revisit as part of the v3 structural-edits spec.

## References

- Origin (React-TSX) spec: `docs/specs/2026-04-27-canvas-figma-like-editing.md`
- Origin plan: `docs/plans/2026-04-28-001-feat-canvas-figma-like-editing-plan.md`
- Existing `vars.css` example: `demo-thicket/vars.css` (autogenerated from `theme.css`)
- Existing tokens TSX: `projects/design-system-foundation/designTokens.ts`
- Click bridge protocol shipped in U2: `utils/canvasReactNodeBridge.ts`
- AST writer shipped in U4: `utils/canvasAstWriter.ts` + `vite/api/canvasAstWrite.ts`
