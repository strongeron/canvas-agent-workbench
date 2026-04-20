import path from "node:path"
import { promises as fs } from "node:fs"

import type {
  CanvasDocumentSurface,
  CanvasFileAssetField,
  CanvasFileAssetInput,
  CanvasFileDocument,
  CanvasHtmlBundleImportInput,
  CanvasHtmlBundleLibraryScanResult,
  CanvasHtmlBundleImportResult,
  CanvasStateSnapshot,
} from "../types/canvas"

const DOCUMENT_ASSETS_FOLDER = ".assets"
const HTML_BUNDLE_SCAN_IGNORE_DIRECTORIES = new Set([
  ".git",
  ".hg",
  ".svn",
  "node_modules",
  "dist",
  "build",
  ".next",
  ".turbo",
  "coverage",
])

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

function normalizeRelativeAssetPath(relativePath: string) {
  const normalized = (relativePath || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/{2,}/g, "/")
  if (!normalized) {
    throw new Error("Asset path is required.")
  }
  const segments = normalized.split("/")
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error("Asset path must stay within the document asset directory.")
  }
  return segments.join("/")
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
  const safeAssetName = normalizeRelativeAssetPath(assetName)
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
  return writeCanvasAssetBufferAtPath(
    projectsRoot,
    projectId,
    canvasPath,
    normalizedFileName,
    mimeType,
    buffer
  )
}

async function writeCanvasAssetBufferAtPath(
  projectsRoot: string,
  projectId: string,
  canvasPath: string,
  assetPath: string,
  mimeType: string,
  buffer: Buffer
) {
  const resolved = resolveCanvasDocumentAssetPath(
    projectsRoot,
    projectId,
    canvasPath,
    assetPath
  )
  await fs.mkdir(path.dirname(resolved.absolutePath), { recursive: true })
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
    case ".avif":
      return "image/avif"
    case ".bmp":
      return "image/bmp"
    case ".ico":
      return "image/x-icon"
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
    case ".html":
    case ".htm":
      return "text/html; charset=utf-8"
    case ".css":
      return "text/css; charset=utf-8"
    case ".js":
    case ".mjs":
    case ".cjs":
      return "text/javascript; charset=utf-8"
    case ".json":
    case ".map":
      return "application/json; charset=utf-8"
    case ".xml":
      return "application/xml; charset=utf-8"
    case ".txt":
    case ".md":
      return "text/plain; charset=utf-8"
    case ".wasm":
      return "application/wasm"
    case ".woff":
      return "font/woff"
    case ".woff2":
      return "font/woff2"
    case ".ttf":
      return "font/ttf"
    case ".otf":
      return "font/otf"
    case ".eot":
      return "application/vnd.ms-fontobject"
    default:
      return "application/octet-stream"
  }
}

