import type {
  DesignSystemIconLibraryId,
  DesignSystemScaleConfig,
} from "../projects/design-system-foundation/designSystemApi"
import type {
  ColorCanvasColorModel,
  ColorCanvasEdge,
  ColorCanvasEdgeRule,
  ColorCanvasFrameworkId,
  ColorCanvasNode,
  ColorCanvasNodePreview,
  ColorCanvasSemanticKind,
  ColorCanvasState,
  RelativeChannelMode,
  RelativeColorSpec,
} from "../types/colorCanvas"

export const SYSTEM_CANVAS_VIEW_MODES = [
  "system",
  "colors",
  "type",
  "layout",
  "primitives",
  "standards",
  "all",
] as const

export type SystemCanvasViewMode = (typeof SYSTEM_CANVAS_VIEW_MODES)[number]

export type SystemCanvasOperation =
  | {
      type: "update-scale-config"
      patch: Partial<DesignSystemScaleConfig>
    }
  | {
      type: "set-view-mode"
      viewMode: SystemCanvasViewMode
    }
  | {
      type: "generate-scale-graph"
    }
  | {
      type: "apply-scale-vars"
    }
  | {
      type: "create-node"
      node: Partial<ColorCanvasNode>
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
      edge: Partial<ColorCanvasEdge>
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

const DESIGN_SYSTEM_CONFIG_KEYS = new Set<keyof DesignSystemScaleConfig>([
  "minViewportPx",
  "maxViewportPx",
  "baseUnitPx",
  "typeBaseMinPx",
  "typeBaseMaxPx",
  "minTypeScaleRatio",
  "maxTypeScaleRatio",
  "density",
  "fontFamilySans",
  "fontFamilyDisplay",
  "fontWeightSans",
  "fontWeightDisplay",
  "iconLibrary",
  "iconStroke",
])

const DESIGN_SYSTEM_STRING_KEYS = new Set<keyof DesignSystemScaleConfig>([
  "fontFamilySans",
  "fontFamilyDisplay",
])

const DESIGN_SYSTEM_NUMBER_KEYS = new Set<keyof DesignSystemScaleConfig>([
  "minViewportPx",
  "maxViewportPx",
  "baseUnitPx",
  "typeBaseMinPx",
  "typeBaseMaxPx",
  "minTypeScaleRatio",
  "maxTypeScaleRatio",
  "density",
  "fontWeightSans",
  "fontWeightDisplay",
  "iconStroke",
])

const DESIGN_SYSTEM_ICON_LIBRARY_VALUES = new Set<DesignSystemIconLibraryId>([
  "lucide",
  "canvas-symbols",
])

const SYSTEM_CANVAS_NODE_TYPES = new Set<ColorCanvasNode["type"]>([
  "token",
  "semantic",
  "component",
  "relative",
])

const SYSTEM_CANVAS_NODE_GROUPS = new Set<NonNullable<ColorCanvasNode["group"]>>([
  "system-support",
  "system-preview",
])

const SYSTEM_CANVAS_NODE_ROLES = new Set<NonNullable<ColorCanvasNode["role"]>>([
  "text",
  "surface",
  "border",
  "icon",
  "accent",
])

const SYSTEM_CANVAS_FRAMEWORKS = new Set<ColorCanvasFrameworkId>(["shadcn", "radix"])

const SYSTEM_CANVAS_SEMANTIC_KINDS = new Set<ColorCanvasSemanticKind>(["role", "functional"])

const SYSTEM_CANVAS_EDGE_TYPES = new Set<ColorCanvasEdge["type"]>(["map", "contrast"])

const SYSTEM_CANVAS_COLOR_MODELS = new Set<ColorCanvasColorModel>(["oklch", "srgb"])

const SYSTEM_CANVAS_RELATIVE_CHANNEL_MODES = new Set<RelativeChannelMode>([
  "inherit",
  "delta",
  "absolute",
])

const SYSTEM_CANVAS_PREVIEW_KINDS = new Set<ColorCanvasNodePreview["kind"]>([
  "connector-detail",
  "font-family",
  "type-scale",
  "stroke-pair",
  "icon-library",
  "icon-scale",
  "layout-stack",
  "layout-grid",
  "layout-split",
  "token-standard",
  "radix-theme",
  "primitive-text",
  "primitive-heading",
  "primitive-button",
  "primitive-surface",
])

const SYSTEM_CANVAS_PREVIEW_SECTION_IDS = new Set<
  NonNullable<ColorCanvasNodePreview["sectionId"]>
>(["colors", "type", "layout", "primitives", "standards"])

const EMPTY_SYSTEM_CANVAS_STATE: ColorCanvasState = {
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  edgeUndoStack: [],
}

function normalizeSystemCanvasState(state: Partial<ColorCanvasState> | null | undefined): ColorCanvasState {
  return {
    nodes: state?.nodes ?? [],
    edges: state?.edges ?? [],
    selectedNodeId: state?.selectedNodeId ?? null,
    selectedEdgeId: state?.selectedEdgeId ?? null,
    edgeUndoStack: state?.edgeUndoStack ?? [],
  }
}

function createSystemCanvasNodeId() {
  return `node-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function createSystemCanvasEdgeId() {
  return `edge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizeText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function normalizeFiniteNumber(value: unknown) {
  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number.parseFloat(value)
        : Number.NaN
  return Number.isFinite(numericValue) ? numericValue : undefined
}

function sanitizeSystemCanvasPosition(
  value: unknown,
  fallback: { x: number; y: number } = { x: 120, y: 120 }
) {
  if (!value || typeof value !== "object") return fallback
  const x = normalizeFiniteNumber((value as { x?: unknown }).x)
  const y = normalizeFiniteNumber((value as { y?: unknown }).y)
  return {
    x: x ?? fallback.x,
    y: y ?? fallback.y,
  }
}

function sanitizeSystemCanvasSize(value: unknown) {
  if (!value || typeof value !== "object") return undefined
  const width = normalizeFiniteNumber((value as { width?: unknown }).width)
  const height = normalizeFiniteNumber((value as { height?: unknown }).height)
  if (!width && !height) return undefined
  return {
    width: Math.max(120, width ?? 120),
    height: Math.max(72, height ?? 72),
  }
}

function sanitizeRelativeChannelMode(value: unknown) {
  return typeof value === "string" && SYSTEM_CANVAS_RELATIVE_CHANNEL_MODES.has(value as RelativeChannelMode)
    ? (value as RelativeChannelMode)
    : undefined
}

function sanitizeRelativeSpec(value: unknown): RelativeColorSpec | undefined {
  if (!value || typeof value !== "object") return undefined
  const next: RelativeColorSpec = {}
  const baseId = normalizeText((value as { baseId?: unknown }).baseId)
  const model = normalizeText((value as { model?: unknown }).model)
  if (baseId) next.baseId = baseId
  if (model && SYSTEM_CANVAS_COLOR_MODELS.has(model as ColorCanvasColorModel)) {
    next.model = model as ColorCanvasColorModel
  }

  const lMode = sanitizeRelativeChannelMode((value as { lMode?: unknown }).lMode)
  const cMode = sanitizeRelativeChannelMode((value as { cMode?: unknown }).cMode)
  const hMode = sanitizeRelativeChannelMode((value as { hMode?: unknown }).hMode)
  const alphaMode = sanitizeRelativeChannelMode((value as { alphaMode?: unknown }).alphaMode)
  if (lMode) next.lMode = lMode
  if (cMode) next.cMode = cMode
  if (hMode) next.hMode = hMode
  if (alphaMode) next.alphaMode = alphaMode

  const lValue = normalizeFiniteNumber((value as { lValue?: unknown }).lValue)
  const cValue = normalizeFiniteNumber((value as { cValue?: unknown }).cValue)
  const hValue = normalizeFiniteNumber((value as { hValue?: unknown }).hValue)
  const alphaValue = normalizeFiniteNumber((value as { alphaValue?: unknown }).alphaValue)
  if (typeof lValue === "number") next.lValue = lValue
  if (typeof cValue === "number") next.cValue = cValue
  if (typeof hValue === "number") next.hValue = hValue
  if (typeof alphaValue === "number") next.alphaValue = alphaValue

  return Object.keys(next).length > 0 ? next : undefined
}

function sanitizePreview(value: unknown): ColorCanvasNodePreview | undefined {
  if (!value || typeof value !== "object") return undefined
  const kind = normalizeText((value as { kind?: unknown }).kind)
  if (!kind || !SYSTEM_CANVAS_PREVIEW_KINDS.has(kind as ColorCanvasNodePreview["kind"])) {
    return undefined
  }

  const preview: ColorCanvasNodePreview = {
    kind: kind as ColorCanvasNodePreview["kind"],
  }

  const sectionId = normalizeText((value as { sectionId?: unknown }).sectionId)
  if (
    sectionId &&
    SYSTEM_CANVAS_PREVIEW_SECTION_IDS.has(sectionId as NonNullable<ColorCanvasNodePreview["sectionId"]>)
  ) {
    preview.sectionId = sectionId as NonNullable<ColorCanvasNodePreview["sectionId"]>
  }

  const stringKeys: Array<keyof ColorCanvasNodePreview> = [
    "title",
    "description",
    "cssVar",
    "secondaryVar",
    "fontFamilyVar",
    "sampleText",
    "note",
    "badge",
    "iconLibraryId",
    "gapVar",
    "paddingVar",
    "code",
    "codeLanguage",
  ]

  stringKeys.forEach((key) => {
    const nextValue = normalizeText((value as Record<string, unknown>)[key])
    if (nextValue) {
      ;(preview as unknown as Record<string, unknown>)[key] = nextValue
    }
  })

  const size = normalizeText((value as { size?: unknown }).size)
  if (size && ["sm", "md", "lg"].includes(size)) {
    preview.size = size as NonNullable<ColorCanvasNodePreview["size"]>
  }

  const variant = normalizeText((value as { variant?: unknown }).variant)
  if (variant && ["primary", "secondary", "ghost", "danger"].includes(variant)) {
    preview.variant = variant as NonNullable<ColorCanvasNodePreview["variant"]>
  }

  const columns = normalizeFiniteNumber((value as { columns?: unknown }).columns)
  if (typeof columns === "number") {
    preview.columns = Math.max(1, Math.round(columns))
  }

  const iconKeys = Array.isArray((value as { iconKeys?: unknown[] }).iconKeys)
    ? (value as { iconKeys: unknown[] }).iconKeys.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    : []
  if (iconKeys.length > 0) preview.iconKeys = iconKeys

  const tokens = Array.isArray((value as { tokens?: unknown[] }).tokens)
    ? (value as { tokens: unknown[] }).tokens.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    : []
  if (tokens.length > 0) preview.tokens = tokens

  const mappings = Array.isArray((value as { mappings?: unknown[] }).mappings)
    ? (value as { mappings: unknown[] }).mappings
        .filter((entry): entry is { label?: unknown; value?: unknown } => Boolean(entry) && typeof entry === "object")
        .map((entry) => ({
          label: normalizeText(entry.label) || "",
          value: normalizeText(entry.value) || "",
        }))
        .filter((entry) => entry.label && entry.value)
    : []
  if (mappings.length > 0) preview.mappings = mappings

  return preview
}

function sanitizeSystemCanvasGroup(
  value: unknown,
  preview?: ColorCanvasNodePreview
): NonNullable<ColorCanvasNode["group"]> {
  if (typeof value === "string" && SYSTEM_CANVAS_NODE_GROUPS.has(value as NonNullable<ColorCanvasNode["group"]>)) {
    return value as NonNullable<ColorCanvasNode["group"]>
  }
  return preview ? "system-preview" : "system-support"
}

function sanitizeSystemCanvasNodeInput(node: unknown): (Omit<ColorCanvasNode, "id"> & { id?: string }) | null {
  if (!node || typeof node !== "object") return null

  const type = normalizeText((node as { type?: unknown }).type)
  const label = normalizeText((node as { label?: unknown }).label)
  if (!type || !SYSTEM_CANVAS_NODE_TYPES.has(type as ColorCanvasNode["type"]) || !label) {
    return null
  }

  const preview = sanitizePreview((node as { preview?: unknown }).preview)
  const nextNode: Omit<ColorCanvasNode, "id"> & { id?: string } = {
    type: type as ColorCanvasNode["type"],
    label,
    position: sanitizeSystemCanvasPosition((node as { position?: unknown }).position),
    group: sanitizeSystemCanvasGroup((node as { group?: unknown }).group, preview),
  }

  const id = normalizeText((node as { id?: unknown }).id)
  if (id) nextNode.id = id

  const size = sanitizeSystemCanvasSize((node as { size?: unknown }).size)
  if (size) nextNode.size = size

  const role = normalizeText((node as { role?: unknown }).role)
  if (role && SYSTEM_CANVAS_NODE_ROLES.has(role as NonNullable<ColorCanvasNode["role"]>)) {
    nextNode.role = role as NonNullable<ColorCanvasNode["role"]>
  }

  const framework = normalizeText((node as { framework?: unknown }).framework)
  if (framework && SYSTEM_CANVAS_FRAMEWORKS.has(framework as ColorCanvasFrameworkId)) {
    nextNode.framework = framework as ColorCanvasFrameworkId
  }

  const semanticKind = normalizeText((node as { semanticKind?: unknown }).semanticKind)
  if (semanticKind && SYSTEM_CANVAS_SEMANTIC_KINDS.has(semanticKind as ColorCanvasSemanticKind)) {
    nextNode.semanticKind = semanticKind as ColorCanvasSemanticKind
  }

  const cssVar = normalizeText((node as { cssVar?: unknown }).cssVar)
  if (cssVar) nextNode.cssVar = cssVar

  const value = normalizeText((node as { value?: unknown }).value)
  if (value) nextNode.value = value

  const relative = sanitizeRelativeSpec((node as { relative?: unknown }).relative)
  if (relative) nextNode.relative = relative

  if (preview) nextNode.preview = preview

  return nextNode
}

function sanitizeSystemCanvasNodePatch(
  patch: unknown
): Partial<Omit<ColorCanvasNode, "id">> {
  if (!patch || typeof patch !== "object") return {}

  const nextPatch: Partial<Omit<ColorCanvasNode, "id">> = {}

  const type = normalizeText((patch as { type?: unknown }).type)
  if (type && SYSTEM_CANVAS_NODE_TYPES.has(type as ColorCanvasNode["type"])) {
    nextPatch.type = type as ColorCanvasNode["type"]
  }

  const label = normalizeText((patch as { label?: unknown }).label)
  if (label) nextPatch.label = label

  if ("position" in (patch as object)) {
    nextPatch.position = sanitizeSystemCanvasPosition((patch as { position?: unknown }).position)
  }

  if ("size" in (patch as object)) {
    const size = sanitizeSystemCanvasSize((patch as { size?: unknown }).size)
    if (size) nextPatch.size = size
  }

  const preview = sanitizePreview((patch as { preview?: unknown }).preview)
  if (preview) nextPatch.preview = preview

  const group = normalizeText((patch as { group?: unknown }).group)
  if (group && SYSTEM_CANVAS_NODE_GROUPS.has(group as NonNullable<ColorCanvasNode["group"]>)) {
    nextPatch.group = group as NonNullable<ColorCanvasNode["group"]>
  } else if (preview) {
    nextPatch.group = sanitizeSystemCanvasGroup(undefined, preview)
  }

  const role = normalizeText((patch as { role?: unknown }).role)
  if (role && SYSTEM_CANVAS_NODE_ROLES.has(role as NonNullable<ColorCanvasNode["role"]>)) {
    nextPatch.role = role as NonNullable<ColorCanvasNode["role"]>
  }

  const framework = normalizeText((patch as { framework?: unknown }).framework)
  if (framework && SYSTEM_CANVAS_FRAMEWORKS.has(framework as ColorCanvasFrameworkId)) {
    nextPatch.framework = framework as ColorCanvasFrameworkId
  }

  const semanticKind = normalizeText((patch as { semanticKind?: unknown }).semanticKind)
  if (semanticKind && SYSTEM_CANVAS_SEMANTIC_KINDS.has(semanticKind as ColorCanvasSemanticKind)) {
    nextPatch.semanticKind = semanticKind as ColorCanvasSemanticKind
  }

  const cssVar = normalizeText((patch as { cssVar?: unknown }).cssVar)
  if (cssVar) nextPatch.cssVar = cssVar

  const value = normalizeText((patch as { value?: unknown }).value)
  if (value) nextPatch.value = value

  const relative = sanitizeRelativeSpec((patch as { relative?: unknown }).relative)
  if (relative) nextPatch.relative = relative

  return nextPatch
}

function sanitizeEdgeRule(value: unknown): ColorCanvasEdgeRule | undefined {
  if (!value || typeof value !== "object") return undefined
  const nextRule: ColorCanvasEdgeRule = {}
  const model = normalizeText((value as { model?: unknown }).model)
  if (model && SYSTEM_CANVAS_COLOR_MODELS.has(model as ColorCanvasColorModel)) {
    nextRule.model = model as ColorCanvasColorModel
  }
  const targetLc = normalizeFiniteNumber((value as { targetLc?: unknown }).targetLc)
  if (typeof targetLc === "number") {
    nextRule.targetLc = targetLc
  }
  const note = normalizeText((value as { note?: unknown }).note)
  if (note) nextRule.note = note
  return Object.keys(nextRule).length > 0 ? nextRule : undefined
}

function sanitizeSystemCanvasEdgeInput(edge: unknown): (Omit<ColorCanvasEdge, "id"> & { id?: string }) | null {
  if (!edge || typeof edge !== "object") return null
  const sourceId = normalizeText((edge as { sourceId?: unknown }).sourceId)
  const targetId = normalizeText((edge as { targetId?: unknown }).targetId)
  const type = normalizeText((edge as { type?: unknown }).type)
  if (!sourceId || !targetId || !type || !SYSTEM_CANVAS_EDGE_TYPES.has(type as ColorCanvasEdge["type"])) {
    return null
  }
  const nextEdge: Omit<ColorCanvasEdge, "id"> & { id?: string } = {
    sourceId,
    targetId,
    type: type as ColorCanvasEdge["type"],
  }
  const id = normalizeText((edge as { id?: unknown }).id)
  if (id) nextEdge.id = id
  const rule = sanitizeEdgeRule((edge as { rule?: unknown }).rule)
  if (rule) nextEdge.rule = rule
  return nextEdge
}

function sanitizeSystemCanvasEdgePatch(
  patch: unknown
): Partial<Omit<ColorCanvasEdge, "id">> {
  if (!patch || typeof patch !== "object") return {}
  const nextPatch: Partial<Omit<ColorCanvasEdge, "id">> = {}
  const sourceId = normalizeText((patch as { sourceId?: unknown }).sourceId)
  const targetId = normalizeText((patch as { targetId?: unknown }).targetId)
  const type = normalizeText((patch as { type?: unknown }).type)
  if (sourceId) nextPatch.sourceId = sourceId
  if (targetId) nextPatch.targetId = targetId
  if (type && SYSTEM_CANVAS_EDGE_TYPES.has(type as ColorCanvasEdge["type"])) {
    nextPatch.type = type as ColorCanvasEdge["type"]
  }
  const rule = sanitizeEdgeRule((patch as { rule?: unknown }).rule)
  if (rule) nextPatch.rule = rule
  return nextPatch
}

export function isSystemCanvasViewMode(value: unknown): value is SystemCanvasViewMode {
  return typeof value === "string" && (SYSTEM_CANVAS_VIEW_MODES as readonly string[]).includes(value)
}

export function sanitizeSystemCanvasConfigPatch(
  patch: unknown
): Partial<DesignSystemScaleConfig> {
  if (!patch || typeof patch !== "object") return {}

  const nextPatch: Partial<DesignSystemScaleConfig> = {}

  for (const [rawKey, rawValue] of Object.entries(patch)) {
    const key = rawKey as keyof DesignSystemScaleConfig
    if (!DESIGN_SYSTEM_CONFIG_KEYS.has(key)) continue

    if (DESIGN_SYSTEM_STRING_KEYS.has(key)) {
      if (typeof rawValue === "string" && rawValue.trim()) {
        nextPatch[key] = rawValue.trim() as never
      }
      continue
    }

    if (key === "iconLibrary") {
      if (typeof rawValue === "string" && DESIGN_SYSTEM_ICON_LIBRARY_VALUES.has(rawValue as DesignSystemIconLibraryId)) {
        nextPatch[key] = rawValue as never
      }
      continue
    }

    if (DESIGN_SYSTEM_NUMBER_KEYS.has(key)) {
      const numericValue =
        typeof rawValue === "number"
          ? rawValue
          : typeof rawValue === "string" && rawValue.trim()
            ? Number.parseFloat(rawValue)
            : Number.NaN
      if (Number.isFinite(numericValue)) {
        nextPatch[key] = numericValue as never
      }
    }
  }

  return nextPatch
}

export function applySystemCanvasGraphOperation(
  inputState: Partial<ColorCanvasState> | null | undefined,
  operation: SystemCanvasOperation
): ColorCanvasState {
  const state = normalizeSystemCanvasState(inputState)

  switch (operation.type) {
    case "create-node": {
      const nextNode = sanitizeSystemCanvasNodeInput(operation.node)
      if (!nextNode) return state
      const id = nextNode.id || createSystemCanvasNodeId()
      if (state.nodes.some((node) => node.id === id)) return state
      return {
        ...state,
        nodes: [...state.nodes, { ...nextNode, id }],
        selectedNodeId: operation.select === false ? state.selectedNodeId ?? null : id,
        selectedEdgeId: operation.select === false ? state.selectedEdgeId ?? null : null,
      }
    }
    case "update-node": {
      const patch = sanitizeSystemCanvasNodePatch(operation.patch)
      if (Object.keys(patch).length === 0) return state
      return {
        ...state,
        nodes: state.nodes.map((node) =>
          node.id === operation.nodeId ? { ...node, ...patch } : node
        ),
      }
    }
    case "delete-node": {
      if (!state.nodes.some((node) => node.id === operation.nodeId)) return state
      return {
        ...state,
        nodes: state.nodes.filter((node) => node.id !== operation.nodeId),
        edges: state.edges.filter(
          (edge) => edge.sourceId !== operation.nodeId && edge.targetId !== operation.nodeId
        ),
        selectedNodeId: state.selectedNodeId === operation.nodeId ? null : state.selectedNodeId,
        selectedEdgeId:
          state.selectedEdgeId &&
          state.edges.some(
            (edge) =>
              edge.id === state.selectedEdgeId &&
              (edge.sourceId === operation.nodeId || edge.targetId === operation.nodeId)
          )
            ? null
            : state.selectedEdgeId,
      }
    }
    case "create-edge": {
      const nextEdge = sanitizeSystemCanvasEdgeInput(operation.edge)
      if (!nextEdge) return state
      if (
        !state.nodes.some((node) => node.id === nextEdge.sourceId) ||
        !state.nodes.some((node) => node.id === nextEdge.targetId)
      ) {
        return state
      }
      const id = nextEdge.id || createSystemCanvasEdgeId()
      if (state.edges.some((edge) => edge.id === id)) return state
      return {
        ...state,
        edges: [...state.edges, { ...nextEdge, id }],
        selectedEdgeId: operation.select === false ? state.selectedEdgeId ?? null : id,
        selectedNodeId: operation.select === false ? state.selectedNodeId ?? null : null,
      }
    }
    case "update-edge": {
      const patch = sanitizeSystemCanvasEdgePatch(operation.patch)
      if (Object.keys(patch).length === 0) return state
      return {
        ...state,
        edges: state.edges.map((edge) =>
          edge.id === operation.edgeId ? { ...edge, ...patch } : edge
        ),
      }
    }
    case "delete-edge": {
      if (!state.edges.some((edge) => edge.id === operation.edgeId)) return state
      return {
        ...state,
        edges: state.edges.filter((edge) => edge.id !== operation.edgeId),
        selectedEdgeId: state.selectedEdgeId === operation.edgeId ? null : state.selectedEdgeId,
        edgeUndoStack: (() => {
          const removedEdge = state.edges.find((edge) => edge.id === operation.edgeId)
          if (!removedEdge) return state.edgeUndoStack
          return [removedEdge, ...state.edgeUndoStack].slice(0, 25)
        })(),
      }
    }
    default:
      return state
  }
}

export function createEmptySystemCanvasState() {
  return EMPTY_SYSTEM_CANVAS_STATE
}
