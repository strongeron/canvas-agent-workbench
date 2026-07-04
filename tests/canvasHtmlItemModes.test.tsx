// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import type { CanvasHtmlItem as CanvasHtmlItemType } from "../types/canvas"

vi.mock("../components/canvas/CanvasHtmlFrame", () => ({
  CanvasHtmlFrame: () => <div data-testid="html-frame-stub" />,
  CanvasHtmlNodeLabel: () => <div data-testid="node-label-stub" />,
}))

import { CanvasHtmlItem } from "../components/canvas/CanvasHtmlItem"

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

function makeItem(): CanvasHtmlItemType {
  return {
    id: "item-1",
    type: "html",
    position: { x: 10, y: 20 },
    size: { width: 400, height: 300 },
    rotation: 0,
    zIndex: 1,
    sourceMode: "react",
    sourceReact: "export default function Demo() { return <button>One</button> }",
  } as CanvasHtmlItemType
}

function renderItem(props: Partial<React.ComponentProps<typeof CanvasHtmlItem>> = {}) {
  const defaults: React.ComponentProps<typeof CanvasHtmlItem> = {
    item: makeItem(),
    isSelected: false,
    onSelect: vi.fn(),
    onUpdate: vi.fn(),
    onRemove: vi.fn(),
    onDuplicate: vi.fn(),
    onBringToFront: vi.fn(),
    scale: 1,
    interactMode: false,
    editMode: false,
  }
  const merged = { ...defaults, ...props }
  act(() => {
    root.render(<CanvasHtmlItem {...merged} />)
  })
  return merged
}

function itemRoot(): HTMLElement {
  const el = container.querySelector('[data-canvas-item-id="item-1"]')
  if (!(el instanceof HTMLElement)) throw new Error("item root not found")
  return el
}

function fireMouseDown(el: HTMLElement) {
  act(() => {
    el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, button: 0 }))
  })
}

describe("CanvasHtmlItem mode separation", () => {
  it("select mode: mousedown selects the item and arms a node drag", () => {
    const props = renderItem()
    fireMouseDown(itemRoot())
    expect(props.onSelect).toHaveBeenCalledWith(false)
    expect(itemRoot().className).toContain("cursor-grabbing")
  })

  it("edit mode: mousedown selects but never starts a node drag", () => {
    const props = renderItem({ editMode: true })
    fireMouseDown(itemRoot())
    expect(props.onSelect).toHaveBeenCalledWith(false)
    expect(itemRoot().className).not.toContain("cursor-grabbing")
  })

  it("select mode: double-click requests edit mode", () => {
    const onRequestEditMode = vi.fn()
    const props = renderItem({ onRequestEditMode })
    act(() => {
      itemRoot().dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }))
    })
    expect(onRequestEditMode).toHaveBeenCalledOnce()
    expect(props.onSelect).toHaveBeenCalledWith(false)
  })

  it("edit mode: double-click does not re-request edit mode", () => {
    const onRequestEditMode = vi.fn()
    renderItem({ editMode: true, onRequestEditMode })
    act(() => {
      itemRoot().dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }))
    })
    expect(onRequestEditMode).not.toHaveBeenCalled()
  })

  it("edit mode: item frame resize handles are not rendered", () => {
    renderItem({ editMode: true, isSelected: true })
    expect(container.querySelectorAll("[style*='resize']").length).toBe(0)
  })
})
