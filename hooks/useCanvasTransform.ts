import { useCallback, useEffect, useState, useRef } from "react"

import type { CanvasTransform } from "../types/canvas"

const MIN_SCALE = 0.1
const MAX_SCALE = 4
const ZOOM_STEP = 0.15
const ZOOM_LEVELS = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4]

const DEFAULT_TRANSFORM: CanvasTransform = {
  scale: 1,
  offset: { x: 0, y: 0 },
}

/** Grid cell size in px at scale 1 — the workspace background derives from this too. */
export const CANVAS_GRID_SIZE = 24

/** Commit the gesture to React state this long after the last wheel tick. */
const GESTURE_COMMIT_MS = 140

function applyTransformStyles(
  surfaceEl: HTMLElement | null,
  contentEl: HTMLElement | null,
  next: CanvasTransform
) {
  if (contentEl) {
    contentEl.style.transform = `translate(${next.offset.x}px, ${next.offset.y}px) scale(${next.scale})`
  }
  if (surfaceEl) {
    surfaceEl.style.backgroundSize = `${CANVAS_GRID_SIZE * next.scale}px ${CANVAS_GRID_SIZE * next.scale}px`
    surfaceEl.style.backgroundPosition = `${next.offset.x}px ${next.offset.y}px`
  }
}

