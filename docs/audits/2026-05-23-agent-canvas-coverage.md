---
title: Agent canvas operations — coverage audit
date: 2026-05-23
branch: feat/agent-canvas-audit
status: draft
---

## Methodology

Read-only audit of every observable user operation on the Canvas surface, then
cross-matched against the agent-reachable surface (manifest tools, runtime
helpers, MCP server tools, MCP commands doc).

Files read for the LEFT side (UI ops):

- `components/canvas/CanvasTab.tsx` (4973 lines) — orchestrator: toolbar
  handlers, paste, dnd, keyboard, item add/duplicate/delete/group, native
  component dialog, sync wiring, canvas-file lifecycle, mutation undo/redo.
- `components/canvas/CanvasToolbar.tsx` — every toolbar button.
- `components/canvas/CanvasWorkspace.tsx` — selection, marquee, pan, wheel
  zoom, dnd routing, space-pan, drop zones.
- `components/canvas/CanvasSidebar.tsx` — primitives, HTML bundle entry,
  native-component entry, project library, canvas-file library, scan/import.
- `components/canvas/CanvasNativeComponentDialog.tsx` — template & title.
- `components/canvas/CanvasArtboardItem.tsx` +
  `components/canvas/CanvasArtboardPropsPanel.tsx` — artboard drag/resize/
  rotate, gap scrub, layout direction/align/justify/columns/padding, theme.
- `components/canvas/CanvasHtmlFrame.tsx` (Iframe element-pick →
  selection routing) +
  `components/canvas/CanvasHtmlItem.tsx` /
  `components/canvas/CanvasLayoutHtmlItem.tsx` (drag/resize/rotate).
- `components/canvas/CanvasHtmlPropsPanel.tsx` — Sync section (project sync),
  slot editor, slot starter / slot component / slot part insertion, slot
  metadata apply, bundle replace, format toggle, sourceMode flip.
- `components/canvas/canvasSyncWiring.ts` — `runSync` / `readSyncTarget` /
  `detectComponentsDir` / `pickDirectoryHint` / `postSync`.
- `components/canvas/CanvasIframeOverlay.tsx` +
  `components/canvas/CanvasIframeDropZones.tsx` — overlay move handle,
  resize handles, drop zones.
- `components/canvas/CanvasReactNodePropertyPanel.tsx` — StructureEditor
  (wrap / swapTag / reorderSibling / insertChild / unwrap / removeNode),
  Slot editor, AttributeRow, text editor, source-url import.
- Per-item: `CanvasMediaItem.tsx`, `CanvasLayoutMediaItem.tsx` (crop / clip
  drag), `CanvasMediaPropsPanel.tsx` (kind, fit, alt, controls, autoplay,
  muted, loop, poster, clip), `CanvasMermaidItem.tsx` (inline-label edit) +
  `CanvasMermaidPropsPanel.tsx` (theme, background, source, convert),
  `CanvasMarkdownItem.tsx` + `CanvasMarkdownPreview.tsx` (block edit/reorder)
  + `CanvasMarkdownPropsPanel.tsx`, `CanvasEmbedItem.tsx` +
  `CanvasEmbedPropsPanel.tsx`, `CanvasExcalidrawItem.tsx` +
  `CanvasExcalidrawPropsPanel.tsx`, `CanvasThemePanel.tsx`.

Files read for the RIGHT side (agent surface):

- `utils/agentNativeManifest.ts` — manifest tool entries (Canvas surface).
- `utils/canvasAgentOperations.mjs` — JS operation builders + state reducer.
- `utils/agentNativeRuntimeAdapters.ts` — runtime guidance text for both
  Claude Code and Codex CLI.
- `bin/canvas-mcp-server` — MCP `tools/call` switch (lines 1620–2174).
- `bin/canvas-agent-runtime.mjs` — runtime HTTP/file IO the MCP server
  delegates to.
- `docs/CANVAS_AGENT_MCP_COMMANDS.md` — user-facing tool list.

Matching rule: a row is **full** when the agent tool writes through the same
endpoint / queue / file-writer as the UI handler. **partial** when an agent
can emulate the outcome through a more primitive tool but the contract
differs (e.g. raw `apply_structural_mutation` vs a higher-level affordance).
**missing** when no agent path exists at all. **n/a** for ops that are
inherently UI-side (geometric mouse drag, viewport, marquee).

## UI surface inventory

### Workspace selection + viewport

| Operation | UI trigger (file:line) | Notes |
|---|---|---|
| Marquee selection (drag on empty canvas) | `CanvasWorkspace.tsx:617`, `CanvasWorkspace.tsx:677` | Box-intersect against `selectableItems`. |
| Click item to select | `CanvasArtboardItem.tsx:319`, `CanvasHtmlItem.tsx:89-`, `CanvasMermaidItem.tsx:225`, `CanvasMediaItem.tsx:256-`, `CanvasMarkdownItem.tsx:325`, `CanvasEmbedItem.tsx:512`, `CanvasExcalidrawItem.tsx:224` | Per-item `onMouseDown` → `onSelect`. |
| Shift-click to add to selection | `CanvasWorkspace.tsx:681` | Marquee branch. |
| Click empty canvas to clear selection | `CanvasWorkspace.tsx:688` | `onClearSelection`. |
| Escape clears selection / closes panels | `CanvasTab.tsx:2309` `handleEscape` | Cycles through help → scenes → layers → clear. |
| Pan with space + drag | `CanvasWorkspace.tsx:196`, `CanvasWorkspace.tsx:609` | Space key gates `isSpaceHeld`. |
| Pan with middle mouse button | `CanvasWorkspace.tsx:609` | `e.button === 1`. |
| Pan with two-finger scroll | `CanvasWorkspace.tsx:152` (`onWheel`) | Wheel handler in parent. |
| Zoom with ⌘+wheel | `CanvasWorkspace.tsx:152` | Same `onWheel`. |
| Zoom in / out buttons | `CanvasToolbar.tsx:167-196` (`onZoomIn`/`onZoomOut`) | `[ + ]` / `[ - ]`. |
| Reset zoom (0%) button | `CanvasToolbar.tsx:178`, `CanvasToolbar.tsx:215` `onResetZoom` | `[ 0 ]`. |
| Fit all in view | `CanvasToolbar.tsx:202` `onFitToView` → `CanvasTab.tsx:2298` `handleFitToView` | `[ 1 ]`. |
| Toggle sidebar / scenes / layers / library / theme / copilot / help | `CanvasToolbar.tsx:151,455,471,486,514,541,528` | UI-only. |

### Item drag / resize / rotate (per item)

| Operation | UI trigger (file:line) | Notes |
|---|---|---|
| Drag item to move | `CanvasArtboardItem.tsx:110` `handleMouseDown`, `CanvasMediaItem.tsx:256`, `CanvasHtmlItem.tsx:89`, `CanvasMermaidItem.tsx:66`, `CanvasMarkdownItem.tsx:80`, `CanvasEmbedItem.tsx:348`, `CanvasExcalidrawItem.tsx:65` | All per-item; commits update through `updateItem`. |
| Resize with corner handle | `CanvasArtboardItem.tsx:136` `handleResizeStart` (and parallels in each item) | 8 handles per item. |
| Rotate handle | `CanvasArtboardItem.tsx:157` `handleRotateStart` (and parallels) | Single handle above bounding box. |
| Crop drag (image) | `CanvasMediaItem.tsx:391` `handleCropHandleDown`, `CanvasMediaItem.tsx:420-` (crop drag loop) | Writes `crop` `{x,y,w,h}` fractions through `updateItem`. |
| Clip drag (video) | `CanvasMediaItem.tsx:402` `handleClipHandleDown` | Writes `clipStartSec` / `clipEndSec`. |

### Add items (toolbar, sidebar, paste)

