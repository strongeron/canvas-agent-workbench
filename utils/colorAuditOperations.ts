import { DEFAULT_COLOR_MODEL } from "./apca"
import type {
  ColorCanvasEdge,
  ColorCanvasFrameworkId,
  ColorCanvasNode,
  ColorCanvasSemanticKind,
  ColorCanvasState,
  RelativeColorSpec,
} from "../types/colorCanvas"

export type ColorAuditTemplateKitId = "starter" | "shadcn" | "radix"
export type ColorAuditFunctionalTokenSourceId =
  | "surface"
  | "surface-muted"
  | "text"
  | "text-muted"
  | "border"
  | "accent"
  | "accent-contrast"

export interface ColorAuditTemplateSeed {
  l: number
  c: number
  h: number
}

export interface ColorAuditFunctionalTokenPreset {
  label: string
  cssVar: string
  role: NonNullable<ColorCanvasNode["role"]>
  source: ColorAuditFunctionalTokenSourceId
  framework: ColorCanvasFrameworkId
  description: string
}

export const DEFAULT_COLOR_AUDIT_TEMPLATE_SEEDS: Record<
  "brand" | "accent",
  ColorAuditTemplateSeed
> = {
  brand: { l: 0.62, c: 0.19, h: 255 },
  accent: { l: 0.68, c: 0.18, h: 315 },
}

export const COLOR_AUDIT_TEMPLATE_KITS: Array<{
  id: ColorAuditTemplateKitId
  label: string
  description: string
  framework?: ColorCanvasFrameworkId
}> = [
  {
    id: "starter",
    label: "Starter Ramp",
    description: "Brand seed, accent seed, surface/text rules, and semantic roles.",
  },
  {
    id: "shadcn",
    label: "shadcn/ui",
    description:
      "Starter ramp plus functional aliases like background, foreground, primary, border, and ring.",
    framework: "shadcn",
  },
  {
    id: "radix",
    label: "Radix Themes",
    description:
      "Starter ramp plus functional Radix-style background, panel, accent, text, and border aliases.",
    framework: "radix",
  },
]

export const COLOR_AUDIT_FUNCTIONAL_TOKEN_PRESETS: Record<
  ColorCanvasFrameworkId,
  ColorAuditFunctionalTokenPreset[]
