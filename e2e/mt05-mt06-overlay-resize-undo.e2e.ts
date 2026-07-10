import { expect, test } from "@playwright/test"

import {
  addArtboard,
  addAssetViaMenu,
  cleanupHarnessState,
  openCanvas,
  setTool,
  undo,
} from "./helpers"

/**
 * MT-05 / MT-06 (FOX2-39) — overlay element resize + single-step undo.
 *
 * Held as `fixme` after a genuine attempt (FOX2-64). Everything up to the
 * drag is drivable and asserted below: Edit mode, clicking an element inside
 * the node's iframe selects it (posts `canvas/select`), and the parent-DOM
 * selection overlay renders with its resize handles
 * (`[data-canvas-overlay-handle="se"]`).
 *
 * The blocker is the drag itself: the overlay handle commits its resize via
 * `setPointerCapture(pointerId)` (CanvasIframeOverlay.beginDrag). Pointer
 * drags synthesised from Playwright's `page.mouse` do not deliver captured
 * pointermove/up to the handle in headless Chromium, so `onDragCommit` never
 * fires — the overlay dimensions stay put, no mutation-log entry is written,
 * and Cmd-Z has nothing to revert (verified: overlay 654×30 unchanged, zero
 * "Undid:" toast, no page error). Revisit with a CDP `Input.dispatch* ` pointer
 * sequence carrying a stable pointerId, or a test hook that invokes the resize
 * commit path directly.
 */
test.afterEach(({ request }) => cleanupHarnessState(request))

test.describe("MT-05 / MT-06 overlay resize undo", () => {
  test("selects an element in edit mode and shows the resize overlay", async ({ page }) => {
    await openCanvas(page)
    const artboard = await addArtboard(page)
    await addAssetViaMenu(page, artboard, "html")

    const node = artboard.locator('[data-artboard-child="true"] [data-canvas-item-id]').first()
    await node.locator("iframe").waitFor()
    await setTool(page, "edit")
    await node.frameLocator("iframe").locator("h1").first().click()

    await expect(page.locator('[data-testid="canvas-iframe-overlay"]')).toBeVisible()
    await expect(page.locator('[data-canvas-overlay-handle="se"]')).toBeVisible()
  })

  test.fixme("MT-05: SE-handle resize reverts in one Cmd-Z", async ({ page }) => {
    await openCanvas(page)
    const artboard = await addArtboard(page)
    await addAssetViaMenu(page, artboard, "html")
    const node = artboard.locator('[data-artboard-child="true"] [data-canvas-item-id]').first()
    await node.locator("iframe").waitFor()
    await setTool(page, "edit")
    await node.frameLocator("iframe").locator("h1").first().click()

    const overlay = page.locator('[data-testid="canvas-iframe-overlay"]')
    const before = await overlay.boundingBox()
    const handle = page.locator('[data-canvas-overlay-handle="se"]')
    const hb = await handle.boundingBox()
    if (!before || !hb) throw new Error("no overlay/handle box")

    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2)
    await page.mouse.down()
    await page.mouse.move(hb.x + 60, hb.y + 40, { steps: 8 })
    await page.mouse.up()

    const after = await overlay.boundingBox()
    expect(after!.width).toBeGreaterThan(before.width) // <- blocked: capture drag no-ops

    await undo(page)
    await expect
      .poll(async () => Math.round((await overlay.boundingBox())!.width))
      .toBe(Math.round(before.width))
  })

  test.fixme("MT-06: group resize of two elements reverts with one Cmd-Z", async ({ page }) => {
    // Same setup + a shift-click on the <p>, then drag the shared handle.
    // Blocked by the same setPointerCapture drag limitation as MT-05.
  })
})