| Operation | UI trigger (file:line) | Notes |
|---|---|---|
| Add artboard (toolbar) | `CanvasToolbar.tsx:232` → `CanvasTab.tsx:3406` `handleAddArtboard` | Center-of-viewport placement. |
| Add native component (toolbar) | `CanvasToolbar.tsx:247` → `CanvasTab.tsx:2662` `handleAddNativeComponent` → file-backed shell via `createFileBackedNativeShell` | Calls `/api/canvas/component/create`. |
| Add native component via dialog (template + title + seedValues) | `CanvasNativeComponentDialog.tsx:214` `onCreate` | Template = section / card / hero / media-object / blank / element parts. |
| Add HTML bundle from drag-drop (files / folder) | `CanvasSidebar.tsx:840` `handleHtmlBundleFolderSelection` / `881` `handleHtmlFileSelection` → `CanvasTab.tsx:2402` `handleAddHtmlBundle` | Calls `importCanvasHtmlBundle`. |
| Add HTML bundle from directory path | `CanvasSidebar.tsx:904` `handlePickHtmlBundleFolder` / `934` `handlePickHtmlEntryFile` → `CanvasTab.tsx:2804` `handleAddHtmlBundleFromDirectory` | Uses local-disk scan. |
| Add inline HTML / React node | `CanvasTab.tsx:2488` `handleAddInlineHtml` (also drives paste-created components) | Source mode = `inline` / `react`. |
| Add component from paste dialog | `CanvasTab.tsx:2752` `handleComponentPasteCreated` (via `CanvasComponentPasteDialog`) | Writes HTML/TSX files + registry entry. |
| Add component from primitive library (drag) | `CanvasTab.tsx:4040` `handleDragStart` / `4047` `handleDragEnd` → dnd-kit | Creates `type: "component"` item. |
| Cycle component variant (←/→) | `CanvasTab.tsx:1360-1378` keydown effect | Calls `updateItem` with new `variantIndex`. |
| Add embed by URL | `CanvasSidebar` embed input → `CanvasTab.tsx:2370` `handleAddEmbed` | Normalizes embed URL. |
| Add media (drag-drop or paste) | `CanvasTab.tsx:3234` `handleDropMediaFiles`, `3257` `handlePasteMediaFiles`, `3272` paste listener | Inflates `type: "media"`. |
| Add mermaid | `CanvasTab.tsx:3039` `handleAddMermaid` | Default starter source. |
| Add markdown | `CanvasTab.tsx:3073` `handleAddMarkdown` | Default starter source. |
| Add excalidraw | `CanvasTab.tsx:3111` `handleAddExcalidraw` | Empty scene. |
| Import diagram from file drop | `CanvasTab.tsx:3148` `handleImportDiagramFile` | Routes to markdown / mermaid / excalidraw. |
| Convert mermaid → excalidraw | `CanvasTab.tsx:3195` `handleConvertMermaidToExcalidraw`; UI button at `CanvasMermaidPropsPanel.tsx:116` | Renders mermaid → SVG → Excalidraw. |
| Open Color Canvas | `CanvasTab.tsx:3442` `handleOpenColorCanvas`; UI button `CanvasThemePanel.tsx:271` | Creates or focuses dedicated artboard. |
| Import from Paper (UI / page) | `CanvasToolbar.tsx:259`, `CanvasSidebar.tsx:427` → `CanvasTab.tsx:2178` `handleImportFromPaper` | External Paper MCP. |

### Selection actions (toolbar)

| Operation | UI trigger (file:line) | Notes |
|---|---|---|
| Duplicate selection (⌘D) | `CanvasToolbar.tsx:346` → `CanvasTab.tsx:2339` `handleDuplicate` | Uses workspace `duplicateSelected`. |
| Delete selection (Del) | `CanvasToolbar.tsx:358` → `CanvasTab.tsx:2303` `handleDeleteSelected` | Cascading delete via `removeSelected`. |
| Group selection (⌘G) | `CanvasToolbar.tsx:371` → `CanvasTab.tsx:2322` `handleGroupSelected` | `createGroup(selectedIds)`. |
| Ungroup (⌘⇧G) | `CanvasToolbar.tsx:385` → `CanvasTab.tsx:2329` `handleUngroupSelected` | `ungroup(groupId)`. |
| Move selection into selected artboard | `CanvasToolbar.tsx:399` → `CanvasTab.tsx:1858` `handleMoveSelectionToArtboard` | Re-parents items to artboard. |
| Wrap selection in section | `CanvasToolbar.tsx:413` → `CanvasTab.tsx:1923` `handleWrapSelectionInSection` | Wraps siblings into a layout section. |
| Clear canvas | `CanvasToolbar.tsx:442` → workspace `clearCanvas` | `[Trash]`. |
| Bring to front / send to back | `CanvasContextMenu` → workspace `bringToFront`/`sendToBack` (used by item context menu) | Per-item `zIndex` shuffle. |
| Move layer up / down (sibling reorder) | `CanvasTab.tsx:2345` `handleMoveLayer` | Swaps `order` between siblings. |

### Artboard structure

| Operation | UI trigger (file:line) | Notes |
|---|---|---|
| Edit artboard name | `CanvasArtboardPropsPanel.tsx:268` onChange `name` | Plain item patch. |
| Edit artboard background | `CanvasArtboardPropsPanel.tsx:279`, `286` | Color picker + text input. |
| Apply theme preset to artboard | `CanvasArtboardPropsPanel.tsx:247` onClick `{ themeId: preset.id }` | Patches `themeId`. |
| Toggle layout display (flex/grid) | `CanvasArtboardPropsPanel.tsx:543` onClick layout `display` button | Replaces full `layout`. |
| Set layout direction (row/column) | `CanvasArtboardPropsPanel.tsx:715` onClick | `layout.direction`. |
| Set layout align / justify | `CanvasArtboardPropsPanel.tsx:571,592` onChange | `layout.align` / `layout.justify`. |
| Set columns (grid) | `CanvasArtboardPropsPanel.tsx:742` Columns input | `layout.columns`. |
| Set gap | `CanvasArtboardPropsPanel.tsx:462,471` slider/number | `layout.gap`. |
| Set padding | similar slider in same panel | `layout.padding`. |
| Drag gap scrub on canvas | `CanvasArtboardItem.tsx:176` `handleGapScrubStart` (button `370-378`) | On-canvas affordance. |
| Section width / height mode (fill/fit/fixed) | `CanvasArtboardPropsPanel.tsx:611-680` width/height mode buttons | Used for nested sections. |

### Native shell + slot editing (HTML props panel)

| Operation | UI trigger (file:line) | Notes |
|---|---|---|
| Insert slot starter into a detected slot | `CanvasHtmlPropsPanel.tsx:885` `handleInsertSlotStarter` (button `1162`) | Calls `writeCanvasHtmlNode` directly. |
| Insert slot component from registry | `CanvasHtmlPropsPanel.tsx:908` `handleInsertSlotComponent` (button `1315`) | Picks primitive by `displayName`. |
| Insert native part into slot (div/section/header/footer/heading/paragraph/button/link/image/svg/video) | `CanvasHtmlPropsPanel.tsx:928` `handleInsertSlotPart` (button `1260`) | Optional `sourceUrl` for image/video/link. |
| Apply slot metadata (data-slot / data-slot-kind / data-slot-accepts) | `CanvasHtmlPropsPanel.tsx:976` `handleApplySlotMetadata` (button `1212`) | Three `setAttribute` mutations. |
| Replace HTML bundle (files / folder) | `CanvasHtmlPropsPanel.tsx:843` `handleFilesSelected`, `868` `handlePickDirectory` → `CanvasTab.tsx:2887` `handleReplaceHtmlBundle` | Atomic in-place replace. |
| Load .tsx/.jsx source from path | `CanvasHtmlPropsPanel.tsx:804` `handleLoadFromFile` | POST `/api/canvas/ast/load`. |
| Flip sourceMode (bundle / inline / react / url) | `CanvasHtmlPropsPanel.tsx:1095-1099` | Implicit when src/source fields change. |
| Edit title / sandbox / background / src / sourceHtml / sourceReact / sourceCss | onChange handlers across `CanvasHtmlPropsPanel.tsx:1084,1095,1132,1354,1448,1459` | All plain item patches. |
| Replace selected contents from picked source URL | `CanvasReactNodePropertyPanel.tsx:597` button → `replaceChildren` mutation | Native + AST path. |
| Sync to project (file-backed component or artboard page) | `CanvasHtmlPropsPanel.tsx:1047` `SyncButton` → `canvasSyncWiring.ts:336` `runSync` | First-sync = pick → detect → persist → POST sync. Re-sync = reuse mapping. |
| Format toggle (html / html+tsx) | `CanvasHtmlPropsPanel.tsx:533-541` | Component-only. |
| Edit / Re-pick components dir | `CanvasHtmlPropsPanel.tsx:617,632,650` (`setOverrideDir`, `setEditingDir`) | Override piped to `runSync`. |
| Browse hint (picker) | `CanvasHtmlPropsPanel.tsx:465` `handleBrowseHint` → `pickDirectoryHint` | Hint only (basename), not a path. |

