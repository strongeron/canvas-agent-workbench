# Canvas Agent MCP Commands

This file is the real MCP reference for this repo's local stdio server:

- [bin/canvas-mcp-server](/Users/strongeron/Evil%20Martians/Open%20Source/gallery-poc/bin/canvas-mcp-server)

It reflects the current checked-in server surface on May 14, 2026.

## Use This With Claude or Codex

Recommended launch flow:

```bash
npm run agent:claude
```

or

```bash
npm run agent:codex
```

Those commands:

1. start the app if needed
2. attach the live workspace session
3. launch the agent with the local MCP server wired in

Related files:

- [CANVAS_AGENT_MCP_SETUP.md](/Users/strongeron/Evil%20Martians/Open%20Source/gallery-poc/docs/CANVAS_AGENT_MCP_SETUP.md)
- [CANVAS_AGENT_STORED_FILE_SMOKE_TESTS.md](/Users/strongeron/Evil%20Martians/Open%20Source/gallery-poc/docs/CANVAS_AGENT_STORED_FILE_SMOKE_TESTS.md)
- [run-claude-canvas.sh](/Users/strongeron/Evil%20Martians/Open%20Source/gallery-poc/scripts/run-claude-canvas.sh)
- [run-codex-canvas.sh](/Users/strongeron/Evil%20Martians/Open%20Source/gallery-poc/scripts/run-codex-canvas.sh)

## Global MCP Tools

These work across surfaces:

- `get_workspace_manifest`
  Returns the global workspace/runtime manifest.
- `get_surface_manifest`
  Returns the manifest for one surface: `canvas`, `color-audit`, `system-canvas`, `node-catalog`.
