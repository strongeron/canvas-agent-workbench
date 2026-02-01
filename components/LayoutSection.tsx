import { Eye } from "lucide-react"
import { useState } from "react"

import type { LayoutEntry, PagePatternEntry, ComponentVariant } from "../core/types"

/** Props for injected Button component */
export interface ButtonComponentProps {
  variant?: "ghost" | "brand" | "outline" | string
  size?: "sm" | "md" | "lg" | string
  onClick?: () => void
  className?: string
  disabled?: boolean
  children: React.ReactNode
}

/** Props for injected Link component */
export interface LinkComponentProps {
  href: string
  children: React.ReactNode
}

type StatusFilter = "all" | "prod" | "wip" | "archive"

/** Props for injected Renderer component */
export interface LayoutRendererProps {
  layout?: LayoutEntry
  pattern?: PagePatternEntry
  variant: ComponentVariant
  allowOverflow?: boolean
}

interface LayoutSectionProps {
  layouts: LayoutEntry[]
  patterns: PagePatternEntry[]
  searchQuery: string
  statusFilter?: StatusFilter
  viewType?: 'all' | 'layout-components' | 'page-patterns'
  context?: 'all' | 'public' | 'student' | 'teacher' | 'global'
  /** Injected Button component (optional - hides preview links if not provided) */
  Button?: React.ComponentType<ButtonComponentProps>
  /** Injected Link component (optional - hides preview links if not provided) */
  Link?: React.ComponentType<LinkComponentProps>
  /** Function to generate preview path from layout ID (optional) */
  getPreviewPath?: (id: string) => string
  /** Injected layout renderer (required) */
  Renderer: React.ComponentType<LayoutRendererProps>
}

type EnrichedEntry = (LayoutEntry | PagePatternEntry) & {
  totalVariants: number
  effectiveFilter: StatusFilter
  variantStatusCounts: { prod: number; wip: number; archive: number }
}

function countVariantsByStatus(variants: ComponentVariant[]): { prod: number; wip: number; archive: number } {
  return variants.reduce(
    (acc, variant) => {
      const status = (variant.status as "prod" | "wip" | "archive" | undefined) ?? "prod"
      acc[status]++
      return acc
    },
    { prod: 0, wip: 0, archive: 0 }
  )
}

