// @vitest-environment jsdom

import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, describe, expect, it, vi } from "vitest"
import { DndContext } from "@dnd-kit/core"

import { CanvasArtboardItem } from "../components/canvas/CanvasArtboardItem"
import type {
  CanvasArtboardItem as CanvasArtboardItemType,
  CanvasItem,
} from "../types/canvas"

const ARTBOARD: CanvasArtboardItemType = {
  id: "artboard-1",
  type: "artboard",
  name: "Board",
  position: { x: 0, y: 0 },
  size: { width: 960, height: 400 },
  rotation: 0,
  zIndex: 1,
  layout: { display: "flex", direction: "column", gap: 0, padding: 32 },
}

const TALL_CHILD = {
  id: "section-1",
  type: "section",
  name: "Tall",
  parentId: "artboard-1",
  position: { x: 0, y: 0 },
  size: { width: 896, height: 2000 },
  rotation: 0,
  zIndex: 2,
  layout: { display: "grid", columns: 2, gap: 16 },
} as unknown as CanvasItem

function renderArtboard(childItems: CanvasItem[], onUpdate = vi.fn()) {
  const container = document.createElement("div")
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(
      <DndContext>
        <CanvasArtboardItem
          item={ARTBOARD}
          isSelected
          onSelect={() => {}}
          onUpdate={onUpdate}
          onRemove={() => {}}
          onDuplicate={() => {}}
          onBringToFront={() => {}}
          scale={1}
          interactMode={false}
          childItems={childItems}
        >
          <div />
        </CanvasArtboardItem>
      </DndContext>
    )
  })
  return {
    container,
    onUpdate,
    cleanup: () => {
      act(() => root.unmount())
      container.remove()
    },
  }
}

describe("CanvasArtboardItem overflow cue (FOX2-41)", () => {
  let cleanup: (() => void) | null = null

  afterEach(() => {
    cleanup?.()
    cleanup = null
  })

  it("shows the clipped badge and grows to content on Fit height", () => {
    const rendered = renderArtboard([TALL_CHILD])
    cleanup = rendered.cleanup

    // content: 2000 + 64 padding = 2064; artboard height 400 -> 1664 overflow
    expect(rendered.container.textContent).toContain("Clipped +1664px")
    expect(rendered.container.querySelector('[data-artboard-overflow="true"]')).toBeTruthy()

    const fitButton = Array.from(rendered.container.querySelectorAll("button")).find((el) =>
      el.textContent?.includes("Fit height")
    )
    expect(fitButton).toBeTruthy()
    act(() => fitButton!.click())

    expect(rendered.onUpdate).toHaveBeenCalledWith({
      size: { width: 960, height: 2064 },
    })
  })

  it("stays silent when content fits", () => {
    const shortChild = {
      ...(TALL_CHILD as unknown as Record<string, unknown>),
      size: { width: 896, height: 200 },
    } as unknown as CanvasItem
    const rendered = renderArtboard([shortChild])
    cleanup = rendered.cleanup

    expect(rendered.container.textContent).not.toContain("Clipped")
    expect(rendered.container.querySelector('[data-artboard-overflow="true"]')).toBeNull()
  })
})
