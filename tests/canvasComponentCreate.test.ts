import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"

import { describe, expect, it } from "vitest"

import { applyCanvasComponentCreateRequest } from "../vite/api/canvasComponentCreate"

async function makeWorkspace() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "canvas-component-create-"))
  const projectRoot = path.join(root, "projects", "demo")
  await fs.mkdir(projectRoot, { recursive: true })
  await fs.writeFile(path.join(projectRoot, "registry.json"), JSON.stringify({ ui: [], page: [] }), "utf8")
  return { root, projectRoot }
}

describe("applyCanvasComponentCreateRequest", () => {
  it("creates HTML/CSS component files and appends an HTML registry entry", async () => {
    const { root, projectRoot } = await makeWorkspace()

    const result = await applyCanvasComponentCreateRequest(
      {
        projectId: "demo",
        name: "Promo Card",
        format: "html",
        sourceHtml: `<article class="promo">Hello</article>`,
        sourceCss: `.promo { padding: 16px; }`,
        description: "Promotional card",
      },
      { workspaceRoot: root }
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.primitive).toMatchObject({
      id: "primitive/promo-card",
      kind: "html",
      filePath: "components/PromoCard.html",
      cssPath: "components/PromoCard.css",
      componentSlug: "promo-card",
    })
    await expect(fs.readFile(path.join(projectRoot, "components", "PromoCard.html"), "utf8")).resolves.toContain(
      `data-component="promo-card"`
    )
    await expect(fs.readFile(path.join(projectRoot, "components", "PromoCard.css"), "utf8")).resolves.toContain(
      ".promo"
    )
    const registry = JSON.parse(await fs.readFile(path.join(projectRoot, "registry.json"), "utf8"))
    expect(registry.ui[0]).toMatchObject({ id: "primitive/promo-card", kind: "html" })
  })

  it("creates TSX component files and appends a TSX registry entry", async () => {
    const { root, projectRoot } = await makeWorkspace()

    const result = await applyCanvasComponentCreateRequest(
      {
        projectId: "demo",
        name: "Badge",
        format: "tsx",
        sourceTsx: `export function Badge() { return <span>Badge</span> }`,
      },
      { workspaceRoot: root }
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.primitive).toMatchObject({
      id: "primitive/badge",
      kind: "tsx",
      filePath: "components/Badge.tsx",
      importName: "Badge",
    })
    await expect(fs.readFile(path.join(projectRoot, "components", "Badge.tsx"), "utf8")).resolves.toContain(
      "export function Badge"
    )
  })

  it("rejects duplicate component files", async () => {
    const { root, projectRoot } = await makeWorkspace()
    await fs.mkdir(path.join(projectRoot, "components"), { recursive: true })
    await fs.writeFile(path.join(projectRoot, "components", "PromoCard.html"), "<article></article>", "utf8")

    const result = await applyCanvasComponentCreateRequest(
      {
        projectId: "demo",
        name: "Promo Card",
        format: "html",
        sourceHtml: `<article>Hello</article>`,
      },
      { workspaceRoot: root }
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(409)
    expect(result.code).toBe("already-exists")
  })
})
