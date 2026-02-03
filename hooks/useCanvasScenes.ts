/**
 * useCanvasScenes - Manage saved canvas scenes/templates
 *
 * Allows users to save, load, and manage canvas arrangements as reusable scenes.
 */

import { useCallback, useEffect, useState } from "react"

import type { CanvasItem, CanvasGroup, CanvasScene } from "../types/canvas"

const SCENES_DB_NAME = "gallery-canvas"
const SCENES_DB_VERSION = 1
const SCENES_STORE = "scenes"
const SCENE_SCHEMA_VERSION = 1

interface SceneRecord {
  id: string
  namespace: string
  sceneId: string
  schemaVersion: number
  scene: CanvasScene
  updatedAt: string
}

const DEFAULT_SCENES: CanvasScene[] = []

function openScenesDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("IndexedDB not available"))
      return
    }

    const request = indexedDB.open(SCENES_DB_NAME, SCENES_DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(SCENES_STORE)) {
        const store = db.createObjectStore(SCENES_STORE, { keyPath: "id" })
        store.createIndex("namespace", "namespace", { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB"))
  })
}

function getNamespace(storageKey: string) {
  return storageKey
}

function getRecordId(namespace: string, sceneId: string) {
  return `${namespace}::${sceneId}`
}

async function getScenesFromDb(namespace: string): Promise<CanvasScene[]> {
  const db = await openScenesDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SCENES_STORE, "readonly")
    const store = tx.objectStore(SCENES_STORE)
    const index = store.index("namespace")
    const request = index.getAll(namespace)

    request.onsuccess = () => {
      const records = (request.result as SceneRecord[]) || []
      resolve(records.map((record) => record.scene))
    }
    request.onerror = () => reject(request.error ?? new Error("Failed to read scenes"))
    tx.oncomplete = () => db.close()
  })
}

async function putSceneInDb(namespace: string, scene: CanvasScene) {
  const db = await openScenesDb()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(SCENES_STORE, "readwrite")
    const store = tx.objectStore(SCENES_STORE)
    const record: SceneRecord = {
      id: getRecordId(namespace, scene.id),
      namespace,
      sceneId: scene.id,
      schemaVersion: SCENE_SCHEMA_VERSION,
      scene,
      updatedAt: new Date().toISOString(),
    }
    store.put(record)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => reject(tx.error ?? new Error("Failed to save scene"))
  })
}

async function deleteSceneFromDb(namespace: string, sceneId: string) {
  const db = await openScenesDb()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(SCENES_STORE, "readwrite")
    const store = tx.objectStore(SCENES_STORE)
    store.delete(getRecordId(namespace, sceneId))
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => reject(tx.error ?? new Error("Failed to delete scene"))
  })
}

async function clearScenesFromDb(namespace: string) {
  const db = await openScenesDb()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(SCENES_STORE, "readwrite")
    const store = tx.objectStore(SCENES_STORE)
    const index = store.index("namespace")
    const request = index.openCursor(IDBKeyRange.only(namespace))
    request.onsuccess = () => {
      const cursor = request.result
      if (cursor) {
        cursor.delete()
        cursor.continue()
      }
    }
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => reject(tx.error ?? new Error("Failed to clear scenes"))
  })
}

function loadScenesFromLocalStorage(storageKey: string): CanvasScene[] {
  if (typeof window === "undefined") return DEFAULT_SCENES
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return DEFAULT_SCENES
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed?.scenes)) return parsed.scenes as CanvasScene[]
    if (Array.isArray(parsed)) return parsed as CanvasScene[]
    return DEFAULT_SCENES
  } catch {
    return DEFAULT_SCENES
  }
}