### Element-level HTML editing (StructureEditor inside `CanvasReactNodePropertyPanel`)

| Operation | UI trigger (file:line) | Notes |
|---|---|---|
| Click element on canvas to select it | `CanvasHtmlFrame.tsx` (forwards iframe-side `data-canvas-id` clicks to selection) | Selection sets `canvasId` + `sourceId`. |
| Insert child inside top | `CanvasReactNodePropertyPanel.tsx:604` `insertInside(0)` | `insertChild` mutation, position 0. |
| Insert child inside bottom | `CanvasReactNodePropertyPanel.tsx:612` `insertInside(childCount)` | Same mutation, last position. |
| Insert sibling above | `CanvasReactNodePropertyPanel.tsx:620` `insertSibling(0)` | Parent + index − 1. |
| Insert sibling below | `CanvasReactNodePropertyPanel.tsx:628` `insertSibling(1)` | Parent + index + 1. |
| Wrap selection | `CanvasReactNodePropertyPanel.tsx:809` `wrapSelection` button | Mutation `{ type: "wrapSelection", wrapperTag }`. |
| Swap tag | `CanvasReactNodePropertyPanel.tsx:827` `swapTag` button | Mutation `{ type: "swapTag", newTag }`. |
| Reorder sibling up / down | `CanvasReactNodePropertyPanel.tsx:838,846` | `reorderSibling` mutation. |
| Insert child (raw source + position) | `CanvasReactNodePropertyPanel.tsx:874` `insertChild` button | Custom source + position. |
| Unwrap | `CanvasReactNodePropertyPanel.tsx:893` `unwrap` | Mutation `{ type: "unwrap" }`. |
| Delete node | `CanvasReactNodePropertyPanel.tsx:901` `removeNode` | Mutation `{ type: "removeNode" }`. |
| Edit attribute value | `CanvasReactNodePropertyPanel.tsx:932` `apply` → `setAttribute` / `setClassName` | TSX className special-cased. |
| Edit text content | `CanvasReactNodePropertyPanel.tsx:1041` `setTextChild` button | Mutation. |
| Edit slot metadata via Slot editor | `CanvasReactNodePropertyPanel.tsx:709` `applySlotMetadata` | Three `setAttribute` mutations. |
| Iframe drop zones (library drop insert) | `CanvasIframeDropZones.tsx:169-228`, `CanvasHtmlFrame.tsx:591` → `CanvasTab.tsx:1147` `handleLibraryDropInsert` | Drops a registry primitive as an inserted child. |
| Iframe drop zones (library drop wrap) | `CanvasHtmlFrame.tsx:598` → `CanvasTab.tsx:1158` `handleLibraryDropWrap` | Drops to wrap selection. |
| Iframe overlay move handle | `CanvasIframeOverlay.tsx:151` `beginDrag("move")` | Posts literal/structural mutation to source via `dispatchCanvasResize`. |
| Iframe overlay resize handles | `CanvasIframeOverlay.tsx:174` `beginDrag(spec.kind)` | Same writer path (`handleReactNodeResize`, `CanvasTab.tsx:1381`). |
| Group resize (multi-select drag) | `CanvasTab.tsx:1426` `handleReactNodeGroupResize` | N literal writes; one toast per batch. |
| Undo / redo source mutation (⌘Z / ⌘⇧Z) | `CanvasTab.tsx:1340-1356` keydown + `1183` `applyMutationHistoryEntry` | Re-writes source through `/api/canvas/ast/write` or markdown writer. |

### Media item

| Operation | UI trigger (file:line) | Notes |
|---|---|---|
| Edit src / kind / fit / title / alt / poster | `CanvasMediaPropsPanel.tsx:102,122,135,149,160,173` | Plain `onChange` patches. |
| Toggle controls / autoplay / muted / loop | `CanvasMediaPropsPanel.tsx:184,192,200,208` | Boolean patches. |
| Edit clipStartSec / clipEndSec | `CanvasMediaPropsPanel.tsx:231,247,260,272` | Numeric input. |
| Crop / clip drag handles on canvas | `CanvasMediaItem.tsx:391` (crop), `402` (clip) | Same `crop`/`clip*` fields as inspector. |

### Mermaid item

| Operation | UI trigger (file:line) | Notes |
|---|---|---|
| Inline-edit rendered Mermaid node label | `CanvasMermaidItem.tsx:247` `onUpdate({ source: updateMermaidNodeLabel(...) })` | Source-patcher. |
| Edit title / theme / background / source | `CanvasMermaidPropsPanel.tsx:72,85,106,166` | Plain patches. |
| Reset source to starter | `CanvasMermaidPropsPanel.tsx:158` | `onChange({ source: STARTER_FLOW })`. |
| Convert to Excalidraw | `CanvasMermaidPropsPanel.tsx:116` `onConvertToExcalidraw` → `CanvasTab.tsx:3195` | New excalidraw item. |

### Markdown item

| Operation | UI trigger (file:line) | Notes |
|---|---|---|
| Edit one markdown block in place | `CanvasMarkdownItem.tsx:115` `commitEditing` (calls `performCanvasMarkdownWrite` with `action: "update"`) | Source-backed write. |
| Reorder markdown block up / down | `CanvasMarkdownItem.tsx:153` `reorderBlock` (`action: "reorder"`); UI buttons `CanvasMarkdownPreview.tsx:265-282` | Source-backed write. |
| Append starter mermaid block | `CanvasMarkdownPropsPanel.tsx:102` button | `onChange({ source: source + STARTER_MERMAID_BLOCK })`. |
| Reset markdown source | `CanvasMarkdownPropsPanel.tsx:109` button | `STARTER_MARKDOWN`. |
| Edit title / background / source | `CanvasMarkdownPropsPanel.tsx:77,90,120` | Plain patches. |

### Embed item

| Operation | UI trigger (file:line) | Notes |
|---|---|---|
| Edit url / title / allow / sandbox / preview mode | `CanvasEmbedPropsPanel.tsx:160,200,211,222,180` | Plain patches. |
| Check frame policy | `CanvasEmbedPropsPanel.tsx:247` `onCheckFramePolicy` | Frame status diagnostic. |
| Capture snapshot (desktop/mobile/both) | `CanvasEmbedPropsPanel.tsx:277` → `CanvasTab.tsx:3296` `handleCaptureEmbedSnapshots` | Snapshot pipeline. |
| Refresh snapshot | `CanvasEmbedPropsPanel.tsx:345` `onRefreshSnapshot` | Same pipeline. |
| Start / stop live session | `CanvasEmbedPropsPanel.tsx:381,390` | Live preview lifecycle. |
| Request embed state | `CanvasEmbedPropsPanel.tsx:426` `onRequestState` | `canvas:request-embed-state` event. |

### Excalidraw item

| Operation | UI trigger (file:line) | Notes |
|---|---|---|
| Edit title / scene / sourceMermaid | `CanvasExcalidrawPropsPanel.tsx:80,93` (and the embedded editor through `CanvasExcalidrawViewport`) | Plain patches. |
| Remap from Mermaid | `CanvasExcalidrawPropsPanel.tsx:119` `onRemapFromMermaid` | Re-runs converter. |
| In-canvas Excalidraw editing | `CanvasExcalidrawViewport` (mounted inside the item) | Fully UI-only (excalidraw scene state). |

### Theme + tokens

| Operation | UI trigger (file:line) | Notes |
|---|---|---|
| Switch active theme | `CanvasThemePanel.tsx:209` onClick → `onThemeChange` | Theme store. |
| Add theme by label | `CanvasThemePanel.tsx:245` button → `onAddTheme(label)` | Seeded from current vars. |
| Edit theme CSS var | `CanvasThemePanel.tsx:352` `onUpdateThemeVar` (per-token Save) | In-memory theme override. |
| Edit project `tokens.css` value | `CanvasThemePanel.tsx:352` `writeProjectToken` | Writes through `/api/canvas/tokens/write`. |
| Refresh project tokens | `CanvasThemePanel.tsx:298` button | Re-runs `/api/canvas/tokens/list`. |
| Open Color Canvas from theme panel | `CanvasThemePanel.tsx:271` button | Same `handleOpenColorCanvas`. |

