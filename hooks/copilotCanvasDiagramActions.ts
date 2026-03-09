import type { CanvasExcalidrawScene, CanvasItem, CanvasItemInput, CanvasItemUpdate } from "../types/canvas"

const DEFAULT_MERMAID_SIZE = { width: 640, height: 420 }
const DEFAULT_EXCALIDRAW_SIZE = { width: 760, height: 500 }

interface Point {
  x: number
  y: number
}

interface Size {
  width: number
  height: number
}

export interface CreateMermaidNodeArgs {
  source?: string
  title?: string
  mermaidTheme?: "default" | "neutral" | "dark" | "forest" | "base"
  position?: Point
  size?: Size
  parentId?: string
  order?: number
}

export interface CreateExcalidrawNodeArgs {
  title?: string
  sourceMermaid?: string
  scene?: Record<string, unknown>
  position?: Point
  size?: Size
  parentId?: string
  order?: number
}

export interface RemapExcalidrawFromMermaidArgs {
  excalidrawItemId?: string
  mermaidItemId?: string
  source?: string
  title?: string
}

export interface RemapExcalidrawFromMermaidContext {
  items: CanvasItem[]
  selectedIds?: string[]
  updateItem: (id: string, updates: CanvasItemUpdate) => void
}

interface DiagramActionOptions {
  convertMermaidToScene?: (source: string) => Promise<CanvasExcalidrawScene>
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

function getParentProps(parentId?: string, order?: number) {
  const normalizedParentId = parentId && parentId.trim() ? parentId.trim() : undefined
  const normalizedOrder =
    typeof order === "number" ? Math.max(0, Math.floor(Number(order) || 0)) : undefined
  return {
    ...(normalizedParentId ? { parentId: normalizedParentId } : {}),
    ...(normalizedOrder !== undefined ? { order: normalizedOrder } : {}),
  }
}

function createEmptyExcalidrawScene() {
  return {
    elements: [],
    appState: { viewBackgroundColor: "#ffffff" },
    files: {},
  }
}

async function convertMermaidToScene(
  source: string,
  options?: DiagramActionOptions
): Promise<CanvasExcalidrawScene> {
  if (options?.convertMermaidToScene) {
    return options.convertMermaidToScene(source)
  }
  const { convertMermaidSourceToExcalidrawScene } = await import("../components/canvas/excalidrawMermaid")
  return convertMermaidSourceToExcalidrawScene(source)
}

export async function runCreateMermaidNodeAction(
  addItem: (item: CanvasItemInput) => string,
  rawArgs: unknown
) {
  const args = (rawArgs || {}) as CreateMermaidNodeArgs
  const createdId = addItem({
    type: "mermaid",
    source: (args.source || "").trim() || "flowchart LR\nA-->B",
    title: args.title?.trim() || "Mermaid diagram",
    mermaidTheme: args.mermaidTheme || "default",
    position: clampPosition(args.position),
    size: clampSize(args.size, DEFAULT_MERMAID_SIZE),
    rotation: 0,
    ...getParentProps(args.parentId, args.order),
  })
  return { ok: true, itemId: createdId }
}

export async function runCreateExcalidrawNodeAction(
  addItem: (item: CanvasItemInput) => string,
  rawArgs: unknown,
  options?: DiagramActionOptions
) {
  const args = (rawArgs || {}) as CreateExcalidrawNodeArgs
  const sourceMermaid = args.sourceMermaid?.trim() || undefined
  const sceneFromArgs = args.scene && typeof args.scene === "object" ? args.scene : undefined
  const scene = sceneFromArgs
    ? sceneFromArgs
    : sourceMermaid
      ? await convertMermaidToScene(sourceMermaid, options)
      : createEmptyExcalidrawScene()

  const createdId = addItem({
    type: "excalidraw",
    title: args.title?.trim() || "Excalidraw sketch",
    scene,
    sourceMermaid,
    position: clampPosition(args.position),
    size: clampSize(args.size, DEFAULT_EXCALIDRAW_SIZE),
    rotation: 0,
    ...getParentProps(args.parentId, args.order),
  })
  return { ok: true, itemId: createdId, hasSourceMermaid: Boolean(sourceMermaid) }
}

export async function runRemapExcalidrawFromMermaidAction(
  context: RemapExcalidrawFromMermaidContext,
  rawArgs: unknown,
  options?: DiagramActionOptions
) {
  const args = (rawArgs || {}) as RemapExcalidrawFromMermaidArgs
  const selectedIds = context.selectedIds || []

  const targetItemId =
    args.excalidrawItemId?.trim() ||
    selectedIds.find((id) => context.items.find((item) => item.id === id)?.type === "excalidraw")
  if (!targetItemId) {
    return { ok: false, error: "excalidrawItemId is required (or select an excalidraw node)." }
  }

  const target = context.items.find((item) => item.id === targetItemId)
  if (!target || target.type !== "excalidraw") {
    return { ok: false, error: "Target item was not found or is not an excalidraw node." }
  }

  let sourceItemId = args.mermaidItemId?.trim() || ""
  if (!sourceItemId) {
    sourceItemId =
      selectedIds.find((id) => context.items.find((item) => item.id === id)?.type === "mermaid") || ""
  }

  const sourceItem = sourceItemId ? context.items.find((item) => item.id === sourceItemId) : undefined
  if (sourceItemId && (!sourceItem || sourceItem.type !== "mermaid")) {
    return { ok: false, error: "mermaidItemId must reference an existing mermaid node." }
  }

  const source =
    args.source?.trim() ||
    (sourceItem && sourceItem.type === "mermaid" ? sourceItem.source.trim() : "") ||
    target.sourceMermaid?.trim() ||
    ""
  if (!source) {
    return {
      ok: false,
      error:
        "No Mermaid source found. Provide source, mermaidItemId, or choose an excalidraw node with sourceMermaid.",
    }
  }

  const scene = await convertMermaidToScene(source, options)
  const nextTitle =
    args.title?.trim() ||
    target.title ||
    (sourceItem?.type === "mermaid" ? `${sourceItem.title || "Mermaid diagram"} (Excalidraw)` : undefined)

  context.updateItem(targetItemId, {
    scene,
    sourceMermaid: source,
    ...(nextTitle ? { title: nextTitle } : {}),
  } as CanvasItemUpdate)

  return {
    ok: true,
    itemId: targetItemId,
    mermaidItemId: sourceItem?.type === "mermaid" ? sourceItem.id : undefined,
  }
}
