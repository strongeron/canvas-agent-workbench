import { Monitor, Smartphone, Tablet } from "lucide-react"
import { Component as ReactComponent, useState } from "react"

import { Layout } from "@/layouts/Layout"
import { StudentLayout } from "@/platform/layouts/StudentLayout"
import { TeacherLayout } from "@/platform/layouts/TeacherLayout"
import { FormPageLayout } from "@/platform/layouts/patterns/FormPageLayout"
import { CourseDetailLayout } from "@/platform/layouts/patterns/CourseDetailLayout"
import { DashboardLayout } from "@/platform/layouts/patterns/DashboardLayout"
import { ListPageLayout } from "@/platform/layouts/patterns/ListPageLayout"
import { BrowsePageLayout } from "@/platform/layouts/patterns/BrowsePageLayout"
import type { LayoutEntry, PagePatternEntry, ComponentVariant } from "../registry/types"
import { cn } from "@/lib/utils"

interface LayoutRendererProps {
  layout?: LayoutEntry
  pattern?: PagePatternEntry
  variant: ComponentVariant
  allowOverflow?: boolean
}

type ViewportSize = 'mobile' | 'tablet' | 'desktop' | 'fluid'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class LayoutErrorBoundary extends ReactComponent<
  { children: React.ReactNode; layoutName: string; variantName: string },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; layoutName: string; variantName: string }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(
      `[LayoutRenderer] Error rendering ${this.props.layoutName} (${this.props.variantName}):`,
      error,
      errorInfo
    )
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border-2 border-dashed border-error bg-error-surface p-6">
          <div className="mb-2">
            <p className="text-error-text text-sm font-semibold">
              Error rendering {this.props.layoutName}
            </p>
            <p className="text-error-text text-xs">
              Variant: {this.props.variantName}
            </p>
          </div>
          {this.state.error && (
            <div className="rounded bg-error/10 p-3">
              <p className="text-error-text font-mono text-xs">
                {this.state.error.message}
              </p>
            </div>
          )}
        </div>
      )
    }

    return this.props.children
  }
}

const layoutMap: Record<string, React.ComponentType<any>> = {
  Layout,
  StudentLayout,
  TeacherLayout,
  FormPageLayout,
}

const viewportConfigs: Record<ViewportSize, { width: string; label: string; icon: typeof Monitor }> = {
  mobile: { width: 'w-[375px]', label: 'Mobile', icon: Smartphone },
  tablet: { width: 'w-[768px]', label: 'Tablet', icon: Tablet },
  desktop: { width: 'w-[1280px]', label: 'Desktop', icon: Monitor },
  fluid: { width: 'w-full', label: 'Fluid', icon: Monitor },
}

export function LayoutRenderer({
  layout,
  pattern,
  variant,
  allowOverflow = false,
}: LayoutRendererProps) {
  const [viewport, setViewport] = useState<ViewportSize>('desktop')

  const entry = layout || pattern
  if (!entry) {
    return (
      <div className="rounded-xl border-2 border-dashed border-error bg-error-surface p-6">
        <p className="text-error-text text-sm font-medium">
          No layout or pattern provided
        </p>
      </div>
    )
  }

  // Map entry names to components
  const entryName = entry.name
  let Component: React.ComponentType<any> | null = null
  
  if (layout) {
    // For layouts, map by name
    if (entryName === 'Public Layout') Component = Layout
    else if (entryName === 'Student Layout') Component = StudentLayout
    else if (entryName === 'Teacher Layout') Component = TeacherLayout
  } else if (pattern) {
    // For patterns, map by name
    if (entryName === 'Form Page') Component = FormPageLayout
    else if (entryName === 'Course Detail Page') Component = CourseDetailLayout
    else if (entryName === 'Dashboard Page') Component = DashboardLayout
    else if (entryName === 'List Page') Component = ListPageLayout
    else if (entryName === 'Browse Page') Component = BrowsePageLayout
  }

  if (!Component) {
    return (
      <div className="rounded-xl border-2 border-dashed border-error bg-error-surface p-6">
        <p className="text-error-text text-sm font-medium">
          Layout/Pattern "{entryName}" not found in renderer map
        </p>
        <p className="text-error-text mt-2 text-xs">
          Add it to layoutMap in LayoutRenderer.tsx
        </p>
      </div>
    )
  }

  const processedProps = { ...variant.props }
  const viewportConfig = viewportConfigs[viewport]

  return (
    <LayoutErrorBoundary layoutName={entryName} variantName={variant.name}>
      <div className={cn(
        "group rounded-xl border border-default bg-white shadow-sm transition-all hover:shadow-md",
        allowOverflow ? "overflow-visible" : "overflow-hidden"
      )}>
        {/* Viewport Controls */}
        <div className="border-b border-default bg-surface-50 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs font-medium">Viewport:</span>
              <div className="flex gap-1 rounded-lg border border-default bg-white p-1">
                {(Object.keys(viewportConfigs) as ViewportSize[]).map((size) => {
                  const Icon = viewportConfigs[size].icon
                  return (
                    <button
                      key={size}
                      onClick={() => setViewport(size)}
                      className={cn(
                        "flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors",
                        viewport === size
                          ? "bg-brand-600 text-white"
                          : "text-muted-foreground hover:bg-surface-100"
                      )}
                      title={viewportConfigs[size].label}
                    >
                      <Icon className="h-3 w-3" />
                      <span className="hidden sm:inline">{viewportConfigs[size].label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="text-muted-foreground text-xs">
              {viewportConfig.label} ({viewportConfig.width.replace('w-[', '').replace(']', '')})
            </div>
          </div>
        </div>

        {/* Layout Render */}
        <div className={cn(
          "relative bg-surface-50 p-6",
          allowOverflow && "relative z-10"
        )}>
          <div className={cn(
            "mx-auto bg-white",
            viewportConfig.width,
            viewport === 'fluid' ? 'max-w-full' : 'max-w-none'
          )}>
            <div className={cn(
              "min-h-[400px]",
              allowOverflow && "relative"
            )}>
              <Component {...processedProps} />
            </div>
          </div>
        </div>
      </div>
    </LayoutErrorBoundary>
  )
}

