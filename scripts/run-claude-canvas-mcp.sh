#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_PATH="$REPO_ROOT/.mcp/claude.canvas-mcp.json"
ATTACHED_CONTEXT="$REPO_ROOT/.canvas-agent/attached-session.json"

if [[ ! -f "$ATTACHED_CONTEXT" ]]; then
  echo "Missing attached canvas-agent context: $ATTACHED_CONTEXT" >&2
  echo "Run: bin/canvas-agent attach --project demo --server http://127.0.0.1:5178" >&2
  exit 1
fi

cd "$REPO_ROOT"
exec claude \
  --strict-mcp-config \
  --mcp-config "$CONFIG_PATH" \
  --append-system-prompt 'This session is attached to a live canvas MCP server named "canvas". Prefer MCP resources and tools before Bash when the task touches the app surfaces. Start with workspace://manifest or get_workspace_manifest. For Canvas, inspect workspace://surface/canvas/state and workspace://surface/canvas/primitives before writing. For Color Audit, use get_color_audit_state and get_color_audit_export_preview. For System Canvas, use get_system_canvas_state. Use screenshots when visual confirmation matters.' \
  "$@"
