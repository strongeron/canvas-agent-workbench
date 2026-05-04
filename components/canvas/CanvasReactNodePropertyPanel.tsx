import { AlertTriangle, Loader2, RotateCw, X } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"

import type { AstAttributeInfo, AstNodeInfo } from "../../utils/canvasAstReader"
import type { CanvasReactNodeSelection } from "./CanvasHtmlFrame"

export interface CanvasReactNodePropertyPanelProps {
  /** The selection emitted by CanvasHtmlFrame on canvas/select. */
  selection: CanvasReactNodeSelection
  /** Current sourceReact for the selection's owning item. */
  sourceReact: string
  /** Current compile generation. Stale selections (older generation) are
   *  shown with a "stale — re-select" banner instead of mutable fields. */
  currentCompileGeneration: number
  /** Source-of-truth project file path / id. Used as the canvasId prefix.
   *  For v1 this matches `selection.itemId`. */
  sourceId: string
  /** Called when the user clears the panel (close button or Esc). */
  onClose: () => void
  /** Called when the panel wants to switch to source-only mode (out of
   *  scope for v1 — the canvas item type already supports it via
   *  CanvasHtmlPropsPanel). U4 plumbs this into the AST writer. */
  onOpenSourceMode?: () => void
}

interface FetchState {
  status: "idle" | "loading" | "ready" | "error"
  node: AstNodeInfo | null
  error: string
}

const initialFetchState: FetchState = { status: "idle", node: null, error: "" }

