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

  // FOX2-69 (FB-2): pasting an image into a fresh project canvas
  // materializes the file and stores the asset in the canvas's own
  // `.assets/<canvas-name>/` — never silently in the shared media store.
  test("pasted image lands in the canvas's .assets and the document references it", async ({
    page,
  }) => {
    await openCanvas(page)

    await page.evaluate(() => {
      // 1×1 transparent PNG.
      const base64 =
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
      const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
      const file = new File([bytes], "e2e-pasted-shot.png", { type: "image/png" })
      const transfer = new DataTransfer()
      transfer.items.add(file)
      window.dispatchEvent(new ClipboardEvent("paste", { clipboardData: transfer }))
    })

    await expect.poll(listUntitledCanvasFiles).toEqual(["untitled.canvas"])
    await expect
      .poll(async () => {
        const assetDir = path.join(DEMO_CANVASES_DIR, ".assets", "untitled")
        const entries = await fs.readdir(assetDir, { recursive: true }).catch(() => [] as string[])
        return entries.some((entry) => String(entry).includes("e2e-pasted-shot"))
      })
      .toBe(true)

    // The media item reaches the document via the 900ms autosave; its src is
    // the document-asset URL (`/api/projects/demo/canvases/assets/file?...`),
    // not a shared-media-store URL.
    await expect
      .poll(
        async () => {
          const doc = await readCanvasDocument("untitled.canvas")
          const media = doc.document.items.find((item) => item.type === "media") as
            | { type: string; src?: string }
            | undefined
          return media?.src ?? ""
        },
        { timeout: 15_000 }
      )
      .toContain("/canvases/assets/file")
  })

  // FOX2-70 (FB-3): save failures retry with bounded backoff, then stop in a
  // loud persistent state; Retry recovers once the backend heals.
  test("save failures surface a persistent Couldn't-save state and Retry recovers", async ({
    page,
  }) => {
    await openCanvas(page)
    await addArtboard(page)
    await expect.poll(listUntitledCanvasFiles).toEqual(["untitled.canvas"])

    await page.route("**/api/projects/demo/canvases/save", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, error: "Injected save failure (e2e)" }),
      })
    )
    await addArtboard(page)

    // Three attempts at 900/1800/3600ms land in the exhausted failed state.
    await expect(page.getByTestId("canvas-save-failed-banner")).toBeVisible({
      timeout: 20_000,
    })

    await page.unroute("**/api/projects/demo/canvases/save")
    await page.getByRole("button", { name: "Retry save" }).click()
    await expect(page.getByTestId("canvas-save-failed-banner")).toHaveCount(0)
    await expect
      .poll(
        async () => (await readCanvasDocument("untitled.canvas")).document.items.length,
        { timeout: 15_000 }
      )
      .toBe(2)
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
