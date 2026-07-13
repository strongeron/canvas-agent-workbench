import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"

import { describe, expect, it } from "vitest"

import {
  applyCanvasComponentCreateRequest,
  validateSingleSegment,
} from "../server/canvasComponentCreate"
import { parseCanvasRegistry } from "../utils/canvasRegistry"
import {
  isFileBackedComponent,
  resolveHtmlSourceFilePath,
} from "../utils/canvasHtmlSourceResolve"

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

  it("persists slot metadata for HTML components in the registry entry", async () => {
    const { root, projectRoot } = await makeWorkspace()

    const result = await applyCanvasComponentCreateRequest(
      {
        projectId: "demo",
        name: "Hero Card",
        format: "html",
        sourceHtml:
          '<section data-slot="root" data-slot-kind="container"><figure data-slot="media" data-slot-kind="container" data-slot-accepts="image,svg,video"></figure><h2 data-slot="title" data-slot-kind="text">Title</h2></section>',
      },
      { workspaceRoot: root }
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.primitive.slots).toEqual([
      { name: "root", kind: "container", tag: "section" },
      {
        name: "media",
        kind: "container",
        accepts: "image,svg,video",
        tag: "figure",
      },
      { name: "title", kind: "text", tag: "h2" },
    ])

    const registry = JSON.parse(await fs.readFile(path.join(projectRoot, "registry.json"), "utf8"))
    expect(registry.ui[0].slots).toEqual([
      { name: "root", kind: "container", tag: "section" },
      {
        name: "media",
        kind: "container",
        accepts: "image,svg,video",
        tag: "figure",
      },
      { name: "title", kind: "text", tag: "h2" },
    ])
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

  it("rejects duplicate component files when failOnExisting is set (opt-out)", async () => {
    const { root, projectRoot } = await makeWorkspace()
    await fs.mkdir(path.join(projectRoot, "components"), { recursive: true })
    await fs.writeFile(path.join(projectRoot, "components", "PromoCard.html"), "<article></article>", "utf8")

    const result = await applyCanvasComponentCreateRequest(
      {
        projectId: "demo",
        name: "Promo Card",
        format: "html",
        sourceHtml: `<article>Hello</article>`,
        failOnExisting: true,
      },
      { workspaceRoot: root }
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(409)
    expect(result.code).toBe("already-exists")
  })

  it("first create of a name maps to the bare slug + filename", async () => {
    const { root, projectRoot } = await makeWorkspace()

    const result = await applyCanvasComponentCreateRequest(
      { projectId: "demo", name: "Card", format: "html", sourceHtml: `<article>Card</article>` },
      { workspaceRoot: root }
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.primitive.id).toBe("primitive/card")
    expect(result.primitive.filePath).toBe("components/Card.html")
    await expect(fs.access(path.join(projectRoot, "components", "Card.html"))).resolves.toBeUndefined()
  })

  it("uniquifies a repeated name to a paired filename + registry id", async () => {
    const { root, projectRoot } = await makeWorkspace()

    const first = await applyCanvasComponentCreateRequest(
      { projectId: "demo", name: "Card", format: "html", sourceHtml: `<article>One</article>` },
      { workspaceRoot: root }
    )
    expect(first.ok).toBe(true)
    if (!first.ok) return
    expect(first.primitive.id).toBe("primitive/card")
    expect(first.primitive.filePath).toBe("components/Card.html")

    const second = await applyCanvasComponentCreateRequest(
      { projectId: "demo", name: "Card", format: "html", sourceHtml: `<article>Two</article>` },
      { workspaceRoot: root }
    )
    expect(second.ok).toBe(true)
    if (!second.ok) return
    // Filename and registry id advance together to the same suffix.
    expect(second.primitive.id).toBe("primitive/card-2")
    expect(second.primitive.filePath).toBe("components/Card2.html")
    expect(second.primitive.componentSlug).toBe("card-2")
    await expect(fs.access(path.join(projectRoot, "components", "Card2.html"))).resolves.toBeUndefined()

    const third = await applyCanvasComponentCreateRequest(
      { projectId: "demo", name: "Card", format: "html", sourceHtml: `<article>Three</article>` },
      { workspaceRoot: root }
    )
    expect(third.ok).toBe(true)
    if (!third.ok) return
    expect(third.primitive.id).toBe("primitive/card-3")
    expect(third.primitive.filePath).toBe("components/Card3.html")
  })

  it("advances until BOTH the filename and the registry id are free at the same suffix", async () => {
    const { root, projectRoot } = await makeWorkspace()
    await fs.mkdir(path.join(projectRoot, "components"), { recursive: true })

    // Filename `Card.html` is FREE, but registry id `primitive/card` is TAKEN.
    // `Card2.html` is TAKEN on disk, but `primitive/card-2` is FREE.
    // The uniquifier must skip BOTH partial-collision suffixes and land on
    // suffix 3 where filename AND id are simultaneously free.
    await fs.writeFile(
      path.join(projectRoot, "registry.json"),
      JSON.stringify({
        ui: [{ id: "primitive/card", displayName: "Card", category: "ui", kind: "html", filePath: "components/Other.html" }],
        page: [],
      }),
      "utf8"
    )
    await fs.writeFile(path.join(projectRoot, "components", "Card2.html"), "<article>taken</article>", "utf8")

    const result = await applyCanvasComponentCreateRequest(
      { projectId: "demo", name: "Card", format: "html", sourceHtml: `<article>New</article>` },
      { workspaceRoot: root }
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    // Both share suffix 3; neither suffix 1 (id taken) nor suffix 2 (file taken)
    // was accepted — the pair never diverged.
    expect(result.primitive.id).toBe("primitive/card-3")
    expect(result.primitive.filePath).toBe("components/Card3.html")
    const suffixFromId = result.primitive.id.replace("primitive/card", "")
    const suffixFromFile = (result.primitive.filePath ?? "").match(/Card(\d+)\.html$/)?.[1]
    expect(suffixFromId).toBe("-3")
    expect(suffixFromFile).toBe("3")
  })

  it("treats a stray sibling .css as occupying the slug pair", async () => {
    const { root, projectRoot } = await makeWorkspace()
    await fs.mkdir(path.join(projectRoot, "components"), { recursive: true })
    // Only the .css exists for the base slug — the .html is free, but the slug
    // is still considered taken so the pair advances.
    await fs.writeFile(path.join(projectRoot, "components", "Card.css"), ".x{}", "utf8")

    const result = await applyCanvasComponentCreateRequest(
      { projectId: "demo", name: "Card", format: "html", sourceHtml: `<article>New</article>` },
      { workspaceRoot: root }
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.primitive.id).toBe("primitive/card-2")
    expect(result.primitive.filePath).toBe("components/Card2.html")
  })

  it("keeps returning 409 with failOnExisting on a registry-id collision", async () => {
    const { root, projectRoot } = await makeWorkspace()
    await fs.writeFile(
      path.join(projectRoot, "registry.json"),
      JSON.stringify({
        ui: [{ id: "primitive/card", displayName: "Card", category: "ui", kind: "html", filePath: "components/Card.html" }],
        page: [],
      }),
      "utf8"
    )

    const result = await applyCanvasComponentCreateRequest(
      {
        projectId: "demo",
        name: "Card",
        format: "html",
        sourceHtml: `<article>Hello</article>`,
        failOnExisting: true,
      },
      { workspaceRoot: root }
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.status).toBe(409)
    expect(result.code).toBe("already-exists")
  })

  it("validateSingleSegment rejects non-single-segment slugs (bad-path, never 500)", () => {
    // The path-segment guard is the backstop run before any path.join.
    expect(validateSingleSegment("card")).toBeNull()
    expect(validateSingleSegment("card-2")).toBeNull()
    expect(validateSingleSegment("a/b")).toMatch(/single path segment/)
    expect(validateSingleSegment("a\\b")).toMatch(/single path segment/)
    expect(validateSingleSegment("..")).toMatch(/traversal/)
    expect(validateSingleSegment("foo..bar")).toMatch(/traversal/)
    expect(validateSingleSegment(".hidden")).toMatch(/start with a dot/)
    expect(validateSingleSegment("a\0b")).toMatch(/null byte/)
    expect(validateSingleSegment("")).toMatch(/empty/)
  })

  it("never returns 500 for a name that normalizes near a path-segment edge", async () => {
    const { root } = await makeWorkspace()
    // `../etc` / `a/b` normalize to clean PascalCase via normalizeComponentName
    // (separators are stripped), so the guard is a backstop, not a 500 source.
    for (const name of ["../etc", "a/b", "..", "./x"]) {
      const result = await applyCanvasComponentCreateRequest(
        { projectId: "demo", name, format: "html", sourceHtml: `<article>x</article>` },
        { workspaceRoot: root }
      )
      // Either a clean create or a deterministic 4xx — never an unhandled 500.
      if (!result.ok) {
        expect(result.status).toBeLessThan(500)
      }
    }
  })

  it("registry stays parseCanvasRegistry-valid after a uniquified insert", async () => {
    const { root, projectRoot } = await makeWorkspace()

    await applyCanvasComponentCreateRequest(
      { projectId: "demo", name: "Card", format: "html", sourceHtml: `<article>One</article>` },
      { workspaceRoot: root }
    )
    await applyCanvasComponentCreateRequest(
      { projectId: "demo", name: "Card", format: "html", sourceHtml: `<article>Two</article>` },
      { workspaceRoot: root }
    )

    const registryRaw = JSON.parse(await fs.readFile(path.join(projectRoot, "registry.json"), "utf8"))
    const parsed = parseCanvasRegistry(registryRaw)
    expect(parsed.warnings).toEqual([])
    const ids = parsed.primitives.map((primitive) => primitive.id)
    expect(ids).toContain("primitive/card")
    expect(ids).toContain("primitive/card-2")
    // No duplicate ids — the pair allocation kept them unique.
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("uniquifies TSX components with a paired slug + filename", async () => {
    const { root } = await makeWorkspace()

    const first = await applyCanvasComponentCreateRequest(
      { projectId: "demo", name: "Badge", format: "tsx", sourceTsx: `export function Badge() { return <span/> }` },
      { workspaceRoot: root }
    )
    expect(first.ok).toBe(true)
    if (!first.ok) return
    expect(first.primitive.id).toBe("primitive/badge")
    expect(first.primitive.filePath).toBe("components/Badge.tsx")

    const second = await applyCanvasComponentCreateRequest(
      { projectId: "demo", name: "Badge", format: "tsx", sourceTsx: `export function Badge2() { return <span/> }` },
      { workspaceRoot: root }
    )
    expect(second.ok).toBe(true)
    if (!second.ok) return
    expect(second.primitive.id).toBe("primitive/badge-2")
    expect(second.primitive.filePath).toBe("components/Badge2.tsx")
    expect(second.primitive.importName).toBe("Badge2")
  })

  // U3 — file-backed-on-create + the create-then-rebind reconcile contract.
  describe("create-then-rebind contract (U3)", () => {
    it("a native create yields a file-backed item bound to filePath + slug (no inline-only phase)", async () => {
      const { root } = await makeWorkspace()

      const result = await applyCanvasComponentCreateRequest(
        {
          projectId: "demo",
          name: "Stack",
          format: "html",
          sourceHtml: `<section class="stack">Hello</section>`,
        },
        { workspaceRoot: root }
      )

      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.primitive.componentSlug).toBe("stack")
      expect(result.primitive.filePath).toBe("components/Stack.html")
      const htmlFile = result.files.find(
        (file) => file.filePath === result.primitive.filePath
      )
      expect(typeof htmlFile?.mtimeMs).toBe("number")

      // This is exactly what handleAddNativeComponent stores on the item:
      const repoRelative = `projects/demo/${result.primitive.filePath}`
      const item = {
        sourceHtmlFilePath: repoRelative,
        sourceComponentSlug: result.primitive.componentSlug,
        sourceComponentFilePath: repoRelative,
      }
      // Already file-backed — never an inline-only node.
      expect(isFileBackedComponent(item)).toBe(true)
      expect(resolveHtmlSourceFilePath(item)).toBe(repoRelative)
    })

    it("rebind dropped → next edit still resolves the file via the create-time path, not a divergent inline copy", async () => {
      const { root } = await makeWorkspace()
      const result = await applyCanvasComponentCreateRequest(
        {
          projectId: "demo",
          name: "Hero",
          format: "html",
          sourceHtml: `<section class="hero">Hi</section>`,
        },
        { workspaceRoot: root }
      )
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const repoRelative = `projects/demo/${result.primitive.filePath}`
      // Simulate the post-create rebind being dropped: the editable binding
      // (sourceHtmlFilePath) never landed, but the stable slug/path did.
      const itemAfterDroppedRebind = {
        sourceHtmlFilePath: undefined,
        sourceComponentSlug: result.primitive.componentSlug,
        sourceComponentFilePath: repoRelative,
      }
      // The reconcile keys on the create-time identity, so the next edit
      // resolves the REAL file — it must never treat this as inline-divergent.
      expect(isFileBackedComponent(itemAfterDroppedRebind)).toBe(true)
      expect(resolveHtmlSourceFilePath(itemAfterDroppedRebind)).toBe(repoRelative)
    })

    it("a genuinely inline node (no slug, no create path) resolves to no file", () => {
      const inlineOnly = { sourceHtmlFilePath: undefined }
      expect(isFileBackedComponent(inlineOnly)).toBe(false)
      expect(resolveHtmlSourceFilePath(inlineOnly)).toBeUndefined()
    })

    it("the live editable binding wins over the stable create-time path", () => {
      const item = {
        sourceHtmlFilePath: "projects/demo/components/Renamed.html",
        sourceComponentSlug: "hero",
        sourceComponentFilePath: "projects/demo/components/Hero.html",
      }
      expect(resolveHtmlSourceFilePath(item)).toBe(
        "projects/demo/components/Renamed.html"
      )
    })
  })
})
