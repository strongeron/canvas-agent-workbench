# Theme + Color Canvas Roadmap

This document records the phases and steps for a project-wired Color Canvas that supports OKLCH-first token relationships, APCA-integrated constraints, and automated theme recalculation.

## Goals
- Support multiple themes in canvas workflows and per-artboard overrides.
- Provide a dedicated color canvas with connections between palette tokens, semantic roles, and component roles.
- Integrate APCA into every contrast relationship (foreground/background) with visible Lc levels.
- Enable deterministic recomputation when any input token changes.

## Phase 0 (Done): Fix Theme Color Drift
- Align token names in `designTokens.ts` with `theme.css` + Tailwind semantics.
- Remove/avoid token entries that point at non-existent CSS variables.
- Keep legacy text tokens documented but prefer semantic `--color-foreground` / `--color-muted-*`.

## Phase 1 (In Progress): Project-Wired Color Canvas
### Tasks
- Add Color Canvas to the demo header menu (`demo/App.tsx`) alongside Gallery/Canvas.
- Wire Color Canvas to the current project context:
  - project-scoped theme storage key
  - project-scoped token list (fallback to thicket tokens if missing)
- Expose Color Canvas from theme panel and token panels.
- Ensure OKLCH is the default model in documentation and planned rule engine.

### Review Checklist
- Color Canvas appears in the demo header menu.
- Switching projects changes the token list and theme storage namespace.
- Color Canvas and Canvas share the same theme registry prefix.
- No regressions in existing Gallery/Canvas modes.

## Phase 2 (Done): Token Graph + Constraint Engine
### Tasks
- Define graph schema (nodes, edges, rule metadata).
- Add OKLCH default model flag + APCA target Lc per contrast edge.
- Implement APCA constraint evaluation for foreground/background pairs.
- Add audit panel stub (list of APCA results for contrast pairs).

### Review Checklist
- Rules metadata is inspectable on edges.
- APCA evaluation is enforced for each contrast relation with target Lc.
- Audit panel surfaces pass/fail status for contrast pairs.

## Phase 3 (Done): Artboard Audit
### Tasks
- Artboard audit panel: collect token/semantic pairs and show APCA Lc values.
- DOM scan of rendered artboards (phase 3b) for real color usage.
- Export graph state as JSON, optionally SVG snapshots.

### Review Checklist
- Audit panel is accurate for selected artboard(s).
- APCA warnings are visible and actionable.

## Phase 4 (Later): Export
### Tasks
- Export graph state as JSON.
- Optional SVG snapshot export.

### Review Checklist
- Export includes rules + node positions + theme overrides.

## Head of Design Validation
Use this framework at each phase checkpoint:
- Clarity: Can a designer explain and edit relationships?
- Control: Can they set inputs and override derived tokens?
- Correctness: Are APCA constraints enforced and visible?
- Scalability: Can it handle 200+ tokens + multi-theme?
- Usefulness: Does it reduce time to iterate safely?

## Decisions
- Color Canvas is a dedicated view (also linked from Tokens and Theme panel).
- OKLCH is the default color model for rule definitions.
- APCA is required for every foreground/background relation.
- Contrast thresholds should show all steps from Lc 15 to max.
