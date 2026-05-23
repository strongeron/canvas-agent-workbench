import type { CanvasItem } from "../../types/canvas"

export type CanvasLayoutWidthMode = NonNullable<
  NonNullable<CanvasItem["layoutSizing"]>["width"]
>
export type CanvasLayoutHeightMode = NonNullable<
  NonNullable<CanvasItem["layoutSizing"]>["height"]
>

interface CanvasLayoutSizingControlsProps {
  size?: { width: number; height: number }
  widthMode?: CanvasLayoutWidthMode
  heightMode?: CanvasLayoutHeightMode
  canFillParent: boolean
  canFillHeight?: boolean
  onWidthModeChange: (mode: CanvasLayoutWidthMode) => void
  onHeightModeChange?: (mode: CanvasLayoutHeightMode) => void
  onSizeChange?: (size: { width: number; height: number }) => void
}

export function CanvasLayoutSizingControls({
  size,
  widthMode = "hug",
  heightMode = "hug",
  canFillParent,
  canFillHeight = canFillParent,
  onWidthModeChange,
  onHeightModeChange,
  onSizeChange,
}: CanvasLayoutSizingControlsProps) {
  return (
    <section className="space-y-2 rounded-md border border-default bg-surface-50 p-3">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Layout sizing
        </div>
        <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
          Controls how this item behaves inside its parent artboard or section.
        </p>
      </div>

      {size && onSizeChange ? (
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-muted-foreground">
              Width
            </span>
            <input
              type="number"
              min={1}
              value={Math.round(size.width)}
              onChange={(event) =>
                onSizeChange({
                  ...size,
                  width: Math.max(1, Number(event.target.value) || 1),
                })
              }
              className="w-full rounded-md border border-default bg-white px-2 py-1.5 text-xs text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-muted-foreground">
              Height
            </span>
            <input
              type="number"
              min={1}
              value={Math.round(size.height)}
              onChange={(event) =>
                onSizeChange({
                  ...size,
                  height: Math.max(1, Number(event.target.value) || 1),
                })
              }
              className="w-full rounded-md border border-default bg-white px-2 py-1.5 text-xs text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
            />
          </label>
        </div>
      ) : null}

      <div className="text-[11px] font-medium text-muted-foreground">Width behavior</div>
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Item width">
        <button
          type="button"
          disabled={!canFillParent}
          onClick={() => onWidthModeChange("fill")}
          className={`rounded-md border px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
            widthMode === "fill"
              ? "border-brand-500 bg-brand-50 text-brand-700"
              : "border-default bg-white text-muted-foreground hover:bg-surface-100"
          }`}
        >
          Fill parent
        </button>
        <button
          type="button"
          onClick={() => onWidthModeChange("hug")}
          className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${
            widthMode === "hug"
              ? "border-brand-500 bg-brand-50 text-brand-700"
              : "border-default bg-white text-muted-foreground hover:bg-surface-100"
          }`}
        >
          Hug content
        </button>
      </div>

      {onHeightModeChange ? (
        <>
          <div className="text-[11px] font-medium text-muted-foreground">Height behavior</div>
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Item height">
            <button
              type="button"
              disabled={!canFillHeight}
              onClick={() => onHeightModeChange("fill")}
              className={`rounded-md border px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
                heightMode === "fill"
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-default bg-white text-muted-foreground hover:bg-surface-100"
              }`}
            >
              Fill parent
            </button>
            <button
              type="button"
              onClick={() => onHeightModeChange("hug")}
              className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${
                heightMode === "hug"
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-default bg-white text-muted-foreground hover:bg-surface-100"
              }`}
            >
              Hug content
            </button>
          </div>
        </>
      ) : null}
    </section>
  )
}
