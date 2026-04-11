import { AlertTriangle, Copy, Move, Plus, Save, X } from "lucide-react"
import { useEffect, useMemo, useRef, type ReactNode } from "react"

type CanvasFileActionMode = "create" | "save-as" | "rename" | "duplicate"

interface CanvasFileActionDialogProps {
  open: boolean
  mode: CanvasFileActionMode
  surfaceLabel?: string
  titleValue: string
  folderValue: string
  error?: string | null
  busy?: boolean
  onTitleChange: (value: string) => void
  onFolderChange: (value: string) => void
  onClose: () => void
  onSubmit: () => void | Promise<void>
}

interface CanvasFileDeleteDialogProps {
  open: boolean
  title: string
  path: string
  error?: string | null
  busy?: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
}

function slugifyCanvasLabel(input: string) {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return normalized || "canvas"
}

function useDialogEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        onClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClose, open])
}

function DialogShell({
  open,
  title,
  description,
  onClose,
  children,
}: {
  open: boolean
  title: string
  description: string
  onClose: () => void
  children: ReactNode
}) {
  useDialogEscape(open, onClose)

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/35 px-4 py-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-default bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-default px-5 py-4">
          <div>
            <div className="text-sm font-semibold text-foreground">{title}</div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
          </div>
          <button
            type="button"
            aria-label={`Close ${title}`}
            onClick={onClose}
            className="rounded-full border border-default bg-white p-2 text-muted-foreground hover:bg-surface-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function CanvasFileActionDialog({
  open,
  mode,
  surfaceLabel = "Canvas",
  titleValue,
  folderValue,
  error,
  busy = false,
  onTitleChange,
  onFolderChange,
  onClose,
  onSubmit,
}: CanvasFileActionDialogProps) {
  const titleInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!open) return
    window.setTimeout(() => {
      titleInputRef.current?.focus()
      titleInputRef.current?.select()
    }, 0)
  }, [open])

  const copy = useMemo(() => {
    switch (mode) {
      case "create":
        return {
          title: `Create ${surfaceLabel} file`,
          description: `Create a new local .canvas document for this ${surfaceLabel.toLowerCase()} workspace.`,
          submitLabel: "Create file",
          icon: <Plus className="h-4 w-4" />,
        }
      case "save-as":
        return {
          title: `Save ${surfaceLabel} as`,
          description: `Save the current ${surfaceLabel.toLowerCase()} state into a new local .canvas document.`,
          submitLabel: "Save file",
          icon: <Save className="h-4 w-4" />,
        }
      case "rename":
        return {
          title: "Rename or move file",
          description: "Update the canvas file title or move it into another folder without leaving the project canvases directory.",
          submitLabel: "Apply changes",
          icon: <Move className="h-4 w-4" />,
        }
      case "duplicate":
        return {
          title: "Duplicate file",
          description: "Create a new copy of this canvas file and keep its local assets under the new document path.",
          submitLabel: "Create duplicate",
          icon: <Copy className="h-4 w-4" />,
        }
    }
  }, [mode, surfaceLabel])

  const normalizedTitle = titleValue.trim() || "Untitled Canvas"
  const normalizedFolder = folderValue.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "")
  const relativePreviewPath = normalizedFolder
    ? `${normalizedFolder}/${slugifyCanvasLabel(normalizedTitle)}.canvas`
    : `${slugifyCanvasLabel(normalizedTitle)}.canvas`

  return (
    <DialogShell
      open={open}
      title={copy.title}
      description={copy.description}
      onClose={busy ? () => {} : onClose}
    >
      <form
        className="space-y-4 px-5 py-4"
        onSubmit={(event) => {
          event.preventDefault()
          if (!busy) {
            void onSubmit()
          }
        }}
      >
        <div>
          <label className="mb-1 block text-xs font-semibold text-foreground">Title</label>
          <input
            ref={titleInputRef}
            type="text"
            value={titleValue}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="Untitled Canvas"
            className="w-full rounded-md border border-default bg-white px-3 py-2 text-sm text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-foreground">Folder</label>
          <input
            type="text"
            value={folderValue}
            onChange={(event) => onFolderChange(event.target.value)}
            placeholder="Leave blank for project root"
            className="w-full rounded-md border border-default bg-white px-3 py-2 text-sm text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
          />
          <div className="mt-1 text-[11px] text-muted-foreground">
            Store under the project canvases root. Nested folders like `systems/type` are supported.
          </div>
        </div>

        <div className="rounded-xl border border-default bg-surface-50 px-3 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Resulting path
          </div>
          <div className="mt-1 text-sm font-medium text-foreground">{relativePreviewPath}</div>
        </div>

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-xs text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2 border-t border-default pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-md border border-default bg-white px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-md border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {copy.icon}
            {busy ? "Working..." : copy.submitLabel}
          </button>
        </div>
      </form>
    </DialogShell>
  )
}

export function CanvasFileDeleteDialog({
  open,
  title,
  path,
  error,
  busy = false,
  onClose,
  onConfirm,
}: CanvasFileDeleteDialogProps) {
  return (
    <DialogShell
      open={open}
      title="Delete canvas file"
      description="Remove the .canvas document from the project and delete any document-local assets stored with it."
      onClose={busy ? () => {} : onClose}
    >
      <div className="space-y-4 px-5 py-4">
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <div>
              <div className="text-sm font-semibold text-rose-700">{title}</div>
              <div className="mt-1 break-all text-xs text-rose-700/90">{path}</div>
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-xs text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2 border-t border-default pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-md border border-default bg-white px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (!busy) {
                void onConfirm()
              }
            }}
            disabled={busy}
            className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Deleting..." : "Delete file"}
          </button>
        </div>
      </div>
    </DialogShell>
  )
}
