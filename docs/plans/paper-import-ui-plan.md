# Paper Import UI Plan

## Goals
- Let users choose import kind (`ui` vs `page`) before importing from Paper.
- Show a lightweight import queue for recently imported Paper nodes.
- Persist queue locally so it survives reloads.

## TODOs
- [x] Add import kind toggle in Canvas toolbar and artboard panel.
- [x] Pass selected kind through `onImportFromPaper` and server API.
- [x] Persist import queue in localStorage and render in Canvas sidebar.
- [x] Add "Add to canvas" action for queued items.
- [x] Update documentation if needed.
