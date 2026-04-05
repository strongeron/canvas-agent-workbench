import path from "node:path"
import { promises as fs } from "node:fs"

import type {
  CanvasDocumentSurface,
  CanvasFileDocument,
  CanvasFileIndexEntry,
  CanvasStateSnapshot,
  CanvasTransform,
} from "../types/canvas"

export const CANVAS_FILE_KIND = "gallery-poc.canvas"
export const CANVAS_FILE_SCHEMA_VERSION = 1

const DEFAULT_TRANSFORM: CanvasTransform = {
  scale: 1,
  offset: { x: 0, y: 0 },
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

export function buildCanvasFileDocument(input: {
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
  document?: Partial<CanvasStateSnapshot> | null
  view?: { transform?: CanvasTransform } | null
}): CanvasFileDocument {
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
    document: normalizeCanvasStateSnapshot(input.document),
    view: {
      transform: input.view?.transform ?? DEFAULT_TRANSFORM,
    },
  }
}

function normalizeCanvasFileDocument(
  raw: unknown,
  fallback: {
    projectId: string
    title: string
  }
): CanvasFileDocument {
  if (raw && typeof raw === "object" && (raw as { kind?: string }).kind === CANVAS_FILE_KIND) {
    const parsed = raw as Partial<CanvasFileDocument>
    const meta = parsed.meta
    return buildCanvasFileDocument({
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
      document: parsed.document,
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
    return buildCanvasFileDocument({
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
  document: CanvasFileDocument
}): CanvasFileIndexEntry {
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
    itemCount: input.document.document.items.length,
    groupCount: input.document.document.groups.length,
  }
}

export async function listCanvasFiles(projectsRoot: string, projectId: string) {
  const canvasDir = await ensureProjectCanvasDir(projectsRoot, projectId)
  const filePaths = await walkCanvasFiles(canvasDir)
  const docs = await Promise.all(
    filePaths.map(async (absolutePath) => {
      try {
        const raw = await fs.readFile(absolutePath, "utf8")
        const relativePath = path.relative(canvasDir, absolutePath).replace(/\\/g, "/")
        const title = path.basename(relativePath, ".canvas")
        const document = normalizeCanvasFileDocument(JSON.parse(raw), {
          projectId,
          title,
        })
        return buildCanvasFileIndexEntry({ relativePath, document })
      } catch {
        return null
      }
    })
  )

  return docs
    .filter((entry): entry is CanvasFileIndexEntry => entry !== null)
    .sort((left, right) => {
      const rightTime = new Date(right.updatedAt).getTime()
      const leftTime = new Date(left.updatedAt).getTime()
      if (rightTime !== leftTime) return rightTime - leftTime
      return left.title.localeCompare(right.title)
    })
}

export async function readCanvasFile(
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
    document,
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

export async function createCanvasFile(
  projectsRoot: string,
  input: {
    projectId: string
    title: string
    folder?: string
    surface?: CanvasDocumentSurface
    document?: Partial<CanvasStateSnapshot> | null
    view?: { transform?: CanvasTransform } | null
  }
) {
  const target = await createUniqueCanvasFilePath(
    projectsRoot,
    input.projectId,
    input.title,
    input.folder
  )
  const document = buildCanvasFileDocument({
    projectId: input.projectId,
    title: input.title,
    slug: path.basename(target.relativePath, ".canvas"),
    surface: input.surface,
    document: input.document,
    view: input.view ?? undefined,
  })
  await fs.writeFile(target.absolutePath, `${JSON.stringify(document, null, 2)}\n`, "utf8")
  return {
    path: target.relativePath,
    document,
  }
}

export async function saveCanvasFile(
  projectsRoot: string,
  input: {
    projectId: string
    path: string
    document: CanvasFileDocument
  }
) {
  const resolved = resolveCanvasFileAbsolutePath(projectsRoot, input.projectId, input.path)
  await fs.mkdir(path.dirname(resolved.absolutePath), { recursive: true })

  const normalized = buildCanvasFileDocument({
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

  await fs.writeFile(resolved.absolutePath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8")
  return {
    path: resolved.relativePath,
    document: normalized,
  }
}
