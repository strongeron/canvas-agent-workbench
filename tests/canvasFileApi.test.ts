import os from "node:os"
import path from "node:path"
import { promises as fs } from "node:fs"

import { afterEach, describe, expect, it } from "vitest"

import type { CanvasStateSnapshot } from "../types/canvas"
import { buildCanvasFileDocument } from "../utils/canvasFileStore"
import {
  createProjectCanvasFile,
  deleteProjectCanvasFile,
  duplicateProjectCanvasFile,
  importProjectCanvasHtmlBundle,
  listProjectCanvasFiles,
  moveProjectCanvasFile,
  openProjectCanvasFile,
  scanProjectCanvasHtmlBundles,
  saveProjectCanvasFile,
  updateProjectCanvasFileMetadata,
} from "../utils/canvasFileApi"

const tempDirs: string[] = []

async function createTempDir(prefix: string) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), prefix))
  tempDirs.push(root)
  return root
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0, tempDirs.length).map((dir) =>
      fs.rm(dir, { recursive: true, force: true })
    )
  )
})

describe("canvas file api", () => {
  it("creates, lists, opens, saves, moves, duplicates, and deletes project canvas files", async () => {
    const projectsRoot = await createTempDir("gallery-poc-canvas-api-projects-")
    const mediaRoot = await createTempDir("gallery-poc-canvas-api-media-")

    const created = await createProjectCanvasFile(projectsRoot, mediaRoot, "demo", {
      title: "Media Board",
      folder: "boards",
      surface: "canvas",
      document: {
        items: [
          {
            id: "media-1",
            type: "media",
            src: "blob:temporary-image",
            title: "Packed Asset",
            mediaKind: "image",
            position: { x: 0, y: 0 },
            size: { width: 120, height: 120 },
            rotation: 0,
            zIndex: 1,
          },
        ],
        groups: [],
        nextZIndex: 2,
        selectedIds: [],
      } satisfies CanvasStateSnapshot,
      assets: [
        {
          itemId: "media-1",
          field: "src",
          fileName: "packed.png",
          dataUrl: "data:image/png;base64,cGFja2VkLWltYWdl",
        },
      ],
    })

    expect(created.path).toBe("boards/media-board.canvas")
    const createdItem = (created.document.document as CanvasStateSnapshot).items[0]
    const createdSrc =
      createdItem && createdItem.type === "media" ? createdItem.src : ""
    expect(createdSrc).toContain("/api/projects/demo/canvases/assets/file?path=boards%2Fmedia-board.canvas")

    const listed = await listProjectCanvasFiles(projectsRoot, "demo", "canvas")
    expect(listed.map((entry) => entry.path)).toEqual(["boards/media-board.canvas"])

    const opened = await openProjectCanvasFile(projectsRoot, "demo", "boards/media-board.canvas")
    expect(opened.document.meta.title).toBe("Media Board")

    const importedHtmlBundle = await importProjectCanvasHtmlBundle(projectsRoot, "demo", {
      path: "boards/media-board.canvas",
      bundle: {
        title: "Landing Preview",
        files: [
          {
            relativePath: "index.html",
            dataUrl: "data:text/html;base64,PGgxPkhlbGxvPC9oMT4=",
          },
          {
            relativePath: "styles/site.css",
            dataUrl: "data:text/css;base64,aDEgeyBjb2xvcjogcmVkOyB9",
          },
        ],
      },
    })
    expect(importedHtmlBundle.entryUrl).toContain(
      "/api/projects/demo/canvases/assets/file?path=boards%2Fmedia-board.canvas"
    )
    expect(importedHtmlBundle.assetCount).toBe(2)

    const saved = await saveProjectCanvasFile(projectsRoot, mediaRoot, "demo", {
      path: "boards/media-board.canvas",
      document: buildCanvasFileDocument({
        projectId: "demo",
        title: "Media Board",
        id: created.document.meta.id,
        createdAt: created.document.meta.createdAt,
        document: {
          items: [],
          groups: [],
          nextZIndex: 1,
          selectedIds: [],
        },
      }),
    })
    expect((saved.document.document as CanvasStateSnapshot).items).toHaveLength(0)

    const updated = await updateProjectCanvasFileMetadata(projectsRoot, "demo", {
      path: "boards/media-board.canvas",
      favorite: true,
      title: "Media Board Reviewed",
    })
    expect(updated.document.meta.title).toBe("Media Board Reviewed")
    expect(updated.document.meta.favorite).toBe(true)

    const moved = await moveProjectCanvasFile(projectsRoot, "demo", {
      path: "boards/media-board.canvas",
      title: "Media Board Renamed",
    })
    expect(moved.path).toBe("boards/media-board-renamed.canvas")

    const duplicated = await duplicateProjectCanvasFile(projectsRoot, "demo", {
      path: moved.path,
      title: "Media Board Copy",
      folder: "archive",
    })
    expect(duplicated.path).toBe("archive/media-board-copy.canvas")

    const listedAfterDuplicate = await listProjectCanvasFiles(projectsRoot, "demo")
    expect(listedAfterDuplicate.map((entry) => entry.path).sort()).toEqual([
      "archive/media-board-copy.canvas",
      "boards/media-board-renamed.canvas",
    ])

    const deleted = await deleteProjectCanvasFile(projectsRoot, "demo", {
      path: duplicated.path,
    })
    expect(deleted).toEqual({
      ok: true,
      path: "archive/media-board-copy.canvas",
    })

    const finalList = await listProjectCanvasFiles(projectsRoot, "demo")
    expect(finalList.map((entry) => entry.path)).toEqual(["boards/media-board-renamed.canvas"])
  })

  it("validates required request fields before touching the store", async () => {
    const projectsRoot = await createTempDir("gallery-poc-canvas-api-projects-")
    const mediaRoot = await createTempDir("gallery-poc-canvas-api-media-")

    await expect(
      createProjectCanvasFile(projectsRoot, mediaRoot, "demo", {})
    ).rejects.toThrow("title is required.")

    await expect(openProjectCanvasFile(projectsRoot, "demo", "")).rejects.toThrow(
      "path query param is required."
    )

    await expect(
      saveProjectCanvasFile(projectsRoot, mediaRoot, "demo", {
        path: "",
      })
    ).rejects.toThrow("path is required.")

    await expect(
      saveProjectCanvasFile(projectsRoot, mediaRoot, "demo", {
        path: "boards/demo.canvas",
      })
    ).rejects.toThrow("document is required.")

    await expect(
      scanProjectCanvasHtmlBundles(projectsRoot, "demo", "")
    ).rejects.toThrow("rootPath is required.")
  })

  it("scans a local HTML bundle library through the project api helper", async () => {
    const projectsRoot = await createTempDir("gallery-poc-canvas-api-projects-")
    const libraryRoot = await createTempDir("gallery-poc-html-library-")
    await fs.mkdir(path.join(libraryRoot, "marketing", "hero"), { recursive: true })
    await fs.writeFile(path.join(libraryRoot, "marketing", "hero", "index.html"), "<html>hero</html>")

    const result = await scanProjectCanvasHtmlBundles(projectsRoot, "demo", libraryRoot)
    expect(result.rootPath).toBe(libraryRoot)
    expect(result.entries).toHaveLength(1)
    expect(result.entries[0]).toMatchObject({
      relativeDirectory: "marketing/hero",
      defaultEntryFile: "index.html",
    })
  })
})