function mimeTypeFromFileName(fileName: string) {
  return mimeTypeFromExtension(path.extname(fileName))
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

async function collectDirectoryFiles(directoryPath: string) {
  const absoluteRoot = path.resolve(directoryPath)
  const rootStat = await fs.stat(absoluteRoot)
  if (!rootStat.isDirectory()) {
    throw new Error(`HTML bundle directory is not a directory: ${directoryPath}`)
  }

  const entries: Array<{ absolutePath: string; relativePath: string }> = []

  async function walk(currentPath: string, relativeRoot: string) {
    const children = await fs.readdir(currentPath, { withFileTypes: true })
    for (const child of children) {
      const absoluteChildPath = path.join(currentPath, child.name)
      const nextRelativePath = relativeRoot ? `${relativeRoot}/${child.name}` : child.name
      if (child.isDirectory()) {
        await walk(absoluteChildPath, nextRelativePath)
        continue
      }
      if (child.isFile()) {
        entries.push({
          absolutePath: absoluteChildPath,
          relativePath: normalizeRelativeAssetPath(nextRelativePath),
        })
      }
    }
  }

  await walk(absoluteRoot, "")
  return entries.sort((left, right) => left.relativePath.localeCompare(right.relativePath))
}

function isHtmlEntryFile(fileName: string) {
  return /\.html?$/i.test(fileName)
}

export async function scanCanvasHtmlBundleLibrary(
  rootPath: string
): Promise<CanvasHtmlBundleLibraryScanResult> {
  const absoluteRoot = path.resolve(rootPath || "")
  const rootStat = await fs.stat(absoluteRoot)
  if (!rootStat.isDirectory()) {
    throw new Error(`HTML bundle root is not a directory: ${rootPath}`)
  }

  const entries: CanvasHtmlBundleLibraryScanResult["entries"] = []
  const queue = [absoluteRoot]

  while (queue.length > 0) {
    const directoryPath = queue.shift()
    if (!directoryPath) continue

    const directoryEntries = await fs.readdir(directoryPath, { withFileTypes: true })
    const htmlFiles = directoryEntries
      .filter((entry) => entry.isFile() && isHtmlEntryFile(entry.name))
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right))

    if (htmlFiles.length > 0) {
      const relativeDirectory = path.relative(absoluteRoot, directoryPath).replace(/\\/g, "/") || "."
      const defaultEntryFile =
        htmlFiles.find((fileName) => /^index\.html?$/i.test(fileName)) || htmlFiles[0]

      entries.push({
        id: relativeDirectory,
        directoryPath,
        relativeDirectory,
        entryFiles: htmlFiles,
        defaultEntryFile,
      })
    }

    for (const entry of directoryEntries) {
      if (!entry.isDirectory()) continue
      if (HTML_BUNDLE_SCAN_IGNORE_DIRECTORIES.has(entry.name)) continue
      queue.push(path.join(directoryPath, entry.name))
    }
  }

  entries.sort((left, right) => left.relativeDirectory.localeCompare(right.relativeDirectory))

  return {
    rootPath: absoluteRoot,
    scannedAt: new Date().toISOString(),
    entries,
  }
}

function resolveHtmlBundleEntryFile(entryFile: string | undefined, assetPaths: string[]) {
  const normalizedEntryFile = entryFile ? normalizeRelativeAssetPath(entryFile) : ""
  if (normalizedEntryFile) {
    if (!assetPaths.includes(normalizedEntryFile)) {
      throw new Error(`HTML bundle entry file not found: ${normalizedEntryFile}`)
    }
    return normalizedEntryFile
  }

  const preferred = assetPaths.find((assetPath) => /(^|\/)index\.html?$/i.test(assetPath))
  if (preferred) return preferred

  const firstHtml = assetPaths.find((assetPath) => /\.html?$/i.test(assetPath))
  if (firstHtml) return firstHtml

  throw new Error("HTML bundle must include an .html entry file.")
}

function createHtmlBundleAssetRoot(title: string | undefined, entryFile: string) {
  const seed = sanitizeAssetSegment(title || path.basename(entryFile, path.extname(entryFile)) || "html")
  const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
  return `html/${seed}-${suffix}`
}

