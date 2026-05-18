import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Check,
  ExternalLink,
  FolderUp,
  Loader2,
  RefreshCw,
  Trash2,
  Upload,
  UploadCloud,
  X,
} from "lucide-react"
import { CanvasViewportPresets } from "./CanvasViewportPresets"
import {
  listCanvasHtmlSlots,
  readCanvasHtmlNode,
  writeCanvasHtmlNode,
  type CanvasHtmlSlotInfo,
} from "../../utils/canvasHtmlEditor"
import {
  buildPrimitiveChildSource,
  type CanvasRegistryPrimitive,
} from "../../utils/canvasRegistry"
import {
  buildSlotNativePartInsertion,
  listSlotNativePartOptions,
  type CanvasNativePartKind,
} from "../../utils/canvasNativeParts"

interface CanvasHtmlPropsPanelProps {
  src?: string
  title?: string
  sandbox?: string
  background?: string
  sourceMode?: "bundle" | "inline" | "react" | "url"
  sourceHtml?: string
  sourceReact?: string
  sourceCss?: string
  entryAsset?: string
  sourcePath?: string
  sourceImportedAt?: string
  sourceHtmlFilePath?: string
  sourceHtmlFileMtime?: number
  sourceReactFilePath?: string
  sourceReactFileMtime?: number
  /** Create-then-rebind reconcile keys (U3). Set at file-backed-on-create. */
  sourceComponentSlug?: string
  sourceComponentFilePath?: string
  size?: { width: number; height: number }
  /** Project whose registry primitives populate the per-slot component picker. */
  projectId?: string
  /**
   * Sync action (wired in U6). Resolves on success, rejects on failure with an
   * error whose `class` (when present) selects the inline copy template. For
   * U3 this is `undefined` — the button is inert but the state machine still
   * renders and transitions are exercised by tests through it.
   */
  onSync?: () => Promise<void>
  /**
   * Whether this item has been synced at least once. Drives the steady label
   * (`Sync` vs `Re-sync`). U6 persists/derives this; U3 passes `false`.
   */
  syncedBefore?: boolean
  onChange: (updates: {
    src?: string
    title?: string
    sandbox?: string
    background?: string
    sourceMode?: "bundle" | "inline" | "react" | "url"
    sourceHtml?: string
    sourceReact?: string
    sourceCss?: string
    sourcePath?: string
    sourceHtmlFilePath?: string
    sourceHtmlFileMtime?: number
    sourceReactFilePath?: string
    sourceReactFileMtime?: number
  }) => void
  onResize?: (width: number) => void
  onReplaceBundle?: (input: {
    files?: File[]
    fileEntries?: Array<{ file: File; relativePath: string }>
  }) => Promise<void>
  onReplaceBundleFromDirectory?: (input: { directoryPath: string; entryFile?: string }) => Promise<void>
  onDelete: () => void
  onClose: () => void
}

interface SlotEditDraft {
  name: string
  kind: string
  accepts: string
}

const supportsDirectoryPicker = typeof window !== "undefined" && "showDirectoryPicker" in window

