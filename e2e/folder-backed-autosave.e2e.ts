import { promises as fs } from "node:fs"
import path from "node:path"

import { expect, test } from "@playwright/test"

import {
  addArtboard,
  cleanupHarnessState,
  DEMO_CANVASES_DIR,
  openCanvas,
} from "./helpers"

// FOX2-71 (FB-1): a canvas is always folder-backed. The first document
// mutation on an unsaved board materializes a real `.canvas` file; later
// mutations autosave into that same file instead of creating more.

async function listUntitledCanvasFiles() {
  const entries = await fs.readdir(DEMO_CANVASES_DIR).catch(() => [] as string[])
  return entries.filter((name) => /^untitled(-\d+)?\.canvas$/.test(name)).sort()
}

async function readCanvasDocument(fileName: string) {
  const raw = await fs.readFile(path.join(DEMO_CANVASES_DIR, fileName), "utf8")
  return JSON.parse(raw) as {
    meta: { title: string }
    document: { items: Array<{ id: string; type: string }> }
  }
}

test.afterEach(({ request }) => cleanupHarnessState(request))

test.describe("folder-backed autosave (FOX2-71)", () => {
  test("first mutation materializes an Untitled .canvas file with the mutated content", async ({
    page,
  }) => {
    await openCanvas(page)
    expect(await listUntitledCanvasFiles()).toEqual([])

    await addArtboard(page)

    await expect.poll(listUntitledCanvasFiles).toEqual(["untitled.canvas"])
    const file = await readCanvasDocument("untitled.canvas")
    expect(file.meta.title).toBe("Untitled")
    expect(file.document.items.some((item) => item.type === "artboard")).toBe(true)
  })

  test("later mutations autosave into the same file instead of creating more", async ({
    page,
  }) => {
    await openCanvas(page)
    await addArtboard(page)
    await expect.poll(listUntitledCanvasFiles).toEqual(["untitled.canvas"])

    await addArtboard(page)

    // The 900ms autosave debounce lands the second artboard in the same file.
    await expect
      .poll(async () => (await readCanvasDocument("untitled.canvas")).document.items.length, {
        timeout: 15_000,
      })
      .toBe(2)
    expect(await listUntitledCanvasFiles()).toEqual(["untitled.canvas"])
  })

  test("browsing and panning a project never creates files", async ({ page }) => {
    await openCanvas(page)

    // Pan the empty board (transform-only change).
    await page.mouse.move(720, 450)
    await page.keyboard.down("Space")
    await page.mouse.down()
    await page.mouse.move(820, 520)
    await page.mouse.up()
    await page.keyboard.up("Space")

    // Give any (incorrect) materialize a moment to fire before asserting.
    await page.waitForTimeout(1_500)
    expect(await listUntitledCanvasFiles()).toEqual([])
  })
})
