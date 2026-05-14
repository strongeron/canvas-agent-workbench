// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("@dnd-kit/core", () => ({
  useDroppable: () => ({
    setNodeRef: () => {},
    isOver: false,
  }),
}))

vi.mock("../components/canvas/CanvasArtboardItem", () => ({
  CanvasArtboardItem: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="artboard-shell">{children}</div>
  ),
}))

vi.mock("../components/canvas/CanvasLayoutComponentItem", () => ({
  CanvasLayoutComponentItem: ({ item }: { item: { id: string } }) => <div data-testid={item.id} />,
}))

vi.mock("../components/canvas/CanvasLayoutEmbedItem", () => ({
  CanvasLayoutEmbedItem: ({ item }: { item: { id: string } }) => <div data-testid={item.id} />,
}))

vi.mock("../components/canvas/CanvasLayoutHtmlItem", () => ({
  CanvasLayoutHtmlItem: ({ item }: { item: { id: string } }) => <div data-testid={item.id} />,
}))

vi.mock("../components/canvas/CanvasLayoutMediaItem", () => ({
  CanvasLayoutMediaItem: ({ item }: { item: { id: string } }) => <div data-testid={item.id} />,
}))

vi.mock("../components/canvas/CanvasLayoutMermaidItem", () => ({
  CanvasLayoutMermaidItem: ({ item }: { item: { id: string } }) => <div data-testid={item.id} />,
}))

vi.mock("../components/canvas/CanvasLayoutExcalidrawItem", () => ({
  CanvasLayoutExcalidrawItem: ({ item }: { item: { id: string } }) => <div data-testid={item.id} />,
}))

vi.mock("../components/canvas/CanvasLayoutMarkdownItem", () => ({
  CanvasLayoutMarkdownItem: ({ item }: { item: { id: string } }) => <div data-testid={item.id} />,
}))

vi.mock("../components/canvas/CanvasEmbedItem", () => ({
  CanvasEmbedItem: ({ item }: { item: { id: string } }) => <div data-testid={item.id} />,
}))

vi.mock("../components/canvas/CanvasHtmlItem", () => ({
  CanvasHtmlItem: ({ item }: { item: { id: string } }) => <div data-testid={item.id} />,
}))

vi.mock("../components/canvas/CanvasMediaItem", () => ({
  CanvasMediaItem: ({ item }: { item: { id: string } }) => <div data-testid={item.id} />,
}))

vi.mock("../components/canvas/CanvasMermaidItem", () => ({
  CanvasMermaidItem: ({ item }: { item: { id: string } }) => <div data-testid={item.id} />,
}))

vi.mock("../components/canvas/CanvasExcalidrawItem", () => ({
  CanvasExcalidrawItem: ({ item }: { item: { id: string } }) => <div data-testid={item.id} />,
}))

vi.mock("../components/canvas/CanvasMarkdownItem", () => ({
  CanvasMarkdownItem: ({ item }: { item: { id: string } }) => <div data-testid={item.id} />,
}))

vi.mock("../components/canvas/CanvasItem", () => ({
  CanvasItem: ({ item }: { item: { id: string } }) => <div data-testid={item.id} />,
}))

import { CanvasWorkspace } from "../components/canvas/CanvasWorkspace"

interface Harness {
  container: HTMLDivElement
  root: Root
  cleanup: () => void
}

const originalActEnvironmentDescriptor = Object.getOwnPropertyDescriptor(
  globalThis,
  "IS_REACT_ACT_ENVIRONMENT"
)
const originalRequestAnimationFrame = globalThis.requestAnimationFrame
const originalCancelAnimationFrame = globalThis.cancelAnimationFrame

beforeAll(() => {
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
    configurable: true,
    writable: true,
    value: true,
  })
  globalThis.requestAnimationFrame = ((callback: FrameRequestCallback) =>
    window.setTimeout(() => callback(performance.now()), 0)) as typeof requestAnimationFrame
  globalThis.cancelAnimationFrame = ((id: number) => {
    window.clearTimeout(id)
  }) as typeof cancelAnimationFrame
})

afterAll(() => {
  if (originalActEnvironmentDescriptor) {
    Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", originalActEnvironmentDescriptor)
  } else {
    delete (globalThis as { IS_REACT_ACT_ENVIRONMENT?: unknown }).IS_REACT_ACT_ENVIRONMENT
  }
  globalThis.requestAnimationFrame = originalRequestAnimationFrame
  globalThis.cancelAnimationFrame = originalCancelAnimationFrame
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

describe("CanvasWorkspace", () => {
  let harness: Harness | null = null

  afterEach(() => {
    harness?.cleanup()
    harness = null
  })

  it("shows live reorder controls for selected artboard children and wires move callbacks", async () => {
    const onMoveLayer = vi.fn()
    harness = await mount(
      <CanvasWorkspace
        items={[
          {
            id: "artboard-1",
            type: "artboard",
            name: "Board",
            position: { x: 20, y: 20 },
            size: { width: 600, height: 400 },
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
          },
          {
            id: "component-1",
            type: "component",
            componentId: "button",
            variantIndex: 0,
            position: { x: 0, y: 0 },
            size: { width: 180, height: 64 },
            rotation: 0,
            zIndex: 2,
            parentId: "artboard-1",
            order: 0,
          },
          {
            id: "component-2",
            type: "component",
            componentId: "button",
            variantIndex: 0,
            position: { x: 0, y: 0 },
            size: { width: 180, height: 64 },
            rotation: 0,
            zIndex: 3,
            parentId: "artboard-1",
            order: 1,
          },
        ]}
        groups={[]}
        transform={{ scale: 1, offset: { x: 0, y: 0 } }}
        interactMode={false}
        selectedIds={["component-1"]}
        onSelectItem={() => {}}
        onSelectItems={() => {}}
        onClearSelection={() => {}}
        onUpdateItem={() => {}}
        onRemoveItem={() => {}}
        onRemoveSelected={() => {}}
        onDuplicateItem={() => {}}
        onBringToFront={() => {}}
        onMoveLayer={onMoveLayer}
        onPan={() => {}}
        onWheel={() => {}}
        getGroupBounds={() => null}
        Renderer={({ componentName }) => <div>{componentName}</div>}
        getComponentById={() =>
          ({
            id: "button",
            name: "Button",
            category: "Actions",
            importPath: "@/components/Button",
            variants: [{ name: "Default", description: "", props: {}, category: "default" }],
          }) as any
        }
      />
    )

    const moveUpButton = harness.container.querySelector(
      'button[aria-label="Move child up"]'
    ) as HTMLButtonElement
    const moveDownButton = harness.container.querySelector(
      'button[aria-label="Move child down"]'
    ) as HTMLButtonElement

    expect(moveUpButton).toBeTruthy()
    expect(moveDownButton).toBeTruthy()
    expect(moveUpButton.disabled).toBe(true)
    expect(moveDownButton.disabled).toBe(false)

    await act(async () => {
      moveDownButton.click()
      await Promise.resolve()
    })

    expect(onMoveLayer).toHaveBeenCalledWith("component-1", "down")
  })
})
