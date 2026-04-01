// @vitest-environment jsdom

import React from "react"
import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import { CanvasItem } from "../components/canvas/CanvasItem"
import { CanvasArtboardPropsPanel } from "../components/canvas/CanvasArtboardPropsPanel"
import { CanvasToolbar, type ButtonComponentProps, type TooltipComponentProps } from "../components/canvas/CanvasToolbar"
import { useCanvasShortcuts } from "../hooks/useCanvasShortcuts"
import type { GalleryEntry } from "../core/types"

function click(element: Element) {
  element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }))
}

function rightClick(element: Element) {
  element.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, button: 2 }))
}

async function clickAsync(element: Element) {
  await act(async () => {
    click(element)
  })
}

async function rightClickAsync(element: Element) {
  await act(async () => {
    rightClick(element)
  })
}

function TestButton({
  onClick,
  className,
  disabled,
  children,
  "aria-label": ariaLabel,
}: ButtonComponentProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={className}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  )
}

function TestTooltip({ children }: TooltipComponentProps) {
  return <>{children}</>
}

async function renderNode(element: React.ReactNode) {
  const host = document.createElement("div")
  document.body.appendChild(host)
  const root = createRoot(host)

  await act(async () => {
    root.render(element)
  })

  return {
    host,
    cleanup: async () => {
      await act(async () => {
        root.unmount()
      })
      host.remove()
    },
  }
}

async function flushFrame() {
  await act(async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 0))
  })
}

afterEach(() => {
  document.body.innerHTML = ""
})

const originalActEnvironmentDescriptor = Object.getOwnPropertyDescriptor(
  globalThis,
  "IS_REACT_ACT_ENVIRONMENT"
)
const originalRequestAnimationFrame = globalThis.requestAnimationFrame
const originalCancelAnimationFrame = globalThis.cancelAnimationFrame

beforeAll(() => {
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
    configurable: true,
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

describe("canvas delete affordances", () => {
  it("keeps delete selected separate from clear canvas in the toolbar", async () => {
    const onDeleteSelected = vi.fn()
    const onClearCanvas = vi.fn()
    const rendered = await renderNode(
      <CanvasToolbar
        scale={1}
        onZoomIn={() => {}}
        onZoomOut={() => {}}
        onResetZoom={() => {}}
        onFitToView={() => {}}
        onDeleteSelected={onDeleteSelected}
        onClearCanvas={onClearCanvas}
        onToggleSidebar={() => {}}
        onToggleHelp={() => {}}
        onToggleScenes={() => {}}
        onToggleLayers={() => {}}
        onToggleInteractMode={() => {}}
        onAddArtboard={() => {}}
        onGroupSelected={() => {}}
        onUngroupSelected={() => {}}
        onDuplicateSelected={() => {}}
        onToggleThemePanel={() => {}}
        onToggleCopilotPanel={() => {}}
        itemCount={1}
        selectedCount={1}
        canGroup={false}
        canUngroup={false}
        interactMode={false}
        sidebarVisible={true}
        scenesVisible={false}
        layersVisible={false}
        themePanelVisible={false}
        copilotPanelVisible={false}
        Button={TestButton}
        Tooltip={TestTooltip}
      />
    )

    const deleteButton = rendered.host.querySelector('[aria-label="Delete selected"]')
    const clearButton = rendered.host.querySelector('[aria-label="Clear canvas"]')

    expect(deleteButton).not.toBeNull()
    expect(clearButton).not.toBeNull()

    click(deleteButton!)

    expect(onDeleteSelected).toHaveBeenCalledTimes(1)
    expect(onClearCanvas).not.toHaveBeenCalled()

    await rendered.cleanup()
  })

  it("shows a delete action in the artboard inspector", async () => {
    const onDelete = vi.fn()
    const rendered = await renderNode(
      <CanvasArtboardPropsPanel
        name="Primitive Board"
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
        onChange={() => {}}
        onDelete={onDelete}
        onClose={() => {}}
      />
    )

    const deleteButton = rendered.host.querySelector('[aria-label="Delete artboard"]')
    expect(deleteButton).not.toBeNull()

    click(deleteButton!)

    expect(onDelete).toHaveBeenCalledTimes(1)

    await rendered.cleanup()
  })

  it("keeps multi-selection intact when opening the item context menu and deletes through it", async () => {
    const onSelect = vi.fn()
    const onRemove = vi.fn()
    const entry = {
      name: "Button",
      importPath: "@/components/Button",
      variants: [{ name: "Default" }],
    } as unknown as GalleryEntry

    const rendered = await renderNode(
      <CanvasItem
        item={{
          id: "canvas-item-1",
          type: "component",
          componentId: "button",
          variantIndex: 0,
          position: { x: 24, y: 32 },
          size: { width: 240, height: 96 },
          rotation: 0,
          zIndex: 1,
        }}
        isSelected={true}
        isMultiSelected={true}
        onSelect={onSelect}
        onUpdate={() => {}}
        onRemove={onRemove}
        onDuplicate={() => {}}
        onBringToFront={() => {}}
        scale={1}
        interactMode={false}
        Renderer={({ componentName }) => <div>{componentName}</div>}
        getComponentById={() => entry}
      />
    )

    const item = rendered.host.querySelector(".cursor-grab")
    expect(item).not.toBeNull()

    await rightClickAsync(item!)
    await flushFrame()

    const deleteButton = Array.from(document.body.querySelectorAll('[role="menuitem"]')).find((candidate) =>
      candidate.textContent?.includes("Delete")
    )
    expect(document.body.textContent).toContain("Delete")
    expect(onSelect).not.toHaveBeenCalled()

    expect(deleteButton).not.toBeNull()

    await clickAsync(deleteButton!)
    await flushFrame()

    expect(onRemove).toHaveBeenCalledTimes(1)

    await rendered.cleanup()
  })

  it("triggers delete shortcuts from the canvas shell but ignores focused inputs", async () => {
    const onDelete = vi.fn()

    function ShortcutHarness() {
      useCanvasShortcuts({
        onToggleSidebar: () => {},
        onZoomIn: () => {},
        onZoomOut: () => {},
        onResetZoom: () => {},
        onFitToView: () => {},
        onDelete,
        onEscape: () => {},
        onToggleHelp: () => {},
        onSelectAll: () => {},
        onDuplicate: () => {},
        onGroup: () => {},
        onUngroup: () => {},
        onToggleScenes: () => {},
      })

      return (
        <div>
          <button type="button">Canvas shell</button>
          <input aria-label="Name input" />
        </div>
      )
    }

    const rendered = await renderNode(<ShortcutHarness />)

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete", bubbles: true }))
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Backspace", bubbles: true }))
    })

    expect(onDelete).toHaveBeenCalledTimes(2)

    const input = rendered.host.querySelector('input[aria-label="Name input"]') as HTMLInputElement
    expect(input).not.toBeNull()

    await act(async () => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete", bubbles: true }))
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Backspace", bubbles: true }))
    })

    expect(onDelete).toHaveBeenCalledTimes(2)

    await rendered.cleanup()
  })
})
