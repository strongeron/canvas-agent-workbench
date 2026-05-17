---
title: "feat: Canvas native composition mode (artboards, HTML groups, slots, agent parity)"
type: feat
status: draft
date: 2026-05-16
origin: user request in live canvas review session
---

# Overview

Add a **native composition mode** for the canvas where a user can:

1. Create an artboard.
2. Create a new component on the artboard.
3. Compose that component from **HTML-native groups and elements** (`div`, `section`, `h1`, `p`, `img`, `svg`, `video`).
4. Define **named slots** such as `title`, `body`, `media`, `actions`, `icon`, `badge`.
5. Save the result as a real source-backed component under `projects/<projectId>/components/`.
6. Re-open and iterate on it manually or through the MCP/agent surface with the same mutation path.

This plan does **not** introduce a second component model. It builds on the existing
source-backed HTML node pipeline (`CanvasHtmlFrame` + `canvasHtmlEditor` +
`/api/canvas/ast/write`) and treats composed components as authored HTML
source with metadata, not as opaque canvas-only state.

## Implementation status

- `P1 in progress`: native source-backed component shell creation is now the first shipped slice.
- `Implemented in this slice`:
  - toolbar action and template chooser to add a native HTML component shell on canvas,
  - optional starter title in the chooser so the initial heading/item title can be set at creation time,
  - authored slot metadata in starter HTML shells (`data-slot`, `data-slot-kind`, `data-slot-accepts`),
  - detected slot summaries plus inline “insert starter” actions in the HTML inspector for native shells,
  - visual insert controls for native child HTML parts inside non-text slots (`div`, `section`, `header`, `footer`, `h2`, `p`, `button`, `a`, `img`, `svg`, `video`),
  - explicit MCP parity for that shell-building step via `insert_native_slot_part`,
  - source-aware insertion for `image`, `video`, and `link` parts so manual or agent-driven composition can provide a real URL instead of only a placeholder,
  - inspector-level `Save as component` flow that writes the current inline shell into `projects/<projectId>/components/` and attaches the saved file metadata back onto the live canvas item,
  - automatic library refresh after shell save so the new registry primitive becomes available without a manual panel reload,
  - first-class slot metadata editing in the inspector for `data-slot`, `data-slot-kind`, and `data-slot-accepts`,
  - HTML primitives instantiated from the library now carry `sourceHtmlFilePath` and `mtime` so reused native components stay file-backed and source-editable,
  - URL-backed media slot insertion can now retarget an existing matching `img`, `video`, or `a` child instead of always appending a duplicate node,
  - saved / promoted HTML components now persist extracted slot metadata into `registry.json`, keeping the slot contract visible to the library and agent surfaces,
  - the library panel now surfaces slot hints from registry metadata so saved native components advertise their slot contract directly in the picker,
  - file-backed inline HTML now shows its source-of-truth path in the inspector so saved native shells clearly indicate that edits write through to disk,
  - MCP tool parity via `create_native_component_shell`.
- `Still pending`:
  - richer media slot replacement / asset-browser affordances beyond URL-based insertion.

---

# Problem

Today the canvas has three partially-overlapping composition stories:

1. **Artboards** support board-level flex/grid layout and grouping.
2. **Component items** are lightweight registry instances with props editing only.
3. **Source-backed HTML/TSX nodes** are the only nodes that support real
   element-level editing and source round-trip.

That is enough for:

- placing reusable components on a board,
- editing source-backed HTML/TSX,
- creating new components from pasted HTML/TSX,
- promoting an HTML subtree to a reusable primitive.

It is **not** enough for the desired authoring loop:

- start from a blank artboard,
- create a component shell,
- insert grouped native elements,
- assign those elements semantic slot roles,
- use media slots for image / svg / video,
- compose a reusable card / hero / section visually,
- then continue iterating with the AI agent through the same source-backed path.

The current gap is not the writer. The gap is the lack of a **composer UX and
metadata model** that sits between raw HTML editing and registry-instantiated
component items.

---

# Current reusable foundation

The existing codebase already has most of the hard infrastructure:

- `CanvasArtboardItem` / `CanvasArtboardPropsPanel` for board-level flex/grid layout.
- `CanvasHtmlFrame` for rendering source-backed HTML and React preview nodes.
- `canvasHtmlEditor` for HTML element reads/writes and structural mutations.
- `/api/canvas/component/create` for writing new `.html` / `.css` / `.tsx` component files.
- `/api/canvas/component/promote` for extracting an HTML subtree into a reusable component.
- MCP tools for `create_component_from_html`, `create_component_from_tsx`,
  `promote_to_component`, `read_html_node`, `update_html_node`,
  `apply_structural_mutation`, and group/item/artboard operations.

