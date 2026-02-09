import { Copy, Link2, Move, Palette, Plus, RotateCcw, Trash2, Type } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { CanvasThemePanel } from "../canvas/CanvasThemePanel"
import { ColorPickerField } from "../color-picker"
import { useThemeRegistry } from "../../hooks/useThemeRegistry"
import { useColorCanvasState } from "../../hooks/useColorCanvasState"
import { useLocalStorage } from "../../hooks/useLocalStorage"
import type { ThemeToken } from "../../types/theme"
import type {
  ColorCanvasEdge,
  ColorCanvasNode,
  ColorCanvasState,
  RelativeColorSpec,
} from "../../types/colorCanvas"
import {
  APCA_TARGETS,
  DEFAULT_CONTRAST_TARGET_LC,
  DEFAULT_COLOR_MODEL,
  apcaContrast,
  formatLc,
  parseColor,
  getApcaStatus,
} from "../../utils/apca"

interface RGBA {
  r: number
  g: number
  b: number
  a: number
}

export interface OklchColor {
  l: number
  c: number
  h: number
  a: number
}

interface ColorCanvasPageProps {
  tokens: ThemeToken[]
  themeStorageKeyPrefix?: string
}

type ConnectMode = "map" | "contrast" | null
type EdgeFilter = "all" | "map" | "contrast"
type ContrastRule = {
  id: string
  label: string
  foregroundRole: NonNullable<ColorCanvasNode["role"]>
  backgroundRole: NonNullable<ColorCanvasNode["role"]>
  targetLc: number
  enabled: boolean
}

type DisplayEdge = ColorCanvasEdge & { auto?: boolean; ruleId?: string }

const NODE_SIZES: Record<ColorCanvasNode["type"], { width: number; height: number }> = {
  token: { width: 180, height: 70 },
  semantic: { width: 200, height: 78 },
  component: { width: 200, height: 70 },
  relative: { width: 200, height: 78 },
}

const SEMANTIC_PRESETS: Array<{ label: string; role: ColorCanvasNode["role"] }> = [
  { label: "Text / Foreground", role: "text" },
  { label: "Text / Muted", role: "text" },
  { label: "Surface / Base", role: "surface" },
  { label: "Surface / Subtle", role: "surface" },
  { label: "Border / Default", role: "border" },
  { label: "Icon / Default", role: "icon" },
  { label: "Accent / Primary", role: "accent" },
]

const DEFAULT_CONTRAST_RULES: ContrastRule[] = [
  {
    id: "text-surface",
    label: "Text on Surface",
    foregroundRole: "text",
    backgroundRole: "surface",
    targetLc: 60,
    enabled: true,
  },
  {
    id: "icon-surface",
    label: "Icon on Surface",
    foregroundRole: "icon",
    backgroundRole: "surface",
    targetLc: 45,
    enabled: true,
  },
  {
    id: "border-surface",
    label: "Border on Surface",
    foregroundRole: "border",
    backgroundRole: "surface",
    targetLc: 30,
    enabled: false,
  },
  {
    id: "accent-surface",
    label: "Accent on Surface",
    foregroundRole: "accent",
    backgroundRole: "surface",
    targetLc: 45,
    enabled: false,
  },
]

const DEFAULT_RELATIVE_SPEC = {
  model: DEFAULT_COLOR_MODEL,
  lMode: "inherit",
  cMode: "inherit",
  hMode: "inherit",
  alphaMode: "inherit",
} as const

