import os from "node:os"
import path from "node:path"
import { promises as fs } from "node:fs"

import { afterEach, describe, expect, it } from "vitest"

import { createProjectScan } from "../server/localScan"
import { slugify, toPascalCase } from "../core/mcp/paper"
import { ensureProjectCanvasDir } from "../utils/canvasFileStore"

const tempDirs: string[] = []

async function makeTempDir(prefix: string) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix))
  tempDirs.push(dir)
  return dir
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true }))
  )
})

function makeScan(overrides: Parameters<typeof createProjectScan>[0] = {}) {
  return createProjectScan({
    LOCAL_SCAN_ALLOWED_ROOTS: ["/allowed"],
    LOCAL_SCAN_MAX_FILES: 100,
    LOCAL_SCAN_MAX_COMPONENTS: 20,
    LOCAL_SCAN_IGNORE_DIRS: new Set(["node_modules", ".git", "dist"]),
    LOCAL_SCAN_SOURCE_EXTENSIONS: new Set([".tsx", ".jsx"]),
    slugify,
    toPascalCase,
    ensureProjectCanvasDir,
    ...overrides,
  })
}

describe("projects + local-scan subsystem (FOX2-75 slice 9)", () => {
  it("extracts React component exports across declaration forms", () => {
    const api = makeScan()
    const source = `
export function PrimaryButton() { return <button /> }
export const CardHeader = () => <header />
function Hidden() { return null }
export default function HomePage() { return <main /> }
export const notAComponent = 42
`
    const exports = api.extractReactComponentExports(source, "/repo/src/Widgets.tsx")
    const names = exports.map((e) => e.componentName)
    expect(names).toContain("PrimaryButton")
    expect(names).toContain("CardHeader")
    expect(names).not.toContain("Hidden")
    expect(names).not.toContain("notAComponent")
  })

  it("enforces the allowed-roots guard with subpath semantics", () => {
    const api = makeScan()
    expect(api.isSubPath("/allowed", "/allowed/repo")).toBe(true)
    expect(api.isSubPath("/allowed", "/allowed-sibling")).toBe(false)

    expect(() => api.assertLocalScanPathAllowed("/allowed/some/repo")).not.toThrow()
    expect(() => api.assertLocalScanPathAllowed("/etc")).toThrow(/allowed scanner roots/)
  })

  it("collects only source-extension files, skipping ignored directories", async () => {
    const repo = await makeTempDir("scan-repo-")
    await fs.mkdir(path.join(repo, "src"), { recursive: true })
    await fs.mkdir(path.join(repo, "node_modules", "lib"), { recursive: true })
    await fs.writeFile(path.join(repo, "src", "Button.tsx"), "export const Button = () => <b/>")
    await fs.writeFile(path.join(repo, "src", "util.ts"), "export const x = 1")
    await fs.writeFile(
      path.join(repo, "node_modules", "lib", "Ignored.tsx"),
      "export const Ignored = () => null"
    )

    const api = makeScan({ LOCAL_SCAN_ALLOWED_ROOTS: [repo] })
    const files = await api.collectLocalComponentCandidates(repo)
    expect(files).toHaveLength(1)
    expect(files[0]).toContain("Button.tsx")
  })

  it("syncs a repo into a project: scaffold, gallery entries, registry, meta", async () => {
    const projectsRoot = await makeTempDir("projects-root-")
    const repo = await makeTempDir("scan-src-")
    await fs.writeFile(
      path.join(repo, "Hello.tsx"),
      "export function Hello() { return <p>hi</p> }"
    )

    const api = makeScan({
      PROJECTS_ROOT: projectsRoot,
      LOCAL_SCAN_ALLOWED_ROOTS: [repo],
      LOCAL_SCAN_PROXY_SOURCE_PATH: path.join(repo, "Hello.tsx"),
    })

    const result = await api.syncLocalScanProject({
      repoPath: repo,
      projectId: "scan-demo",
      projectLabel: "Scan Demo",
    })
    expect(result.ok).toBe(true)
    expect(result.detectedCount).toBeGreaterThan(0)
    expect(result.changed).toBe(true)

    const meta = await api.readProjectMeta(path.join(projectsRoot, "scan-demo"), "scan-demo")
    expect(meta.label).toBe("Scan Demo")
    expect(api.normalizeLocalScanState(meta.localScan)?.repoPath).toBe(repo)

    const projects = await api.listProjects()
    expect(projects.map((p) => p.id)).toContain("scan-demo")

    // Re-sync stays stable: same entries, still ok.
    const again = await api.syncLocalScanProject({
      repoPath: repo,
      projectId: "scan-demo",
      projectLabel: "Scan Demo",
    })
    expect(again.ok).toBe(true)
    expect(again.detectedCount).toBe(result.detectedCount)
  })

  it("persists and revalidates sync targets through project meta", async () => {
    const projectsRoot = await makeTempDir("projects-root-")
    const externalRoot = await makeTempDir("external-root-")
    const api = makeScan({ PROJECTS_ROOT: projectsRoot })
    await api.ensureProjectScaffold("demo", "Demo")

    const projectDir = path.join(projectsRoot, "demo")
    const saved = await api.writeProjectSyncTarget(projectDir, "demo", {
      rootPath: externalRoot,
      resolvedRealPath: await fs.realpath(externalRoot),
      componentsDir: "src/components",
      confirmedAt: new Date().toISOString(),
    })
    expect(saved.rootPath).toBe(externalRoot)

    const stored = await api.readProjectSyncTarget(projectDir, "demo")
    const revalidated = await api.revalidateSyncTargetRealpath(stored)
    expect(revalidated.ok).toBe(true)
  })

  it("maps file paths to /@fs module URLs and pascal-case component names", () => {
    const api = makeScan()
    expect(api.toFsModuleUrl("/repo/src/My File.tsx")).toContain("/@fs/")
    expect(api.inferLocalComponentNameFromFile("/repo/src/user-card.tsx")).toBe("UserCard")
  })
})
