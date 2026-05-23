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
    const onCreateEditableShell = vi.fn()
    const onReplaceWithEditableShell = vi.fn()
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
          onCreateEditableShell={onCreateEditableShell}
          onReplaceWithEditableShell={onReplaceWithEditableShell}
        />
      )
    })

    expect(container.textContent).toContain("This is a props-backed component instance.")
    expect(container.textContent).toContain("native HTML component shell")
    const replaceButton = Array.from(container.querySelectorAll("button")).find(
      (candidate) => candidate.textContent?.trim() === "Replace with editable shell"
    ) as HTMLButtonElement | undefined
    expect(replaceButton).toBeTruthy()
    const openButton = Array.from(container.querySelectorAll("button")).find(
      (candidate) => candidate.textContent?.trim() === "Open native shells"
    ) as HTMLButtonElement | undefined
    expect(openButton).toBeTruthy()

    act(() => {
      replaceButton?.click()
      openButton?.click()
    })

    expect(onReplaceWithEditableShell).toHaveBeenCalledTimes(1)
    expect(onCreateEditableShell).toHaveBeenCalledTimes(1)
  })
})
