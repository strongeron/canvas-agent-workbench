# Gallery POC Architecture

## Overview

This POC extracts the Thicket gallery system into a portable, standalone component playground for viewing, editing, and composing React components. It's designed to work with AI-generated components and track their evolution.

## Core Features

1. **Component Gallery** - Browse all components with search, category filtering, status tracking
2. **Interactive Props** - Live prop editing with schema-based controls
3. **Canvas Mode** - Drag-drop component composition, scene management
4. **Design Tokens** - View and copy design token values
5. **Snapshots** - Save component state versions
6. **AI Tracking** - Generation history, usage analytics (to be added)

## Directory Structure

```
gallery-poc/
├── ARCHITECTURE.md           # This file
├── README.md                 # Getting started guide
├── index.ts                  # Main exports
├── core/                     # Core types and utilities
│   ├── types.ts              # GalleryEntry, ComponentVariant, PropSchema
│   ├── render-config.ts      # Component rendering behavior config
│   ├── schema-helpers.ts     # Preset prop schemas for common patterns
│   └── layout-meta.ts        # Layout size and overflow config
├── components/               # React components
│   ├── GalleryPage.tsx       # Main entry point
│   ├── GalleryHeader.tsx     # Search, view mode, stats
│   ├── GallerySidebar.tsx    # Category navigation
│   ├── ComponentSection.tsx  # Component grid display
│   ├── ComponentRenderer.tsx # Renders individual components
│   ├── InteractivePropsPanel.tsx  # Live prop editing
│   ├── PropControl.tsx       # Individual prop input controls
│   ├── TokenSection.tsx      # Design tokens display
│   ├── LayoutSection.tsx     # Layout patterns display
│   ├── SnapshotManager.tsx   # Version snapshots
│   ├── ModalPreview.tsx      # Modal component wrapper
│   └── canvas/               # Canvas mode components
│       ├── CanvasTab.tsx     # Canvas container
│       ├── CanvasWorkspace.tsx
│       ├── CanvasToolbar.tsx
│       ├── CanvasSidebar.tsx
│       ├── CanvasPropsPanel.tsx
│       ├── CanvasItem.tsx
│       ├── CanvasScenesPanel.tsx
│       ├── CanvasContextMenu.tsx
│       └── CanvasHelpOverlay.tsx
├── hooks/                    # Custom React hooks
│   ├── useCanvasState.ts     # Canvas item management
│   ├── useCanvasTransform.ts # Zoom, pan, centering
│   ├── useCanvasScenes.ts    # Scene save/load
│   ├── useCanvasShortcuts.ts # Keyboard shortcuts
│   └── useInteractiveProps.ts # Prop override management
├── mocks/                    # Data layer
│   ├── designTokens.ts       # Token definitions
│   └── snapshots.ts          # Snapshot storage
├── configs/                  # Component gallery configs (examples)
│   └── example.gallery.ts    # Example config file
└── adapters/                 # Integration adapters (NEW)
    ├── types.ts              # Adapter interfaces
    ├── static-adapter.ts     # Static component map
    └── dynamic-adapter.ts    # Dynamic import adapter
```

## Key Abstractions

### 1. Component Adapter Pattern

The gallery needs to know about components. Instead of hardcoding a `componentMap`, we introduce an adapter:

```typescript
interface GalleryAdapter {
  // Resolve component by name
  getComponent(name: string): React.ComponentType | null

  // Get all registered components
  getAllComponents(): GalleryEntry[]

  // Check if component exists
  hasComponent(name: string): boolean
}
```

This allows:
- Static adapter: Pre-defined component map (current approach)
- Dynamic adapter: Lazy load components
- Remote adapter: Load component configs from API

### 2. Gallery Config Format

Each component has a `.gallery.ts` config:

```typescript
export const buttonGalleryEntry: GalleryEntry<ButtonProps> = {
  id: 'ui/button',
  name: 'Button',
  category: 'Base UI',
  importPath: '@/components/ui/button',
  layoutSize: 'small',
  variants: [
    {
      name: 'Primary',
      description: 'Main CTA button',
      props: { variant: 'brand', children: 'Get Started' },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Interactive',
      description: 'Live prop editing',
      props: { variant: 'brand', size: 'md' },
      status: 'prod',
      category: 'interactive',
      interactive: true,
      interactiveSchema: {
        variant: {
          type: 'select',
          options: [
            { value: 'brand', label: 'Brand' },
            { value: 'outline', label: 'Outline' },
          ],
        },
        size: {
          type: 'radio',
          options: [
            { value: 'sm', label: 'Small' },
            { value: 'md', label: 'Medium' },
          ],
        },
      },
    },
  ],
}
```

### 3. AI Generation Tracking (NEW)

Extended metadata for AI-generated components:

```typescript
interface AIGenerationMeta {
  // When was this version generated
  generatedAt: string

  // What prompt/instruction created it
  prompt?: string

  // Which AI model (Claude, GPT, etc.)
  model?: string

  // Iteration number in the design cycle
  iteration: number

  // Parent version ID if this is an iteration
  parentVersionId?: string

  // Human feedback/notes
  feedback?: string
}

// Extended variant with AI tracking
interface ComponentVariant {
  // ... existing fields
  aiMeta?: AIGenerationMeta
}
```

### 4. Usage Analytics

Track where components are used:

```typescript
interface ComponentUsage {
  // Component ID
  componentId: string

  // Where it's imported
  usages: Array<{
    file: string
    variantName?: string
    propsUsed: string[]
  }>

  // Usage count
  totalUsages: number

  // Last scanned
  lastScanned: string
}
```

## Styling Strategy

The POC uses CSS custom properties (design tokens) for theming:

```css
:root {
  --gallery-bg: #f8f9fa;
  --gallery-surface: #ffffff;
  --gallery-border: #e5e7eb;
  --gallery-brand: #2563eb;
  --gallery-text: #111827;
  --gallery-text-muted: #6b7280;
}
```

Components use these tokens via Tailwind's arbitrary values or a small CSS file.

## Integration Options

### Option A: Copy POC folder
Copy the entire `gallery-poc/` folder to your project.

### Option B: NPM package (future)
```bash
npm install @thicket/gallery-poc
```

### Option C: Git submodule
```bash
git submodule add https://github.com/... gallery-poc
```

## Required Dependencies

```json
{
  "dependencies": {
    "react": ">=18.0.0",
    "lucide-react": ">=0.300.0",
    "@dnd-kit/core": ">=6.0.0",
    "@dnd-kit/sortable": ">=8.0.0",
    "clsx": ">=2.0.0"
  }
}
```

## Next Steps

1. [ ] Extract core types (types.ts, registry/types.ts)
2. [ ] Create adapter interface
3. [ ] Extract ComponentRenderer with adapter support
4. [ ] Extract canvas system
5. [ ] Add AI generation tracking schema
6. [ ] Create example configs
7. [ ] Write integration guide
