import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"

import { describe, expect, it } from "vitest"

import { extractHtmlSubtree, injectCanvasHtmlElementIds } from "../utils/canvasHtmlEditor"
import { applyCanvasComponentPromoteRequest } from "../server/canvasComponentPromote"

async function makeWorkspace() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "canvas-component-promote-"))
  const projectRoot = path.join(root, "projects", "demo")
  await fs.mkdir(projectRoot, { recursive: true })
  await fs.writeFile(path.join(projectRoot, "registry.json"), JSON.stringify({ ui: [], page: [] }), "utf8")
  return { root, projectRoot }
}

const SOURCE_ID = "demo/canvas-A.canvas"
const SOURCE_HTML = `<section><article class="promo" data-slot="root" data-slot-kind="container"><h2 data-slot="title" data-slot-kind="text">Title</h2><p data-slot="body" data-slot-kind="text">Body</p></article></section>`

function findArticleId(): string {
  const { ids } = injectCanvasHtmlElementIds(SOURCE_HTML, { sourceId: SOURCE_ID, injectBridge: false })
  const article = ids.find((id) => id.tag === "article")
  if (!article) throw new Error("article not found")
  return article.canvasId
}

describe("extractHtmlSubtree", () => {
  it("returns the matched element with descendants", () => {
    const canvasId = findArticleId()
    const result = extractHtmlSubtree(SOURCE_HTML, canvasId, { sourceId: SOURCE_ID })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.tag).toBe("article")
    expect(result.subtreeHtml).toContain('class="promo"')
    expect(result.subtreeHtml).toContain('<h2 data-slot="title" data-slot-kind="text">Title</h2>')
    expect(result.subtreeHtml).toContain('<p data-slot="body" data-slot-kind="text">Body</p>')
    expect(result.subtreeHtml).not.toContain("data-canvas-id")
    expect(result.subtreeHtml).not.toContain("<section>")
  })

  it("rejects an unknown canvasId", () => {
    const result = extractHtmlSubtree(SOURCE_HTML, "deadbeef:99.99", { sourceId: SOURCE_ID })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("not-found")
  })
})

describe("applyCanvasComponentPromoteRequest", () => {
  it("extracts the subtree and creates a component file + registry entry", async () => {
    const { root, projectRoot } = await makeWorkspace()
    const canvasId = findArticleId()

    const result = await applyCanvasComponentPromoteRequest(
      {
        projectId: "demo",
        name: "Promo Card",
        sourceHtml: SOURCE_HTML,
        canvasId,
        sourceId: SOURCE_ID,
        description: "Promoted from a canvas board",
      },
      { workspaceRoot: root }
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.primitive).toMatchObject({
      id: "primitive/promo-card",
      kind: "html",
      filePath: "components/PromoCard.html",
      componentSlug: "promo-card",
    })
    const written = await fs.readFile(path.join(projectRoot, "components", "PromoCard.html"), "utf8")
    expect(written).toContain('class="promo"')
    expect(written).not.toContain("data-canvas-id")
    const registry = JSON.parse(await fs.readFile(path.join(projectRoot, "registry.json"), "utf8"))
    expect(registry.ui[0]).toMatchObject({ id: "primitive/promo-card", kind: "html" })
    expect(registry.ui[0].slots).toEqual([
      { name: "root", kind: "container", tag: "article" },
      { name: "title", kind: "text", tag: "h2" },
      { name: "body", kind: "text", tag: "p" },
    ])
  })

  it("rejects when sourceHtml or canvasId is missing", async () => {
    const { root } = await makeWorkspace()
    const result = await applyCanvasComponentPromoteRequest(
      { projectId: "demo", name: "X", sourceId: SOURCE_ID },
      { workspaceRoot: root }
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(400)
  })
})
