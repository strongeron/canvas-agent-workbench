#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOST="${CANVAS_AGENT_HOST:-127.0.0.1}"
PORT="${CANVAS_AGENT_PORT:-5178}"
SERVER_URL="http://${HOST}:${PORT}"
PROJECT_ID="${CANVAS_AGENT_PROJECT:-demo}"
SURFACE_ID="${CANVAS_AGENT_SURFACE:-}"
RUNTIME_DIR="$REPO_ROOT/.canvas-agent"
PID_FILE="$RUNTIME_DIR/dev-server.pid"
LOG_FILE="$RUNTIME_DIR/dev-server.log"

mkdir -p "$RUNTIME_DIR"

is_server_ready() {
  curl -fsS "${SERVER_URL}/" >/dev/null 2>&1
}

start_dev_server() {
  echo "Starting dev server at ${SERVER_URL}..." >&2
  (
    cd "$REPO_ROOT"
    npm run dev -- --host "$HOST" --port "$PORT" --strictPort
  ) >"$LOG_FILE" 2>&1 &
  local pid=$!
  echo "$pid" >"$PID_FILE"

  for _ in $(seq 1 60); do
    if is_server_ready; then
      echo "Dev server ready at ${SERVER_URL}" >&2
      return 0
    fi
    sleep 1
  done

  echo "Timed out waiting for dev server at ${SERVER_URL}" >&2
  echo "Log: $LOG_FILE" >&2
  exit 1
}

if is_server_ready; then
  echo "Using existing dev server at ${SERVER_URL}" >&2
else
  if [[ -f "$PID_FILE" ]]; then
    existing_pid="$(cat "$PID_FILE" 2>/dev/null || true)"
    if [[ -n "$existing_pid" ]] && kill -0 "$existing_pid" >/dev/null 2>&1; then
      echo "Waiting for existing dev server process ${existing_pid}..." >&2
      for _ in $(seq 1 20); do
        if is_server_ready; then
          break
        fi
        sleep 1
      done
    else
      rm -f "$PID_FILE"
    fi
  fi

  if ! is_server_ready; then
    start_dev_server
  fi
fi

ATTACH_ARGS=(attach --project "$PROJECT_ID" --server "$SERVER_URL")
if [[ -n "$SURFACE_ID" ]]; then
  ATTACH_ARGS+=(--surface "$SURFACE_ID")
fi

(
  cd "$REPO_ROOT"
  bin/canvas-agent "${ATTACH_ARGS[@]}" >/dev/null
)

echo "Attached canvas-agent session for project ${PROJECT_ID}" >&2
if [[ -n "$SURFACE_ID" ]]; then
  echo "Surface: ${SURFACE_ID}" >&2
fi

cd "$REPO_ROOT"
exec "$REPO_ROOT/scripts/run-claude-canvas-mcp.sh" "$@"