> = {
  shadcn: [
    {
      label: "Background",
      cssVar: "--background",
      role: "surface",
      source: "surface",
      framework: "shadcn",
      description: "Base app surface used behind most content.",
    },
    {
      label: "Foreground",
      cssVar: "--foreground",
      role: "text",
      source: "text",
      framework: "shadcn",
      description: "Primary text and icon color on the default background.",
    },
    {
      label: "Card",
      cssVar: "--card",
      role: "surface",
      source: "surface",
      framework: "shadcn",
      description: "Elevated surface for containers and cards.",
    },
    {
      label: "Card Foreground",
      cssVar: "--card-foreground",
      role: "text",
      source: "text",
      framework: "shadcn",
      description: "Readable content color placed on cards.",
    },
    {
      label: "Muted",
      cssVar: "--muted",
      role: "surface",
      source: "surface-muted",
      framework: "shadcn",
      description: "Subtle background for secondary containers and placeholders.",
    },
    {
      label: "Muted Foreground",
      cssVar: "--muted-foreground",
      role: "text",
      source: "text-muted",
      framework: "shadcn",
      description: "Secondary text used on muted and tertiary UI copy.",
    },
    {
      label: "Primary",
      cssVar: "--primary",
      role: "accent",
      source: "accent",
      framework: "shadcn",
      description: "Main action or emphasis background.",
    },
    {
      label: "Primary Foreground",
      cssVar: "--primary-foreground",
      role: "text",
      source: "accent-contrast",
      framework: "shadcn",
      description: "Readable content placed on the primary action color.",
    },
    {
      label: "Accent",
      cssVar: "--accent",
      role: "accent",
      source: "accent",
      framework: "shadcn",
      description: "Interactive hover or selected-state accent surface.",
    },
    {
      label: "Accent Foreground",
      cssVar: "--accent-foreground",
      role: "text",
      source: "accent-contrast",
      framework: "shadcn",
      description: "Readable content placed on accent backgrounds.",
    },
    {
      label: "Border",
      cssVar: "--border",
      role: "border",
      source: "border",
      framework: "shadcn",
      description: "Default border and divider color.",
    },
    {
      label: "Input",
      cssVar: "--input",
      role: "border",
      source: "border",
      framework: "shadcn",
      description: "Input outline or field border color.",
    },
    {
      label: "Ring",
      cssVar: "--ring",
      role: "accent",
      source: "accent",
      framework: "shadcn",
      description: "Focus ring color for interactive controls.",
    },
  ],
  radix: [
    {
      label: "Canvas Background",
      cssVar: "--color-background",
      role: "surface",
      source: "surface",
      framework: "radix",
      description: "App background behind panels and pages.",
    },
    {
      label: "Panel",
      cssVar: "--color-panel",
      role: "surface",
      source: "surface-muted",
      framework: "radix",
      description: "Raised panel surface for cards and settings panes.",
    },
    {
      label: "Text",
      cssVar: "--color-text",
      role: "text",
      source: "text",
      framework: "radix",
      description: "Default Radix text color.",
    },
    {
      label: "Text Muted",
      cssVar: "--color-text-muted",
      role: "text",
      source: "text-muted",
      framework: "radix",
      description: "Muted text for helper copy and metadata.",
    },
    {
      label: "Border",
      cssVar: "--color-border",
      role: "border",
      source: "border",
      framework: "radix",
      description: "Border and separator color for panels and fields.",
    },
    {
      label: "Accent",
      cssVar: "--color-accent",
      role: "accent",
      source: "accent",
      framework: "radix",
      description: "Main accent swatch consumed by Radix Themes.",
    },
    {
      label: "Accent Contrast",
      cssVar: "--color-accent-contrast",
      role: "text",
      source: "accent-contrast",
      framework: "radix",
      description: "Readable text/icon color placed on the accent swatch.",
    },
    {
      label: "Focus",
      cssVar: "--color-focus",
      role: "accent",
      source: "accent",
      framework: "radix",
      description: "Keyboard focus highlight and strong outline state.",
    },
    {
      label: "Icon",
      cssVar: "--color-icon",
      role: "icon",
      source: "text",
      framework: "radix",
      description: "Default icon and glyph tint.",
    },
  ],
}

export type ColorAuditOperation =
  | {
      type: "create-node"
      node: Omit<ColorCanvasNode, "id">
      select?: boolean
    }
  | {
      type: "update-node"
      nodeId: string
      patch: Partial<Omit<ColorCanvasNode, "id">>
    }
  | {
      type: "delete-node"
      nodeId: string
    }
  | {
      type: "create-edge"
      edge: Omit<ColorCanvasEdge, "id">
      select?: boolean
    }
  | {
      type: "update-edge"
      edgeId: string
      patch: Partial<Omit<ColorCanvasEdge, "id">>
    }
  | {
      type: "delete-edge"
      edgeId: string
    }
  | {
      type: "generate-template"
      templateKitId: ColorAuditTemplateKitId
      brandColor?: string
      accentColor?: string
    }

const EMPTY_COLOR_AUDIT_STATE: ColorCanvasState = {
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  edgeUndoStack: [],
}

function normalizeColorAuditState(state: Partial<ColorCanvasState> | null | undefined): ColorCanvasState {
  return {
    nodes: state?.nodes ?? [],
    edges: state?.edges ?? [],
    selectedNodeId: state?.selectedNodeId ?? null,
    selectedEdgeId: state?.selectedEdgeId ?? null,
    edgeUndoStack: state?.edgeUndoStack ?? [],
  }
}

