import {
  buildNativeComponentShell,
  escapeHtmlText,
} from './canvasNativeComponentShell.mjs'

export const DEFAULT_ARTBOARD_LAYOUT = {
  display: 'flex',
  direction: 'column',
  align: 'stretch',
  justify: 'start',
  gap: 24,
  padding: 32,
}

export const DEFAULT_ARTBOARD_SIZE = { width: 1440, height: 900 }
export const DEFAULT_ARTBOARD_POSITION = { x: 120, y: 120 }
export const DEFAULT_HTML_ITEM_SIZE = { width: 720, height: 480 }
export const DEFAULT_MCP_APP_ITEM_SIZE = { width: 760, height: 480 }
export const DEFAULT_EXPORT_FORMAT = 'react-tailwind'
export const EXPORT_FORMATS = new Set(['react-tailwind', 'react-css-vars'])
export const GROUP_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

export function deriveCanvasNextZIndex(items) {
  const list = Array.isArray(items) ? items : []
  return list.reduce((max, item) => Math.max(max, Number(item?.zIndex || 0) + 1), 1)
}

export function normalizeCanvasStateSnapshot(input) {
  const items = Array.isArray(input?.items) ? input.items : []
  const groups = Array.isArray(input?.groups) ? input.groups : []
  const selectedIds = Array.isArray(input?.selectedIds) ? input.selectedIds : []
  const nextZIndex = Number.isFinite(input?.nextZIndex)
    ? Math.max(Number(input.nextZIndex), deriveCanvasNextZIndex(items))
    : deriveCanvasNextZIndex(items)

  return {
    items,
    groups,
    selectedIds,
    nextZIndex,
  }
}

export function collectCanvasCascadeDeleteIds(state, ids) {
  const current = normalizeCanvasStateSnapshot(state)
  const idsToRemove = new Set(Array.isArray(ids) ? ids : [])
  current.items.forEach((item) => {
    if (item?.parentId && idsToRemove.has(item.parentId)) {
      idsToRemove.add(item.id)
    }
  })
  return idsToRemove
}

export function applyCanvasRemoteOperationToState(state, operation) {
  const current = normalizeCanvasStateSnapshot(state)

  if (!operation || typeof operation !== 'object' || typeof operation.type !== 'string') {
    return current
  }

  switch (operation.type) {
    case 'create_item': {
      if (!operation.item || typeof operation.item !== 'object' || !operation.item.id) {
        return current
      }
      const existingIndex = current.items.findIndex((item) => item.id === operation.item.id)
      const nextItems =
        existingIndex >= 0
          ? current.items.map((item, index) => (index === existingIndex ? operation.item : item))
          : [...current.items, operation.item]

      return {
        ...current,
        items: nextItems,
        nextZIndex: Math.max(current.nextZIndex, deriveCanvasNextZIndex(nextItems)),
        selectedIds: operation.select ? [operation.item.id] : current.selectedIds,
      }
    }
    case 'create_items': {
      const nextBatch = Array.isArray(operation.items)
        ? operation.items.filter((item) => item && typeof item === 'object' && item.id)
        : []
      if (nextBatch.length === 0) {
        return current
      }

      const incomingIds = new Set(nextBatch.map((item) => item.id))
      const preserved = current.items.filter((item) => !incomingIds.has(item.id))
      const nextItems = [...preserved, ...nextBatch]

      return {
        ...current,
        items: nextItems,
        nextZIndex: Math.max(current.nextZIndex, deriveCanvasNextZIndex(nextItems)),
        selectedIds: operation.select ? nextBatch.map((item) => item.id) : current.selectedIds,
      }
    }
    case 'update_item':
      if (!operation.id) return current
      return {
        ...current,
        items: current.items.map((item) =>
          item.id === operation.id ? { ...item, ...operation.updates } : item
        ),
      }
    case 'update_items': {
      const entries = Array.isArray(operation.updates)
        ? operation.updates.filter((entry) => entry && typeof entry === 'object' && entry.id)
        : []
      if (entries.length === 0) return current
      const updatesById = new Map(entries.map((entry) => [entry.id, entry.updates]))
      return {
        ...current,
        items: current.items.map((item) => {
          const updates = updatesById.get(item.id)
          return updates ? { ...item, ...updates } : item
        }),
        selectedIds: operation.select ? entries.map((entry) => entry.id) : current.selectedIds,
      }
    }
    case 'delete_items': {
      const idsToRemove = collectCanvasCascadeDeleteIds(current, operation.ids)
      return {
        ...current,
        items: current.items.filter((item) => !idsToRemove.has(item.id)),
        selectedIds: current.selectedIds.filter((id) => !idsToRemove.has(id)),
      }
    }
    case 'select_items':
      return {
        ...current,
        selectedIds: Array.isArray(operation.ids) ? operation.ids : [],
      }
    case 'clear_canvas':
      return {
        items: [],
        groups: [],
        nextZIndex: 1,
        selectedIds: [],
      }
    case 'create_group': {
      if (!operation.group || typeof operation.group !== 'object' || !operation.group.id) {
        return current
      }
      const itemIds = normalizeIdList(operation.itemIds)
      const existingIndex = current.groups.findIndex((group) => group.id === operation.group.id)
      const nextGroups =
        existingIndex >= 0
          ? current.groups.map((group, index) => (index === existingIndex ? operation.group : group))
          : [...current.groups, operation.group]
      const nextItems = current.items.map((item) =>
        itemIds.includes(item.id) ? { ...item, groupId: operation.group.id } : item
      )

      return {
        ...current,
        items: nextItems,
        groups: nextGroups,
        selectedIds: operation.select ? itemIds : current.selectedIds,
      }
    }
    case 'update_group':
      if (!operation.id) return current
      return {
        ...current,
        groups: current.groups.map((group) =>
          group.id === operation.id ? { ...group, ...operation.updates } : group
        ),
      }
    case 'delete_group':
      if (!operation.id) return current
      return {
        ...current,
        items: current.items.map((item) =>
          item.groupId === operation.id ? { ...item, groupId: undefined } : item
        ),
        groups: current.groups.filter((group) => group.id !== operation.id),
      }
    case 'set_viewport':
    case 'focus_items':
    case 'set_active_theme':
    case 'set_canvas_tool':
    case 'convert_mermaid_to_excalidraw':
    case 'undo_source_mutation':
    case 'redo_source_mutation':
      // UI-side effects only — no canvas state mutation. The dev server still
      // records the operation in the event log and broadcasts it so the
      // browser bridge can call the matching UI handler (setActiveThemeId,
      // setCanvasTool, handleConvertMermaidToExcalidraw, handleUndoMutation,
      // handleRedoMutation). Mermaid→Excalidraw conversion must run in the
      // browser: @excalidraw/mermaid-to-excalidraw renders through the DOM.
      return current
    default:
      return current
  }
}

