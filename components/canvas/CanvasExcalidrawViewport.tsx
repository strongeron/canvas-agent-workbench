import { Excalidraw } from "@excalidraw/excalidraw"
import "@excalidraw/excalidraw/index.css"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import type { CanvasExcalidrawScene } from "../../types/canvas"

interface CanvasExcalidrawViewportProps {
  title?: string
  scene?: CanvasExcalidrawScene
  interactMode: boolean
  onSceneChange?: (scene: CanvasExcalidrawScene) => void
}

function cloneSerializable<T>(value: T): T {
  return JSON.parse(JSON.stringify(value ?? null)) as T
}

function createEmptyScene() {
  return {
    elements: [],
    appState: {
      viewBackgroundColor: "#ffffff",
    },
    files: {},
  }
}

function normalizeScene(scene?: CanvasExcalidrawScene) {
  if (!scene) return createEmptyScene()
  return {
    elements: Array.isArray(scene.elements) ? cloneSerializable(scene.elements) : [],
    appState: scene.appState ? cloneSerializable(scene.appState) : { viewBackgroundColor: "#ffffff" },
    files: scene.files ? cloneSerializable(scene.files) : {},
  }
}

function pickPersistedAppState(appState: Record<string, unknown> | undefined) {
  if (!appState) {
    return { viewBackgroundColor: "#ffffff" }
  }
  return {
    viewBackgroundColor:
      typeof appState.viewBackgroundColor === "string"
        ? appState.viewBackgroundColor
        : "#ffffff",
    theme: appState.theme,
    gridSize: appState.gridSize,
    currentItemStrokeColor: appState.currentItemStrokeColor,
    currentItemBackgroundColor: appState.currentItemBackgroundColor,
    currentItemFillStyle: appState.currentItemFillStyle,
    currentItemStrokeWidth: appState.currentItemStrokeWidth,
    currentItemStrokeStyle: appState.currentItemStrokeStyle,
    currentItemRoughness: appState.currentItemRoughness,
    currentItemOpacity: appState.currentItemOpacity,
    currentItemFontFamily: appState.currentItemFontFamily,
    currentItemFontSize: appState.currentItemFontSize,
    currentItemTextAlign: appState.currentItemTextAlign,
  }
}

export function CanvasExcalidrawViewport({
  title,
  scene,
  interactMode,
  onSceneChange,
}: CanvasExcalidrawViewportProps) {
  const normalizedScene = useMemo(() => normalizeScene(scene), [scene])
  const sceneHash = useMemo(() => JSON.stringify(normalizedScene), [normalizedScene])
  const [api, setApi] = useState<any>(null)
  const applyingExternalSceneRef = useRef(false)
  const committedSceneHashRef = useRef<string>(sceneHash)
  const persistTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    if (!api) return
    if (sceneHash === committedSceneHashRef.current) return
    applyingExternalSceneRef.current = true
    api.updateScene({
      elements: normalizedScene.elements ?? [],
      appState: normalizedScene.appState ?? {},
      collaborators: new Map(),
      captureUpdate: 3,
    })
    if (normalizedScene.files) {
      api.addFiles(normalizedScene.files)
    }
    committedSceneHashRef.current = sceneHash
    queueMicrotask(() => {
      applyingExternalSceneRef.current = false
    })
  }, [api, normalizedScene, sceneHash])

  useEffect(
    () => () => {
      if (persistTimeoutRef.current !== null) {
        window.clearTimeout(persistTimeoutRef.current)
      }
    },
    []
  )

  const handleChange = useCallback(
    (elements: readonly any[], appState: any, files: any) => {
      if (!onSceneChange) return
      if (applyingExternalSceneRef.current) return
      const nextScene: CanvasExcalidrawScene = {
        elements: cloneSerializable([...elements]),
        appState: pickPersistedAppState(appState as Record<string, unknown>),
        files: cloneSerializable(files),
      }
      const nextHash = JSON.stringify(nextScene)
      if (nextHash === committedSceneHashRef.current) return
      if (persistTimeoutRef.current !== null) {
        window.clearTimeout(persistTimeoutRef.current)
      }
      persistTimeoutRef.current = window.setTimeout(() => {
        committedSceneHashRef.current = nextHash
        onSceneChange(nextScene)
      }, 220)
    },
    [onSceneChange]
  )

  return (
    <div className={`relative h-full w-full ${interactMode ? "" : "pointer-events-none"}`}>
      <Excalidraw
        initialData={normalizedScene as any}
        onChange={handleChange}
        viewModeEnabled={!interactMode}
        excalidrawAPI={(nextApi) => setApi(nextApi)}
        name={title || "Canvas Excalidraw"}
        detectScroll={false}
        UIOptions={{
          canvasActions: {
            loadScene: false,
            saveToActiveFile: false,
            saveAsImage: false,
            export: {
              saveFileToDisk: false,
            },
          },
        }}
      />
      <div className="pointer-events-none absolute right-2 top-2 rounded bg-surface-900/80 px-2 py-1 text-[10px] text-white">
        Excalidraw
      </div>
    </div>
  )
}
