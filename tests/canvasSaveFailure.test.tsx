// @vitest-environment jsdom

import { act, useState } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import {
  useCanvasFilePersistence,
  type ActiveCanvasFile,
} from "../hooks/useCanvasFilePersistence"
import type {
  CanvasChangeMeta,
  CanvasDocumentChangeEvent,
  CanvasDocumentChangeListener,
} from "../hooks/useCanvasState"
import type { CanvasFileDocument, CanvasItem, CanvasTransform } from "../types/canvas"

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

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ""
})

function makeItem(id: string): CanvasItem {
  return {
    id,
    type: "markdown",
    position: { x: 0, y: 0 },
    size: { width: 320, height: 220 },
    rotation: 0,
    zIndex: 1,
    source: `# ${id}`,
  }
}

function makeFile(title: string, document: unknown): ActiveCanvasFile {
  return {
    path: `${title.toLowerCase()}.canvas`,
    document: {
      kind: "gallery-poc.canvas",
      schemaVersion: 1,
      surface: "canvas",
      meta: {
        id: title,
        title,
        slug: title.toLowerCase(),
        projectId: "proj-1",
        createdAt: "2026-07-10T00:00:00.000Z",
        updatedAt: "2026-07-10T00:00:00.000Z",
        tags: [],
        favorite: false,
        archived: false,
      },
      document,
    } as CanvasFileDocument,
  }
}

const noop = () => {}
const stubReject = () => Promise.reject(new Error("not implemented in test"))
const DEFAULT_TRANSFORM: CanvasTransform = { scale: 1, offset: { x: 0, y: 0 } }
const EMPTY_GROUPS: never[] = []

function makeChangeStream() {
  const listeners = new Set<CanvasDocumentChangeListener>()
  return {
    subscribe: (listener: CanvasDocumentChangeListener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    emit: (meta: CanvasChangeMeta) => {
      const event: CanvasDocumentChangeEvent = {
        meta,
        prevSnapshot: { items: [], groups: [] },
        nextSnapshot: { items: [], groups: [] },
      }
      listeners.forEach((listener) => listener(event))
    },
  }
}

type HarnessResult = ReturnType<typeof useCanvasFilePersistence>

interface HarnessProps {
  items: CanvasItem[]
  saveCanvasFile: Parameters<typeof useCanvasFilePersistence>[0]["saveCanvasFile"]
  emitFileLifecycle: (action: string, meta?: Record<string, unknown>) => void
  subscribeToDocumentChanges: Parameters<
    typeof useCanvasFilePersistence
  >[0]["subscribeToDocumentChanges"]
  capture: (result: HarnessResult, activeCanvasFile: ActiveCanvasFile | null) => void
}

function Harness({
  items,
  saveCanvasFile,
  emitFileLifecycle,
  subscribeToDocumentChanges,
  capture,
}: HarnessProps) {
  const [activeCanvasFile, setActiveCanvasFile] = useState<ActiveCanvasFile | null>(null)

  const result = useCanvasFilePersistence({
    activeProjectId: "proj-1",
    items,
    groups: EMPTY_GROUPS,
    nextZIndex: items.length + 1,
    transform: DEFAULT_TRANSFORM,
    replaceState: noop,
    setViewport: noop,
    resetZoom: noop,
    activeCanvasFile,
    setActiveCanvasFile,
    activeCanvasFilePath: activeCanvasFile?.path ?? null,
    canvasFiles: [],
    canvasFilesLoading: false,
    canvasFilesLoaded: true,
    canvasFilesSaving: false,
    openCanvasFile: stubReject,
    createCanvasFile: async (input) => makeFile(input.title, input.document),
    saveCanvasFile,
    updateCanvasFileMetadata: stubReject,
    moveCanvasFile: stubReject,
    duplicateCanvasFile: stubReject,
    deleteCanvasFile: stubReject,
    canvasFileBrowser: {
      lastActivePath: null,
      replaceTrackedPath: noop,
      removeTrackedPath: noop,
    },
    emitFileLifecycle,
    subscribeToDocumentChanges,
  })

  capture(result, activeCanvasFile)
  return null
}

/**
 * Boot the hook into a dirty, file-backed state: materialize via a first
 * mutation, then a second mutation leaves unsaved changes for autosave.
 */
async function renderDirtyHarness(
  saveCanvasFile: HarnessProps["saveCanvasFile"],
  emitFileLifecycle: (action: string, meta?: Record<string, unknown>) => void
) {
  const host = document.createElement("div")
  document.body.appendChild(host)
  const root: Root = createRoot(host)
  const state: {
    result: HarnessResult | null
    activeCanvasFile: ActiveCanvasFile | null
  } = { result: null, activeCanvasFile: null }
  const stream = makeChangeStream()

  const capture: HarnessProps["capture"] = (result, activeCanvasFile) => {
    state.result = result
    state.activeCanvasFile = activeCanvasFile
  }

  const render = async (items: CanvasItem[]) => {
    await act(async () => {
      root.render(
        <Harness
          items={items}
          saveCanvasFile={saveCanvasFile}
          emitFileLifecycle={emitFileLifecycle}
          subscribeToDocumentChanges={stream.subscribe}
          capture={capture}
        />
      )
    })
  }

  await render([])
  await act(async () => {
    stream.emit({ actor: "user", source: "add-item" })
  })
  await render([makeItem("a")])
  expect(state.activeCanvasFile?.path).toBe("untitled.canvas")

  // Second mutation: dirty relative to the materialized signature.
  await act(async () => {
    stream.emit({ actor: "user", source: "add-item" })
  })
  await render([makeItem("a"), makeItem("b")])

  return {
    state,
    advance: async (ms: number) => {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(ms)
      })
    },
    cleanup: async () => {
      await act(async () => {
        root.unmount()
      })
      host.remove()
    },
  }
}

