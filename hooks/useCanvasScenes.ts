/**
 * useCanvasScenes - Manage saved canvas scenes/templates
 *
 * Allows users to save, load, and manage canvas arrangements as reusable scenes.
 */

import { useCallback } from "react"

import { useLocalStorage } from "./useLocalStorage"

import type { CanvasItem, CanvasGroup, CanvasScene } from "../types/canvas"

interface ScenesState {
  scenes: CanvasScene[]
}

const DEFAULT_SCENES_STATE: ScenesState = {
  scenes: [],
}

export function useCanvasScenes(storageKey = "gallery-canvas-scenes") {
  const [state, setState] = useLocalStorage<ScenesState>(storageKey, DEFAULT_SCENES_STATE)

  /**
   * Save current canvas state as a new scene
   */
  const saveScene = useCallback(
    (name: string, items: CanvasItem[], groups: CanvasGroup[]) => {
      if (items.length === 0) return null

      const scene: CanvasScene = {
        id: `scene-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name: name.trim() || `Scene ${state.scenes.length + 1}`,
        items: items.map((item) => ({ ...item })), // Deep copy
        groups: groups.map((group) => ({ ...group })), // Deep copy
        createdAt: new Date().toISOString(),
      }

      setState((prev) => ({
        ...prev,
        scenes: [...prev.scenes, scene],
      }))

      return scene.id
    },
    [state.scenes.length, setState]
  )

  /**
   * Update an existing scene
   */
  const updateScene = useCallback(
    (sceneId: string, updates: Partial<Omit<CanvasScene, "id" | "createdAt">>) => {
      setState((prev) => ({
        ...prev,
        scenes: prev.scenes.map((scene) =>
          scene.id === sceneId ? { ...scene, ...updates } : scene
        ),
      }))
    },
    [setState]
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
      setState((prev) => ({
        ...prev,
        scenes: prev.scenes.filter((scene) => scene.id !== sceneId),
      }))
    },
    [setState]
  )

  /**
   * Get a scene by ID
   */
  const getScene = useCallback(
    (sceneId: string) => {
      return state.scenes.find((scene) => scene.id === sceneId) || null
    },
    [state.scenes]
  )

  /**
   * Duplicate a scene
   */
  const duplicateScene = useCallback(
    (sceneId: string) => {
      const original = state.scenes.find((scene) => scene.id === sceneId)
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

      setState((prev) => ({
        ...prev,
        scenes: [...prev.scenes, newScene],
      }))

      return newScene.id
    },
    [state.scenes, setState]
  )

  /**
   * Export scene as JSON
   */
  const exportScene = useCallback(
    (sceneId: string) => {
      const scene = state.scenes.find((s) => s.id === sceneId)
      if (!scene) return null

      return JSON.stringify(scene, null, 2)
    },
    [state.scenes]
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

        setState((prev) => ({
          ...prev,
          scenes: [...prev.scenes, newScene],
        }))

        return newScene.id
      } catch {
        console.error("Failed to import scene")
        return null
      }
    },
    [setState]
  )

  /**
   * Clear all scenes
   */
  const clearAllScenes = useCallback(() => {
    setState(DEFAULT_SCENES_STATE)
  }, [setState])

  return {
    scenes: state.scenes,
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
