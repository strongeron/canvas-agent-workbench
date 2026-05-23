// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { CanvasPropsPanel } from "../components/canvas/CanvasPropsPanel"

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

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  document.body.removeChild(container)
})

describe("CanvasPropsPanel", () => {
  it("explains that library component instances are props-backed", () => {
    act(() => {
      root.render(
        <CanvasPropsPanel
          componentName="Card"
          variantName="Default"
          variantIndex={0}
          component={{
            name: "Card",
            variants: [
              {
                name: "Default",
                description: "Default card",
                category: "ui",
                props: {},
                code: "<Card />",
              },
            ],
          }}
          schema={null}
          values={{ title: "Card" }}
          onChange={vi.fn()}
          onReset={vi.fn()}
          onDelete={vi.fn()}
          onClose={vi.fn()}
          onVariantChange={vi.fn()}
        />
      )
    })

    expect(container.textContent).toContain("This is a props-backed component instance.")
    expect(container.textContent).toContain("native HTML component shell")
  })
})
