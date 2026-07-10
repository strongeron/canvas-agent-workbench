import { promises as fs } from "node:fs"
import path from "node:path"

import { expect, type APIRequestContext, type Locator, type Page } from "@playwright/test"

/**
 * Shared harness for the gesture e2e suite (FOX2-64). Everything runs against
 * the demo project WITHOUT opening a canvas file. Since FOX2-71, the first
 * document mutation materializes a real `untitled*.canvas` in the demo
 * project — every spec registers the cleanup hook below to keep the checkout,
 * the file index, and the server-side agent workspace state clean.
 */

export const DEMO_CANVASES_DIR = path.resolve(process.cwd(), "projects/demo/canvases")

const DEMO_WORKSPACE_KEY = "gallery-demo:canvas"

/** Remove `.canvas` files auto-created by draft materialization (FOX2-71). */
export async function cleanupMaterializedCanvasFiles() {
  const entries = await fs.readdir(DEMO_CANVASES_DIR).catch(() => [] as string[])
  await Promise.all(
    entries
      .filter((name) => /^untitled(-\d+)?\.canvas$/.test(name))
      .map((name) => fs.rm(path.join(DEMO_CANVASES_DIR, name), { force: true }))
  )
  // Derived cache — drop it so deleted files vanish from the index too.
  await fs.rm(path.join(DEMO_CANVASES_DIR, ".canvas-index.json"), { force: true })
}

/**
 * Full per-test cleanup. Register as
 * `test.afterEach(({ request }) => cleanupHarnessState(request))` in every
 * spec. Beyond the materialized files, this resets the dev server's
 * IN-MEMORY agent workspace state: every board up-syncs there
 * (`/api/agent-native/workspaces/canvas/state`), and the next test's empty
 * draft would otherwise hydrate the previous test's items into its board.
 */
export async function cleanupHarnessState(request: APIRequestContext) {
  await request
    .post("/api/agent-native/workspaces/canvas/state", {
      data: {
        workspaceKey: DEMO_WORKSPACE_KEY,
        clientId: "e2e-harness-cleanup",
        payload: {
          surface: "canvas",
          workspaceKey: DEMO_WORKSPACE_KEY,
          state: { items: [], groups: [], nextZIndex: 1, selectedIds: [] },
          selection: [],
          primitives: [],
          themeSnapshot: { themes: [], activeThemeId: null, tokenValues: {} },
          stateSummary: { itemCount: 0, groupCount: 0, selection: [] },
        },
      },
    })
    .catch(() => {
      // The server may already be gone at suite teardown — files still matter.
    })
  await cleanupMaterializedCanvasFiles()
}

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
