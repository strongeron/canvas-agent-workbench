# Relative Colors In Color Canvas

This guide describes the current implementation in `Color Canvas` and how to use it to build a color system with relative color nodes.

## What Relative Nodes Do

A `relative` node computes a new color from a base node in OKLCH:

- Base: selected in inspector (`Base node`)
- Channels: `L`, `C`, `H`, `Alpha`
- Per-channel mode:
  - `inherit`: keep base channel
  - `delta`: add/subtract from base channel
  - `absolute`: set explicit channel value

Output is recomputed live in canvas preview.

## Build A System From Clean Canvas

1. Create a clean session:
   - `Sessions` -> `New` (or `Clear`).
2. Add a base token:
   - `Custom Token`
   - Set `CSS Variable` (example: `--color-brand-500`)
   - Set `Value Override` (example: `oklch(0.7 0.26 148.7)`).
3. Add relative tokens:
   - `Relative Token`
   - In inspector set `Base node` to your base token
   - Set channel modes/values for each step (300/400/600/etc.).
4. Optional semantic mapping:
   - Add semantic node (example: `Text Primary`, `Surface Base`)
   - Use `Connect mode: Token -> Role` to map token/relative node -> semantic node.
5. Contrast audit:
   - Keep `Auto contrast` on
   - Set node `Role` (`text`, `surface`, `icon`, etc.) so rules can generate contrast checks
   - Inspect APCA values in `Inspect` and `Audit`.
6. Apply/save theme:
   - `Apply to Theme` writes current canvas token values/expressions to active theme
   - `Save theme from canvas` creates a new theme entry for easy swapping in demos.

## Connect Modes: What Happens

### `Token -> Role` (map)

- Creates a `map` edge.
- Used to connect token/relative nodes to semantic nodes.
- Does not change color math by itself.
- Helps with traceability and role-based workflows.

### `Contrast`

- Creates manual `contrast` edges.
- APCA is computed for both directions in inspector.
- Rule target (`Required Lc`) is shown with pass/fail status.

### `Dependencies` (relative base links)

- Dashed dependency lines are derived from `relative.baseId`.
- This is not a connect mode edge.
- Relative calculation uses this base relationship.

## Relative Connector Rules: Current Status

Current behavior:

- Relative color generation is driven by:
  - selected `Base node`
  - channel modes/values (`inherit` / `delta` / `absolute`)
- Roles do not generate colors. Roles drive contrast rules only.
- There is no edge-based "relative rule connector" yet (for example, drawing an edge to define L/C/H transforms).

Practical implication:

- Use inspector to define relative transforms.
- Use edges for mapping and contrast/audit, not for relative formula creation.

## APCA + Relative Nodes

APCA logic includes relative nodes:

- Relative nodes are resolved to actual computed colors first.
- APCA checks run on resolved foreground/background colors.
- Inspector shows both:
  - `Actual (Fg->Bg)`
  - `Actual (Bg->Fg)`
- `Required Lc` comes from rule target.

## P3 / Wide Gamut

- Node preview can show `P3` badge when the resolved color is out of sRGB gamut.
- `sRGB` label is intentionally not shown.
- Relative computations remain OKLCH-first; preview output can use `display-p3` when needed.

## Notes On Chroma Input

- OKLCH `C` is unitless (commonly `0..0.4`).
- In canvas input:
  - values `<= 1` are treated as direct chroma
  - values `> 1` are treated as percentages (example: `8` -> `0.08`)

