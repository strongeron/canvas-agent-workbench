import {
  Copy,
  FolderOpen,
  Group,
  HelpCircle,
  Maximize2,
  Minus,
  MousePointer2,
  PanelLeft,
  Plus,
  RotateCcw,
  Trash2,
  Ungroup,
} from "lucide-react"

/** Props for injected Button component */
export interface ButtonComponentProps {
  variant?: "ghost" | "brand" | "outline" | string
  size?: "sm" | "md" | "lg" | string
  onClick?: () => void
  className?: string
  disabled?: boolean
  children: React.ReactNode
  "aria-label"?: string
}

/** Props for injected Tooltip component */
export interface TooltipComponentProps {
  content: string
  children: React.ReactNode
}

interface CanvasToolbarProps {
  scale: number
  onZoomIn: () => void
  onZoomOut: () => void
  onResetZoom: () => void
  onFitToView: () => void
  onClearCanvas: () => void
  onToggleSidebar: () => void
  onToggleHelp: () => void
  onToggleScenes: () => void
  onToggleInteractMode: () => void
  onGroupSelected: () => void
  onUngroupSelected: () => void
  onDuplicateSelected: () => void
  itemCount: number
  selectedCount: number
  canGroup: boolean
  canUngroup: boolean
  interactMode: boolean
  sidebarVisible: boolean
  scenesVisible: boolean
  /** Injected Button component */
  Button: React.ComponentType<ButtonComponentProps>
  /** Injected Tooltip component */
  Tooltip: React.ComponentType<TooltipComponentProps>
}

export function CanvasToolbar({
  scale,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitToView,
  onClearCanvas,
  onToggleSidebar,
  onToggleHelp,
  onToggleScenes,
  onToggleInteractMode,
  onGroupSelected,
  onUngroupSelected,
  onDuplicateSelected,
  itemCount,
  selectedCount,
  canGroup,
  canUngroup,
  interactMode,
  sidebarVisible,
  scenesVisible,
  Button,
  Tooltip,
}: CanvasToolbarProps) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-default bg-white/95 px-2 py-1.5 shadow-lg backdrop-blur-sm">
      {/* Sidebar toggle */}
      <Tooltip content={`${sidebarVisible ? "Hide" : "Show"} sidebar [  ]`}>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleSidebar}
          className={`h-7 w-7 p-0 ${!sidebarVisible ? "text-brand-600" : ""}`}
          aria-label="Toggle sidebar"
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
      </Tooltip>

      <div className="h-5 w-px bg-border-default" />

      {/* Zoom controls */}
      <div className="flex items-center gap-0.5">
        <Tooltip content="Zoom out [ - ]">
          <Button
            variant="ghost"
            size="sm"
            onClick={onZoomOut}
            className="h-7 w-7 p-0"
            aria-label="Zoom out"
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
        </Tooltip>
        <Tooltip content="Click to reset [ 0 ]">
          <button
            onClick={onResetZoom}
            className="min-w-[52px] rounded px-1.5 py-0.5 text-xs font-semibold tabular-nums text-foreground hover:bg-surface-100"
          >
            {Math.round(scale * 100)}%
          </button>
        </Tooltip>
        <Tooltip content="Zoom in [ + ]">
          <Button
            variant="ghost"
            size="sm"
            onClick={onZoomIn}
            className="h-7 w-7 p-0"
            aria-label="Zoom in"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </Tooltip>
      </div>

      <div className="h-5 w-px bg-border-default" />

      {/* View controls */}
      <Tooltip content="Fit all in view [ 1 ]">
        <Button
          variant="ghost"
          size="sm"
          onClick={onFitToView}
          className="h-7 w-7 p-0"
          aria-label="Fit to view"
          disabled={itemCount === 0}
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </Button>
      </Tooltip>

      <Tooltip content="Reset view [ 0 ]">
        <Button
          variant="ghost"
          size="sm"
          onClick={onResetZoom}
          className="h-7 w-7 p-0"
          aria-label="Reset view"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </Tooltip>

      <div className="h-5 w-px bg-border-default" />

      {/* Interact mode */}
      <Tooltip content={interactMode ? "Exit interact mode" : "Interact with content"}>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleInteractMode}
          className={`h-7 w-7 p-0 ${interactMode ? "bg-brand-100 text-brand-700" : ""}`}
          aria-label="Toggle interact mode"
        >
          <MousePointer2 className="h-3.5 w-3.5" />
        </Button>
      </Tooltip>

      <div className="h-5 w-px bg-border-default" />

      {/* Selection actions */}
      {selectedCount > 0 && (
        <>
          <span className="px-1 text-xs font-medium tabular-nums text-brand-600">
            {selectedCount} selected
          </span>

          <Tooltip content="Duplicate selected [ Cmd+D ]">
            <Button
              variant="ghost"
              size="sm"
              onClick={onDuplicateSelected}
              className="h-7 w-7 p-0"
              aria-label="Duplicate selected"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </Tooltip>

          {canGroup && (
            <Tooltip content="Group selected [ Cmd+G ]">
              <Button
                variant="ghost"
                size="sm"
                onClick={onGroupSelected}
                className="h-7 w-7 p-0"
                aria-label="Group selected"
              >
                <Group className="h-3.5 w-3.5" />
              </Button>
            </Tooltip>
          )}

          {canUngroup && (
            <Tooltip content="Ungroup [ Cmd+Shift+G ]">
              <Button
                variant="ghost"
                size="sm"
                onClick={onUngroupSelected}
                className="h-7 w-7 p-0"
                aria-label="Ungroup"
              >
                <Ungroup className="h-3.5 w-3.5" />
              </Button>
            </Tooltip>
          )}

          <div className="h-5 w-px bg-border-default" />
        </>
      )}

      {/* Item count and clear */}
      <span className="px-1 text-xs tabular-nums text-muted-foreground">
        {itemCount}
      </span>

      {itemCount > 0 && (
        <Tooltip content="Clear all items">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearCanvas}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600"
            aria-label="Clear canvas"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </Tooltip>
      )}

      <div className="h-5 w-px bg-border-default" />

      {/* Scenes */}
      <Tooltip content="Saved scenes">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleScenes}
          className={`h-7 w-7 p-0 ${scenesVisible ? "bg-brand-100 text-brand-600" : ""}`}
          aria-label="Toggle scenes panel"
        >
          <FolderOpen className="h-3.5 w-3.5" />
        </Button>
      </Tooltip>

      {/* Help */}
      <Tooltip content="Keyboard shortcuts [ ? ]">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleHelp}
          className="h-7 w-7 p-0"
          aria-label="Show help"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </Button>
      </Tooltip>
    </div>
  )
}
