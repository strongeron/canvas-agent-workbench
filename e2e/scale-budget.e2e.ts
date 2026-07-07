import { expect, test } from "@playwright/test"

// FOX2-65: a scale guardrail, not a strict perf gate. Seeds a 200-node board
// via per-context localStorage (no disk writes), asserts it renders in full,
// and measures a pan against a generous, logged ceiling so a real regression
// shows up without CI flakiness from tight frame budgets.

const NODE_COUNT = 200

function seedDocument(count: number) {
  const items = Array.from({ length: count }, (_, i) => ({
    id: `scale-node-${i}`,
    type: "markdown",
    position: { x: (i % 20) * 360, y: Math.floor(i / 20) * 260 },
    size: { width: 320, height: 220 },
    rotation: 0,
    title: `Node ${i}`,
    source: `# Node ${i}\n\nScale fixture node.`,
  }))
  return JSON.stringify({ items, groups: [], nextZIndex: count + 1, selectedIds: [] })
}

test.describe("200-node scale budget", () => {
  test("renders a full 200-node board and pans within budget", async ({ page }) => {
    await page.addInitScript(
      ([key, value]) => {
        window.localStorage.setItem(key, value)
      },
      ["gallery-demo-state", seedDocument(NODE_COUNT)] as const
    )

    const renderStart = Date.now()
    await page.goto("/canvas?project=demo")
    const nodes = page.locator('[data-canvas-item-type="markdown"]')
    await expect(nodes).toHaveCount(NODE_COUNT, { timeout: 20_000 })
    const renderMs = Date.now() - renderStart

    // Pan the board with a burst of wheel events over the canvas surface.
    const surface = page.locator('[data-canvas-root="true"]')
    const box = await surface.boundingBox()
    if (!box) throw new Error("no canvas surface")
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    const panStart = Date.now()
    for (let i = 0; i < 12; i++) {
      await page.mouse.wheel(40, 60)
    }
    // Settle a frame, then confirm the board is still fully present.
    await page.waitForTimeout(100)
    const panMs = Date.now() - panStart

    await expect(nodes).toHaveCount(NODE_COUNT)

    // Generous ceilings — a guardrail. Tighten only with evidence.
    console.log(`SCALE_BUDGET render=${renderMs}ms pan(12 wheel)=${panMs}ms nodes=${NODE_COUNT}`)
    expect(renderMs, "200-node initial render").toBeLessThan(15_000)
    expect(panMs, "12-step wheel pan").toBeLessThan(4_000)
  })
})