### Canvas-file library (stored `.canvas` documents)

| Operation | UI trigger (file:line) | Notes |
|---|---|---|
| List canvas files | sidebar canvas browser (`CanvasSidebar.tsx`) populates from `canvasFiles` | Fed by `useProjectCanvasFiles`. |
| Open canvas file | sidebar entry → `CanvasTab.tsx:3513` `handleOpenCanvasFile` | `openCanvasFile` + apply to workspace. |
| Create canvas file (modal) | `CanvasTab.tsx:3554` `handleCreateCanvasFile` + modal `3643` `handleSubmitCanvasFileActionModal` | Creates blank or save-as. |
| Save canvas file | `CanvasTab.tsx:3565` `handleSaveCanvasFile` → `performSaveCanvasFile` | Auto-debounced; binary asset pack on demand. |
| Toggle favorite | `CanvasTab.tsx:3574` `handleToggleCanvasFavorite` | `updateCanvasFileMetadata`. |
| Rename canvas file | `CanvasTab.tsx:3598` `handleRenameCanvasFile` → modal | `move` endpoint. |
| Duplicate canvas file | `CanvasTab.tsx:3614` `handleDuplicateCanvasFile` → modal | `duplicate` endpoint. |
| Delete canvas file | `CanvasTab.tsx:3630` `handleDeleteCanvasFile` → confirm modal `3728` | `delete` endpoint. |

## Agent surface inventory

### Canvas-surface manifest tools (`utils/agentNativeManifest.ts:96-314`)

| Tool | Defined at | Notes |
|---|---|---|
| `list_canvas_files` | `agentNativeManifest.ts:97-102` | Stored file index. |
| `open_canvas_file` | `:103-108` | Open by path. |
| `create_canvas_file` | `:109-114` | Create empty / save-as. |
| `save_canvas_file` | `:115-120` | Save + asset pack. |
| `scan_html_bundles` | `:121-126` | Probe local HTML root. |
| `import_html_bundle` | `:127-132` | Pack bundle into `.canvas`. |
| `update_canvas_file_metadata` | `:133-138` | Title/tags/favorite/archived. |
| `move_canvas_file` | `:139-144` | Rename / move folder. |
| `duplicate_canvas_file` | `:145-150` | Copy + new identity. |
| `delete_canvas_file` | `:151-157` | Destructive. |
| `create_item` | `:158-163` | Single freeform item. |
| `create_items` | `:164-169` | Batch. |
| `create_native_component_shell` | `:170-176` | File-backed native shell. |
| `insert_native_slot_part` | `:177-182` | Append native part into a slot. |
| `sync_to_project` | `:183-190` | Allowlist-gated publish. Destructive. |
| `create_group` | `:191-196` | Named freeform group. |
| `update_item` | `:197-202` | Patch any item. |
| `apply_structural_mutation` | `:203-208` | Raw AST mutation. |
| `update_markdown_block` | `:209-214` | Edit / reorder block. |
| `cycle_component_variant` | `:215-220` | Prev / next variant. |
| `update_artboard_layout` | `:221-226` | gap / padding / direction / columns. |
| `update_media_crop` | `:227-232` | crop / clip / fit / display fields. |
| `update_mermaid_label` | `:233-238` | One node label. |
| `update_group` | `:239-244` | Patch group. |
| `delete_items` | `:245-251` | Cascading. Destructive. |
| `delete_group` | `:252-258` | Destructive. |
| `select_items` | `:259-264` | Replace selection. |
| `get_canvas_themes` | `:265-270` | Theme registry. |
| `set_canvas_viewport` | `:271-276` | Live viewport only. |
| `focus_canvas_items` | `:277-282` | Fit + optional select. |
| `capture_canvas_items_screenshot` | `:283-288` | Cropped screenshot. |
| `clear_canvas` | `:289-295` | Destructive. |
| `capture_workspace_screenshot` | `:296-301` | Full board capture. |
| `get_workspace_events` | `:302-307` | Replay log. |
| `get_workspace_debug` | `:308-313` | Debug payload. |

### MCP server tools (`bin/canvas-mcp-server`)

The registration list (lines 84–1289) defines **every callable tool**. Notable
tools that appear in MCP but **not** in the manifest:

| MCP tool | Defined at | Notes |
|---|---|---|
| `get_workspace_manifest` | `bin/canvas-mcp-server:84` | Global. |
| `get_surface_manifest` | `:93` | Global. |
| `list_design_tokens` | `:277` | Reads `projects/<id>/tokens.css`. |
| `update_design_token` | `:288` | Writes one CSS var. |
| `read_html_node` | `:304` | AST read. |
| `update_html_node` | `:320` | Literal mutations (setClassName, setAttribute, setTextContent). |
| `create_component_from_html` | `:473` | Writes Root A component file + registry. |
| `promote_to_component` | `:504` | Extract subtree → primitive. |
| `create_component_from_tsx` | `:522` | TSX variant. |
| `get_canvas_context` | `:880` | High-level summary. |
| `get_canvas_state` / `get_canvas_selection` / `get_canvas_themes` | `:890,899,908` | Reads. |
| `list_primitives` / `get_primitive` | `:917,938` | Registry inspection. |
| `create_artboard` | `:950` | First-class artboard create. |
| `create_primitive_item` | `:1074` | Drop primitive item. |
| `export_board` | `:1271` | React export. |

All resources mirror manifest URIs (lines 1290–1446). Prompts at
`bin/canvas-mcp-server:1448-1473` add `canvas-layout-review`,
`build-color-audit-palette`, `audit-color-contrast`, `review-scale-system`,
`review-node-system`, and `replace-html-bundle`.

### Runtime helpers (`bin/canvas-agent-runtime.mjs`)

Pure transport-layer helpers used by the MCP server:

- Session bootstrap: `bootstrapCanvasAgentSession` (:129), context
  read/write (`:36-127`).
- State reads: `readCanvasAgentState`, `readCanvasAgentThemes`,
  `readCanvasAgentSelection`, `readCanvasAgentPrimitives`,
  `readCanvasAgentContextFile`, `readCanvasAgentTranscript`,
  `readCanvasAgentDebug` (:207-252).
- Workspace native: `readAgentNativeManifest`,
  `readAgentNativeWorkspaceManifest`, `…/State`, `…/Events`, `…/Debug`
  (:316-388).
- Project file lifecycle: `listProjectCanvasFiles`,
  `openProjectCanvasFile`, `createProjectCanvasFile`,
  `saveProjectCanvasFile`, `updateProjectCanvasFileMetadata`,
  `moveProjectCanvasFile`, `duplicateProjectCanvasFile`,
  `deleteProjectCanvasFile`, `importProjectCanvasHtmlBundle`,
  `scanProjectCanvasHtmlBundles` (:390-502).
- Web-native edit transport: `loadCanvasSourceFile`, `readCanvasHtmlNode`,
  `updateCanvasHtmlNode`, `updateCanvasMarkdownDocument`,
  `listDesignTokens`, `updateDesignToken`, `createComponentFromSource`,
  `promoteSubtreeToComponent` (:504-592).
- Sync: `readProjectSyncTarget`, `detectProjectComponentsDir`,
  `syncProjectToTarget` (:600-631).
- Screenshots: `captureWorkspaceScreenshot`,
  `captureCanvasItemsScreenshot` (:725-746).
- Queue: `enqueueAgentNativeWorkspaceOperation` (:656),
  `enqueueCanvasAgentOperation` (:748) — file-based result wait.

### Docs (`docs/CANVAS_AGENT_MCP_COMMANDS.md`)

The doc enumerates Canvas Tools at lines 86–125; the doc explicitly claims
"Direct-manipulation parity audit (v3, complete)" at lines 173–181 covering
overlay drag, group resize, media crop/clip, mermaid label.

### Agent-surface drift

Cross-checking the three places the agent surface is published:

