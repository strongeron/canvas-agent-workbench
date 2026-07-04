import {
  Bot,
  Code2,
  Copy,
  FolderOpen,
  Group,
  Hand,
  HelpCircle,
  Layers3,
  LayoutGrid,
  Layers,
  Maximize2,
  Minus,
  MousePointer2,
  Package,
  Palette,
  PanelLeft,
  Plus,
  RotateCcw,
  Sparkles,
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
  "aria-pressed"?: boolean
}

/** Props for injected Tooltip component */
export interface TooltipComponentProps {
  content: string
  children: React.ReactNode
}

export type PaperImportKind = "ui" | "page"
export type CanvasTool = "select" | "edit" | "interact"

interface CanvasToolbarProps {
  scale: number
  onZoomIn: () => void
  onZoomOut: () => void
  onResetZoom: () => void
  onFitToView: () => void
  onDeleteSelected: () => void
  onClearCanvas: () => void
  onToggleSidebar: () => void
  onToggleHelp: () => void
  onToggleScenes: () => void
  onToggleLayers: () => void
  onToggleLibraryPanel: () => void
  onCreateComponentFromPaste?: () => void
  canvasTool: CanvasTool
  onCanvasToolChange: (tool: CanvasTool) => void
  onAddArtboard: () => void
  onAddNativeComponent?: () => void
  onImportFromPaper?: () => void
  importKind?: PaperImportKind
  onImportKindChange?: (kind: PaperImportKind) => void
  onGroupSelected: () => void
  onUngroupSelected: () => void
  onMoveSelectionToArtboard?: () => void
  onWrapSelectionInSection?: () => void
  onDuplicateSelected: () => void
  onCopyForAgent?: () => void
  onToggleThemePanel: () => void
  onToggleCopilotPanel: () => void
  itemCount: number
  selectedCount: number
  canGroup: boolean
  canUngroup: boolean
  canMoveSelectionToArtboard?: boolean
  canWrapSelectionInSection?: boolean
  interactMode: boolean
  sidebarVisible: boolean
  scenesVisible: boolean
  layersVisible: boolean
  libraryPanelVisible: boolean
  themePanelVisible: boolean
  copilotPanelVisible: boolean
  importingPaper?: boolean
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
  onDeleteSelected,
  onClearCanvas,
  onToggleSidebar,
  onToggleHelp,
  onToggleScenes,
  onToggleLayers,
  onToggleLibraryPanel,
  onCreateComponentFromPaste,
  canvasTool,
  onCanvasToolChange,
  onAddArtboard,
  onAddNativeComponent,
  onImportFromPaper,
  importKind,
  onImportKindChange,
  onGroupSelected,
  onUngroupSelected,
  onMoveSelectionToArtboard,
  onWrapSelectionInSection,
  onDuplicateSelected,
  onCopyForAgent,
  onToggleThemePanel,
  onToggleCopilotPanel,
  itemCount,
  selectedCount,
  canGroup,
  canUngroup,
  canMoveSelectionToArtboard = false,
  canWrapSelectionInSection = false,
  interactMode,
  sidebarVisible,
  scenesVisible,
  layersVisible,
  libraryPanelVisible,
  themePanelVisible,
  copilotPanelVisible,
  importingPaper,
  Button,
  Tooltip,
}: CanvasToolbarProps) {
  const focusRingClass =
    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:ring-offset-1"
  const iconButtonClass = `h-10 w-10 p-0 text-foreground hover:bg-surface-100 ${focusRingClass}`
  const activeIconButtonClass = `h-10 w-10 p-0 bg-surface-200 text-foreground ${focusRingClass}`
  const wrapSelectionTooltip = canWrapSelectionInSection
    ? "Wrap selected cards in a layout section"
    : "Select 2+ cards in the same artboard, or place freeform cards inside one artboard"

  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-default bg-white px-3 py-2 shadow-lg">
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
            className={`min-w-[64px] rounded px-2 py-1 text-xs font-semibold tabular-nums text-foreground hover:bg-surface-100 ${focusRingClass}`}
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

      {onAddNativeComponent && (
        <Tooltip content="Add native component">
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddNativeComponent}
            className={iconButtonClass}
            aria-label="Add native component"
          >
            <Layers3 className="h-5 w-5" />
          </Button>
        </Tooltip>
      )}

      {onImportFromPaper && (
        <>
          <Tooltip content={importingPaper ? "Importing from Paper..." : "Import from Paper"}>
            <Button
              variant="ghost"
              size="sm"
              onClick={onImportFromPaper}
              className={iconButtonClass}
              aria-label="Import from Paper"
              disabled={importingPaper}
            >
              <Sparkles className="h-5 w-5" />
            </Button>
          </Tooltip>
          {onImportKindChange && (
            <div className="flex items-center gap-1 rounded-md border border-default bg-white p-1">
              {(["ui", "page"] as const).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => onImportKindChange(kind)}
                  className={`rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                    importKind === kind
                      ? "bg-foreground text-white"
                      : "text-muted-foreground hover:bg-surface-100"
                  }`}
                >
                  {kind}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <div className="h-6 w-px bg-border-default" />

      {/* Canvas tools */}
      <div className="flex items-center gap-0.5 rounded-md border border-default bg-white p-1">
        <Tooltip content="Select and move canvas items">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCanvasToolChange("select")}
            className={canvasTool === "select" ? activeIconButtonClass : iconButtonClass}
            aria-label="Select canvas items"
            aria-pressed={canvasTool === "select"}
          >
            <MousePointer2 className="h-5 w-5" />
          </Button>
        </Tooltip>
        <Tooltip content="Edit component elements">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCanvasToolChange("edit")}
            className={canvasTool === "edit" ? activeIconButtonClass : iconButtonClass}
            aria-label="Edit component elements"
            aria-pressed={canvasTool === "edit"}
          >
            <Code2 className="h-5 w-5" />
          </Button>
        </Tooltip>
        <Tooltip content={interactMode ? "Interacting with content" : "Interact with live previews"}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCanvasToolChange("interact")}
            className={canvasTool === "interact" ? activeIconButtonClass : iconButtonClass}
            aria-label="Interact with live previews"
            aria-pressed={canvasTool === "interact"}
          >
            <Hand className="h-5 w-5" />
          </Button>
        </Tooltip>
      </div>

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

          {onCopyForAgent && (
            <Tooltip content="Copy for agent — paste-ready context for the selected frames">
              <Button
                variant="ghost"
                size="sm"
                onClick={onCopyForAgent}
                className={iconButtonClass}
                aria-label="Copy selection context for agent"
              >
                <Bot className="h-5 w-5" />
              </Button>
            </Tooltip>
          )}

          <Tooltip content="Delete selected [ Delete ]">
            <Button
              variant="ghost"
              size="sm"
              onClick={onDeleteSelected}
              className={`${iconButtonClass} text-muted-foreground hover:text-red-600`}
              aria-label="Delete selected"
            >
              <Trash2 className="h-5 w-5" />
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

          {onMoveSelectionToArtboard && canMoveSelectionToArtboard && (
            <Tooltip content="Move selected items into selected artboard">
              <Button
                variant="ghost"
                size="sm"
                onClick={onMoveSelectionToArtboard}
                className={iconButtonClass}
                aria-label="Move selected items into selected artboard"
              >
                <Layers3 className="h-5 w-5" />
              </Button>
            </Tooltip>
          )}

          {onWrapSelectionInSection && selectedCount > 1 && (
            <Tooltip content={wrapSelectionTooltip}>
              <Button
                variant={canWrapSelectionInSection ? "outline" : "ghost"}
                size="sm"
                onClick={onWrapSelectionInSection}
                disabled={!canWrapSelectionInSection}
                className={`h-10 gap-2 px-3 text-foreground ${focusRingClass} ${
                  canWrapSelectionInSection
                    ? "border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100"
                    : "text-muted-foreground"
                }`}
                aria-label="Wrap selected in section"
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="text-sm font-medium">Wrap section</span>
              </Button>
            </Tooltip>
          )}

          <div className="h-6 w-px bg-border-default" />
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
            className={`${iconButtonClass} text-muted-foreground hover:text-red-600`}
            aria-label="Clear canvas"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </Tooltip>
      )}

      <div className="h-6 w-px bg-border-default" />

      {/* Templates */}
      <Tooltip content="Templates and snippets">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleScenes}
          className={scenesVisible ? activeIconButtonClass : iconButtonClass}
          aria-label="Toggle templates panel"
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

      {/* Library */}
      <Tooltip content="Component library">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleLibraryPanel}
          className={libraryPanelVisible ? activeIconButtonClass : iconButtonClass}
          aria-label="Toggle component library"
          aria-pressed={libraryPanelVisible}
        >
          <Package className="h-5 w-5" />
        </Button>
      </Tooltip>

      {onCreateComponentFromPaste && (
        <Tooltip content="New component from paste">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCreateComponentFromPaste}
            className={iconButtonClass}
            aria-label="New component from paste"
          >
            <Copy className="h-5 w-5" />
          </Button>
        </Tooltip>
      )}

      {/* Theme */}
      <Tooltip content="Theme + tokens panel">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleThemePanel}
          className={themePanelVisible ? activeIconButtonClass : iconButtonClass}
          aria-label="Toggle theme panel"
          aria-pressed={themePanelVisible}
        >
          <Palette className="h-5 w-5" />
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

      {/* Copilot */}
      <Tooltip content="Canvas agent chat">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCopilotPanel}
          className={copilotPanelVisible ? activeIconButtonClass : iconButtonClass}
          aria-label="Toggle canvas agent panel"
          aria-pressed={copilotPanelVisible}
        >
          <Bot className="h-5 w-5" />
        </Button>
      </Tooltip>
    </div>
  )
}