- `get_workspace_events { workspaceId, sinceCursor?, limit? }`
  Returns the append-only event log for one surface, cursor-paged as
  `{ events, nextCursor }`. Pass `sinceCursor` to fetch only events newer than a
  prior read. See [Observing what the human does](#observing-what-the-human-does).
- `get_workspace_debug`
  Returns replay/debug info for one surface.
- `capture_workspace_screenshot`
  Captures an app-owned screenshot for `canvas`, `color-audit`, `system-canvas`, or `node-catalog`.

## Project File Library Tools

These are the stored `.canvas` document tools. They work against the local project file library, not only the currently open live surface.

- `list_canvas_files`
  Lists stored `.canvas` documents for the current project, optionally filtered by `surface`.
- `open_canvas_file`
  Opens one stored `.canvas` document by project-relative path.
- `create_canvas_file`
  Creates a new stored `.canvas` document.
- `save_canvas_file`
  Saves a stored `.canvas` document and packs local media into document-local assets when provided.
- `update_canvas_file_metadata`
  Updates title, tags, favorite, or archived state.
- `move_canvas_file`
  Renames or moves a stored `.canvas` document and rewrites document-local asset URLs to the new path.
- `duplicate_canvas_file`
  Duplicates a stored `.canvas` document with a fresh identity and copied local assets.
- `delete_canvas_file`
  Deletes a stored `.canvas` document and its local asset bundle.
- `scan_html_bundles`
  Scans a local HTML source root and returns bundle directories plus available HTML entry files before import.
- `import_html_bundle`
  Packs a local HTML/CSS/JS bundle into a stored `.canvas` document and can optionally create a live `html` node from it.
  When `targetItemId` is provided, it replaces an existing live HTML node in place instead of creating a second node.
  Replace mode also removes the previous bundled asset directory for that node so stored files do not accumulate stale HTML bundles forever.

Use these when you want the agent to manage the file library itself:

- list project files before opening one
- open a stored file, inspect it, then save changes back
- rename or reorganize files into folders
- duplicate a board before experimenting
- delete obsolete boards cleanly

## Canvas Tools

- `get_canvas_context`
- `get_canvas_state`
- `get_canvas_selection`
- `get_canvas_themes`
- `list_design_tokens`
- `update_design_token`
- `read_html_node`
- `update_html_node`
- `apply_structural_mutation`
- `insert_native_slot_part`
- `update_markdown_block`
- `cycle_component_variant`
- `update_artboard_layout`
- `update_media_crop`
- `update_mermaid_label`
- `create_component_from_html`
- `create_component_from_tsx`
- `promote_to_component`
- `list_primitives`
- `get_primitive`
- `create_artboard`
- `create_native_component_shell`
- `register_mcp_app`
- `list_mcp_app_tools`
- `invoke_mcp_app_tool`
- `get_mcp_app_log`
- `disconnect_mcp_app`
- `sync_to_project`
- `create_primitive_item`
- `create_item`
- `create_items`
- `create_group`
- `update_item`
- `update_group`
- `delete_items`
- `delete_group`
- `select_items`
- `set_canvas_viewport`

### MCP App Nodes

- `register_mcp_app` creates a live `mcp-app` canvas node and connects it through the localhost-guarded proxy. HTTP/SSE nodes can connect directly; stdio nodes require the command to be built-in or user-allowlisted first.
- `list_mcp_app_tools` reads the cached tool palette for a connected node.
- `invoke_mcp_app_tool` calls one embedded MCP tool and returns the synchronous result. The proxy enforces recursion depth and redacts secret-like args in the log.
- `get_mcp_app_log` returns recent redacted tool calls for one node.
- `disconnect_mcp_app` closes the transport and marks the node disconnected.
- `focus_canvas_items`
- `capture_canvas_items_screenshot`
- `clear_canvas`
- `export_board`
- `duplicate_items`
- `move_items_into_artboard`
- `wrap_items_in_section`
- `update_section_sizing`
- `reorder_layer`
- `set_canvas_active_theme`
- `create_canvas_theme`
- `update_canvas_theme_var`
- `delete_canvas_theme`
- `convert_mermaid_to_excalidraw`
- `capture_embed_snapshot`
- `check_embed_frame_policy`
- `set_canvas_tool`
- `undo_source_mutation`
- `redo_source_mutation`
- `undo_canvas_change`
- `redo_canvas_change`

What this surface supports:

- read current board
- inspect selection
- inspect available canvas themes and current resolved theme tokens
- list and update project-level `tokens.css` custom properties with mtime guards
- read and mutate editable HTML nodes by `data-canvas-id`
- apply structural HTML / TSX mutations through the same AST write path the live canvas uses
- update markdown blocks and keep live markdown items in sync with file-backed or inline source
- cycle component variants through the same state path as keyboard variant switching
- patch artboard layout fields such as gap and padding through explicit MCP wrappers
- patch media trim/display fields such as clip start, clip end, and object-fit through an explicit MCP wrapper
- patch Mermaid node labels through a source-backed item rewrite
- create new source-backed HTML or TSX components from pasted/generated code
- create a starter native HTML composition shell with authored slot metadata
- inspect registered primitives and their metadata
- create/update/delete board items
- create several board items atomically in one queued operation
- create/update/delete item groups

Batch create note:

- prefer `create_items` over repeated `create_item` calls when the agent is laying out a cluster, row, stack, or multi-node starter board
- it produces one queued mutation and one state transition instead of N small ones
- move the live camera without mutating document contents
- focus a board region before screenshots or follow-up edits
- capture a screenshot cropped around specific rendered canvas items
- export primitive-only artboards as React

Web-native editing tools:

- `list_design_tokens` reads `projects/<projectId>/tokens.css`; missing files return an empty token list and `mtimeMs: null`.
- `update_design_token` sets one CSS custom property. Pass `mtimeMs` from `list_design_tokens` when the file already exists.
- `read_html_node` reads tag, attributes, classes, and text for a selected HTML element. Use `filePath` for file-backed components or `sourceHtml` for inline components.
- `update_html_node` accepts literal mutations like `setClassName`, `setAttribute`, and `setTextContent`. File-backed writes require the current `mtimeMs`.
- `apply_structural_mutation` is the explicit wrapper for structural mutations such as `insertChild`, `removeNode`, `reorderSibling`, `wrapSelection`, `unwrap`, and `swapTag`. It returns the same writer payload, including `canvasIdMap`, so agents can rebase ids across sequential mutations.
- `update_markdown_block` targets a live markdown item by `itemId`, calls the markdown writer, then enqueues an `update_item` so the canvas state stays aligned with the new markdown source and file `mtimeMs`. Actions: `update` (replace a block — `blockIndex` + `newText`), `insert` (splice a new block in at `blockIndex`; passing the current block count appends), `remove` (delete a block — `blockIndex`), `reorder` (move a block — `fromIndex` + `toIndex`).
- `cycle_component_variant` targets a live component item by `itemId`, clamps to the registered primitive variant count, and clears `customProps` the same way the canvas UI does when a variant changes.
- `update_artboard_layout` targets a live artboard by `itemId` and merges layout keys such as `gap`, `padding`, `direction`, `align`, `justify`, and `columns`.
- `update_media_crop` targets a live media item by `itemId` and patches crop/trim/display fields through the same queued canvas-state path as the media inspector and the on-canvas crop/clip handles. It covers the non-destructive image `crop` window (`{x,y,w,h}` fractions in `[0,1]`), `clipStartSec`, `clipEndSec`, `objectFit`, and the playback/display booleans. This is full parity with the U8 on-canvas handles — the handles and this tool write the same `crop` / clip fields.
- `update_mermaid_label` targets a live Mermaid item by `itemId`, patches one node label in source form, and updates the item through the normal canvas queue path. This is full parity with the U10 rendered-SVG inline label edit — the on-canvas editor and this tool both call the same `updateMermaidNodeLabel` source patcher.
- `create_component_from_html` and `create_component_from_tsx` write under `projects/<projectId>/components/`, append a matching `registry.json` entry, and create a preview node unless `createItem: false` is passed.
- `promote_to_component` extracts an HTML subtree (by `canvasId`) from a canvas item and saves it as a new project component. The original item is unchanged; the new primitive appears in the registry and library panel for re-use.
- `create_native_component_shell` is now **file-backed on create**. It builds markup from the single shared shell builder and writes a real component file under `projects/<projectId>/components/` through the same `/api/canvas/component/create` endpoint (and auto-slug uniquifier) the canvas UI uses, then places a live `html` item bound to that file — so an agent-created shell and a UI-created shell are byte-identical. `template` accepts a **named template** (`blank`, `card`, `section`, `hero`, `media-object`), a **layout primitive** (`stack`, `row`, `grid`, `split`, `center`, `cover`, `frame`), or an **element part** (`div`, `section`, `header`, `footer`, `figure`, `h1`–`h6`, `p`, `span`, `ul`, `ol`, `li`, `a`, `button`, `img`, `svg`, `video`). Optional `grid` and `slots` tune layout/slot metadata; optional `title`/`name` set the heading and component name. Pass `createItem: false` for a file write with no canvas node. Slot metadata such as `data-slot="title"` and `data-slot-accepts="image,svg,video"` is still authored into the markup so the inspector and `insert_native_slot_part` keep working.
- `sync_to_project` publishes a file-backed component (or an artboard page plus its file-backed children) into a user-confirmed external project folder, reusing the exact normalize → atomic-publish pipeline behind the UI Sync button (it does not reimplement sync). `selection` is a canvas item id: a file-backed `html` component item, or an artboard. `target` is the destination root and **must match a folder a user previously confirmed in the canvas Sync panel** — the user-confirmed mapping is persisted in `project.json` `meta.syncTarget` and is the allowlist; an agent **cannot** nominate an arbitrary new folder. Omit `target` to reuse the persisted mapping. `componentsDir` overrides directory detection (ambiguous detection with no override is an explicit error, never a guess); `format` is `html` or `html+tsx` (default: detect — React projects ⇒ `html+tsx`, else `html`). Response: `{ ok, writtenPaths[], notWritten[], manifestPath, perFile: [{ path, status }] }`, mirroring the UI Sync states. A non-allowlisted `target` is rejected with a distinct allowlist error (`not-allowlisted` / `no-mapping`), separate from the endpoint's traversal/symlink rejection.
- `insert_native_slot_part` inserts content into a slotted shell node by `canvasId` — now covering all three inspector affordances. Provide exactly one of: `part` (native HTML part — `div`, `section`, `header`, `footer`, `heading`, `paragraph`, `button`, `link`, `image`, `svg`, `video`; `image`/`video`/`link` take an optional `sourceUrl`), `componentId` (append a registered library primitive's snippet — the inspector's `Insert component`; no import is emitted, so the file must already import the component; optional `projectId` picks the registry), or `starter: true` (the inspector's slot-aware starter: text slots get label text via `setTextContent`, media-accepting slots get a placeholder SVG, containers get a labeled content div).
- `duplicate_items` mirrors the UI cmd-D duplicate. It resolves the selected ids in the current canvas state, clones each item with a fresh `canvas-item-<ts>-<i>-<rand>` id, applies an `offset` (default `{ dx: 20, dy: 20 }`), bumps `zIndex`, drops `groupId`, then ships the new batch through the `create_items` queued operation. Returns `{ newIds }` so the agent can chain follow-up edits without re-querying the state. `select: true` (default) also selects the duplicates.
- `move_items_into_artboard` re-parents items onto an artboard in one call — `{ ids, artboardId, select? }`. Mirrors the UI "move selection into artboard": each item gets `parentId`, an `order` appended after the artboard's current children, and `position`/`rotation` reset to zero because layout children render flow-positioned. Artboards themselves and items already inside the target are skipped; returns `{ movedIds }`. Replaces the old dance of `get_canvas_state` + N `update_item` calls with hand-computed `order`.
- `wrap_items_in_section` wraps items in a new section — `{ ids, section? }` with at least 2 ids. Mirrors the UI "wrap in section" and its two eligibility modes: items sharing one artboard/section parent (the section slots in at their minimum `order`), or all-freeform items whose centers sit inside exactly one artboard (the section appends after that artboard's children). The section defaults to a grid (≤3 columns, fill width / hug height); pass `section.name` / `section.layout` / `section.background` / `section.themeId` to override. Queues `create_item` before the re-parent batch so a dangling `parentId` never exists. Returns `{ sectionId, wrappedIds, mode, parentId }`.
- `update_section_sizing` sets a section's sizing behavior — `{ itemId, widthMode?, heightMode?, width?, height? }`. Mirrors the inspector's Section size controls: `"fill"` matches the parent's inner size (parent size minus 2× layout padding, floored at 120) and remembers the previous size in `layoutSizing.hugWidth`/`hugHeight` so `"hug"` restores it; an explicit `width`/`height` number sets that size in hug mode, like the panel's inputs. `fill` requires an artboard/section parent and cannot be combined with an explicit number on the same axis.
- `reorder_layer` reorders one item — `{ id, direction: "front" | "back" | "up" | "down" }`. `front` mirrors the UI bring-to-front (zIndex jumps above everything); `back` drops zIndex below the current minimum; `up`/`down` swap layout `order` with the adjacent sibling inside an artboard or section, exactly like the inspector's move-layer control. `up`/`down` on a freeform item is rejected with a hint to use `front`/`back` — no more hand-computed zIndex.
- `set_canvas_active_theme` is the paired write for `get_canvas_themes`. Pass `{ themeId }`; the same UI handler that powers the Theme panel's click-to-activate fires, so resolved token values on the board update immediately. Theme registry membership is not validated server-side — call `get_canvas_themes` first if you need to confirm the id.
- `create_canvas_theme` / `update_canvas_theme_var` / `delete_canvas_theme` are the in-canvas theming CRUD (separate from project `tokens.css`). `create_canvas_theme { label }` mirrors the Theme panel's "Add theme": the id is slugged from the label, the current resolved token values are snapshotted as the theme's vars, and it becomes active. `update_canvas_theme_var { themeId, cssVar, value }` mirrors the panel's token inputs — an empty `value` clears the override. `delete_canvas_theme { themeId }` removes a theme; the registry keeps at least one, and the active theme falls back to the first remaining. Theme ids are not validated server-side — read `get_canvas_themes` first if unsure.
- `convert_mermaid_to_excalidraw` promotes a mermaid item to an Excalidraw sketch — `{ itemId, keepOriginal? }`. Mirrors the UI convert action: the conversion itself runs in the browser (mermaid renders through the DOM, so there is no server-side `{ source } → { scene }` variant), the new excalidraw item appears offset from the source with `sourceMermaid` retained for remapping, and the original mermaid item is removed unless `keepOriginal: true`. Requires the live canvas to be open, like all queued operations.
- `capture_embed_snapshot` and `check_embed_frame_policy` mirror the embed inspector. Capture — `{ itemId, targets?, provider? }` (targets default `["desktop"]`, provider default `"auto"`) — queues the browser-side capture pipeline: ready captures land as media items below the embed and the embed's capture-status fields update. Frame policy — `{ itemId }` — resets `embedFrameStatus` to `"unknown"` so the live canvas re-probes the URL; read the item afterwards for the verdict. Both require the live canvas to be open.
- `set_canvas_tool` sets the active tool mode — `{ tool: "select" | "edit" | "interact" }`. Select owns item-level move/resize, Edit owns element-level editing inside html nodes (overlay handles, drop zones), Interact makes iframe content live. Same handler as the toolbar toggle; set the mode before `capture_canvas_items_screenshot` when the capture depends on interactive vs editable rendering.
- `undo_source_mutation` and `redo_source_mutation` are agent-side cmd-Z / cmd-shift-Z parity. The UI's in-memory mutation log (U5) holds the per-file snapshots; the MCP tool enqueues a `undo_source_mutation` / `redo_source_mutation` operation that the canvas bridge routes to the same `handleUndoMutation` / `handleRedoMutation` handlers the keyboard path uses, which re-apply the stored snapshot through the existing AST writer (or the markdown writer for `.md` files). `scope` defaults to `"active-file"`; pass `scope: "log-entry"` with `logEntryId` to target a specific entry once the UI surface exposes log ids.
- `undo_canvas_change` and `redo_canvas_change` are the unified-timeline aliases (FOX2-67). Document operations (add/delete/paste/move/resize/re-parent/group changes) and source edits share ONE history: these ops route to the same `handleUndoMutation` / `handleRedoMutation` handlers, so whichever entry is most recent is undone or redone — document entries restore their whole-document `{items, groups}` snapshot through the normal state path (selection ids that no longer exist are dropped), source entries replay exactly like the source ops above. Both take no arguments and require the live canvas to be open.

Direct-manipulation parity audit (v3, complete):

Every on-canvas direct-manipulation affordance an agent might need is reachable via an MCP tool — agents never have to drag:

- **U4a/U4b resize + structural drag** — the overlay resize drag and the library drop both emit ordinary literal/structural mutations. Agents reach the same outcomes via `update_html_node` (`setClassName`, and the U4a computed-class fallback's `setAttribute` on `style`) and `apply_structural_mutation` (`insertChild` / `wrapSelection`). No `drag` tool by design.
- **U8 media crop/clip** — `update_media_crop` (`crop`, `clipStartSec`, `clipEndSec`, …), full parity with the on-canvas handles.
- **U10 mermaid label** — `update_mermaid_label`, same source patcher as the rendered-SVG inline editor.
- **U12 group resize** — a multi-select group drag is N independent literal writes; an agent achieves the same by calling `update_html_node` once per `canvasId`. No group-specific tool needed.

Screenshot note:

- `capture_canvas_items_screenshot` crops the rendered board to the requested item ids when those nodes are visible; it falls back to the focused viewport capture path if direct crop bounds are unavailable
- it is not yet a DOM-cropped single-node export

Current writable entity types:

- artboards
- component items
- inline HTML/CSS/JS nodes
- React TSX preview nodes
- local HTML bundle nodes
- embeds
- media
- Mermaid diagrams
- Excalidraw sketches
- markdown notes

HTML bundle notes:

- this is for local HTML/CSS/JS bundles, not arbitrary remote websites
- the imported bundle is stored under the document-local `.assets` folder
- the live node renders in an iframe, so resize and interact mode work as expected
- inline HTML nodes can also be created directly with `create_item` by passing an `html` item with `sourceMode: "inline"` and `sourceHtml`
- `create_native_component_shell` is the preferred shortcut when the agent should start from a pre-authored HTML shell instead of building raw `sourceHtml` from scratch
- `insert_native_slot_part` is the preferred shortcut when the agent should append a starter HTML building block into a detected shell slot instead of hand-authoring an `insertChild` mutation
- React TSX nodes use the same `html` item type with `sourceMode: "react"`, `sourceReact`, and optional `sourceCss`; `sourceReact` must default-export a component
- if you have a large external library, scan it first and choose the exact folder + entry file to import
- if you are importing from the UI, save the board to a real `.canvas` file first
- agents can also author bundles inline by passing `bundle.files[].textContent` for HTML, CSS, or JS files instead of base64 payloads

## Color Audit Tools

- `get_color_audit_state`
- `get_color_audit_export_preview`
- `generate_template`
- `create_color_node`
- `update_color_node`
- `delete_color_node`
- `create_color_edge`
- `update_color_edge`
- `delete_color_edge`

What this surface supports:

- read graph state
- generate `Starter Ramp`, `shadcn/ui`, or `Radix`
- create/update/delete color graph nodes and edges
- inspect export preview

Current writable node/edge families:

- palette input nodes
- relative nodes
- functional alias nodes
- semantic role nodes
- map edges
- contrast edges

## System Canvas Tools

- `get_system_canvas_state`
- `update_system_scale_config`
- `set_system_canvas_view`
- `generate_scale_graph`
- `apply_scale_vars`
- `create_system_node`
- `update_system_node`
- `delete_system_node`
- `create_system_edge`
- `update_system_edge`
- `delete_system_edge`

What this surface supports:

- read generated system graph
- change scale config
- switch subviews
- regenerate graph
- apply vars to theme
- create/update/delete authored support and preview graph nodes/edges

## Node Catalog Tools

- `get_node_catalog_state`

This surface is intentionally read-only.

Use it to review:

- Canvas workspace node cards
- Color Audit node families
- System Canvas node families
- card states: default, selected, highlighted, dimmed

## MCP Resources

### Global

- `workspace://manifest`
- `workspace://project/canvases/index`

### Canvas

- `workspace://surface/canvas/state`
- `workspace://surface/canvas/selection`
- `workspace://surface/canvas/primitives`
- `workspace://surface/canvas/events`
- `workspace://surface/canvas/debug`
- `workspace://surface/canvas/viewport/screenshot`

### Color Audit

- `workspace://surface/color-audit/manifest`
- `workspace://surface/color-audit/state`
- `workspace://surface/color-audit/export-preview`
- `workspace://surface/color-audit/events`
- `workspace://surface/color-audit/debug`
- `workspace://surface/color-audit/viewport/screenshot`

### System Canvas

- `workspace://surface/system-canvas/manifest`
- `workspace://surface/system-canvas/state`
- `workspace://surface/system-canvas/events`
- `workspace://surface/system-canvas/debug`
- `workspace://surface/system-canvas/viewport/screenshot`

### Node Catalog

- `workspace://surface/node-catalog/state`
- `workspace://surface/node-catalog/manifest`
- `workspace://surface/node-catalog/sections`
- `workspace://surface/node-catalog/events`
- `workspace://surface/node-catalog/debug`
- `workspace://surface/node-catalog/viewport/screenshot`

## MCP Prompts

These are built into the MCP server:

- `canvas-layout-review`
  Review the freeform canvas before mutating it.
- `build-color-audit-palette`
  Review and iterate on `Color Audit`.
- `audit-color-contrast`
  Focus on contrast checks and missing pair coverage.
- `review-scale-system`
  Review generated `System Canvas` scale output.
- `review-node-system`
  Review node-card design across surfaces.
- `replace-html-bundle`
  Replace an existing live HTML iframe node atomically by passing `targetItemId` to `import_html_bundle`.

## How To Make Agents Use MCP

The launchers already inject startup guidance, but if you want consistent behavior, ask directly.

Good steering rules:

- say `Use MCP tools/resources only for canvas work`
- tell the agent to start with `workspace://manifest`
- name the target surface explicitly
- tell it to summarize read state before mutating
- tell it to avoid Bash for canvas mutations

## Prompt Patterns That Work

### Universal

```text
Use MCP only for canvas work. Start with workspace://manifest, then read the relevant surface state. Summarize what you found before making changes. Do not use Bash for scene-graph mutations unless MCP lacks a capability.
```

### Stored File Library

```text
Use MCP only. Start with workspace://project/canvases/index and list_canvas_files. Tell me which stored Canvas, Color Audit, and System Canvas files exist. Then open the requested file with open_canvas_file, summarize it, make the requested change, save it back with save_canvas_file, and report the final path.
```

### Local HTML Bundle Node

```text
Use MCP only. First call scan_html_bundles on the local source root to discover bundle folders and entry files. Open or create the target stored Canvas file, then call import_html_bundle with that file path, the chosen directoryPath, and the chosen entryFile. If the board should show it immediately, either create the live html node as part of the same tool call or pass `targetItemId` to replace an existing html node atomically. After that, read the Canvas state, summarize the imported html node, and capture a screenshot.
```

### Replace Existing HTML Node In Place

```text
Use MCP only. Read workspace://surface/canvas/state first and identify the existing html node id you want to keep on the board. Then call import_html_bundle with the stored Canvas file path, the new bundle payload, and targetItemId set to that html node id. Do not create a second html node. After the call, read workspace://surface/canvas/state again, inspect workspace://surface/canvas/debug if needed, and call capture_canvas_items_screenshot for that html node id to verify the iframe updated in place.
```

### Designing with the agent — web-native track

End-to-end workflow for tweaking colors, fonts, layout, and components in a project. Mirrors what a human does in the canvas UI; every step is an MCP tool call.

**1. Tweak project tokens** (color, typography, spacing, radius, shadow):

```text
Use MCP only. Call list_design_tokens with the active projectId to read all CSS custom properties from projects/<projectId>/tokens.css. Then call update_design_token with the token name (e.g. --color-brand-500), the new value, and the mtimeMs from the previous list call. Re-list to confirm the write landed. The token cascade refreshes inside every open canvas iframe via the existing parent → iframe broadcast — no manual reload needed.
```

**2. Edit a primitive's HTML element by clicking it on canvas:**

```text
Use MCP only. Read workspace://surface/canvas/selection to get the selected element's canvasId and sourceId. Call read_html_node with sourceHtml (or filePath + mtimeMs for file-backed components) plus the canvasId to inspect the tag, attributes, classes, and text. Then call update_html_node with mutations like setClassName, setAttribute, or setTextContent. For file-backed writes, pass the same mtimeMs so the writer can guard against external edits.
```

**3. Bring an existing component into the project (paste flow):**

```text
Use MCP only. Call create_component_from_html with the projectId, a name, sourceHtml, and optional sourceCss. The endpoint writes projects/<projectId>/components/<Name>.html (and .css), appends a kind=html registry entry, and creates a preview canvas node. Use create_component_from_tsx with sourceTsx for React components. Pass createItem: false if you only want the file write without a canvas node.
```

**4. Promote a region from a canvas board into a reusable primitive:**

```text
Use MCP only. Read the canvas item's sourceHtml and the selection's canvasId. Call promote_to_component with name, sourceHtml, canvasId, sourceId, and an optional description. The endpoint extracts the matched element + descendants (data-canvas-id stripped), writes the new component file under projects/<projectId>/components/, and registers it. The original canvas item is unchanged; the new primitive is now in the library panel for re-instantiation.
```

**5. Compose a new layout from primitives:**

```text
Use MCP only. Call list_primitives to see the registry, then create_primitive_item or create_items to drop primitives onto the board. Use update_item to position them, and update_html_node on the new instances to tweak text/classes. Call capture_canvas_items_screenshot to verify the layout.
```

**6. Start a native HTML composition shell on canvas:**

```text
Use MCP only. Read workspace://surface/canvas/state and decide whether the new shell belongs on the free board or inside an existing artboard. Then call create_native_component_shell with a template such as section, card, hero, media-object, or blank, plus an optional title. If the shell should live inside an artboard, pass artboardId. After creation, inspect the new html node and continue editing it with read_html_node, insert_native_slot_part, update_html_node, or apply_structural_mutation.
```

The whole loop — generate / bring / compose / edit / sync / iterate — runs through MCP without ever leaving the agent surface. The same endpoints back the UI, so any edit lands in source files identically whether driven by a human or the agent.

### Canvas

```text
Use MCP only. Read workspace://surface/canvas/state, workspace://surface/canvas/selection, and workspace://surface/canvas/primitives. Summarize the current board. Then create a new artboard with a heading, text, and button using create_artboard and create_primitive_item. If you need to inspect the result closely, use focus_canvas_items or set_canvas_viewport before capture_workspace_screenshot, or call capture_canvas_items_screenshot directly for the target item ids.
```

### Canvas native composition

```text
Use MCP only. Read workspace://surface/canvas/state and summarize the active artboards. Create a new artboard if needed with create_artboard. Then call create_native_component_shell with template section or card, an optional title, and the target artboardId. After creation, inspect the new html node with read_html_node and mutate it with insert_native_slot_part, update_html_node, or apply_structural_mutation to add headings, body copy, actions, and media slots. Finish by capturing a screenshot of the new item.
```

### Canvas File Lifecycle

```text
Use MCP only. Read workspace://project/canvases/index and choose an existing Canvas file. If none exists yet, create one first. Open that file, summarize it, then duplicate it into archive/demo-copy.canvas. Rename the original into boards/demo-renamed.canvas, save any updated metadata, and tell me which file is now the active working copy.
```

### Color Audit

```text
Use MCP only for the graph. Read workspace://surface/color-audit/manifest, workspace://surface/color-audit/state, and workspace://surface/color-audit/export-preview. Summarize palette inputs, functional aliases, semantic roles, and export readiness. Then use generate_template with shadcn and brand #3b82f6, accent #a855f7.
```

### System Canvas

```text
Use MCP only for System Canvas. Read workspace://surface/system-canvas/manifest and workspace://surface/system-canvas/state. Summarize the active scale config and current view. Then use update_system_scale_config, set_system_canvas_view, and generate_scale_graph.
```

### Node Catalog

```text
Use MCP only for review. Read workspace://surface/node-catalog/state and workspace://surface/node-catalog/sections. Capture workspace://surface/node-catalog/viewport/screenshot if needed. Review node titles, pills, swatches, ports, overflow, and state treatments.
```

## Stronger Trigger Phrases

If the agent still falls back to shell or code-first behavior, use wording like:

- `Use MCP resources first, then MCP tools.`
- `Do not inspect the React source first. Work from the live surface state.`
- `Use get_workspace_debug after each mutation and report the applied operation trail.`
- `Use capture_workspace_screenshot after the mutation and verify the result visually.`

## How To Verify The Agent Actually Used MCP

Ask it to include what it read and called:

```text
Use MCP only. Tell me which resources you read and which tools you called.
```

You can also verify from the CLI:

```bash
bin/canvas-agent workspace-events canvas 20
bin/canvas-agent workspace-debug canvas 20
bin/canvas-agent workspace-events color-audit 20
bin/canvas-agent workspace-debug system-canvas 20
```

## Recommended Test Cases

### 1. Canvas read/write

```text
Use MCP only. Read the current canvas, summarize it, then create a new artboard with a heading, body text, and primary button using registered primitives.
```

Expected:

- reads Canvas state/resources
- creates artboard and primitive items
- UI updates without reload

### 2. Canvas native shell composition

```text
Use MCP only. Create an artboard, then create a native HTML section shell inside it with a custom title. Update the shell body text, add a secondary paragraph, and verify the result with a screenshot.
```

Expected:

- reads Canvas state/resources
- creates an artboard and a source-backed html shell
- uses HTML node tools to mutate the shell instead of props-only component tools
- UI updates without reload

### 3. Color Audit read/write

```text
Use MCP only. Read the current Color Audit state and export preview, summarize the graph, then generate the shadcn template from brand #3b82f6 and accent #a855f7.
```

Expected:

- reads state + export preview
- runs `generate_template`
- graph updates live

### 4. System Canvas read/write

```text
Use MCP only. Read the current System Canvas state, increase icon stroke, switch to layout view, regenerate the scale graph, then create one explainer node and connect it.
```

Expected:

- reads System Canvas state
- updates config/view
- regenerates graph
- creates/links authored node

### 5. Node Catalog review

```text
Use MCP only. Read the Node Catalog state and sections, then review all node families and call out any title, pill, connector, or overflow issues.
```

Expected:

- reads Node Catalog state
- may capture screenshot
- does not attempt writes on Node Catalog

## Observing what the human does

Every surface exposes an append-only event feed the agent can poll to see
user and agent activity, not just query current state. Read it with
`get_workspace_events`.

### Event vocabulary

| kind | actor | meaning | payload |
| -- | -- | -- | -- |
| `user-action` | `user` | a human edit in the browser (tool switch, theme change, create/delete, paste, move-into-artboard, copy-agent-context) | operation-shaped; `metadata.action` names the gesture |
| `source-edit` | `user` | a human source/markdown write (panel edit, slot insertion, overlay resize) or a source undo/redo | `metadata`: summary, mutationTypes, filePath/target; snapshots stay out — fetch source with `read_html_node` |
| `file-lifecycle` | `user` | a canvas document opened/saved/created/renamed/duplicated/deleted | `metadata.action` = file-open/file-save/file-create/file-rename/file-duplicate/file-delete; path (or fromPath/toPath) |
| `operation-queued` | `agent` / `system` | an operation entered the queue (usually an agent op via this MCP) | the operation |
| `operation-applied` | `agent` / `system` | the queued operation was applied to workspace state | — |
| `state-synced` | `system` | a coarse full-state sync from the browser (fallback signal) | `stateSummary` |

### Cursor loop (poll → act → ack)

```
cursor = 0
loop:
  { events, nextCursor } = get_workspace_events { workspaceId: "canvas", sinceCursor: cursor }
  for each event: react (e.g. the user selected items -> operate on them)
  cursor = nextCursor        # ack: next poll only returns newer events
```

`sinceCursor` filters strictly greater than the given cursor, so passing the
returned `nextCursor` back never re-delivers an event. Omit `sinceCursor` to
read the whole retained log (capped, newest-last).

## Practical Rule

For this repo:

- use MCP/resources/tools for live app surfaces
- poll `get_workspace_events` to observe user + agent activity over time
- use Bash/file edits only for code changes, tests, or debugging outside the live scene graph

That split is the most reliable way to get Claude and Codex to behave correctly here.
