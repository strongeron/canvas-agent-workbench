import { useEffect, useState } from "react"
import { Layers3, X } from "lucide-react"

import {
  NATIVE_COMPONENT_ELEMENT_PARTS,
  NATIVE_COMPONENT_TEMPLATES,
  type NativeComponentTemplate,
} from "../../utils/canvasNativeComponentShell"

interface CanvasNativeComponentDialogProps {
  open: boolean
  artboardName?: string | null
  onClose: () => void
  onCreate: (input: {
    template: NativeComponentTemplate
    title?: string
  }) => void | Promise<void>
}

export function CanvasNativeComponentDialog({
  open,
  artboardName,
  onClose,
  onCreate,
}: CanvasNativeComponentDialogProps) {
  const [selectedTemplate, setSelectedTemplate] =
    useState<NativeComponentTemplate>("section")
  const [titleValue, setTitleValue] = useState("")

  useEffect(() => {
    if (!open) return
    setSelectedTemplate("section")
    setTitleValue("")
  }, [open])

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

  if (!open) return null

  const targetLabel = artboardName?.trim()
    ? `This shell will be inserted into ${artboardName}.`
    : "This shell will be created on the free board."

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/35 px-4 py-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Create native component"
        className="flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-default bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-default px-5 py-4">
          <div>
            <div className="text-sm font-semibold text-foreground">Create native component</div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Pick an editable HTML starter with authored slots for text, actions, and media.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close create native component"
            onClick={onClose}
            className="rounded-full border border-default bg-white p-2 text-muted-foreground hover:bg-surface-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-4 px-5 py-4 md:grid-cols-[minmax(0,1.4fr)_280px]">
          <div className="flex flex-col gap-4">
            <div>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Templates &amp; layout primitives
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {NATIVE_COMPONENT_TEMPLATES.map((template) => {
                  const selected = template.id === selectedTemplate
                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => setSelectedTemplate(template.id)}
                      className={`rounded-2xl border p-4 text-left transition ${
                        selected
                          ? "border-brand-300 bg-brand-50 shadow-sm"
                          : "border-default bg-white hover:border-brand-200 hover:bg-surface-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`rounded-full p-2 ${
                            selected
                              ? "bg-brand-100 text-brand-700"
                              : "bg-surface-100 text-foreground"
                          }`}
                        >
                          <Layers3 className="h-4 w-4" />
                        </div>
                        <div className="text-sm font-semibold text-foreground">
                          {template.label}
                        </div>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">
                        {template.description}
                      </p>
                      <div className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Slots
                      </div>
                      <div className="mt-1 text-xs leading-5 text-foreground">
                        {template.slotSummary}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Element parts
              </div>
              <div className="flex flex-wrap gap-2">
                {NATIVE_COMPONENT_ELEMENT_PARTS.map((part) => {
                  const selected = part === selectedTemplate
                  return (
                    <button
                      key={part}
                      type="button"
                      onClick={() => setSelectedTemplate(part)}
                      className={`rounded-md border px-2.5 py-1 font-mono text-xs transition ${
                        selected
                          ? "border-brand-300 bg-brand-50 text-brand-700 shadow-sm"
                          : "border-default bg-white text-foreground hover:border-brand-200 hover:bg-surface-50"
                      }`}
                    >
                      {`<${part}>`}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl border border-default bg-surface-50 p-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Optional title
              </label>
              <input
                type="text"
                value={titleValue}
                onChange={(event) => setTitleValue(event.target.value)}
                placeholder={NATIVE_COMPONENT_TEMPLATES.find((template) => template.id === selectedTemplate)?.label}
                className="mt-2 w-full rounded-md border border-default bg-white px-3 py-2 text-sm text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
              />
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Placement
              </div>
              <p className="mt-2 text-sm leading-6 text-foreground">{targetLabel}</p>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Result
              </div>
              <p className="mt-2 text-sm leading-6 text-foreground">
                The canvas creates a file-backed HTML component, not a props-only component
                instance. You can edit the structure immediately in the right panel or through the
                agent HTML tools.
              </p>
            </div>

            <div className="rounded-xl border border-default bg-white px-3 py-3 text-xs leading-5 text-muted-foreground">
              Media-capable starters expose <code>data-slot-accepts=&quot;image,svg,video&quot;</code> so
              agent and source workflows can target those regions directly.
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-default px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-default bg-white px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() =>
              void onCreate({
                template: selectedTemplate,
                title: titleValue.trim() || undefined,
              })
            }
            className="inline-flex items-center gap-2 rounded-md border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100"
          >
            <Layers3 className="h-4 w-4" />
            Create shell
          </button>
        </div>
      </div>
    </div>
  )
}
