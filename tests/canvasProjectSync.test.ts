import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import { applyCanvasProjectSyncRequest } from "../vite/api/canvasProjectSync"
import { buildNativeComponentShell } from "../utils/canvasNativeComponentShell"
import {
  composeNormalizedPage,
  normalizeDocument,
} from "../utils/canvasDocumentNormalize"

const tmpDirs: string[] = []

interface Workspace {
  /** Repo workspace root (Root A lives under projects/<id>/). */
  workspaceRoot: string
  projectId: string
  projectRoot: string
  componentsDir: string
  /** Picked external Root B root. */
  target: string
}

async function makeWorkspace(): Promise<Workspace> {
  const workspaceRoot = await fs.realpath(
    await fs.mkdtemp(path.join(os.tmpdir(), "sync-ws-"))
  )
  tmpDirs.push(workspaceRoot)
  const projectId = "demo"
  const projectRoot = path.join(workspaceRoot, "projects", projectId)
  const componentsDir = path.join(projectRoot, "components")
  await fs.mkdir(componentsDir, { recursive: true })

  const target = await fs.realpath(
    await fs.mkdtemp(path.join(os.tmpdir(), "sync-rootb-"))
  )
  tmpDirs.push(target)
  return { workspaceRoot, projectId, projectRoot, componentsDir, target }
}

async function writeShellSource(
  ws: Workspace,
  slug: string,
  template: Parameters<typeof buildNativeComponentShell>[0] = "card",
  title = "Card"
): Promise<{ relPath: string; absPath: string; mtimeMs: number; sourceHtml: string }> {
  const shell = buildNativeComponentShell(template as never, title)
  const absPath = path.join(ws.componentsDir, `${slug}.html`)
  await fs.writeFile(absPath, shell.sourceHtml, "utf8")
  const stat = await fs.stat(absPath)
  return {
    relPath: path.relative(ws.workspaceRoot, absPath),
    absPath,
    mtimeMs: stat.mtimeMs,
    sourceHtml: shell.sourceHtml,
  }
}

afterEach(async () => {
  await Promise.all(
    tmpDirs.splice(0).map((d) => fs.rm(d, { recursive: true, force: true }).catch(() => undefined))
  )
})

// ---------------------------------------------------------------------------
// Characterization: normalize-driven clean-export against real U9/U1 output
// ---------------------------------------------------------------------------

describe("sync — characterization against real U9 normalize output", () => {
  it("Root B fragment+CSS equals normalizeDocument(Root A source)", async () => {
    const ws = await makeWorkspace()
    const src = await writeShellSource(ws, "card")

    const res = await applyCanvasProjectSyncRequest(
      {
        target: ws.target,
        componentsDir: "",
        format: "html",
        selection: {
          type: "component",
          slug: "card",
          sourcePath: src.relPath,
          mtimeMs: src.mtimeMs,
        },
      },
      { workspaceRoot: ws.workspaceRoot }
    )
    expect(res.ok).toBe(true)

    const expected = normalizeDocument({ sourceHtml: src.sourceHtml, slug: "card" })
    const writtenHtml = await fs.readFile(path.join(ws.target, "card.html"), "utf8")
    const writtenCss = await fs.readFile(path.join(ws.target, "card.css"), "utf8")
    expect(writtenHtml.trim()).toBe(expected.fragmentHtml.trim())
    expect(writtenCss.trim()).toBe(expected.css.trim())

    // Root A is unchanged.
    const rootA = await fs.readFile(src.absPath, "utf8")
    expect(rootA).toBe(src.sourceHtml)
  })

  it("htmlToTsx produces a deterministic importable module with css import", async () => {
    const ws = await makeWorkspace()
    const src = await writeShellSource(ws, "card")

    const res = await applyCanvasProjectSyncRequest(
      {
        target: ws.target,
        componentsDir: "",
        format: "html+tsx",
        selection: { type: "component", slug: "card", sourcePath: src.relPath, mtimeMs: src.mtimeMs },
      },
      { workspaceRoot: ws.workspaceRoot }
    )
    expect(res.ok).toBe(true)

    const tsx = await fs.readFile(path.join(ws.target, "card.tsx"), "utf8")
    expect(tsx).toContain('import "./card.css"')
    expect(tsx).toContain("export default function Card()")
    expect(tsx).toContain("className=")
    expect(tsx).not.toContain(" class=")
    // SVG hyphenated attrs are camelCased deterministically.
    expect(tsx).toContain("strokeWidth=")
    expect(tsx).toContain("viewBox=")
    // Void element self-closed.
    expect(tsx).toMatch(/<rect[^>]*\/>/)
  })
})

