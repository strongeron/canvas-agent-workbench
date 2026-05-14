import os from "node:os"
import path from "node:path"
import { promises as fs } from "node:fs"

import { afterEach, describe, expect, it } from "vitest"

import { applyCanvasMarkdownWriteRequest } from "../vite/api/canvasMarkdownWrite"

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

const SOURCE = `# Title

Paragraph text.

- one
- two
`

describe("applyCanvasMarkdownWriteRequest", () => {
  it("lists inline markdown blocks without touching the filesystem", async () => {
    const result = await applyCanvasMarkdownWriteRequest(
      {
        action: "list",
        markdownSource: SOURCE,
      },
      { workspaceRoot: process.cwd() }
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.blocks.map((block) => block.type)).toEqual(["heading", "paragraph", "list"])
    expect(result.filePath).toBeNull()
    expect(result.mtimeMs).toBeNull()
  })

  it("updates a file-backed markdown block and writes the new source to disk", async () => {
    const root = await createTempDir("canvas-markdown-write-endpoint-")
    const relativePath = "docs/demo.md"
    const absolute = path.join(root, relativePath)
    await fs.mkdir(path.dirname(absolute), { recursive: true })
    await fs.writeFile(absolute, SOURCE, "utf8")
    const initialStat = await fs.stat(absolute)

    const result = await applyCanvasMarkdownWriteRequest(
      {
        action: "update",
        filePath: relativePath,
        mtimeMs: initialStat.mtimeMs,
        blockIndex: 1,
        newText: "Updated paragraph.",
      },
      { workspaceRoot: root }
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.filePath).toBe(relativePath)
    expect(result.source).toContain("Updated paragraph.")
    expect(result.blocks.map((block) => block.type)).toEqual(["heading", "paragraph", "list"])
    expect(await fs.readFile(absolute, "utf8")).toBe(result.source)
    expect(typeof result.mtimeMs).toBe("number")
  })

  it("reorders file-backed markdown blocks", async () => {
    const root = await createTempDir("canvas-markdown-write-endpoint-")
    const relativePath = "docs/demo.md"
    const absolute = path.join(root, relativePath)
    await fs.mkdir(path.dirname(absolute), { recursive: true })
    await fs.writeFile(absolute, SOURCE, "utf8")
    const initialStat = await fs.stat(absolute)

    const result = await applyCanvasMarkdownWriteRequest(
      {
        action: "reorder",
        filePath: relativePath,
        mtimeMs: initialStat.mtimeMs,
        fromIndex: 0,
        toIndex: 2,
      },
      { workspaceRoot: root }
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.blocks.map((block) => block.type)).toEqual(["paragraph", "list", "heading"])
  })

  it("rewrites a file-backed markdown snapshot for undo/redo replay", async () => {
    const root = await createTempDir("canvas-markdown-write-endpoint-")
    const relativePath = "docs/demo.md"
    const absolute = path.join(root, relativePath)
    await fs.mkdir(path.dirname(absolute), { recursive: true })
    await fs.writeFile(absolute, SOURCE, "utf8")
    const initialStat = await fs.stat(absolute)
    const rewritten = "# Restored\n\nFrom history.\n"

    const result = await applyCanvasMarkdownWriteRequest(
      {
        filePath: relativePath,
        mtimeMs: initialStat.mtimeMs,
        sourceSnapshot: rewritten,
      },
      { workspaceRoot: root }
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.action).toBe("rewrite")
    expect(result.filePath).toBe(relativePath)
    expect(result.prevSourceSnapshot).toBe(SOURCE)
    expect(result.source).toBe(rewritten)
    expect(await fs.readFile(absolute, "utf8")).toBe(rewritten)
    expect(typeof result.mtimeMs).toBe("number")
  })

  it("rejects file-backed writes on stale mtime", async () => {
    const root = await createTempDir("canvas-markdown-write-endpoint-")
    const relativePath = "docs/demo.md"
    const absolute = path.join(root, relativePath)
    await fs.mkdir(path.dirname(absolute), { recursive: true })
    await fs.writeFile(absolute, SOURCE, "utf8")

    const result = await applyCanvasMarkdownWriteRequest(
      {
        action: "remove",
        filePath: relativePath,
        mtimeMs: 1,
        blockIndex: 1,
      },
      { workspaceRoot: root }
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(409)
    expect(result.code).toBe("mtime-conflict")
    expect(await fs.readFile(absolute, "utf8")).toBe(SOURCE)
  })
})
