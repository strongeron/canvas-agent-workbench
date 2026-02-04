# Theme + Color Canvas Roadmap

This document records the phases and steps for multi-theme support, a color canvas with token connections, and APCA contrast checks.

## Goals
- Support multiple themes in canvas workflows.
- Provide a dedicated color canvas with connections between palette tokens and semantic roles/styles.
- Surface APCA contrast levels for text and UI states.

## Phase 0 (Now): Fix Theme Color Drift
- Align token names in `designTokens.ts` with `theme.css` + Tailwind semantics.
- Remove/avoid token entries that point at non-existent CSS variables.
- Keep legacy text tokens documented but prefer semantic `--color-foreground` / `--color-muted-*`.

## Phase 1 (Now): Theme Panel + Dedicated Color Canvas View
- Add a Theme panel toggle in the Canvas toolbar.
- Theme panel includes:
  - Theme selector with add-new flow.
  - "Open Color Canvas" action (navigates to dedicated view).
  - APCA level legend (15 → max).
- Allow per-artboard theme overrides (inherit by default).
- Dedicated Color Canvas view:
  - Separate view mode (not the main canvas tab).
  - Accessible from Tokens panel via link.
  - Uses its own canvas storage key.
- Persist theme selection and theme list in localStorage.

## Phase 2 (Next): Color Canvas Graph + APCA
- Add a color graph model:
  - Nodes: palette tokens, semantic roles, component style roles.
  - Edges: "role uses token" and "component uses role".
- Render a graph/canvas view with draggable nodes and connections.
- Add APCA computations for relevant pairs (text on surface, interactive states).
- Provide thresholds/labels for all steps (Lc 15 → max).

## Phase 3 (Later): Multi-Theme Tokens + Exports
- Load theme CSS per theme and compute tokens for each theme.
- Export/share color canvas as JSON/SVG.

## Decisions
- Color Canvas is a dedicated view (also linked from Tokens).
- APCA thresholds should show all steps from Lc 15 to max.
