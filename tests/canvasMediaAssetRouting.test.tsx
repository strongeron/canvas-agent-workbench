// @vitest-environment jsdom

import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { useCanvasAddHandlers } from "../hooks/useCanvasAddHandlers"
import type { CanvasHistoryToast } from "../hooks/useCanvasMutationHistory"
import type { CanvasItemInput } from "../types/canvas"

const storeCanvasDocumentMediaFile = vi.fn()
const storeLocalMediaFile = vi.fn()

vi.mock("../components/canvas/mediaStorageService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../components/canvas/mediaStorageService")>()
  return {
    ...actual,
    storeCanvasDocumentMediaFile: (...args: unknown[]) => storeCanvasDocumentMediaFile(...args),
    storeLocalMediaFile: (...args: unknown[]) => storeLocalMediaFile(...args),
  }
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

beforeEach(() => {
  storeCanvasDocumentMediaFile.mockReset()
  storeLocalMediaFile.mockReset()
})

afterEach(() => {
  document.body.innerHTML = ""
})

type AddHandlersApi = ReturnType<typeof useCanvasAddHandlers>

function mountAddHandlers(options: {
  activeProjectId?: string
  activeCanvasFilePath?: string | null
  ensureCanvasFileMaterialized?: () => Promise<{ path: string } | null>
}) {
  const container = document.createElement("div")
  document.body.appendChild(container)
  const root = createRoot(container)
  const ref: { current: AddHandlersApi | null } = { current: null }
  const added: CanvasItemInput[] = []
  const lifecycleEvents: Array<{ action: string; meta?: Record<string, unknown> }> = []
  const toasts: CanvasHistoryToast[] = []
  const ensure =
    options.ensureCanvasFileMaterialized ?? (async () => ({ path: "untitled.canvas" }))
  const ensureSpy = vi.fn(ensure)

  function Probe() {
    ref.current = useCanvasAddHandlers({
      items: [],
      selectedIds: [],
      selectedArtboardItem: null,
      addItem: (item) => {
        added.push(item)
        return `added-${added.length}`
      },
      transform: { scale: 1, offset: { x: 0, y: 0 } },
      workspaceSize: { width: 1200, height: 800 },
      activeProjectId: options.activeProjectId,
      activeCanvasFilePath: options.activeCanvasFilePath ?? null,
      ensureCanvasFileMaterialized: ensureSpy,
      emitUserAction: () => {},
      emitFileLifecycle: (action, meta) => {
        lifecycleEvents.push({ action, meta })
      },
      setPropsPanelVisible: () => {},
      setSidebarVisible: () => {},
      setHistoryToast: (toast) => {
        if (toast && typeof toast === "object") toasts.push(toast as CanvasHistoryToast)
      },
      importCanvasHtmlBundle: async () => {
        throw new Error("not used in these tests")
      },
      refreshCanvasFiles: async () => {},
      runCanvasPersistenceTask: (task) => task(),
    })
    return null
  }

  act(() => {
    root.render(<Probe />)
  })

  return {
    api: () => ref.current as AddHandlersApi,
    added,
    lifecycleEvents,
    toasts,
    ensureSpy,
    cleanup: () => {
      act(() => {
        root.unmount()
      })
      container.remove()
    },
  }
}

function makeFile(name = "shot.png") {
  return new File(["binary"], name, { type: "image/png" })
}

describe("media asset routing (FOX2-69)", () => {
  it("materializes the canvas file first and stores the asset with the document", async () => {
    storeCanvasDocumentMediaFile.mockResolvedValue({
      status: "ready",
      mediaUrl: "/projects/proj-1/canvases/.assets/media/shot.png",
      provider: "canvas-document",
      storedAt: "2026-07-10T00:00:00.000Z",
    })
    const harness = mountAddHandlers({ activeProjectId: "proj-1", activeCanvasFilePath: null })

    await act(async () => {
      await harness.api().handleAddMedia({ file: makeFile() })
    })

    expect(harness.ensureSpy).toHaveBeenCalledTimes(1)
    expect(storeCanvasDocumentMediaFile).toHaveBeenCalledTimes(1)
    expect(storeCanvasDocumentMediaFile.mock.calls[0][0]).toMatchObject({
      projectId: "proj-1",
      canvasPath: "untitled.canvas",
    })
    expect(storeLocalMediaFile).not.toHaveBeenCalled()
    expect(harness.toasts).toEqual([])
    expect(harness.lifecycleEvents).toEqual([])
    expect(harness.added).toHaveLength(1)
    harness.cleanup()
  })

  it("uses the already-open canvas file without materializing", async () => {
    storeCanvasDocumentMediaFile.mockResolvedValue({
      status: "ready",
      mediaUrl: "/assets/shot.png",
      provider: "canvas-document",
    })
    const harness = mountAddHandlers({
      activeProjectId: "proj-1",
      activeCanvasFilePath: "board.canvas",
    })

    await act(async () => {
      await harness.api().handleAddMedia({ file: makeFile() })
    })

    expect(harness.ensureSpy).not.toHaveBeenCalled()
    expect(storeCanvasDocumentMediaFile.mock.calls[0][0]).toMatchObject({
      canvasPath: "board.canvas",
    })
    harness.cleanup()
  })

  it("falls back to the shared store loudly when the document store fails", async () => {
    storeCanvasDocumentMediaFile.mockResolvedValue({
      status: "error",
      reason: "Canvas asset directory is not writable.",
    })
    storeLocalMediaFile.mockResolvedValue({
      status: "ready",
      mediaUrl: "/media-store/shot.png",
      provider: "local-media-store",
    })
    const harness = mountAddHandlers({
      activeProjectId: "proj-1",
      activeCanvasFilePath: "board.canvas",
    })

    await act(async () => {
      await harness.api().handleAddMedia({ file: makeFile() })
    })

    expect(storeLocalMediaFile).toHaveBeenCalledTimes(1)
    expect(harness.toasts).toHaveLength(1)
    expect(harness.toasts[0].tone).toBe("error")
    expect(harness.toasts[0].message).toContain("shared media store")
    expect(harness.toasts[0].message).toContain("Canvas asset directory is not writable.")
    expect(harness.lifecycleEvents).toEqual([
      {
        action: "asset-fallback",
        meta: expect.objectContaining({
          fileName: "shot.png",
          reason: "Canvas asset directory is not writable.",
        }),
      },
    ])
    expect(harness.added).toHaveLength(1)
    harness.cleanup()
  })

  it("keeps the shared store as the silent primary when no project is selected", async () => {
    storeLocalMediaFile.mockResolvedValue({
      status: "ready",
      mediaUrl: "/media-store/shot.png",
      provider: "local-media-store",
    })
    const harness = mountAddHandlers({ activeProjectId: undefined })

    await act(async () => {
      await harness.api().handleAddMedia({ file: makeFile() })
    })

    expect(harness.ensureSpy).not.toHaveBeenCalled()
    expect(storeCanvasDocumentMediaFile).not.toHaveBeenCalled()
    expect(storeLocalMediaFile).toHaveBeenCalledTimes(1)
    expect(harness.toasts).toEqual([])
    expect(harness.lifecycleEvents).toEqual([])
    harness.cleanup()
  })
})
