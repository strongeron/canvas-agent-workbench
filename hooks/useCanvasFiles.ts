import { useCallback, useEffect, useState } from "react"

import type {
  CanvasFileDocument,
  CanvasFileIndexEntry,
  CanvasStateSnapshot,
  CanvasTransform,
} from "../types/canvas"

interface CreateCanvasFileInput {
  title: string
  folder?: string
  document?: CanvasStateSnapshot
  view?: { transform?: CanvasTransform }
}

export function useCanvasFiles(projectId?: string) {
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

        return data.file as { path: string; document: CanvasFileDocument }
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
    async (input: CreateCanvasFileInput) => {
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
            document: input.document,
            view: input.view,
          }),
        })
        const data = await response.json().catch(() => null)
        if (!response.ok || !data?.ok || !data?.file?.document) {
          throw new Error(data?.error || "Failed to create canvas file.")
        }
        await refreshFiles()
        return data.file as { path: string; document: CanvasFileDocument }
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
    async (filePath: string, document: CanvasFileDocument) => {
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
          }),
        })
        const data = await response.json().catch(() => null)
        if (!response.ok || !data?.ok || !data?.file?.document) {
          throw new Error(data?.error || "Failed to save canvas file.")
        }
        await refreshFiles()
        return data.file as { path: string; document: CanvasFileDocument }
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

  return {
    files,
    isLoading,
    isSaving,
    error,
    refreshFiles,
    openCanvasFile,
    createCanvasFile,
    saveCanvasFile,
  }
}
