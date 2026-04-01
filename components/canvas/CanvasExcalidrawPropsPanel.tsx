import { RefreshCcw, Trash2, X } from "lucide-react"

import type { CanvasExcalidrawItem, CanvasExcalidrawScene } from "../../types/canvas"

interface CanvasExcalidrawPropsPanelProps {
  title?: string
  scene?: CanvasExcalidrawScene
  sourceMermaid?: string
  onChange: (updates: Partial<Omit<CanvasExcalidrawItem, "id">>) => void
  onRemapFromMermaid?: () => void
  onDelete: () => void
  onClose: () => void
}

function withScenePatch(
  scene: CanvasExcalidrawScene | undefined,
  patch: Partial<CanvasExcalidrawScene>
): CanvasExcalidrawScene {
  return {
    elements: Array.isArray(scene?.elements) ? scene?.elements : [],
    appState: scene?.appState ? { ...scene.appState } : { viewBackgroundColor: "#ffffff" },
    files: scene?.files ? { ...scene.files } : {},
    ...patch,
  }
}

export function CanvasExcalidrawPropsPanel({
  title,
  scene,
  sourceMermaid,
  onChange,
  onRemapFromMermaid,
  onDelete,
  onClose,
}: CanvasExcalidrawPropsPanelProps) {
  const elementCount = Array.isArray(scene?.elements) ? scene.elements.length : 0
  const viewBackgroundColor =
    typeof scene?.appState?.viewBackgroundColor === "string"
      ? scene.appState.viewBackgroundColor
      : "#ffffff"

  return (
    <div className="flex h-full w-80 flex-col border-l border-default bg-white">
      <div className="flex items-center justify-between border-b border-default px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Excalidraw</h3>
          <p className="text-xs text-muted-foreground">
            {elementCount} elements in this scene
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onDelete}
            className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600"
            aria-label="Delete excalidraw"
            title="Delete excalidraw"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-surface-100 hover:text-foreground"
            aria-label="Close Excalidraw panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-3 overflow-y-auto p-4">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Title
          </label>
          <input
            type="text"
            value={title || ""}
            onChange={(event) => onChange({ title: event.target.value || undefined })}
            placeholder="Sketch title"
            className="w-full rounded-md border border-default bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Canvas Background
          </label>
          <input
            type="text"
            value={viewBackgroundColor}
            onChange={(event) =>
              onChange({
                scene: withScenePatch(scene, {
                  appState: {
                    ...(scene?.appState || {}),
                    viewBackgroundColor: event.target.value || "#ffffff",
                  },
                }),
              })
            }
            placeholder="#ffffff"
            className="w-full rounded-md border border-default bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Use Interact mode to edit drawing content directly on the node.
          </p>
        </div>

        {sourceMermaid && onRemapFromMermaid && (
          <div className="rounded-md border border-default bg-surface-50 p-3">
            <div className="mb-1 text-xs font-semibold text-foreground">Mapped from Mermaid</div>
            <p className="text-[11px] text-muted-foreground">
              This node tracks Mermaid source used during conversion. You can regenerate the drawing.
            </p>
            <button
              type="button"
              onClick={onRemapFromMermaid}
              className="mt-2 inline-flex items-center gap-1 rounded border border-default bg-white px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-100"
            >
              <RefreshCcw className="h-3 w-3" />
              Rebuild from Mermaid
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
