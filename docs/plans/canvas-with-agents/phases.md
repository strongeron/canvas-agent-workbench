---
shaping: true
---

# Agent-Native Canvas — Current Phases

## Overview

```
Phase 1: Contract foundation
  → Phase 2: Workspace adapters
  → Phase 3: Event-log mutations
  → Phase 4: Visual context
  → Phase 5: Runtime adapters
```

## Phase 1: Contract foundation

**Goal:** Define the stable agent-facing contract before adding more surface-specific logic.
**Status:** In progress

| Step | What | File(s) |
|------|------|---------|
| P1.1 | Shared agent-native manifest types | `types/agentNative.ts` |
| P1.2 | Runtime/workspace manifest metadata | `utils/agentNativeManifest.ts` |
| P1.3 | Manifest endpoint | `vite.config.ts` |
| P1.4 | Architecture doc | `agent-native-architecture.md` |
| P1.5 | Progress tracker | `progress.md` |

**Exit criteria:** Every surface is described by a manifest with resources, tools, prompts, and delivery status.

## Phase 2: Workspace adapters

**Goal:** Turn surface definitions into real adapters instead of descriptive metadata.
**Status:** In progress

| Step | What | File(s) |
|------|------|---------|
| P2.1 | Generic workspace adapter contract | `types/agentNative.ts`, new adapter modules |
| P2.2 | `CanvasWorkspaceAdapter` over current bridge | `hooks/useCanvasAgentBridge.ts` + adapter wrapper |
| P2.3 | `ColorAuditWorkspaceAdapter` (read-only first) | `hooks/useColorCanvasState.ts` + adapter |
| P2.3a | Local MCP reads for `Color Audit` manifest/state/export | `bin/canvas-mcp-server`, `bin/canvas-agent*` |
| P2.3b | Shared operations core for CLI + MCP | new shared operations module |
| P2.4 | `SystemCanvasWorkspaceAdapter` (read-only first) | Color canvas adapter modules |
| P2.5 | `NodeCatalogWorkspaceAdapter` | Node catalog manifest/resource builder |

**Exit criteria:** At least `Canvas`, `Color Audit`, and `System Canvas` expose structured state via workspace adapters or adapter-shaped resources, agents can read them through local MCP, and at least one surface is served through a shared CLI + MCP operations core.

Current note: `Canvas` now uses a shared operations core for CLI and MCP, its server-side mutation path now appends and acknowledges workspace events before updating state, and its browser bridge now syncs through the same workspace-state resource shape as the newer surfaces. `Color Audit` is writable through the same app-owned agent-native path. `System Canvas` is now writable for config/view/generate/apply plus authored node/edge mutations over HTTP, local CLI, and local MCP, while `Node Catalog` remains read-only.

Bootstrap note: `bin/canvas-agent attach --project <id>` now creates or reuses a real app session, writes `.canvas-agent/attached-session.json`, and makes later CLI commands work without exported env.

## Phase 3: Event-log mutations

**Goal:** Replace fragile snapshot-only sync with auditable operations.
**Status:** In progress

| Step | What | File(s) |
|------|------|---------|
| P3.1 | Event envelope type | `types/agentNative.ts` or dedicated operations file |
| P3.1a | Append-only event resources over HTTP, CLI, and MCP | `vite.config.ts`, `bin/canvas-agent*`, manifest |
| P3.2 | Event store / middleware | new shared agent-native state layer |
| P3.3 | Route `Canvas` remote ops through events | `hooks/useCanvasAgentBridge.ts`, `vite.config.ts` |
| P3.4 | Route `Color Audit` mutations through events | Color audit adapter/bridge |
| P3.4a | Route `System Canvas` mutations through events | System canvas adapter/bridge |
| P3.5 | Replay/debug surface | new session or audit UI |

**Exit criteria:** Mutations can be replayed and audited independently from persisted snapshots.

Current note: event envelopes and append-only workspace event reads are now live over HTTP, local CLI, and local MCP. `Canvas`, `Color Audit`, and `System Canvas` now use the event log as the server-side mutation source of truth. Replay/debug reads now exist over HTTP, local CLI, local MCP, and the in-app `Canvas Agents` panel. Undo/redo is still not unified on top of the event log yet.

## Phase 4: Visual context

**Goal:** Give agents both structured and visual context.
**Status:** In progress

| Step | What | File(s) |
|------|------|---------|
| P4.1 | Viewport screenshot resource | Vite middleware or render service |
| P4.2 | Structured preview summaries | workspace adapters |
| P4.3 | Prompt flows that include visual context | runtime/workspace prompt layer |

**Exit criteria:** Agents can read both state and a current render/screenshot for at least one surface.

Current note: App-owned screenshot capture now works through the Vite/Playwright renderer for `Canvas`, `Color Audit`, `System Canvas`, and `Node Catalog`. Route/storage configuration for those captures is now unit-tested. The next improvement is true visual-diff coverage for selected surfaces.

## Phase 5: Runtime adapters

**Goal:** Separate runtime-specific lifecycle/guards from surface logic.
**Status:** In progress

| Step | What | File(s) |
|------|------|---------|
| P5.1 | `Codex` runtime adapter | new runtime adapter module |
| P5.2 | `Claude` runtime adapter | new runtime adapter module |
| P5.3 | Optional `Gemini` adapter | new runtime adapter module |
| P5.4 | Shared guard/bootstrap model | runtime adapter layer |

**Exit criteria:** Adding a new agent runtime is adapter registration, not workspace rewiring.

Current note: `Codex` and `Claude` now share a dedicated runtime-adapter registry for launch metadata, MCP config wiring, config style, and runtime-specific guard/bootstrap guidance. The remaining work is moving more of the session lifecycle and runtime event handling through that adapter contract.

---

## Files in This Directory

| File | Purpose |
|------|---------|
| `agent-native-architecture.md` | Current architecture, requirements, selected shape, and risks |
| `progress.md` | Current delivery tracker with done/planned slices |
| `phases.md` | This file: current phased roadmap |
| `research-agent-native.md` | Protocol and market research that informed the selected shape |
| `shaping.md` | Earlier shaping notes and exploration |
