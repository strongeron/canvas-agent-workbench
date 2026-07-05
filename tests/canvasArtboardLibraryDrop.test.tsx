// @vitest-environment jsdom

import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, describe, expect, it, vi } from "vitest"
import { DndContext } from "@dnd-kit/core"

import { CanvasArtboardItem } from "../components/canvas/CanvasArtboardItem"
import type { CanvasArtboardItem as CanvasArtboardItemType } from "../types/canvas"

const ARTBOARD: CanvasArtboardItemType = {
  id: "artboard-1",
  type: "artboard",
  name: "Board",
  position: { x: 0, y: 0 },
  size: { width: 960, height: 600 },
  rotation: 0,
  zIndex: 1,
  layout: { display: "flex", direction: "column", gap: 24, padding: 32 },
}

function renderArtboard(props: {
  libraryDragActive: boolean
  onLibraryPrimitiveDrop: () => void
}) {
  const container = document.createElement("div")
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(
      <DndContext>
        <CanvasArtboardItem
          item={ARTBOARD}
          isSelected={false}
          onSelect={() => {}}
          onUpdate={() => {}}
          onRemove={() => {}}
          onDuplicate={() => {}}
          onBringToFront={() => {}}
          scale={1}
          interactMode={false}
          libraryDragActive={props.libraryDragActive}
          onLibraryPrimitiveDrop={props.onLibraryPrimitiveDrop}
        >
          <div />
        </CanvasArtboardItem>
      </DndContext>
    )
  })
  const node = container.querySelector('[data-canvas-item-id="artboard-1"]') as HTMLElement
  return {
    node,
    cleanup: () => {
      act(() => root.unmount())
      container.remove()
    },
  }
}

function fireDrop(node: HTMLElement, init?: { defaultPrevented?: boolean }) {
  const event = new Event("drop", { bubbles: true, cancelable: true }) as Event & {
    dataTransfer?: unknown
  }
  event.dataTransfer = { files: [], types: [] }
  if (init?.defaultPrevented) {
    event.preventDefault()
  }
  act(() => {
    node.dispatchEvent(event)
  })
  return event
}

describe("CanvasArtboardItem library drop (FOX2-58)", () => {
  let cleanup: (() => void) | null = null

  afterEach(() => {
    cleanup?.()
    cleanup = null
  })

  it("accepts a library primitive drop while a drag is active", () => {
    const onDrop = vi.fn()
    const rendered = renderArtboard({ libraryDragActive: true, onLibraryPrimitiveDrop: onDrop })
    cleanup = rendered.cleanup

    fireDrop(rendered.node)
    expect(onDrop).toHaveBeenCalledTimes(1)
  })

  it("ignores drops when no library drag is active or a slot zone already handled it", () => {
    const onDrop = vi.fn()
    const inactive = renderArtboard({ libraryDragActive: false, onLibraryPrimitiveDrop: onDrop })
    fireDrop(inactive.node)
    inactive.cleanup()
    expect(onDrop).not.toHaveBeenCalled()

    const active = renderArtboard({ libraryDragActive: true, onLibraryPrimitiveDrop: onDrop })
    cleanup = active.cleanup
    // A slot zone deeper in the tree calls preventDefault without stopping
    // propagation — the artboard must not double-handle it.
    fireDrop(active.node, { defaultPrevented: true })
    expect(onDrop).not.toHaveBeenCalled()
  })
})
