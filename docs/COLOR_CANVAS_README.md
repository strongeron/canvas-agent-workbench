# Color Canvas README

`Color Canvas` is the app surface for building and testing color systems and generated design-system scales inside the same workspace.

Use it when you want to:
- audit semantic color relationships
- derive relative OKLCH colors from a base token
- generate a full scale system from fonts, spacing, icons, and layout inputs
- preview the resulting primitives directly on the canvas

## Fast Test Path

If you only want the shortest path to useful coverage, do this:

1. Run `npm install` and `npm run dev`, then open `http://localhost:5173`.
2. Open `Color Canvas`.
3. Switch to `System Canvas`.
4. Click `Generate scale + preview nodes`.
5. Check the `Required nodes` card in the left rail.
6. Switch between `Colors`, `Type`, `Layout`, `Primitives`, and `Standards`.
7. Drag and resize a few nodes, then click `Fit width`.
8. Switch back to `Color Audit` and create a `Relative Token`.

If those steps work, the main feature surface is functioning.

## App Surfaces

The app currently exposes these main tabs:

| Surface | Purpose |
| --- | --- |
| `Gallery` | Browse registered components and variants |
| `Canvas` | Compose component boards manually |
| `Color Canvas` | Build token graphs and generate design-system preview graphs |
| `Picker Lab` | Focused color picking and color-format exploration |

This document focuses on `Color Canvas`.

## Color Canvas Modes

`Color Canvas` has two top-level modes.

| Mode | What it is for |
| --- | --- |
| `Color Audit` | Token graph, semantic role mapping, contrast checks, and relative color authoring |
| `System Canvas` | Generated design-system graph driven by Utopia, Capsize, icon settings, and preview nodes |

## Node Model

The canvas uses a small set of node ideas.

| Node kind | What it represents |
| --- | --- |
| `token` | A raw theme token or generated color seed |
| `relative` | A color derived from a base node in OKLCH |
| `semantic` | A UI role such as text, surface, border, icon, or accent |
| `component` | A simple consumer/example node in audit workflows |
| `system-support` | Generated support nodes that explain or carry rules in `System Canvas` |
| `system-preview` | Generated preview nodes that render type, icon, layout, primitive, or standards output |

## Color Audit Workflow

`Color Audit` is the manual authoring mode.

What you can do:
- add token nodes
- add relative OKLCH nodes
- map tokens and relative nodes to semantic roles
- create manual contrast edges
- let auto-contrast rules generate semantic checks
- apply canvas token values to the active theme
- save the canvas result as a new theme

Useful node groups here:
- token nodes
- relative nodes
- semantic role nodes such as `Text / Foreground`, `Surface / Base`, `Border / Default`, `Accent / Primary`, `Icon / Default`

For the detailed relative-color workflow, see [RELATIVE_COLOR_CANVAS.md](./RELATIVE_COLOR_CANVAS.md).

## System Canvas Workflow

`System Canvas` is the generated mode.

You configure the scale engine in the left rail, then click `Generate scale + preview nodes`.

That action does two things at once:
- applies the generated scale variables to the active theme
- regenerates and rewires the System Canvas graph

`Apply scale vars` is the lighter-weight action. Use it when you want to re-apply the current generated vars to the active theme without rebuilding the node graph.

Primary inputs:
- preset
- min/max viewport
- base unit
- density
- base min/base max
- ratio min/ratio max
- sans font
- display font
- body weight
- display weight
- icon library
- icon stroke

After generation, the graph is arranged left to right in logical lanes.

### Lane Order

1. `Colors`
2. `Type + Icons`
3. `Layouts`
4. `Primitives`
5. `Standards`

### Generated Nodes

`Colors`
- `Color / Brand Seed`
- `Color Rule / Brand Darker`
- `Color Rule / Surface`
- `Color Rule / Text`
- `Color Rule / Border`
- `Color / Inverse`
- semantic support roles such as `Text / Foreground`, `Surface / Base`, `Border / Default`, `Accent / Primary`, `Icon / Default`
- `Explain / Color Roles`

`Type + Icons`
- `Font / Sans Metrics`
- `Font / Display Metrics`
- `Type / Base Scale`
- `Type / Display Scale`
- `Icon / Stroke Pair`
- `Icon / Library`
- `Icon / Action Scale`
- `Explain / Capsize`
- `Explain / Utopia`
- `Explain / Icon Pairing`

`Layouts`
- `Layout / Stack Flow`
- `Layout / Feature Grid`
- `Layout / Hero Split`
- `Explain / Layout Response`

`Primitives`
- `Primitive / Text`
- `Primitive / Heading`
- `Primitive / Button`
- `Primitive / Surface`
- `Explain / Primitive Contract`

`Standards`
- `Token Standard / DTCG`
- `Radix / Theme Bridge`
- `Explain / Export Bridge`

## Connector Meanings

System Canvas connectors are labeled to explain why nodes connect.

