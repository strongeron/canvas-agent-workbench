# Color Picker Module

This repo now has a package-style local module for color picker integration.

## Folder layout

- `components/oklch-picker-portable/` (your portable picker package)
- `components/color-picker/types.ts`
- `components/color-picker/ColorPickerProvider.tsx`
- `components/color-picker/ColorPickerField.tsx`
- `components/color-picker/externalPickerBridge.tsx`
- `components/color-picker/index.ts`

## What it does

- `ColorPickerProvider` exposes a single `renderPicker` adapter.
- `ColorPickerField` is used by canvas/app UI.
- If no adapter is provided, `ColorPickerField` falls back to a text input.

This lets us keep canvas logic independent from a specific picker package.

## Wiring in app

Both app entry points are wrapped with `ColorPickerProvider`:

- `demo/App.tsx`
- `demo-thicket/App.tsx`

`demo/App.tsx` now includes a **Picker Lab** view for visual state review.

## Wiring in Color Canvas

Color input points in `components/color-canvas/ColorCanvasPage.tsx` now use `ColorPickerField`:

- Theme template brand/accent inputs
- Token value override
- Semantic color override
- Relative expression override

## Current integration

The bridge now uses `components/oklch-picker-portable/src/OklchPicker.tsx` directly.
App entry points are already wired with `externalColorPickerRenderer`.

Install picker-local deps (once):

```bash
pnpm install --dir components/oklch-picker-portable
```

Bridge file:

- `components/color-picker/externalPickerBridge.tsx`

If you swap picker implementation later, keep this contract:

```tsx
export const externalColorPickerRenderer: ColorPickerRenderer = ({
  id,
  value,
  onChange,
  placeholder,
  className,
  disabled,
}) => (
  <YourPickerLikeComponent ... />
)
```

Keep all existing canvas/app forms unchanged; they route through `ColorPickerField`.

## Interactive state demo

Use the **Picker Lab** button in the main demo header to open a storybook-style review page:

- file: `demo/OklchPickerLab.tsx`
- includes preset coverage for shape/max-chroma/APCA + APCA planes
- includes floating widget bridge smoke test (`ColorPickerField`)
- verifies Display P3 defaults where browser support exists
