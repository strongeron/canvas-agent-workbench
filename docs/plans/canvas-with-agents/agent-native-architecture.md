---
shaping: true
---

# Agent-Native Canvas Architecture

Date: April 4, 2026
Status: Active plan
Selected shape: A

## Summary

The app should treat agents as first-class collaborators across all canvas surfaces, not as a one-off CLI integration for the freeform `Canvas` tab.

The selected architecture is:

`runtime adapters -> MCP contract -> workspace adapters -> canvas core`

CLI remains the best bootstrap transport, but not the architecture. The durable contract is MCP plus workspace manifests, structured resources, structured tools, and workspace-specific prompts.

For implementation, we should treat the app as a **dual-face capability layer**:

`shared operations core -> CLI face + MCP face`

- CLI face for fast local iteration loops
- MCP face for structured discovery, resources, and guided workflows

## Requirements

| Req | Requirement | Status |
|-----|-------------|--------|
| R0 | Any supported agent runtime must be able to discover the app surfaces and their capabilities without hard-coded UI knowledge. | Must-have |
| R1 | The same workspace model must support multiple runtimes (`Codex`, `Claude`, future `Gemini`) without duplicating surface logic. | Must-have |
| R2 | Agents must be able to read both structured workspace state and visual/preview context for canvas reasoning. | Must-have |
| R3 | Mutations must be auditable, replayable, and safe for mixed user + agent editing. | Must-have |
| R4 | `Canvas`, `Color Audit`, `System Canvas`, and `Node Catalog` must each expose only the resources and tools relevant to that surface. | Must-have |
| R5 | The architecture must preserve the current working `Canvas` bridge while enabling incremental adoption for `Color Audit` and `System Canvas`. | Must-have |
| R6 | The plan must be trackable in-repo, with current status, next slices, and explicit gaps. | Must-have |

## Selected Shape

## A: MCP-first workspace adapters with thin runtime adapters

| Part | Mechanism | Status |
|------|-----------|--------|
| A1 | Shared agent-native manifest listing runtimes and workspaces | In progress |
| A2 | Shared contract types for runtimes, workspace manifests, resources, tools, prompts, adapters, and events | In progress |
| A3 | Workspace adapters per surface (`Canvas`, `Color Audit`, `System Canvas`, `Node Catalog`) | Planned |
| A4 | Runtime adapters per agent (`Codex`, `Claude`, future `Gemini`) | In progress |
| A5 | Event-log mutation layer for co-editing, replay, undo/redo, and audit trail | In progress |
| A6 | Dual-context surface access: structured state + visual context | Planned |

## Fit Check

| Req | Requirement | Status | A |
|-----|-------------|--------|---|
| R0 | Any supported agent runtime must be able to discover the app surfaces and their capabilities without hard-coded UI knowledge. | Must-have | ✅ |
| R1 | The same workspace model must support multiple runtimes (`Codex`, `Claude`, future `Gemini`) without duplicating surface logic. | Must-have | ✅ |
| R2 | Agents must be able to read both structured workspace state and visual/preview context for canvas reasoning. | Must-have | ✅ |
| R3 | Mutations must be auditable, replayable, and safe for mixed user + agent editing. | Must-have | ✅ |
| R4 | `Canvas`, `Color Audit`, `System Canvas`, and `Node Catalog` must each expose only the resources and tools relevant to that surface. | Must-have | ✅ |
| R5 | The architecture must preserve the current working `Canvas` bridge while enabling incremental adoption for `Color Audit` and `System Canvas`. | Must-have | ✅ |
| R6 | The plan must be trackable in-repo, with current status, next slices, and explicit gaps. | Must-have | ✅ |

## Notes

- A still needs visual-diff validation and fuller runtime lifecycle formalization before it fully satisfies R2 and R3 in implementation.
- A works incrementally because the existing `Canvas` bridge can remain live while other surfaces move from manifest-only to read/write adapters in slices.

## Current State

### Already working

- `Canvas` has a live bridge, remote operations, agent sessions, and an MCP server.
- `/api/agent-native/manifest` exposes runtime and workspace discovery.
- The local `canvas-agent-mcp` server now exposes manifests, resources, prompts, and screenshot capture for `Canvas`, `Color Audit`, `System Canvas`, and `Node Catalog`.
- `Node Catalog` now provides both a visual review route and structured read-only state/sections resources across node families.
- `bin/canvas-agent attach --project <id>` now bootstraps or reuses a real app-owned session and persists local CLI context, removing the need for manual env setup during Codex-style local usage.
- `Canvas` now appends queued/applied/state-synced events into the shared workspace event log, that log is readable over HTTP, local CLI, local MCP, and the in-app agent debug panel, and the Canvas bridge now syncs through the same workspace-state resource shape as the newer surfaces.

### Partially working

- `Color Audit` is now exposed as a writable agent-native surface with structured manifest, state, export-preview resources, app-owned screenshot capture, shared-core template/node/edge operations, local CLI + MCP write paths, and event-log-backed mutation delivery.
- `System Canvas` is now exposed as a writable agent-native surface for config patching, view switching, scale-graph generation, theme-var application, and authored node/edge graph mutations, with structured manifest/state resources, app-owned screenshot capture, local CLI + MCP write paths, and event-log-backed mutation delivery.
- `Node Catalog` is now exposed as a read-only agent-native surface with structured state, section metadata, app-owned screenshot capture, and local CLI + MCP reads.
- Append-only workspace events are now exposed over HTTP, local CLI, and local MCP for `Canvas`, `Color Audit`, `System Canvas`, and `Node Catalog`.
- Replay/debug payloads for workspace events now exist for all surfaces over HTTP, local CLI, and local MCP.

