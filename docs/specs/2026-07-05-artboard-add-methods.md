# Every way to add nodes into an artboard

**Date:** 2026-07-05 · **Issue:** FOX2-59 · **Status:** approved-in-principle (user: "we need all options"); picker-menu layout pending user input

## Problem

Composing inside an artboard has grown piecemeal: drag from the library
(FOX2-58), drag a freeform item in (FOX2-58), agent `move_items_into_artboard`.
Users expect the full set of native editor gestures — copy/paste, duplicate
in place, and a menu-driven add — to all target the artboard too.

## The shared primitive

All methods reduce to **insert item(s) into artboard A at the end of its flow**:
`parentId = A.id`, `order = maxSiblingOrder + n`, `position = {0,0}`,
`rotation = 0`. This already exists inline in the FOX2-58 drop/re-parent paths;
it's extracted to a `insertItemsIntoArtboard` state helper so every method
shares one code path (and one place to keep agent parity).

## Methods

1. **Duplicate in place** (`Cmd+D`, context-menu Duplicate) — cloning an
   artboard child keeps it in the same artboard right after the original,
   instead of the current +20px offset on open canvas. Freeform items keep the
   offset. Smallest change; fixes a papercut.
2. **Copy / paste** (`Cmd+C` / `Cmd+V`) — internal clipboard of selected
   node(s). Paste targets the selected artboard (or the artboard containing the
   current selection); with no artboard context, paste to open canvas near the
   originals. Raw-HTML/text clipboard paste → new html node (later slice).
3. **Library click → selected artboard** — clicking a library primitive/
   component currently always creates freeform. When an artboard is selected,
   insert into it instead. Makes the existing click path artboard-aware; no new
   UI.
4. **Artboard add menu** (deferred — needs layout input) — a `+` affordance on
   the selected artboard and/or a context-menu "Add here…" opening a picker
   (components, project-native HTML, markdown, mermaid, media). Biggest UI
   surface; split out so 1–3 ship first.

## Non-goals (this issue)

- OS-file paste beyond the existing media path.
- Cross-document copy/paste (clipboard is in-memory, per session).
- The picker-menu visual design (method 4) until the user weighs in.
