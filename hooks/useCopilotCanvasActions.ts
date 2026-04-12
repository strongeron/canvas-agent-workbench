import { useMemo } from "react"

import { useCopilotAction, useCopilotReadable } from "@copilotkit/react-core"

import { convertMermaidSourceToExcalidrawScene } from "../components/canvas/excalidrawMermaid"
import { ensureFontPairLoaded } from "../components/canvas/fontLoader"
import {
  FONT_PAIR_PRESETS,
  buildFontPairThemeVars,
  getFontPairById,
} from "../components/canvas/fontPairs"
import { normalizeCanvasEmbedUrl } from "../components/canvas/embedUrl"
import type { GalleryEntry } from "../core/types"
import type { CanvasItem, CanvasItemInput, CanvasItemUpdate } from "../types/canvas"
import type { ThemeOption } from "../types/theme"
import {
  runCreateExcalidrawNodeAction,
  runCreateMermaidNodeAction,
  runRemapExcalidrawFromMermaidAction,
} from "./copilotCanvasDiagramActions"

const COMPONENT_LAYOUT_DEFAULTS: Record<string, { width: number; height: number }> = {
  small: { width: 220, height: 120 },
  medium: { width: 350, height: 180 },
  large: { width: 500, height: 260 },
  full: { width: 600, height: 300 },
}

const DEFAULT_EMBED_SIZE = { width: 640, height: 360 }
const DEFAULT_MEDIA_SIZE = { width: 480, height: 270 }
const DEFAULT_MARKDOWN_SIZE = { width: 700, height: 460 }
const DEFAULT_MERMAID_SIZE = { width: 640, height: 420 }
const DEFAULT_EXCALIDRAW_SIZE = { width: 760, height: 500 }
const DEFAULT_ARTBOARD_SIZE = { width: 800, height: 600 }
const DEFAULT_TYPOGRAPHY_BOARD_SIZE = { width: 1560, height: 1120 }
const DEFAULT_PRIMITIVE_BOARD_SIZE = { width: 1440, height: 960 }
const DEFAULT_TYPOGRAPHY_COMPONENT_CANDIDATES = [
  "marketing/typography-hero",
  "ui/typography-hero",
]
const FOUNDATION_PRIMITIVE_IDS = {
  heading: "primitive/heading",
  text: "primitive/text",
  button: "primitive/button",
  surface: "primitive/surface",
  stack: "primitive/stack",
  box: "primitive/box",
} as const

interface Point {
  x: number
  y: number
}

interface Size {
  width: number
  height: number
}

interface CreateCanvasItemArgs {
  type?: "component" | "embed" | "media" | "markdown" | "mermaid" | "excalidraw" | "artboard"
  position?: Point
  size?: Size
  componentId?: string
  variantIndex?: number
  url?: string
  src?: string
  source?: string
  title?: string
  name?: string
  parentId?: string
  order?: number
  mediaKind?: "image" | "video" | "gif"
  mermaidTheme?: "default" | "neutral" | "dark" | "forest" | "base"
  sourceMermaid?: string
  background?: string
}

interface UpdateCanvasItemArgs {
  itemId?: string
  position?: Point
  size?: Size
  rotation?: number
  parentId?: string | null
  order?: number | null
  url?: string
  src?: string
  source?: string
  name?: string
  title?: string
  mediaKind?: "image" | "video" | "gif"
  mermaidTheme?: "default" | "neutral" | "dark" | "forest" | "base"
  sourceMermaid?: string
  scene?: Record<string, unknown>
  background?: string
  embedPreviewMode?: "auto" | "iframe" | "snapshot" | "live"
}

interface DeleteCanvasItemsArgs {
  itemIds?: string[]
  all?: boolean
}

interface ConvertMermaidToExcalidrawArgs {
  itemId?: string
  keepOriginal?: boolean
  position?: Point
  size?: Size
}

interface SearchWebArgs {
  query?: string
  provider?: "auto" | "tavily" | "brave" | "serpapi"
  maxResults?: number
}

interface GetRouteArgs {
  origin?: string
  destination?: string
  mode?: "driving" | "walking" | "cycling" | "transit"
  provider?: "auto" | "mapbox" | "google"
}

interface SearchAssetsArgs {
  query?: string
  type?: "image" | "video" | "gif" | "mixed"
  license?: "any" | "free" | "commercial"
  provider?: "auto" | "pexels" | "unsplash" | "giphy" | "pixabay" | "youtube" | "pinterest" | "web"
  maxResults?: number
}

interface ImportAssetFromUrlArgs {
  url?: string
  filename?: string
  mediaKind?: "image" | "video" | "gif"
  addToCanvas?: boolean
  position?: Point
  size?: Size
  parentId?: string
  order?: number
}

interface CreateMapNodeFromRouteArgs {
  origin?: string
  destination?: string
  mode?: "driving" | "walking" | "cycling" | "transit"
  provider?: "auto" | "mapbox" | "google"
  name?: string
  position?: Point
  size?: Size
  parentId?: string
  order?: number
}

interface SetComponentPropsArgs {
  itemId?: string
  props?: Record<string, unknown>
  merge?: boolean
}

interface SetThemeTokenArgs {
  themeId?: string
  cssVar?: string
  value?: string
}

interface ApplyFontPairToSelectionArgs {
  pairId?: string
  scope?: "node" | "artboard" | "theme"
  itemIds?: string[]
  artboardId?: string
  themeId?: string
  merge?: boolean
}

interface GenerateTypographyBoardArgs {
  name?: string
  componentId?: string
  variantIndex?: number
  pairIds?: string[]
  position?: Point
  size?: Size
  columns?: number
}

interface CreatePrimitiveBoardArgs {
  name?: string
  title?: string
  description?: string
  ctaLabel?: string
  position?: Point
  size?: Size
  themeId?: string
}

interface UseCopilotCanvasActionsInput {
  items: CanvasItem[]
  selectedIds: string[]
  entries: GalleryEntry[]
  themes: ThemeOption[]
  activeThemeId: string
  addItem: (item: CanvasItemInput) => string
  updateItem: (id: string, updates: CanvasItemUpdate) => void
  removeItem: (id: string) => void
  clearCanvas: () => void
  updateThemeVar: (themeId: string, cssVar: string, value: string) => void
}

function clampPosition(position?: Point): Point {
  return {
    x: Math.max(0, Number(position?.x ?? 80) || 80),
    y: Math.max(0, Number(position?.y ?? 80) || 80),
  }
}

function clampSize(size: Size | undefined, fallback: Size): Size {
  return {
    width: Math.max(80, Number(size?.width ?? fallback.width) || fallback.width),
    height: Math.max(50, Number(size?.height ?? fallback.height) || fallback.height),
  }
}

