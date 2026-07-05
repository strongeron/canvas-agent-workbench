# Component intrinsic hug — shell = real rendered size

**Date:** 2026-07-05 · **Issue:** FOX2-57 · **Status:** approved (user picked Option A)

## Problem

Dropping a Button into an artboard yields a 220×60 guessed shell — or a
full-column shell in grid/stretch parents, where unset width defaults to
fill. "Hug content" applies the stored guess, not the content: nothing in the
codebase measures the rendered component. Users cannot "drop a button and
operate with the real button width."

## Constraints

- No continuous measurement write-back (FOX2-40 feedback-loop class).
- `item.size` in saved documents must stay truthful — agents
  (`get_canvas_state`), export, screenshots, and the FOX2-41 layout metrics
  all read it.
- Existing documents must keep rendering sensibly without migration.

## Options

1. **CSS-intrinsic hug (chosen)** — `fit-content` shells; one-shot measured
   backfill keeps documents truthful. Live across variant/prop changes,
   zero loops.
2. Measure-once-on-drop — numeric sizes drift as soon as props change.
3. Continuous ResizeObserver write-back — FOX2-40-class loop; rejected.

## Chosen semantics

Axis modes for layout children become `hug | fill | fixed`:

| mode | component child renders | set by |
|---|---|---|
| `hug` (and unset) | `fit-content` — intrinsic size of the rendered component | default on drop; "Hug content" button |
| `fixed` | stored `size.*` px | SE-handle drag; numeric inspector edits |
| `fill` | `100%` | "Fill parent" button (grid/stretch parents no longer force it for components) |

Non-component children (sections, html, markdown, …) keep today's behavior —
`hug` remains stored-size for them; `fixed` is accepted and treated the same.

**Migration note:** existing component children saved with `hug` snap from the
stored guess to their true intrinsic size — that is the fix, not a
regression. The SE-drag path previously wrote "hug at dragged size"; it now
writes `fixed`, preserving its meaning.

**One-shot backfill:** on mount and when componentId/variant/props change,
compare `offsetWidth/offsetHeight` (layout px — immune to canvas zoom
transforms) against `item.size`; if either axis differs by more than 1px,
write the rounded measurement once. Writing does not change the rendered
fit-content size, so the write converges immediately — no loop.

## Non-goals

- Intrinsic hug for non-component children (html/markdown iframes have their
  own sizing pipelines).
- Freeform (non-layout) component items — absolute positioning keeps explicit
  sizes.
