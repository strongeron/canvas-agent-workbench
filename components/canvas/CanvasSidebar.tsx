import { useDraggable } from "@dnd-kit/core"
import { ChevronDown, ChevronRight, FileText, GripVertical, Plus, RefreshCw, Save, Search } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import type { GalleryEntry } from "../../core/types"
import type { CanvasFileIndexEntry } from "../../types/canvas"
import type { PaperImportQueueItem } from "./CanvasTab"
import { fetchLocalApps, type LocalAppEntry } from "./localAppsService"
import { inferMediaKindFromFile } from "./mediaStorageService"

/** Component entry type for sidebar */
type ComponentEntry = GalleryEntry
type SidebarPanelId = "projects" | "canvases" | "components" | "media" | "embeds" | "diagrams" | "imports"
type ProjectSidebarEntry = {
  id: string
  label: string
  localScan?: {
    enabled: boolean
    watching: boolean
    repoPath: string
    repoLabel: string
    scannedAt?: string | null
    detectedCount?: number | null
    createdEntries?: number | null
    scannedFiles?: number | null
  } | null
}

function formatRelativeSyncTime(value?: string | null) {
  if (!value) return null
  const timestamp = new Date(value).getTime()
  if (Number.isNaN(timestamp)) return null
  const diffMs = timestamp - Date.now()
  const diffMinutes = Math.round(diffMs / 60000)

  if (Math.abs(diffMinutes) < 1) return "just now"
  if (Math.abs(diffMinutes) < 60) {
    return `${Math.abs(diffMinutes)}m ${diffMinutes < 0 ? "ago" : "from now"}`
  }

  const diffHours = Math.round(diffMinutes / 60)
  if (Math.abs(diffHours) < 24) {
    return `${Math.abs(diffHours)}h ${diffHours < 0 ? "ago" : "from now"}`
  }

  const diffDays = Math.round(diffHours / 24)
  return `${Math.abs(diffDays)}d ${diffDays < 0 ? "ago" : "from now"}`
}

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
  /** Add a Mermaid diagram node */
  onAddMermaid?: (input: {
    source?: string
    title?: string
    mermaidTheme?: "default" | "neutral" | "dark" | "forest" | "base"
    background?: string
  }) => void | Promise<void>
  /** Add an Excalidraw sketch node */
  onAddExcalidraw?: (input?: { title?: string }) => void | Promise<void>
  /** Add a Markdown node */
  onAddMarkdown?: (input?: {
    source?: string
    title?: string
    background?: string
  }) => void | Promise<void>
  /** Import markdown/diagram files (.md/.mmd/.mermaid/.excalidraw) */
  onImportDiagramFile?: (file: File) => void | Promise<void>
  /** Recent imports */
  importQueue?: PaperImportQueueItem[]
  onAddImportedComponent?: (componentId: string, variantIndex?: number) => void
  onClearImportQueue?: () => void
  /** Optional project selector */
  projects?: ProjectSidebarEntry[]
  activeProjectId?: string
  onSelectProject?: (id: string) => void
  onCreateProject?: () => void
  onScanLocalProject?: () => void | Promise<void>
  canvasFiles?: CanvasFileIndexEntry[]
  activeCanvasFilePath?: string | null
  activeCanvasFileTitle?: string | null
  canvasFilesLoading?: boolean
  canvasFilesSaving?: boolean
  canvasFilesError?: string | null
  canvasFileDirty?: boolean
  onRefreshCanvasFiles?: () => void | Promise<void>
  onOpenCanvasFile?: (filePath: string) => void | Promise<void>
  onCreateCanvasFile?: () => void | Promise<void>
  onSaveCanvasFile?: () => void | Promise<void>
}

