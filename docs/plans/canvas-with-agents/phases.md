---
shaping: true
---

# Agentic Canvas — Implementation Phases

## Overview

```
V0 (CopilotKit)  →  Decision Gate  →  V1-V5 (Build MCP infrastructure)
     buy                                      build only if needed
```

---

## Phase 0: CopilotKit Smoke Test (V0)

**Strategy:** Buy — test the interaction model before building infrastructure
**Effort:** ~90 LOC, 2-4 hours
**Plan:** See [V0-plan.md](./V0-plan.md)

| Step | What | File(s) | Lines |
|------|------|---------|-------|
| P0.1 | Install packages | `package.json` | — |
| P0.2 | CopilotKit runtime endpoint | `vite.config.ts` | ~20 |
| P0.3 | Provider + Chat panel | App entry + layout | ~15 |
| P0.4 | Canvas state → agent context | `hooks/useCopilotCanvasActions.ts` | ~20 |
| P0.5 | Canvas tools (create/update/delete) | `hooks/useCopilotCanvasActions.ts` | ~40 |
| P0.6 | Validation tests (7 prompts) | Manual testing | — |

**Demo:** "Open chat, say 'design a dashboard layout', items appear on canvas"

**Decision gate after V0:**

| Signal | Action |
|--------|--------|
| Agent creates useful layouts | → Proceed to V1 |
| Chat UX works | → Keep CopilotKit chat for API agents |
| Agent can't reason about canvas | → Stop, improve context format |
| Claude API is sufficient | → May skip V1-V3 entirely |

---

## Phase 1: Canvas MCP Server + State Cache (V1)

**Strategy:** Build — enable CLI agents (Claude Code, Codex)
**Depends on:** V0 validates the interaction model
**Effort:** Medium (1-2 days)

| Step | What | File(s) |
|------|------|---------|
| V1.1 | Create MCP server package | `canvas-mcp-server/index.ts` |
| V1.2 | Implement write tools: `create_node`, `update_node`, `delete_node`, `move_node` | `canvas-mcp-server/tools/` |
| V1.3 | Implement read tools: `get_state`, `get_node`, `get_selection`, `list_node_types` | `canvas-mcp-server/tools/` |
| V1.4 | Add state cache to Vite middleware: `POST /api/canvas/state`, `GET /api/canvas/state` | `vite.config.ts` |
| V1.5 | Frontend: push state to server on changes | `hooks/useCanvasStateSync.ts` |
| V1.6 | MCP server reads/writes via Vite HTTP endpoints | `canvas-mcp-server/bridge.ts` |

**Demo:** "Run MCP inspector, call `create_node`, item appears on canvas"

**Key files from research:**
- Canvas types: `types/canvas.ts` — `CanvasItemInput`, `CanvasItemUpdate`
- State hook: `hooks/useCanvasState.ts` — `addItem()`, `updateItem()`, `removeItem()`
- Existing middleware pattern: `vite.config.ts` — `paperImportPlugin()`

---

## Phase 2: CLI Panel (V2)

**Strategy:** Build — agent session runs inside canvas UI
**Depends on:** V1 (MCP server exists)
**Effort:** Medium (1-2 days)

| Step | What | File(s) |
|------|------|---------|
| V2.1 | xterm.js terminal component | `components/canvas/AgentTerminal.tsx` |
| V2.2 | Agent picker dropdown (reads registry) | `components/canvas/AgentPicker.tsx` |
| V2.3 | Subprocess spawner with MCP config | `hooks/useAgentProcess.ts` |
| V2.4 | Dockable panel (side/bottom) | `components/canvas/AgentPanel.tsx` |
| V2.5 | Agent registry JSON | `agent-registry.json` |

**Demo:** "Pick Claude Code, click Start, type prompt, items appear on canvas"

---

## Phase 3: SSE Pipeline (V3)

**Strategy:** Build — real-time MCP → canvas rendering
**Depends on:** V1 (MCP server) + V2 (agent spawning)
**Effort:** Small (0.5-1 day)

| Step | What | File(s) |
|------|------|---------|
| V3.1 | SSE event bus in Vite middleware | `vite.config.ts` |
| V3.2 | SSE endpoint: `GET /api/agent/events` | `vite.config.ts` |
| V3.3 | MCP write tools emit SSE on operation | `canvas-mcp-server/bridge.ts` |
| V3.4 | Frontend SSE subscriber hook | `hooks/useAgentEvents.ts` |
| V3.5 | Operation reducer → useCanvasState dispatch | `hooks/useAgentEvents.ts` |

**Demo:** "Agent creates 5 items rapidly, each appears within 100ms"

---

## Phase 4: Observability (V4)

**Strategy:** Build — see what the agent did
**Depends on:** V1 (MCP server exists, sessions produce logs)
**Effort:** Small (0.5-1 day)

| Step | What | File(s) |
|------|------|---------|
| V4.1 | JSONL log reader (Claude Code format) | `lib/agentLogReader.ts` |
| V4.2 | JSONL log reader (Codex format) | `lib/agentLogReader.ts` |
| V4.3 | Session log sidebar panel | `components/canvas/SessionLogPanel.tsx` |
| V4.4 | Session list + selector | `components/canvas/SessionLogPanel.tsx` |

**Demo:** "After agent session, open log panel, see tool calls with timing"

---

## Phase 5: Agent Config Registry (V5)

**Strategy:** Build — plug in any agent
**Depends on:** V2 (agent picker exists)
**Effort:** Small (few hours)

| Step | What | File(s) |
|------|------|---------|
| V5.1 | Registry JSON schema | `agent-registry.json` |
| V5.2 | Registry loader in agent picker | `components/canvas/AgentPicker.tsx` |
| V5.3 | Config template generator per agent type | `lib/agentConfig.ts` |

**Demo:** "Add Gemini CLI entry to JSON, appears in picker, start session"

---

## Dependency Graph

```
V0 (CopilotKit smoke test)
 │
 ├── Decision gate
 │
 V1 (MCP server + state cache)
 │├── V3 (SSE pipeline)
 │├── V4 (Observability)
 │
 V2 (CLI panel + xterm.js)
  ├── V3 (SSE pipeline)
  ├── V5 (Agent registry)
```

V3 depends on both V1 and V2.
V4 depends on V1 only (needs sessions to log).
V5 depends on V2 (needs agent picker UI).

---

## Files in This Directory

| File | Purpose |
|------|---------|
| `shaping.md` | Ground truth: R, shapes, fit check, breadboard, slices |
| `phases.md` | This file: implementation phases and steps |
| `V0-plan.md` | Detailed V0 implementation plan with acceptance criteria |
| `research-agent-native.md` | Protocol research: MCP, AG-UI, agent-native patterns |
| `research-copilotkit-vite.md` | CopilotKit + Vite integration research with code examples |
