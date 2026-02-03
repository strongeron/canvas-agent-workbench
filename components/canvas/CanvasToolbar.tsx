import {
  Copy,
  FolderOpen,
  Group,
  HelpCircle,
  LayoutGrid,
  Layers,
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
  onToggleLayers: () => void
  onToggleInteractMode: () => void
  onAddArtboard: () => void
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
  layersVisible: boolean
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
  onToggleLayers,
  onToggleInteractMode,
  onAddArtboard,
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
  layersVisible,
  Button,
  Tooltip,
}: CanvasToolbarProps) {
  const focusRingClass =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
  const iconButtonClass = `h-10 w-10 p-0 text-gray-900 hover:bg-gray-200 ${focusRingClass}`
  const activeIconButtonClass = `h-10 w-10 p-0 bg-gray-200 text-gray-950 ${focusRingClass}`

  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-gray-300 bg-white px-3 py-2 shadow-lg">
      {/* Sidebar toggle */}
      <Tooltip content={`${sidebarVisible ? "Hide" : "Show"} sidebar [  ]`}>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleSidebar}
          className={`${iconButtonClass} ${!sidebarVisible ? "text-brand-700" : ""}`}
          aria-label="Toggle sidebar"
          aria-pressed={sidebarVisible}
        >
          <PanelLeft className="h-5 w-5" />
        </Button>
      </Tooltip>

      <div className="h-6 w-px bg-border-default" />

      {/* Zoom controls */}
      <div className="flex items-center gap-0.5">
        <Tooltip content="Zoom out [ - ]">
          <Button
            variant="ghost"
            size="sm"
            onClick={onZoomOut}
            className={iconButtonClass}
            aria-label="Zoom out"
          >
            <Minus className="h-5 w-5" />
          </Button>
        </Tooltip>
        <Tooltip content="Click to reset [ 0 ]">
          <button
            onClick={onResetZoom}
            className={`min-w-[64px] rounded px-2 py-1 text-xs font-semibold tabular-nums text-gray-900 hover:bg-gray-100 ${focusRingClass}`}
          >
            {Math.round(scale * 100)}%
          </button>
        </Tooltip>
        <Tooltip content="Zoom in [ + ]">
          <Button
            variant="ghost"
            size="sm"
            onClick={onZoomIn}
            className={iconButtonClass}
            aria-label="Zoom in"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </Tooltip>
      </div>

      <div className="h-6 w-px bg-border-default" />

      {/* View controls */}
      <Tooltip content="Fit all in view [ 1 ]">
        <Button
          variant="ghost"
          size="sm"
          onClick={onFitToView}
          className={iconButtonClass}
          aria-label="Fit to view"
          disabled={itemCount === 0}
        >
          <Maximize2 className="h-5 w-5" />
        </Button>
      </Tooltip>

      <Tooltip content="Reset view [ 0 ]">
        <Button
          variant="ghost"
          size="sm"
          onClick={onResetZoom}
          className={iconButtonClass}
          aria-label="Reset view"
        >
          <RotateCcw className="h-5 w-5" />
        </Button>
      </Tooltip>

      <div className="h-6 w-px bg-border-default" />

      {/* Add artboard */}
      <Tooltip content="Add artboard">
        <Button
          variant="ghost"
          size="sm"
          onClick={onAddArtboard}
          className={iconButtonClass}
          aria-label="Add artboard"
        >
          <LayoutGrid className="h-5 w-5" />
        </Button>
      </Tooltip>

      <div className="h-6 w-px bg-border-default" />

      {/* Interact mode */}
      <Tooltip content={interactMode ? "Exit interact mode" : "Interact with content"}>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleInteractMode}
          className={interactMode ? activeIconButtonClass : iconButtonClass}
          aria-label="Toggle interact mode"
          aria-pressed={interactMode}
        >
          <MousePointer2 className="h-5 w-5" />
        </Button>
      </Tooltip>

      <div className="h-6 w-px bg-border-default" />

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
              className={iconButtonClass}
              aria-label="Duplicate selected"
            >
              <Copy className="h-5 w-5" />
            </Button>
          </Tooltip>

          {canGroup && (
            <Tooltip content="Group selected [ Cmd+G ]">
              <Button
                variant="ghost"
                size="sm"
                onClick={onGroupSelected}
                className={iconButtonClass}
                aria-label="Group selected"
              >
                <Group className="h-5 w-5" />
              </Button>
            </Tooltip>
          )}

          {canUngroup && (
            <Tooltip content="Ungroup [ Cmd+Shift+G ]">
              <Button
                variant="ghost"
                size="sm"
                onClick={onUngroupSelected}
                className={iconButtonClass}
                aria-label="Ungroup"
              >
                <Ungroup className="h-5 w-5" />
              </Button>
            </Tooltip>
          )}

          <div className="h-6 w-px bg-border-default" />
        </>
      )}

      {/* Item count and clear */}
      <span className="px-1 text-xs tabular-nums text-gray-700">
        {itemCount}
      </span>

      {itemCount > 0 && (
        <Tooltip content="Clear all items">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearCanvas}
            className={`${iconButtonClass} text-gray-600 hover:text-red-600`}
            aria-label="Clear canvas"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </Tooltip>
      )}

      <div className="h-6 w-px bg-border-default" />

      {/* Scenes */}
      <Tooltip content="Saved scenes">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleScenes}
          className={scenesVisible ? activeIconButtonClass : iconButtonClass}
          aria-label="Toggle scenes panel"
          aria-pressed={scenesVisible}
        >
          <FolderOpen className="h-5 w-5" />
        </Button>
      </Tooltip>

      {/* Layers */}
      <Tooltip content="Layers panel">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleLayers}
          className={layersVisible ? activeIconButtonClass : iconButtonClass}
          aria-label="Toggle layers panel"
          aria-pressed={layersVisible}
        >
          <Layers className="h-5 w-5" />
        </Button>
      </Tooltip>

      {/* Help */}
      <Tooltip content="Keyboard shortcuts [ ? ]">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleHelp}
          className={iconButtonClass}
          aria-label="Show help"
        >
          <HelpCircle className="h-5 w-5" />
        </Button>
      </Tooltip>
    </div>
  )
}
