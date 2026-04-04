#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MCP_SERVER="$REPO_ROOT/bin/canvas-mcp-server"
ATTACHED_CONTEXT="$REPO_ROOT/.canvas-agent/attached-session.json"

if [[ ! -f "$ATTACHED_CONTEXT" ]]; then
  echo "Missing attached canvas-agent context: $ATTACHED_CONTEXT" >&2
  echo "Run: bin/canvas-agent attach --project demo --server http://127.0.0.1:5178" >&2
  exit 1
fi

cd "$REPO_ROOT"
exec codex \
  -c "mcp_servers.canvas.command=\"node\"" \
  -c "mcp_servers.canvas.args=[\"$MCP_SERVER\"]" \
  -c "mcp_servers.canvas.env={CANVAS_AGENT_CONTEXT_FILE=\"$ATTACHED_CONTEXT\",CANVAS_AGENT_SERVER_URL=\"http://127.0.0.1:5178\"}" \
  -c "mcp_servers.canvas.cwd=\"$REPO_ROOT\"" \
  'This session is attached to a live canvas MCP server named "canvas". Prefer MCP resources and tools before Bash when the task touches the app surfaces. Start with workspace://manifest or get_workspace_manifest. For Canvas, inspect workspace://surface/canvas/state and workspace://surface/canvas/primitives before writing. For Color Audit, use get_color_audit_state and get_color_audit_export_preview. For System Canvas, use get_system_canvas_state. Use screenshots when visual confirmation matters. Acknowledge briefly that the canvas MCP tools are available, then wait for the next user task.' \
  "$@"
