// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import { CanvasMermaidPropsPanel } from "../components/canvas/CanvasMermaidPropsPanel"

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

describe("CanvasMermaidPropsPanel", () => {
  let harness: Harness | null = null

  afterEach(() => {
    harness?.cleanup()
    harness = null
  })

  it("surfaces editable node labels and patches the mermaid source", async () => {
    const onChange = vi.fn()
    harness = await mount(
      <CanvasMermaidPropsPanel
        source={`flowchart LR
  A[Start] --> B{Need references?}
  B --> C[Search]`}
        onChange={onChange}
        onDelete={() => {}}
        onClose={() => {}}
      />
    )

    const inputs = Array.from(harness.container.querySelectorAll("input"))
    const labelInput = inputs.find((input) => input.value === "Need references?") as HTMLInputElement
    expect(labelInput).toBeTruthy()

    await act(async () => {
      setInputValue(labelInput, "Review")
      await Promise.resolve()
    })

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        source: expect.stringContaining("B{Review}"),
      })
    )
  })
})