describe("save-failed state machine (FOX2-70)", () => {
  it("retries with backoff, then stops in a persistent exhausted state", async () => {
    const saveCanvasFile = vi.fn().mockRejectedValue(new Error("disk full"))
    const events: Array<{ action: string; meta?: Record<string, unknown> }> = []
    const harness = await renderDirtyHarness(saveCanvasFile, (action, meta) =>
      void events.push({ action, meta })
    )

    // Attempt 1 at the base 900ms cadence.
    await harness.advance(900)
    expect(saveCanvasFile).toHaveBeenCalledTimes(1)
    expect(harness.state.result?.canvasSaveFailure).toMatchObject({
      message: "disk full",
      attempts: 1,
      exhausted: false,
    })

    // Attempt 2 after 1800ms, attempt 3 after 3600ms.
    await harness.advance(1800)
    expect(saveCanvasFile).toHaveBeenCalledTimes(2)
    await harness.advance(3600)
    expect(saveCanvasFile).toHaveBeenCalledTimes(3)
    expect(harness.state.result?.canvasSaveFailure).toMatchObject({
      attempts: 3,
      exhausted: true,
    })
    expect(events.filter((event) => event.action === "save-failed")).toEqual([
      {
        action: "save-failed",
        meta: { path: "untitled.canvas", reason: "disk full", attempts: 3 },
      },
    ])

    // Exhausted means exhausted: no more attempts, ever.
    await harness.advance(120_000)
    expect(saveCanvasFile).toHaveBeenCalledTimes(3)
    await harness.cleanup()
  })

  it("Retry clears the failed state and a successful save emits save-recovered", async () => {
    const saveCanvasFile = vi
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockRejectedValueOnce(new Error("boom"))
      .mockRejectedValueOnce(new Error("boom"))
      .mockImplementation(async (path: string, document: CanvasFileDocument) => ({
        path,
        document,
      }))
    const events: Array<{ action: string; meta?: Record<string, unknown> }> = []
    const harness = await renderDirtyHarness(saveCanvasFile, (action, meta) =>
      void events.push({ action, meta })
    )

    await harness.advance(900)
    await harness.advance(1800)
    await harness.advance(3600)
    expect(harness.state.result?.canvasSaveFailure?.exhausted).toBe(true)

    await act(async () => {
      harness.state.result?.retryCanvasSave()
    })
    expect(saveCanvasFile).toHaveBeenCalledTimes(4)
    expect(harness.state.result?.canvasSaveFailure).toBeNull()
    expect(events.some((event) => event.action === "save-recovered")).toBe(true)
    await harness.cleanup()
  })

  it("a mid-stream success clears the failure before it exhausts", async () => {
    const saveCanvasFile = vi
      .fn()
      .mockRejectedValueOnce(new Error("blip"))
      .mockImplementation(async (path: string, document: CanvasFileDocument) => ({
        path,
        document,
      }))
    const events: Array<{ action: string; meta?: Record<string, unknown> }> = []
    const harness = await renderDirtyHarness(saveCanvasFile, (action, meta) =>
      void events.push({ action, meta })
    )

    await harness.advance(900)
    expect(harness.state.result?.canvasSaveFailure?.attempts).toBe(1)

    await harness.advance(1800)
    expect(saveCanvasFile).toHaveBeenCalledTimes(2)
    expect(harness.state.result?.canvasSaveFailure).toBeNull()
    expect(events.some((event) => event.action === "save-recovered")).toBe(true)
    expect(events.some((event) => event.action === "save-failed")).toBe(false)
    await harness.cleanup()
  })
})
