// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { CanvasReactNodePropertyPanel } from "../components/canvas/CanvasReactNodePropertyPanel"
import type { CanvasReactNodeSelection } from "../components/canvas/CanvasHtmlFrame"

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

interface Harness {
  container: HTMLDivElement
  root: Root
  cleanup: () => void
}

function makeSelection(overrides: Partial<CanvasReactNodeSelection> = {}): CanvasReactNodeSelection {
  return {
    itemId: "item-1",
    canvasId: "abc:0",
    tag: "button",
    rect: { x: 1, y: 2, width: 80, height: 24 },
    compileGeneration: 1,
    ...overrides,
  }
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
      act(() => {
        root.unmount()
      })
      container.remove()
    },
  }
}

function setTextareaValue(textarea: HTMLTextAreaElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set
  setter?.call(textarea, value)
  textarea.dispatchEvent(
    new InputEvent("input", {
      bubbles: true,
      data: value,
      inputType: "insertText",
    })
  )
  textarea.dispatchEvent(new Event("change", { bubbles: true }))
}

function setInputValue(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set
  setter?.call(input, value)
  input.dispatchEvent(
    new InputEvent("input", {
      bubbles: true,
      data: value,
      inputType: "insertText",
    })
  )
  input.dispatchEvent(new Event("change", { bubbles: true }))
}

