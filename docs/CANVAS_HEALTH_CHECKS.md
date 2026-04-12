# Canvas Health Checks

These checks are the fast release gate for the canvas and agent-native stack.

## Local commands

Run the focused health gate:

```bash
npm run check:health
```

This covers:
- TypeScript health via `npm run typecheck`
- stored-file backend coverage
- local MCP / CLI / runtime coverage
- UI flows for file dialogs and the main canvas surfaces

Run the visual baseline manually:

```bash
npm run dev -- --host 127.0.0.1 --port 5178
npm run test:visual -- --server http://127.0.0.1:5178
```

## CI workflow

GitHub Actions workflow:

- `.github/workflows/canvas-health.yml`

It has two lanes:

1. `Typecheck + Focused Health Tests`
- Runs on pull requests and pushes to `main`
- Executes `npm run check:health`

2. `Node Catalog Visual Baseline`
- Runs on pushes to `main`
- Can also be triggered manually with `workflow_dispatch`
- Starts the Vite dev server and runs `npm run test:visual`

## Coverage included in the fast health lane

### Storage and file library

- `tests/canvasFileStore.test.ts`
- `tests/canvasFileApi.test.ts`
- `tests/canvasFileAssets.test.ts`

### Agent-native runtime and MCP

- `tests/agentNativeManifest.test.ts`
- `tests/canvasAgentRuntime.test.ts`
- `tests/canvasAgentCli.test.ts`
- `tests/canvasMcpServer.test.ts`

### UI and surface flows

- `tests/canvasFileDialogs.test.tsx`
- `tests/colorCanvasReview.test.tsx`
- `tests/systemCanvas.test.tsx`
- `tests/canvasDeleteActions.test.tsx`

## What this gate is meant to catch

- broken `.canvas` file read/write flows
- regressions in stored file lifecycle operations
- broken local MCP surface exposure
- CLI/runtime regressions for agent-native sessions
- broken modal file flows in Canvas, Color Audit, or System Canvas
- major visual drift in the Node Catalog state preview

## What it does not try to cover

- every visual state in every canvas surface
- external remote embeds and third-party media behavior
- full Claude/Codex manual smoke sessions

Those remain manual smoke coverage and should be run from:

- [CANVAS_AGENT_MCP_SETUP.md](/Users/strongeron/Evil%20Martians/Open%20Source/gallery-poc/docs/CANVAS_AGENT_MCP_SETUP.md)
- [CANVAS_AGENT_MCP_COMMANDS.md](/Users/strongeron/Evil%20Martians/Open%20Source/gallery-poc/docs/CANVAS_AGENT_MCP_COMMANDS.md)
- [CANVAS_AGENT_STORED_FILE_SMOKE_TESTS.md](/Users/strongeron/Evil%20Martians/Open%20Source/gallery-poc/docs/CANVAS_AGENT_STORED_FILE_SMOKE_TESTS.md)
