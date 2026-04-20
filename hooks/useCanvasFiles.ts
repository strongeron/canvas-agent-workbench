import { useCallback, useEffect, useState } from "react"

import type {
  CanvasDocumentSurface,
  CanvasFileAssetInput,
  CanvasFileDocument,
  CanvasHtmlBundleImportInput,
  CanvasHtmlBundleLibraryScanResult,
  CanvasHtmlBundleImportResult,
  CanvasFileIndexEntry,
  CanvasStateSnapshot,
  CanvasTransform,
} from "../types/canvas"

interface CreateCanvasFileInput<TDocument = CanvasStateSnapshot, TView = { transform?: CanvasTransform }> {
  title: string
  folder?: string
  surface?: CanvasDocumentSurface
  document?: TDocument
  view?: TView
  assets?: CanvasFileAssetInput[]
}

export function useCanvasFiles<
  TDocument = CanvasStateSnapshot,
  TView = { transform?: CanvasTransform }
>(projectId?: string) {
  const [files, setFiles] = useState<CanvasFileIndexEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshFiles = useCallback(async () => {
    if (!projectId) {
      setFiles([])
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/canvases`)
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.ok || !Array.isArray(data.files)) {
        throw new Error(data?.error || "Failed to load canvas files.")
      }
      setFiles(data.files)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to load canvas files.")
      setFiles([])
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void refreshFiles()
  }, [refreshFiles])

  const openCanvasFile = useCallback(
    async (filePath: string) => {
      if (!projectId) throw new Error("Select a project before opening a canvas file.")
      setError(null)
      try {
        const response = await fetch(
          `/api/projects/${encodeURIComponent(projectId)}/canvases/file?path=${encodeURIComponent(filePath)}`
        )
        const data = await response.json().catch(() => null)
        if (!response.ok || !data?.ok || !data?.file?.document) {
          throw new Error(data?.error || "Failed to open canvas file.")
        }

        return data.file as { path: string; document: CanvasFileDocument<TDocument, TView> }
      } catch (nextError) {
        const message =
          nextError instanceof Error ? nextError.message : "Failed to open canvas file."
        setError(message)
        throw nextError
      }
    },
    [projectId]
  )

  const createCanvasFile = useCallback(
    async (input: CreateCanvasFileInput<TDocument, TView>) => {
      if (!projectId) throw new Error("Select a project before creating a canvas file.")
      setIsSaving(true)
      setError(null)
      try {
        const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/canvases/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: input.title,
            folder: input.folder,
            surface: input.surface,
            document: input.document,
            view: input.view,
            assets: Array.isArray(input.assets) ? input.assets : undefined,
          }),
        })
        const data = await response.json().catch(() => null)
        if (!response.ok || !data?.ok || !data?.file?.document) {
          throw new Error(data?.error || "Failed to create canvas file.")
        }
        await refreshFiles()
        return data.file as { path: string; document: CanvasFileDocument<TDocument, TView> }
      } catch (nextError) {
        const message =
          nextError instanceof Error ? nextError.message : "Failed to create canvas file."
        setError(message)
        throw nextError
      } finally {
        setIsSaving(false)
      }
    },
    [projectId, refreshFiles]
  )

  const saveCanvasFile = useCallback(
    async (
      filePath: string,
      document: CanvasFileDocument<TDocument, TView>,
      assets?: CanvasFileAssetInput[]
    ) => {
      if (!projectId) throw new Error("Select a project before saving a canvas file.")
      setIsSaving(true)
      setError(null)
      try {
        const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/canvases/save`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: filePath,
            document,
            assets: Array.isArray(assets) ? assets : undefined,
          }),
        })
        const data = await response.json().catch(() => null)
        if (!response.ok || !data?.ok || !data?.file?.document) {
          throw new Error(data?.error || "Failed to save canvas file.")
        }
        await refreshFiles()
        return data.file as { path: string; document: CanvasFileDocument<TDocument, TView> }
      } catch (nextError) {
        const message =
          nextError instanceof Error ? nextError.message : "Failed to save canvas file."
        setError(message)
        throw nextError
      } finally {
        setIsSaving(false)
      }
    },
    [projectId, refreshFiles]
  )

  const updateCanvasFileMetadata = useCallback(
    async (
      filePath: string,
      updates: Partial<Pick<CanvasFileDocument["meta"], "title" | "tags" | "favorite" | "archived">>
    ) => {
      if (!projectId) throw new Error("Select a project before updating canvas file metadata.")
      setIsSaving(true)
      setError(null)
      try {
        const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/canvases/metadata`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: filePath,
            ...updates,
          }),
        })
        const data = await response.json().catch(() => null)
        if (!response.ok || !data?.ok || !data?.file?.document) {
          throw new Error(data?.error || "Failed to update canvas file metadata.")
        }
        await refreshFiles()
        return data.file as { path: string; document: CanvasFileDocument<TDocument, TView> }
      } catch (nextError) {
        const message =
          nextError instanceof Error ? nextError.message : "Failed to update canvas file metadata."
        setError(message)
        throw nextError
      } finally {
        setIsSaving(false)
      }
    },
    [projectId, refreshFiles]
  )

  const moveCanvasFile = useCallback(
    async (
      filePath: string,
      updates: {
        nextPath?: string
        title?: string
        folder?: string
      }
    ) => {
      if (!projectId) throw new Error("Select a project before moving a canvas file.")
      setIsSaving(true)
      setError(null)
      try {
        const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/canvases/move`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: filePath,
            ...updates,
          }),
        })
        const data = await response.json().catch(() => null)
        if (!response.ok || !data?.ok || !data?.file?.document) {
          throw new Error(data?.error || "Failed to move canvas file.")
        }
        await refreshFiles()
        return data.file as { path: string; document: CanvasFileDocument<TDocument, TView> }
      } catch (nextError) {
        const message =
          nextError instanceof Error ? nextError.message : "Failed to move canvas file."
        setError(message)
        throw nextError
      } finally {
        setIsSaving(false)
      }
    },
    [projectId, refreshFiles]
  )

  const duplicateCanvasFile = useCallback(
    async (
      filePath: string,
      updates: {
        nextPath?: string
        title?: string
        folder?: string
      } = {}
    ) => {
      if (!projectId) throw new Error("Select a project before duplicating a canvas file.")
      setIsSaving(true)
      setError(null)
      try {
        const response = await fetch(
          `/api/projects/${encodeURIComponent(projectId)}/canvases/duplicate`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              path: filePath,
              ...updates,
            }),
          }
        )
        const data = await response.json().catch(() => null)
        if (!response.ok || !data?.ok || !data?.file?.document) {
          throw new Error(data?.error || "Failed to duplicate canvas file.")
        }
        await refreshFiles()
        return data.file as { path: string; document: CanvasFileDocument<TDocument, TView> }
      } catch (nextError) {
        const message =
          nextError instanceof Error ? nextError.message : "Failed to duplicate canvas file."
        setError(message)
        throw nextError
      } finally {
        setIsSaving(false)
      }
    },
    [projectId, refreshFiles]
  )

  const deleteCanvasFile = useCallback(
    async (filePath: string) => {
      if (!projectId) throw new Error("Select a project before deleting a canvas file.")
      setIsSaving(true)
      setError(null)
      try {
        const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/canvases/delete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: filePath,
          }),
        })
        const data = await response.json().catch(() => null)
        if (!response.ok || !data?.ok || typeof data?.path !== "string") {
          throw new Error(data?.error || "Failed to delete canvas file.")
        }
        await refreshFiles()
        return data as { ok: true; path: string }
      } catch (nextError) {
        const message =
          nextError instanceof Error ? nextError.message : "Failed to delete canvas file."
        setError(message)
        throw nextError
      } finally {
        setIsSaving(false)
      }
    },
    [projectId, refreshFiles]
  )

  const importCanvasHtmlBundle = useCallback(
    async (filePath: string, bundle: CanvasHtmlBundleImportInput) => {
      if (!projectId) throw new Error("Select a project before importing an HTML bundle.")
      setIsSaving(true)
      setError(null)
      try {
        const response = await fetch(
          `/api/projects/${encodeURIComponent(projectId)}/canvases/html-bundle/import`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              path: filePath,
              bundle,
            }),
          }
        )
        const data = await response.json().catch(() => null)
        if (!response.ok || !data?.ok || !data?.htmlBundle) {
          throw new Error(data?.error || "Failed to import HTML bundle.")
        }
        return data.htmlBundle as CanvasHtmlBundleImportResult
      } catch (nextError) {
        const message =
          nextError instanceof Error ? nextError.message : "Failed to import HTML bundle."
        setError(message)
        throw nextError
      } finally {
        setIsSaving(false)
      }
    },
    [projectId]
  )

  const scanCanvasHtmlBundleLibrary = useCallback(
    async (rootPath: string) => {
      if (!projectId) throw new Error("Select a project before scanning an HTML bundle library.")
      setError(null)
      try {
        const response = await fetch(
          `/api/projects/${encodeURIComponent(projectId)}/canvases/html-bundles?rootPath=${encodeURIComponent(rootPath)}`
        )
        const data = await response.json().catch(() => null)
        if (!response.ok || !data?.ok || !data?.result) {
          throw new Error(data?.error || "Failed to scan HTML bundle library.")
        }
        return data.result as CanvasHtmlBundleLibraryScanResult
      } catch (nextError) {
        const message =
          nextError instanceof Error ? nextError.message : "Failed to scan HTML bundle library."
        setError(message)
        throw nextError
      }
    },
    [projectId]
  )

  return {
    files,
    isLoading,
    isSaving,
    error,
    refreshFiles,
    openCanvasFile,
    createCanvasFile,
    saveCanvasFile,
    updateCanvasFileMetadata,
    moveCanvasFile,
    duplicateCanvasFile,
    deleteCanvasFile,
    importCanvasHtmlBundle,
    scanCanvasHtmlBundleLibrary,
  }
}