| Tool | Manifest | MCP server | Docs |
|---|---|---|---|
| `get_workspace_manifest` | no (handled outside per-surface manifest) | yes (`:84`) | yes ("Global MCP Tools") |
| `get_surface_manifest` | implicit (`buildWorkspaceManifest`) | yes (`:93`) | yes |
| `list_design_tokens` / `update_design_token` | **missing from manifest tools** | yes (`:277,288`) | yes |
| `read_html_node` / `update_html_node` | **missing from manifest tools** | yes (`:304,320`) | yes |
| `create_component_from_html` / `create_component_from_tsx` | **missing from manifest tools** | yes (`:473,522`) | yes |
| `promote_to_component` | **missing from manifest tools** | yes (`:504`) | yes |
| `get_canvas_context` | **missing from manifest tools** | yes (`:880`) | yes |
| `get_canvas_state` / `get_canvas_selection` | implicit via resources only | yes (`:890,899`) | yes |
| `list_primitives` / `get_primitive` | **missing from manifest tools** | yes (`:917,938`) | yes |
| `create_artboard` | **missing from manifest tools** | yes (`:950`) | yes |
| `create_primitive_item` | **missing from manifest tools** | yes (`:1074`) | yes |
| `export_board` | **missing from manifest tools** | yes (`:1271`) | yes |
| `cycle_component_variant` | yes (`:215`) | yes (`:378`) | yes |
| `sync_to_project` | yes (`:183`) | yes (`:1038`) | yes |
| `create_native_component_shell` | yes (`:170`) | yes (`:979`) | yes |
| `replace-html-bundle` prompt | n/a (prompts) | yes (`:1473`) | yes |
| `clear_canvas` | yes (`:289`) | yes (`:1262`) | yes |

In short: **the manifest's `tools:` array is a substantial subset of what the
MCP server actually exposes.** The manifest is what an agent reads when it
follows the documented `workspace://manifest` discovery flow, so any agent
strictly using the manifest as its capability list will under-discover by
roughly a dozen tools.

## Coverage matrix