export function useCanvasTransform() {
  const [transform, setTransform] = useState<CanvasTransform>(DEFAULT_TRANSFORM)
  const workspaceRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 })

  // FOX2-80: wheel pan/zoom runs compositor-direct. Re-rendering the board on
  // every wheel tick cost ~37-41ms/frame (~26fps) on a 200-node board — >95%
  // of it React reconciliation, measured via Long Animation Frames. When a
  // consumer attaches these refs, wheel gestures write transform/grid styles
  // straight to the DOM (compositor-only properties) and commit to React
  // state once, shortly after the gesture ends. Consumers that don't attach
  // the refs keep the original state-per-tick behavior.
  const gestureSurfaceRef = useRef<HTMLDivElement | null>(null)
  const gestureContentRef = useRef<HTMLDivElement | null>(null)
  const liveTransformRef = useRef<CanvasTransform>(DEFAULT_TRANSFORM)
  const gestureCommitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const gestureActiveRef = useRef(false)

  // Programmatic setters (zoom buttons, fitToView, …) go through state; keep
  // the live mirror in sync so the next gesture starts from committed truth.
  // A re-render mid-gesture would also rewrite the styles from stale state —
  // the next wheel tick (<16ms away during an active gesture) rewrites them.
  useEffect(() => {
    if (!gestureActiveRef.current) {
      liveTransformRef.current = transform
    }
  }, [transform])

  useEffect(() => {
    return () => {
      if (gestureCommitTimer.current) clearTimeout(gestureCommitTimer.current)
    }
  }, [])

  // Store workspace dimensions for centering calculations
  const setWorkspaceDimensions = useCallback((width: number, height: number) => {
    workspaceRef.current = { width, height }
  }, [])

  const zoomIn = useCallback(() => {
    setTransform((prev) => {
      // Find next zoom level
      const currentIndex = ZOOM_LEVELS.findIndex(z => z >= prev.scale)
      const nextIndex = Math.min(currentIndex + 1, ZOOM_LEVELS.length - 1)
      return {
        ...prev,
        scale: ZOOM_LEVELS[nextIndex] ?? prev.scale,
      }
    })
  }, [])

  const zoomOut = useCallback(() => {
    setTransform((prev) => {
      // Find previous zoom level
      const currentIndex = ZOOM_LEVELS.findIndex(z => z >= prev.scale)
      const prevIndex = Math.max(currentIndex - 1, 0)
      return {
        ...prev,
        scale: ZOOM_LEVELS[prevIndex] ?? prev.scale,
      }
    })
  }, [])

  const resetZoom = useCallback(() => {
    setTransform(DEFAULT_TRANSFORM)
  }, [])

  const setScale = useCallback((scale: number) => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale)),
    }))
  }, [])

  // Zoom to specific level with optional center point
  const zoomTo = useCallback((scale: number, centerX?: number, centerY?: number) => {
    setTransform((prev) => {
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale))

      // If center point provided, adjust offset to zoom towards that point
      if (centerX !== undefined && centerY !== undefined) {
        const scaleRatio = newScale / prev.scale
        const newOffsetX = centerX - (centerX - prev.offset.x) * scaleRatio
        const newOffsetY = centerY - (centerY - prev.offset.y) * scaleRatio
        return {
          scale: newScale,
          offset: { x: newOffsetX, y: newOffsetY },
        }
      }

      return { ...prev, scale: newScale }
    })
  }, [])

  const pan = useCallback((deltaX: number, deltaY: number) => {
    setTransform((prev) => ({
      ...prev,
      offset: {
        x: prev.offset.x + deltaX,
        y: prev.offset.y + deltaY,
      },
    }))
  }, [])

  // Pan to specific position
  const panTo = useCallback((x: number, y: number) => {
    setTransform((prev) => ({
      ...prev,
      offset: { x, y },
    }))
  }, [])

  const setViewport = useCallback((viewport: CanvasTransform) => {
    setTransform({
      scale: Math.max(MIN_SCALE, Math.min(MAX_SCALE, Number(viewport?.scale) || 1)),
      offset: {
        x: Number(viewport?.offset?.x) || 0,
        y: Number(viewport?.offset?.y) || 0,
      },
    })
  }, [])

  // Center the view on a specific point
  const centerOn = useCallback((x: number, y: number) => {
    const { width, height } = workspaceRef.current
    setTransform((prev) => ({
      ...prev,
      offset: {
        x: width / 2 - x * prev.scale,
        y: height / 2 - y * prev.scale,
      },
    }))
  }, [])

  // Handle wheel event - supports both zoom (Ctrl/Cmd+scroll) and pan (regular scroll)
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      const computeNext = (prev: CanvasTransform): CanvasTransform => {
        // Zoom with Ctrl/Cmd + scroll
        if (e.ctrlKey || e.metaKey) {
          const rect = e.currentTarget.getBoundingClientRect()
          const mouseX = e.clientX - rect.left
          const mouseY = e.clientY - rect.top

          // Calculate zoom factor based on scroll direction
          const zoomFactor = e.deltaY > 0 ? 1 - ZOOM_STEP : 1 + ZOOM_STEP
          const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev.scale * zoomFactor))

          // Zoom towards mouse position
          const scaleRatio = newScale / prev.scale
          return {
            scale: newScale,
            offset: {
              x: mouseX - (mouseX - prev.offset.x) * scaleRatio,
              y: mouseY - (mouseY - prev.offset.y) * scaleRatio,
            },
          }
        }
        // Pan with regular scroll (infinite canvas)
        return {
          ...prev,
          offset: {
            x: prev.offset.x - e.deltaX,
            y: prev.offset.y - e.deltaY,
          },
        }
      }

      e.preventDefault()

      const contentEl = gestureContentRef.current
      if (!contentEl) {
        // No gesture host attached — original state-per-tick behavior.
        setTransform(computeNext)
        return
      }

      // Compositor-direct path: mutate the DOM now, commit state after the
      // gesture settles. Between ticks the committed state is stale by
      // design; anything that must read mid-gesture coordinates should wait
      // for the commit (≤GESTURE_COMMIT_MS after the last tick).
      gestureActiveRef.current = true
      const next = computeNext(liveTransformRef.current)
      liveTransformRef.current = next
      applyTransformStyles(gestureSurfaceRef.current, contentEl, next)

      if (gestureCommitTimer.current) clearTimeout(gestureCommitTimer.current)
      gestureCommitTimer.current = setTimeout(() => {
        gestureCommitTimer.current = null
        gestureActiveRef.current = false
        setTransform(liveTransformRef.current)
      }, GESTURE_COMMIT_MS)
    },
    []
  )

  // Fit all items in view
  const fitToView = useCallback((items: Array<{ position: { x: number; y: number }; size: { width: number; height: number } }>, padding = 50) => {
    if (items.length === 0) {
      setTransform(DEFAULT_TRANSFORM)
      return
    }

    const { width, height } = workspaceRef.current
    if (width === 0 || height === 0) return

    // Calculate bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const item of items) {
      minX = Math.min(minX, item.position.x)
      minY = Math.min(minY, item.position.y)
      maxX = Math.max(maxX, item.position.x + item.size.width)
      maxY = Math.max(maxY, item.position.y + item.size.height)
    }

    const contentWidth = maxX - minX
    const contentHeight = maxY - minY

    // Calculate scale to fit
    const availableWidth = width - padding * 2
    const availableHeight = height - padding * 2
    const scaleX = availableWidth / contentWidth
    const scaleY = availableHeight / contentHeight
    const scale = Math.max(MIN_SCALE, Math.min(1, Math.min(scaleX, scaleY)))

    // Calculate offset to center
    const offsetX = (width - contentWidth * scale) / 2 - minX * scale
    const offsetY = (height - contentHeight * scale) / 2 - minY * scale

    setTransform({ scale, offset: { x: offsetX, y: offsetY } })
  }, [])

  return {
    transform,
    zoomIn,
    zoomOut,
    resetZoom,
    setScale,
    zoomTo,
    pan,
    panTo,
    setViewport,
    centerOn,
    handleWheel,
    fitToView,
    setWorkspaceDimensions,
    gestureSurfaceRef,
    gestureContentRef,
  }
}