export function createCanvasItemId(prefix) {
  const slug = String(prefix || 'item')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'item'
  return `${slug}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function normalizeString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}

export function normalizeIdList(value) {
  return Array.isArray(value) ? value.map((entry) => normalizeString(entry)).filter(Boolean) : []
}

export function normalizePosition(value, fallback = DEFAULT_ARTBOARD_POSITION) {
  return {
    x: Number.isFinite(value?.x) ? Number(value.x) : fallback.x,
    y: Number.isFinite(value?.y) ? Number(value.y) : fallback.y,
  }
}

export function normalizeSize(value, fallback = DEFAULT_ARTBOARD_SIZE) {
  return {
    width: Number.isFinite(value?.width) ? Math.max(80, Number(value.width)) : fallback.width,
    height: Number.isFinite(value?.height) ? Math.max(40, Number(value.height)) : fallback.height,
  }
}

export function normalizeBoolean(value, fallback = false) {
  return typeof value === 'boolean' ? value : fallback
}

export function normalizeArtboardLayout(value) {
  const input = value && typeof value === 'object' ? value : {}
  return {
    display: input.display === 'grid' ? 'grid' : DEFAULT_ARTBOARD_LAYOUT.display,
    direction: input.direction === 'row' ? 'row' : DEFAULT_ARTBOARD_LAYOUT.direction,
    align: ['start', 'center', 'end', 'stretch'].includes(input.align) ? input.align : DEFAULT_ARTBOARD_LAYOUT.align,
    justify: ['start', 'center', 'end', 'between'].includes(input.justify) ? input.justify : DEFAULT_ARTBOARD_LAYOUT.justify,
    gap: Number.isFinite(input.gap) ? Number(input.gap) : DEFAULT_ARTBOARD_LAYOUT.gap,
    columns: Number.isFinite(input.columns) ? Number(input.columns) : undefined,
    padding: Number.isFinite(input.padding) ? Number(input.padding) : DEFAULT_ARTBOARD_LAYOUT.padding,
  }
}

export function createCreateItemOperation(item, select = true) {
  return {
    type: 'create_item',
    item,
    select,
  }
}

export function createCreateItemsOperation(items, select = true) {
  return {
    type: 'create_items',
    items: Array.isArray(items) ? items.filter((item) => item && typeof item === 'object') : [],
    select,
  }
}

export function createUpdateItemOperation(id, updates) {
  return {
    type: 'update_item',
    id,
    updates,
  }
}

export function createDeleteItemsOperation(ids) {
  return {
    type: 'delete_items',
    ids: normalizeIdList(ids),
  }
}

export function createCreateGroupOperation(group, itemIds = [], select = false) {
  return {
    type: 'create_group',
    group,
    itemIds: normalizeIdList(itemIds),
    select,
  }
}

export function createUpdateGroupOperation(id, updates) {
  return {
    type: 'update_group',
    id,
    updates,
  }
}

export function createDeleteGroupOperation(id) {
  return {
    type: 'delete_group',
    id,
  }
}

export function createSetViewportOperation(viewport) {
  return {
    type: 'set_viewport',
    viewport: {
      scale: Number(viewport?.scale) || 1,
      offset: {
        x: Number(viewport?.offset?.x) || 0,
        y: Number(viewport?.offset?.y) || 0,
      },
    },
  }
}

export function createFocusItemsOperation(ids, padding, select = false) {
  return {
    type: 'focus_items',
    ids: normalizeIdList(ids),
    padding: Number.isFinite(padding) ? Number(padding) : undefined,
    select,
  }
}

export function createSelectItemsOperation(ids) {
  return {
    type: 'select_items',
    ids: normalizeIdList(ids),
  }
}

export function createClearCanvasOperation() {
  return { type: 'clear_canvas' }
}

export function createSetActiveThemeOperation(themeId) {
  return {
    type: 'set_active_theme',
    themeId: normalizeString(themeId),
  }
}

const CANVAS_TOOLS = new Set(['select', 'edit', 'interact'])

export function createConvertMermaidToExcalidrawOperation(itemId, keepOriginal = false) {
  return {
    type: 'convert_mermaid_to_excalidraw',
    itemId: normalizeString(itemId),
    keepOriginal: keepOriginal === true,
  }
}

export function createSetCanvasToolOperation(tool) {
  const normalized = normalizeString(tool)
  return {
    type: 'set_canvas_tool',
    tool: CANVAS_TOOLS.has(normalized) ? normalized : '',
  }
}

export function createUndoSourceMutationOperation(args = {}) {
  const scope = args.scope === 'log-entry' ? 'log-entry' : 'active-file'
  return {
    type: 'undo_source_mutation',
    scope,
    logEntryId: normalizeString(args.logEntryId) || undefined,
  }
}

export function createRedoSourceMutationOperation(args = {}) {
  const scope = args.scope === 'log-entry' ? 'log-entry' : 'active-file'
  return {
    type: 'redo_source_mutation',
    scope,
    logEntryId: normalizeString(args.logEntryId) || undefined,
  }
}

/**
 * Mirror the UI duplicate-selected path: clone each item with a fresh id,
 * apply a position offset, bump z-index, and drop the group association.
 * Returns the new items plus their ids so an MCP tool can ship them through
 * the `create_items` operation and report `{ newIds }` to the agent.
 *
 * Pure helper — no fs/node:* access — so it can run inside the MCP server
 * AND in tests next to the canvas state code.
 */
export function buildDuplicateItemsResult(state, args = {}) {
  const current = normalizeCanvasStateSnapshot(state)
  const ids = normalizeIdList(args.ids)
  if (ids.length === 0) {
    return { ok: false, code: 'bad-input', error: 'ids is required.' }
  }
  const dx = Number.isFinite(args.offset?.dx) ? Number(args.offset.dx) : 20
  const dy = Number.isFinite(args.offset?.dy) ? Number(args.offset.dy) : 20

  const selected = current.items.filter((item) => ids.includes(item.id))
  if (selected.length === 0) {
    return { ok: false, code: 'not-found', error: 'No matching canvas items for the provided ids.' }
  }

  const baseTimestamp = Date.now()
  const newItems = selected.map((item, index) => {
    const newId = `canvas-item-${baseTimestamp}-${index}-${Math.random().toString(36).slice(2, 9)}`
    const clone = {
      ...item,
      id: newId,
      position: {
        x: Number(item.position?.x || 0) + dx,
        y: Number(item.position?.y || 0) + dy,
      },
      zIndex: current.nextZIndex + index,
      groupId: undefined,
    }
    // Mirror the UI duplicate path (resetMcpAppConnectionState in
    // useCanvasState.ts): a cloned MCP-app node shares no live proxy
    // connection, so it must start cold — copying status/caches would report a
    // phantom "connected" node to the agent.
    if (clone.type === 'mcp-app') {
      clone.status = 'disconnected'
      clone.lastError = undefined
      clone.toolsCache = undefined
      clone.resourcesCache = undefined
      clone.promptsCache = undefined
      clone.recentCalls = undefined
    }
    return clone
  })

  return {
    ok: true,
    items: newItems,
    newIds: newItems.map((item) => item.id),
  }
}

export function createUpdateItemsOperation(updates, select = false) {
  return {
    type: 'update_items',
    updates,
    select,
  }
}

/**
 * Mirror the UI "move selection into artboard" path
 * (handleMoveSelectionToArtboard in CanvasTab.tsx): re-parent each item onto
 * the artboard, append after the current children in `order`, and reset
 * position/rotation because layout children render flow-positioned, not
 * absolutely. Returns update entries for the `update_items` operation plus
 * the moved ids so an MCP tool can report `{ movedIds }` to the agent.
 *
 * Pure helper — no fs/node:* access — so it can run inside the MCP server
 * AND in tests next to the canvas state code.
 */
export function buildMoveItemsIntoArtboardResult(state, args = {}) {
  const current = normalizeCanvasStateSnapshot(state)
  const ids = normalizeIdList(args.ids)
  if (ids.length === 0) {
    return { ok: false, code: 'bad-input', error: 'ids is required.' }
  }
  const artboardId = normalizeString(args.artboardId)
  if (!artboardId) {
    return { ok: false, code: 'bad-input', error: 'artboardId is required.' }
  }
  const artboard = current.items.find((item) => item.id === artboardId)
  if (!artboard || artboard.type !== 'artboard') {
    return {
      ok: false,
      code: 'not-found',
      error: `No artboard found for id "${artboardId}".`,
    }
  }

  const movable = current.items.filter(
    (item) =>
      ids.includes(item.id) &&
      item.id !== artboard.id &&
      item.type !== 'artboard' &&
      item.parentId !== artboard.id
  )
  if (movable.length === 0) {
    return {
      ok: false,
      code: 'not-found',
      error:
        'No movable canvas items for the provided ids (artboards and items already inside the target are excluded).',
    }
  }

  const siblings = current.items.filter(
    (item) => item.parentId === artboard.id && item.type !== 'artboard'
  )
  const maxOrder = siblings.reduce((max, item) => Math.max(max, item.order ?? 0), -1)

  const updates = movable.map((item, index) => ({
    id: item.id,
    updates: {
      parentId: artboard.id,
      order: maxOrder + index + 1,
      position: { x: 0, y: 0 },
      rotation: 0,
    },
  }))

  return {
    ok: true,
    updates,
    movedIds: movable.map((item) => item.id),
    artboardId: artboard.id,
  }
}

/**
 * Mirror the UI "wrap selection in section" path
 * (handleWrapSelectionInSection in CanvasTab.tsx), including its two
 * eligibility modes:
 * - "existing-parent": every item shares one artboard/section parent; the
 *   section slots in at the selection's minimum order.
 * - "freeform-inside-artboard": every item is freeform and their centers sit
 *   inside exactly one artboard; the section appends after that artboard's
 *   children.
 * The section is a grid (≤3 columns, fill width / hug height) and the wrapped
 * items re-order by their selection order with position/rotation reset.
 * Returns the section item plus re-parent updates so the MCP runner can queue
 * create_item BEFORE update_items — a dangling parentId must never exist.
 *
 * Pure helper — no fs/node:* access — so it can run inside the MCP server
 * AND in tests next to the canvas state code.
 */
export function buildWrapItemsInSectionResult(state, args = {}) {
  const current = normalizeCanvasStateSnapshot(state)
  const ids = normalizeIdList(args.ids)
  if (ids.length < 2) {
    return { ok: false, code: 'bad-input', error: 'ids must contain at least 2 items to wrap.' }
  }
  const selectedItems = current.items.filter((item) => ids.includes(item.id))
  if (selectedItems.length !== ids.length) {
    return {
      ok: false,
      code: 'not-found',
      error: 'One or more ids do not match canvas items.',
    }
  }
  if (selectedItems.some((item) => item.type === 'artboard' || item.type === 'section')) {
    return {
      ok: false,
      code: 'bad-input',
      error: 'Artboards and sections cannot be wrapped — select leaf items only.',
    }
  }

  let parent = null
  let mode = null
  const parentIds = new Set(selectedItems.map((item) => item.parentId).filter(Boolean))
  if (parentIds.size === 1 && selectedItems.every((item) => item.parentId)) {
    const [parentId] = Array.from(parentIds)
    const candidate = current.items.find(
      (item) => item.id === parentId && (item.type === 'artboard' || item.type === 'section')
    )
    if (candidate) {
      parent = candidate
      mode = 'existing-parent'
    }
  }
  if (!parent && selectedItems.every((item) => !item.parentId)) {
    const containing = current.items.filter(
      (item) =>
        item.type === 'artboard' &&
        selectedItems.every((selected) => {
          const centerX = Number(selected.position?.x || 0) + Number(selected.size?.width || 0) / 2
          const centerY = Number(selected.position?.y || 0) + Number(selected.size?.height || 0) / 2
          return (
            centerX >= Number(item.position?.x || 0) &&
            centerX <= Number(item.position?.x || 0) + Number(item.size?.width || 0) &&
            centerY >= Number(item.position?.y || 0) &&
            centerY <= Number(item.position?.y || 0) + Number(item.size?.height || 0)
          )
        })
    )
    if (containing.length === 1) {
      parent = containing[0]
      mode = 'freeform-inside-artboard'
    }
  }
  if (!parent) {
    return {
      ok: false,
      code: 'bad-input',
      error:
        'Items must either share one artboard/section parent, or all be freeform with centers inside exactly one artboard.',
    }
  }

  const orderedSelection = [...selectedItems].sort((a, b) =>
    mode === 'existing-parent'
      ? (a.order ?? 0) - (b.order ?? 0)
      : a.position.y === b.position.y
        ? a.position.x - b.position.x
        : a.position.y - b.position.y
  )

  const siblings = current.items.filter(
    (item) => item.parentId === parent.id && item.type !== 'artboard'
  )
  const maxOrder = siblings.reduce((max, item) => Math.max(max, item.order ?? 0), -1)
  const insertOrder =
    mode === 'existing-parent'
      ? Math.min(...orderedSelection.map((item) => item.order ?? 0))
      : maxOrder + 1

  const sectionId = `canvas-section-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const maxHeight = Math.max(...orderedSelection.map((item) => Number(item.size?.height || 0)))
  const totalHeight = orderedSelection.reduce(
    (sum, item) => sum + Number(item.size?.height || 0),
    0
  )
  const parentPadding = parent.layout?.padding ?? 0
  const fillWidth = Math.max(120, Number(parent.size?.width || 0) - parentPadding * 2)
  const hugHeight = Math.max(maxHeight, totalHeight + (orderedSelection.length - 1) * 16)

  const overrides =
    args.section && typeof args.section === 'object' ? args.section : {}
  const sectionItem = {
    id: sectionId,
    type: 'section',
    name: normalizeString(overrides.name) || 'Section',
    parentId: parent.id,
    order: insertOrder,
    position: { x: 0, y: 0 },
    size: {
      width: fillWidth,
      height: hugHeight,
    },
    layoutSizing: {
      width: 'fill',
      height: 'hug',
      hugWidth: Math.max(...orderedSelection.map((item) => Number(item.size?.width || 0))),
      hugHeight,
    },
    rotation: 0,
    zIndex: current.nextZIndex,
    layout:
      overrides.layout && typeof overrides.layout === 'object'
        ? overrides.layout
        : {
            display: 'grid',
            columns: Math.min(orderedSelection.length, 3),
            align: 'stretch',
            justify: 'start',
            gap: 16,
            padding: 16,
          },
    ...(normalizeString(overrides.background) ? { background: normalizeString(overrides.background) } : {}),
    ...(normalizeString(overrides.themeId) ? { themeId: normalizeString(overrides.themeId) } : {}),
  }

  const updates = orderedSelection.map((item, index) => ({
    id: item.id,
    updates: {
      parentId: sectionId,
      order: index,
      position: { x: 0, y: 0 },
      rotation: 0,
    },
  }))

  return {
    ok: true,
    sectionItem,
    updates,
    wrappedIds: orderedSelection.map((item) => item.id),
    mode,
    parentId: parent.id,
  }
}

