# Research: CopilotKit + Vite Integration

Date: February 24, 2026

## Key Findings

### CopilotKit works with Vite dev server middleware

The `copilotRuntimeNodeHttpEndpoint` returns a Connect-compatible handler. It can be added
directly to `vite.config.ts` using the same `configureServer` pattern as existing `/api/*` routes.

### Setup is ~90 lines across 3 files

1. **Vite plugin** (~20 lines) — Add CopilotKit runtime as middleware
2. **Provider + Chat** (~15 lines) — Wrap app, add chat panel
3. **Readable + Actions** (~55 lines) — Expose canvas state, define tools

### Packages needed

```bash
npm install @copilotkit/react-core @copilotkit/react-ui @copilotkit/runtime @anthropic-ai/sdk
```

### Environment variables

```
ANTHROPIC_API_KEY=sk-ant-...
```

## Vite Middleware Integration

```typescript
// In vite.config.ts — same pattern as existing paperImportPlugin()
function copilotKitPlugin(): Plugin {
  return {
    name: "copilotkit-runtime",
    async configureServer(server) {
      const { CopilotRuntime, AnthropicAdapter, copilotRuntimeNodeHttpEndpoint } =
        await import("@copilotkit/runtime");
      const { default: Anthropic } = await import("@anthropic-ai/sdk");

      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const serviceAdapter = new AnthropicAdapter({ anthropic, model: "claude-sonnet-4-20250514" });
      const runtime = new CopilotRuntime();

      const handler = copilotRuntimeNodeHttpEndpoint({
        endpoint: "/api/copilotkit",
        runtime,
        serviceAdapter,
      });

      server.middlewares.use("/api/copilotkit", async (req, res, next) => {
        try { await handler(req, res); } catch (err) { next(err); }
      });
    },
  };
}
```

## useCopilotReadable — Best Practices for Canvas State

- Use **multiple calls with hierarchy** (parentId), not one giant blob
- Use `convert` to prune heavy properties (computed styles, binary data)
- Use `available: "disabled"` to conditionally hide detail
- **Memoize** value objects to prevent unnecessary re-serialization
- 50+ items at ~5-20K tokens is well within Claude's 200K context

```tsx
const canvasId = useCopilotReadable({
  description: "Canvas metadata",
  value: { selectedIds, itemCount: items.length },
});

useCopilotReadable({
  description: "Artboard list with names and child counts",
  value: artboards.map(a => ({ id: a.id, name: a.name, childCount: children.length })),
  parentId: canvasId,
});

useCopilotReadable({
  description: "All canvas items",
  value: items,
  parentId: canvasId,
  convert: (_desc, items) => JSON.stringify(items.map(i => ({
    id: i.id, type: i.type, x: i.position.x, y: i.position.y,
    w: i.size.width, h: i.size.height,
    ...(i.type === "artboard" ? { name: i.name } : {}),
    ...(i.type === "embed" ? { url: i.url } : {}),
    ...(i.type === "media" ? { src: i.src } : {}),
  }))),
});
```

## useCopilotAction — Parameter Schema

Supports nested `attributes` for object types and `enum` for string constraints:

```typescript
parameters: [
  {
    name: "type",
    type: "string",
    enum: ["component", "embed", "media", "artboard"],
    required: true,
  },
  {
    name: "position",
    type: "object",
    attributes: [
      { name: "x", type: "number" },
      { name: "y", type: "number" },
    ],
  },
]
```

## Dark Theme

CopilotKit auto-detects `.dark` class or `[data-theme="dark"]`. Override with CSS custom properties:

```css
.copilotKitChat {
  --copilot-kit-background-color: #0d1117;
  --copilot-kit-secondary-color: #161b22;
  --copilot-kit-secondary-contrast-color: #e6edf3;
  --copilot-kit-separator-color: #30363d;
  --copilot-kit-primary-color: #818cf8;
}
```

## Canvas API Surface for Wiring

From `useCanvasState.ts`:

| Function | Signature | CopilotKit Action |
|----------|-----------|-------------------|
| `addItem` | `(item: CanvasItemInput) → string` | `createCanvasItem` |
| `updateItem` | `(id: string, updates: CanvasItemUpdate) → void` | `updateCanvasItem` |
| `removeItem` | `(id: string) → void` | `deleteCanvasItem` |
| `selectItem` | `(id: string, addToSelection?: boolean) → void` | `selectCanvasItem` |
| `clearSelection` | `() → void` | — |
| `createGroup` | `(itemIds: string[], name?: string) → string \| null` | `groupCanvasItems` |

Default sizes used by existing code:
- Embed: 640 x 360
- Media: 480 x 270
- Component: from registry `getDefaultSizeForComponent()`
- Artboard: user-specified

## Sources

- [CopilotKit Self-Hosting Guide](https://docs.copilotkit.ai/direct-to-llm/guides/self-hosting)
- [useCopilotReadable Reference](https://docs.copilotkit.ai/reference/hooks/useCopilotReadable)
- [useCopilotAction Reference](https://docs.copilotkit.ai/reference/hooks/useCopilotAction)
- [CopilotChat Component](https://docs.copilotkit.ai/reference/components/chat/CopilotChat)
- [CopilotKit CSS Styling](https://docs.copilotkit.ai/custom-look-and-feel/customize-built-in-ui-components)
