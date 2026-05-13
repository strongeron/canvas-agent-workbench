import { AlertTriangle, Loader2, RotateCw, X } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"

import type { AstAttributeInfo, AstNodeInfo } from "../../utils/canvasAstReader"
import type { CanvasAstMutation } from "../../utils/canvasAstWriter"
import type { CanvasHtmlMutation } from "../../utils/canvasHtmlEditor"
import type { CanvasReactNodeSelection } from "./CanvasHtmlFrame"

export interface CanvasReactNodePropertyPanelProps {
  selection: CanvasReactNodeSelection
  sourceReact: string
  sourceHtml?: string
  sourceKind?: "tsx" | "html"
  currentCompileGeneration: number
  sourceId: string
  sourceFilePath?: string
  sourceFileMtime?: number
  onClose: () => void
  onSourceReactChange: (sourceReact: string, mtimeMs?: number) => void
  onSourceHtmlChange?: (sourceHtml: string, mtimeMs?: number) => void
  onSelectionChange?: (selection: CanvasReactNodeSelection | null) => void
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
  sourceHtml = "",
  sourceKind = "tsx",
  currentCompileGeneration,
  sourceId,
  sourceFilePath,
  sourceFileMtime,
  onClose,
  onSourceReactChange,
  onSourceHtmlChange,
  onSelectionChange,
  onOpenSourceMode,
}: CanvasReactNodePropertyPanelProps) {
  const [fetchState, setFetchState] = useState<FetchState>(initialFetchState)
  const [refreshKey, setRefreshKey] = useState(0)
  const [writeState, setWriteState] = useState<{ status: "idle" | "saving" | "error"; error: string }>({
    status: "idle",
    error: "",
  })

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
        sourceHtml: sourceKind === "html" ? sourceHtml : undefined,
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
    sourceHtml,
    sourceKind,
    sourceReact,
    sourceId,
    refreshKey,
    stale,
  ])

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  const applyMutations = useCallback(
    async (mutations: Array<CanvasAstMutation | CanvasHtmlMutation>) => {
      if (stale) return
      setWriteState({ status: "saving", error: "" })
      const fileBacked = Boolean(sourceFilePath)
      try {
        const response = await fetch("/api/canvas/ast/write", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceReact: sourceKind === "tsx" && !fileBacked ? sourceReact : undefined,
            sourceHtml: sourceKind === "html" && !fileBacked ? sourceHtml : undefined,
            canvasId: selection.canvasId,
            sourceId,
            mutations,
            filePath: fileBacked ? sourceFilePath : undefined,
            mtimeMs: fileBacked ? sourceFileMtime : undefined,
          }),
        })
        const payload = (await response.json().catch(() => ({}))) as {
          ok?: boolean
          sourceReact?: string
          sourceHtml?: string
          canvasIdMap?: Record<string, string | null>
          mtimeMs?: number | null
          error?: string
          code?: string
        }
        const nextSource = sourceKind === "html" ? payload.sourceHtml : payload.sourceReact
        if (!response.ok || !payload.ok || typeof nextSource !== "string") {
          const errorMsg = payload.error || "Failed to write AST node."
          throw new Error(
            payload.code === "mtime-conflict"
              ? `${errorMsg} The file changed on disk since it was loaded.`
              : errorMsg
          )
        }
        const nextMtime = typeof payload.mtimeMs === "number" ? payload.mtimeMs : undefined
        if (sourceKind === "html") {
          onSourceHtmlChange?.(nextSource, nextMtime)
        } else {
          onSourceReactChange(nextSource, nextMtime)
        }
        const rebasedCanvasId = payload.canvasIdMap?.[selection.canvasId]
        if (rebasedCanvasId === null) {
          onSelectionChange?.(null)
        } else if (typeof rebasedCanvasId === "string" && rebasedCanvasId !== selection.canvasId) {
          onSelectionChange?.({
            ...selection,
            canvasId: rebasedCanvasId,
          })
        }
        setWriteState({ status: "idle", error: "" })
      } catch (error) {
        setWriteState({
          status: "error",
          error: error instanceof Error ? error.message : "Failed to write AST node.",
        })
      }
    },
    [
      onSourceReactChange,
      onSourceHtmlChange,
      onSelectionChange,
      selection,
      sourceFileMtime,
      sourceFilePath,
      sourceId,
      sourceHtml,
      sourceKind,
      sourceReact,
      stale,
    ]
  )

  const headerLabel = useMemo(() => {
    if (stale) return `${selection.tag} (stale)`
    return fetchState.node?.tag || selection.tag
  }, [fetchState.node?.tag, selection.tag, stale])

  return (
    <div className="flex h-full w-80 flex-col border-l border-default bg-white">
      <header className="flex items-start justify-between gap-2 border-b border-default px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            {sourceKind === "html" ? "HTML node" : "React node"}
          </div>
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
          <NodeBody
            node={fetchState.node}
            sourceKind={sourceKind}
            writeState={writeState}
            onApplyMutations={applyMutations}
            onOpenSourceMode={onOpenSourceMode}
          />
        ) : null}
      </div>
    </div>
  )
}

