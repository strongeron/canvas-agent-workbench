export type CanvasItem =
  | CanvasComponentItem
  | CanvasEmbedItem
  | CanvasMediaItem
  | CanvasArtboardItem

export type CanvasItemInput =
  | Omit<CanvasComponentItem, "id" | "zIndex">
  | Omit<CanvasEmbedItem, "id" | "zIndex">
  | Omit<CanvasMediaItem, "id" | "zIndex">
  | Omit<CanvasArtboardItem, "id" | "zIndex">

export type CanvasItemUpdate =
  | Partial<Omit<CanvasComponentItem, "id">>
  | Partial<Omit<CanvasEmbedItem, "id">>
  | Partial<Omit<CanvasMediaItem, "id">>
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
  /** How to render preview: auto chooses iframe first then snapshot fallback */
  embedPreviewMode?: "auto" | "iframe" | "snapshot" | "live"
  /** Last iframe policy check status */
  embedFrameStatus?: "unknown" | "checking" | "embeddable" | "blocked" | "error"
  /** Human-readable reason when framing is blocked or check fails */
  embedFrameReason?: string
  /** ISO timestamp of last iframe policy check */
  embedFrameCheckedAt?: string
  /** URL used for the last iframe policy check */
  embedFrameCheckedUrl?: string
  /** Snapshot status for blocked/non-embeddable websites */
  embedSnapshotStatus?: "idle" | "loading" | "ready" | "error"
  /** Snapshot image URL (typically remote CDN image) */
  embedSnapshotUrl?: string
  /** Human-readable snapshot status/error */
  embedSnapshotReason?: string
  /** ISO timestamp of the latest snapshot capture */
  embedSnapshotCapturedAt?: string
  /** URL used for latest snapshot capture */
  embedSnapshotSourceUrl?: string
  /** Snapshot provider name (mshots/browserless/custom) */
  embedSnapshotProvider?: string
  /** Live streaming session status */
  embedLiveStatus?: "idle" | "starting" | "active" | "error"
  /** Live session embeddable URL */
  embedLiveUrl?: string
  /** Live provider session id, if present */
  embedLiveSessionId?: string
  /** Live provider name */
  embedLiveProvider?: string
  /** Human-readable live status/error */
  embedLiveReason?: string
  /** URL used to start the current live session */
  embedLiveSourceUrl?: string
  /** ISO timestamp for live session start */
  embedLiveStartedAt?: string
  /** Optional live session expiration timestamp */
  embedLiveExpiresAt?: string
  /** URL capture status for desktop/mobile snapshot pipeline */
  embedCaptureStatus?: "idle" | "capturing" | "ready" | "error"
  /** Capture pipeline reason or error */
  embedCaptureReason?: string
  /** Last capture timestamp */
  embedCaptureCapturedAt?: string
  /** Capture provider used */
  embedCaptureProvider?: string
  /** Last requested capture targets */
  embedCaptureTargets?: Array<"desktop" | "mobile">
  /** Optional persisted iframe state (requires embed to support postMessage protocol) */
  embedState?: unknown
  /** Origin derived from embed URL (used for postMessage) */
  embedOrigin?: string
  /** Version of embed state protocol */
  embedStateVersion?: number
}

export interface CanvasMediaItem extends CanvasItemBase {
  type: "media"
  src: string
  alt?: string
  title?: string
  poster?: string
  mediaKind?: "image" | "video" | "gif"
  controls?: boolean
  autoplay?: boolean
  muted?: boolean
  loop?: boolean
  /** Optional clip start timestamp in seconds for video playback */
  clipStartSec?: number
  /** Optional clip end timestamp in seconds for video playback */
  clipEndSec?: number
  objectFit?: "cover" | "contain" | "fill"
  /** Original page URL when media came from capture pipeline */
  sourceUrl?: string
  /** Provider used for capture/transcode */
  sourceProvider?: string
  /** ISO timestamp when media was generated/captured */
  sourceCapturedAt?: string
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
