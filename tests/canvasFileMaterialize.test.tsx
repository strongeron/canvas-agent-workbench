// @vitest-environment jsdom

import { act, useState } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import {
  nextUntitledCanvasTitle,
  useCanvasFilePersistence,
  type ActiveCanvasFile,
} from "../hooks/useCanvasFilePersistence"
import type {
  CanvasChangeMeta,
  CanvasDocumentChangeEvent,
  CanvasDocumentChangeListener,
} from "../hooks/useCanvasState"
import type {
  CanvasFileDocument,
  CanvasFileIndexEntry,
  CanvasItem,
  CanvasTransform,
} from "../types/canvas"

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

afterEach(() => {
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

function makeIndexEntry(title: string): CanvasFileIndexEntry {
  return {
    id: title,
    projectId: "proj-1",
    path: `${title.toLowerCase().replace(/\s+/g, "-")}.canvas`,
    title,
    surface: "canvas",
    updatedAt: "2026-07-10T00:00:00.000Z",
    createdAt: "2026-07-10T00:00:00.000Z",
    tags: [],
    favorite: false,
    archived: false,
    itemCount: 0,
    groupCount: 0,
  }
}

function makeCreatedFile(title: string, document: unknown): ActiveCanvasFile {
  return {
    path: `${title.toLowerCase().replace(/\s+/g, "-")}.canvas`,
    document: {
      kind: "gallery-poc.canvas",
      schemaVersion: 1,
      surface: "canvas",
      meta: {
        id: title,
        title,
        slug: title.toLowerCase().replace(/\s+/g, "-"),
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

type HarnessResult = ReturnType<typeof useCanvasFilePersistence>

// Stable identities: the hook's callbacks depend on these, and unstable
// references would re-run its effects on every render — masking (or faking)
// retry behavior the tests assert on.
const noop = () => {}
const stubReject = () => Promise.reject(new Error("not implemented in test"))
const DEFAULT_TRANSFORM: CanvasTransform = { scale: 1, offset: { x: 0, y: 0 } }
const EMPTY_FILES: CanvasFileIndexEntry[] = []
const EMPTY_GROUPS: never[] = []
const canvasFileBrowserStub = {
  lastActivePath: null,
  replaceTrackedPath: noop,
  removeTrackedPath: noop,
}

/**
 * Stand-in for the FOX2-66 change stream: tests emit change events the way
 * `applyChange` does (synchronously, before the mutated props re-render).
 */
function makeChangeStream() {
  const listeners = new Set<CanvasDocumentChangeListener>()
  return {
    subscribe: (listener: CanvasDocumentChangeListener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    emit: (meta: CanvasChangeMeta, snapshots?: Pick<CanvasDocumentChangeEvent, "prevSnapshot" | "nextSnapshot">) => {
      const event: CanvasDocumentChangeEvent = {
        meta,
        // Distinct references = a real document mutation (matches how the
        // state mutators produce new arrays). Selection-only changes pass
        // shared references via `snapshots`.
        prevSnapshot: snapshots?.prevSnapshot ?? { items: [], groups: [] },
        nextSnapshot: snapshots?.nextSnapshot ?? { items: [], groups: [] },
      }
      listeners.forEach((listener) => listener(event))
    },
  }
}

interface HarnessProps {
  items: CanvasItem[]
  transform?: CanvasTransform
  canvasFiles?: CanvasFileIndexEntry[]
  canvasFilesLoaded?: boolean
  createCanvasFile: Parameters<typeof useCanvasFilePersistence>[0]["createCanvasFile"]
  emitFileLifecycle?: (action: string, meta?: Record<string, unknown>) => void
  subscribeToDocumentChanges: Parameters<
    typeof useCanvasFilePersistence
  >[0]["subscribeToDocumentChanges"]
  capture: (result: HarnessResult, activeCanvasFile: ActiveCanvasFile | null) => void
}

function Harness({
  items,
  transform = DEFAULT_TRANSFORM,
  canvasFiles = EMPTY_FILES,
  canvasFilesLoaded = true,
  createCanvasFile,
  emitFileLifecycle = noop,
  subscribeToDocumentChanges,
  capture,
}: HarnessProps) {
  const [activeCanvasFile, setActiveCanvasFile] = useState<ActiveCanvasFile | null>(null)

  const result = useCanvasFilePersistence({
    activeProjectId: "proj-1",
    items,
    groups: EMPTY_GROUPS,
    nextZIndex: items.length + 1,
    transform,
    replaceState: noop,
    setViewport: noop,
    resetZoom: noop,
    activeCanvasFile,
    setActiveCanvasFile,
    activeCanvasFilePath: activeCanvasFile?.path ?? null,
    canvasFiles,
    canvasFilesLoading: false,
    canvasFilesLoaded,
    canvasFilesSaving: false,
    openCanvasFile: stubReject,
    createCanvasFile,
    saveCanvasFile: stubReject,
    updateCanvasFileMetadata: stubReject,
    moveCanvasFile: stubReject,
    duplicateCanvasFile: stubReject,
    deleteCanvasFile: stubReject,
    canvasFileBrowser: canvasFileBrowserStub,
    emitFileLifecycle,
    subscribeToDocumentChanges,
  })

  capture(result, activeCanvasFile)
  return null
}

async function renderHarness(
  props: Omit<HarnessProps, "capture" | "subscribeToDocumentChanges">
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

  const rerender = async (nextProps: Omit<HarnessProps, "capture" | "subscribeToDocumentChanges">) => {
    await act(async () => {
      root.render(
        <Harness {...nextProps} subscribeToDocumentChanges={stream.subscribe} capture={capture} />
      )
    })
  }

  await rerender(props)

  /**
   * A genuine mutation the way the app produces one: the change stream fires
   * synchronously, then the mutated document commits on the next render.
   */
  const mutate = async (
    nextProps: Omit<HarnessProps, "capture" | "subscribeToDocumentChanges">,
    meta: CanvasChangeMeta = { actor: "user", source: "add-item" }
  ) => {
    await act(async () => {
      stream.emit(meta)
    })
    await rerender(nextProps)
  }

  return {
    state,
    stream,
    rerender,
    mutate,
    cleanup: async () => {
      await act(async () => {
        root.unmount()
      })
      host.remove()
    },
  }
}

describe("nextUntitledCanvasTitle", () => {
  it("starts at Untitled and bumps past existing titles", () => {
    expect(nextUntitledCanvasTitle([])).toBe("Untitled")
    expect(nextUntitledCanvasTitle([makeIndexEntry("Untitled")])).toBe("Untitled 2")
    expect(
      nextUntitledCanvasTitle([
        makeIndexEntry("Untitled"),
        makeIndexEntry("untitled 2"),
        makeIndexEntry("Homepage"),
      ])
    ).toBe("Untitled 3")
  })
})

describe("draft materialization (FOX2-71)", () => {
  it("settles restore for a project with zero files", async () => {
    const createCanvasFile = vi.fn()
    const harness = await renderHarness({ items: [], createCanvasFile })

    expect(harness.state.result?.hasRestoredCanvasFile).toBe(true)
    expect(createCanvasFile).not.toHaveBeenCalled()
    await harness.cleanup()
  })

  it("does not materialize from restore, pan/zoom, or replace-state", async () => {
    const createCanvasFile = vi.fn()
    const restoredItems = [makeItem("restored")]
    const harness = await renderHarness({ items: restoredItems, createCanvasFile })

    // Restored draft content arrives without a change event — not a mutation.
    expect(createCanvasFile).not.toHaveBeenCalled()

    // Transform-only changes never materialize.
    await harness.rerender({
      items: restoredItems,
      transform: { scale: 2, offset: { x: 40, y: -10 } },
      createCanvasFile,
    })
    expect(createCanvasFile).not.toHaveBeenCalled()

    // Workspace replaces (file open) carry `replace-state` and are skipped.
    await harness.mutate(
      { items: [makeItem("opened")], createCanvasFile },
      { actor: "user", source: "replace-state" }
    )
    expect(createCanvasFile).not.toHaveBeenCalled()
    await harness.cleanup()
  })

  it("never materializes from selection-only changes (shared document references)", async () => {
    const createCanvasFile = vi.fn()
    const harness = await renderHarness({ items: [], createCanvasFile })

    // select-item / clear-selection style events: same items/groups refs.
    const sharedSnapshot = { items: [], groups: [] }
    await act(async () => {
      harness.stream.emit(
        { actor: "user", source: "clear-selection" },
        { prevSnapshot: sharedSnapshot, nextSnapshot: sharedSnapshot }
      )
    })
    await harness.rerender({ items: [], createCanvasFile })

    expect(createCanvasFile).not.toHaveBeenCalled()
    await harness.cleanup()
  })

  it("materializes an Untitled file on the first document mutation", async () => {
    const emitFileLifecycle = vi.fn()
    const createCanvasFile = vi.fn(
      async (input: { title: string; document?: unknown }) =>
        makeCreatedFile(input.title, input.document)
    )
    const harness = await renderHarness({ items: [], createCanvasFile, emitFileLifecycle })

    await harness.mutate({ items: [makeItem("first")], createCanvasFile, emitFileLifecycle })

    expect(createCanvasFile).toHaveBeenCalledTimes(1)
    const input = createCanvasFile.mock.calls[0][0] as {
      title: string
      document: { items: CanvasItem[] }
    }
    expect(input.title).toBe("Untitled")
    expect(input.document.items.map((item) => item.id)).toEqual(["first"])
    expect(harness.state.activeCanvasFile?.document.meta.title).toBe("Untitled")
    expect(emitFileLifecycle).toHaveBeenCalledWith("file-create", {
      path: "untitled.canvas",
      title: "Untitled",
      reason: "auto-materialize",
    })
    await harness.cleanup()
  })

  it("materializes agent mutations the same as user mutations", async () => {
    const createCanvasFile = vi.fn(
      async (input: { title: string; document?: unknown }) =>
        makeCreatedFile(input.title, input.document)
    )
    const harness = await renderHarness({ items: [], createCanvasFile })

    await harness.mutate(
      { items: [makeItem("agent-made")], createCanvasFile },
      { actor: "agent", source: "create_item" }
    )

    expect(createCanvasFile).toHaveBeenCalledTimes(1)
    expect(harness.state.activeCanvasFile?.path).toBe("untitled.canvas")
    await harness.cleanup()
  })

  it("materializes a mutation that lands before the file index loads", async () => {
    const createCanvasFile = vi.fn(
      async (input: { title: string; document?: unknown }) =>
        makeCreatedFile(input.title, input.document)
    )
    const harness = await renderHarness({
      items: [],
      canvasFilesLoaded: false,
      createCanvasFile,
    })

    // Mutation while the index is still loading: no create yet…
    await harness.mutate({
      items: [makeItem("early")],
      canvasFilesLoaded: false,
      createCanvasFile,
    })
    expect(createCanvasFile).not.toHaveBeenCalled()

    // …but the pending mutation materializes as soon as restore settles.
    await harness.rerender({ items: [makeItem("early")], createCanvasFile })
    expect(createCanvasFile).toHaveBeenCalledTimes(1)
    const input = createCanvasFile.mock.calls[0][0] as { document: { items: CanvasItem[] } }
    expect(input.document.items.map((item) => item.id)).toEqual(["early"])
    await harness.cleanup()
  })

  it("bumps the title past existing Untitled files", async () => {
    const canvasFiles = [makeIndexEntry("Untitled"), makeIndexEntry("Homepage")]
    const createCanvasFile = vi.fn(
      async (input: { title: string; document?: unknown }) =>
        makeCreatedFile(input.title, input.document)
    )
    const harness = await renderHarness({ items: [], canvasFiles, createCanvasFile })
    expect(harness.state.result?.hasRestoredCanvasFile).toBe(true)

    await harness.mutate({ items: [makeItem("first")], canvasFiles, createCanvasFile })

    expect(createCanvasFile).toHaveBeenCalledTimes(1)
    expect((createCanvasFile.mock.calls[0][0] as { title: string }).title).toBe("Untitled 2")
    await harness.cleanup()
  })

  it("creates only one file for rapid successive mutations", async () => {
    let resolveCreate: ((file: ActiveCanvasFile) => void) | null = null
    const createCanvasFile = vi.fn(
      () =>
        new Promise<ActiveCanvasFile>((resolve) => {
          resolveCreate = resolve
        })
    )
    const harness = await renderHarness({ items: [], createCanvasFile })

    await harness.mutate({ items: [makeItem("a")], createCanvasFile })
    await harness.mutate({ items: [makeItem("a"), makeItem("b")], createCanvasFile })

    expect(createCanvasFile).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveCreate?.(makeCreatedFile("Untitled", { items: [makeItem("a")] }))
    })
    expect(harness.state.activeCanvasFile?.path).toBe("untitled.canvas")
    await harness.cleanup()
  })

  it("stops materializing once a file is active — later mutations autosave instead", async () => {
    const createCanvasFile = vi.fn(
      async (input: { title: string; document?: unknown }) =>
        makeCreatedFile(input.title, input.document)
    )
    const harness = await renderHarness({ items: [], createCanvasFile })

    await harness.mutate({ items: [makeItem("first")], createCanvasFile })
    expect(createCanvasFile).toHaveBeenCalledTimes(1)
    expect(harness.state.activeCanvasFile?.path).toBe("untitled.canvas")

    await harness.mutate({
      items: [makeItem("first"), makeItem("second")],
      createCanvasFile,
    })
    expect(createCanvasFile).toHaveBeenCalledTimes(1)
    await harness.cleanup()
  })

  it("retries a failed materialize only on the next mutation, never in a loop", async () => {
    const createCanvasFile = vi
      .fn<
        (input: { title: string; document?: unknown }) => Promise<ActiveCanvasFile>
      >()
      .mockRejectedValueOnce(new Error("disk full"))
      .mockImplementation(async (input) => makeCreatedFile(input.title, input.document))
    const warn = vi.spyOn(window.console, "warn").mockImplementation(() => {})
    const harness = await renderHarness({ items: [], createCanvasFile })

    const itemsA = [makeItem("a")]
    await harness.mutate({ items: itemsA, createCanvasFile })
    expect(createCanvasFile).toHaveBeenCalledTimes(1)
    expect(harness.state.activeCanvasFile).toBeNull()

    // Unrelated re-render with the same document (stable state identity in
    // the app): no hot retry.
    await harness.rerender({ items: itemsA, createCanvasFile })
    expect(createCanvasFile).toHaveBeenCalledTimes(1)

    // The next document mutation retries and succeeds.
    await harness.mutate({ items: [makeItem("a"), makeItem("b")], createCanvasFile })
    expect(createCanvasFile).toHaveBeenCalledTimes(2)
    expect(harness.state.activeCanvasFile?.path).toBe("untitled.canvas")
    warn.mockRestore()
    await harness.cleanup()
  })
})
