// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { CanvasArtboardAddMenu } from "../components/canvas/CanvasArtboardAddMenu"

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

const REGISTRY_PRIMITIVES = [
  {
    id: "button-primary",
    displayName: "Primary button",
    kind: "html",
    description: "A branded button",
  },
  {
    id: "card-basic",
    displayName: "Basic card",
    kind: "html",
    description: "A content card",
  },
]

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true, primitives: REGISTRY_PRIMITIVES }),
    }))
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
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

async function flushFrame() {
  await act(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
  })
}

function mountMenu(overrides: Partial<React.ComponentProps<typeof CanvasArtboardAddMenu>> = {}) {
  return mount(
    <CanvasArtboardAddMenu
      position={{ x: 100, y: 100 }}
      artboardName="Board"
      projectId="demo"
      onClose={() => {}}
      onAddPrimitive={() => {}}
      onAddAsset={() => {}}
      {...overrides}
    />
  )
}

describe("CanvasArtboardAddMenu", () => {
  let harness: Harness | null = null

  afterEach(() => {
    harness?.cleanup()
    harness = null
  })

  it("renders registry primitives grouped under Components plus the asset entries", async () => {
    harness = await mountMenu()

    const menu = document.body.querySelector('[data-artboard-add-menu="true"]')
    expect(menu).toBeTruthy()
    expect(menu?.textContent).toContain("Components")
    expect(menu?.textContent).toContain("Assets")
    expect(menu?.textContent).toContain("Primary button")
    expect(menu?.textContent).toContain("Basic card")
    expect(menu?.querySelector('[data-artboard-add-asset="html"]')).toBeTruthy()
    expect(menu?.querySelector('[data-artboard-add-asset="markdown"]')).toBeTruthy()
    expect(menu?.querySelector('[data-artboard-add-asset="mermaid"]')).toBeTruthy()
    expect(menu?.querySelector('[data-artboard-add-asset="media"]')).toBeTruthy()
    expect(menu?.querySelector('[data-artboard-add-asset="native-component"]')).toBeTruthy()
  })

  it("clicking a primitive closes the menu and reports the primitive", async () => {
    const onAddPrimitive = vi.fn()
    const onClose = vi.fn()
    harness = await mountMenu({ onAddPrimitive, onClose })

    const primitiveButton = document.body.querySelector(
      '[data-artboard-add-primitive="button-primary"]'
    ) as HTMLButtonElement
    expect(primitiveButton).toBeTruthy()

    await act(async () => {
      primitiveButton.click()
    })
    await flushFrame()

    expect(onClose).toHaveBeenCalled()
    expect(onAddPrimitive).toHaveBeenCalledWith(
      expect.objectContaining({ id: "button-primary" })
    )
  })

  it("clicking an asset entry reports its kind", async () => {
    const onAddAsset = vi.fn()
    harness = await mountMenu({ onAddAsset })

    const markdownButton = document.body.querySelector(
      '[data-artboard-add-asset="markdown"]'
    ) as HTMLButtonElement
    await act(async () => {
      markdownButton.click()
    })
    await flushFrame()

    expect(onAddAsset).toHaveBeenCalledWith("markdown")
  })

  it("closes on Escape", async () => {
    const onClose = vi.fn()
    harness = await mountMenu({ onClose })

    // Close listeners attach one frame after mount.
    await flushFrame()

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))
    })

    expect(onClose).toHaveBeenCalled()
  })

  it("surfaces a registry load failure inside the Components group", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        json: async () => ({ ok: false, error: "Registry unavailable." }),
      }))
    )
    harness = await mountMenu()

    const menu = document.body.querySelector('[data-artboard-add-menu="true"]')
    expect(menu?.textContent).toContain("Registry unavailable.")
    // Asset adds must stay available even when the registry is down.
    expect(menu?.querySelector('[data-artboard-add-asset="markdown"]')).toBeTruthy()
  })
})
