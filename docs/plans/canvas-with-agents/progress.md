# Agent-Native Canvas Progress

Date: April 4, 2026

## Current Snapshot

| Area | Status | Notes |
|------|--------|-------|
| Shared runtime/workspace manifest | In progress | Manifest endpoint exists and now lists runtime/workspace metadata plus resources/tools/prompts. |
| `Canvas` live bridge | Working | Sessions, transcript, state sync, queue-backed transport, and local CLI + MCP tools/resources/prompts already exist. Canvas mutations now also flow through the shared workspace event log on the server side, and Canvas state now uses the same workspace resource shape as the newer surfaces. |
| `Color Audit` adapter | Working | State sync, event-log-backed operations, export-preview resources, screenshot capture, and local CLI + MCP writes are now wired. |
| `System Canvas` adapter | Working | State sync, event-log-backed operations for config/view/generate/apply plus authored node/edge mutation, screenshot capture, and local CLI + MCP writes are now wired. |
| `Node Catalog` adapter | Working (read-only) | Read-only state sync, sections resource, screenshot capture, and local CLI + MCP reads are now wired; no write tools are needed. |
| CLI face | Working | `bin/canvas-agent` now shares Canvas operations with the MCP server, reads `Color Audit`, `System Canvas`, and `Node Catalog`, can request app-owned screenshots, can mutate `Color Audit` and `System Canvas`, supports `attach`/`detach`, and can read append-only workspace events/debug. |
| Event log | Working | Event envelope, append-only workspace event storage, HTTP reads, local CLI reads, and local MCP reads now exist. `Canvas`, `Color Audit`, and `System Canvas` mutations are now sourced from the event log on the server side. |
| Visual context | Working | App-owned screenshot capture now exists for `Canvas`, `Color Audit`, `System Canvas`, and `Node Catalog` via the dev server Playwright renderer. Route/storage configuration is unit-tested, browser resolution is centralized, and a live visual-diff golden now exists for the Node Catalog state preview. |
| Runtime adapters | Working | `Codex` and `Claude` now have shared adapter modules for launch/bootstrap/config wiring, and runtime session lifecycle has moved into a shared session manager plus browser/runtime helpers. |

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
- [x] Wrap current `Canvas` bridge with a workspace adapter
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
- [x] Route `Canvas` mutations through event log
- [x] Route `Color Audit` mutations through event log
- [x] Route `System Canvas` mutations through event log
- [x] Add replay/debug view for agent actions
- [ ] Preserve undo/redo on top of event log

### Phase 4: Visual context

- [x] Add screenshot or render-backed viewport resource
- [x] Expose screenshot resource in manifest
- [x] Wire visual context into at least one runtime prompt flow
- [x] Add at least one golden visual-diff check over the app-owned screenshot/render path

### Phase 5: Runtime adapters

- [x] Formalize `Codex` runtime adapter
- [x] Formalize `Claude` runtime adapter
- [x] Add runtime-specific guard/bootstrap notes
- [x] Move session bootstrap/start/stop into shared runtime session manager
- [ ] Add `Gemini` only when a real use case appears

## Next Active Slice

1. Broaden golden screenshot coverage beyond the current Node Catalog state-preview slice.
2. Keep shrinking app-specific runtime glue in `vite.config.ts` where it is still HTTP wiring rather than shared runtime/session logic.
3. Add richer `Color Audit` write tools for export selection, role mapping, and contrast edge management workflows.
4. Add `Gemini` only when a real runtime integration path exists.

## Out Of Scope For This Slice

- Full multi-agent co-editing
- CRDT/peer-to-peer sync
- File download export UX