export function useCanvasScenes(storageKey = "gallery-canvas-scenes") {
  const namespace = getNamespace(storageKey)
  const [scenes, setScenes] = useState<CanvasScene[]>(DEFAULT_SCENES)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      try {
        const dbScenes = await getScenesFromDb(namespace)
        if (!isMounted) return
        if (dbScenes.length > 0) {
          setScenes(dbScenes)
        } else {
          const localScenes = loadScenesFromLocalStorage(storageKey)
          setScenes(localScenes)
          for (const scene of localScenes) {
            await putSceneInDb(namespace, scene)
          }
        }
      } catch {
        const localScenes = loadScenesFromLocalStorage(storageKey)
        if (isMounted) setScenes(localScenes)
      } finally {
        if (isMounted) setIsReady(true)
      }
    }
    void load()
    return () => {
      isMounted = false
    }
  }, [namespace, storageKey])

  /**
   * Save current canvas state as a new scene
   */
  const saveScene = useCallback(
    (name: string, items: CanvasItem[], groups: CanvasGroup[]) => {
      if (items.length === 0) return null

      const scene: CanvasScene = {
        id: `scene-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name: name.trim() || `Scene ${scenes.length + 1}`,
        items: items.map((item) => ({ ...item })), // Deep copy
        groups: groups.map((group) => ({ ...group })), // Deep copy
        createdAt: new Date().toISOString(),
      }

      setScenes((prev) => [...prev, scene])
      void putSceneInDb(namespace, scene).catch(() => {
        // Ignore IndexedDB errors (local state already updated)
      })

      return scene.id
    },
    [namespace, scenes.length]
  )

  /**
   * Update an existing scene
   */
  const updateScene = useCallback(
    (sceneId: string, updates: Partial<Omit<CanvasScene, "id" | "createdAt">>) => {
      setScenes((prev) => {
        const nextScenes = prev.map((scene) =>
          scene.id === sceneId ? { ...scene, ...updates } : scene
        )
        const updated = nextScenes.find((scene) => scene.id === sceneId)
        if (updated) {
          void putSceneInDb(namespace, updated).catch(() => {})
        }
        return nextScenes
      })
    },
    [namespace]
  )

  /**
   * Rename a scene
   */
  const renameScene = useCallback(
    (sceneId: string, newName: string) => {
      updateScene(sceneId, { name: newName.trim() })
    },
    [updateScene]
  )

  /**
   * Delete a scene
   */
  const deleteScene = useCallback(
    (sceneId: string) => {
      setScenes((prev) => prev.filter((scene) => scene.id !== sceneId))
      void deleteSceneFromDb(namespace, sceneId).catch(() => {})
    },
    [namespace]
  )

  /**
   * Get a scene by ID
   */
  const getScene = useCallback(
    (sceneId: string) => {
      return scenes.find((scene) => scene.id === sceneId) || null
    },
    [scenes]
  )

  /**
   * Duplicate a scene
   */
  const duplicateScene = useCallback(
    (sceneId: string) => {
      const original = scenes.find((scene) => scene.id === sceneId)
      if (!original) return null

      const newScene: CanvasScene = {
        ...original,
        id: `scene-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name: `${original.name} (Copy)`,
        createdAt: new Date().toISOString(),
        items: original.items.map((item) => ({
          ...item,
          id: `canvas-item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        })),
      }

      setScenes((prev) => [...prev, newScene])
      void putSceneInDb(namespace, newScene).catch(() => {})

      return newScene.id
    },
    [namespace, scenes]
  )

  /**
   * Export scene as JSON
   */
  const exportScene = useCallback(
    (sceneId: string) => {
      const scene = scenes.find((s) => s.id === sceneId)
      if (!scene) return null

      return JSON.stringify(scene, null, 2)
    },
    [scenes]
  )

  /**
   * Import scene from JSON
   */
  const importScene = useCallback(
    (jsonString: string) => {
      try {
        const imported = JSON.parse(jsonString) as CanvasScene

        // Validate required fields
        if (!imported.name || !Array.isArray(imported.items)) {
          throw new Error("Invalid scene format")
        }

        // Generate new IDs to avoid conflicts
        const newScene: CanvasScene = {
          ...imported,
          id: `scene-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          name: imported.name,
          createdAt: new Date().toISOString(),
          items: imported.items.map((item) => ({
            ...item,
            id: `canvas-item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          })),
          groups: (imported.groups || []).map((group) => ({
            ...group,
            id: `group-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          })),
        }

        setScenes((prev) => [...prev, newScene])
        void putSceneInDb(namespace, newScene).catch(() => {})

        return newScene.id
      } catch {
        console.error("Failed to import scene")
        return null
      }
    },
    [namespace]
  )

  /**
   * Clear all scenes
   */
  const clearAllScenes = useCallback(() => {
    setScenes(DEFAULT_SCENES)
    void clearScenesFromDb(namespace).catch(() => {})
  }, [namespace])

  return {
    scenes,
    isReady,
    saveScene,
    updateScene,
    renameScene,
    deleteScene,
    getScene,
    duplicateScene,
    exportScene,
    importScene,
    clearAllScenes,
  }
}
