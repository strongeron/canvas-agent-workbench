/**
 * Gallery POC - Portable Gallery Page
 *
 * A complete, portable gallery page that uses the adapter pattern.
 * No hardcoded component imports - everything comes from the adapter.
 */

import { useEffect, useLayoutEffect, useMemo, useState } from "react"
import { Search, Grid, List, Palette, Camera } from "lucide-react"

import { useGalleryAdapter } from "../core/GalleryContext"
import type { GalleryEntry, ComponentStatus, ComponentLayoutSize } from "../core/types"
import { PortableComponentRenderer } from "./PortableComponentRenderer"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ViewMode = "components" | "tokens" | "snapshots"

let galleryPreviewCount = 0
let originalScrollIntoView: typeof Element.prototype.scrollIntoView | null = null

function installGalleryPreviewGuards() {
  if (galleryPreviewCount === 0) {
    originalScrollIntoView = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = function (...args: Parameters<Element["scrollIntoView"]>) {
      return
    }
  }
  galleryPreviewCount += 1
}

function uninstallGalleryPreviewGuards() {
  galleryPreviewCount = Math.max(0, galleryPreviewCount - 1)
  if (galleryPreviewCount === 0 && originalScrollIntoView) {
    Element.prototype.scrollIntoView = originalScrollIntoView
    originalScrollIntoView = null
  }
}

