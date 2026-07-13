// Unit U8 — Cross-cutting integration tests for the web-native Sync pipeline.
//
// VERIFICATION ONLY. The behaviors exercised here (server-side coherence /
// stale-source abort, EACCES/EROFS handling, non-file-backed-child rejection,
// structural Sync-vs-Sync serialization, agent/UI selection-shape parity) are
// already implemented in U5 (`server/canvasProjectSync.ts`), U7
// (`utils/canvasAgentOperations.mjs` `resolveSyncSelectionFromState`), and U9
// (`utils/canvasDocumentNormalize.ts`). This file proves they COMPOSE end to
// end against a real temp-dir filesystem + the real handler — no mocks for any
// layer that interacts (normalize <-> sync <-> guard <-> manifest <-> agent).
//
// Harness mirrors `tests/canvasProjectSync.test.ts`: OS temp dirs for Root A
// (the repo workspace, holding `projects/<id>/components/<slug>.html`) and
// Root B (the picked external publish target). The handler is invoked
// directly (the localhost/Origin guard lives in vite.config.ts, not the
// handler), exactly as the U5 unit test does.

import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import { applyCanvasProjectSyncRequest } from "../server/canvasProjectSync"
import { buildNativeComponentShell } from "../utils/canvasNativeComponentShell"
import {
  composeNormalizedPage,
  normalizeDocument,
} from "../utils/canvasDocumentNormalize"
// The agent path resolves a canvas selection id into the EXACT `selection`
// shape the UI sends — reusing it is what guarantees agent/UI parity.
import { resolveSyncSelectionFromState } from "../utils/canvasAgentOperations.mjs"

const tmpDirs: string[] = []

interface Workspace {
  workspaceRoot: string
  projectId: string
  projectRoot: string
  componentsDir: string
  target: string
}

async function makeWorkspace(): Promise<Workspace> {
  const workspaceRoot = await fs.realpath(
    await fs.mkdtemp(path.join(os.tmpdir(), "sync-int-ws-"))
  )
  tmpDirs.push(workspaceRoot)
  const projectId = "demo"
  const projectRoot = path.join(workspaceRoot, "projects", projectId)
  const componentsDir = path.join(projectRoot, "components")
  await fs.mkdir(componentsDir, { recursive: true })

  const target = await fs.realpath(
    await fs.mkdtemp(path.join(os.tmpdir(), "sync-int-rootb-"))
  )
  tmpDirs.push(target)
  return { workspaceRoot, projectId, projectRoot, componentsDir, target }
}

async function writeShellSource(
  ws: Workspace,
  slug: string,
  template: Parameters<typeof buildNativeComponentShell>[0] = "card",
  title = "Card"
): Promise<{
  relPath: string
  absPath: string
  mtimeMs: number
  sourceHtml: string
}> {
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
    tmpDirs
      .splice(0)
      .map((d) => fs.rm(d, { recursive: true, force: true }).catch(() => undefined))
  )
})

// ---------------------------------------------------------------------------
// Edge: two rapid Sync calls for the same selection.
//
// Sync-vs-Sync is serialized per Root B by `applyCanvasProjectSyncRequest`
// (the manifest.json merge is per-root, so concurrent syncs to the same root
// race the manifest read/merge/write and the staged rename batch). The server
// is the authority for Sync-vs-Sync (plan R10 / Key Technical Decisions); the
// UI button disable is defense-in-depth only. tmp names also carry a per-file
// random token so they cannot collide even within the same millisecond.
//
// This test asserts the post-fix invariant: two concurrent same-selection
// syncs BOTH succeed (the second waits for the first), Root B ends fully
// coherent (manifest.json + fragment + css all present, never a partial
// write), no stray *.tmp residue, and Root A is byte-unchanged.
// ---------------------------------------------------------------------------

