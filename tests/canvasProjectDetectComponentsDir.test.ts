import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import { applyCanvasProjectDetectComponentsDirRequest } from "../server/canvasProjectDetectComponentsDir"

const tmpDirs: string[] = []

async function makeRoot(): Promise<string> {
  const root = await fs.realpath(
    await fs.mkdtemp(path.join(os.tmpdir(), "detect-root-"))
  )
  tmpDirs.push(root)
  return root
}

afterEach(async () => {
  await Promise.all(
    tmpDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true }))
  )
})

describe("applyCanvasProjectDetectComponentsDirRequest", () => {
  it("picks src/components when present", async () => {
    const root = await makeRoot()
    await fs.mkdir(path.join(root, "src", "components"), { recursive: true })
    const result = await applyCanvasProjectDetectComponentsDirRequest({
      rootPath: root,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.resolvedComponentsDir).toBe("src/components")
    expect(result.candidates[0]).toEqual({ dir: "src/components", exists: true })
  })

  it("falls to the next candidate when src/components is absent", async () => {
    const root = await makeRoot()
    await fs.mkdir(path.join(root, "components"), { recursive: true })
    const result = await applyCanvasProjectDetectComponentsDirRequest({
      rootPath: root,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    // src/components, app/components missing → falls to `components`.
    expect(result.resolvedComponentsDir).toBe("components")
    const byName = Object.fromEntries(
      result.candidates.map((c) => [c.dir, c.exists])
    )
    expect(byName["src/components"]).toBe(false)
    expect(byName["app/components"]).toBe(false)
    expect(byName["components"]).toBe(true)
  })

  it("returns no resolved dir + full candidate list when none exist (override)", async () => {
    const root = await makeRoot()
    const result = await applyCanvasProjectDetectComponentsDirRequest({
      rootPath: root,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.resolvedComponentsDir).toBe("")
    expect(result.candidates).toHaveLength(5)
    expect(result.candidates.every((c) => c.exists === false)).toBe(true)
  })

  it("suggests html+tsx when React is a dependency KEY", async () => {
    const root = await makeRoot()
    await fs.writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ dependencies: { react: "^19.0.0" } })
    )
    const result = await applyCanvasProjectDetectComponentsDirRequest({
      rootPath: root,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.frameworkSuggestion).toBe("html+tsx")
  })

  it("defaults to html when no React-family dependency KEY is present", async () => {
    const root = await makeRoot()
    await fs.writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ dependencies: { lodash: "^4" } })
    )
    const result = await applyCanvasProjectDetectComponentsDirRequest({
      rootPath: root,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.frameworkSuggestion).toBe("html")
  })

  it("NEVER uses a package.json value as a path; only the key set drives the sniff", async () => {
    const root = await makeRoot()
    // Malicious: a dependency VALUE that looks like a traversal path, and a
    // key that is NOT a known framework. The sniff must ignore the value
    // entirely and only key membership counts → no html+tsx, no path effect.
    await fs.writeFile(
      path.join(root, "package.json"),
      JSON.stringify({
        dependencies: { "evil-dep": "../../../../etc/passwd" },
        devDependencies: { "../../escape": "1.0.0" },
      })
    )
    await fs.mkdir(path.join(root, "components"), { recursive: true })
    const result = await applyCanvasProjectDetectComponentsDirRequest({
      rootPath: root,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    // No react KEY → html. The traversal-looking value never participated.
    expect(result.frameworkSuggestion).toBe("html")
    // Only the fixed candidate list was probed; resolved is `components`.
    expect(result.resolvedComponentsDir).toBe("components")
    // The display path stays under the picked root — a dependency value
    // could never redirect it.
    expect(result.escapedDisplayPath.includes("etc/passwd")).toBe(false)
  })

  it("HTML-escapes the display path", async () => {
    const parent = await makeRoot()
    const nasty = path.join(parent, 'we<ird>"name')
    await fs.mkdir(path.join(nasty, "src", "components"), { recursive: true })
    const result = await applyCanvasProjectDetectComponentsDirRequest({
      rootPath: nasty,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.escapedDisplayPath).toContain("&lt;")
    expect(result.escapedDisplayPath).toContain("&gt;")
    expect(result.escapedDisplayPath).toContain("&quot;")
    expect(result.escapedDisplayPath).not.toContain('we<ird>"name')
  })

  it("rejects a missing root path", async () => {
    const result = await applyCanvasProjectDetectComponentsDirRequest({
      rootPath: path.join(os.tmpdir(), "definitely-not-here-xyz-123"),
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(404)
    expect(result.code).toBe("root-missing")
  })

  it("rejects an empty rootPath", async () => {
    const result = await applyCanvasProjectDetectComponentsDirRequest({
      rootPath: "",
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(400)
  })
})
