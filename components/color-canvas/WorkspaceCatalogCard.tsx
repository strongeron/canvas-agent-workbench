import {
  WorkspaceCatalogSection,
} from "./colorCanvasShared"

export function WorkspaceCatalogCard({
  item,
}: {
  item: WorkspaceCatalogSection["items"][number]
}) {
  const preview = (() => {
    switch (item.previewKind) {
      case "artboard":
        return (
          <div className="rounded-xl border border-default bg-white p-3">
            <div className="rounded-lg border border-dashed border-default bg-surface-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] font-semibold text-foreground">Artboard 1</div>
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  flex
                </span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="rounded-md border border-default bg-white px-3 py-2 text-[11px] text-muted-foreground">
                  Component
                </div>
                <div className="rounded-md border border-default bg-white px-3 py-2 text-[11px] text-muted-foreground">
                  Diagram
                </div>
              </div>
            </div>
          </div>
        )
      case "component":
        return (
          <div className="rounded-xl border border-default bg-white p-3">
            <div className="rounded-lg border border-default bg-surface-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-foreground">Button / Primary</div>
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  interactive
                </span>
              </div>
              <div className="mt-3 inline-flex rounded-full bg-brand-600 px-3 py-2 text-xs font-semibold text-white">
                Get started
              </div>
            </div>
          </div>
        )
      case "embed":
        return (
          <div className="rounded-xl border border-default bg-white p-3">
            <div className="overflow-hidden rounded-lg border border-default bg-surface-50">
              <div className="border-b border-default bg-white px-3 py-2 text-[11px] text-muted-foreground">
                https://example.com/preview
              </div>
              <div className="flex h-28 items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-[11px] font-semibold text-muted-foreground">
                Live / snapshot embed
              </div>
            </div>
          </div>
        )
      case "media":
        return (
          <div className="rounded-xl border border-default bg-white p-3">
            <div className="overflow-hidden rounded-lg border border-default bg-surface-50">
              <div className="flex h-28 items-end justify-start bg-gradient-to-br from-fuchsia-200 via-orange-200 to-amber-200 p-3">
                <span className="rounded-full bg-white/85 px-2 py-0.5 text-[10px] font-semibold text-foreground">
                  image / video / gif
                </span>
              </div>
            </div>
          </div>
        )
      case "mermaid":
        return (
          <div className="rounded-xl border border-default bg-white p-3">
            <div className="rounded-lg border border-default bg-surface-50 p-3">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>flowchart LR</span>
                <span>Mermaid</span>
              </div>
              <div className="mt-3 flex items-center justify-center gap-3 text-[11px] font-semibold text-foreground">
                <span className="rounded-md border border-default bg-white px-2 py-1">Start</span>
                <span>→</span>
                <span className="rounded-md border border-default bg-white px-2 py-1">Review</span>
                <span>→</span>
                <span className="rounded-md border border-default bg-white px-2 py-1">Ship</span>
              </div>
            </div>
          </div>
        )
      case "excalidraw":
        return (
          <div className="rounded-xl border border-default bg-white p-3">
            <div className="relative rounded-lg border border-default bg-[linear-gradient(0deg,transparent_24px,#f1f5f9_25px),linear-gradient(90deg,transparent_24px,#f1f5f9_25px)] bg-[length:25px_25px] p-3">
              <div className="absolute left-5 top-5 h-10 w-20 rotate-[-4deg] rounded-md border-2 border-slate-400/80" />
              <div className="absolute right-7 top-8 h-12 w-24 rotate-[3deg] rounded-full border-2 border-slate-400/80" />
              <div className="absolute left-16 bottom-7 h-0.5 w-24 rotate-[8deg] bg-slate-400/80" />
              <div className="relative h-28">
                <span className="absolute bottom-0 right-0 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  rough wireframe
                </span>
              </div>
            </div>
          </div>
        )
      case "markdown":
        return (
          <div className="rounded-xl border border-default bg-white p-3">
            <div className="rounded-lg border border-default bg-surface-50 p-3">
              <div className="text-[11px] font-semibold text-foreground"># Project notes</div>
              <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                <div>- Capture requirements</div>
                <div>- Keep design decisions nearby</div>
                <div>- Import `.md` files directly</div>
              </div>
            </div>
          </div>
        )
      default:
        return null
    }
  })()

  return (
    <div className="rounded-xl border border-default bg-surface-50 px-3 py-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-foreground">{item.label}</div>
          <div className="text-[11px] text-muted-foreground">{item.kind}</div>
        </div>
        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
          Canvas
        </span>
      </div>
      {preview}
      <p className="mt-2 text-[11px] leading-5 text-muted-foreground">{item.description}</p>
    </div>
  )
}

