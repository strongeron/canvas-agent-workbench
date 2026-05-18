// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import { CanvasArtboardPropsPanel } from "../components/canvas/CanvasArtboardPropsPanel"

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
    Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", originalActEnvironmentDescriptor)
  } else {
    delete (globalThis as { IS_REACT_ACT_ENVIRONMENT?: unknown }).IS_REACT_ACT_ENVIRONMENT
  }
})

async function mount(element: React.ReactElement): Promise<Harness> {
  const container = document.createElement("div")
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(element)
  })
  await act(async () => {
    await Promise.resolve()
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

function dispatchInput(element: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
  setter?.call(element, value)
  element.dispatchEvent(new Event("input", { bubbles: true }))
  element.dispatchEvent(new Event("change", { bubbles: true }))
}

describe("CanvasArtboardPropsPanel", () => {
  let harness: Harness | null = null

  afterEach(() => {
    harness?.cleanup()
    harness = null
  })

  it("updates layout gap from the slider control", async () => {
    const onChange = vi.fn()
    harness = await mount(
      <CanvasArtboardPropsPanel
        name="Board"
        background="#ffffff"
        layout={{
          display: "flex",
          direction: "column",
          align: "stretch",
          justify: "start",
          gap: 16,
          padding: 24,
        }}
        size={{ width: 800, height: 600 }}
        onChange={onChange}
        onDelete={() => {}}
        onClose={() => {}}
      />
    )

    const slider = harness.container.querySelector('input[aria-label="Gap slider"]') as HTMLInputElement
    expect(slider).toBeTruthy()

    await act(async () => {
      dispatchInput(slider, "28")
      await Promise.resolve()
    })

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        layout: expect.objectContaining({
          gap: 28,
        }),
      })
    )
  })

  it("updates layout padding from the slider control", async () => {
    const onChange = vi.fn()
    harness = await mount(
      <CanvasArtboardPropsPanel
        name="Board"
        background="#ffffff"
        layout={{
          display: "grid",
          columns: 3,
          gap: 12,
          padding: 24,
        }}
        size={{ width: 800, height: 600 }}
        onChange={onChange}
        onDelete={() => {}}
        onClose={() => {}}
      />
    )

    const slider = harness.container.querySelector('input[aria-label="Padding slider"]') as HTMLInputElement
    expect(slider).toBeTruthy()

    await act(async () => {
      dispatchInput(slider, "40")
      await Promise.resolve()
    })

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        layout: expect.objectContaining({
          padding: 40,
          columns: 3,
        }),
      })
    )
  })

  it("updates columns through the Structure section grid control", async () => {
    const onChange = vi.fn()
    harness = await mount(
      <CanvasArtboardPropsPanel
        name="Board"
        background="#ffffff"
        layout={{ display: "grid", columns: 2, gap: 12, padding: 24 }}
        size={{ width: 800, height: 600 }}
        onChange={onChange}
        onDelete={() => {}}
        onClose={() => {}}
      />
    )

    const columns = harness.container.querySelector(
      'input[aria-label="Columns"]'
    ) as HTMLInputElement
    expect(columns).toBeTruthy()

    await act(async () => {
      dispatchInput(columns, "4")
      await Promise.resolve()
    })

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        layout: expect.objectContaining({ columns: 4, display: "grid" }),
      })
    )
  })

  it("updates the Structure gap and the preview reflects it", async () => {
    const onChange = vi.fn()
    harness = await mount(
      <CanvasArtboardPropsPanel
        name="Board"
        background="#ffffff"
        layout={{
          display: "flex",
          direction: "row",
          gap: 16,
          padding: 24,
        }}
        size={{ width: 800, height: 600 }}
        onChange={onChange}
        onDelete={() => {}}
        onClose={() => {}}
      />
    )

    const slider = harness.container.querySelector(
      'input[aria-label="Gap slider"]'
    ) as HTMLInputElement
    await act(async () => {
      dispatchInput(slider, "32")
      await Promise.resolve()
    })

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        layout: expect.objectContaining({ gap: 32 }),
      })
    )

    const preview = harness.container.querySelector(
      '[data-testid="canvas-structure-preview"]'
    ) as HTMLElement
    expect(preview).toBeTruthy()
    expect(preview.getAttribute("data-display")).toBe("flex")
    expect(preview.getAttribute("data-direction")).toBe("row")
  })

  it("has exactly ONE set of layout controls (old standalone block removed)", async () => {
    harness = await mount(
      <CanvasArtboardPropsPanel
        name="Board"
        background="#ffffff"
        layout={{ display: "grid", columns: 3, gap: 12, padding: 24 }}
        size={{ width: 800, height: 600 }}
        onChange={() => {}}
        onDelete={() => {}}
        onClose={() => {}}
      />
    )

    // Exactly one Structure section, one Flex/Grid group, one Columns input,
    // one Gap slider — no duplicate standalone layout block.
    expect(
      harness.container.querySelectorAll(
        '[data-testid="artboard-structure-section"]'
      ).length
    ).toBe(1)
    expect(
      harness.container.querySelectorAll('[role="group"][aria-label="Layout mode"]')
        .length
    ).toBe(1)
    expect(
      harness.container.querySelectorAll('input[aria-label="Columns"]').length
    ).toBe(1)
    expect(
      harness.container.querySelectorAll('input[aria-label="Gap slider"]').length
    ).toBe(1)
    // The legacy standalone "Layout" label must be gone.
    const labels = Array.from(
      harness.container.querySelectorAll("label")
    ).map((node) => node.textContent?.trim())
    expect(labels).not.toContain("Layout")
    expect(labels).toContain("Structure")
  })

  it("swaps the preview between flex and grid via the toggle", async () => {
    const onChange = vi.fn()
    harness = await mount(
      <CanvasArtboardPropsPanel
        name="Board"
        background="#ffffff"
        layout={{ display: "flex", direction: "column", gap: 16, padding: 24 }}
        size={{ width: 800, height: 600 }}
        onChange={onChange}
        onDelete={() => {}}
        onClose={() => {}}
      />
    )

    let preview = harness.container.querySelector(
      '[data-testid="canvas-structure-preview"]'
    ) as HTMLElement
    expect(preview.getAttribute("data-display")).toBe("flex")
    expect(preview.getAttribute("data-direction")).toBe("column")

    const gridButton = Array.from(
      harness.container.querySelectorAll("button")
    ).find((node) => node.textContent?.trim() === "Grid") as HTMLButtonElement
    await act(async () => {
      gridButton.click()
      await Promise.resolve()
    })

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        layout: expect.objectContaining({ display: "grid" }),
      })
    )

    // Re-render in grid mode and assert the preview becomes a column-count grid.
    await act(async () => {
      harness!.root.render(
        <CanvasArtboardPropsPanel
          name="Board"
          background="#ffffff"
          layout={{ display: "grid", columns: 3, gap: 16, padding: 24 }}
          size={{ width: 800, height: 600 }}
          onChange={onChange}
          onDelete={() => {}}
          onClose={() => {}}
        />
      )
      await Promise.resolve()
    })
    preview = harness.container.querySelector(
      '[data-testid="canvas-structure-preview"]'
    ) as HTMLElement
    expect(preview.getAttribute("data-display")).toBe("grid")
    expect(preview.getAttribute("data-columns")).toBe("3")
    expect(preview.getAttribute("data-direction")).toBeNull()
  })

  it("triggers the file-backed-create path for the selected artboard when a template is picked", async () => {
    const onChange = vi.fn()
    const onCreateStructureChild = vi.fn()
    harness = await mount(
      <CanvasArtboardPropsPanel
        name="Board"
        background="#ffffff"
        layout={{ display: "flex", direction: "column", gap: 16, padding: 24 }}
        size={{ width: 800, height: 600 }}
        onChange={onChange}
        onCreateStructureChild={onCreateStructureChild}
        onDelete={() => {}}
        onClose={() => {}}
      />
    )

    const cardButton = harness.container.querySelector(
      'button[aria-label="Add Card"]'
    ) as HTMLButtonElement
    expect(cardButton).toBeTruthy()
    expect(cardButton.disabled).toBe(false)

    await act(async () => {
      cardButton.click()
      await Promise.resolve()
    })
    expect(onCreateStructureChild).toHaveBeenCalledWith("card")

    const divPart = harness.container.querySelector(
      'button[aria-label="Add <div>"]'
    ) as HTMLButtonElement
    await act(async () => {
      divPart.click()
      await Promise.resolve()
    })
    expect(onCreateStructureChild).toHaveBeenCalledWith("div")
  })

  it("disables the picker when no artboard target is provided", async () => {
    const onCreate = vi.fn()
    harness = await mount(
      <CanvasArtboardPropsPanel
        name="Board"
        background="#ffffff"
        layout={{ display: "flex", direction: "column", gap: 16, padding: 24 }}
        size={{ width: 800, height: 600 }}
        onChange={() => {}}
        onDelete={() => {}}
        onClose={() => {}}
      />
    )

    const cardButton = harness.container.querySelector(
      'button[aria-label="Add Card"]'
    ) as HTMLButtonElement
    expect(cardButton.disabled).toBe(true)

    await act(async () => {
      cardButton.click()
      await Promise.resolve()
    })
    expect(onCreate).not.toHaveBeenCalled()
  })
})
