# Canvas with Agent Report

Date: February 23, 2026
Workspace: `/Users/strongeron/Evil Martians/Open Source/gallery-poc`

## 1. Goal

Define what already exists in the current Canvas system, and what options we have to evolve it into an **agentic canvas** that can:

- Stream UI/web elements into canvas
- Stream AI agent session output into canvas
- Save/replay sessions
- Show maps, sections, and rich assets (embed/media/components)

## 2. Current Canvas Capabilities (Implemented)

### 2.1 Core canvas model

Current item types:

- `component`
- `embed`
- `media`
- `artboard`

The model already supports:

- Parent/child relationship (`parentId`) for artboard layout composition
- Layering (`zIndex`)
- Grouping (`groupId`)
- Rotation/size/position
- Rich embed metadata (frame policy, snapshot/live/capture/state)
- Rich media metadata (source provider, clip start/end, playback flags)

Source: `types/canvas.ts`

### 2.2 Editing and interaction

Canvas editing already includes:

- Drag, resize, rotate for component/embed/media/artboard
- Multi-select and box-select
- Shift-click additive selection
- Group/ungroup
- Duplicate and delete
- Bring-to-front
- Context menu actions (`fit to content`, `duplicate`, `bring to front`, `delete`)

Sources:

- `components/canvas/CanvasWorkspace.tsx`
- `components/canvas/CanvasItem.tsx`
- `components/canvas/CanvasEmbedItem.tsx`
- `components/canvas/CanvasMediaItem.tsx`
- `components/canvas/CanvasArtboardItem.tsx`
- `components/canvas/CanvasContextMenu.tsx`

### 2.3 Viewport and shortcuts

Implemented:

- Zoom in/out/reset
- Fit-to-view
- Pan (wheel or space+drag)
- Keyboard shortcuts for selection, grouping, scenes, help, etc.

Sources:

- `hooks/useCanvasTransform.ts`
- `hooks/useCanvasShortcuts.ts`

### 2.4 Sidebar ingestion and operations

Implemented in sidebar:

- Add embed by URL
- Add media by URL
- Add media by file upload
- Localhost app discovery + add selected local app embed
- Component search + drag variants to canvas
- Project switcher
- Import queue display (Paper import)

Source: `components/canvas/CanvasSidebar.tsx`

### 2.5 Embed system

Implemented:

- Preview mode selection: `auto | iframe | snapshot | live`
- Iframe policy preflight
- Snapshot fallback
- URL capture pipeline (desktop/mobile)
- Live session integration endpoint
- Embed state sync over `postMessage` (`getState` / `setState`)

Sources:

- `components/canvas/CanvasEmbedPropsPanel.tsx`
- `components/canvas/CanvasEmbedItem.tsx`
- `components/canvas/embedPreviewService.ts`
- `components/canvas/embedFramePolicy.ts`

### 2.6 Media system

Implemented:

- Local media upload to `.canvas-media`
- Proxy for remote media URLs
- YouTube/Vimeo embed normalization for media playback
- Video playback options: controls/autoplay/muted/loop
- Clip range support (`clipStartSec`, `clipEndSec`)
- Fallback to local-session blob for oversized files

Sources:

- `components/canvas/mediaStorageService.ts`
- `components/canvas/mediaUrl.ts`
- `components/canvas/CanvasMediaItem.tsx`
- `components/canvas/CanvasMediaPropsPanel.tsx`

### 2.7 Scenes and persistence

Implemented:

- Save scene
- Load scene
- Rename
- Duplicate
- Export JSON
- Import JSON
- Clear all scenes
- IndexedDB storage + local fallback

Sources:

- `hooks/useCanvasScenes.ts`
- `components/canvas/CanvasScenesPanel.tsx`
- `components/canvas/CanvasTab.tsx`

### 2.8 Artboards, sections, and layout

Implemented:

- Artboard nodes
- Artboard layout modes: `flex` and `grid`
- Layout parameters: direction, align, justify, columns, gap, padding
- Artboard-specific theme assignment
- Layers panel grouping by artboard + freeform layers

Sources:

- `components/canvas/CanvasArtboardItem.tsx`
- `components/canvas/CanvasArtboardPropsPanel.tsx`
- `components/canvas/CanvasLayersPanel.tsx`

### 2.9 Theming and token tooling

Implemented:

- Theme registry and active theme switching
- Theme token override editing
- Add custom themes
- Open color canvas entry point
- APCA token-pair audit display and live DOM audit pairs in artboard inspector

Sources:

- `hooks/useThemeRegistry.ts`
- `components/canvas/CanvasThemePanel.tsx`
- `components/canvas/CanvasArtboardPropsPanel.tsx`

### 2.10 Color Canvas (separate but reusable concept)

