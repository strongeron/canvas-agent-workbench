# Canvas Agent MCP Setup

This repo exposes a local stdio MCP server for agents at:

- [bin/canvas-mcp-server](/Users/strongeron/Evil%20Martians/Open%20Source/gallery-poc/bin/canvas-mcp-server)

The intended flow is:

1. Start the app.
2. Attach a canvas-agent session for the project/surface you want.
3. Run Claude Code or Codex with the local MCP server enabled.

## Surface Coverage

Current agent coverage:

- `Canvas`: read + create + update + delete workspace items
- `Color Audit`: read + create + update + delete nodes and edges, generate templates, inspect export preview
- `System Canvas`: read + create + update + delete authored nodes and edges, patch scale config, switch views, regenerate, apply scale vars
- `Node Catalog`: read-only review surface for all current node families and states

So the answer is:

- yes, you can read and write the main app canvases now
- yes, you can ask agents to create and iterate on nodes/items
- no, `Node Catalog` itself is not editable by design

## One-Time Flow

Start the app:

```bash
npm run dev -- --host 127.0.0.1 --port 5178
```

Attach a session from the repo root:

```bash
bin/canvas-agent attach --project demo --server http://127.0.0.1:5178
```

That writes:

- [.canvas-agent/attached-session.json](/Users/strongeron/Evil%20Martians/Open%20Source/gallery-poc/.canvas-agent/attached-session.json)

The MCP server and CLI read that file automatically.

## Claude Code

Repo-local config:

- [.mcp/claude.canvas-mcp.json](/Users/strongeron/Evil%20Martians/Open%20Source/gallery-poc/.mcp/claude.canvas-mcp.json)

Helper launcher:

- [run-claude-canvas-mcp.sh](/Users/strongeron/Evil%20Martians/Open%20Source/gallery-poc/scripts/run-claude-canvas-mcp.sh)

Run:

```bash
./scripts/run-claude-canvas-mcp.sh
```

If you prefer the raw command:

```bash
claude \
  --strict-mcp-config \
  --mcp-config /Users/strongeron/Evil\ Martians/Open\ Source/gallery-poc/.mcp/claude.canvas-mcp.json \
  --append-system-prompt "This session is attached to a live canvas MCP server named \"canvas\". Prefer MCP resources and tools before Bash when the task touches the app surfaces. Start with workspace://manifest or get_workspace_manifest."
```

## Codex

Repo-local TOML snippet:

- [.mcp/codex.canvas-mcp.toml](/Users/strongeron/Evil%20Martians/Open%20Source/gallery-poc/.mcp/codex.canvas-mcp.toml)

Helper launcher:

- [run-codex-canvas-mcp.sh](/Users/strongeron/Evil%20Martians/Open%20Source/gallery-poc/scripts/run-codex-canvas-mcp.sh)

Run:

```bash
./scripts/run-codex-canvas-mcp.sh
```

The script uses the same inline MCP overrides as the runtime adapter implementation, because Codex is currently configured that way in this repo.

## Useful CLI Checks

After `attach`, these should work immediately:

```bash
bin/canvas-agent workspace-manifest
bin/canvas-agent state
bin/canvas-agent color-audit-state
bin/canvas-agent system-canvas-state
bin/canvas-agent node-catalog-state
bin/canvas-agent screenshot canvas
bin/canvas-agent workspace-debug canvas 20
```

## Recommended First Prompts

### Canvas

```text
Read the current canvas, summarize it, then create a new artboard with a heading, body text, and primary button using registered primitives.
```

### Color Audit

```text
Read the current Color Audit graph, generate the shadcn template from brand #3b82f6 and accent #a855f7, then show me the export preview.
```

### System Canvas

```text
Read the current System Canvas state, increase icon stroke, switch to layout view, regenerate the scale graph, apply scale vars, then add one explainer node and connect it.
```

### Node Catalog

```text
Review all node families and call out any title, pill, connector, or overflow issues.
```

## Expected Working Behavior

When the setup is correct:

- the agent can read `workspace://manifest`
- the agent can read state/resources for the chosen surface
- write tools mutate the live UI without page reload
- `workspace-debug` shows the event trail
- screenshot capture returns a current render for the selected surface

## Relevant Files

- [bin/canvas-agent](/Users/strongeron/Evil%20Martians/Open%20Source/gallery-poc/bin/canvas-agent)
- [bin/canvas-mcp-server](/Users/strongeron/Evil%20Martians/Open%20Source/gallery-poc/bin/canvas-mcp-server)
- [bin/canvas-agent-runtime.mjs](/Users/strongeron/Evil%20Martians/Open%20Source/gallery-poc/bin/canvas-agent-runtime.mjs)
- [utils/agentNativeRuntimeAdapters.ts](/Users/strongeron/Evil%20Martians/Open%20Source/gallery-poc/utils/agentNativeRuntimeAdapters.ts)
