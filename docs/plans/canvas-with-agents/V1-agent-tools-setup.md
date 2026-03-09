# Canvas Agent Tools V1 Setup

## Implemented now

1. Web search tool:
   - Copilot action: `searchWeb`
   - Server API: `POST /api/agent/search-web`
   - Providers: Tavily, Brave, SerpAPI (auto-fallback)

2. Route tool:
   - Copilot action: `getRoute`
   - Server API: `POST /api/agent/get-route`
   - Providers: Mapbox Directions, Google Routes API v2 (auto-fallback)

3. Asset search tool:
   - Copilot action: `searchAssets`
   - Server API: `POST /api/agent/search-assets`
   - Providers: Pexels, Unsplash, Giphy, Pixabay, YouTube
   - Pinterest support:
     - official API via `PINTEREST_ACCESS_TOKEN` when configured
     - automatic fallback to web-search-backed references (Pinterest/Dribbble/Behance)

4. Asset import tool:
   - Copilot action: `importAssetFromUrl`
   - Server API: `POST /api/agent/import-asset`
   - Stores remote assets in local media store and returns `mediaUrl`
   - Optional direct add-to-canvas from Copilot action

5. One-shot route-to-node tool:
   - Copilot action: `createMapNodeFromRoute`
   - Flow: route lookup -> map/embed URL -> create canvas embed node

## Files changed

- `hooks/useCopilotCanvasActions.ts`
- `components/canvas/CanvasTab.tsx`
- `vite.config.ts`
- `.env.example`

## Required environment keys

Add these to `.env.local` (pick at least one per capability group):

### Copilot runtime

- `OPENROUTER_API_KEY`
- `COPILOTKIT_PROVIDER=openrouter`
- `COPILOTKIT_OPENROUTER_MODEL=openai/gpt-4.1-mini`

### Web search (at least one)

- `TAVILY_API_KEY`
- `BRAVE_SEARCH_API_KEY`
- `SERPAPI_API_KEY`

### Routes (at least one)

- `MAPBOX_ACCESS_TOKEN`
- `GOOGLE_MAPS_API_KEY` (Google Routes API v2 enabled in Google Cloud)

### Assets (any you need)

- `PEXELS_API_KEY`
- `UNSPLASH_ACCESS_KEY`
- `GIPHY_API_KEY`
- `PIXABAY_API_KEY`
- `YOUTUBE_API_KEY`
- `PINTEREST_ACCESS_TOKEN` (optional for official Pinterest API)
- `PINTEREST_COUNTRY_CODE` (default `US`)
- `PINTEREST_LOCALE` (default `en-US`)
- `PINTEREST_ENABLE_PARTNER_SEARCH` (default `true`)

## Pinterest note

- If `PINTEREST_ACCESS_TOKEN` is set, V1 now attempts official Pinterest API search first.
- If Pinterest API is unavailable for your app/scopes, it automatically falls back to web reference discovery (`site:pinterest.com`).
- No unofficial scraping is used.

## Quick smoke prompts

1. `search the web for "best dashboard ux references 2026" and return top links`
2. `find route from Munich to Vienna and add map node`
3. `search assets for "neon grid background" image and import best one`
4. `search assets for "agent workflow gif" type gif`
5. `search pinterest references for "mobile finance onboarding"`

## V2 update: native diagram nodes

Implemented native diagram support in canvas:

1. Mermaid node (`type=mermaid`)
   - Stores Mermaid source + theme
   - Native render in canvas (freeform + artboard layout)
   - Inspector for editing source/theme/background

2. Excalidraw node (`type=excalidraw`)
   - Native Excalidraw editor embedded in node
   - Scene persisted in canvas state
   - Inspector for title/background and Mermaid remap

3. Agent actions
   - `createCanvasItem` now supports `mermaid` and `excalidraw`
   - New dedicated diagram actions:
     - `createMermaidNode`
     - `createExcalidrawNode`
     - `remapExcalidrawFromMermaid`
   - `updateCanvasItem` supports Mermaid/Excalidraw fields
   - `listCanvasItemTypes` now documents both types
   - New `convertMermaidToExcalidraw` tool for one-shot conversion

### Diagram smoke prompts

1. `create a mermaid node with a flowchart for onboarding steps`
2. `convert that mermaid node to excalidraw and keep original`
3. `create an excalidraw node titled "System map"`
4. `remap that excalidraw node from this mermaid source: flowchart LR A-->B B-->C`
