import { Monitor, Smartphone, Tablet } from "lucide-react"

export const VIEWPORT_PRESETS = [
  { label: "Mobile S", short: "320", width: 320, height: 568, icon: "mobile" },
  { label: "Mobile M", short: "375", width: 375, height: 667, icon: "mobile" },
  { label: "Mobile L", short: "390", width: 390, height: 844, icon: "mobile" },
  { label: "Tablet", short: "768", width: 768, height: 1024, icon: "tablet" },
  { label: "Tablet L", short: "1024", width: 1024, height: 768, icon: "tablet" },
  { label: "Desktop", short: "1280", width: 1280, height: 800, icon: "desktop" },
  { label: "Desktop L", short: "1440", width: 1440, height: 900, icon: "desktop" },
  { label: "Full HD", short: "1920", width: 1920, height: 1080, icon: "desktop" },
] as const

interface CanvasViewportPresetsProps {
  size?: { width: number; height: number }
  onResize: (size: { width: number; height: number }) => void
}

export function CanvasViewportPresets({ size, onResize }: CanvasViewportPresetsProps) {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-medium text-muted-foreground">
        Viewport preset
      </label>
      <div className="grid grid-cols-4 gap-1">
        {VIEWPORT_PRESETS.map((preset) => {
          const isActive =
            size && size.width === preset.width && size.height === preset.height
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => onResize({ width: preset.width, height: preset.height })}
              className={`flex flex-col items-center gap-0.5 rounded-md border px-1.5 py-1.5 text-center transition-colors ${
                isActive
                  ? "border-brand-300 bg-brand-50 text-brand-700"
                  : "border-default bg-white text-muted-foreground hover:bg-surface-50 hover:text-foreground"
              }`}
              title={`${preset.label} (${preset.width}\u00d7${preset.height})`}
            >
              {preset.icon === "mobile" ? (
                <Smartphone className="h-3.5 w-3.5" />
              ) : preset.icon === "tablet" ? (
                <Tablet className="h-3.5 w-3.5" />
              ) : (
                <Monitor className="h-3.5 w-3.5" />
              )}
              <span className="text-[10px] font-medium leading-none">{preset.short}</span>
            </button>
          )
        })}
      </div>
      {size ? (
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
          {size.width} &times; {size.height}
        </p>
      ) : null}
    </div>
  )
}