Implemented concepts we can reuse for agentic mapping:

- Graph model: nodes + edges
- Edge types: `map` and `contrast`
- Relative color node system
- Auto contrast rules
- Session save/new/clear/delete
- Inspector + audit modes

Sources:

- `types/colorCanvas.ts`
- `hooks/useColorCanvasState.ts`
- `components/color-canvas/ColorCanvasPage.tsx`

## 3. Existing Backend/API Capabilities (Already Available)

The Vite server middleware already provides:

- `GET /api/embed/preflight`
- `GET /api/embed/local-apps`
- `GET /api/embed/snapshot`
- `POST /api/embed/snapshot/capture`
- `POST /api/embed/live-session`
- `DELETE /api/embed/live-session/:id`
- `POST /api/media/store`
- `GET /api/media/file/:file`
- `GET /api/media/proxy`
- `GET /api/projects/list`
- `POST /api/projects/create`
- `POST /api/paper/import`

Source: `vite.config.ts`

Config knobs already present:

- `EMBED_SNAPSHOT_TEMPLATE`
- `EMBED_LIVE_TEMPLATE`
- `HYPERBEAM_API_KEY`
- `MEDIA_MAX_UPLOAD_BYTES`
- `EMBED_CAPTURE_TIMEOUT_MS`
- `LOCAL_APP_DISCOVERY_TIMEOUT_MS`

Source: `vite.config.ts`

## 4. Agentic Canvas Options

### Option A: Lightweight orchestration on top of existing canvas (recommended first)

Approach:

- Keep current canvas item types as source of truth
- Define a stable operation schema (add/update/remove/select/reorder)
- Stream agent events from backend to frontend and translate to canvas operations

Pros:

- Fastest path
- Minimal migration risk
- Reuses all existing UI/editor/persistence features

Cons:

- Agent semantics are layered, not deeply native in model

### Option B: Add a new native `agent_event` stream model in canvas state

Approach:

- Extend canvas state with event timeline
- Keep rendered items separate from event log
- Add replay and “step through agent session” UX

Pros:

- Better traceability
- Better replay/debug

Cons:

- Medium model and UI complexity increase

### Option C: Graph-first unified model (Canvas + Color Canvas concepts)

Approach:

- Move toward node/edge model for all canvas semantics
- Treat visual artifacts and reasoning links uniformly

Pros:

- Strong long-term flexibility for maps/sections/relationships

Cons:

- Highest migration cost
- Slower near-term delivery

## 5. Integration Layer Choices (CopilotKit and alternatives)

### CopilotKit-based orchestration

Use CopilotKit for agent UI/protocol orchestration and keep this app’s canvas as the rendering and persistence engine.

Best when:

- You want faster out-of-the-box agent UX patterns
- You still want custom canvas behavior and control

### AG-UI direct adapter

Implement AG-UI contract directly in this app:

- Full protocol control
- Less framework coupling
- More implementation work

### LangGraph / custom backend orchestration

- Strong flow control and state machine options
- Requires custom frontend bridge to canvas ops

## 6. Recommended Build Path

### Phase 1: Agent operation contract + stream transport

Deliver:

- `CanvasAgentOperation` schema
- Session id + sequence id + idempotency key
- SSE stream endpoint (first)
- Frontend operation reducer that mutates existing canvas state

### Phase 2: Agent session persistence + replay

Deliver:

- Save operation log with scene snapshot
- Replay mode (rebuild canvas from op log)
- Attach logs to existing scenes

### Phase 3: Rich ingestion pipelines

Deliver:

- Auto-create embeds/media from tool events
- Capture snapshots from URLs automatically (desktop/mobile)
- Map/section generation conventions using artboards

### Phase 4: Agent UX polish

Deliver:

- Live agent timeline panel
- Step-by-step highlight on canvas
- Failure states and recovery actions

## 7. Non-Negotiables for reliability

- Idempotent operation handling
- Strict sequence ordering per session
- Durable session lifecycle states
- Clear auth boundary for tool-initiated URL/file operations
- Rate limiting + batching for high-volume event bursts

## 8. Risks

- Event ordering bugs can corrupt canvas state
- Over-frequent updates can degrade canvas performance
- External URL capture can fail due to site policy/network limits
- Live session providers can be unavailable without env setup

## 9. Immediate Next Build Steps

1. Define and version `CanvasAgentOperation` in `types/`.
2. Add stream endpoint (SSE) and a frontend stream subscriber hook.
3. Implement operation-to-canvas reducer over `useCanvasState`.
4. Persist operation logs alongside scenes.
5. Add first demo flow:
   - Agent emits map section
   - Agent emits embed URL
   - Capture snapshot to media nodes
   - Save session and replay

