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

The substrate must be **web-native**: HTML elements + CSS classes + CSS custom properties. React TSX is supported but not the default — many primitives travel as plain HTML+CSS, and many real codebases live there.

What's shipped today (U1–U6 of the prior spec) is React-TSX-first. The infrastructure (click bridge, property panel UX, atomic write+mtime, registry parser, MCP tool pattern) is reusable, but the writers, the registry content, and the `data-canvas-id` injection are React-TSX-specific. The HTML inline mode exists but has no per-element editing.

## Constraints

- **Web-native first.** HTML+CSS as the lingua franca for primitives, tokens, and layout. React TSX = parallel track for stateful components.
- **One source of truth for tokens, per project.** A single `tokens.css` file per project holds CSS custom properties.
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

### Token model — three-layer CSS cascade

Tokens cascade through three real CSS layers, each in its own file:

1. **Project base** — `projects/<id>/tokens.css`. Top-level `:root { --token: value; }` declarations. Loaded by every canvas in the project.
2. **Canvas overrides** — sidecar `<canvasName>.tokens.css` next to `<canvasName>.canvas`, created on demand when a user adds a canvas-scoped override. Loaded only when that canvas is open. `:root` declarations override the project base via the cascade.
3. **Component scopes** — co-located component CSS files (`Button.css` next to `Button.html`). Selectors like `[data-component="button"] { --button-bg: var(--color-brand); }` define component-internal tokens that consume project/canvas vars.

The token panel reads/writes the right layer based on selection state:
- Nothing selected → project base
- A canvas is open with no element selected → canvas override file
- A component element is selected → that component's co-located CSS file

All three writers share the endpoint shape (`/api/canvas/tokens/write` with `layer: "project" | "canvas" | "component"` discriminator), mtime guard, atomic rename, and MCP tool wrapping.

Existing `designTokens.ts` in `projects/design-system-foundation/` is left alone. A new `tokens.css` is added next to it as the editable layer; the TS file remains as a legacy consumer surface and can be regenerated/deprecated later.

### Component editing model

- **Click → property panel** works for both `.html` and `.tsx` files.
- **HTML files**: Vite middleware injects `data-canvas-id` on each element at request time (parse5 walk). Property panel reads from the live iframe DOM (truth at click time). Writes go through an HTML writer that mutates the source file (parse5 round-trip).
- **TSX files**: existing pipeline (U1–U4) continues unchanged.
- **Dispatch by file extension** in the `/api/canvas/ast/write` endpoint.

### Composition model

- **Library panel** lists registry primitives — both `.html` and `.tsx` entries.
- **Click to instantiate** drops a new canvas node referencing the primitive.
- **Drag-drop into existing element** adds a child to the dropped-on element (Phase 5).
- **Promote selection to component** extracts a subtree (HTML fragment OR JSX subtree) into a new file under `components/` and rewrites the original to reference it (Phase 6).

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

- HTML/CSS authoring pipeline (`data-canvas-id`, click bridge, property panel, writer, MCP tools).
- `tokens.css` as project-level token source-of-truth, with full CRUD + agent parity.
- Library panel listing both HTML and TSX primitives.
- Paste-as-new-component dialog.
- Structural edits via the property panel (insert/remove/reorder/wrap/unwrap/swap-tag).
- Promote subtree to component.
- MCP audit + documentation.

### Deferred / non-goals

- Remote repo plug-in (cached `.repos/`). Architecture leaves space; not built in v2.
- Multiplayer / presence / comments.
- Prototyping links / click-through flows.
- Full `tokens.css` migration of `design-system-foundation` (existing TSX project keeps `designTokens.ts`).
- Visual drag-handles / resize handles in the iframe (Figma-style transform tooling). The property panel is the primary edit surface; iframe drag is Phase 7+.
- Auto-layout intent inference (no "make this a flex column" heuristics — users edit className).
- Computed-style introspection beyond declared values.

### Tracks-and-phases

| Phase | Slice | Days | Acceptance |
|---|---|---|---|
| **P1** | **Color tokens via three-layer `tokens.css`** | 2 | Panel reads project + canvas-override + component layers; edits write to the right layer with mtime guard; HMR re-renders; `update_design_token` MCP tool with `layer` arg |
| **P2** | **Typography + spacing tokens via `tokens.css`** | 1 | Same panel handles font-family/size/spacing tokens; same writer (one CSS file) |
| **P3** | **HTML element-id injection + click bridge** | 2 | Click any element in an `.html` canvas node → property panel opens with tag/attrs/classes |
| **P4** | **HTML property panel + writer (literal mutations)** | 2–3 | Edit attrs/classList/textContent → save to `.html` file; mtime guard; MCP tool |
| **P5** | **Structural edits (HTML + TSX)** | 3–4 | Insert child, remove, reorder siblings, wrap, unwrap, swap-tag — same panel buttons drive both writers |
| **P6** | **Paste-as-new-component dialog** | 1 | Modal accepts HTML/CSS/TSX → writes file → instantiates node |
| **P7** | **Promote subtree to component (U7)** | 2 | Right-click → "Promote" → new file + parent rewrite |
| **P8** | **MCP audit + agent workflow docs** | 1 | Every UI action has agent equivalent; `CANVAS_AGENT_MCP_COMMANDS.md` updated |
| **P9** *(optional)* | **Remote-repo plug-in** | 3–5 | Add a git URL → clone into `.repos/` → registry merged into project view |

**Total core (P1–P8):** ~13–17 days.

## Resolved decisions

| # | Question | Decision |
|---|---|---|
| 1 | Tokens for design-system-foundation | **Three-layer cascade**: project `tokens.css` + sidecar `<canvas>.tokens.css` + co-located component CSS. `designTokens.ts` left alone as legacy consumer. |
| 2 | HTML parser | **parse5** — W3C-compliant, best round-trip fidelity. |
| 3 | CSS scope for components | **Co-located** `Button.html` + `Button.css`. |
| 4 | Registry schema | **Single `registry.json`** with `kind: "html" \| "tsx"` field; backwards-compat existing `filePath`/`importName`. |
| 5 | Cut-paste across parents | **Defer** to P5.5 (after P5 ships the 80% case). |
| 6 | Iframe drag affordance | **Defer**, separate spec when it's the next priority. |

## References

- Origin (React-TSX) spec: `docs/specs/2026-04-27-canvas-figma-like-editing.md`
- Origin plan: `docs/plans/2026-04-28-001-feat-canvas-figma-like-editing-plan.md`
- Existing `vars.css` example: `demo-thicket/vars.css` (autogenerated from `theme.css`)
- Existing tokens TSX: `projects/design-system-foundation/designTokens.ts`
- Click bridge protocol shipped in U2: `utils/canvasReactNodeBridge.ts`
- AST writer shipped in U4: `utils/canvasAstWriter.ts` + `vite/api/canvasAstWrite.ts`
