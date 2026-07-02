# Figma MCP Import

The canvas can connect to Figma through an MCP-app node, call Figma MCP tools,
and materialize a Figma frame or layer as local canvas items.

## What It Creates

When the connected Figma MCP server exposes the standard tools, the import flow:

- calls `get_design_context` for structured design/code context
- calls `get_metadata`, `get_screenshot`, and `get_variable_defs` when present
- calls `get_code_connect_map` when present, so component mappings are kept with the imported context
- creates a `media` node for the Figma screenshot when a screenshot asset is returned
- creates an editable React-backed `html` node when React/TSX code is returned
- falls back to an HTML context note when the MCP result has design context but no code

The imported React node is local canvas/code state. It does not mutate the
source Figma file.

## Desktop MCP

Use this first for local development. The preset is:

```txt
Figma Desktop MCP -> http://127.0.0.1:3845/mcp
```

Setup:

1. Open the Figma desktop app.
2. Open the target Figma Design file.
3. Switch to Dev Mode.
4. Enable the desktop MCP server from Figma's inspect/dev panel.
5. In the canvas sidebar, open `MCP Apps` and add `Figma Desktop MCP`.
6. Select the node, click `Connect`, paste a Figma frame/layer URL in `Figma Import`, then click `Import Node`.

Desktop MCP is localhost, so it is allowed by the canvas HTTP transport policy
without extra confirmation.

Quick reachability check:

```bash
curl -sI http://127.0.0.1:3845/mcp
```

If this cannot connect, Figma desktop is open but the MCP server is not enabled
for the current file/session.

## Remote MCP

The remote preset is:

```txt
Figma Remote MCP -> https://mcp.figma.com/mcp
```

It requires saved headers. In the MCP app props panel:

1. Keep `Headers Ref` as `figma-headers`, or choose another ref.
2. Enter a JSON header object in `Secret Value`.
3. Click `Save Secret`.
4. Click `Connect`.
5. Because this is a public HTTP endpoint, click `Confirm and Connect` when prompted.

Example secret:

```json
{"Authorization":"Bearer <FIGMA_OAUTH_TOKEN>","X-Figma-Region":"us-east-1"}
```

Secrets are stored server-side in the active project's `project.json` under
`meta.mcpAppCreds`. They are referenced from `.canvas` items by ref id only.

## URL Handling

Paste a Figma frame or layer URL. The import helper extracts:

- `fileKey` from `/design/<fileKey>/...` or `/file/<fileKey>/...`
- `fileKey` from `/proto/<fileKey>/...` prototype links
- `nodeId` from `node-id`, normalized from `12-34` to `12:34`

Each Figma tool call uses the tool's input schema when available. For example,
if a tool asks for `fileKey` and `nodeId`, those fields are sent. If no schema
is available, the call falls back to `{ "url": "<figma-url>" }`.

## Scope

Two-way sync is explicitly out of scope for this feature, by design — not a
gap. The flow is one-way: Figma -> canvas. Writing back into Figma would use
Figma's `use_figma` / code-to-canvas tools and needs its own spec and explicit
flow if it is ever built.

## Limitations

- Editing the imported React/HTML node edits local canvas/source state only.
- Large Figma frames can still produce large MCP responses; start with a single component or focused frame.
