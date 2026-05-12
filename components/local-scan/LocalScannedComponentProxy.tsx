import { Component, createElement, useEffect, useState } from "react"
import type { ComponentType, ErrorInfo, ReactNode } from "react"

interface LocalScannedComponentProxyProps {
  moduleUrl: string
  exportName?: string
  displayName?: string
  sourcePath?: string
  repoName?: string
}

const NOOP = () => {}

const DEFAULT_PREVIEW_PROPS: Record<string, unknown> = {
  variants: [{ id: "preview", label: "Preview", name: "Preview" }],
  active: "preview",
  onChange: NOOP,
  onPaletteChange: NOOP,
  onFontPairChange: NOOP,
  activePalette: "default",
  activeFontPair: "default",
  theme: "dark",
  minimal: true,
  showPickBadge: false,
}

interface LocalRenderBoundaryProps {
  onError: (message: string) => void
  children: ReactNode
}

interface LocalRenderBoundaryState {
  hasError: boolean
}

type StoryModule = Record<string, unknown> & {
  default?: {
    args?: Record<string, unknown>
    component?: unknown
  }
}

type StoryExport = {
  args?: Record<string, unknown>
  component?: unknown
  render?: (args: Record<string, unknown>) => ReactNode
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

// ComponentType<any> is intentional: component props are unknown at scan time
function isRenderableReactValue(value: unknown): value is ComponentType<any> {
  return (
    typeof value === "function" ||
    (isRecord(value) && typeof value.$$typeof !== "undefined")
  )
}

function isStoryExport(value: unknown): value is StoryExport {
  return (
    isRecord(value) &&
    typeof value.$$typeof === "undefined" &&
    ("args" in value || "render" in value || "component" in value)
  )
}

function resolvePreviewComponent(
  mod: StoryModule,
  exportName?: string
): ComponentType<any> {
  const preferred =
    exportName && typeof mod[exportName] !== "undefined"
      ? mod[exportName]
      : mod.default

  if (isRenderableReactValue(preferred)) {
    return preferred
  }

  if (isStoryExport(preferred)) {
    return function LocalStoryPreview(extraProps: Record<string, unknown>) {
      const storyArgs = isRecord(preferred.args) ? preferred.args : {}
      const metaArgs = isRecord(mod.default?.args) ? mod.default.args : {}
      const args = {
        ...metaArgs,
        ...storyArgs,
        ...extraProps,
      }

      if (typeof preferred.render === "function") {
        return <>{preferred.render(args)}</>
      }

      const component = preferred.component || mod.default?.component
      if (isRenderableReactValue(component)) {
        return createElement(component, args)
      }

      throw new Error("Story export has no render function or meta component.")
    }
  }

  throw new Error("Export is not a renderable React component or Storybook story.")
}

class LocalRenderBoundary extends Component<LocalRenderBoundaryProps, LocalRenderBoundaryState> {
  state: LocalRenderBoundaryState = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: unknown, _errorInfo: ErrorInfo) {
    const message =
      error instanceof Error ? error.message : "Component threw during render."
    this.props.onError(message)
  }

  render() {
    if (this.state.hasError) return null
    return this.props.children
  }
}

export default function LocalScannedComponentProxy({
  moduleUrl,
  exportName,
  displayName,
  sourcePath,
  repoName,
  ...passThroughProps
}: LocalScannedComponentProxyProps & Record<string, unknown>) {
  const [LoadedComponent, setLoadedComponent] = useState<ComponentType<any> | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [renderError, setRenderError] = useState<string | null>(null)

  const previewProps = {
    ...DEFAULT_PREVIEW_PROPS,
    ...passThroughProps,
  }

  useEffect(() => {
    let active = true
    setLoadedComponent(null)
    setLoadError(null)
    setRenderError(null)

    void (async () => {
      try {
        const mod: StoryModule = await import(/* @vite-ignore */ moduleUrl)
        const resolved = resolvePreviewComponent(mod, exportName)
        if (active) {
          setLoadedComponent(() => resolved)
        }
      } catch (loadError) {
        if (!active) return
        const message =
          loadError instanceof Error ? loadError.message : "Failed to load local module."
        setLoadError(message)
      }
    })()

    return () => {
      active = false
    }
  }, [moduleUrl, exportName])

  if (LoadedComponent) {
    const Component = LoadedComponent
    return (
      <div className="h-full w-full overflow-auto rounded-lg border border-default bg-white p-3">
        <LocalRenderBoundary onError={setRenderError} key={`${moduleUrl}::${exportName || "default"}`}>
          <Component {...previewProps} />
        </LocalRenderBoundary>
        {renderError && (
          <div className="mt-2 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
            {`Render error: ${renderError}`}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-full w-full rounded-lg border border-default bg-surface-50 p-3 text-foreground">
      <div className="text-sm font-semibold">{displayName || "Scanned component"}</div>
      <div className="mt-1 text-xs text-muted-foreground">
        {repoName ? `Repo: ${repoName}` : "Local repository scan"}
      </div>
      {sourcePath && (
        <div className="mt-2 rounded border border-default bg-white px-2 py-1 font-mono text-[11px] text-muted-foreground">
          {sourcePath}
        </div>
      )}
      <div className="mt-3 text-xs text-muted-foreground">
        {loadError ? `Load error: ${loadError}` : "Loading component module..."}
      </div>
      <div className="mt-2 text-[11px] text-muted-foreground">
        This preview uses dynamic /@fs import and may fail if repo aliases/dependencies are unavailable.
      </div>
    </div>
  )
}