interface PortableGalleryPageProps {
  /** Custom title */
  title?: string
  /** Custom description */
  description?: string
  /** Initial view mode */
  initialViewMode?: ViewMode
  /** Show tokens tab */
  showTokens?: boolean
  /** Show snapshots tab */
  showSnapshots?: boolean
  /** Use external search state */
  externalSearchQuery?: string
  /** External search change handler */
  onExternalSearchChange?: (value: string) => void
  /** Show search input in header */
  showSearch?: boolean
  /** Force compact header layout */
  forceCompactHeader?: boolean
  /** Stick header to top */
  stickyHeader?: boolean
  /** Offset (px) for sidebar sticky position */
  headerOffset?: number
  /** Custom header content */
  headerExtra?: React.ReactNode
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function SearchInput({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search components..."
        className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  )
}

function StatusFilter({
  value,
  onChange,
}: {
  value: ComponentStatus | "all"
  onChange: (value: ComponentStatus | "all") => void
}) {
  const statuses: Array<{ value: ComponentStatus | "all"; label: string }> = [
    { value: "all", label: "All" },
    { value: "prod", label: "Production" },
    { value: "wip", label: "WIP" },
    { value: "archive", label: "Archived" },
  ]

  return (
    <div className="flex gap-1">
      {statuses.map((status) => (
        <button
          key={status.value}
          onClick={() => onChange(status.value)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            value === status.value
              ? status.value === "wip"
                ? "bg-amber-500 text-white"
                : "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {status.label}
        </button>
      ))}
    </div>
  )
}

function ViewModeToggle({
  value,
  onChange,
  showTokens,
  showSnapshots,
}: {
  value: ViewMode
  onChange: (value: ViewMode) => void
  showTokens: boolean
  showSnapshots: boolean
}) {
  const modes: Array<{ value: ViewMode; label: string; icon: typeof Grid; show: boolean }> = [
    { value: "components", label: "Components", icon: Grid, show: true },
    { value: "tokens", label: "Tokens", icon: Palette, show: showTokens },
    { value: "snapshots", label: "Snapshots", icon: Camera, show: showSnapshots },
  ]

  return (
    <div className="flex rounded-lg border border-gray-200 p-1">
      {modes
        .filter((m) => m.show)
        .map((mode) => {
          const Icon = mode.icon
          return (
            <button
              key={mode.value}
              onClick={() => onChange(mode.value)}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                value === mode.value
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="h-4 w-4" />
              {mode.label}
            </button>
          )
        })}
    </div>
  )
}

function CategorySidebar({
  categories,
  selectedCategory,
  onSelect,
  entriesByCategory,
  isCompact,
  stickyOffset,
}: {
  categories: string[]
  selectedCategory: string
  onSelect: (category: string) => void
  entriesByCategory: Record<string, GalleryEntry[]>
  isCompact: boolean
  stickyOffset: number
}) {
  return (
    <nav className="w-64 shrink-0 border-r border-gray-200 bg-white">
      <div className="sticky p-4" style={{ top: stickyOffset }}>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Categories
        </h2>
        <ul className="space-y-1">
          <li>
            <button
              onClick={() => onSelect("all")}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                selectedCategory === "all"
                  ? "bg-blue-50 font-medium text-blue-700"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              All Components
            </button>
          </li>
          {categories.map((category) => (
            <li key={category}>
              <button
                onClick={() => onSelect(category)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  selectedCategory === category
                    ? "bg-blue-50 font-medium text-blue-700"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {category}
                <span className="ml-2 text-xs text-gray-400">
                  ({entriesByCategory[category]?.length || 0})
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}

function ComponentGrid({
  entries,
  searchQuery,
  statusFilter,
}: {
  entries: GalleryEntry[]
  searchQuery: string
  statusFilter: ComponentStatus | "all"
}) {
  const adapter = useGalleryAdapter()

  // Filter entries
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesName = entry.name.toLowerCase().includes(query)
        const matchesCategory = entry.category.toLowerCase().includes(query)
        const matchesVariants = entry.variants.some(
          (v) =>
            v.name.toLowerCase().includes(query) ||
            v.description.toLowerCase().includes(query)
        )
        if (!matchesName && !matchesCategory && !matchesVariants) {
          return false
        }
      }

      // Status filter
      if (statusFilter !== "all") {
        const hasMatchingVariant = entry.variants.some(
          (v) => v.status === statusFilter
        )
        if (!hasMatchingVariant) {
          return false
        }
      }

      return true
    })
  }, [entries, searchQuery, statusFilter])

  // Get grid columns based on layout size
  const getGridClass = (size?: ComponentLayoutSize) => {
    switch (size) {
      case "small":
        return "md:col-span-1"
      case "medium":
        return "md:col-span-2"
      case "large":
        return "md:col-span-3"
      case "full":
        return "md:col-span-3"
      default:
        return "md:col-span-1"
    }
  }

  if (filteredEntries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <Search className="mb-4 h-12 w-12 text-gray-300" />
        <p className="text-lg font-medium">No components found</p>
        <p className="text-sm">Try adjusting your search or filters</p>
      </div>
    )
  }

  return (
    <div className="space-y-12">
      {filteredEntries.map((entry) => {
        // Filter variants by status if needed
        const filteredVariants =
          statusFilter === "all"
            ? entry.variants
            : entry.variants.filter((v) => v.status === statusFilter)

        if (filteredVariants.length === 0) return null

        return (
          <section key={entry.id}>
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{entry.name}</h3>
              <p className="text-sm text-gray-500">{entry.importPath}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {filteredVariants.map((variant, index) => (
                <div key={index} className={getGridClass(entry.layoutSize)}>
                  <PortableComponentRenderer
                    componentName={entry.name}
                    importPath={entry.importPath}
                    variant={variant}
                    allowOverflow={entry.allowOverflow}
                    renderMode="card"
                    backgroundColor="white"
                  />
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function PortableGalleryPage({
  title = "Component Gallery",
  description = "Browse and interact with all components",
  initialViewMode = "components",
  showTokens = false,
  showSnapshots = false,
  externalSearchQuery,
  onExternalSearchChange,
  showSearch = true,
  forceCompactHeader = false,
  stickyHeader = true,
  headerOffset = 0,
  headerExtra,
}: PortableGalleryPageProps) {
  const adapter = useGalleryAdapter()

  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<ComponentStatus | "all">("all")
  const [autoCompact, setAutoCompact] = useState(false)

  const effectiveSearchQuery = externalSearchQuery ?? searchQuery
  const handleSearchChange = onExternalSearchChange ?? setSearchQuery
  const isCompact = forceCompactHeader || autoCompact

  // Get data from adapter
  const entriesByCategory = adapter.getEntriesByCategory()
  const categories = Object.keys(entriesByCategory)

  // Get entries for selected category
  const currentEntries =
    selectedCategory === "all"
      ? adapter.getAllEntries().filter((e): e is GalleryEntry => e.kind !== "layout" && e.kind !== "page-pattern")
      : entriesByCategory[selectedCategory] || []

  // Stats
  const totalComponents = adapter.getAllEntries().length
  const totalVariants = adapter
    .getAllEntries()
    .reduce((sum, e) => sum + e.variants.length, 0)

  useLayoutEffect(() => {
    installGalleryPreviewGuards()
    if (typeof window !== "undefined") {
      ;(window as any).__GALLERY_PREVIEW__ = true
      ;(window as any).__GALLERY_PREVIEW_DISABLE_TOASTS = true
      document.body.dataset.galleryPreview = "true"
    }
    return () => {
      if (typeof window !== "undefined") {
        ;(window as any).__GALLERY_PREVIEW__ = false
        ;(window as any).__GALLERY_PREVIEW_DISABLE_TOASTS = false
        delete document.body.dataset.galleryPreview
      }
      uninstallGalleryPreviewGuards()
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const previous = window.history.scrollRestoration
    window.history.scrollRestoration = "manual"
    window.scrollTo({ top: 0, left: 0, behavior: "auto" })
    return () => {
      window.history.scrollRestoration = previous
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined" || forceCompactHeader) return
    let ticking = false
    const updateCompact = () => {
      if (ticking) return
      ticking = true
      window.requestAnimationFrame(() => {
        const y = window.scrollY
        setAutoCompact((prev) => {
          if (!prev && y > 140) return true
          if (prev && y < 80) return false
          return prev
        })
        ticking = false
      })
    }
    updateCompact()
    window.addEventListener("scroll", updateCompact, { passive: true })
    return () => window.removeEventListener("scroll", updateCompact)
  }, [forceCompactHeader])

  const sidebarOffset = stickyHeader
    ? isCompact
      ? 80
      : 112
    : headerOffset

  return (
    <div className="flex min-h-screen flex-col bg-gray-50" data-gallery-preview="true">
      {/* Header */}
      <header
        className={`${stickyHeader ? "sticky top-0" : "relative"} z-40 border-b border-gray-200 bg-white/95 backdrop-blur transition-all`}
      >
        <div className={`mx-auto max-w-screen-2xl px-6 ${isCompact ? "py-2" : "py-4"} transition-all duration-200`}>
          <div className={`flex flex-wrap justify-between gap-4 ${isCompact ? "items-center" : "items-start"} transition-all duration-200`}>
            <div>
              <h1 className={`${isCompact ? "text-lg" : "text-2xl"} font-bold text-gray-900 transition-all duration-200`}>
                {title}
              </h1>
              <div className={`${isCompact ? "hidden" : "block"} transition-all duration-200`}>
                <p className="mt-1 text-gray-500">{description}</p>
                <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                  <span>
                    <strong className="text-gray-900">{totalComponents}</strong> components
                  </span>
                  <span>
                    <strong className="text-gray-900">{totalVariants}</strong> variants
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {headerExtra}
              <ViewModeToggle
                value={viewMode}
                onChange={setViewMode}
                showTokens={showTokens}
                showSnapshots={showSnapshots}
              />
            </div>
          </div>

          {/* Search and Filters */}
          <div className={`flex flex-wrap items-center gap-3 ${isCompact ? "mt-2" : "mt-4"}`}>
            {showSearch && (
              <div className="min-w-[220px] flex-1">
                <SearchInput value={effectiveSearchQuery} onChange={handleSearchChange} />
              </div>
            )}
            <StatusFilter value={statusFilter} onChange={setStatusFilter} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1">
        {viewMode === "components" && (
          <>
            <CategorySidebar
              categories={categories}
              selectedCategory={selectedCategory}
              onSelect={setSelectedCategory}
              entriesByCategory={entriesByCategory}
              isCompact={isCompact}
              stickyOffset={sidebarOffset}
            />
            <main className="flex-1 p-6">
              <ComponentGrid
                entries={currentEntries}
                searchQuery={effectiveSearchQuery}
                statusFilter={statusFilter}
              />
            </main>
          </>
        )}

        {viewMode === "tokens" && (
          <main className="flex-1 p-6">
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Palette className="mb-4 h-12 w-12 text-gray-300" />
              <p className="text-lg font-medium">Design Tokens</p>
              <p className="text-sm">Provide tokens via TokenSection component</p>
            </div>
          </main>
        )}

        {viewMode === "snapshots" && (
          <main className="flex-1 p-6">
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Camera className="mb-4 h-12 w-12 text-gray-300" />
              <p className="text-lg font-medium">Snapshots</p>
              <p className="text-sm">Provide snapshots via SnapshotManager component</p>
            </div>
          </main>
        )}
      </div>
    </div>
  )
}

export default PortableGalleryPage
