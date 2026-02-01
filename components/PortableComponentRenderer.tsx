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
        The component "{name}" is not registered in the gallery adapter.
        Make sure it's added to your componentMap.
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
  const [internalProps, setInternalProps] = useState<Record<string, any>>(variant.props)

  // Sync when variant changes
  useEffect(() => {
    setInternalProps(variant.props)
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

  // Render content
  const renderContent = () => {
    const element = <Component {...currentProps} />

    if (CustomWrapper) {
      return <CustomWrapper variant={variant}>{element}</CustomWrapper>
    }

    return element
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
        } p-6`}
      >
        <ComponentErrorBoundary componentName={componentName}>
          {renderContent()}
        </ComponentErrorBoundary>
      </div>

      {/* Interactive Props Panel */}
      {shouldShowPanel && variant.interactiveSchema && (
        <div className="border-t border-gray-100 p-4">
          <InteractivePropsPanel
            schema={variant.interactiveSchema}
            currentProps={currentProps}
            onPropChange={handlePropChange}
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
