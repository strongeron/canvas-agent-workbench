import type { CanvasRegistryPrimitive } from "./canvasRegistry"

export const CANVAS_LIBRARY_DRAG_MIME = "application/x-canvas-library-primitive"
export const CANVAS_LIBRARY_DRAG_VERSION = 1

export interface CanvasLibraryDragPayload {
  kind: "library-primitive"
  version: typeof CANVAS_LIBRARY_DRAG_VERSION
  projectId: string
  primitive: CanvasRegistryPrimitive
}

export function buildLibraryDragPayload(input: {
  projectId: string
  primitive: CanvasRegistryPrimitive
}): CanvasLibraryDragPayload {
  return {
    kind: "library-primitive",
    version: CANVAS_LIBRARY_DRAG_VERSION,
    projectId: input.projectId,
    primitive: input.primitive,
  }
}

export function serializeLibraryDragPayload(payload: CanvasLibraryDragPayload): string {
  return JSON.stringify(payload)
}

export function parseLibraryDragPayload(raw: string): CanvasLibraryDragPayload | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== "object") return null
  const candidate = parsed as Partial<CanvasLibraryDragPayload>
  if (
    candidate.kind !== "library-primitive" ||
    candidate.version !== CANVAS_LIBRARY_DRAG_VERSION ||
    typeof candidate.projectId !== "string" ||
    !candidate.primitive ||
    typeof candidate.primitive !== "object"
  ) {
    return null
  }
  const primitive = candidate.primitive as Partial<CanvasRegistryPrimitive>
  if (
    typeof primitive.id !== "string" ||
    typeof primitive.displayName !== "string" ||
    (primitive.kind !== "html" && primitive.kind !== "tsx")
  ) {
    return null
  }
  return candidate as CanvasLibraryDragPayload
}

export function writeLibraryDragPayload(
  dataTransfer: DataTransfer,
  payload: CanvasLibraryDragPayload
): void {
  dataTransfer.setData(CANVAS_LIBRARY_DRAG_MIME, serializeLibraryDragPayload(payload))
  dataTransfer.effectAllowed = "copy"
}

export function readLibraryDragPayload(dataTransfer: DataTransfer): CanvasLibraryDragPayload | null {
  const raw = dataTransfer.getData(CANVAS_LIBRARY_DRAG_MIME)
  if (!raw) return null
  return parseLibraryDragPayload(raw)
}
