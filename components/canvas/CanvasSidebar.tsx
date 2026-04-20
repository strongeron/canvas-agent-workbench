import { useDraggable } from "@dnd-kit/core"
import { ChevronDown, ChevronRight, Copy, FileText, GripVertical, Pencil, Plus, RefreshCw, Save, Search, Star, Trash2, X } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { useLocalStorage } from "../../hooks/useLocalStorage"
import type { GalleryEntry } from "../../core/types"
import type { CanvasFileIndexEntry, CanvasHtmlBundleLibraryScanResult } from "../../types/canvas"
import type { CanvasFolderTreeEntry } from "../../hooks/useCanvasFileBrowserState"
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

type PickedHtmlBundleEntry = {
  id: string
  relativeDirectory: string
  entryFiles: string[]
  defaultEntryFile: string
}

type PickedHtmlBundleFile = {
  file: File
  relativePath: string
}

type FileSystemFileHandleLike = {
  kind: "file"
  name: string
  getFile(): Promise<File>
}

type FileSystemDirectoryHandleLike = {
  kind: "directory"
  name: string
  values(): AsyncIterable<FileSystemDirectoryHandleLike | FileSystemFileHandleLike>
}

function normalizePickedFileRelativePath(file: File) {
  const rawPath =
    typeof file.webkitRelativePath === "string" && file.webkitRelativePath.trim()
      ? file.webkitRelativePath.trim()
      : file.name
  const normalized = rawPath.replace(/\\/g, "/").replace(/^\/+/, "")
  const segments = normalized.split("/").filter(Boolean)
  if (segments.length <= 1) return segments[0] || file.name
  return segments.slice(1).join("/")
}

function normalizeRelativeBrowserPath(value: string) {
  const parts = value.replace(/\\/g, "/").split("/")
  const stack: string[] = []
  for (const part of parts) {
    if (!part || part === ".") continue
    if (part === "..") {
      stack.pop()
      continue
    }
    stack.push(part)
  }
  return stack.join("/")
}

function isLocalBundleReference(value: string) {
  const normalized = value.trim()
  if (!normalized) return false
  if (normalized.startsWith("#")) return false
  if (normalized.startsWith("/")) return false
  if (/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(normalized)) return false
  if (/^(?:data|mailto|tel|javascript):/i.test(normalized)) return false
  return true
}

