# Canvas Test Guide (Current Canvas Evaluation)

## Purpose
Validate the custom canvas against the requirements (interactive iframes, WebGL, and productivity flow).

## Setup
This repo is a library. Use your host app/demo to render `CanvasTab` with your adapter and entries.

Minimal example (host app):
```tsx
<CanvasTab
  Renderer={PortableComponentRenderer}
  getComponentById={(id) => adapter.getEntryById(id) as GalleryEntry}
  entries={adapter.getAllEntries() as GalleryEntry[]}
  Button={YourButton}
  Tooltip={YourTooltip}
/>
```

## Test Steps
1) Open the canvas view in your app.
2) Add a component from the sidebar and verify drag/resize/rotate.
3) Paste an embed URL in the sidebar and click “Add embed”.
4) Toggle **Interact mode** (cursor icon in toolbar).
   - Confirm you can click/scroll inside the iframe.
5) Test a WebGL URL (example: any WebGL demo page you trust).
6) Toggle out of Interact mode and verify selection/drag works again.
7) Save and reload a scene and confirm embed items persist.

## Expected Outcomes
- Iframes are interactive in Interact mode.
- WebGL embeds render and accept input.
- Canvas editing works normally when Interact mode is off.

## Notes
- If iframe input feels blocked, confirm Interact mode is enabled.
- Some sites block embedding via X-Frame-Options; use a known embeddable URL for testing.
