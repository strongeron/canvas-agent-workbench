// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import { CanvasMediaPropsPanel } from "../components/canvas/CanvasMediaPropsPanel"

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

function setInputValue(element: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
  setter?.call(element, value)
  element.dispatchEvent(new Event("input", { bubbles: true }))
  element.dispatchEvent(new Event("change", { bubbles: true }))
}

describe("CanvasMediaPropsPanel", () => {
  let harness: Harness | null = null

  afterEach(() => {
    harness?.cleanup()
    harness = null
  })

  it("updates clip start from the slider control", async () => {
    const onChange = vi.fn()
    harness = await mount(
      <CanvasMediaPropsPanel
        src="video.mp4"
        mediaKind="video"
        controls={true}
        muted={true}
        clipStartSec={2}
        clipEndSec={10}
        onChange={onChange}
        onDelete={() => {}}
        onClose={() => {}}
      />
    )

    const slider = harness.container.querySelector(
      'input[aria-label="Clip start slider"]'
    ) as HTMLInputElement
    expect(slider).toBeTruthy()

    await act(async () => {
      setInputValue(slider, "6.5")
      await Promise.resolve()
    })

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        clipStartSec: 6.5,
      })
    )
  })

  it("updates clip end from the slider control", async () => {
    const onChange = vi.fn()
    harness = await mount(
      <CanvasMediaPropsPanel
        src="video.mp4"
        mediaKind="video"
        controls={true}
        muted={true}
        clipStartSec={2}
        clipEndSec={10}
        onChange={onChange}
        onDelete={() => {}}
        onClose={() => {}}
      />
    )

    const slider = harness.container.querySelector(
      'input[aria-label="Clip end slider"]'
    ) as HTMLInputElement
    expect(slider).toBeTruthy()

    await act(async () => {
      setInputValue(slider, "18.2")
      await Promise.resolve()
    })

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        clipEndSec: 18.2,
      })
    )
  })
})
