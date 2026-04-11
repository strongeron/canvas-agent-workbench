# Canvas Agent MCP Commands

This file is the real MCP reference for this repo's local stdio server:

- [bin/canvas-mcp-server](/Users/strongeron/Evil%20Martians/Open%20Source/gallery-poc/bin/canvas-mcp-server)

It reflects the current checked-in server surface on April 5, 2026.

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
- [run-claude-canvas.sh](/Users/strongeron/Evil%20Martians/Open%20Source/gallery-poc/scripts/run-claude-canvas.sh)
- [run-codex-canvas.sh](/Users/strongeron/Evil%20Martians/Open%20Source/gallery-poc/scripts/run-codex-canvas.sh)

## Global MCP Tools

These work across surfaces:

- `get_workspace_manifest`
  Returns the global workspace/runtime manifest.
- `get_surface_manifest`
  Returns the manifest for one surface: `canvas`, `color-audit`, `system-canvas`, `node-catalog`.
- `get_workspace_events`
  Returns the append-only event log for one surface.
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
- `list_primitives`
- `get_primitive`
- `create_artboard`
- `create_primitive_item`
- `create_item`
- `update_item`
- `delete_items`
- `select_items`
- `clear_canvas`
- `export_board`

What this surface supports:

- read current board
- inspect selection
- inspect registered primitives and their metadata
- create/update/delete board items
- export primitive-only artboards as React

Current writable entity types:

- artboards
- component items
- embeds
- media
- Mermaid diagrams
- Excalidraw sketches
- markdown notes

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

### Canvas

```text
Use MCP only. Read workspace://surface/canvas/state, workspace://surface/canvas/selection, and workspace://surface/canvas/primitives. Summarize the current board. Then create a new artboard with a heading, text, and button using create_artboard and create_primitive_item.
```

### Canvas File Lifecycle

```text
Use MCP only. Read workspace://project/canvases/index, open boards/demo.canvas, summarize it, then duplicate it into archive/demo-copy.canvas. Rename the original into boards/demo-renamed.canvas, save any updated metadata, and tell me which file is now the active working copy.
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

### 2. Color Audit read/write

```text
Use MCP only. Read the current Color Audit state and export preview, summarize the graph, then generate the shadcn template from brand #3b82f6 and accent #a855f7.
```

Expected:

- reads state + export preview
- runs `generate_template`
- graph updates live

### 3. System Canvas read/write

```text
Use MCP only. Read the current System Canvas state, increase icon stroke, switch to layout view, regenerate the scale graph, then create one explainer node and connect it.
```

Expected:

- reads System Canvas state
- updates config/view
- regenerates graph
- creates/links authored node

### 4. Node Catalog review

```text
Use MCP only. Read the Node Catalog state and sections, then review all node families and call out any title, pill, connector, or overflow issues.
```

Expected:

- reads Node Catalog state
- may capture screenshot
- does not attempt writes on Node Catalog

## Practical Rule

For this repo:

- use MCP/resources/tools for live app surfaces
- use Bash/file edits only for code changes, tests, or debugging outside the live scene graph

That split is the most reliable way to get Claude and Codex to behave correctly here.