describe("Sync-vs-Sync — concurrent same-selection syncs (serialized)", () => {
  it("concurrent syncs serialize: both succeed, Root B coherent, no stray tmp", async () => {
    const ws = await makeWorkspace()
    const src = await writeShellSource(ws, "card")

    const req = () =>
      applyCanvasProjectSyncRequest(
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

    // Fire both without awaiting between them.
    const [a, b] = await Promise.all([req(), req()])

    // Per-root serialization: the second call waits for the first, so BOTH
    // complete successfully (no race, no partial write).
    expect(a.ok).toBe(true)
    expect(b.ok).toBe(true)
    for (const r of [a, b]) {
      expect("partialFailure" in r && r.partialFailure).not.toBe(true)
    }

    // Root B is fully coherent: fragment, scoped css, and manifest all present.
    const entries = await fs.readdir(ws.target)
    expect(entries).toEqual(
      expect.arrayContaining(["card.html", "card.css", "manifest.json"])
    )
    // No staged tmp residue from either call.
    expect(entries.some((e) => e.endsWith(".tmp"))).toBe(false)

    // Root A is byte-unchanged.
    expect(await fs.readFile(src.absPath, "utf8")).toBe(src.sourceHtml)
  })

  it("sequential re-sync of the same selection is fully coherent (baseline — isolates the defect to concurrency)", async () => {
    const ws = await makeWorkspace()
    const src = await writeShellSource(ws, "card")
    const call = () =>
      applyCanvasProjectSyncRequest(
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
    // Awaited (serialized by the caller) → fully coherent. Proves the failure
    // above is purely a missing Sync-vs-Sync guard, not a normalize / manifest
    // / sandbox-guard defect.
    expect((await call()).ok).toBe(true)
    expect((await call()).ok).toBe(true)
    const entries = (await fs.readdir(ws.target)).sort()
    expect(entries).toEqual(["card.css", "card.html", "manifest.json"])
    const manifest = JSON.parse(
      await fs.readFile(path.join(ws.target, "manifest.json"), "utf8")
    )
    expect(manifest.components).toHaveLength(1)
    expect(manifest.components[0].slug).toBe("card")
    const expected = normalizeDocument({ sourceHtml: src.sourceHtml, slug: "card" })
    expect(
      (await fs.readFile(path.join(ws.target, "card.html"), "utf8")).trim()
    ).toBe(expected.fragmentHtml.trim())

    // Root A is byte-unchanged by the sequential re-sync.
    expect(await fs.readFile(src.absPath, "utf8")).toBe(src.sourceHtml)
  })
})

// ---------------------------------------------------------------------------
// Fix #6: the per-Root-B lock is keyed by REALPATH, not the raw path. Two
// concurrent syncs of DIFFERENT component selections to the SAME real Root B
// reached via two different path spellings (a symlink dir vs its realpath)
// must serialize on one lock so the manifest merge does not interleave and
// lose an entry. Post-fix invariant: the final manifest contains BOTH.
// ---------------------------------------------------------------------------

describe("Sync-vs-Sync — symlink-aliased same real Root B serializes on realpath", () => {
  it("two concurrent syncs of different components via symlink vs realpath both land in manifest.json", async () => {
    const ws = await makeWorkspace()
    const a = await writeShellSource(ws, "card-a", "card", "CardA")
    const b = await writeShellSource(ws, "card-b", "card", "CardB")

    // `ws.target` is the realpath. Add a symlink alias to the SAME dir.
    const aliasParent = await fs.realpath(
      await fs.mkdtemp(path.join(os.tmpdir(), "sync-int-alias-"))
    )
    tmpDirs.push(aliasParent)
    const aliasTarget = path.join(aliasParent, "alias-root-b")
    await fs.symlink(ws.target, aliasTarget)

    const syncVia = (target: string, slug: string, src: typeof a) =>
      applyCanvasProjectSyncRequest(
        {
          target,
          componentsDir: "",
          format: "html",
          selection: {
            type: "component",
            slug,
            sourcePath: src.relPath,
            mtimeMs: src.mtimeMs,
          },
        },
        { workspaceRoot: ws.workspaceRoot }
      )

    // Different selections, same real dir, two different path spellings.
    const [ra, rb] = await Promise.all([
      syncVia(ws.target, "card-a", a),
      syncVia(aliasTarget, "card-b", b),
    ])
    expect(ra.ok).toBe(true)
    expect(rb.ok).toBe(true)

    const manifest = JSON.parse(
      await fs.readFile(path.join(ws.target, "manifest.json"), "utf8")
    )
    const slugs = manifest.components
      .map((c: { slug: string }) => c.slug)
      .sort()
    // BOTH components survived — the realpath-keyed lock serialized the merge.
    expect(slugs).toEqual(["card-a", "card-b"])
  })
})

// ---------------------------------------------------------------------------
// Error: read-only target dir → clear permission error; no partial files.
// chmod the picked Root B to read-only and assert the staged-batch write
// fails with a surfaced error before anything lands. Skipped when running as
// root (root bypasses mode bits).
// ---------------------------------------------------------------------------

describe("read-only Root B target → permission error, nothing written", () => {
  const runningAsRoot =
    typeof process.getuid === "function" && process.getuid() === 0

  it.skipIf(runningAsRoot)(
    "chmod 0o500 target → sync fails, no partial files written",
    async () => {
      const ws = await makeWorkspace()
      const src = await writeShellSource(ws, "card")

      // Read+execute only: cannot create the staged tmp file inside it.
      await fs.chmod(ws.target, 0o500)
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
          // A clear, classified failure (stage/mkdir/write), not a crash.
          expect(["stage-failed", "mkdir-failed", "write-failed"]).toContain(
            res.code
          )
          expect(typeof res.error).toBe("string")
          expect(res.error.length).toBeGreaterThan(0)
          // No partial publish: nothing renamed into place.
          expect(res.partialFailure).not.toBe(true)
        }
      } finally {
        // Restore writability so afterEach can clean up.
        await fs.chmod(ws.target, 0o700)
      }

      // No output files (and no leftover *.tmp) landed in Root B.
      const entries = await fs.readdir(ws.target)
      expect(entries).toEqual([])
    }
  )
})

