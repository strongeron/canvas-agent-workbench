# Canvas Agent Stored File Smoke Tests

This is the shortest practical QA guide for stored `.canvas` files with Claude or Codex.

Use it after:

1. starting the app
2. attaching the workspace session
3. launching Claude or Codex with the local MCP server

Related files:

- [CANVAS_AGENT_MCP_SETUP.md](/Users/strongeron/Evil%20Martians/Open%20Source/gallery-poc/docs/CANVAS_AGENT_MCP_SETUP.md)
- [CANVAS_AGENT_MCP_COMMANDS.md](/Users/strongeron/Evil%20Martians/Open%20Source/gallery-poc/docs/CANVAS_AGENT_MCP_COMMANDS.md)

## Model

Use this mental model during testing:

- `project` = workspace container
- `.canvas` file = one stored document inside that project

If the app shows `Browser draft` or `Unsaved canvas`, the board is not yet bound to a real stored file. For HTML bundle testing, open or create a real `.canvas` file first.

## Launch

Claude:

```bash
npm run agent:claude
```

Codex:

```bash
npm run agent:codex
```

## What Good Looks Like

The agent should be able to:

- list stored `.canvas` files
- open one file
- summarize its current content
- mutate the live surface or the stored file
- save it back
- reopen it
- confirm the saved change is still present

For freeform Canvas, it should also be able to:

- duplicate a file
- rename or move a file
- delete a file

## Stored File Flow

Use this wording first:

```text
Use MCP only. Start with workspace://project/canvases/index and list_canvas_files. Open the file I mention, summarize it, make the requested change, save it back, reopen it, and confirm the change persisted.
```

## Test 1: Freeform Canvas

Prompt:

```text
Use MCP only. Read workspace://project/canvases/index and list all stored Canvas files. Open boards/demo.canvas. Summarize the board. Add one markdown note titled "Agent QA" with a short checklist. Save the file. Reopen the same file and confirm the markdown note is still there.
```

Expected result:

- agent reads `workspace://project/canvases/index`
- agent calls `open_canvas_file`
- agent mutates Canvas via live tools or save payload flow
- agent calls `save_canvas_file`
- agent calls `open_canvas_file` again
- reopened document still contains the new markdown note

## Test 2: Rename, Duplicate, Delete

Prompt:

```text
Use MCP only. Open boards/demo.canvas. Duplicate it into archive/demo-copy.canvas. Rename or move the original to boards/demo-renamed.canvas. Then delete archive/demo-copy.canvas. Report the final remaining file paths.
```

Expected result:

- agent uses `duplicate_canvas_file`
- agent uses `move_canvas_file`
- agent uses `delete_canvas_file`
- document-local asset paths stay valid after rename or duplicate

## Test 3: Color Audit Stored File

Prompt:

```text
Use MCP only. List stored Color Audit files. Open the main Color Audit file. Summarize palette inputs, functional aliases, semantic roles, and export readiness. Add one new functional alias node, save the file, reopen it, and confirm the node still exists.
```

Expected result:

- agent opens a `color-audit` `.canvas` file
- agent reads current graph state
- agent modifies the graph
- agent saves the file
- reopened file contains the new node

## Test 4: System Canvas Stored File

Prompt:

```text
Use MCP only. List stored System Canvas files. Open the main System Canvas file. Summarize the current scale config and authored nodes. Add one explainer node, save the file, reopen it, and confirm the node still exists.
```

Expected result:

- agent opens a `system-canvas` `.canvas` file
- agent reads state
- agent adds one authored node
- agent saves and reopens
- reopened file still contains the authored node

## Test 5: Screenshot Verification

Prompt:

```text
Use MCP only. Open boards/demo-renamed.canvas, save any current changes, then capture a workspace screenshot and tell me whether the screenshot reflects the same latest state you just saved.
```

Expected result:

- agent saves first
- agent captures screenshot after save
- screenshot reflects the latest visible board state

## Test 6: Item Screenshot Crop

Prompt:

```text
Use MCP only. Open the Canvas file that contains an HTML node. Read workspace://surface/canvas/state, identify the html node id, and call capture_canvas_items_screenshot for that id. Report the returned cropRect and confirm the screenshot is a node crop rather than a full-board viewport shot.
```

Expected result:

- agent finds a concrete Canvas item id
- agent calls `capture_canvas_items_screenshot`
- response includes `cropRect`
- screenshot is substantially smaller than the full default desktop viewport when the node bounds are available

## If The Agent Falls Back To Bash

Use stronger steering:

```text
Do not use Bash for canvas work. Use MCP resources first, then MCP tools. Start with workspace://project/canvases/index. Use open_canvas_file, save_canvas_file, move_canvas_file, duplicate_canvas_file, and delete_canvas_file as needed.
```

## If You Want The Fastest Confidence Check

Run these three prompts in order:

1. Freeform Canvas open/edit/save/reopen
2. rename/duplicate/delete flow
3. Color Audit open/edit/save/reopen

If those work, the stored file layer is in good shape.
