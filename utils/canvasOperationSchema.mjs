/**
 * Canvas agent operation schema (FOX2-74, closes FOX2-72).
 *
 * One validation boundary for remote canvas operations, shared by every
 * ingest path: the HTTP operations endpoint and the session queue both pass
 * through `applyCanvasAgentOperation` on the server, and the browser's
 * `applyRemoteOperation` runs the same check as a defense-in-depth backstop.
 *
 * Malformed operations are REJECTED with a structured error the agent
 * receives (HTTP 400 / `{ok:false,error}` queue result) — never silently
 * accepted, coerced, or allowed to reach the render tree (FOX2-72: a
 * payload nested under `item` sailed through both reducers, minted no id,
 * and crashed the board on every load).
 *
 * Plain JS on purpose: imported by the vite server, the browser bundle, and
 * the MCP runtime alike.
 */

export const KNOWN_CANVAS_ITEM_TYPES = Object.freeze([
  'embed',
  'html',
  'media',
  'mermaid',
  'excalidraw',
  'markdown',
  'mcp-app',
  'artboard',
  'section',
  'component',
])

/**
 * Operation types both reducers understand but whose payloads are either
 * empty or too tool-specific to gate here — they pass through validation
 * untouched. Shape mistakes in these degrade to no-ops in the reducers
 * rather than corrupt state, so strict gating buys nothing.
 */
const PASSTHROUGH_OPERATION_TYPES = new Set([
  'clear_canvas',
  'set_viewport',
  'focus_items',
  'set_active_theme',
  'set_canvas_tool',
  'convert_mermaid_to_excalidraw',
  'capture_embed_snapshots',
  'undo_source_mutation',
  'redo_source_mutation',
  'undo_canvas_change',
  'redo_canvas_change',
])