This plan deliberately reuses those surfaces instead of inventing a new canvas
document format for authored components.

---

# Goal

Make the following workflow first-class:

1. User creates an artboard.
2. User chooses **New native component**.
3. Canvas creates a source-backed HTML node with an authored root such as:

```html
<section data-component="hero-card" data-slot-root="true">
  <div data-slot="media"></div>
  <div data-slot="content">
    <h2 data-slot="title">Title</h2>
    <p data-slot="body">Body copy</p>
  </div>
</section>
```

4. User inserts or wraps children using native HTML groups/elements.
5. User marks one or more elements with slot roles (`title`, `body`, `media`, `icon`, `actions`, `caption`, etc.).
6. User can assign media slot subtype (`image`, `svg`, `video`) and edit its source fields.
7. User saves or promotes the authored result as a reusable component.
8. Agent can inspect and mutate the same component through MCP without any private UI-only state.

---

# Non-goals

- No custom visual block language or abstract IR.
- No slot system for opaque `type: "component"` canvas items in v1 of this work.
- No full design-tool auto-layout semantics beyond existing flex/grid HTML and artboard layout.
- No requirement to solve cross-file TSX slot extraction in the first phase.
- No replacement of existing registry component items; this is an additional native-authoring path.

---

# Key decision

## Chosen: source-backed HTML composition as the primary authoring substrate

Authored components in this flow are represented as:

- a `type: "html"` canvas item,
- `sourceMode: "inline"` while composing,
- optionally file-backed once saved,
- HTML annotated with lightweight slot metadata attributes,
- optional co-located CSS.

This is better than introducing a new canvas-only "component graph" because:

- the HTML writer and bridge already exist,
- the agent can work against real source immediately,
- promote/create flows already write real files,
- slot metadata can live in HTML attributes and registry metadata,
- media elements are already native HTML concepts (`img`, `svg`, `video`).

TSX stays supported, but the **composition-first** flow should be HTML-native.

---

# Authoring model

## 1. Artboard

Artboards remain the board/container level:

- flex or grid layout,
- spacing, padding, alignment,
- grouping of multiple items,
- high-level page composition.

## 2. Native component root

A new action creates a source-backed HTML component shell inside the artboard.
That shell is just a source-backed HTML item with a generated root tag and starter source.

Example starter templates:

- `Card`
- `Hero`
- `Media Object`
- `Feature Grid`
- `Section`
- `Blank`

## 3. Element groups

Inside the component, authoring works with **native elements**, not opaque child items:

- structural groups: `div`, `section`, `header`, `footer`, `figure`
- text elements: `h1`–`h6`, `p`, `span`
- action elements: `button`, `a`
- media elements: `img`, `svg`, `video`

Composition actions should map directly to existing structural mutations:

- insert child,
- wrap selection,
- unwrap,
- reorder sibling,
- swap tag,
- remove node.

## 4. Slot metadata

Slots are represented with authored attributes, not a parallel model:

- `data-slot="title"`
- `data-slot="body"`
- `data-slot="media"`
- `data-slot="actions"`
- `data-slot="icon"`
- `data-slot-kind="image|svg|video|text|container"`
- `data-slot-accepts="image,svg,video"`

This keeps the system:

- human-readable,
- source-controlled,
- compatible with the HTML writer,
- visible to agents through source reads.

## 5. Registry metadata

When a composed component is saved, its `registry.json` entry should include
optional slot metadata:

```json
{
  "id": "primitive/hero-card",
  "displayName": "HeroCard",
  "kind": "html",
  "filePath": "components/HeroCard.html",
  "cssPath": "components/HeroCard.css",
  "componentSlug": "hero-card",
  "slots": [
    { "name": "media", "kind": "image", "required": false },
    { "name": "title", "kind": "text", "required": true },
    { "name": "body", "kind": "text", "required": false },
    { "name": "actions", "kind": "container", "required": false }
  ]
}
```

The source of truth remains the HTML file. Registry slot metadata exists so the
library, agent, and future instantiate-into-slot flows can reason about it.

---

# Agent-native requirements

Every manual action in this mode must have an MCP-equivalent path.

## Existing MCP surfaces we can reuse

- `create_artboard`
- `update_artboard_layout`
- `create_component_from_html`
- `promote_to_component`
- `read_html_node`
- `update_html_node`
- `apply_structural_mutation`
- `create_group`, `update_group`, `delete_group`

