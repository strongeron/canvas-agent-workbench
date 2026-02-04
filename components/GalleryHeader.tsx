import { Accessibility, Box, Layers, Layout, Palette, Search, Share2 } from "lucide-react"

interface GalleryHeaderProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  viewMode: "components" | "layouts" | "tokens" | "snapshots" | "canvas" | "color-canvas"
  onViewModeChange: (mode: "components" | "layouts" | "tokens" | "snapshots" | "canvas" | "color-canvas") => void
  totals: {
    components: number
    variants: number
    layouts?: number
    patterns?: number
    tokens: number
  }
  /** Optional link to accessibility examples page */
  a11yHref?: string
}

export function GalleryHeader({
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  totals,
  a11yHref,
}: GalleryHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-default bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center gap-3 px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-brand-500 to-brand-700 shadow-md">
            <Box className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-display text-foreground text-xl font-bold leading-tight">
              Component Gallery
            </h1>
            <p className="text-muted-foreground text-xs">Design System Verification</p>
          </div>
        </div>

        <div className="flex flex-1 min-w-[240px] items-center gap-3">
          <div className="relative w-full">
            <Search className="text-muted absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={
                viewMode === "components" ? "Search components..." :
                viewMode === "layouts" ? "Search layouts..." :
                viewMode === "color-canvas" ? "Search tokens..." :
                "Search tokens..."
              }
              className="text-foreground placeholder:text-muted w-full rounded-lg border border-default bg-white py-2 pl-10 pr-3 text-sm transition-all focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-3">
            <div className="text-center">
              <div className="font-display text-foreground text-lg font-bold">
                {totals.components}
              </div>
              <div className="text-muted text-xs">Components</div>
            </div>
            <div className="h-8 w-px bg-border-default" />
            <div className="text-center">
              <div className="font-display text-foreground text-lg font-bold">
                {totals.variants}
              </div>
              <div className="text-muted text-xs">Variants</div>
            </div>
            <div className="h-8 w-px bg-border-default" />
            <div className="text-center">
              <div className="font-display text-foreground text-lg font-bold">
                {totals.tokens}
              </div>
              <div className="text-muted text-xs">Tokens</div>
            </div>
          </div>

          <div className="flex rounded-lg border border-default bg-white p-1">
            <button
              onClick={() => onViewModeChange("components")}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === "components"
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-muted-foreground hover:bg-surface-50 hover:text-foreground"
              }`}
            >
              <Box className="h-4 w-4" />
              Components
            </button>
            <button
              onClick={() => onViewModeChange("layouts")}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === "layouts"
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-muted-foreground hover:bg-surface-50 hover:text-foreground"
              }`}
            >
              <Layout className="h-4 w-4" />
              Layouts
            </button>
            <button
              onClick={() => onViewModeChange("tokens")}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === "tokens"
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-muted-foreground hover:bg-surface-50 hover:text-foreground"
              }`}
            >
              <Palette className="h-4 w-4" />
              Tokens
            </button>
            <button
              onClick={() => onViewModeChange("canvas")}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === "canvas"
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-muted-foreground hover:bg-surface-50 hover:text-foreground"
              }`}
            >
              <Layers className="h-4 w-4" />
              Canvas
            </button>
            <button
              onClick={() => onViewModeChange("color-canvas")}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === "color-canvas"
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-muted-foreground hover:bg-surface-50 hover:text-foreground"
              }`}
            >
              <Share2 className="h-4 w-4" />
              Color Canvas
            </button>
          </div>

          {a11yHref && (
            <a
              href={a11yHref}
              className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100"
            >
              <Accessibility className="h-4 w-4" />
              A11y Examples
            </a>
          )}
        </div>
      </div>
    </header>
  )
}
