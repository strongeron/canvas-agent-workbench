// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import { CanvasArtboardItem } from "../components/canvas/CanvasArtboardItem"

vi.mock("@dnd-kit/core", () => ({
  useDroppable: () => ({
    setNodeRef: () => {},
    isOver: false,
  }),
}))

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

describe("CanvasArtboardItem", () => {
  let harness: Harness | null = null

  afterEach(() => {
    harness?.cleanup()
    harness = null
  })

  it("scrubs artboard gap from the selected-state handle", async () => {
    const onUpdate = vi.fn()
    harness = await mount(
      <CanvasArtboardItem
        item={{
          id: "artboard-1",
          type: "artboard",
          name: "Board",
          position: { x: 20, y: 40 },
          size: { width: 800, height: 600 },
          rotation: 0,
          zIndex: 1,
          background: "#ffffff",
          layout: {
            display: "flex",
            direction: "column",
            align: "stretch",
            justify: "start",
            gap: 16,
            padding: 24,
          },
        }}
        isSelected={true}
        onSelect={() => {}}
        onUpdate={onUpdate}
        onRemove={() => {}}
        onDuplicate={() => {}}
        onBringToFront={() => {}}
        scale={1}
        interactMode={false}
      >
        <div data-artboard-child="true">Child</div>
      </CanvasArtboardItem>
    )

    const scrubButton = harness.container.querySelector(
      'button[aria-label="Scrub artboard gap"]'
    ) as HTMLButtonElement
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

    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        layout: expect.objectContaining({
          gap: 22,
        }),
      })
    )
  })

  it("clamps artboard gap scrubbing at zero", async () => {
    const onUpdate = vi.fn()
    harness = await mount(
      <CanvasArtboardItem
        item={{
          id: "artboard-1",
          type: "artboard",
          name: "Board",
          position: { x: 20, y: 40 },
          size: { width: 800, height: 600 },
          rotation: 0,
          zIndex: 1,
          background: "#ffffff",
          layout: {
            display: "flex",
            direction: "column",
            align: "stretch",
            justify: "start",
            gap: 3,
            padding: 24,
          },
        }}
        isSelected={true}
        onSelect={() => {}}
        onUpdate={onUpdate}
        onRemove={() => {}}
        onDuplicate={() => {}}
        onBringToFront={() => {}}
        scale={1}
        interactMode={false}
      >
        <div data-artboard-child="true">Child</div>
      </CanvasArtboardItem>
    )

    const scrubButton = harness.container.querySelector(
      'button[aria-label="Scrub artboard gap"]'
    ) as HTMLButtonElement
    expect(scrubButton).toBeTruthy()

    await act(async () => {
      scrubButton.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 100 }))
      await Promise.resolve()
    })

    await act(async () => {
      document.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 80 }))
      document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }))
      await Promise.resolve()
    })

    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        layout: expect.objectContaining({
          gap: 0,
        }),
      })
    )
  })
})