## New MCP tools required

### `create_native_component_shell`

Creates a source-backed HTML canvas item using a starter template and optional
root tag, title, and initial slots.

### `set_slot_metadata`

Writes `data-slot`, `data-slot-kind`, and related attributes on a selected
element through the existing HTML write path.

### `list_component_slots`

Reads authored slot metadata from a file-backed or inline HTML component and
returns normalized slot descriptors.

### `insert_slot_content`

Creates or rewrites canonical children for a named slot, reusing structural
mutation helpers where possible.

### `save_composed_component`

Persists the in-progress source-backed HTML composition into
`projects/<projectId>/components/`, writes/updates registry metadata, and
optionally replaces the inline shell with the saved file-backed node.

The core rule is: **agents never need a private canvas-only composer API**.
They should be able to create, inspect, and refine the component through the
same authored HTML and registry metadata the UI uses.

---

# Delivery phases

## P1. Native component shell creation

Ship a new UI action:

- `Add native component`
- choose starter template or blank
- create a source-backed `html` item on the current artboard

Implementation:

- add starter-template builders,
- create inline `sourceHtml`,
- select the new source-backed item,
- open the HTML/source-backed editing panel.

Acceptance:

- user can create a blank or templated native component on an artboard,
- result is editable through the existing HTML source-backed path,
- agent can do the same through `create_native_component_shell`.

## P2. Slot metadata authoring

Ship slot assignment in the HTML node panel:

- mark selected element as slot,
- choose slot name,
- choose slot kind,
- clear or rename slot.

Implementation:

- panel UI on top of `CanvasReactNodePropertyPanel` in HTML mode,
- metadata stored as HTML attributes,
- MCP tool `set_slot_metadata`.

Acceptance:

- selected elements can be tagged as `title`, `body`, `media`, etc.,
- tags round-trip through source,
- agent can read and write slot metadata.

## P3. Media slot support

Ship media-aware slot helpers for:

- image,
- svg,
- video.

Implementation:

- slot presets create canonical child tags,
- `img` supports `src`, `alt`,
- `video` supports `src`, `poster`, controls/autoplay flags,
- inline `svg` is supported as real source markup or placeholder slot content.

Acceptance:

- user can add an image/svg/video slot region,
- source remains authored HTML,
- agent can inspect and update those elements with existing HTML node tools.

## P4. Save composed component

Persist an in-progress native composition into project components.

Implementation:

- `save_composed_component` endpoint/tool,
- writes `.html` and optional `.css`,
- stores slot metadata in registry,
- converts inline composition to file-backed source item.

Acceptance:

- authored component becomes reusable in the library,
- reopening it preserves slot metadata,
- agent can create and save components end-to-end.

## P5. Library instantiation into slot-aware components

Improve reuse:

- instantiate composed HTML components from the library,
- optionally target known slots when inserting into another composed component.

Acceptance:

- native composed components behave like first-class library entries,
- slot descriptors are visible in library and MCP metadata,
- future insert-into-slot flows have a clean contract.

---

# Risks

## Risk: slot metadata drifts from real markup

Mitigation:

- source HTML remains canonical,
- slot metadata is stored on elements themselves,
- registry slot metadata is derived from source when saving.

## Risk: too many new concepts in the panel

Mitigation:

- start with one small slot section in HTML mode only,
- avoid exposing slot UI for plain `component` items in the first phase.

## Risk: component items and native components remain confusing

Mitigation:

- explicitly label the new path as `Native component`,
- show “Props-only component” vs “Source-backed native component” in UI copy,
- prefer native component creation for authored composition.

## Risk: media composition becomes a second asset pipeline

Mitigation:

- in v1, media slots are just authored HTML elements,
- asset management stays on existing image/video source paths.

---

# Recommended first implementation slice

The first slice should be **P1 only**:

- add `Add native component`,
- create blank/card/hero starter shells as source-backed HTML items,
- auto-place inside the selected artboard,
- open the HTML editing path immediately,
- add one MCP tool: `create_native_component_shell`.

That is the smallest slice that proves the workflow direction without inventing
slot semantics and save flows all at once.

---

# Acceptance summary

This plan is successful when the answer to the original workflow question is
unambiguously “yes”:

- create an artboard,
- create a native component inside it,
- compose it from grouped HTML elements,
- mark text/media regions as slots,
- use flex/grid layout,
- save it as a reusable component,
- continue iterating manually or through the AI agent,
- and every meaningful action maps to MCP-backed source edits.
