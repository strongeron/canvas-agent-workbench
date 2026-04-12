# Component Gallery System

A portable component gallery and canvas-based design playground for documenting and exploring React components.

## Status

**Extraction Progress:**

### Core (Portable) ✅
- ✅ **Core Types** - `GalleryEntry`, `ComponentVariant`, `PropSchema`, `AIGenerationMeta`
- ✅ **Adapter Pattern** - Static and dynamic component loading strategies
- ✅ **Gallery Context** - React context for dependency injection
- ✅ **Schema Helpers** - Pre-built prop schemas for common patterns
- ✅ **Render Config** - Component rendering behavior classification

### Components (Portable) ✅
- ✅ **PortableComponentRenderer** - Adapter-based component rendering
- ✅ **PortableGalleryPage** - Complete gallery page with sidebar, search, filters
- ✅ **InteractivePropsPanel** - Live prop editing controls
- ✅ **PropControl** - Individual prop input controls

### Hooks ✅
- ✅ `useInteractiveProps` - Live prop editing state
- ✅ `useCanvasState` - Canvas items management with localStorage
- ✅ `useCanvasTransform` - Zoom, pan, viewport transformations
- ✅ `useCanvasScenes` - Save/load canvas scenes
- ✅ `useCanvasShortcuts` - Keyboard shortcuts
- ✅ `useLocalStorage` - Generic localStorage persistence

### Gallery UI (Portable with Props Injection) ✅
- ✅ **GalleryHeader** - Search, view mode toggle, stats (accepts `a11yHref` prop)
- ✅ **ComponentSection** - Component card grid with status filters (accepts `Button`, `Link`, `getPreviewPath` props)
- ✅ **LayoutSection** - Layout preview grid (accepts `Button`, `Link`, `getPreviewPath` props)

### Canvas Components (Portable with Props Injection) ✅
- ✅ **CanvasToolbar** - Zoom, selection, grouping controls (accepts `Button`, `Tooltip` props)
- ✅ **CanvasScenesPanel** - Scene save/load UI (accepts `Button` prop)
- ✅ **CanvasWorkspace** - Main canvas area
- ✅ **CanvasItem** - Draggable component wrapper
- ✅ **CanvasSidebar** - Component picker
- ✅ **CanvasPropsPanel** - Live props editor
- ✅ **CanvasContextMenu** - Right-click menu
- ✅ **CanvasHelpOverlay** - Keyboard shortcuts help

### Reference (legacy implementation)
- 📦 Examples in `examples/_reference-thicket/` are reference-only and safe to delete.

## Quick Start (Run Demo)

```bash
# 1. Install dependencies
npm install

# 2. Run the demo
npm run dev

# 3. Open http://localhost:5173
```

The demo shows how to integrate the gallery with example components (Button, Badge, Input, etc).

## Canvas Guides

- [Color Canvas README](./docs/COLOR_CANVAS_README.md) — current `Color Audit` and `System Canvas` modes, generated nodes, connectors, and testing scenarios
- [Canvas Agent MCP Setup](./docs/CANVAS_AGENT_MCP_SETUP.md) — how to attach a session and run Claude Code or Codex against the local stdio MCP server
- [Canvas Agent MCP Commands](./docs/CANVAS_AGENT_MCP_COMMANDS.md) — full MCP tool/resource/prompt inventory plus prompt patterns that make agents use MCP first
- [Canvas Health Checks](./docs/CANVAS_HEALTH_CHECKS.md) — the focused CI/local release gate for storage, agent-native runtime, UI flows, and the Node Catalog visual baseline
- [Relative Color Canvas](./docs/RELATIVE_COLOR_CANVAS.md) — focused guide for manual OKLCH relative-color authoring in `Color Audit`

Freeform `Canvas` now also supports local HTML/CSS/JS bundle nodes. Those bundles are packed into document-local assets, can be resized like other items, become clickable in interact mode, and can be discovered from a scanned local source-library root before import.

## Use in Your Project

```tsx
// 1. Import from component-gallery-system
import {
  GalleryProvider,
  createStaticAdapter,
  type GalleryEntry,
} from 'component-gallery-system/core'

import { PortableGalleryPage } from 'component-gallery-system/components'

// 2. Define your components
function Button({ variant, children }) {
  return <button className={variant}>{children}</button>
}

// 3. Create gallery configs
const buttonEntry: GalleryEntry = {
  id: 'ui/button',
  name: 'Button',
  category: 'Base UI',
  importPath: '@/components/ui/button',
  layoutSize: 'small',
  variants: [
    {
      name: 'Primary',
      description: 'Main CTA button',
      props: { variant: 'primary', children: 'Get Started' },
      status: 'prod',
      category: 'variant',
    },
  ],
}

// 4. Create adapter
const adapter = createStaticAdapter({
  componentMap: {
    Button: Button,
  },
  entries: [buttonEntry],
})

// 5. Render the gallery
function App() {
  return (
    <GalleryProvider adapter={adapter}>
      <PortableGalleryPage
        title="My Component Gallery"
        description="Browse all components"
      />
    </GalleryProvider>
  )
}
```