function titleCaseSlotName(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function buildSlotStarter(slot: CanvasHtmlSlotInfo) {
  const label = titleCaseSlotName(slot.name)
  const accepts = slot.accepts?.split(",").map((entry) => entry.trim()) ?? []
  if (slot.kind === "text") {
    if (["h1", "h2", "h3", "h4", "h5", "h6"].includes(slot.tag)) {
      return { type: "setTextContent" as const, value: label }
    }
    return { type: "setTextContent" as const, value: `${label} text` }
  }
  if (accepts.includes("image") || accepts.includes("svg") || accepts.includes("video")) {
    return {
      type: "insertChild" as const,
      position: slot.childElementCount,
      childSource: `<svg viewBox="0 0 160 100" fill="none" aria-label="${label}"><rect x="1" y="1" width="158" height="98" rx="16" stroke="currentColor" stroke-dasharray="6 6"/><path d="M34 68L62 44L82 58L112 28L126 68" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="56" cy="34" r="8" fill="currentColor"/></svg>`,
    }
  }
  return {
    type: "insertChild" as const,
    position: slot.childElementCount,
    childSource: `<div><p>${label} content</p></div>`,
  }
}

function partUsesSourceUrl(part: CanvasNativePartKind | "") {
  return part === "image" || part === "video" || part === "link"
}

function matchingUrlBackedTag(part: CanvasNativePartKind) {
  if (part === "image") return "img"
  if (part === "video") return "video"
  if (part === "link") return "a"
  return null
}

/**
 * Insert a chosen library component into a slot. Same `insertChild` shape as
 * `buildSlotStarter`'s element branch (position = current child count, i.e.
 * appended into the slot), but the body is the registry primitive's own
 * snippet via the shared `buildPrimitiveChildSource`. Pure so it can be unit
 * tested without the panel/DOM. No import is emitted — identical constraint
 * to the property panel's manual insertChild (documented in the spec).
 */
export function buildSlotComponentInsertion(
  slot: CanvasHtmlSlotInfo,
  primitive: CanvasRegistryPrimitive
) {
  return {
    type: "insertChild" as const,
    position: slot.childElementCount,
    childSource: buildPrimitiveChildSource(primitive),
  }
}

/**
 * Sync error classes (U3). The action handler (wired in U6) rejects with an
 * `Error` whose optional `class` selects the inline copy template. Unknown /
 * absent class → the generic template (the raw message is still surfaced).
 */
export type SyncErrorClass =
  | "permission"
  | "stale-source"
  | "normalization"
  | "non-file-backed-child"

export interface SyncError extends Error {
  /** One of the documented `SyncErrorClass` values, when known. */
  class?: SyncErrorClass
  /** For `non-file-backed-child`: the offending child labels/slugs. */
  offendingChildren?: string[]
}

/**
 * Templated, human copy per error class. The raw `message` is appended so the
 * server detail is never lost. `non-file-backed-child` lists the offenders.
 */
export function syncErrorCopy(error: SyncError): string {
  const detail = error.message?.trim()
  switch (error.class) {
    case "permission":
      return `Can't write to the sync folder — check folder permissions.${
        detail ? ` (${detail})` : ""
      }`
    case "stale-source":
      return `The source changed since this was loaded — reopen or reload before syncing.${
        detail ? ` (${detail})` : ""
      }`
    case "normalization":
      return `Couldn't normalize the source for export — the HTML/TSX output failed.${
        detail ? ` (${detail})` : ""
      }`
    case "non-file-backed-child": {
      const children = error.offendingChildren?.length
        ? ` Offending children: ${error.offendingChildren.join(", ")}.`
        : ""
      return `This artboard has children that aren't file-backed yet — sync each child first.${children}`
    }
    default:
      return detail || "Sync failed."
  }
}

type SyncPhase = "idle" | "syncing" | "synced" | "failed"

const SYNCED_TRANSIENT_MS = 2000
const FAILED_TRANSIENT_MS = 2500

interface SyncButtonProps {
  /** Steady label is `Re-sync` once a successful sync has happened. */
  syncedBefore: boolean
  /** Injected sync action (wired in U6). Undefined → inert no-op button. */
  onSync?: () => Promise<void>
}

/**
 * The Sync button + its state machine (presentational; U3).
 *
 * States:
 *  - `idle`     → label `Sync` (or `Re-sync` if synced before / after success)
 *  - `syncing`  → label `Syncing…`, disabled, spinner
 *  - `synced`   → transient `Synced ✓` (~2s), then settles to `Re-sync`
 *  - `failed`   → transient `Sync failed` (then reverts to the prior steady
 *                 label), inline templated error below the button
 *
 * The button is disabled while `syncing` (defense-in-depth in-flight lock; the
 * server lock added in U5 is the authority). With no `onSync` the click is a
 * no-op so the steady state never changes — exactly the U3 inert contract.
 */
function SyncButton({ syncedBefore, onSync }: SyncButtonProps) {
  const [phase, setPhase] = useState<SyncPhase>("idle")
  const [hasSucceeded, setHasSucceeded] = useState(false)
  const [error, setError] = useState<SyncError | null>(null)
  const transientRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (transientRef.current) clearTimeout(transientRef.current)
    }
  }, [])

  const settledSyncedBefore = syncedBefore || hasSucceeded

  const handleClick = useCallback(async () => {
    if (phase === "syncing" || !onSync) return
    if (transientRef.current) {
      clearTimeout(transientRef.current)
      transientRef.current = null
    }
    setError(null)
    setPhase("syncing")
    try {
      await onSync()
      setHasSucceeded(true)
      setPhase("synced")
      transientRef.current = setTimeout(() => {
        setPhase("idle")
      }, SYNCED_TRANSIENT_MS)
    } catch (caught) {
      const syncError = (caught instanceof Error ? caught : new Error("Sync failed.")) as SyncError
      setError(syncError)
      setPhase("failed")
      transientRef.current = setTimeout(() => {
        setPhase("idle")
      }, FAILED_TRANSIENT_MS)
    }
  }, [onSync, phase])

  const steadyLabel = settledSyncedBefore ? "Re-sync" : "Sync"
  const label =
    phase === "syncing"
      ? "Syncing…"
      : phase === "synced"
        ? "Synced ✓"
        : phase === "failed"
          ? "Sync failed"
          : steadyLabel

  return (
    <div>
      <button
        type="button"
        aria-label="Sync component"
        data-sync-phase={phase}
        onClick={() => void handleClick()}
        disabled={phase === "syncing"}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-brand-300 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {phase === "syncing" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : phase === "synced" ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <UploadCloud className="h-3.5 w-3.5" />
        )}
        {label}
      </button>
      {phase === "failed" && error ? (
        <p role="alert" className="mt-1.5 text-[11px] leading-snug text-red-700">
          {syncErrorCopy(error)}
        </p>
      ) : null}
    </div>
  )
}

