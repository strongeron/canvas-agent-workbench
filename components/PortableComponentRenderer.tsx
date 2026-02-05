/**
 * Gallery POC - Portable Component Renderer
 *
 * A clean, adapter-based component renderer that doesn't have
 * hardcoded component imports. Uses the GalleryAdapter to resolve components.
 */

import { Check, ChevronDown, ChevronUp, Copy } from "lucide-react"
import { Component as ReactComponent, useCallback, useEffect, useState } from "react"
import type { ComponentType, ReactNode } from "react"

import { useGalleryAdapter } from "../core/GalleryContext"
import type { ComponentVariant, InteractivePropsSchema } from "../core/types"
import { InteractivePropsPanel } from "./InteractivePropsPanel"
import { ModalPreview } from "./ModalPreview"
import { SonnerPreview } from "../demo-thicket/SonnerPreview"
import { ToastPreview } from "../demo-thicket/platform/_archive/toast/ToastPreview"
import { ToastProvider } from "../demo-thicket/platform/_archive/toast/ToastContext"
import {
  isCoverComponent,
  isDropdownComponent,
  isFullWidthComponent,
  isOverlayComponent,
  isWherebyComponent,
} from "../demo-thicket/registry/types"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type RenderMode = "card" | "standalone" | "canvas" | "snapshot"
export type BackgroundColor = "white" | "gray" | "dark" | "transparent"

export interface PortableComponentRendererProps {
  /** The name of the component (used to look up in adapter) */
  componentName: string

  /** Import path for display purposes */
  importPath?: string

  /** The variant to render */
  variant: ComponentVariant

  /** Allow content to overflow container */
  allowOverflow?: boolean

  /** Hide the header with variant name */
  hideHeader?: boolean

  /** Hide the footer with code toggle */
  hideFooter?: boolean

  /** Rendering mode */
  renderMode?: RenderMode

  /** Background color */
  backgroundColor?: BackgroundColor

  /** Override props (for interactive editing) */
  propsOverride?: Record<string, any>

  /** Callback when props change */
  onPropsChange?: (newProps: Record<string, any>) => void

  /** Show interactive props panel */
  showInteractivePanel?: boolean

  /** Custom wrapper for special components (modals, etc.) */
  customWrapper?: ComponentType<{ children: ReactNode; variant: ComponentVariant }>
}

// ─────────────────────────────────────────────────────────────────────────────
// Error Boundary
// ─────────────────────────────────────────────────────────────────────────────

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class ComponentErrorBoundary extends ReactComponent<
  { children: ReactNode; componentName: string },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; componentName: string }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <h4 className="font-medium text-red-800">
            Error rendering {this.props.componentName}
          </h4>
          <p className="mt-1 text-sm text-red-600">
            {this.state.error?.message || "Unknown error"}
          </p>
        </div>
      )
    }

    return this.props.children
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Components
// ─────────────────────────────────────────────────────────────────────────────

function CodeBlock({ code, onCopy }: { code: string; onCopy: () => void }) {
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100">
        <code>{code}</code>
      </pre>
      <button
        onClick={onCopy}
        className="absolute right-2 top-2 rounded p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white"
        title="Copy code"
      >
        <Copy className="h-4 w-4" />
      </button>
    </div>
  )
}