function getHtmlBundleAssetRoot(entryAsset: string | undefined) {
  const normalizedEntryAsset = typeof entryAsset === "string" ? entryAsset.trim() : ""
  if (!normalizedEntryAsset) return null
  const safeEntryAsset = normalizeRelativeAssetPath(normalizedEntryAsset)
  const assetRoot = path.posix.dirname(safeEntryAsset)
  if (!assetRoot || assetRoot === ".") return null
  return normalizeRelativeAssetPath(assetRoot)
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
  if (item.type === "html" && typeof item.src === "string") {
    const assetName = getDocumentAssetNameFromUrl(projectId, fromCanvasPath, item.src)
    if (assetName) {
      item.src = buildCanvasDocumentAssetUrl(projectId, toCanvasPath, assetName)
    }
    return
  }

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
  document: CanvasFileDocument<unknown, unknown>
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
    document: CanvasFileDocument<unknown, unknown>
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

export async function importCanvasHtmlBundle(
  projectsRoot: string,
  input: {
    projectId: string
    path: string
    bundle: CanvasHtmlBundleImportInput
  }
): Promise<CanvasHtmlBundleImportResult> {
  const bundle = input.bundle && typeof input.bundle === "object" ? input.bundle : {}
  const inlineFiles = Array.isArray(bundle.files)
    ? bundle.files
        .map((file) => ({
          relativePath: normalizeRelativeAssetPath(file.relativePath),
          dataUrl: typeof file.dataUrl === "string" ? file.dataUrl : undefined,
          filePath: typeof file.filePath === "string" ? file.filePath : undefined,
          textContent: typeof file.textContent === "string" ? file.textContent : undefined,
        }))
        .filter((file) => file.dataUrl || file.filePath || typeof file.textContent === "string")
    : []
  const directoryFiles = bundle.directoryPath ? await collectDirectoryFiles(bundle.directoryPath) : []

  if (inlineFiles.length === 0 && directoryFiles.length === 0) {
    throw new Error("HTML bundle import requires files or directoryPath.")
  }

  const assetPaths = [
    ...directoryFiles.map((file) => file.relativePath),
    ...inlineFiles.map((file) => file.relativePath),
  ]
  const entryFile = resolveHtmlBundleEntryFile(bundle.entryFile, assetPaths)
  const importedAt = new Date().toISOString()
  const assetRoot = createHtmlBundleAssetRoot(bundle.title, entryFile)
  const replacedAssetRoot = getHtmlBundleAssetRoot(bundle.replaceEntryAsset)

  for (const file of directoryFiles) {
    const content = await fs.readFile(file.absolutePath)
    await writeCanvasAssetBufferAtPath(
      projectsRoot,
      input.projectId,
      input.path,
      `${assetRoot}/${file.relativePath}`,
      mimeTypeFromFileName(file.relativePath),
      content
    )
  }

  for (const file of inlineFiles) {
    if (file.dataUrl) {
      const parsed = parseDataUrlPayload(file.dataUrl)
      if (!parsed) {
        throw new Error(`Invalid HTML bundle data payload for ${file.relativePath}.`)
      }
      await writeCanvasAssetBufferAtPath(
        projectsRoot,
        input.projectId,
        input.path,
        `${assetRoot}/${file.relativePath}`,
        parsed.mime,
        parsed.buffer
      )
      continue
    }

    if (typeof file.textContent === "string") {
      await writeCanvasAssetBufferAtPath(
        projectsRoot,
        input.projectId,
        input.path,
        `${assetRoot}/${file.relativePath}`,
        mimeTypeFromFileName(file.relativePath),
        Buffer.from(file.textContent, "utf8")
      )
      continue
    }

    if (!file.filePath) continue
    const absoluteSourcePath = path.resolve(file.filePath)
    const stat = await fs.stat(absoluteSourcePath)
    if (!stat.isFile()) {
      throw new Error(`HTML bundle asset is not a file: ${file.filePath}`)
    }
    const content = await fs.readFile(absoluteSourcePath)
    await writeCanvasAssetBufferAtPath(
      projectsRoot,
      input.projectId,
      input.path,
      `${assetRoot}/${file.relativePath}`,
      mimeTypeFromFileName(file.relativePath),
      content
    )
  }

  const entryAsset = `${assetRoot}/${entryFile}`
  if (replacedAssetRoot && replacedAssetRoot !== assetRoot) {
    const resolved = resolveCanvasDocumentAssetPath(
      projectsRoot,
      input.projectId,
      input.path,
      replacedAssetRoot
    )
    await fs.rm(resolved.absolutePath, { recursive: true, force: true })
  }
  return {
    assetRoot,
    entryAsset,
    entryUrl: buildCanvasDocumentAssetUrl(input.projectId, input.path, entryAsset),
    assetCount: assetPaths.length,
    importedAt,
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
