// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import {
  CanvasHtmlPropsPanel,
  buildSlotComponentInsertion,
} from "../components/canvas/CanvasHtmlPropsPanel"
import type { CanvasHtmlSlotInfo } from "../utils/canvasHtmlEditor"
import type { CanvasRegistryPrimitive } from "../utils/canvasRegistry"

const button: CanvasRegistryPrimitive = {
  id: "primitive/button",
  displayName: "Button",
  category: "ui",
  kind: "tsx",
  importName: "Button",
  snippet: '<Button variant="primary">Click me</Button>',
}

describe("buildSlotComponentInsertion", () => {
  const slot: CanvasHtmlSlotInfo = {
    name: "body",
    canvasId: "x:1",
    tag: "section",
    childElementCount: 3,
  }

  it("emits insertChild at the slot's child count with the primitive snippet", () => {
    expect(buildSlotComponentInsertion(slot, button)).toEqual({
      type: "insertChild",
      position: 3,
      childSource: '<Button variant="primary">Click me</Button>',
    })
  })

  it("falls back to a self-closing import-name element when no snippet", () => {
    expect(
      buildSlotComponentInsertion(slot, {
        id: "primitive/box",
        displayName: "Box",
        category: "ui",
        kind: "tsx",
        importName: "Box",
      }).childSource
    ).toBe("<Box />")
  })
})

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

function setSelectValue(select: HTMLSelectElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set
  setter?.call(select, value)
  select.dispatchEvent(new Event("change", { bubbles: true }))
}

const SLOT_HTML =
  '<!doctype html><html><body><article class="card">' +
  '<section data-slot="body" data-slot-kind="content"></section>' +
  "</article></body></html>"

describe("CanvasHtmlPropsPanel — per-slot library component picker", () => {
  let harness: Harness | null = null

  afterEach(() => {
    harness?.cleanup()
    harness = null
    vi.unstubAllGlobals()
  })

  it("loads the registry, lets a slot pick a component, and Apply inserts it via onChange", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ ok: true, primitives: [button] }),
      }))
    )
    const onChange = vi.fn()
    harness = await mount(
      <CanvasHtmlPropsPanel
        sourceMode="inline"
        sourceHtml={SLOT_HTML}
        projectId="demo"
        onChange={onChange}
        onDelete={() => {}}
        onClose={() => {}}
      />
    )
    // Registry fetch resolved → the slot's component <select> is rendered.
    const select = harness.container.querySelector(
      "select[aria-label='Library component for body']"
    ) as HTMLSelectElement
    expect(select).not.toBeNull()
    expect(select.querySelectorAll("option").length).toBe(2) // placeholder + Button

    await act(async () => {
      setSelectValue(select, "primitive/button")
    })
    const applyBtn = [...harness.container.querySelectorAll("button")].find(
      (b) => b.textContent === "Apply"
    ) as HTMLButtonElement
    expect(applyBtn.disabled).toBe(false)
    await act(async () => {
      applyBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })

    expect(onChange).toHaveBeenCalled()
    const arg = onChange.mock.calls.at(-1)?.[0]
    expect(arg.sourceMode).toBe("inline")
    // Inserted into the body slot. parse5 follows the HTML spec and
    // lowercases element names, so a tsx primitive's <Button> degrades to a
    // native <button> in an inline-HTML shell — the content + attrs are
    // source-faithful, the component only renders as itself in a TSX shell
    // (documented tsx-into-HTML limitation).
    expect(arg.sourceHtml).toContain(
      '<section data-slot="body" data-slot-kind="content"><button variant="primary">Click me</button></section>'
    )
  })

  it("does not render the picker when the registry is empty", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, primitives: [] }) }))
    )
    harness = await mount(
      <CanvasHtmlPropsPanel
        sourceMode="inline"
        sourceHtml={SLOT_HTML}
        projectId="demo"
        onChange={() => {}}
        onDelete={() => {}}
        onClose={() => {}}
      />
    )
    expect(
      harness.container.querySelector("select[aria-label='Library component for body']")
    ).toBeNull()
    // The pre-existing "Insert starter" affordance is still present.
    expect(
      [...harness.container.querySelectorAll("button")].some(
        (b) => b.textContent === "Insert starter"
      )
    ).toBe(true)
  })
})
