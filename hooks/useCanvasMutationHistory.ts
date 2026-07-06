import { useCallback, useEffect, useState } from "react"
import type { Dispatch, MutableRefObject, SetStateAction } from "react"

import type { CanvasReactNodeSelection } from "../components/canvas/CanvasHtmlFrame"
import type {
  CanvasGroup,
  CanvasHtmlItem,
  CanvasItem,
  CanvasMarkdownItem,
  CanvasStateSnapshot,
} from "../types/canvas"
import {
  createMutationLogState,
  pushEntry,
  redo,
  undo,
  type CanvasMutationLogEntry,
  type CanvasMutationLogState,
} from "../utils/canvasMutationLog"
import {
  applySourceSnapshotToItems,
  inferSourceKindFromFilePath,
  invertCanvasIdMap,
  parseInlineLogKey,
  resolveSourceFileMtime,
  selectionMatchesLoggedFile,
  type CanvasSourceMutation,
} from "../utils/canvasMutationHistory"
import { isEditableEventTarget } from "../utils/isEditableEventTarget"

export interface CanvasHistoryToast {
  id: number
  tone: "info" | "error"
  message: string
}

interface UseCanvasMutationHistoryInput {
  items: CanvasItem[]
  groups: CanvasGroup[]
  nextZIndex: number
  selectedIds: string[]
  replaceState: (nextState: CanvasStateSnapshot) => void
  setReactNodeSelection: Dispatch<SetStateAction<CanvasReactNodeSelection | null>>
  showToast: (toast: CanvasHistoryToast) => void
  /**
   * Source-edit feed emitter, held in a ref because the agent bridge that
   * provides it is created after the write-success handlers that need it.
   */
  emitSourceEditRef: MutableRefObject<(action: string, meta?: Record<string, unknown>) => void>
}

/**
 * The Cmd-Z source-mutation history (FOX2-35): snapshot log state, undo/redo
 * replay against the write endpoints, and the global keydown binding.
 * Extracted from CanvasTab (FOX2-62 Scale-1 PR 1) — this is the seam the
 * canvas-document undo (Scale-4) extends with document-kind entries.
 */
