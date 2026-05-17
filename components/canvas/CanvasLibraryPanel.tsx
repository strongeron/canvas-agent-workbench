import { useCallback, useEffect, useState } from "react"
import { Loader2, Package, Plus, RotateCw, X } from "lucide-react"

import {
  buildPrimitiveSnippet,
  type CanvasRegistryPrimitive,
} from "../../utils/canvasRegistry"
import {
  buildLibraryDragPayload,
  writeLibraryDragPayload,
  type CanvasLibraryDragPayload,
} from "../../utils/canvasLibraryDrag"
import { CANVAS_REGISTRY_UPDATED_EVENT } from "../../utils/canvasRegistryEvents"

export interface CanvasLibraryPanelProps {
  projectId?: string
  onInstantiate: (input: {
    title: string
    sourceReact?: string
    sourceHtml?: string
    sourceMode?: "react" | "inline"
    sourcePath?: string
  }) => void | Promise<void>
  onCreateFromPaste?: () => void
  onClose: () => void
  onPrimitiveDragStart?: (payload: CanvasLibraryDragPayload) => void
  onPrimitiveDragEnd?: () => void
}

interface FetchState {
  status: "idle" | "loading" | "ready" | "error"
  primitives: CanvasRegistryPrimitive[]
  warnings: string[]
  error: string
}

const initialFetchState: FetchState = {
  status: "idle",
  primitives: [],
  warnings: [],
  error: "",
}

export function CanvasLibraryPanel({
  projectId = "design-system-foundation",
  onInstantiate,
  onCreateFromPaste,
  onClose,
  onPrimitiveDragStart,
  onPrimitiveDragEnd,
}: CanvasLibraryPanelProps) {
  const [fetchState, setFetchState] = useState<FetchState>(initialFetchState)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setFetchState({ ...initialFetchState, status: "loading" })
    fetch("/api/canvas/registry/list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as {
          ok?: boolean
          primitives?: CanvasRegistryPrimitive[]
          warnings?: string[]
          error?: string
        }
        if (!response.ok || !payload.ok || !Array.isArray(payload.primitives)) {
          throw new Error(payload.error || "Failed to load registry.")
        }
        setFetchState({
          status: "ready",
          primitives: payload.primitives,
          warnings: payload.warnings ?? [],
          error: "",
        })
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        setFetchState({
          status: "error",
          primitives: [],
          warnings: [],
          error: error instanceof Error ? error.message : "Failed to load registry.",
        })
      })
    return () => controller.abort()
  }, [projectId, refreshKey])

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    const handleRegistryUpdated = () => setRefreshKey((k) => k + 1)
    window.addEventListener(CANVAS_REGISTRY_UPDATED_EVENT, handleRegistryUpdated)
    return () => window.removeEventListener(CANVAS_REGISTRY_UPDATED_EVENT, handleRegistryUpdated)
  }, [])

  const instantiate = useCallback(
    async (primitive: CanvasRegistryPrimitive) => {
      if (primitive.kind === "html" && primitive.filePath) {
        const response = await fetch("/api/canvas/ast/load", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filePath: `projects/${projectId}/${primitive.filePath}`,
          }),
        })
        const payload = (await response.json().catch(() => ({}))) as {
          ok?: boolean
          sourceHtml?: string
          source?: string
          error?: string
        }
        if (!response.ok || !payload.ok) {
          throw new Error(payload.error || "Failed to load HTML primitive.")
        }
        await onInstantiate({
          title: primitive.displayName,
          sourceHtml: payload.sourceHtml || payload.source || "",
          sourceMode: "inline",
          sourcePath: `projects/${projectId}/${primitive.filePath}`,
        })
        return
      }
      const sourceReact = buildPrimitiveSnippet(primitive)
      await onInstantiate({
        title: primitive.displayName,
        sourceReact,
        sourceMode: "react",
      })
    },
    [onInstantiate, projectId]
  )

  return (
    <div className="flex h-full w-72 flex-col border-r border-default bg-white">
      <header className="flex items-start justify-between gap-2 border-b border-default px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
            <Package className="h-3 w-3" />
            Library
          </div>
          <h3 className="truncate text-sm font-semibold text-foreground" title={projectId}>
            {projectId}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          {onCreateFromPaste && (
            <button
              type="button"
              onClick={onCreateFromPaste}
              className="rounded p-1 text-muted-foreground hover:bg-surface-100 hover:text-foreground"
              title="New from paste"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={refresh}
            disabled={fetchState.status === "loading"}
            className="rounded p-1 text-muted-foreground hover:bg-surface-100 hover:text-foreground disabled:opacity-50"
            title="Refresh"
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

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {fetchState.status === "loading" ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Reading registry…
          </div>
        ) : fetchState.status === "error" ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
            <div className="font-semibold">Could not load registry</div>
            <div className="mt-0.5">{fetchState.error}</div>
            <button
              type="button"
              onClick={refresh}
              className="mt-2 rounded-md border border-red-300 bg-white px-2 py-0.5 text-[11px] font-medium text-red-900 hover:bg-red-100"
            >
              Retry
            </button>
          </div>
        ) : fetchState.primitives.length === 0 ? (
          <p className="text-[11px] italic text-muted-foreground">
            Registry is empty. Add primitives in <code>registry.json</code>.
          </p>
        ) : (
          <PrimitiveList
            primitives={fetchState.primitives}
            projectId={projectId}
            onInstantiate={instantiate}
            onPrimitiveDragStart={onPrimitiveDragStart}
            onPrimitiveDragEnd={onPrimitiveDragEnd}
          />
        )}

        {fetchState.warnings.length > 0 && (
          <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] text-amber-800">
            <div className="font-semibold">Registry warnings</div>
            <ul className="mt-1 list-disc pl-4">
              {fetchState.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

function PrimitiveList({
  primitives,
  projectId,
  onInstantiate,
  onPrimitiveDragStart,
  onPrimitiveDragEnd,
}: {
  primitives: CanvasRegistryPrimitive[]
  projectId: string
  onInstantiate: (primitive: CanvasRegistryPrimitive) => void
  onPrimitiveDragStart?: (payload: CanvasLibraryDragPayload) => void
  onPrimitiveDragEnd?: () => void
}) {
  const groups = new Map<string, CanvasRegistryPrimitive[]>()
  for (const primitive of primitives) {
    const list = groups.get(primitive.category) ?? []
    list.push(primitive)
    groups.set(primitive.category, list)
  }

  return (
    <div className="space-y-3">
      {[...groups.entries()].map(([category, list]) => (
        <section key={category}>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {category}
          </div>
          <ul className="space-y-1">
            {list.map((primitive) => (
              <li key={primitive.id}>
                <button
                  type="button"
                  draggable
                  onClick={() => void onInstantiate(primitive)}
                  onDragStart={(event) => {
                    const payload = buildLibraryDragPayload({ projectId, primitive })
                    writeLibraryDragPayload(event.dataTransfer, payload)
                    onPrimitiveDragStart?.(payload)
                  }}
                  onDragEnd={() => onPrimitiveDragEnd?.()}
                  className="w-full cursor-grab rounded-md border border-default bg-white px-2.5 py-2 text-left text-[12px] hover:border-brand-300 hover:bg-brand-50 active:cursor-grabbing"
                  title={primitive.id}
                  data-canvas-library-primitive={primitive.id}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-foreground">{primitive.displayName}</span>
                    <span className="rounded bg-surface-100 px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                      {primitive.kind}
                    </span>
                  </div>
                  {primitive.description && (
                    <div className="mt-0.5 line-clamp-2 text-[10px] text-muted-foreground">
                      {primitive.description}
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
