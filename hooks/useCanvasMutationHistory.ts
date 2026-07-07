import { useCallback, useEffect, useState } from "react"
import type { Dispatch, MutableRefObject, SetStateAction } from "react"

import type { CanvasReactNodeSelection } from "../components/canvas/CanvasHtmlFrame"
import type { CanvasDocumentChangeEvent } from "./useCanvasState"
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
  type CanvasMutationLogState,
  type CanvasSourceMutationLogEntry,
} from "../utils/canvasMutationLog"
import {
  humanizeCanvasChangeSource,
  isCoalescedGestureSource,
} from "../utils/canvasDocumentEvents"
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
  /**
   * Log key for document-kind entries (FOX2-67): the active `.canvas` file
   * path, or a per-workspace key while the canvas is unsaved.
   */
  documentLogKey: string
}

/**
 * The Cmd-Z mutation history: the FOX2-35 source-snapshot log with undo/redo
 * replay against the write endpoints and the global keydown binding
 * (extracted from CanvasTab in FOX2-62 Scale-1 PR 1), extended with
 * document-kind entries recorded from the FOX2-66 change stream (FOX2-67
 * PR 1). Document entries share the same timeline and caps; their undo/redo
 * replay lands in PR 2.
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
  documentLogKey,
}: UseCanvasMutationHistoryInput) {
  const [mutationLogState, setMutationLogState] = useState<
    CanvasMutationLogState<CanvasSourceMutation>
  >(() => createMutationLogState<CanvasSourceMutation>())
  const [mutationHistoryBusy, setMutationHistoryBusy] = useState(false)

  const appendMutationLogEntry = useCallback(
    (entry: CanvasSourceMutationLogEntry<CanvasSourceMutation>) => {
      setMutationLogState((current) => pushEntry(current, { ...entry, kind: "source" }))
    },
    []
  )

  // Feed one document change into the log (FOX2-67 PR 1). Wired from
  // CanvasTab via subscribeToDocumentChanges.
  const recordDocumentChange = useCallback(
    (event: CanvasDocumentChangeEvent) => {
      const { meta, prevSnapshot, nextSnapshot } = event
      const actor = meta.actor
      // History restores must not re-log — loop prevention for PR 2's replay.
      if (actor === "history") return
      // Selection-only ops keep the same item/group references — no document
      // change to record.
      if (
        prevSnapshot.items === nextSnapshot.items &&
        prevSnapshot.groups === nextSnapshot.groups
      ) {
        return
      }
      // Per-mousemove events inside a gesture are skipped; the coalesced
      // endGesture event (source "gesture" / "gesture:<summary>") is the one
      // logged.
      if (meta.gesture && !isCoalescedGestureSource(meta.source)) return

      setMutationLogState((current) =>
        pushEntry(current, {
          kind: "document",
          id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          timestamp: Date.now(),
          filePath: documentLogKey,
          summary: humanizeCanvasChangeSource(meta.source),
          actor,
          prevDoc: prevSnapshot,
          postDoc: nextSnapshot,
        })
      )
    },
    [documentLogKey]
  )

  const applyMutationHistoryEntry = useCallback(
    async (entry: CanvasSourceMutationLogEntry<CanvasSourceMutation>, direction: "undo" | "redo") => {
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
    // Document-entry replay (state restore with actor "history") lands in
    // FOX2-67 PR 2; until then leave the entry on the timeline untouched.
    if (next.entry.kind === "document") return
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
    // Document-entry replay lands in FOX2-67 PR 2 (see handleUndoMutation).
    if (next.entry.kind === "document") return
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
    recordDocumentChange,
    mutationLogState,
    handleUndoMutation,
    handleRedoMutation,
  }
}
