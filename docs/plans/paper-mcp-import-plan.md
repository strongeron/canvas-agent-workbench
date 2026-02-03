# Paper MCP Import Flow Plan

## Goals
- Bridge Paper MCP client into runtime (`window.paperMcp`).
- Provide user-facing import status + reload toast.
- Persist a registry JSON for UI vs page components.
- Ensure imported components are written to `projects/<id>/` and appear in Canvas sidebar.

## TODOs
- [x] Add runtime Paper MCP bridge (expose `window.paperMcp` from available globals).
- [x] Add import status + reload toast.
- [x] Persist component registry JSON (`projects/<id>/registry.json`) with `ui` and `page` buckets.
- [x] Update docs to mention registry JSON and import flow.