/**
 * Mirror the UI layer-order affordances as one tool:
 * - "front" mirrors bringToFront (useCanvasState.ts): zIndex jumps to
 *   nextZIndex so the item renders above everything.
 * - "back" is the missing UI counterpart: zIndex drops below the current
 *   minimum (may go negative — CSS stacking accepts it).
 * - "up" / "down" mirror handleMoveLayer (CanvasTab.tsx): swap `order` with
 *   the adjacent sibling inside the same artboard/section. Freeform items are
 *   rejected explicitly — the UI affordance only exists for layout children,
 *   and silently bumping zIndex instead would misreport what happened.
 *
 * Pure helper — no fs/node:* access — so it can run inside the MCP server
 * AND in tests next to the canvas state code.
 */
export function buildReorderLayerResult(state, args = {}) {
  const current = normalizeCanvasStateSnapshot(state)
  const id = normalizeString(args.id)
  if (!id) {
    return { ok: false, code: 'bad-input', error: 'id is required.' }
  }
  const direction = normalizeString(args.direction)
  if (!['front', 'back', 'up', 'down'].includes(direction)) {
    return {
      ok: false,
      code: 'bad-input',
      error: 'direction must be one of "front", "back", "up", "down".',
    }
  }
  const target = current.items.find((item) => item.id === id)
  if (!target) {
    return { ok: false, code: 'not-found', error: `No canvas item found for id "${id}".` }
  }

  if (direction === 'front') {
    return {
      ok: true,
      updates: [{ id, updates: { zIndex: current.nextZIndex } }],
      direction,
    }
  }

  if (direction === 'back') {
    const minZIndex = current.items.reduce(
      (min, item) => Math.min(min, Number(item.zIndex || 0)),
      Number(target.zIndex || 0)
    )
    return {
      ok: true,
      updates: [{ id, updates: { zIndex: minZIndex - 1 } }],
      direction,
    }
  }

  if (!target.parentId) {
    return {
      ok: false,
      code: 'bad-input',
      error:
        'up/down reorder only applies to items inside an artboard or section (layout order). Use "front" or "back" for freeform items.',
    }
  }

  const siblings = current.items
    .filter((item) => item.parentId === target.parentId && item.type !== 'artboard')
    .map((item, index) => ({ id: item.id, order: item.order ?? index }))
    .sort((a, b) => a.order - b.order)
  const currentIndex = siblings.findIndex((item) => item.id === id)
  const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
  if (swapIndex < 0 || swapIndex >= siblings.length) {
    return {
      ok: false,
      code: 'no-op',
      error: `Item is already at the ${direction === 'up' ? 'top' : 'bottom'} of its layout order.`,
    }
  }

  const currentEntry = siblings[currentIndex]
  const swapEntry = siblings[swapIndex]
  return {
    ok: true,
    updates: [
      { id: currentEntry.id, updates: { order: swapEntry.order } },
      { id: swapEntry.id, updates: { order: currentEntry.order } },
    ],
    direction,
  }
}


