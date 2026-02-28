import { useMemo } from "react"

import { useCopilotAction, useCopilotReadable } from "@copilotkit/react-core"

import type { GalleryEntry } from "../core/types"
import type { CanvasItem, CanvasItemInput, CanvasItemUpdate } from "../types/canvas"

const COMPONENT_LAYOUT_DEFAULTS: Record<string, { width: number; height: number }> = {
  small: { width: 220, height: 120 },
  medium: { width: 350, height: 180 },
  large: { width: 500, height: 260 },
  full: { width: 600, height: 300 },
}

const DEFAULT_EMBED_SIZE = { width: 640, height: 360 }
const DEFAULT_MEDIA_SIZE = { width: 480, height: 270 }
const DEFAULT_ARTBOARD_SIZE = { width: 800, height: 600 }

interface Point {
  x: number
  y: number
}

interface Size {
  width: number
  height: number
}

interface CreateCanvasItemArgs {
  type?: "component" | "embed" | "media" | "artboard"
  position?: Point
  size?: Size
  componentId?: string
  variantIndex?: number
  url?: string
  src?: string
  name?: string
  parentId?: string
  order?: number
  mediaKind?: "image" | "video" | "gif"
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
  name?: string
  mediaKind?: "image" | "video" | "gif"
  embedPreviewMode?: "auto" | "iframe" | "snapshot" | "live"
}

interface DeleteCanvasItemsArgs {
  itemIds?: string[]
  all?: boolean
}

interface UseCopilotCanvasActionsInput {
  items: CanvasItem[]
  selectedIds: string[]
  entries: GalleryEntry[]
  addItem: (item: CanvasItemInput) => string
  updateItem: (id: string, updates: CanvasItemUpdate) => void
  removeItem: (id: string) => void
  clearCanvas: () => void
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

  return {
    ...base,
    src: item.src,
    mediaKind: item.mediaKind || "image",
  }
}

export function useCopilotCanvasActions({
  items,
  selectedIds,
  entries,
  addItem,
  updateItem,
  removeItem,
  clearCanvas,
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
      "Canvas metadata. Types: component, embed, media, artboard. Use tools to create/update/delete items.",
    value: {
      itemCount: items.length,
      selectedIds,
      itemTypes: ["component", "embed", "media", "artboard"],
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

  useCopilotAction({
    name: "createCanvasItem",
    description: "Create a canvas item of type component/embed/media/artboard.",
    parameters: [
      {
        name: "type",
        type: "string",
        required: true,
        enum: ["component", "embed", "media", "artboard"],
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
      { name: "name", type: "string", required: false },
      { name: "parentId", type: "string", required: false },
      { name: "order", type: "number", required: false },
      { name: "mediaKind", type: "string", enum: ["image", "video", "gif"], required: false },
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
      { name: "name", type: "string", required: false },
      { name: "mediaKind", type: "string", enum: ["image", "video", "gif"], required: false },
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
      if (typeof args.name === "string") updates.name = args.name
      if (typeof args.mediaKind === "string") updates.mediaKind = args.mediaKind
      if (typeof args.embedPreviewMode === "string") updates.embedPreviewMode = args.embedPreviewMode

      if (Object.keys(updates).length === 0) {
        return { ok: false, error: "No updates provided." }
      }

      updateItem(args.itemId.trim(), updates as CanvasItemUpdate)
      return { ok: true, itemId: args.itemId.trim() }
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