function createColorAuditNodeId() {
  return `node-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function createColorAuditEdgeId() {
  return `edge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function wrapDegrees(value: number) {
  const normalized = value % 360
  return normalized < 0 ? normalized + 360 : normalized
}

function clampValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function getColorAuditFrameworkLabel(framework?: ColorCanvasFrameworkId) {
  if (framework === "shadcn") return "shadcn/ui"
  if (framework === "radix") return "Radix"
  return null
}

export function stripColorAuditFrameworkPrefix(label: string, framework?: ColorCanvasFrameworkId) {
  const frameworkLabel = getColorAuditFrameworkLabel(framework)
  if (!frameworkLabel) return label
  const prefix = `${frameworkLabel} / `
  return label.startsWith(prefix) ? label.slice(prefix.length) : label
}

export function formatColorAuditFunctionalTokenLabel(preset: ColorAuditFunctionalTokenPreset) {
  return stripColorAuditFrameworkPrefix(preset.label, preset.framework)
}

export function formatColorAuditTemplateSeed(seed: ColorAuditTemplateSeed) {
  const lightness = Number((clampValue(seed.l, 0, 1) * 100).toFixed(1))
  const chroma = Number(Math.max(0, seed.c).toFixed(3))
  const hue = Number(wrapDegrees(seed.h).toFixed(1))
  return `oklch(${lightness}% ${chroma} ${hue})`
}

function getTemplateKit(templateKitId: ColorAuditTemplateKitId) {
  return COLOR_AUDIT_TEMPLATE_KITS.find((kit) => kit.id === templateKitId) ?? COLOR_AUDIT_TEMPLATE_KITS[0]
}

function upsertTemplateNode(
  state: ColorCanvasState,
  config: {
    type: ColorCanvasNode["type"]
    cssVar?: string
    label: string
    value?: string
    role?: ColorCanvasNode["role"]
    framework?: ColorCanvasNode["framework"]
    semanticKind?: ColorCanvasSemanticKind
    relative?: RelativeColorSpec
    size?: ColorCanvasNode["size"]
    group?: ColorCanvasNode["group"]
    preview?: ColorCanvasNode["preview"]
    position: { x: number; y: number }
  }
) {
  const existingIndex = config.cssVar
    ? state.nodes.findIndex((node) => node.cssVar === config.cssVar && node.type === config.type)
    : state.nodes.findIndex((node) => node.label === config.label && node.type === config.type)

  if (existingIndex >= 0) {
    const existing = state.nodes[existingIndex]
    const updatedNode: ColorCanvasNode = {
      ...existing,
      label: config.label,
      value: config.value ?? existing.value,
      cssVar: config.cssVar ?? existing.cssVar,
      role: config.role ?? existing.role,
      framework: config.framework ?? existing.framework,
      semanticKind: config.semanticKind ?? existing.semanticKind,
      relative: config.relative ?? existing.relative,
      size: config.size ?? existing.size,
      group: config.group ?? existing.group,
      preview: config.preview ?? existing.preview,
      position: existing.position,
    }
    state.nodes.splice(existingIndex, 1, updatedNode)
    return existing.id
  }

  const id = createColorAuditNodeId()
  state.nodes.push({
    id,
    type: config.type,
    label: config.label,
    cssVar: config.cssVar,
    value: config.value,
    role: config.role,
    framework: config.framework,
    semanticKind: config.semanticKind,
    relative: config.relative,
    size: config.size,
    group: config.group,
    preview: config.preview,
    position: config.position,
  })
  return id
}

function ensureTemplateEdge(
  state: ColorCanvasState,
  sourceId: string,
  targetId: string,
  type: ColorCanvasEdge["type"],
  rule?: ColorCanvasEdge["rule"]
) {
  const existingEdge = state.edges.find((edge) => {
    if (edge.type !== type) return false
    if (edge.sourceId === sourceId && edge.targetId === targetId) return true
    if (type === "contrast" && edge.sourceId === targetId && edge.targetId === sourceId) return true
    return false
  })
  if (existingEdge) {
    if (rule) {
      existingEdge.rule = { ...existingEdge.rule, ...rule }
    }
    return existingEdge.id
  }

  const id = createColorAuditEdgeId()
  state.edges.push({
    id,
    sourceId,
    targetId,
    type,
    rule,
  })
  return id
}

function buildGeneratedTemplateState(
  inputState: ColorCanvasState,
  input: {
    templateKitId: ColorAuditTemplateKitId
    brandColor?: string
    accentColor?: string
  }
) {
  const state = normalizeColorAuditState(inputState)
  const brandValue = input.brandColor?.trim() || formatColorAuditTemplateSeed(DEFAULT_COLOR_AUDIT_TEMPLATE_SEEDS.brand)
  const accentValue = input.accentColor?.trim() || ""
  const selectedTemplateKit = getTemplateKit(input.templateKitId)
  const generatedNodeCache = new Map<string, string>()
  let offset = 0

  const positionFor = () => {
    const baseX = 120
    const baseY = 80
    const spacingX = 260
    const spacingY = 120
    const index = state.nodes.length + offset
    offset += 1
    const col = index % 4
    const row = Math.floor(index / 4)
    return {
      x: baseX + col * spacingX,
      y: baseY + row * spacingY,
    }
  }

  const getGeneratedNodeKey = (config: {
    type: ColorCanvasNode["type"]
    cssVar?: string
    label: string
    role?: ColorCanvasNode["role"]
    framework?: ColorCanvasNode["framework"]
  }) =>
    `${config.type}:${config.cssVar ?? `${config.label}:${config.framework ?? ""}:${config.role ?? ""}`}`

  const upsertGeneratedNode = (config: Parameters<typeof upsertTemplateNode>[1]) => {
    const key = getGeneratedNodeKey(config)
    const cachedId = generatedNodeCache.get(key)
    if (cachedId) return cachedId
    const id = upsertTemplateNode(state, config)
    generatedNodeCache.set(key, id)
    return id
  }

  const brandBaseId = upsertGeneratedNode({
    type: "token",
    label: "Brand Seed",
    cssVar: "--color-brand-500",
    value: brandValue,
    position: positionFor(),
  })

  const brandScale = [
    { cssVar: "--color-brand-300", label: "Brand / 300", l: 16, c: -4 },
    { cssVar: "--color-brand-400", label: "Brand / 400", l: 8, c: -2 },
    { cssVar: "--color-brand-600", label: "Brand / 600", l: -6, c: -3 },
    { cssVar: "--color-brand-700", label: "Brand / 700", l: -12, c: -5 },
  ]

  brandScale.forEach((entry) => {
    upsertGeneratedNode({
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
    { cssVar: "--color-surface-50", label: "Surface / Base", l: 98, c: 2 },
    { cssVar: "--color-surface-100", label: "Surface / Elevated", l: 96, c: 3 },
    { cssVar: "--color-surface-200", label: "Surface / Muted", l: 92, c: 4 },
  ]

  const surfaceIds = surfaceScale.reduce<Record<string, string>>((acc, entry) => {
    const id = upsertGeneratedNode({
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
    acc[entry.cssVar] = id
    return acc
  }, {})

  const textScale = [
    { cssVar: "--color-foreground", label: "Text / Primary", l: 20, c: 0 },
    { cssVar: "--color-muted-foreground", label: "Text / Secondary", l: 40, c: 0 },
    { cssVar: "--color-foreground-inverse", label: "Text / Inverse", l: 99, c: 1 },
  ]

  const textIds = textScale.reduce<Record<string, string>>((acc, entry) => {
    const id = upsertGeneratedNode({
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
    acc[entry.cssVar] = id
    return acc
  }, {})

  const borderId = upsertGeneratedNode({
    type: "relative",
    label: "Border / Default",
    cssVar: "--color-border-default",
    position: positionFor(),
    relative: {
      model: DEFAULT_COLOR_MODEL,
      baseId: brandBaseId,
      lMode: "absolute",
      lValue: 82,
      cMode: "absolute",
      cValue: 1,
      hMode: "inherit",
      alphaMode: "absolute",
      alphaValue: 60,
    },
  })

  let accentSourceId = brandBaseId
  if (accentValue) {
    const accentBaseId = upsertGeneratedNode({
      type: "token",
      label: "Accent Seed",
      cssVar: "--color-accent-500",
      value: accentValue,
      position: positionFor(),
    })
    accentSourceId = accentBaseId

    const accentScale = [
      { cssVar: "--color-accent-400", label: "Accent 400", l: 8, c: -2 },
      { cssVar: "--color-accent-600", label: "Accent 600", l: -6, c: -3 },
    ]

    accentScale.forEach((entry) => {
      upsertGeneratedNode({
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

  const accentPrimaryId = upsertGeneratedNode({
    type: "relative",
    label: "Accent / Primary",
    cssVar: "--color-accent-primary",
    position: positionFor(),
    relative: {
      model: DEFAULT_COLOR_MODEL,
      baseId: accentSourceId,
      lMode: accentValue ? "inherit" : "delta",
      lValue: accentValue ? undefined : -6,
      cMode: accentValue ? "inherit" : "delta",
      cValue: accentValue ? undefined : -3,
      hMode: "inherit",
      alphaMode: "inherit",
    },
  })

  const frameworkTokenId = (
    framework: ColorCanvasFrameworkId,
    presetIndex: number
  ) =>
    upsertGeneratedNode({
      type: "semantic",
      label: formatColorAuditFunctionalTokenLabel(COLOR_AUDIT_FUNCTIONAL_TOKEN_PRESETS[framework][presetIndex]),
      cssVar: COLOR_AUDIT_FUNCTIONAL_TOKEN_PRESETS[framework][presetIndex].cssVar,
      role: COLOR_AUDIT_FUNCTIONAL_TOKEN_PRESETS[framework][presetIndex].role,
      framework,
      semanticKind: "functional",
      position: positionFor(),
    })

  const functionalSourceIds: Record<ColorAuditFunctionalTokenSourceId, string> = {
    surface: surfaceIds["--color-surface-50"],
    "surface-muted": surfaceIds["--color-surface-200"],
    text: textIds["--color-foreground"],
    "text-muted": textIds["--color-muted-foreground"],
    border: borderId,
    accent: accentPrimaryId,
    "accent-contrast": textIds["--color-foreground-inverse"],
  }

  if (selectedTemplateKit.framework) {
    COLOR_AUDIT_FUNCTIONAL_TOKEN_PRESETS[selectedTemplateKit.framework].forEach((preset) => {
      const functionalId = upsertGeneratedNode({
        type: "semantic",
        label: formatColorAuditFunctionalTokenLabel(preset),
        cssVar: preset.cssVar,
        role: preset.role,
        framework: preset.framework,
        semanticKind: "functional",
        position: positionFor(),
      })
      ensureTemplateEdge(state, functionalSourceIds[preset.source], functionalId, "map", {
        note: `${getColorAuditFrameworkLabel(preset.framework)} token`,
      })
    })
  }

  const semanticRoleMappings: Array<{
    label: string
    role: NonNullable<ColorCanvasNode["role"]>
    sourceId: string
  }> = [
    {
      label: "Text / Foreground",
      role: "text",
      sourceId:
        selectedTemplateKit.framework === "shadcn"
          ? frameworkTokenId("shadcn", 1)
          : selectedTemplateKit.framework === "radix"
            ? frameworkTokenId("radix", 2)
            : textIds["--color-foreground"],
    },
    {
      label: "Surface / Base",
      role: "surface",
      sourceId:
        selectedTemplateKit.framework === "shadcn"
          ? frameworkTokenId("shadcn", 0)
          : selectedTemplateKit.framework === "radix"
            ? frameworkTokenId("radix", 0)
            : surfaceIds["--color-surface-50"],
    },
    {
      label: "Border / Default",
      role: "border",
      sourceId:
        selectedTemplateKit.framework === "shadcn"
          ? frameworkTokenId("shadcn", 10)
          : selectedTemplateKit.framework === "radix"
            ? frameworkTokenId("radix", 4)
            : borderId,
    },
    {
      label: "Accent / Primary",
      role: "accent",
      sourceId:
        selectedTemplateKit.framework === "shadcn"
          ? frameworkTokenId("shadcn", 6)
          : selectedTemplateKit.framework === "radix"
            ? frameworkTokenId("radix", 5)
            : accentPrimaryId,
    },
    {
      label: "Icon / Default",
      role: "icon",
      sourceId:
        selectedTemplateKit.framework === "radix"
          ? frameworkTokenId("radix", 8)
          : textIds["--color-foreground"],
    },
  ]

  semanticRoleMappings.forEach((entry) => {
    const semanticId = upsertGeneratedNode({
      type: "semantic",
      label: entry.label,
      role: entry.role,
      semanticKind: "role",
      position: positionFor(),
    })
    ensureTemplateEdge(state, entry.sourceId, semanticId, "map", { note: "Semantic role" })
  })

  return {
    ...state,
    selectedNodeId: null,
    selectedEdgeId: null,
  }
}

export function applyColorAuditOperation(
  inputState: Partial<ColorCanvasState> | null | undefined,
  operation: ColorAuditOperation
): ColorCanvasState {
  const state = normalizeColorAuditState(inputState ?? EMPTY_COLOR_AUDIT_STATE)

  switch (operation.type) {
    case "create-node": {
      const id = createColorAuditNodeId()
      return {
        ...state,
        nodes: [...state.nodes, { ...operation.node, id }],
        selectedNodeId: operation.select === false ? state.selectedNodeId : id,
        selectedEdgeId: operation.select === false ? state.selectedEdgeId : null,
      }
    }
    case "update-node":
      return {
        ...state,
        nodes: state.nodes.map((node) =>
          node.id === operation.nodeId ? { ...node, ...operation.patch } : node
        ),
      }
    case "delete-node":
      return {
        ...state,
        nodes: state.nodes.filter((node) => node.id !== operation.nodeId),
        edges: state.edges.filter(
          (edge) => edge.sourceId !== operation.nodeId && edge.targetId !== operation.nodeId
        ),
        selectedNodeId:
          state.selectedNodeId === operation.nodeId ? null : state.selectedNodeId,
      }
    case "create-edge": {
      const id = createColorAuditEdgeId()
      return {
        ...state,
        edges: [...state.edges, { ...operation.edge, id }],
        selectedNodeId: operation.select === false ? state.selectedNodeId : null,
        selectedEdgeId: operation.select === false ? state.selectedEdgeId : id,
      }
    }
    case "update-edge":
      return {
        ...state,
        edges: state.edges.map((edge) =>
          edge.id === operation.edgeId
            ? { ...edge, ...operation.patch, rule: { ...edge.rule, ...operation.patch.rule } }
            : edge
        ),
      }
    case "delete-edge": {
      const removedEdge = state.edges.find((edge) => edge.id === operation.edgeId)
      return {
        ...state,
        edges: state.edges.filter((edge) => edge.id !== operation.edgeId),
        selectedEdgeId: state.selectedEdgeId === operation.edgeId ? null : state.selectedEdgeId,
        edgeUndoStack: removedEdge ? [removedEdge, ...state.edgeUndoStack].slice(0, 25) : state.edgeUndoStack,
      }
    }
    case "generate-template":
      return buildGeneratedTemplateState(state, {
        templateKitId: operation.templateKitId,
        brandColor: operation.brandColor,
        accentColor: operation.accentColor,
      })
    default:
      return state
  }
}
