import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import {
  assertRealpathStable,
  resolveSandboxPath,
} from "../vite/api/resolveSandboxPath"

const tmpDirs: string[] = []

async function makeSandbox(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "sandbox-guard-"))
  tmpDirs.push(dir)
  // Realpath the root once so comparisons are real-to-real (macOS /tmp is a
  // symlink to /private/tmp).
  return fs.realpath(dir)
}

afterEach(async () => {
  await Promise.all(
    tmpDirs.splice(0).map((d) => fs.rm(d, { recursive: true, force: true }).catch(() => undefined))
  )
})

describe("resolveSandboxPath", () => {
  it("accepts a valid in-sandbox path with an allowed extension", async () => {
    const root = await makeSandbox()
    const result = await resolveSandboxPath("card.html", root, [".html", ".css"])
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.resolved).toBe(path.join(root, "card.html"))
      expect(result.validatedRealRoot).toBe(root)
    }
  })

  it("accepts a nested path inside the sandbox", async () => {
    const root = await makeSandbox()
    await fs.mkdir(path.join(root, "ui"))
    const result = await resolveSandboxPath("ui/card.css", root, [".css"])
    expect(result.ok).toBe(true)
  })

  it("rejects a `..` traversal path", async () => {
    const root = await makeSandbox()
    const result = await resolveSandboxPath("../escape.html", root, [".html"])
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe("bad-path")
  })

  it("rejects an absolute path that escapes the sandbox", async () => {
    const root = await makeSandbox()
    const result = await resolveSandboxPath("/etc/passwd", root, [".html"])
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe("bad-path")
  })

  it("rejects an extension not in the allowlist", async () => {
    const root = await makeSandbox()
    const result = await resolveSandboxPath("card.exe", root, [".html", ".css"])
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe("bad-extension")
  })

  it("rejects a NUL byte in the path", async () => {
    const root = await makeSandbox()
    const result = await resolveSandboxPath("card\0.html", root, [".html"])
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe("bad-path")
  })

  it("rejects a symlinked subdir that escapes the sandbox", async () => {
    const root = await makeSandbox()
    const outside = await fs.mkdtemp(path.join(os.tmpdir(), "sandbox-outside-"))
    tmpDirs.push(outside)
    const realOutside = await fs.realpath(outside)
    // Create a symlink INSIDE the sandbox pointing to a dir OUTSIDE it.
    const linkPath = path.join(root, "evil")
    await fs.symlink(realOutside, linkPath)

    const result = await resolveSandboxPath("evil/pwned.html", root, [".html"])
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe("escapes-sandbox")
  })

  it("rejects when the sandbox root itself cannot be realpath'd", async () => {
    const result = await resolveSandboxPath(
      "card.html",
      path.join(os.tmpdir(), "definitely-not-here-" + Date.now()),
      [".html"]
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe("realpath-failed")
  })

  it("assertRealpathStable passes when the path is unchanged", async () => {
    const root = await makeSandbox()
    const guard = await resolveSandboxPath("card.html", root, [".html"])
    expect(guard.ok).toBe(true)
    if (guard.ok) {
      const drift = await assertRealpathStable(guard.resolved, guard.validatedRealRoot)
      expect(drift).toBeNull()
    }
  })

  it("assertRealpathStable rejects when a symlink is swapped between validate and write (TOCTOU)", async () => {
    const root = await makeSandbox()
    const outside = await fs.mkdtemp(path.join(os.tmpdir(), "sandbox-toctou-"))
    tmpDirs.push(outside)
    const realOutside = await fs.realpath(outside)

    // First validate against a benign in-sandbox subdir.
    const subdir = path.join(root, "ui")
    await fs.mkdir(subdir)
    const guard = await resolveSandboxPath("ui/card.html", root, [".html"])
    expect(guard.ok).toBe(true)
    if (!guard.ok) return

    // Now an attacker swaps `ui` for a symlink to an outside dir before the
    // rename would have happened.
    await fs.rm(subdir, { recursive: true, force: true })
    await fs.symlink(realOutside, subdir)

    const drift = await assertRealpathStable(guard.resolved, guard.validatedRealRoot)
    expect(drift).not.toBeNull()
    expect(drift?.code).toBe("escapes-sandbox")
  })

  it("validates a not-yet-created file by realpath'ing its nearest existing ancestor", async () => {
    const root = await makeSandbox()
    // ui/ does not exist yet; the file does not exist yet. Still OK because
    // the nearest existing ancestor (root) is contained.
    const result = await resolveSandboxPath("ui/new.html", root, [".html"])
    expect(result.ok).toBe(true)
  })
})
