import type {
  AgentCapabilityStatus,
  AgentWorkspaceEvent,
} from "./agentNative"
import type { DesignSystemScaleConfig } from "../projects/design-system-foundation/designSystemApi"
import type { ColorCanvasState } from "./colorCanvas"
import type { ThemeOption } from "./theme"

export type CanvasItem =
  | CanvasComponentItem
  | CanvasEmbedItem
  | CanvasHtmlItem
  | CanvasMediaItem
  | CanvasMermaidItem
  | CanvasExcalidrawItem
  | CanvasMarkdownItem
  | CanvasArtboardItem

export type CanvasItemInput =
  | Omit<CanvasComponentItem, "id" | "zIndex">
  | Omit<CanvasEmbedItem, "id" | "zIndex">
  | Omit<CanvasHtmlItem, "id" | "zIndex">
  | Omit<CanvasMediaItem, "id" | "zIndex">
  | Omit<CanvasMermaidItem, "id" | "zIndex">
  | Omit<CanvasExcalidrawItem, "id" | "zIndex">
  | Omit<CanvasMarkdownItem, "id" | "zIndex">
  | Omit<CanvasArtboardItem, "id" | "zIndex">

export type CanvasItemUpdate =
  | Partial<Omit<CanvasComponentItem, "id">>
  | Partial<Omit<CanvasEmbedItem, "id">>
  | Partial<Omit<CanvasHtmlItem, "id">>
  | Partial<Omit<CanvasMediaItem, "id">>
  | Partial<Omit<CanvasMermaidItem, "id">>
  | Partial<Omit<CanvasExcalidrawItem, "id">>
  | Partial<Omit<CanvasMarkdownItem, "id">>
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

export interface CanvasHtmlItem extends CanvasItemBase {
  type: "html"
  src: string
  title?: string
  sandbox?: string
  background?: string
  entryAsset?: string
  sourcePath?: string
  sourceImportedAt?: string
}

export type CanvasMermaidTheme = "default" | "neutral" | "dark" | "forest" | "base"

export interface CanvasMermaidItem extends CanvasItemBase {
  type: "mermaid"
  source: string
  title?: string
  mermaidTheme?: CanvasMermaidTheme
  background?: string
}

export interface CanvasExcalidrawScene {
  elements?: unknown[]
  appState?: Record<string, unknown>
  files?: Record<string, unknown>
}

export interface CanvasExcalidrawItem extends CanvasItemBase {
  type: "excalidraw"
  title?: string
  scene?: CanvasExcalidrawScene
  sourceMermaid?: string
}

