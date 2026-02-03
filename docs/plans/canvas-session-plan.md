# Canvas Persistence + Layout Roadmap

This document records the agreed phases and TODOs for canvas persistence and layout evolution.

## Goals
- Save canvas sessions locally as JSON (scenes).
- Persist iframe state when embeds opt into a postMessage protocol.
- Keep freeform canvas intact while enabling future layout-driven artboards.

## Phase 1 (Now): Persistence + Iframe State Bridge
- Extend `CanvasEmbedItem` to store:
  - `embedState?: unknown`
  - `embedOrigin?: string`
  - `embedStateVersion?: number`
- Add iframe state bridge:
  - Parent sends `postMessage({ type: "getState", version })`
  - Iframe replies `postMessage({ type: "state", payload, version })`
  - Parent stores payload in `embedState`
  - On load, parent sends `postMessage({ type: "setState", payload, version })`
- Use localStorage for drafts (already in place).
- Ensure scene JSON exports include embed state (items already serialized).
- Add a manual “Sync state” action in embed props panel.
- Trigger a state refresh before saving a scene (best-effort).

## Phase 2 (Next): IndexedDB Storage
- Add IndexedDB for canonical scene storage.
- Schema (versioned):
  - `{ version, items, groups, transform, embeds, updatedAt }`
- Maintain export/import JSON for portability.

## Phase 3 (Later): Layout / Artboards
- Introduce `CanvasArtboardItem` with `layout` (flex/grid) and optional breakpoints.
- Allow components to be children of artboards via `parentId` and `order`.
- Add a Layers/Stack panel grouped by artboard.
- Map layout/page components as artboard templates (optional).

## TODO Checklist
- [x] Extend `types/canvas.ts` for iframe state
- [x] Add iframe postMessage bridge in `CanvasEmbedItem`
- [x] Add “Sync State” in `CanvasEmbedPropsPanel`
- [x] Request iframe state before `saveScene`
- [x] Verify scene export includes embed state
- [x] Add IndexedDB storage (Phase 2)
- [x] Add artboards + layers panel (Phase 3)

## Phase 3 Plan (Implementation Order)
1. Add `CanvasArtboardItem` type and layout metadata in `types/canvas.ts`.
2. Extend canvas state to support parent/child relationships:
   - `parentId` on items
   - `order` for layout ordering
3. Render artboards in `CanvasWorkspace` with a layout container:
   - `display: flex` or `grid`
   - children rendered inside, ignoring absolute position.
4. Enable drop-to-artboard behavior:
   - DnD targets for artboards
   - Assign `parentId` + `order`
5. Add Layers panel grouped by artboard:
   - Reorder items within artboard (updates `order`)
   - Select/highlight items
6. Optional: layout/page component -> artboard template mapping.