function getDefaultComponentSize(entries: GalleryEntry[], componentId: string | undefined): Size {
  if (!componentId) return COMPONENT_LAYOUT_DEFAULTS.medium
  const entry = entries.find((candidate) => candidate.id === componentId)
  const canvasSize = entry?.canvas?.defaultSize
  if (canvasSize) {
    return {
      width: Math.max(100, Number(canvasSize.width) || COMPONENT_LAYOUT_DEFAULTS.medium.width),
      height: Math.max(50, Number(canvasSize.height) || COMPONENT_LAYOUT_DEFAULTS.medium.height),
    }
  }
  const layoutSize = entry?.layoutSize || "medium"
  return COMPONENT_LAYOUT_DEFAULTS[layoutSize] || COMPONENT_LAYOUT_DEFAULTS.medium
}

function inferMediaKindFromSrc(src: string): "image" | "video" | "gif" {
  const lower = src.toLowerCase()
  if (lower.endsWith(".gif") || lower.includes(".gif?")) return "gif"
  if (/\.(mp4|webm|mov|m4v|ogg)(\?|#|$)/.test(lower)) return "video"
  if (lower.includes("youtube.com") || lower.includes("youtu.be") || lower.includes("vimeo.com")) {
    return "video"
  }
  return "image"
}

function normalizeCssVarName(cssVar: string) {
  const trimmed = cssVar.trim()
  if (!trimmed) return ""
  if (trimmed.startsWith("--")) return trimmed
  return `--${trimmed}`
}

function normalizeIds(ids: string[] | undefined) {
  return (ids || [])
    .map((id) => id.trim())
    .filter((id) => id.length > 0)
}

function sanitizeCanvasItem(item: CanvasItem) {
  const base = {
    id: item.id,
    type: item.type,
    x: item.position.x,
    y: item.position.y,
    width: item.size.width,
    height: item.size.height,
    rotation: item.rotation,
    parentId: item.parentId,
  }

  if (item.type === "artboard") {
    return {
      ...base,
      name: item.name,
      layout: item.layout.display,
      childCount: 0,
    }
  }

  if (item.type === "component") {
    return {
      ...base,
      componentId: item.componentId,
      variantIndex: item.variantIndex,
    }
  }

  if (item.type === "embed") {
    return {
      ...base,
      url: item.url,
      previewMode: item.embedPreviewMode || "auto",
    }
  }

  if (item.type === "mermaid") {
    return {
      ...base,
      title: item.title || "Mermaid diagram",
      sourcePreview: item.source.slice(0, 180),
      mermaidTheme: item.mermaidTheme || "default",
    }
  }

  if (item.type === "excalidraw") {
    return {
      ...base,
      title: item.title || "Excalidraw sketch",
      elementCount: Array.isArray(item.scene?.elements) ? item.scene.elements.length : 0,
      hasSourceMermaid: Boolean(item.sourceMermaid),
    }
  }

  if (item.type === "markdown") {
    return {
      ...base,
      title: item.title || "Markdown note",
      sourcePreview: item.source.slice(0, 180),
    }
  }

  if (item.type === "html") {
    return {
      ...base,
      title: item.title || "HTML bundle",
      src: item.src,
      entryAsset: item.entryAsset || null,
    }
  }

  return {
    ...base,
    src: item.src,
    mediaKind: item.mediaKind || "image",
  }
}

async function postAgentApi(path: string, body: Record<string, unknown>) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const payload = await response.json().catch(() => ({} as Record<string, unknown>))
  if (!response.ok) {
    const error =
      typeof payload?.error === "string"
        ? payload.error
        : `Request failed (${response.status})`
    throw new Error(error)
  }
  return payload as Record<string, unknown>
}

export function useCopilotCanvasActions({
  items,
  selectedIds,
  entries,
  themes,
  activeThemeId,
  addItem,
  updateItem,
  removeItem,
  clearCanvas,
  updateThemeVar,
}: UseCopilotCanvasActionsInput) {
  const artboardSummaries = useMemo(() => {
    const counts = new Map<string, number>()
    items.forEach((item) => {
      if (!item.parentId) return
      counts.set(item.parentId, (counts.get(item.parentId) || 0) + 1)
    })

    return items
      .filter((item) => item.type === "artboard")
      .map((item) => ({
        id: item.id,
        name: item.name,
        x: item.position.x,
        y: item.position.y,
        width: item.size.width,
        height: item.size.height,
        layout: item.layout.display,
        childCount: counts.get(item.id) || 0,
      }))
  }, [items])

  const lightweightItems = useMemo(() => items.map((item) => sanitizeCanvasItem(item)), [items])

  const canvasReadableId = useCopilotReadable({
    description:
      "Canvas metadata. Types: component, embed, media, markdown, mermaid, excalidraw, artboard. Use tools to create/update/delete items.",
    value: {
      itemCount: items.length,
      selectedIds,
      itemTypes: ["component", "embed", "media", "markdown", "mermaid", "excalidraw", "artboard"],
    },
  })

  useCopilotReadable({
    description: "Artboards with bounds and child counts.",
    value: artboardSummaries,
    parentId: canvasReadableId,
  })

  useCopilotReadable({
    description: "All canvas items in lightweight form.",
    value: lightweightItems,
    parentId: canvasReadableId,
  })

  useCopilotReadable({
    description: "Available component ids and names that can be created in canvas.",
    value: entries.slice(0, 200).map((entry) => ({ id: entry.id, name: entry.name })),
    parentId: canvasReadableId,
  })

  useCopilotReadable({
    description:
      "Foundation primitives that are safe for HTML/CSS-native design system composition on canvas.",
    value: entries
      .filter((entry) => entry.primitive?.exportable)
      .map((entry) => ({
        id: entry.id,
        name: entry.name,
        family: entry.primitive?.family,
        level: entry.primitive?.level,
        htmlTag: entry.primitive?.htmlTag,
      })),
    parentId: canvasReadableId,
  })

  useCopilotReadable({
    description: "Theme ids available for token updates.",
    value: themes.map((theme) => ({
      id: theme.id,
      label: theme.label,
      hasOverrides: Boolean(theme.vars && Object.keys(theme.vars).length > 0),
    })),
    parentId: canvasReadableId,
  })

  useCopilotReadable({
    description:
      "Curated typography presets. Use pairId with applyFontPairToSelection or generateTypographyBoard.",
    value: FONT_PAIR_PRESETS.map((pair) => ({
      id: pair.id,
      label: pair.label,
      description: pair.description,
      displayFamily: pair.displayFamily,
      bodyFamily: pair.bodyFamily,
    })),
    parentId: canvasReadableId,
  })

  const applyThemeVars = (themeId: string, vars: Record<string, string>) => {
    Object.entries(vars).forEach(([cssVar, value]) => {
      updateThemeVar(themeId, cssVar, value)
    })
  }

  const getTypographyEntry = (preferredId: string | undefined) => {
    const normalizedPreferredId = preferredId?.trim()
    if (normalizedPreferredId) {
      return entries.find((entry) => entry.id === normalizedPreferredId) || null
    }
    for (const candidateId of DEFAULT_TYPOGRAPHY_COMPONENT_CANDIDATES) {
      const candidate = entries.find((entry) => entry.id === candidateId)
      if (candidate) return candidate
    }
    return entries[0] || null
  }

  const getPrimitiveEntry = (componentId: string) =>
    entries.find((entry) => entry.id === componentId && Boolean(entry.primitive?.exportable)) || null

  useCopilotAction({
    name: "createCanvasItem",
    description: "Create a canvas item of type component/embed/media/markdown/mermaid/excalidraw/artboard.",
    parameters: [
      {
        name: "type",
        type: "string",
        required: true,
        enum: ["component", "embed", "media", "markdown", "mermaid", "excalidraw", "artboard"],
      },
      {
        name: "position",
        type: "object",
        required: false,
        attributes: [
          { name: "x", type: "number", required: false },
          { name: "y", type: "number", required: false },
        ],
      },
      {
        name: "size",
        type: "object",
        required: false,
        attributes: [
          { name: "width", type: "number", required: false },
          { name: "height", type: "number", required: false },
        ],
      },
      { name: "componentId", type: "string", required: false },
      { name: "variantIndex", type: "number", required: false },
      { name: "url", type: "string", required: false },
      { name: "src", type: "string", required: false },
      { name: "source", type: "string", required: false },
      { name: "title", type: "string", required: false },
      { name: "name", type: "string", required: false },
      { name: "parentId", type: "string", required: false },
      { name: "order", type: "number", required: false },
      { name: "mediaKind", type: "string", enum: ["image", "video", "gif"], required: false },
      {
        name: "mermaidTheme",
        type: "string",
        enum: ["default", "neutral", "dark", "forest", "base"],
        required: false,
      },
      { name: "sourceMermaid", type: "string", required: false },
      { name: "background", type: "string", required: false },
    ],
    handler: async (rawArgs: unknown) => {
      const args = (rawArgs || {}) as CreateCanvasItemArgs
      if (!args.type) {
        return { ok: false, error: "type is required" }
      }

      const basePosition = clampPosition(args.position)
      const parentId = args.parentId && args.parentId.trim() ? args.parentId.trim() : undefined
      const order = typeof args.order === "number" ? Math.max(0, Math.floor(args.order)) : undefined
      const parentProps = {
        ...(parentId ? { parentId } : {}),
        ...(order !== undefined ? { order } : {}),
      }

      let createdId: string

      if (args.type === "component") {
        const componentId = args.componentId || entries[0]?.id
        if (!componentId) {
          return { ok: false, error: "No available componentId to create a component item." }
        }
        const componentSize = clampSize(args.size, getDefaultComponentSize(entries, componentId))
        createdId = addItem({
          type: "component",
          componentId,
          variantIndex: Math.max(0, Math.floor(args.variantIndex ?? 0)),
          position: basePosition,
          size: componentSize,
          rotation: 0,
          ...parentProps,
        })
        return { ok: true, itemId: createdId }
      }

      if (args.type === "embed") {
        if (!args.url || !args.url.trim()) {
          return { ok: false, error: "url is required when creating embed items." }
        }
        createdId = addItem({
          type: "embed",
          url: args.url.trim(),
          position: basePosition,
          size: clampSize(args.size, DEFAULT_EMBED_SIZE),
          rotation: 0,
          embedPreviewMode: "auto",
          embedFrameStatus: "unknown",
          embedSnapshotStatus: "idle",
          embedLiveStatus: "idle",
          embedCaptureStatus: "idle",
          ...parentProps,
        })
        return { ok: true, itemId: createdId }
      }

      if (args.type === "media") {
        if (!args.src || !args.src.trim()) {
          return { ok: false, error: "src is required when creating media items." }
        }
        const src = args.src.trim()
        const mediaKind = args.mediaKind || inferMediaKindFromSrc(src)
        createdId = addItem({
          type: "media",
          src,
          mediaKind,
          controls: mediaKind === "video",
          muted: mediaKind === "video" ? true : undefined,
          loop: mediaKind === "gif",
          autoplay: false,
          objectFit: "cover",
          position: basePosition,
          size: clampSize(args.size, DEFAULT_MEDIA_SIZE),
          rotation: 0,
          ...parentProps,
        })
        return { ok: true, itemId: createdId }
      }

      if (args.type === "markdown") {
        createdId = addItem({
          type: "markdown",
          source: (args.source || "").trim() || "# Markdown\n\nNew note.",
          title: args.title?.trim() || "Markdown note",
          background: args.background?.trim() || undefined,
          position: basePosition,
          size: clampSize(args.size, DEFAULT_MARKDOWN_SIZE),
          rotation: 0,
          ...parentProps,
        })
        return { ok: true, itemId: createdId }
      }

      if (args.type === "mermaid") {
        createdId = addItem({
          type: "mermaid",
          source: (args.source || "").trim() || "flowchart LR\nA-->B",
          title: args.title?.trim() || "Mermaid diagram",
          mermaidTheme: args.mermaidTheme || "default",
          position: basePosition,
          size: clampSize(args.size, DEFAULT_MERMAID_SIZE),
          rotation: 0,
          ...parentProps,
        })
        return { ok: true, itemId: createdId }
      }

      if (args.type === "excalidraw") {
        createdId = addItem({
          type: "excalidraw",
          title: args.title?.trim() || "Excalidraw sketch",
          scene: {
            elements: [],
            appState: { viewBackgroundColor: "#ffffff" },
            files: {},
          },
          sourceMermaid: args.sourceMermaid?.trim() || undefined,
          position: basePosition,
          size: clampSize(args.size, DEFAULT_EXCALIDRAW_SIZE),
          rotation: 0,
          ...parentProps,
        })
        return { ok: true, itemId: createdId }
      }

      const artboardCount = items.filter((item) => item.type === "artboard").length
      createdId = addItem({
        type: "artboard",
        name: args.name?.trim() || `Artboard ${artboardCount + 1}`,
        position: basePosition,
        size: clampSize(args.size, DEFAULT_ARTBOARD_SIZE),
        rotation: 0,
        background: "white",
        layout: {
          display: "flex",
          direction: "column",
          align: "start",
          justify: "start",
          gap: 16,
          padding: 24,
        },
      })

      return { ok: true, itemId: createdId }
    },
  })

  useCopilotAction({
    name: "createMermaidNode",
    description: "Create a Mermaid diagram node on canvas.",
    parameters: [
      { name: "source", type: "string", required: false },
      { name: "title", type: "string", required: false },
      {
        name: "mermaidTheme",
        type: "string",
        enum: ["default", "neutral", "dark", "forest", "base"],
        required: false,
      },
      {
        name: "position",
        type: "object",
        required: false,
        attributes: [
          { name: "x", type: "number", required: false },
          { name: "y", type: "number", required: false },
        ],
      },
      {
        name: "size",
        type: "object",
        required: false,
        attributes: [
          { name: "width", type: "number", required: false },
          { name: "height", type: "number", required: false },
        ],
      },
      { name: "parentId", type: "string", required: false },
      { name: "order", type: "number", required: false },
    ],
    handler: async (rawArgs: unknown) => {
      try {
        return await runCreateMermaidNodeAction(addItem, rawArgs)
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Failed to create Mermaid node.",
        }
      }
    },
  })

  useCopilotAction({
    name: "createExcalidrawNode",
    description:
      "Create an Excalidraw node. If sourceMermaid is provided, it is converted into an initial Excalidraw scene.",
    parameters: [
      { name: "title", type: "string", required: false },
      { name: "sourceMermaid", type: "string", required: false },
      { name: "scene", type: "object", required: false },
      {
        name: "position",
        type: "object",
        required: false,
        attributes: [
          { name: "x", type: "number", required: false },
          { name: "y", type: "number", required: false },
        ],
      },
      {
        name: "size",
        type: "object",
        required: false,
        attributes: [
          { name: "width", type: "number", required: false },
          { name: "height", type: "number", required: false },
        ],
      },
      { name: "parentId", type: "string", required: false },
      { name: "order", type: "number", required: false },
    ],
    handler: async (rawArgs: unknown) => {
      try {
        return await runCreateExcalidrawNodeAction(addItem, rawArgs)
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Failed to create Excalidraw node.",
        }
      }
    },
  })

  useCopilotAction({
    name: "remapExcalidrawFromMermaid",
    description:
      "Remap an existing Excalidraw node from Mermaid source. Provide source directly or reference mermaidItemId.",
    parameters: [
      { name: "excalidrawItemId", type: "string", required: false },
      { name: "mermaidItemId", type: "string", required: false },
      { name: "source", type: "string", required: false },
      { name: "title", type: "string", required: false },
    ],
    handler: async (rawArgs: unknown) => {
      try {
        return await runRemapExcalidrawFromMermaidAction(
          {
            items,
            selectedIds,
            updateItem,
          },
          rawArgs
        )
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Failed to remap Excalidraw from Mermaid.",
        }
      }
    },
  })

  useCopilotAction({
    name: "updateCanvasItem",
    description: "Update an existing canvas item by id.",
    parameters: [
      { name: "itemId", type: "string", required: true },
      {
        name: "position",
        type: "object",
        required: false,
        attributes: [
          { name: "x", type: "number", required: false },
          { name: "y", type: "number", required: false },
        ],
      },
      {
        name: "size",
        type: "object",
        required: false,
        attributes: [
          { name: "width", type: "number", required: false },
          { name: "height", type: "number", required: false },
        ],
      },
      { name: "rotation", type: "number", required: false },
      { name: "parentId", type: "string", required: false },
      { name: "order", type: "number", required: false },
      { name: "url", type: "string", required: false },
      { name: "src", type: "string", required: false },
      { name: "source", type: "string", required: false },
      { name: "name", type: "string", required: false },
      { name: "title", type: "string", required: false },
      { name: "mediaKind", type: "string", enum: ["image", "video", "gif"], required: false },
      {
        name: "mermaidTheme",
        type: "string",
        enum: ["default", "neutral", "dark", "forest", "base"],
        required: false,
      },
      { name: "sourceMermaid", type: "string", required: false },
      { name: "scene", type: "object", required: false },
      { name: "background", type: "string", required: false },
      {
        name: "embedPreviewMode",
        type: "string",
        enum: ["auto", "iframe", "snapshot", "live"],
        required: false,
      },
    ],
    handler: async (rawArgs: unknown) => {
      const args = (rawArgs || {}) as UpdateCanvasItemArgs
      if (!args.itemId || !args.itemId.trim()) {
        return { ok: false, error: "itemId is required" }
      }

      const updates: Record<string, unknown> = {}
      if (args.position) {
        updates.position = clampPosition(args.position)
      }
      if (args.size) {
        updates.size = clampSize(args.size, { width: 120, height: 80 })
      }
      if (typeof args.rotation === "number") {
        updates.rotation = args.rotation
      }
      if (args.parentId !== undefined) {
        updates.parentId = args.parentId || undefined
      }
      if (args.order !== undefined) {
        updates.order =
          args.order === null
            ? undefined
            : Math.max(0, Math.floor(Number(args.order) || 0))
      }
      if (typeof args.url === "string") updates.url = args.url
      if (typeof args.src === "string") updates.src = args.src
      if (typeof args.source === "string") updates.source = args.source
      if (typeof args.name === "string") updates.name = args.name
      if (typeof args.title === "string") updates.title = args.title
      if (typeof args.mediaKind === "string") updates.mediaKind = args.mediaKind
      if (typeof args.mermaidTheme === "string") updates.mermaidTheme = args.mermaidTheme
      if (typeof args.sourceMermaid === "string") updates.sourceMermaid = args.sourceMermaid
      if (args.scene && typeof args.scene === "object") updates.scene = args.scene
      if (typeof args.background === "string") updates.background = args.background
      if (typeof args.embedPreviewMode === "string") updates.embedPreviewMode = args.embedPreviewMode

      if (Object.keys(updates).length === 0) {
        return { ok: false, error: "No updates provided." }
      }

      updateItem(args.itemId.trim(), updates as CanvasItemUpdate)
      return { ok: true, itemId: args.itemId.trim() }
    },
  })

  useCopilotAction({
    name: "setComponentProps",
    description:
      "Set custom props on a component node. Useful for interactiveSchema-driven components like typography heroes.",
    parameters: [
      { name: "itemId", type: "string", required: false },
      { name: "props", type: "object", required: true },
      { name: "merge", type: "boolean", required: false },
    ],
    handler: async (rawArgs: unknown) => {
      const args = (rawArgs || {}) as SetComponentPropsArgs
      const itemId =
        args.itemId?.trim() ||
        selectedIds.find((id) => items.find((candidate) => candidate.id === id)?.type === "component")
      if (!itemId) {
        return { ok: false, error: "itemId is required (or select a component node)." }
      }

      const item = items.find((candidate) => candidate.id === itemId)
      if (!item || item.type !== "component") {
        return { ok: false, error: "itemId must reference an existing component node." }
      }

      if (!args.props || typeof args.props !== "object" || Array.isArray(args.props)) {
        return { ok: false, error: "props must be an object." }
      }

      const merge = args.merge !== false
      const baseProps =
        merge && item.customProps && typeof item.customProps === "object"
          ? (item.customProps as Record<string, unknown>)
          : {}
      const nextCustomProps = merge
        ? { ...baseProps, ...(args.props as Record<string, unknown>) }
        : { ...(args.props as Record<string, unknown>) }

      updateItem(itemId, { customProps: nextCustomProps } as CanvasItemUpdate)
      return { ok: true, itemId, merge, propKeys: Object.keys(nextCustomProps) }
    },
  })

  useCopilotAction({
    name: "setThemeToken",
    description:
      "Set a CSS variable on a theme (e.g. --font-family-display, --font-family-sans). If value is empty, token override is removed.",
    parameters: [
      { name: "themeId", type: "string", required: false },
      { name: "cssVar", type: "string", required: true },
      { name: "value", type: "string", required: true },
    ],
    handler: async (rawArgs: unknown) => {
      const args = (rawArgs || {}) as SetThemeTokenArgs
      const cssVar = normalizeCssVarName(args.cssVar || "")
      if (!cssVar) {
        return { ok: false, error: "cssVar is required." }
      }

      const themeId = args.themeId?.trim() || activeThemeId
      if (!themes.some((theme) => theme.id === themeId)) {
        return { ok: false, error: `Theme not found: ${themeId}` }
      }

      updateThemeVar(themeId, cssVar, args.value || "")
      return {
        ok: true,
        themeId,
        cssVar,
        value: (args.value || "").trim(),
      }
    },
  })

  useCopilotAction({
    name: "applyFontPairToSelection",
    description:
      "Apply a curated font pair to selected nodes, an artboard theme, or a specific theme.",
    parameters: [
      { name: "pairId", type: "string", required: true },
      { name: "scope", type: "string", enum: ["node", "artboard", "theme"], required: false },
      { name: "itemIds", type: "string[]", required: false },
      { name: "artboardId", type: "string", required: false },
      { name: "themeId", type: "string", required: false },
      { name: "merge", type: "boolean", required: false },
    ],
    handler: async (rawArgs: unknown) => {
      const args = (rawArgs || {}) as ApplyFontPairToSelectionArgs
      const pair = getFontPairById(args.pairId)
      if (!pair) {
        return { ok: false, error: "Unknown pairId. Use a preset from fontPairs registry." }
      }

      let fontLoadWarning: string | undefined
      try {
        await ensureFontPairLoaded(pair)
      } catch (error) {
        fontLoadWarning =
          error instanceof Error
            ? error.message
            : "Font pair applied, but remote web-font loading failed."
      }

      const scope = args.scope || "node"
      const themeVars = buildFontPairThemeVars(pair)

      if (scope === "theme") {
        const themeId = args.themeId?.trim() || activeThemeId
        if (!themes.some((theme) => theme.id === themeId)) {
          return { ok: false, error: `Theme not found: ${themeId}` }
        }
        applyThemeVars(themeId, themeVars)
        return { ok: true, scope, themeId, pairId: pair.id, fontLoadWarning }
      }

      if (scope === "artboard") {
        const artboardId =
          args.artboardId?.trim() ||
          selectedIds.find((id) => items.find((candidate) => candidate.id === id)?.type === "artboard") ||
          selectedIds
            .map((id) => items.find((candidate) => candidate.id === id))
            .find((candidate) => candidate && candidate.type !== "artboard" && candidate.parentId)
            ?.parentId

        if (!artboardId) {
          return { ok: false, error: "artboardId is required (or select an artboard/child item)." }
        }

        const artboard = items.find((candidate) => candidate.id === artboardId)
        if (!artboard || artboard.type !== "artboard") {
          return { ok: false, error: "artboardId must reference an existing artboard." }
        }

        const themeId = args.themeId?.trim() || artboard.themeId || activeThemeId
        if (!themes.some((theme) => theme.id === themeId)) {
          return { ok: false, error: `Theme not found: ${themeId}` }
        }
        if (artboard.themeId !== themeId) {
          updateItem(artboard.id, { themeId } as CanvasItemUpdate)
        }

        applyThemeVars(themeId, themeVars)
        const childCount = items.filter((candidate) => candidate.parentId === artboard.id).length
        return {
          ok: true,
          scope,
          pairId: pair.id,
          artboardId: artboard.id,
          themeId,
          childCount,
          fontLoadWarning,
        }
      }

      const targetIds = normalizeIds(args.itemIds)
      const candidateIds =
        targetIds.length > 0
          ? targetIds
          : selectedIds.filter((id) => items.find((candidate) => candidate.id === id)?.type === "component")
      if (candidateIds.length === 0) {
        return { ok: false, error: "No component nodes selected. Provide itemIds or select components." }
      }

      const merge = args.merge !== false
      const propsPatch = {
        fontPairId: pair.id,
        displayFont: pair.displayFamily,
        bodyFont: pair.bodyFamily,
      }

      const appliedIds: string[] = []
      candidateIds.forEach((itemId) => {
        const item = items.find((candidate) => candidate.id === itemId)
        if (!item || item.type !== "component") return
        const baseProps =
          merge && item.customProps && typeof item.customProps === "object"
            ? (item.customProps as Record<string, unknown>)
            : {}
        const customProps = merge ? { ...baseProps, ...propsPatch } : { ...propsPatch }
        updateItem(itemId, { customProps } as CanvasItemUpdate)
        appliedIds.push(itemId)
      })

      if (appliedIds.length === 0) {
        return { ok: false, error: "No valid component nodes were found for font pair application." }
      }

      return {
        ok: true,
        scope: "node",
        pairId: pair.id,
        itemIds: appliedIds,
        merge,
        fontLoadWarning,
      }
    },
  })

  useCopilotAction({
    name: "generateTypographyBoard",
    description:
      "Create an artboard with typography hero variants using different curated font pairs.",
    parameters: [
      { name: "name", type: "string", required: false },
      { name: "componentId", type: "string", required: false },
      { name: "variantIndex", type: "number", required: false },
      { name: "pairIds", type: "string[]", required: false },
      {
        name: "position",
        type: "object",
        required: false,
        attributes: [
          { name: "x", type: "number", required: false },
          { name: "y", type: "number", required: false },
        ],
      },
      {
        name: "size",
        type: "object",
        required: false,
        attributes: [
          { name: "width", type: "number", required: false },
          { name: "height", type: "number", required: false },
        ],
      },
      { name: "columns", type: "number", required: false },
    ],
    handler: async (rawArgs: unknown) => {
      const args = (rawArgs || {}) as GenerateTypographyBoardArgs
      const entry = getTypographyEntry(args.componentId)
      if (!entry) {
        return { ok: false, error: "No component entries are available to generate a typography board." }
      }

      if (!entry.variants || entry.variants.length === 0) {
        return { ok: false, error: `Component ${entry.id} has no variants.` }
      }

      const variantIndex = Math.min(
        Math.max(0, Math.floor(args.variantIndex ?? 0)),
        Math.max(0, entry.variants.length - 1)
      )

      const requestedPairs = normalizeIds(args.pairIds)
        .map((pairId) => getFontPairById(pairId))
        .filter((pair): pair is NonNullable<ReturnType<typeof getFontPairById>> => Boolean(pair))
      const pairs = requestedPairs.length > 0 ? requestedPairs : FONT_PAIR_PRESETS.slice(0, 4)
      if (pairs.length === 0) {
        return { ok: false, error: "No typography presets available." }
      }

      for (const pair of pairs) {
        try {
          await ensureFontPairLoaded(pair)
        } catch {
          // no-op: board generation should still proceed with fallback fonts
        }
      }

      const boardSize = clampSize(args.size, DEFAULT_TYPOGRAPHY_BOARD_SIZE)
      const boardPosition = clampPosition(args.position)
      const columns = Math.min(Math.max(1, Math.floor(args.columns ?? 2)), Math.min(4, pairs.length))
      const rows = Math.max(1, Math.ceil(pairs.length / columns))
      const gap = 24
      const padding = 24
      const cardWidth = Math.max(
        300,
        Math.floor((boardSize.width - padding * 2 - gap * (columns - 1)) / columns)
      )
      const cardHeight = Math.max(
        220,
        Math.floor((boardSize.height - padding * 2 - gap * (rows - 1)) / rows)
      )

      const artboardId = addItem({
        type: "artboard",
        name: args.name?.trim() || "Typography Board",
        position: boardPosition,
        size: boardSize,
        rotation: 0,
        background: "white",
        themeId: activeThemeId,
        layout: {
          display: "grid",
          columns,
          gap,
          padding,
        },
      })

      const created: Array<{ itemId: string; pairId: string; label: string }> = []
      pairs.forEach((pair, index) => {
        const createdId = addItem({
          type: "component",
          componentId: entry.id,
          variantIndex,
          position: { x: 0, y: 0 },
          size: { width: cardWidth, height: cardHeight },
          rotation: 0,
          parentId: artboardId,
          order: index,
          customProps: {
            fontPairId: pair.id,
            displayFont: pair.displayFamily,
            bodyFont: pair.bodyFamily,
          },
        })
        created.push({ itemId: createdId, pairId: pair.id, label: pair.label })
      })

      return {
        ok: true,
        artboardId,
        componentId: entry.id,
        variantIndex,
        itemCount: created.length,
        items: created,
      }
    },
  })

  useCopilotAction({
    name: "createPrimitiveBoard",
    description:
      "Create an artboard populated with HTML/CSS-native design system primitives from the foundation pack.",
    parameters: [
      { name: "name", type: "string", required: false },
      { name: "title", type: "string", required: false },
      { name: "description", type: "string", required: false },
      { name: "ctaLabel", type: "string", required: false },
      {
        name: "position",
        type: "object",
        required: false,
        attributes: [
          { name: "x", type: "number", required: false },
          { name: "y", type: "number", required: false },
        ],
      },
      {
        name: "size",
        type: "object",
        required: false,
        attributes: [
          { name: "width", type: "number", required: false },
          { name: "height", type: "number", required: false },
        ],
      },
      { name: "themeId", type: "string", required: false },
    ],
    handler: async (rawArgs: unknown) => {
      const args = (rawArgs || {}) as CreatePrimitiveBoardArgs
      const requiredEntries = {
        heading: getPrimitiveEntry(FOUNDATION_PRIMITIVE_IDS.heading),
        text: getPrimitiveEntry(FOUNDATION_PRIMITIVE_IDS.text),
        button: getPrimitiveEntry(FOUNDATION_PRIMITIVE_IDS.button),
        surface: getPrimitiveEntry(FOUNDATION_PRIMITIVE_IDS.surface),
        stack: getPrimitiveEntry(FOUNDATION_PRIMITIVE_IDS.stack),
        box: getPrimitiveEntry(FOUNDATION_PRIMITIVE_IDS.box),
      }

      const missing = Object.entries(requiredEntries)
        .filter(([, entry]) => !entry)
        .map(([key]) => key)
      if (missing.length > 0) {
        return {
          ok: false,
          error: `Missing foundation primitives: ${missing.join(", ")}. Switch to the Design System Foundation project pack.`,
        }
      }

      const boardSize = clampSize(args.size, DEFAULT_PRIMITIVE_BOARD_SIZE)
      const boardPosition = clampPosition(args.position)
      const themeId = args.themeId?.trim() || activeThemeId
      if (!themes.some((theme) => theme.id === themeId)) {
        return { ok: false, error: `Theme not found: ${themeId}` }
      }

      const artboardId = addItem({
        type: "artboard",
        name: args.name?.trim() || "Primitive Board",
        position: boardPosition,
        size: boardSize,
        rotation: 0,
        background: "white",
        themeId,
        layout: {
          display: "grid",
          columns: 2,
          gap: 24,
          padding: 24,
        },
      })

      const title = args.title?.trim() || "Build the system from primitives."
      const description =
        args.description?.trim() ||
        "These nodes are real React components backed by DOM, CSS tokens, and canvas metadata."
      const ctaLabel = args.ctaLabel?.trim() || "Generate section"

      const created = [
        addItem({
          type: "component",
          componentId: requiredEntries.heading!.id,
          variantIndex: 2,
          position: { x: 0, y: 0 },
          size: getDefaultComponentSize(entries, requiredEntries.heading!.id),
          rotation: 0,
          parentId: artboardId,
          order: 0,
          customProps: {
            as: "h1",
            children: title,
            tone: "default",
            align: "left",
          },
        }),
        addItem({
          type: "component",
          componentId: requiredEntries.text!.id,
          variantIndex: 2,
          position: { x: 0, y: 0 },
          size: getDefaultComponentSize(entries, requiredEntries.text!.id),
          rotation: 0,
          parentId: artboardId,
          order: 1,
          customProps: {
            children: description,
            tone: "muted",
            size: "lg",
          },
        }),
        addItem({
          type: "component",
          componentId: requiredEntries.button!.id,
          variantIndex: 2,
          position: { x: 0, y: 0 },
          size: getDefaultComponentSize(entries, requiredEntries.button!.id),
          rotation: 0,
          parentId: artboardId,
          order: 2,
          customProps: {
            children: ctaLabel,
            variant: "primary",
            size: "lg",
            fullWidth: true,
          },
        }),
        addItem({
          type: "component",
          componentId: requiredEntries.surface!.id,
          variantIndex: 2,
          position: { x: 0, y: 0 },
          size: getDefaultComponentSize(entries, requiredEntries.surface!.id),
          rotation: 0,
          parentId: artboardId,
          order: 3,
          customProps: {
            eyebrow: "Composite",
            title: "Surface composes primitive typography and box framing.",
            description:
              "Use it for cards, callouts, panels, and grouped controls while staying exportable.",
          },
        }),
        addItem({
          type: "component",
          componentId: requiredEntries.stack!.id,
          variantIndex: 2,
          position: { x: 0, y: 0 },
          size: getDefaultComponentSize(entries, requiredEntries.stack!.id),
          rotation: 0,
          parentId: artboardId,
          order: 4,
          customProps: {
            direction: "vertical",
            gap: "sm",
            items: ["Box", "Stack", "Text", "Heading", "Surface", "Button"],
          },
        }),
        addItem({
          type: "component",
          componentId: requiredEntries.box!.id,
          variantIndex: 2,
          position: { x: 0, y: 0 },
          size: getDefaultComponentSize(entries, requiredEntries.box!.id),
          rotation: 0,
          parentId: artboardId,
          order: 5,
          customProps: {
            as: "section",
            children:
              "Box stays deliberately neutral. It is the framing layer behind more expressive patterns.",
            padding: "xl",
            surface: "subtle",
            border: true,
            radius: "xl",
            shadow: "none",
          },
        }),
      ]

      return {
        ok: true,
        artboardId,
        itemIds: created,
        themeId,
        componentIds: Object.values(FOUNDATION_PRIMITIVE_IDS),
      }
    },
  })

  useCopilotAction({
    name: "deleteCanvasItems",
    description: "Delete one or more items by id. Set all=true to clear canvas.",
    parameters: [
      { name: "all", type: "boolean", required: false },
      { name: "itemIds", type: "string[]", required: false },
    ],
    handler: async (rawArgs: unknown) => {
      const args = (rawArgs || {}) as DeleteCanvasItemsArgs
      if (args.all) {
        clearCanvas()
        return { ok: true, deletedAll: true }
      }

      const ids = (args.itemIds || []).filter((id) => typeof id === "string" && id.trim().length > 0)
      if (ids.length === 0) {
        return { ok: false, error: "No itemIds provided." }
      }

      ids.forEach((id) => removeItem(id))
      return { ok: true, deleted: ids.length }
    },
  })

  useCopilotAction({
    name: "convertMermaidToExcalidraw",
    description: "Convert an existing Mermaid node into a new Excalidraw node.",
    parameters: [
      { name: "itemId", type: "string", required: true },
      { name: "keepOriginal", type: "boolean", required: false },
      {
        name: "position",
        type: "object",
        required: false,
        attributes: [
          { name: "x", type: "number", required: false },
          { name: "y", type: "number", required: false },
        ],
      },
      {
        name: "size",
        type: "object",
        required: false,
        attributes: [
          { name: "width", type: "number", required: false },
          { name: "height", type: "number", required: false },
        ],
      },
    ],
    handler: async (rawArgs: unknown) => {
      const args = (rawArgs || {}) as ConvertMermaidToExcalidrawArgs
      const itemId = args.itemId?.trim()
      if (!itemId) return { ok: false, error: "itemId is required." }
      const sourceItem = items.find((item) => item.id === itemId)
      if (!sourceItem) return { ok: false, error: "Mermaid item not found." }
      if (sourceItem.type !== "mermaid") {
        return { ok: false, error: "itemId must reference a mermaid item." }
      }

      try {
        const scene = await convertMermaidSourceToExcalidrawScene(sourceItem.source)
        const createdId = addItem({
          type: "excalidraw",
          title: sourceItem.title ? `${sourceItem.title} (Excalidraw)` : "Excalidraw sketch",
          scene,
          sourceMermaid: sourceItem.source,
          position:
            args.position
              ? clampPosition(args.position)
              : { x: sourceItem.position.x + 48, y: sourceItem.position.y + 48 },
          size: clampSize(args.size, {
            width: Math.max(DEFAULT_EXCALIDRAW_SIZE.width, sourceItem.size.width),
            height: Math.max(DEFAULT_EXCALIDRAW_SIZE.height, sourceItem.size.height),
          }),
          rotation: sourceItem.rotation,
          parentId: sourceItem.parentId,
          order: sourceItem.order,
        })

        if (!args.keepOriginal) {
          removeItem(itemId)
        }

        return { ok: true, itemId: createdId, sourceItemId: itemId }
      } catch (error) {
        return {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to convert Mermaid to Excalidraw.",
        }
      }
    },
  })

  useCopilotAction({
    name: "searchWeb",
    description: "Search the web for references, docs, and links.",
    parameters: [
      { name: "query", type: "string", required: true },
      { name: "provider", type: "string", enum: ["auto", "tavily", "brave", "serpapi"], required: false },
      { name: "maxResults", type: "number", required: false },
    ],
    handler: async (rawArgs: unknown) => {
      const args = (rawArgs || {}) as SearchWebArgs
      const query = args.query?.trim()
      if (!query) return { ok: false, error: "query is required" }

      try {
        const maxResults = Math.min(20, Math.max(1, Math.floor(args.maxResults ?? 8)))
        const payload = await postAgentApi("/api/agent/search-web", {
          query,
          provider: args.provider || "auto",
          maxResults,
        })
        return { ok: true, ...payload }
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Web search failed.",
        }
      }
    },
  })

  useCopilotAction({
    name: "getRoute",
    description: "Get route details between two places and return map URLs.",
    parameters: [
      { name: "origin", type: "string", required: true },
      { name: "destination", type: "string", required: true },
      { name: "mode", type: "string", enum: ["driving", "walking", "cycling", "transit"], required: false },
      { name: "provider", type: "string", enum: ["auto", "mapbox", "google"], required: false },
    ],
    handler: async (rawArgs: unknown) => {
      const args = (rawArgs || {}) as GetRouteArgs
      const origin = args.origin?.trim()
      const destination = args.destination?.trim()
      if (!origin || !destination) {
        return { ok: false, error: "origin and destination are required" }
      }

      try {
        const payload = await postAgentApi("/api/agent/get-route", {
          origin,
          destination,
          mode: args.mode || "driving",
          provider: args.provider || "auto",
        })
        return { ok: true, ...payload }
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Route lookup failed.",
        }
      }
    },
  })

  useCopilotAction({
    name: "searchAssets",
    description:
      "Search media/reference assets. Includes image/video/gif providers and Pinterest-style reference discovery.",
    parameters: [
      { name: "query", type: "string", required: true },
      { name: "type", type: "string", enum: ["image", "video", "gif", "mixed"], required: false },
      { name: "license", type: "string", enum: ["any", "free", "commercial"], required: false },
      {
        name: "provider",
        type: "string",
        enum: ["auto", "pexels", "unsplash", "giphy", "pixabay", "youtube", "pinterest", "web"],
        required: false,
      },
      { name: "maxResults", type: "number", required: false },
    ],
    handler: async (rawArgs: unknown) => {
      const args = (rawArgs || {}) as SearchAssetsArgs
      const query = args.query?.trim()
      if (!query) return { ok: false, error: "query is required" }

      try {
        const payload = await postAgentApi("/api/agent/search-assets", {
          query,
          type: args.type || "mixed",
          license: args.license || "any",
          provider: args.provider || "auto",
          maxResults: Math.min(30, Math.max(1, Math.floor(args.maxResults ?? 12))),
        })
        return { ok: true, ...payload }
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Asset search failed.",
        }
      }
    },
  })

  useCopilotAction({
    name: "importAssetFromUrl",
    description: "Import an asset URL into local media store and optionally add it as a media node.",
    parameters: [
      { name: "url", type: "string", required: true },
      { name: "filename", type: "string", required: false },
      { name: "mediaKind", type: "string", enum: ["image", "video", "gif"], required: false },
      { name: "addToCanvas", type: "boolean", required: false },
      {
        name: "position",
        type: "object",
        required: false,
        attributes: [
          { name: "x", type: "number", required: false },
          { name: "y", type: "number", required: false },
        ],
      },
      {
        name: "size",
        type: "object",
        required: false,
        attributes: [
          { name: "width", type: "number", required: false },
          { name: "height", type: "number", required: false },
        ],
      },
      { name: "parentId", type: "string", required: false },
      { name: "order", type: "number", required: false },
    ],
    handler: async (rawArgs: unknown) => {
      const args = (rawArgs || {}) as ImportAssetFromUrlArgs
      const url = args.url?.trim()
      if (!url) return { ok: false, error: "url is required" }

      try {
        const payload = await postAgentApi("/api/agent/import-asset", {
          url,
          filename: args.filename,
          mediaKind: args.mediaKind,
        })

        const mediaUrl = typeof payload.mediaUrl === "string" ? payload.mediaUrl : ""
        if (!mediaUrl) {
          return { ok: false, error: "Import succeeded but mediaUrl was missing." }
        }

        const shouldAddToCanvas = args.addToCanvas !== false
        if (!shouldAddToCanvas) {
          return { ok: true, ...payload }
        }

        const basePosition = clampPosition(args.position)
        const parentId = args.parentId && args.parentId.trim() ? args.parentId.trim() : undefined
        const order = typeof args.order === "number" ? Math.max(0, Math.floor(args.order)) : undefined
        const parentProps = {
          ...(parentId ? { parentId } : {}),
          ...(order !== undefined ? { order } : {}),
        }

        const inferredMediaKind =
          args.mediaKind ||
          (typeof payload.mediaKind === "string"
            ? (payload.mediaKind as "image" | "video" | "gif")
            : inferMediaKindFromSrc(mediaUrl))

        const createdId = addItem({
          type: "media",
          src: mediaUrl,
          mediaKind: inferredMediaKind,
          title: typeof payload.title === "string" ? payload.title : undefined,
          controls: inferredMediaKind === "video",
          muted: inferredMediaKind === "video" ? true : undefined,
          loop: inferredMediaKind === "gif",
          autoplay: false,
          objectFit: "cover",
          position: basePosition,
          size: clampSize(args.size, DEFAULT_MEDIA_SIZE),
          rotation: 0,
          sourceProvider: typeof payload.provider === "string" ? payload.provider : "imported",
          sourceUrl: url,
          sourceCapturedAt:
            typeof payload.storedAt === "string" ? payload.storedAt : new Date().toISOString(),
          ...parentProps,
        })

        return { ok: true, itemId: createdId, ...payload }
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Import failed.",
        }
      }
    },
  })

  useCopilotAction({
    name: "createMapNodeFromRoute",
    description: "One-shot route lookup + map embed node creation on the canvas.",
    parameters: [
      { name: "origin", type: "string", required: true },
      { name: "destination", type: "string", required: true },
      { name: "mode", type: "string", enum: ["driving", "walking", "cycling", "transit"], required: false },
      { name: "provider", type: "string", enum: ["auto", "mapbox", "google"], required: false },
      { name: "name", type: "string", required: false },
      {
        name: "position",
        type: "object",
        required: false,
        attributes: [
          { name: "x", type: "number", required: false },
          { name: "y", type: "number", required: false },
        ],
      },
      {
        name: "size",
        type: "object",
        required: false,
        attributes: [
          { name: "width", type: "number", required: false },
          { name: "height", type: "number", required: false },
        ],
      },
      { name: "parentId", type: "string", required: false },
      { name: "order", type: "number", required: false },
    ],
    handler: async (rawArgs: unknown) => {
      const args = (rawArgs || {}) as CreateMapNodeFromRouteArgs
      const origin = args.origin?.trim()
      const destination = args.destination?.trim()
      if (!origin || !destination) {
        return { ok: false, error: "origin and destination are required" }
      }

      try {
        const payload = await postAgentApi("/api/agent/get-route", {
          origin,
          destination,
          mode: args.mode || "driving",
          provider: args.provider || "auto",
        })

        const rawMapUrl =
          typeof payload.embedUrl === "string"
            ? payload.embedUrl
            : typeof payload.mapUrl === "string"
              ? payload.mapUrl
              : ""
        if (!rawMapUrl) {
          return { ok: false, error: "Route lookup succeeded but no map URL was returned." }
        }

        const normalized = normalizeCanvasEmbedUrl(rawMapUrl)
        const basePosition = clampPosition(args.position)
        const parentId = args.parentId && args.parentId.trim() ? args.parentId.trim() : undefined
        const order = typeof args.order === "number" ? Math.max(0, Math.floor(args.order)) : undefined
        const parentProps = {
          ...(parentId ? { parentId } : {}),
          ...(order !== undefined ? { order } : {}),
        }

        const createdId = addItem({
          type: "embed",
          url: normalized.url,
          title: args.name?.trim() || `Route: ${origin} -> ${destination}`,
          position: basePosition,
          size: clampSize(args.size, DEFAULT_EMBED_SIZE),
          rotation: 0,
          embedPreviewMode: "auto",
          embedFrameStatus: "unknown",
          embedSnapshotStatus: "idle",
          embedLiveStatus: "idle",
          embedCaptureStatus: "idle",
          ...parentProps,
        })

        return {
          ok: true,
          itemId: createdId,
          mapUrl: normalized.url,
          route: payload.route,
          provider: payload.provider,
        }
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Failed to create map node from route.",
        }
      }
    },
  })

  useCopilotAction({
    name: "listCanvasItemTypes",
    description: "Return available item types and required properties.",
    parameters: [],
    handler: async () => {
      return {
        types: [
          {
            type: "component",
            required: ["componentId"],
            optional: ["variantIndex", "position", "size", "parentId", "order"],
          },
          {
            type: "embed",
            required: ["url"],
            optional: ["position", "size", "parentId", "order"],
          },
          {
            type: "media",
            required: ["src"],
            optional: ["mediaKind", "position", "size", "parentId", "order"],
          },
          {
            type: "markdown",
            required: ["source"],
            optional: ["title", "background", "position", "size", "parentId", "order"],
          },
          {
            type: "mermaid",
            required: ["source"],
            optional: ["title", "mermaidTheme", "position", "size", "parentId", "order"],
          },
          {
            type: "excalidraw",
            required: [],
            optional: ["title", "scene", "sourceMermaid", "position", "size", "parentId", "order"],
          },
          {
            type: "artboard",
            required: [],
            optional: ["name", "position", "size"],
          },
        ],
        availableComponents: entries.slice(0, 200).map((entry) => ({
          id: entry.id,
          name: entry.name,
          variantCount: entry.variants.length,
        })),
      }
    },
  })
}