| Surface | Operation | UI trigger | Agent tool | Coverage | Evidence |
|---|---|---|---|---|---|
| Workspace selection | Marquee selection | `CanvasWorkspace.tsx:617,677` | `select_items` | partial | UI does spatial test; agent must already know ids (`bin/canvas-mcp-server:1209`). |
| Workspace selection | Click item to select | per-item `onMouseDown` | `select_items` | full | Same `selectedIds` state path. |
| Workspace selection | Shift-add to selection | `CanvasWorkspace.tsx:681` | `select_items` | full | Agent passes the merged id list. |
| Workspace selection | Clear selection | `CanvasWorkspace.tsx:688` | `select_items` (empty array) | full | |
| Workspace selection | Escape closes panels / clears | `CanvasTab.tsx:2309` | — | n/a | Inherently UI keyboard. |
| Viewport | Pan via space-drag / middle / wheel | `CanvasWorkspace.tsx:152,196,609` | `set_canvas_viewport` | partial | Agent sets `scale` + `offset`; gesture nuance is UI-only (`bin/canvas-mcp-server:1224`). |
| Viewport | Zoom in / out / reset | `CanvasToolbar.tsx:167-225` | `set_canvas_viewport` | full | Same workspace transform. |
| Viewport | Fit all in view | `CanvasToolbar.tsx:202` | `focus_canvas_items` | partial | Agent supplies ids; UI "fit all" sums all top-level. Listing all ids first gives parity (`bin/canvas-mcp-server:1244`). |
| Toolbar toggles | Sidebar / scenes / layers / library / theme / copilot / help | `CanvasToolbar.tsx:151..541` | — | n/a | Pure panel visibility. |
| Item geometry | Drag to move | per-item `handleMouseDown` | `update_item` (`position`) | full | The pointer drag commits via `updateItem` which mirrors the agent path (`bin/canvas-mcp-server:1146`). |
| Item geometry | Resize via handle | per-item `handleResizeStart` | `update_item` (`size`) | full | Same item-patch shape. |
| Item geometry | Rotate via handle | per-item `handleRotateStart` | `update_item` (`rotation`) | full | Same. |
| Item geometry | Crop drag (image) | `CanvasMediaItem.tsx:391` | `update_media_crop` | full | Doc calls out parity (`docs/CANVAS_AGENT_MCP_COMMANDS.md:165`). |
| Item geometry | Clip drag (video) | `CanvasMediaItem.tsx:402` | `update_media_crop` | full | Same. |
| Add | Add artboard (toolbar) | `CanvasTab.tsx:3406` | `create_artboard` / `create_item` | full | `bin/canvas-mcp-server:950`. |
| Add | Add native component (toolbar + dialog) | `CanvasTab.tsx:2662` | `create_native_component_shell` | full | File-backed parity guaranteed (`utils/canvasAgentOperations.mjs:419` → same `/api/canvas/component/create`). |
| Add | Add HTML bundle from files / folder upload | `CanvasTab.tsx:2402` | `import_html_bundle` (file payload via `bundle.files[].textContent`) | full | `bin/canvas-mcp-server:248`; doc note `:209-211`. |
| Add | Add HTML bundle from directory path | `CanvasTab.tsx:2804` | `import_html_bundle` (with `directoryPath`/`entryFile`) | full | Same endpoint. |
| Add | Add inline HTML / React | `CanvasTab.tsx:2488` | `create_item` (html + `sourceMode`) | full | Doc: "inline HTML nodes can also be created directly with `create_item`". |
| Add | Add component from paste dialog | `CanvasTab.tsx:2752` | `create_component_from_html` / `create_component_from_tsx` | full | Same `/api/canvas/component/create`. |
| Add | Drag primitive from library onto board | `CanvasTab.tsx:4047` | `create_primitive_item` / `create_item` | full | Same item type. |
| Add | Cycle component variant (←/→) | `CanvasTab.tsx:1368` | `cycle_component_variant` | full | Same clamp + `customProps` clear (manifest description). |
| Add | Add embed by URL | `CanvasTab.tsx:2370` | `create_item` (embed) | full | Plain item create. |
| Add | Add media file (drop/paste) | `CanvasTab.tsx:3234,3257` | `create_item` (media) | partial | Agent must supply `src` (URL or data URI); UI does file→blob conversion that the agent has no convenience helper for. |
| Add | Add mermaid | `CanvasTab.tsx:3039` | `create_item` (mermaid) | full | |
| Add | Add markdown | `CanvasTab.tsx:3073` | `create_item` (markdown) | full | |
| Add | Add excalidraw | `CanvasTab.tsx:3111` | `create_item` (excalidraw) | full | |
| Add | Import diagram file (drop) | `CanvasTab.tsx:3148` | `create_item` (per kind) | partial | Agent must parse the file itself; no `import_diagram_file` wrapper. Low priority. |
| Add | Convert mermaid → excalidraw | `CanvasTab.tsx:3195` | — | **missing** | Server-side mermaid→excalidraw conversion is not exposed; agent would have to write a new excalidraw item with a hand-built scene. |
| Add | Open Color Canvas | `CanvasTab.tsx:3442` | `create_canvas_file` (color-audit) + `open_canvas_file` | partial | Agent can create+open a color-audit document but the on-canvas "summon the named artboard" path is UI-specific. n/a-borderline. |
| Add | Import from Paper | `CanvasTab.tsx:2178` | — | n/a | External MCP integration; out of scope of this audit. |
| Selection | Duplicate selection | `CanvasTab.tsx:2339` | — | **missing** | No `duplicate_items` tool; agent must `get_canvas_state` + craft `create_items` with offset positions. |
| Selection | Delete selection | `CanvasTab.tsx:2303` | `delete_items` | full | Cascading delete in both paths (`utils/canvasAgentOperations.mjs:43`). |
| Selection | Group selection | `CanvasTab.tsx:2322` | `create_group` | full | Manifest `:191`. |
| Selection | Ungroup | `CanvasTab.tsx:2329` | `delete_group` | full | Items keep ids; manifest `:252`. |
| Selection | Move selection into artboard | `CanvasTab.tsx:1858` | `update_item` (set `parentId`) | partial | Agent must update each item's `parentId` + `order` itself; no single-call helper. |
| Selection | Wrap selection in section | `CanvasTab.tsx:1923` | `create_item` (section) + N `update_item` | partial | No `wrap_selection_in_section` tool. |
| Selection | Bring to front / send to back | context menu via `useCanvasItemContextMenu` | `update_item` (`zIndex`) | partial | Agent must compute next/min zIndex itself. |
| Selection | Move layer up / down | `CanvasTab.tsx:2345` | `update_item` (`order`) | partial | Agent must compute sibling `order` swap. |
| Selection | Clear canvas | `CanvasToolbar.tsx:442` | `clear_canvas` | full | Manifest `:289`. |
| Artboard | Edit name | `CanvasArtboardPropsPanel.tsx:268` | `update_item` (`name`) | full | |
| Artboard | Edit background | `:279,286` | `update_item` (`background`) | full | |
| Artboard | Apply theme preset | `:247` | `update_item` (`themeId`) | full | |
| Artboard | Toggle layout display | `:543` | `update_artboard_layout` | full | Manifest `:221`. |
| Artboard | Set direction / align / justify / columns / gap / padding | `:571..742` | `update_artboard_layout` | full | Same. |
| Artboard | On-canvas gap scrub | `CanvasArtboardItem.tsx:176` | `update_artboard_layout` (`gap`) | full | Direct-manipulation parity (doc :180). |
| Artboard | Section width/height mode | `:611-680` | `update_item` (size + mode) | partial | No dedicated `update_section_sizing` tool; agent edits raw fields. |
| Native shell | Insert slot starter | `CanvasHtmlPropsPanel.tsx:885` | `insert_native_slot_part` (variant) / `apply_structural_mutation` | partial | The MCP tool covers "part" insertion; the panel's "starter" picks a different starter element. Agent reaches parity via `apply_structural_mutation` `insertChild`. |
| Native shell | Insert slot component (registry primitive into slot) | `CanvasHtmlPropsPanel.tsx:908` | `apply_structural_mutation` (`insertChild` with rendered primitive HTML) | partial | No `insert_slot_component` shortcut; agent must serialize the primitive HTML itself. |
| Native shell | Insert native part (div/section/button/heading/paragraph/link/image/svg/video) | `CanvasHtmlPropsPanel.tsx:928` | `insert_native_slot_part` | full | Same source patcher (doc `:171`). |
| Native shell | Apply slot metadata (data-slot / data-slot-kind / data-slot-accepts) | `CanvasHtmlPropsPanel.tsx:976` | `apply_structural_mutation` (3× `setAttribute`) | partial | No single `update_slot_metadata` tool, but trivial via raw mutation. |
| Native shell | Replace HTML bundle in place | `CanvasTab.tsx:2887` | `import_html_bundle` (with `targetItemId`) | full | Doc `:75`. |
| Native shell | Load .tsx from path | `CanvasHtmlPropsPanel.tsx:804` | `loadCanvasSourceFile` (runtime helper, not exposed as MCP tool directly) | partial | Runtime helper exists (`bin/canvas-agent-runtime.mjs:504`) but no MCP tool surfaces it — agents use `read_html_node` which has a `filePath` branch. |
| Native shell | Flip sourceMode | `CanvasHtmlPropsPanel.tsx:1095` | `update_item` (`sourceMode`) | full | |
| Native shell | Edit title / sandbox / background / src / sourceHtml / sourceReact / sourceCss | various onChange | `update_item` | full | |
| Native shell | Sync to project (component) | `CanvasHtmlPropsPanel.tsx:1047` → `canvasSyncWiring.ts:336` | `sync_to_project` | full | Same `/api/canvas/project/sync` pipeline + same allowlist (`utils/canvasAgentOperations.mjs:447`). |
| Native shell | Sync to project (artboard page) | same path with artboard selection | `sync_to_project` (selection by artboard id) | full | `resolveSyncSelectionFromState` in `utils/canvasAgentOperations.mjs:529`. |
| Native shell | Format toggle html / html+tsx | `CanvasHtmlPropsPanel.tsx:533-541` | `sync_to_project` `format` arg | full | Same wire field. |
| Native shell | Edit / re-pick componentsDir | `CanvasHtmlPropsPanel.tsx:617,632,650` | `sync_to_project` `componentsDir` arg | full | Override flows to same endpoint. |
| Native shell | Browse hint (folder picker) | `CanvasHtmlPropsPanel.tsx:465` | — | n/a | Agent has no folder picker by design; allowlist enforced server-side (`utils/canvasAgentOperations.mjs:430-447`). |
| Native shell | Persist sync mapping (first sync) | `canvasSyncWiring.ts:165` | — | partial | Mapping is created **only** by the UI's first sync. An agent can't bootstrap a mapping; subsequent agent syncs reuse it. Intentional and documented (`utils/canvasAgentOperations.mjs:411-446`). |
| Element edit (HTML) | Click element on canvas → select for editing | `CanvasHtmlFrame.tsx` iframe selection | `get_canvas_selection` + `read_html_node` | full | Same canvasId/sourceId shape. |
| Element edit (HTML) | Insert child inside top / bottom | `CanvasReactNodePropertyPanel.tsx:604,612` | `apply_structural_mutation` (`insertChild`) | full | Same AST writer (`docs/CANVAS_AGENT_MCP_COMMANDS.md:161`). |
| Element edit (HTML) | Insert sibling above / below | `:620,628` | `apply_structural_mutation` (`insertChild` on parent) | partial | Agent must compute parent canvasId + index itself (`getCanvasIdRelation` is UI-only). |
| Element edit (HTML) | Wrap selection | `:809` | `apply_structural_mutation` (`wrapSelection`) | full | |
| Element edit (HTML) | Swap tag | `:827` | `apply_structural_mutation` (`swapTag`) | full | |
| Element edit (HTML) | Reorder sibling up / down | `:838,846` | `apply_structural_mutation` (`reorderSibling`) | full | |
| Element edit (HTML) | Insert child (raw source + position) | `:874` | `apply_structural_mutation` (`insertChild`) | full | |
| Element edit (HTML) | Unwrap | `:893` | `apply_structural_mutation` (`unwrap`) | full | |
| Element edit (HTML) | Delete node | `:901` | `apply_structural_mutation` (`removeNode`) | full | |
| Element edit (HTML) | Edit attribute / className | `:932,938` | `update_html_node` (`setAttribute` / `setClassName`) | full | Same writer (`bin/canvas-mcp-server:320`). |
| Element edit (HTML) | Edit text content | `:1041` | `update_html_node` (`setTextChild`) | full | Same writer. |
| Element edit (HTML) | Replace selected contents from source URL | `:597` | `apply_structural_mutation` (`replaceChildren`) | full | Same. |
| Element edit (HTML) | Iframe library-drop INSERT | `CanvasHtmlFrame.tsx:591`, `CanvasTab.tsx:1147` | `apply_structural_mutation` (`insertChild` with primitive HTML) | partial | Doc claims parity (`docs/CANVAS_AGENT_MCP_COMMANDS.md:177`); requires the agent to serialize the primitive itself. |
| Element edit (HTML) | Iframe library-drop WRAP | `CanvasHtmlFrame.tsx:598`, `CanvasTab.tsx:1158` | `apply_structural_mutation` (`wrapSelection`) | partial | Same as above. |
| Element edit (HTML) | Overlay move drag | `CanvasIframeOverlay.tsx:151` | `update_html_node` (`setClassName`) / `apply_structural_mutation` | partial | Doc explicitly accepts this as parity-by-design (`docs/CANVAS_AGENT_MCP_COMMANDS.md:177`). |
| Element edit (HTML) | Overlay resize drag | `CanvasIframeOverlay.tsx:174` | `update_html_node` (`setClassName` + style `setAttribute`) | partial | Same. |
| Element edit (HTML) | Multi-select group resize | `CanvasTab.tsx:1426` | N×`update_html_node` | partial | Doc note `:180`: agent calls N writes; no batch tool. |
| Element edit (HTML) | Undo / redo source mutation (⌘Z / ⌘⇧Z) | `CanvasTab.tsx:1340-1356` | — | **missing** | No `undo_source_mutation` MCP tool. Agent can re-write to the previous snapshot if it kept one, but the UI's mutation log is in-process only. |
| Media | Edit src / kind / fit / title / alt / poster | `CanvasMediaPropsPanel.tsx:102..173` | `update_item` | full | |
| Media | Toggle controls / autoplay / muted / loop | `CanvasMediaPropsPanel.tsx:184..208` | `update_media_crop` (booleans branch) or `update_item` | full | Manifest `:227` calls out playback booleans. |
| Media | Edit clipStartSec / clipEndSec via inspector | `:231,247,260,272` | `update_media_crop` | full | Same. |
| Mermaid | Inline-edit node label on rendered SVG | `CanvasMermaidItem.tsx:247` | `update_mermaid_label` | full | Doc `:166` calls out full parity. |
| Mermaid | Edit title / theme / background / source | `CanvasMermaidPropsPanel.tsx:72-166` | `update_item` | full | |
| Mermaid | Reset to starter source | `:158` | `update_item` (`source`) | full | |
| Mermaid | Convert to Excalidraw | `:116` | — | **missing** | Server-side mermaid→excalidraw converter (`mermaidToExcalidraw`) is not exposed via MCP. |
| Markdown | Edit one block | `CanvasMarkdownItem.tsx:115` | `update_markdown_block` (`action:update`) | full | Same writer (manifest `:209`). |
| Markdown | Reorder block up / down | `:153` and preview buttons | `update_markdown_block` (`action:reorder`) | full | Same. |
| Markdown | Insert / delete a new block | — (only editing existing) | `update_markdown_block` (`action:insert` / `delete` if supported by writer) | partial | Writer is invoked by `updateCanvasMarkdownDocument` with optional `action`, but the UI panel only exposes update/reorder. Inspect `utils/canvasAgentOperations.mjs` and writer endpoint to confirm — currently the manifest tool description (`:209`) is narrower than what an insert would require. |
| Markdown | Append starter mermaid block | `CanvasMarkdownPropsPanel.tsx:102` | `update_item` (`source` concat) | full | |
| Markdown | Reset to starter | `:109` | `update_item` | full | |
| Markdown | Edit title / background / source | `:77,90,120` | `update_item` | full | |
| Embed | Edit url / title / allow / sandbox / preview mode | `CanvasEmbedPropsPanel.tsx:160-222` | `update_item` | full | |
| Embed | Check frame policy | `:247` | — | **missing** | Frame-policy probing only runs in browser. |
| Embed | Capture snapshot (desktop/mobile/both) | `:277` | — | **missing** | No `capture_embed_snapshot` MCP tool; only `capture_canvas_items_screenshot` exists. |
| Embed | Refresh snapshot | `:345` | — | **missing** | Same. |
| Embed | Start / stop live session | `:381,390` | — | **missing** | Live preview lifecycle is browser-only. |
| Embed | Request embed state | `:426` | — | **missing** | Internal event; no MCP equivalent. |
| Excalidraw | Edit title / scene / sourceMermaid | `CanvasExcalidrawPropsPanel.tsx:80,93` | `update_item` (whole `scene` object) | partial | Agent can replace `scene` wholesale but has no scene-builder. |
| Excalidraw | Remap from Mermaid | `:119` | — | **missing** | Same converter not exposed (see Mermaid). |
| Excalidraw | In-canvas drawing tool | `CanvasExcalidrawViewport` | — | n/a | UI-only pen/shape tool. |
| Theme | Switch active theme | `CanvasThemePanel.tsx:209` | `get_canvas_themes` (read) | partial | Read tool exists; **no `set_active_theme` write tool**. Agent must mutate workspace state through canvas-file save, which doesn't toggle the in-browser active theme. |
| Theme | Add a new theme by label | `:245` | — | **missing** | No `create_theme` tool. |
| Theme | Edit theme CSS var (in-memory override) | `:352 onUpdateThemeVar` | — | **missing** | No `update_theme_var` tool — only project tokens.css writes via `update_design_token`. |
| Theme | Edit project `tokens.css` value | `:352 writeProjectToken` | `update_design_token` | full | Same endpoint (`bin/canvas-mcp-server:288`). |
| Theme | Refresh project tokens | `:298` | `list_design_tokens` | full | |
| Theme | Open Color Canvas | `:271` | `create_canvas_file` (color-audit) + `open_canvas_file` | partial | See above. |
| Canvas-file lifecycle | List | sidebar | `list_canvas_files` | full | |
| Canvas-file lifecycle | Open | `CanvasTab.tsx:3513` | `open_canvas_file` | full | |
| Canvas-file lifecycle | Create | `:3554` + modal | `create_canvas_file` | full | |
| Canvas-file lifecycle | Save (incl. asset pack) | `:3565` | `save_canvas_file` | full | Doc `:62`. |
| Canvas-file lifecycle | Toggle favorite / archive | `:3574` | `update_canvas_file_metadata` | full | |
| Canvas-file lifecycle | Rename / move | `:3598` | `move_canvas_file` | full | |
| Canvas-file lifecycle | Duplicate | `:3614` | `duplicate_canvas_file` | full | |
| Canvas-file lifecycle | Delete | `:3630` | `delete_canvas_file` | full | Destructive in both. |
| Canvas-file lifecycle | Scan local HTML bundles | `CanvasSidebar.tsx:823` `handleScanHtmlBundleLibrary` | `scan_html_bundles` | full | Same `/api/.../html-bundles`. |
| Canvas-file lifecycle | Import HTML bundle into a file | sidebar pick + sync | `import_html_bundle` | full | Same. |

