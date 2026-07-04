// @vitest-environment jsdom

import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, describe, expect, it } from "vitest"

import { CanvasContextMenu } from "../components/canvas/CanvasContextMenu"
import { CANVAS_COPY_FOR_AGENT_EVENT } from "../utils/canvasAgentSelectionContext"

describe("CanvasContextMenu — Copy for agent", () => {
  let cleanup: (() => void) | null = null

  afterEach(() => {
    cleanup?.()
    cleanup = null
  })

  it("dispatches the copy-for-agent event when clicked", async () => {
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root = createRoot(container)
    cleanup = () => {
      act(() => root.unmount())
      container.remove()
    }

    let fired = 0
    const listener = () => {
      fired += 1
    }
    window.addEventListener(CANVAS_COPY_FOR_AGENT_EVENT, listener)

    await act(async () => {
      root.render(
        <CanvasContextMenu
          position={{ x: 10, y: 10 }}
          onClose={() => {}}
          onDelete={() => {}}
        />
      )
    })

    const entry = Array.from(document.querySelectorAll("[role=menuitem]")).find((el) =>
      el.textContent?.includes("Copy for agent")
    )
    expect(entry).toBeTruthy()

    await act(async () => {
      ;(entry as HTMLButtonElement).click()
      // The menu defers the action to the next animation frame.
      await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
    })

    expect(fired).toBe(1)
    window.removeEventListener(CANVAS_COPY_FOR_AGENT_EVENT, listener)
  })
})
