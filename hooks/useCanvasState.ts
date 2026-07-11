import { useCallback, useRef } from "react"

import { useLocalStorage } from "./useLocalStorage"

import type {
  CanvasItem,
  CanvasItemInput,
  CanvasItemUpdate,
  CanvasState,
  CanvasGroup,
  CanvasRemoteOperation,
  CanvasStateSnapshot,
} from "../types/canvas"
import { GROUP_COLORS } from "../types/canvas"
import {
  isRenderableCanvasItem,
  validateCanvasAgentOperation,
} from "../utils/canvasOperationSchema.mjs"

// ─────────────────────────────────────────────────────────────────────────────
// CanvasDocumentStore seam (FOX2-66)
//
// Every document mutation funnels through a single internal `applyChange`
// (the only `setRawState` write in this file — enforced by
// tests/canvasDocumentStoreInvariant.test.ts). Each change carries meta
// describing who made it and why, and a ref-based change stream lets the
// undo layer (FOX2-67) and gesture events (FOX2-60) observe prev/next
// snapshots without adding re-renders.
// ─────────────────────────────────────────────────────────────────────────────

export type CanvasChangeActor = "user" | "agent" | "history"

export interface CanvasChangeMeta {
  actor: CanvasChangeActor
  source: string
  /** Present (true) on changes applied between beginGesture/endGesture. */
  gesture?: boolean
}

/** The document portion of canvas state — what history snapshots care about. */
export interface CanvasDocumentSnapshot {
  items: CanvasItem[]
  groups: CanvasGroup[]
}

export interface CanvasDocumentChangeEvent {
  meta: CanvasChangeMeta
  prevSnapshot: CanvasDocumentSnapshot
  nextSnapshot: CanvasDocumentSnapshot
}

export type CanvasDocumentChangeListener = (event: CanvasDocumentChangeEvent) => void

interface ActiveGesture {
  prevSnapshot: CanvasDocumentSnapshot
  lastMeta: CanvasChangeMeta | null
}

const DEFAULT_STATE: CanvasState = {
  items: [],
  groups: [],
  nextZIndex: 1,
  selectedIds: [],
}

function resetMcpAppConnectionState(item: CanvasItem): CanvasItem {
  if (item.type !== "mcp-app") return item
  return {
    ...item,
    status: "disconnected",
    lastError: undefined,
    toolsCache: undefined,
    resourcesCache: undefined,
    promptsCache: undefined,
    recentCalls: undefined,
  }
}

function normalizeItem(item: CanvasItem | any): CanvasItem {
  if (item?.type === "embed") {
    return { ...item, type: "embed" }
  }
  if (item?.type === "html") {
    return { ...item, type: "html" }
  }
  if (item?.type === "media") {
    return { ...item, type: "media" }
  }
  if (item?.type === "mermaid") {
    return { ...item, type: "mermaid" }
  }
  if (item?.type === "excalidraw") {
    return { ...item, type: "excalidraw" }
  }
  if (item?.type === "markdown") {
    return { ...item, type: "markdown" }
  }
  if (item?.type === "mcp-app") {
    return {
      ...item,
      type: "mcp-app",
      status:
        item?.status === "connecting" ||
        item?.status === "connected" ||
        item?.status === "error"
          ? item.status
          : "disconnected",
    }
  }
  if (item?.type === "artboard") {
    return { ...item, type: "artboard" }
  }
  if (item?.type === "section") {
    return { ...item, type: "section" }
  }
  return { ...item, type: "component" }
}

// Normalize state to handle stale localStorage data missing properties.
// Items that can never render safely (no id / no numeric position — e.g. a
// board poisoned by a pre-FOX2-74 malformed agent op) are quarantined here
// instead of crashing the whole canvas on load.
function normalizeState(state: Partial<CanvasState> | null | undefined): CanvasState {
  return {
    items: (state?.items ?? [])
      .filter((item) => isRenderableCanvasItem(item))
      .map((item) => normalizeItem(item)),
    groups: state?.groups ?? [],
    nextZIndex: state?.nextZIndex ?? 1,
    selectedIds: state?.selectedIds ?? [],
  }
}

function deriveNextZIndex(items: CanvasItem[]) {
  return items.reduce((max, item) => Math.max(max, (item.zIndex ?? 0) + 1), 1)
}

