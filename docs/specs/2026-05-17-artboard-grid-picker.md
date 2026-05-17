---
title: "Web-native canvas authoring, continuous code, sync to a picked project folder"
type: spec
status: ready-for-approval
date: 2026-05-17
origin: live canvas review session (user request)
---

# Problem

The user wants to compose pages and sections on an artboard from web-native
parts (template plus grid plus fillable slots), where editing on the canvas is
editing real code, and a single Sync action publishes that code into a real
project used in their apps. The same capabilities must exist for agents.

# Core principle

Files on disk are the single source of truth from creation onward. The canvas
renders from and writes to those files continuously. Agents use the same files
and the same write path. One user action, Sync, cleans the code and publishes
it to the target project.

# Resolved decisions

## Flow and UX (Q-FLOW)

A native component is written as a real file at creation, auto-slugged under the
active `projects/<id>/components/`. Every canvas and agent edit round-trips to
that file through the existing `ast/load` and `ast/write` path. It is always
code.

There is no separate "Save as component" step. A single Sync button is the
combined persist-and-publish action. States: `Sync`, then `Re-sync` after the
first sync, then a transient `Synced` confirmation.

## Canonical format

Web-native HTML and CSS is canonical. TSX is a deterministic generated artifact
(one-way HTML to JSX, `class` to `className`, CSS to module import),
regenerated on Sync. Bidirectional HTML and TSX editing is out of scope. The
component panel has an output target control, `HTML` or `HTML + TSX`. When
detection finds a React project, the panel suggests `HTML + TSX`.

## Primitives (Q-B), basic v1 set

Layout primitives: Stack, Row/Cluster, Grid, Split/Sidebar, Center, Cover,
Frame. Element parts: containers (`div`, `section`, `header`, `footer`,
`figure`), text (`h1` to `h6`, `p`, `span`, `ul`, `ol`, `li`), `a`, `button`,
`img`, `svg`, `video`. Switcher, Inline, table, and iframe are deferred. Named
templates are pre-composed primitives with `data-slot` regions.

## Sync target (Q-TARGET), pick a project folder and detect components dir

The v1 target is a user-picked project folder, an external application
directory, not an internal `projects/<id>/` picker. On pick, the system detects
the components folder by probing common conventions in order:
`src/components`, `app/components`, `components`, `src/ui`, `lib/components`,
plus a light framework check (`package.json` or tsconfig, React suggests TSX).
If the result is ambiguous or absent, the user picks the subfolder. The folder
to components mapping is persisted per project so re-sync is one click. This
reuses the existing directory-pick and scan plumbing (`showDirectoryPicker`,
the HTML-bundle "Choose folder" and Scan code).

## Re-sync semantics (Q-RESYNC)

Re-sync overwrites in place, keyed by slug. Iteration and version history are
handled by the target project's version control. Sync always writes the current
canvas truth. No conflict detection in v1.

## Clean output

On Sync, `data-slot*` and canvas-only attributes are stripped, producing
idiomatic native HTML, CSS, and optional TSX. No minification, so the output
stays readable and app-usable. The working source keeps the metadata for
round-trip and agent legibility.

# The Sync action

Available when a component or an artboard is selected.

A selected component upserts its `.html` (plus `.css`, plus `.tsx` if enabled)
into the detected components directory of the picked project. A selected
artboard upserts the page (artboard composition with inline-embedded children)
plus every child component. The write is idempotent by slug, runs the
clean-export pass first, writes a small manifest entry the app can import from,
and returns the written paths.

# Approach

1. Create equals file-backed. Native component creation immediately writes a
   real file with an auto slug and binds the canvas item to it. No inline-only
   phase, no Save button.
2. Artboard "Structure" section in `CanvasArtboardPropsPanel`: grid picker
   (Flex/Grid, Columns 1 to 5, gap) with a structural preview thumbnail, and a
   basic template picker (primitive compositions with slots) that lays a
   file-backed slotted shell as an artboard child.
3. Slot fill uses the existing per-slot picker (insert a primitive or a saved
   component). Machinery unchanged.
4. Output target control, `HTML` or `HTML + TSX`, suggested by detection.
5. Sync resolves or recalls the project folder, detects the components dir,
   runs clean-export, performs the idempotent upsert, writes the manifest. One
   button with `Sync`, `Re-sync`, `Synced` states.
6. Agent parity: `create_native_component_shell` extended with template, grid,
   and slots and file-backed; `sync_to_project({ target, selection })` doing
   the same resolve, detect, clean-export, and upsert.

# Feasibility notes

External-folder writes need a dedicated, path-validated server endpoint such as
`/api/canvas/project/sync`, sandboxed to the chosen root, rejecting path
traversal, with explicit allow of the picked directory. This is the main new
infrastructure beyond reuse. Components-dir detection is heuristic, so the
resolved path is always shown and the user can override before the first write.
The rest reuses shipped pieces: native-composition builders, slot fill, the
`ast` round-trip, directory-pick and scan, registry and manifest.

# Scope (v1)

File-backed-on-create, removing the inline-then-Save step, single Sync button
with states. "Structure" section with grid picker, preview, and basic
templates. Basic primitive and element builders extending
`buildNativeComponentShell`. Deterministic HTML to TSX generator on Sync.
Clean-export pass. Project-folder picker with components-dir detection and a
persisted mapping. Path-safe external sync endpoint, idempotent upsert,
manifest. MCP: extended `create_native_component_shell` and a new
`sync_to_project`.

# Non-goals (v1)

Internal `projects/<id>/` sync target. Bidirectional HTML and TSX.
Component-reference page embedding (inline only). Conflict detection or merge on
re-sync. Switcher, Inline, table, iframe. Multi-page and routing. Template
authoring UI. CSS minification.

# Status

All raised questions are resolved. Awaiting the explicit go to move to
`ce-plan`, per the design gate. On approval: commit this spec, then plan.