// ---------------------------------------------------------------------------
// Endpoint scenarios
// ---------------------------------------------------------------------------

describe("applyCanvasProjectSyncRequest — happy paths", () => {
  it("component sync writes fragment .html + scoped .css + .tsx + manifest", async () => {
    const ws = await makeWorkspace()
    const src = await writeShellSource(ws, "card")

    const res = await applyCanvasProjectSyncRequest(
      {
        target: ws.target,
        componentsDir: "",
        format: "html+tsx",
        selection: { type: "component", slug: "card", sourcePath: src.relPath, mtimeMs: src.mtimeMs },
      },
      { workspaceRoot: ws.workspaceRoot }
    )
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.writtenPaths).toEqual(
      expect.arrayContaining(["card.html", "card.css", "card.tsx", "manifest.json"])
    )
    expect(res.notWritten).toEqual([])
    expect(res.manifestPath).toBe(path.join(ws.target, "manifest.json"))
    expect(res.perFile.every((e) => e.status === "written")).toBe(true)

    const manifest = JSON.parse(await fs.readFile(path.join(ws.target, "manifest.json"), "utf8"))
    expect(manifest.version).toBe(1)
    expect(manifest.components).toHaveLength(1)
    expect(manifest.components[0].slug).toBe("card")
    expect(manifest.components[0].files).toEqual(
      expect.arrayContaining(["card.html", "card.css", "card.tsx"])
    )
    expect(Array.isArray(manifest.components[0].slots)).toBe(true)
    expect(typeof manifest.components[0].syncedAt).toBe("string")
  })

  it("artboard sync writes the page + every child with per-child scoped CSS + one page manifest entry", async () => {
    const ws = await makeWorkspace()
    const a = await writeShellSource(ws, "card-a", "card", "CardA")
    const b = await writeShellSource(ws, "card-b", "card", "CardB")

    const res = await applyCanvasProjectSyncRequest(
      {
        target: ws.target,
        componentsDir: "",
        format: "html",
        selection: {
          type: "artboard",
          slug: "landing",
          children: [
            { slug: "card-a", sourcePath: a.relPath, mtimeMs: a.mtimeMs },
            { slug: "card-b", sourcePath: b.relPath, mtimeMs: b.mtimeMs },
          ],
        },
      },
      { workspaceRoot: ws.workspaceRoot }
    )
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.writtenPaths).toEqual(
      expect.arrayContaining([
        "landing.html",
        "card-a.html",
        "card-a.css",
        "card-b.html",
        "card-b.css",
        "manifest.json",
      ])
    )

    const pageHtml = await fs.readFile(path.join(ws.target, "landing.html"), "utf8")
    const expected = composeNormalizedPage([
      normalizeDocument({ sourceHtml: a.sourceHtml, slug: "card-a" }),
      normalizeDocument({ sourceHtml: b.sourceHtml, slug: "card-b" }),
    ])
    expect(pageHtml.trim()).toBe(expected.fragmentHtml.trim())
    // Per-child CSS scoped to distinct wrappers (no collision).
    const pageCss = await fs.readFile(path.join(ws.target, "landing.css"), "utf8")
    expect(pageCss).toContain('[data-component="card-a"]')
    expect(pageCss).toContain('[data-component="card-b"]')

    const manifest = JSON.parse(await fs.readFile(path.join(ws.target, "manifest.json"), "utf8"))
    expect(manifest.pages).toHaveLength(1)
    expect(manifest.pages[0].slug).toBe("landing")
    expect(manifest.pages[0].children).toEqual(["card-a", "card-b"])
    expect(manifest.components.map((c: { slug: string }) => c.slug).sort()).toEqual([
      "card-a",
      "card-b",
    ])
  })

  it("writes into a componentsDir subfolder of the picked target", async () => {
    const ws = await makeWorkspace()
    const src = await writeShellSource(ws, "card")
    const res = await applyCanvasProjectSyncRequest(
      {
        target: ws.target,
        componentsDir: "src/components",
        format: "html",
        selection: { type: "component", slug: "card", sourcePath: src.relPath, mtimeMs: src.mtimeMs },
      },
      { workspaceRoot: ws.workspaceRoot }
    )
    expect(res.ok).toBe(true)
    const html = await fs.readFile(
      path.join(ws.target, "src", "components", "card.html"),
      "utf8"
    )
    expect(html).toContain('data-component="card"')
  })
})

