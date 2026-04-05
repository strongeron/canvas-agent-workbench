import os from "node:os"
import path from "node:path"
import { promises as fs } from "node:fs"

import { afterEach, describe, expect, it } from "vitest"

import {
  CANVAS_FILE_KIND,
  buildCanvasFileDocument,
  createCanvasFile,
  ensureProjectCanvasDir,
  listCanvasFiles,
  readCanvasFile,
  saveCanvasFile,
} from "../utils/canvasFileStore"

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

    const opened = await readCanvasFile(projectsRoot, "demo", created.path)
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

    const reloaded = await readCanvasFile(projectsRoot, "demo", created.path)
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
})