export function CanvasReactNodePropertyPanel({
  selection,
  sourceReact,
  currentCompileGeneration,
  sourceId,
  onClose,
  onOpenSourceMode,
}: CanvasReactNodePropertyPanelProps) {
  const [fetchState, setFetchState] = useState<FetchState>(initialFetchState)
  const [refreshKey, setRefreshKey] = useState(0)

  const stale = selection.compileGeneration < currentCompileGeneration

  useEffect(() => {
    if (stale) {
      setFetchState(initialFetchState)
      return
    }
    const controller = new AbortController()
    setFetchState({ status: "loading", node: null, error: "" })
    fetch("/api/canvas/ast/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceReact,
        canvasId: selection.canvasId,
        sourceId,
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as {
          ok?: boolean
          node?: AstNodeInfo
          error?: string
        }
        if (!response.ok || !payload.ok || !payload.node) {
          throw new Error(payload.error || "Failed to read AST node.")
        }
        setFetchState({ status: "ready", node: payload.node, error: "" })
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        setFetchState({
          status: "error",
          node: null,
          error: error instanceof Error ? error.message : "Failed to read AST node.",
        })
      })
    return () => controller.abort()
  }, [
    selection.canvasId,
    sourceReact,
    sourceId,
    refreshKey,
    stale,
  ])

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  const headerLabel = useMemo(() => {
    if (stale) return `${selection.tag} (stale)`
    return fetchState.node?.tag || selection.tag
  }, [fetchState.node?.tag, selection.tag, stale])

  return (
    <div className="flex h-full w-80 flex-col border-l border-default bg-white">
      <header className="flex items-start justify-between gap-2 border-b border-default px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">React node</div>
          <h3 className="truncate text-sm font-semibold text-foreground" title={headerLabel}>
            &lt;{headerLabel}&gt;
          </h3>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground" title={selection.canvasId}>
            {selection.canvasId}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={refresh}
            className="rounded p-1 text-muted-foreground hover:bg-surface-100 hover:text-foreground"
            title="Refresh"
            disabled={fetchState.status === "loading" || stale}
          >
            <RotateCw className={`h-4 w-4 ${fetchState.status === "loading" ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-surface-100 hover:text-foreground"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {stale ? (
          <StaleBanner onOpenSourceMode={onOpenSourceMode} />
        ) : fetchState.status === "loading" ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Reading AST...
          </div>
        ) : fetchState.status === "error" ? (
          <ErrorBanner error={fetchState.error} onRetry={refresh} />
        ) : fetchState.node ? (
          <NodeBody node={fetchState.node} onOpenSourceMode={onOpenSourceMode} />
        ) : null}
      </div>
    </div>
  )
}

function NodeBody({
  node,
  onOpenSourceMode,
}: {
  node: AstNodeInfo
  onOpenSourceMode?: () => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Element
        </div>
        <div className="font-mono text-xs text-foreground">
          {node.isHostElement ? (
            <span className="text-blue-700">{node.tag}</span>
          ) : (
            <span className="text-violet-700">&lt;{node.tag} /&gt;</span>
          )}
          <span className="ml-2 text-[10px] text-muted-foreground">
            {node.isHostElement ? "host" : "component"}
          </span>
        </div>
      </div>

      {!node.editableInV1 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <div>
              <div className="font-semibold">Source-only mode</div>
              <div className="mt-0.5">
                {node.reasonNotEditable ?? "This element falls outside the v1 edit subset."}
              </div>
              {onOpenSourceMode && (
                <button
                  type="button"
                  onClick={onOpenSourceMode}
                  className="mt-2 rounded-md border border-amber-300 bg-white px-2 py-0.5 text-[11px] font-medium text-amber-900 hover:bg-amber-100"
                >
                  Open source
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Attributes ({node.attributes.length})
        </div>
        {node.attributes.length === 0 ? (
          <p className="text-[11px] italic text-muted-foreground">No attributes.</p>
        ) : (
          <ul className="space-y-2">
            {node.attributes.map((attr, i) => (
              <AttributeRow key={`${attr.name}-${i}`} attr={attr} />
            ))}
          </ul>
        )}
      </div>

      <div>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Children
        </div>
        {node.hasNonTextChildren ? (
          <p className="text-[11px] italic text-muted-foreground">
            Has nested JSX or computed expressions — not editable in v1.
          </p>
        ) : node.textChildren ? (
          <pre className="whitespace-pre-wrap rounded-md bg-surface-50 px-2 py-1 font-mono text-[11px] text-foreground">
            {node.textChildren}
          </pre>
        ) : (
          <p className="text-[11px] italic text-muted-foreground">(empty)</p>
        )}
      </div>
    </div>
  )
}

function AttributeRow({ attr }: { attr: AstAttributeInfo }) {
  return (
    <li className="rounded-md border border-default bg-white px-2 py-1.5 text-[11px]">
      <div className="flex items-center justify-between gap-2">
        <code className="font-mono text-foreground">{attr.name}</code>
        <span className="rounded bg-surface-100 px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {attr.kind}
        </span>
      </div>
      <div className="mt-1 break-words font-mono text-[10px] text-muted-foreground">
        {attr.kind === "literal-string" ? `"${attr.value}"` : attr.value}
      </div>
      {!attr.editableInV1 && attr.reasonNotEditable && (
        <div className="mt-1 text-[10px] italic text-amber-700">
          {attr.reasonNotEditable}
        </div>
      )}
    </li>
  )
}

function StaleBanner({ onOpenSourceMode }: { onOpenSourceMode?: () => void }) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <div>
          <div className="font-semibold">Stale selection</div>
          <div className="mt-0.5">
            The source has been recompiled since this element was selected. Re-click
            the element in the iframe to refresh, or open source mode.
          </div>
          {onOpenSourceMode && (
            <button
              type="button"
              onClick={onOpenSourceMode}
              className="mt-2 rounded-md border border-amber-300 bg-white px-2 py-0.5 text-[11px] font-medium text-amber-900 hover:bg-amber-100"
            >
              Open source
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function ErrorBanner({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
      <div className="font-semibold">Could not read AST node</div>
      <div className="mt-0.5">{error}</div>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 rounded-md border border-red-300 bg-white px-2 py-0.5 text-[11px] font-medium text-red-900 hover:bg-red-100"
      >
        Retry
      </button>
    </div>
  )
}