describe("applyCanvasProjectSyncRequest — edge cases", () => {
  it("format downgrade prunes the orphan .tsx and updates the manifest", async () => {
    const ws = await makeWorkspace()
    const src = await writeShellSource(ws, "card")

    // First sync html+tsx → card.tsx exists.
    await applyCanvasProjectSyncRequest(
      {
        target: ws.target,
        componentsDir: "",
        format: "html+tsx",
        selection: { type: "component", slug: "card", sourcePath: src.relPath, mtimeMs: src.mtimeMs },
      },
      { workspaceRoot: ws.workspaceRoot }
    )
    await fs.access(path.join(ws.target, "card.tsx"))

    // Re-sync html only → orphan card.tsx pruned.
    const res = await applyCanvasProjectSyncRequest(
      {
        target: ws.target,
        componentsDir: "",
        format: "html",
        selection: { type: "component", slug: "card", sourcePath: src.relPath, mtimeMs: src.mtimeMs },
      },
      { workspaceRoot: ws.workspaceRoot }
    )
    expect(res.ok).toBe(true)
    await expect(fs.access(path.join(ws.target, "card.tsx"))).rejects.toBeTruthy()

    const manifest = JSON.parse(await fs.readFile(path.join(ws.target, "manifest.json"), "utf8"))
    expect(manifest.components[0].files).not.toContain("card.tsx")
    if (res.ok) {
      expect(res.perFile.some((e) => e.status === "pruned" && e.path === "card.tsx")).toBe(true)
    }
  })

  it("manifest goes through the .json-allowlisted guard as a staged batch member (not a post-batch write)", async () => {
    const ws = await makeWorkspace()
    const src = await writeShellSource(ws, "card")
    const res = await applyCanvasProjectSyncRequest(
      {
        target: ws.target,
        componentsDir: "",
        format: "html",
        selection: { type: "component", slug: "card", sourcePath: src.relPath, mtimeMs: src.mtimeMs },
      },
      { workspaceRoot: ws.workspaceRoot }
    )
    expect(res.ok).toBe(true)
    if (!res.ok) return
    // manifest.json appears in perFile / writtenPaths exactly like the other
    // staged files — proving it went through the same stage→validate→rename.
    expect(res.writtenPaths).toContain("manifest.json")
    const mf = res.perFile.find((e) => e.path === "manifest.json")
    expect(mf?.status).toBe("written")
  })

  it("recreates a missing/parse-error manifest instead of crashing", async () => {
    const ws = await makeWorkspace()
    const src = await writeShellSource(ws, "card")
    // Pre-seed a corrupt manifest.
    await fs.writeFile(path.join(ws.target, "manifest.json"), "{ not json ", "utf8")

    const res = await applyCanvasProjectSyncRequest(
      {
        target: ws.target,
        componentsDir: "",
        format: "html",
        selection: { type: "component", slug: "card", sourcePath: src.relPath, mtimeMs: src.mtimeMs },
      },
      { workspaceRoot: ws.workspaceRoot }
    )
    expect(res.ok).toBe(true)
    const manifest = JSON.parse(await fs.readFile(path.join(ws.target, "manifest.json"), "utf8"))
    expect(manifest.version).toBe(1)
    expect(manifest.components[0].slug).toBe("card")
  })
})

