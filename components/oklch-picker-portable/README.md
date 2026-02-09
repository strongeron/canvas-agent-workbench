# OKLCH Picker Portable

Self-contained React module for an OKLCH color picker with:

- 2D gamut planes (`HC_at_L`, `LC_at_H`, `HL_at_C`)
- APCA planes (`AH_at_C`, `AC_at_H`, `HC_at_APCA`)
- APCA target-level visualization
- Built-in default UI styles
- Local component state (supports multiple picker instances on one page)

## Copy/Paste into another project

1. Copy this folder into your target project.
2. Install dependencies listed in `package.json`.
3. Import component and stylesheet.

```tsx
import { OklchPicker } from "./oklch-picker-portable/src";
import "./oklch-picker-portable/src/styles.css";

export function Demo() {
  return (
    <OklchPicker
      onChange={(value) => {
        console.log("Picked", value.color, value.css, value.lcAgainstBackground);
      }}
    />
  );
}
```

## Simple demo component

You can mount a prebuilt demo with two independent picker instances:

```tsx
import { OklchPickerDemo } from "./oklch-picker-portable/src";
import "./oklch-picker-portable/src/styles.css";
import "./oklch-picker-portable/src/demo.css";

export function DemoPage() {
  return <OklchPickerDemo />;
}
```

## Build the module

```bash
pnpm --dir packages/oklch-picker-portable typecheck
pnpm --dir packages/oklch-picker-portable build
```

Generated output will be in `packages/oklch-picker-portable/dist`.

## API

`OklchPicker` props:

- `initialState?: Partial<PickerState>`
- `onChange?: (value: PickerChange) => void`
- `className?: string`
- `style?: React.CSSProperties`

`PickerChange` includes:

- `color` (OKLCH)
- `css` (display CSS string)
- `hex` (sRGB hex)
- `lcAgainstBackground`
- `gamut`, `plane`, `mode`

## Notes

- APCA planes are compute-heavy. Rendering is capped at 256 resolution for APCA planes for responsiveness.
- For accurate display-P3 preview, browser and display must support P3 canvas output.
