import { X } from "lucide-react"

interface CanvasArtboardPropsPanelProps {
  name: string
  background?: string
  themeId?: string
  themes?: Array<{ id: string; label: string }>
  layout: {
    display: "flex" | "grid"
    direction?: "row" | "column"
    align?: "start" | "center" | "end" | "stretch"
    justify?: "start" | "center" | "end" | "between"
    gap?: number
    columns?: number
    padding?: number
  }
  size: { width: number; height: number }
  onImportFromPaper?: () => void
  importKind?: "ui" | "page"
  onImportKindChange?: (kind: "ui" | "page") => void
  importingPaper?: boolean
  onChange: (updates: {
    name?: string
    background?: string
    themeId?: string
    layout?: CanvasArtboardPropsPanelProps["layout"]
  }) => void
  onClose: () => void
}

const ALIGN_OPTIONS = [
  { value: "start", label: "Start" },
  { value: "center", label: "Center" },
  { value: "end", label: "End" },
  { value: "stretch", label: "Stretch" },
] as const

const JUSTIFY_OPTIONS = [
  { value: "start", label: "Start" },
  { value: "center", label: "Center" },
  { value: "end", label: "End" },
  { value: "between", label: "Between" },
] as const

export function CanvasArtboardPropsPanel({
  name,
  background,
  themeId,
  themes,
  layout,
  size,
  onImportFromPaper,
  importKind,
  onImportKindChange,
  importingPaper,
  onChange,
  onClose,
}: CanvasArtboardPropsPanelProps) {
  const layoutDefaults = {
    display: layout.display,
    direction: layout.direction ?? "column",
    align: layout.align ?? "start",
    justify: layout.justify ?? "start",
    gap: layout.gap ?? 16,
    padding: layout.padding ?? 24,
    columns: layout.columns ?? 2,
  }

  return (
    <div className="flex h-full w-80 flex-col border-l border-default bg-white">
      <div className="flex items-center justify-between border-b border-default px-4 py-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-foreground">Artboard</h3>
          <p className="truncate text-xs text-muted-foreground">Layout settings</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="ml-2 rounded p-1 text-muted-foreground hover:bg-surface-100 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-4">
          {themes && themes.length > 0 && (
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Theme</label>
              <select
                value={themeId || ""}
                onChange={(e) =>
                  onChange({ themeId: e.target.value ? e.target.value : undefined })
                }
                className="w-full rounded-md border border-default bg-white px-3 py-1.5 text-sm text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
              >
                <option value="">Inherit canvas theme</option>
                {themes.map((theme) => (
                  <option key={theme.id} value={theme.id}>
                    {theme.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => onChange({ name: e.target.value })}
              className="w-full rounded-md border border-default bg-white px-3 py-1.5 text-sm text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Background</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={background || "#ffffff"}
                onChange={(e) => onChange({ background: e.target.value })}
                className="h-8 w-10 rounded border border-default bg-white"
                aria-label="Background color"
              />
              <input
                type="text"
                value={background || "#ffffff"}
                onChange={(e) => onChange({ background: e.target.value })}
                className="flex-1 rounded-md border border-default bg-white px-3 py-1.5 text-sm text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
              />
            </div>
          </div>

          <div className="rounded-md border border-default bg-surface-50 px-3 py-2 text-xs text-muted-foreground">
            Size: {Math.round(size.width)} × {Math.round(size.height)} px
          </div>

        {onImportFromPaper && (
          <div className="space-y-2">
            <div className="text-[11px] font-medium text-muted-foreground">Paper</div>
            {onImportKindChange && (
              <div className="flex items-center gap-1 rounded-md border border-default bg-white p-1">
                {(["ui", "page"] as const).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => onImportKindChange(kind)}
                    className={`flex-1 rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                      importKind === kind
                        ? "bg-gray-900 text-white"
                        : "text-gray-600 hover:bg-surface-100"
                    }`}
                  >
                    {kind}
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={onImportFromPaper}
              disabled={importingPaper}
                className="w-full rounded-md border border-default bg-white px-3 py-2 text-xs font-semibold text-foreground hover:bg-surface-100 disabled:opacity-60"
              >
                {importingPaper ? "Importing from Paper..." : "Import selection into artboard"}
              </button>
            </div>
          )}

          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Layout</label>
            <div className="flex gap-2">
              {(["flex", "grid"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onChange({ layout: { ...layoutDefaults, display: value } })}
                  className={`flex-1 rounded-md border px-3 py-1.5 text-xs font-semibold ${
                    layout.display === value
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-default text-muted-foreground hover:bg-surface-100"
                  }`}
                >
                  {value === "flex" ? "Flex" : "Grid"}
                </button>
              ))}
            </div>
          </div>

          {layout.display === "flex" && (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                  Direction
                </label>
                <div className="flex gap-2">
                  {(["row", "column"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        onChange({ layout: { ...layoutDefaults, direction: value } })
                      }
                      className={`flex-1 rounded-md border px-3 py-1.5 text-xs font-semibold ${
                        layoutDefaults.direction === value
                          ? "border-brand-500 bg-brand-50 text-brand-700"
                          : "border-default text-muted-foreground hover:bg-surface-100"
                      }`}
                    >
                      {value === "row" ? "Row" : "Column"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                  Align Items
                </label>
                <select
                  value={layoutDefaults.align}
                  onChange={(e) =>
                    onChange({
                      layout: { ...layoutDefaults, align: e.target.value as typeof layoutDefaults.align },
                    })
                  }
                  className="w-full rounded-md border border-default bg-white px-3 py-1.5 text-sm text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
                >
                  {ALIGN_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                  Justify Content
                </label>
                <select
                  value={layoutDefaults.justify}
                  onChange={(e) =>
                    onChange({
                      layout: {
                        ...layoutDefaults,
                        justify: e.target.value as typeof layoutDefaults.justify,
                      },
                    })
                  }
                  className="w-full rounded-md border border-default bg-white px-3 py-1.5 text-sm text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
                >
                  {JUSTIFY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {layout.display === "grid" && (
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                Columns
              </label>
              <input
                type="number"
                min={1}
                max={6}
                value={layoutDefaults.columns}
                onChange={(e) =>
                  onChange({
                    layout: {
                      ...layoutDefaults,
                      columns: Math.max(1, Math.min(6, Number(e.target.value) || 1)),
                    },
                  })
                }
                className="w-full rounded-md border border-default bg-white px-3 py-1.5 text-sm text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">Maps to `grid-cols-*`.</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Gap</label>
              <input
                type="number"
                min={0}
                value={layoutDefaults.gap}
                onChange={(e) =>
                  onChange({
                    layout: { ...layoutDefaults, gap: Math.max(0, Number(e.target.value) || 0) },
                  })
                }
                className="w-full rounded-md border border-default bg-white px-3 py-1.5 text-sm text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">Maps to `gap-*`.</p>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                Padding
              </label>
              <input
                type="number"
                min={0}
                value={layoutDefaults.padding}
                onChange={(e) =>
                  onChange({
                    layout: {
                      ...layoutDefaults,
                      padding: Math.max(0, Number(e.target.value) || 0),
                    },
                  })
                }
                className="w-full rounded-md border border-default bg-white px-3 py-1.5 text-sm text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">Maps to `p-*`.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
