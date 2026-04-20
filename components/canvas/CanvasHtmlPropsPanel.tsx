import { useCallback, useRef, useState } from "react"
import { ExternalLink, FolderUp, RefreshCw, Trash2, Upload, X } from "lucide-react"
import { CanvasViewportPresets } from "./CanvasViewportPresets"

interface CanvasHtmlPropsPanelProps {
  src: string
  title?: string
  sandbox?: string
  background?: string
  entryAsset?: string
  sourcePath?: string
  sourceImportedAt?: string
  size?: { width: number; height: number }
  onChange: (updates: {
    src?: string
    title?: string
    sandbox?: string
    background?: string
  }) => void
  onResize?: (size: { width: number; height: number }) => void
  onReplaceBundle?: (input: {
    files?: File[]
    fileEntries?: Array<{ file: File; relativePath: string }>
  }) => Promise<void>
  onReplaceBundleFromDirectory?: (input: { directoryPath: string; entryFile?: string }) => Promise<void>
  onDelete: () => void
  onClose: () => void
}

const supportsDirectoryPicker = typeof window !== "undefined" && "showDirectoryPicker" in window

export function CanvasHtmlPropsPanel({
  src,
  title,
  sandbox,
  background,
  entryAsset,
  sourcePath,
  sourceImportedAt,
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

  const handlePickFiles = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

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
            value={src}
            onChange={(event) => onChange({ src: event.target.value })}
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