export function mintCanvasItemId() {
  return `canvas-item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((entry) => isNonEmptyString(entry))
}

function invalid(error) {
  return { ok: false, error }
}

/**
 * Validate one canvas item payload for create operations. Returns the
 * normalized item (id minted when absent) or an error string.
 */
function validateCreateItem(item, label) {
  if (!isPlainObject(item)) {
    return { error: `${label} must be an object.` }
  }
  if (!isNonEmptyString(item.type)) {
    return {
      error: `${label}.type is required — one of: ${KNOWN_CANVAS_ITEM_TYPES.join(', ')}.`,
    }
  }
  if (!KNOWN_CANVAS_ITEM_TYPES.includes(item.type)) {
    return {
      error: `${label}.type "${item.type}" is not a canvas item type. Known types: ${KNOWN_CANVAS_ITEM_TYPES.join(', ')}.`,
    }
  }
  if (
    !isPlainObject(item.position) ||
    !isFiniteNumber(item.position.x) ||
    !isFiniteNumber(item.position.y)
  ) {
    return { error: `${label}.position must be {x: number, y: number}.` }
  }
  if (
    item.size !== undefined &&
    (!isPlainObject(item.size) ||
      !isFiniteNumber(item.size.width) ||
      !isFiniteNumber(item.size.height))
  ) {
    return { error: `${label}.size must be {width: number, height: number} when present.` }
  }
  if (item.id !== undefined && !isNonEmptyString(item.id)) {
    return { error: `${label}.id must be a non-empty string when present.` }
  }
  return { item: item.id ? item : { ...item, id: mintCanvasItemId() } }
}

/**
 * Validate a remote canvas operation. Returns `{ok: true, operation}` with a
 * normalized copy (create ids minted, input never mutated) or
 * `{ok: false, error}` with an agent-readable reason.
 */
export function validateCanvasAgentOperation(operation) {
  if (!isPlainObject(operation)) {
    return invalid('Operation must be an object with a "type" field.')
  }
  if (!isNonEmptyString(operation.type)) {
    return invalid('Operation "type" is required.')
  }

  switch (operation.type) {
    case 'create_item': {
      const result = validateCreateItem(operation.item, 'operation.item')
      if (result.error) return invalid(result.error)
      return { ok: true, operation: { ...operation, item: result.item } }
    }
    case 'create_items': {
      if (!Array.isArray(operation.items) || operation.items.length === 0) {
        return invalid('operation.items must be a non-empty array of items.')
      }
      const nextItems = []
      for (let index = 0; index < operation.items.length; index += 1) {
        const result = validateCreateItem(operation.items[index], `operation.items[${index}]`)
        if (result.error) return invalid(result.error)
        nextItems.push(result.item)
      }
      return { ok: true, operation: { ...operation, items: nextItems } }
    }
    case 'update_item': {
      if (!isNonEmptyString(operation.id)) return invalid('update_item requires a string "id".')
      if (!isPlainObject(operation.updates)) {
        return invalid('update_item requires an "updates" object.')
      }
      return { ok: true, operation }
    }
    case 'update_items': {
      if (!Array.isArray(operation.updates) || operation.updates.length === 0) {
        return invalid('update_items requires a non-empty "updates" array of {id, updates}.')
      }
      for (let index = 0; index < operation.updates.length; index += 1) {
        const entry = operation.updates[index]
        if (!isPlainObject(entry) || !isNonEmptyString(entry.id) || !isPlainObject(entry.updates)) {
          return invalid(`update_items entry [${index}] must be {id: string, updates: object}.`)
        }
      }
      return { ok: true, operation }
    }
    case 'delete_items':
    case 'select_items': {
      if (!isStringArray(operation.ids)) {
        return invalid(`${operation.type} requires "ids" as an array of strings.`)
      }
      return { ok: true, operation }
    }
    case 'create_group': {
      if (!isPlainObject(operation.group) || !isNonEmptyString(operation.group.id)) {
        return invalid('create_group requires a "group" object with a string "id".')
      }
      return { ok: true, operation }
    }
    case 'update_group': {
      if (!isNonEmptyString(operation.id)) return invalid('update_group requires a string "id".')
      if (!isPlainObject(operation.updates)) {
        return invalid('update_group requires an "updates" object.')
      }
      return { ok: true, operation }
    }
    case 'delete_group': {
      if (!isNonEmptyString(operation.id)) return invalid('delete_group requires a string "id".')
      return { ok: true, operation }
    }
    case 'create_canvas_theme': {
      if (!isNonEmptyString(operation.label)) {
        return invalid('create_canvas_theme requires a string "label".')
      }
      return { ok: true, operation }
    }
    case 'update_canvas_theme_var': {
      if (!isNonEmptyString(operation.themeId) || !isNonEmptyString(operation.cssVar)) {
        return invalid('update_canvas_theme_var requires string "themeId" and "cssVar".')
      }
      return { ok: true, operation }
    }
    case 'delete_canvas_theme': {
      if (!isNonEmptyString(operation.themeId)) {
        return invalid('delete_canvas_theme requires a string "themeId".')
      }
      return { ok: true, operation }
    }
    default: {
      if (PASSTHROUGH_OPERATION_TYPES.has(operation.type)) {
        return { ok: true, operation }
      }
      return invalid(
        `Unknown operation type "${operation.type}". Known types: create_item, create_items, update_item, update_items, delete_items, select_items, create_group, update_group, delete_group, create_canvas_theme, update_canvas_theme_var, delete_canvas_theme, ${[...PASSTHROUGH_OPERATION_TYPES].join(', ')}.`
      )
    }
  }
}

/**
 * Quarantine filter for loading persisted state (localStorage drafts,
 * workspace snapshots): items that can never render safely — no string id or
 * no numeric position — are dropped instead of crashing the whole board.
 * Historical FOX2-72 boards poisoned before validation existed load again.
 */
export function isRenderableCanvasItem(item) {
  return (
    isPlainObject(item) &&
    isNonEmptyString(item.id) &&
    isPlainObject(item.position) &&
    isFiniteNumber(item.position.x) &&
    isFiniteNumber(item.position.y)
  )
}
