# Canvas Files Storage + Navigation Design

## Why this exists

The current Canvas persistence model is still browser-first:

- drafts/state live in `localStorage`
- saved scenes live in IndexedDB through `useCanvasScenes`
- export/import is a manual JSON round-trip

That works for local scene snapshots, but it is the wrong long-term shape for:

- project-owned canvas documents
- agent read/write workflows
- sharing canvas work through the repo
- handling 100+ canvas files without loading everything into browser memory

This document defines the next storage/navigation model.

## Current state review

Today we have:

- `hooks/useCanvasScenes.ts`
  - stores `CanvasScene[]` in IndexedDB with `localStorage` fallback
  - treats scenes as browser-owned records
- `components/canvas/CanvasScenesPanel.tsx`
  - save/load/rename/delete/duplicate/export/import for scenes
  - exports `*.scene.json`
- `types/canvas.ts`
  - `CanvasScene = { id, name, items, groups, createdAt, thumbnail? }`

This is good for local snapshots and templates.

It is not good enough for:

- repo-backed canvas files
- versioned canvas documents
- browsing many files across projects
- agent-native `list/open/save/create` flows

## Decision summary

We should have two layers, not one:

1. `*.canvas` files as the canonical document format
2. browser drafts/cache as a fast local working layer

That means:

- `IndexedDB` is not the source of truth for real canvases
- `localStorage` is not the source of truth for real canvases
- files in the project are the source of truth
- browser storage remains useful for:
  - unsaved draft state
  - thumbnails
  - recent files
  - open-tab restore
  - temporary agent/session caches

## File extension

Use `.canvas` for canonical files.

Reasons:

- we already have a real `.canvas` artifact in the repo: `icon-libraries.canvas`
- the extension is easy to scan, recognize, and group in project navigation
- it matches the mental model of "this is a canvas document", not "just a JSON export"

Important nuance:

- the extension should be `.canvas`
- the file content should be explicit and versioned
- we should not rely on extension alone to imply schema

## Canonical document model

Use a versioned JSON envelope.

```json
{
  "kind": "gallery-poc.canvas",
  "schemaVersion": 1,
  "surface": "canvas",
  "meta": {
    "id": "canvas_01H...",
    "title": "Checkout Flow Exploration",
    "slug": "checkout-flow-exploration",
    "projectId": "demo",
    "createdAt": "2026-04-05T12:00:00.000Z",
    "updatedAt": "2026-04-05T12:00:00.000Z",
    "tags": ["flow", "wireframe"],
    "favorite": false,
    "archived": false
  },
  "document": {
    "items": [],
    "groups": [],
    "nextZIndex": 1,
    "selectedIds": []
  },
  "view": {
    "transform": {
      "scale": 1,
      "offset": { "x": 0, "y": 0 }
    }
  }
}
```

## Surface model

We should not overload one file with every app surface immediately.

Recommended first shape:

- `surface: "canvas"` for freeform workspace documents
- later:
  - `surface: "color-audit"`
  - `surface: "system-canvas"`

That keeps the first file-backed implementation small and lets us reuse the same file infrastructure for other surfaces later.

## Where files live

Recommended project layout:

```text
projects/<project-id>/
  project.json
  canvases/
    checkout-flow-exploration.canvas
    onboarding/
      empty-state-ideas.canvas
    tokens/
      brand-system.canvas
```

This fits the current project-pack structure in `projects/*`.

## Source of truth vs cache

### Source of truth

- files on disk under `projects/<project-id>/canvases/**/*.canvas`

### Local cache

- IndexedDB
  - thumbnails
  - recent file list
  - unsaved draft patches
  - restored open tabs
- `localStorage`
  - last-opened project/file ids
  - panel visibility
  - lightweight UI preferences

### Save model

- open file -> read `.canvas` from disk
- edit in browser -> mark dirty
- autosave -> write back to disk
- if write fails -> keep dirty draft in IndexedDB until resolved

## Handling 100+ canvas files

We should design for 100 files as normal, not exceptional.

The key rule:

- never load full file contents for the whole project list

Instead:

1. scan file paths and metadata only
2. build a lightweight manifest/index
3. load full document content only when a file is opened

