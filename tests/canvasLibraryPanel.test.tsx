// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { CanvasLibraryPanel } from "../components/canvas/CanvasLibraryPanel"
import {
  CANVAS_LIBRARY_DRAG_MIME,
  parseLibraryDragPayload,
} from "../utils/canvasLibraryDrag"
import { CANVAS_REGISTRY_UPDATED_EVENT } from "../utils/canvasRegistryEvents"
import type { CanvasRegistryPrimitive } from "../utils/canvasRegistry"

const PRIMITIVE: CanvasRegistryPrimitive = {
  id: "button-primary",
  displayName: "Primary Button",
  category: "ui",
  kind: "html",
  filePath: "primitives/button.html",
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
      act(() => {
        root.unmount()
      })
      container.remove()
    },
  }
}

function fakeDataTransfer(): DataTransfer {
  const store = new Map<string, string>()
  let effectAllowedValue = ""
  return {
    setData(mime: string, value: string) {
      store.set(mime, value)
    },
    getData(mime: string) {
      return store.get(mime) ?? ""
    },
    get effectAllowed() {
      return effectAllowedValue
    },
    set effectAllowed(value: string) {
      effectAllowedValue = value
    },
  } as unknown as DataTransfer
}

describe("CanvasLibraryPanel dragstart", () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let harness: Harness | null = null

  beforeEach(() => {
    fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({ ok: true, primitives: [PRIMITIVE], warnings: [] }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    })
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => {
    if (harness) {
      harness.cleanup()
      harness = null
    }
    vi.unstubAllGlobals()
  })

  it("writes a versioned payload to dataTransfer and fires onPrimitiveDragStart", async () => {
    const onPrimitiveDragStart = vi.fn()
    const onPrimitiveDragEnd = vi.fn()
    harness = await mount(
      <CanvasLibraryPanel
        projectId="design-system-foundation"
        onInstantiate={vi.fn()}
        onClose={vi.fn()}
        onPrimitiveDragStart={onPrimitiveDragStart}
        onPrimitiveDragEnd={onPrimitiveDragEnd}
      />
    )

    const button = harness.container.querySelector<HTMLButtonElement>(
      '[data-canvas-library-primitive="button-primary"]'
    )
    expect(button).not.toBeNull()
    if (!button) return
    expect(button.draggable).toBe(true)

    const dt = fakeDataTransfer()
    await act(async () => {
      const event = new Event("dragstart", { bubbles: true, cancelable: true })
      Object.defineProperty(event, "dataTransfer", { value: dt })
      button.dispatchEvent(event)
    })

    expect(onPrimitiveDragStart).toHaveBeenCalledTimes(1)
    const callPayload = onPrimitiveDragStart.mock.calls[0]?.[0]
    expect(callPayload).toMatchObject({
      kind: "library-primitive",
      version: 1,
      projectId: "design-system-foundation",
      primitive: PRIMITIVE,
    })

    const raw = dt.getData(CANVAS_LIBRARY_DRAG_MIME)
    expect(parseLibraryDragPayload(raw)).toEqual(callPayload)
    expect(dt.effectAllowed).toBe("copy")

    await act(async () => {
      const event = new Event("dragend", { bubbles: true, cancelable: true })
      Object.defineProperty(event, "dataTransfer", { value: dt })
      button.dispatchEvent(event)
    })
    expect(onPrimitiveDragEnd).toHaveBeenCalledTimes(1)
  })

  it("refetches the registry when the global registry-updated event fires", async () => {
    harness = await mount(
      <CanvasLibraryPanel
        projectId="design-system-foundation"
        onInstantiate={vi.fn()}
        onClose={vi.fn()}
      />
    )

    expect(fetchMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      window.dispatchEvent(new CustomEvent(CANVAS_REGISTRY_UPDATED_EVENT))
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("instantiates HTML primitives as file-backed inline sources", async () => {
    fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === "/api/canvas/registry/list") {
        return new Response(
          JSON.stringify({ ok: true, primitives: [PRIMITIVE], warnings: [] }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      }
      if (url === "/api/canvas/ast/load") {
        return new Response(
          JSON.stringify({
            ok: true,
            sourceHtml: "<article>Loaded primitive</article>",
            filePath: "projects/design-system-foundation/primitives/button.html",
            mtimeMs: 789,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })
    vi.stubGlobal("fetch", fetchMock)

    const onInstantiate = vi.fn()
    harness = await mount(
      <CanvasLibraryPanel
        projectId="design-system-foundation"
        onInstantiate={onInstantiate}
        onClose={vi.fn()}
      />
    )

    const button = harness.container.querySelector<HTMLButtonElement>(
      '[data-canvas-library-primitive="button-primary"]'
    )
    expect(button).not.toBeNull()
    if (!button) return

    await act(async () => {
      button.dispatchEvent(new MouseEvent("click", { bubbles: true }))
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(onInstantiate).toHaveBeenCalledWith({
      title: "Primary Button",
      sourceHtml: "<article>Loaded primitive</article>",
      sourceMode: "inline",
      sourcePath: "projects/design-system-foundation/primitives/button.html",
      sourceHtmlFilePath: "projects/design-system-foundation/primitives/button.html",
      sourceHtmlFileMtime: 789,
    })
  })
})