/**
 * Mirror the section-size controls in CanvasArtboardPropsPanel:
 * - widthMode/heightMode "fill" matches the parent's inner size (parent size
 *   minus 2x layout padding, floored at 120) and records the previous size in
 *   layoutSizing.hugWidth/hugHeight so "hug" can restore it — exactly what
 *   the panel's Fill/Hug toggles do.
 * - Explicit width/height numbers mirror the panel's number inputs: the
 *   section becomes "hug" at that size. (The UI has no separate "fixed" mode;
 *   an explicit size IS hug with a stored value.)
 * The panel also derives a content-based hug size from children for display;
 * that refinement is UI-only — this helper restores the stored hug size and
 * falls back to the current size, the same fallback the panel uses.
 *
 * Pure helper — no fs/node:* access — so it can run inside the MCP server
 * AND in tests next to the canvas state code.
 */
export function buildUpdateSectionSizingResult(state, args = {}) {
  const current = normalizeCanvasStateSnapshot(state)
  const itemId = normalizeString(args.itemId)
  if (!itemId) {
    return { ok: false, code: 'bad-input', error: 'itemId is required.' }
  }
  const section = current.items.find((item) => item.id === itemId)
  if (!section || section.type !== 'section') {
    return { ok: false, code: 'not-found', error: `No section found for id "${itemId}".` }
  }

  const widthMode = normalizeString(args.widthMode)
  const heightMode = normalizeString(args.heightMode)
  const explicitWidth = Number.isFinite(args.width) ? Number(args.width) : null
  const explicitHeight = Number.isFinite(args.height) ? Number(args.height) : null
  if (widthMode && !['fill', 'hug'].includes(widthMode)) {
    return { ok: false, code: 'bad-input', error: 'widthMode must be "fill" or "hug".' }
  }
  if (heightMode && !['fill', 'hug'].includes(heightMode)) {
    return { ok: false, code: 'bad-input', error: 'heightMode must be "fill" or "hug".' }
  }
  if (widthMode === 'fill' && explicitWidth !== null) {
    return { ok: false, code: 'bad-input', error: 'width cannot be combined with widthMode "fill".' }
  }
  if (heightMode === 'fill' && explicitHeight !== null) {
    return { ok: false, code: 'bad-input', error: 'height cannot be combined with heightMode "fill".' }
  }
  if (!widthMode && !heightMode && explicitWidth === null && explicitHeight === null) {
    return {
      ok: false,
      code: 'bad-input',
      error: 'Provide at least one of widthMode, heightMode, width, height.',
    }
  }

  const parent = section.parentId
    ? current.items.find(
        (item) =>
          item.id === section.parentId && (item.type === 'artboard' || item.type === 'section')
      )
    : null
  if ((widthMode === 'fill' || heightMode === 'fill') && !parent) {
    return {
      ok: false,
      code: 'bad-input',
      error: 'Fill sizing requires the section to have an artboard or section parent.',
    }
  }
  const parentPadding = parent?.layout?.padding ?? 0
  const fillWidth = parent
    ? Math.max(120, Number(parent.size?.width || 0) - parentPadding * 2)
    : null
  const fillHeight = parent
    ? Math.max(120, Number(parent.size?.height || 0) - parentPadding * 2)
    : null

  const size = { ...section.size }
  const layoutSizing = { ...(section.layoutSizing || {}) }

  if (explicitWidth !== null) {
    size.width = Math.max(1, explicitWidth)
    layoutSizing.width = 'hug'
    layoutSizing.hugWidth = size.width
  } else if (widthMode === 'fill') {
    layoutSizing.hugWidth = layoutSizing.hugWidth ?? size.width
    size.width = fillWidth
    layoutSizing.width = 'fill'
  } else if (widthMode === 'hug') {
    size.width = layoutSizing.hugWidth ?? Math.max(120, size.width)
    layoutSizing.width = 'hug'
    layoutSizing.hugWidth = size.width
  }

  if (explicitHeight !== null) {
    size.height = Math.max(1, explicitHeight)
    layoutSizing.height = 'hug'
    layoutSizing.hugHeight = size.height
  } else if (heightMode === 'fill') {
    layoutSizing.hugHeight = layoutSizing.hugHeight ?? size.height
    size.height = fillHeight
    layoutSizing.height = 'fill'
  } else if (heightMode === 'hug') {
    size.height = layoutSizing.hugHeight ?? Math.max(80, size.height)
    layoutSizing.height = 'hug'
    layoutSizing.hugHeight = size.height
  }

  return {
    ok: true,
    itemId,
    updates: { size, layoutSizing },
  }
}

