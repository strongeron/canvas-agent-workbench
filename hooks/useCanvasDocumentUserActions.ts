import { useCallback, useEffect, useRef } from "react"

import type { CanvasDocumentChangeEvent } from "./useCanvasState"
import type { CanvasItem } from "../types/canvas"
import {
  CANVAS_SELECTION_SOURCES,
  diffDocumentItems,
  isCoalescedGestureSource,
} from "../utils/canvasDocumentEvents"

const SELECTION_CHANGED_DEBOUNCE_MS = 300

interface UseCanvasDocumentUserActionsInput {
  emitUserAction: (action: string, payload?: Record<string, unknown>) => void
  /** Read the post-change selection; called when the debounce fires. */
  getSelectionSnapshot: () => { selectedIds: string[]; items: CanvasItem[] }
}

/**
 * Agent-feed user-action events derived from the document change stream
 * (FOX2-60): a `gesture-end` event per coalesced drag/resize/rotate gesture
 * carrying only the changed fields of the changed items, and a debounced
 * `selection-changed` event for the selection mutators. Returns a stable
 * listener for CanvasTab's subscribeToDocumentChanges wiring.
 */
export function useCanvasDocumentUserActions({
  emitUserAction,
  getSelectionSnapshot,
}: UseCanvasDocumentUserActionsInput) {
  // Refs so the returned listener stays stable while the subscription lives
  // across renders (and so a debounce firing later reads fresh selection).
  const emitRef = useRef(emitUserAction)
  emitRef.current = emitUserAction
  const selectionRef = useRef(getSelectionSnapshot)
  selectionRef.current = getSelectionSnapshot
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) clearTimeout(debounceRef.current)
    }
  }, [])

  return useCallback((event: CanvasDocumentChangeEvent) => {
    const { meta, prevSnapshot, nextSnapshot } = event
    // Agent operations are logged server-side; history restores are PR 2's
    // concern — user actions only.
    if (meta.actor !== "user") return

    if (isCoalescedGestureSource(meta.source)) {
      const diff = diffDocumentItems(prevSnapshot, nextSnapshot)
      if (diff.itemIds.length === 0) return
      emitRef.current("gesture-end", {
        source: meta.source,
        itemIds: diff.itemIds,
        from: diff.from,
        to: diff.to,
      })
      return
    }

    if (CANVAS_SELECTION_SOURCES.has(meta.source)) {
      if (debounceRef.current !== null) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null
        const { selectedIds, items } = selectionRef.current()
        const selected = new Set(selectedIds)
        const types = [
          ...new Set(items.filter((item) => selected.has(item.id)).map((item) => item.type)),
        ]
        emitRef.current("selection-changed", { selectedIds: [...selectedIds], types })
      }, SELECTION_CHANGED_DEBOUNCE_MS)
    }
  }, [])
}
