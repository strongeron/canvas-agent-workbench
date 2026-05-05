import os from "node:os"
import path from "node:path"
import { promises as fs } from "node:fs"

import { afterEach, describe, expect, it } from "vitest"

import { applyCanvasAstLoadRequest } from "../vite/api/canvasAstLoad"

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

describe("applyCanvasAstLoadRequest", () => {
  it("returns sourceReact and mtime for a workspace TSX file", async () => {
    const root = await createTempDir("canvas-ast-load-")
    const filePath = "components/Button.tsx"
    const absolute = path.join(root, filePath)
    await fs.mkdir(path.dirname(absolute), { recursive: true })
    const source = `export default function Button() { return <button>OK</button> }\n`
    await fs.writeFile(absolute, source, "utf8")

    const result = await applyCanvasAstLoadRequest({ filePath }, { workspaceRoot: root })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.sourceReact).toBe(source)
    expect(result.filePath).toBe(filePath)
    expect(typeof result.mtimeMs).toBe("number")
  })

  it("rejects paths that escape the workspace", async () => {
    const root = await createTempDir("canvas-ast-load-")
    const result = await applyCanvasAstLoadRequest(
      { filePath: "../escape.tsx" },
      { workspaceRoot: root }
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(403)
    expect(result.code).toBe("bad-path")
  })

  it("rejects non-TSX/JSX files", async () => {
    const root = await createTempDir("canvas-ast-load-")
    const result = await applyCanvasAstLoadRequest(
      { filePath: "src/index.ts" },
      { workspaceRoot: root }
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(403)
  })

  it("returns 404 for missing files", async () => {
    const root = await createTempDir("canvas-ast-load-")
    const result = await applyCanvasAstLoadRequest(
      { filePath: "components/Missing.tsx" },
      { workspaceRoot: root }
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(404)
    expect(result.code).toBe("not-found")
  })

  it("rejects empty filePath", async () => {
    const root = await createTempDir("canvas-ast-load-")
    const result = await applyCanvasAstLoadRequest({ filePath: "" }, { workspaceRoot: root })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(400)
  })
})
