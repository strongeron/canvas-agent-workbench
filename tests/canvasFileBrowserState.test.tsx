// @vitest-environment jsdom

import React, { useEffect } from "react"
import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"

import { useCanvasFileBrowserState } from "../hooks/useCanvasFileBrowserState"
import type { CanvasFileIndexEntry } from "../types/canvas"

type HookSnapshot = ReturnType<typeof useCanvasFileBrowserState>

function createCanvasFile(path: string, title: string): CanvasFileIndexEntry {
  return {
    id: path,
    projectId: "demo",
    path,
    title,
    surface: "canvas",
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    tags: [],
    favorite: false,
    archived: false,
    itemCount: 0,
    groupCount: 0,
  }
}

async function flushFrame() {
  await act(async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 0))
  })
}

let latestHookValue: HookSnapshot | null = null

function HookHarness({
  files,
  activePath,
}: {
  files: CanvasFileIndexEntry[]
  activePath: string | null
}) {
  const value = useCanvasFileBrowserState("canvas-browser-test", files, activePath, "canvas")

  useEffect(() => {
    latestHookValue = value
  }, [value])

  return null
}

async function renderHarness(props: { files: CanvasFileIndexEntry[]; activePath: string | null }) {
  const host = document.createElement("div")
  document.body.appendChild(host)
  const root = createRoot(host)

  await act(async () => {
    root.render(<HookHarness {...props} />)
  })
  await flushFrame()

  return {
    rerender: async (nextProps: { files: CanvasFileIndexEntry[]; activePath: string | null }) => {
      await act(async () => {
        root.render(<HookHarness {...nextProps} />)
      })
      await flushFrame()
    },
    cleanup: async () => {
      await act(async () => {
        root.unmount()
      })
      host.remove()
    },
  }
}

let originalActEnvironmentDescriptor: PropertyDescriptor | undefined

beforeAll(() => {
  originalActEnvironmentDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "IS_REACT_ACT_ENVIRONMENT"
  )
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
  latestHookValue = null
  document.body.innerHTML = ""
  window.localStorage.clear()
})

describe("useCanvasFileBrowserState", () => {
  it("persists the last active file path across rerenders", async () => {
    const file = createCanvasFile("root/html.canvas", "html")
    const rendered = await renderHarness({
      files: [file],
      activePath: file.path,
    })

    expect(latestHookValue?.lastActivePath).toBe(file.path)

    await rendered.rerender({
      files: [file],
      activePath: null,
    })

    expect(latestHookValue?.lastActivePath).toBe(file.path)

    await rendered.cleanup()
  })

  it("updates and clears the tracked active path when files move or disappear", async () => {
    const originalFile = createCanvasFile("root/html.canvas", "html")
    const movedFile = createCanvasFile("archive/html.canvas", "html")
    const rendered = await renderHarness({
      files: [originalFile],
      activePath: originalFile.path,
    })

    expect(latestHookValue?.lastActivePath).toBe(originalFile.path)

    await act(async () => {
      latestHookValue?.replaceTrackedPath(originalFile.path, movedFile.path)
    })
    await flushFrame()
    await rendered.rerender({
      files: [movedFile],
      activePath: null,
    })

    expect(latestHookValue?.lastActivePath).toBe(movedFile.path)

    await act(async () => {
      latestHookValue?.removeTrackedPath(movedFile.path)
    })
    await flushFrame()

    expect(latestHookValue?.lastActivePath).toBeNull()

    await rendered.cleanup()
  })
})
