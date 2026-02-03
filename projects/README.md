# Project Packs

Each project lives under `projects/<project-id>/` with two main folders:

- `components/` — React components (TSX)
- `configs/` — `*.gallery.ts` entries for the gallery/canvas

Optional metadata:

- `project.json` — `{ "label": "My Project", "description": "..." }`

Import paths in entries should use:

```
@project/<project-id>/components/...
```

The pack loader (`projects/pack.ts`) auto-scans all projects and builds
`componentMap` + `entries` for use in adapters.
