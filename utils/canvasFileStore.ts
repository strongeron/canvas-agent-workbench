import path from "node:path"
import { promises as fs } from "node:fs"

import type {
  CanvasDocumentSurface,
  CanvasFileDocument,
  CanvasFileIndexEntry,
  CanvasStateSnapshot,
  CanvasTransform,
} from "../types/canvas"
import {
  copyCanvasDocumentAssets,
  deleteCanvasDocumentAssets,
  rewriteCanvasDocumentAssetUrls,
} from "./canvasFileAssets"

export const CANVAS_FILE_KIND = "gallery-poc.canvas"
export const CANVAS_FILE_SCHEMA_VERSION = 1
const CANVAS_FILE_INDEX_KIND = "gallery-poc.canvas-index"
const CANVAS_FILE_INDEX_SCHEMA_VERSION = 1
const CANVAS_FILE_INDEX_NAME = ".canvas-index.json"
const CANVAS_FILE_ASSETS_DIRECTORY = ".assets"

const DEFAULT_TRANSFORM: CanvasTransform = {
  scale: 1,
  offset: { x: 0, y: 0 },
}

type CanvasFileScanRecord = {
  relativePath: string
  absolutePath: string
  modifiedAtMs: number
  size: number
}

type CanvasFileIndexCacheEntry = {
  entry: CanvasFileIndexEntry
  fileModifiedAtMs: number
  fileSize: number
}

type CanvasFileIndexCache = {
  kind: typeof CANVAS_FILE_INDEX_KIND
  schemaVersion: typeof CANVAS_FILE_INDEX_SCHEMA_VERSION
  generatedAt: string
  entries: CanvasFileIndexCacheEntry[]
}

function slugifyCanvasLabel(input: string) {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return normalized || "canvas"
}

