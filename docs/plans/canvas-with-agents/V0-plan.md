---
shaping: true
---

# V0: CopilotKit Smoke Test — Implementation Plan

**Goal:** Validate the interaction model — can an agent read canvas state and create meaningful items?

**Effort:** ~90 lines of code, ~2-4 hours

**Decision gate:** After V0, decide whether to proceed with full MCP infrastructure (V1-V5) or iterate on the interaction model.

---

## Prerequisites

```bash
cd /Users/strongeron/Evil\ Martians/Open\ Source/gallery-poc
npm install @copilotkit/react-core @copilotkit/react-ui @copilotkit/runtime @anthropic-ai/sdk
```

Environment:
```
# Fill in /Users/strongeron/Evil Martians/Open Source/gallery-poc/.env.local
ANTHROPIC_API_KEY=sk-ant-...  # Add to .env or export
```

OpenRouter alternative:

```bash
cd /Users/strongeron/Evil\ Martians/Open\ Source/gallery-poc
npm install @copilotkit/react-core @copilotkit/react-ui @copilotkit/runtime @langchain/openai
```

Environment:
```
# Fill in /Users/strongeron/Evil Martians/Open Source/gallery-poc/.env.local
COPILOTKIT_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-...
COPILOTKIT_OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
OPENROUTER_SITE_URL=http://localhost:5173
OPENROUTER_SITE_NAME=gallery-poc
```

---

## Phase 1: Backend — CopilotKit Runtime Endpoint (~20 lines)

**File:** `vite.config.ts` — Add a new plugin alongside existing `paperImportPlugin()`

**What to do:**
1. Create a `copilotKitPlugin()` function (same pattern as `paperImportPlugin()`)
2. Use `copilotRuntimeNodeHttpEndpoint` with provider adapter:
   - `AnthropicAdapter` (direct Anthropic), or
   - `LangChainAdapter` + `@langchain/openai` for OpenRouter
3. Mount at `/api/copilotkit`

**Acceptance:** `curl -X POST http://localhost:5173/api/copilotkit -H 'content-type: application/json' --data '{"method":"info"}'` returns JSON with runtime `version` and `agents`.

Note: CopilotKit v1.52+ uses a single-route payload (`{"method":"..."}`), not legacy GraphQL payloads. Sending `{ "query": ... }` will return `Missing method field`.

---

## Phase 2: Frontend Provider + Chat Panel (~15 lines)

**Files to modify:**
- Main app entry (wrap with `<CopilotKit>` provider)
- Canvas layout component (add `<CopilotChat>` as dockable side panel)

**What to do:**
1. Wrap the app root in `<CopilotKit runtimeUrl="/api/copilotkit">`
2. Import `@copilotkit/react-ui/styles.css`
3. Add `<CopilotChat>` component as a collapsible side panel alongside the existing canvas sidebar
4. Set `instructions` prop with canvas-specific system prompt

**System prompt for the agent:**
```
You are a canvas design assistant. You can see the current canvas state including
all artboards, components, embeds, and media items. You can create, update, and
delete canvas items.

When creating items, position them logically relative to existing content.
Default sizes: embeds 640x360, media 480x270, artboards 800x600.
Use artboards to group related content. Items can be nested inside artboards
using parentId.
```

**Acceptance:** Chat panel appears. Can type messages and get responses from Claude.

---

## Phase 3: Canvas State → Agent Context (~20 lines)

**File:** New hook or added to existing canvas component

**What to do:**
1. Add `useCopilotReadable` for canvas metadata (item count, selected IDs)
2. Add `useCopilotReadable` for artboard summary (hierarchical, using parentId)
3. Add `useCopilotReadable` for all items with `convert` function that strips heavy metadata

**Key decisions:**
- Use `convert` to only send: `id, type, position, size, name/url/src` (skip embed status fields, capture metadata, etc.)
- Memoize the value objects to prevent re-serialization on every render
- Use `parentId` to create hierarchy: canvas → artboards → items

**Acceptance:** Ask agent "What's on the canvas?" — it describes the current items accurately.

---

## Phase 4: Canvas Tools — Agent Creates/Updates/Deletes (~40 lines)

**File:** New hook `hooks/useCopilotCanvasActions.ts`

**Actions to define:**

### createCanvasItem
```
Parameters:
  type: string (enum: component, embed, media, artboard)
  position: object { x: number, y: number }
  size: object { width: number, height: number } (optional, use defaults)
  url: string (for embeds)
  src: string (for media)
  name: string (for artboards)
  parentId: string (optional, for nesting in artboard)

Handler: calls addItem() from useCanvasState
```

### updateCanvasItem
```
Parameters:
  itemId: string
  position: object { x: number, y: number } (optional)
  size: object { width: number, height: number } (optional)
  rotation: number (optional)

Handler: calls updateItem() from useCanvasState
```

### deleteCanvasItems
```
Parameters:
  itemIds: string[]

Handler: calls removeItem() for each ID
```

### listCanvasItemTypes
```
Parameters: none

Handler: returns the 4 types with their required/optional properties
Discovery tool — agent calls this to understand what it can create.
```

**Wiring to existing canvas hooks:**
- All actions call the same `addItem` / `updateItem` / `removeItem` from `useCanvasState`
- Items created by agent are identical to user-created items (R4)
- Auto-selection on addItem is already built in

**Acceptance:** Tell agent "Create an artboard called 'Hero Section' at position 100, 100 with size 800x600" — artboard appears on canvas.

---

## Phase 5: Validation Tests

Run these prompts to test the interaction model:

| # | Prompt | Expected Result |
|---|--------|-----------------|
| 1 | "What's on the canvas?" | Accurate description of current items |
| 2 | "Create an artboard called 'Header' at 0,0 size 1200x200" | Artboard appears |
| 3 | "Add an embed of https://example.com inside the Header artboard" | Embed nested in artboard |
| 4 | "Move the Header artboard to 100, 50" | Artboard moves |
| 5 | "Create a 2x2 grid of artboards named Section 1-4" | 4 artboards in grid layout |
| 6 | "Delete all items on the canvas" | Canvas cleared |
| 7 | "Design a simple dashboard layout with header, sidebar, and content area" | Multiple artboards with logical layout |

**What to evaluate:**
- Does the agent understand spatial relationships?
- Does it position items logically relative to each other?
- Does it use artboard nesting correctly?
- Is the chat UX appropriate, or would a CLI panel be better?
- How fast is the response? (Claude API latency)

---

## Decision Gate

After running the validation tests, answer:

| Question | If Yes | If No |
|----------|--------|-------|
| Can the agent create useful canvas layouts? | Proceed to V1 | Improve context format first |
| Is the chat UX good for this use case? | Keep CopilotKit chat | Need CLI panel (V2) |
| Is Claude API fast enough? | API may be sufficient | Need local/streaming solution |
| Do we need Claude Code / Codex specifically? | Build MCP layer (V1) | CopilotKit may be enough |

---

## Files Changed Summary

| File | Change | Lines |
|------|--------|-------|
| `vite.config.ts` | Add `copilotKitPlugin()` | ~20 |
| App entry / layout | Wrap with `<CopilotKit>`, add `<CopilotChat>` | ~15 |
| `hooks/useCopilotCanvasActions.ts` | New file: readable + actions | ~55 |
| `package.json` | 4 new dependencies | — |
| `.env` | `ANTHROPIC_API_KEY` | 1 |
