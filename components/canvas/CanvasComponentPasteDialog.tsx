import { Loader2, X } from "lucide-react"
import { useMemo, useState } from "react"

export type ComponentPasteFormat = "html" | "tsx"

export interface ComponentPasteResult {
  projectId: string
  primitive: {
    id: string
    displayName: string
    kind: "html" | "tsx"
    filePath?: string
    cssPath?: string
    importName?: string
  }
  files: Array<{ filePath: string; mtimeMs: number }>
}

interface CanvasComponentPasteDialogProps {
  projectId: string
  onClose: () => void
  onCreated: (input: {
    result: ComponentPasteResult
    format: ComponentPasteFormat
    sourceHtml?: string
    sourceCss?: string
    sourceTsx?: string
  }) => void | Promise<void>
}

export function CanvasComponentPasteDialog({
  projectId,
  onClose,
  onCreated,
}: CanvasComponentPasteDialogProps) {
  const [format, setFormat] = useState<ComponentPasteFormat>("html")
  const [name, setName] = useState("")
  const [sourceHtml, setSourceHtml] = useState("<article>\n  <h2>New component</h2>\n</article>")
  const [sourceCss, setSourceCss] = useState("")
  const [sourceTsx, setSourceTsx] = useState("export function NewComponent() {\n  return <div>New component</div>\n}")
  const [state, setState] = useState<{ status: "idle" | "saving" | "error"; error: string }>({
    status: "idle",
    error: "",
  })

  const canSubmit = useMemo(() => {
    if (!name.trim()) return false
    return format === "html" ? Boolean(sourceHtml.trim()) : Boolean(sourceTsx.trim())
  }, [format, name, sourceHtml, sourceTsx])

  const submit = async () => {
    if (!canSubmit || state.status === "saving") return
    setState({ status: "saving", error: "" })
    try {
      const response = await fetch("/api/canvas/component/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          name,
          format,
          sourceHtml: format === "html" ? sourceHtml : undefined,
          sourceCss: format === "html" ? sourceCss : undefined,
          sourceTsx: format === "tsx" ? sourceTsx : undefined,
        }),
      })
      const payload = (await response.json().catch(() => ({}))) as ComponentPasteResult & {
        ok?: boolean
        error?: string
      }
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Failed to create component.")
      }
      await onCreated({
        result: payload,
        format,
        sourceHtml: format === "html" ? sourceHtml : undefined,
        sourceCss: format === "html" ? sourceCss : undefined,
        sourceTsx: format === "tsx" ? sourceTsx : undefined,
      })
      onClose()
    } catch (error) {
      setState({
        status: "error",
        error: error instanceof Error ? error.message : "Failed to create component.",
      })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-default bg-white shadow-xl">
        <header className="flex items-start justify-between gap-3 border-b border-default px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">New component</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{projectId}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-surface-100 hover:text-foreground"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {state.status === "error" && (
            <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {state.error}
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-[220px_1fr]">
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Name
                </span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-md border border-default bg-white px-3 py-2 text-sm text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
                  placeholder="Promo Card"
                />
              </label>

              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Format
                </div>
                <div className="grid grid-cols-2 overflow-hidden rounded-md border border-default">
                  {(["html", "tsx"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFormat(value)}
                      className={`px-3 py-2 text-xs font-semibold uppercase ${
                        format === value
                          ? "bg-brand-600 text-white"
                          : "bg-white text-muted-foreground hover:bg-surface-50"
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {format === "html" ? (
                <>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      HTML
                    </span>
                    <textarea
                      value={sourceHtml}
                      onChange={(event) => setSourceHtml(event.target.value)}
                      rows={10}
                      spellCheck={false}
                      className="w-full resize-y rounded-md border border-default bg-white px-3 py-2 font-mono text-xs text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      CSS
                    </span>
                    <textarea
                      value={sourceCss}
                      onChange={(event) => setSourceCss(event.target.value)}
                      rows={5}
                      spellCheck={false}
                      className="w-full resize-y rounded-md border border-default bg-white px-3 py-2 font-mono text-xs text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
                    />
                  </label>
                </>
              ) : (
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    TSX
                  </span>
                  <textarea
                    value={sourceTsx}
                    onChange={(event) => setSourceTsx(event.target.value)}
                    rows={16}
                    spellCheck={false}
                    className="w-full resize-y rounded-md border border-default bg-white px-3 py-2 font-mono text-xs text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        <footer className="flex justify-end gap-2 border-t border-default px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-default bg-white px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!canSubmit || state.status === "saving"}
            className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {state.status === "saving" && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </button>
        </footer>
      </div>
    </div>
  )
}
