# Folder-backed canvases: autosave everything, never fail silently

**Date:** 2026-07-08 · **Status:** shipped 2026-07-10 — FOX2-71 (PR #30), FOX2-69 (PR #33), FOX2-70 (PR #32) · **Follows:** FOX2-40 (autosave loop), the document-asset feature (PR-merged), FOX2-64 (harness for the e2e)

## Problem

A canvas is meant to be "a folder with all its assets inside," autosaving every
user action. Today it isn't guaranteed:

1. **Work can be un-folder-backed.** With a project selected but no `.canvas`
   file open ("Unsaved canvas / browser draft"), the document lives only in
   `localStorage` (`gallery-<project>-state`). Nothing on disk, nothing prompts
   you to materialize it. (`useCanvasFilePersistence.ts:288-296` — autosave
   only runs when `activeCanvasFile !== null`.)
2. **Assets silently land in the wrong place.** On a draft, a pasted image is
   written to the shared `.canvas-media/` store instead of the canvas's
   `.assets/`, with **no user signal** on success
   (`useCanvasAddHandlers.ts:458-459, 469, 495-501`). You believe the screenshot
   is with your canvas; it isn't.
3. **Save failures are effectively swallowed.** The autosave `catch` only
   `console.warn`s (`useCanvasFilePersistence.ts:323-329`); the only surface is
   a generic shared error banner that also covers load/delete, flickers on the
   ~900 ms auto-retry, and there is **no distinct "save failed" state** — the
   badge still reads "Autosave pending." (`CanvasSidebar.tsx:1254-1276`.)

## Constraints

- **FOX2-40 lesson:** endless equal-interval retry is a bug. Any retry must be
  bounded with backoff and must stop into a visible failed state.
- **The store seam exists** (FOX2-66 `applyChange`), and assets are already
  stored eagerly on paste to `.assets/` when a file is open — so the fix is
  about *guaranteeing a file exists* and *surfacing failure*, not new storage.
- **No new backend concepts** — reuse the existing create/save/asset endpoints.

## The three decisions

**D1 — A canvas is always folder-backed (kill the silent draft).**
Materialize a real `.canvas` file so `activeCanvasFilePath` is effectively
always set once the user is working. Options for *when*:

- **(a) Eager on project select** — creating/opening a project with zero files
  immediately writes `Untitled.canvas`. Simplest guarantee, but litters empty
  files for projects you only browse.
- **(b) Lazy on first change (chosen)** — the moment the user makes the first
  mutation on an unsaved board (add/paste/move/edit), materialize the file
  *before* that change persists, then autosave as normal. No empty files;
  still guarantees folder-backing before any asset or action is stored.
- **(c) Keep drafts, block asset paste until saved** — least disruptive, but
  keeps the un-folder-backed state alive and pushes friction onto the user.

Chosen: **(b)**. Auto-name `Untitled` / `Untitled 2` … (no modal); rename any
time. The "Browser draft" label is replaced by a transient "Creating file…"
then the real filename.

**D2 — Remove the silent fallback; assets always go to `.assets/`.**
With D1, `canStoreInCanvasDocument` is effectively always true, so pasted assets
land in the canvas's `.assets/`. The `storeLocalMediaFile` shared-store path is
kept **only** as an explicit, surfaced fallback when the document store errors —
never the silent default. The success path gains no noise; the *fallback* path
gains a clear toast ("Saved to shared media store, not this canvas — <reason>").

**D3 — "Can't save" is a loud, distinct, persistent state.**
Add a real `save-failed` status distinct from pending/saving:

- A persistent badge + banner ("Couldn't save — changes are only in this
  browser") with a **Retry** action, cleared on the next successful save.
- Bounded auto-retry: a few attempts with exponential backoff, then stop into
  the failed state (no endless 900 ms hammering).
- The asset store gets the same treatment: a store failure on paste surfaces a
  persistent "asset not saved" signal, not just a one-shot `alert`.

**D4 — Agent parity (addendum, approved 2026-07-10).**
Agents are first-class writers, so the guarantees above apply to them too:

- **Materialization is source-agnostic.** A mutation arriving through the
  `CanvasDocumentStore.applyChange` seam (FOX2-66) with `source: agent` on an
  unsaved draft triggers the same D1b materialize-before-persist as a user
  action. An agent adding nodes to a fresh project must never produce
  un-folder-backed work.
- **Failures are visible to agents.** The `save-failed` state (D3) and the
  explicit shared-store fallback (D2) emit on the observability event feed
  (extends FOX2-49 canvas-file lifecycle events: `save-failed`,
  `save-recovered`, `asset-fallback`). An agent polling the cursor feed can
  detect that its changes are not persisted and react, matching what the user
  sees in the badge.

## Scope

- Auto-materialize (D1b), remove silent asset fallback (D2), save-failure state
  + bounded retry + asset-failure surfacing (D3), agent parity — source-agnostic
  materialization + failure events on the agent feed (D4).
- Tests: unit for the materialize trigger and the save-failed state machine; an
  **e2e** (FOX2-64 harness) that opens a project canvas, pastes an image, and
  asserts a file appears under `projects/<id>/canvases/.assets/…` and the doc
  references it — plus a forced-failure test asserting the failed state shows.
- Docs: update ARCHITECTURE.md persistence section.

## Non-goals

- Cloud sync, multi-user, versioned history of file operations.
- Changing the asset-on-disk layout or the endpoints.
- Undo of file create/delete.

## Resolved questions (approved 2026-07-10)

1. **D1 trigger** — lazy-on-first-change (b), for user *and* agent mutations.
2. **Auto-name** — silent `Untitled` / `Untitled 2`; rename any time, no modal.
3. **Retry** — bounded auto-retry with exponential backoff, then a persistent
   failed state with manual Retry.
4. **Agent parity** — in scope (D4): source-agnostic materialization + failure
   events on the agent feed.
