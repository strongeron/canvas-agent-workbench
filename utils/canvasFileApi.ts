import type {
  CanvasDocumentSurface,
  CanvasFileAssetInput,
  CanvasFileDocument,
  CanvasHtmlBundleImportInput,
  CanvasHtmlBundleLibraryScanResult,
} from "../types/canvas"
import {
  createCanvasFile,
  deleteCanvasFile,
  duplicateCanvasFile,
  listCanvasFiles,
  moveCanvasFile,
  readCanvasFile,
  saveCanvasFile,
  updateCanvasFileMetadata,
} from "./canvasFileStore"
import { packCanvasDocumentAssets } from "./canvasFileAssets"
import { importCanvasHtmlBundle, scanCanvasHtmlBundleLibrary } from "./canvasFileAssets"

export async function listProjectCanvasFiles(
  projectsRoot: string,
  projectId: string,
  surface?: string | null
) {
  const files = await listCanvasFiles(projectsRoot, projectId)
  return surface === "canvas" || surface === "color-audit" || surface === "system-canvas"
    ? files.filter((file) => file.surface === surface)
    : files
}

export async function openProjectCanvasFile(
  projectsRoot: string,
  projectId: string,
  canvasPath: string
) {
  const normalizedPath = typeof canvasPath === "string" ? canvasPath.trim() : ""
  if (!normalizedPath) {
    throw new Error("path query param is required.")
  }
  return readCanvasFile(projectsRoot, projectId, normalizedPath)
}

export async function createProjectCanvasFile(
  projectsRoot: string,
  mediaStoreDir: string,
  projectId: string,
  body: {
    title?: string
    folder?: string
    surface?: CanvasDocumentSurface
    document?: unknown
    view?: unknown
    assets?: CanvasFileAssetInput[]
  }
) {
  const title = typeof body.title === "string" ? body.title.trim() : ""
  if (!title) {
    throw new Error("title is required.")
  }

  const createdFile = await createCanvasFile(projectsRoot, {
    projectId,
    title,
    folder: typeof body.folder === "string" ? body.folder : undefined,
    surface: body.surface,
    document: body.document,
    view: body.view,
  })

  if (!Array.isArray(body.assets) || body.assets.length === 0) {
    return createdFile
  }

  return saveCanvasFile<unknown, unknown>(projectsRoot, {
    projectId,
    path: createdFile.path,
    document: await packCanvasDocumentAssets(projectsRoot, {
      projectId,
      path: createdFile.path,
      document: createdFile.document,
      assets: body.assets,
      sharedMediaRoot: mediaStoreDir,
    }),
  })
}

export async function saveProjectCanvasFile(
  projectsRoot: string,
  mediaStoreDir: string,
  projectId: string,
  body: {
    path?: string
    document?: CanvasFileDocument<unknown, unknown>
    assets?: CanvasFileAssetInput[]
  }
) {
  const canvasPath = typeof body.path === "string" ? body.path.trim() : ""
  if (!canvasPath) {
    throw new Error("path is required.")
  }
  if (!body.document || typeof body.document !== "object") {
    throw new Error("document is required.")
  }

  const packedDocument = await packCanvasDocumentAssets(projectsRoot, {
    projectId,
    path: canvasPath,
    document: body.document,
    assets: Array.isArray(body.assets) ? body.assets : undefined,
    sharedMediaRoot: mediaStoreDir,
  })

  return saveCanvasFile<unknown, unknown>(projectsRoot, {
    projectId,
    path: canvasPath,
    document: packedDocument,
  })
}

export async function updateProjectCanvasFileMetadata(
  projectsRoot: string,
  projectId: string,
  body: {
    path?: string
    title?: string
    tags?: string[]
    favorite?: boolean
    archived?: boolean
  }
) {
  const canvasPath = typeof body.path === "string" ? body.path.trim() : ""
  if (!canvasPath) {
    throw new Error("path is required.")
  }

  return updateCanvasFileMetadata(projectsRoot, {
    projectId,
    path: canvasPath,
    updates: {
      title: typeof body.title === "string" ? body.title : undefined,
      tags: Array.isArray(body.tags) ? body.tags : undefined,
      favorite: typeof body.favorite === "boolean" ? body.favorite : undefined,
      archived: typeof body.archived === "boolean" ? body.archived : undefined,
    },
  })
}

export async function moveProjectCanvasFile(
  projectsRoot: string,
  projectId: string,
  body: {
    path?: string
    nextPath?: string
    title?: string
    folder?: string
  }
) {
  const canvasPath = typeof body.path === "string" ? body.path.trim() : ""
  if (!canvasPath) {
    throw new Error("path is required.")
  }

  return moveCanvasFile(projectsRoot, {
    projectId,
    path: canvasPath,
    nextPath: typeof body.nextPath === "string" ? body.nextPath : undefined,
    title: typeof body.title === "string" ? body.title : undefined,
    folder: typeof body.folder === "string" ? body.folder : undefined,
  })
}

export async function duplicateProjectCanvasFile(
  projectsRoot: string,
  projectId: string,
  body: {
    path?: string
    nextPath?: string
    title?: string
    folder?: string
  }
) {
  const canvasPath = typeof body.path === "string" ? body.path.trim() : ""
  if (!canvasPath) {
    throw new Error("path is required.")
  }

  return duplicateCanvasFile(projectsRoot, {
    projectId,
    path: canvasPath,
    nextPath: typeof body.nextPath === "string" ? body.nextPath : undefined,
    title: typeof body.title === "string" ? body.title : undefined,
    folder: typeof body.folder === "string" ? body.folder : undefined,
  })
}

export async function deleteProjectCanvasFile(
  projectsRoot: string,
  projectId: string,
  body: {
    path?: string
  }
) {
  const canvasPath = typeof body.path === "string" ? body.path.trim() : ""
  if (!canvasPath) {
    throw new Error("path is required.")
  }

  return deleteCanvasFile(projectsRoot, {
    projectId,
    path: canvasPath,
  })
}

export async function importProjectCanvasHtmlBundle(
  projectsRoot: string,
  projectId: string,
  body: {
    path?: string
    bundle?: CanvasHtmlBundleImportInput
  }
) {
  const canvasPath = typeof body.path === "string" ? body.path.trim() : ""
  if (!canvasPath) {
    throw new Error("path is required.")
  }

  return importCanvasHtmlBundle(projectsRoot, {
    projectId,
    path: canvasPath,
    bundle: body.bundle && typeof body.bundle === "object" ? body.bundle : {},
  })
}

export async function scanProjectCanvasHtmlBundles(
  _projectsRoot: string,
  _projectId: string,
  rootPath: string
): Promise<CanvasHtmlBundleLibraryScanResult> {
  const normalizedRootPath = typeof rootPath === "string" ? rootPath.trim() : ""
  if (!normalizedRootPath) {
    throw new Error("rootPath is required.")
  }

  return scanCanvasHtmlBundleLibrary(normalizedRootPath)
}