export function ColorCanvasPage({ tokens, themeStorageKeyPrefix }: ColorCanvasPageProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const workspaceRef = useRef<HTMLDivElement>(null)
  const colorProbeRef = useRef<HTMLSpanElement>(null)
  const [tokenQuery, setTokenQuery] = useState("")
  const [connectMode, setConnectMode] = useState<ConnectMode>(null)
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null)
  const [connectDrag, setConnectDrag] = useState<{ active: boolean; x: number; y: number }>({
    active: false,
    x: 0,
    y: 0,
  })
  const [showDependencies, setShowDependencies] = useState(true)
  const [showFullLabels, setShowFullLabels] = useState(false)
  const [templateBrand, setTemplateBrand] = useState("")
  const [templateAccent, setTemplateAccent] = useState("")
  const [selectedAutoEdgeId, setSelectedAutoEdgeId] = useState<string | null>(null)
  const [newThemeName, setNewThemeName] = useState("")

  const sessionsKey = themeStorageKeyPrefix
    ? `${themeStorageKeyPrefix}-color-canvas-sessions`
    : "gallery-color-canvas-sessions"
  const activeSessionKey = themeStorageKeyPrefix
    ? `${themeStorageKeyPrefix}-color-canvas-session`
    : "gallery-color-canvas-session"

  const [sessions, setSessions] = useLocalStorage<Record<
    string,
    { id: string; name: string; state: ColorCanvasState; updatedAt: string }
  >>(sessionsKey, {})
  const [activeSessionId, setActiveSessionId] = useLocalStorage<string>(activeSessionKey, "")
  const [contrastRules, setContrastRules] = useLocalStorage<ContrastRule[]>(
    themeStorageKeyPrefix
      ? `${themeStorageKeyPrefix}-color-canvas-contrast-rules`
      : "gallery-color-canvas-contrast-rules",
    DEFAULT_CONTRAST_RULES
  )
  const [autoContrastEnabled, setAutoContrastEnabled] = useLocalStorage<boolean>(
    themeStorageKeyPrefix
      ? `${themeStorageKeyPrefix}-color-canvas-contrast-auto`
      : "gallery-color-canvas-contrast-auto",
    true
  )

  const emptyState: ColorCanvasState = {
    nodes: [],
    edges: [],
    selectedNodeId: null,
    selectedEdgeId: null,
    edgeUndoStack: [],
  }
  const [themePanelVisible, setThemePanelVisible] = useState(false)
  const [edgeFilter, setEdgeFilter] = useState<EdgeFilter>("all")
  const [panelMode, setPanelMode] = useState<"inspector" | "audit">("inspector")

  const colorTokens = useMemo(
    () => tokens.filter((token) => token.category === "color"),
    [tokens]
  )

  const {
    themes,
    activeThemeId,
    setActiveThemeId,
    setThemes,
    tokenValues,
    getTokenValuesForTheme,
    addTheme,
    updateThemeVar,
  } = useThemeRegistry({
      storageKeyPrefix: themeStorageKeyPrefix,
      tokens,
      defaultThemes: [
        {
          id: "thicket",
          label: "Thicket",
          description: "Default gallery theme",
          vars: {},
          groupId: "thicket",
        },
        {
          id: "thicket-light",
          label: "Light UI",
          description: "Thicket preset",
          vars: {},
          groupId: "thicket",
        },
        {
          id: "thicket-dark",
          label: "Dark UI",
          description: "Thicket preset",
          vars: {},
          groupId: "thicket",
        },
      ],
      rootRef,
    })

  const {
    nodes,
    edges,
    state,
    selectedNodeId,
    selectedEdgeId,
    addTokenNode,
    addSemanticNode,
    addComponentNode,
    addTypedEdge,
    addEdge,
    addNode,
    removeNode,
    removeEdge,
    undoRemoveEdge,
    canUndoEdgeRemoval,
    updateEdgeRule,
    selectNode,
    selectEdge,
    moveNode,
    updateNode,
    updateNodeLabel,
    updateNodeValue,
    updateNodeRole,
    clearSelection,
    replaceState,
  } = useColorCanvasState(
    themeStorageKeyPrefix
      ? `${themeStorageKeyPrefix}-color-canvas`
      : "gallery-color-canvas"
  )

  const filteredTokens = useMemo(() => {
    if (!tokenQuery.trim()) return colorTokens
    const lower = tokenQuery.trim().toLowerCase()
    return colorTokens.filter((token) => {
      const haystack = [token.label, token.cssVar, token.subcategory].join(" ").toLowerCase()
      return haystack.includes(lower)
    })
  }, [colorTokens, tokenQuery])

  const getNextCustomCssVar = useCallback(
    (prefix: string) => {
      const base = `--color-${prefix}`
      if (!nodes.some((node) => node.cssVar === base)) return base
      let index = 2
      while (nodes.some((node) => node.cssVar === `${base}-${index}`)) {
        index += 1
      }
      return `${base}-${index}`
    },
    [nodes]
  )

  const getNextCssVarFrom = useCallback(
    (cssVar?: string) => {
      if (!cssVar) return undefined
      if (!nodes.some((node) => node.cssVar === cssVar)) return cssVar
      let index = 2
      let candidate = `${cssVar}-${index}`
      while (nodes.some((node) => node.cssVar === candidate)) {
        index += 1
        candidate = `${cssVar}-${index}`
      }
      return candidate
    },
    [nodes]
  )

  const supportsRelativeColor = useMemo(() => {
    if (typeof CSS === "undefined" || typeof CSS.supports !== "function") return false
    return CSS.supports("color", "oklch(from white l c h)")
  }, [])
  const supportsDisplayP3 = useMemo(() => {
    if (typeof CSS === "undefined" || typeof CSS.supports !== "function") return false
    return CSS.supports("color", "color(display-p3 1 1 1)")
  }, [])

  const resolveCssColor = useCallback((value: string): string | null => {
    if (!value) return null
    if (typeof window === "undefined") return null
    const trimmed = value.trim()
    if (
      typeof CSS !== "undefined" &&
      typeof CSS.supports === "function" &&
      !trimmed.startsWith("var(") &&
      !CSS.supports("color", trimmed)
    ) {
      return null
    }
    const probe = colorProbeRef.current
    if (!probe) return null
    probe.style.color = value
    const computed = getComputedStyle(probe).color
    return computed || null
  }, [])

  useEffect(() => {
    if (Object.keys(sessions).length === 0) {
      const id = `session-${Date.now()}`
      setSessions({
        [id]: {
          id,
          name: "Session 1",
          state: state ?? emptyState,
          updatedAt: new Date().toISOString(),
        },
      })
      setActiveSessionId(id)
      return
    }
    if (activeSessionId && sessions[activeSessionId]) return
    const [firstId] = Object.keys(sessions)
    if (firstId) {
      setActiveSessionId(firstId)
      replaceState(sessions[firstId].state)
    }
  }, [activeSessionId, emptyState, replaceState, sessions, setActiveSessionId, setSessions, state])

  const upsertNode = useCallback(
    (config: {
      type: ColorCanvasNode["type"]
      cssVar?: string
      label: string
      value?: string
      role?: ColorCanvasNode["role"]
      relative?: ColorCanvasNode["relative"]
      position?: { x: number; y: number }
    }) => {
      const existing = config.cssVar
        ? nodes.find((node) => node.cssVar === config.cssVar && node.type === config.type)
        : nodes.find((node) => node.label === config.label && node.type === config.type)
      if (existing) {
        updateNode(existing.id, {
          label: config.label,
          value: config.value ?? existing.value,
          cssVar: config.cssVar ?? existing.cssVar,
          role: config.role ?? existing.role,
          relative: config.relative ?? existing.relative,
        })
        return existing.id
      }
      return addNode({
        type: config.type,
        label: config.label,
        cssVar: config.cssVar,
        value: config.value,
        role: config.role,
        relative: config.relative,
        position: config.position ?? getNextPosition(nodes),
      })
    },
    [addNode, nodes, updateNode]
  )

  const nodesById = useMemo(() => {
    return nodes.reduce<Record<string, ColorCanvasNode>>((acc, node) => {
      acc[node.id] = node
      return acc
    }, {})
  }, [nodes])

  const normalizeChromaValue = useCallback((value: number) => normalizeRelativeChroma(value), [])

  const buildRelativeExpression = useCallback(
    (baseExpression: string, node: ColorCanvasNode) => {
      if (node.type !== "relative") return null
      const spec = node.relative ?? {}
      const model = spec.model ?? DEFAULT_COLOR_MODEL
      if (model !== "oklch") return null

      const channel = (
        mode: string | undefined,
        value: number | undefined,
        keyword: string,
        formatter: (value: number) => string
      ) => {
        if (!mode || mode === "inherit") return keyword
        if (value === undefined || Number.isNaN(value)) return keyword
        const formatted = formatter(value)
        if (mode === "absolute") return formatted
        return `calc(${keyword} + ${formatted})`
      }

      const l = channel(spec.lMode, spec.lValue, "l", (val) => `${val}%`)
      const c = channel(spec.cMode, spec.cValue, "c", (val) => `${normalizeChromaValue(val)}`)
      const h = channel(spec.hMode, spec.hValue, "h", (val) => `${val}deg`)
      const a = channel(spec.alphaMode, spec.alphaValue, "alpha", (val) => `${val}%`)

      return `oklch(from ${baseExpression} ${l} ${c} ${h} / ${a})`
    },
    [normalizeChromaValue]
  )

  const getNodeColorExpression = useCallback(
    (nodeId: string, visited = new Set<string>()): string | null => {
      if (visited.has(nodeId)) return null
      visited.add(nodeId)

      const node = nodesById[nodeId]
      if (!node) return null

      if (node.type === "token") {
        if (node.value) return node.value
        if (node.cssVar) return `var(${node.cssVar})`
        return null
      }

      if (node.type === "semantic") {
        if (node.value) return node.value
        const mappingEdge = edges.find(
          (edge) => edge.type === "map" && edge.targetId === node.id
        )
        if (mappingEdge) {
          return getNodeColorExpression(mappingEdge.sourceId, visited)
        }
        return node.value ?? null
      }

      if (node.type === "relative") {
        if (node.value) {
          return node.value
        }
        const baseId = node.relative?.baseId
        const baseExpression = baseId
          ? getNodeColorExpression(baseId, visited)
          : null
        if (!baseExpression) return null
        return buildRelativeExpression(baseExpression, node)
      }

      return node.value ?? null
    },
    [buildRelativeExpression, edges, nodesById]
  )

  const resolveExpressionColor = useCallback(
    (expression: string): RGBA | null => {
      if (expression.startsWith("color(display-p3")) {
        const p3 = parseDisplayP3(expression)
        if (p3) return displayP3ToSrgb(p3)
      }
      const resolved = resolveCssColor(expression)
      if (resolved) return parseColor(resolved)
      const parsed = parseColor(expression)
      if (parsed) return parsed
      const oklch = parseOklch(expression)
      if (oklch) return oklchToSrgb(oklch)
      return null
    },
    [resolveCssColor]
  )

  const resolveNodeOklch = useCallback(
    (
      nodeId: string,
      visited = new Set<string>()
    ): { l: number; c: number; h: number; a: number } | null => {
      if (visited.has(nodeId)) return null
      visited.add(nodeId)
      const node = nodesById[nodeId]
      if (!node) return null

      const parseToOklch = (value: string) => {
        const parsed = parseOklch(value)
        if (parsed) return parsed
        if (value.startsWith("color(display-p3")) {
          const p3 = parseDisplayP3(value)
          if (p3) {
            const oklch = srgbToOklch(displayP3ToSrgb(p3))
            if (oklch) return { ...oklch, a: p3.a }
          }
        }
        const rgba = resolveExpressionColor(value)
        if (rgba) {
          const oklch = srgbToOklch(rgba)
          if (oklch) return { ...oklch, a: rgba.a }
        }
        return null
      }

      if (node.type === "token") {
        if (node.value) return parseToOklch(node.value)
        if (node.cssVar) {
          const resolved = resolveCssColor(`var(${node.cssVar})`)
          if (!resolved) return null
          const rgba = parseColor(resolved)
          if (!rgba) return null
          const oklch = srgbToOklch(rgba)
          if (!oklch) return null
          return { ...oklch, a: rgba.a }
        }
        return null
      }

      if (node.type === "semantic") {
        if (node.value) return parseToOklch(node.value)
        const mappingEdge = edges.find(
          (edge) => edge.type === "map" && edge.targetId === node.id
        )
        if (mappingEdge) {
          return resolveNodeOklch(mappingEdge.sourceId, visited)
        }
        return null
      }

      if (node.type === "relative") {
        if (node.value) {
          const override = parseToOklch(node.value)
          if (override) return override
        }
        const baseId = node.relative?.baseId
        if (!baseId) return null
        const base = resolveNodeOklch(baseId, visited)
        if (!base) return null
        const spec = node.relative ?? {}
        return resolveRelativeOklch(base, spec)
      }

      return null
    },
    [edges, nodesById, resolveCssColor, resolveExpressionColor]
  )

  const resolveNodeRgba = useCallback(
    (nodeId: string, visited = new Set<string>()): RGBA | null => {
      if (visited.has(nodeId)) return null
      visited.add(nodeId)

      const node = nodesById[nodeId]
      if (!node) return null

      if (node.type === "token") {
        if (node.value) return resolveExpressionColor(node.value)
        if (node.cssVar) return resolveExpressionColor(`var(${node.cssVar})`)
        return null
      }

      if (node.type === "semantic") {
        if (node.value) return resolveExpressionColor(node.value)
        const mappingEdge = edges.find(
          (edge) => edge.type === "map" && edge.targetId === node.id
        )
        if (mappingEdge) {
          return resolveNodeRgba(mappingEdge.sourceId, visited)
        }
        return null
      }

      if (node.type === "relative") {
        if (node.value) {
          const override = resolveExpressionColor(node.value)
          if (override) return override
        }
        const oklch = resolveNodeOklch(node.id)
        if (!oklch) return null
        const rgb = oklchToSrgb(oklch)
        if (!rgb) return null
        return { ...rgb, a: oklch.a }
      }

      return null
    },
    [edges, nodesById, resolveExpressionColor, resolveNodeOklch]
  )

  const getNodeColor = useCallback(
    (nodeId: string): string | null => {
      const expression = getNodeColorExpression(nodeId)
      if (expression?.startsWith("color(display-p3")) {
        return expression
      }
      const oklch = resolveNodeOklch(nodeId)
      if (oklch) {
        const linearSrgb = oklchToLinearSrgb(oklch)
        if (supportsDisplayP3 && isOutOfGamut(linearSrgb)) {
          return oklchToDisplayP3Css(oklch)
        }
        const rgb = oklchToSrgb(oklch)
        if (rgb) return rgbaToCss({ ...rgb, a: oklch.a })
      }
      if (expression) {
        const resolved = resolveCssColor(expression)
        if (resolved) return resolved
      }
      const fallback = resolveNodeRgba(nodeId)
      if (fallback) return rgbaToCss(fallback)
      if (expression && parseColor(expression)) return expression
      return null
    },
    [getNodeColorExpression, resolveCssColor, resolveNodeOklch, resolveNodeRgba, supportsDisplayP3]
  )

  const getNodeIsP3 = useCallback(
    (nodeId: string) => {
      const expression = getNodeColorExpression(nodeId)
      if (expression?.startsWith("color(display-p3")) return true
      const oklch = resolveNodeOklch(nodeId)
      if (!oklch) return false
      return isOutOfGamut(oklchToLinearSrgb(oklch))
    },
    [getNodeColorExpression, resolveNodeOklch]
  )

  const getNodeLabel = useCallback(
    (nodeId: string) => nodesById[nodeId]?.label || nodeId,
    [nodesById]
  )

  const getEdgeContrastRaw = useCallback(
    (sourceId: string, targetId: string) => {
      const sourceRgba = resolveNodeRgba(sourceId)
      const targetRgba = resolveNodeRgba(targetId)
      if (!sourceRgba || !targetRgba) {
        const sourceFallback = getNodeColor(sourceId)
        const targetFallback = getNodeColor(targetId)
        if (!sourceFallback || !targetFallback) return null
        return apcaContrast(sourceFallback, targetFallback)
      }
      return apcaContrast(rgbaToCss(sourceRgba), rgbaToCss(targetRgba))
    },
    [getNodeColor, resolveNodeRgba]
  )

  const getEdgeContrast = useCallback(
    (edge: ColorCanvasEdge) => {
      if (edge.type !== "contrast") return null
      const source = nodesById[edge.sourceId]
      const target = nodesById[edge.targetId]
      if (!source || !target) return null

      let textNode = source
      let surfaceNode = target

      if (source.role === "surface" || target.role === "text") {
        textNode = target
        surfaceNode = source
      }

      return getEdgeContrastRaw(textNode.id, surfaceNode.id)
    },
    [getEdgeContrastRaw, nodesById]
  )

  const getEdgeContrastPair = useCallback(
    (edge: DisplayEdge) => ({
      forward: getEdgeContrastRaw(edge.sourceId, edge.targetId),
      reverse: getEdgeContrastRaw(edge.targetId, edge.sourceId),
    }),
    [getEdgeContrastRaw]
  )

  const getEdgeTarget = useCallback(
    (edge: ColorCanvasEdge) => edge.rule?.targetLc ?? DEFAULT_CONTRAST_TARGET_LC,
    []
  )

  const handleAddToken = (token: ThemeToken) => {
    const position = getNextPosition(nodes)
    addTokenNode(token.label, token.cssVar, position)
  }

  const handleAddCustomToken = () => {
    const position = getNextPosition(nodes)
    addNode({
      type: "token",
      label: "Custom Token",
      cssVar: getNextCustomCssVar("custom"),
      value: "",
      position,
    })
  }

  const handleAddRelativeToken = () => {
    const position = getNextPosition(nodes)
    addNode({
      type: "relative",
      label: "Relative Token",
      cssVar: getNextCustomCssVar("relative"),
      position,
      relative: {
        model: DEFAULT_COLOR_MODEL,
        lMode: "inherit",
        cMode: "inherit",
        hMode: "inherit",
        alphaMode: "inherit",
      },
    })
  }

  const handleGenerateTemplate = () => {
    const brandValue = templateBrand.trim()
    if (!brandValue) return
    let offset = 0
    const positionFor = () => {
      const baseX = 120
      const baseY = 80
      const spacingX = 220
      const spacingY = 120
      const index = nodes.length + offset
      offset += 1
      const col = index % 3
      const row = Math.floor(index / 3)
      return {
        x: baseX + col * spacingX,
        y: baseY + row * spacingY,
      }
    }

    const brandBaseId = upsertNode({
      type: "token",
      label: "Brand 500",
      cssVar: "--color-brand-500",
      value: brandValue,
      position: positionFor(),
    })

    const brandScale = [
      { cssVar: "--color-brand-300", label: "Brand 300", l: 16, c: -4 },
      { cssVar: "--color-brand-400", label: "Brand 400", l: 8, c: -2 },
      { cssVar: "--color-brand-600", label: "Brand 600", l: -6, c: -3 },
      { cssVar: "--color-brand-700", label: "Brand 700", l: -12, c: -5 },
    ]

    brandScale.forEach((entry) => {
      upsertNode({
        type: "relative",
        label: entry.label,
        cssVar: entry.cssVar,
        position: positionFor(),
        relative: {
          model: DEFAULT_COLOR_MODEL,
          baseId: brandBaseId,
          lMode: "delta",
          lValue: entry.l,
          cMode: "delta",
          cValue: entry.c,
          hMode: "inherit",
          alphaMode: "inherit",
        },
      })
    })

    const surfaceScale = [
      { cssVar: "--color-surface-50", label: "Surface 50", l: 98, c: 2 },
      { cssVar: "--color-surface-100", label: "Surface 100", l: 96, c: 3 },
      { cssVar: "--color-surface-200", label: "Surface 200", l: 92, c: 4 },
    ]

    surfaceScale.forEach((entry) => {
      upsertNode({
        type: "relative",
        label: entry.label,
        cssVar: entry.cssVar,
        position: positionFor(),
        relative: {
          model: DEFAULT_COLOR_MODEL,
          baseId: brandBaseId,
          lMode: "absolute",
          lValue: entry.l,
          cMode: "absolute",
          cValue: entry.c,
          hMode: "inherit",
          alphaMode: "inherit",
        },
      })
    })

    const textScale = [
      { cssVar: "--color-foreground", label: "Text Primary", l: 20 },
      { cssVar: "--color-muted-foreground", label: "Text Secondary", l: 40 },
    ]

    textScale.forEach((entry) => {
      upsertNode({
        type: "relative",
        label: entry.label,
        cssVar: entry.cssVar,
        position: positionFor(),
        relative: {
          model: DEFAULT_COLOR_MODEL,
          baseId: brandBaseId,
          lMode: "absolute",
          lValue: entry.l,
          cMode: "absolute",
          cValue: 0,
          hMode: "inherit",
          alphaMode: "inherit",
        },
      })
    })

    const accentValue = templateAccent.trim()
    if (accentValue) {
      const accentBaseId = upsertNode({
        type: "token",
        label: "Accent 500",
        cssVar: "--color-accent-500",
        value: accentValue,
        position: positionFor(),
      })

      const accentScale = [
        { cssVar: "--color-accent-400", label: "Accent 400", l: 8, c: -2 },
        { cssVar: "--color-accent-600", label: "Accent 600", l: -6, c: -3 },
      ]
      accentScale.forEach((entry) => {
        upsertNode({
          type: "relative",
          label: entry.label,
          cssVar: entry.cssVar,
          position: positionFor(),
          relative: {
            model: DEFAULT_COLOR_MODEL,
            baseId: accentBaseId,
            lMode: "delta",
            lValue: entry.l,
            cMode: "delta",
            cValue: entry.c,
            hMode: "inherit",
            alphaMode: "inherit",
          },
        })
      })
    }

    const accentSemanticId = upsertNode({
      type: "semantic",
      label: "Accent / Primary",
      role: "accent",
      position: positionFor(),
    })
    ensureEdge(brandBaseId, accentSemanticId, "map")
  }

  const handleSaveSession = () => {
    if (!activeSessionId) return
    const current = sessions[activeSessionId]
    setSessions((prev) => ({
      ...prev,
      [activeSessionId]: {
        id: activeSessionId,
        name: current?.name || "Session",
        state: state ?? emptyState,
        updatedAt: new Date().toISOString(),
      },
    }))
  }

  const handleNewSession = () => {
    const nextIndex = Object.keys(sessions).length + 1
    const id = `session-${Date.now()}`
    const name = `Session ${nextIndex}`
    setSessions((prev) => ({
      ...prev,
      [id]: {
        id,
        name,
        state: emptyState,
        updatedAt: new Date().toISOString(),
      },
    }))
    setActiveSessionId(id)
    replaceState(emptyState)
  }

  const handleClearSession = () => {
    replaceState(emptyState)
    if (!activeSessionId) return
    setSessions((prev) => ({
      ...prev,
      [activeSessionId]: {
        id: activeSessionId,
        name: prev[activeSessionId]?.name || "Session",
        state: emptyState,
        updatedAt: new Date().toISOString(),
      },
    }))
  }

  const handleDeleteSession = () => {
    if (!activeSessionId) return
    setSessions((prev) => {
      const next = { ...prev }
      delete next[activeSessionId]
      return next
    })
    const remaining = Object.keys(sessions).filter((id) => id !== activeSessionId)
    if (remaining.length > 0) {
      const nextId = remaining[0]
      setActiveSessionId(nextId)
      replaceState(sessions[nextId].state)
    } else {
      handleNewSession()
    }
  }

  const handleAddSemantic = (preset: { label: string; role: ColorCanvasNode["role"] }) => {
    const position = getNextPosition(nodes)
    addSemanticNode(preset.label, preset.role, position)
  }

  const handleWorkspaceClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-color-node='true']")) return
    clearSelection()
    setConnectSourceId(null)
    setSelectedAutoEdgeId(null)
  }

  const handleNodeClick = (nodeId: string) => {
    selectNode(nodeId)
    setSelectedAutoEdgeId(null)
  }

  const handleConnectTarget = (nodeId: string) => {
    if (!connectMode) return

    if (!connectSourceId) {
      setConnectSourceId(nodeId)
      return
    }

    if (connectSourceId === nodeId) {
      setConnectSourceId(null)
      return
    }

    const sourceNode = nodesById[connectSourceId]
    const targetNode = nodesById[nodeId]
    if (!sourceNode || !targetNode) return

    if (connectMode === "map") {
      let sourceId = connectSourceId
      let targetId = nodeId

      if (sourceNode.type === "component" && targetNode.type === "semantic") {
        sourceId = nodeId
        targetId = connectSourceId
      }

      if (sourceNode.type === "semantic" && (targetNode.type === "token" || targetNode.type === "relative")) {
        sourceId = nodeId
        targetId = connectSourceId
      }

      addTypedEdge(sourceId, targetId, "map")
      setConnectSourceId(null)
      return
    }

    if (connectMode === "contrast") {
      addTypedEdge(connectSourceId, nodeId, "contrast")
      setConnectSourceId(null)
      return
    }
  }

  const handleConnectStart = (nodeId: string, event: React.PointerEvent) => {
    if (!connectMode) return
    event.preventDefault()
    event.stopPropagation()
    setConnectSourceId(nodeId)
    const rect = workspaceRef.current?.getBoundingClientRect()
    if (rect) {
      setConnectDrag({
        active: true,
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      })
    } else {
      setConnectDrag({ active: true, x: event.clientX, y: event.clientY })
    }
  }

  const handleEdgeBadgeClick = (edge: DisplayEdge) => {
    if (edge.auto) {
      selectEdge(null)
      setSelectedAutoEdgeId(edge.id)
      return
    }
    setSelectedAutoEdgeId(null)
    selectEdge(edge.id)
  }

  const handleEdgeFilterChange = (nextFilter: EdgeFilter) => {
    setEdgeFilter(nextFilter)
    if (selectedEdgeId) {
      const selected = edges.find((edge) => edge.id === selectedEdgeId)
      if (selected && nextFilter !== "all" && selected.type !== nextFilter) {
        selectEdge(null)
      }
    }
    if (selectedAutoEdgeId && nextFilter === "map") {
      setSelectedAutoEdgeId(null)
    }
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable) {
        return
      }
      if ((event.key === "Backspace" || event.key === "Delete") && selectedEdgeId) {
        event.preventDefault()
        removeEdge(selectedEdgeId)
        return
      }
      const isUndo = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z"
      if (isUndo && canUndoEdgeRemoval) {
        event.preventDefault()
        undoRemoveEdge()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedEdgeId, removeEdge, undoRemoveEdge, canUndoEdgeRemoval])

  const selectedNode = selectedNodeId ? nodesById[selectedNodeId] : null
  const manualEdges = useMemo<DisplayEdge[]>(
    () => edges.map((edge) => ({ ...edge, auto: false })),
    [edges]
  )
  const selectedEdge = selectedEdgeId
    ? manualEdges.find((edge) => edge.id === selectedEdgeId) ?? null
    : null
  const selectedPreviewColor = selectedNode ? getNodeColor(selectedNode.id) : null
  const selectedPreviewIsP3 = selectedNode ? getNodeIsP3(selectedNode.id) : false
  const relativeSpec =
    selectedNode?.type === "relative"
      ? { ...DEFAULT_RELATIVE_SPEC, ...(selectedNode.relative ?? {}) }
      : null
  const autoContrastEdges = useMemo<DisplayEdge[]>(() => {
    if (!autoContrastEnabled) return []
    const activeRules = contrastRules.filter((rule) => rule.enabled)
    if (activeRules.length === 0) return []
    const manualContrastEdges = manualEdges.filter((edge) => edge.type === "contrast")
    const manualPairKeys = new Set(
      manualContrastEdges.map((edge) =>
        [edge.sourceId, edge.targetId].sort().join("|")
      )
    )
    const seen = new Set<string>()
    const nextEdges: DisplayEdge[] = []
    activeRules.forEach((rule) => {
      const foregroundNodes = nodes.filter(
        (node) => node.type !== "component" && nodeMatchesRole(node, rule.foregroundRole)
      )
      const backgroundNodes = nodes.filter(
        (node) => node.type !== "component" && nodeMatchesRole(node, rule.backgroundRole)
      )
      foregroundNodes.forEach((foreground) => {
        backgroundNodes.forEach((background) => {
          if (foreground.id === background.id) return
          const pairKey = [foreground.id, background.id].sort().join("|")
          if (manualPairKeys.has(pairKey)) return
          const edgeId = `auto-${rule.id}-${foreground.id}-${background.id}`
          if (seen.has(edgeId)) return
          seen.add(edgeId)
          nextEdges.push({
            id: edgeId,
            sourceId: foreground.id,
            targetId: background.id,
            type: "contrast",
            rule: { model: DEFAULT_COLOR_MODEL, targetLc: rule.targetLc },
            auto: true,
            ruleId: rule.id,
          })
        })
      })
    })
    return nextEdges
  }, [autoContrastEnabled, contrastRules, manualEdges, nodeMatchesRole, nodes])

  const resolvedSelectedAutoEdge = useMemo(() => {
    if (!selectedAutoEdgeId) return null
    return autoContrastEdges.find((edge) => edge.id === selectedAutoEdgeId) ?? null
  }, [autoContrastEdges, selectedAutoEdgeId])

  const selectedEdgeData = resolvedSelectedAutoEdge ?? selectedEdge

  const visibleEdges: DisplayEdge[] = useMemo(() => {
    const manual =
      edgeFilter === "all"
        ? manualEdges
        : manualEdges.filter((edge) => edge.type === edgeFilter)
    if (edgeFilter === "map") return manual
    if (autoContrastEdges.length === 0) return manual
    return [...manual, ...autoContrastEdges]
  }, [autoContrastEdges, edgeFilter, manualEdges])

  const contrastEdges: DisplayEdge[] = useMemo(() => {
    const manual = manualEdges.filter((edge) => edge.type === "contrast")
    return [...manual, ...autoContrastEdges]
  }, [autoContrastEdges, manualEdges])
  const nodeContrastEdges = useMemo(() => {
    if (!selectedNode) return []
    return contrastEdges.filter(
      (edge) => edge.sourceId === selectedNode.id || edge.targetId === selectedNode.id
    )
  }, [contrastEdges, selectedNode])
  const dependencyEdges = useMemo(() => {
    return nodes
      .filter((node) => node.type === "relative" && node.relative?.baseId)
      .map((node) => ({
        id: `dependency-${node.id}`,
        sourceId: node.relative?.baseId as string,
        targetId: node.id,
      }))
  }, [nodes])

  const ensureEdge = useCallback(
    (
      sourceId: string,
      targetId: string,
      type: ColorCanvasEdge["type"],
      rule?: ColorCanvasEdge["rule"]
    ) => {
      const exists = edges.some((edge) => {
        if (edge.type !== type) return false
        if (edge.sourceId === sourceId && edge.targetId === targetId) return true
        if (type === "contrast" && edge.sourceId === targetId && edge.targetId === sourceId) return true
        return false
      })
      if (exists) return
      addEdge({ sourceId, targetId, type, rule })
    },
    [addEdge, edges]
  )

  const handleQuickConnect = useCallback(
    (roleA: NonNullable<ColorCanvasNode["role"]>, roleB: NonNullable<ColorCanvasNode["role"]>) => {
      const roleNodesA = nodes.filter(
        (node) => node.type !== "component" && nodeMatchesRole(node, roleA)
      )
      const roleNodesB = nodes.filter(
        (node) => node.type !== "component" && nodeMatchesRole(node, roleB)
      )
      roleNodesA.forEach((source) => {
        roleNodesB.forEach((target) => {
          if (source.id === target.id) return
          ensureEdge(source.id, target.id, "contrast", {
            model: DEFAULT_COLOR_MODEL,
            targetLc: DEFAULT_CONTRAST_TARGET_LC,
          })
        })
      })
    },
    [ensureEdge, nodeMatchesRole, nodes]
  )

  const handleApplyToTheme = useCallback(() => {
    if (!activeThemeId) return
    const updates: Array<{ cssVar: string; value: string }> = []

    nodes.forEach((node) => {
      if (!node.cssVar) return
      if (node.type === "relative") {
        const expression = getNodeColorExpression(node.id)
        if (expression) updates.push({ cssVar: node.cssVar, value: expression })
        return
      }
      if (node.type === "token" && node.value) {
        updates.push({ cssVar: node.cssVar, value: node.value })
      }
    })

    updates.forEach((update) => updateThemeVar(activeThemeId, update.cssVar, update.value))
  }, [activeThemeId, getNodeColorExpression, nodes, updateThemeVar])

  const handleSaveThemeFromCanvas = useCallback(() => {
    const label = newThemeName.trim()
    const fallbackLabel = `Canvas Theme ${themes.length + 1}`
    const nextLabel = label || fallbackLabel
    const baseId = nextLabel
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "")
    let nextId = baseId || `theme-${themes.length + 1}`
    let counter = 2
    while (themes.some((theme) => theme.id === nextId)) {
      nextId = `${baseId || "theme"}-${counter}`
      counter += 1
    }

    const baseVars = getTokenValuesForTheme(activeThemeId)
    const nextVars: Record<string, string> = { ...baseVars }
    nodes.forEach((node) => {
      if (!node.cssVar) return
      if (node.type === "relative") {
        const expression = getNodeColorExpression(node.id)
        if (expression) nextVars[node.cssVar] = expression
        return
      }
      if ((node.type === "token" || node.type === "semantic") && node.value) {
        nextVars[node.cssVar] = node.value
      }
    })

    const newTheme = {
      id: nextId,
      label: nextLabel,
      description: "From Color Canvas",
      vars: nextVars,
      groupId: nextId,
    }

    setThemes((prev) => [...prev, newTheme])
    setActiveThemeId(nextId)
    setNewThemeName("")
  }, [
    activeThemeId,
    getNodeColorExpression,
    getTokenValuesForTheme,
    newThemeName,
    nodes,
    setActiveThemeId,
    setThemes,
    themes,
  ])

  const resolveEdgeLabel = useCallback(
    (edge: DisplayEdge) => {
      const source = nodesById[edge.sourceId]
      const target = nodesById[edge.targetId]
      const fallback = `${source?.label ?? "Unknown"} → ${target?.label ?? "Unknown"}`
      if (!edge.auto) return fallback
      const rule = contrastRules.find((entry) => entry.id === edge.ruleId)
      return rule ? `${rule.label} · ${fallback}` : fallback
    },
    [contrastRules, nodesById]
  )

  const handleDuplicateNode = useCallback(
    (node: ColorCanvasNode) => {
      const offset = { x: node.position.x + 24, y: node.position.y + 24 }
      const baseLabel = node.label.endsWith(" copy") ? node.label : `${node.label} copy`
      const nextCssVar =
        node.type === "token" || node.type === "relative"
          ? getNextCssVarFrom(node.cssVar)
          : node.cssVar
      addNode({
        type: node.type,
        label: baseLabel,
        cssVar: nextCssVar,
        value: node.value,
        role: node.role,
        relative: node.relative,
        position: offset,
      })
    },
    [addNode, getNextCssVarFrom]
  )

  useEffect(() => {
    if (!connectDrag.active) return
    const handlePointerMove = (event: PointerEvent) => {
      const rect = workspaceRef.current?.getBoundingClientRect()
      if (rect) {
        setConnectDrag((prev) => ({
          ...prev,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        }))
      }
    }
    const handlePointerUp = (event: PointerEvent) => {
      const el = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null
      const nodeEl = el?.closest("[data-color-node='true']") as HTMLElement | null
      const targetId = nodeEl?.dataset.nodeId
      if (targetId) {
        handleConnectTarget(targetId)
      } else {
        setConnectSourceId(null)
      }
      setConnectDrag((prev) => ({ ...prev, active: false }))
    }
    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)
    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
    }
  }, [connectDrag.active, handleConnectTarget])

  return (
    <div
      ref={rootRef}
      className="flex h-full w-full bg-surface-100"
      data-theme={activeThemeId}
    >
      <aside className="flex w-72 flex-col border-r border-default bg-white">
        <div className="border-b border-default px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Color Canvas</h2>
              <p className="text-xs text-muted-foreground">Tokens + roles graph</p>
            </div>
            <button
              type="button"
              onClick={() => setThemePanelVisible(true)}
              className="rounded-md border border-default bg-white p-1.5 text-muted-foreground hover:bg-surface-50"
              aria-label="Open theme editor"
            >
              <Palette className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="border-b border-default px-4 py-3">
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Theme</label>
          <select
            value={activeThemeId}
            onChange={(e) => setActiveThemeId(e.target.value)}
            className="w-full rounded-md border border-default bg-white px-3 py-1.5 text-sm text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
          >
            {themes.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.label}
              </option>
            ))}
          </select>
          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleApplyToTheme}
              className="rounded-md border border-brand-200 bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100"
            >
              Apply to Theme
            </button>
            {!supportsRelativeColor && (
              <span className="text-[10px] font-medium text-amber-600">
                Relative colors not supported in this browser.
              </span>
            )}
          </div>
          <div className="mt-3 space-y-2 rounded-md border border-default bg-surface-50 px-2 py-2">
            <div className="text-[11px] font-medium text-muted-foreground">Save as new theme</div>
            <input
              type="text"
              value={newThemeName}
              onChange={(e) => setNewThemeName(e.target.value)}
              placeholder="Theme name"
              className="w-full rounded-md border border-default bg-white px-2 py-1 text-xs text-foreground"
            />
            <button
              type="button"
              onClick={handleSaveThemeFromCanvas}
              className="w-full rounded-md border border-default bg-white px-2 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-50"
            >
              Save theme from canvas
            </button>
          </div>
        </div>

        <div className="border-b border-default px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Sessions
            </h3>
            <span className="text-[11px] text-muted-foreground">
              {Object.keys(sessions).length}
            </span>
          </div>
          <select
            value={activeSessionId}
            onChange={(e) => {
              const nextId = e.target.value
              if (!nextId) return
              if (activeSessionId) {
                setSessions((prev) => ({
                  ...prev,
                  [activeSessionId]: {
                    id: activeSessionId,
                    name: prev[activeSessionId]?.name || "Session",
                    state: state ?? emptyState,
                    updatedAt: new Date().toISOString(),
                  },
                }))
              }
              setActiveSessionId(nextId)
              replaceState(sessions[nextId]?.state ?? emptyState)
            }}
            className="w-full rounded-md border border-default bg-white px-2 py-1.5 text-xs text-foreground"
          >
            {Object.values(sessions).map((session) => (
              <option key={session.id} value={session.id}>
                {session.name}
              </option>
            ))}
          </select>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSaveSession}
              className="rounded-md border border-default bg-white px-2 py-1 text-xs font-semibold text-foreground hover:bg-surface-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={handleNewSession}
              className="rounded-md border border-default bg-white px-2 py-1 text-xs font-semibold text-foreground hover:bg-surface-50"
            >
              New
            </button>
            <button
              type="button"
              onClick={handleClearSession}
              className="rounded-md border border-default bg-white px-2 py-1 text-xs font-semibold text-foreground hover:bg-surface-50"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleDeleteSession}
              className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
            >
              Delete
            </button>
          </div>
        </div>

        <div className="border-b border-default px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Theme Template
            </h3>
            <span className="text-[11px] text-muted-foreground">Brand seed</span>
          </div>
          <div className="space-y-2">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Brand color</label>
              <ColorPickerField
                value={templateBrand}
                onChange={setTemplateBrand}
                placeholder="e.g. #1d4ed8 or oklch(60% 0.18 240)"
                className="w-full rounded-md border border-default bg-white px-2 py-1.5 text-xs text-foreground"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Accent color (optional)</label>
              <ColorPickerField
                value={templateAccent}
                onChange={setTemplateAccent}
                placeholder="Optional secondary brand"
                className="w-full rounded-md border border-default bg-white px-2 py-1.5 text-xs text-foreground"
              />
            </div>
            <button
              type="button"
              onClick={handleGenerateTemplate}
              className="w-full rounded-md border border-default bg-white px-2 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-50"
            >
              Generate template nodes
            </button>
          </div>
        </div>

        <div className="border-b border-default px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tokens
            </h3>
            <span className="text-[11px] text-muted-foreground">{filteredTokens.length}</span>
          </div>
          <input
            type="text"
            value={tokenQuery}
            onChange={(e) => setTokenQuery(e.target.value)}
            placeholder="Filter color tokens"
            className="w-full rounded-md border border-default bg-white px-3 py-1.5 text-xs text-foreground placeholder:text-muted focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          <div className="space-y-2">
            {filteredTokens.map((token) => (
              <button
                key={token.cssVar}
                type="button"
                onClick={() => handleAddToken(token)}
                className="flex w-full items-center gap-2 rounded-md border border-default bg-white px-2 py-2 text-left text-xs text-foreground hover:bg-surface-50"
              >
                <span
                  className="h-4 w-4 rounded border border-default"
                  style={{
                    background: tokenValues[token.cssVar] || `var(${token.cssVar})`,
                  }}
                />
                <span className="flex-1 truncate font-medium">{token.label}</span>
                <Plus className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-2">
            <button
              type="button"
              onClick={handleAddCustomToken}
              className="flex w-full items-center gap-2 rounded-md border border-default bg-white px-2 py-2 text-left text-xs text-foreground hover:bg-surface-50"
            >
              <Plus className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="flex-1 truncate font-medium">Custom Token</span>
            </button>
            <button
              type="button"
              onClick={handleAddRelativeToken}
              className="flex w-full items-center gap-2 rounded-md border border-default bg-white px-2 py-2 text-left text-xs text-foreground hover:bg-surface-50"
            >
              <Plus className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="flex-1 truncate font-medium">Relative Token</span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                OKLCH
              </span>
            </button>
          </div>

          <div className="mt-6">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Semantic Roles
            </h3>
            <div className="space-y-2">
              {SEMANTIC_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleAddSemantic(preset)}
                  className="flex w-full items-center gap-2 rounded-md border border-default bg-white px-2 py-2 text-left text-xs text-foreground hover:bg-surface-50"
                >
                  <Type className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 truncate font-medium">{preset.label}</span>
                  <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Components
            </h3>
            <button
              type="button"
              onClick={() => addComponentNode("Button / Primary", getNextPosition(nodes))}
              className="flex w-full items-center gap-2 rounded-md border border-default bg-white px-2 py-2 text-left text-xs text-foreground hover:bg-surface-50"
            >
              <Move className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 truncate font-medium">Button / Primary</span>
              <Plus className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </aside>

      <main className="relative flex flex-1 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-default bg-white px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Connect mode:</span>
            <button
              type="button"
              onClick={() => {
                setConnectMode(connectMode === "map" ? null : "map")
                setConnectSourceId(null)
                setConnectDrag({ active: false, x: 0, y: 0 })
              }}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                connectMode === "map"
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-default text-muted-foreground hover:bg-surface-50"
              }`}
            >
              Token → Role
            </button>
            <button
              type="button"
              onClick={() => {
                setConnectMode(connectMode === "contrast" ? null : "contrast")
                setConnectSourceId(null)
                setConnectDrag({ active: false, x: 0, y: 0 })
              }}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                connectMode === "contrast"
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-default text-muted-foreground hover:bg-surface-50"
              }`}
            >
              Contrast
            </button>
            {connectMode && (
              <span className="text-[11px] text-muted-foreground">
                {connectSourceId ? "Select target (or drag)" : "Select source"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Quick connect:</span>
            <button
              type="button"
              onClick={() => handleQuickConnect("text", "surface")}
              className="rounded-full border border-default px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-surface-50"
            >
              Text ↔ Surface
            </button>
            <button
              type="button"
              onClick={() => handleQuickConnect("icon", "surface")}
              className="rounded-full border border-default px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-surface-50"
            >
              Icon ↔ Surface
            </button>
            <button
              type="button"
              onClick={() => handleQuickConnect("accent", "surface")}
              className="rounded-full border border-default px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-surface-50"
            >
              Accent ↔ Surface
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Edges:</span>
            {(["all", "map", "contrast"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => handleEdgeFilterChange(filter)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                  edgeFilter === filter
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-default text-muted-foreground hover:bg-surface-50"
                }`}
              >
                {filter === "all" ? "All" : filter === "map" ? "Map" : "Contrast"}
              </button>
            ))}
            <button
              type="button"
              onClick={undoRemoveEdge}
              disabled={!canUndoEdgeRemoval}
              className="flex items-center gap-2 rounded-full border border-default px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-surface-50 disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Undo
            </button>
            <button
              type="button"
              onClick={() => setShowDependencies((prev) => !prev)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                showDependencies
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-default text-muted-foreground hover:bg-surface-50"
              }`}
            >
              Dependencies
            </button>
            <button
              type="button"
              onClick={() => setAutoContrastEnabled((prev) => !prev)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                autoContrastEnabled
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-default text-muted-foreground hover:bg-surface-50"
              }`}
            >
              Auto contrast
            </button>
            <button
              type="button"
              onClick={() => setShowFullLabels((prev) => !prev)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                showFullLabels
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-default text-muted-foreground hover:bg-surface-50"
              }`}
            >
              Full labels
            </button>
          </div>
        </div>

        <div
          ref={workspaceRef}
          className="relative flex-1 overflow-hidden"
          onClick={handleWorkspaceClick}
        >
          <svg className="absolute inset-0 h-full w-full">
            {showDependencies &&
              dependencyEdges.map((edge) => {
                const source = nodesById[edge.sourceId]
                const target = nodesById[edge.targetId]
                if (!source || !target) return null
                const sourceSize = NODE_SIZES[source.type]
                const targetSize = NODE_SIZES[target.type]
                const x1 = source.position.x + sourceSize.width / 2
                const y1 = source.position.y + sourceSize.height / 2
                const x2 = target.position.x + targetSize.width / 2
                const y2 = target.position.y + targetSize.height / 2
                return (
                  <line
                    key={edge.id}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#94a3b8"
                    strokeWidth={1.5}
                    strokeDasharray="3 4"
                  />
                )
              })}
            {visibleEdges.map((edge) => {
              const source = nodesById[edge.sourceId]
              const target = nodesById[edge.targetId]
              if (!source || !target) return null
              const sourceSize = NODE_SIZES[source.type]
              const targetSize = NODE_SIZES[target.type]
              const x1 = source.position.x + sourceSize.width / 2
              const y1 = source.position.y + sourceSize.height / 2
              const x2 = target.position.x + targetSize.width / 2
              const y2 = target.position.y + targetSize.height / 2
              const stroke = edge.type === "map" ? "#a5b4fc" : "#f97316"
              return (
                <line
                  key={edge.id}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={stroke}
                  strokeWidth={2}
                  strokeDasharray={edge.type === "contrast" ? "6 4" : ""}
                />
              )
            })}
            {connectMode && connectSourceId && connectDrag.active && (() => {
              const source = nodesById[connectSourceId]
              if (!source) return null
              const sourceSize = NODE_SIZES[source.type]
              const x1 = source.position.x + sourceSize.width / 2
              const y1 = source.position.y + sourceSize.height / 2
              return (
                <line
                  x1={x1}
                  y1={y1}
                  x2={connectDrag.x}
                  y2={connectDrag.y}
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                />
              )
            })()}
          </svg>

          {visibleEdges.map((edge) => {
            const source = nodesById[edge.sourceId]
            const target = nodesById[edge.targetId]
            if (!source || !target) return null
            const sourceSize = NODE_SIZES[source.type]
            const targetSize = NODE_SIZES[target.type]
            const x1 = source.position.x + sourceSize.width / 2
            const y1 = source.position.y + sourceSize.height / 2
            const x2 = target.position.x + targetSize.width / 2
            const y2 = target.position.y + targetSize.height / 2
            const midX = (x1 + x2) / 2
            const midY = (y1 + y2) / 2
            const contrast = getEdgeContrast(edge)
            const label = edge.type === "contrast" ? formatLc(contrast) : "Map"
            const absValue = contrast ? Math.abs(contrast) : 0
            const badgeClass =
              edge.type === "contrast"
                ? absValue >= 60
                  ? "bg-emerald-100 text-emerald-700"
                  : absValue >= 30
                    ? "bg-amber-100 text-amber-700"
                    : "bg-rose-100 text-rose-700"
                : "bg-indigo-100 text-indigo-700"

            return (
              <button
                key={`${edge.id}-badge`}
                type="button"
                onClick={() => handleEdgeBadgeClick(edge)}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full px-2 py-1 text-[10px] font-semibold shadow-sm ${badgeClass}`}
                style={{ left: midX, top: midY }}
              >
                {label}
              </button>
            )
          })}

          {nodes.map((node) => (
            <ColorNode
              key={node.id}
              node={node}
              size={NODE_SIZES[node.type]}
              resolveColor={getNodeColor}
              resolveIsP3={getNodeIsP3}
              resolveExpression={getNodeColorExpression}
              resolveLabel={getNodeLabel}
              selected={selectedNodeId === node.id}
              connectActive={connectMode !== null}
              connectDragging={connectDrag.active}
              connectSourceId={connectSourceId}
              onMove={moveNode}
              onClick={handleNodeClick}
              onConnectStart={handleConnectStart}
              showFullLabels={showFullLabels}
            />
          ))}
        </div>
      </main>

      <aside className="flex w-72 flex-col border-l border-default bg-white">
        {themePanelVisible ? (
          <CanvasThemePanel
            themes={themes}
            activeThemeId={activeThemeId}
            onThemeChange={setActiveThemeId}
            onOpenColorCanvas={() => {}}
            onAddTheme={addTheme}
            onUpdateThemeVar={updateThemeVar}
            tokenValues={tokenValues}
            tokens={tokens}
            onClose={() => setThemePanelVisible(false)}
          />
        ) : (
          <div className="flex h-full flex-col">
            <div className="border-b border-default px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {panelMode === "audit" ? "Audit" : "Inspector"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {panelMode === "audit" ? "APCA contrast report" : "Node + edge details"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex rounded-full border border-default bg-white p-0.5 text-[10px] font-semibold">
                    {(["inspector", "audit"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setPanelMode(mode)}
                        className={`rounded-full px-2 py-0.5 ${
                          panelMode === mode
                            ? "bg-gray-900 text-white"
                            : "text-gray-600 hover:bg-surface-50"
                        }`}
                      >
                        {mode === "audit" ? "Audit" : "Inspect"}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setThemePanelVisible(true)}
                    className="rounded-md border border-default bg-white px-2 py-1 text-xs font-semibold text-foreground hover:bg-surface-50"
                  >
                    Themes
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 text-xs text-foreground">
              {panelMode === "audit" ? (
                <div className="space-y-3">
                  {contrastEdges.length === 0 ? (
                    <div className="rounded-md border border-dashed border-default bg-white px-3 py-2 text-xs text-muted-foreground">
                      Add contrast edges to see APCA status.
                    </div>
                  ) : (
                    contrastEdges.map((edge) => {
                      const contrast = getEdgeContrast(edge)
                      const target = getEdgeTarget(edge)
                      const status = getApcaStatus(contrast, target)
                      const statusClass =
                        status === "pass"
                          ? "bg-emerald-100 text-emerald-700"
                          : status === "fail"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-slate-100 text-slate-600"
                      const label = resolveEdgeLabel(edge)

                      return (
                        <button
                          key={edge.id}
                          type="button"
                          onClick={() => {
                            if (edge.auto) {
                              selectEdge(null)
                              setSelectedAutoEdgeId(edge.id)
                            } else {
                              setSelectedAutoEdgeId(null)
                              selectEdge(edge.id)
                            }
                            setPanelMode("inspector")
                          }}
                          className="flex w-full items-center justify-between gap-2 rounded-md border border-default bg-white px-3 py-2 text-left text-xs hover:bg-surface-50"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-xs font-semibold text-foreground">{label}</div>
                            <div className="text-[11px] text-muted-foreground">
                              Target Lc {target}
                            </div>
                          </div>
                          <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${statusClass}`}>
                            {formatLc(contrast)}
                          </span>
                        </button>
                      )
                    })
                  )}
                </div>
              ) : (
                <>
                  <div className="mb-4 rounded-md border border-default bg-white px-3 py-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-foreground">Contrast rules</div>
                        <div className="text-[11px] text-muted-foreground">
                          Auto edges based on roles
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAutoContrastEnabled((prev) => !prev)}
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                          autoContrastEnabled
                            ? "border-brand-500 bg-brand-50 text-brand-700"
                            : "border-default text-muted-foreground"
                        }`}
                      >
                        {autoContrastEnabled ? "On" : "Off"}
                      </button>
                    </div>
                    <div className="space-y-2">
                      {contrastRules.map((rule) => (
                        <div key={rule.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={rule.enabled}
                            disabled={!autoContrastEnabled}
                            onChange={(e) =>
                              setContrastRules((prev) =>
                                prev.map((entry) =>
                                  entry.id === rule.id
                                    ? { ...entry, enabled: e.target.checked }
                                    : entry
                                )
                              )
                            }
                          />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[11px] font-semibold text-foreground">
                              {rule.label}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {rule.foregroundRole} → {rule.backgroundRole}
                            </div>
                          </div>
                          <select
                            value={rule.targetLc}
                            disabled={!autoContrastEnabled}
                            onChange={(e) =>
                              setContrastRules((prev) =>
                                prev.map((entry) =>
                                  entry.id === rule.id
                                    ? { ...entry, targetLc: Number(e.target.value) }
                                    : entry
                                )
                              )
                            }
                            className="rounded-md border border-default bg-white px-2 py-1 text-[11px] text-foreground"
                          >
                            {APCA_TARGETS.map((target) => (
                              <option key={target} value={target}>
                                Lc {target}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>

                  {!selectedNode && !selectedEdgeData && (
                    <div className="rounded-md border border-dashed border-default bg-white px-3 py-2 text-xs text-muted-foreground">
                      Select a node or edge to inspect details.
                    </div>
                  )}

                  {selectedNode && (
                    <div className="space-y-3">
                      <div>
                        <div className="text-[11px] text-muted-foreground">Preview</div>
                        <div className="mt-1 flex items-center gap-2 rounded-md border border-default bg-surface-50 px-2 py-1">
                          <div
                            className="h-5 w-5 rounded border border-default"
                            style={{ background: selectedPreviewColor || "transparent" }}
                          />
                          <div className="min-w-0 flex-1 truncate text-[11px] font-mono text-foreground">
                            {selectedPreviewColor || "—"}
                          </div>
                          {selectedPreviewIsP3 && (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                              P3
                            </span>
                          )}
                        </div>
                        {!selectedPreviewColor && selectedNode.type === "relative" && !supportsRelativeColor && (
                          <div className="mt-1 text-[10px] text-amber-600">
                            Relative colors are not supported in this browser, so preview may be empty.
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Label</label>
                        <input
                          type="text"
                          value={selectedNode.label}
                          onChange={(e) => updateNodeLabel(selectedNode.id, e.target.value)}
                          className="w-full rounded-md border border-default bg-white px-2 py-1 text-xs text-foreground"
                        />
                      </div>
                      <div>
                        <div className="text-[11px] text-muted-foreground">Type</div>
                        <div className="text-xs font-semibold text-foreground">{selectedNode.type}</div>
                      </div>
                      <div>
                        <div className="text-[11px] text-muted-foreground">Contrast checks</div>
                        {nodeContrastEdges.length === 0 ? (
                          <div className="mt-1 rounded-md border border-dashed border-default bg-white px-2 py-1 text-[11px] text-muted-foreground">
                            No contrast edges for this node yet.
                          </div>
                        ) : (
                          <div className="mt-1 space-y-2">
                            {nodeContrastEdges.map((edge) => {
                              const pair = getEdgeContrastPair(edge)
                              const target = getEdgeTarget(edge)
                              const forwardStatus = getApcaStatus(pair.forward, target)
                              const reverseStatus = getApcaStatus(pair.reverse, target)
                              const forwardClass =
                                forwardStatus === "pass"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : forwardStatus === "fail"
                                    ? "bg-rose-100 text-rose-700"
                                    : "bg-slate-100 text-slate-600"
                              const reverseClass =
                                reverseStatus === "pass"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : reverseStatus === "fail"
                                    ? "bg-rose-100 text-rose-700"
                                    : "bg-slate-100 text-slate-600"
                              const source = nodesById[edge.sourceId]
                              const targetNode = nodesById[edge.targetId]
                              const forwardLabel = `${source?.label ?? "Unknown"} → ${targetNode?.label ?? "Unknown"}`
                              const reverseLabel = `${targetNode?.label ?? "Unknown"} → ${source?.label ?? "Unknown"}`
                              const isPrimary =
                                edge.auto
                                  ? edge.sourceId === selectedNode.id
                                  : edge.sourceId === selectedNode.id
                              return (
                                <button
                                  key={edge.id}
                                  type="button"
                                  onClick={() => {
                                    if (edge.auto) {
                                      selectEdge(null)
                                      setSelectedAutoEdgeId(edge.id)
                                    } else {
                                      setSelectedAutoEdgeId(null)
                                      selectEdge(edge.id)
                                    }
                                  }}
                                  className="w-full rounded-md border border-default bg-white px-2 py-2 text-left text-[11px] hover:bg-surface-50"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="truncate text-xs font-semibold text-foreground">
                                      {resolveEdgeLabel(edge)}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground">Required Lc {target}</div>
                                  </div>
                                  <div className="mt-1 flex flex-wrap items-center gap-2">
                                    <span
                                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${forwardClass}`}
                                    >
                                      {formatLc(pair.forward)}
                                    </span>
                                    <span className={`text-[10px] ${isPrimary ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                                      Actual (Fg→Bg): {forwardLabel}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                      {forwardStatus === "pass" ? "Pass" : forwardStatus === "fail" ? "Fail" : "—"}
                                    </span>
                                  </div>
                                  <div className="mt-1 flex flex-wrap items-center gap-2">
                                    <span
                                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${reverseClass}`}
                                    >
                                      {formatLc(pair.reverse)}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                      Actual (Bg→Fg): {reverseLabel}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                      {reverseStatus === "pass" ? "Pass" : reverseStatus === "fail" ? "Fail" : "—"}
                                    </span>
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-[11px] text-muted-foreground">Resolved expression</div>
                        <div className="rounded-md border border-default bg-surface-50 px-2 py-1 text-[11px] font-mono text-foreground">
                          {getNodeColorExpression(selectedNode.id) || "—"}
                        </div>
                      </div>
                      {selectedNode.type !== "component" && (
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Role</label>
                          <select
                            value={selectedNode.role || ""}
                            onChange={(e) =>
                              updateNodeRole(selectedNode.id, e.target.value as ColorCanvasNode["role"])
                            }
                            className="w-full rounded-md border border-default bg-white px-2 py-1 text-xs text-foreground"
                          >
                            <option value="">Unspecified</option>
                            <option value="text">Text</option>
                            <option value="surface">Surface</option>
                            <option value="border">Border</option>
                            <option value="icon">Icon</option>
                            <option value="accent">Accent</option>
                          </select>
                          <div className="mt-1 text-[10px] text-muted-foreground">
                            Roles drive auto-contrast rules.
                          </div>
                        </div>
                      )}

                      {(selectedNode.type === "token" || selectedNode.type === "relative") && (
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">CSS Variable</label>
                          <input
                            type="text"
                            value={selectedNode.cssVar || ""}
                            onChange={(e) =>
                              updateNode(selectedNode.id, { cssVar: e.target.value })
                            }
                            className="w-full rounded-md border border-default bg-white px-2 py-1 text-xs text-foreground"
                            placeholder="e.g. --color-foreground"
                          />
                        </div>
                      )}

                      {selectedNode.type === "token" && (
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Value Override</label>
                          <ColorPickerField
                            value={selectedNode.value || ""}
                            onChange={(value) => updateNodeValue(selectedNode.id, value)}
                            className="w-full rounded-md border border-default bg-white px-2 py-1 text-xs text-foreground"
                            placeholder="e.g. #1d4ed8 or rgb(0 0 0)"
                          />
                        </div>
                      )}

                      {selectedNode.type === "relative" && relativeSpec && (
                        <div className="space-y-3">
                          <div>
                            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                              Expression override (optional)
                            </label>
                            <ColorPickerField
                              value={selectedNode.value || ""}
                              onChange={(value) => updateNodeValue(selectedNode.id, value)}
                              className="w-full rounded-md border border-default bg-white px-2 py-1 text-xs text-foreground"
                              placeholder="oklch(from var(--color-brand-500) l c h / alpha)"
                            />
                            {selectedNode.value && (
                              <button
                                type="button"
                                onClick={() => updateNodeValue(selectedNode.id, "")}
                                className="mt-2 rounded-md border border-default bg-white px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-surface-50"
                              >
                                Clear override
                              </button>
                            )}
                          </div>
                          <div>
                            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Base node</label>
                            <select
                              value={relativeSpec.baseId || ""}
                              onChange={(e) =>
                                updateNode(selectedNode.id, {
                                  relative: { ...relativeSpec, baseId: e.target.value || undefined },
                                })
                              }
                              className="w-full rounded-md border border-default bg-white px-2 py-1 text-xs text-foreground"
                            >
                              <option value="">Select base</option>
                              {nodes
                                .filter((node) => node.id !== selectedNode.id)
                                .map((node) => (
                                  <option key={node.id} value={node.id}>
                                    {node.label} ({node.type})
                                  </option>
                                ))}
                            </select>
                          </div>

                          {([
                            { key: "l", label: "Lightness", unit: "%", modeKey: "lMode", valueKey: "lValue" },
                            { key: "c", label: "Chroma", unit: "%", modeKey: "cMode", valueKey: "cValue" },
                            { key: "h", label: "Hue", unit: "deg", modeKey: "hMode", valueKey: "hValue" },
                            { key: "alpha", label: "Alpha", unit: "%", modeKey: "alphaMode", valueKey: "alphaValue" },
                          ] as const).map((channel) => (
                            <div key={channel.key} className="grid grid-cols-[90px_1fr_64px] items-center gap-2">
                              <div className="text-[11px] font-medium text-muted-foreground">{channel.label}</div>
                              <select
                                value={relativeSpec[channel.modeKey] || "inherit"}
                                onChange={(e) =>
                                  updateNode(selectedNode.id, {
                                    relative: {
                                      ...relativeSpec,
                                      [channel.modeKey]: e.target.value,
                                    },
                                  })
                                }
                                className="rounded-md border border-default bg-white px-2 py-1 text-xs text-foreground"
                              >
                                <option value="inherit">Inherit</option>
                                <option value="delta">Delta</option>
                                <option value="absolute">Absolute</option>
                              </select>
                              <input
                                type="number"
                                value={
                                  relativeSpec[channel.valueKey] !== undefined
                                    ? String(relativeSpec[channel.valueKey])
                                    : ""
                                }
                                onChange={(e) => {
                                  const nextValue =
                                    e.target.value === "" ? undefined : Number(e.target.value)
                                  updateNode(selectedNode.id, {
                                    relative: {
                                      ...relativeSpec,
                                      [channel.valueKey]: nextValue,
                                    },
                                  })
                                }}
                                className="rounded-md border border-default bg-white px-2 py-1 text-xs text-foreground"
                                placeholder={channel.key === "c" ? "0.08" : channel.unit}
                              />
                            </div>
                          ))}
                          <div className="text-[11px] text-muted-foreground">
                            Relative syntax: oklch(from base l c h / alpha)
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Chroma uses 0–0.4 range. Values above 1 are treated as percentages.
                          </div>
                        </div>
                      )}

                      {selectedNode.type === "semantic" && (
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Color Override</label>
                          <ColorPickerField
                            value={selectedNode.value || ""}
                            onChange={(value) => updateNodeValue(selectedNode.id, value)}
                            className="w-full rounded-md border border-default bg-white px-2 py-1 text-xs text-foreground"
                            placeholder="e.g. rgb(0 0 0)"
                          />
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleDuplicateNode(selectedNode)}
                          className="flex items-center gap-2 rounded-md border border-default bg-white px-2 py-1 text-xs font-semibold text-foreground hover:bg-surface-50"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Duplicate
                        </button>
                        <button
                          type="button"
                          onClick={() => removeNode(selectedNode.id)}
                          className="flex items-center gap-2 rounded-md border border-default bg-white px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedEdgeData && (
                    <div className="space-y-3">
                      <div>
                        <div className="text-[11px] text-muted-foreground">Edge type</div>
                        <div className="text-xs font-semibold text-foreground">
                          {selectedEdgeData.type}
                          {selectedEdgeData.auto ? " · auto" : ""}
                        </div>
                      </div>
                      {selectedEdgeData.type === "contrast" && (
                        <>
                          <div>
                            <div className="text-[11px] text-muted-foreground">APCA (approx)</div>
                            <div className="space-y-1 text-xs font-semibold text-foreground">
                              <div>
                                Foreground → Background: {formatLc(getEdgeContrast(selectedEdgeData))}
                              </div>
                              <div className="text-[11px] font-normal text-muted-foreground">
                                Background → Foreground:{" "}
                                {formatLc(
                                  getEdgeContrast({
                                    ...selectedEdgeData,
                                    sourceId: selectedEdgeData.targetId,
                                    targetId: selectedEdgeData.sourceId,
                                  })
                                )}
                              </div>
                            </div>
                          </div>
                          <div>
                            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                              Required Lc
                            </label>
                            {selectedEdgeData.auto ? (
                              <div className="rounded-md border border-default bg-surface-50 px-2 py-1 text-[11px] font-semibold text-foreground">
                                Lc {getEdgeTarget(selectedEdgeData)}
                              </div>
                            ) : (
                              <select
                                value={getEdgeTarget(selectedEdgeData)}
                                onChange={(e) =>
                                  updateEdgeRule(selectedEdgeData.id, { targetLc: Number(e.target.value) })
                                }
                                className="w-full rounded-md border border-default bg-white px-2 py-1 text-xs text-foreground"
                              >
                                {APCA_TARGETS.map((target) => (
                                  <option key={target} value={target}>
                                    Lc {target}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                          <div>
                            <div className="text-[11px] text-muted-foreground">Pair</div>
                            <div className="text-xs font-semibold text-foreground">
                              {resolveEdgeLabel(selectedEdgeData)}
                            </div>
                          </div>
                          <div>
                            <div className="text-[11px] text-muted-foreground">Model</div>
                            <div className="rounded-md border border-default bg-surface-50 px-2 py-1 text-[11px] font-semibold text-foreground">
                              OKLCH (default)
                            </div>
                          </div>
                        </>
                      )}
                      {!selectedEdgeData.auto ? (
                        <button
                          type="button"
                          onClick={() => removeEdge(selectedEdgeData.id)}
                          className="flex items-center gap-2 rounded-md border border-default bg-white px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove edge
                        </button>
                      ) : (
                        <div className="rounded-md border border-dashed border-default bg-surface-50 px-2 py-1 text-[11px] text-muted-foreground">
                          Auto edges are generated from contrast rules.
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </aside>

      <span
        ref={colorProbeRef}
        aria-hidden
        className="pointer-events-none absolute -left-[9999px] top-0 h-0 w-0 opacity-0"
      />
    </div>
  )
}

function nodeMatchesRole(node: ColorCanvasNode, role: NonNullable<ColorCanvasNode["role"]>) {
  if (node.role === role) return true
  const haystack = `${node.label} ${node.cssVar ?? ""}`.toLowerCase()
  const keywords: Record<NonNullable<ColorCanvasNode["role"]>, string[]> = {
    text: ["text", "foreground", "content", "fg"],
    surface: ["surface", "background", "canvas", "bg"],
    border: ["border", "stroke"],
    icon: ["icon"],
    accent: ["accent", "brand", "primary", "secondary"],
  }
  return keywords[role].some((keyword) => haystack.includes(keyword))
}

function getNextPosition(nodes: ColorCanvasNode[]) {
  const baseX = 120
  const baseY = 80
  const spacingX = 220
  const spacingY = 120
  const index = nodes.length
  const col = index % 3
  const row = Math.floor(index / 3)
  return {
    x: baseX + col * spacingX,
    y: baseY + row * spacingY,
  }
}

function formatRelativeChannel(
  mode: string | undefined,
  value: number | undefined,
  unit: string,
  transform: (value: number) => number = (val) => val
) {
  if (!mode || mode === "inherit") return "inherit"
  if (value === undefined || Number.isNaN(value)) return "inherit"
  const nextValue = transform(value)
  if (Number.isNaN(nextValue)) return "inherit"
  const sign = mode === "delta" && nextValue > 0 ? "+" : ""
  return `${sign}${nextValue}${unit}`
}

function clampValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function wrapDegrees(value: number) {
  const mod = value % 360
  return mod < 0 ? mod + 360 : mod
}

export function normalizeRelativeChroma(value: number) {
  if (Number.isNaN(value)) return value
  if (Math.abs(value) > 1) return value / 100
  return value
}

export function applyRelativeChannel(
  baseValue: number,
  mode: string | undefined,
  value: number | undefined,
  percentScale: number,
  normalize: (value: number) => number
) {
  if (!mode || mode === "inherit") return baseValue
  if (value === undefined || Number.isNaN(value)) return baseValue
  const normalized = normalize(value)
  if (mode === "absolute") {
    return normalized / percentScale
  }
  return baseValue + normalized / percentScale
}

export function resolveRelativeOklch(
  base: OklchColor,
  spec: RelativeColorSpec
): OklchColor {
  const nextL = applyRelativeChannel(base.l, spec.lMode, spec.lValue, 100, (value) => value)
  const nextC = applyRelativeChannel(base.c, spec.cMode, spec.cValue, 1, (value) =>
    normalizeRelativeChroma(value)
  )
  const nextH = applyRelativeChannel(base.h, spec.hMode, spec.hValue, 1, (value) => value)
  const nextA = applyRelativeChannel(base.a, spec.alphaMode, spec.alphaValue, 100, (value) => value)
  return {
    l: clampValue(nextL ?? base.l, 0, 1),
    c: Math.max(0, nextC ?? base.c),
    h: wrapDegrees(nextH ?? base.h),
    a: clampValue(nextA ?? base.a, 0, 1),
  }
}

function rgbaToCss(color: RGBA) {
  const r = Math.round(clampValue(color.r, 0, 1) * 255)
  const g = Math.round(clampValue(color.g, 0, 1) * 255)
  const b = Math.round(clampValue(color.b, 0, 1) * 255)
  const a = clampValue(color.a, 0, 1)
  if (a >= 1) return `rgb(${r} ${g} ${b})`
  return `rgb(${r} ${g} ${b} / ${Number(a.toFixed(3))})`
}

export function parseOklch(input: string): { l: number; c: number; h: number; a: number } | null {
  const match = input.trim().toLowerCase().match(/^oklch\(([^)]+)\)$/)
  if (!match) return null
  const body = match[1]
  const [channelsPart, alphaPart] = body.split("/")
  const parts = channelsPart.trim().split(/\s+/).filter(Boolean)
  if (parts.length < 3) return null
  const parsePercent = (raw: string) => {
    const value = parseFloat(raw)
    if (Number.isNaN(value)) return null
    if (raw.includes("%") || value > 1) return value / 100
    return value
  }
  const parseHue = (raw: string) => {
    const value = parseFloat(raw)
    if (Number.isNaN(value)) return null
    return value
  }
  const l = parsePercent(parts[0])
  if (l === null) return null
  const c = parsePercent(parts[1])
  if (c === null) return null
  const h = parseHue(parts[2])
  if (h === null) return null
  let a = 1
  if (alphaPart) {
    const alphaRaw = alphaPart.trim()
    if (alphaRaw) {
      const alphaValue = parseFloat(alphaRaw)
      if (Number.isNaN(alphaValue)) return null
      a = alphaRaw.includes("%") || alphaValue > 1 ? alphaValue / 100 : alphaValue
    }
  }
  return { l: clampValue(l, 0, 1), c: Math.max(0, c), h, a: clampValue(a, 0, 1) }
}

export function parseDisplayP3(input: string): RGBA | null {
  const match = input.trim().toLowerCase().match(/^color\(display-p3\s+([^)]+)\)$/)
  if (!match) return null
  const body = match[1].trim()
  const normalized = body.replace(/\s*\/\s*/g, " / ")
  const tokens = normalized.split(/\s+/).filter(Boolean)
  const slashIndex = tokens.indexOf("/")
  const channels = slashIndex !== -1 ? tokens.slice(0, slashIndex) : tokens
  const alphaToken = slashIndex !== -1 ? tokens[slashIndex + 1] : undefined
  if (channels.length < 3) return null

  const parseChannel = (raw: string) => {
    if (raw.endsWith("%")) {
      return clampValue(parseFloat(raw) / 100, 0, 1)
    }
    const numeric = parseFloat(raw)
    if (Number.isNaN(numeric)) return null
    return clampValue(numeric, 0, 1)
  }

  const r = parseChannel(channels[0])
  const g = parseChannel(channels[1])
  const b = parseChannel(channels[2])
  if (r === null || g === null || b === null) return null
  let a = 1
  if (alphaToken) {
    const alphaValue = parseFloat(alphaToken)
    if (!Number.isNaN(alphaValue)) {
      a = alphaToken.includes("%") || alphaValue > 1 ? alphaValue / 100 : alphaValue
      a = clampValue(a, 0, 1)
    }
  }
  return { r, g, b, a }
}

export function displayP3ToSrgb(color: RGBA): RGBA {
  const r = srgbToLinear(clampValue(color.r, 0, 1))
  const g = srgbToLinear(clampValue(color.g, 0, 1))
  const b = srgbToLinear(clampValue(color.b, 0, 1))

  const x = 0.4865709486 * r + 0.2656676932 * g + 0.1982172852 * b
  const y = 0.2289745641 * r + 0.6917385218 * g + 0.0792869141 * b
  const z = 0.0451133819 * g + 1.0439443689 * b

  const rLinear = 3.2409699419 * x - 1.5373831776 * y - 0.4986107603 * z
  const gLinear = -0.9692436363 * x + 1.8759675015 * y + 0.0415550574 * z
  const bLinear = 0.0556300797 * x - 0.2039769589 * y + 1.0569715142 * z

  return {
    r: clampValue(linearToSrgb(rLinear), 0, 1),
    g: clampValue(linearToSrgb(gLinear), 0, 1),
    b: clampValue(linearToSrgb(bLinear), 0, 1),
    a: color.a,
  }
}

export function oklchToLinearSrgb(color: { l: number; c: number; h: number }) {
  const L = clampValue(color.l, 0, 1)
  const C = Math.max(0, color.c)
  const H = (wrapDegrees(color.h) * Math.PI) / 180
  const a = C * Math.cos(H)
  const b = C * Math.sin(H)

  const lRoot = L + 0.3963377774 * a + 0.2158037573 * b
  const mRoot = L - 0.1055613458 * a - 0.0638541728 * b
  const sRoot = L - 0.0894841775 * a - 1.291485548 * b

  const l = lRoot ** 3
  const m = mRoot ** 3
  const s = sRoot ** 3

  return {
    r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  }
}

export function isOutOfGamut(color: { r: number; g: number; b: number }) {
  return color.r < 0 || color.r > 1 || color.g < 0 || color.g > 1 || color.b < 0 || color.b > 1
}

export function oklchToDisplayP3Css(color: { l: number; c: number; h: number; a?: number }) {
  const L = clampValue(color.l, 0, 1)
  const C = Math.max(0, color.c)
  const H = (wrapDegrees(color.h) * Math.PI) / 180
  const aLab = C * Math.cos(H)
  const bLab = C * Math.sin(H)

  const lRoot = L + 0.3963377774 * aLab + 0.2158037573 * bLab
  const mRoot = L - 0.1055613458 * aLab - 0.0638541728 * bLab
  const sRoot = L - 0.0894841775 * aLab - 1.291485548 * bLab

  const l = lRoot ** 3
  const m = mRoot ** 3
  const s = sRoot ** 3

  const x = 1.2270138511 * l - 0.5577999807 * m + 0.281256149 * s
  const y = -0.0405801784 * l + 1.1122568696 * m - 0.0716766787 * s
  const z = -0.0763812845 * l - 0.4214819784 * m + 1.5861632204 * s

  const rLinear = 2.4934969119 * x - 0.9313836179 * y - 0.4027107845 * z
  const gLinear = -0.8294889696 * x + 1.7626640603 * y + 0.0236246858 * z
  const bLinear = 0.0358458302 * x - 0.0761723893 * y + 0.956884524 * z

  const r = clampValue(linearToSrgb(rLinear), 0, 1)
  const g = clampValue(linearToSrgb(gLinear), 0, 1)
  const b = clampValue(linearToSrgb(bLinear), 0, 1)
  const alpha = clampValue(color.a ?? 1, 0, 1)
  const format = (value: number) => Number(value.toFixed(4))
  if (alpha >= 1) return `color(display-p3 ${format(r)} ${format(g)} ${format(b)})`
  return `color(display-p3 ${format(r)} ${format(g)} ${format(b)} / ${format(alpha)})`
}

function srgbToLinear(channel: number) {
  if (channel <= 0.04045) return channel / 12.92
  return Math.pow((channel + 0.055) / 1.055, 2.4)
}

function linearToSrgb(channel: number) {
  if (channel <= 0.0031308) return channel * 12.92
  return 1.055 * Math.pow(channel, 1 / 2.4) - 0.055
}

export function srgbToOklch(color: RGBA): { l: number; c: number; h: number } | null {
  const r = srgbToLinear(clampValue(color.r, 0, 1))
  const g = srgbToLinear(clampValue(color.g, 0, 1))
  const b = srgbToLinear(clampValue(color.b, 0, 1))

  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b

  const lRoot = Math.cbrt(l)
  const mRoot = Math.cbrt(m)
  const sRoot = Math.cbrt(s)

  const L = 0.2104542553 * lRoot + 0.793617785 * mRoot - 0.0040720468 * sRoot
  const A = 1.9779984951 * lRoot - 2.428592205 * mRoot + 0.4505937099 * sRoot
  const B = 0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.808675766 * sRoot

  const C = Math.sqrt(A * A + B * B)
  const H = wrapDegrees((Math.atan2(B, A) * 180) / Math.PI)
  return { l: clampValue(L, 0, 1), c: C, h: H }
}

export function oklchToSrgb(color: { l: number; c: number; h: number; a?: number }): RGBA | null {
  const L = clampValue(color.l, 0, 1)
  const C = Math.max(0, color.c)
  const H = (wrapDegrees(color.h) * Math.PI) / 180
  const a = C * Math.cos(H)
  const bLab = C * Math.sin(H)

  const lRoot = L + 0.3963377774 * a + 0.2158037573 * bLab
  const mRoot = L - 0.1055613458 * a - 0.0638541728 * bLab
  const sRoot = L - 0.0894841775 * a - 1.291485548 * bLab

  const l = lRoot ** 3
  const m = mRoot ** 3
  const s = sRoot ** 3

  const rLinear = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
  const gLinear = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
  const bLinear = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s

  const r = clampValue(linearToSrgb(rLinear), 0, 1)
  const g = clampValue(linearToSrgb(gLinear), 0, 1)
  const bOut = clampValue(linearToSrgb(bLinear), 0, 1)
  return { r, g, b: bOut, a: color.a ?? 1 }
}
function ColorNode({
  node,
  size,
  resolveColor,
  resolveIsP3,
  resolveExpression,
  resolveLabel,
  selected,
  connectActive,
  connectDragging,
  connectSourceId,
  onMove,
  onClick,
  onConnectStart,
  showFullLabels,
}: {
  node: ColorCanvasNode
  size: { width: number; height: number }
  resolveColor: (nodeId: string) => string | null
  resolveIsP3: (nodeId: string) => boolean
  resolveExpression: (nodeId: string) => string | null
  resolveLabel: (nodeId: string) => string
  selected: boolean
  connectActive: boolean
  connectDragging: boolean
  connectSourceId: string | null
  onMove: (id: string, position: { x: number; y: number }) => void
  onClick: (id: string) => void
  onConnectStart: (id: string, event: React.PointerEvent) => void
  showFullLabels: boolean
}) {
  const draggingRef = useRef(false)
  const offsetRef = useRef({ x: 0, y: 0 })

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation()
    draggingRef.current = true
    offsetRef.current = {
      x: e.clientX - node.position.x,
      y: e.clientY - node.position.y,
    }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return
    onMove(node.id, {
      x: e.clientX - offsetRef.current.x,
      y: e.clientY - offsetRef.current.y,
    })
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (connectDragging) {
      return
    }
    if (!draggingRef.current) {
      onClick(node.id)
      return
    }
    draggingRef.current = false
    ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    onClick(node.id)
  }

  const colorSample = resolveColor(node.id)
  const isP3 = resolveIsP3(node.id)
  const expression = resolveExpression(node.id)
  const normalizeChroma = (value: number) => {
    const normalized = Math.abs(value) > 1 ? value / 100 : value
    return Number(normalized.toFixed(3))
  }
  const relativeSummary = (() => {
    if (node.type !== "relative" || !node.relative) return null
    const parts = [
      { label: "L", value: formatRelativeChannel(node.relative.lMode, node.relative.lValue, "%") },
      {
        label: "C",
        value: formatRelativeChannel(node.relative.cMode, node.relative.cValue, "", normalizeChroma),
      },
      { label: "H", value: formatRelativeChannel(node.relative.hMode, node.relative.hValue, "°") },
      { label: "A", value: formatRelativeChannel(node.relative.alphaMode, node.relative.alphaValue, "%") },
    ]
    const changed = parts.filter((part) => part.value !== "inherit")
    if (changed.length === 0) return "Inherits base"
    return changed.map((part) => `${part.label} ${part.value}`).join(" · ")
  })()
  const relativeBaseLabel =
    showFullLabels && node.type === "relative" && node.relative?.baseId
      ? `From ${resolveLabel(node.relative.baseId)}`
      : null
  const labelLine = showFullLabels
    ? expression || node.cssVar || node.role || node.type
    : node.cssVar || node.role || node.type

  return (
    <div
      data-color-node="true"
      data-node-id={node.id}
      role="button"
      tabIndex={0}
      className={`absolute rounded-xl border bg-white px-3 py-3 shadow-sm transition-shadow ${
        selected ? "border-brand-500 shadow-md" : "border-default"
      } ${connectSourceId === node.id ? "ring-2 ring-brand-400" : ""}`}
      style={{
        width: size.width,
        height: size.height,
        left: node.position.x,
        top: node.position.y,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {connectActive && (
        <>
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation()
              onConnectStart(node.id, e)
            }}
            className="absolute -left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border border-brand-300 bg-white shadow-sm hover:border-brand-500"
            aria-label="Start connection"
          />
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation()
              onConnectStart(node.id, e)
            }}
            className="absolute -right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border border-brand-300 bg-white shadow-sm hover:border-brand-500"
            aria-label="Finish connection"
          />
        </>
      )}
      <div className="flex items-center gap-2">
        <div
          className="h-6 w-6 rounded border border-default"
          style={{ background: colorSample || "transparent" }}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-semibold text-foreground">{node.label}</div>
          <div
            className="truncate text-[10px] text-muted-foreground"
            title={showFullLabels ? labelLine : undefined}
          >
            {labelLine}
          </div>
          {node.type === "relative" && (
            <div className="mt-1 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-semibold text-amber-700">
              Relative
            </div>
          )}
          {relativeSummary && (
            <div className="mt-1 truncate text-[9px] text-muted-foreground">{relativeSummary}</div>
          )}
          {relativeBaseLabel && (
            <div className="mt-1 truncate text-[9px] text-muted-foreground">{relativeBaseLabel}</div>
          )}
        </div>
        {isP3 && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-semibold text-emerald-700">
            P3
          </span>
        )}
        <Link2 className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  )
}