### Index shape

We need a lightweight index entry per file:

```ts
interface CanvasFileIndexEntry {
  id: string
  projectId: string
  path: string
  title: string
  surface: "canvas" | "color-audit" | "system-canvas"
  updatedAt: string
  createdAt: string
  tags: string[]
  favorite: boolean
  archived: boolean
  itemCount: number
  groupCount: number
  thumbnailKey?: string
}
```

### How to produce the index

Best first version:

- scan `projects/<project-id>/canvases/**/*.canvas`
- parse only the metadata envelope for each file
- cache the resulting index in memory on the dev server

Later optimization:

- write a generated `.canvas-index.json` cache per project
- invalidate on create/rename/delete/save

## Navigation design

We need a file-oriented navigation model, not the current "Scenes panel" model.

### Left sidebar structure

For each project:

- `Canvases`
  - `New canvas`
  - `Search`
  - `Recent`
  - `Favorites`
  - `All files`
  - folder tree
  - optional tags

### Main list behavior

For 100+ files:

- virtualized file list
- sort by:
  - updated
  - created
  - title
  - favorites first
- filter by:
  - surface
  - folder
  - tags
  - archived

### File item row

Each row should show:

- title
- surface badge
- relative folder
- updated timestamp
- item count
- favorite pin
- dirty/locked/agent-active status when relevant

### Opening model

Use tabbed/open-file behavior, not one transient scene slot.

- open file in current tab
- cmd/ctrl+click opens a second tab
- keep a small open-files strip
- restore recent open files from IndexedDB

## Scenes vs files

We should keep both concepts, but they must stop competing.

### Canvas files

- long-lived project documents
- stored on disk
- navigated from project sidebar
- agent-readable/writable

### Scenes

- lightweight reusable arrangements/templates
- local or exported/imported snippets
- applied into a file
- not the main project navigation model

That means the current `CanvasScenesPanel` should evolve into:

- `Templates` or `Snippets`

not:

- the primary document browser

## Agent-native implications

Once files are canonical, agents need file-level operations.

CLI + MCP should support:

- `list_canvas_files`
- `get_canvas_file_index`
- `open_canvas_file`
- `create_canvas_file`
- `save_canvas_file`
- `rename_canvas_file`
- `duplicate_canvas_file`
- `move_canvas_file`
- `archive_canvas_file`
- `delete_canvas_file`

This is better than asking the agent to reconstruct project navigation from browser-only scenes.

## Compatibility with existing `.canvas` files

We should support two levels:

1. app-native `.canvas`
2. import for simpler JSON canvas-like files when possible

Because we already have `icon-libraries.canvas`, we should avoid painting ourselves into a corner.

Practical approach:

- canonical app files use `kind: "gallery-poc.canvas"`
- if a `.canvas` file does not have `kind`, attempt best-effort import
- surface unknown or unsupported nodes as imported/static content rather than failing silently

## Migration plan

### Phase 1

- keep current browser scenes unchanged
- add file-backed canvas documents for `surface: "canvas"`
- add project `Canvases` navigation
- add file index and search

### Phase 2

- rename/reposition `Scenes` to `Templates`
- add `Save current file as template`
- add `Insert from template`

### Phase 3

- support file-backed `Color Audit`
- support file-backed `System Canvas`
- add file-level agent operations across all writable surfaces

## Recommended first implementation

Do this first:

1. add `CanvasFileDocument` and `CanvasFileIndexEntry` types
2. add a file scan endpoint for `projects/<id>/canvases/**/*.canvas`
3. add a `Canvases` sidebar section with search + recent + list
4. open/save one canonical `surface: "canvas"` file
5. keep current scenes as local templates only

Do not do this first:

- unify every surface into one file model immediately
- load all 100 files into browser state
- replace scenes before files are working

## Bottom line

The right shape is:

- `.canvas` files on disk as canonical documents
- project-scoped file navigation
- indexed metadata for large collections
- lazy content loading
- IndexedDB/localStorage only as cache/draft state
- scenes kept as templates, not as the main document model

This supports 100+ canvas files cleanly and gives us the right base for agent-native file operations.
