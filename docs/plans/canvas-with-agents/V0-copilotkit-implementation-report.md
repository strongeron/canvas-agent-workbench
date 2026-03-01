# V0 CopilotKit Implementation Report

Date: February 28, 2026  
Branch: `codex/custom-canvas-ag-ui-trip`

## Scope Checked

Validated against:

- `/Users/strongeron/Evil Martians/Open Source/gallery-poc/docs/plans/canvas-with-agents/V0-plan.md`
- `/Users/strongeron/Evil Martians/Open Source/gallery-poc/docs/plans/canvas-with-agents/research-copilotkit-vite.md`
- `/Users/strongeron/Evil Martians/Open Source/gallery-poc/docs/plans/canvas-with-agents/phases.md`

## Current Status (Implemented)

1. Runtime endpoint (Vite middleware):
- File: `/Users/strongeron/Evil Martians/Open Source/gallery-poc/vite.config.ts`
- `copilotKitPlugin()` mounted at `/api/copilotkit`
- Uses CopilotKit single-route endpoint format (`{"method":"..."}`)
- Supports OpenRouter and Anthropic paths

2. Frontend provider + chat panel:
- Files:
  - `/Users/strongeron/Evil Martians/Open Source/gallery-poc/demo/main.tsx`
  - `/Users/strongeron/Evil Martians/Open Source/gallery-poc/components/canvas/CanvasTab.tsx`
  - `/Users/strongeron/Evil Martians/Open Source/gallery-poc/components/canvas/CanvasToolbar.tsx`
- App is wrapped with `<CopilotKit runtimeUrl="/api/copilotkit">`
- Canvas includes dockable `CopilotChat` panel from toolbar
- Copilot dev UI/inspector is now disabled by default for localhost clarity
  - Enable with `VITE_COPILOTKIT_DEV_UI=1`

3. Canvas state + actions for agent:
- File: `/Users/strongeron/Evil Martians/Open Source/gallery-poc/hooks/useCopilotCanvasActions.ts`
- Readable context added for:
  - canvas metadata
  - artboard summaries
  - lightweight items
  - available components
- Frontend actions added:
  - `createCanvasItem`
  - `updateCanvasItem`
  - `deleteCanvasItems`
  - `listCanvasItemTypes`

4. Chat behavior hardening:
- File: `/Users/strongeron/Evil Martians/Open Source/gallery-poc/components/canvas/CanvasTab.tsx`
- Instructions now explicitly require tool execution for mutation requests
- `CopilotChat` set to `suggestions="manual"` to reduce extra model calls/noise

## Validation Results

Validated in this workspace:

- Runtime health:
  - `POST /api/copilotkit` with `{"method":"info"}` returns runtime info
- UI:
  - Canvas chat opens from toolbar
  - Agent can create canvas items via tool calls (smoke-tested)
- Checks:
  - `npm run typecheck` passes
  - `npm run lint` passes with pre-existing warnings only

## Known Gaps / Risks

1. `useCopilotReadable` hierarchy limitation in current installed version:
- In `@copilotkit/react-core@1.52.1`, `parentId` is exposed in type docs but is not currently applied in the wrapper implementation.
- File inspected: `node_modules/@copilotkit/react-core/src/hooks/use-copilot-readable.ts`
- Impact: readable context still works, but explicit parent-child hierarchy may not be preserved as intended.

2. Model/provider behavior may vary by OpenRouter model:
- Some models can be less reliable with tool-first behavior.
- Current prompt/instruction tuning mitigates this, but prompt quality remains important for deterministic mutation flows.

## How To Use (Operator Flow)

1. Start app:

```bash
npm run dev -- --port 5174
```

2. Open Canvas:
- `http://localhost:5174/`
- Click toolbar icon: `Canvas agent chat`

3. Use action-oriented prompts:
- "Create an artboard named Hero at x 80 y 80 width 900 height 500."
- "Inside artboard <id>, add embed https://example.com at x 40 y 80."
- "Move item <id> to x 400 y 160."
- "Delete item <id>."

4. Expectation:
- Agent calls frontend actions and mutates the same canvas state used by manual editing.

## Environment Reference

OpenRouter:

```bash
COPILOTKIT_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-...
COPILOTKIT_OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_SITE_URL=http://localhost:5173
OPENROUTER_SITE_NAME=gallery-poc
```

Anthropic fallback:

```bash
COPILOTKIT_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
COPILOTKIT_ANTHROPIC_MODEL=claude-sonnet-4-20250514
```
