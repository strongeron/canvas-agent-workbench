import { useEffect, useRef } from "react"

import type { GalleryEntry } from "../core/types"
import type { CanvasComponentItem, CanvasItem, CanvasItemUpdate } from "../types/canvas"
import { cycleVariantIndex } from "../utils/canvasVariantCycle"
import { isEditableEventTarget } from "../utils/isEditableEventTarget"

interface UseCanvasKeyboardShortcutsInput {
  items: CanvasItem[]
  selectedIds: string[]
  selectedComponentItem: CanvasComponentItem | null
  selectedComponent: GalleryEntry | null
  updateItem: (id: string, updates: CanvasItemUpdate) => void
  duplicateSelected: () => void
  pasteItems: (
    clipboardItems: CanvasItem[],
    target?: { parentId?: string; order?: number }
  ) => void
  addTargetArtboardId: string | null
  nextArtboardChildOrder: (artboardId: string) => number
  emitUserAction: (action: string, payload?: Record<string, unknown>) => void
}

/**
 * Canvas-node keyboard shortcuts: Cmd-C/V/D clipboard + duplicate (FOX2-59)
 * and arrow-key variant cycling on a selected component. Extracted from
 * CanvasTab (FOX2-62 Scale-1 PR 3). Cmd-Z lives in useCanvasMutationHistory.
 */
export function useCanvasKeyboardShortcuts({
  items,
  selectedIds,
  selectedComponentItem,
  selectedComponent,
  updateItem,
  duplicateSelected,
  pasteItems,
  addTargetArtboardId,
  nextArtboardChildOrder,
  emitUserAction,
}: UseCanvasKeyboardShortcutsInput) {
  // In-memory clipboard for canvas node copy/paste (FOX2-59).
  const clipboardRef = useRef<CanvasItem[]>([])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!selectedComponentItem || !selectedComponent) return
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return
      const target = event.target as HTMLElement | null
      if (isEditableEventTarget(target)) {
        return
      }
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
      const nextIndex = cycleVariantIndex(
        selectedComponentItem.variantIndex,
        selectedComponent.variants.length,
        event.key === "ArrowLeft" ? "previous" : "next"
      )
      if (nextIndex === selectedComponentItem.variantIndex) return
      event.preventDefault()
      updateItem(selectedComponentItem.id, { variantIndex: nextIndex })
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedComponent, selectedComponentItem, updateItem])

  // Copy / paste / duplicate of canvas nodes (FOX2-59). Paste and duplicate
  // target the selected/containing artboard, else open canvas at a cascade
  // offset.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMod = event.metaKey || event.ctrlKey
      if (!isMod || event.altKey) return
      const key = event.key.toLowerCase()
      if (key !== "c" && key !== "v" && key !== "d") return
      if (isEditableEventTarget(event.target as HTMLElement | null)) return

      if (key === "d") {
        if (selectedIds.length === 0) return
        event.preventDefault()
        duplicateSelected()
        return
      }
      // Let the OS handle a real text-selection copy.
      if (key === "c" && (window.getSelection()?.toString() ?? "")) return

      if (key === "c") {
        const copied = items.filter(
          (item) => selectedIds.includes(item.id) && item.type !== "artboard"
        )
        if (copied.length === 0) return
        event.preventDefault()
        clipboardRef.current = copied.map((item) => ({ ...item }))
        return
      }

      if (clipboardRef.current.length === 0) return
      event.preventDefault()
      const parentId = addTargetArtboardId ?? undefined
      pasteItems(
        clipboardRef.current,
        parentId ? { parentId, order: nextArtboardChildOrder(parentId) } : undefined
      )
      emitUserAction("paste-items", {
        count: clipboardRef.current.length,
        parentId: parentId ?? null,
        target: parentId ? "artboard" : "canvas",
      })
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    addTargetArtboardId,
    duplicateSelected,
    emitUserAction,
    items,
    nextArtboardChildOrder,
    pasteItems,
    selectedIds,
  ])
}
