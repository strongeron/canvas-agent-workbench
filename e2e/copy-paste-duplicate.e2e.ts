import { expect, test } from "@playwright/test"

import {
  addArtboard,
  addAssetViaMenu,
  artboardChildCount,
  openCanvas,
  undo,
} from "./helpers"

const MOD = process.platform === "darwin" ? "Meta" : "Control"

// FOX2-59 methods 1 & 2: duplicate-in-place and copy/paste into the artboard.
test.describe("clipboard + duplicate", () => {
  test("duplicate-in-place adds a sibling into the same artboard flow", async ({ page }) => {
    await openCanvas(page)
    const artboard = await addArtboard(page)
    await addAssetViaMenu(page, artboard, "markdown")
    await expect.poll(() => artboardChildCount(artboard)).toBe(1)

    // Select the child, then Cmd-D.
    const child = artboard.locator('[data-artboard-child="true"] [data-canvas-item-id]').first()
    await child.click()
    await page.keyboard.press(`${MOD}+d`)

    await expect.poll(() => artboardChildCount(artboard)).toBe(2)
    // And it is undoable as one document entry.
    await undo(page)
    await expect.poll(() => artboardChildCount(artboard)).toBe(1)
  })

  test("copy then paste inserts into the selected artboard", async ({ page }) => {
    await openCanvas(page)
    const artboard = await addArtboard(page)
    await addAssetViaMenu(page, artboard, "markdown")
    await expect.poll(() => artboardChildCount(artboard)).toBe(1)

    const child = artboard.locator('[data-artboard-child="true"] [data-canvas-item-id]').first()
    await child.click()
    await page.keyboard.press(`${MOD}+c`)
    await page.keyboard.press(`${MOD}+v`)

    await expect.poll(() => artboardChildCount(artboard)).toBe(2)
  })
})