function ComponentNotFound({ name }: { name: string }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <h4 className="font-medium text-amber-800">Component not found</h4>
      <p className="mt-1 text-sm text-amber-600">
        The component &quot;{name}&quot; is not registered in the gallery adapter.
        Make sure it&apos;s added to your componentMap.
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function PortableComponentRenderer({
  componentName,
  importPath,
  variant,
  allowOverflow = false,
  hideHeader = false,
  hideFooter = false,
  renderMode = "card",
  backgroundColor = "white",
  propsOverride,
  onPropsChange,
  showInteractivePanel,
  customWrapper: CustomWrapper,
}: PortableComponentRendererProps) {
  const adapter = useGalleryAdapter()

  const [showCode, setShowCode] = useState(false)
  const [copied, setCopied] = useState(false)

  // Interactive props state
  const [internalProps, setInternalProps] = useState<Record<string, any>>(variant.props ?? {})

  // Sync when variant changes
  useEffect(() => {
    setInternalProps(variant.props ?? {})
  }, [variant.props])

  // Determine if should show interactive controls
  const hasInteractiveSchema = !!variant.interactiveSchema
  const shouldShowPanel = showInteractivePanel ?? (hasInteractiveSchema && renderMode === "card")

  // Use external override if provided
  const currentProps = propsOverride ?? internalProps

  const handlePropChange = useCallback(
    (propName: string, value: any) => {
      const newProps = { ...currentProps, [propName]: value }
      setInternalProps(newProps)
      onPropsChange?.(newProps)
    },
    [currentProps, onPropsChange]
  )

  const handleReset = useCallback(() => {
    setInternalProps(variant.props)
    onPropsChange?.(variant.props)
  }, [variant.props, onPropsChange])

  // Get component from adapter
  const Component = adapter.getComponent(componentName)

  if (!Component) {
    return <ComponentNotFound name={componentName} />
  }

  // Generate code snippet
  const generateCodeSnippet = () => {
    const propsString = Object.entries(currentProps)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => {
        if (typeof value === "string") {
          return `${key}="${value}"`
        }
        if (typeof value === "boolean") {
          return value ? key : `${key}={false}`
        }
        if (typeof value === "function") {
          return `${key}={() => {}}`
        }
        return `${key}={${JSON.stringify(value)}}`
      })
      .join("\n  ")

    return `<${componentName}${propsString ? `\n  ${propsString}\n` : " "}/>`
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generateCodeSnippet())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Background styles
  const bgStyles: Record<BackgroundColor, string> = {
    white: "bg-white",
    gray: "bg-gray-50",
    dark: "bg-gray-900",
    transparent: "bg-transparent",
  }

  const useThicketBehaviors = !!importPath && (
    importPath.startsWith("../") || importPath.startsWith("@thicket/")
  )
  const shouldApplyThicketPreview = useThicketBehaviors && renderMode === "card"
  const useSonnerPreview = shouldApplyThicketPreview && currentProps?.__useSonnerPreview
  const useToastPreview = shouldApplyThicketPreview && currentProps?.__useToastPreview
  const isOverlay = shouldApplyThicketPreview && isOverlayComponent(componentName)
  const isWhereby = shouldApplyThicketPreview && isWherebyComponent(componentName)
  const isCover = shouldApplyThicketPreview && isCoverComponent(componentName)
  const isFullWidth = shouldApplyThicketPreview && isFullWidthComponent(componentName)
  const isDropdown = shouldApplyThicketPreview && isDropdownComponent(componentName)

  const renderBaseContent = () => {
    const element = <Component {...currentProps} />

    if (CustomWrapper) {
      return <CustomWrapper variant={variant}>{element}</CustomWrapper>
    }

    return element
  }

  const renderContent = () => {
    if (useSonnerPreview) {
      return (
        <SonnerPreview
          toastType={currentProps?.toastType}
          message={currentProps?.message}
          description={currentProps?.description}
          action={currentProps?.action}
          promiseConfig={currentProps?.promiseConfig}
          toasts={currentProps?.toasts}
        />
      )
    }

    if (useToastPreview) {
      return (
        <ToastProvider>
          <ToastPreview
            toasts={Array.isArray(currentProps?.toasts) ? currentProps?.toasts : []}
            variantName={variant.name}
          />
        </ToastProvider>
      )
    }

    if (isOverlay) {
      return (
        <ModalPreview
          Component={Component}
          props={currentProps}
          title={(currentProps?.title as string) || "Modal Preview"}
          subtitle={currentProps?.subtitle as string | undefined}
          size={currentProps?.size as "small" | "medium" | "large" | undefined}
        />
      )
    }

    if (isWhereby) {
      return (
        <div className="w-full max-w-2xl rounded-lg border border-blue-200 bg-blue-50 p-6 text-center">
          <div className="mb-3 flex justify-center">
            <div className="rounded-full bg-blue-100 p-3">
              <svg
                className="h-7 w-7 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>
          <h3 className="mb-2 text-sm font-semibold text-gray-900">
            {componentName === "WherebyEmbed" ? "Video Room Integration" : "Recording Player"}
          </h3>
          <p className="text-sm text-gray-600">
            This component loads the Whereby video platform dynamically. In production, it displays a live room.
          </p>
          <div className="mt-3 text-xs text-gray-500">
            Room URL: {currentProps?.roomUrl || currentProps?.recordingUrl || "—"}
          </div>
        </div>
      )
    }

    if (isCover && componentName === "LessonCover" && !currentProps?.coverUrl) {
      return (
        <div className="w-full max-w-md">
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <Component {...currentProps} />
            <div className="border-t border-gray-200 bg-white p-4">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-xs text-gray-500">
                  Lesson {currentProps?.lessonNumber || 1}
                </span>
              </div>
              <h4 className="mb-1 text-base font-semibold text-gray-900">
                {currentProps?.title || "Lesson Title"}
              </h4>
              <p className="text-sm text-gray-600">
                Lesson description goes here. This shows how the cover looks in context.
              </p>
            </div>
          </div>
        </div>
      )
    }

    if (isCover && componentName === "CourseCover" && currentProps?.variant === "card") {
      return (
        <div className="w-full max-w-sm">
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <Component {...currentProps} />
            <div className="p-4">
              <h4 className="mb-2 text-lg font-semibold text-gray-900">
                {currentProps?.title || "Course Title"}
              </h4>
              <p className="text-sm text-gray-600">
                Course description showing how the cover looks in context.
              </p>
            </div>
          </div>
        </div>
      )
    }

    return renderBaseContent()
  }

  // Standalone mode (no card wrapper)
  if (renderMode === "standalone" || renderMode === "canvas") {
    return (
      <ComponentErrorBoundary componentName={componentName}>
        {renderContent()}
      </ComponentErrorBoundary>
    )
  }

  // Card mode
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      {!hideHeader && (
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div>
            <h4 className="font-medium text-gray-900">{variant.name}</h4>
            {variant.description && (
              <p className="mt-0.5 text-sm text-gray-500">{variant.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {variant.status && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  variant.status === "prod"
                    ? "bg-green-100 text-green-700"
                    : variant.status === "wip"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-gray-100 text-gray-700"
                }`}
              >
                {variant.status.toUpperCase()}
              </span>
            )}
            {variant.category && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                {variant.category}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Component Preview */}
      <div
        className={`${bgStyles[backgroundColor]} ${
          allowOverflow ? "" : "overflow-hidden"
        } ${isDropdown ? "pb-20" : ""} p-6`}
      >
        <ComponentErrorBoundary componentName={componentName}>
          <div
            className={`flex items-center justify-center ${
              isFullWidth ? "min-h-[200px]" : "min-h-[120px]"
            }`}
          >
            {renderContent()}
          </div>
        </ComponentErrorBoundary>
      </div>

      {/* Interactive Props Panel */}
      {shouldShowPanel && variant.interactiveSchema && (
        <div className="border-t border-gray-100 p-4">
          <InteractivePropsPanel
            schema={variant.interactiveSchema}
            values={currentProps}
            onChange={handlePropChange}
            onReset={handleReset}
          />
        </div>
      )}

      {/* Footer */}
      {!hideFooter && (
        <div className="border-t border-gray-100 px-4 py-2">
          <button
            onClick={() => setShowCode(!showCode)}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            {showCode ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Hide Code
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Show Code
              </>
            )}
          </button>

          {showCode && (
            <div className="mt-3">
              <CodeBlock code={generateCodeSnippet()} onCopy={handleCopyCode} />
              {copied && (
                <div className="mt-2 flex items-center gap-1 text-sm text-green-600">
                  <Check className="h-4 w-4" />
                  Copied!
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default PortableComponentRenderer