export function useCanvasMutationHistory({
  items,
  groups,
  nextZIndex,
  selectedIds,
  replaceState,
  setReactNodeSelection,
  showToast,
  emitSourceEditRef,
}: UseCanvasMutationHistoryInput) {
  const [mutationLogState, setMutationLogState] = useState<
    CanvasMutationLogState<CanvasSourceMutation>
  >(() => createMutationLogState<CanvasSourceMutation>())
  const [mutationHistoryBusy, setMutationHistoryBusy] = useState(false)

  const appendMutationLogEntry = useCallback(
    (entry: CanvasMutationLogEntry<CanvasSourceMutation>) => {
      setMutationLogState((current) => pushEntry(current, entry))
    },
    []
  )

  const applyMutationHistoryEntry = useCallback(
    async (entry: CanvasMutationLogEntry<CanvasSourceMutation>, direction: "undo" | "redo") => {
      const kind = inferSourceKindFromFilePath(entry.filePath)
      const sourceBackedItems = items.filter(
        (item): item is CanvasHtmlItem | CanvasMarkdownItem =>
          item.type === "html" || item.type === "markdown"
      )
      const expectedMtime = resolveSourceFileMtime(sourceBackedItems, entry.filePath, kind)
      const sourceSnapshot =
        direction === "undo" ? entry.prevSourceSnapshot : entry.postSourceSnapshot

      let nextKind = kind
      let nextSource: string | undefined
      let nextMtime: number | undefined

      if (parseInlineLogKey(entry.filePath)) {
        // Inline entries have no backing file — the snapshot itself is the
        // source of truth; apply it to item state without an endpoint write.
        nextSource = sourceSnapshot
      } else if (kind === "markdown") {
        const response = await fetch("/api/canvas/markdown/write", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filePath: entry.filePath,
            sourceSnapshot,
            mtimeMs: expectedMtime,
          }),
        })
        const payload = (await response.json().catch(() => ({}))) as {
          ok?: boolean
          source?: string
          mtimeMs?: number | null
          error?: string
          code?: string
        }
        if (!response.ok || !payload.ok || typeof payload.source !== "string") {
          const errorMessage = payload.error || `Failed to ${direction} source edit.`
          throw new Error(
            payload.code === "mtime-conflict"
              ? `${errorMessage} The file changed on disk since it was loaded.`
              : errorMessage
          )
        }
        nextSource = payload.source
        nextMtime = typeof payload.mtimeMs === "number" ? payload.mtimeMs : undefined
      } else {
        const response = await fetch("/api/canvas/ast/write", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filePath: entry.filePath,
            sourceSnapshot,
            mtimeMs: expectedMtime,
          }),
        })
        const payload = (await response.json().catch(() => ({}))) as {
          ok?: boolean
          kind?: "tsx" | "html"
          sourceReact?: string
          sourceHtml?: string
          mtimeMs?: number | null
          error?: string
          code?: string
        }
        nextKind = payload.kind ?? kind
        nextSource = nextKind === "html" ? payload.sourceHtml : payload.sourceReact
        if (!response.ok || !payload.ok || typeof nextSource !== "string") {
          const errorMessage = payload.error || `Failed to ${direction} source edit.`
          throw new Error(
            payload.code === "mtime-conflict"
              ? `${errorMessage} The file changed on disk since it was loaded.`
              : errorMessage
          )
        }
        nextMtime = typeof payload.mtimeMs === "number" ? payload.mtimeMs : undefined
      }

      if (typeof nextSource !== "string") {
        throw new Error(`Failed to ${direction} source edit.`)
      }

      const nextItemsResult = applySourceSnapshotToItems(
        sourceBackedItems,
        entry.filePath,
        nextKind,
        nextSource,
        nextMtime
      )
      if (nextItemsResult.changed) {
        const rewrittenItems = items.map((item) =>
          item.type === "html" || item.type === "markdown"
            ? nextItemsResult.items.find((candidate) => candidate.id === item.id) ?? item
            : item
        )
        replaceState({ items: rewrittenItems, groups, nextZIndex, selectedIds })
      }

      setReactNodeSelection((current) => {
        if (!current) return current
        if (!selectionMatchesLoggedFile(current, sourceBackedItems, entry.filePath, nextKind)) {
          return current
        }
        const canvasIdMap =
          direction === "undo"
            ? invertCanvasIdMap(entry.canvasIdMap ?? {})
            : (entry.canvasIdMap ?? {})
        const rebasedCanvasId = canvasIdMap[current.canvasId]
        if (rebasedCanvasId === null) return null
        if (typeof rebasedCanvasId === "string" && rebasedCanvasId !== current.canvasId) {
          return { ...current, canvasId: rebasedCanvasId }
        }
        return current
      })
      showToast({
        id: Date.now(),
        tone: "info",
        message: `${direction === "undo" ? "Undid" : "Redid"}: ${entry.summary ?? "source edit"}`,
      })
      emitSourceEditRef.current(direction === "undo" ? "source-undo" : "source-redo", {
        target: parseInlineLogKey(entry.filePath) ? "inline" : "file",
        filePath: entry.filePath,
        summary: entry.summary ?? "source edit",
      })
    },
    [emitSourceEditRef, groups, items, nextZIndex, replaceState, selectedIds, setReactNodeSelection, showToast]
  )

  const handleUndoMutation = useCallback(async () => {
    if (mutationHistoryBusy) return
    const next = undo(mutationLogState)
    if (!next.entry) return
    setMutationHistoryBusy(true)
    try {
      await applyMutationHistoryEntry(next.entry, "undo")
      setMutationLogState(next.state)
    } catch (error) {
      showToast({
        id: Date.now(),
        tone: "error",
        message: error instanceof Error ? error.message : "Failed to undo source edit.",
      })
    } finally {
      setMutationHistoryBusy(false)
    }
  }, [applyMutationHistoryEntry, mutationHistoryBusy, mutationLogState, showToast])

  const handleRedoMutation = useCallback(async () => {
    if (mutationHistoryBusy) return
    const next = redo(mutationLogState)
    if (!next.entry) return
    setMutationHistoryBusy(true)
    try {
      await applyMutationHistoryEntry(next.entry, "redo")
      setMutationLogState(next.state)
    } catch (error) {
      showToast({
        id: Date.now(),
        tone: "error",
        message: error instanceof Error ? error.message : "Failed to redo source edit.",
      })
    } finally {
      setMutationHistoryBusy(false)
    }
  }, [applyMutationHistoryEntry, mutationHistoryBusy, mutationLogState, showToast])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMod = event.metaKey || event.ctrlKey
      if (!isMod || event.altKey || event.key.toLowerCase() !== "z") return
      const target = event.target as HTMLElement | null
      if (isEditableEventTarget(target)) {
        return
      }
      event.preventDefault()
      if (event.shiftKey) {
        void handleRedoMutation()
        return
      }
      void handleUndoMutation()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleRedoMutation, handleUndoMutation])

  return {
    appendMutationLogEntry,
    handleUndoMutation,
    handleRedoMutation,
  }
}
