import os from "node:os"
import path from "node:path"
import { promises as fs } from "node:fs"

import { afterEach, describe, expect, it } from "vitest"

import type {
  CanvasStateSnapshot,
  CanvasTransform,
  ColorCanvasFileDocumentData,
  ColorCanvasFileViewState,
} from "../types/canvas"
import {
  CANVAS_FILE_KIND,
  buildCanvasFileDocument,
  createCanvasFile,
  deleteCanvasFile,
  duplicateCanvasFile,
  ensureProjectCanvasDir,
  listCanvasFiles,
  moveCanvasFile,
  readCanvasFile,
  saveCanvasFile,
  updateCanvasFileMetadata,
} from "../utils/canvasFileStore"
import { packCanvasDocumentAssets } from "../utils/canvasFileAssets"

const tempDirs: string[] = []

async function createTempProjectsRoot() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "gallery-poc-canvas-files-"))
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

describe("canvas file store", () => {
  it("creates, lists, reads, and saves file-backed canvas documents", async () => {
    const projectsRoot = await createTempProjectsRoot()
    await ensureProjectCanvasDir(projectsRoot, "demo")

    const created = await createCanvasFile(projectsRoot, {
      projectId: "demo",
      title: "Checkout Flow",
      document: {
        items: [],
        groups: [],
        nextZIndex: 1,
        selectedIds: [],
      },
    })

    expect(created.path).toBe("checkout-flow.canvas")
    expect(created.document.kind).toBe(CANVAS_FILE_KIND)
    expect(created.document.meta.projectId).toBe("demo")

    const listed = await listCanvasFiles(projectsRoot, "demo")
    expect(listed).toHaveLength(1)
    expect(listed[0]?.title).toBe("Checkout Flow")
    expect(listed[0]?.path).toBe("checkout-flow.canvas")

    const opened = await readCanvasFile<CanvasStateSnapshot>(
      projectsRoot,
      "demo",
      created.path
    )
    expect(opened.document.meta.title).toBe("Checkout Flow")
    expect(opened.document.document.items).toEqual([])

    const saved = await saveCanvasFile(projectsRoot, {
      projectId: "demo",
      path: created.path,
      document: buildCanvasFileDocument({
        projectId: "demo",
        title: "Checkout Flow",
        id: created.document.meta.id,
        createdAt: created.document.meta.createdAt,
        tags: ["flow"],
        document: {
          items: [
            {
              id: "item-1",
              type: "artboard",
              name: "Board",
              position: { x: 10, y: 20 },
              size: { width: 320, height: 200 },
              rotation: 0,
              zIndex: 1,
              layout: {
                display: "flex",
                direction: "column",
                align: "stretch",
                justify: "start",
                gap: 16,
                padding: 24,
              },
            },
          ],
          groups: [],
          nextZIndex: 2,
          selectedIds: [],
        },
      }),
    })

    expect(saved.document.document.items).toHaveLength(1)
    expect(saved.document.meta.tags).toEqual(["flow"])

    const reloaded = await readCanvasFile<CanvasStateSnapshot>(
      projectsRoot,
      "demo",
      created.path
    )
    expect(reloaded.document.document.items[0]?.id).toBe("item-1")
    expect(reloaded.document.meta.tags).toEqual(["flow"])
  })

  it("creates unique names for duplicate titles and supports nested folders", async () => {
    const projectsRoot = await createTempProjectsRoot()

    const first = await createCanvasFile(projectsRoot, {
      projectId: "demo",
      title: "Brand System",
      folder: "tokens",
    })
    const second = await createCanvasFile(projectsRoot, {
      projectId: "demo",
      title: "Brand System",
      folder: "tokens",
    })

    expect(first.path).toBe("tokens/brand-system.canvas")
    expect(second.path).toBe("tokens/brand-system-2.canvas")

    const listed = await listCanvasFiles(projectsRoot, "demo")
    expect(listed.map((entry) => entry.path)).toEqual([
      "tokens/brand-system-2.canvas",
      "tokens/brand-system.canvas",
    ])
  })

  it("stores color-audit and system-canvas files with metadata and counts", async () => {
    const projectsRoot = await createTempProjectsRoot()

    const colorAuditDocument: ColorCanvasFileDocumentData = {
      state: {
        nodes: [
          {
            id: "token-1",
            type: "token",
            label: "Brand 500",
            position: { x: 40, y: 60 },
            value: "oklch(62% 0.19 250)",
          },
        ],
        edges: [],
        selectedNodeId: "token-1",
        selectedEdgeId: null,
        edgeUndoStack: [],
      },
      canvasMode: "color-audit",
      colorAuditLayoutMode: "flow",
      templateKitId: "shadcn",
      autoContrastEnabled: true,
    }

    const systemCanvasDocument: ColorCanvasFileDocumentData = {
      state: {
        nodes: [
          {
            id: "system-1",
            type: "semantic",
            label: "Type scale",
            position: { x: 120, y: 80 },
            group: "system-support",
          },
        ],
        edges: [
          {
            id: "edge-1",
            sourceId: "system-1",
            targetId: "system-1",
            type: "map",
          },
        ],
        selectedNodeId: null,
        selectedEdgeId: null,
        edgeUndoStack: [],
      },
      canvasMode: "system-canvas",
      canvasViewMode: "type",
    }

    const createdColorAudit = await createCanvasFile<
      ColorCanvasFileDocumentData,
      ColorCanvasFileViewState
    >(projectsRoot, {
      projectId: "demo",
      title: "Brand Audit",
      folder: "audits",
      surface: "color-audit",
      document: colorAuditDocument,
      view: {
        colorAuditTransform: {
          scale: 0.8,
          offset: { x: 12, y: -24 },
        },
      },
    })

    const createdSystemCanvas = await createCanvasFile<
      ColorCanvasFileDocumentData,
      ColorCanvasFileViewState
    >(projectsRoot, {
      projectId: "demo",
      title: "Type System",
      folder: "systems",
      surface: "system-canvas",
      document: systemCanvasDocument,
      view: {
        systemCanvasTransform: {
          scale: 0.65,
          offset: { x: 100, y: 40 },
        },
      },
    })

    expect(createdColorAudit.path).toBe("audits/brand-audit.canvas")
    expect(createdSystemCanvas.path).toBe("systems/type-system.canvas")

    await updateCanvasFileMetadata(projectsRoot, {
      projectId: "demo",
      path: createdColorAudit.path,
      updates: {
        favorite: true,
        title: "Brand Audit Review",
      },
    })

    const listed = await listCanvasFiles(projectsRoot, "demo")
    expect(listed).toHaveLength(2)
    expect(listed.find((entry) => entry.surface === "color-audit")).toMatchObject({
      title: "Brand Audit Review",
      favorite: true,
      itemCount: 1,
      groupCount: 0,
    })
    expect(listed.find((entry) => entry.surface === "system-canvas")).toMatchObject({
      title: "Type System",
      itemCount: 1,
      groupCount: 1,
    })

    const openedColorAudit = await readCanvasFile<
      ColorCanvasFileDocumentData,
      ColorCanvasFileViewState
    >(projectsRoot, "demo", createdColorAudit.path)
    expect(openedColorAudit.document.document.canvasMode).toBe("color-audit")
    expect(openedColorAudit.document.document.state.nodes[0]?.label).toBe("Brand 500")
    expect(openedColorAudit.document.view?.colorAuditTransform?.scale).toBe(0.8)
    expect(openedColorAudit.document.meta.favorite).toBe(true)

    const openedSystemCanvas = await readCanvasFile<
      ColorCanvasFileDocumentData,
      ColorCanvasFileViewState
    >(projectsRoot, "demo", createdSystemCanvas.path)
    expect(openedSystemCanvas.document.document.canvasMode).toBe("system-canvas")
    expect(openedSystemCanvas.document.document.canvasViewMode).toBe("type")
    expect(openedSystemCanvas.document.view?.systemCanvasTransform?.scale).toBe(0.65)
  })

  it("moves, duplicates, and deletes stored files with document-local assets", async () => {
    const projectsRoot = await createTempProjectsRoot()

    const created = await createCanvasFile<
      CanvasStateSnapshot,
      { transform?: CanvasTransform }
    >(projectsRoot, {
      projectId: "demo",
      title: "Media Board",
      folder: "boards",
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
      },
    })

    const packed = await packCanvasDocumentAssets(projectsRoot, {
      projectId: "demo",
      path: created.path,
      document: created.document,
      assets: [
        {
          itemId: "media-1",
          field: "src",
          fileName: "packed.png",
          dataUrl: "data:image/png;base64,cGFja2VkLWltYWdl",
        },
      ],
    })
    await saveCanvasFile(projectsRoot, {
      projectId: "demo",
      path: created.path,
      document: packed,
    })

    const moved = await moveCanvasFile<CanvasStateSnapshot>(projectsRoot, {
      projectId: "demo",
      path: created.path,
      title: "Media Board Renamed",
    })

    expect(moved.path).toBe("boards/media-board-renamed.canvas")
    const movedItem = moved.document.document.items[0]
    expect(movedItem?.type).toBe("media")
    expect(movedItem?.type === "media" ? movedItem.src : "").toContain(
      "path=boards%2Fmedia-board-renamed.canvas"
    )
    await expect(readCanvasFile(projectsRoot, "demo", created.path)).rejects.toThrow()

    const duplicated = await duplicateCanvasFile<CanvasStateSnapshot>(projectsRoot, {
      projectId: "demo",
      path: moved.path,
      title: "Media Board Duplicate",
      folder: "archive",
    })

    expect(duplicated.path).toBe("archive/media-board-duplicate.canvas")
    expect(duplicated.document.meta.id).not.toBe(moved.document.meta.id)
    const duplicatedItem = duplicated.document.document.items[0]
    expect(duplicatedItem?.type === "media" ? duplicatedItem.src : "").toContain(
      "path=archive%2Fmedia-board-duplicate.canvas"
    )

    const listed = await listCanvasFiles(projectsRoot, "demo")
    expect(listed.map((entry) => entry.path).sort()).toEqual([
      "archive/media-board-duplicate.canvas",
      "boards/media-board-renamed.canvas",
    ])

    await expect(
      duplicateCanvasFile(projectsRoot, {
        projectId: "demo",
        path: moved.path,
        nextPath: duplicated.path,
      })
    ).rejects.toThrow(/already exists/i)

    await expect(
      moveCanvasFile(projectsRoot, {
        projectId: "demo",
        path: moved.path,
        nextPath: duplicated.path,
      })
    ).rejects.toThrow(/already exists/i)

    await deleteCanvasFile(projectsRoot, {
      projectId: "demo",
      path: duplicated.path,
    })

    const afterDelete = await listCanvasFiles(projectsRoot, "demo")
    expect(afterDelete.map((entry) => entry.path)).toEqual(["boards/media-board-renamed.canvas"])
    await expect(readCanvasFile(projectsRoot, "demo", duplicated.path)).rejects.toThrow()
  })
})
