import { Eye } from "lucide-react"
import { useState } from "react"

import type { GalleryEntry, ComponentVariant, ComponentLayoutSize } from "../core/types"

// Type alias for backwards compatibility
type ComponentEntry = GalleryEntry

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
export interface RendererComponentProps {
  componentName: string
  importPath?: string
  variant: ComponentVariant
  allowOverflow?: boolean
}

interface ComponentSectionProps {
  category: string
  components: ComponentEntry[]
  searchQuery: string
  statusFilter?: StatusFilter
  /** Injected Button component (optional - hides preview links if not provided) */
  Button?: React.ComponentType<ButtonComponentProps>
  /** Injected Link component (optional - hides preview links if not provided) */
  Link?: React.ComponentType<LinkComponentProps>
  /** Function to generate preview path from component ID (optional) */
  getPreviewPath?: (id: string) => string
  /** Injected component renderer (required) */
  Renderer: React.ComponentType<RendererComponentProps>
}

type EnrichedComponent = ComponentEntry & {
  variants: ComponentVariant[]
  totalVariants: number
  effectiveFilter: StatusFilter
  variantStatusCounts: { prod: number; wip: number; archive: number }
  componentKey: string
}

function getGridClasses(layoutSize?: ComponentLayoutSize): string {
  switch (layoutSize) {
    case "small":
      return "grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
    case "medium":
      return "grid gap-6 lg:grid-cols-2"
    case "large":
      return "grid gap-6"
    case "full":
      return "space-y-6"
    default:
      return "grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
  }
}

export function groupVariantsByCategory(variants: ComponentVariant[]): Map<string, ComponentVariant[]> {
  const groups = new Map<string, ComponentVariant[]>()

  variants.forEach((variant) => {
    const categoryKey = variant.category
    if (!groups.has(categoryKey)) {
      groups.set(categoryKey, [])
    }
    groups.get(categoryKey)!.push(variant)
  })

  return groups
}

export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    "student-live": "Student - Live Sessions",
    "student-upcoming": "Student - Upcoming Lessons",
    "student-locked": "Student - Locked Lessons",
    "student-completed": "Student - Completed Lessons",
    "student-past": "Student - Past Lessons",
    "teacher-live": "Teacher - Live Sessions",
    "teacher-upcoming": "Teacher - Upcoming Lessons",
    "teacher-past": "Teacher - Past Lessons",
    "teacher-error": "Teacher - Error States",
    timezone: "Timezone Conversion",
  }

  return labels[category] || category
}

