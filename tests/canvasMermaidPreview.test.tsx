// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"

const renderMermaidSvgMock = vi.fn()
vi.mock("../components/canvas/mermaidRenderer", () => ({
  renderMermaidSvg: (...args: unknown[]) => renderMermaidSvgMock(...args),
}))

import { CanvasMermaidPreview } from "../components/canvas/CanvasMermaidPreview"

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

const SVG = `<svg><g class="node default" data-id="A" id="flowchart-A-0"><text>Old</text></g></svg>`

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event("input", { bubbles: true }))
}

interface Harness {
  container: HTMLDivElement
  root: Root
  cleanup: () => void
}

async function mount(element: React.ReactElement): Promise<Harness> {
  const container = document.createElement("div")
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(element)
  })
  await act(async () => {
    await Promise.resolve()
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

describe("CanvasMermaidPreview — U10 inline label edit", () => {
  let harness: Harness | null = null

  afterEach(() => {
    harness?.cleanup()
    harness = null
    renderMermaidSvgMock.mockReset()
  })

  it("opens an inline input seeded with the current label on node click", async () => {
    renderMermaidSvgMock.mockResolvedValue(SVG)
    const onCommit = vi.fn()
    harness = await mount(
      <CanvasMermaidPreview
        source={"flowchart TD\n  A[Old] --> B[Two]"}
        editable
        onCommitLabel={onCommit}
      />
    )
    const text = harness.container.querySelector("text") as Element
    await act(async () => {
      text.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })
    const input = harness.container.querySelector(
      "[data-testid='mermaid-label-input']"
    ) as HTMLInputElement
    expect(input).not.toBeNull()
    expect(input.value).toBe("Old")
  })

  it("commits the edited label through onCommitLabel on blur", async () => {
    renderMermaidSvgMock.mockResolvedValue(SVG)
    const onCommit = vi.fn()
    harness = await mount(
      <CanvasMermaidPreview
        source={"flowchart TD\n  A[Old] --> B[Two]"}
        editable
        onCommitLabel={onCommit}
      />
    )
    const text = harness.container.querySelector("text") as Element
    await act(async () => {
      text.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })
    const input = harness.container.querySelector(
      "[data-testid='mermaid-label-input']"
    ) as HTMLInputElement
    await act(async () => {
      setInputValue(input, "New label")
    })
    await act(async () => {
      input.dispatchEvent(new FocusEvent("focusout", { bubbles: true }))
    })
    expect(onCommit).toHaveBeenCalledWith("A", "New label")
  })

  it("does not open an editor when not editable", async () => {
    renderMermaidSvgMock.mockResolvedValue(SVG)
    harness = await mount(
      <CanvasMermaidPreview source={"flowchart TD\n  A[Old] --> B[Two]"} />
    )
    const text = harness.container.querySelector("text") as Element
    await act(async () => {
      text.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })
    expect(
      harness.container.querySelector("[data-testid='mermaid-label-input']")
    ).toBeNull()
  })

  it("Escape cancels without committing", async () => {
    renderMermaidSvgMock.mockResolvedValue(SVG)
    const onCommit = vi.fn()
    harness = await mount(
      <CanvasMermaidPreview
        source={"flowchart TD\n  A[Old] --> B[Two]"}
        editable
        onCommitLabel={onCommit}
      />
    )
    const text = harness.container.querySelector("text") as Element
    await act(async () => {
      text.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })
    const input = harness.container.querySelector(
      "[data-testid='mermaid-label-input']"
    ) as HTMLInputElement
    await act(async () => {
      setInputValue(input, "Discarded")
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))
    })
    expect(onCommit).not.toHaveBeenCalled()
    expect(
      harness.container.querySelector("[data-testid='mermaid-label-input']")
    ).toBeNull()
  })

  it("rejects a typed value with bracket chars instead of corrupting source (regression)", async () => {
    renderMermaidSvgMock.mockResolvedValue(SVG)
    const onCommit = vi.fn()
    harness = await mount(
      <CanvasMermaidPreview
        source={"flowchart TD\n  A[Old] --> B[Two]"}
        editable
        onCommitLabel={onCommit}
      />
    )
    const text = harness.container.querySelector("text") as Element
    await act(async () => {
      text.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })
    const input = harness.container.querySelector(
      "[data-testid='mermaid-label-input']"
    ) as HTMLInputElement
    await act(async () => {
      setInputValue(input, "Has [brackets]")
    })
    await act(async () => {
      input.dispatchEvent(new FocusEvent("focusout", { bubbles: true }))
    })
    // The regex patcher would splice `[brackets]` verbatim → un-renderable
    // mermaid. The commit must be rejected (no callback), edit cleared.
    expect(onCommit).not.toHaveBeenCalled()
    expect(
      harness.container.querySelector("[data-testid='mermaid-label-input']")
    ).toBeNull()
  })
})
