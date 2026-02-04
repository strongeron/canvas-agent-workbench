import { useEffect, useMemo, useState } from "react"

import { useLocalStorage } from "./useLocalStorage"
import type { ThemeOption, ThemeToken } from "../types/theme"

interface ThemeRegistryOptions {
  storageKeyPrefix?: string
  tokens: ThemeToken[]
  defaultThemes: ThemeOption[]
  rootRef?: React.RefObject<HTMLElement | null>
}

interface ThemeRegistryState {
  themes: ThemeOption[]
  activeThemeId: string
  setActiveThemeId: (id: string) => void
  setThemes: (updater: ThemeOption[] | ((prev: ThemeOption[]) => ThemeOption[])) => void
  tokenValues: Record<string, string>
  addTheme: (label: string) => void
  updateThemeVar: (themeId: string, cssVar: string, value: string) => void
}

function buildStorageKey(prefix: string | undefined, suffix: string, fallback: string) {
  if (prefix) return `${prefix}-${suffix}`
  return fallback
}

export function useThemeRegistry({
  storageKeyPrefix,
  tokens,
  defaultThemes,
  rootRef,
}: ThemeRegistryOptions): ThemeRegistryState {
  const themeKey = buildStorageKey(storageKeyPrefix, "theme", "gallery-canvas-theme")
  const themeListKey = buildStorageKey(storageKeyPrefix, "themes", "gallery-canvas-themes")

  const [themes, setThemes] = useLocalStorage<ThemeOption[]>(themeListKey, defaultThemes)
  const [activeThemeId, setActiveThemeId] = useLocalStorage<string>(
    themeKey,
    defaultThemes[0]?.id ?? "default"
  )
  const [tokenValues, setTokenValues] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!themes || themes.length === 0) {
      setThemes(defaultThemes)
    }
  }, [themes, defaultThemes, setThemes])

  useEffect(() => {
    if (!themes || themes.length === 0) return
    if (!themes.some((theme) => theme.id === activeThemeId)) {
      setActiveThemeId(themes[0].id)
    }
  }, [themes, activeThemeId, setActiveThemeId])

  useEffect(() => {
    if (typeof document === "undefined") return
    const styleId = buildStorageKey(storageKeyPrefix, "theme-overrides", "canvas-theme-overrides")
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null
    if (!styleEl) {
      styleEl = document.createElement("style")
      styleEl.id = styleId
      document.head.appendChild(styleEl)
    }

    const cssText = themes
      .map((theme) => {
        const entries = Object.entries(theme.vars ?? {})
        if (entries.length === 0) return ""
        const body = entries.map(([cssVar, value]) => `  ${cssVar}: ${value};`).join("\n")
        return `[data-theme=\"${theme.id}\"] {\n${body}\n}`
      })
      .filter(Boolean)
      .join("\n\n")

    styleEl.textContent = cssText
  }, [themes, storageKeyPrefix])

  useEffect(() => {
    if (!rootRef?.current || tokens.length === 0) return
    const styles = getComputedStyle(rootRef.current)
    const values: Record<string, string> = {}
    for (const token of tokens) {
      if (!token.cssVar) continue
      values[token.cssVar] = styles.getPropertyValue(token.cssVar).trim()
    }
    setTokenValues(values)
  }, [rootRef, activeThemeId, themes, tokens])

  const addTheme = (label: string) => {
    const normalized = label.trim()
    if (!normalized) return
    const baseId = normalized
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "")
    let nextId = baseId || `theme-${themes.length + 1}`
    let counter = 2
    while (themes.some((theme) => theme.id === nextId)) {
      nextId = `${baseId || "theme"}-${counter}`
      counter += 1
    }

    const varsFromTokens = tokens.reduce<Record<string, string>>((acc, token) => {
      const value = tokenValues[token.cssVar]
      if (value) acc[token.cssVar] = value
      return acc
    }, {})

    const newTheme: ThemeOption = {
      id: nextId,
      label: normalized,
      description: "Custom theme",
      vars: varsFromTokens,
      groupId: nextId,
    }

    setThemes((prev) => [...prev, newTheme])
    setActiveThemeId(nextId)
  }

  const updateThemeVar = (themeId: string, cssVar: string, value: string) => {
    setThemes((prev) =>
      prev.map((theme) => {
        if (theme.id !== themeId) return theme
        const nextVars = { ...(theme.vars ?? {}) }
        const trimmed = value.trim()
        if (!trimmed) {
          delete nextVars[cssVar]
        } else {
          nextVars[cssVar] = trimmed
        }
        return { ...theme, vars: nextVars }
      })
    )
  }

  return {
    themes,
    activeThemeId,
    setActiveThemeId,
    setThemes,
    tokenValues,
    addTheme,
    updateThemeVar,
  }
}
