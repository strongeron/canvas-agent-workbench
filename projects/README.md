# Project Packs

Each project lives under `projects/<project-id>/` with two main folders:

- `components/` — React components (TSX)
- `configs/` — `*.gallery.ts` entries for the gallery/canvas

Optional metadata:

- `project.json` — `{ "label": "My Project", "description": "..." }`
- `registry.json` — `{ "ui": ["..."], "page": ["..."] }`

Import paths in entries should use:

```
@project/<project-id>/components/...
```

The pack loader (`projects/pack.ts`) auto-scans all projects and builds
`componentMap` + `entries` for use in adapters.

`registry.json` is used by the Paper import flow to keep a lightweight
index of page-level components vs UI components.

CLI helper:

```
npm run create-project -- --id my-project --label "My Project"
```

Paper MCP dev helper (uses `scripts/paper-client.mjs` by default):

```
npm run dev:paper
```

Override the client module:

```
npm run dev:paper -- --paper-client /absolute/path/to/paper-client.mjs
```
