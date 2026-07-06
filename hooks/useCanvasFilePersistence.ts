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
import { SerialTaskQueue } from "../utils/serialTaskQueue"
import { blobToDataUrl } from "./useCanvasAddHandlers"

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

function fileNameFromCanvasAsset(
  itemId: string,
  field: CanvasFileAssetField,
  fallbackName: string | undefined,
  sourceUrl: string
) {
  const candidate = (fallbackName || "").trim()
  if (candidate) return candidate

  if (sourceUrl.startsWith("data:")) {
    const mimeMatch = /^data:([^;,]+)?/i.exec(sourceUrl)
    const extension =
      mimeMatch?.[1] === "image/png"
        ? ".png"
        : mimeMatch?.[1] === "image/jpeg"
          ? ".jpg"
          : mimeMatch?.[1] === "image/gif"
            ? ".gif"
            : mimeMatch?.[1] === "image/webp"
              ? ".webp"
              : mimeMatch?.[1] === "video/mp4"
                ? ".mp4"
                : ""
    return `${itemId}-${field}${extension}`
  }

  return `${itemId}-${field}`
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
  const canvasFilePersistenceBusy =
    canvasFilesSaving ||
    canvasFileActionBusy ||
    canvasFileDeleteBusy ||
    canvasPersistencePendingCount > 0
  const canvasFileDirty =
    activeCanvasFile !== null && lastSavedCanvasFileSignature !== currentCanvasFileSignature

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

  useEffect(() => {
    setActiveCanvasFile(null)
    setLastSavedCanvasFileSignature(null)
    setHasRestoredCanvasFile(false)
    setCanvasFileActionModal(null)
    setCanvasFileDeleteModal(null)
    setCanvasFileActionError(null)
    setCanvasFileDeleteError(null)
    setCanvasSaveQueued(false)
  }, [activeProjectId, setActiveCanvasFile])

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !activeCanvasFile ||
      !canvasFileDirty ||
      canvasFilePersistenceBusy
    ) {
      return
    }

    let cancelled = false
    const timeoutId = window.setTimeout(() => {
      void (async () => {
        try {
          const payload = buildCurrentCanvasFilePayload()
          const assets = await buildCurrentCanvasFileAssets()
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
          // Do NOT drop the result on `cancelled`: starting this very save
          // flips canvasFilePersistenceBusy, re-running the effect and
          // cancelling this closure — the save still completed and its
          // signature must be recorded or dirty never clears (endless save
          // loop). Only discard when the active file itself changed.
          if (activeCanvasFilePathRef.current !== activeCanvasFile.path) return
          setActiveCanvasFile(saved)
          setLastSavedCanvasFileSignature(JSON.stringify(payload))
        } catch (error) {
          if (cancelled) return
          window.console.warn(
            "[Canvas] Failed to autosave active canvas file:",
            error instanceof Error ? error.message : error
          )
        }
      })()
    }, 900)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [
    activeCanvasFile,
    buildCurrentCanvasFileAssets,
    buildCurrentCanvasFilePayload,
    canvasFileDirty,
    canvasFilePersistenceBusy,
    runCanvasPersistenceTask,
    saveCanvasFile,
    setActiveCanvasFile,
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
      emitFileLifecycle("file-save", {
        path: saved.path,
        itemCount: payload.document.items.length,
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save canvas file."
      if (typeof window !== "undefined") {
        window.alert(message)
      }
    }
  }, [
    activeCanvasFile,
    activeProjectId,
    buildCurrentCanvasFileAssets,
    buildCurrentCanvasFilePayload,
    emitFileLifecycle,
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
    if (!activeProjectId || canvasFilesLoading || hasRestoredCanvasFile || activeCanvasFile) return
    if (canvasFiles.length === 0) return

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
