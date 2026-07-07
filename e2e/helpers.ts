import { expect, type Locator, type Page } from "@playwright/test"

/**
 * Shared harness for the gesture e2e suite (FOX2-64). Everything runs against
 * the demo project WITHOUT opening a canvas file, so state lives in the
 * Playwright context's localStorage and never writes to projects/ on disk.
 */

const MOD = process.platform === "darwin" ? "Meta" : "Control"

/** Cmd-Z (undo) / Cmd-Shift-Z (redo) with the OS-appropriate modifier. */
export async function undo(page: Page) {
  await page.keyboard.press(`${MOD}+z`)
}

export async function redo(page: Page) {
  await page.keyboard.press(`${MOD}+Shift+z`)
}

/** Open the demo canvas on an empty (per-context) localStorage board. */
export async function openCanvas(page: Page) {
  await page.goto("/canvas?project=demo")
  // The toolbar renders once the canvas shell is interactive.
  await expect(page.getByRole("button", { name: "Add artboard" })).toBeVisible()
}

/** Add an artboard via the toolbar and return its node locator. */
export async function addArtboard(page: Page): Promise<Locator> {
  const before = await page.locator('[data-canvas-item-type="artboard"]').count()
  await page.getByRole("button", { name: "Add artboard" }).click()
  const artboards = page.locator('[data-canvas-item-type="artboard"]')
  await expect(artboards).toHaveCount(before + 1)
  return artboards.last()
}

/** Select an artboard node (plain left click on its chrome). */
export async function selectArtboard(page: Page, artboard: Locator) {
  await artboard.click({ position: { x: 6, y: 6 } })
  await expect(artboard.getByRole("button", { name: "Add to artboard" })).toBeVisible()
}

/** Open the artboard add-menu via its chrome "+ Add" button. */
export async function openAddMenu(page: Page, artboard: Locator) {
  await artboard.getByRole("button", { name: "Add to artboard" }).click()
  await expect(page.locator('[data-artboard-add-menu="true"]')).toBeVisible()
}

/** Add an asset kind (html/markdown/mermaid) into an artboard via the menu. */
export async function addAssetViaMenu(
  page: Page,
  artboard: Locator,
  kind: "html" | "markdown" | "mermaid"
) {
  await selectArtboard(page, artboard)
  await openAddMenu(page, artboard)
  await page.locator(`[data-artboard-add-asset="${kind}"]`).click()
  await expect(page.locator('[data-artboard-add-menu="true"]')).toHaveCount(0)
}

/** Count the direct child nodes of an artboard. */
export function artboardChildCount(artboard: Locator): Promise<number> {
  return artboard.locator('[data-artboard-child="true"] [data-canvas-item-id]').count()
}

/** Switch the canvas tool via the toolbar. */
export async function setTool(page: Page, tool: "select" | "edit" | "interact") {
  const label =
    tool === "select"
      ? "Select canvas items"
      : tool === "edit"
        ? "Edit component elements"
        : "Interact with live previews"
  await page.getByRole("button", { name: label }).click()
}

/** The history toast text (e.g. "Undid: Move item"). */
export function historyToast(page: Page): Locator {
  return page.locator("text=/^(Undid|Redid):/")
}
