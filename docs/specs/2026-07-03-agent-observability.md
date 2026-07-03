# Agent Observability — event contract for every canvas change

**Date:** 2026-07-03 · **Status:** draft, awaiting approval · **Epic:** FOX2-43 (spec gate: FOX2-44)

## Problem

Agents — external MCP clients and the in-app copilot — can *read* the current
canvas (state / selection / themes / screenshots) and *write* it (30+ MCP
tools, epic FOX2-24). But **user-initiated changes are invisible as events**:
the browser pushes debounced state snapshots that overwrite each other, so an
agent that wants to know *what happened* must diff snapshots and guess.
Source-edit history (the undo log) lives only in browser memory. Events carry
no actor attribution, and there is no documented incremental-read contract.

**Definition of done:** an agent reconstructs *what happened and who did it*
from the event feed alone — no snapshot diffing — and the in-app copilot reads
the same stream.

## Constraints

- The dev-server event log is **in-memory per `workspaceKey`**
  (`utils/agentNativeWorkspaceEvents.ts`) with an existing cursor +
  acknowledge mechanism — reuse it, don't build a parallel system.
- Event payloads must stay **small**: no source snapshots in the feed
  (documents run to tens of KB; agents fetch current source via
  `read_html_node` when they need it).
- Do not reintroduce the reactive-loop failure modes fixed this cycle:
  no effects keyed on unstable callbacks (FOX2-38), no self-cancelling
  async effects (FOX2-40). Event emission must be fire-and-forget and
  gesture-coalesced.
- Emission points must be **funnels that already exist**, not per-callsite
  instrumentation: `useCanvasState` mutators, `applyRemoteOperation`,
  `handleReactNodeWriteSuccess` / `handleMarkdownWriteSuccess` (which FOX2-35
  and FOX2-42 already made the single choke points for source writes), and
  the autosave completion path (FOX2-40).

## Options

### A. Operation-shaped events (chosen)

Reuse the `CanvasRemoteOperation` vocabulary as the event payload, wrapped in
an attribution envelope.

- **+** Agents already speak this vocabulary — it is exactly what they issue
  through the MCP tools, so read and write sides stay symmetric.
- **+** Trivial to emit: user mutators and the agent-op applier both already
  produce/consume these shapes.
- **−** Operations describe the *after* state only (a move carries the new
  position, not the old). Mitigation: optional `before` summary field on the
  envelope for the fields the operation touched.

### B. Dedicated event schema

A hand-designed `kind`-per-action schema with tailored fields.

- **+** Purpose-built semantics per event.
- **−** A second vocabulary to define, document, and keep from drifting
  against the tool vocabulary — the exact drift class the FOX2-24 audit spent
  a cycle fixing.

### C. Diff/patch stream

Emit JSON-patch diffs between consecutive snapshots.

- **+** Complete by construction.
- **−** Noisy, expensive to compute per change, and loses intent and actor —
  "who did what" becomes "these paths changed", which is the problem we have
  today with snapshots, just finer-grained.

## Chosen direction (A)

### Envelope

```jsonc
{
  "id": "evt-…",            // unique
  "cursor": 128,             // monotonic per workspaceKey (existing log)
  "at": "2026-07-03T…Z",
  "actor": "user" | "agent:<sessionId>" | "system",
  "source": "canvas-ui" | "canvas-agent-mcp" | "workspace-sync" | …,
  "kind": "item-operation" | "source-edit" | "tool-changed" |
           "theme-changed" | "selection-changed" | "file-lifecycle" |
           "state-synced",
  "payload": { … }           // kind-specific, see below
}
```

### Kind vocabulary (v1)

| kind | payload | emitted from |
|---|---|---|
| `item-operation` | the `CanvasRemoteOperation` + optional `before` summary of touched fields | user mutators in `useCanvasState` (actor user); agent queue path already records these server-side (actor agent) |
| `source-edit` | `{ itemId, filePath \| "inline", summary, mutationTypes[] }` — **no snapshots** | `handleReactNodeWriteSuccess` / `handleMarkdownWriteSuccess`; undo/redo emit with `direction` |
| `tool-changed` / `theme-changed` | `{ tool }` / `{ themeId }` (+ theme CRUD variants) | the same handlers `applyCanvasAgentOperation` and the toolbar/panel share |
| `selection-changed` | `{ selectedIds }` coalesced (500 ms) | selection state effect |
| `file-lifecycle` | `{ action: opened\|saved\|created\|renamed\|deleted, path }` | canvas-file handlers + autosave completion |
| `state-synced` | existing blob — retained as the coarse fallback | workspace sync (unchanged) |

### Emission & transport

- Browser POSTs events (fire-and-forget, batched per animation frame) to a new
  `POST /api/agent-native/workspaces/canvas/events` that appends via the
  existing `appendAgentNativeWorkspaceEvent` and re-broadcasts on the existing
  SSE stream with `sourceClientId` (self-skip, same pattern as operations).
- Gesture coalescing: drag/move/resize emit **one event per gesture** (on
  pointerup) with before/after; never per-frame.

### Read contract

`get_workspace_events { sinceCursor?, limit? (≤200) }` →
`{ events, nextCursor }`. Cursor semantics already exist in the log; this
formalizes and documents them (manifest entry + `CANVAS_AGENT_MCP_COMMANDS.md`
+ recommended poll loop in the MCP prompt guidance).

### Retention

Ring buffer, last **500 events per workspaceKey** (in-memory, dev-server
lifetime). `nextCursor` beyond the buffer returns the oldest retained event
plus a `truncated: true` flag so agents know to re-baseline from
`get_canvas_state`.

## Scope v1

Obs-2 (user-action events), Obs-3 (source-edit events), Obs-4 (read contract
+ docs), Obs-6 (file lifecycle). Obs-5 (in-app activity feed) consumes the
result and can trail.

## Non-goals

- Persistence across dev-server restarts.
- Event-sourcing: the feed is **observational**, not authoritative — state
  replay stays snapshot-based.
- Per-keystroke text events (coalesced to write-success granularity).
- Screenshots or source bodies inside events.

## Risks

- **Volume:** selection and gesture coalescing keep the feed at human-action
  rate; the 500-event ring bounds memory.
- **Feedback loops:** consumers in the app skip events with their own
  `sourceClientId` (existing, proven pattern).
- **Vocabulary drift:** `item-operation` payloads ARE the operation types —
  a new operation automatically becomes an observable event; only genuinely
  new kinds need doc updates.