export interface CanvasMarkdownItem extends CanvasItemBase {
  type: "markdown"
  source: string
  title?: string
  background?: string
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

export type CanvasDocumentSurface = "canvas" | "color-audit" | "system-canvas"

export interface CanvasFileMeta {
  id: string
  title: string
  slug: string
  projectId: string
  createdAt: string
  updatedAt: string
  tags: string[]
  favorite: boolean
  archived: boolean
}

export type CanvasFileAssetField = "src" | "poster" | "embedSnapshotUrl"

export interface CanvasFileAssetInput {
  itemId: string
  field?: CanvasFileAssetField
  fileName?: string
  dataUrl?: string
  filePath?: string
}

export interface CanvasHtmlBundleFileInput {
  relativePath: string
  dataUrl?: string
  filePath?: string
  textContent?: string
}

export interface CanvasHtmlBundleImportInput {
  entryFile?: string
  title?: string
  directoryPath?: string
  replaceEntryAsset?: string
  files?: CanvasHtmlBundleFileInput[]
}

export interface CanvasHtmlBundleImportResult {
  assetRoot: string
  entryAsset: string
  entryUrl: string
  assetCount: number
  importedAt: string
}

export interface CanvasHtmlBundleLibraryEntry {
  id: string
  directoryPath: string
  relativeDirectory: string
  entryFiles: string[]
  defaultEntryFile: string
}

export interface CanvasHtmlBundleLibraryScanResult {
  rootPath: string
  scannedAt: string
  entries: CanvasHtmlBundleLibraryEntry[]
}

export interface ColorCanvasFileDocumentData {
  state: ColorCanvasState
  canvasMode: "color-audit" | "system-canvas"
  canvasViewMode?: string
  colorAuditLayoutMode?: string
  templateKitId?: string
  autoContrastEnabled?: boolean
  contrastRules?: unknown[]
  designSystemConfig?: DesignSystemScaleConfig
  viewNodePositions?: Record<string, { x: number; y: number }>
}

export interface ColorCanvasFileViewState {
  colorAuditTransform?: CanvasTransform
  systemCanvasTransform?: CanvasTransform
}

export interface CanvasFileDocument<
  TDocument = CanvasStateSnapshot,
  TView = { transform?: CanvasTransform }
> {
  kind: "gallery-poc.canvas"
  schemaVersion: number
  surface: CanvasDocumentSurface
  meta: CanvasFileMeta
  document: TDocument
  view?: TView
}

export type CanvasWorkspaceFileDocument = CanvasFileDocument<
  CanvasStateSnapshot,
  { transform?: CanvasTransform }
>

export type ColorCanvasWorkspaceFileDocument = CanvasFileDocument<
  ColorCanvasFileDocumentData,
  ColorCanvasFileViewState
>

export interface CanvasFileIndexEntry {
  id: string
  projectId: string
  path: string
  title: string
  surface: CanvasDocumentSurface
  updatedAt: string
  createdAt: string
  tags: string[]
  favorite: boolean
  archived: boolean
  itemCount: number
  groupCount: number
  thumbnail?: string
}

export interface CanvasState {
  items: CanvasItem[]
  groups: CanvasGroup[]
  nextZIndex: number
  /** Currently selected item IDs (supports multi-select) */
  selectedIds: string[]
}

export type CanvasStateSnapshot = CanvasState

export type CanvasRemoteOperation =
  | {
      type: "create_item"
      item: CanvasItem
      select?: boolean
    }
  | {
      type: "create_items"
      items: CanvasItem[]
      select?: boolean
    }
  | {
      type: "update_item"
      id: string
      updates: CanvasItemUpdate
    }
  | {
      type: "delete_items"
      ids: string[]
    }
  | {
      type: "select_items"
      ids: string[]
    }
  | {
      type: "clear_canvas"
    }
  | {
      type: "create_group"
      group: CanvasGroup
      itemIds: string[]
      select?: boolean
    }
  | {
      type: "update_group"
      id: string
      updates: Partial<Omit<CanvasGroup, "id">>
    }
  | {
      type: "delete_group"
      id: string
    }
  | {
      type: "set_viewport"
      viewport: CanvasTransform
    }
  | {
      type: "focus_items"
      ids: string[]
      padding?: number
      select?: boolean
    }

export interface CanvasAgentDefinition {
  id: string
  label: string
  description: string
  launchCommand: string
  transport: "cli" | "pty"
  mcpSupport: "native" | "planned"
  configScope: "global" | "project" | "user"
  status: AgentCapabilityStatus
  configMode: "inline-overrides" | "strict-config-file"
  startupMode: "inline-bootstrap" | "append-system-prompt"
  guardNotes?: string | null
}

export interface CanvasAgentSession {
  id: string
  projectId: string
  agentId: string
  agentLabel: string
  title: string
  cwd: string
  agentCommand: string
  launchCommand: string
  toolCommand: string
  mcpServerName?: string | null
  mcpServerCommand?: string | null
  mcpConfigPath?: string | null
  startupGuidance?: string | null
  transport: "manual-cli" | "pty"
  status: "configured" | "starting" | "running" | "stopped" | "exited" | "error"
  createdAt: string
  updatedAt: string
  cols?: number
  rows?: number
  pid?: number
  lastStartedAt?: string | null
  endedAt?: string | null
  exitCode?: number | null
  errorMessage?: string | null
}

export interface CanvasAgentTranscriptEntry {
  id: string
  sessionId: string
  at: string
  kind:
    | "session-created"
    | "session-started"
    | "session-stopped"
    | "session-exited"
    | "session-error"
    | "tool-call"
    | "canvas-operation"
    | "output"
  text: string
  meta?: Record<string, string | number | boolean | null>
}

export interface CanvasAgentStateHistoryEntry {
  id: string
  at: string
  source: string
  itemCount: number
  groupCount: number
  selectedIds: string[]
  operationType?: CanvasRemoteOperation["type"] | null
  sessionId?: string | null
  toolName?: string | null
}

export interface CanvasAgentPrimitivePropOption {
  value: unknown
  label: string
}

export interface CanvasAgentPrimitivePropSchema {
  type: string
  label?: string
  defaultValue?: unknown
  options?: CanvasAgentPrimitivePropOption[]
  min?: number
  max?: number
  step?: number
  placeholder?: string
  optional?: boolean
  description?: string
}

export interface CanvasAgentPrimitiveVariant {
  name: string
  description: string
  props: Record<string, unknown>
  interactiveSchema?: Record<string, CanvasAgentPrimitivePropSchema>
}

export interface CanvasAgentPrimitive {
  primitiveId: string
  entryId: string
  name: string
  description?: string
  category: string
  importPath: string
  sourceId?: string | null
  family: string
  level: "primitive" | "composite"
  htmlTag?: string | null
  exportable?: boolean
  tokenUsage: string[]
  defaultSize?: { width: number; height: number } | null
  propSchema?: Record<string, CanvasAgentPrimitivePropSchema>
  variants: CanvasAgentPrimitiveVariant[]
}

export interface CanvasAgentSessionDebug {
  session: CanvasAgentSession
  output: string
  transcript: CanvasAgentTranscriptEntry[]
  projectState: CanvasStateSnapshot | null
  primitives?: CanvasAgentPrimitive[]
  stateHistory: CanvasAgentStateHistoryEntry[]
  workspaceEvents?: AgentWorkspaceEvent<CanvasRemoteOperation>[]
  toolCommand: string
  toolExamples: string[]
}

export interface CanvasThemeSnapshot {
  themes: ThemeOption[]
  activeThemeId: string | null
  tokenValues: Record<string, string>
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