### Missing

- Shared `WorkspaceAdapter` implementations.
- Shared `AgentRuntimeAdapter` implementations beyond the new Codex/Claude launch/bootstrap adapters.
- Multi-surface tool routing in MCP beyond the current hand-wired surface set.
- Visual-diff screenshot validation beyond the now-tested screenshot route/storage configuration.

## Architecture Layers

### Layer 1: Canvas core

- Typed workspace state
- Operations/events
- Rendering state
- Selection and viewport state

The current app already has two separate cores:

- `Canvas`: item-based state in `/Users/strongeron/Evil Martians/Open Source/gallery-poc/types/canvas.ts`
- `Color Canvas`: node/edge state in `/Users/strongeron/Evil Martians/Open Source/gallery-poc/types/colorCanvas.ts`

Next step is not to merge them blindly. It is to standardize how surfaces expose state and operations upward.

### Layer 2: Workspace adapters

Each surface should implement a shared contract:

- identity
- manifest
- serialized state
- optional catalog
- operation validation
- operation application
- prompt context

Initial target adapters:

- `CanvasWorkspaceAdapter`
- `ColorAuditWorkspaceAdapter`
- `SystemCanvasWorkspaceAdapter`
- `NodeCatalogWorkspaceAdapter`

### Layer 3: MCP contract

MCP should become the stable app-facing contract for agents:

- resources for manifests, state, catalogs, exports, and screenshots
- tools for create/update/delete/connect/export/audit
- prompts for surface-specific guided workflows

### Layer 4: Runtime adapters

Runtime-specific code should stay thin:

- session lifecycle
- CLI bootstrapping
- MCP config wiring
- transcript parsing
- runtime-specific guard behavior

Current implementation note: `Codex` and `Claude` now have a shared runtime-adapter registry for launch metadata, MCP bootstrap wiring, config style, and runtime-specific guidance. The next step is pushing more of the existing session lifecycle through that adapter contract instead of leaving it in `vite.config.ts`.

## Resource Model

Planned baseline resources:

- `workspace://manifest`
- `workspace://surface/{id}/state`
- `workspace://surface/{id}/catalog`
- `workspace://surface/{id}/selection`
- `workspace://surface/{id}/export-preview`
- `workspace://surface/{id}/viewport/screenshot`

## Tool Model

Planned baseline tools:

- `create_node`
- `update_node`
- `delete_node`
- `connect_nodes`
- `disconnect_edge`
- `generate_template`
- `generate_scale_graph`
- `export_surface`
- `run_audit`

Existing `Canvas` tools stay valid, but should eventually be routed through the same adapter shape.

## CLI Role

CLI is not the architecture. It is the most efficient local transport for repeated iteration loops.

We should keep:

- `bin/canvas-agent` as the cheap inner-loop face
- `bin/canvas-mcp-server` as the structured contract face

Both should converge on the same underlying operations layer.

The current bootstrap path is:

1. `bin/canvas-agent attach --project <id> [--surface <surface-id>]`
2. app creates or reuses a real session and returns session/runtime context
3. CLI writes `.canvas-agent/attached-session.json`
4. later `bin/canvas-agent ...` commands read that context automatically

## Event Log Decision

Selected mutation model: event log

Why:

- preserves operation history
- supports undo/redo and replay
- gives agent audit trail
- avoids current sync weaknesses of snapshot/file polling

Persistence can still use snapshots. The sync mechanism should use events.

Current implementation note: we now have the event envelope plus append-only event reads across HTTP, CLI, and MCP. `Canvas`, `Color Audit`, and `System Canvas` mutation delivery now uses that event log on the server side. `Canvas` still keeps its queue transport for embedded sessions, but the server interprets those queued operations through the shared event log before state update. Undo/redo is still not unified yet.

## Slices

### Slice 1: Contract foundation

- define shared types
- expose richer manifest metadata
- document current vs target architecture

### Slice 2: Workspace adapters

- extract a generic adapter contract
- wrap current `Canvas` bridge in that contract
- add first `Color Audit` adapter in read-only mode

### Slice 3: Event-log mutation path

- add operation envelopes
- persist events separately from snapshots
- route remote ops through the event layer

### Slice 4: Visual context

- add viewport screenshot/render resource
- expose node preview images or structured preview summaries

### Slice 5: Runtime adapters

- formalize `Codex`
- formalize `Claude`
- add `Gemini` when needed

## Risks

- `ColorCanvasPage.tsx` is large, so extracting adapter-safe state access will take care.
- There are two distinct document models today; forcing a premature unification would slow delivery.
- Screenshot-based visual context adds browser/runtime complexity and needs careful test coverage.

## Acceptance Criteria For The Next Milestone

The next milestone is complete when:

1. `Canvas` and `Color Audit` both expose typed workspace manifests.
2. `Color Audit` has a writable adapter-shaped bridge plus state/export resources over HTTP, local CLI, and local MCP.
3. The manifest endpoint lists per-surface resources, tools, and prompts with delivery status.
4. `Node Catalog` has read-only state/sections resources over HTTP, local CLI, and local MCP.
5. The progress tracker clearly shows what is live, partial, or planned.
6. At least one surface can be inspected through both structured state and an app-owned screenshot path.