export function createArtboardItem(state, args = {}) {
  const current = normalizeCanvasStateSnapshot(state)
  return {
    id: createCanvasItemId('artboard'),
    type: 'artboard',
    name: normalizeString(args.name) || 'Artboard',
    position: normalizePosition(args.position, DEFAULT_ARTBOARD_POSITION),
    size: normalizeSize(args.size, DEFAULT_ARTBOARD_SIZE),
    rotation: 0,
    zIndex: current.nextZIndex,
    background: normalizeString(args.background) || undefined,
    themeId: normalizeString(args.themeId) || undefined,
    layout: normalizeArtboardLayout(args.layout),
  }
}

export function createCanvasGroup(state, args = {}) {
  const current = normalizeCanvasStateSnapshot(state)
  const itemIds = normalizeIdList(args.itemIds)
  if (itemIds.length === 0) {
    throw new Error('Canvas group requires at least one item id.')
  }

  const groupedItems = current.items.filter((item) => itemIds.includes(item.id))
  if (groupedItems.length === 0) {
    throw new Error('Canvas group item ids did not match any canvas items.')
  }

  const minX = Math.min(...groupedItems.map((item) => item.position.x))
  const minY = Math.min(...groupedItems.map((item) => item.position.y))

  return {
    id: normalizeString(args.id) || createCanvasItemId('group'),
    name: normalizeString(args.name) || `Group ${current.groups.length + 1}`,
    position: normalizePosition(args.position, { x: minX, y: minY }),
    isLocked: normalizeBoolean(args.isLocked, false),
    color:
      normalizeString(args.color) ||
      GROUP_COLORS[current.groups.length % GROUP_COLORS.length],
  }
}

