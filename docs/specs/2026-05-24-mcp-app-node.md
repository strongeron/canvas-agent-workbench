---
title: "MCP-app node — render external MCP servers as live canvas nodes with agent-of-agents reach"
type: spec
status: awaiting-approval
date: 2026-05-24
origin: live session — user wants Codex to build this on a dedicated branch
---

# Problem

The canvas already supports HTML, React, media, mermaid, markdown, embed and
excalidraw nodes — every kind except the one thing it most needs to *compose
agent work*: external **MCP apps** as first-class nodes. Today an agent that
wants to reach Zapier, Linear, Slack, the filesystem, your own MCP servers etc.
must do it outside the canvas, with no shared workspace, no visible call log,
and no way for the user to see what the agent is doing across multiple apps.

This spec adds an **MCP-app node** type: connect to any MCP server (HTTP/SSE or
stdio), render its tool palette + live call log inside a canvas frame, persist
the connection per-canvas, and expose the embedded app's tools to **our**
canvas agent so one agent can compose many MCP apps end to end.

# Decisions (from scoping)

| Decision | Choice |
|---|---|
| Transport | **HTTP/SSE + stdio (subprocess)** in v1 — covers both hosted MCP apps (Zapier) and local CLIs (filesystem, claude-code-mcp). WebSocket deferred. |
| Agent reach | **Agent-of-agents.** Our canvas agent gets `list_mcp_app_tools` / `invoke_mcp_app_tool({ nodeId, … })` so it can drive every embedded app it sees. |
| Render | **Tool palette + live call log** (data UI only). No requirement that the embedded MCP server expose HTML. Resources/prompts surfaced if present, but the renderer is pure-data. |

# Constraints

- **Security-critical.** stdio means arbitrary local subprocess execution; HTTP
  MCP servers may need auth tokens. Both require explicit user confirmation
  before connect + sanitized env vars + a per-canvas allowlist persisted in
  `project.json`. Reuse the **localhost-bind + Origin guard** pattern from
  `/api/canvas/project/sync` for every new proxy endpoint.
- **No recursion runaway.** Our agent calling an embedded MCP tool that
  delegates back to our agent must be bounded (depth cap + cycle detection on
  the proxy layer).
- **Reuse the shipped MCP SDK.** `@modelcontextprotocol/sdk` (or whichever
  client the codebase already uses for `bin/canvas-mcp-server`) — do NOT roll
  a custom MCP client.
- **Reuse the shipped item-render pattern.** `CanvasMcpAppItem.tsx` +
  `CanvasMcpAppPropsPanel.tsx` mirror the existing item shape; new MCP tools
  live in `bin/canvas-mcp-server` + `utils/agentNativeManifest.ts` next to the
  ones we just shipped.
- **Persist sanely.** Connection config (transport, URL/command, headers/env
  refs) lives on the canvas item. Secrets (API keys, tokens) live in
  `project.json` `meta.mcpAppCreds` keyed by a connection id — never inlined
  in the .canvas file (which is committed).

# Approach

## A. Data model

New canvas item:

```ts
interface CanvasMcpAppItem extends CanvasItemBase {
  type: "mcp-app"
  appName: string                          // human label
  transport:
    | { kind: "http", url: string, headersRef?: string }
    | { kind: "stdio", command: string, args?: string[], envRef?: string, cwd?: string }
  // populated by the proxy after connect:
  status: "disconnected" | "connecting" | "connected" | "error"
  toolsCache?: McpToolDescriptor[]
  resourcesCache?: McpResourceDescriptor[]
  promptsCache?: McpPromptDescriptor[]
  recentCalls?: McpCallRecord[]            // capped ring buffer
}
```

`headersRef` / `envRef` are project-relative ids that point into
`project.json` `meta.mcpAppCreds[<id>]` (the actual secret).

## B. Server-side proxy

New module: `vite/api/mcpProxy/` — manages one MCP client connection per
canvas item id, multiplexed.

| Endpoint | Purpose |
|---|---|
| `POST /api/canvas/mcp-app/connect` | Open client for a node's transport config. Returns initial tool/resource/prompt lists. |
| `POST /api/canvas/mcp-app/disconnect` | Close client; cleanup subprocess if stdio. |
| `POST /api/canvas/mcp-app/invoke-tool` | `{ nodeId, toolName, args, callerDepth? }` → tool result. Streams progress if MCP server supports it. |
| `GET /api/canvas/mcp-app/log/:nodeId` | Server-tail of recent calls (audit + UI live log). |
| `POST /api/canvas/mcp-app/credentials` | Persist a header/env value into `project.json` `meta.mcpAppCreds`. Never returns secrets to the client. |

stdio subprocess lifecycle managed by a dedicated `McpStdioProcess` class
(spawn / pipe / restart / cleanup-on-server-shutdown / kill-orphans).

## C. Client renderer

- `components/canvas/CanvasMcpAppItem.tsx` — frame chrome (status pill, app
  name), embeds the tool-palette UI in `CanvasMcpAppToolPalette.tsx`
  (collapsible tool list with schema + Invoke button + arg-form generated from
  JSON Schema) and the live log in `CanvasMcpAppCallLog.tsx`.
