import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"

import { afterEach, describe, expect, it, vi } from "vitest"

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

  it("(#8) artboard with two children sharing a slug → typed duplicate-slug, Root B untouched", async () => {
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
            { slug: "dup", sourcePath: a.relPath, mtimeMs: a.mtimeMs },
            { slug: "dup", sourcePath: b.relPath, mtimeMs: b.mtimeMs },
          ],
        },
      },
      { workspaceRoot: ws.workspaceRoot }
    )
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.code).toBe("duplicate-slug")
      expect(res.status).toBe(400)
    }
    expect(await fs.readdir(ws.target)).toEqual([])
  })

  it("(#8) artboard page slug equal to a child slug → typed duplicate-slug, Root B untouched", async () => {
    const ws = await makeWorkspace()
    const a = await writeShellSource(ws, "card-a", "card", "CardA")
    const res = await applyCanvasProjectSyncRequest(
      {
        target: ws.target,
        componentsDir: "",
        format: "html",
        selection: {
          type: "artboard",
          slug: "shared",
          children: [{ slug: "shared", sourcePath: a.relPath, mtimeMs: a.mtimeMs }],
        },
      },
      { workspaceRoot: ws.workspaceRoot }
    )
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.code).toBe("duplicate-slug")
      expect(res.status).toBe(400)
    }
    expect(await fs.readdir(ws.target)).toEqual([])
  })

  it("(#10) a delete race between stat and read → typed stale-source 409, nothing written", async () => {
    const ws = await makeWorkspace()
    const src = await writeShellSource(ws, "card")
    // Replace fs.readFile so the stat succeeds but the read fails ENOENT,
    // simulating a delete race between the two calls (the file at src.absPath).
    const realReadFile = fs.readFile
    const spy = vi
      .spyOn(fs, "readFile")
      .mockImplementation((async (p: Parameters<typeof realReadFile>[0], ...rest: unknown[]) => {
        if (typeof p === "string" && p === src.absPath) {
          const err = new Error("ENOENT") as NodeJS.ErrnoException
          err.code = "ENOENT"
          throw err
        }
        // @ts-expect-error pass-through
        return realReadFile(p, ...rest)
      }) as typeof realReadFile)
    try {
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
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.code).toBe("stale-source")
        expect(res.status).toBe(409)
      }
      expect(await fs.readdir(ws.target)).toEqual([])
    } finally {
      spy.mockRestore()
    }
  })

  it("(#7) realpath drift detected at the STAGING dir (before mkdir/writeFile) → 403, nothing written", async () => {
    const ws = await makeWorkspace()
    const src = await writeShellSource(ws, "card")
    const mod = await import("../vite/api/resolveSandboxPath")
    // The staging guard calls assertRealpathStable on the staging DIRECTORY
    // (path.dirname(resolved)) before mkdir/writeFile. Drift it on the very
    // first call so staging never runs — same bail shape as the pre-rename
    // check, and nothing lands in Root B.
    let firstCall = true
    const spy = vi
      .spyOn(mod, "assertRealpathStable")
      .mockImplementation(async () => {
        if (firstCall) {
          firstCall = false
          return {
            ok: false,
            code: "escapes-sandbox",
            error: "staging-dir symlink swapped (test-injected)",
          }
        }
        return null
      })
    try {
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
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.code).toBe("escapes-sandbox")
        expect(res.status).toBe(403)
      }
      // No file (and no tmp residue) — rejected before staging wrote anything.
      expect(await fs.readdir(ws.target)).toEqual([])
    } finally {
      spy.mockRestore()
    }
  })

  it("(coverage) mid-batch realpath drift with NOTHING renamed yet → 403, true all-or-nothing (nothing written)", async () => {
    const ws = await makeWorkspace()
    const src = await writeShellSource(ws, "card")
    // Make assertRealpathStable fail on the VERY FIRST destination (k=0) so
    // writtenPaths is still empty → discard staged batch, 403, nothing renamed.
    const mod = await import("../vite/api/resolveSandboxPath")
    const spy = vi
      .spyOn(mod, "assertRealpathStable")
      .mockResolvedValue({
        ok: false,
        code: "escapes-sandbox",
        error: "drift (test-injected, pre-batch)",
      })
    try {
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
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.status).toBe(403)
        expect(res.code).toBe("escapes-sandbox")
      }
      // Nothing renamed into place — true all-or-nothing.
      const entries = await fs.readdir(ws.target)
      expect(entries.filter((e) => !e.endsWith(".tmp"))).toEqual([])
    } finally {
      spy.mockRestore()
    }
  })

  it("(coverage) mid-batch realpath drift AFTER the first rename → partialFailure, written/notWritten split", async () => {
    const ws = await makeWorkspace()
    const src = await writeShellSource(ws, "card")
    const mod = await import("../vite/api/resolveSandboxPath")
    // assertRealpathStable is called per file at BOTH the staging-dir check
    // (arg = directory) and the pre-rename check (arg = the file path). Let
    // every staging-dir check + the card.html rename pass; drift the next
    // rename so card.html is renamed (non-restoring) but card.css is not.
    const spy = vi
      .spyOn(mod, "assertRealpathStable")
      .mockImplementation(async (resolved: string) => {
        if (resolved.endsWith("card.html")) return null // first rename OK
        if (resolved.endsWith(".css") || resolved.endsWith(".json")) {
          return {
            ok: false,
            code: "escapes-sandbox",
            error: "drift (test-injected, mid-batch)",
          }
        }
        return null // staging-dir checks pass
      })
    try {
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
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.code).toBe("partial-write")
        expect(res.partialFailure).toBe(true)
        expect(res.writtenPaths).toContain("card.html")
        expect((res.notWritten ?? []).length).toBeGreaterThan(0)
      }
      // card.html WAS renamed (non-restoring overwrite-by-slug).
      await fs.access(path.join(ws.target, "card.html"))
    } finally {
      spy.mockRestore()
    }
  })

  it("(coverage) htmlToTsx failure (html+tsx) → ok:false code:tsx-failed, Root B empty (no HTML-only write)", async () => {
    const ws = await makeWorkspace()
    // A fragment that forces HtmlToTsxError: a namespaced tag name (`x:y`)
    // survives parse5 but fails the converter's strict tag-name regex
    // `^[a-zA-Z][a-zA-Z0-9-]*$` (the `:` is rejected) → HtmlToTsxError.
    const absPath = path.join(ws.componentsDir, "broken.html")
    const badSource = `<!doctype html><html><head></head><body><section><x:weird>nope</x:weird></section></body></html>`
    await fs.writeFile(absPath, badSource, "utf8")
    const stat = await fs.stat(absPath)
    const res = await applyCanvasProjectSyncRequest(
      {
        target: ws.target,
        componentsDir: "",
        format: "html+tsx",
        selection: {
          type: "component",
          slug: "broken",
          sourcePath: path.relative(ws.workspaceRoot, absPath),
          mtimeMs: stat.mtimeMs,
        },
      },
      { workspaceRoot: ws.workspaceRoot }
    )
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.code).toBe("tsx-failed")
    // No HTML-only write — the whole selection aborted before staging.
    expect(await fs.readdir(ws.target)).toEqual([])
  })

  it("(coverage) non-restore proven by sentinel: a mid-batch failure leaves the NEW content (old sentinel destroyed)", async () => {
    const ws = await makeWorkspace()
    const src = await writeShellSource(ws, "card")
    // Pre-seed an OLD card.html carrying a unique sentinel.
    const sentinel = "SENTINEL-OLD-CONTENT-DO-NOT-RESTORE"
    await fs.writeFile(
      path.join(ws.target, "card.html"),
      `<article>${sentinel}</article>\n`,
      "utf8"
    )
    const mod = await import("../vite/api/resolveSandboxPath")
    const spy = vi
      .spyOn(mod, "assertRealpathStable")
      .mockImplementation(async (resolved: string) => {
        if (resolved.endsWith("card.html")) return null // sentinel destroyed
        if (resolved.endsWith(".css") || resolved.endsWith(".json")) {
          return {
            ok: false,
            code: "escapes-sandbox",
            error: "drift after sentinel file renamed",
          }
        }
        return null // staging-dir checks pass
      })
    try {
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
      expect(res.ok).toBe(false)
      if (!res.ok) expect(res.partialFailure).toBe(true)
      // The on-disk file is the NEW content — the old sentinel is GONE,
      // proving overwrite-by-slug is genuinely non-restoring (no backup).
      const onDisk = await fs.readFile(
        path.join(ws.target, "card.html"),
        "utf8"
      )
      expect(onDisk).not.toContain(sentinel)
      expect(onDisk).toContain('data-component="card"')
    } finally {
      spy.mockRestore()
    }
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
