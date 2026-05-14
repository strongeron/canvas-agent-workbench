// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import { PropControl } from "../components/PropControl"

interface Harness {
  container: HTMLDivElement
  root: Root
  cleanup: () => void
}

const originalActEnvironmentDescriptor = Object.getOwnPropertyDescriptor(
  globalThis,
  "IS_REACT_ACT_ENVIRONMENT"
)
const originalPointerLockElementDescriptor = Object.getOwnPropertyDescriptor(
  Document.prototype,
  "pointerLockElement"
)
const originalExitPointerLock = Document.prototype.exitPointerLock
const originalRequestPointerLock = HTMLElement.prototype.requestPointerLock

let pointerLockElement: Element | null = null
let pointerLockEnabled = false

beforeAll(() => {
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
    configurable: true,
    writable: true,
    value: true,
  })
  Object.defineProperty(Document.prototype, "pointerLockElement", {
    configurable: true,
    get() {
      return pointerLockElement
    },
  })
  Document.prototype.exitPointerLock = vi.fn(() => {
    pointerLockElement = null
  })
  HTMLElement.prototype.requestPointerLock = vi.fn(function requestPointerLock(this: HTMLElement) {
    if (pointerLockEnabled) {
      pointerLockElement = this
    }
    return Promise.resolve()
  })
})

afterAll(() => {
  if (originalActEnvironmentDescriptor) {
    Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", originalActEnvironmentDescriptor)
  } else {
    delete (globalThis as { IS_REACT_ACT_ENVIRONMENT?: unknown }).IS_REACT_ACT_ENVIRONMENT
  }

  if (originalPointerLockElementDescriptor) {
    Object.defineProperty(Document.prototype, "pointerLockElement", originalPointerLockElementDescriptor)
  } else {
    delete (Document.prototype as { pointerLockElement?: unknown }).pointerLockElement
  }

  if (originalExitPointerLock) {
    Document.prototype.exitPointerLock = originalExitPointerLock
  } else {
    delete (Document.prototype as { exitPointerLock?: unknown }).exitPointerLock
  }

  if (originalRequestPointerLock) {
    HTMLElement.prototype.requestPointerLock = originalRequestPointerLock
  } else {
    delete (HTMLElement.prototype as { requestPointerLock?: unknown }).requestPointerLock
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

describe("PropControl", () => {
  let harness: Harness | null = null

  afterEach(() => {
    harness?.cleanup()
    harness = null
    pointerLockElement = null
    pointerLockEnabled = false
    vi.clearAllMocks()
  })

  it("scrubs number props horizontally", async () => {
    const onChange = vi.fn()
    harness = await mount(
      <PropControl
        name="gap"
        schema={{ type: "number", label: "Gap", min: 0, max: 10, step: 1 }}
        value={5}
        onChange={onChange}
      />
    )

    const scrubButton = harness.container.querySelector('button[aria-label="Scrub Gap"]') as HTMLButtonElement
    expect(scrubButton).toBeTruthy()

    await act(async () => {
      scrubButton.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 100 }))
      await Promise.resolve()
    })

    await act(async () => {
      document.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 124 }))
      document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }))
      await Promise.resolve()
    })

    expect(onChange).toHaveBeenCalledWith(7)
  })

  it("clamps scrubbed number props to schema bounds", async () => {
    const onChange = vi.fn()
    harness = await mount(
      <PropControl
        name="gap"
        schema={{ type: "number", label: "Gap", min: 0, max: 10, step: 2 }}
        value={9}
        onChange={onChange}
      />
    )

    const scrubButton = harness.container.querySelector('button[aria-label="Scrub Gap"]') as HTMLButtonElement
    expect(scrubButton).toBeTruthy()

    await act(async () => {
      scrubButton.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 100 }))
      await Promise.resolve()
    })

    await act(async () => {
      document.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 136 }))
      document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }))
      await Promise.resolve()
    })

    expect(onChange).toHaveBeenCalledWith(10)
  })

  it("does not render scrub UI for non-numeric props", async () => {
    harness = await mount(
      <PropControl
        name="title"
        schema={{ type: "text", label: "Title" }}
        value="Hello"
        onChange={vi.fn()}
      />
    )

    const scrubButton = harness.container.querySelector('button[aria-label="Scrub Title"]')
    expect(scrubButton).toBeNull()
  })

  it("uses pointer lock movement when available and exits on mouseup", async () => {
    pointerLockEnabled = true
    const onChange = vi.fn()
    harness = await mount(
      <PropControl
        name="gap"
        schema={{ type: "number", label: "Gap", min: 0, max: 10, step: 1 }}
        value={5}
        onChange={onChange}
      />
    )

    const scrubButton = harness.container.querySelector('button[aria-label="Scrub Gap"]') as HTMLButtonElement
    expect(scrubButton).toBeTruthy()

    await act(async () => {
      scrubButton.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 100 }))
      await Promise.resolve()
    })

    expect(HTMLElement.prototype.requestPointerLock).toHaveBeenCalledTimes(1)

    await act(async () => {
      const moveEvent = new MouseEvent("mousemove", { bubbles: true, clientX: 100 })
      Object.defineProperty(moveEvent, "movementX", { configurable: true, value: 24 })
      document.dispatchEvent(moveEvent)
      document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }))
      await Promise.resolve()
    })

    expect(onChange).toHaveBeenCalledWith(7)
    expect(Document.prototype.exitPointerLock).toHaveBeenCalledTimes(1)
    expect(pointerLockElement).toBeNull()
  })
})
