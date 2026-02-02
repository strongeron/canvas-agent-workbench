import { useEffect, useState } from "react"

import { CanvasTab } from "../components/canvas/CanvasTab"
import { ComponentSection } from "../components/ComponentSection"
import { GalleryHeader } from "../components/GalleryHeader"
import { GallerySidebar } from "./components/GallerySidebar"
import { LayoutSection } from "./components/LayoutSection"
import { SnapshotManager } from "./components/SnapshotManager"
import { TokenSection } from "./components/TokenSection"
import { allComponents, componentsByCategory, allLayouts, allPagePatterns } from "./componentVariants"
import { allTokens, tokensByCategory } from "./designTokens"

type ViewMode = 'components' | 'layouts' | 'tokens' | 'snapshots' | 'canvas'
type LayoutViewType = 'all' | 'layout-components' | 'page-patterns'
type LayoutContext = 'all' | 'public' | 'student' | 'teacher' | 'global'

export default function GalleryPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('components')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<"all" | "prod" | "wip" | "archive">("all")
  const [layoutViewType, setLayoutViewType] = useState<LayoutViewType>('all')
  const [layoutContext, setLayoutContext] = useState<LayoutContext>('all')

  const categories = ['all', ...Object.keys(componentsByCategory)]
  const totalComponents = allComponents.length
  const totalVariants = allComponents.reduce((sum, comp) => sum + comp.variants.length, 0)
  const totalLayouts = allLayouts.length
  const totalPagePatterns = allPagePatterns.length
  const totalTokens = allTokens.length

  // Ensure page always starts at the top
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Clear any hash from URL without triggering navigation
      if (window.location.hash) {
        history.replaceState(null, '', window.location.pathname + window.location.search)
      }
      // Scroll to top on mount
      window.scrollTo(0, 0)
    }
  }, [])

  return (
    <div className="min-h-screen bg-surface-100">
      <GalleryHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        totals={{ 
          components: totalComponents, 
          variants: totalVariants, 
          layouts: totalLayouts,
          patterns: totalPagePatterns,
          tokens: totalTokens 
        }}
      />

      {/* Canvas mode: full-width, no sidebar, no padding */}
      {viewMode === 'canvas' ? (
        <div className="h-[calc(100vh-80px)]">
          <CanvasTab />
        </div>
      ) : (
        <div className="mx-auto flex max-w-screen-2xl">
          <GallerySidebar
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            viewMode={viewMode}
            layoutViewType={layoutViewType}
            layoutContext={layoutContext}
          />

          <main className="flex-1 p-8">
          {viewMode === 'components' && (
            <div className="space-y-12">
              <div className="rounded-2xl bg-linear-to-br from-brand-50 to-surface-50 p-8 shadow-sm">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h2 className="font-display text-foreground mb-2 text-3xl font-bold">
                      Component Library
                    </h2>
                    <p className="text-muted-foreground max-w-2xl text-lg leading-relaxed">
                      Explore all platform components with real styles, design tokens, and
                      interactive variants. Each component is rendered with actual data
                      and demonstrates different states and configurations.
                    </p>
                  </div>
                  <div className="rounded-lg bg-white px-4 py-2 shadow-sm">
                    <div className="text-brand-700 text-sm font-medium">
                      Access at: <span className="font-mono">/gallery</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                        selectedCategory === cat
                          ? 'bg-brand-600 text-white shadow-md'
                          : 'bg-white text-muted-foreground hover:bg-brand-50 hover:text-brand-700'
                      }`}
                    >
                      {cat === 'all' ? 'All Components' : cat}
                      {cat !== 'all' && (
                        <span className="ml-2 opacity-70">
                          ({componentsByCategory[cat]?.length || 0})
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {(["all", "prod", "wip", "archive"] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                        statusFilter === status
                          ? status === "wip"
                            ? "bg-amber-500 text-white shadow-sm"
                            : "bg-brand-600 text-white shadow-sm"
                          : "bg-white text-muted-foreground hover:bg-brand-50 hover:text-brand-700 border border-default"
                      }`}
                    >
                      {status === "all" ? "All statuses" : status.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {selectedCategory === 'all'
                ? Object.entries(componentsByCategory).map(([category, components]) => (
                    <ComponentSection
                      key={category}
                      category={category}
                      components={components}
                      searchQuery={searchQuery}
                      statusFilter={statusFilter}
                    />
                  ))
                : componentsByCategory[selectedCategory] && (
                    <ComponentSection
                      category={selectedCategory}
                      components={componentsByCategory[selectedCategory]}
                      searchQuery={searchQuery}
                      statusFilter={statusFilter}
                    />
                  )}
            </div>
          )}

          {viewMode === 'layouts' && (
            <div className="space-y-12">
              <div className="rounded-2xl bg-linear-to-br from-brand-50 to-surface-50 p-8 shadow-sm">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h2 className="font-display text-foreground mb-2 text-3xl font-bold">
                      Page Layouts
                    </h2>
                    <p className="text-muted-foreground max-w-2xl text-lg leading-relaxed">
                      Explore layout components and page patterns. Layout components provide the structural
                      wrappers (public, student, teacher), while page patterns show common page compositions
                      (course detail, dashboard, forms, etc.).
                    </p>
                  </div>
                </div>

                {/* Sub-filters */}
                <div className="mt-6 space-y-4">
                  <div>
                    <label className="text-muted-foreground mb-2 block text-sm font-medium">View:</label>
                    <div className="flex flex-wrap gap-2">
                      {(['all', 'layout-components', 'page-patterns'] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => setLayoutViewType(type)}
                          className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                            layoutViewType === type
                              ? 'bg-brand-600 text-white shadow-md'
                              : 'bg-white text-muted-foreground hover:bg-brand-50 hover:text-brand-700'
                          }`}
                        >
                          {type === 'all' ? 'All' : type === 'layout-components' ? 'Layout Components' : 'Page Patterns'}
                          {type === 'layout-components' && ` (${totalLayouts})`}
                          {type === 'page-patterns' && ` (${totalPagePatterns})`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-muted-foreground mb-2 block text-sm font-medium">Context:</label>
                    <div className="flex flex-wrap gap-2">
                      {(['all', 'public', 'student', 'teacher', 'global'] as const).map((ctx) => (
                        <button
                          key={ctx}
                          onClick={() => setLayoutContext(ctx)}
                          className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                            layoutContext === ctx
                              ? 'bg-brand-600 text-white shadow-md'
                              : 'bg-white text-muted-foreground hover:bg-brand-50 hover:text-brand-700'
                          }`}
                        >
                          {ctx === 'all' ? 'All Contexts' : ctx.charAt(0).toUpperCase() + ctx.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {(["all", "prod", "wip", "archive"] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                          statusFilter === status
                            ? status === "wip"
                              ? "bg-amber-500 text-white shadow-sm"
                              : "bg-brand-600 text-white shadow-sm"
                            : status === "wip"
                              ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100"
                              : "bg-white text-muted-foreground hover:bg-brand-50 hover:text-brand-700 border border-default"
                        }`}
                      >
                        {status === "all" ? "All statuses" : status.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <LayoutSection
                layouts={allLayouts}
                patterns={allPagePatterns}
                searchQuery={searchQuery}
                statusFilter={statusFilter}
                viewType={layoutViewType}
                context={layoutContext}
              />
            </div>
          )}

          {viewMode === 'tokens' && (
            <div className="space-y-12">
              <div className="rounded-2xl bg-linear-to-br from-brand-50 to-surface-50 p-8 shadow-sm">
                <h2 className="font-display text-foreground mb-2 text-3xl font-bold">
                  Design Tokens
                </h2>
                <p className="text-muted-foreground max-w-2xl text-lg leading-relaxed">
                  All design tokens extracted from theme.css. These tokens ensure
                  consistent styling across the entire application.
                </p>
              </div>

              {Object.entries(tokensByCategory).map(([category, tokens]) => (
                <TokenSection
                  key={category}
                  category={category}
                  tokens={tokens}
                  searchQuery={searchQuery}
                />
              ))}
            </div>
          )}

          {viewMode === 'snapshots' && <SnapshotManager />}
        </main>
        </div>
      )}
    </div>
  )
}
