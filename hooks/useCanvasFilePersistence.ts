import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { Dispatch, SetStateAction } from "react"

import type {
  CanvasFileAssetField,
  CanvasFileAssetInput,
  CanvasFileDocument,
  CanvasFileIndexEntry,
  CanvasGroup,
  CanvasItem,
  CanvasStateSnapshot,
  CanvasTransform,
} from "../types/canvas"
import { buildCanvasAssetFileName } from "../utils/canvasFileAssetName"
import { SerialTaskQueue } from "../utils/serialTaskQueue"
import { blobToDataUrl } from "./useCanvasAddHandlers"
import type { CanvasDocumentChangeListener } from "./useCanvasState"

export type CanvasFileActionModalState = {
  mode: "create" | "save-as" | "rename" | "duplicate"
  targetPath: string | null
  title: string
  folder: string
}

export type CanvasFileDeleteModalState = {
  path: string
  title: string
}

/** The active `.canvas` file loaded into the workspace. */
export type ActiveCanvasFile = {
  path: string
  document: CanvasFileDocument
}

/**
 * FOX2-70 (FB-3): a save failure is a loud, distinct, persistent state.
 * `attempts` counts consecutive failures; once it reaches
 * MAX_AUTOSAVE_ATTEMPTS the autosave stops retrying (`exhausted`) and only a
 * successful save — manual Retry or the next autosave after Retry re-arms
 * it — clears the state.
 */
export interface CanvasSaveFailure {
  message: string
  attempts: number
  exhausted: boolean
}

const MAX_AUTOSAVE_ATTEMPTS = 3
const AUTOSAVE_DELAY_MS = 900

/**
 * Auto-name for materialized drafts (FOX2-71): `Untitled`, then `Untitled 2`…
 * against the existing file titles. The server additionally dedupes the file
 * path, so a stale index at worst produces `untitled-2.canvas` with the same
 * display title.
 */
export function nextUntitledCanvasTitle(files: Pick<CanvasFileIndexEntry, "title">[]) {
  const titles = new Set(files.map((file) => file.title.trim().toLowerCase()))
  if (!titles.has("untitled")) return "Untitled"
  let counter = 2
  while (titles.has(`untitled ${counter}`)) counter += 1
  return `Untitled ${counter}`
}

function fileNameFromCanvasAsset(
  itemId: string,
  field: CanvasFileAssetField,
  fallbackName: string | undefined,
  sourceUrl: string
) {
  const mimeMatch = /^data:([^;,]+)?/i.exec(sourceUrl)
  const mimeType = mimeMatch?.[1] || "application/octet-stream"
  return buildCanvasAssetFileName(itemId, field, fallbackName, mimeType)
}

interface UseCanvasFilePersistenceInput {
  activeProjectId?: string
  items: CanvasItem[]
  groups: CanvasGroup[]
  nextZIndex: number
  transform: CanvasTransform
  replaceState: (nextState: CanvasStateSnapshot) => void
  setViewport: (viewport: CanvasTransform) => void
  resetZoom: () => void
  /**
   * The active-file state stays in CanvasTab: the agent bridge (which
   * provides `emitFileLifecycle`) and the file-browser state hook both read
   * it before this hook can run, so the hook receives it via props instead
   * of owning it.
   */
  activeCanvasFile: ActiveCanvasFile | null
  setActiveCanvasFile: Dispatch<SetStateAction<ActiveCanvasFile | null>>
  activeCanvasFilePath: string | null
  canvasFiles: CanvasFileIndexEntry[]
  canvasFilesLoading: boolean
  /** True once the file index for the current project has loaded at least once. */
  canvasFilesLoaded: boolean
  canvasFilesSaving: boolean
  openCanvasFile: (filePath: string) => Promise<ActiveCanvasFile>
  createCanvasFile: (input: {
    title: string
    folder?: string
    document?: CanvasStateSnapshot
    view?: { transform?: CanvasTransform }
    assets?: CanvasFileAssetInput[]
  }) => Promise<ActiveCanvasFile>
  saveCanvasFile: (
    filePath: string,
    document: CanvasFileDocument,
    assets?: CanvasFileAssetInput[]
  ) => Promise<ActiveCanvasFile>
  updateCanvasFileMetadata: (
    filePath: string,
    updates: Partial<Pick<CanvasFileDocument["meta"], "title" | "tags" | "favorite" | "archived">>
  ) => Promise<ActiveCanvasFile>
  moveCanvasFile: (
    filePath: string,
    updates: { nextPath?: string; title?: string; folder?: string }
  ) => Promise<ActiveCanvasFile>
  duplicateCanvasFile: (
    filePath: string,
    updates?: { nextPath?: string; title?: string; folder?: string }
  ) => Promise<ActiveCanvasFile>
  deleteCanvasFile: (filePath: string) => Promise<unknown>
  /**
   * Passed as the whole object (not destructured members) so the dep arrays
   * of the modal-submit/delete handlers keep their original `canvasFileBrowser`
   * entry unchanged.
   */
  canvasFileBrowser: {
    lastActivePath: string | null
    replaceTrackedPath: (fromPath: string, toPath: string) => void
    removeTrackedPath: (path: string) => void
  }
  emitFileLifecycle: (action: string, meta?: Record<string, unknown>) => void
  /**
   * The FOX2-66 change stream. Every genuine document mutation — user
   * gesture or agent operation — flows through `applyChange` and lands here,
   * while restores (localStorage hydration, file open via `replace-state`)
   * do not. That makes it the materialize trigger (FOX2-71): no diffing
   * against a restored baseline, no ambiguity about what counts as a change.
   */
  subscribeToDocumentChanges: (listener: CanvasDocumentChangeListener) => () => void
}

