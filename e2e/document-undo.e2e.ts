import { expect, test } from "@playwright/test"

import {
  addArtboard,
  addAssetViaMenu,
  artboardChildCount,
  historyToast,
  openCanvas,
  undo,
} from "./helpers"

// FOX2-67: Cmd-Z now covers document-level operations, not just source edits.
test.describe("canvas-document undo", () => {
  test("undoes an add into an artboard in one step", async ({ page }) => {
    await openCanvas(page)
    const artboard = await addArtboard(page)

    await addAssetViaMenu(page, artboard, "markdown")
    await expect.poll(() => artboardChildCount(artboard)).toBe(1)

    await undo(page)
    await expect.poll(() => artboardChildCount(artboard)).toBe(0)
    await expect(historyToast(page)).toBeVisible()
  })

  test("undoes a freeform drag as a single coalesced gesture", async ({ page }) => {
    await openCanvas(page)
    // Add an artboard, then drag it — artboards are freeform on the open canvas.
    const artboard = await addArtboard(page)
    await artboard.click({ position: { x: 6, y: 6 } })

    const box = await artboard.boundingBox()
    if (!box) throw new Error("no artboard box")
    const startX = box.x + 6
    const startY = box.y + 6

    await page.mouse.move(startX, startY)
    await page.mouse.down()
    // Several move steps within one gesture — must coalesce to one undo entry.
    for (let i = 1; i <= 5; i++) {
      await page.mouse.move(startX + i * 20, startY + i * 8)
    }
    await page.mouse.up()

    const moved = await artboard.boundingBox()
    if (!moved) throw new Error("no moved box")
    expect(Math.abs(moved.x - box.x)).toBeGreaterThan(40)

    await undo(page)
    await expect
      .poll(async () => {
        const b = await artboard.boundingBox()
        return b ? Math.round(b.x) : null
      })
      .toBe(Math.round(box.x))
  })
})