// ---------------------------------------------------------------------------
// Error: artboard with a non-file-backed child → sync blocked with a per-child
// message; nothing written. Verified at BOTH layers it composes through:
//   1. the agent selection resolver (U7) surfaces it before any request, and
//   2. the endpoint (U5) rejects a child whose sourcePath does not resolve
//      inside the repo workspace, with a per-child diagnostic.
// ---------------------------------------------------------------------------

describe("artboard with a non-file-backed child → blocked, nothing written", () => {
  it("agent selection resolver refuses an artboard whose only child is inline (not file-backed)", () => {
    const state = {
      items: [
        { id: "ab1", type: "artboard", name: "Landing" },
        // An inline html child: no sourceComponentSlug / sourcePath → not
        // file-backed → toFileBackedChild() returns null.
        { id: "h1", type: "html", parentId: "ab1", sourceHtml: "<div>x</div>" },
      ],
    }
    const resolved = resolveSyncSelectionFromState(state, "ab1")
    expect(resolved.ok).toBe(false)
    expect(resolved.code).toBe("no-file-backed-children")
    expect(String(resolved.error)).toMatch(/file-backed/i)
  })

  it("endpoint rejects an artboard child whose sourcePath does not resolve in the repo (per-child message); nothing written", async () => {
    const ws = await makeWorkspace()
    const good = await writeShellSource(ws, "card-a", "card", "CardA")

    const res = await applyCanvasProjectSyncRequest(
      {
        target: ws.target,
        componentsDir: "",
        format: "html",
        selection: {
          type: "artboard",
          slug: "landing",
          children: [
            { slug: "card-a", sourcePath: good.relPath, mtimeMs: good.mtimeMs },
            // Non-file-backed child: an absolute path that escapes the repo
            // workspace → resolveRootASource() returns null.
            { slug: "ghost", sourcePath: "/etc/hosts", mtimeMs: null },
          ],
        },
      },
      { workspaceRoot: ws.workspaceRoot }
    )

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.status).toBe(403)
      expect(res.code).toBe("bad-path")
      // Per-child diagnostic naming the offending child + the cause.
      expect(res.error).toContain("ghost")
      expect(res.error).toMatch(/non-file-backed child|repo workspace/i)
    }
    // Blocked before any Root B write — empty target.
    expect(await fs.readdir(ws.target)).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Integration: create → edit the Root A source → sync → Root B equals
// normalizeDocument(current Root A source); Root A is byte-unchanged.
// Uses the U2 create endpoint for the real file-backed create, then mutates
// the created source on disk (an AST-write-shaped edit) before syncing.
// ---------------------------------------------------------------------------

describe("create → edit Root A → sync → Root B == normalize(current Root A)", () => {
  it("publishes the post-edit source and never mutates Root A", async () => {
    const ws = await makeWorkspace()

    // Real file-backed create via the U2 endpoint.
    const { applyCanvasComponentCreateRequest } = await import(
      "../server/canvasComponentCreate"
    )
    const created = await applyCanvasComponentCreateRequest(
      {
        projectId: ws.projectId,
        name: "Card",
        format: "html",
        sourceHtml: buildNativeComponentShell("card" as never, "Card").sourceHtml,
      },
      { workspaceRoot: ws.workspaceRoot }
    )
    expect(created.ok).toBe(true)
    if (!created.ok) return
    // Create response shape: { ok, projectId, primitive, files }. The slug is
    // `primitive.componentSlug`; the real on-disk file is `primitive.filePath`
    // (relative to the project root — note the filename keeps the PascalCase
    // component name while the slug is kebab-case).
    const slug = created.primitive.componentSlug as string
    const absPath = path.join(
      ws.projectRoot,
      created.primitive.filePath as string
    )

    // Edit the Root A source (simulating a round-trip AST write): a different
    // shell entirely, written back verbatim to the same file.
    const edited = buildNativeComponentShell("hero" as never, "Edited Hero")
      .sourceHtml
    await fs.writeFile(absPath, edited, "utf8")
    const editedStat = await fs.stat(absPath)

    const res = await applyCanvasProjectSyncRequest(
      {
        target: ws.target,
        componentsDir: "",
        format: "html",
        selection: {
          type: "component",
          slug,
          sourcePath: path.relative(ws.workspaceRoot, absPath),
          mtimeMs: editedStat.mtimeMs,
        },
      },
      { workspaceRoot: ws.workspaceRoot }
    )
    expect(res.ok).toBe(true)

    // Root B fragment + CSS byte-equal normalizeDocument(CURRENT Root A).
    const expected = normalizeDocument({ sourceHtml: edited, slug })
    const writtenHtml = await fs.readFile(
      path.join(ws.target, `${slug}.html`),
      "utf8"
    )
    expect(writtenHtml.trim()).toBe(expected.fragmentHtml.trim())
    if (expected.css.trim() !== "") {
      const writtenCss = await fs.readFile(
        path.join(ws.target, `${slug}.css`),
        "utf8"
      )
      expect(writtenCss.trim()).toBe(expected.css.trim())
    }

    // Root A is byte-unchanged by the sync (publish is read-only on Root A).
    expect(await fs.readFile(absPath, "utf8")).toBe(edited)
  })
})

// ---------------------------------------------------------------------------
// Integration: a child's Root A source mtime advances DURING the multi-file
// read window → sync aborts before ANY Root B write (R12 multi-file
// coherence). Exercised through the documented coherence seam: the client's
// last-known mtime for one child is behind the on-disk mtime (a concurrent
// AST write landed after the client loaded it). The endpoint re-stats every
// source and aborts the WHOLE selection before staging anything.
// ---------------------------------------------------------------------------

describe("R12 — a child source advanced mid multi-file read → abort before any write", () => {
  it("aborts the whole artboard selection, Root B untouched", async () => {
    const ws = await makeWorkspace()
    const a = await writeShellSource(ws, "card-a", "card", "CardA")
    const b = await writeShellSource(ws, "card-b", "card", "CardB")

    // Child B was edited on disk AFTER the client captured its mtime: bump
    // its mtime well past the client's last-known value (a concurrent AST
    // write during the read window). card-a's mtime is still coherent.
    const future = new Date(Date.now() + 10_000)
    await fs.utimes(b.absPath, future, future)

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
            // Stale: client's value predates the on-disk mutation above.
            { slug: "card-b", sourcePath: b.relPath, mtimeMs: b.mtimeMs },
          ],
        },
      },
      { workspaceRoot: ws.workspaceRoot }
    )

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.code).toBe("stale-source")
      expect(res.status).toBe(409)
      expect(res.error).toMatch(/card-b/)
    }
    // Aborted before ANY Root B write — target is empty (no card-a either,
    // proving the abort covers the WHOLE selection, not just the stale child).
    expect(await fs.readdir(ws.target)).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Integration: agent sync (U7 resolved selection) and UI sync (the
// CanvasTab-shaped selection) of the SAME artboard produce byte-identical
// Root B trees + identical manifest.json (modulo the per-sync `syncedAt`
// timestamp, which is normalized away before comparison).
// ---------------------------------------------------------------------------

describe("agent sync == UI sync — identical Root B tree + manifest", () => {
  it("agent-resolved and UI-shaped selections publish byte-identical output", async () => {
    // --- Agent path: build a canvas state, resolve via U7, then sync. ------
    const wsAgent = await makeWorkspace()
    const aA = await writeShellSource(wsAgent, "card-a", "card", "CardA")
    const aB = await writeShellSource(wsAgent, "card-b", "card", "CardB")

    const agentState = {
      items: [
        { id: "ab1", type: "artboard", name: "Landing" },
        {
          id: "ha",
          type: "html",
          parentId: "ab1",
          sourceComponentSlug: "card-a",
          sourceHtmlFilePath: aA.relPath,
          sourceHtmlFileMtime: aA.mtimeMs,
        },
        {
          id: "hb",
          type: "html",
          parentId: "ab1",
          sourceComponentSlug: "card-b",
          sourceHtmlFilePath: aB.relPath,
          sourceHtmlFileMtime: aB.mtimeMs,
        },
      ],
    }
    const resolved = resolveSyncSelectionFromState(agentState, "ab1")
    expect(resolved.ok).toBe(true)
    if (!resolved.ok) return
    const agentRes = await applyCanvasProjectSyncRequest(
      {
        target: wsAgent.target,
        componentsDir: "",
        format: "html",
        selection: resolved.selection,
      },
      { workspaceRoot: wsAgent.workspaceRoot }
    )
    expect(agentRes.ok).toBe(true)

    // --- UI path: the CanvasTab-shaped selection for the same artboard. ----
    const wsUi = await makeWorkspace()
    const uA = await writeShellSource(wsUi, "card-a", "card", "CardA")
    const uB = await writeShellSource(wsUi, "card-b", "card", "CardB")
    const uiRes = await applyCanvasProjectSyncRequest(
      {
        target: wsUi.target,
        componentsDir: "",
        format: "html",
        selection: {
          type: "artboard",
          // resolveSyncSelectionFromState derives the page slug from the
          // artboard name "Landing" → "landing".
          slug: "landing",
          sourcePath: uA.relPath,
          children: [
            { slug: "card-a", sourcePath: uA.relPath, mtimeMs: uA.mtimeMs },
            { slug: "card-b", sourcePath: uB.relPath, mtimeMs: uB.mtimeMs },
          ],
        },
      },
      { workspaceRoot: wsUi.workspaceRoot }
    )
    expect(uiRes.ok).toBe(true)

    // The resolved agent slug must equal what the UI sent (parity precondition).
    expect((resolved.selection as { slug: string }).slug).toBe("landing")

    // --- Compare the two Root B trees byte-for-byte. ----------------------
    const agentEntries = (await fs.readdir(wsAgent.target)).sort()
    const uiEntries = (await fs.readdir(wsUi.target)).sort()
    expect(agentEntries).toEqual(uiEntries)
    expect(agentEntries).toEqual(
      [
        "card-a.css",
        "card-a.html",
        "card-b.css",
        "card-b.html",
        "landing.css",
        "landing.html",
        "manifest.json",
      ].sort()
    )

    for (const name of agentEntries) {
      const agentContent = await fs.readFile(
        path.join(wsAgent.target, name),
        "utf8"
      )
      const uiContent = await fs.readFile(path.join(wsUi.target, name), "utf8")
      if (name === "manifest.json") {
        // Normalize the per-sync timestamp before comparing the manifest.
        const norm = (raw: string) => {
          const m = JSON.parse(raw)
          const strip = (e: { syncedAt?: string }) => {
            e.syncedAt = "<ts>"
            return e
          }
          m.components = (m.components ?? []).map(strip)
          m.pages = (m.pages ?? []).map(strip)
          return m
        }
        expect(norm(agentContent)).toEqual(norm(uiContent))
      } else {
        expect(agentContent).toBe(uiContent)
      }
    }

    // Cross-check against the canonical normalize/compose output too.
    const composed = composeNormalizedPage([
      normalizeDocument({ sourceHtml: aA.sourceHtml, slug: "card-a" }),
      normalizeDocument({ sourceHtml: aB.sourceHtml, slug: "card-b" }),
    ])
    const agentPageHtml = await fs.readFile(
      path.join(wsAgent.target, "landing.html"),
      "utf8"
    )
    expect(agentPageHtml.trim()).toBe(composed.fragmentHtml.trim())
  })
})