function stripQueryAndHash(value: string) {
  return value.replace(/[?#].*$/, "")
}

function resolvePickedBundleReference(currentRelativePath: string, reference: string) {
  const normalizedRef = stripQueryAndHash(reference.trim())
  if (!isLocalBundleReference(normalizedRef)) return null
  const currentSegments = currentRelativePath.split("/").filter(Boolean)
  currentSegments.pop()
  return normalizeRelativeBrowserPath([...currentSegments, normalizedRef].join("/"))
}

function extractHtmlReferences(source: string) {
  const references: string[] = []
  const attrPattern = /\b(?:src|href)=["']([^"']+)["']/gi
  let match = attrPattern.exec(source)
  while (match) {
    references.push(match[1] || "")
    match = attrPattern.exec(source)
  }
  return references
}

function extractCssReferences(source: string) {
  const references: string[] = []
  const urlPattern = /url\(\s*['"]?([^"')]+)['"]?\s*\)/gi
  let match = urlPattern.exec(source)
  while (match) {
    references.push(match[1] || "")
    match = urlPattern.exec(source)
  }
  const importPattern = /@import\s+(?:url\()?['"]?([^"')\s]+)['"]?\)?/gi
  match = importPattern.exec(source)
  while (match) {
    references.push(match[1] || "")
    match = importPattern.exec(source)
  }
  return references
}

function extractJsReferences(source: string) {
  const references: string[] = []
  const importPattern = /\bimport\s+(?:[^"'()]+?\s+from\s+)?["']([^"']+)["']/gi
  let match = importPattern.exec(source)
  while (match) {
    references.push(match[1] || "")
    match = importPattern.exec(source)
  }
  const dynamicImportPattern = /\bimport\(\s*["']([^"']+)["']\s*\)/gi
  match = dynamicImportPattern.exec(source)
  while (match) {
    references.push(match[1] || "")
    match = dynamicImportPattern.exec(source)
  }
  return references
}

function buildPickedHtmlBundleEntries(files: PickedHtmlBundleFile[]) {
  const groups = new Map<string, Set<string>>()
  for (const file of files) {
    const relativePath = file.relativePath
    if (!/\.html?$/i.test(relativePath)) continue
    const segments = relativePath.split("/").filter(Boolean)
    const fileName = segments.pop() || relativePath
    const directory = segments.join("/") || "."
    if (!groups.has(directory)) {
      groups.set(directory, new Set())
    }
    groups.get(directory)?.add(fileName)
  }

  return Array.from(groups.entries())
    .map(([relativeDirectory, entryFiles]) => {
      const sortedEntryFiles = Array.from(entryFiles).sort((left, right) => left.localeCompare(right))
      return {
        id: relativeDirectory,
        relativeDirectory,
        entryFiles: sortedEntryFiles,
        defaultEntryFile:
          sortedEntryFiles.find((fileName) => /^index\.html?$/i.test(fileName)) || sortedEntryFiles[0],
      } satisfies PickedHtmlBundleEntry
    })
    .sort((left, right) => left.relativeDirectory.localeCompare(right.relativeDirectory))
}

async function collectPickedHtmlBundleFilesForEntry(
  files: PickedHtmlBundleFile[],
  entryRelativePath: string
) {
  const fileMap = new Map(
    files.map((file) => [file.relativePath, file] as const)
  )
  const pending = [normalizeRelativeBrowserPath(entryRelativePath)]
  const included = new Set<string>()

  while (pending.length > 0) {
    const currentPath = pending.pop()
    if (!currentPath || included.has(currentPath)) continue
    const file = fileMap.get(currentPath)
    if (!file) continue
    included.add(currentPath)

    const lowerPath = currentPath.toLowerCase()
    if (!/\.(html?|css|mjs|js)$/i.test(lowerPath)) continue

    const source = await file.file.text()
    const references = lowerPath.endsWith(".css")
      ? extractCssReferences(source)
      : lowerPath.endsWith(".js") || lowerPath.endsWith(".mjs")
        ? extractJsReferences(source)
        : extractHtmlReferences(source)

    for (const reference of references) {
      const resolved = resolvePickedBundleReference(currentPath, reference)
      if (!resolved || included.has(resolved) || !fileMap.has(resolved)) continue
      pending.push(resolved)
    }
  }

  return Array.from(included)
    .sort((left, right) => left.localeCompare(right))
    .map((relativePath) => fileMap.get(relativePath))
    .filter((file): file is PickedHtmlBundleFile => Boolean(file))
}

async function collectDirectoryHandleFiles(
  directoryHandle: FileSystemDirectoryHandleLike,
  prefix = ""
): Promise<PickedHtmlBundleFile[]> {
  const files: PickedHtmlBundleFile[] = []
  for await (const entry of directoryHandle.values()) {
    if (entry.kind === "directory") {
      const nested = await collectDirectoryHandleFiles(
        entry,
        prefix ? `${prefix}/${entry.name}` : entry.name
      )
      files.push(...nested)
      continue
    }

    const file = await entry.getFile()
    const relativePath = normalizeRelativeBrowserPath(
      prefix ? `${prefix}/${entry.name}` : entry.name
    )
    files.push({ file, relativePath })
  }
  return files
}

const CANVAS_FILE_ROW_HEIGHT = 52
const CANVAS_FILE_LIST_HEIGHT = 256

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
  /** Import a local HTML/CSS/JS bundle into the active canvas file and place it on the board */
  onAddHtmlBundle?: (input: {
    files?: File[]
    fileEntries?: Array<{ file: File; relativePath: string }>
    title?: string
  }) => void | Promise<void>
  onAddHtmlBundleFromDirectory?: (input: {
    directoryPath: string
    entryFile?: string
    title?: string
  }) => void | Promise<void>
  onScanHtmlBundleLibrary?: (rootPath: string) => Promise<CanvasHtmlBundleLibraryScanResult>
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
  canvasSaveQueued?: boolean
  onRefreshCanvasFiles?: () => void | Promise<void>
  onOpenCanvasFile?: (filePath: string) => void | Promise<void>
  onCreateCanvasFile?: () => void | Promise<void>
  onSaveCanvasFile?: () => void | Promise<void>
  onToggleCanvasFavorite?: (filePath: string) => void | Promise<void>
  onRenameCanvasFile?: (filePath: string) => void | Promise<void>
  onDuplicateCanvasFile?: (filePath: string) => void | Promise<void>
  onDeleteCanvasFile?: (filePath: string) => void | Promise<void>
  openCanvasTabs?: CanvasFileIndexEntry[]
  recentCanvasFiles?: CanvasFileIndexEntry[]
  favoriteCanvasFiles?: CanvasFileIndexEntry[]
  canvasFolderEntries?: CanvasFolderTreeEntry[]
  selectedCanvasFolder?: string
  onSelectCanvasFolder?: (folder: string) => void
  onCloseCanvasTab?: (filePath: string) => void
}

export function CanvasSidebar({
  entries,
  onAddEmbed,
  onAddHtmlBundle,
  onAddHtmlBundleFromDirectory,
  onScanHtmlBundleLibrary,
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
  canvasSaveQueued,
  onRefreshCanvasFiles,
  onOpenCanvasFile,
  onCreateCanvasFile,
  onSaveCanvasFile,
  onToggleCanvasFavorite,
  onRenameCanvasFile,
  onDuplicateCanvasFile,
  onDeleteCanvasFile,
  openCanvasTabs,
  recentCanvasFiles,
  favoriteCanvasFiles,
  canvasFolderEntries,
  selectedCanvasFolder,
  onSelectCanvasFolder,
  onCloseCanvasTab,
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
  const [htmlBundleTitle, setHtmlBundleTitle] = useState("")
  const [htmlBundleFiles, setHtmlBundleFiles] = useState<PickedHtmlBundleFile[]>([])
  const htmlBundleRootStorageKey = activeProjectId
    ? `gallery-${activeProjectId}-html-bundle-root`
    : "gallery-html-bundle-root"
  const [htmlBundleRootPath, setHtmlBundleRootPath] = useLocalStorage<string>(
    htmlBundleRootStorageKey,
    ""
  )
  const [htmlBundleLibrarySearch, setHtmlBundleLibrarySearch] = useState("")
  const [htmlBundleLibraryStatus, setHtmlBundleLibraryStatus] =
    useState<"idle" | "loading" | "ready" | "error">("idle")
  const [htmlBundleLibraryError, setHtmlBundleLibraryError] = useState<string | null>(null)
  const [htmlBundleLibraryResult, setHtmlBundleLibraryResult] =
    useState<CanvasHtmlBundleLibraryScanResult | null>(null)
  const [htmlBundleSourceLabel, setHtmlBundleSourceLabel] = useState("")
  const [htmlBundleImportBusy, setHtmlBundleImportBusy] = useState(false)
  const [htmlBundleImportError, setHtmlBundleImportError] = useState<string | null>(null)
  const [htmlBundleImportStatus, setHtmlBundleImportStatus] = useState<string | null>(null)
  const pickedHtmlBundleEntries = useMemo(
    () => buildPickedHtmlBundleEntries(htmlBundleFiles),
    [htmlBundleFiles]
  )
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
  const htmlBundleInputRef = useRef<HTMLInputElement>(null)
  const htmlEntryFileInputRef = useRef<HTMLInputElement>(null)
  const diagramFileInputRef = useRef<HTMLInputElement>(null)
  const canvasListRef = useRef<HTMLDivElement>(null)
  const [canvasListScrollTop, setCanvasListScrollTop] = useState(0)
  const htmlDirectoryInputProps = {
    webkitdirectory: "",
    directory: "",
  } as Record<string, string>
  const supportsDirectoryPicker =
    typeof window !== "undefined" && "showDirectoryPicker" in window
  const supportsOpenFilePicker =
    typeof window !== "undefined" && "showOpenFilePicker" in window

  const renderCanvasFileActions = useCallback(
    (file: CanvasFileIndexEntry, compact = false) => (
      <div className={`flex items-center ${compact ? "gap-0.5" : "gap-1"}`}>
        {onRenameCanvasFile ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              void onRenameCanvasFile(file.path)
            }}
            className="rounded-full p-1 text-muted-foreground hover:bg-white hover:text-foreground"
            aria-label={`Rename or move ${file.title}`}
            title="Rename or move"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        ) : null}
        {onDuplicateCanvasFile ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              void onDuplicateCanvasFile(file.path)
            }}
            className="rounded-full p-1 text-muted-foreground hover:bg-white hover:text-foreground"
            aria-label={`Duplicate ${file.title}`}
            title="Duplicate"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        ) : null}
        {onDeleteCanvasFile ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              void onDeleteCanvasFile(file.path)
            }}
            className="rounded-full p-1 text-muted-foreground hover:bg-white hover:text-rose-600"
            aria-label={`Delete ${file.title}`}
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    ),
    [onDeleteCanvasFile, onDuplicateCanvasFile, onRenameCanvasFile]
  )

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

  const handleScanHtmlBundleLibrary = useCallback(async () => {
    const rootPath = htmlBundleRootPath.trim()
    if (!rootPath || !onScanHtmlBundleLibrary) return
    setHtmlBundleLibraryStatus("loading")
    setHtmlBundleLibraryError(null)
    try {
      const result = await onScanHtmlBundleLibrary(rootPath)
      setHtmlBundleLibraryResult(result)
      setHtmlBundleLibraryStatus("ready")
    } catch (error) {
      setHtmlBundleLibraryStatus("error")
      setHtmlBundleLibraryError(
        error instanceof Error ? error.message : "Failed to scan HTML bundle library."
      )
    }
  }, [htmlBundleRootPath, onScanHtmlBundleLibrary])

  const handleHtmlBundleFolderSelection = useCallback((files: FileList | File[] | null) => {
    const nextFiles = Array.from(files || []).map((file) => ({
      file,
      relativePath: normalizePickedFileRelativePath(file),
    }))
    setHtmlBundleFiles(nextFiles)
    const firstRelativePath = nextFiles[0]?.relativePath || ""
    const firstRootSegment = firstRelativePath.split("/").filter(Boolean)[0] || ""
    setHtmlBundleSourceLabel(firstRootSegment || "selected folder")
    setHtmlBundleImportError(null)
    setHtmlBundleImportStatus(null)
  }, [])

  const resetPickedHtmlBundleState = useCallback(() => {
    setHtmlBundleTitle("")
    setHtmlBundleFiles([])
    setHtmlBundleSourceLabel("")
    if (htmlEntryFileInputRef.current) {
      htmlEntryFileInputRef.current.value = ""
    }
  }, [])

  const runHtmlBundleImport = useCallback(
    async (action: () => Promise<void>, successMessage: string) => {
      setHtmlBundleImportBusy(true)
      setHtmlBundleImportError(null)
      setHtmlBundleImportStatus(null)
      try {
        await action()
        setHtmlBundleImportStatus(successMessage)
      } catch (error) {
        setHtmlBundleImportError(
          error instanceof Error ? error.message : "Failed to import HTML bundle."
        )
      } finally {
        setHtmlBundleImportBusy(false)
      }
    },
    []
  )

  const handleHtmlFileSelection = useCallback(async (files: FileList | File[] | null) => {
    const nextFiles = Array.from(files || [])
      .filter((file) => /\.html?$/i.test(file.name))
      .map((file) => ({
        file,
        relativePath: file.name,
      }))
    setHtmlBundleFiles(nextFiles)
    setHtmlBundleSourceLabel(nextFiles[0]?.file.name || "selected html file")
    setHtmlBundleImportError(null)
    setHtmlBundleImportStatus(null)

    if (!nextFiles.length || !onAddHtmlBundle) return

    await runHtmlBundleImport(async () => {
      await onAddHtmlBundle({
        fileEntries: nextFiles,
        title: htmlBundleTitle.trim() || undefined,
      })
      resetPickedHtmlBundleState()
    }, `Imported ${nextFiles[0]?.file.name || "HTML file"} as an HTML node.`)
  }, [htmlBundleTitle, onAddHtmlBundle, resetPickedHtmlBundleState, runHtmlBundleImport])

  const handlePickHtmlBundleFolder = useCallback(async () => {
    if (!supportsDirectoryPicker) {
      setHtmlBundleImportError(
        "Native folder picking is not supported in this browser. Use the advanced filesystem root scan below or a Chromium browser."
      )
      return
    }
    try {
      const pickerWindow = window as typeof window & {
        showDirectoryPicker?: () => Promise<FileSystemDirectoryHandleLike>
      }
      const directoryHandle = await pickerWindow.showDirectoryPicker?.()
      if (!directoryHandle) return
      const nextFiles = await collectDirectoryHandleFiles(directoryHandle)
      setHtmlBundleFiles(nextFiles)
      setHtmlBundleSourceLabel(directoryHandle.name || "selected folder")
      setHtmlBundleImportError(null)
      setHtmlBundleImportStatus(
        nextFiles.length > 0
          ? `Loaded ${nextFiles.length} files from ${directoryHandle.name}.`
          : `No files found in ${directoryHandle.name}.`
      )
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return
      setHtmlBundleImportError(
        error instanceof Error ? error.message : "Failed to read selected folder."
      )
    }
  }, [supportsDirectoryPicker])

  const handlePickHtmlEntryFile = useCallback(async () => {
    if (supportsOpenFilePicker) {
      try {
        const pickerWindow = window as typeof window & {
          showOpenFilePicker?: (options?: unknown) => Promise<FileSystemFileHandleLike[]>
        }
        const handles = await pickerWindow.showOpenFilePicker?.({
          multiple: false,
          types: [
            {
              description: "HTML files",
              accept: {
                "text/html": [".html", ".htm"],
              },
            },
          ],
        })
        const nextFiles = await Promise.all(
          Array.from(handles || []).map(async (handle) => ({
            file: await handle.getFile(),
            relativePath: handle.name,
          }))
        )
        setHtmlBundleFiles(nextFiles)
        setHtmlBundleSourceLabel(nextFiles[0]?.file.name || "selected html file")
        setHtmlBundleImportError(null)
        setHtmlBundleImportStatus(null)

        if (!nextFiles.length || !onAddHtmlBundle) return

        await runHtmlBundleImport(async () => {
          await onAddHtmlBundle({
            fileEntries: nextFiles,
            title: htmlBundleTitle.trim() || undefined,
          })
          resetPickedHtmlBundleState()
        }, `Imported ${nextFiles[0]?.file.name || "HTML file"} as an HTML node.`)
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return
        setHtmlBundleImportError(
          error instanceof Error ? error.message : "Failed to read selected HTML file."
        )
      }
      return
    }

    htmlEntryFileInputRef.current?.click()
  }, [htmlBundleTitle, onAddHtmlBundle, resetPickedHtmlBundleState, runHtmlBundleImport, supportsOpenFilePicker])

  const togglePanel = useCallback((panelId: SidebarPanelId) => {
    setCollapsedPanels((prev) => ({
      ...prev,
      [panelId]: !prev[panelId],
    }))
  }, [])

  const activeProject = projects?.find((project) => project.id === activeProjectId) || null
  const activeLocalScan = activeProject?.localScan || null
  const activeLocalScanSyncedLabel = formatRelativeSyncTime(activeLocalScan?.scannedAt)
  const filteredHtmlBundleEntries = useMemo(() => {
    const entries = htmlBundleLibraryResult?.entries || []
    const query = htmlBundleLibrarySearch.trim().toLowerCase()
    if (!query) return entries
    return entries.filter(
      (entry) =>
        entry.relativeDirectory.toLowerCase().includes(query) ||
        entry.entryFiles.some((fileName) => fileName.toLowerCase().includes(query))
    )
  }, [htmlBundleLibraryResult, htmlBundleLibrarySearch])
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
  const visibleCanvasRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(canvasListScrollTop / CANVAS_FILE_ROW_HEIGHT) - 3)
    const visibleCount = Math.ceil(CANVAS_FILE_LIST_HEIGHT / CANVAS_FILE_ROW_HEIGHT) + 6
    const endIndex = Math.min(filteredCanvasFiles.length, startIndex + visibleCount)
    return { startIndex, endIndex }
  }, [canvasListScrollTop, filteredCanvasFiles.length])
  const visibleCanvasFiles = filteredCanvasFiles.slice(
    visibleCanvasRange.startIndex,
    visibleCanvasRange.endIndex
  )

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
              <div className="rounded-md border border-default bg-surface-50/50 px-3 py-2 text-[11px] text-muted-foreground">
                Projects are workspaces. Canvases are local
                <code className="mx-1 font-mono">.canvas</code>
                documents inside the active project.
              </div>
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
                  {activeCanvasFilePath || "Auto-saved browser draft. Open or create a real .canvas file to enable document-backed assets like HTML bundles."}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {canvasFileDirty ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                      Autosave pending
                    </span>
                  ) : !activeCanvasFilePath ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                      Browser draft
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                      Autosaved locally
                    </span>
                  )}
                  {canvasFilesSaving ? (
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">
                      Saving…
                    </span>
                  ) : null}
                  {canvasSaveQueued ? (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                      Save queued
                    </span>
                  ) : null}
                  {activeCanvasFilePath && activeCanvasFileTitle
                    ? renderCanvasFileActions(
                        {
                          id: activeCanvasFilePath,
                          projectId: activeProjectId || "active",
                          path: activeCanvasFilePath,
                          title: activeCanvasFileTitle,
                          surface: "canvas",
                          updatedAt: "",
                          createdAt: "",
                          tags: [],
                          favorite: false,
                          archived: false,
                          itemCount: 0,
                          groupCount: 0,
                        },
                        true
                      )
                    : null}
                </div>
              </div>
              {canvasFilesError ? (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {canvasFilesError}
                </div>
              ) : null}
              {openCanvasTabs && openCanvasTabs.length > 0 ? (
                <div className="rounded-md border border-default bg-white px-2 py-2">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Open tabs
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {openCanvasTabs.map((file) => {
                      const isActive = activeCanvasFilePath === file.path
                      return (
                        <span
                          key={file.path}
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] ${
                            isActive
                              ? "border-brand-300 bg-brand-50 text-brand-700"
                              : "border-default bg-surface-50 text-foreground"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              void onOpenCanvasFile?.(file.path)
                            }}
                            className="truncate"
                          >
                            {file.title}
                          </button>
                          {renderCanvasFileActions(file, true)}
                          <button
                            type="button"
                            onClick={() => onCloseCanvasTab?.(file.path)}
                            className="rounded-full p-0.5 text-muted-foreground hover:bg-white"
                            aria-label={`Close ${file.title}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      )
                    })}
                  </div>
                </div>
              ) : null}
              {recentCanvasFiles && recentCanvasFiles.length > 0 ? (
                <div className="rounded-md border border-default bg-white px-2 py-2">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Recent
                  </div>
                  <div className="space-y-1">
                    {recentCanvasFiles.slice(0, 5).map((file) => (
                      <button
                        key={file.path}
                        type="button"
                        onClick={() => {
                          void onOpenCanvasFile?.(file.path)
                        }}
                        className="flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-xs text-foreground hover:bg-surface-50"
                      >
                        <span className="truncate">{file.title}</span>
                        <span className="ml-2 shrink-0 text-[10px] text-muted-foreground">
                          {file.path.split("/").slice(0, -1).join("/") || "root"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {favoriteCanvasFiles && favoriteCanvasFiles.length > 0 ? (
                <div className="rounded-md border border-default bg-white px-2 py-2">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Favorites
                  </div>
                  <div className="space-y-1">
                    {favoriteCanvasFiles.map((file) => (
                      <button
                        key={file.path}
                        type="button"
                        onClick={() => {
                          void onOpenCanvasFile?.(file.path)
                        }}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs text-foreground hover:bg-surface-50"
                      >
                        <Star className="h-3.5 w-3.5 shrink-0 fill-current text-amber-500" />
                        <span className="truncate">{file.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {canvasFolderEntries && canvasFolderEntries.length > 0 ? (
                <div className="rounded-md border border-default bg-white px-2 py-2">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Folder tree
                  </div>
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => onSelectCanvasFolder?.("all")}
                      className={`flex w-full items-center justify-between rounded-md border px-2 py-1 text-left text-[11px] ${
                        (selectedCanvasFolder || "all") === "all"
                          ? "border-brand-300 bg-brand-50 text-brand-700"
                          : "border-default bg-surface-50 text-foreground"
                      }`}
                    >
                      <span>All canvases</span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {canvasFiles?.length ?? 0}
                      </span>
                    </button>
                    {canvasFolderEntries.map((entry) => (
                      <button
                        key={entry.folder}
                        type="button"
                        onClick={() => onSelectCanvasFolder?.(entry.folder)}
                        className={`flex w-full items-center justify-between rounded-md border px-2 py-1 text-left text-[11px] ${
                          selectedCanvasFolder === entry.folder
                            ? "border-brand-300 bg-brand-50 text-brand-700"
                            : "border-default bg-surface-50 text-foreground"
                        }`}
                        style={{ paddingLeft: `${8 + entry.depth * 14}px` }}
                      >
                        <span className="truncate">{entry.label}</span>
                        <span className="ml-2 shrink-0 text-[10px] text-muted-foreground">
                          {entry.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <div
                ref={canvasListRef}
                onScroll={(event) => setCanvasListScrollTop(event.currentTarget.scrollTop)}
                className="overflow-y-auto rounded-md border border-default"
                style={{ maxHeight: CANVAS_FILE_LIST_HEIGHT }}
              >
                {filteredCanvasFiles.length === 0 ? (
                  <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                    {canvasFilesLoading ? "Loading canvas files…" : "No canvas files yet"}
                  </div>
                ) : (
                  <div
                    className="relative"
                    style={{ height: filteredCanvasFiles.length * CANVAS_FILE_ROW_HEIGHT }}
                  >
                    {visibleCanvasFiles.map((file, index) => {
                      const absoluteIndex = visibleCanvasRange.startIndex + index
                      const folderPath = file.path.split("/").slice(0, -1).join("/")
                      const isActive = activeCanvasFilePath === file.path
                      return (
                        <div
                          key={file.path}
                          className={`absolute left-0 right-0 flex w-full items-start gap-2 border-b border-default px-3 py-2 text-left transition-colors ${
                            isActive ? "bg-brand-50" : "hover:bg-surface-50"
                          }`}
                          style={{ top: absoluteIndex * CANVAS_FILE_ROW_HEIGHT }}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              void onOpenCanvasFile?.(file.path)
                            }}
                            className="flex min-w-0 flex-1 items-start gap-2 text-left"
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
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                void onToggleCanvasFavorite?.(file.path)
                              }}
                              className={`rounded-full p-1 ${
                                file.favorite
                                  ? "text-amber-500"
                                  : "text-muted-foreground hover:bg-white"
                              }`}
                              aria-label={`${file.favorite ? "Unfavorite" : "Favorite"} ${file.title}`}
                            >
                              <Star className={`h-3.5 w-3.5 ${file.favorite ? "fill-current" : ""}`} />
                            </button>
                            {renderCanvasFileActions(file)}
                          </div>
                        </div>
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
            {onAddHtmlBundle ? (
              <div className="rounded-md border border-default bg-surface-50 p-2">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Local HTML bundle
                </div>
                <input
                  type="text"
                  value={htmlBundleTitle}
                  onChange={(event) => setHtmlBundleTitle(event.target.value)}
                  placeholder="Optional node title"
                  className="w-full rounded-md border border-default bg-white px-2 py-1.5 text-xs text-foreground placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void handlePickHtmlBundleFolder()
                    }}
                    className="flex-1 rounded-md border border-default bg-white px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-100"
                  >
                    Choose folder
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void handlePickHtmlEntryFile()
                    }}
                    className="flex-1 rounded-md border border-default bg-white px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-100"
                  >
                    Choose HTML file
                  </button>
                </div>
                <input
                  ref={htmlEntryFileInputRef}
                  type="file"
                  accept=".html,.htm,text/html"
                  onChange={(event) => {
                    void handleHtmlFileSelection(event.target.files)
                    if (htmlEntryFileInputRef.current) {
                      htmlEntryFileInputRef.current.value = ""
                    }
                  }}
                  className="sr-only"
                />
                {onScanHtmlBundleLibrary && onAddHtmlBundleFromDirectory ? (
                  <div className="mt-2 rounded-md border border-default bg-white p-2">
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Filesystem root (advanced)
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={htmlBundleRootPath}
                        onChange={(event) => setHtmlBundleRootPath(event.target.value)}
                        placeholder="Absolute root path, e.g. /Users/.../playground"
                        className="min-w-0 flex-1 rounded-md border border-default bg-white px-2 py-1.5 text-xs text-foreground placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          void handleScanHtmlBundleLibrary()
                        }}
                        disabled={!htmlBundleRootPath.trim() || htmlBundleLibraryStatus === "loading"}
                        className="rounded-md border border-default bg-surface-50 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {htmlBundleLibraryStatus === "loading" ? "Scanning..." : "Scan"}
                      </button>
                    </div>
                    {htmlBundleLibraryResult ? (
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        Root: {htmlBundleLibraryResult.rootPath} · found {htmlBundleLibraryResult.entries.length} bundles
                        {htmlBundleLibraryResult.scannedAt
                          ? ` · ${formatRelativeSyncTime(htmlBundleLibraryResult.scannedAt) || "just now"}`
                          : ""}
                      </p>
                    ) : null}
                    {htmlBundleLibraryError ? (
                      <p className="mt-2 text-[11px] text-red-600">{htmlBundleLibraryError}</p>
                    ) : null}
                    {htmlBundleLibraryResult ? (
                      <>
                        <input
                          type="text"
                          value={htmlBundleLibrarySearch}
                          onChange={(event) => setHtmlBundleLibrarySearch(event.target.value)}
                          placeholder="Search folders or entry files"
                          className="mt-2 w-full rounded-md border border-default bg-white px-2 py-1.5 text-xs text-foreground placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                        <div className="mt-2 max-h-56 space-y-2 overflow-y-auto pr-1">
                          {filteredHtmlBundleEntries.length === 0 ? (
                            <div className="rounded-md border border-dashed border-default bg-surface-50 px-2 py-3 text-[11px] text-muted-foreground">
                              No HTML bundles found for this filter.
                            </div>
                          ) : (
                            filteredHtmlBundleEntries.map((entry) => (
                              <div
                                key={`${entry.directoryPath}-${entry.defaultEntryFile}`}
                                className="rounded-md border border-default bg-surface-50 p-2"
                              >
                                <div className="text-xs font-semibold text-foreground">
                                  {entry.relativeDirectory === "." ? "(root)" : entry.relativeDirectory}
                                </div>
                                <div className="truncate text-[10px] text-muted-foreground">
                                  {entry.directoryPath}
                                </div>
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {entry.entryFiles.map((entryFile) => (
                                    <button
                                      key={`${entry.directoryPath}-${entryFile}`}
                                      type="button"
                                      onClick={() => {
                                        void onAddHtmlBundleFromDirectory({
                                          directoryPath: entry.directoryPath,
                                          entryFile,
                                          title: htmlBundleTitle.trim() || undefined,
                                        })
                                      }}
                                      disabled={!activeCanvasFilePath}
                                      className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${
                                        entryFile === entry.defaultEntryFile
                                          ? "border-brand-300 bg-brand-50 text-brand-700"
                                          : "border-default bg-white text-foreground hover:bg-surface-100"
                                      } disabled:cursor-not-allowed disabled:opacity-60`}
                                      title={`Import ${entryFile}`}
                                    >
                                      {entryFile}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </>
                    ) : null}
                  </div>
                ) : null}
                <input
                  ref={htmlBundleInputRef}
                  type="file"
                  multiple
                  onChange={(event) => {
                    handleHtmlBundleFolderSelection(event.target.files)
                  }}
                  className="sr-only"
                  {...htmlDirectoryInputProps}
                />
                {htmlBundleFiles.length > 0 ? (
                  <div className="mt-2 rounded-md border border-default bg-white p-2">
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Selected folder scan
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Source: {htmlBundleSourceLabel || "selected files"} · found {pickedHtmlBundleEntries.length} bundle folders. Pick one HTML entry file to import only that entry and its local references.
                    </p>
                    <div className="mt-2 max-h-56 space-y-2 overflow-y-auto pr-1">
                      {pickedHtmlBundleEntries.length === 0 ? (
                        <div className="rounded-md border border-dashed border-default bg-surface-50 px-2 py-3 text-[11px] text-muted-foreground">
                          No HTML entry files found in the selected folder.
                        </div>
                      ) : (
                        pickedHtmlBundleEntries.map((entry) => (
                          <div
                            key={`picked-${entry.id}`}
                            className="rounded-md border border-default bg-surface-50 p-2"
                          >
                            <div className="text-xs font-semibold text-foreground">
                              {entry.relativeDirectory === "." ? "(root)" : entry.relativeDirectory}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1">
                                  {entry.entryFiles.map((entryFile) => (
                                    <button
                                      key={`picked-${entry.id}-${entryFile}`}
                                      type="button"
                                      onClick={() => {
                                        void runHtmlBundleImport(async () => {
                                          const entryRelativePath =
                                            entry.relativeDirectory === "."
                                              ? entryFile
                                              : `${entry.relativeDirectory}/${entryFile}`
                                          const selectedFiles =
                                            await collectPickedHtmlBundleFilesForEntry(
                                              htmlBundleFiles,
                                              entryRelativePath
                                            )
                                          if (selectedFiles.length === 0) {
                                            throw new Error("No importable files were found for that HTML entry.")
                                          }
                                          await onAddHtmlBundle?.({
                                            fileEntries: selectedFiles,
                                            title: htmlBundleTitle.trim() || undefined,
                                          })
                                          resetPickedHtmlBundleState()
                                        }, `Imported ${entryFile} as an HTML node.`)
                                      }}
                                      disabled={!activeCanvasFilePath || htmlBundleImportBusy}
                                      className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${
                                        entryFile === entry.defaultEntryFile
                                          ? "border-brand-300 bg-brand-50 text-brand-700"
                                      : "border-default bg-white text-foreground hover:bg-surface-100"
                                  } disabled:cursor-not-allowed disabled:opacity-60`}
                                  title={`Import ${entryFile}`}
                                >
                                  {entryFile}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    if (htmlBundleFiles.length === 0) return
                    void runHtmlBundleImport(async () => {
                      await onAddHtmlBundle?.({
                        fileEntries: htmlBundleFiles,
                        title: htmlBundleTitle.trim() || undefined,
                      })
                      resetPickedHtmlBundleState()
                    }, "Imported selected source as an HTML node.")
                  }}
                  disabled={!activeCanvasFilePath || htmlBundleFiles.length === 0 || htmlBundleImportBusy}
                  className="mt-2 w-full rounded-md border border-default bg-white px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pickedHtmlBundleEntries.length === 1 &&
                  pickedHtmlBundleEntries[0]?.relativeDirectory === "." &&
                  pickedHtmlBundleEntries[0]?.entryFiles.length === 1
                    ? "Import selected HTML file"
                    : "Import whole selected folder"}
                </button>
                {htmlBundleImportStatus ? (
                  <p className="mt-2 text-[11px] text-emerald-700">{htmlBundleImportStatus}</p>
                ) : null}
                {htmlBundleImportError ? (
                  <p className="mt-2 text-[11px] text-red-600">{htmlBundleImportError}</p>
                ) : null}
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Choose folder auto-scans the selected root so you can import one HTML entry. Choose HTML file imports a single standalone document. Whole-folder import is still available when you want to pack the entire selected source.
                  Save this board to a real
                  <code className="mx-1 font-mono">.canvas</code>
                  file first so the selected bundle can live under document-local assets.
                </p>
              </div>
            ) : null}
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
