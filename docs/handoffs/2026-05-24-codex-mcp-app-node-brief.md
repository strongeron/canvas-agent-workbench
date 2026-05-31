# Codex session brief — `codex/mcp-app-node`

**You are Codex, picking up a self-contained feature build on a dedicated
branch.** Everything you need is in this repo. Below is the read order, the
reuse map, the constraints, and a suggested execution sequence.

## Read first (in this order)

1. **Spec** — `docs/specs/2026-05-24-mcp-app-node.md` (the resolved decisions
   and security model — read fully)
2. **Plan** — `docs/plans/2026-05-24-001-feat-mcp-app-node-plan.md` (8
   implementation units, dependency-ordered, with file lists + test
   scenarios + verification)
3. **This brief** — patterns + constraints + ship procedure

## Reuse map (mirror these — do not invent)

| Need | File to mirror |
|---|---|
| New canvas item type + render shape | `components/canvas/CanvasMermaidItem.tsx`, `CanvasMermaidPropsPanel.tsx` |
| Item type union + render switch | `types/canvas.ts`, `components/canvas/CanvasWorkspace.tsx`, `components/canvas/CanvasTab.tsx` |
| Path-safe proxy endpoint w/ localhost guard | `vite/api/canvasProjectSync.ts`, `vite/api/resolveSandboxPath.ts`, `rejectIfNotLocalhost` in `vite.config.ts` |
| Per-project mapping persistence | `vite/api/syncTargetState.ts`, `vite.config.ts` `readProjectMeta` / `writeProjectMeta` |
| New MCP tool full path (manifest + op + runtime + server + doc + test) | the 4 tools shipped on the audit branch — `undo_source_mutation`, `redo_source_mutation`, `duplicate_items`, `set_canvas_active_theme`. Their pattern lives across `utils/agentNativeManifest.ts`, `utils/canvasAgentOperations.mjs`, `bin/canvas-agent-runtime.mjs`, `bin/canvas-mcp-server`, `docs/CANVAS_AGENT_MCP_COMMANDS.md`, `tests/canvasMcpServer.test.ts` |
| Sidebar entry + dialog | `components/canvas/CanvasNativeComponentDialog.tsx`, `components/canvas/CanvasSidebar.tsx`, the toolbar/sidebar wiring in `components/canvas/CanvasTab.tsx` |
| MCP SDK + existing MCP server | `bin/canvas-mcp-server`, `bin/canvas-agent-runtime.mjs` (check `package.json` for the dep) |

## Hard constraints (will break things if violated)

- **Client-import guard.** `utils/**/*.ts` must NOT import `node:*`, `fs`,
  `crypto`, `child_process`. The MCP client wrappers + subprocess manager +
  proxy live in `vite/api/**` and/or `bin/**`. Pure helpers (log shape,
  redaction, recursion bound) may live in `utils/**` if they import nothing
  Node-only. The repo enforces this in `eslint.config.js`; a leak silently
  blanks the canvas at runtime.
- **Manifest test enforcement.** `tests/agentNativeManifest.test.ts` asserts
  every manifest tool id is wired in the runtime. Adding a manifest entry
  without a runtime binding fails the suite.
- **Pre-commit hook.** A slop check blocks the first `git commit` attempt
  per repo (sets a flag file, allows on the second attempt). Just re-run the
  same `git commit` after the first block.
- **Pre-push hook.** Lefthook runs lint + typecheck + test before push; keep
  the full suite green.
- **All proxy endpoints localhost-bound.** Reuse the existing
  `rejectIfNotLocalhost` guard for every new `/api/canvas/mcp-app/*` route.
- **Atomic, all-or-nothing where state mutates persisted files.** Mirror
  `vite/api/canvasProjectSync.ts`'s tmp-then-rename + collision-proof random
  token pattern for any new persistent write (e.g. credentials store).
- **No secrets in `.canvas` files.** Item only stores `headersRef`/`envRef`
  string ids; secrets live in `project.json` `meta.mcpAppCreds[<ref>]`
  written by the server, never returned to the client.

## Suggested execution sequence

Follow the plan's phased delivery (Phase 1 → 5). Per phase:

1. Read the unit's `Files` + `Approach` + `Test scenarios`.
2. Check `Reuse map` above for the closest precedent in the codebase.
3. Implement.
4. Write the unit's tests; run only the unit's test file:
   `npm test -- tests/<file>.test.ts`.
5. When green, run `npm run typecheck`.
6. After every 2 units, run the full suite once: `npm test`.
7. Commit per logical unit using the conventional-commits style already in
   the repo (e.g. `feat(canvas): connect mcp http client (U2)`).

## Ship procedure (when all units done)

1. Full suite green + typecheck clean.
2. Push: `git push -u origin codex/mcp-app-node`.
3. Open PR against `main` with title
   `feat(canvas): MCP-app node — external MCP server as live canvas node`.
4. PR body should reference the spec + plan + summarize the 5 new agent tools
   + the security model. Mirror the audit-branch PR body shape (PR #5 on
   this repo).

## Open questions (defaults already taken — surface in PR body if changed)

1. stdio allowlist scope — default: built-in 4 presets + user-confirm for the
   rest.
2. Credentials storage — default: plain `project.json` `meta.mcpAppCreds`
   (keychain follow-up).
3. Auto-reconnect on canvas open — default: HTTP auto, stdio manual.

If the user wants different defaults, the spec is editable on this branch
before you start.

## What's NOT yours

- Audit P2/P3 follow-ups (separate branch `feat/agent-canvas-audit`, PR #5).
- Edges/connections between canvas nodes (separate spec — Stream C).
- The existing canvas behaviors (don't refactor what's working).

Good luck. The repo is small enough that all the patterns you need are
within one or two file-reads.
