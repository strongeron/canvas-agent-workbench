// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import { useCanvasTransform } from "../hooks/useCanvasTransform"

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

type HookApi = ReturnType<typeof useCanvasTransform>

function Harness({
  apiRef,
  attachRefs,
}: {
  apiRef: { current: HookApi | null }
  attachRefs: boolean
}) {
  const api = useCanvasTransform()
  apiRef.current = api
  return (
    <div
      data-testid="surface"
      ref={attachRefs ? api.gestureSurfaceRef : undefined}
      onWheel={api.handleWheel}
      style={{
        backgroundSize: `${24 * api.transform.scale}px ${24 * api.transform.scale}px`,
        backgroundPosition: `${api.transform.offset.x}px ${api.transform.offset.y}px`,
      }}
    >
      <div
        data-testid="content"
        ref={attachRefs ? api.gestureContentRef : undefined}
        style={{
          transform: `translate(${api.transform.offset.x}px, ${api.transform.offset.y}px) scale(${api.transform.scale})`,
        }}
      />
    </div>
  )
}

let container: HTMLDivElement
let root: Root

function mount(attachRefs: boolean) {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)
  const apiRef: { current: HookApi | null } = { current: null }
  act(() => {
    root.render(<Harness apiRef={apiRef} attachRefs={attachRefs} />)
  })
  return {
    apiRef,
    surface: container.querySelector('[data-testid="surface"]') as HTMLDivElement,
    content: container.querySelector('[data-testid="content"]') as HTMLDivElement,
  }
}

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.useRealTimers()
})

function wheel(el: HTMLElement, init: WheelEventInit) {
  act(() => {
    el.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, ...init }))
  })
}

describe("useCanvasTransform wheel gestures (FOX2-80)", () => {
  it("writes transform styles imperatively per tick without committing state", () => {
    vi.useFakeTimers()
    const { apiRef, content, surface } = mount(true)

    wheel(content, { deltaX: 40, deltaY: 60 })
    wheel(content, { deltaX: 40, deltaY: 60 })

    // DOM already moved…
    expect(content.style.transform).toBe("translate(-80px, -120px) scale(1)")
    expect(surface.style.backgroundPosition).toBe("-80px -120px")
    // …but React state hasn't committed yet (no re-render per tick).
    expect(apiRef.current!.transform.offset).toEqual({ x: 0, y: 0 })
  })

  it("commits the final transform to state once after the gesture settles", () => {
    vi.useFakeTimers()
    const { apiRef, content } = mount(true)

    for (let i = 0; i < 12; i++) {
      wheel(content, { deltaX: 40, deltaY: 60 })
    }
    expect(apiRef.current!.transform.offset).toEqual({ x: 0, y: 0 })

    act(() => {
      vi.runAllTimers()
    })
    expect(apiRef.current!.transform.offset).toEqual({ x: -480, y: -720 })
    // Committed state re-renders the same styles the gesture already applied.
    expect(content.style.transform).toBe("translate(-480px, -720px) scale(1)")
  })

  it("zooms toward the cursor on ctrl+wheel through the same gesture path", () => {
    vi.useFakeTimers()
    const { apiRef, content } = mount(true)

    wheel(content, { deltaY: -1, ctrlKey: true, clientX: 100, clientY: 50 })
    expect(content.style.transform).toContain("scale(1.15)")
    expect(apiRef.current!.transform.scale).toBe(1)

    act(() => {
      vi.runAllTimers()
    })
    expect(apiRef.current!.transform.scale).toBeCloseTo(1.15)
  })

  it("gesture math chains across ticks from the live value, not stale state", () => {
    vi.useFakeTimers()
    const { apiRef, content } = mount(true)

    wheel(content, { deltaY: -1, ctrlKey: true, clientX: 0, clientY: 0 })
    wheel(content, { deltaY: -1, ctrlKey: true, clientX: 0, clientY: 0 })
    act(() => {
      vi.runAllTimers()
    })
    // 1 * 1.15 * 1.15, not 1.15 twice from a stale base.
    expect(apiRef.current!.transform.scale).toBeCloseTo(1.3225)
  })

  it("falls back to state-per-tick when no gesture refs are attached", () => {
    const { apiRef, surface } = mount(false)

    wheel(surface, { deltaX: 40, deltaY: 60 })
    expect(apiRef.current!.transform.offset).toEqual({ x: -40, y: -60 })
  })

  it("programmatic setters stay state-driven and reseed the next gesture", () => {
    vi.useFakeTimers()
    const { apiRef, content } = mount(true)

    act(() => {
      apiRef.current!.panTo(100, 200)
    })
    expect(apiRef.current!.transform.offset).toEqual({ x: 100, y: 200 })

    wheel(content, { deltaX: 10, deltaY: 10 })
    act(() => {
      vi.runAllTimers()
    })
    expect(apiRef.current!.transform.offset).toEqual({ x: 90, y: 190 })
  })
})