export function createHtmlCanvasItem(state, args = {}) {
  const current = normalizeCanvasStateSnapshot(state)
  const src = normalizeString(args.src)
  const sourceReact = normalizeString(args.sourceReact)
  const sourceCss = typeof args.sourceCss === 'string' ? args.sourceCss : undefined
  const sourceHtml = normalizeString(args.sourceHtml || args.source)
  if (!src && !sourceHtml && !sourceReact) {
    throw new Error('HTML item src, sourceHtml, or sourceReact is required.')
  }

  return {
    id: createCanvasItemId('html'),
    type: 'html',
    src: src || undefined,
    title: normalizeString(args.title) || 'HTML bundle',
    sandbox:
      normalizeString(args.sandbox) || 'allow-scripts allow-same-origin allow-forms allow-modals',
    background: normalizeString(args.background) || undefined,
    sourceMode:
      ['bundle', 'inline', 'react', 'url'].includes(args.sourceMode)
        ? args.sourceMode
        : sourceReact
          ? 'react'
        : sourceHtml
          ? 'inline'
          : 'bundle',
    sourceHtml: sourceHtml || undefined,
    sourceReact: sourceReact || undefined,
    sourceCss,
    entryAsset: normalizeString(args.entryAsset) || undefined,
    sourcePath: normalizeString(args.sourcePath) || undefined,
    sourceImportedAt: normalizeString(args.sourceImportedAt) || undefined,
    position: normalizePosition(args.position, DEFAULT_ARTBOARD_POSITION),
    size: normalizeSize(args.size, DEFAULT_HTML_ITEM_SIZE),
    rotation: 0,
    zIndex: current.nextZIndex,
    parentId: normalizeString(args.parentId) || undefined,
  }
}

export function createMcpAppCanvasItem(state, args = {}) {
  const current = normalizeCanvasStateSnapshot(state)
  const transport = args.transport && typeof args.transport === 'object' ? args.transport : null
  if (!transport || (transport.kind !== 'http' && transport.kind !== 'stdio')) {
    throw new Error('MCP app transport is required.')
  }

  if (transport.kind === 'http') {
    const url = normalizeString(transport.url)
    if (!url) throw new Error('HTTP MCP app transport requires a url.')
  } else {
    const command = normalizeString(transport.command)
    if (!command) throw new Error('stdio MCP app transport requires a command.')
  }

  return {
    id: createCanvasItemId('mcp-app'),
    type: 'mcp-app',
    appName: normalizeString(args.appName) || 'MCP app',
    transport,
    status: ['connecting', 'connected', 'error'].includes(args.status)
      ? args.status
      : 'disconnected',
    position: normalizePosition(args.position, DEFAULT_ARTBOARD_POSITION),
    size: normalizeSize(args.size, DEFAULT_MCP_APP_ITEM_SIZE),
    rotation: 0,
    zIndex: current.nextZIndex,
    parentId: normalizeString(args.parentId) || undefined,
  }
}

// buildNativeComponentShell + escapeHtmlText now live in the single shared
// implementation (imported at the top of this module so the local
// `createNativeComponentShellItem` binding resolves) and are re-exported so
// bin/canvas-mcp-server and the typed `.ts` view resolve to one builder.
export { buildNativeComponentShell, escapeHtmlText }

export function createNativeComponentShellItem(state, args = {}) {
  const shell = buildNativeComponentShell(args)
  return createHtmlCanvasItem(state, {
    title: shell.title,
    sourceHtml: shell.sourceHtml,
    sourceMode: 'inline',
    background: normalizeString(args.background) || undefined,
    parentId: normalizeString(args.parentId || args.artboardId) || undefined,
    position: args.position,
    size: args.size || shell.size,
    sandbox: normalizeString(args.sandbox) || undefined,
  })
}

// --- U7 agent parity helpers (pure JS, no fs/node:* — client-import safe) ---

/**
 * Resolve the native shell create payload an agent must POST to
 * `/api/canvas/component/create` so that the file-backed component is byte-
 * identical to what the UI U3 path writes. The shared U1 builder is the single
 * source of truth for the markup (template incl. layout primitives + element
 * parts, optional grid/slots flow through the builder args). The endpoint's U2
 * uniquifier picks the final slug.
 */
export function buildNativeComponentShellCreateInput(args = {}) {
  const shell = buildNativeComponentShell(args)
  return {
    name: normalizeString(args.name) || shell.title,
    format: 'html',
    sourceHtml: shell.sourceHtml,
    description: normalizeString(args.description) || undefined,
    shell,
  }
}

/**
 * ALLOWLIST enforcement for the agent `sync_to_project` target. An agent runs
 * outside the browser and has no folder picker, so it can ONLY sync to a Root B
 * a user already confirmed via the UI (persisted in `project.json`
 * `meta.syncTarget`). This is intentionally distinct from the sync endpoint's
 * traversal/symlink guard: even a perfectly path-safe folder is rejected here
 * unless it is the user-confirmed one.
 *
 * - `requestedTarget` omitted/empty + a persisted mapping exists → reuse it.
 * - `requestedTarget` present and equals the persisted `rootPath` → allowed.
 * - `requestedTarget` present but ≠ the persisted `rootPath` → rejected with a
 *   distinct `not-allowlisted` reason (NOT a traversal rejection).
 * - no persisted mapping (and/or no usable target) → rejected `no-mapping`.
 *
 * `persisted` is the normalized `meta.syncTarget` (`{ rootPath,
 * resolvedRealPath, componentsDir, format, mappedAt }`) or null.
 */
export function resolveSyncToProjectTarget(requestedTarget, persisted) {
  const requested = normalizeString(requestedTarget)
  const mappedRoot =
    persisted && typeof persisted === 'object'
      ? normalizeString(persisted.rootPath)
      : ''

  if (!requested) {
    if (!mappedRoot) {
      return {
        ok: false,
        code: 'no-mapping',
        error:
          'sync_to_project needs a target. No `target` was provided and this project has no user-confirmed sync folder yet. A user must pick and confirm a folder in the canvas Sync panel first.',
      }
    }
    return {
      ok: true,
      target: mappedRoot,
      componentsDir: normalizeString(persisted.componentsDir) || undefined,
      format: persisted.format === 'html+tsx' ? 'html+tsx' : undefined,
      reusedMapping: true,
    }
  }

  if (!mappedRoot) {
    return {
      ok: false,
      code: 'no-mapping',
      error: `sync_to_project target "${requested}" is not allowed: this project has no user-confirmed sync folder. A user must pick and confirm a folder in the canvas Sync panel before an agent can sync.`,
    }
  }

  if (requested !== mappedRoot) {
    return {
      ok: false,
      code: 'not-allowlisted',
      error: `sync_to_project target "${requested}" is not in the user-confirmed allowlist. The only allowed folder for this project is "${mappedRoot}" (confirmed via the canvas Sync panel). An agent cannot nominate a new sync folder.`,
    }
  }

  return {
    ok: true,
    target: mappedRoot,
    componentsDir: normalizeString(persisted.componentsDir) || undefined,
    format: persisted.format === 'html+tsx' ? 'html+tsx' : undefined,
    reusedMapping: false,
  }
}

