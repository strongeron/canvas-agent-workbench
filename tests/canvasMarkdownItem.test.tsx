// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { CanvasMarkdownItem } from "../components/canvas/CanvasMarkdownItem"
import type { CanvasMarkdownItem as CanvasMarkdownItemType } from "../types/canvas"

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

function makeItem(overrides: Partial<CanvasMarkdownItemType> = {}): CanvasMarkdownItemType {
  return {
    id: overrides.id ?? "md-1",
    type: "markdown",
    source: overrides.source ?? "# Title\n\nParagraph text.",
    title: overrides.title ?? "Markdown note",
    background: overrides.background,
    sourcePath: overrides.sourcePath,
    sourceImportedAt: overrides.sourceImportedAt,
    sourceFileMtime: overrides.sourceFileMtime,
    position: { x: 20, y: 20 },
    size: { width: 700, height: 460 },
    rotation: 0,
    zIndex: 1,
  }
}

function setTextareaValue(textarea: HTMLTextAreaElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set
  setter?.call(textarea, value)
  textarea.dispatchEvent(new InputEvent("input", { bubbles: true, data: value, inputType: "insertText" }))
  textarea.dispatchEvent(new Event("change", { bubbles: true }))
}

describe("CanvasMarkdownItem", () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let harness: Harness | null = null

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => {
    harness?.cleanup()
    harness = null
    vi.unstubAllGlobals()
  })

  it("edits a rendered block inline and writes the updated markdown source", async () => {
    const onUpdate = vi.fn()
    const onSelect = vi.fn()
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        source: "# Title\n\nUpdated paragraph.\n",
        mtimeMs: 456,
      }),
    })

    harness = await mount(
      <CanvasMarkdownItem
        item={makeItem({ sourcePath: "docs/demo.md", sourceFileMtime: 123 })}
        isSelected={true}
        onSelect={onSelect}
        onUpdate={onUpdate}
        onRemove={() => {}}
        onDuplicate={() => {}}
        onBringToFront={() => {}}
        scale={1}
        interactMode={false}
      />
    )

    const paragraphBlock = harness.container.querySelector('[data-markdown-block-index="1"]') as HTMLDivElement
    expect(paragraphBlock).toBeTruthy()

    await act(async () => {
      paragraphBlock.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }))
      await Promise.resolve()
    })

    const textarea = harness.container.querySelector("textarea") as HTMLTextAreaElement
    expect(textarea).toBeTruthy()

    await act(async () => {
      setTextareaValue(textarea, "Updated paragraph.")
      textarea.dispatchEvent(new FocusEvent("focusout", { bubbles: true }))
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(onSelect).toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [, requestInit] = fetchMock.mock.calls[0]
    const body = JSON.parse(String(requestInit.body))
    expect(body).toEqual({
      action: "update",
      filePath: "docs/demo.md",
      mtimeMs: 123,
      blockIndex: 1,
      newText: "Updated paragraph.",
    })
    expect(onUpdate).toHaveBeenCalledWith({
      source: "# Title\n\nUpdated paragraph.\n",
      sourceFileMtime: 456,
    })
  })

  it("reorders the active block through the markdown write endpoint", async () => {
    const onUpdate = vi.fn()
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        source: "Paragraph text.\n\n# Title\n",
        mtimeMs: 789,
      }),
    })

    harness = await mount(
      <CanvasMarkdownItem
        item={makeItem({ source: "# Title\n\nParagraph text.", sourcePath: "docs/demo.md", sourceFileMtime: 123 })}
        isSelected={true}
        onSelect={() => {}}
        onUpdate={onUpdate}
        onRemove={() => {}}
        onDuplicate={() => {}}
        onBringToFront={() => {}}
        scale={1}
        interactMode={false}
      />
    )

    const firstBlock = harness.container.querySelector('[data-markdown-block-index="0"]') as HTMLDivElement
    await act(async () => {
      firstBlock.dispatchEvent(new MouseEvent("click", { bubbles: true }))
      await Promise.resolve()
    })

    const downButton = Array.from(harness.container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Down"
    ) as HTMLButtonElement
    expect(downButton).toBeTruthy()

    await act(async () => {
      downButton.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [, requestInit] = fetchMock.mock.calls[0]
    const body = JSON.parse(String(requestInit.body))
    expect(body).toEqual({
      action: "reorder",
      filePath: "docs/demo.md",
      mtimeMs: 123,
      fromIndex: 0,
      toIndex: 1,
    })
    expect(onUpdate).toHaveBeenCalledWith({
      source: "Paragraph text.\n\n# Title\n",
      sourceFileMtime: 789,
    })
  })
})