- `components/canvas/CanvasMcpAppPropsPanel.tsx` — connection config form
  (transport picker, URL/command, headers/env editor that writes through the
  credentials endpoint), connect/disconnect, manual invoke, tool/resource
  filters.
- Toolbar **"Add MCP app"** entry (new sidebar primitive + dialog mirroring
  `CanvasNativeComponentDialog` — preset list: blank / Zapier MCP / Linear
  MCP / filesystem MCP / Claude Code MCP / custom).

## D. Agent integration

New MCP tools in `bin/canvas-mcp-server` (registered in
`utils/agentNativeManifest.ts`, runtime adapter in `bin/canvas-agent-runtime.mjs`):

- `register_mcp_app({ transport, appName? })` → creates a new MCP-app node on
  the canvas + connects.
- `list_mcp_app_tools({ nodeId })` → returns the embedded app's tool list.
- `invoke_mcp_app_tool({ nodeId, toolName, args })` → calls through the
  proxy; result returned synchronously (or async progress events).
- `get_mcp_app_log({ nodeId, limit? })` → recent calls + results.
- `disconnect_mcp_app({ nodeId })`.

These slot beside the canvas tools we already shipped (`get_canvas_state`,
`apply_structural_mutation`, etc.). Same manifest-test-asserts-wiring contract.

## E. Security model

- **stdio connect:** every first-time `command` requires a user-confirmation
  step (UI modal: "Allow `<command> <args>` to run?"). Confirmed commands are
  recorded in `project.json` `meta.mcpAppStdioAllowlist[]`. Agent-driven
  `register_mcp_app` with a non-allowlisted stdio command is REJECTED — the
  agent must ask the user to confirm via the UI first.
- **HTTP connect:** the URL is allowlisted per-canvas the same way (first use
  → user confirmation → persist). Headers referenced by `headersRef` are
  resolved server-side at call time; never returned to the client.
- **Localhost+Origin guard** on every new `/api/canvas/mcp-app/*` endpoint
  (same as `/api/canvas/project/sync`).
- **Recursion bound:** `invoke_mcp_app_tool` accepts `callerDepth` (default 0);
  if `callerDepth > 3` reject with `recursion-too-deep`. Embedded app tool
  calls that themselves call our MCP get incremented depth via the proxy.
- **Subprocess cleanup:** server-shutdown hook kills every spawned stdio MCP.

# Scope (v1)

- Node type + persistence + render + props panel.
- HTTP/SSE client (using shipped MCP SDK).
- stdio subprocess manager + allowlist + cleanup.
- 5 agent tools listed in (D) + manifest + tests.
- 4 preset connection templates (Zapier, Linear, filesystem, Claude Code MCP)
  + blank/custom.
- Credentials store in `project.json` `meta.mcpAppCreds` (server-only read).

# Non-goals (v1)

- WebSocket transport.
- Connection sharing across canvases (each canvas item is its own connection).
- Embedded HTML/UI rendering from MCP server resources (data UI only).
- Per-app handcrafted custom widgets (palette is generic).
- Edges/connections between MCP-app nodes (separate spec — Stream C; this
  spec produces nodes you can later connect).
- Cross-platform stdio (focus on macOS/Linux; Windows path-quoting is a
  follow-up).
- Long-running streaming tool results beyond a basic progress-event passthrough.

# Risks

| Risk | Mitigation |
|---|---|
| stdio subprocess = arbitrary code exec | Explicit user-confirmation + persisted allowlist; reject agent-driven connects to non-allowlisted commands |
| Auth tokens leak into `.canvas` files | Secrets only in `project.json` `meta.mcpAppCreds`; never inlined; `.canvas` only holds opaque refs |
| Agent-of-agents recursion loop | `callerDepth` cap + cycle detection in the proxy |
| Subprocess orphan zombies | Hard shutdown hook in dev server lifecycle; SIGKILL fallback |
| MCP SDK lifecycle bugs (SSE reconnect, broken pipe) | Reuse the SDK's reconnect helpers; surface `status: "error"` on the node; one-click reconnect |
| Sensitive args echoed into the call log | Log redaction by JSON-Schema field-name allowlist (`token`, `apiKey`, `secret`, `*_token`) |

# Open questions for approval

1. **Allowlist scope** — start with a small built-in allowlist of stdio
   commands (`@modelcontextprotocol/server-filesystem`, `claude-code-mcp`,
   …) plus user-confirmable arbitrary commands, or only allow user-confirmed
   commands with no built-ins? Recommend: built-in for the 4 presets + user
   confirmation for everything else.
2. **Credential storage** — `project.json` `meta.mcpAppCreds` plain (relies on
   filesystem permissions) vs OS keychain (more secure, more complex).
   Recommend: plain v1, keychain follow-up.
3. **Auto-reconnect on canvas open** — reconnect persisted MCP-app nodes
   automatically when the canvas opens, or wait for user to click Connect?
   Recommend: stdio → manual (avoid auto-spawning subprocesses on open); HTTP
   → auto-reconnect.

# Status

Awaiting your approval to move to `ce-plan`. On approval: commit this spec,
create the dedicated `feat/mcp-app-node` branch off main for the Codex session,
and write the implementation plan.
