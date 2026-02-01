/**
 * Gallery POC - Canvas Type Definitions
 */

export interface CanvasItem {
  id: string
  componentId: string
  variantIndex: number
  position: { x: number; y: number }
  size: { width: number; height: number }
  rotation: number
  zIndex: number
  customProps?: Record<string, any>
  groupId?: string
}

export interface CanvasGroup {
  id: string
  name: string
  position: { x: number; y: number }
  isLocked: boolean
  color: string
}

export interface CanvasScene {
  id: string
  name: string
  items: CanvasItem[]
  groups: CanvasGroup[]
  createdAt: string
  thumbnail?: string
}

export interface CanvasState {
  items: CanvasItem[]
  groups: CanvasGroup[]
  nextZIndex: number
  selectedIds: string[]
}

export interface CanvasTransform {
  scale: number
  offset: { x: number; y: number }
}

export interface DragData {
  componentId: string
  variantIndex: number
}

export const GROUP_COLORS = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#84cc16", // lime
] as const