describe("CanvasReactNodePropertyPanel", () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let harness: Harness | null = null

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => {
    if (harness) {
      harness.cleanup()
      harness = null
    }
    vi.unstubAllGlobals()
  })

  it("rebases selection when write returns a new canvasId", async () => {
    const onSourceHtmlChange = vi.fn()
    const onSelectionChange = vi.fn()
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          node: {
            canvasId: "abc:0",
            tag: "button",
            isHostElement: true,
            attributes: [],
            textChildren: "Click",
            hasNonTextChildren: false,
            editableInV1: true,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          sourceHtml: "<button>Pressed</button>",
          canvasIdMap: {
            "abc:0": "abc:1",
          },
        }),
      })

    harness = await mount(
      <CanvasReactNodePropertyPanel
        selection={makeSelection()}
        sourceReact=""
        sourceHtml="<button>Click</button>"
        sourceKind="html"
        currentCompileGeneration={1}
        sourceId="item-1"
        onClose={() => {}}
        onSourceReactChange={() => {}}
        onSourceHtmlChange={onSourceHtmlChange}
        onSelectionChange={onSelectionChange}
      />
    )

    const textarea = harness.container.querySelector("textarea") as HTMLTextAreaElement
    const applyButton = Array.from(harness.container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Apply text"
    ) as HTMLButtonElement
    expect(textarea).toBeTruthy()
    expect(applyButton).toBeTruthy()

    await act(async () => {
      setTextareaValue(textarea, "Pressed")
      await Promise.resolve()
    })
    expect(applyButton.disabled).toBe(false)

    await act(async () => {
      applyButton.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(onSourceHtmlChange).toHaveBeenCalledWith("<button>Pressed</button>", undefined)
    expect(onSelectionChange).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: "item-1",
        canvasId: "abc:1",
        tag: "button",
      })
    )
    const [, writeInit] = fetchMock.mock.calls[1]
    const writeBody = JSON.parse(String(writeInit.body))
    expect(writeBody.canvasId).toBe("abc:0")
    expect(writeBody.sourceHtml).toBe("<button>Click</button>")
    expect(writeBody.mutations).toEqual([{ type: "setTextChild", value: "Pressed" }])
  })

  it("clears selection when write returns canvasIdMap[selectedId] = null", async () => {
    const onSelectionChange = vi.fn()
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          node: {
            canvasId: "abc:0",
            tag: "button",
            isHostElement: true,
            attributes: [],
            textChildren: "Click",
            hasNonTextChildren: false,
            editableInV1: true,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          sourceHtml: "<div />",
          canvasIdMap: {
            "abc:0": null,
          },
        }),
      })

    harness = await mount(
      <CanvasReactNodePropertyPanel
        selection={makeSelection()}
        sourceReact=""
        sourceHtml="<button>Click</button>"
        sourceKind="html"
        currentCompileGeneration={1}
        sourceId="item-1"
        onClose={() => {}}
        onSourceReactChange={() => {}}
        onSourceHtmlChange={() => {}}
        onSelectionChange={onSelectionChange}
      />
    )

    const textarea = harness.container.querySelector("textarea") as HTMLTextAreaElement
    const applyButton = Array.from(harness.container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Apply text"
    ) as HTMLButtonElement

    await act(async () => {
      setTextareaValue(textarea, "Removed")
      await Promise.resolve()
    })

    await act(async () => {
      applyButton.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(onSelectionChange).toHaveBeenCalledWith(null)
  })

  it("reports successful file-backed writes for CanvasTab history logging", async () => {
    const onSourceHtmlChange = vi.fn()
    const onWriteSuccess = vi.fn()
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          node: {
            canvasId: "abc:0",
            tag: "button",
            isHostElement: true,
            attributes: [],
            textChildren: "Click",
            hasNonTextChildren: false,
            editableInV1: true,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          sourceHtml: "<button>Undo</button>",
          appliedMutations: 1,
          canvasIdMap: {
            "abc:0": "abc:1",
          },
          prevSourceSnapshot: "<button>Click</button>",
          mtimeMs: 1234,
        }),
      })

    harness = await mount(
      <CanvasReactNodePropertyPanel
        selection={makeSelection()}
        sourceReact=""
        sourceHtml="<button>Click</button>"
        sourceKind="html"
        currentCompileGeneration={1}
        sourceId="item-1"
        sourceFilePath="components/Button.html"
        sourceFileMtime={1200}
        onClose={() => {}}
        onSourceReactChange={() => {}}
        onSourceHtmlChange={onSourceHtmlChange}
        onSelectionChange={() => {}}
        onWriteSuccess={onWriteSuccess}
      />
    )

    const textarea = harness.container.querySelector("textarea") as HTMLTextAreaElement
    const applyButton = Array.from(harness.container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Apply text"
    ) as HTMLButtonElement

    await act(async () => {
      setTextareaValue(textarea, "Undo")
      await Promise.resolve()
    })

    await act(async () => {
      applyButton.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(onSourceHtmlChange).toHaveBeenCalledWith("<button>Undo</button>", 1234)
    expect(onWriteSuccess).toHaveBeenCalledWith({
      sourceKind: "html",
      filePath: "components/Button.html",
      mtimeMs: 1234,
      mutations: [{ type: "setTextChild", value: "Undo" }],
      appliedMutations: 1,
      canvasIdMap: {
        "abc:0": "abc:1",
      },
      prevSourceSnapshot: "<button>Click</button>",
      nextSourceSnapshot: "<button>Undo</button>",
    })
  })

  it("surfaces a compact editable summary for the selected node", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ok: true,
        node: {
          canvasId: "abc:0",
          tag: "a",
          isHostElement: true,
          attributes: [
            {
              name: "href",
              value: "#",
              kind: "literal-string",
              editableInV1: true,
            },
            {
              name: "className",
              value: "button secondary",
              kind: "literal-string",
              editableInV1: true,
            },
          ],
          textChildren: "Secondary",
          hasNonTextChildren: false,
          editableInV1: true,
        },
      }),
    })

    harness = await mount(
      <CanvasReactNodePropertyPanel
        selection={makeSelection({ tag: "a" })}
        sourceReact={'export default function P() { return <a href="#" className="button secondary">Secondary</a> }'}
        currentCompileGeneration={1}
        sourceId="item-1"
        onClose={() => {}}
        onSourceReactChange={() => {}}
      />
    )

    expect(harness.container.textContent).toContain("Editable now")
    for (const label of ["text", "href", "className", "wrap", "swap tag", "reorder", "insert child", "delete"]) {
      expect(harness.container.textContent).toContain(label)
    }
  })

  it("dispatches wrapSelection and rebases to the wrapped node id", async () => {
    const onSourceHtmlChange = vi.fn()
    const onSelectionChange = vi.fn()
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          node: {
            canvasId: "abc:0",
            tag: "button",
            isHostElement: true,
            attributes: [],
            textChildren: "Click",
            hasNonTextChildren: false,
            editableInV1: true,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          sourceHtml: "<section><button>Click</button></section>",
          canvasIdMap: {
            "abc:0": "abc:1",
          },
        }),
      })

    harness = await mount(
      <CanvasReactNodePropertyPanel
        selection={makeSelection()}
        sourceReact=""
        sourceHtml="<button>Click</button>"
        sourceKind="html"
        currentCompileGeneration={1}
        sourceId="item-1"
        onClose={() => {}}
        onSourceReactChange={() => {}}
        onSourceHtmlChange={onSourceHtmlChange}
        onSelectionChange={onSelectionChange}
      />
    )

    const wrapInput = Array.from(harness.container.querySelectorAll("input")).find(
      (input) => (input as HTMLInputElement).value === "div"
    ) as HTMLInputElement
    const wrapButton = Array.from(harness.container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Wrap"
    ) as HTMLButtonElement

    await act(async () => {
      setInputValue(wrapInput, "section")
      await Promise.resolve()
    })

    await act(async () => {
      wrapButton.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(onSourceHtmlChange).toHaveBeenCalledWith(
      "<section><button>Click</button></section>",
      undefined
    )
    expect(onSelectionChange).toHaveBeenCalledWith(
      expect.objectContaining({
        canvasId: "abc:1",
      })
    )
    const [, writeInit] = fetchMock.mock.calls[1]
    const writeBody = JSON.parse(String(writeInit.body))
    expect(writeBody.mutations).toEqual([{ type: "wrapSelection", wrapperTag: "section" }])
  })

  it("dispatches removeNode from the structure section and clears selection", async () => {
    const onSelectionChange = vi.fn()
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          node: {
            canvasId: "abc:0",
            tag: "button",
            isHostElement: true,
            attributes: [],
            textChildren: "Click",
            hasNonTextChildren: false,
            editableInV1: true,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          sourceHtml: "",
          canvasIdMap: {
            "abc:0": null,
          },
        }),
      })

    harness = await mount(
      <CanvasReactNodePropertyPanel
        selection={makeSelection()}
        sourceReact=""
        sourceHtml="<button>Click</button>"
        sourceKind="html"
        currentCompileGeneration={1}
        sourceId="item-1"
        onClose={() => {}}
        onSourceReactChange={() => {}}
        onSourceHtmlChange={() => {}}
        onSelectionChange={onSelectionChange}
      />
    )

    const deleteButton = Array.from(harness.container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Delete node"
    ) as HTMLButtonElement

    await act(async () => {
      deleteButton.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(onSelectionChange).toHaveBeenCalledWith(null)
    const [, writeInit] = fetchMock.mock.calls[1]
    const writeBody = JSON.parse(String(writeInit.body))
    expect(writeBody.mutations).toEqual([{ type: "removeNode" }])
  })

  it("dispatches reorderSibling from the structure section", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          node: {
            canvasId: "abc:0",
            tag: "button",
            isHostElement: true,
            attributes: [],
            textChildren: "Click",
            hasNonTextChildren: false,
            editableInV1: true,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          sourceHtml: "<div><button>Click</button></div>",
          canvasIdMap: {
            "abc:0": "abc:1",
          },
        }),
      })

    harness = await mount(
      <CanvasReactNodePropertyPanel
        selection={makeSelection()}
        sourceReact=""
        sourceHtml="<div><button>Click</button></div>"
        sourceKind="html"
        currentCompileGeneration={1}
        sourceId="item-1"
        onClose={() => {}}
        onSourceReactChange={() => {}}
        onSourceHtmlChange={() => {}}
        onSelectionChange={() => {}}
      />
    )

    const moveUpButton = Array.from(harness.container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Move up"
    ) as HTMLButtonElement

    await act(async () => {
      moveUpButton.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    const [, writeInit] = fetchMock.mock.calls[1]
    const writeBody = JSON.parse(String(writeInit.body))
    expect(writeBody.mutations).toEqual([{ type: "reorderSibling", direction: "up" }])
  })

  it("dispatches insertChild from the structure section", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          node: {
            canvasId: "abc:0",
            tag: "button",
            isHostElement: true,
            attributes: [],
            textChildren: "Click",
            hasNonTextChildren: false,
            editableInV1: true,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          sourceHtml: "<button><span>New</span>Click</button>",
          canvasIdMap: {
            "abc:0": "abc:1",
          },
        }),
      })

    harness = await mount(
      <CanvasReactNodePropertyPanel
        selection={makeSelection()}
        sourceReact=""
        sourceHtml="<button>Click</button>"
        sourceKind="html"
        currentCompileGeneration={1}
        sourceId="item-1"
        onClose={() => {}}
        onSourceReactChange={() => {}}
        onSourceHtmlChange={() => {}}
        onSelectionChange={() => {}}
      />
    )

    const childTextarea = Array.from(harness.container.querySelectorAll("textarea")).at(-1) as HTMLTextAreaElement
    const positionInput = Array.from(harness.container.querySelectorAll("input")).find(
      (input) => (input as HTMLInputElement).type === "number"
    ) as HTMLInputElement
    const insertButton = Array.from(harness.container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Insert child"
    ) as HTMLButtonElement

    await act(async () => {
      setTextareaValue(childTextarea, "<span>New</span>")
      setInputValue(positionInput, "0")
      await Promise.resolve()
    })

    await act(async () => {
      insertButton.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    const [, writeInit] = fetchMock.mock.calls[1]
    const writeBody = JSON.parse(String(writeInit.body))
    expect(writeBody.mutations).toEqual([
      { type: "insertChild", position: 0, childSource: "<span>New</span>" },
    ])
  })
})
