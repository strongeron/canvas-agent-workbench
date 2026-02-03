import { useDraggable } from "@dnd-kit/core"
import { ChevronDown, ChevronRight, GripVertical, Plus, Search } from "lucide-react"
import { useMemo, useState } from "react"

import type { GalleryEntry } from "../../core/types"
import type { PaperImportQueueItem } from "./CanvasTab"

/** Component entry type for sidebar */
type ComponentEntry = GalleryEntry

interface DraggableVariantProps {
  componentId: string
  componentName: string
  variantIndex: number
  variantName: string
}

function DraggableVariant({
  componentId,
  componentName,
  variantIndex,
  variantName,
}: DraggableVariantProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `sidebar-${componentId}-${variantIndex}`,
    data: {
      componentId,
      variantIndex,
    },
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex cursor-grab items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-sm transition-colors hover:border-brand-200 hover:bg-brand-50 active:cursor-grabbing ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted" />
      <span className="truncate text-foreground">{variantName}</span>
    </div>
  )
}

interface ComponentGroupProps {
  component: ComponentEntry
  isExpanded: boolean
  onToggle: () => void
}

function ComponentGroup({ component, isExpanded, onToggle }: ComponentGroupProps) {
  const componentId = "id" in component ? (component.id as string) : component.name

  return (
    <div className="border-b border-default last:border-b-0">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-foreground hover:bg-surface-50"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
        )}
        <span className="truncate">{component.name}</span>
        <span className="ml-auto shrink-0 text-xs text-muted">
          {component.variants.length}
        </span>
      </button>
      {isExpanded && (
        <div className="space-y-0.5 px-3 pb-2">
          {component.variants.map((variant, index) => (
            <DraggableVariant
              key={`${componentId}-${index}`}
              componentId={componentId}
              componentName={component.name}
              variantIndex={index}
              variantName={variant.name}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface CanvasSidebarProps {
  /** Gallery entries to display in the sidebar */
  entries: GalleryEntry[]
  /** Add an iframe/embed item to the canvas */
  onAddEmbed: (url: string) => void
  /** Recent imports */
  importQueue?: PaperImportQueueItem[]
  onAddImportedComponent?: (componentId: string, variantIndex?: number) => void
  onClearImportQueue?: () => void
  /** Optional project selector */
  projects?: Array<{ id: string; label: string }>
  activeProjectId?: string
  onSelectProject?: (id: string) => void
  onCreateProject?: () => void
}

export function CanvasSidebar({
  entries,
  onAddEmbed,
  importQueue,
  onAddImportedComponent,
  onClearImportQueue,
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProject,
}: CanvasSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [embedUrl, setEmbedUrl] = useState("")
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [expandedComponents, setExpandedComponents] = useState<Set<string>>(new Set())

  // Group entries by category
  const componentsByCategory = useMemo(() => {
    const grouped: Record<string, ComponentEntry[]> = {}
    for (const entry of entries) {
      const category = entry.category || "Uncategorized"
      if (!grouped[category]) {
        grouped[category] = []
      }
      grouped[category].push(entry)
    }
    return grouped
  }, [entries])

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  const toggleComponent = (componentName: string) => {
    setExpandedComponents((prev) => {
      const next = new Set(prev)
      if (next.has(componentName)) {
        next.delete(componentName)
      } else {
        next.add(componentName)
      }
      return next
    })
  }

  const filteredCategories = Object.entries(componentsByCategory)
    .map(([category, components]) => {
      if (!searchQuery) return { category, components }

      const lowerQuery = searchQuery.toLowerCase()
      const filteredComponents = components.filter(
        (comp) =>
          comp.name.toLowerCase().includes(lowerQuery) ||
          comp.variants.some((v) => v.name.toLowerCase().includes(lowerQuery))
      )
      return { category, components: filteredComponents }
    })
    .filter(({ components }) => components.length > 0)

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-default bg-white">
      {projects && projects.length > 0 && (
        <div className="border-b border-default p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Projects
            </h3>
            {onCreateProject && (
              <button
                type="button"
                onClick={onCreateProject}
                className="rounded p-1 text-muted-foreground hover:bg-surface-100 hover:text-foreground"
                aria-label="Create project"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="space-y-1">
            {projects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => onSelectProject?.(project.id)}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                  activeProjectId === project.id
                    ? "bg-brand-50 text-brand-700"
                    : "text-foreground hover:bg-surface-50"
                }`}
              >
                <span className="truncate">{project.label}</span>
                {activeProjectId === project.id && (
                  <span className="text-xs font-semibold text-brand-600">Active</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="border-b border-default p-3">
        <h3 className="mb-2 text-sm font-semibold text-foreground">Embeds</h3>
        <div className="space-y-2">
          <input
            type="url"
            value={embedUrl}
            onChange={(e) => setEmbedUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && embedUrl.trim()) {
                onAddEmbed(embedUrl.trim())
                setEmbedUrl("")
              }
            }}
            placeholder="Paste URL to embed..."
            className="w-full rounded-md border border-default bg-white px-3 py-1.5 text-sm text-foreground placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <button
            type="button"
            onClick={() => {
              if (!embedUrl.trim()) return
              onAddEmbed(embedUrl.trim())
              setEmbedUrl("")
            }}
            className="w-full rounded-md border border-default bg-surface-50 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-100"
          >
            Add embed
          </button>
          <p className="text-[11px] text-muted-foreground">
            Interactive iframes work best in Interact mode.
          </p>
        </div>
      </div>

      {importQueue && importQueue.length > 0 && (
        <div className="border-b border-default p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Imports</h3>
            {onClearImportQueue && (
              <button
                type="button"
                onClick={onClearImportQueue}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>
          <div className="space-y-2">
            {importQueue.slice(0, 8).map((item) => (
              <div
                key={item.id}
                className="rounded-md border border-default bg-white px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold text-foreground">
                      {item.name}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {item.kind ? item.kind.toUpperCase() : "UI"} • {item.importedAt}
                    </div>
                  </div>
                  {onAddImportedComponent && (
                    <button
                      type="button"
                      onClick={() => onAddImportedComponent(item.componentId)}
                      className="rounded border border-default px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-surface-50"
                    >
                      Add
                    </button>
                  )}
                </div>
                {(item.source?.fileName || item.source?.nodeId) && (
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {item.source?.fileName || "Paper"}{item.source?.nodeId ? ` · ${item.source.nodeId}` : ""}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-b border-default p-3">
        <h3 className="mb-2 text-sm font-semibold text-foreground">Components</h3>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search components..."
            className="w-full rounded-md border border-default bg-white py-1.5 pl-8 pr-3 text-sm text-foreground placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Drag variants onto the canvas
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredCategories.map(({ category, components }) => (
          <div key={category} className="border-b border-default">
            <button
              onClick={() => toggleCategory(category)}
              className="flex w-full items-center gap-2 bg-surface-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-surface-100"
            >
              {expandedCategories.has(category) ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
              <span className="truncate">{category}</span>
              <span className="ml-auto shrink-0 text-xs font-normal">
                {components.length}
              </span>
            </button>
            {expandedCategories.has(category) && (
              <div>
                {components.map((component) => (
                  <ComponentGroup
                    key={component.name}
                    component={component}
                    isExpanded={expandedComponents.has(component.name)}
                    onToggle={() => toggleComponent(component.name)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  )
}
