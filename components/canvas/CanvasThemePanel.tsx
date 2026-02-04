import { ExternalLink, Palette, Plus, X } from "lucide-react"
import { useMemo, useState } from "react"
import type { ThemeOption, ThemeToken } from "../../types/theme"

interface CanvasThemePanelProps {
  themes: ThemeOption[]
  activeThemeId: string
  onThemeChange: (themeId: string) => void
  onOpenColorCanvas: () => void
  onAddTheme: (label: string) => void
  onUpdateThemeVar: (themeId: string, cssVar: string, value: string) => void
  tokenValues: Record<string, string>
  tokens: ThemeToken[]
  onClose: () => void
}

export function CanvasThemePanel({
  themes,
  activeThemeId,
  onThemeChange,
  onOpenColorCanvas,
  onAddTheme,
  onUpdateThemeVar,
  tokenValues,
  tokens,
  onClose,
}: CanvasThemePanelProps) {
  const activeTheme = themes.find((theme) => theme.id === activeThemeId)
  const [newThemeName, setNewThemeName] = useState("")
  const [tokenQuery, setTokenQuery] = useState("")

  const tokenRows = useMemo(() => {
    const lowerQuery = tokenQuery.trim().toLowerCase()
    const rows = tokens.map((token) => ({
      ...token,
      value: tokenValues[token.cssVar] || "",
    }))

    if (!lowerQuery) return rows

    return rows.filter((token) => {
      const haystack = [
        token.label,
        token.cssVar,
        token.category,
        token.subcategory,
        token.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return haystack.includes(lowerQuery)
    })
  }, [tokens, tokenValues, tokenQuery])

  const tokensByCategory = useMemo(() => {
    return tokenRows.reduce<Record<string, typeof tokenRows>>((acc, token) => {
      const category = token.category || "other"
      if (!acc[category]) acc[category] = []
      acc[category].push(token)
      return acc
    }, {})
  }, [tokenRows])

  return (
    <div className="flex h-full w-80 flex-col border-l border-default bg-white">
      <div className="flex items-center justify-between border-b border-default px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-brand-600" />
            <h3 className="truncate text-sm font-semibold text-foreground">Theme + Tokens</h3>
          </div>
          <p className="truncate text-xs text-muted-foreground">Canvas theme controls</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="ml-2 rounded p-1 text-muted-foreground hover:bg-surface-100 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
        <div>
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Active Theme
          </h4>
          <div className="space-y-2">
            {themes.map((theme) => {
              const isActive = theme.id === activeThemeId
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => onThemeChange(theme.id)}
                  className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                    isActive
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-default bg-white text-foreground hover:bg-surface-50"
                  }`}
                >
                  <div className="font-semibold">{theme.label}</div>
                  {theme.description && (
                    <div className="text-xs text-muted-foreground">{theme.description}</div>
                  )}
                </button>
              )
            })}
          </div>
          {activeTheme && (
            <p className="mt-2 text-xs text-muted-foreground">
              Current: <span className="font-semibold text-foreground">{activeTheme.label}</span>
            </p>
          )}
        </div>

        <div>
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Add Theme
          </h4>
          <div className="flex gap-2">
            <input
              type="text"
              value={newThemeName}
              onChange={(e) => setNewThemeName(e.target.value)}
              placeholder="New theme name"
              className="flex-1 rounded-md border border-default bg-white px-3 py-1.5 text-sm text-foreground placeholder:text-muted focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
            />
            <button
              type="button"
              onClick={() => {
                const label = newThemeName.trim()
                if (!label) return
                onAddTheme(label)
                setNewThemeName("")
              }}
              className="inline-flex items-center gap-1 rounded-md border border-default bg-white px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-100"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            New themes start with the current token values.
          </p>
        </div>

        <div className="rounded-md border border-default bg-surface-50 px-3 py-3">
          <h4 className="mb-2 text-xs font-semibold text-foreground">Color Canvas</h4>
          <p className="text-xs text-muted-foreground">
            Use a dedicated artboard to map palette tokens to semantic roles. Connections and APCA
            checks will live here.
          </p>
          <button
            type="button"
            onClick={onOpenColorCanvas}
            className="mt-3 inline-flex items-center gap-1 rounded-md border border-default bg-white px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-100"
          >
            Open Color Canvas
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>

        <div>
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Tokens
          </h4>
          <input
            type="text"
            value={tokenQuery}
            onChange={(e) => setTokenQuery(e.target.value)}
            placeholder="Filter tokens..."
            className="mb-3 w-full rounded-md border border-default bg-white px-3 py-1.5 text-xs text-foreground placeholder:text-muted focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
          />
          <div className="space-y-4">
            {Object.entries(tokensByCategory).map(([category, categoryTokens]) => (
              <div key={category}>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {category}
                </div>
                <div className="space-y-2">
                  {categoryTokens.map((token) => (
                    <div key={token.cssVar} className="flex items-center gap-2">
                      <div
                        className="h-6 w-6 rounded border border-default"
                        style={{ background: token.value || "transparent" }}
                        title={token.value}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-foreground">{token.label}</div>
                        <div className="text-[10px] text-muted-foreground">{token.cssVar}</div>
                      </div>
                      <input
                        type="text"
                        value={token.value}
                        onChange={(e) =>
                          onUpdateThemeVar(activeThemeId, token.cssVar, e.target.value)
                        }
                        className="w-32 rounded-md border border-default bg-white px-2 py-1 text-xs text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {tokenRows.length === 0 && (
              <div className="rounded-md border border-dashed border-default bg-white px-3 py-2 text-xs text-muted-foreground">
                No tokens match your filter.
              </div>
            )}
          </div>
        </div>

        <div>
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Contrast (APCA, approx)
          </h4>
          <div className="rounded-md border border-dashed border-default bg-white px-3 py-2">
            <div className="mb-2 text-xs text-muted-foreground">
              Target levels (Lc):
            </div>
            <div className="flex flex-wrap gap-2 text-[11px]">
              {["15", "30", "45", "60", "75", "90+"].map((level) => (
                <span
                  key={level}
                  className="rounded-full border border-default bg-surface-50 px-2 py-0.5 text-muted-foreground"
                >
                  Lc {level}
                </span>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              APCA scoring will appear here once color connections are defined.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
