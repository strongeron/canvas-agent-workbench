import { ChevronDown, ChevronUp, Layers, X } from "lucide-react"

import type { GalleryEntry } from "../../core/types"
import type { CanvasArtboardItem, CanvasItem } from "../../types/canvas"

interface CanvasLayersPanelProps {
  items: CanvasItem[]
  selectedIds: string[]
  onSelectItem: (id: string, addToSelection?: boolean) => void
  onMoveLayer: (itemId: string, direction: "up" | "down") => void
  onClose: () => void
  getComponentById: (id: string) => GalleryEntry | null
}

function getEmbedLabel(item: CanvasItem) {
  if (item.type !== "embed") return ""
  if (!item.url) return "Embed"
  try {
    return new URL(item.url, typeof window === "undefined" ? "http://localhost" : window.location.href).hostname
  } catch {
    return item.title || "Embed"
  }
}

export function CanvasLayersPanel({
  items,
  selectedIds,
  onSelectItem,
  onMoveLayer,
  onClose,
  getComponentById,
}: CanvasLayersPanelProps) {
  const artboards = items
    .filter((item): item is CanvasArtboardItem => item.type === "artboard")
    .sort((a, b) => a.zIndex - b.zIndex)

  const freeformItems = items
    .filter((item) => item.type !== "artboard" && !item.parentId)
    .sort((a, b) => a.zIndex - b.zIndex)

  const getChildren = (artboardId: string) =>
    items
      .filter((item) => item.type !== "artboard" && item.parentId === artboardId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  const getItemLabel = (item: CanvasItem) => {
    if (item.type === "artboard") return item.name
    if (item.type === "embed") return getEmbedLabel(item)
    const component = getComponentById(item.componentId)
    return component?.name || item.componentId
  }

  const getVariantLabel = (item: CanvasItem) => {
    if (item.type !== "component") return null
    const component = getComponentById(item.componentId)
    const variant = component?.variants[item.variantIndex]
    return variant?.name || null
  }

  const renderRow = (item: CanvasItem, depth = 0, controls?: React.ReactNode) => {
    const isSelected = selectedIds.includes(item.id)
    return (
      <div
        key={item.id}
        className={`flex items-center gap-2 rounded-md px-2 py-1 ${
          depth ? "ml-4" : ""
        } ${isSelected ? "bg-brand-50 text-brand-900" : "hover:bg-surface-100"}`}
        onClick={(e) => {
          e.stopPropagation()
          onSelectItem(item.id, e.shiftKey)
        }}
      >
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          {getItemLabel(item)}
        </span>
        {item.type === "component" && getVariantLabel(item) && (
          <span className="rounded-full bg-surface-100 px-2 py-0.5 text-[10px] text-muted-foreground">
            {getVariantLabel(item)}
          </span>
        )}
        {controls}
      </div>
    )
  }

  return (
    <div className="flex h-full w-80 flex-col border-l border-default bg-white">
      <div className="flex items-center justify-between border-b border-default px-4 py-3">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-brand-600" />
          <h3 className="text-sm font-semibold text-foreground">Layers</h3>
          <span className="rounded-full bg-surface-100 px-2 py-0.5 text-xs text-muted-foreground">
            {items.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-muted-foreground hover:bg-surface-100 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {artboards.length === 0 && freeformItems.length === 0 && (
          <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
            <Layers className="mb-2 h-8 w-8 text-muted" />
            <p className="text-sm text-muted-foreground">No layers yet</p>
            <p className="mt-1 text-xs text-muted">
              Add artboards or drag components onto the canvas
            </p>
          </div>
        )}

        {artboards.length > 0 && (
          <div className="space-y-2">
            {artboards.map((artboard) => {
              const children = getChildren(artboard.id)
              return (
                <div key={artboard.id} className="rounded-lg border border-default bg-white">
                  <div className="border-b border-default px-2 py-2">
                    {renderRow(artboard)}
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1 rounded-full bg-surface-100 px-2 py-0.5">
                        <ChevronDown className="h-3 w-3" />
                        {children.length} items
                      </span>
                      <span className="rounded-full bg-surface-100 px-2 py-0.5">
                        {artboard.layout.display}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1 px-2 py-2">
                    {children.length === 0 && (
                      <div className="px-2 py-2 text-xs text-muted-foreground">
                        Drop components here to build a layout
                      </div>
                    )}
                    {children.map((child, index) =>
                      renderRow(
                        child,
                        1,
                        <div className="ml-auto flex items-center gap-1">
                          <button
                            type="button"
                            className="rounded p-1 text-muted-foreground hover:bg-surface-100 hover:text-foreground disabled:opacity-30"
                            onClick={(e) => {
                              e.stopPropagation()
                              onMoveLayer(child.id, "up")
                            }}
                            disabled={index === 0}
                          >
                            <ChevronUp className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            className="rounded p-1 text-muted-foreground hover:bg-surface-100 hover:text-foreground disabled:opacity-30"
                            onClick={(e) => {
                              e.stopPropagation()
                              onMoveLayer(child.id, "down")
                            }}
                            disabled={index === children.length - 1}
                          >
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {freeformItems.length > 0 && (
          <div className="mt-4 rounded-lg border border-default bg-white">
            <div className="border-b border-default px-2 py-2 text-xs font-semibold text-muted-foreground">
              Freeform
            </div>
            <div className="space-y-1 px-2 py-2">
              {freeformItems.map((item) => renderRow(item))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
