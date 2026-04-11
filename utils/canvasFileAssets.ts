import path from "node:path"
import { promises as fs } from "node:fs"

import type {
  CanvasDocumentSurface,
  CanvasFileAssetField,
  CanvasFileAssetInput,
  CanvasFileDocument,
  CanvasStateSnapshot,
} from "../types/canvas"

const DOCUMENT_ASSETS_FOLDER = ".assets"

function normalizeRelativeCanvasPath(relativePath: string) {
  const normalized = (relativePath || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/{2,}/g, "/")
  if (!normalized) {
    throw new Error("Canvas file path is required.")
  }
  return normalized
}

function assertWithinDirectory(directory: string, absolutePath: string) {
  const normalizedDirectory = directory.endsWith(path.sep) ? directory : `${directory}${path.sep}`
  if (absolutePath !== directory && !absolutePath.startsWith(normalizedDirectory)) {
    throw new Error("Resolved path is outside the allowed canvas directory.")
  }
}

function sanitizeAssetSegment(value: string) {
  const safe = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return safe || "asset"
}

function extensionForMime(mime: string) {
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

function parseDataUrlPayload(dataUrl: string) {
  const match = /^data:([^;,]+)?(;base64)?,([\s\S]+)$/i.exec(dataUrl.trim())
  if (!match) return null
  const [, mime = "application/octet-stream", encoding, body] = match
  const buffer = encoding ? Buffer.from(body, "base64") : Buffer.from(decodeURIComponent(body), "utf8")
  return {
    mime,
    buffer,
  }
}

function getAssetKey(itemId: string, field: CanvasFileAssetField) {
  return `${itemId}:${field}`
}

function getDocumentAssetDirectoryInfo(
  projectsRoot: string,
  projectId: string,
  canvasPath: string
) {
  const canvasesRoot = path.join(projectsRoot, projectId, "canvases")
  const assetsRoot = path.join(canvasesRoot, DOCUMENT_ASSETS_FOLDER)
  const normalizedCanvasPath = normalizeRelativeCanvasPath(canvasPath)
  const relativeAssetDir = normalizedCanvasPath.replace(/\.canvas$/i, "")
  const assetDir = path.resolve(assetsRoot, relativeAssetDir)
  assertWithinDirectory(assetsRoot, assetDir)
  return {
    canvasesRoot,
    assetsRoot,
    normalizedCanvasPath,
    relativeAssetDir,
    assetDir,
  }
}

async function pathExists(targetPath: string) {
  try {
    await fs.access(targetPath)
    return true
  } catch {
    return false
  }
}

function getDocumentAssetNameFromUrl(
  projectId: string,
  canvasPath: string,
  sourceUrl: string
) {
  if (!isDocumentAssetUrl(projectId, canvasPath, sourceUrl)) return null
  try {
    const parsed = new URL(sourceUrl, "http://localhost")
    const assetName = parsed.searchParams.get("asset") || ""
    return assetName.trim() ? assetName.trim() : null
  } catch {
    return null
  }
}

function inferFileName(
  itemId: string,
  field: CanvasFileAssetField,
  preferredFileName: string | undefined,
  mimeType: string
) {
  const preferredExt = path.extname(preferredFileName || "").toLowerCase()
  const extension = preferredExt || extensionForMime(mimeType)
  const baseName = preferredFileName
    ? path.basename(preferredFileName, preferredExt || undefined)
    : `${sanitizeAssetSegment(itemId)}-${field}`
  return `${sanitizeAssetSegment(baseName)}${extension}`
}

export function buildCanvasDocumentAssetUrl(
  projectId: string,
  canvasPath: string,
  assetName: string
) {
  return `/api/projects/${encodeURIComponent(projectId)}/canvases/assets/file?path=${encodeURIComponent(
    canvasPath
  )}&asset=${encodeURIComponent(assetName)}`
}

export function resolveCanvasDocumentAssetPath(
  projectsRoot: string,
  projectId: string,
  canvasPath: string,
  assetName: string
) {
  const { canvasesRoot, assetsRoot, relativeAssetDir, assetDir } = getDocumentAssetDirectoryInfo(
    projectsRoot,
    projectId,
    canvasPath
  )
  const safeAssetName = path.basename(assetName)
  const absolutePath = path.resolve(assetDir, safeAssetName)
  assertWithinDirectory(assetDir, absolutePath)
  return {
    canvasesRoot,
    assetsRoot,
    assetDir,
    absolutePath,
    relativeAssetDir,
    assetName: safeAssetName,
  }
}

async function writeCanvasAssetBuffer(
  projectsRoot: string,
  projectId: string,
  canvasPath: string,
  itemId: string,
  field: CanvasFileAssetField,
  fileName: string | undefined,
  mimeType: string,
  buffer: Buffer
) {
  const normalizedFileName = inferFileName(itemId, field, fileName, mimeType)
  const resolved = resolveCanvasDocumentAssetPath(
    projectsRoot,
    projectId,
    canvasPath,
    normalizedFileName
  )
  await fs.mkdir(resolved.assetDir, { recursive: true })
  await fs.writeFile(resolved.absolutePath, buffer)
  return buildCanvasDocumentAssetUrl(projectId, canvasPath, resolved.assetName)
}

async function copyCanvasAssetFile(
  projectsRoot: string,
  projectId: string,
  canvasPath: string,
  itemId: string,
  field: CanvasFileAssetField,
  sourcePath: string,
  preferredFileName?: string
) {
  const absoluteSourcePath = path.resolve(sourcePath)
  const stat = await fs.stat(absoluteSourcePath)
  if (!stat.isFile()) {
    throw new Error(`Asset source is not a file: ${sourcePath}`)
  }
  const buffer = await fs.readFile(absoluteSourcePath)
  return writeCanvasAssetBuffer(
    projectsRoot,
    projectId,
    canvasPath,
    itemId,
    field,
    preferredFileName || path.basename(absoluteSourcePath),
    mimeTypeFromExtension(path.extname(absoluteSourcePath)),
    buffer
  )
}

function mimeTypeFromExtension(extension: string) {
  switch ((extension || "").toLowerCase()) {
    case ".png":
      return "image/png"
    case ".jpg":
    case ".jpeg":
      return "image/jpeg"
    case ".gif":
      return "image/gif"
    case ".webp":
      return "image/webp"
    case ".svg":
      return "image/svg+xml"
    case ".mp4":
      return "video/mp4"
    case ".webm":
      return "video/webm"
    case ".mov":
      return "video/quicktime"
    case ".m4v":
      return "video/x-m4v"
    case ".ogg":
      return "video/ogg"
    default:
      return "application/octet-stream"
  }
}

function parseSharedMediaFileName(sourceUrl: string) {
  if (!sourceUrl.startsWith("/api/media/file/")) return null
  const encoded = sourceUrl.replace("/api/media/file/", "").trim()
  return encoded ? decodeURIComponent(encoded) : null
}

function isDocumentAssetUrl(projectId: string, canvasPath: string, sourceUrl: string) {
  return sourceUrl.startsWith(buildCanvasDocumentAssetUrl(projectId, canvasPath, ""))
}

function buildAssetInputMap(inputs: CanvasFileAssetInput[]) {
  return new Map(
    inputs.map((input) => [
      getAssetKey(input.itemId, input.field || "src"),
      input,
    ])
  )
}

async function resolvePackedAssetUrl(input: {
  projectsRoot: string
  sharedMediaRoot?: string
  projectId: string
  canvasPath: string
  itemId: string
  field: CanvasFileAssetField
  sourceUrl: string
  preferredFileName?: string
  assetInput?: CanvasFileAssetInput
}) {
  const trimmedSourceUrl = input.sourceUrl.trim()
  if (!trimmedSourceUrl) return trimmedSourceUrl
  if (isDocumentAssetUrl(input.projectId, input.canvasPath, trimmedSourceUrl)) {
    return trimmedSourceUrl
  }

  if (input.assetInput?.filePath) {
    return copyCanvasAssetFile(
      input.projectsRoot,
      input.projectId,
      input.canvasPath,
      input.itemId,
      input.field,
      input.assetInput.filePath,
      input.assetInput.fileName || input.preferredFileName
    )
  }

  if (input.assetInput?.dataUrl || trimmedSourceUrl.startsWith("data:")) {
    const parsed = parseDataUrlPayload(input.assetInput?.dataUrl || trimmedSourceUrl)
    if (!parsed) {
      throw new Error(`Invalid ${input.field} asset payload for item ${input.itemId}.`)
    }
    return writeCanvasAssetBuffer(
      input.projectsRoot,
      input.projectId,
      input.canvasPath,
      input.itemId,
      input.field,
      input.assetInput?.fileName || input.preferredFileName,
      parsed.mime,
      parsed.buffer
    )
  }

  if (trimmedSourceUrl.startsWith("blob:")) {
    throw new Error(
      `Item ${input.itemId} has a transient ${input.field} blob URL. Save must include a packed asset payload first.`
    )
  }

  const sharedMediaFileName = parseSharedMediaFileName(trimmedSourceUrl)
  if (sharedMediaFileName && input.sharedMediaRoot) {
    return copyCanvasAssetFile(
      input.projectsRoot,
      input.projectId,
      input.canvasPath,
      input.itemId,
      input.field,
      path.join(input.sharedMediaRoot, sharedMediaFileName),
      input.preferredFileName || sharedMediaFileName
    )
  }

  return trimmedSourceUrl
}

function isCanvasStateSnapshot(
  surface: CanvasDocumentSurface,
  document: unknown
): document is CanvasStateSnapshot {
  return (
    surface === "canvas" &&
    Boolean(document) &&
    typeof document === "object" &&
    Array.isArray((document as CanvasStateSnapshot).items)
  )
}

function rewriteCanvasItemAssetUrls(
  projectId: string,
  fromCanvasPath: string,
  toCanvasPath: string,
  item: CanvasStateSnapshot["items"][number]
) {
  if (item.type === "media") {
    if (typeof item.src === "string") {
      const assetName = getDocumentAssetNameFromUrl(projectId, fromCanvasPath, item.src)
      if (assetName) {
        item.src = buildCanvasDocumentAssetUrl(projectId, toCanvasPath, assetName)
      }
    }
    if (typeof item.poster === "string") {
      const assetName = getDocumentAssetNameFromUrl(projectId, fromCanvasPath, item.poster)
      if (assetName) {
        item.poster = buildCanvasDocumentAssetUrl(projectId, toCanvasPath, assetName)
      }
    }
    return
  }

  if (item.type === "embed" && typeof item.embedSnapshotUrl === "string") {
    const assetName = getDocumentAssetNameFromUrl(projectId, fromCanvasPath, item.embedSnapshotUrl)
    if (assetName) {
      item.embedSnapshotUrl = buildCanvasDocumentAssetUrl(projectId, toCanvasPath, assetName)
    }
  }
}

export function rewriteCanvasDocumentAssetUrls(
  projectId: string,
  fromCanvasPath: string,
  toCanvasPath: string,
  document: CanvasFileDocument
) {
  if (!isCanvasStateSnapshot(document.surface, document.document) || fromCanvasPath === toCanvasPath) {
    return document
  }

  const nextDocument = JSON.parse(JSON.stringify(document)) as CanvasFileDocument
  const nextState = nextDocument.document as CanvasStateSnapshot
  nextState.items.forEach((item) => {
    if (item && typeof item === "object") {
      rewriteCanvasItemAssetUrls(projectId, fromCanvasPath, toCanvasPath, item)
    }
  })
  return nextDocument
}

export async function packCanvasDocumentAssets(
  projectsRoot: string,
  input: {
    projectId: string
    path: string
    document: CanvasFileDocument
    assets?: CanvasFileAssetInput[]
    sharedMediaRoot?: string
  }
) {
  if (!isCanvasStateSnapshot(input.document.surface, input.document.document)) {
    return input.document
  }

  const assetInputs = Array.isArray(input.assets) ? input.assets : []
  const assetInputMap = buildAssetInputMap(assetInputs)
  const nextDocument = JSON.parse(JSON.stringify(input.document)) as CanvasFileDocument
  const nextState = nextDocument.document as CanvasStateSnapshot

  for (const item of nextState.items) {
    if (!item || typeof item !== "object") continue

    if (item.type === "media") {
      if (typeof item.src === "string" && item.src.trim()) {
        item.src = await resolvePackedAssetUrl({
          projectsRoot,
          sharedMediaRoot: input.sharedMediaRoot,
          projectId: input.projectId,
          canvasPath: input.path,
          itemId: item.id,
          field: "src",
          sourceUrl: item.src,
          preferredFileName: item.title,
          assetInput: assetInputMap.get(getAssetKey(item.id, "src")),
        })
      }

      if (typeof item.poster === "string" && item.poster.trim()) {
        item.poster = await resolvePackedAssetUrl({
          projectsRoot,
          sharedMediaRoot: input.sharedMediaRoot,
          projectId: input.projectId,
          canvasPath: input.path,
          itemId: item.id,
          field: "poster",
          sourceUrl: item.poster,
          preferredFileName: item.title ? `${item.title}-poster` : undefined,
          assetInput: assetInputMap.get(getAssetKey(item.id, "poster")),
        })
      }
      continue
    }

    if (item.type === "embed" && typeof item.embedSnapshotUrl === "string" && item.embedSnapshotUrl.trim()) {
      item.embedSnapshotUrl = await resolvePackedAssetUrl({
        projectsRoot,
        sharedMediaRoot: input.sharedMediaRoot,
        projectId: input.projectId,
        canvasPath: input.path,
        itemId: item.id,
        field: "embedSnapshotUrl",
        sourceUrl: item.embedSnapshotUrl,
        preferredFileName: item.title ? `${item.title}-snapshot` : undefined,
        assetInput: assetInputMap.get(getAssetKey(item.id, "embedSnapshotUrl")),
      })
    }
  }

  return nextDocument
}

export async function readCanvasDocumentAsset(
  projectsRoot: string,
  projectId: string,
  canvasPath: string,
  assetName: string
) {
  const resolved = resolveCanvasDocumentAssetPath(projectsRoot, projectId, canvasPath, assetName)
  const content = await fs.readFile(resolved.absolutePath)
  return {
    content,
    mimeType: mimeTypeFromExtension(path.extname(resolved.absolutePath)),
  }
}

export async function copyCanvasDocumentAssets(
  projectsRoot: string,
  projectId: string,
  fromCanvasPath: string,
  toCanvasPath: string
) {
  if (fromCanvasPath === toCanvasPath) return

  const source = getDocumentAssetDirectoryInfo(projectsRoot, projectId, fromCanvasPath)
  const target = getDocumentAssetDirectoryInfo(projectsRoot, projectId, toCanvasPath)
  if (!(await pathExists(source.assetDir))) return
  if (await pathExists(target.assetDir)) {
    throw new Error(`Canvas asset directory already exists for ${toCanvasPath}.`)
  }

  await fs.mkdir(path.dirname(target.assetDir), { recursive: true })
  await fs.cp(source.assetDir, target.assetDir, { recursive: true, errorOnExist: true })
}

export async function deleteCanvasDocumentAssets(
  projectsRoot: string,
  projectId: string,
  canvasPath: string
) {
  const target = getDocumentAssetDirectoryInfo(projectsRoot, projectId, canvasPath)
  await fs.rm(target.assetDir, { recursive: true, force: true })
}
