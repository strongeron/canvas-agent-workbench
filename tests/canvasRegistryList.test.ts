import os from "node:os"
import path from "node:path"
import { promises as fs } from "node:fs"

import { afterEach, describe, expect, it } from "vitest"

import { applyCanvasRegistryListRequest } from "../server/canvasRegistryList"

const tempDirs: string[] = []

async function createTempDir(prefix: string) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), prefix))
  tempDirs.push(root)
  return root
}

async function writeRegistry(root: string, projectId: string, contents: unknown) {
  const dir = path.join(root, "projects", projectId)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(path.join(dir, "registry.json"), JSON.stringify(contents), "utf8")
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0, tempDirs.length).map((dir) =>
      fs.rm(dir, { recursive: true, force: true })
    )
  )
})

describe("applyCanvasRegistryListRequest", () => {
  it("returns parsed primitives for the requested project", async () => {
    const root = await createTempDir("canvas-registry-list-")
    await writeRegistry(root, "design-system-foundation", {
      ui: [
        {
          id: "primitive/button",
          displayName: "Button",
          filePath: "components/ui/Button.tsx",
          importName: "Button",
          snippet: "<Button />",
        },
      ],
    })

    const result = await applyCanvasRegistryListRequest(
      { projectId: "design-system-foundation" },
      { workspaceRoot: root }
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.projectId).toBe("design-system-foundation")
    expect(result.primitives).toHaveLength(1)
    expect(result.primitives[0].id).toBe("primitive/button")
  })

  it("defaults projectId to design-system-foundation when omitted", async () => {
    const root = await createTempDir("canvas-registry-list-")
    await writeRegistry(root, "design-system-foundation", { ui: ["primitive/box"] })

    const result = await applyCanvasRegistryListRequest({}, { workspaceRoot: root })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.primitives.map((p) => p.id)).toEqual(["primitive/box"])
  })

  it("returns 404 when project registry is missing", async () => {
    const root = await createTempDir("canvas-registry-list-")
    const result = await applyCanvasRegistryListRequest(
      { projectId: "missing-project" },
      { workspaceRoot: root }
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(404)
  })

  it("rejects malformed projectId", async () => {
    const root = await createTempDir("canvas-registry-list-")
    const result = await applyCanvasRegistryListRequest(
      { projectId: "../escape" },
      { workspaceRoot: root }
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(400)
  })
})