function generateCanvasId() {
  return `canvas_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function normalizeCanvasStateSnapshot(
  snapshot?: Partial<CanvasStateSnapshot> | null
): CanvasStateSnapshot {
  const items = Array.isArray(snapshot?.items) ? snapshot.items : []
  const groups = Array.isArray(snapshot?.groups) ? snapshot.groups : []
  const nextZIndex =
    typeof snapshot?.nextZIndex === "number" && Number.isFinite(snapshot.nextZIndex)
      ? snapshot.nextZIndex
      : items.reduce((max, item) => Math.max(max, (item?.zIndex ?? 0) + 1), 1)

  return {
    items,
    groups,
    nextZIndex,
    selectedIds: Array.isArray(snapshot?.selectedIds) ? snapshot.selectedIds : [],
  }
}

type ColorLikeCanvasDocumentPayload = {
  state?: {
    nodes?: unknown[]
    edges?: unknown[]
  }
}

function isColorLikeCanvasDocumentPayload(
  value: unknown
): value is ColorLikeCanvasDocumentPayload {
  if (!value || typeof value !== "object") return false
  const state = (value as { state?: unknown }).state
  return !!state && typeof state === "object"
}

function ensureCanvasExtension(fileName: string) {
  return fileName.endsWith(".canvas") ? fileName : `${fileName}.canvas`
}

function normalizeRelativeCanvasPath(relativePath: string) {
  return ensureCanvasExtension(relativePath.trim().replace(/\\/g, "/").replace(/^\/+/, ""))
}

function assertWithinDirectory(rootDir: string, candidatePath: string) {
  const normalizedRoot = path.resolve(rootDir)
  const normalizedCandidate = path.resolve(candidatePath)
  if (
    normalizedCandidate !== normalizedRoot &&
    !normalizedCandidate.startsWith(`${normalizedRoot}${path.sep}`)
  ) {
    throw new Error("Canvas file path must stay within the project canvases directory.")
  }
}

export function buildCanvasFileDocument<
  TDocument = CanvasStateSnapshot,
  TView = { transform?: CanvasTransform }
>(input: {
  projectId: string
  title: string
  surface?: CanvasDocumentSurface
  slug?: string
  id?: string
  createdAt?: string
  updatedAt?: string
  tags?: string[]
  favorite?: boolean
  archived?: boolean
  document?: TDocument | Partial<CanvasStateSnapshot> | null
  view?: TView | null
}): CanvasFileDocument<TDocument, TView> {
  const title = input.title.trim() || "Untitled Canvas"
  const slug = input.slug?.trim() || slugifyCanvasLabel(title)
  const createdAt = input.createdAt || new Date().toISOString()
  const updatedAt = input.updatedAt || createdAt

  return {
    kind: CANVAS_FILE_KIND,
    schemaVersion: CANVAS_FILE_SCHEMA_VERSION,
    surface: input.surface || "canvas",
    meta: {
      id: input.id || generateCanvasId(),
      title,
      slug,
      projectId: input.projectId,
      createdAt,
      updatedAt,
      tags: input.tags ?? [],
      favorite: input.favorite === true,
      archived: input.archived === true,
    },
    document: (
      input.surface && input.surface !== "canvas"
        ? (input.document ?? {}) 
        : normalizeCanvasStateSnapshot(input.document as Partial<CanvasStateSnapshot> | null)
    ) as TDocument,
    view: (
      input.surface && input.surface !== "canvas"
        ? (input.view ?? {})
        : { transform: (input.view as { transform?: CanvasTransform } | null | undefined)?.transform ?? DEFAULT_TRANSFORM }
    ) as TView,
  }
}

function normalizeCanvasFileDocument(
  raw: unknown,
  fallback: {
    projectId: string
    title: string
  }
): CanvasFileDocument<unknown, unknown> {
  if (raw && typeof raw === "object" && (raw as { kind?: string }).kind === CANVAS_FILE_KIND) {
    const parsed = raw as Partial<CanvasFileDocument<unknown, unknown>>
    const meta = parsed.meta
    return buildCanvasFileDocument<unknown, unknown>({
      projectId:
        typeof meta?.projectId === "string" && meta.projectId.trim()
          ? meta.projectId
          : fallback.projectId,
      title:
        typeof meta?.title === "string" && meta.title.trim() ? meta.title : fallback.title,
      surface: parsed.surface || "canvas",
      slug:
        typeof meta?.slug === "string" && meta.slug.trim()
          ? meta.slug
          : slugifyCanvasLabel(fallback.title),
      id:
        typeof meta?.id === "string" && meta.id.trim() ? meta.id : undefined,
      createdAt:
        typeof meta?.createdAt === "string" && meta.createdAt.trim()
          ? meta.createdAt
          : undefined,
      updatedAt:
        typeof meta?.updatedAt === "string" && meta.updatedAt.trim()
          ? meta.updatedAt
          : undefined,
      tags: Array.isArray(meta?.tags) ? meta.tags.filter((tag): tag is string => typeof tag === "string") : [],
      favorite: meta?.favorite === true,
      archived: meta?.archived === true,
      document: parsed.document as unknown,
      view: parsed.view ?? undefined,
    })
  }

  if (raw && typeof raw === "object" && Array.isArray((raw as { items?: unknown[] }).items)) {
    const legacy = raw as {
      name?: string
      createdAt?: string
      items: CanvasStateSnapshot["items"]
      groups?: CanvasStateSnapshot["groups"]
    }
    return buildCanvasFileDocument<CanvasStateSnapshot>({
      projectId: fallback.projectId,
      title:
        typeof legacy.name === "string" && legacy.name.trim() ? legacy.name : fallback.title,
      createdAt:
        typeof legacy.createdAt === "string" && legacy.createdAt.trim()
          ? legacy.createdAt
          : undefined,
      document: {
        items: legacy.items,
        groups: Array.isArray(legacy.groups) ? legacy.groups : [],
        nextZIndex: legacy.items.reduce((max, item) => Math.max(max, (item?.zIndex ?? 0) + 1), 1),
        selectedIds: [],
      },
    })
  }

  throw new Error("Unsupported canvas file format.")
}

export async function ensureProjectCanvasDir(projectsRoot: string, projectId: string) {
  const canvasDir = path.join(projectsRoot, projectId, "canvases")
  await fs.mkdir(canvasDir, { recursive: true })
  return canvasDir
}

function resolveCanvasFileAbsolutePath(
  projectsRoot: string,
  projectId: string,
  relativePath: string
) {
  const canvasDir = path.join(projectsRoot, projectId, "canvases")
  const normalizedRelativePath = normalizeRelativeCanvasPath(relativePath)
  const absolutePath = path.resolve(canvasDir, normalizedRelativePath)
  assertWithinDirectory(canvasDir, absolutePath)
  return {
    canvasDir,
    relativePath: normalizedRelativePath,
    absolutePath,
  }
}

async function walkCanvasFiles(rootDir: string, currentDir = rootDir, acc: string[] = []) {
  const entries = await fs.readdir(currentDir, { withFileTypes: true })
  for (const entry of entries) {
    const absolutePath = path.join(currentDir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === CANVAS_FILE_ASSETS_DIRECTORY) {
        continue
      }
      await walkCanvasFiles(rootDir, absolutePath, acc)
      continue
    }
    if (entry.isFile() && entry.name.endsWith(".canvas")) {
      acc.push(absolutePath)
    }
  }
  return acc
}

function buildCanvasFileIndexEntry(input: {
  relativePath: string
  document: CanvasFileDocument<unknown, unknown>
}): CanvasFileIndexEntry {
  const isCanvasSurface = input.document.surface === "canvas"
  const documentPayload = input.document.document

  return {
    id: input.document.meta.id,
    projectId: input.document.meta.projectId,
    path: input.relativePath,
    title: input.document.meta.title,
    surface: input.document.surface,
    updatedAt: input.document.meta.updatedAt,
    createdAt: input.document.meta.createdAt,
    tags: input.document.meta.tags,
    favorite: input.document.meta.favorite,
    archived: input.document.meta.archived,
    itemCount: isCanvasSurface
      ? normalizeCanvasStateSnapshot(documentPayload as Partial<CanvasStateSnapshot>).items.length
      : (isColorLikeCanvasDocumentPayload(documentPayload)
          ? documentPayload.state?.nodes?.length ?? 0
          : 0),
    groupCount: isCanvasSurface
      ? normalizeCanvasStateSnapshot(documentPayload as Partial<CanvasStateSnapshot>).groups.length
      : (isColorLikeCanvasDocumentPayload(documentPayload)
          ? documentPayload.state?.edges?.length ?? 0
          : 0),
  }
}

function buildCanvasFileIndexCacheEntry(input: {
  scanRecord: CanvasFileScanRecord
  document: CanvasFileDocument<unknown, unknown>
}): CanvasFileIndexCacheEntry {
  return {
    entry: buildCanvasFileIndexEntry({
      relativePath: input.scanRecord.relativePath,
      document: input.document,
    }),
    fileModifiedAtMs: input.scanRecord.modifiedAtMs,
    fileSize: input.scanRecord.size,
  }
}

function sortCanvasFileIndexEntries(entries: CanvasFileIndexEntry[]) {
  return [...entries].sort((left, right) => {
    const rightTime = new Date(right.updatedAt).getTime()
    const leftTime = new Date(left.updatedAt).getTime()
    if (rightTime !== leftTime) return rightTime - leftTime
    return left.title.localeCompare(right.title)
  })
}

function sortCanvasFileIndexCacheEntries(entries: CanvasFileIndexCacheEntry[]) {
  return [...entries].sort((left, right) => left.entry.path.localeCompare(right.entry.path))
}

function getCanvasFileIndexPath(canvasDir: string) {
  return path.join(canvasDir, CANVAS_FILE_INDEX_NAME)
}

function isValidCanvasFileIndexCacheEntry(value: unknown): value is CanvasFileIndexCacheEntry {
  if (!value || typeof value !== "object") return false
  const candidate = value as Partial<CanvasFileIndexCacheEntry>
  const entry = candidate.entry as Partial<CanvasFileIndexEntry> | undefined

  return (
    !!entry &&
    typeof entry.id === "string" &&
    typeof entry.projectId === "string" &&
    typeof entry.path === "string" &&
    typeof entry.title === "string" &&
    typeof entry.surface === "string" &&
    typeof entry.updatedAt === "string" &&
    typeof entry.createdAt === "string" &&
    Array.isArray(entry.tags) &&
    typeof entry.favorite === "boolean" &&
    typeof entry.archived === "boolean" &&
    typeof entry.itemCount === "number" &&
    typeof entry.groupCount === "number" &&
    typeof candidate.fileModifiedAtMs === "number" &&
    Number.isFinite(candidate.fileModifiedAtMs) &&
    typeof candidate.fileSize === "number" &&
    Number.isFinite(candidate.fileSize)
  )
}

async function readCanvasFileIndexCache(canvasDir: string): Promise<CanvasFileIndexCache | null> {
  const indexPath = getCanvasFileIndexPath(canvasDir)
  try {
    const raw = await fs.readFile(indexPath, "utf8")
    const parsed = JSON.parse(raw) as Partial<CanvasFileIndexCache>
    if (
      parsed.kind !== CANVAS_FILE_INDEX_KIND ||
      parsed.schemaVersion !== CANVAS_FILE_INDEX_SCHEMA_VERSION ||
      !Array.isArray(parsed.entries)
    ) {
      return null
    }

    const entries = parsed.entries.filter(isValidCanvasFileIndexCacheEntry)
    if (entries.length !== parsed.entries.length) {
      return null
    }

    return {
      kind: CANVAS_FILE_INDEX_KIND,
      schemaVersion: CANVAS_FILE_INDEX_SCHEMA_VERSION,
      generatedAt:
        typeof parsed.generatedAt === "string" && parsed.generatedAt.trim()
          ? parsed.generatedAt
          : new Date().toISOString(),
      entries,
    }
  } catch {
    return null
  }
}

async function writeCanvasFileIndexCache(
  canvasDir: string,
  entries: CanvasFileIndexCacheEntry[]
) {
  const indexPath = getCanvasFileIndexPath(canvasDir)
  const payload: CanvasFileIndexCache = {
    kind: CANVAS_FILE_INDEX_KIND,
    schemaVersion: CANVAS_FILE_INDEX_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    entries: sortCanvasFileIndexCacheEntries(entries),
  }
  await fs.writeFile(indexPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8")
}

async function scanCanvasFiles(canvasDir: string) {
  const filePaths = await walkCanvasFiles(canvasDir)
  const stats = await Promise.all(
    filePaths.map(async (absolutePath) => {
      const stat = await fs.stat(absolutePath)
      return {
        absolutePath,
        relativePath: path.relative(canvasDir, absolutePath).replace(/\\/g, "/"),
        modifiedAtMs: stat.mtimeMs,
        size: stat.size,
      } satisfies CanvasFileScanRecord
    })
  )

  return stats.sort((left, right) => left.relativePath.localeCompare(right.relativePath))
}

async function upsertCanvasFileIndexEntry(
  projectsRoot: string,
  projectId: string,
  relativePath: string,
  document: CanvasFileDocument<unknown, unknown>
) {
  const { canvasDir, absolutePath, relativePath: normalizedPath } =
    resolveCanvasFileAbsolutePath(projectsRoot, projectId, relativePath)
  const stat = await fs.stat(absolutePath)
  const cache = await readCanvasFileIndexCache(canvasDir)
  const nextEntry = buildCanvasFileIndexCacheEntry({
    scanRecord: {
      absolutePath,
      relativePath: normalizedPath,
      modifiedAtMs: stat.mtimeMs,
      size: stat.size,
    },
    document,
  })
  const nextEntries = [
    ...(cache?.entries.filter((entry) => entry.entry.path !== normalizedPath) ?? []),
    nextEntry,
  ]
  await writeCanvasFileIndexCache(canvasDir, nextEntries)
}

async function removeCanvasFileIndexEntry(
  projectsRoot: string,
  projectId: string,
  relativePath: string
) {
  const canvasDir = await ensureProjectCanvasDir(projectsRoot, projectId)
  const cache = await readCanvasFileIndexCache(canvasDir)
  if (!cache) return

  const normalizedPath = normalizeRelativeCanvasPath(relativePath)
  const nextEntries = cache.entries.filter((entry) => entry.entry.path !== normalizedPath)
  if (nextEntries.length === cache.entries.length) return
  await writeCanvasFileIndexCache(canvasDir, nextEntries)
}

export async function listCanvasFiles(projectsRoot: string, projectId: string) {
  const canvasDir = await ensureProjectCanvasDir(projectsRoot, projectId)
  const scanRecords = await scanCanvasFiles(canvasDir)
  const cache = await readCanvasFileIndexCache(canvasDir)
  const cacheByPath = new Map(cache?.entries.map((entry) => [entry.entry.path, entry]) ?? [])
  const nextCacheEntries: CanvasFileIndexCacheEntry[] = []
  let didChange = !cache || cache.entries.length !== scanRecords.length

  for (const scanRecord of scanRecords) {
    const cachedEntry = cacheByPath.get(scanRecord.relativePath)
    if (
      cachedEntry &&
      cachedEntry.fileModifiedAtMs === scanRecord.modifiedAtMs &&
      cachedEntry.fileSize === scanRecord.size
    ) {
      nextCacheEntries.push(cachedEntry)
      continue
    }

    didChange = true

    try {
      const raw = await fs.readFile(scanRecord.absolutePath, "utf8")
      const title = path.basename(scanRecord.relativePath, ".canvas")
      const document = normalizeCanvasFileDocument(JSON.parse(raw), {
        projectId,
        title,
      })
      nextCacheEntries.push(buildCanvasFileIndexCacheEntry({ scanRecord, document }))
    } catch {
      continue
    }
  }

  if (didChange) {
    await writeCanvasFileIndexCache(canvasDir, nextCacheEntries)
  }

  return sortCanvasFileIndexEntries(nextCacheEntries.map((entry) => entry.entry))
}

export async function readCanvasFile<TDocument = unknown, TView = unknown>(
  projectsRoot: string,
  projectId: string,
  relativePath: string
) {
  const resolved = resolveCanvasFileAbsolutePath(projectsRoot, projectId, relativePath)
  const raw = await fs.readFile(resolved.absolutePath, "utf8")
  const document = normalizeCanvasFileDocument(JSON.parse(raw), {
    projectId,
    title: path.basename(resolved.relativePath, ".canvas"),
  })
  return {
    path: resolved.relativePath,
    document: document as CanvasFileDocument<TDocument, TView>,
  }
}

async function createUniqueCanvasFilePath(
  projectsRoot: string,
  projectId: string,
  title: string,
  folder?: string
) {
  const canvasDir = await ensureProjectCanvasDir(projectsRoot, projectId)
  const safeFolder = (folder || "").trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "")
  const folderDir = safeFolder ? path.join(canvasDir, safeFolder) : canvasDir
  await fs.mkdir(folderDir, { recursive: true })
  assertWithinDirectory(canvasDir, folderDir)

  const baseSlug = slugifyCanvasLabel(title)
  let counter = 1
  let relativePath = safeFolder
    ? `${safeFolder}/${baseSlug}.canvas`
    : `${baseSlug}.canvas`

  while (true) {
    const candidate = resolveCanvasFileAbsolutePath(projectsRoot, projectId, relativePath)
    try {
      await fs.access(candidate.absolutePath)
      counter += 1
      relativePath = safeFolder
        ? `${safeFolder}/${baseSlug}-${counter}.canvas`
        : `${baseSlug}-${counter}.canvas`
    } catch {
      return candidate
    }
  }
}

async function createUniqueCanvasFilePathFromRelativePath(
  projectsRoot: string,
  projectId: string,
  relativePath: string
) {
  const normalizedRelativePath = normalizeRelativeCanvasPath(relativePath)
  const parsed = path.posix.parse(normalizedRelativePath)
  const baseName = parsed.name || "canvas"
  let counter = 1
  let nextRelativePath = normalizedRelativePath

  while (true) {
    const candidate = resolveCanvasFileAbsolutePath(projectsRoot, projectId, nextRelativePath)
    try {
      await fs.access(candidate.absolutePath)
      counter += 1
      nextRelativePath = path.posix.join(parsed.dir, `${baseName}-${counter}.canvas`)
    } catch {
      return candidate
    }
  }
}

function buildCanvasRelativePathForTitle(title: string, folder?: string) {
  const safeFolder = (folder || "").trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "")
  const baseFileName = ensureCanvasExtension(slugifyCanvasLabel(title))
  return safeFolder ? `${safeFolder}/${baseFileName}` : baseFileName
}

async function assertCanvasFilePathAvailable(
  projectsRoot: string,
  projectId: string,
  relativePath: string
) {
  const resolved = resolveCanvasFileAbsolutePath(projectsRoot, projectId, relativePath)
  try {
    await fs.access(resolved.absolutePath)
    throw new Error(`Canvas file already exists at ${resolved.relativePath}.`)
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Canvas file already exists")) {
      throw error
    }
    return resolved
  }
}

async function pruneEmptyCanvasDirectories(canvasDir: string, startDir: string) {
  let currentDir = path.resolve(startDir)
  const normalizedRoot = path.resolve(canvasDir)

  while (currentDir.startsWith(`${normalizedRoot}${path.sep}`)) {
    try {
      const entries = await fs.readdir(currentDir)
      if (entries.length > 0) return
      await fs.rmdir(currentDir)
    } catch {
      return
    }
    currentDir = path.dirname(currentDir)
  }
}

function getCanvasFolder(relativePath: string) {
  const dir = path.posix.dirname(relativePath)
  return dir === "." ? "" : dir
}

async function writeCanvasDocumentFile<TDocument = unknown, TView = unknown>(
  absolutePath: string,
  document: CanvasFileDocument<TDocument, TView>
) {
  await fs.mkdir(path.dirname(absolutePath), { recursive: true })
  await fs.writeFile(absolutePath, `${JSON.stringify(document, null, 2)}\n`, "utf8")
}

export async function createCanvasFile<TDocument = unknown, TView = unknown>(
  projectsRoot: string,
  input: {
    projectId: string
    title: string
    folder?: string
    surface?: CanvasDocumentSurface
    document?: TDocument
    view?: TView
  }
) {
  const target = await createUniqueCanvasFilePath(
    projectsRoot,
    input.projectId,
    input.title,
    input.folder
  )
  const document = buildCanvasFileDocument<TDocument, TView>({
    projectId: input.projectId,
    title: input.title,
    slug: path.basename(target.relativePath, ".canvas"),
    surface: input.surface,
    document: input.document,
    view: input.view ?? undefined,
  })
  await writeCanvasDocumentFile(target.absolutePath, document)
  await upsertCanvasFileIndexEntry(projectsRoot, input.projectId, target.relativePath, document)
  return {
    path: target.relativePath,
    document,
  }
}

export async function saveCanvasFile<TDocument = unknown, TView = unknown>(
  projectsRoot: string,
  input: {
    projectId: string
    path: string
    document: CanvasFileDocument<TDocument, TView>
  }
) {
  const resolved = resolveCanvasFileAbsolutePath(projectsRoot, input.projectId, input.path)
  await fs.mkdir(path.dirname(resolved.absolutePath), { recursive: true })

  const normalized = buildCanvasFileDocument<TDocument, TView>({
    projectId: input.projectId,
    title: input.document.meta.title,
    surface: input.document.surface,
    slug:
      input.document.meta.slug ||
      path.basename(resolved.relativePath, ".canvas"),
    id: input.document.meta.id,
    createdAt: input.document.meta.createdAt,
    updatedAt: new Date().toISOString(),
    tags: input.document.meta.tags,
    favorite: input.document.meta.favorite,
    archived: input.document.meta.archived,
    document: input.document.document,
    view: input.document.view ?? undefined,
  })

  await writeCanvasDocumentFile(resolved.absolutePath, normalized)
  await upsertCanvasFileIndexEntry(projectsRoot, input.projectId, resolved.relativePath, normalized)
  return {
    path: resolved.relativePath,
    document: normalized,
  }
}

export async function updateCanvasFileMetadata(
  projectsRoot: string,
  input: {
    projectId: string
    path: string
    updates: Partial<Pick<CanvasFileDocument["meta"], "title" | "tags" | "favorite" | "archived">>
  }
) {
  const opened = await readCanvasFile(projectsRoot, input.projectId, input.path)
  const nextTitle =
    typeof input.updates.title === "string" && input.updates.title.trim()
      ? input.updates.title.trim()
      : opened.document.meta.title

  return saveCanvasFile(projectsRoot, {
    projectId: input.projectId,
    path: input.path,
    document: {
      ...opened.document,
      meta: {
        ...opened.document.meta,
        title: nextTitle,
        tags: Array.isArray(input.updates.tags) ? input.updates.tags : opened.document.meta.tags,
        favorite:
          typeof input.updates.favorite === "boolean"
            ? input.updates.favorite
            : opened.document.meta.favorite,
        archived:
          typeof input.updates.archived === "boolean"
            ? input.updates.archived
            : opened.document.meta.archived,
      },
    },
  })
}

export async function moveCanvasFile<TDocument = unknown, TView = unknown>(
  projectsRoot: string,
  input: {
    projectId: string
    path: string
    nextPath?: string
    title?: string
    folder?: string
  }
) {
  const opened = await readCanvasFile<TDocument, TView>(projectsRoot, input.projectId, input.path)
  const nextTitle =
    typeof input.title === "string" && input.title.trim()
      ? input.title.trim()
      : opened.document.meta.title
  const requestedRelativePath =
    typeof input.nextPath === "string" && input.nextPath.trim()
      ? normalizeRelativeCanvasPath(input.nextPath)
      : buildCanvasRelativePathForTitle(
          nextTitle,
          typeof input.folder === "string" ? input.folder : getCanvasFolder(opened.path)
        )

  if (requestedRelativePath === opened.path) {
    return saveCanvasFile(projectsRoot, {
      projectId: input.projectId,
      path: opened.path,
      document: {
        ...opened.document,
        meta: {
          ...opened.document.meta,
          title: nextTitle,
        },
      },
    })
  }

  const nextTarget =
    typeof input.nextPath === "string" && input.nextPath.trim()
      ? await assertCanvasFilePathAvailable(projectsRoot, input.projectId, requestedRelativePath)
      : await createUniqueCanvasFilePathFromRelativePath(
          projectsRoot,
          input.projectId,
          requestedRelativePath
        )

  const movedDocument = buildCanvasFileDocument<TDocument, TView>({
    projectId: input.projectId,
    title: nextTitle,
    surface: opened.document.surface,
    slug: path.basename(nextTarget.relativePath, ".canvas"),
    id: opened.document.meta.id,
    createdAt: opened.document.meta.createdAt,
    tags: opened.document.meta.tags,
    favorite: opened.document.meta.favorite,
    archived: opened.document.meta.archived,
    document: rewriteCanvasDocumentAssetUrls(
      input.projectId,
      opened.path,
      nextTarget.relativePath,
      opened.document as CanvasFileDocument
    ).document as TDocument,
    view: opened.document.view ?? undefined,
  })

  await copyCanvasDocumentAssets(projectsRoot, input.projectId, opened.path, nextTarget.relativePath)
  await writeCanvasDocumentFile(nextTarget.absolutePath, movedDocument)
  await upsertCanvasFileIndexEntry(projectsRoot, input.projectId, nextTarget.relativePath, movedDocument)
  await deleteCanvasDocumentAssets(projectsRoot, input.projectId, opened.path)

  const currentFile = resolveCanvasFileAbsolutePath(projectsRoot, input.projectId, opened.path)
  await fs.rm(currentFile.absolutePath, { force: true })
  await removeCanvasFileIndexEntry(projectsRoot, input.projectId, opened.path)
  await pruneEmptyCanvasDirectories(currentFile.canvasDir, path.dirname(currentFile.absolutePath))

  return {
    path: nextTarget.relativePath,
    document: movedDocument,
  }
}

export async function duplicateCanvasFile<TDocument = unknown, TView = unknown>(
  projectsRoot: string,
  input: {
    projectId: string
    path: string
    nextPath?: string
    title?: string
    folder?: string
  }
) {
  const opened = await readCanvasFile<TDocument, TView>(projectsRoot, input.projectId, input.path)
  const nextTitle =
    typeof input.title === "string" && input.title.trim()
      ? input.title.trim()
      : `${opened.document.meta.title} Copy`
  const requestedRelativePath =
    typeof input.nextPath === "string" && input.nextPath.trim()
      ? normalizeRelativeCanvasPath(input.nextPath)
      : buildCanvasRelativePathForTitle(
          nextTitle,
          typeof input.folder === "string" ? input.folder : getCanvasFolder(opened.path)
        )
  const nextTarget =
    typeof input.nextPath === "string" && input.nextPath.trim()
      ? await assertCanvasFilePathAvailable(projectsRoot, input.projectId, requestedRelativePath)
      : await createUniqueCanvasFilePathFromRelativePath(
          projectsRoot,
          input.projectId,
          requestedRelativePath
        )

  const duplicatedDocument = buildCanvasFileDocument<TDocument, TView>({
    projectId: input.projectId,
    title: nextTitle,
    surface: opened.document.surface,
    slug: path.basename(nextTarget.relativePath, ".canvas"),
    tags: opened.document.meta.tags,
    favorite: false,
    archived: false,
    document: rewriteCanvasDocumentAssetUrls(
      input.projectId,
      opened.path,
      nextTarget.relativePath,
      opened.document as CanvasFileDocument
    ).document as TDocument,
    view: opened.document.view ?? undefined,
  })

  await copyCanvasDocumentAssets(projectsRoot, input.projectId, opened.path, nextTarget.relativePath)
  await writeCanvasDocumentFile(nextTarget.absolutePath, duplicatedDocument)
  await upsertCanvasFileIndexEntry(
    projectsRoot,
    input.projectId,
    nextTarget.relativePath,
    duplicatedDocument
  )

  return {
    path: nextTarget.relativePath,
    document: duplicatedDocument,
  }
}

export async function deleteCanvasFile(
  projectsRoot: string,
  input: {
    projectId: string
    path: string
  }
) {
  const resolved = resolveCanvasFileAbsolutePath(projectsRoot, input.projectId, input.path)
  await deleteCanvasDocumentAssets(projectsRoot, input.projectId, resolved.relativePath)
  await fs.rm(resolved.absolutePath, { force: true })
  await removeCanvasFileIndexEntry(projectsRoot, input.projectId, resolved.relativePath)
  await pruneEmptyCanvasDirectories(resolved.canvasDir, path.dirname(resolved.absolutePath))
  return {
    ok: true,
    path: resolved.relativePath,
  }
}
