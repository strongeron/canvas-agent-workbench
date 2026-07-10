import { expect, test } from "@playwright/test"

import {
  addArtboard,
  artboardChildCount,
  openAddMenu,
  cleanupHarnessState,
  openCanvas,
  selectArtboard,
} from "./helpers"

// FOX2-59 method 4: the artboard "+ Add" menu inserts assets into the flow.
test.afterEach(({ request }) => cleanupHarnessState(request))

test.describe("artboard add-menu", () => {
  test("grouped picker shows Components + Assets and adds an HTML node into the flow", async ({
    page,
  }) => {
    await openCanvas(page)
    const artboard = await addArtboard(page)
    await selectArtboard(page, artboard)
    await openAddMenu(page, artboard)

    const menu = page.locator('[data-artboard-add-menu="true"]')
    await expect(menu).toContainText("Components")
    await expect(menu).toContainText("Assets")
    await expect(menu.locator('[data-artboard-add-asset="html"]')).toBeVisible()
    await expect(menu.locator('[data-artboard-add-asset="markdown"]')).toBeVisible()

    const before = await artboardChildCount(artboard)
    await menu.locator('[data-artboard-add-asset="html"]').click()
    await expect(menu).toHaveCount(0)
    await expect
      .poll(() => artboardChildCount(artboard))
      .toBe(before + 1)
  })
})
