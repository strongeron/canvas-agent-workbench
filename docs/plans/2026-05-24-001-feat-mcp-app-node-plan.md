---
title: "feat: MCP-app node — external MCP server as live canvas node with agent reach"
type: feat
status: active
date: 2026-05-24
origin: docs/specs/2026-05-24-mcp-app-node.md
handoff_to: codex (this branch is reserved for a Codex session)
---

# Overview

Build a new canvas item type `mcp-app` that connects to any external MCP
server (HTTP/SSE or stdio subprocess), renders its tool palette + live call log
in the canvas frame, persists per-canvas, and exposes the embedded app's tools
to our agent via new MCP tools. Spec at
`docs/specs/2026-05-24-mcp-app-node.md` carries the resolved decisions and
security model — read it first.

This plan is sized for a single Codex session on branch `codex/mcp-app-node`
off main. P2/P3 audit gaps from the prior branch are intentionally out of
scope.

---

## Defaults from spec open questions (taken)

1. **stdio allowlist:** built-in 4 presets (Zapier, Linear, filesystem, Claude
   Code MCP) + user-confirm for anything else.
2. **Credentials:** plain `project.json` `meta.mcpAppCreds` (server-only read);
   keychain is a follow-up.
3. **Auto-reconnect on canvas open:** HTTP auto-reconnect; stdio manual
   (don't auto-spawn subprocesses on open).

User can override before Codex starts.

---

## Requirements Trace

- R1. New canvas item type `mcp-app` with transport config persisted on the item, secrets persisted server-side in `project.json` `meta.mcpAppCreds` keyed by ref id (never inlined in the .canvas file).
- R2. HTTP/SSE MCP client per-node using the project's existing MCP SDK; reconnect on disconnect; surface `status: "disconnected" | "connecting" | "connected" | "error"` on the item.
- R3. stdio subprocess MCP client per-node with explicit user-confirmation flow on first non-allowlisted command; persist confirmed commands to `project.json` `meta.mcpAppStdioAllowlist[]`. Built-in allowlist seeded with the 4 preset commands.
- R4. Proxy endpoints under `/api/canvas/mcp-app/*` (connect, disconnect, invoke-tool, log, credentials) all guarded by the existing localhost-bind + Origin guard pattern; subprocess cleanup on server shutdown.
- R5. Tool palette + live call log renderer (`CanvasMcpAppItem.tsx`); props panel with transport config + connect/disconnect + manual invoke (`CanvasMcpAppPropsPanel.tsx`).
- R6. Sidebar "Add MCP app" entry + dialog mirroring `CanvasNativeComponentDialog`; preset list = 4 + custom.
- R7. Five agent tools wired through manifest + runtime + MCP server + docs + tests: `register_mcp_app`, `list_mcp_app_tools`, `invoke_mcp_app_tool`, `get_mcp_app_log`, `disconnect_mcp_app`. Agent-driven `register_mcp_app` with a non-allowlisted stdio command is REJECTED.
- R8. Recursion bound: `invoke_mcp_app_tool` carries `callerDepth`; reject when `> 3`. Embedded tool calls that re-enter our MCP get incremented depth.
- R9. Log redaction: arg fields matching `token`, `apiKey`, `secret`, `*_token` are masked in the call log.

---

## Scope Boundaries

Out of scope for this plan (per spec non-goals):

- WebSocket transport.
- Cross-canvas connection sharing.
- Embedded HTML/UI rendering from MCP server resources (data UI only).
- Per-app handcrafted custom widgets.
- Edges/connections between MCP-app nodes (separate spec — Stream C).
- Cross-platform stdio polish beyond macOS/Linux.
- Long-running streaming results beyond basic progress passthrough.
- OS keychain for credentials.

---

## Context & Reuse Map (what to mirror, file:area)

| Need | Mirror this | Where |
|---|---|---|
| New canvas item type + render + props panel | `CanvasMermaidItem` / `CanvasMermaidPropsPanel` (similar embedded-render shape) | `components/canvas/CanvasMermaidItem.tsx`, `CanvasMermaidPropsPanel.tsx` |
| Item registry / type union | existing item types | `types/canvas.ts`, `components/canvas/CanvasWorkspace.tsx` render switch, `components/canvas/CanvasTab.tsx` add/duplicate paths |
| Path-safe proxy endpoint w/ localhost guard | `vite/api/canvasProjectSync.ts` + `resolveSandboxPath.ts` | reuse `rejectIfNotLocalhost` from `vite.config.ts` |
| Subprocess lifecycle (stdio MCP) | (no existing precedent in repo) — use `node:child_process` `spawn`, attach `SIGTERM`/`SIGKILL` shutdown hook in the dev-middleware lifecycle | `vite.config.ts` (server hook), new `vite/api/mcpProxy/McpStdioProcess.ts` |
| MCP client wrapper | the project already imports an MCP SDK for `bin/canvas-mcp-server` — find the dep in `package.json` (`@modelcontextprotocol/sdk` or equivalent) and reuse its client classes for both transports | `package.json`, `bin/canvas-mcp-server`, `bin/canvas-agent-runtime.mjs` |
| Persisted per-project mapping (allowlist + creds) | `meta.syncTarget` + `meta.localScan` precedent in `project.json` | `vite.config.ts` `readProjectMeta` / `writeProjectMeta`, `vite/api/syncTargetState.ts` |
| New MCP tools (manifest + ops + runtime + server + docs + tests) | the 4 tools shipped on the audit branch (`undo_source_mutation`, `redo_source_mutation`, `duplicate_items`, `set_canvas_active_theme`) | `utils/agentNativeManifest.ts`, `utils/canvasAgentOperations.mjs`, `bin/canvas-agent-runtime.mjs`, `bin/canvas-mcp-server`, `docs/CANVAS_AGENT_MCP_COMMANDS.md`, `tests/canvasMcpServer.test.ts`, `tests/agentNativeManifest.test.ts` |
| Sidebar entry + dialog | `CanvasNativeComponentDialog.tsx` + the toolbar/sidebar wiring for "Add native component" | `components/canvas/CanvasNativeComponentDialog.tsx`, `components/canvas/CanvasTab.tsx`, `components/canvas/CanvasSidebar.tsx` |

**Client-import guard (CRITICAL):** `utils/**/*.ts` must NOT import `node:*`/`fs`/`crypto`/`child_process`. The MCP client wrappers + subprocess manager + proxy live in `vite/api/**` and/or `bin/**`. Anything pure (call log shape, redaction helper) is fine to live in `utils/**`.

---

## Implementation Units

- U1. **Data model: `CanvasMcpAppItem` type + canvas integration**

**Goal:** Define the new item type end-to-end so subsequent units have something to render and operate on.

**Requirements:** R1

**Dependencies:** None

**Files:**
- Modify: `types/canvas.ts` (add `CanvasMcpAppItem` interface + union variant)
- Modify: `components/canvas/CanvasWorkspace.tsx` (add render branch — placeholder OK, real renderer lands in U5)
- Modify: `components/canvas/CanvasTab.tsx` (add to add/duplicate/delete switches)
- Modify: `vite.config.ts` (`readProjectMeta`/`writeProjectMeta` for `meta.mcpAppCreds` + `meta.mcpAppStdioAllowlist`)
- Test: `tests/canvasMcpAppItem.test.ts`

**Approach:**
- Item shape per spec (transport, status, toolsCache, resourcesCache, promptsCache, recentCalls, headersRef/envRef).
- Persist transport config on the item; secrets go through `meta.mcpAppCreds[<ref>]` server-side only.
- Duplicate-items must clear connection state (`status: "disconnected"`, drop caches, drop log) — new copy starts cold.

**Test scenarios:**
- Happy: serialize → deserialize → item shape round-trips with transport intact, secrets are refs only.
- Edge: duplicate clears state.
- Error: missing `transport` rejected at type level + runtime guard.

---

- U2. **HTTP/SSE MCP client wrapper (server-side)**

**Goal:** Connect to an HTTP/SSE MCP server, fetch tools/resources/prompts, invoke tools, manage reconnect.

**Requirements:** R2

**Dependencies:** U1

**Files:**
- Create: `vite/api/mcpProxy/McpHttpClient.ts` (server-side, can use `node:*`)
- Test: `tests/mcpHttpClient.test.ts` (mock SSE server via a tiny in-process http handler)

**Approach:**
- Reuse the MCP SDK already in `bin/canvas-mcp-server`. Wrap it in a `McpHttpClient` class with `connect / listTools / invokeTool / disconnect / on('status', cb)`.
- Resolve `headersRef` from `project.json` `meta.mcpAppCreds` at connect time.
- Surface `status` events; expose latest tool/resource/prompt cache.

**Test scenarios:**
- Happy: connect → listTools → invokeTool → result. 
- Error: 401 from server → `status: "error"` + clean caches.
- Edge: SSE disconnect → auto-reconnect once, then emit error.

---

- U3. **stdio MCP subprocess wrapper (server-side)**

**Goal:** Spawn an MCP server as a subprocess, frame stdin/stdout, surface tools, clean up on shutdown.

**Requirements:** R3

**Dependencies:** U1

**Files:**
- Create: `vite/api/mcpProxy/McpStdioProcess.ts`
- Create: `vite/api/mcpProxy/stdioAllowlist.ts` (seed allowlist + persisted-allowlist helpers)
- Modify: `vite.config.ts` (register shutdown hook that kills every spawned stdio process)
- Test: `tests/mcpStdioProcess.test.ts` (use a tiny echo MCP-shaped subprocess in `tests/fixtures/`)

**Approach:**
- `spawn(command, args, { env: resolvedEnv, cwd, stdio: ["pipe","pipe","pipe"] })`. Reuse the MCP SDK's stdio transport.
- Built-in allowlist: `@modelcontextprotocol/server-filesystem`, `claude-code-mcp`, `@modelcontextprotocol/server-zapier`, `@linear/mcp-server` (verify the actual package names at impl time).
- Persisted allowlist in `meta.mcpAppStdioAllowlist[]` (append on user confirmation).
- Shutdown hook: SIGTERM → 2s grace → SIGKILL.

**Test scenarios:**
- Happy: spawn allowlisted command, list tools, invoke, disconnect → process exited.
- Error: non-allowlisted command + no user-confirm flag → rejected.
- Edge: subprocess crash → `status: "error"`, no zombie.
- Integration: server shutdown kills all spawned processes.

---

- U4. **Proxy endpoints + recursion guard + log redaction**

**Goal:** HTTP API surface that the client + agent use to drive embedded MCP apps.

**Requirements:** R4, R8, R9

**Dependencies:** U2, U3

**Files:**
- Create: `vite/api/mcpProxy/canvasMcpAppConnect.ts`
- Create: `vite/api/mcpProxy/canvasMcpAppDisconnect.ts`
- Create: `vite/api/mcpProxy/canvasMcpAppInvokeTool.ts`
- Create: `vite/api/mcpProxy/canvasMcpAppLog.ts`
- Create: `vite/api/mcpProxy/canvasMcpAppCredentials.ts`
- Create: `vite/api/mcpProxy/recursionBound.ts` (pure)
- Create: `vite/api/mcpProxy/logRedaction.ts` (pure helper, can mirror to `utils/` if no node imports)
- Modify: `vite.config.ts` (register all 5 routes behind `rejectIfNotLocalhost`)
- Test: `tests/canvasMcpAppProxy.test.ts`

**Approach:**
- Connection registry keyed by `nodeId` — singleton map managed by the proxy module.
- `invoke-tool`: redact args via JSON-Schema-aware allowlist (`token, apiKey, secret, *_token`), append to per-node call log (capped ring buffer ~100 entries), enforce `callerDepth ≤ 3` from request body.
- Credentials endpoint: write-only from client perspective (never returns secrets); stores into `meta.mcpAppCreds[<ref>]`.
- All endpoints behind localhost+Origin guard (reuse from `vite.config.ts`).

**Test scenarios:**
- Happy: connect HTTP → invoke → result + redacted log entry.
- Happy: connect stdio (allowlisted) → invoke → result.
- Error: `callerDepth = 4` → 429 `recursion-too-deep`.
- Error: redaction masks `token` arg in log even when caller sends it plain.
- Error: credentials endpoint never returns the stored secret back.

---

- U5. **Renderer + props panel (client)**

**Goal:** Visible canvas frame for the MCP-app node + inspector.

**Requirements:** R5

**Dependencies:** U1, U4

**Files:**
- Create: `components/canvas/CanvasMcpAppItem.tsx`
- Create: `components/canvas/CanvasMcpAppToolPalette.tsx`
- Create: `components/canvas/CanvasMcpAppCallLog.tsx`
- Create: `components/canvas/CanvasMcpAppPropsPanel.tsx`
- Modify: `components/canvas/CanvasWorkspace.tsx` (replace U1 placeholder with real renderer)
- Test: `tests/canvasMcpAppItem.test.tsx`, `tests/canvasMcpAppToolPalette.test.tsx`, `tests/canvasMcpAppCallLog.test.tsx`

**Approach:**
- Frame chrome: status pill (disconnected/connecting/connected/error), app name, kebab menu (disconnect / reconnect).
- Tool palette: collapsible tool list with schema preview + Invoke button. Form generated from JSON Schema (simple text/number/bool first; nested objects render as raw JSON textarea for v1).
- Call log: live tail of recent calls (timestamp · tool · status · redacted args summary · result preview).
- Props panel: transport picker, URL/command, headers/env editor (writes through credentials endpoint, never echoes secrets), connect/disconnect button, manual invoke shortcut.

**Test scenarios:**
- Happy: connected node → tool list renders → Invoke triggers proxy call → result lands in log.
- Edge: disconnected → palette + log show empty states with reconnect CTA.
- Error: status="error" → red pill + last error message + Reconnect button.

---

- U6. **Sidebar entry + Add-MCP-app dialog**

**Goal:** First-class entry point to create a new MCP-app node.

**Requirements:** R6

**Dependencies:** U1, U5

**Files:**
- Create: `components/canvas/CanvasAddMcpAppDialog.tsx` (mirror `CanvasNativeComponentDialog`)
- Modify: `components/canvas/CanvasSidebar.tsx` (new "MCP app" primitive button)
- Modify: `components/canvas/CanvasTab.tsx` (open/close dialog state + handleAddMcpApp)
- Test: `tests/canvasAddMcpAppDialog.test.tsx`

**Approach:**
- Dialog has the 4 presets (Zapier, Linear, filesystem, Claude Code) + Custom. Each preset prefills transport + command/url; user adjusts.
- "Add" creates the canvas item via the U1/U5 path; immediately attempts connect (stdio: shows confirmation modal if command not yet allowlisted; HTTP: connects).

**Test scenarios:**
- Happy: pick preset → confirm → item lands on canvas + auto-connects.
- Edge: custom stdio command not allowlisted → confirmation modal, persists on accept.
- Error: connect fails → item lands in `status: "error"` with the message in props panel.

---

- U7. **Agent tools + manifest sync**

**Goal:** Expose the 5 MCP tools so the canvas agent can register, list, invoke, log, disconnect embedded MCP apps.

**Requirements:** R7

**Dependencies:** U4

**Files:**
- Modify: `utils/agentNativeManifest.ts` (add 5 entries, destructive flags as appropriate)
- Modify: `utils/canvasAgentOperations.mjs` (pure ops where applicable; the actual invocations go through the dev-server proxy via the runtime adapter)
- Modify: `bin/canvas-agent-runtime.mjs` (adapter calls into `/api/canvas/mcp-app/*`)
- Modify: `bin/canvas-mcp-server` (tool schemas + dispatch handlers)
- Modify: `docs/CANVAS_AGENT_MCP_COMMANDS.md` (new section)
- Modify: `tests/canvasMcpServer.test.ts` (one happy-path per tool)
- Modify: `tests/agentNativeManifest.test.ts` (asserts ids wired — should stay green automatically)

**Approach:**
- Mirror exactly the pattern used by the 4 audit-branch tools (manifest entry + op + runtime adapter + MCP tool + doc + test).
- `register_mcp_app` checks stdio allowlist on the agent path; non-allowlisted → reject with `requires-user-confirm` error and surfaces the command to the user via a UI hint event.
- `invoke_mcp_app_tool` passes `callerDepth` (incremented per hop) through to the proxy; proxy enforces the bound.

**Test scenarios:**
- Happy: agent registers an allowlisted HTTP MCP app → lists tools → invokes → log has entry.
- Error: agent registers a non-allowlisted stdio command → rejected with `requires-user-confirm`.
- Error: agent invokes embedded tool with `callerDepth=4` → rejected.
- Manifest-test green for 5 new ids.

---

- U8. **Security hardening + cross-cutting integration tests**

**Goal:** Prove the security model + lifecycle end-to-end.

**Requirements:** R4, R8, R9

**Dependencies:** U2, U3, U4, U7

**Files:**
- Test: `tests/canvasMcpAppSecurity.test.ts` (integration)

**Approach:**
- Subprocess cleanup on server shutdown (spawn N processes → trigger shutdown hook → assert all PIDs gone).
- stdio allowlist persistence (confirm → persist → second connect skips confirmation).
- Credentials never round-trip to client (POST a secret, GET should never include it).
- Recursion: agent → embedded app whose tool calls back into our MCP → bounded at depth 3.
- HTTP `headersRef` resolved server-side, not in client payload.
- Origin guard rejects non-localhost.

---

## Phased Delivery

1. **Phase 1 — Foundation:** U1.
2. **Phase 2 — Transports:** U2, U3 (parallel-safe).
3. **Phase 3 — Proxy:** U4.
4. **Phase 4 — UI:** U5, U6.
5. **Phase 5 — Agent + hardening:** U7, U8.

---

## Risks & Dependencies

| Risk | Mitigation |
|---|---|
| stdio subprocess = arbitrary local exec | Built-in allowlist + user-confirmation for non-allowlisted + persisted allowlist in `project.json` (R3) |
| Auth tokens leak into committed .canvas files | Secrets only in `project.json` `meta.mcpAppCreds`, refs in item, server-only read (R1, R4) |
| Agent-of-agents recursion loop | `callerDepth` ≤ 3 enforced at proxy (R8) |
| Subprocess zombies on dev-server crash | Hard shutdown hook with SIGTERM→SIGKILL (R3) |
| MCP SDK transport quirks (SSE reconnect) | Reuse SDK's reconnect helpers; surface `error` status on the node; one-click Reconnect |
| Sensitive args echoed into call log | Field-name allowlist redaction (R9) |
| Manifest-vs-runtime drift (we just fixed it on audit branch) | Manifest test asserts every new id is wired (preserve) |

---

## Documentation / Operational Notes

- Update `docs/CANVAS_AGENT_MCP_COMMANDS.md` for the 5 new tools (U7).
- Document the localhost-bind expectation on the new proxy endpoints (mirror the `/api/canvas/project/sync` header comment).
- Capture learnings to `docs/solutions/` after landing (`ce-compound`): the subprocess-lifecycle + agent-of-agents recursion patterns are reusable.

---

## Sources & References

- **Spec:** [docs/specs/2026-05-24-mcp-app-node.md](docs/specs/2026-05-24-mcp-app-node.md)
- **Audit context:** `docs/audits/2026-05-23-agent-canvas-coverage.md` (sibling branch `feat/agent-canvas-audit`)
- Path-safety reference: `vite/api/canvasProjectSync.ts` + `vite/api/resolveSandboxPath.ts`
- Manifest sync precedent: commit `a117785` on `feat/agent-canvas-audit`
- MCP SDK: see `package.json` + `bin/canvas-mcp-server`
- Item-render mirror: `components/canvas/CanvasMermaidItem.tsx`
- Dialog mirror: `components/canvas/CanvasNativeComponentDialog.tsx`