export function LayoutSection({
  layouts,
  patterns,
  searchQuery,
  statusFilter = "all",
  viewType = 'all',
  context = 'all',
  Button,
  Link,
  getPreviewPath,
  Renderer,
}: LayoutSectionProps) {
  // Filter entries by view type
  let filteredEntries: (LayoutEntry | PagePatternEntry)[] = []
  if (viewType === 'all') {
    filteredEntries = [...layouts, ...patterns]
  } else if (viewType === 'layout-components') {
    filteredEntries = layouts
  } else if (viewType === 'page-patterns') {
    filteredEntries = patterns
  }

  // Filter by context
  if (context !== 'all') {
    filteredEntries = filteredEntries.filter((entry) => {
      if (entry.kind === 'layout') {
        return entry.layoutType === context
      } else {
        // For patterns, check if patternType matches context or is global
        return context === 'global' || entry.patternType === context
      }
    })
  }

  // Filter by search query
  if (searchQuery) {
    const lowerQuery = searchQuery.toLowerCase()
    filteredEntries = filteredEntries.filter(
      (entry) =>
        entry.name.toLowerCase().includes(lowerQuery) ||
        entry.description?.toLowerCase().includes(lowerQuery) ||
        entry.category.toLowerCase().includes(lowerQuery)
    )
  }

  // Enrich entries with variant counts
  const enrichedEntries: EnrichedEntry[] = filteredEntries.map((entry) => {
    const variantStatusCounts = countVariantsByStatus(entry.variants)
    const totalVariants = entry.variants.length

    // Determine effective filter based on status filter
    let effectiveFilter: StatusFilter = statusFilter
    if (statusFilter === "all") {
      effectiveFilter = "all"
    }

    return {
      ...entry,
      totalVariants,
      effectiveFilter,
      variantStatusCounts,
    }
  })

  // Filter variants by status
  const entriesWithFilteredVariants = enrichedEntries.map((entry) => {
    let filteredVariants = entry.variants
    if (statusFilter !== "all") {
      filteredVariants = entry.variants.filter(
        (variant) => (variant.status ?? "prod") === statusFilter
      )
    }
    return { ...entry, variants: filteredVariants }
  })

  // Group by category
  const entriesByCategory = entriesWithFilteredVariants.reduce(
    (acc, entry) => {
      const cat = entry.category || "Uncategorized"
      if (!acc[cat]) {
        acc[cat] = []
      }
      acc[cat].push(entry)
      return acc
    },
    {} as Record<string, EnrichedEntry[]>
  )

  const categories = Object.keys(entriesByCategory).sort()

  if (categories.length === 0) {
    return (
      <div className="rounded-xl border border-default bg-white p-12 text-center">
        <p className="text-muted-foreground text-lg font-medium">No layouts found</p>
        <p className="text-muted mt-2 text-sm">
          Try adjusting your filters or search query.
        </p>
      </div>
    )
  }

  return (
    <section className="pt-6">
      <div className="space-y-16">
        {categories.map((category) => {
          const categoryEntries = entriesByCategory[category]
          const categoryId = category.toLowerCase().replace(/\s+/g, '-')

          return (
            <div key={category} id={categoryId} className="pt-6">
              <div className="sticky top-[68px] z-30 mb-6 border-b border-default bg-surface-100 pb-3 pt-3">
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h2 className="font-display text-foreground mb-2 text-2xl font-bold">
                        {category}
                      </h2>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-12">
                {categoryEntries.map((entry) => {
                  const [localStatusFilter, setLocalStatusFilter] = useState<StatusFilter>(statusFilter)
                  const variantStatusCounts = countVariantsByStatus(entry.variants)

                  let filteredVariants = entry.variants
                  if (localStatusFilter !== "all") {
                    filteredVariants = entry.variants.filter(
                      (variant) => (variant.status ?? "prod") === localStatusFilter
                    )
                  }

                  const entryId = entry.id.toLowerCase().replace(/\//g, '-').replace(/\s+/g, '-')
                  
                  return (
                    <div key={entry.id} id={entryId} className="pt-6">
                      <div className="sticky top-[68px] z-30 mb-6 border-b border-default bg-surface-100 pb-3 pt-3">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="mb-2 flex items-center gap-3">
                                <h3 className="font-display text-foreground text-xl font-bold">{entry.name}</h3>
                                {Button && Link && getPreviewPath && entry.variants.length > 0 && (
                                  <Link href={getPreviewPath(entry.id)}>
                                    <Button variant="ghost" size="sm" className="gap-1.5 h-7 text-xs">
                                      <Eye className="h-3 w-3" />
                                      View preview
                                    </Button>
                                  </Link>
                                )}
                              </div>
                              <code className="text-brand-600 rounded bg-brand-50 px-2 py-1 text-xs font-mono">
                                {entry.importPath}
                              </code>
                              {entry.description && (
                                <p className="text-muted-foreground mt-2 text-sm">{entry.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {(["all", "prod", "wip", "archive"] as const).map((filter) => {
                                const count = filter === "all" 
                                  ? variantStatusCounts.prod + variantStatusCounts.wip + variantStatusCounts.archive
                                  : variantStatusCounts[filter]
                                
                                return (
                                  <button
                                    key={filter}
                                    onClick={() => setLocalStatusFilter(filter)}
                                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                                      localStatusFilter === filter
                                        ? filter === "wip"
                                          ? "bg-amber-500 text-white shadow-sm"
                                          : "bg-brand-600 text-white shadow-sm"
                                        : filter === "wip"
                                          ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100"
                                          : "bg-white text-muted-foreground hover:bg-brand-50 hover:text-brand-700 border border-default"
                                    }`}
                                  >
                                    {filter === "all" ? "ALL" : filter.toUpperCase()} {count > 0 && count}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        {filteredVariants.map((variant, index) => (
                          <div key={`${entry.id}-${index}`}>
                            <Renderer
                              layout={entry.kind === 'layout' ? entry : undefined}
                              pattern={entry.kind === 'page-pattern' ? entry : undefined}
                              variant={variant}
                              allowOverflow={entry.allowOverflow}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

