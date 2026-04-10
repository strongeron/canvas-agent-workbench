import { useEffect, useMemo } from "react"

import type { CanvasDocumentSurface, CanvasFileIndexEntry } from "../types/canvas"
import { useLocalStorage } from "./useLocalStorage"

export type CanvasFolderTreeEntry = {
  folder: string
  label: string
  depth: number
  count: number
}

function dedupePreserveOrder(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

function getFolderPath(filePath: string) {
  return filePath.split("/").slice(0, -1).join("/") || "root"
}

export function useCanvasFileBrowserState(
  storageKeyPrefix: string,
  files: CanvasFileIndexEntry[],
  activePath: string | null,
  surface?: CanvasDocumentSurface
) {
  const scope = surface || "all"
  const [recentPaths, setRecentPaths] = useLocalStorage<string[]>(
    `${storageKeyPrefix}-canvas-files-recent-${scope}`,
    []
  )
  const [openTabPaths, setOpenTabPaths] = useLocalStorage<string[]>(
    `${storageKeyPrefix}-canvas-files-tabs-${scope}`,
    []
  )
  const [selectedFolder, setSelectedFolder] = useLocalStorage<string>(
    `${storageKeyPrefix}-canvas-files-folder-${scope}`,
    "all"
  )

  useEffect(() => {
    if (!activePath) return
    setRecentPaths((prev) => dedupePreserveOrder([activePath, ...prev]).slice(0, 20))
    setOpenTabPaths((prev) => dedupePreserveOrder([...prev, activePath]).slice(0, 12))
  }, [activePath, setOpenTabPaths, setRecentPaths])

  useEffect(() => {
    if (selectedFolder === "all") return
    const nextFolderSet = new Set(files.map((file) => getFolderPath(file.path)))
    if (!nextFolderSet.has(selectedFolder)) {
      setSelectedFolder("all")
    }
  }, [files, selectedFolder, setSelectedFolder])

  const fileMap = useMemo(() => {
    const map = new Map<string, CanvasFileIndexEntry>()
    files.forEach((file) => {
      map.set(file.path, file)
    })
    return map
  }, [files])

  const openTabs = useMemo(
    () => openTabPaths.map((path) => fileMap.get(path)).filter(Boolean) as CanvasFileIndexEntry[],
    [fileMap, openTabPaths]
  )
  const recentFiles = useMemo(
    () => recentPaths.map((path) => fileMap.get(path)).filter(Boolean) as CanvasFileIndexEntry[],
    [fileMap, recentPaths]
  )
  const favoriteFiles = useMemo(
    () => files.filter((file) => file.favorite),
    [files]
  )
  const folderTreeEntries = useMemo(() => {
    const counts = new Map<string, number>()
    files.forEach((file) => {
      const folder = getFolderPath(file.path)
      if (folder === "root") {
        counts.set("root", (counts.get("root") || 0) + 1)
        return
      }

      const segments = folder.split("/").filter(Boolean)
      let currentFolder = ""
      segments.forEach((segment) => {
        currentFolder = currentFolder ? `${currentFolder}/${segment}` : segment
        counts.set(currentFolder, (counts.get(currentFolder) || 0) + 1)
      })
    })
    return Array.from(counts.entries())
      .map(([folder, count]) => ({
        folder,
        label: folder === "root" ? "root" : folder.split("/").at(-1) || folder,
        depth: folder === "root" ? 0 : folder.split("/").length - 1,
        count,
      }))
      .sort((left, right) => left.folder.localeCompare(right.folder))
  }, [files])

  const visibleFiles = useMemo(() => {
    if (selectedFolder === "all") return files
    if (selectedFolder === "root") {
      return files.filter((file) => getFolderPath(file.path) === "root")
    }
    return files.filter((file) => {
      const folder = getFolderPath(file.path)
      return folder === selectedFolder || folder.startsWith(`${selectedFolder}/`)
    })
  }, [files, selectedFolder])

  const closeOpenTab = (path: string) => {
    setOpenTabPaths((prev) => prev.filter((entry) => entry !== path))
  }

  return {
    recentFiles,
    openTabs,
    favoriteFiles,
    folderEntries: folderTreeEntries,
    folderTreeEntries,
    visibleFiles,
    selectedFolder,
    setSelectedFolder,
    closeOpenTab,
  }
}
