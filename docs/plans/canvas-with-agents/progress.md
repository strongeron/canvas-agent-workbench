# Agent-Native Canvas Progress

Date: April 3, 2026

## Current Snapshot

| Area | Status | Notes |
|------|--------|-------|
| Shared runtime/workspace manifest | In progress | Manifest endpoint exists and now lists runtime/workspace metadata plus resources/tools/prompts. |
| `Canvas` live bridge | Working | Sessions, transcript, state sync, remote operations, and local MCP tools/resources/prompts already exist. |
| `Color Audit` adapter | In progress | State sync, queued remote operations, export-preview resources, screenshot capture, and local CLI + MCP writes are now wired. |
| `System Canvas` adapter | In progress | State sync, queued remote operations for config/view/generate/apply plus authored node/edge mutation, screenshot capture, and local CLI + MCP writes are now wired. |
| `Node Catalog` adapter | In progress | Read-only state sync, sections resource, screenshot capture, and local CLI + MCP reads are now wired; no write tools are needed. |
| CLI face | In progress | `bin/canvas-agent` now shares Canvas operations with the MCP server, reads `Color Audit`, `System Canvas`, and `Node Catalog`, can request app-owned screenshots, can mutate `Color Audit` and `System Canvas`, supports `attach`/`detach`, and can read append-only workspace events. |
| Event log | In progress | Event envelope, append-only workspace event storage, HTTP reads, local CLI reads, and local MCP reads now exist; mutations still flow through the current remote-operation queue rather than using the event log as the source of truth. |
| Visual context | In progress | App-owned screenshot capture now exists for `Canvas`, `Color Audit`, `System Canvas`, and `Node Catalog` via the dev server Playwright renderer. |
| Runtime adapters | Not started | Manifest lists runtimes, but dedicated adapter contracts are not wired yet. |

## Phase Tracker

### Phase 1: Contract foundation

- [x] Shared runtime/workspace manifest endpoint
- [x] Shared manifest/type definitions for runtimes and workspaces
- [x] Current architecture doc
- [x] Progress tracker
- [x] Per-surface `WorkspaceManifest` builders
- [x] Local MCP resources/prompts for `Canvas` and `Color Audit` reads

### Phase 2: Workspace adapters

- [ ] Extract generic workspace adapter contract into implementation code
- [ ] Wrap current `Canvas` bridge with a workspace adapter
- [x] Add read-only `Color Audit` adapter foundation
- [x] Add local MCP read bridge for `Color Audit`
- [x] Add writable `Color Audit` operations over the shared CLI + MCP flow
- [x] Add read-only `System Canvas` adapter foundation
- [x] Add local MCP read bridge for `System Canvas`
- [x] Add writable `System Canvas` operations over the shared CLI + MCP flow
- [x] Add read-only `Node Catalog` adapter

### Phase 3: Event-log mutations

- [x] Define event envelope for workspace operations
- [x] Add append-only workspace event reads over HTTP, local CLI, and local MCP
- [ ] Route `Canvas` mutations through event log
- [ ] Route `Color Audit` mutations through event log
- [ ] Route `System Canvas` mutations through event log
- [ ] Add replay/debug view for agent actions
- [ ] Preserve undo/redo on top of event log

### Phase 4: Visual context

- [x] Add screenshot or render-backed viewport resource
- [x] Expose screenshot resource in manifest
- [x] Wire visual context into at least one runtime prompt flow

### Phase 5: Runtime adapters

- [ ] Formalize `Codex` runtime adapter
- [ ] Formalize `Claude` runtime adapter
- [ ] Add runtime-specific guard/bootstrap notes
- [ ] Add `Gemini` only when a real use case appears

## Next Active Slice

1. Extract the current `Canvas` bridge behind the shared workspace-adapter contract.
2. Start routing `Canvas`, then `Color Audit`, then `System Canvas` mutations through the validated event-log layer.
3. Add a replay/debug surface for agent actions and workspace events.
4. Add richer `Color Audit` write tools for export selection, role mapping, and contrast edge management workflows.

## Out Of Scope For This Slice

- Full multi-agent co-editing
- CRDT/peer-to-peer sync
- File download export UX