### Counts

- UI operations rated: **101**
- `full`: **54**
- `partial`: **27**
- `missing`: **12**
- `n/a` (UI-only by design): **8**

## Findings — drift between manifest, runtime, docs

- **Manifest under-publishes the Canvas tool surface.** ~13 MCP-server tools
  are not listed in `AGENT_NATIVE_WORKSPACE_DEFINITIONS["canvas"].tools`:
  `get_workspace_manifest`, `get_surface_manifest`, `list_design_tokens`,
  `update_design_token`, `read_html_node`, `update_html_node`,
  `create_component_from_html`, `create_component_from_tsx`,
  `promote_to_component`, `get_canvas_context`, `get_canvas_state`,
  `get_canvas_selection`, `list_primitives`, `get_primitive`,
  `create_artboard`, `create_primitive_item`, `export_board`. Agents that
  follow the documented "start with workspace://manifest" guidance will not
  see them. The MCP commands doc (`docs/CANVAS_AGENT_MCP_COMMANDS.md:86-125`)
  does list them, so the doc is the more accurate source — the manifest is
  drifting behind. Fix: extend the manifest's `tools:` array to mirror what
  `bin/canvas-mcp-server` actually registers.
- **`replace-html-bundle` is a prompt with no matching manifest entry.**
  Registered at `bin/canvas-mcp-server:1473`; absent from manifest `prompts:`
  array. Doc mentions it (`docs/CANVAS_AGENT_MCP_COMMANDS.md:333`). Same fix
  as above.
- **`apply_structural_mutation` is a single tool with seven sub-mutations.**
  Manifest description (`utils/agentNativeManifest.ts:203`) hides the
  vocabulary; the doc (`docs/CANVAS_AGENT_MCP_COMMANDS.md:161`) is the only
  place that enumerates `insertChild` / `removeNode` / `reorderSibling` /
  `wrapSelection` / `unwrap` / `swapTag` / `setTextChild` /
  `replaceChildren`. Discoverability gap.
- **Direct-manipulation parity claim is half-true.** The doc claims "every
  on-canvas direct-manipulation affordance an agent might need is reachable
  via an MCP tool" (`docs/CANVAS_AGENT_MCP_COMMANDS.md:175`). This is true
  for U4a/U4b overlay drag, U8 media crop/clip, U10 mermaid label, U12 group
  resize — but is **not** true for: duplicate selection, undo / redo source
  mutation, mermaid→excalidraw conversion, theme switching / theme CSS var
  edits, embed snapshot capture / live session, "wrap selection in section",
  "move selection into artboard". The doc claim should be narrowed to
  "direct-manipulation HTML editing affordances".
- **`runtime` helper `loadCanvasSourceFile` (`bin/canvas-agent-runtime.mjs:504`)
  has no MCP tool wrapper.** Its functionality is folded into `read_html_node`'s
  `filePath` branch, but agents reading the runtime adapters might assume a
  direct tool. Not a bug; worth noting.
- **`update_markdown_block` description (`utils/agentNativeManifest.ts:209`)
  says "patch or reorder", but `updateCanvasMarkdownDocument`
  (`bin/canvas-agent-runtime.mjs:541`) also accepts `insert` / `delete` via
  `action`.** Manifest text undercounts the capability.

## Fixes plan (for genuine gaps)

### P1

