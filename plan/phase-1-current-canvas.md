# Phase 1 — Current Canvas Evaluation (TODO)

## Objective
Add interactive embeds + Interact mode so we can validate whether the existing canvas meets the "productive + effective" bar.

## TODO
- [x] Add `type` to canvas items (component | embed) with embed metadata (url, title, allow, sandbox).
- [x] Add Interact mode toggle in the canvas toolbar (Edit vs Interact).
- [x] Disable canvas drag/selection/pan when Interact mode is on.
- [x] Enable pointer events for item content when Interact mode is on.
- [x] Add embed creation UI (URL input + Add button) in the canvas sidebar.
- [x] Render embed items as interactive iframes on the canvas.
- [x] Update scene load/save to preserve embed items.
- [x] Fix renderer renderMode mismatch (use `canvas`, remove `raw`).
- [x] Add basic embed properties panel (edit URL).
- [ ] Smoke test: iframe + WebGL demo in canvas.

## Out of Scope (Phase 1)
- Multi-user collaboration
- Full Figma-style constraints/autolayout
- Code generation from primitives
