import { readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import { buildCanvasAssetFileName } from "../utils/canvasFileAssetName"

const ROOT = path.resolve(__dirname, "..")

// Regression guard (FOX2-64): the client canvas bundle must not pull in
// node:fs. useCanvasFilePersistence imports buildCanvasAssetFileName; that
// helper therefore has to live in a browser-safe module. A stray `node:fs`
// import here (or re-adding the import to the client hook) throws
// "Module node:fs has been externalized" the moment the canvas loads in a
// browser — a crash vitest's node env cannot otherwise catch.
describe("canvasFileAssetName is browser-safe", () => {
  it("builds names without any Node built-in imports", () => {
    const source = readFileSync(path.join(ROOT, "utils/canvasFileAssetName.ts"), "utf8")
    expect(source).not.toMatch(/from\s+["']node:/)
    expect(source).not.toMatch(/require\(["']node:/)
  })

  it("keeps the client persistence hook off canvasFileAssets (which imports node:fs)", () => {
    const hook = readFileSync(path.join(ROOT, "hooks/useCanvasFilePersistence.ts"), "utf8")
    expect(hook).not.toMatch(/from\s+["']\.\.\/utils\/canvasFileAssets["']/)
    expect(hook).toMatch(/from\s+["']\.\.\/utils\/canvasFileAssetName["']/)
  })

  it("produces stable, id-suffixed asset names", () => {
    expect(buildCanvasAssetFileName("item-1", "src", "image.png", "image/png")).toBe(
      "image-item-1.png"
    )
    expect(buildCanvasAssetFileName("item-2", "src", undefined, "image/webp")).toBe(
      "item-2-src.webp"
    )
  })
})
