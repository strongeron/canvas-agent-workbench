# Quick Start Guide

Get started with the Gallery POC in your project.

## Installation

Copy the `gallery-poc/` folder to your project:

```bash
cp -r gallery-poc/ your-project/gallery-poc/
```

## Dependencies

Add required dependencies:

```bash
npm install lucide-react
# Optional for canvas mode:
npm install @dnd-kit/core @dnd-kit/sortable
```

## Basic Usage

### 1. Create a Gallery Config

Create a config file for your component:

```typescript
// gallery-poc/configs/button.gallery.ts
import type { GalleryEntry } from '../core/types'
import { propSchemas } from '../core'

export const buttonGalleryEntry: GalleryEntry = {
  id: 'ui/button',
  name: 'Button',
  category: 'Base UI',
  importPath: '@/components/ui/button',
  layoutSize: 'small',
  variants: [
    {
      name: 'Interactive',
      description: 'Customize button properties live',
      props: { variant: 'brand', size: 'md', children: 'Click Me' },
      status: 'prod',
      category: 'interactive',
      interactive: true,
      interactiveSchema: propSchemas.buttonSchema(),
    },
    {
      name: 'Primary',
      description: 'Main CTA button',
      props: { variant: 'brand', children: 'Get Started' },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Secondary',
      description: 'Secondary action button',
      props: { variant: 'secondary', children: 'Learn More' },
      status: 'prod',
      category: 'variant',
    },
  ],
}
```

### 2. Create an Adapter

Wire up your components:

```typescript
// gallery-poc/adapter.ts
import { createStaticAdapter } from './core'
import { buttonGalleryEntry } from './configs/button.gallery'

// Import your actual components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
// ... more imports

export const galleryAdapter = createStaticAdapter({
  componentMap: {
    Button,
    Input,
    // ... more components
  },
  entries: [
    buttonGalleryEntry,
    // ... more entries
  ],
})
```

### 3. Render Components

Use the ComponentRenderer:

```tsx
import { ComponentRenderer } from './gallery-poc/components'
import { galleryAdapter } from './gallery-poc/adapter'

function GalleryDemo() {
  const entry = galleryAdapter.getEntryById('ui/button')
  if (!entry) return null

  return (
    <div>
      {entry.variants.map((variant) => (
        <ComponentRenderer
          key={variant.name}
          componentName={entry.name}
          importPath={entry.importPath}
          variant={variant}
          componentMap={galleryAdapter.getComponent}
        />
      ))}
    </div>
  )
}
```

### 4. Use Interactive Props

For live prop editing:

```tsx
import { useInteractiveProps } from './gallery-poc/hooks'
import { propSchemas } from './gallery-poc/core'

function InteractiveButton() {
  const { props, setProp, reset, isModified } = useInteractiveProps({
    defaultProps: { variant: 'brand', size: 'md', children: 'Click' },
    schema: propSchemas.buttonSchema(),
  })

  return (
    <div>
      <Button {...props} />

      <div>
        <select
          value={props.variant}
          onChange={(e) => setProp('variant', e.target.value)}
        >
          <option value="brand">Brand</option>
          <option value="secondary">Secondary</option>
          <option value="outline">Outline</option>
        </select>

        {isModified && (
          <button onClick={reset}>Reset</button>
        )}
      </div>
    </div>
  )
}
```

## File Structure

Recommended structure:

```
your-project/
├── gallery-poc/
│   ├── core/          # Types, adapter, utilities
│   ├── hooks/         # React hooks
│   ├── components/    # Gallery components
│   ├── configs/       # Your component configs
│   │   ├── ui/
│   │   │   ├── button.gallery.ts
│   │   │   └── input.gallery.ts
│   │   └── platform/
│   │       └── user-card.gallery.ts
│   ├── adapter.ts     # Your component adapter
│   └── index.ts       # Main exports
└── src/
    └── components/    # Your actual components
```

## Config Categories

Organize variants by category:

- `interactive` - Live prop editing variant
- `variant` - Style variations (primary, secondary, etc.)
- `size` - Size variations (sm, md, lg)
- `state` - State variations (disabled, loading, error)
- `icon-patterns` - Icon + text combinations

## Status Tracking

Mark production readiness:

- `prod` - Used in production pages
- `wip` - Work in progress
- `archive` - Deprecated/old patterns

## Next Steps

- Read [AI_TRACKING.md](./AI_TRACKING.md) to track AI-generated components
- Read [ARCHITECTURE.md](../ARCHITECTURE.md) for system overview
- Explore the reference implementation in `examples/_reference-thicket/` (optional)