function collectCascadeDeleteIds(prev: CanvasState, ids: string[]) {
  const idsToRemove = new Set(ids)
  let changed = true
  while (changed) {
    changed = false
    prev.items.forEach((item) => {
      if (item.parentId && idsToRemove.has(item.parentId) && !idsToRemove.has(item.id)) {
        idsToRemove.add(item.id)
        changed = true
      }
    })
  }
  return idsToRemove
}

export function useCanvasState(storageKey = "gallery-canvas-state") {
  const [rawState, setRawState] = useLocalStorage<CanvasState>(storageKey, DEFAULT_STATE)

  // Normalize state to ensure all properties exist
  const state = normalizeState(rawState)

  // Latest normalized state, kept fresh both per render and eagerly inside
  // applyChange so batched same-tick mutations compose on each other's output.
  const stateRef = useRef(state)
  stateRef.current = state

  const listenersRef = useRef(new Set<CanvasDocumentChangeListener>())
  const gestureRef = useRef<ActiveGesture | null>(null)

  const emitDocumentChange = useCallback((event: CanvasDocumentChangeEvent) => {
    listenersRef.current.forEach((listener) => listener(event))
  }, [])

  // The single write path: computes next state exactly once (mutators mint ids
  // inside their transitions), commits it, and fires the change stream
  // synchronously with prev/next document snapshots.
  const applyChange = useCallback(
    (change: (prev: CanvasState) => CanvasState, meta: CanvasChangeMeta) => {
      const prev = stateRef.current
      const next = change(prev)
      stateRef.current = next
      setRawState(() => next)

      const gesture = gestureRef.current
      const taggedMeta = gesture ? { ...meta, gesture: true } : meta
      if (gesture) {
        gesture.lastMeta = taggedMeta
      }
      if (listenersRef.current.size > 0) {
        emitDocumentChange({
          meta: taggedMeta,
          prevSnapshot: { items: prev.items, groups: prev.groups },
          nextSnapshot: { items: next.items, groups: next.groups },
        })
      }
    },
    [emitDocumentChange, setRawState]
  )

  // ─────────────────────────────────────────────────────────────────────────────
  // Change Stream + Gesture Boundaries (FOX2-66)
  // ─────────────────────────────────────────────────────────────────────────────

  const subscribeToDocumentChanges = useCallback((listener: CanvasDocumentChangeListener) => {
    listenersRef.current.add(listener)
    return () => {
      listenersRef.current.delete(listener)
    }
  }, [])

  // High-frequency streams (drag/resize per mousemove) bracket their changes so
  // consumers can coalesce. Nested begins are ignored — the first begin wins.
  const beginGesture = useCallback(() => {
    if (gestureRef.current) return
    const current = stateRef.current
    gestureRef.current = {
      prevSnapshot: { items: current.items, groups: current.groups },
      lastMeta: null,
    }
  }, [])

  const endGesture = useCallback(
    (summary?: string) => {
      const gesture = gestureRef.current
      gestureRef.current = null
      if (!gesture?.lastMeta) return

      const current = stateRef.current
      if (
        current.items === gesture.prevSnapshot.items &&
        current.groups === gesture.prevSnapshot.groups
      ) {
        return
      }
      emitDocumentChange({
        meta: {
          ...gesture.lastMeta,
          source: summary ? `gesture:${summary}` : "gesture",
        },
        prevSnapshot: gesture.prevSnapshot,
        nextSnapshot: { items: current.items, groups: current.groups },
      })
    },
    [emitDocumentChange]
  )

  // ─────────────────────────────────────────────────────────────────────────────
  // Item Operations
  // ─────────────────────────────────────────────────────────────────────────────

  const addItem = useCallback(
    (item: CanvasItemInput, options?: { id?: string }) => {
      const newId =
        options?.id?.trim() ||
        `canvas-item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      applyChange(
        (prev) => ({
          ...prev,
          items: [
            ...prev.items,
            {
              ...item,
              id: newId,
              zIndex: prev.nextZIndex,
            } as CanvasItem,
          ],
          nextZIndex: prev.nextZIndex + 1,
          selectedIds: [newId], // Auto-select the new item
        }),
        { actor: "user", source: "add-item" }
      )
      return newId
    },
    [applyChange]
  )

  const updateItem = useCallback(
    (id: string, updates: CanvasItemUpdate) => {
      applyChange(
        (prev) => ({
          ...prev,
          items: prev.items.map((item) =>
            item.id === id ? ({ ...item, ...updates } as CanvasItem) : item
          ),
        }),
        { actor: "user", source: "update-item" }
      )
    },
    [applyChange]
  )

  const removeItem = useCallback(
    (id: string) => {
      applyChange(
        (prev) => {
          const idsToRemove = collectCascadeDeleteIds(prev, [id])

          return {
            ...prev,
            items: prev.items.filter((item) => !idsToRemove.has(item.id)),
            selectedIds: prev.selectedIds.filter((selectedId) => !idsToRemove.has(selectedId)),
          }
        },
        { actor: "user", source: "remove-item" }
      )
    },
    [applyChange]
  )

  const bringToFront = useCallback(
    (id: string) => {
      applyChange(
        (prev) => ({
          ...prev,
          items: prev.items.map((item) =>
            item.id === id ? { ...item, zIndex: prev.nextZIndex } : item
          ),
          nextZIndex: prev.nextZIndex + 1,
        }),
        { actor: "user", source: "bring-to-front" }
      )
    },
    [applyChange]
  )

  // ─────────────────────────────────────────────────────────────────────────────
  // Selection Operations (Multi-select support)
  // ─────────────────────────────────────────────────────────────────────────────

  const selectItem = useCallback(
    (id: string, addToSelection = false) => {
      applyChange(
        (prev) => {
          if (addToSelection) {
            // Toggle selection
            if (prev.selectedIds.includes(id)) {
              return { ...prev, selectedIds: prev.selectedIds.filter((i) => i !== id) }
            }
            return { ...prev, selectedIds: [...prev.selectedIds, id] }
          }
          // Replace selection
          return { ...prev, selectedIds: [id] }
        },
        { actor: "user", source: "select-item" }
      )
    },
    [applyChange]
  )

  const selectItems = useCallback(
    (ids: string[]) => {
      applyChange((prev) => ({ ...prev, selectedIds: ids }), {
        actor: "user",
        source: "select-items",
      })
    },
    [applyChange]
  )

  const selectAll = useCallback(() => {
    applyChange((prev) => ({ ...prev, selectedIds: prev.items.map((item) => item.id) }), {
      actor: "user",
      source: "select-all",
    })
  }, [applyChange])

  const clearSelection = useCallback(() => {
    applyChange((prev) => ({ ...prev, selectedIds: [] }), {
      actor: "user",
      source: "clear-selection",
    })
  }, [applyChange])

  // ─────────────────────────────────────────────────────────────────────────────
  // Group Operations
  // ─────────────────────────────────────────────────────────────────────────────

  const createGroup = useCallback(
    (itemIds: string[], name?: string) => {
      if (itemIds.length < 2) return null

      const groupId = `group-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const colorIndex = state.groups.length % GROUP_COLORS.length
      const groupName = name || `Group ${state.groups.length + 1}`

      // Calculate group position (top-left of bounding box)
      const groupItems = state.items.filter((item) => itemIds.includes(item.id))
      const minX = Math.min(...groupItems.map((item) => item.position.x))
      const minY = Math.min(...groupItems.map((item) => item.position.y))

      applyChange(
        (prev) => ({
          ...prev,
          items: prev.items.map((item) =>
            itemIds.includes(item.id) ? { ...item, groupId } : item
          ),
          groups: [
            ...prev.groups,
            {
              id: groupId,
              name: groupName,
              position: { x: minX, y: minY },
              isLocked: false,
              color: GROUP_COLORS[colorIndex],
            },
          ],
          selectedIds: [], // Clear selection after grouping
        }),
        { actor: "user", source: "create-group" }
      )

      return groupId
    },
    [state.groups, state.items, applyChange]
  )

  const ungroup = useCallback(
    (groupId: string) => {
      applyChange(
        (prev) => ({
          ...prev,
          items: prev.items.map((item) =>
            item.groupId === groupId ? { ...item, groupId: undefined } : item
          ),
          groups: prev.groups.filter((group) => group.id !== groupId),
        }),
        { actor: "user", source: "ungroup" }
      )
    },
    [applyChange]
  )

  const updateGroup = useCallback(
    (groupId: string, updates: Partial<Omit<CanvasGroup, "id">>) => {
      applyChange(
        (prev) => ({
          ...prev,
          groups: prev.groups.map((group) =>
            group.id === groupId ? { ...group, ...updates } : group
          ),
        }),
        { actor: "user", source: "update-group" }
      )
    },
    [applyChange]
  )

  const toggleGroupLock = useCallback(
    (groupId: string) => {
      applyChange(
        (prev) => ({
          ...prev,
          groups: prev.groups.map((group) =>
            group.id === groupId ? { ...group, isLocked: !group.isLocked } : group
          ),
        }),
        { actor: "user", source: "toggle-group-lock" }
      )
    },
    [applyChange]
  )

  const selectGroup = useCallback(
    (groupId: string) => {
      const groupItemIds = state.items
        .filter((item) => item.groupId === groupId)
        .map((item) => item.id)
      applyChange((prev) => ({ ...prev, selectedIds: groupItemIds }), {
        actor: "user",
        source: "select-group",
      })
    },
    [state.items, applyChange]
  )

  const moveGroup = useCallback(
    (groupId: string, deltaX: number, deltaY: number) => {
      applyChange(
        (prev) => {
          // Move all items in the group
          const updatedItems = prev.items.map((item) =>
            item.groupId === groupId
              ? {
                  ...item,
                  position: {
                    x: item.position.x + deltaX,
                    y: item.position.y + deltaY,
                  },
                }
              : item
          )

          // Update group position
          const updatedGroups = prev.groups.map((group) =>
            group.id === groupId
              ? {
                  ...group,
                  position: {
                    x: group.position.x + deltaX,
                    y: group.position.y + deltaY,
                  },
                }
              : group
          )

          return { ...prev, items: updatedItems, groups: updatedGroups }
        },
        { actor: "user", source: "move-group" }
      )
    },
    [applyChange]
  )

  // ─────────────────────────────────────────────────────────────────────────────
  // Bulk Operations
  // ─────────────────────────────────────────────────────────────────────────────

  const removeSelected = useCallback(() => {
    applyChange(
      (prev) => {
        const idsToRemove = collectCascadeDeleteIds(prev, prev.selectedIds)

        return {
          ...prev,
          items: prev.items.filter((item) => !idsToRemove.has(item.id)),
          selectedIds: [],
        }
      },
      { actor: "user", source: "remove-selected" }
    )
  }, [applyChange])

  const moveSelected = useCallback(
    (deltaX: number, deltaY: number) => {
      applyChange(
        (prev) => ({
          ...prev,
          items: prev.items.map((item) =>
            prev.selectedIds.includes(item.id)
              ? {
                  ...item,
                  position: {
                    x: item.position.x + deltaX,
                    y: item.position.y + deltaY,
                  },
                }
              : item
          ),
        }),
        { actor: "user", source: "move-selected" }
      )
    },
    [applyChange]
  )

  // Clone semantics: a layout child (has parentId) duplicates *in place* —
  // same artboard, ordered right after the original, position reset — instead
  // of the +20px open-canvas offset a freeform item gets (FOX2-59).
  const buildDuplicate = (
    prev: CanvasState,
    item: CanvasItem,
    index: number,
    orderBump: number
  ): CanvasItem => {
    const base = {
      ...resetMcpAppConnectionState(item),
      id: `canvas-item-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 9)}`,
      zIndex: prev.nextZIndex + index,
      groupId: undefined,
    }
    if (item.parentId) {
      return {
        ...base,
        order: (item.order ?? 0) + orderBump,
        position: { x: 0, y: 0 },
      } as CanvasItem
    }
    return {
      ...base,
      position: { x: item.position.x + 20, y: item.position.y + 20 },
    } as CanvasItem
  }

  const duplicateSelected = useCallback(() => {
    applyChange(
      (prev) => {
        const selectedItems = prev.items.filter((item) =>
          prev.selectedIds.includes(item.id)
        )
        const newItems = selectedItems.map((item, index) =>
          buildDuplicate(prev, item, index, index + 1)
        )

        return {
          ...prev,
          items: [...prev.items, ...newItems],
          nextZIndex: prev.nextZIndex + newItems.length,
          selectedIds: newItems.map((item) => item.id),
        }
      },
      { actor: "user", source: "duplicate-selected" }
    )
  }, [applyChange])

  const duplicateItem = useCallback(
    (id: string) => {
      applyChange(
        (prev) => {
          const item = prev.items.find((i) => i.id === id)
          if (!item) return prev
          const newItem = buildDuplicate(prev, item, 0, 1)

          return {
            ...prev,
            items: [...prev.items, newItem],
            nextZIndex: prev.nextZIndex + 1,
            selectedIds: [newItem.id],
          }
        },
        { actor: "user", source: "duplicate-item" }
      )
    },
    [applyChange]
  )

  // Paste clipboard items as fresh nodes (FOX2-59). Into an artboard when
  // `parentId` is given (ordered at the end of its flow, position reset),
  // else freeform at a +20px cascade so a paste is visibly distinct from the
  // source.
  const pasteItems = useCallback(
    (clipboardItems: CanvasItem[], target?: { parentId?: string; order?: number }) => {
      if (clipboardItems.length === 0) return
      applyChange(
        (prev) => {
          const parentId = target?.parentId
          const baseOrder = target?.order ?? 0
          const pasted = clipboardItems.map((item, index) => {
            const base = {
              ...resetMcpAppConnectionState(normalizeItem(item)),
              id: `canvas-item-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 9)}`,
              zIndex: prev.nextZIndex + index,
              groupId: undefined,
            }
            if (parentId) {
              return {
                ...base,
                parentId,
                order: baseOrder + index,
                position: { x: 0, y: 0 },
              } as CanvasItem
            }
            return {
              ...base,
              parentId: undefined,
              order: undefined,
              position: { x: item.position.x + 20, y: item.position.y + 20 },
            } as CanvasItem
          })
          return {
            ...prev,
            items: [...prev.items, ...pasted],
            nextZIndex: prev.nextZIndex + pasted.length,
            selectedIds: pasted.map((item) => item.id),
          }
        },
        { actor: "user", source: "paste-items" }
      )
    },
    [applyChange]
  )

  // ─────────────────────────────────────────────────────────────────────────────
  // Canvas Operations
  // ─────────────────────────────────────────────────────────────────────────────

  const clearCanvas = useCallback(() => {
    applyChange(() => DEFAULT_STATE, { actor: "user", source: "clear-canvas" })
  }, [applyChange])

  // Callers may tag the restore: the mutation-history hook passes
  // `{ actor: "history" }`, file persistence `{ source: "file-load" }`.
  const replaceState = useCallback(
    (nextState: CanvasStateSnapshot, meta?: Partial<CanvasChangeMeta>) => {
      const normalized = normalizeState(nextState)
      applyChange(
        () => ({
          ...normalized,
          nextZIndex: Math.max(normalized.nextZIndex, deriveNextZIndex(normalized.items)),
        }),
        { actor: "user", source: "replace-state", ...meta }
      )
    },
    [applyChange]
  )

  const applyRemoteOperation = useCallback(
    (rawOperation: CanvasRemoteOperation) => {
      // FOX2-74 backstop: the server validates at ingest, but operations can
      // also reach here from in-browser dispatchers (copilot actions, tests)
      // — a malformed one is skipped loudly instead of corrupting state.
      const validation = validateCanvasAgentOperation(rawOperation)
      if (!validation.ok) {
        console.warn("[Canvas] Skipped invalid remote operation:", validation.error, rawOperation)
        return
      }
      const operation = validation.operation as CanvasRemoteOperation
      applyChange((prev) => {
        switch (operation.type) {
          case "create_item": {
            const nextItem = normalizeItem(operation.item)
            const existingIndex = prev.items.findIndex((item) => item.id === nextItem.id)
            const nextItems =
              existingIndex >= 0
                ? prev.items.map((item, index) => (index === existingIndex ? nextItem : item))
                : [...prev.items, nextItem]

            return {
              ...prev,
              items: nextItems,
              nextZIndex: Math.max(prev.nextZIndex, deriveNextZIndex(nextItems)),
              selectedIds: operation.select ? [nextItem.id] : prev.selectedIds,
            }
          }
          case "create_items": {
            const nextBatch = Array.isArray(operation.items)
              ? operation.items
                  .filter((item) => item && typeof item === "object" && item.id)
                  .map((item) => normalizeItem(item))
              : []
            if (nextBatch.length === 0) return prev

            const incomingIds = new Set(nextBatch.map((item) => item.id))
            const preserved = prev.items.filter((item) => !incomingIds.has(item.id))
            const nextItems = [...preserved, ...nextBatch]

            return {
              ...prev,
              items: nextItems,
              nextZIndex: Math.max(prev.nextZIndex, deriveNextZIndex(nextItems)),
              selectedIds: operation.select ? nextBatch.map((item) => item.id) : prev.selectedIds,
            }
          }
          case "update_item":
            return {
              ...prev,
              items: prev.items.map((item) =>
                item.id === operation.id
                  ? ({ ...item, ...operation.updates } as CanvasItem)
                  : item
              ),
            }
          case "update_items": {
            const entries = Array.isArray(operation.updates)
              ? operation.updates.filter(
                  (entry) => entry && typeof entry === "object" && entry.id
                )
              : []
            if (entries.length === 0) return prev
            const updatesById = new Map(entries.map((entry) => [entry.id, entry.updates]))
            return {
              ...prev,
              items: prev.items.map((item) => {
                const updates = updatesById.get(item.id)
                return updates ? ({ ...item, ...updates } as CanvasItem) : item
              }),
              selectedIds: operation.select
                ? entries.map((entry) => entry.id)
                : prev.selectedIds,
            }
          }
          case "delete_items": {
            const idsToRemove = collectCascadeDeleteIds(prev, operation.ids)
            return {
              ...prev,
              items: prev.items.filter((item) => !idsToRemove.has(item.id)),
              selectedIds: prev.selectedIds.filter((selectedId) => !idsToRemove.has(selectedId)),
            }
          }
          case "select_items":
            return { ...prev, selectedIds: [...operation.ids] }
          case "clear_canvas":
            return DEFAULT_STATE
          case "create_group": {
            const nextGroup = operation.group
            if (!nextGroup || typeof nextGroup !== "object" || !nextGroup.id) return prev
            const itemIds = Array.isArray(operation.itemIds) ? operation.itemIds : []
            const existingIndex = prev.groups.findIndex((group) => group.id === nextGroup.id)
            const nextGroups =
              existingIndex >= 0
                ? prev.groups.map((group, index) => (index === existingIndex ? nextGroup : group))
                : [...prev.groups, nextGroup]
            return {
              ...prev,
              items: prev.items.map((item) =>
                itemIds.includes(item.id) ? { ...item, groupId: nextGroup.id } : item
              ),
              groups: nextGroups,
              selectedIds: operation.select ? [...itemIds] : prev.selectedIds,
            }
          }
          case "update_group":
            return {
              ...prev,
              groups: prev.groups.map((group) =>
                group.id === operation.id ? { ...group, ...operation.updates } : group
              ),
            }
          case "delete_group":
            return {
              ...prev,
              items: prev.items.map((item) =>
                item.groupId === operation.id ? { ...item, groupId: undefined } : item
              ),
              groups: prev.groups.filter((group) => group.id !== operation.id),
            }
          case "set_viewport":
          case "focus_items":
          case "set_active_theme":
          case "undo_source_mutation":
          case "redo_source_mutation":
          case "undo_canvas_change":
          case "redo_canvas_change":
            return prev
          default:
            return prev
        }
      }, { actor: "agent", source: operation.type })
    },
    [applyChange]
  )

  // Get group for an item
  const getItemGroup = useCallback(
    (itemId: string) => {
      const item = state.items.find((i) => i.id === itemId)
      if (!item?.groupId) return null
      return state.groups.find((g) => g.id === item.groupId) || null
    },
    [state.items, state.groups]
  )

  // Get all items in a group
  const getGroupItems = useCallback(
    (groupId: string) => {
      return state.items.filter((item) => item.groupId === groupId)
    },
    [state.items]
  )

  // Calculate group bounding box
  const getGroupBounds = useCallback(
    (groupId: string) => {
      const items = state.items.filter((item) => item.groupId === groupId)
      if (items.length === 0) return null

      const minX = Math.min(...items.map((item) => item.position.x))
      const minY = Math.min(...items.map((item) => item.position.y))
      const maxX = Math.max(...items.map((item) => item.position.x + item.size.width))
      const maxY = Math.max(...items.map((item) => item.position.y + item.size.height))

      return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      }
    },
    [state.items]
  )

  // Ensure state has all required properties (handles stale localStorage)
  const items = state?.items ?? []
  const groups = state?.groups ?? []
  const selectedIds = state?.selectedIds ?? []
  const nextZIndex = state?.nextZIndex ?? DEFAULT_STATE.nextZIndex

  return {
    // State
    items,
    groups,
    selectedIds,
    nextZIndex,

    // Item operations
    addItem,
    updateItem,
    removeItem,
    bringToFront,

    // Selection operations
    selectItem,
    selectItems,
    selectAll,
    clearSelection,

    // Group operations
    createGroup,
    ungroup,
    updateGroup,
    toggleGroupLock,
    selectGroup,
    moveGroup,
    getItemGroup,
    getGroupItems,
    getGroupBounds,

    // Bulk operations
    removeSelected,
    moveSelected,
    duplicateSelected,
    duplicateItem,
    pasteItems,

    // Canvas operations
    clearCanvas,
    replaceState,
    applyRemoteOperation,

    // Change stream + gesture boundaries (FOX2-66)
    subscribeToDocumentChanges,
    beginGesture,
    endGesture,
  }
}