/**
 * Canvas-file persistence (FOX2-62 Scale-1 PR 4): the serial persistence
 * queue, dirty tracking + the FOX2-40 autosave loop fix, and the file CRUD
 * handlers (open/create/save/rename/duplicate/delete/favorite) with their
 * modal state. File-lifecycle feed emits (FOX2-49) arrive via
 * `emitFileLifecycle`. Extracted from CanvasTab.
 */
export function useCanvasFilePersistence({
  activeProjectId,
  items,
  groups,
  nextZIndex,
  transform,
  replaceState,
  setViewport,
  resetZoom,
  activeCanvasFile,
  setActiveCanvasFile,
  activeCanvasFilePath,
  canvasFiles,
  canvasFilesLoading,
  canvasFilesLoaded,
  canvasFilesSaving,
  openCanvasFile,
  createCanvasFile,
  saveCanvasFile,
  updateCanvasFileMetadata,
  moveCanvasFile,
  duplicateCanvasFile,
  deleteCanvasFile,
  canvasFileBrowser,
  emitFileLifecycle,
  subscribeToDocumentChanges,
}: UseCanvasFilePersistenceInput) {
  const [lastSavedCanvasFileSignature, setLastSavedCanvasFileSignature] = useState<string | null>(null)
  const [hasRestoredCanvasFile, setHasRestoredCanvasFile] = useState(false)
  const [canvasFileActionModal, setCanvasFileActionModal] = useState<CanvasFileActionModalState | null>(null)
  const [canvasFileDeleteModal, setCanvasFileDeleteModal] = useState<CanvasFileDeleteModalState | null>(null)
  const [canvasFileActionError, setCanvasFileActionError] = useState<string | null>(null)
  const [canvasFileDeleteError, setCanvasFileDeleteError] = useState<string | null>(null)
  const [canvasFileActionBusy, setCanvasFileActionBusy] = useState(false)
  const [canvasFileDeleteBusy, setCanvasFileDeleteBusy] = useState(false)
  const [canvasSaveQueued, setCanvasSaveQueued] = useState(false)
  const [canvasFileMaterializing, setCanvasFileMaterializing] = useState(false)
  const [canvasSaveFailure, setCanvasSaveFailure] = useState<CanvasSaveFailure | null>(null)
  const canvasSaveFailureRef = useRef(canvasSaveFailure)
  canvasSaveFailureRef.current = canvasSaveFailure
  const [canvasPersistencePendingCount, setCanvasPersistencePendingCount] = useState(0)
  const canvasPersistenceQueueRef = useRef<SerialTaskQueue | null>(null)
  if (!canvasPersistenceQueueRef.current) {
    canvasPersistenceQueueRef.current = new SerialTaskQueue()
  }

  const runCanvasPersistenceTask: <T>(task: () => Promise<T>) => Promise<T> = useCallback(
    (task) => {
      setCanvasPersistencePendingCount((count) => count + 1)
      const scheduled = canvasPersistenceQueueRef.current!.enqueue(task)
      return scheduled.finally(() => {
        setCanvasPersistencePendingCount((count) => (count > 0 ? count - 1 : 0))
      })
    },
    []
  )

  const buildCurrentCanvasFilePayload = useCallback(() => {
    return {
      document: {
        items,
        groups,
        nextZIndex,
        selectedIds: [] as string[],
      },
      view: {
        transform,
      },
    }
  }, [groups, items, nextZIndex, transform])

  const buildCurrentCanvasFileAssets = useCallback(async (): Promise<CanvasFileAssetInput[]> => {
    if (typeof window === "undefined") return []

    const assets: CanvasFileAssetInput[] = []

    const captureAsset = async (
      itemId: string,
      field: CanvasFileAssetField,
      sourceUrl: string | undefined,
      fallbackName?: string
    ) => {
      const trimmed = sourceUrl?.trim()
      if (!trimmed) return
      if (!trimmed.startsWith("blob:") && !trimmed.startsWith("data:")) return

      const dataUrl = trimmed.startsWith("data:")
        ? trimmed
        : await fetch(trimmed).then(async (response) => {
            const blob = await response.blob()
            return blobToDataUrl(blob)
          })

      assets.push({
        itemId,
        field,
        fileName: fileNameFromCanvasAsset(itemId, field, fallbackName, trimmed),
        dataUrl,
      })
    }

    for (const item of items) {
      if (item.type === "media") {
        await captureAsset(item.id, "src", item.src, item.title)
        await captureAsset(item.id, "poster", item.poster, item.title ? `${item.title}-poster` : undefined)
        continue
      }

      if (item.type === "embed") {
        await captureAsset(
          item.id,
          "embedSnapshotUrl",
          item.embedSnapshotUrl,
          item.title ? `${item.title}-snapshot` : undefined
        )
      }
    }

    return assets
  }, [items])

  const currentCanvasFileSignature = useMemo(
    () => JSON.stringify(buildCurrentCanvasFilePayload()),
    [buildCurrentCanvasFilePayload]
  )
  const activeCanvasFileTitle = activeCanvasFile?.document.meta.title ?? null
  // The autosave effect reads this through a ref: starting a save flips
  // canvasFilePersistenceBusy, which re-runs the effect and would mark the
  // in-flight save `cancelled` — discarding its result meant the saved
  // signature was never recorded and the autosave looped forever (one save
  // per second). A completed save is only discarded when the TARGET FILE
  // changed, which this ref detects.
  const activeCanvasFilePathRef = useRef<string | null>(activeCanvasFilePath)
  useEffect(() => {
    activeCanvasFilePathRef.current = activeCanvasFilePath
  }, [activeCanvasFilePath])
  const activeProjectIdRef = useRef<string | undefined>(activeProjectId)
  useEffect(() => {
    activeProjectIdRef.current = activeProjectId
  }, [activeProjectId])
  const canvasFilePersistenceBusy =
    canvasFilesSaving ||
    canvasFileActionBusy ||
    canvasFileDeleteBusy ||
    canvasPersistencePendingCount > 0
  const canvasFileDirty =
    activeCanvasFile !== null && lastSavedCanvasFileSignature !== currentCanvasFileSignature

  const materializePromiseRef = useRef<Promise<ActiveCanvasFile | null> | null>(null)
  // Callers that must not lose work (asset paste) block on restore settling
  // rather than getting a null back — the restore may auto-open a file that
  // should receive the asset instead of a fresh Untitled.
  const restoreWaitersRef = useRef<Array<() => void>>([])
  // Set by the change-stream listener when a genuine mutation lands on an
  // unsaved board; consumed by the post-commit materialize effect. A plain
  // ref (not state): the listener fires synchronously inside applyChange,
  // before React commits the mutated document.
  const pendingDraftMutationRef = useRef(false)

  const applyCanvasFileToWorkspace = useCallback(
    (file: { path: string; document: CanvasFileDocument }) => {
      replaceState(file.document.document)
      setActiveCanvasFile(file)
      setLastSavedCanvasFileSignature(
        JSON.stringify({
          document: file.document.document,
          view: {
            transform:
              file.document.view?.transform ?? { scale: 1, offset: { x: 0, y: 0 } },
          },
        })
      )

      const nextTransform = file.document.view?.transform
      if (nextTransform) {
        setViewport(nextTransform)
      } else {
        resetZoom()
      }
      emitFileLifecycle("file-open", { path: file.path })
    },
    [emitFileLifecycle, replaceState, resetZoom, setActiveCanvasFile, setViewport]
  )

  // Release restore waiters when restore settles (or when the draft context
  // tears down — a hung waiter would strand its caller's paste forever).
  useEffect(() => {
    if (!hasRestoredCanvasFile) return
    restoreWaitersRef.current.splice(0).forEach((resolve) => resolve())
  }, [hasRestoredCanvasFile])

  useEffect(() => {
    pendingDraftMutationRef.current = false
    restoreWaitersRef.current.splice(0).forEach((resolve) => resolve())
    setActiveCanvasFile(null)
    setLastSavedCanvasFileSignature(null)
    setHasRestoredCanvasFile(false)
    setCanvasFileActionModal(null)
    setCanvasFileDeleteModal(null)
    setCanvasFileActionError(null)
    setCanvasFileDeleteError(null)
    setCanvasSaveQueued(false)
  }, [activeProjectId, setActiveCanvasFile])

  // The autosave debounce must survive re-renders that don't change the
  // document: `items`/`groups` get fresh identities on every CanvasTab
  // render, and background polling (agent bridge state sync) re-renders the
  // tab a few times per second — an identity-keyed effect would cancel its
  // own timer forever and the save would never fire. So the effect below is
  // keyed on VALUES (the payload signature string, the target path, the
  // dirty/busy booleans) and reads everything else through these refs.
  const buildCurrentCanvasFilePayloadRef = useRef(buildCurrentCanvasFilePayload)
  buildCurrentCanvasFilePayloadRef.current = buildCurrentCanvasFilePayload
  const buildCurrentCanvasFileAssetsRef = useRef(buildCurrentCanvasFileAssets)
  buildCurrentCanvasFileAssetsRef.current = buildCurrentCanvasFileAssets
  const activeCanvasFileRef = useRef(activeCanvasFile)
  activeCanvasFileRef.current = activeCanvasFile

  // FOX2-70 (FB-3) save-failure transitions. Reading attempts through the
  // ref keeps these stable and StrictMode-safe (no side effects inside a
  // state updater); the `save-failed` feed event fires once, on the attempt
  // that exhausts the retry budget.
  const recordCanvasSaveFailure = useCallback(
    (path: string, error: unknown) => {
      const message = error instanceof Error ? error.message : "Failed to save canvas file."
      const attempts = (canvasSaveFailureRef.current?.attempts ?? 0) + 1
      const exhausted = attempts >= MAX_AUTOSAVE_ATTEMPTS
      if (exhausted && !canvasSaveFailureRef.current?.exhausted) {
        emitFileLifecycle("save-failed", { path, reason: message, attempts })
      }
      setCanvasSaveFailure({ message, attempts, exhausted })
    },
    [emitFileLifecycle]
  )
  const recordCanvasSaveSuccess = useCallback(
    (path: string) => {
      if (!canvasSaveFailureRef.current) return
      emitFileLifecycle("save-recovered", { path })
      setCanvasSaveFailure(null)
    },
    [emitFileLifecycle]
  )

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !activeCanvasFilePath ||
      !canvasFileDirty ||
      canvasFilePersistenceBusy ||
      // FOX2-70: the retry budget is spent — stay in the failed state until
      // an explicit Retry (or any successful save) clears it. No endless
      // fixed-cadence hammering (FOX2-40).
      canvasSaveFailure?.exhausted
    ) {
      return
    }

    const targetPath = activeCanvasFilePath
    const delay = AUTOSAVE_DELAY_MS * 2 ** (canvasSaveFailure?.attempts ?? 0)
    const timeoutId = window.setTimeout(() => {
      void (async () => {
        const target = activeCanvasFileRef.current
        if (!target || target.path !== targetPath) return
        try {
          const payload = buildCurrentCanvasFilePayloadRef.current()
          const assets = await buildCurrentCanvasFileAssetsRef.current()
          const saved = await runCanvasPersistenceTask(() =>
            saveCanvasFile(
              target.path,
              {
                ...target.document,
                document: payload.document,
                view: payload.view,
              },
              assets
            )
          )
          // Do NOT drop the result just because the effect re-ran: starting
          // this very save flips canvasFilePersistenceBusy, re-running the
          // effect and replacing this closure — the save still completed and
          // its signature must be recorded or dirty never clears (endless
          // save loop). Only discard when the active file itself changed.
          if (activeCanvasFilePathRef.current !== target.path) return
          setActiveCanvasFile(saved)
          setLastSavedCanvasFileSignature(JSON.stringify(payload))
          recordCanvasSaveSuccess(target.path)
        } catch (error) {
          // Same rule as success: the failure happened even though starting
          // the save re-ran the effect — it must count against the retry
          // budget or the backoff never engages.
          if (activeCanvasFilePathRef.current !== target.path) return
          recordCanvasSaveFailure(target.path, error)
          window.console.warn(
            "[Canvas] Failed to autosave active canvas file:",
            error instanceof Error ? error.message : error
          )
        }
      })()
    }, delay)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [
    activeCanvasFilePath,
    canvasFileDirty,
    canvasFilePersistenceBusy,
    canvasSaveFailure,
    currentCanvasFileSignature,
    recordCanvasSaveFailure,
    recordCanvasSaveSuccess,
    runCanvasPersistenceTask,
    saveCanvasFile,
    setActiveCanvasFile,
  ])

  // A different file (or project) means the failure no longer describes the
  // board on screen.
  useEffect(() => {
    setCanvasSaveFailure(null)
  }, [activeCanvasFilePath])

  /**
   * FOX2-71 (FB-1): a canvas is always folder-backed. Creates an `Untitled`
   * `.canvas` file from the current workspace state when no file is open, so
   * work never lives only in localStorage. Safe to call concurrently — one
   * create is shared by all callers.
   */
  const ensureCanvasFileMaterialized = useCallback(async (): Promise<ActiveCanvasFile | null> => {
    if (!activeProjectId) return null
    if (!hasRestoredCanvasFile) {
      // Restore may still auto-open a file that should receive this work —
      // wait for it to settle rather than racing it with a fresh Untitled.
      await new Promise<void>((resolve) => restoreWaitersRef.current.push(resolve))
      if (activeProjectIdRef.current !== activeProjectId) return null
    }
    if (activeCanvasFileRef.current) return activeCanvasFileRef.current
    if (materializePromiseRef.current) return materializePromiseRef.current

    const materialize = (async () => {
      setCanvasFileMaterializing(true)
      try {
        const payload = buildCurrentCanvasFilePayload()
        const assets = await buildCurrentCanvasFileAssets()
        const title = nextUntitledCanvasTitle(canvasFiles)
        const created = await runCanvasPersistenceTask(() =>
          createCanvasFile({
            title,
            document: payload.document,
            view: payload.view,
            assets,
          })
        )
        // The project may have switched while the create was in flight — the
        // file was written, but it must not become active in the new project.
        if (activeProjectIdRef.current !== activeProjectId) return null
        emitFileLifecycle("file-create", {
          path: created.path,
          title,
          reason: "auto-materialize",
        })
        pendingDraftMutationRef.current = false
        setActiveCanvasFile(created)
        setLastSavedCanvasFileSignature(JSON.stringify(payload))
        return created
      } catch (error) {
        // FOX2-70 (FB-3) turns this into a persistent failed state; until
        // then the NEXT change-stream event retries. The pending flag must
        // clear here — the post-commit effect churns with every re-render
        // (items identity), and a sticky flag would hot-retry a failing
        // create several times per second (FOX2-40 lesson).
        pendingDraftMutationRef.current = false
        materializePromiseRef.current = null
        if (typeof window !== "undefined") {
          window.console.warn(
            "[Canvas] Failed to materialize canvas file for draft:",
            error instanceof Error ? error.message : error
          )
        }
        return null
      } finally {
        setCanvasFileMaterializing(false)
      }
    })()

    materializePromiseRef.current = materialize
    return materialize
  }, [
    activeProjectId,
    buildCurrentCanvasFileAssets,
    buildCurrentCanvasFilePayload,
    canvasFiles,
    createCanvasFile,
    emitFileLifecycle,
    hasRestoredCanvasFile,
    runCanvasPersistenceTask,
    setActiveCanvasFile,
  ])

  // FOX2-71 (FB-1) trigger, part 1: the change stream marks genuine
  // mutations on an unsaved board. Restores never fire it (localStorage
  // hydration bypasses applyChange; file opens carry `replace-state`), so a
  // pending flag here means real user or agent work that must get a file —
  // including mutations that land before the file index finishes loading.
  useEffect(() => {
    if (!activeProjectId) return
    return subscribeToDocumentChanges((event) => {
      if (event.meta.source === "replace-state") return
      // Selection-only changes (select/clear/box-select) go through
      // applyChange but reuse the items/groups references — they are not
      // document work and must never materialize a file. A boot-time
      // selection reset on an empty draft would otherwise litter an empty
      // Untitled.canvas on every visit.
      if (
        event.prevSnapshot.items === event.nextSnapshot.items &&
        event.prevSnapshot.groups === event.nextSnapshot.groups
      ) {
        return
      }
      if (activeCanvasFilePathRef.current) return
      pendingDraftMutationRef.current = true
    })
  }, [activeProjectId, subscribeToDocumentChanges])

  // FOX2-71 (FB-1) trigger, part 2: materialize after the mutated document
  // commits (the stream fires pre-commit, when the workspace payload would
  // still be stale) and once restore has settled. A failed create keeps the
  // flag set and retries on the next commit — never in a hot loop (FOX2-40).
  useEffect(() => {
    if (!activeProjectId || !hasRestoredCanvasFile || activeCanvasFile) {
      // A successful materialize keeps its resolved promise in the ref until
      // the created file commits as active — callers landing in that window
      // reuse it instead of double-creating. Clear it here once committed
      // (or when the draft context tears down).
      if (activeCanvasFile) pendingDraftMutationRef.current = false
      materializePromiseRef.current = null
      return
    }
    if (!pendingDraftMutationRef.current) return
    void ensureCanvasFileMaterialized()
  }, [
    activeCanvasFile,
    activeProjectId,
    ensureCanvasFileMaterialized,
    groups,
    hasRestoredCanvasFile,
    items,
    nextZIndex,
  ])

  const performSaveCanvasFile = useCallback(async () => {
    if (!activeProjectId) return
    const payload = buildCurrentCanvasFilePayload()

    try {
      const assets = await buildCurrentCanvasFileAssets()
      if (!activeCanvasFile) {
        setCanvasFileActionError(null)
        setCanvasFileActionModal({
          mode: "save-as",
          targetPath: null,
          title: "Untitled Canvas",
          folder: "",
        })
        return
      }

      const saved = await runCanvasPersistenceTask(() =>
        saveCanvasFile(
          activeCanvasFile.path,
          {
            ...activeCanvasFile.document,
            document: payload.document,
            view: payload.view,
          },
          assets
        )
      )
      setActiveCanvasFile(saved)
      setLastSavedCanvasFileSignature(JSON.stringify(payload))
      recordCanvasSaveSuccess(saved.path)
      emitFileLifecycle("file-save", {
        path: saved.path,
        itemCount: payload.document.items.length,
      })
    } catch (error) {
      // FOX2-70: a failed manual save enters the same persistent failed
      // state as autosave (badge + banner + Retry) instead of a one-shot
      // alert.
      recordCanvasSaveFailure(activeCanvasFile?.path ?? "", error)
    }
  }, [
    activeCanvasFile,
    activeProjectId,
    buildCurrentCanvasFileAssets,
    buildCurrentCanvasFilePayload,
    emitFileLifecycle,
    recordCanvasSaveFailure,
    recordCanvasSaveSuccess,
    runCanvasPersistenceTask,
    saveCanvasFile,
    setActiveCanvasFile,
  ])

  useEffect(() => {
    if (!canvasSaveQueued || !activeProjectId || canvasFilePersistenceBusy) {
      return
    }

    setCanvasSaveQueued(false)
    void performSaveCanvasFile()
  }, [activeProjectId, canvasFilePersistenceBusy, canvasSaveQueued, performSaveCanvasFile])

  const handleOpenCanvasFile = useCallback(
    async (filePath: string) => {
      try {
        const file = await openCanvasFile(filePath)
        applyCanvasFileToWorkspace(file)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to open canvas file."
        if (typeof window !== "undefined") {
          window.alert(message)
        }
      }
    },
    [applyCanvasFileToWorkspace, openCanvasFile]
  )

  useEffect(() => {
    if (
      !activeProjectId ||
      !canvasFilesLoaded ||
      canvasFilesLoading ||
      hasRestoredCanvasFile ||
      activeCanvasFile
    ) {
      return
    }
    // No files to restore still settles the restore: the FOX2-71 materialize
    // trigger and the viewport override both wait on hasRestoredCanvasFile.
    if (canvasFiles.length === 0) {
      setHasRestoredCanvasFile(true)
      return
    }

    const preferredPath = canvasFileBrowser.lastActivePath
    const nextPath =
      (preferredPath && canvasFiles.some((file) => file.path === preferredPath) ? preferredPath : null) ||
      (canvasFiles.length === 1 ? canvasFiles[0]?.path : null)

    if (!nextPath) {
      setHasRestoredCanvasFile(true)
      return
    }

    void handleOpenCanvasFile(nextPath).finally(() => setHasRestoredCanvasFile(true))
  }, [
    activeCanvasFile,
    activeProjectId,
    canvasFileBrowser.lastActivePath,
    canvasFiles,
    canvasFilesLoaded,
    canvasFilesLoading,
    handleOpenCanvasFile,
    hasRestoredCanvasFile,
  ])

  const handleCreateCanvasFile = useCallback(async () => {
    if (!activeProjectId) return
    setCanvasFileActionError(null)
    setCanvasFileActionModal({
      mode: "create",
      targetPath: null,
      title: "Untitled Canvas",
      folder: "",
    })
  }, [activeProjectId])

  const handleSaveCanvasFile = useCallback(async () => {
    if (!activeProjectId) return
    if (canvasFilePersistenceBusy) {
      setCanvasSaveQueued(true)
      return
    }
    await performSaveCanvasFile()
  }, [activeProjectId, canvasFilePersistenceBusy, performSaveCanvasFile])

  /**
   * FOX2-70: the Retry action on the save-failed banner. The failed state is
   * cleared by the successful save itself (which also emits
   * `save-recovered`), so a Retry that fails again stays visibly failed.
   */
  const retryCanvasSave = useCallback(() => {
    void handleSaveCanvasFile()
  }, [handleSaveCanvasFile])

  const handleToggleCanvasFavorite = useCallback(
    async (filePath: string) => {
      const target = canvasFiles.find((file) => file.path === filePath)
      if (!target) return
      try {
        const updated = await runCanvasPersistenceTask(() =>
          updateCanvasFileMetadata(filePath, {
            favorite: !target.favorite,
          })
        )
        if (activeCanvasFile?.path === filePath) {
          setActiveCanvasFile(updated)
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to update canvas favorite."
        if (typeof window !== "undefined") {
          window.alert(message)
        }
      }
    },
    [activeCanvasFile?.path, canvasFiles, runCanvasPersistenceTask, setActiveCanvasFile, updateCanvasFileMetadata]
  )

  const handleRenameCanvasFile = useCallback(
    async (filePath: string) => {
      const target = canvasFiles.find((file) => file.path === filePath)
      if (!target) return
      const currentFolder = filePath.split("/").slice(0, -1).join("/")
      setCanvasFileActionError(null)
      setCanvasFileActionModal({
        mode: "rename",
        targetPath: filePath,
        title: target.title,
        folder: currentFolder,
      })
    },
    [canvasFiles]
  )

  const handleDuplicateCanvasFile = useCallback(
    async (filePath: string) => {
      const target = canvasFiles.find((file) => file.path === filePath)
      if (!target) return
      const currentFolder = filePath.split("/").slice(0, -1).join("/")
      setCanvasFileActionError(null)
      setCanvasFileActionModal({
        mode: "duplicate",
        targetPath: filePath,
        title: `${target.title} Copy`,
        folder: currentFolder,
      })
    },
    [canvasFiles]
  )

  const handleDeleteCanvasFile = useCallback(
    async (filePath: string) => {
      const target = canvasFiles.find((file) => file.path === filePath)
      if (!target) return
      setCanvasFileDeleteError(null)
      setCanvasFileDeleteModal({
        path: filePath,
        title: target.title,
      })
    },
    [canvasFiles]
  )

  const handleSubmitCanvasFileActionModal = useCallback(async () => {
    if (!canvasFileActionModal || !activeProjectId) return
    const nextTitle = canvasFileActionModal.title.trim() || "Untitled Canvas"
    const nextFolder = canvasFileActionModal.folder.trim()

    setCanvasFileActionBusy(true)
    setCanvasFileActionError(null)
    try {
      if (canvasFileActionModal.mode === "create") {
        const file = await runCanvasPersistenceTask(() =>
          createCanvasFile({
            title: nextTitle,
            folder: nextFolder || undefined,
          })
        )
        emitFileLifecycle("file-create", { path: file.path, title: nextTitle })
        applyCanvasFileToWorkspace(file)
      } else if (canvasFileActionModal.mode === "save-as") {
        const payload = buildCurrentCanvasFilePayload()
        const assets = await buildCurrentCanvasFileAssets()
        const created = await runCanvasPersistenceTask(() =>
          createCanvasFile({
            title: nextTitle,
            folder: nextFolder || undefined,
            document: payload.document,
            view: payload.view,
            assets,
          })
        )
        emitFileLifecycle("file-create", { path: created.path, title: nextTitle })
        setActiveCanvasFile(created)
        setLastSavedCanvasFileSignature(JSON.stringify(payload))
      } else if (canvasFileActionModal.mode === "rename" && canvasFileActionModal.targetPath) {
        const targetPath = canvasFileActionModal.targetPath
        const target = canvasFiles.find((file) => file.path === canvasFileActionModal.targetPath)
        if (!target) {
          throw new Error("Canvas file no longer exists.")
        }
        const currentFolder = targetPath.split("/").slice(0, -1).join("/")
        if (target.title === nextTitle && currentFolder === nextFolder) {
          setCanvasFileActionModal(null)
          return
        }
        const moved = await runCanvasPersistenceTask(() =>
          moveCanvasFile(targetPath, {
            title: nextTitle,
            folder: nextFolder,
          })
        )
        if (activeCanvasFile?.path === targetPath) {
          setActiveCanvasFile(moved)
        }
        canvasFileBrowser.replaceTrackedPath(targetPath, moved.path)
        emitFileLifecycle("file-rename", { fromPath: targetPath, toPath: moved.path, title: nextTitle })
      } else if (canvasFileActionModal.mode === "duplicate" && canvasFileActionModal.targetPath) {
        const targetPath = canvasFileActionModal.targetPath
        const duplicated = await runCanvasPersistenceTask(() =>
          duplicateCanvasFile(targetPath, {
            title: nextTitle,
            folder: nextFolder,
          })
        )
        emitFileLifecycle("file-duplicate", { fromPath: targetPath, toPath: duplicated.path })
        applyCanvasFileToWorkspace(duplicated)
      }

      setCanvasFileActionModal(null)
    } catch (error) {
      setCanvasFileActionError(
        error instanceof Error ? error.message : "Failed to update canvas file."
      )
    } finally {
      setCanvasFileActionBusy(false)
    }
  }, [
    activeCanvasFile?.path,
    activeProjectId,
    applyCanvasFileToWorkspace,
    buildCurrentCanvasFileAssets,
    buildCurrentCanvasFilePayload,
    canvasFileActionModal,
    canvasFileBrowser,
    canvasFiles,
    createCanvasFile,
    duplicateCanvasFile,
    emitFileLifecycle,
    moveCanvasFile,
    runCanvasPersistenceTask,
    setActiveCanvasFile,
  ])

  const handleConfirmCanvasFileDelete = useCallback(async () => {
    if (!canvasFileDeleteModal) return
    setCanvasFileDeleteBusy(true)
    setCanvasFileDeleteError(null)
    try {
      await runCanvasPersistenceTask(() => deleteCanvasFile(canvasFileDeleteModal.path))
      canvasFileBrowser.removeTrackedPath(canvasFileDeleteModal.path)
      emitFileLifecycle("file-delete", { path: canvasFileDeleteModal.path })
      if (activeCanvasFile?.path === canvasFileDeleteModal.path) {
        setActiveCanvasFile(null)
        setLastSavedCanvasFileSignature(null)
      }
      setCanvasFileDeleteModal(null)
    } catch (error) {
      setCanvasFileDeleteError(
        error instanceof Error ? error.message : "Failed to delete canvas file."
      )
    } finally {
      setCanvasFileDeleteBusy(false)
    }
  }, [
    activeCanvasFile?.path,
    canvasFileBrowser,
    canvasFileDeleteModal,
    deleteCanvasFile,
    emitFileLifecycle,
    runCanvasPersistenceTask,
    setActiveCanvasFile,
  ])

  const handleCloseCanvasFileActionModal = useCallback(() => {
    if (canvasFileActionBusy) return
    setCanvasFileActionModal(null)
    setCanvasFileActionError(null)
  }, [canvasFileActionBusy])

  const handleCloseCanvasFileDeleteModal = useCallback(() => {
    if (canvasFileDeleteBusy) return
    setCanvasFileDeleteModal(null)
    setCanvasFileDeleteError(null)
  }, [canvasFileDeleteBusy])

  return {
    runCanvasPersistenceTask,
    activeCanvasFileTitle,
    canvasFileDirty,
    canvasFileMaterializing,
    ensureCanvasFileMaterialized,
    canvasSaveFailure,
    retryCanvasSave,
    canvasSaveQueued,
    hasRestoredCanvasFile,
    canvasFileActionModal,
    setCanvasFileActionModal,
    canvasFileActionError,
    canvasFileActionBusy,
    canvasFileDeleteModal,
    canvasFileDeleteError,
    canvasFileDeleteBusy,
    handleOpenCanvasFile,
    handleCreateCanvasFile,
    handleSaveCanvasFile,
    handleToggleCanvasFavorite,
    handleRenameCanvasFile,
    handleDuplicateCanvasFile,
    handleDeleteCanvasFile,
    handleSubmitCanvasFileActionModal,
    handleConfirmCanvasFileDelete,
    handleCloseCanvasFileActionModal,
    handleCloseCanvasFileDeleteModal,
  }
}
