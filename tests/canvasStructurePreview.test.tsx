// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"

import { CanvasStructurePreview } from "../components/canvas/CanvasStructurePreview"

interface Harness {
  container: HTMLDivElement
  root: Root
  cleanup: () => void
}

const originalActEnvironmentDescriptor = Object.getOwnPropertyDescriptor(
  globalThis,
  "IS_REACT_ACT_ENVIRONMENT"
)

beforeAll(() => {
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
    configurable: true,
    writable: true,
    value: true,
  })
})

afterAll(() => {
  if (originalActEnvironmentDescriptor) {
    Object.defineProperty(
      globalThis,
      "IS_REACT_ACT_ENVIRONMENT",
      originalActEnvironmentDescriptor
    )
  } else {
    delete (globalThis as { IS_REACT_ACT_ENVIRONMENT?: unknown })
      .IS_REACT_ACT_ENVIRONMENT
  }
})

async function mount(element: React.ReactElement): Promise<Harness> {
  const container = document.createElement("div")
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(element)
  })
  return {
    container,
    root,
    cleanup: () => {
      act(() => root.unmount())
      container.remove()
    },
  }
}

describe("CanvasStructurePreview", () => {
  let harness: Harness | null = null

  afterEach(() => {
    harness?.cleanup()
    harness = null
  })

  it("renders a flex-row layout deterministically", async () => {
    harness = await mount(
      <CanvasStructurePreview
        layout={{ display: "flex", direction: "row", gap: 16 }}
      />
    )
    const preview = harness.container.querySelector(
      '[data-testid="canvas-structure-preview"]'
    ) as HTMLElement
    expect(preview.getAttribute("data-display")).toBe("flex")
    expect(preview.getAttribute("data-direction")).toBe("row")
    expect(preview.getAttribute("data-columns")).toBeNull()
    expect(
      harness.container.querySelectorAll(
        '[data-testid="canvas-structure-cell"]'
      ).length
    ).toBe(3)
  })

  it("renders a flex-column layout deterministically", async () => {
    harness = await mount(
      <CanvasStructurePreview
        layout={{ display: "flex", direction: "column", gap: 8 }}
      />
    )
    const preview = harness.container.querySelector(
      '[data-testid="canvas-structure-preview"]'
    ) as HTMLElement
    expect(preview.getAttribute("data-display")).toBe("flex")
    expect(preview.getAttribute("data-direction")).toBe("column")
    expect(
      harness.container.querySelectorAll(
        '[data-testid="canvas-structure-cell"]'
      ).length
    ).toBe(3)
  })

  it("renders a 3-column grid as a column-count grid", async () => {
    harness = await mount(
      <CanvasStructurePreview
        layout={{ display: "grid", columns: 3, gap: 16 }}
      />
    )
    const preview = harness.container.querySelector(
      '[data-testid="canvas-structure-preview"]'
    ) as HTMLElement
    expect(preview.getAttribute("data-display")).toBe("grid")
    expect(preview.getAttribute("data-columns")).toBe("3")
    expect(preview.getAttribute("data-direction")).toBeNull()
    // grid renders two rows worth of cells (columns * 2).
    expect(
      harness.container.querySelectorAll(
        '[data-testid="canvas-structure-cell"]'
      ).length
    ).toBe(6)
  })

  it("renders a 5-column grid (clamped) deterministically", async () => {
    harness = await mount(
      <CanvasStructurePreview
        layout={{ display: "grid", columns: 5, gap: 24 }}
      />
    )
    const preview = harness.container.querySelector(
      '[data-testid="canvas-structure-preview"]'
    ) as HTMLElement
    expect(preview.getAttribute("data-columns")).toBe("5")
    expect(
      harness.container.querySelectorAll(
        '[data-testid="canvas-structure-cell"]'
      ).length
    ).toBe(10)
  })

  it("clamps grid columns above 5 down to 5", async () => {
    harness = await mount(
      <CanvasStructurePreview
        layout={{ display: "grid", columns: 9, gap: 16 }}
      />
    )
    const preview = harness.container.querySelector(
      '[data-testid="canvas-structure-preview"]'
    ) as HTMLElement
    expect(preview.getAttribute("data-columns")).toBe("5")
  })

  it("reflects varying gap in the rendered container style", async () => {
    harness = await mount(
      <CanvasStructurePreview
        layout={{ display: "flex", direction: "row", gap: 40 }}
      />
    )
    const inner = harness.container.querySelector(
      '[data-testid="canvas-structure-preview"] > div'
    ) as HTMLElement
    // gap is clamped/scaled but must be a positive px value derived from layout.
    expect(inner.style.gap).toMatch(/px$/)
    expect(parseInt(inner.style.gap, 10)).toBeGreaterThan(0)
  })
})
