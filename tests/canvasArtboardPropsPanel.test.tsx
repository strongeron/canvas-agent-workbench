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
})
