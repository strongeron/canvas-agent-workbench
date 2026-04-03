# Report Idea: CLI vs MCP for Canvas Agents

Date: April 2, 2026
Status: Working concept

## Thesis

For canvas iteration, the best agent-native shape is not CLI *or* MCP.

It is:

`shared canvas operations core -> CLI face + MCP face`

The CLI face is optimized for the inner loop:

- cheap tool invocation
- no upfront schema injection cost
- native stdout streaming
- simple screenshots and fast repeated mutations

The MCP face is optimized for structured context:

- typed resources
- typed tools
- guided prompts
- durable discovery contract for multiple agents

## Important Note

The benchmark-style numbers often attached to this argument are useful as a hypothesis, but they are **not yet measured for this repo**.

Treat claims like:

- "CLI is 4-35x cheaper"
- "MCP injects 47K tokens upfront"
- "MCP succeeds 72%"

as directional external signals until we run our own measurements against:

- `bin/canvas-agent`
- `bin/canvas-mcp-server`
- actual Color Audit / Canvas tasks
- the current Codex / Claude runtime mix

## Product Shape

### One capability layer

The real logic should live once:

- read state
- create/update/delete nodes or items
- run audits
- export tokens
- capture screenshots

### Two delivery faces

#### CLI face

Examples:

- `bin/canvas-agent state`
- `bin/canvas-agent color-audit-state`
- `bin/canvas-agent color-audit-export`
- future:
  - `bin/canvas-agent create-color-node`
  - `bin/canvas-agent update-color-node`
  - `bin/canvas-agent audit-color`
  - `bin/canvas-agent screenshot`

Best for:

- rapid create -> inspect -> adjust loops
- bash-native agents
- streaming progress
- low-overhead tool discovery via `help`

#### MCP face

Examples:

- `workspace://manifest`
- `workspace://surface/canvas/state`
- `workspace://surface/color-audit/state`
- `workspace://surface/color-audit/export-preview`
- prompts:
  - `canvas-layout-review`
  - `build-color-audit-palette`
  - `audit-color-contrast`
  - `review-node-system`

Best for:

- typed discovery
- structured reads
- guided workflows
- cross-agent interoperability

## Current Repo Status

### Already present

- CLI face exists in early form:
  - `bin/canvas-agent`
- MCP face exists in early form:
  - `bin/canvas-mcp-server`
- Shared runtime helpers exist:
  - `bin/canvas-agent-runtime.mjs`

### Current imbalance

The repo currently has:

- a stronger MCP read/discovery story
- a working Canvas mutation story
- a weaker shared operations-core story

What is still missing is the explicit middle layer:

`operations core -> CLI + MCP`

Today some behavior is still routed through existing session/runtime code rather than a clean shared operations module.

## Design Decision

We should build toward:

1. Shared canvas/color operations core
2. CLI wrappers over that core
3. MCP tools/resources/prompts over that same core

This keeps:

- CLI fast for iteration
- MCP strong for discovery and structure
- runtime support portable across Codex, Claude, and future agents

## Proposed Next Slice

1. Extract a small shared operations module for Color Audit reads.
2. Keep `bin/canvas-agent` as the cheapest local agent loop.
3. Keep `bin/canvas-mcp-server` as the structured contract layer.
4. Add one CLI screenshot/export-oriented command only when the underlying core exists.

## Candidate Future Benchmark

Once the shared operations layer exists, measure:

- token cost for CLI vs MCP on the same task
- latency for repeated create/update/audit loops
- reliability across 20 repeated calls
- screenshot loop usability for agent-driven iteration

That will let us publish a repo-specific `CLI vs MCP` report grounded in our own system instead of borrowed numbers.