function deriveArtboardPageSlug(artboard) {
  const fromName = normalizeString(artboard?.name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return fromName || `artboard-${normalizeString(artboard?.id) || 'page'}`
}

function toFileBackedChild(item) {
  if (!item || typeof item !== 'object') return null
  const slug = normalizeString(item.sourceComponentSlug)
  const sourcePath =
    normalizeString(item.sourceComponentFilePath) ||
    normalizeString(item.sourceHtmlFilePath)
  if (!slug || !sourcePath) return null
  return {
    slug,
    sourcePath,
    mtimeMs:
      typeof item.sourceHtmlFileMtime === 'number'
        ? item.sourceHtmlFileMtime
        : undefined,
  }
}

/**
 * Resolve a canvas selection id (a file-backed html component item, or an
 * artboard) into the EXACT `selection` shape the UI sends to
 * `/api/canvas/project/sync` (see CanvasTab.tsx `htmlItemSyncSelection` /
 * `artboardSyncSelection`). Reusing this shape is what guarantees the agent and
 * the UI publish identical Root B trees + manifest for the same selection.
 */
export function resolveSyncSelectionFromState(state, selectionId) {
  const current = normalizeCanvasStateSnapshot(state)
  const id = normalizeString(selectionId)
  if (!id) {
    return { ok: false, code: 'bad-input', error: 'selection id is required.' }
  }
  const target = current.items.find((item) => item?.id === id)
  if (!target) {
    return { ok: false, code: 'not-found', error: `No canvas item with id "${id}".` }
  }

  if (target.type === 'artboard') {
    const children = current.items.filter(
      (item) => item?.parentId === target.id && item?.type === 'html'
    )
    const fileBackedChildren = children.map(toFileBackedChild).filter(Boolean)
    if (fileBackedChildren.length === 0) {
      return {
        ok: false,
        code: 'no-file-backed-children',
        error: `Artboard "${id}" has no file-backed html children to sync. Children must be created via create_native_component_shell (file-backed) first.`,
      }
    }
    return {
      ok: true,
      selection: {
        type: 'artboard',
        slug: deriveArtboardPageSlug(target),
        sourcePath: fileBackedChildren[0].sourcePath,
        children: fileBackedChildren,
      },
    }
  }

  if (target.type === 'html') {
    const child = toFileBackedChild(target)
    if (!child) {
      return {
        ok: false,
        code: 'not-file-backed',
        error: `Item "${id}" is not file-backed. Only file-backed components (created via create_native_component_shell) can be synced.`,
      }
    }
    return {
      ok: true,
      selection: {
        type: 'component',
        slug: child.slug,
        sourcePath: child.sourcePath,
        mtimeMs: child.mtimeMs,
      },
    }
  }

  return {
    ok: false,
    code: 'unsupported-selection',
    error: `Selection "${id}" (type "${normalizeString(target.type) || 'unknown'}") cannot be synced. Pick a file-backed component or an artboard.`,
  }
}

export function resolvePrimitiveVariantIndex(primitive, args = {}) {
  if (Number.isFinite(args.variantIndex)) {
    const variantIndex = Number(args.variantIndex)
    if (variantIndex >= 0 && variantIndex < primitive.variants.length) return variantIndex
  }
  const variantName = normalizeString(args.variantName)
  if (variantName) {
    const byName = primitive.variants.findIndex((variant) => variant.name === variantName)
    if (byName >= 0) return byName
  }
  return primitive.variants.length > 0 ? 0 : -1
}

export function createPrimitiveCanvasItem(state, primitive, args = {}) {
  const current = normalizeCanvasStateSnapshot(state)
  const variantIndex = resolvePrimitiveVariantIndex(primitive, args)
  if (variantIndex < 0) {
    throw new Error(`Primitive variant not found for ${primitive?.primitiveId || 'unknown primitive'}.`)
  }

  const variant = primitive.variants[variantIndex]
  const mergedProps =
    args.props && typeof args.props === 'object'
      ? { ...(variant.props || {}), ...args.props }
      : null

  return {
    id: createCanvasItemId(primitive.name),
    type: 'component',
    componentId: primitive.entryId,
    variantIndex,
    position: normalizePosition(args.position, DEFAULT_ARTBOARD_POSITION),
    size: normalizeSize(args.size, primitive.defaultSize || { width: 320, height: 140 }),
    rotation: 0,
    zIndex: current.nextZIndex,
    parentId: normalizeString(args.parentId) || undefined,
    customProps: mergedProps && Object.keys(mergedProps).length > 0 ? mergedProps : undefined,
  }
}

export function normalizeComponentName(value) {
  const cleaned = String(value || 'CanvasBoard').replace(/[^a-zA-Z0-9]+/g, ' ').trim()
  const parts = (cleaned || 'Canvas Board').split(/\s+/)
  return parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('') || 'CanvasBoard'
}

export function resolvePrimitiveImport(primitive) {
  const importPath = primitive.importPath
  const exportName = primitive.sourceId?.split('#')[1] || normalizeComponentName(primitive.name)
  return { importPath, exportName }
}

function formatStyleObject(styleObject) {
  const entries = Object.entries(styleObject).filter(([, value]) => value != null)
  if (entries.length === 0) return '{{}}'
  return `{{ ${entries
    .map(([key, value]) => `${key}: ${typeof value === 'string' ? JSON.stringify(value) : value}`)
    .join(', ')} }}`
}

function escapeJsxText(value) {
  return String(value).replace(/[{}]/g, (match) => (match === '{' ? '&#123;' : '&#125;'))
}

function serializePrimitiveComponent(componentName, props) {
  const safeProps = props && typeof props === 'object' ? props : {}
  const attributes = []
  let children = null

  Object.entries(safeProps).forEach(([key, value]) => {
    if (value == null) return
    if (key === 'children' && (typeof value === 'string' || typeof value === 'number')) {
      children = String(value)
      return
    }
    if (typeof value === 'string') {
      attributes.push(`${key}=${JSON.stringify(value)}`)
      return
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      attributes.push(`${key}={${JSON.stringify(value)}}`)
      return
    }
    attributes.push(`${key}={${JSON.stringify(value)}}`)
  })

  const openTag = `<${componentName}${attributes.length > 0 ? ` ${attributes.join(' ')}` : ''}>`
  if (children != null) {
    return `${openTag}${escapeJsxText(children)}</${componentName}>`
  }
  return `${openTag}</${componentName}>`
}

function formatPrimitiveNodeLines(item, primitive, format) {
  const { exportName } = resolvePrimitiveImport(primitive)
  const props = item.customProps && typeof item.customProps === 'object'
    ? item.customProps
    : primitive.variants[item.variantIndex]?.props || {}
  const styleValue = formatStyleObject({
    position: 'absolute',
    left: Number(item.position?.x || 0),
    top: Number(item.position?.y || 0),
    width: Number(item.size?.width || primitive.defaultSize?.width || 320),
    height: Number(item.size?.height || primitive.defaultSize?.height || 120),
    transform: Number(item.rotation || 0) ? `rotate(${Number(item.rotation)}deg)` : undefined,
  })

  return [
    `      <div${format === 'tailwind' ? ' className="absolute"' : ''} style=${styleValue}>`,
    `        ${serializePrimitiveComponent(exportName, props)}`,
    '      </div>',
  ]
}

function buildTailwindBoardCode(componentName, artboard, primitiveChildren, importLines, warnings) {
  return [
    ...importLines,
    '',
    `export function ${componentName}() {`,
    '  return (',
    `    <div`,
    `      className="relative overflow-hidden rounded-[24px] border border-[var(--color-border-default)] bg-[var(--color-surface-canvas,var(--color-surface-50,#ffffff))]"`,
    `      style={{ width: ${Number(artboard.size?.width || DEFAULT_ARTBOARD_SIZE.width)}, height: ${Number(artboard.size?.height || DEFAULT_ARTBOARD_SIZE.height)}${artboard.background ? `, background: ${JSON.stringify(artboard.background)}` : ''} }}`,
    '    >',
    ...primitiveChildren.flatMap(({ item, primitive }) => formatPrimitiveNodeLines(item, primitive, 'tailwind')),
    '    </div>',
    '  )',
    '}',
    warnings.length > 0 ? '' : '',
    ...warnings.map((warning) => `// Warning: ${warning}`),
    '',
  ].join('\n')
}

function buildCssVarsBoardCode(componentName, artboard, primitiveChildren, importLines, warnings) {
  return [
    ...importLines,
    '',
    `export function ${componentName}() {`,
    '  return (',
    `    <div`,
    `      style={{ position: 'relative', overflow: 'hidden', width: ${Number(artboard.size?.width || DEFAULT_ARTBOARD_SIZE.width)}, height: ${Number(artboard.size?.height || DEFAULT_ARTBOARD_SIZE.height)}, borderRadius: 24, border: '1px solid var(--color-border-default)', background: ${artboard.background ? JSON.stringify(artboard.background) : `'var(--color-surface-canvas, var(--color-surface-50, #ffffff))'`} }}`,
    '    >',
    ...primitiveChildren.flatMap(({ item, primitive }) => formatPrimitiveNodeLines(item, primitive, 'css-vars')),
    '    </div>',
    '  )',
    '}',
    warnings.length > 0 ? '' : '',
    ...warnings.map((warning) => `// Warning: ${warning}`),
    '',
  ].join('\n')
}

export function exportCanvasBoard({ artboardId, format = DEFAULT_EXPORT_FORMAT, componentName, state, primitives }) {
  if (!artboardId) {
    throw new Error('artboardId is required.')
  }
  if (!EXPORT_FORMATS.has(format)) {
    throw new Error(`Unsupported export format: ${format}`)
  }

  const current = normalizeCanvasStateSnapshot(state)
  const items = Array.isArray(current.items) ? current.items : []
  const artboard = items.find((item) => item?.type === 'artboard' && item.id === artboardId)
  if (!artboard) {
    throw new Error(`Artboard not found: ${artboardId}`)
  }

  const children = items
    .filter((item) => item?.parentId === artboardId)
    .sort((left, right) => Number(left?.zIndex || 0) - Number(right?.zIndex || 0))

  const primitiveMap = new Map((Array.isArray(primitives) ? primitives : []).map((primitive) => [primitive.entryId, primitive]))
  const unsupported = []
  const primitiveChildren = []

  children.forEach((child) => {
    if (child?.type !== 'component') {
      unsupported.push({ id: child?.id || 'unknown', reason: `Unsupported item type: ${child?.type || 'unknown'}` })
      return
    }
    const primitive = primitiveMap.get(child.componentId)
    if (!primitive) {
      unsupported.push({ id: child.id, reason: `Component ${child.componentId} is not a registered primitive.` })
      return
    }
    if (primitive.exportable === false) {
      unsupported.push({ id: child.id, reason: `Primitive ${primitive.primitiveId} is not exportable.` })
      return
    }
    primitiveChildren.push({ item: child, primitive })
  })

  if (unsupported.length > 0) {
    throw new Error(
      `Artboard ${artboardId} is not exportable. Unsupported items: ${unsupported.map((entry) => `${entry.id} (${entry.reason})`).join('; ')}`
    )
  }

  const normalizedComponentName = normalizeComponentName(componentName || artboard.name || 'CanvasBoard')
  const imports = new Map()
  primitiveChildren.forEach(({ primitive }) => {
    const { importPath, exportName } = resolvePrimitiveImport(primitive)
    if (!imports.has(importPath)) {
      imports.set(importPath, new Set())
    }
    imports.get(importPath).add(exportName)
  })

  const importLines = Array.from(imports.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([importPath, exportNames]) => {
      const names = Array.from(exportNames).sort().join(', ')
      return `import { ${names} } from ${JSON.stringify(importPath)}`
    })

  const warnings = []
  if (children.length === 0) {
    warnings.push('Artboard has no child items.')
  }
  warnings.push('Export preserves canvas positioning. It does not infer semantic layout from spatial arrangement.')

  return {
    artboardId,
    componentName: normalizedComponentName,
    format,
    warnings,
    code:
      format === 'react-tailwind'
        ? buildTailwindBoardCode(normalizedComponentName, artboard, primitiveChildren, importLines, warnings)
        : buildCssVarsBoardCode(normalizedComponentName, artboard, primitiveChildren, importLines, warnings),
  }
}
