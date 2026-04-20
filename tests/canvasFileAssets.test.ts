import os from "node:os"
import path from "node:path"
import { promises as fs } from "node:fs"

import { afterEach, describe, expect, it } from "vitest"

import type { CanvasStateSnapshot } from "../types/canvas"
import { buildCanvasFileDocument } from "../utils/canvasFileStore"
import {
  copyCanvasDocumentAssets,
  deleteCanvasDocumentAssets,
  importCanvasHtmlBundle,
  packCanvasDocumentAssets,
  readCanvasDocumentAsset,
  scanCanvasHtmlBundleLibrary,
  rewriteCanvasDocumentAssetUrls,
} from "../utils/canvasFileAssets"

const tempDirs: string[] = []

async function createTempProjectsRoot() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "gallery-poc-canvas-assets-"))
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

describe("canvas file assets", () => {
  it("packs shared media and inline payloads into document-local assets", async () => {
    const projectsRoot = await createTempProjectsRoot()
    const sharedMediaRoot = path.join(projectsRoot, ".canvas-media")
    await fs.mkdir(sharedMediaRoot, { recursive: true })
    await fs.writeFile(path.join(sharedMediaRoot, "shared.png"), Buffer.from("shared-image"))

    const document = buildCanvasFileDocument({
      projectId: "demo",
      title: "Media Board",
      document: {
        items: [
          {
            id: "media-1",
            type: "media",
            src: "/api/media/file/shared.png",
            title: "Shared Media",
            mediaKind: "image",
            position: { x: 0, y: 0 },
            size: { width: 100, height: 100 },
            rotation: 0,
            zIndex: 1,
          },
          {
            id: "media-2",
            type: "media",
            src: "blob:temporary-image",
            title: "Inline Media",
            mediaKind: "image",
            position: { x: 120, y: 0 },
            size: { width: 100, height: 100 },
            rotation: 0,
            zIndex: 2,
          },
        ],
        groups: [],
        nextZIndex: 3,
        selectedIds: [],
      },
    })

    const packed = await packCanvasDocumentAssets(projectsRoot, {
      projectId: "demo",
      path: "boards/media-board.canvas",
      document,
      sharedMediaRoot,
      assets: [
        {
          itemId: "media-2",
          field: "src",
          fileName: "inline.png",
          dataUrl: "data:image/png;base64,aW5saW5lLWltYWdl",
        },
      ],
    })

    const packedState = packed.document as CanvasStateSnapshot
    const packedItems = packedState.items.filter(
      (item): item is (typeof packedState.items)[number] & { type: "media"; src: string } =>
        item.type === "media"
    )
    expect(packedItems[0]?.src).toContain(
      "/api/projects/demo/canvases/assets/file?path=boards%2Fmedia-board.canvas&asset="
    )
    expect(packedItems[1]?.src).toContain(
      "/api/projects/demo/canvases/assets/file?path=boards%2Fmedia-board.canvas&asset=inline.png"
    )

    const sharedAssetName = decodeURIComponent(new URL(`http://localhost${packedItems[0]?.src}`).searchParams.get("asset") || "")
    const sharedAsset = await readCanvasDocumentAsset(
      projectsRoot,
      "demo",
      "boards/media-board.canvas",
      sharedAssetName
    )
    expect(sharedAsset.content.toString("utf8")).toBe("shared-image")

    const inlineAsset = await readCanvasDocumentAsset(
      projectsRoot,
      "demo",
      "boards/media-board.canvas",
      "inline.png"
    )
    expect(inlineAsset.content.toString("utf8")).toBe("inline-image")
  })

  it("rewrites, copies, and deletes document-local asset bundles when canvas paths change", async () => {
    const projectsRoot = await createTempProjectsRoot()
    const sharedMediaRoot = path.join(projectsRoot, ".canvas-media")
    await fs.mkdir(sharedMediaRoot, { recursive: true })
    await fs.writeFile(path.join(sharedMediaRoot, "shared.png"), Buffer.from("shared-image"))

    const document = buildCanvasFileDocument({
      projectId: "demo",
      title: "Media Board",
      document: {
        items: [
          {
            id: "media-1",
            type: "media",
            src: "/api/media/file/shared.png",
            title: "Shared Media",
            mediaKind: "image",
            position: { x: 0, y: 0 },
            size: { width: 100, height: 100 },
            rotation: 0,
            zIndex: 1,
          },
        ],
        groups: [],
        nextZIndex: 2,
        selectedIds: [],
      },
    })

    const packed = await packCanvasDocumentAssets(projectsRoot, {
      projectId: "demo",
      path: "boards/media-board.canvas",
      document,
      sharedMediaRoot,
    })

    const rewritten = rewriteCanvasDocumentAssetUrls(
      "demo",
      "boards/media-board.canvas",
      "archive/media-board-copy.canvas",
      packed
    )
    const rewrittenState = rewritten.document as CanvasStateSnapshot
    const mediaItem = rewrittenState.items[0]
    expect(mediaItem?.type).toBe("media")
    expect(mediaItem?.type === "media" ? mediaItem.src : "").toContain(
      "path=archive%2Fmedia-board-copy.canvas"
    )

    await copyCanvasDocumentAssets(
      projectsRoot,
      "demo",
      "boards/media-board.canvas",
      "archive/media-board-copy.canvas"
    )

    const assetName = decodeURIComponent(
      new URL(
        `http://localhost${mediaItem?.type === "media" ? mediaItem.src : ""}`
      ).searchParams.get("asset") || ""
    )
    const copiedAsset = await readCanvasDocumentAsset(
      projectsRoot,
      "demo",
      "archive/media-board-copy.canvas",
      assetName
    )
    expect(copiedAsset.content.toString("utf8")).toBe("shared-image")

    await deleteCanvasDocumentAssets(projectsRoot, "demo", "boards/media-board.canvas")
    await expect(
      readCanvasDocumentAsset(projectsRoot, "demo", "boards/media-board.canvas", assetName)
    ).rejects.toThrow()
  })

  it("imports nested HTML bundles and rewrites html item URLs when the canvas path changes", async () => {
    const projectsRoot = await createTempProjectsRoot()
    const imported = await importCanvasHtmlBundle(projectsRoot, {
      projectId: "demo",
      path: "boards/site.canvas",
      bundle: {
        title: "Landing Preview",
        files: [
          {
            relativePath: "index.html",
            dataUrl: "data:text/html;base64,PGh0bWw+PGJvZHk+SGVsbG88L2JvZHk+PC9odG1sPg==",
          },
          {
            relativePath: "styles/site.css",
            dataUrl: "data:text/css;base64,Ym9keSB7IGJhY2tncm91bmQ6ICNmZmY7IH0=",
          },
          {
            relativePath: "scripts/app.js",
            dataUrl: "data:text/javascript;base64,Y29uc29sZS5sb2coJ2hlbGxvJyk7",
          },
        ],
      },
    })

    expect(imported.entryAsset).toMatch(/^html\//)
    expect(imported.entryUrl).toContain("path=boards%2Fsite.canvas")
    expect(imported.assetCount).toBe(3)

    const entryAsset = await readCanvasDocumentAsset(
      projectsRoot,
      "demo",
      "boards/site.canvas",
      imported.entryAsset
    )
    expect(entryAsset.content.toString("utf8")).toContain("<body>Hello</body>")

    const nestedCssAsset = await readCanvasDocumentAsset(
      projectsRoot,
      "demo",
      "boards/site.canvas",
      `${imported.assetRoot}/styles/site.css`
    )
    expect(nestedCssAsset.content.toString("utf8")).toContain("background")

    const document = buildCanvasFileDocument({
      projectId: "demo",
      title: "Landing Preview",
      document: {
        items: [
          {
            id: "html-1",
            type: "html",
            src: imported.entryUrl,
            title: "Landing Preview",
            entryAsset: imported.entryAsset,
            position: { x: 0, y: 0 },
            size: { width: 640, height: 400 },
            rotation: 0,
            zIndex: 1,
          },
        ],
        groups: [],
        nextZIndex: 2,
        selectedIds: [],
      },
    })

    const rewritten = rewriteCanvasDocumentAssetUrls(
      "demo",
      "boards/site.canvas",
      "archive/site-copy.canvas",
      document
    )
    const rewrittenItem = (rewritten.document as CanvasStateSnapshot).items[0]
    expect(rewrittenItem?.type).toBe("html")
    expect(rewrittenItem?.type === "html" ? rewrittenItem.src : "").toContain(
      "path=archive%2Fsite-copy.canvas"
    )
  })

  it("scans a local HTML bundle library and returns bundle directories with entry files", async () => {
    const projectsRoot = await createTempProjectsRoot()
    const libraryRoot = path.join(projectsRoot, "playground")
    await fs.mkdir(path.join(libraryRoot, "landing"), { recursive: true })
    await fs.mkdir(path.join(libraryRoot, "cards", "pricing"), { recursive: true })
    await fs.mkdir(path.join(libraryRoot, "node_modules", "ignored"), { recursive: true })

    await fs.writeFile(path.join(libraryRoot, "landing", "index.html"), "<html>landing</html>")
    await fs.writeFile(path.join(libraryRoot, "landing", "preview.html"), "<html>preview</html>")
    await fs.writeFile(path.join(libraryRoot, "cards", "pricing", "demo.html"), "<html>pricing</html>")
    await fs.writeFile(path.join(libraryRoot, "node_modules", "ignored", "index.html"), "<html>ignore</html>")

    const scanned = await scanCanvasHtmlBundleLibrary(libraryRoot)

    expect(scanned.rootPath).toBe(libraryRoot)
    expect(scanned.entries.map((entry) => entry.relativeDirectory)).toEqual([
      "cards/pricing",
      "landing",
    ])
    expect(scanned.entries[0]).toMatchObject({
      relativeDirectory: "cards/pricing",
      entryFiles: ["demo.html"],
      defaultEntryFile: "demo.html",
    })
    expect(scanned.entries[1]).toMatchObject({
      relativeDirectory: "landing",
      entryFiles: ["index.html", "preview.html"],
      defaultEntryFile: "index.html",
    })
  })

  it("imports inline html bundles from plain text content without base64 payloads", async () => {
    const projectsRoot = await createTempProjectsRoot()
    const imported = await importCanvasHtmlBundle(projectsRoot, {
      projectId: "demo",
      path: "boards/text-only.canvas",
      bundle: {
        title: "Text Authored Bundle",
        files: [
          {
            relativePath: "index.html",
            textContent:
              '<!doctype html><html><head><link rel="stylesheet" href="./styles.css"></head><body><h1>Hello</h1><script type="module" src="./app.js"></script></body></html>',
          },
          {
            relativePath: "styles.css",
            textContent: "body { background: #fff; color: #111; }",
          },
          {
            relativePath: "app.js",
            textContent: 'document.body.dataset.ready = "true";',
          },
        ],
      },
    })

    expect(imported.entryUrl).toContain("path=boards%2Ftext-only.canvas")
    expect(imported.assetCount).toBe(3)

    const htmlAsset = await readCanvasDocumentAsset(
      projectsRoot,
      "demo",
      "boards/text-only.canvas",
      imported.entryAsset
    )
    expect(htmlAsset.content.toString("utf8")).toContain("<h1>Hello</h1>")
    expect(htmlAsset.mimeType).toContain("text/html")

    const scriptAsset = await readCanvasDocumentAsset(
      projectsRoot,
      "demo",
      "boards/text-only.canvas",
      `${imported.assetRoot}/app.js`
    )
    expect(scriptAsset.content.toString("utf8")).toContain('dataset.ready = "true"')
    expect(scriptAsset.mimeType).toContain("text/javascript")
  })

  it("deletes the previous html bundle asset root when replacing an imported bundle", async () => {
    const projectsRoot = await createTempProjectsRoot()
    const firstImport = await importCanvasHtmlBundle(projectsRoot, {
      projectId: "demo",
      path: "boards/replaceable.canvas",
      bundle: {
        title: "Original Bundle",
        files: [
          {
            relativePath: "index.html",
            textContent: "<!doctype html><html><body><h1>Original</h1></body></html>",
          },
          {
            relativePath: "styles.css",
            textContent: "body { color: red; }",
          },
        ],
      },
    })

    const secondImport = await importCanvasHtmlBundle(projectsRoot, {
      projectId: "demo",
      path: "boards/replaceable.canvas",
      bundle: {
        title: "Updated Bundle",
        replaceEntryAsset: firstImport.entryAsset,
        files: [
          {
            relativePath: "index.html",
            textContent: "<!doctype html><html><body><h1>Updated</h1></body></html>",
          },
          {
            relativePath: "styles.css",
            textContent: "body { color: green; }",
          },
        ],
      },
    })

    expect(secondImport.entryAsset).not.toBe(firstImport.entryAsset)

    await expect(
      readCanvasDocumentAsset(
        projectsRoot,
        "demo",
        "boards/replaceable.canvas",
        firstImport.entryAsset
      )
    ).rejects.toThrow()

    const replacementAsset = await readCanvasDocumentAsset(
      projectsRoot,
      "demo",
      "boards/replaceable.canvas",
      secondImport.entryAsset
    )
    expect(replacementAsset.content.toString("utf8")).toContain("<h1>Updated</h1>")
  })
})
