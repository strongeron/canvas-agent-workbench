# Research: Agent-Native Patterns & Protocols

Date: February 24, 2026

## MCP as Universal Base Layer

All three target agents support MCP natively:

| Agent | MCP Transports | Config Format | Config Scope |
|-------|---------------|---------------|--------------|
| Claude Code | HTTP, SSE, stdio | JSON | local/project/user |
| Codex CLI | stdio only | TOML | global only |
| Gemini CLI | stdio | JSON | project/global |

**Key differences:**
- Claude Code is the most flexible (3 transports, 3 config scopes, dynamic tool discovery via `list_changed`)
- Codex CLI is stdio-only, single global config, requires restart for tool changes
- Gemini CLI supports MCP servers via stdio

**MCP primitives for canvas:**
- **Tools** — model-controlled actions with JSON Schema input/output (`create_node`, `update_node`, etc.)
- **Resources** — read-only data via URI templates (`canvas://state`, `canvas://node/{id}`)
- **Prompts** — reusable instruction templates

## AG-UI Protocol (CopilotKit)

Open protocol for real-time bidirectional agent ↔ frontend communication.

**Core interface:** `run(input: RunAgentInput) -> Observable<BaseEvent>`

**16 event types in categories:**
- Lifecycle: `RunStarted`, `RunFinished`, `RunError`, `StepStarted/Finished`
- Text streaming: `TextMessageStart` → `TextMessageContent` (delta) → `TextMessageEnd`
- Tool calls: `ToolCallStart` → `ToolCallArgs` (delta) → `ToolCallEnd` → `ToolCallResult`
- State sync: `StateSnapshot` (full replace), `StateDelta` (RFC 6902 JSON Patch)
- Reasoning: `ReasoningStart/End`, `ReasoningMessageStart/Content/End`

**Key distinction from MCP:**
- MCP = agent ↔ tools/data (backend)
- AG-UI = agent ↔ frontend (runtime UI transport)
- They are **complementary layers**, not alternatives

**Adoption:** Oracle Agent Spec, Google ADK, Microsoft Agent Framework, CopilotKit React/Angular clients.

**Unique feature:** Tools are defined by the frontend, not the agent. The app controls which capabilities agents can access.

## Agent-Native Design Principles

From research (every.to, Sam Keen):

1. **Parity** — Whatever user can do in UI, agent must be able to do via tools
2. **Granularity** — Atomic primitives, not workflow bundles. `create_node` not `create_dashboard`
3. **Composability** — New features = new prompts composing existing tools
4. **Emergent capability** — Agents accomplish things not explicitly designed
5. **Improvement over time** — Accumulated context + prompt refinement

**Graduation sequence for canvas tools:**
1. Pure primitives: `create_node`, `update_node`, `delete_node`, `get_state`, `move_node`
2. Domain tools when patterns emerge: `create_flowchart`, `auto_layout`
3. Optimized hot paths for common multi-step operations

**Dynamic discovery:**
- `list_node_types()` → agents discover capabilities at runtime
- When new item types are added, agents find them automatically

## Real-World Examples

### Figma MCP Server
- Runs as both remote cloud server and local desktop server
- Selection-based context (user selects frame, server exposes subtree)
- Exposes design variables, components, layout data
- Supports "Skills" — agent-level instructions for sequencing tool calls

### tldraw MCP Server
- 9 atomic tools: `get_snapshot`, `create_shape`, `update_shape`, `delete_shapes`, `connect_shapes`, `create_frame`, `create_flowchart`, `zoom_to_fit`, `clear_canvas`
- Architecture: MCP server (stdio) ↔ AI agent, WebSocket ↔ tldraw frontend

## Universal Adapter Patterns

### Pattern 1: MCP as universal layer
Canvas app → MCP Server → all MCP clients (Claude Code, Codex, Gemini, Cursor, etc.)

### Pattern 2: Protocol-agnostic tool registry
Canonical tool definitions → adapters for MCP, OpenAI function calling, Gemini function declarations

### Pattern 3: Dual-layer (MCP + AG-UI)
MCP Server (tool definitions) + AG-UI Server (UI state streaming). MCP for read/write, AG-UI for real-time sync.

### Pattern 4: WebSocket bridge (tldraw-style)
AI Agent ↔ stdio ↔ MCP Server ↔ WebSocket ↔ Canvas Frontend

## Sources

- [Claude Code MCP Docs](https://code.claude.com/docs/en/mcp)
- [MCP Specification 2025-06-18: Tools](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)
- [Codex CLI MCP Docs](https://developers.openai.com/codex/mcp)
- [Gemini CLI MCP Server Docs](https://google-gemini.github.io/gemini-cli/docs/tools/mcp-server.html)
- [AG-UI Protocol](https://docs.ag-ui.com/)
- [AG-UI Events](https://docs.ag-ui.com/concepts/events)
- [AG-UI State Management](https://docs.ag-ui.com/concepts/state)
- [State of Agentic UI: AG-UI vs MCP-UI vs A2UI](https://www.copilotkit.ai/blog/the-state-of-agentic-ui-comparing-ag-ui-mcp-ui-and-a2ui-protocols)
- [Agent-Native Architectures (every.to)](https://every.to/guides/agent-native)
- [Agent Native Architecture (Sam Keen)](https://writing.alteredcraft.com/p/agent-native-architecture)
- [Figma MCP Server](https://developers.figma.com/docs/figma-mcp-server/)
- [tldraw MCP Server](https://glama.ai/mcp/servers/@dpunj/tldraw-mcp)
- [Unified Tool Integration (Paper)](https://arxiv.org/html/2508.02979v1)