| Connector label | Meaning |
| --- | --- |
| `Seed rules` | Brand seed becomes derived color rules |
| `Surface role`, `Text role`, `Border role`, `Accent role`, `Icon role` | Derived color rules become semantic UI roles |
| `Metrics` | Font metrics feed Capsize logic |
| `Trim + leading` | Capsize outputs line-height and trim decisions |
| `Clamp formula` | Utopia clamp math drives fluid scale steps |
| `Body pair` | Body text scale informs icon pairing |
| `Scale inputs` | Font definitions feed Utopia scale generation |
| `Stroke rule` | Icon stroke is derived from current pair/weight settings |
| `Library` | Active icon library populates icon previews |
| `Scale tiers` | Icon scale steps are generated |
| `Responsive recipe` | Layout recipes are built from the current scale system |
| `Type rhythm`, `Icon rhythm` | Layouts consume type and icon scales |
| `Compose` | Layout recipes feed primitive composition logic |
| `Token contract` | Primitives consume generated tokens directly |
| `Inverse text` | Inverse color tokens affect contrast-sensitive controls |
| `Alias export`, `Adapter bridge`, `Example consumer` | Standards nodes show export and adapter relationships |

## Views And Navigation

`System Canvas` exposes these views:

| View | What it isolates |
| --- | --- |
| `System` | The full generated left-to-right graph |
| `Colors` | Seed, rule, and semantic-role nodes |
| `Type` | Font, Utopia, Capsize, and icon-system nodes |
| `Layout` | Responsive layout recipe nodes |
| `Primitives` | Rendered primitive previews |
| `Standards` | DTCG and Radix bridge nodes |
| `All` | Mixed debug view |

After generation, the canvas returns to the full `System` view so you can read the whole left-to-right graph before drilling into individual views.

Navigation and layout controls:
- `Zoom out`, `Zoom in`, zoom reset percentage
- `Bird view`
- `Auto arrange`
- `Fit width`
- jump buttons for `Colors`, `Type + Icons`, `Layouts`, `Primitives`, `Standards`
- drag nodes
- resize nodes

Current resize rule:
- manual node move/resize persists across view switches
- only explicit `Fit width` resets preview sizes and flow layout

## What Users Can Inspect

You can use the generated graph to inspect:
- how a brand seed becomes semantic UI colors
- how Capsize turns font metrics into line-height and trim behavior
- how Utopia produces fluid font, icon, and spacing scales
- how icon stroke and icon container size track font weight and text rhythm
- how layouts respond across viewport checkpoints
- how primitives consume generated CSS variables
- how token aliases bridge into DTCG-style output and Radix variables

## Testing Scenarios

Use these scenarios to validate the current feature set.

1. Default generation
   Open `Color Canvas` → switch to `System Canvas` → click `Generate scale + preview nodes` → confirm all required-node counters are complete.

2. Preset switching
   Apply `Balanced UI`, `Dense App`, `Editorial`, and `Campaign`, regenerate each time, and compare type size, layout density, and icon rhythm.

3. Font weight and icon pairing
   Change `Body weight`, `Display weight`, and `Icon stroke`, regenerate, then inspect `Icon / Stroke Pair` and `Icon / Action Scale`.

4. Icon library swap
   Change `Icon library` between `Lucide` and `Canvas Symbols`, regenerate, and inspect `Icon / Library`, `Icon / Action Scale`, and layout previews.

5. Type scale inspection
   Open `Type` view and inspect `Font / Sans Metrics`, `Font / Display Metrics`, `Type / Base Scale`, and `Type / Display Scale`.

6. Layout response
   Open `Layout` view and inspect `Layout / Stack Flow`, `Layout / Feature Grid`, and `Layout / Hero Split` for min/mid/max viewport behavior.

7. Primitive consumption
   Open `Primitives` view and confirm `Primitive / Text`, `Primitive / Heading`, `Primitive / Button`, and `Primitive / Surface` reflect the current scale inputs.

8. Standards output
   Open `Standards` view and inspect `Token Standard / DTCG` and `Radix / Theme Bridge`.

9. Canvas interaction
   Drag and resize several nodes, switch views, and confirm the manual placement persists. Then click `Fit width` and confirm the visible graph resets into the flow layout.

10. Theme application
   Change one or two scale inputs, click `Apply scale vars`, then confirm the active theme updates without needing to regenerate the graph.

11. Color audit handoff
   Switch back to `Color Audit`, create or inspect token and semantic mappings, then return to `System Canvas` to compare the generated system view.

## Current Capability Changelog

This is the current state of the canvas feature set.

- `Color Canvas` now has separate `Color Audit` and `System Canvas` modes.
- `System Canvas` uses a left-to-right flow layout instead of mixing all nodes into one dense graph.
- Generated nodes include explainer nodes for color logic, Capsize, Utopia, icon pairing, layout response, primitive contract, and standards export.
- Connectors carry labeled meanings instead of generic `Map` badges only.
- Preview nodes render actual web-native examples for type, icons, layouts, primitives, and standards output.
- Icon-library switching and icon-stroke controls are part of the scale engine.
- Node drag, resize, zoom, bird view, auto arrange, and fit-width controls are available in `System Canvas`.
- Focused tests now cover System Canvas generation, preset application, view switching, zoom, drag, resize persistence, fit-width reset, scale generation, and CopilotKit middleware behavior.

## Current Boundaries

These are not fully implemented yet:
- arbitrary graph-authored primitive generation from any custom node network
- a dedicated production export flow from canvas to React source files
- browser-level e2e coverage beyond the current smoke/manual workflows