- **Operation:** Undo / redo source mutation (⌘Z / ⌘⇧Z)
  **Why it matters:** Agents that run several `apply_structural_mutation`
  or `update_html_node` calls in a row have no recovery path other than a
  rebuild-from-snapshot. The UI's `mutationLogState` (`CanvasTab.tsx:1183`)
  is the authority for source-edit history.
  **Proposed tool:** `undo_source_mutation` / `redo_source_mutation`.
  Contract: `{ scope: "active-file" | "log-entry", logEntryId?: string }`.
  Slots into `bin/canvas-mcp-server` next to `apply_structural_mutation`,
  delegates to a new runtime helper that calls the existing AST writer
  with the snapshot in `mutationLogState`. Manifest: add to canvas tools.
  Doc: add to "Canvas Tools".
  **Priority:** P1.

- **Operation:** Duplicate selection
  **Why it matters:** "Duplicate" is one of the three primary toolbar
  actions; missing it forces agents to round-trip through `get_canvas_state`
  + manual `create_items` with offset positions. Frequent direct action.
  **Proposed tool:** `duplicate_items`. Contract:
  `{ ids: string[], offset?: { dx, dy }, select?: boolean }`. Returns new
  ids. Slots into `bin/canvas-mcp-server` after `delete_items`, runtime
  helper does the same in-place ID/offset rewrite the UI's
  `duplicateSelected` does. Manifest + doc add.
  **Priority:** P1.

- **Operation:** Set active theme
  **Why it matters:** `get_canvas_themes` exists but the agent has no
  paired write — switching themes is a fundamental Canvas operation
  (`CanvasThemePanel.tsx:209`). Without it, agents cannot exercise the
  theme dimension of any board they author.
  **Proposed tool:** `set_canvas_active_theme`. Contract:
  `{ themeId: string }`. Slots into `bin/canvas-mcp-server` next to
  `get_canvas_themes`, queues a theme-state operation. Manifest + doc add.
  **Priority:** P1.

### P2

- **Operation:** Move selection into artboard (re-parent in one call)
  **Why it matters:** Today the agent has to `get_canvas_state`, compute
  `order` from siblings, and N-times `update_item` with `parentId` + `order`.
  It's the most-used compositional move in the UI.
  **Proposed tool:** `move_items_into_artboard`. Contract:
  `{ ids: string[], artboardId: string }`. Runtime helper mirrors
  `handleMoveSelectionToArtboard` (`CanvasTab.tsx:1858`).
  **Priority:** P2.

- **Operation:** Wrap selection in section
  **Why it matters:** Same as above for the "wrap in section" affordance
  (`handleWrapSelectionInSection`, `CanvasTab.tsx:1923`). One agent call
  beats orchestrating create + N re-parents.
  **Proposed tool:** `wrap_items_in_section`. Contract:
  `{ ids: string[], section?: Partial<SectionItem> }`.
  **Priority:** P2.

- **Operation:** Convert mermaid → excalidraw
  **Why it matters:** `convertMermaidSourceToExcalidrawScene` is a
  server-side capability used by `handleConvertMermaidToExcalidraw`
  (`CanvasTab.tsx:3195`) and `onRemapFromMermaid`. Agents that author
  mermaid diagrams cannot promote them to Excalidraw without an HTTP
  endpoint.
  **Proposed tool:** `convert_mermaid_to_excalidraw`. Contract:
  `{ source: string }` → `{ scene }`. Optional `{ itemId?, keepOriginal? }`
  if the call should also queue the canvas item swap.
  **Priority:** P2.

- **Operation:** Bring to front / send to back + Move layer up / down
  **Why it matters:** zIndex/order management are documented UI operations
  but require agents to compute next/min zIndex themselves; mistakes cause
  invisible items.
  **Proposed tool:** `reorder_layer`. Contract:
  `{ id: string, direction: "front" | "back" | "up" | "down" }`. Maps to
  workspace `bringToFront` / `sendToBack` / `handleMoveLayer`.
  **Priority:** P2.

- **Operation:** Insert / delete markdown block (not just update / reorder)
  **Why it matters:** The runtime writer already supports `action: "insert"`
  and `action: "delete"` (`bin/canvas-agent-runtime.mjs:541-553`), but the
  MCP tool description does not advertise it. UI also lacks a dedicated
  "add block" button today, but agents authoring markdown need it.
  **Proposed tool:** Extend `update_markdown_block` description + verify
  the writer actually accepts those actions; add doc note.
  **Priority:** P2.

- **Operation:** Set canvas tool (select / edit / interact)
  **Why it matters:** `canvasTool` (`CanvasToolbar.tsx:299-330`) gates
  whether iframe content is interactive vs editable. A screenshot taken in
  the wrong mode misses live interactions. Today agents cannot toggle it.
  **Proposed tool:** `set_canvas_tool`. Contract:
  `{ tool: "select" | "edit" | "interact" }`.
  **Priority:** P2.

### P3

- **Operation:** Add / edit / delete theme + theme CSS var (in-memory)
  **Why it matters:** `onAddTheme` and `onUpdateThemeVar`
  (`CanvasThemePanel.tsx:245,352`) are the in-canvas theming surface
  (separate from project `tokens.css`). Authoring multi-theme demos
  through an agent is impossible without it.
  **Proposed tool:** `create_canvas_theme`, `update_canvas_theme_var`,
  `delete_canvas_theme`. Contracts mirror the inspector. Slots beside
  `get_canvas_themes`.
  **Priority:** P3.

- **Operation:** Embed snapshot capture + frame policy probe
  **Why it matters:** Visible in `CanvasEmbedPropsPanel.tsx:247,277,345`.
  Useful for agents auditing third-party embed coverage at scale.
  **Proposed tool:** `capture_embed_snapshot` /
  `check_embed_frame_policy`. Contract: `{ itemId, target, provider }` and
  `{ itemId }`. Reuses the existing `handleCaptureEmbedSnapshots` pipeline.
  **Priority:** P3.

- **Operation:** Section width/height mode (`fill` / `fit` / `fixed`)
  **Why it matters:** Currently agents toggle modes by editing raw fields
  on a section item (`CanvasArtboardPropsPanel.tsx:611-680`). A dedicated
  helper avoids field-naming drift.
  **Proposed tool:** `update_section_sizing`. Contract:
  `{ itemId, widthMode?, heightMode?, width?, height? }`. Low-impact.
  **Priority:** P3.

- **Operation:** Insert slot starter / Insert slot component
  **Why it matters:** Two of three slot-insertion affordances in the
  inspector are not on the agent path one-for-one
  (`CanvasHtmlPropsPanel.tsx:885,908`). `insert_native_slot_part` covers
  parts; starters and registry-component insertion are reachable through
  raw `apply_structural_mutation` but require the agent to hand-build HTML.
  **Proposed tool:** Extend `insert_native_slot_part` to take an optional
  `componentId` (insert primitive serialization) and an optional
  `starter: "default" | "card" | "form"` (slot-aware starter snippet).
  **Priority:** P3.

## Open questions

- **`update_media_crop` booleans branch.** Manifest description
  (`utils/agentNativeManifest.ts:227`) says "playback / display booleans"
  — does the writer accept `{ controls, autoplay, muted, loop }` as a
  single update, or does the agent need separate `update_item` calls? I
  did not open the writer endpoint; rate-as-`full` for inspector parity
  relies on the manifest's claim.
- **`update_markdown_block` actions.** The writer (`bin/canvas-agent-runtime.mjs:541`)
  accepts `action`, `blockIndex`, `newText`, `fromIndex`, `toIndex`. Insert /
  delete actions are plausibly supported by the underlying writer but I did
  not verify against `/api/canvas/markdown/write`. Rated `partial` rather
  than `missing` accordingly.
- **`canvas-layout-review` prompt.** Manifest publishes it
  (`utils/agentNativeManifest.ts:316`), MCP server registers it
  (`bin/canvas-mcp-server:1448`), doc lists it
  (`docs/CANVAS_AGENT_MCP_COMMANDS.md:323`). Could not assess whether the
  prompt body actually mentions the gaps above; it likely needs an update
  if the new P1/P2 tools land.
- **Iframe library-drop INSERT/WRAP rating.** Counted as `partial` because
  although `apply_structural_mutation` covers it, the registry-serialization
  step is unique to the UI's drag handler — there's no agent helper that
  takes a `componentId` and returns its rendered HTML. Borderline `missing`
  vs `partial`; left at `partial` per the audit rubric.
- **Move artboards / reorder artboards at the top level.** Top-level
  artboard zIndex is reachable through `update_item` `{ zIndex }` but I did
  not find a dedicated tool. Mentioned but not promoted to a fix entry.