function NodeBody({
  node,
  sourceKind,
  writeState,
  onApplyMutations,
  onOpenSourceMode,
}: {
  node: AstNodeInfo
  sourceKind: "tsx" | "html"
  writeState: { status: "idle" | "saving" | "error"; error: string }
  onApplyMutations: (mutations: Array<CanvasAstMutation | CanvasHtmlMutation>) => void
  onOpenSourceMode?: () => void
}) {
  return (
    <div className="space-y-4">
      {writeState.status === "error" && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
          <div className="font-semibold">Could not apply edit</div>
          <div className="mt-0.5">{writeState.error}</div>
        </div>
      )}

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
                {node.reasonNotEditable ?? "This element falls outside the editable subset."}
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
              <AttributeRow
                key={`${attr.name}-${i}`}
                attr={attr}
                sourceKind={sourceKind}
                disabled={writeState.status === "saving"}
                onApplyMutations={onApplyMutations}
              />
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
            Has nested elements or computed expressions — not editable here.
          </p>
        ) : node.textChildren ? (
          <TextChildEditor
            value={node.textChildren}
            disabled={writeState.status === "saving"}
            onApplyMutations={onApplyMutations}
          />
        ) : (
          <p className="text-[11px] italic text-muted-foreground">(empty)</p>
        )}
      </div>

      <StructureEditor
        node={node}
        sourceKind={sourceKind}
        disabled={writeState.status === "saving"}
        onApplyMutations={onApplyMutations}
      />
    </div>
  )
}

function StructureEditor({
  node,
  sourceKind,
  disabled,
  onApplyMutations,
}: {
  node: AstNodeInfo
  sourceKind: "tsx" | "html"
  disabled: boolean
  onApplyMutations: (mutations: Array<CanvasAstMutation | CanvasHtmlMutation>) => void
}) {
  const [wrapTag, setWrapTag] = useState("div")
  const [swapTag, setSwapTag] = useState(node.isHostElement ? node.tag : "div")
  const [childSource, setChildSource] = useState("<span>New</span>")
  const [insertPosition, setInsertPosition] = useState("0")

  useEffect(() => {
    setSwapTag(node.isHostElement ? node.tag : "div")
  }, [node.isHostElement, node.tag])

  const normalizedWrapTag = wrapTag.trim()
  const normalizedSwapTag = swapTag.trim()
  const normalizedChildSource = childSource.trim()
  const normalizedInsertPosition = Number.parseInt(insertPosition, 10)

  return (
    <div>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Structure
      </div>
      <div className="space-y-2 rounded-md border border-default bg-white p-2">
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={wrapTag}
            onChange={(event) => setWrapTag(event.target.value)}
            disabled={disabled}
            placeholder={sourceKind === "html" ? "section" : "Wrapper"}
            className="min-w-0 flex-1 rounded border border-default bg-white px-2 py-1 font-mono text-[11px] text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
          />
          <button
            type="button"
            onClick={() => onApplyMutations([{ type: "wrapSelection", wrapperTag: normalizedWrapTag }])}
            disabled={disabled || !normalizedWrapTag}
            className="rounded border border-default bg-white px-2 py-1 text-[11px] font-medium text-foreground hover:bg-surface-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Wrap
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={swapTag}
            onChange={(event) => setSwapTag(event.target.value)}
            disabled={disabled}
            placeholder={sourceKind === "html" ? "span" : "Button"}
            className="min-w-0 flex-1 rounded border border-default bg-white px-2 py-1 font-mono text-[11px] text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
          />
          <button
            type="button"
            onClick={() => onApplyMutations([{ type: "swapTag", newTag: normalizedSwapTag }])}
            disabled={disabled || !normalizedSwapTag}
            className="rounded border border-default bg-white px-2 py-1 text-[11px] font-medium text-foreground hover:bg-surface-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Swap tag
          </button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onApplyMutations([{ type: "reorderSibling", direction: "up" }])}
              disabled={disabled}
              className="rounded border border-default bg-white px-2 py-1 text-[11px] font-medium text-foreground hover:bg-surface-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Move up
            </button>
            <button
              type="button"
              onClick={() => onApplyMutations([{ type: "reorderSibling", direction: "down" }])}
              disabled={disabled}
              className="rounded border border-default bg-white px-2 py-1 text-[11px] font-medium text-foreground hover:bg-surface-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Move down
            </button>
          </div>
        </div>
        <div className="space-y-1.5">
          <textarea
            value={childSource}
            onChange={(event) => setChildSource(event.target.value)}
            disabled={disabled}
            rows={3}
            spellCheck={false}
            className="w-full resize-y rounded border border-default bg-white px-2 py-1 font-mono text-[11px] text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
          />
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              value={insertPosition}
              onChange={(event) => setInsertPosition(event.target.value)}
              disabled={disabled}
              min={0}
              className="w-16 rounded border border-default bg-white px-2 py-1 font-mono text-[11px] text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
            />
            <button
              type="button"
              onClick={() =>
                onApplyMutations([
                  {
                    type: "insertChild",
                    position: Number.isFinite(normalizedInsertPosition) ? normalizedInsertPosition : 0,
                    childSource: normalizedChildSource,
                  },
                ])
              }
              disabled={disabled || !normalizedChildSource}
              className="rounded border border-default bg-white px-2 py-1 text-[11px] font-medium text-foreground hover:bg-surface-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Insert child
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onApplyMutations([{ type: "unwrap" }])}
            disabled={disabled}
            className="rounded border border-default bg-white px-2 py-1 text-[11px] font-medium text-foreground hover:bg-surface-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Unwrap
          </button>
          <button
            type="button"
            onClick={() => onApplyMutations([{ type: "removeNode" }])}
            disabled={disabled}
            className="rounded border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Delete node
          </button>
        </div>
      </div>
    </div>
  )
}

