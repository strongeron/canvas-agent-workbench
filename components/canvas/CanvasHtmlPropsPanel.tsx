import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ExternalLink, FolderUp, RefreshCw, Trash2, Upload, X } from "lucide-react"
import { CanvasViewportPresets } from "./CanvasViewportPresets"

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
  sourceReactFilePath?: string
  sourceReactFileMtime?: number
  size?: { width: number; height: number }
  onChange: (updates: {
    src?: string
    title?: string
    sandbox?: string
    background?: string
    sourceMode?: "bundle" | "inline" | "react" | "url"
    sourceHtml?: string
    sourceReact?: string
    sourceCss?: string
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

const supportsDirectoryPicker = typeof window !== "undefined" && "showDirectoryPicker" in window

function extractSlotDefinitions(source: string) {
  const definitions = new Map<
    string,
    { name: string; kind?: string; accepts?: string }
  >()
  const pattern = /<[^>]*data-slot="([^"]+)"[^>]*>/g

  let match: RegExpExecArray | null
  while ((match = pattern.exec(source)) !== null) {
    const fragment = match[0]
    const name = match[1]?.trim()
    if (!name) continue
    const kind = fragment.match(/data-slot-kind="([^"]+)"/)?.[1]?.trim()
    const accepts = fragment.match(/data-slot-accepts="([^"]+)"/)?.[1]?.trim()
    if (!definitions.has(name)) {
      definitions.set(name, { name, kind, accepts })
    }
  }

  return Array.from(definitions.values())
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
  sourceReactFilePath,
  sourceReactFileMtime,
  size,
  onChange,
  onResize,
  onReplaceBundle,
  onReplaceBundleFromDirectory,
  onDelete,
  onClose,
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
  const detectedSlots = useMemo(
    () =>
      extractSlotDefinitions(
        sourceMode === "react" ? draftSourceReact || "" : draftSourceHtml || ""
      ),
    [draftSourceHtml, draftSourceReact, sourceMode]
  )

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
              {detectedSlots.map((slot) => (
                <div
                  key={slot.name}
                  className="rounded-md border border-default bg-surface-50 px-3 py-2"
                >
                  <div className="text-xs font-semibold text-foreground">{slot.name}</div>
                  <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
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
                  </div>
                </div>
              ))}
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
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            Applying inline HTML renders this node from stored source instead of a bundled URL.
          </p>
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