## Architecture

```
gallery-poc/
├── core/                     # Core types and utilities (portable)
│   ├── types.ts              # Type definitions
│   ├── adapter.ts            # Component loading abstraction
│   ├── GalleryContext.tsx    # React context for adapter
│   ├── render-config.ts      # Rendering behavior config
│   ├── schema-helpers.ts     # Prop schema presets
│   └── index.ts
├── components/               # React components
│   ├── PortableComponentRenderer.tsx  # Adapter-based renderer (USE THIS)
│   ├── PortableGalleryPage.tsx        # Full gallery page (USE THIS)
│   ├── InteractivePropsPanel.tsx      # Prop editing UI
│   ├── PropControl.tsx                # Individual controls
│   ├── ComponentRenderer.tsx          # Legacy (Thicket-specific)
│   └── canvas/                        # Canvas mode (reference)
├── hooks/                    # React hooks
│   ├── useInteractiveProps.ts
│   ├── useCanvasState.ts
│   ├── useCanvasTransform.ts
│   └── useLocalStorage.ts
├── examples/                 # Integration examples
│   └── BasicSetup.tsx
└── index.ts                  # Main exports
```

## Features

### Adapter Pattern

The gallery uses an adapter pattern to decouple UI from components:

```tsx
// Static adapter (pre-defined component map)
const adapter = createStaticAdapter({
  componentMap: { Button, Badge, Modal },
  entries: [buttonEntry, badgeEntry, modalEntry],
})

// Dynamic adapter (lazy loading)
const dynamicAdapter = createDynamicAdapter({
  importComponent: (name) => import(`./components/${name}`),
  loadEntries: () => fetch('/api/gallery').then(r => r.json()),
})
```

### Props Injection

Gallery UI components accept your own UI primitives via props, keeping the gallery decoupled from your design system:

```tsx
import { ComponentSection, GalleryHeader, CanvasToolbar } from './gallery-poc'
import { Button } from '@/components/ui/button'  // Your button
import { Tooltip } from '@/components/ui/tooltip' // Your tooltip
import { Link } from '@inertiajs/react'           // Your router

// GalleryHeader - optional a11y link
<GalleryHeader
  a11yHref="/gallery/a11y"  // Optional
  {...otherProps}
/>

// ComponentSection - optional preview links
<ComponentSection
  Button={Button}                    // Your Button component
  Link={Link}                        // Your Link component
  getPreviewPath={(id) => `/preview/${id}`}  // Path generator
  {...otherProps}
/>

// CanvasToolbar - required Button/Tooltip
<CanvasToolbar
  Button={Button}
  Tooltip={Tooltip}
  {...otherProps}
/>
```

If Button/Link/getPreviewPath are omitted, preview links simply won't render.

### Interactive Props

Add live prop editing to any variant:

```tsx
const variant = {
  name: 'Interactive',
  props: { variant: 'primary', size: 'md' },
  interactiveSchema: {
    variant: {
      type: 'select',
      label: 'Variant',
      options: [
        { value: 'primary', label: 'Primary' },
        { value: 'secondary', label: 'Secondary' },
      ],
    },
    size: {
      type: 'radio',
      label: 'Size',
      options: [
        { value: 'sm', label: 'Small' },
        { value: 'md', label: 'Medium' },
        { value: 'lg', label: 'Large' },
      ],
    },
  },
}
```

### AI Generation Tracking

Track component evolution through AI iterations:

```tsx
const variant = {
  name: 'Hero Section v3',
  props: { ... },
  aiMeta: {
    generatedAt: '2024-01-15T10:30:00Z',
    prompt: 'Make the hero more engaging with animation',
    model: 'claude-3-opus',
    iteration: 3,
    parentVersionId: 'hero-v2',
    feedback: 'Animation feels too aggressive, tone it down',
  },
}
```

## Component Status

Components and variants use a status system:

- `prod` - Production ready, actively used
- `wip` - Work in progress, being developed
- `archive` - Deprecated, kept for reference

```tsx
const entry: GalleryEntry = {
  // ...
  variants: [
    { name: 'Current', status: 'prod', ... },
    { name: 'New Design', status: 'wip', ... },
    { name: 'Legacy', status: 'archive', ... },
  ],
}
```

## Dependencies

Required:
```json
{
  "react": ">=18.0.0",
  "lucide-react": ">=0.300.0"
}
```

Optional (for canvas mode):
```json
{
  "@dnd-kit/core": ">=6.0.0",
  "@dnd-kit/sortable": ">=8.0.0"
}
```

## Integration into Existing Projects

This gallery system can be integrated into any React project. Example integration steps:

1. Install the package or copy the source code
2. Import types from `component-gallery-system/core`
3. Wrap your app with `<GalleryProvider adapter={...}>`
4. Use `PortableComponentRenderer` or `PortableGalleryPage` components

## License

MIT