function AttributeRow({
  attr,
  sourceKind,
  disabled,
  onApplyMutations,
}: {
  attr: AstAttributeInfo
  sourceKind: "tsx" | "html"
  disabled: boolean
  onApplyMutations: (mutations: Array<CanvasAstMutation | CanvasHtmlMutation>) => void
}) {
  const [draft, setDraft] = useState(attr.value)
  useEffect(() => {
    setDraft(attr.value)
  }, [attr.value])
  const dirty = draft !== attr.value
  const canEdit = attr.editableInV1 && attr.kind !== "spread"
  const apply = () => {
    if (!dirty || !canEdit) return
    if (sourceKind === "html") {
      onApplyMutations([{ type: "setAttribute", attrName: attr.name, value: draft }])
      return
    }
    if (attr.name === "className" && attr.kind === "literal-string") {
      onApplyMutations([{ type: "setClassName", value: draft }])
      return
    }
    const valueKind =
      attr.kind === "literal-number"
        ? "number"
        : attr.kind === "literal-boolean" || attr.kind === "shorthand"
          ? "boolean"
          : "string"
    const value =
      valueKind === "number"
        ? Number(draft)
        : valueKind === "boolean"
          ? draft === "true"
          : draft
    onApplyMutations([
      {
        type: "setPropValue",
        propName: attr.name,
        value,
        valueKind,
      },
    ])
  }

  return (
    <li className="rounded-md border border-default bg-white px-2 py-1.5 text-[11px]">
      <div className="flex items-center justify-between gap-2">
        <code className="font-mono text-foreground">{attr.name}</code>
        <span className="rounded bg-surface-100 px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {attr.kind}
        </span>
      </div>
      {canEdit ? (
        <div className="mt-1.5 flex items-center gap-1.5">
          {attr.kind === "literal-boolean" || attr.kind === "shorthand" ? (
            <select
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              disabled={disabled}
              className="min-w-0 flex-1 rounded border border-default bg-white px-2 py-1 text-[11px] text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          ) : (
            <input
              type={attr.kind === "literal-number" ? "number" : "text"}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              disabled={disabled}
              className="min-w-0 flex-1 rounded border border-default bg-white px-2 py-1 font-mono text-[11px] text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
            />
          )}
          <button
            type="button"
            onClick={apply}
            disabled={disabled || !dirty}
            className="rounded border border-default bg-white px-2 py-1 text-[11px] font-medium text-foreground hover:bg-surface-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      ) : (
        <div className="mt-1 break-words font-mono text-[10px] text-muted-foreground">
          {attr.kind === "literal-string" ? `"${attr.value}"` : attr.value}
        </div>
      )}
      {!canEdit && attr.reasonNotEditable && (
        <div className="mt-1 text-[10px] italic text-amber-700">
          {attr.reasonNotEditable}
        </div>
      )}
    </li>
  )
}

function TextChildEditor({
  value,
  disabled,
  onApplyMutations,
}: {
  value: string
  disabled: boolean
  onApplyMutations: (mutations: Array<CanvasAstMutation | CanvasHtmlMutation>) => void
}) {
  const [draft, setDraft] = useState(value)
  useEffect(() => {
    setDraft(value)
  }, [value])
  const dirty = draft !== value
  return (
    <div>
      <textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        disabled={disabled}
        rows={3}
        spellCheck={false}
        className="w-full resize-y rounded-md border border-default bg-white px-2 py-1 font-mono text-[11px] text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
      />
      <div className="mt-1 flex justify-end">
        <button
          type="button"
          onClick={() => onApplyMutations([{ type: "setTextChild", value: draft }])}
          disabled={disabled || !dirty}
          className="rounded border border-default bg-white px-2 py-1 text-[11px] font-medium text-foreground hover:bg-surface-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Apply text
        </button>
      </div>
    </div>
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