describe("applyCanvasProjectSyncRequest — error paths", () => {
  it("normalization failure → nothing written for that selection", async () => {
    const ws = await makeWorkspace()
    const absPath = path.join(ws.componentsDir, "bad.html")
    // A non-HTML doc with no <body> element content → U9 throws.
    await fs.writeFile(absPath, "not html at all", "utf8")
    const stat = await fs.stat(absPath)

    const res = await applyCanvasProjectSyncRequest(
      {
        target: ws.target,
        componentsDir: "",
        format: "html",
        selection: {
          type: "component",
          slug: "bad",
          sourcePath: path.relative(ws.workspaceRoot, absPath),
          mtimeMs: stat.mtimeMs,
        },
      },
      { workspaceRoot: ws.workspaceRoot }
    )
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.code).toMatch(/^normalize-/)
    // No partial files on disk.
    const entries = await fs.readdir(ws.target)
    expect(entries).toEqual([])
  })

  it("traversal/symlink-escape selection sourcePath → 403, no write", async () => {
    const ws = await makeWorkspace()
    const res = await applyCanvasProjectSyncRequest(
      {
        target: ws.target,
        componentsDir: "",
        format: "html",
        selection: {
          type: "component",
          slug: "card",
          sourcePath: "../../../../etc/hosts",
          mtimeMs: null,
        },
      },
      { workspaceRoot: ws.workspaceRoot }
    )
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.status).toBe(403)
    const entries = await fs.readdir(ws.target)
    expect(entries).toEqual([])
  })

  it("componentsDir traversal is rejected", async () => {
    const ws = await makeWorkspace()
    const src = await writeShellSource(ws, "card")
    const res = await applyCanvasProjectSyncRequest(
      {
        target: ws.target,
        componentsDir: "../../escape",
        format: "html",
        selection: { type: "component", slug: "card", sourcePath: src.relPath, mtimeMs: src.mtimeMs },
      },
      { workspaceRoot: ws.workspaceRoot }
    )
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.status).toBe(403)
  })

  it("a source mtime advanced during the read → abort before any Root B write (R12)", async () => {
    const ws = await makeWorkspace()
    const src = await writeShellSource(ws, "card")
    // Client's last-known mtime is stale (source advanced before sync).
    const res = await applyCanvasProjectSyncRequest(
      {
        target: ws.target,
        componentsDir: "",
        format: "html",
        selection: {
          type: "component",
          slug: "card",
          sourcePath: src.relPath,
          mtimeMs: src.mtimeMs - 5000,
        },
      },
      { workspaceRoot: ws.workspaceRoot }
    )
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.code).toBe("stale-source")
      expect(res.status).toBe(409)
    }
    const entries = await fs.readdir(ws.target)
    expect(entries).toEqual([])
  })

  it("rename of file k fails mid-batch → response lists written vs not; documented non-restore", async () => {
    const ws = await makeWorkspace()
    const src = await writeShellSource(ws, "card")

    // Make `card.css` a directory at the destination so the css rename fails
    // AFTER card.html has already been renamed (mid-batch). Outputs are
    // staged in order: card.html, card.css, manifest.json.
    await fs.mkdir(path.join(ws.target, "card.css"))
    await fs.writeFile(path.join(ws.target, "card.css", "block.txt"), "x", "utf8")

    const res = await applyCanvasProjectSyncRequest(
      {
        target: ws.target,
        componentsDir: "",
        format: "html",
        selection: { type: "component", slug: "card", sourcePath: src.relPath, mtimeMs: src.mtimeMs },
      },
      { workspaceRoot: ws.workspaceRoot }
    )
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.code).toBe("partial-write")
      expect(res.partialFailure).toBe(true)
      expect(res.writtenPaths).toContain("card.html")
      expect(res.notWritten).toContain("card.css")
      expect(res.error).toMatch(/not recoverable/i)
    }
    // card.html WAS written (overwrite-by-slug, non-restoring).
    await fs.access(path.join(ws.target, "card.html"))
  })

  it("missing slug is rejected as a bad path segment", async () => {
    const ws = await makeWorkspace()
    const src = await writeShellSource(ws, "card")
    const res = await applyCanvasProjectSyncRequest(
      {
        target: ws.target,
        componentsDir: "",
        format: "html",
        selection: { type: "component", slug: "../evil", sourcePath: src.relPath, mtimeMs: src.mtimeMs },
      },
      { workspaceRoot: ws.workspaceRoot }
    )
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.status).toBe(403)
  })
})