export function CanvasSidebar({
  entries,
  onAddEmbed,
  onAddMedia,
  onAddMermaid,
  onAddExcalidraw,
  onAddMarkdown,
  onImportDiagramFile,
  importQueue,
  onAddImportedComponent,
  onClearImportQueue,
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProject,
  onScanLocalProject,
  canvasFiles,
  activeCanvasFilePath,
  activeCanvasFileTitle,
  canvasFilesLoading,
  canvasFilesSaving,
  canvasFilesError,
  canvasFileDirty,
  onRefreshCanvasFiles,
  onOpenCanvasFile,
  onCreateCanvasFile,
  onSaveCanvasFile,
}: CanvasSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [canvasSearchQuery, setCanvasSearchQuery] = useState("")
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
  const [mermaidSource, setMermaidSource] = useState("")
  const [mermaidTitle, setMermaidTitle] = useState("")
  const [mermaidTheme, setMermaidTheme] = useState<"default" | "neutral" | "dark" | "forest" | "base">("default")
  const [mermaidBackground, setMermaidBackground] = useState("")
  const [excalidrawTitle, setExcalidrawTitle] = useState("")
  const [markdownTitle, setMarkdownTitle] = useState("")
  const [markdownBackground, setMarkdownBackground] = useState("")
  const [markdownSource, setMarkdownSource] = useState("")
  const [diagramFile, setDiagramFile] = useState<File | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [expandedComponents, setExpandedComponents] = useState<Set<string>>(new Set())
  const [collapsedPanels, setCollapsedPanels] = useState<Record<SidebarPanelId, boolean>>({
    projects: false,
    canvases: false,
    components: false,
    media: false,
    embeds: false,
    diagrams: false,
    imports: false,
  })
  const mediaFileInputRef = useRef<HTMLInputElement>(null)
  const diagramFileInputRef = useRef<HTMLInputElement>(null)

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

  const togglePanel = useCallback((panelId: SidebarPanelId) => {
    setCollapsedPanels((prev) => ({
      ...prev,
      [panelId]: !prev[panelId],
    }))
  }, [])

  const activeProject = projects?.find((project) => project.id === activeProjectId) || null
  const activeLocalScan = activeProject?.localScan || null
  const activeLocalScanSyncedLabel = formatRelativeSyncTime(activeLocalScan?.scannedAt)
  const filteredCanvasFiles = useMemo(() => {
    if (!canvasFiles) return []
    if (!canvasSearchQuery.trim()) return canvasFiles
    const query = canvasSearchQuery.trim().toLowerCase()
    return canvasFiles.filter((file) => {
      const folderPath = file.path.split("/").slice(0, -1).join("/")
      return (
        file.title.toLowerCase().includes(query) ||
        file.path.toLowerCase().includes(query) ||
        folderPath.toLowerCase().includes(query)
      )
    })
  }, [canvasFiles, canvasSearchQuery])

  return (
    <aside className="flex h-full min-h-0 w-72 shrink-0 flex-col overflow-y-auto border-r border-default bg-white">
      {projects && projects.length > 0 && (
        <div className="border-b border-default p-3">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => togglePanel("projects")}
              className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {collapsedPanels.projects ? (
                <ChevronRight className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
              <span>Projects</span>
            </button>
            <div className="flex items-center gap-1">
              {onScanLocalProject && (
                <button
                  type="button"
                  onClick={() => {
                    void onScanLocalProject()
                  }}
                  className="rounded p-1 text-muted-foreground hover:bg-surface-100 hover:text-foreground"
                  aria-label="Scan local repository"
                  title="Scan local repository"
                >
                  <Search className="h-3.5 w-3.5" />
                </button>
              )}
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
          </div>
          {!collapsedPanels.projects && (
            <div className="space-y-1">
              {projects.map((project) => {
                const localScan = project.localScan || null
                const syncDotClass = localScan
                  ? localScan.watching
                    ? "bg-emerald-500"
                    : "bg-amber-500"
                  : "bg-transparent"

                return (
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
                    <span className="flex min-w-0 items-center gap-2">
                      {localScan ? (
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${syncDotClass}`}
                          aria-hidden="true"
                        />
                      ) : null}
                      <span className="truncate">{project.label}</span>
                    </span>
                    <span className="ml-3 flex shrink-0 items-center gap-2">
                      {localScan?.watching ? (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                          Sync
                        </span>
                      ) : null}
                      {activeProjectId === project.id ? (
                        <span className="text-xs font-semibold text-brand-600">Active</span>
                      ) : null}
                    </span>
                  </button>
                )
              })}
              {activeLocalScan ? (
                <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50/70 p-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        activeLocalScan.watching ? "bg-emerald-500" : "bg-amber-500"
                      }`}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground">
                        {activeLocalScan.watching ? "Watching local folder" : "Local scan linked"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activeLocalScan.repoLabel}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {activeLocalScanSyncedLabel ? (
                      <span className="rounded border border-emerald-200 bg-white px-2 py-1 text-[11px] text-muted-foreground">
                        Synced {activeLocalScanSyncedLabel}
                      </span>
                    ) : null}
                    {typeof activeLocalScan.detectedCount === "number" ? (
                      <span className="rounded border border-emerald-200 bg-white px-2 py-1 text-[11px] text-muted-foreground">
                        {activeLocalScan.detectedCount} components
                      </span>
                    ) : null}
                  </div>
                  <div
                    className="mt-2 truncate rounded border border-emerald-200/80 bg-white/90 px-2 py-1 font-mono text-[11px] text-muted-foreground"
                    title={activeLocalScan.repoPath}
                  >
                    {activeLocalScan.repoPath}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}

      {activeProjectId && (
        <div className="border-b border-default p-3">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => togglePanel("canvases")}
              className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {collapsedPanels.canvases ? (
                <ChevronRight className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
              <span>Canvases</span>
            </button>
            <div className="flex items-center gap-1">
              {onRefreshCanvasFiles && (
                <button
                  type="button"
                  onClick={() => {
                    void onRefreshCanvasFiles()
                  }}
                  className="rounded p-1 text-muted-foreground hover:bg-surface-100 hover:text-foreground"
                  aria-label="Refresh canvas files"
                  title="Refresh canvas files"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${canvasFilesLoading ? "animate-spin" : ""}`} />
                </button>
              )}
              {onSaveCanvasFile && (
                <button
                  type="button"
                  onClick={() => {
                    void onSaveCanvasFile()
                  }}
                  className="rounded p-1 text-muted-foreground hover:bg-surface-100 hover:text-foreground"
                  aria-label="Save current canvas file"
                  title="Save current canvas file"
                >
                  <Save className="h-3.5 w-3.5" />
                </button>
              )}
              {onCreateCanvasFile && (
                <button
                  type="button"
                  onClick={() => {
                    void onCreateCanvasFile()
                  }}
                  className="rounded p-1 text-muted-foreground hover:bg-surface-100 hover:text-foreground"
                  aria-label="Create canvas file"
                  title="Create canvas file"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
          {!collapsedPanels.canvases && (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  value={canvasSearchQuery}
                  onChange={(e) => setCanvasSearchQuery(e.target.value)}
                  placeholder="Search canvases..."
                  className="w-full rounded-md border border-default bg-white py-1.5 pl-8 pr-3 text-sm text-foreground placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div className="rounded-md border border-default bg-surface-50/60 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Current file
                </p>
                <p className="mt-1 truncate text-sm font-medium text-foreground">
                  {activeCanvasFileTitle || "Unsaved canvas"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {activeCanvasFilePath || "Create or save a real .canvas file for this board."}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {canvasFileDirty ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                      Unsaved changes
                    </span>
                  ) : !activeCanvasFilePath ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                      Local draft
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                      Saved
                    </span>
                  )}
                  {canvasFilesSaving ? (
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">
                      Saving…
                    </span>
                  ) : null}
                </div>
              </div>
              {canvasFilesError ? (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {canvasFilesError}
                </div>
              ) : null}
              <div className="max-h-56 overflow-y-auto rounded-md border border-default">
                {filteredCanvasFiles.length === 0 ? (
                  <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                    {canvasFilesLoading ? "Loading canvas files…" : "No canvas files yet"}
                  </div>
                ) : (
                  <div className="divide-y divide-default">
                    {filteredCanvasFiles.map((file) => {
                      const folderPath = file.path.split("/").slice(0, -1).join("/")
                      const isActive = activeCanvasFilePath === file.path
                      return (
                        <button
                          key={file.path}
                          type="button"
                          onClick={() => {
                            void onOpenCanvasFile?.(file.path)
                          }}
                          className={`flex w-full items-start gap-2 px-3 py-2 text-left transition-colors ${
                            isActive ? "bg-brand-50" : "hover:bg-surface-50"
                          }`}
                        >
                          <FileText className={`mt-0.5 h-4 w-4 shrink-0 ${isActive ? "text-brand-700" : "text-muted-foreground"}`} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-foreground">
                              {file.title}
                            </span>
                            <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                              {folderPath || "root"} · {file.itemCount} items
                            </span>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="border-b border-default p-3">
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => togglePanel("components")}
            className="flex items-center gap-1 text-sm font-semibold text-foreground"
          >
            {collapsedPanels.components ? (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span>Components</span>
          </button>
        </div>
        {!collapsedPanels.components && (
          <>
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
            <div className="mt-2 max-h-[40vh] overflow-y-auto rounded-md border border-default">
              {filteredCategories.map(({ category, components }) => (
                <div key={category} className="border-b border-default last:border-b-0">
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
              {filteredCategories.length === 0 && (
                <div className="p-3 text-xs text-muted-foreground">No components found.</div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="border-b border-default p-3">
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => togglePanel("media")}
            className="flex items-center gap-1 text-sm font-semibold text-foreground"
          >
            {collapsedPanels.media ? (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span>Media</span>
          </button>
        </div>
        {!collapsedPanels.media && (
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
        )}
      </div>

      <div className="border-b border-default p-3">
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => togglePanel("embeds")}
            className="flex items-center gap-1 text-sm font-semibold text-foreground"
          >
            {collapsedPanels.embeds ? (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span>Embeds</span>
          </button>
        </div>
        {!collapsedPanels.embeds && (
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
        )}
      </div>

      {(onAddMermaid || onAddExcalidraw || onAddMarkdown || onImportDiagramFile) && (
        <div className="border-b border-default p-3">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => togglePanel("diagrams")}
              className="flex items-center gap-1 text-sm font-semibold text-foreground"
            >
              {collapsedPanels.diagrams ? (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span>Diagrams</span>
            </button>
          </div>
          {!collapsedPanels.diagrams && (
            <div className="space-y-2">
              {onAddMermaid && (
                <div className="rounded-md border border-default bg-surface-50 p-2">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Mermaid
                  </div>
                  <input
                    type="text"
                    value={mermaidTitle}
                    onChange={(event) => setMermaidTitle(event.target.value)}
                    placeholder="Diagram title (optional)"
                    className="w-full rounded-md border border-default bg-white px-2 py-1.5 text-xs text-foreground placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <select
                      value={mermaidTheme}
                      onChange={(event) =>
                        setMermaidTheme(
                          event.target.value as "default" | "neutral" | "dark" | "forest" | "base"
                        )
                      }
                      className="rounded-md border border-default bg-white px-2 py-1.5 text-xs text-foreground focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    >
                      <option value="default">Default</option>
                      <option value="neutral">Neutral</option>
                      <option value="dark">Dark</option>
                      <option value="forest">Forest</option>
                      <option value="base">Base</option>
                    </select>
                    <input
                      type="text"
                      value={mermaidBackground}
                      onChange={(event) => setMermaidBackground(event.target.value)}
                      placeholder="Background"
                      className="rounded-md border border-default bg-white px-2 py-1.5 text-xs text-foreground placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                  <textarea
                    value={mermaidSource}
                    onChange={(event) => setMermaidSource(event.target.value)}
                    rows={6}
                    placeholder={`flowchart LR
A-->B`}
                    className="mt-2 min-h-[110px] w-full rounded-md border border-default bg-white px-2 py-1.5 font-mono text-xs text-foreground placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      void onAddMermaid({
                        source: mermaidSource.trim() || undefined,
                        title: mermaidTitle.trim() || undefined,
                        mermaidTheme,
                        background: mermaidBackground.trim() || undefined,
                      })
                      setMermaidTitle("")
                    }}
                    className="mt-2 w-full rounded-md border border-default bg-white px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-100"
                  >
                    Add Mermaid
                  </button>
                </div>
              )}

              {onAddExcalidraw && (
                <div className="rounded-md border border-default bg-surface-50 p-2">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Excalidraw
                  </div>
                  <input
                    type="text"
                    value={excalidrawTitle}
                    onChange={(event) => setExcalidrawTitle(event.target.value)}
                    placeholder="Sketch title (optional)"
                    className="w-full rounded-md border border-default bg-white px-2 py-1.5 text-xs text-foreground placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      void onAddExcalidraw({ title: excalidrawTitle.trim() || undefined })
                      setExcalidrawTitle("")
                    }}
                    className="mt-2 w-full rounded-md border border-default bg-white px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-100"
                  >
                    Add Excalidraw
                  </button>
                </div>
              )}

              {onAddMarkdown && (
                <div className="rounded-md border border-default bg-surface-50 p-2">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Markdown
                  </div>
                  <input
                    type="text"
                    value={markdownTitle}
                    onChange={(event) => setMarkdownTitle(event.target.value)}
                    placeholder="Document title (optional)"
                    className="w-full rounded-md border border-default bg-white px-2 py-1.5 text-xs text-foreground placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  <div className="mt-2 grid grid-cols-1 gap-2">
                    <input
                      type="text"
                      value={markdownBackground}
                      onChange={(event) => setMarkdownBackground(event.target.value)}
                      placeholder="Background"
                      className="rounded-md border border-default bg-white px-2 py-1.5 text-xs text-foreground placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                  <textarea
                    value={markdownSource}
                    onChange={(event) => setMarkdownSource(event.target.value)}
                    rows={5}
                    placeholder={`# Document title\n\nAdd your markdown text here...`}
                    className="mt-2 min-h-[110px] w-full rounded-md border border-default bg-white px-2 py-1.5 font-mono text-xs text-foreground placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Mermaid fences are supported: <code className="font-mono">```mermaid</code>
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      void onAddMarkdown({
                        source: markdownSource.trim() || undefined,
                        title: markdownTitle.trim() || undefined,
                        background: markdownBackground.trim() || undefined,
                      })
                      setMarkdownTitle("")
                      setMarkdownBackground("")
                      setMarkdownSource("")
                    }}
                    className="mt-2 w-full rounded-md border border-default bg-white px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-100"
                  >
                    Add Markdown
                  </button>
                </div>
              )}

              {onImportDiagramFile && (
                <div className="rounded-md border border-default bg-surface-50 p-2">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Import Diagram File
                  </div>
                  <input
                    ref={diagramFileInputRef}
                    type="file"
                    accept=".md,.markdown,.mmd,.mermaid,.mdm,.excalidraw,application/json,text/plain"
                    onChange={(event) => {
                      const file = event.target.files?.[0] || null
                      setDiagramFile(file)
                    }}
                    className="w-full rounded-md border border-default bg-white px-2 py-1.5 text-xs text-foreground file:mr-2 file:rounded file:border file:border-default file:bg-surface-50 file:px-2 file:py-1 file:text-[11px] file:font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!diagramFile) return
                      void onImportDiagramFile(diagramFile)
                      setDiagramFile(null)
                      if (diagramFileInputRef.current) {
                        diagramFileInputRef.current.value = ""
                      }
                    }}
                    className="mt-2 w-full rounded-md border border-default bg-white px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-100 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!diagramFile}
                  >
                    Import file
                  </button>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Supports `.md`, `.mmd`, `.mermaid`, and `.excalidraw`.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {importQueue && importQueue.length > 0 && (
        <div className="border-b border-default p-3">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => togglePanel("imports")}
              className="flex items-center gap-1 text-sm font-semibold text-foreground"
            >
              {collapsedPanels.imports ? (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span>Imports</span>
            </button>
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
          {!collapsedPanels.imports && (
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
          )}
        </div>
      )}
    </aside>
  )
}
