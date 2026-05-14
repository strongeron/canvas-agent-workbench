// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import { PropControl } from "../components/PropControl"

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

describe("PropControl", () => {
  let harness: Harness | null = null

  afterEach(() => {
    harness?.cleanup()
    harness = null
  })

  it("scrubs number props horizontally", async () => {
    const onChange = vi.fn()
    harness = await mount(
      <PropControl
        name="gap"
        schema={{ type: "number", label: "Gap", min: 0, max: 10, step: 1 }}
        value={5}
        onChange={onChange}
      />
    )

    const scrubButton = harness.container.querySelector('button[aria-label="Scrub Gap"]') as HTMLButtonElement
    expect(scrubButton).toBeTruthy()

    await act(async () => {
      scrubButton.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 100 }))
      await Promise.resolve()
    })

    await act(async () => {
      document.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 124 }))
      document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }))
      await Promise.resolve()
    })

    expect(onChange).toHaveBeenCalledWith(7)
  })

  it("clamps scrubbed number props to schema bounds", async () => {
    const onChange = vi.fn()
    harness = await mount(
      <PropControl
        name="gap"
        schema={{ type: "number", label: "Gap", min: 0, max: 10, step: 2 }}
        value={9}
        onChange={onChange}
      />
    )

    const scrubButton = harness.container.querySelector('button[aria-label="Scrub Gap"]') as HTMLButtonElement
    expect(scrubButton).toBeTruthy()

    await act(async () => {
      scrubButton.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 100 }))
      await Promise.resolve()
    })

    await act(async () => {
      document.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 136 }))
      document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }))
      await Promise.resolve()
    })

    expect(onChange).toHaveBeenCalledWith(10)
  })

  it("does not render scrub UI for non-numeric props", async () => {
    harness = await mount(
      <PropControl
        name="title"
        schema={{ type: "text", label: "Title" }}
        value="Hello"
        onChange={vi.fn()}
      />
    )

    const scrubButton = harness.container.querySelector('button[aria-label="Scrub Title"]')
    expect(scrubButton).toBeNull()
  })
})
