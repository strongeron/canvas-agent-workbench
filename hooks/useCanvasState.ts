import { useCallback } from "react"

import { useLocalStorage } from "./useLocalStorage"

import type { CanvasItem, CanvasItemInput, CanvasItemUpdate, CanvasState, CanvasGroup } from "../types/canvas"
import { GROUP_COLORS } from "../types/canvas"

const DEFAULT_STATE: CanvasState = {
  items: [],
  groups: [],
  nextZIndex: 1,
  selectedIds: [],
}

function normalizeItem(item: CanvasItem | any): CanvasItem {
  if (item?.type === "embed") {
    return { ...item, type: "embed" }
  }
  if (item?.type === "media") {
    return { ...item, type: "media" }
  }
  if (item?.type === "artboard") {
    return { ...item, type: "artboard" }
  }
  return { ...item, type: "component" }
}

// Normalize state to handle stale localStorage data missing properties
function normalizeState(state: Partial<CanvasState> | null | undefined): CanvasState {
  return {
    items: (state?.items ?? []).map((item) => normalizeItem(item)),
    groups: state?.groups ?? [],
    nextZIndex: state?.nextZIndex ?? 1,
    selectedIds: state?.selectedIds ?? [],
  }
}

export function useCanvasState(storageKey = "gallery-canvas-state") {
  const [rawState, setRawState] = useLocalStorage<CanvasState>(storageKey, DEFAULT_STATE)

  // Normalize state to ensure all properties exist
  const state = normalizeState(rawState)

  // Wrapper to normalize prev state in callbacks (memoized to avoid dependency warnings)
  const setState = useCallback(
    (updater: (prev: CanvasState) => CanvasState) => {
      setRawState((prev) => updater(normalizeState(prev)))
    },
    [setRawState]
  )

  // ─────────────────────────────────────────────────────────────────────────────
  // Item Operations
  // ─────────────────────────────────────────────────────────────────────────────

  const addItem = useCallback(
    (item: CanvasItemInput) => {
      const newId = `canvas-item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      setState((prev) => ({
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
      }))
      return newId
    },
    [setState]
  )

  const updateItem = useCallback(
    (id: string, updates: CanvasItemUpdate) => {
      setState((prev) => ({
        ...prev,
        items: prev.items.map((item) =>
          item.id === id ? ({ ...item, ...updates } as CanvasItem) : item
        ),
      }))
    },
    [setState]
  )

  const removeItem = useCallback(
    (id: string) => {
      setState((prev) => {
        const target = prev.items.find((item) => item.id === id)
        const idsToRemove = new Set([id])

        if (target?.type === "artboard") {
          prev.items.forEach((item) => {
            if (item.parentId === id) {
              idsToRemove.add(item.id)
            }
          })
        }

        return {
          ...prev,
          items: prev.items.filter((item) => !idsToRemove.has(item.id)),
          selectedIds: prev.selectedIds.filter((selectedId) => !idsToRemove.has(selectedId)),
        }
      })
    },
    [setState]
  )

  const bringToFront = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        items: prev.items.map((item) =>
          item.id === id ? { ...item, zIndex: prev.nextZIndex } : item
        ),
        nextZIndex: prev.nextZIndex + 1,
      }))
    },
    [setState]
  )

  // ─────────────────────────────────────────────────────────────────────────────
  // Selection Operations (Multi-select support)
  // ─────────────────────────────────────────────────────────────────────────────

  const selectItem = useCallback(
    (id: string, addToSelection = false) => {
      setState((prev) => {
        if (addToSelection) {
          // Toggle selection
          if (prev.selectedIds.includes(id)) {
            return { ...prev, selectedIds: prev.selectedIds.filter((i) => i !== id) }
          }
          return { ...prev, selectedIds: [...prev.selectedIds, id] }
        }
        // Replace selection
        return { ...prev, selectedIds: [id] }
      })
    },
    [setState]
  )

  const selectItems = useCallback(
    (ids: string[]) => {
      setState((prev) => ({ ...prev, selectedIds: ids }))
    },
    [setState]
  )

  const selectAll = useCallback(() => {
    setState((prev) => ({ ...prev, selectedIds: prev.items.map((item) => item.id) }))
  }, [setState])

  const clearSelection = useCallback(() => {
    setState((prev) => ({ ...prev, selectedIds: [] }))
  }, [setState])

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

      setState((prev) => ({
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
      }))

      return groupId
    },
    [state.groups, state.items, setState]
  )

  const ungroup = useCallback(
    (groupId: string) => {
      setState((prev) => ({
        ...prev,
        items: prev.items.map((item) =>
          item.groupId === groupId ? { ...item, groupId: undefined } : item
        ),
        groups: prev.groups.filter((group) => group.id !== groupId),
      }))
    },
    [setState]
  )

  const updateGroup = useCallback(
    (groupId: string, updates: Partial<Omit<CanvasGroup, "id">>) => {
      setState((prev) => ({
        ...prev,
        groups: prev.groups.map((group) =>
          group.id === groupId ? { ...group, ...updates } : group
        ),
      }))
    },
    [setState]
  )

  const toggleGroupLock = useCallback(
    (groupId: string) => {
      setState((prev) => ({
        ...prev,
        groups: prev.groups.map((group) =>
          group.id === groupId ? { ...group, isLocked: !group.isLocked } : group
        ),
      }))
    },
    [setState]
  )

  const selectGroup = useCallback(
    (groupId: string) => {
      const groupItemIds = state.items
        .filter((item) => item.groupId === groupId)
        .map((item) => item.id)
      setState((prev) => ({ ...prev, selectedIds: groupItemIds }))
    },
    [state.items, setState]
  )

  const moveGroup = useCallback(
    (groupId: string, deltaX: number, deltaY: number) => {
      setState((prev) => {
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
      })
    },
    [setState]
  )

  // ─────────────────────────────────────────────────────────────────────────────
  // Bulk Operations
  // ─────────────────────────────────────────────────────────────────────────────

  const removeSelected = useCallback(() => {
    setState((prev) => {
      const idsToRemove = new Set(prev.selectedIds)
      prev.items.forEach((item) => {
        if (item.parentId && idsToRemove.has(item.parentId)) {
          idsToRemove.add(item.id)
        }
      })

      return {
        ...prev,
        items: prev.items.filter((item) => !idsToRemove.has(item.id)),
        selectedIds: [],
      }
    })
  }, [setState])

  const moveSelected = useCallback(
    (deltaX: number, deltaY: number) => {
      setState((prev) => ({
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
      }))
    },
    [setState]
  )

  const duplicateSelected = useCallback(() => {
    setState((prev) => {
      const selectedItems = prev.items.filter((item) =>
        prev.selectedIds.includes(item.id)
      )

      const newItems = selectedItems.map((item, index) => ({
        ...item,
        id: `canvas-item-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 9)}`,
        position: {
          x: item.position.x + 20,
          y: item.position.y + 20,
        },
        zIndex: prev.nextZIndex + index,
        groupId: undefined, // Don't copy group association
      }))

      return {
        ...prev,
        items: [...prev.items, ...newItems],
        nextZIndex: prev.nextZIndex + newItems.length,
        selectedIds: newItems.map((item) => item.id),
      }
    })
  }, [setState])

  const duplicateItem = useCallback(
    (id: string) => {
      setState((prev) => {
        const item = prev.items.find((i) => i.id === id)
        if (!item) return prev

        const newId = `canvas-item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
        const newItem = {
          ...item,
          id: newId,
          position: {
            x: item.position.x + 20,
            y: item.position.y + 20,
          },
          zIndex: prev.nextZIndex,
          groupId: undefined, // Don't copy group association
        }

        return {
          ...prev,
          items: [...prev.items, newItem],
          nextZIndex: prev.nextZIndex + 1,
          selectedIds: [newId], // Select the new item
        }
      })
    },
    [setState]
  )

  // ─────────────────────────────────────────────────────────────────────────────
  // Canvas Operations
  // ─────────────────────────────────────────────────────────────────────────────

  const clearCanvas = useCallback(() => {
    setState(() => DEFAULT_STATE)
  }, [setState])

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

  return {
    // State
    items,
    groups,
    selectedIds,

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

    // Canvas operations
    clearCanvas,
  }
}
