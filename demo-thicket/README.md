# Thicket Full Component Gallery Demo

This folder contains ALL Thicket components wired into the gallery system - the complete collection including active, deprecated, and archived components.

## What's Here

### Components (379 files)
- `components/` - All UI components from `src/components/`
- `platform/` - All platform components from `src/platform/components/`
- `data/` - Mock data for demos

### Gallery Configs
- `configs/` - All gallery configurations from `src/platform/gallery/configs/`
  - ui/ - Base UI components
  - landing/ - Landing page components
  - student/ - Student portal components
  - teacher/ - Teacher portal components
  - messages/ - Messaging system components
  - modals/ - Modal dialogs
  - filters/ - Filter components
  - ctas/ - Call-to-action components
  - course-builder/ - Course creation components
  - platform/ - Platform-specific components
  - _archive/ - Deprecated components

### Gallery System Files
- `ComponentRenderer.tsx` - Renders components with all variants
- `componentVariants.ts` - Component variant definitions
- `App.tsx` - Main gallery page
- `types.ts` - Type definitions

## File Count

```
Total files copied: ~379
- Component implementations: ~250
- Gallery configs: ~120
- Supporting files: ~9
```

## To Run This Demo

This demo is **part of gallery-poc** and relies on:
1. Gallery engine from `gallery-poc/core/`
2. Gallery UI from `gallery-poc/components/`
3. Shared hooks from `gallery-poc/hooks/`

### Run from gallery-poc root:

```bash
cd gallery-poc
npm run dev:thicket
```

(Note: You'll need to add this script to package.json)

## Copy to Another Repo

To use the full Thicket gallery in another repo, copy these folders:

### From marketplace-courses:

```bash
# 1. Copy gallery-poc (the engine)
cp -r gallery-poc/ /path/to/your-repo/

# That's it! gallery-poc/demo-thicket/ already has everything

```

### What's Included:

```
your-repo/gallery-poc/
├── core/               ← Gallery engine
├── components/         ← Gallery UI
├── hooks/              ← Gallery hooks
├── demo/               ← Minimal whitelabel demo
└── demo-thicket/       ← FULL Thicket collection
    ├── components/     ← All UI components
    ├── platform/       ← All platform components
    ├── configs/        ← All gallery configs
    ├── data/           ← Mock data
    ├── theme.css       ← Thicket styling
    └── App.tsx         ← Gallery page
```

### Setup in New Repo:

```bash
cd your-repo/gallery-poc
npm install
npm run dev:thicket
```

## Dependencies

The demo needs these packages (already in gallery-poc/package.json):

```json
{
  "react": "^19.0.0",
  "react-dom": "^19.0.0",
  "lucide-react": "^0.552.0",
  "clsx": "^2.1.1",
  "tailwind-merge": "^3.3.1",
  "@dnd-kit/core": "^6.3.1",
  "@dnd-kit/sortable": "^10.0.0",
  "date-fns": "^4.1.0",
  "sonner": "^2.0.7"
}
```

## What You See

- **~200 components** from Thicket
- **~450+ variants** across all components
- **All statuses**: prod, wip, archive
- **All categories**: UI, Landing, Student, Teacher, Messages, etc.

This is the COMPLETE Thicket design system in one place!
