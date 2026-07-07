// Browser-safe canvas-asset filename helpers. Kept in their own module so
// client code (useCanvasFilePersistence) can import buildCanvasAssetFileName
// without pulling in canvasFileAssets.ts, whose top-level `node:fs` import
// throws the moment it is evaluated in a browser bundle (FOX2-64 caught this).

import type { CanvasFileAssetField } from "../types/canvas"

/** Last dot-extension of a name, matching node:path.extname for simple names. */
function extname(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? name
  const dot = base.lastIndexOf(".")
  return dot > 0 ? base.slice(dot) : ""
}

/** Strip directory and an optional trailing extension, like node:path.basename. */
function basename(name: string, ext?: string): string {
  const base = name.split(/[\\/]/).pop() ?? name
  if (ext && base.endsWith(ext)) return base.slice(0, base.length - ext.length)
  return base
}

export function sanitizeAssetSegment(value: string) {
  const safe = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return safe || "asset"
}

export function extensionForMime(mime: string) {
  switch ((mime || "").toLowerCase()) {
    case "image/png":
      return ".png"
    case "image/jpeg":
      return ".jpg"
    case "image/gif":
      return ".gif"
    case "image/webp":
      return ".webp"
    case "image/svg+xml":
      return ".svg"
    case "video/mp4":
      return ".mp4"
    case "video/webm":
      return ".webm"
    case "video/quicktime":
      return ".mov"
    case "video/x-m4v":
      return ".m4v"
    case "video/ogg":
      return ".ogg"
    default:
      return ".bin"
  }
}

export function buildCanvasAssetFileName(
  itemId: string,
  field: CanvasFileAssetField,
  preferredFileName: string | undefined,
  mimeType: string
) {
  const preferredExt = extname(preferredFileName || "").toLowerCase()
  const extension = preferredExt || extensionForMime(mimeType)
  const itemSegment = sanitizeAssetSegment(itemId)
  const fieldSegment = sanitizeAssetSegment(field)
  if (preferredFileName?.trim()) {
    const titleSegment = sanitizeAssetSegment(
      basename(preferredFileName, preferredExt || undefined)
    )
    if (titleSegment && titleSegment !== "asset") {
      // Always suffix the canvas item id so repeated clipboard names like
      // "image.png" cannot overwrite each other in document-local assets.
      return `${titleSegment}-${itemSegment}${extension}`
    }
  }
  return `${itemSegment}-${fieldSegment}${extension}`
}
