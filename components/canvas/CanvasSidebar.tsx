import { useDraggable } from "@dnd-kit/core"
import { ChevronDown, ChevronRight, GripVertical, Plus, Search } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import type { GalleryEntry } from "../../core/types"
import type { PaperImportQueueItem } from "./CanvasTab"
import { fetchLocalApps, type LocalAppEntry } from "./localAppsService"
import { inferMediaKindFromFile } from "./mediaStorageService"

/** Component entry type for sidebar */
type ComponentEntry = GalleryEntry

interface DraggableVariantProps {
  componentId: string
  variantIndex: number
  variantName: string
}

function DraggableVariant({
  componentId,
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
  const componentId = component.id

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
  /** Add a media node (image/video/gif URL) */
  onAddMedia: (input: {
    src?: string
    file?: File
    mediaKind?: "image" | "video" | "gif"
  }) => void | Promise<void>
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
  onAddMedia,
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
  const [localPort, setLocalPort] = useState("3000")
  const [localPath, setLocalPath] = useState("/")
  const [localApps, setLocalApps] = useState<LocalAppEntry[]>([])
  const [localAppsStatus, setLocalAppsStatus] = useState<"idle" | "loading" | "ready" | "error">("idle")
  const [localAppsSource, setLocalAppsSource] = useState<string | null>(null)
  const [localAppsScannedPorts, setLocalAppsScannedPorts] = useState<number | null>(null)
  const [localAppsError, setLocalAppsError] = useState<string | null>(null)
  const [selectedLocalAppUrl, setSelectedLocalAppUrl] = useState("")
  const [mediaUrl, setMediaUrl] = useState("")
  const [mediaKind, setMediaKind] = useState<"image" | "video" | "gif">("image")
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [expandedComponents, setExpandedComponents] = useState<Set<string>>(new Set())
  const mediaFileInputRef = useRef<HTMLInputElement>(null)

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

  const buildLocalEmbedUrl = useCallback(() => {
    const port = Number(localPort)
    if (!Number.isInteger(port) || port < 1 || port > 65535) return null
    const cleanedPath = localPath.trim()
    const normalizedPath = cleanedPath
      ? cleanedPath.startsWith("/")
        ? cleanedPath
        : `/${cleanedPath}`
      : "/"
    return `http://localhost:${port}${normalizedPath}`
  }, [localPath, localPort])

  const handleDiscoverLocalApps = useCallback(
    async (force = false) => {
      if (localAppsStatus === "loading") return
      const appOrigin =
        typeof window === "undefined" ? "http://localhost:5173" : window.location.origin
      setLocalAppsStatus("loading")
      setLocalAppsError(null)
      const result = await fetchLocalApps(appOrigin, { force })
      if (result.status === "ready") {
        setLocalApps(result.apps)
        setLocalAppsSource(result.source || null)
        setLocalAppsScannedPorts(
          typeof result.scannedPorts === "number" ? result.scannedPorts : null
        )
        setLocalAppsStatus("ready")
        if (result.apps.length > 0) {
          setSelectedLocalAppUrl((previous) =>
            previous && result.apps.some((app) => (app.finalUrl || app.url) === previous)
              ? previous
              : result.apps[0].finalUrl || result.apps[0].url
          )
        } else {
          setSelectedLocalAppUrl("")
        }
        return
      }

      if (result.status === "unknown") {
        setLocalAppsStatus("idle")
        return
      }

      setLocalAppsStatus("error")
      setLocalAppsError(result.reason || "Failed to discover localhost apps.")
    },
    [localAppsStatus]
  )

  useEffect(() => {
    if (localAppsStatus !== "idle") return
    void handleDiscoverLocalApps(false)
  }, [handleDiscoverLocalApps, localAppsStatus])

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
        <h3 className="mb-2 text-sm font-semibold text-foreground">Media</h3>
        <div className="space-y-2">
          <input
            type="url"
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && mediaUrl.trim()) {
                void onAddMedia({ src: mediaUrl.trim(), mediaKind })
                setMediaUrl("")
              }
            }}
            placeholder="Paste media URL (.png/.gif/.mp4/.webm)..."
            className="w-full rounded-md border border-default bg-white px-3 py-1.5 text-sm text-foreground placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <select
            value={mediaKind}
            onChange={(e) => setMediaKind(e.target.value as "image" | "video" | "gif")}
            className="w-full rounded-md border border-default bg-white px-3 py-1.5 text-xs font-semibold text-foreground focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="image">Image</option>
            <option value="gif">GIF</option>
            <option value="video">Video</option>
          </select>
          <button
            type="button"
            onClick={() => {
              if (!mediaUrl.trim()) return
              void onAddMedia({ src: mediaUrl.trim(), mediaKind })
              setMediaUrl("")
            }}
            className="w-full rounded-md border border-default bg-surface-50 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-100"
          >
            Add media
          </button>
          <input
            ref={mediaFileInputRef}
            type="file"
            accept="image/*,video/*,.gif,.mp4,.webm,.mov,.m4v,.ogg"
            onChange={(e) => {
              const file = e.target.files?.[0] || null
              setMediaFile(file)
              if (file) {
                setMediaKind(inferMediaKindFromFile(file))
              }
            }}
            className="w-full rounded-md border border-default bg-white px-2 py-1.5 text-xs text-foreground file:mr-2 file:rounded file:border file:border-default file:bg-surface-50 file:px-2 file:py-1 file:text-[11px] file:font-semibold"
          />
          <button
            type="button"
            onClick={() => {
              if (!mediaFile) return
              void onAddMedia({ file: mediaFile, mediaKind })
              setMediaFile(null)
              if (mediaFileInputRef.current) {
                mediaFileInputRef.current.value = ""
              }
            }}
            className="w-full rounded-md border border-default bg-surface-50 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-100 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!mediaFile}
          >
            Add file
          </button>
          <p className="text-[11px] text-muted-foreground">
            URL and local file upload supported. Large files auto-fallback to local-session media
            if they exceed persistent upload limits.
          </p>
        </div>
      </div>

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
          <div className="rounded-md border border-default bg-surface-50 p-2">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Localhost app
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <label className="flex items-center rounded-md border border-default bg-white px-2">
                <span className="text-[11px] text-muted-foreground">localhost:</span>
                <input
                  type="number"
                  min={1}
                  max={65535}
                  step={1}
                  value={localPort}
                  onChange={(e) => setLocalPort(e.target.value)}
                  className="w-full border-0 bg-transparent px-1 py-1.5 text-xs text-foreground focus:outline-none"
                  aria-label="Localhost port"
                />
              </label>
              <input
                type="text"
                value={localPath}
                onChange={(e) => setLocalPath(e.target.value)}
                placeholder="/"
                className="rounded-md border border-default bg-white px-2 py-1.5 text-xs text-foreground focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                aria-label="Localhost path"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                const localUrl = buildLocalEmbedUrl()
                if (!localUrl) return
                onAddEmbed(localUrl)
              }}
              className="mt-2 w-full rounded-md border border-default bg-white px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-100"
            >
              Add localhost embed
            </button>
            <div className="mt-2 rounded-md border border-default bg-white p-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-foreground">Detected local apps</span>
                <button
                  type="button"
                  onClick={() => void handleDiscoverLocalApps(true)}
                  className="rounded border border-default px-2 py-0.5 text-[10px] font-semibold text-foreground hover:bg-surface-100"
                >
                  {localAppsStatus === "loading" ? "Scanning..." : "Scan ports"}
                </button>
              </div>
              <div className="mt-2">
                <select
                  value={selectedLocalAppUrl}
                  onChange={(e) => setSelectedLocalAppUrl(e.target.value)}
                  className="w-full rounded-md border border-default bg-white px-2 py-1.5 text-xs text-foreground focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="">
                    {localApps.length === 0 ? "No apps discovered yet" : "Select local app"}
                  </option>
                  {localApps.map((app) => {
                    const optionUrl = app.finalUrl || app.url
                    let hostLabel = optionUrl
                    try {
                      hostLabel = new URL(optionUrl).host
                    } catch {
                      hostLabel = optionUrl
                    }
                    const statusLabel = app.status ? ` · ${app.status}` : ""
                    const liveLabel = app.live === false ? " · not live" : " · live"
                    const frameLabel = app.embeddable ? "" : " · iframe blocked"
                    const label = `${hostLabel}${statusLabel}${liveLabel}${frameLabel}`
                    return (
                      <option key={`${app.port}-${optionUrl}`} value={optionUrl}>
                        {label}
                      </option>
                    )
                  })}
                </select>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!selectedLocalAppUrl) return
                  onAddEmbed(selectedLocalAppUrl)
                }}
                disabled={!selectedLocalAppUrl}
                className="mt-2 w-full rounded-md border border-default bg-surface-50 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Add selected app
              </button>
              {(localAppsSource || localAppsScannedPorts !== null) && (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Source: {localAppsSource || "unknown"}
                  {localAppsScannedPorts !== null ? ` · scanned ${localAppsScannedPorts} ports` : ""}
                  {localApps.length > 0 ? ` · found ${localApps.length} live apps` : ""}
                </p>
              )}
              {localAppsStatus === "error" && localAppsError && (
                <p className="mt-1 text-[10px] text-red-600">{localAppsError}</p>
              )}
            </div>
          </div>
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
