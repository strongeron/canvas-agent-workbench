# Agent-Native Canvas Progress

Date: April 4, 2026

## Current Snapshot

| Area | Status | Notes |
|------|--------|-------|
| Shared runtime/workspace manifest | In progress | Manifest endpoint exists and now lists runtime/workspace metadata plus resources/tools/prompts. |
| `Canvas` live bridge | Working | Sessions, transcript, state sync, queue-backed transport, and local CLI + MCP tools/resources/prompts already exist. Canvas mutations now also flow through the shared workspace event log on the server side, and Canvas state now uses the same workspace resource shape as the newer surfaces. |
| `Color Audit` adapter | In progress | State sync, event-log-backed operations, export-preview resources, screenshot capture, and local CLI + MCP writes are now wired. |
| `System Canvas` adapter | In progress | State sync, event-log-backed operations for config/view/generate/apply plus authored node/edge mutation, screenshot capture, and local CLI + MCP writes are now wired. |
| `Node Catalog` adapter | In progress | Read-only state sync, sections resource, screenshot capture, and local CLI + MCP reads are now wired; no write tools are needed. |
| CLI face | In progress | `bin/canvas-agent` now shares Canvas operations with the MCP server, reads `Color Audit`, `System Canvas`, and `Node Catalog`, can request app-owned screenshots, can mutate `Color Audit` and `System Canvas`, supports `attach`/`detach`, and can read append-only workspace events. |
| Event log | In progress | Event envelope, append-only workspace event storage, HTTP reads, local CLI reads, and local MCP reads now exist. `Canvas`, `Color Audit`, and `System Canvas` mutations are now sourced from the event log on the server side. |
| Visual context | In progress | App-owned screenshot capture now exists for `Canvas`, `Color Audit`, `System Canvas`, and `Node Catalog` via the dev server Playwright renderer, and screenshot route/storage config is now unit-tested. |
| Runtime adapters | In progress | `Codex` and `Claude` now have shared adapter modules for launch/bootstrap/config wiring; full runtime lifecycle formalization is still incomplete. |

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

### Phase 5: Runtime adapters

- [x] Formalize `Codex` runtime adapter
- [x] Formalize `Claude` runtime adapter
- [x] Add runtime-specific guard/bootstrap notes
- [ ] Add `Gemini` only when a real use case appears

## Next Active Slice

1. Decide whether the next quality slice should be visual-diff screenshot coverage or runtime bootstrap hardening.
2. Push more of the session lifecycle out of `vite.config.ts` and behind the runtime adapter contract.
3. Add richer `Color Audit` write tools for export selection, role mapping, and contrast edge management workflows.
4. Add `Gemini` only when a real runtime integration path exists.

## Out Of Scope For This Slice

- Full multi-agent co-editing
- CRDT/peer-to-peer sync
- File download export UX
