# Gallery POC Plan (Draft)

## Goals
- Preserve current gallery content and refine it.
- Provide a canvas page that opens in the demo (not just gallery list).
- Support fully interactive embeds (iframe/web apps) on the canvas.
- Enable WebGL artboards on the canvas for creative/prototyping work.
- Keep all components React + Tailwind ready.
- Allow Figma-like editing (text + props + layout) while staying code-synced.
- Local agent control from CLI with user-selectable agent (Codex/Claude Code).
- Direct sync with `.gallery.ts` and component files.

## Non-Negotiables
- Interactive iframe embeds (click/scroll) inside canvas.
- Local-first experience; can run fully offline.
- Code sync works both ways: visual edits -> code, code changes -> canvas refresh.

## Demo Requirements
- Demo page with a canvas entry point.
- Default view: open canvas, **start empty** but offer a one-click “Load sample scene” using existing components.
- Keep current gallery pages available for browsing components.

## Key Questions Answered
- Base demo: keep `gallery-poc` content and refine it.
- Canvas approach: evaluate current custom canvas vs alternatives first.
- Sync: direct write-back to `.gallery.ts` and component files.
- Embeds: interactive (true browser-in-canvas).
- Agent loop: selectable agent, local protocol (HTTP or WebSocket), with annotations/selection sync.

## Architecture Direction (Draft)
### Layer 1: Registry + Variant Model
- Keep `GalleryEntry` and `ComponentVariant`.
- Add stable `variantId` to avoid index drift.
- Persist AI metadata (`aiMeta`) across edits.

### Layer 2: Canvas Engine (Evaluate)
- Current custom canvas: fast to extend but iframe/WebGL interactivity is limited by pointer-event layering and transforms.
- tldraw (HTML-based): likely best for iframe + web embeds + infinite canvas.
- Hybrid option: start with current canvas for evaluation, keep interface to swap engine later.

## Research Summary (Feb 2026)
- tldraw supports HTML-based shape rendering via `HTMLContainer`, enabling true HTML/iframe content inside the canvas layer.
- tldraw supports custom embeds with a first-class embed system (good for websites, tools, and media).
- Excalidraw does not support embedding arbitrary HTML content on the canvas (per third-party tutorial); it uses a canvas/SVG pipeline not designed for HTML.
- React Flow supports custom node components; good for structured node graphs, but less ideal for freeform, Figma-like infinite canvases.

## Decision Criteria (Engine)
- Must: interactive iframe + WebGL content.
- Must: freeform positioning, zoom/pan, selection + grouping.
- Must: custom shape system for React/Tailwind components.
- Should: clean API for embedding external web content.
- Should: optional collaboration + annotation layers.

### Layer 3: Code Sync + Agent Bridge
- CLI-driven agent commands: add component, update props, add embeds, move/resize.
- Bidirectional sync: filesystem changes reflected in canvas.
- Agent selection UI with comments/annotations on canvas objects.

## Phased Plan (Draft)
### Phase 0 — Audit + Baseline
- Map current canvas capabilities vs requirements.
- Identify engine blockers (iframe/WebGL, text editing, performance).

### Phase 1 — Stabilize Current Canvas for Evaluation
- Fix renderer `renderMode` mismatch.
- Replace `variantIndex` with stable `variantId`.
- Add “Interact mode” toggle for embedded components/iframes.
- Namespace localStorage by project.
- Add embed item type (iframe/web/media) with live preview.

### Phase 2 — Engine Decision + Prototype
- Build a proof-of-concept canvas using tldraw with custom shapes:
  - ComponentShape (renders React component)
  - EmbedShape (iframe/web)
  - MediaShape (image/video)
- Compare usability + performance vs current canvas.

### Phase 3 — Code Sync + Component Authoring
- Visual edits -> update `.gallery.ts` and component props.
- “Create component from canvas” workflow:
  - Create layout primitives (rectangle/text/image)
  - Export to React + Tailwind component
  - Register in gallery + open in canvas

### Phase 4 — Agent Loop + Collaboration
- Local agent bridge (HTTP/WebSocket).
- Selectable agent, comment/annotation layer, live selection sync.
- Command API for agents to modify canvas + registry.

## Deliverables
- Canvas demo page + empty/seeded scene options.
- Engine decision report with rationale.
- Prototype canvas with interactive embeds + WebGL.
- Code sync pipeline (visual → `.gallery.ts` + component file).
- Agent control loop with selectable agent.

## Risks
- True iframe/WebGL interactivity on current canvas may be blocked by transforms/pointer events.
- Visual-to-code export could be complex; may need constrained component primitives.

## Next Step
- Research current best-in-class canvas engines for interactive embeds + WebGL artboards.
- Draft a capability matrix and update this plan with a recommended engine.
