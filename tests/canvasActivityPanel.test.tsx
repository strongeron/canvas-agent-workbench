// @vitest-environment jsdom

import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, describe, expect, it } from "vitest"

import { CanvasActivityPanel } from "../components/canvas/CanvasActivityPanel"
import type { CanvasActivityEvent } from "../hooks/useCanvasActivityFeed"

const EVENTS: CanvasActivityEvent[] = [
  {
    id: "e1",
    cursor: 3,
    kind: "user-action",
    actor: "user",
    createdAt: new Date().toISOString(),
    action: "set-canvas-tool",
    summary: null,
    sessionId: null,
  },
  {
    id: "e2",
    cursor: 2,
    kind: "source-edit",
    actor: "user",
    createdAt: new Date().toISOString(),
    action: "source-edit",
    summary: "text edit",
    sessionId: null,
  },
  {
    id: "e3",
    cursor: 1,
    kind: "operation-applied",
    actor: "agent",
    createdAt: new Date().toISOString(),
    action: "create_item",
    summary: null,
    sessionId: "canvas-agent-session-abcdef",
  },
]

describe("CanvasActivityPanel (FOX2-48)", () => {
  let cleanup: (() => void) | null = null
  afterEach(() => {
    cleanup?.()
    cleanup = null
  })

  function render(events: CanvasActivityEvent[]) {
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root = createRoot(container)
    act(() => {
      root.render(<CanvasActivityPanel events={events} onClose={() => {}} />)
    })
    cleanup = () => {
      act(() => root.unmount())
      container.remove()
    }
    return container
  }

  it("renders each event with an actor badge and label", () => {
    const container = render(EVENTS)
    const text = container.textContent || ""
    expect(text).toContain("set-canvas-tool")
    expect(text).toContain("text edit")
    expect(text).toContain("create_item")
    // Actor badges present.
    expect(text).toContain("You")
    expect(text).toContain("Agent")
    // Agent session id tail shown.
    expect(text).toContain("abcdef")
  })

  it("shows an empty state with no events", () => {
    const container = render([])
    expect(container.textContent || "").toContain("No activity yet")
  })
})
