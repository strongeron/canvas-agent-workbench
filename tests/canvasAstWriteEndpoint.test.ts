import os from "node:os"
import path from "node:path"
import { promises as fs } from "node:fs"

import { afterEach, describe, expect, it } from "vitest"

import { hashSourceId } from "../utils/canvasAstPath"
import { injectCanvasHtmlElementIds } from "../utils/canvasHtmlEditor"
import { injectCanvasElementIds } from "../vite/plugins/canvas-element-id"
import { applyCanvasAstWriteRequest } from "../vite/api/canvasAstWrite"

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

const RELATIVE_PATH = "components/Button.tsx"
const HASH = hashSourceId(RELATIVE_PATH)

const SOURCE = `export default function Button() {\n  return <button className="p-4">Hi</button>\n}\n`

function findButtonId(source: string): string {
  const result = injectCanvasElementIds(source, { sourceId: RELATIVE_PATH })
  const match = result.ids.find((id) => id.tag === "button")
  if (!match) throw new Error("button id not found")
  return match.canvasId
}

describe("applyCanvasAstWriteRequest (file-backed)", () => {
  it("writes mutations to disk and returns the new mtime", async () => {
    const root = await createTempDir("canvas-ast-write-endpoint-")
    const absolute = path.join(root, RELATIVE_PATH)
    await fs.mkdir(path.dirname(absolute), { recursive: true })
    await fs.writeFile(absolute, SOURCE, "utf8")
    const initialStat = await fs.stat(absolute)

    const canvasId = findButtonId(SOURCE)
    expect(canvasId.startsWith(`${HASH}:`)).toBe(true)

    const result = await applyCanvasAstWriteRequest(
      {
        filePath: RELATIVE_PATH,
        canvasId,
        sourceId: RELATIVE_PATH,
        mtimeMs: initialStat.mtimeMs,
        mutations: [{ type: "setTextChild", value: "Save" }],
      },
      { workspaceRoot: root }
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.appliedMutations).toBe(1)
    expect(typeof result.mtimeMs).toBe("number")
    const onDisk = await fs.readFile(absolute, "utf8")
    expect(onDisk).toContain(">Save<")
    expect(onDisk).not.toContain(">Hi<")
  })

  it("rejects writes when the file changed externally (mtime conflict)", async () => {
    const root = await createTempDir("canvas-ast-write-endpoint-")
    const absolute = path.join(root, RELATIVE_PATH)
    await fs.mkdir(path.dirname(absolute), { recursive: true })
    await fs.writeFile(absolute, SOURCE, "utf8")

    const canvasId = findButtonId(SOURCE)
    const staleMtime = 1

    const result = await applyCanvasAstWriteRequest(
      {
        filePath: RELATIVE_PATH,
        canvasId,
        sourceId: RELATIVE_PATH,
        mtimeMs: staleMtime,
        mutations: [{ type: "setTextChild", value: "Save" }],
      },
      { workspaceRoot: root }
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(409)
    expect(result.code).toBe("mtime-conflict")
    const onDisk = await fs.readFile(absolute, "utf8")
    expect(onDisk).toBe(SOURCE)
  })

  it("rejects paths outside the workspace", async () => {
    const root = await createTempDir("canvas-ast-write-endpoint-")
    const result = await applyCanvasAstWriteRequest(
      {
        filePath: "../escape.tsx",
        canvasId: `${HASH}:0.0`,
        sourceId: RELATIVE_PATH,
        mutations: [{ type: "setClassName", value: "x" }],
      },
      { workspaceRoot: root }
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(403)
  })

  it("dispatches file-backed HTML mutations by extension", async () => {
    const root = await createTempDir("canvas-html-write-endpoint-")
    const relativePath = "components/Card.html"
    const absolute = path.join(root, relativePath)
    const source = `<article class="card">Hello</article>`
    await fs.mkdir(path.dirname(absolute), { recursive: true })
    await fs.writeFile(absolute, source, "utf8")
    const initialStat = await fs.stat(absolute)
    const canvasId = injectCanvasHtmlElementIds(source, {
      sourceId: relativePath,
      injectBridge: false,
    }).ids[0]?.canvasId

    const result = await applyCanvasAstWriteRequest(
      {
        filePath: relativePath,
        canvasId,
        sourceId: relativePath,
        mtimeMs: initialStat.mtimeMs,
        mutations: [
          { type: "setClassName", value: "card featured" },
          { type: "setTextContent", value: "Featured" },
        ],
      },
      { workspaceRoot: root }
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.kind).toBe("html")
    expect(result.sourceHtml).toBe(`<article class="card featured">Featured</article>`)
    const onDisk = await fs.readFile(absolute, "utf8")
    expect(onDisk).toBe(result.sourceHtml)
    expect(onDisk).not.toContain("data-canvas-id")
  })
})
