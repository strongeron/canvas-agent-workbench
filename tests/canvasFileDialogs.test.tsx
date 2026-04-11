// @vitest-environment jsdom

import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import {
  CanvasFileActionDialog,
  CanvasFileDeleteDialog,
} from "../components/canvas/CanvasFileDialogs"

async function click(element: Element) {
  await act(async () => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }))
  })
}

async function changeValue(element: HTMLInputElement, value: string) {
  const prototype = Object.getPrototypeOf(element) as HTMLInputElement
  const valueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set
  if (!valueSetter) {
    throw new Error("Unable to find native value setter")
  }

  await act(async () => {
    valueSetter.call(element, value)
    element.dispatchEvent(new Event("input", { bubbles: true }))
    element.dispatchEvent(new Event("change", { bubbles: true }))
  })
}

async function renderDialog(element: React.ReactNode) {
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

afterEach(() => {
  document.body.innerHTML = ""
})

const originalActEnvironmentDescriptor = Object.getOwnPropertyDescriptor(
  globalThis,
  "IS_REACT_ACT_ENVIRONMENT"
)

beforeAll(() => {
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
    configurable: true,
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

describe("canvas file dialogs", () => {
  it("renders the action dialog with path preview and submits updates", async () => {
    const onSubmit = vi.fn()
    let titleValue = "Untitled Canvas"
    let folderValue = "systems/type"

    const rendered = await renderDialog(
      <CanvasFileActionDialog
        open
        mode="rename"
        surfaceLabel="Canvas"
        titleValue={titleValue}
        folderValue={folderValue}
        onTitleChange={(value) => {
          titleValue = value
        }}
        onFolderChange={(value) => {
          folderValue = value
        }}
        onClose={() => {}}
        onSubmit={onSubmit}
      />
    )

    expect(rendered.host.textContent).toContain("Rename or move file")
    expect(rendered.host.textContent).toContain("systems/type/untitled-canvas.canvas")

    const [titleInput, folderInput] = Array.from(
      rendered.host.querySelectorAll("input")
    ) as HTMLInputElement[]
    await changeValue(titleInput, "Brand Audit")
    await changeValue(folderInput, "audits")

    const submitButton = Array.from(rendered.host.querySelectorAll("button")).find((candidate) =>
      candidate.textContent?.includes("Apply changes")
    )
    expect(submitButton).not.toBeNull()

    await click(submitButton!)

    expect(titleValue).toBe("Brand Audit")
    expect(folderValue).toBe("audits")
    expect(onSubmit).toHaveBeenCalledTimes(1)

    await rendered.cleanup()
  })

  it("renders the delete dialog and confirms destructive actions", async () => {
    const onConfirm = vi.fn()
    const rendered = await renderDialog(
      <CanvasFileDeleteDialog
        open
        title="Brand Audit"
        path="audits/brand-audit.canvas"
        onClose={() => {}}
        onConfirm={onConfirm}
      />
    )

    expect(rendered.host.textContent).toContain("Delete canvas file")
    expect(rendered.host.textContent).toContain("audits/brand-audit.canvas")

    const deleteButton = Array.from(rendered.host.querySelectorAll("button")).find((candidate) =>
      candidate.textContent?.includes("Delete file")
    )
    expect(deleteButton).not.toBeNull()

    await click(deleteButton!)

    expect(onConfirm).toHaveBeenCalledTimes(1)

    await rendered.cleanup()
  })
})