export function ComponentSection({
  category,
  components,
  searchQuery,
  statusFilter = "all",
  Button,
  Link,
  getPreviewPath,
  Renderer,
}: ComponentSectionProps) {
  const [componentFilters, setComponentFilters] = useState<Record<string, StatusFilter>>({})

  const filteredComponents: EnrichedComponent[] = components
    .map((comp) => {
      const componentKey = comp.name
      const effectiveFilter = componentFilters[componentKey] ?? statusFilter
      const variantStatusCounts = comp.variants.reduce(
        (acc, variant) => {
          const variantStatus = (variant.status as "prod" | "wip" | "archive" | undefined) ?? "prod"
          acc[variantStatus] = (acc[variantStatus] || 0) + 1
          return acc
        },
        { prod: 0, wip: 0, archive: 0 } as { prod: number; wip: number; archive: number }
      )
      const variants = comp.variants.filter((variant) => {
        const variantStatus = (variant.status as "prod" | "wip" | "archive" | undefined) ?? "prod"
        return effectiveFilter === "all" || variantStatus === effectiveFilter
      })
      return {
        ...comp,
        variants,
        totalVariants: comp.variants.length,
        effectiveFilter,
        variantStatusCounts,
        componentKey,
      }
    })
    .filter((comp) => comp.variants.length > 0)
    .filter((comp) =>
      searchQuery ? comp.name.toLowerCase().includes(searchQuery.toLowerCase()) : true
    )

  if (filteredComponents.length === 0) {
    return null
  }

  return (
    <section className="pt-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="h-1 w-12 rounded-full bg-brand-500" />
        <h2 className="font-display text-foreground text-2xl font-bold">{category}</h2>
        <span className="text-muted rounded-full bg-surface-200 px-3 py-1 text-sm font-medium">
          {filteredComponents.length} {filteredComponents.length === 1 ? "component" : "components"}
        </span>
      </div>

      <div className="space-y-16">
        {filteredComponents.map((component) => {
          const isUnifiedLessonCard = component.name === "UnifiedLessonCard"
          const variantGroups = isUnifiedLessonCard
            ? groupVariantsByCategory(component.variants)
            : null

          return (
            <div key={component.name} id={component.name.toLowerCase()} className="pt-6">
              <div className="sticky top-[68px] z-30 mb-6 border-b border-default bg-surface-100 pb-3 pt-3">
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-3">
                      <h3 className="font-display text-foreground text-xl font-bold">{component.name}</h3>
                        {Button && Link && getPreviewPath && 'id' in component && typeof component.id === 'string' && component.variants.length > 0 && (
                          <Link href={getPreviewPath(component.id)}>
                            <Button variant="ghost" size="sm" className="gap-1.5 h-7 text-xs">
                              <Eye className="h-3 w-3" />
                              View preview
                            </Button>
                          </Link>
                        )}
                      </div>
                      <code className="text-brand-600 rounded bg-brand-50 px-2 py-1 text-xs font-mono">
                        {component.importPath}
                      </code>
                    </div>
                      <div className="flex items-center gap-2">
                      {(["all", "prod", "wip", "archive"] as const).map((filter) => {
                        const count =
                          filter === "all"
                            ? component.totalVariants
                            : filter === "prod"
                              ? component.variantStatusCounts.prod
                              : filter === "wip"
                                ? component.variantStatusCounts.wip
                                : component.variantStatusCounts.archive

                        return (
                          <button
                            key={filter}
                            onClick={() =>
                              setComponentFilters((prev) => ({
                                ...prev,
                                [component.componentKey]: filter,
                              }))
                            }
                            className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                              component.effectiveFilter === filter
                                ? filter === "wip"
                                  ? "bg-amber-500 text-white shadow-sm"
                                  : "bg-brand-600 text-white shadow-sm"
                                : "bg-white text-muted-foreground ring-1 ring-border-default hover:bg-brand-50 hover:text-brand-700"
                            }`}
                          >
                            <span>{filter.toUpperCase()}</span>
                            <span
                              className={`text-sm font-bold ${
                                component.effectiveFilter === filter ? "text-white" : "text-foreground"
                              }`}
                            >
                              {count}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
                </div>

                {isUnifiedLessonCard && variantGroups ? (
                  <div className="space-y-12">
                    {Array.from(variantGroups.entries()).map(([categoryKey, variants]) => (
                      <div
                        key={categoryKey}
                        id={`${component.name.toLowerCase()}-${categoryKey}`}
                        className="space-y-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-px flex-1 bg-border-default" />
                          <h4 className="text-brand-700 bg-brand-50 rounded-full px-4 py-1.5 text-sm font-semibold">
                            {getCategoryLabel(categoryKey)}
                          </h4>
                          <div className="h-px flex-1 bg-border-default" />
                        </div>
                        <div className="space-y-6">
                          {variants.map((variant, index) => (
                            <Renderer
                              key={`${component.name}-${categoryKey}-${index}`}
                              componentName={component.name}
                              importPath={component.importPath}
                              variant={variant}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={getGridClasses(component.layoutSize)}>
                    {component.variants.map((variant, index) => (
                      <Renderer
                        key={`${component.name}-${index}`}
                        componentName={component.name}
                        importPath={component.importPath}
                        variant={variant}
                        allowOverflow={component.allowOverflow}
                      />
                    ))}
                  </div>
                )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
