import { useCallback, useState, useRef } from "react"

import type { CanvasTransform } from "../types/canvas"

const MIN_SCALE = 0.1
const MAX_SCALE = 4
const ZOOM_STEP = 0.15
const ZOOM_LEVELS = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4]

const DEFAULT_TRANSFORM: CanvasTransform = {
  scale: 1,
  offset: { x: 0, y: 0 },
}

export function useCanvasTransform() {
  const [transform, setTransform] = useState<CanvasTransform>(DEFAULT_TRANSFORM)
  const workspaceRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 })

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
      // Zoom with Ctrl/Cmd + scroll
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const rect = e.currentTarget.getBoundingClientRect()
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top

        // Calculate zoom factor based on scroll direction
        const zoomFactor = e.deltaY > 0 ? 1 - ZOOM_STEP : 1 + ZOOM_STEP

        setTransform((prev) => {
          const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev.scale * zoomFactor))

          // Zoom towards mouse position
          const scaleRatio = newScale / prev.scale
          const newOffsetX = mouseX - (mouseX - prev.offset.x) * scaleRatio
          const newOffsetY = mouseY - (mouseY - prev.offset.y) * scaleRatio

          return {
            scale: newScale,
            offset: { x: newOffsetX, y: newOffsetY },
          }
        })
      } else {
        // Pan with regular scroll (infinite canvas)
        e.preventDefault()
        setTransform((prev) => ({
          ...prev,
          offset: {
            x: prev.offset.x - e.deltaX,
            y: prev.offset.y - e.deltaY,
          },
        }))
      }
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
    centerOn,
    handleWheel,
    fitToView,
    setWorkspaceDimensions,
  }
}
