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

  it("brackets a drag cycle with onGestureStart and onGestureEnd('move-artboard')", async () => {
    const onGestureStart = vi.fn()
    const onGestureEnd = vi.fn()
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
        onUpdate={() => {}}
        onRemove={() => {}}
        onDuplicate={() => {}}
        onBringToFront={() => {}}
        onGestureStart={onGestureStart}
        onGestureEnd={onGestureEnd}
        scale={1}
        interactMode={false}
      >
        <div data-artboard-child="true">Child</div>
      </CanvasArtboardItem>
    )

    const artboardNode = harness.container.querySelector(
      '[data-canvas-item-id="artboard-1"]'
    ) as HTMLDivElement
    await act(async () => {
      artboardNode.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true, button: 0, clientX: 100, clientY: 100 })
      )
      await Promise.resolve()
    })
    expect(onGestureStart).toHaveBeenCalledTimes(1)
    expect(onGestureEnd).not.toHaveBeenCalled()

    await act(async () => {
      document.dispatchEvent(
        new MouseEvent("mousemove", { bubbles: true, clientX: 140, clientY: 120 })
      )
      document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }))
      await Promise.resolve()
    })

    expect(onGestureStart).toHaveBeenCalledTimes(1)
    expect(onGestureEnd).toHaveBeenCalledTimes(1)
    expect(onGestureEnd).toHaveBeenCalledWith("move-artboard")
  })

  it("ends a gap-scrub cycle with onGestureEnd('scrub-gap')", async () => {
    const onGestureStart = vi.fn()
    const onGestureEnd = vi.fn()
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
        onUpdate={() => {}}
        onRemove={() => {}}
        onDuplicate={() => {}}
        onBringToFront={() => {}}
        onGestureStart={onGestureStart}
        onGestureEnd={onGestureEnd}
        scale={1}
        interactMode={false}
      >
        <div data-artboard-child="true">Child</div>
      </CanvasArtboardItem>
    )

    const scrubButton = harness.container.querySelector(
      'button[aria-label="Scrub artboard gap"]'
    ) as HTMLButtonElement
    await act(async () => {
      scrubButton.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 100 }))
      await Promise.resolve()
    })
    await act(async () => {
      document.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 124 }))
      document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }))
      await Promise.resolve()
    })

    expect(onGestureStart).toHaveBeenCalledTimes(1)
    expect(onGestureEnd).toHaveBeenCalledTimes(1)
    expect(onGestureEnd).toHaveBeenCalledWith("scrub-gap")
  })

  it("opens the add menu from the selected-state Add button (FOX2-59 method 4)", async () => {
    const onAddMenuRequest = vi.fn()
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
        onUpdate={() => {}}
        onRemove={() => {}}
        onDuplicate={() => {}}
        onBringToFront={() => {}}
        scale={1}
        interactMode={false}
        onAddMenuRequest={onAddMenuRequest}
      >
        <div data-artboard-child="true">Child</div>
      </CanvasArtboardItem>
    )

    const addButton = harness.container.querySelector(
      'button[aria-label="Add to artboard"]'
    ) as HTMLButtonElement
    expect(addButton).toBeTruthy()

    await act(async () => {
      addButton.click()
    })

    expect(onAddMenuRequest).toHaveBeenCalledWith(
      expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) })
    )
  })

  it("hides the Add button when the artboard is not selected", async () => {
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
        isSelected={false}
        onSelect={() => {}}
        onUpdate={() => {}}
        onRemove={() => {}}
        onDuplicate={() => {}}
        onBringToFront={() => {}}
        scale={1}
        interactMode={false}
        onAddMenuRequest={() => {}}
      >
        <div data-artboard-child="true">Child</div>
      </CanvasArtboardItem>
    )

    expect(
      harness.container.querySelector('button[aria-label="Add to artboard"]')
    ).toBeNull()
  })

  it("offers Add here… in the context menu that reopens as the add menu", async () => {
    const onAddMenuRequest = vi.fn()
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
        onUpdate={() => {}}
        onRemove={() => {}}
        onDuplicate={() => {}}
        onBringToFront={() => {}}
        scale={1}
        interactMode={false}
        onAddMenuRequest={onAddMenuRequest}
      >
        <div data-artboard-child="true">Child</div>
      </CanvasArtboardItem>
    )

    const artboardNode = harness.container.querySelector(
      '[data-canvas-item-id="artboard-1"]'
    ) as HTMLDivElement
    await act(async () => {
      artboardNode.dispatchEvent(
        new MouseEvent("contextmenu", { bubbles: true, clientX: 150, clientY: 160 })
      )
    })

    const addHereButton = Array.from(
      document.body.querySelectorAll('[role="menuitem"]')
    ).find((button) => button.textContent?.includes("Add here…")) as HTMLButtonElement
    expect(addHereButton).toBeTruthy()

    await act(async () => {
      addHereButton.click()
    })
    // The context menu runs the action one frame after closing.
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
    })

    expect(onAddMenuRequest).toHaveBeenCalledWith({ x: 150, y: 160 })
  })
})
