export type CanvasItem = CanvasComponentItem | CanvasEmbedItem | CanvasArtboardItem

export type CanvasItemInput =
  | Omit<CanvasComponentItem, "id" | "zIndex">
  | Omit<CanvasEmbedItem, "id" | "zIndex">
  | Omit<CanvasArtboardItem, "id" | "zIndex">

export type CanvasItemUpdate =
  | Partial<Omit<CanvasComponentItem, "id">>
  | Partial<Omit<CanvasEmbedItem, "id">>
  | Partial<Omit<CanvasArtboardItem, "id">>

export interface CanvasItemBase {
  id: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  rotation: number // Degrees
  zIndex: number
  /** Group ID if this item belongs to a group */
  groupId?: string
  /** Parent artboard ID if this item is within an artboard */
  parentId?: string
  /** Order within a layout container */
  order?: number
}

export interface CanvasComponentItem extends CanvasItemBase {
  type: "component"
  componentId: string // References component from registry
  variantIndex: number // Which variant of the component
  /** Custom props overrides for interactive components */
  customProps?: Record<string, any>
}

export interface CanvasEmbedItem extends CanvasItemBase {
  type: "embed"
  url: string
  title?: string
  allow?: string
  sandbox?: string
  /** Optional persisted iframe state (requires embed to support postMessage protocol) */
  embedState?: unknown
  /** Origin derived from embed URL (used for postMessage) */
  embedOrigin?: string
  /** Version of embed state protocol */
  embedStateVersion?: number
}

export interface CanvasArtboardItem extends CanvasItemBase {
  type: "artboard"
  name: string
  background?: string
  themeId?: string
  layout: {
    display: "flex" | "grid"
    direction?: "row" | "column"
    align?: "start" | "center" | "end" | "stretch"
    justify?: "start" | "center" | "end" | "between"
    gap?: number
    columns?: number
    padding?: number
  }
}

export interface CanvasGroup {
  id: string
  name: string
  /** Position of the group bounding box */
  position: { x: number; y: number }
  /** Whether the group is collapsed (shows as single unit) */
  isLocked: boolean
  /** Color for group indicator */
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
  /** Currently selected item IDs (supports multi-select) */
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

/** Group colors for visual distinction */
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