export function CanvasHtmlPropsPanel({
  src,
  title,
  sandbox,
  background,
  sourceMode,
  sourceHtml,
  sourceReact,
  sourceCss,
  entryAsset,
  sourcePath,
  sourceImportedAt,
  sourceHtmlFilePath,
  sourceHtmlFileMtime,
  sourceReactFilePath,
  sourceReactFileMtime,
  sourceComponentSlug,
  sourceComponentFilePath,
  size,
  projectId = "design-system-foundation",
  onChange,
  onResize,
  onReplaceBundle,
  onReplaceBundleFromDirectory,
  onDelete,
  onClose,
  onSync,
  syncedBefore = false,
}: CanvasHtmlPropsPanelProps) {
  const importedAtLabel = sourceImportedAt ? new Date(sourceImportedAt).toLocaleString() : null
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isReplacing, setIsReplacing] = useState(false)
  const [replaceError, setReplaceError] = useState<string | null>(null)
  const [draftSourceHtml, setDraftSourceHtml] = useState(sourceHtml || "")
  const [draftSourceReact, setDraftSourceReact] = useState(sourceReact || "")
  const [draftSourceCss, setDraftSourceCss] = useState(sourceCss || "")
  const [draftSourceReactFilePath, setDraftSourceReactFilePath] = useState(sourceReactFilePath || "")
  const [loadStatus, setLoadStatus] = useState<"idle" | "loading" | "error">("idle")
  const [loadError, setLoadError] = useState<string | null>(null)
  const sourceIdentity = sourcePath || sourceReactFilePath || "inline-html-panel"
  const detectedSlots = useMemo(
    () =>
      sourceMode === "inline"
        ? listCanvasHtmlSlots(draftSourceHtml || "", { sourceId: sourceIdentity })
        : [],
    [draftSourceHtml, sourceIdentity, sourceMode]
  )
  const [registryPrimitives, setRegistryPrimitives] = useState<CanvasRegistryPrimitive[]>([])
  // slot.name → chosen primitive id, so each slot's picker is independent.
  const [slotPick, setSlotPick] = useState<Record<string, string>>({})
  const [slotPartPick, setSlotPartPick] = useState<Record<string, CanvasNativePartKind | "">>({})
  const [slotPartSource, setSlotPartSource] = useState<Record<string, string>>({})
  const [slotEdits, setSlotEdits] = useState<Record<string, SlotEditDraft>>({})
  const hasSlots = detectedSlots.length > 0
  const isFileBacked = Boolean(
    sourceHtmlFilePath || sourceComponentSlug || sourceComponentFilePath
  )

  useEffect(() => {
    setSlotEdits((current) => {
      const next: Record<string, SlotEditDraft> = {}
      for (const slot of detectedSlots) {
        next[slot.canvasId] = current[slot.canvasId] ?? {
          name: slot.name,
          kind: slot.kind || "",
          accepts: slot.accepts || "",
        }
      }
      return next
    })
  }, [detectedSlots])

  // Load the project's registry once a slotted inline shell is open, so each
  // slot can offer "insert a library component" alongside "insert starter".
  useEffect(() => {
    if (sourceMode !== "inline" || !hasSlots || registryPrimitives.length > 0) return
    const controller = new AbortController()
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
        }
        if (response.ok && payload.ok && Array.isArray(payload.primitives)) {
          setRegistryPrimitives(payload.primitives)
        }
      })
      .catch(() => {
        /* registry unavailable — slots still offer "insert starter" */
      })
    return () => controller.abort()
  }, [hasSlots, projectId, registryPrimitives.length, sourceMode])

  useEffect(() => {
    setDraftSourceReactFilePath(sourceReactFilePath || "")
  }, [sourceReactFilePath])

  useEffect(() => {
    setDraftSourceHtml(sourceHtml || "")
  }, [sourceHtml])

  useEffect(() => {
    setDraftSourceReact(sourceReact || "")
  }, [sourceReact])

  useEffect(() => {
    setDraftSourceCss(sourceCss || "")
  }, [sourceCss])

  const handlePickFiles = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleLoadFromFile = useCallback(async () => {
    const filePath = draftSourceReactFilePath.trim()
    if (!filePath) {
      setLoadStatus("error")
      setLoadError("Enter a workspace-relative path to a .tsx or .jsx file.")
      return
    }
    setLoadStatus("loading")
    setLoadError(null)
    try {
      const response = await fetch("/api/canvas/ast/load", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath }),
      })
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean
        sourceReact?: string
        mtimeMs?: number
        filePath?: string
        error?: string
      }
      if (!response.ok || !payload.ok || typeof payload.sourceReact !== "string") {
        throw new Error(payload.error || "Failed to load file.")
      }
      setDraftSourceReact(payload.sourceReact)
      onChange({
        sourceMode: "react",
        sourceReact: payload.sourceReact,
        sourceReactFilePath: payload.filePath,
        sourceReactFileMtime: payload.mtimeMs,
      })
      setLoadStatus("idle")
    } catch (error) {
      setLoadStatus("error")
      setLoadError(error instanceof Error ? error.message : "Failed to load file.")
    }
  }, [draftSourceReactFilePath, onChange])

  const handleFilesSelected = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const input = event.target
      const files = Array.from(input.files || [])
      input.value = ""
      if (files.length === 0 || !onReplaceBundle) return

      const fileEntries = files.map((file) => ({
        file,
        relativePath: file.webkitRelativePath?.trim() || file.name,
      }))

      setIsReplacing(true)
      setReplaceError(null)
      try {
        await onReplaceBundle({ fileEntries })
      } catch (error) {
        setReplaceError(error instanceof Error ? error.message : "Failed to replace bundle.")
      } finally {
        setIsReplacing(false)
      }
    },
    [onReplaceBundle]
  )

  const handlePickDirectory = useCallback(async () => {
    if (!supportsDirectoryPicker || !onReplaceBundleFromDirectory) return

    try {
      const dirHandle = await (window as any).showDirectoryPicker({ mode: "read" })
      const dirPath = dirHandle.name
      setIsReplacing(true)
      setReplaceError(null)
      await onReplaceBundleFromDirectory({ directoryPath: dirPath })
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return
      setReplaceError(error instanceof Error ? error.message : "Failed to replace bundle.")
    } finally {
      setIsReplacing(false)
    }
  }, [onReplaceBundleFromDirectory])

  const handleInsertSlotStarter = useCallback(
    (slot: CanvasHtmlSlotInfo) => {
      if (sourceMode !== "inline") return
      const result = writeCanvasHtmlNode(
        draftSourceHtml || "",
        slot.canvasId,
        [buildSlotStarter(slot)],
        { sourceId: sourceIdentity }
      )
      if (!result.ok) {
        setReplaceError(result.error)
        return
      }
      setReplaceError(null)
      setDraftSourceHtml(result.source)
      onChange({
        sourceMode: "inline",
        sourceHtml: result.source,
      })
    },
    [draftSourceHtml, onChange, sourceIdentity, sourceMode]
  )

  const handleInsertSlotComponent = useCallback(
    (slot: CanvasHtmlSlotInfo, primitive: CanvasRegistryPrimitive) => {
      if (sourceMode !== "inline") return
      const result = writeCanvasHtmlNode(
        draftSourceHtml || "",
        slot.canvasId,
        [buildSlotComponentInsertion(slot, primitive)],
        { sourceId: sourceIdentity }
      )
      if (!result.ok) {
        setReplaceError(result.error)
        return
      }
      setReplaceError(null)
      setDraftSourceHtml(result.source)
      onChange({ sourceMode: "inline", sourceHtml: result.source })
    },
    [draftSourceHtml, onChange, sourceIdentity, sourceMode]
  )

  const handleInsertSlotPart = useCallback(
    (slot: CanvasHtmlSlotInfo, part: CanvasNativePartKind) => {
      if (sourceMode !== "inline") return
      const sourceUrl = slotPartSource[slot.name]
      const matchedTag = matchingUrlBackedTag(part)
      const firstChildCanvasId = `${slot.canvasId}.0`
      const firstChild =
        slot.childElementCount > 0
          ? readCanvasHtmlNode(draftSourceHtml || "", firstChildCanvasId, {
              sourceId: sourceIdentity,
            })
          : null

      const result =
        matchedTag &&
        sourceUrl &&
        firstChild &&
        !("error" in firstChild) &&
        firstChild.tag === matchedTag
          ? writeCanvasHtmlNode(
              draftSourceHtml || "",
              firstChildCanvasId,
              [
                {
                  type: "setAttribute",
                  attrName: part === "link" ? "href" : "src",
                  value: sourceUrl,
                },
              ],
              { sourceId: sourceIdentity }
            )
          : writeCanvasHtmlNode(
              draftSourceHtml || "",
              slot.canvasId,
              [buildSlotNativePartInsertion(slot, part, { sourceUrl })],
              { sourceId: sourceIdentity }
            )
      if (!result.ok) {
        setReplaceError(result.error)
        return
      }
      setReplaceError(null)
      setDraftSourceHtml(result.source)
      onChange({ sourceMode: "inline", sourceHtml: result.source })
    },
    [draftSourceHtml, onChange, sourceIdentity, sourceMode, slotPartSource]
  )

  const handleApplySlotMetadata = useCallback(
    (slot: CanvasHtmlSlotInfo) => {
      if (sourceMode !== "inline") return
      const draft = slotEdits[slot.canvasId]
      if (!draft || !draft.name.trim()) return
      const result = writeCanvasHtmlNode(
        draftSourceHtml || "",
        slot.canvasId,
        [
          { type: "setAttribute", attrName: "data-slot", value: draft.name.trim() },
          {
            type: "setAttribute",
            attrName: "data-slot-kind",
            value: draft.kind.trim() || null,
          },
          {
            type: "setAttribute",
            attrName: "data-slot-accepts",
            value: draft.accepts.trim() || null,
          },
        ],
        { sourceId: sourceIdentity }
      )
      if (!result.ok) {
        setReplaceError(result.error)
        return
      }
      setReplaceError(null)
      setDraftSourceHtml(result.source)
      onChange({ sourceMode: "inline", sourceHtml: result.source })
    },
    [draftSourceHtml, onChange, slotEdits, sourceIdentity, sourceMode]
  )

  return (
    <div className="flex h-full w-80 flex-col border-l border-default bg-white">
      <div className="flex items-center justify-between border-b border-default px-4 py-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-foreground">HTML bundle</h3>
          <p className="truncate text-xs text-muted-foreground">Local HTML/CSS/JS node</p>
        </div>
        <div className="ml-2 flex items-center gap-1">
          <button
            type="button"
            onClick={onDelete}
            className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600"
            aria-label="Delete HTML bundle"
            title="Delete HTML bundle"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-surface-100 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isFileBacked ? (
        <div className="border-b border-default bg-surface-50 px-4 py-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Sync to project
            </span>
          </div>
          <SyncButton syncedBefore={syncedBefore} onSync={onSync} />
          <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
            Publishes the normalized component into your picked project folder.
          </p>
        </div>
      ) : null}

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Title</label>
          <input
            type="text"
            value={title || ""}
            onChange={(event) => onChange({ title: event.target.value })}
            placeholder="HTML bundle"
            className="w-full rounded-md border border-default bg-white px-3 py-1.5 text-sm text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
          />
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Source URL</label>
          <input
            type="url"
            value={src || ""}
            onChange={(event) =>
              onChange({
                src: event.target.value,
                sourceMode: event.target.value.trim() ? "url" : sourceMode,
              })
            }
            className="w-full rounded-md border border-default bg-white px-3 py-1.5 text-sm text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
          />
          {src ? (
            <a
              href={src}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700"
            >
              Open bundled entry
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Sandbox</label>
          <input
            type="text"
            value={sandbox || ""}
            onChange={(event) => onChange({ sandbox: event.target.value })}
            placeholder="allow-scripts allow-same-origin allow-forms allow-modals"
            className="w-full rounded-md border border-default bg-white px-3 py-1.5 text-sm text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
          />
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Background</label>
          <input
            type="text"
            value={background || ""}
            onChange={(event) => onChange({ background: event.target.value })}
            placeholder="#ffffff or oklch(...)"
            className="w-full rounded-md border border-default bg-white px-3 py-1.5 text-sm text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
          />
        </div>

        {detectedSlots.length > 0 ? (
          <div>
            <div className="mb-2 text-[11px] font-medium text-muted-foreground">
              Detected slots
            </div>
            <div className="grid gap-2">
              {detectedSlots.map((slot) => {
                const nativePartOptions = listSlotNativePartOptions(slot)
                return (
                  <div key={slot.name} className="rounded-md border border-default bg-surface-50 px-3 py-2">
                  <div className="text-xs font-semibold text-foreground">{slot.name}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                    {slot.kind ? (
                      <span className="rounded-full border border-default bg-white px-2 py-0.5">
                        {slot.kind}
                      </span>
                    ) : null}
                    {slot.accepts ? (
                      <span className="rounded-full border border-default bg-white px-2 py-0.5">
                        accepts {slot.accepts}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => handleInsertSlotStarter(slot)}
                      className="rounded-full border border-default bg-white px-2 py-0.5 text-foreground hover:bg-surface-100"
                    >
                      Insert starter
                    </button>
                  </div>
                  <div className="mt-2 grid gap-1.5">
                    <input
                      type="text"
                      aria-label={`Slot name for ${slot.name}`}
                      value={slotEdits[slot.canvasId]?.name ?? slot.name}
                      onChange={(event) =>
                        setSlotEdits((current) => ({
                          ...current,
                          [slot.canvasId]: {
                            name: event.target.value,
                            kind: current[slot.canvasId]?.kind ?? slot.kind ?? "",
                            accepts: current[slot.canvasId]?.accepts ?? slot.accepts ?? "",
                          },
                        }))
                      }
                      placeholder="title"
                      className="w-full rounded-md border border-default bg-white px-2 py-1 text-[11px] text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
                    />
                    <div className="flex items-center gap-1.5">
                      <select
                        aria-label={`Slot kind for ${slot.name}`}
                        value={slotEdits[slot.canvasId]?.kind ?? slot.kind ?? ""}
                        onChange={(event) =>
                          setSlotEdits((current) => ({
                            ...current,
                            [slot.canvasId]: {
                              name: current[slot.canvasId]?.name ?? slot.name,
                              kind: event.target.value,
                              accepts: current[slot.canvasId]?.accepts ?? slot.accepts ?? "",
                            },
                          }))
                        }
                        className="min-w-0 flex-1 rounded-md border border-default bg-white px-2 py-1 text-[11px] text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
                      >
                        <option value="">Kind…</option>
                        <option value="text">text</option>
                        <option value="container">container</option>
                        <option value="image">image</option>
                        <option value="svg">svg</option>
                        <option value="video">video</option>
                      </select>
                      <button
                        type="button"
                        disabled={!slotEdits[slot.canvasId]?.name?.trim()}
                        onClick={() => handleApplySlotMetadata(slot)}
                        className="rounded-full border border-default bg-white px-2 py-1 text-[11px] font-medium text-foreground hover:bg-surface-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Apply slot
                      </button>
                    </div>
                    <input
                      type="text"
                      aria-label={`Slot accepts for ${slot.name}`}
                      value={slotEdits[slot.canvasId]?.accepts ?? slot.accepts ?? ""}
                      onChange={(event) =>
                        setSlotEdits((current) => ({
                          ...current,
                          [slot.canvasId]: {
                            name: current[slot.canvasId]?.name ?? slot.name,
                            kind: current[slot.canvasId]?.kind ?? slot.kind ?? "",
                            accepts: event.target.value,
                          },
                        }))
                      }
                      placeholder="image,svg,video"
                      className="w-full rounded-md border border-default bg-white px-2 py-1 text-[11px] text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
                    />
                  </div>
                  {nativePartOptions.length > 0 ? (
                    <div className="mt-2 grid gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <select
                          aria-label={`HTML part for ${slot.name}`}
                          value={slotPartPick[slot.name] ?? ""}
                          onChange={(event) =>
                            setSlotPartPick((current) => ({
                              ...current,
                              [slot.name]: event.target.value as CanvasNativePartKind | "",
                            }))
                          }
                          className="min-w-0 flex-1 rounded-md border border-default bg-white px-2 py-1 text-[11px] text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
                        >
                          <option value="">HTML part…</option>
                          {nativePartOptions.map((option) => (
                            <option key={option.kind} value={option.kind}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={!slotPartPick[slot.name]}
                          onClick={() => {
                            const part = slotPartPick[slot.name]
                            if (part) handleInsertSlotPart(slot, part)
                          }}
                          className="rounded-full border border-brand-300 bg-brand-50 px-2 py-1 text-[11px] font-medium text-brand-700 hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Insert part
                        </button>
                      </div>
                      {partUsesSourceUrl(slotPartPick[slot.name] ?? "") ? (
                        <input
                          type="url"
                          aria-label={`Source URL for ${slot.name}`}
                          value={slotPartSource[slot.name] ?? ""}
                          onChange={(event) =>
                            setSlotPartSource((current) => ({
                              ...current,
                              [slot.name]: event.target.value,
                            }))
                          }
                          placeholder={
                            slotPartPick[slot.name] === "link"
                              ? "https://example.com/page"
                              : slotPartPick[slot.name] === "video"
                                ? "https://cdn.example.com/clip.mp4"
                                : "https://images.example.com/photo.jpg"
                          }
                          className="w-full rounded-md border border-default bg-white px-2 py-1 text-[11px] text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
                        />
                      ) : null}
                    </div>
                  ) : null}
                  {registryPrimitives.length > 0 ? (
                    <div className="mt-2 flex items-center gap-1.5">
                      <select
                        aria-label={`Library component for ${slot.name}`}
                        value={slotPick[slot.name] ?? ""}
                        onChange={(event) =>
                          setSlotPick((current) => ({
                            ...current,
                            [slot.name]: event.target.value,
                          }))
                        }
                        className="min-w-0 flex-1 rounded-md border border-default bg-white px-2 py-1 text-[11px] text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
                      >
                        <option value="">Library component…</option>
                        {registryPrimitives.map((primitive) => (
                          <option key={primitive.id} value={primitive.id}>
                            {primitive.displayName}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={!slotPick[slot.name]}
                        onClick={() => {
                          const primitive = registryPrimitives.find(
                            (entry) => entry.id === slotPick[slot.name]
                          )
                          if (primitive) handleInsertSlotComponent(slot, primitive)
                        }}
                        className="rounded-full border border-brand-300 bg-brand-50 px-2 py-1 text-[11px] font-medium text-brand-700 hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Apply
                      </button>
                    </div>
                  ) : null}
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}

        <div>
          <div className="mb-1 flex items-center justify-between gap-2">
            <label className="block text-[11px] font-medium text-muted-foreground">
              Inline HTML
            </label>
            <button
              type="button"
              onClick={() =>
                onChange({
                  sourceMode: "inline",
                  sourceHtml: draftSourceHtml,
                })
              }
              className="rounded border border-default bg-white px-2 py-1 text-[11px] font-medium text-foreground hover:bg-surface-50"
            >
              Apply
            </button>
          </div>
          <textarea
            value={draftSourceHtml}
            onChange={(event) => setDraftSourceHtml(event.target.value)}
            rows={12}
            spellCheck={false}
            placeholder="<!doctype html><html><head><style>...</style></head><body>...</body></html>"
            className="w-full resize-y rounded-md border border-default bg-surface-50 px-3 py-2 font-mono text-xs text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
          />
          {sourceHtmlFilePath ? (
            <p className="mt-1 truncate text-[10px] text-muted-foreground" title={sourceHtmlFilePath}>
              Saving will write to <span className="font-mono">{sourceHtmlFilePath}</span>
              {typeof sourceHtmlFileMtime === "number"
                ? ` (mtime ${new Date(sourceHtmlFileMtime).toLocaleTimeString()})`
                : ""}
            </p>
          ) : (
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
              Applying inline HTML renders this node from stored source instead of a bundled URL.
            </p>
          )}
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between gap-2">
            <label className="block text-[11px] font-medium text-muted-foreground">
              React TSX
            </label>
            <button
              type="button"
              onClick={() =>
                onChange({
                  sourceMode: "react",
                  sourceReact: draftSourceReact,
                  sourceCss: draftSourceCss,
                })
              }
              className="rounded border border-default bg-white px-2 py-1 text-[11px] font-medium text-foreground hover:bg-surface-50"
            >
              Apply
            </button>
          </div>
          <div className="mb-2 rounded-md border border-default bg-surface-50 px-2 py-1.5">
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Source-of-truth file
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={draftSourceReactFilePath}
                onChange={(event) => setDraftSourceReactFilePath(event.target.value)}
                placeholder="projects/design-system-foundation/components/ui/Button.tsx"
                spellCheck={false}
                className="min-w-0 flex-1 rounded border border-default bg-white px-2 py-1 font-mono text-[11px] text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
              />
              <button
                type="button"
                onClick={handleLoadFromFile}
                disabled={loadStatus === "loading"}
                className="rounded border border-default bg-white px-2 py-1 text-[11px] font-medium text-foreground hover:bg-surface-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadStatus === "loading" ? "Loading…" : "Load"}
              </button>
              {sourceReactFilePath ? (
                <button
                  type="button"
                  onClick={() => {
                    setDraftSourceReactFilePath("")
                    onChange({
                      sourceReactFilePath: undefined,
                      sourceReactFileMtime: undefined,
                    })
                  }}
                  className="rounded border border-default bg-white px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-surface-50"
                  title="Detach from file"
                >
                  Detach
                </button>
              ) : null}
            </div>
            {loadError ? (
              <p className="mt-1 text-[11px] text-red-700">{loadError}</p>
            ) : sourceReactFilePath ? (
              <p className="mt-1 truncate text-[10px] text-muted-foreground" title={sourceReactFilePath}>
                Saving will write to <span className="font-mono">{sourceReactFilePath}</span>
                {typeof sourceReactFileMtime === "number"
                  ? ` (mtime ${new Date(sourceReactFileMtime).toLocaleTimeString()})`
                  : ""}
              </p>
            ) : (
              <p className="mt-1 text-[10px] text-muted-foreground">
                Optional. When set, panel edits write back to disk via the AST writer.
              </p>
            )}
          </div>
          <textarea
            value={draftSourceReact}
            onChange={(event) => setDraftSourceReact(event.target.value)}
            rows={12}
            spellCheck={false}
            placeholder="export default function Preview() { return <main>Hello</main> }"
            className="w-full resize-y rounded-md border border-default bg-surface-50 px-3 py-2 font-mono text-xs text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
          />
          <label className="mb-1 mt-2 block text-[11px] font-medium text-muted-foreground">
            CSS
          </label>
          <textarea
            value={draftSourceCss}
            onChange={(event) => setDraftSourceCss(event.target.value)}
            rows={5}
            spellCheck={false}
            placeholder=".card { padding: 24px; }"
            className="w-full resize-y rounded-md border border-default bg-surface-50 px-3 py-2 font-mono text-xs text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
          />
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            React TSX must default-export a component. The local dev server bundles React into the iframe preview.
          </p>
        </div>

        {onResize ? (
          <CanvasViewportPresets size={size} onResize={onResize} />
        ) : null}

        <div className="rounded-md border border-default bg-surface-50 px-3 py-3 text-xs text-muted-foreground">
          <div>
            <span className="font-semibold text-foreground">Entry asset:</span>{" "}
            {entryAsset || "Not tracked"}
          </div>
          {sourcePath ? (
            <div className="mt-2">
              <span className="font-semibold text-foreground">Imported from:</span> {sourcePath}
            </div>
          ) : null}
          {importedAtLabel ? (
            <div className="mt-2">
              <span className="font-semibold text-foreground">Imported at:</span> {importedAtLabel}
            </div>
          ) : null}
        </div>

        {onReplaceBundle ? (
          <div>
            <label className="mb-2 block text-[11px] font-medium text-muted-foreground">
              Replace bundle
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handlePickFiles}
                disabled={isReplacing}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-default bg-white px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-50 disabled:opacity-50"
              >
                <Upload className="h-3.5 w-3.5" />
                {isReplacing ? "Replacing\u2026" : "Upload files"}
              </button>
              {supportsDirectoryPicker && onReplaceBundleFromDirectory ? (
                <button
                  type="button"
                  onClick={handlePickDirectory}
                  disabled={isReplacing}
                  className="inline-flex items-center justify-center gap-1.5 rounded-md border border-default bg-white px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-50 disabled:opacity-50"
                  title="Pick folder"
                >
                  <FolderUp className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFilesSelected}
              className="sr-only"
            />
            {sourcePath && onReplaceBundleFromDirectory ? (
              <button
                type="button"
                onClick={() => {
                  setIsReplacing(true)
                  setReplaceError(null)
                  onReplaceBundleFromDirectory({ directoryPath: sourcePath })
                    .catch((error) => {
                      setReplaceError(
                        error instanceof Error ? error.message : "Failed to re-import."
                      )
                    })
                    .finally(() => setIsReplacing(false))
                }}
                disabled={isReplacing}
                className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-default bg-white px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-surface-50 hover:text-foreground disabled:opacity-50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Re-import from source
              </button>
            ) : null}
            {replaceError ? (
              <p className="mt-2 text-xs text-red-600">{replaceError}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
