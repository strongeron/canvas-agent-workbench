// @vitest-environment jsdom

import React from "react"
import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import { CanvasSidebar } from "../components/canvas/CanvasSidebar"

type HtmlBundleImportInput = {
  files?: File[]
  fileEntries?: Array<{ file: File; relativePath: string }>
  title?: string
}

async function flushFrames(count = 2) {
  for (let index = 0; index < count; index += 1) {
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })
  }
}

async function renderSidebar(props: Partial<React.ComponentProps<typeof CanvasSidebar>> = {}) {
  const host = document.createElement("div")
  document.body.appendChild(host)
  const root = createRoot(host)

  await act(async () => {
    root.render(
      <CanvasSidebar
        entries={[]}
        onAddEmbed={() => {}}
        onAddMedia={() => {}}
        activeProjectId="demo"
        activeCanvasFilePath="boards/demo.canvas"
        activeCanvasFileTitle="Demo"
        {...props}
      />
    )
  })

  await flushFrames()

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

function setInputFiles(input: HTMLInputElement, files: File[]) {
  Object.defineProperty(input, "files", {
    configurable: true,
    value: files,
  })
}

function createRelativeFile(name: string, content: string, relativePath = name) {
  const file = new File([content], name, { type: "text/html" })
  Object.defineProperty(file, "webkitRelativePath", {
    configurable: true,
    value: relativePath,
  })
  return file
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
  document.body.innerHTML = ""
  window.localStorage.clear()
})

describe("canvas html import flow", () => {
  it("imports a picked standalone html file immediately", async () => {
    const onAddHtmlBundle = vi.fn(async (_input: HtmlBundleImportInput) => {})
    const rendered = await renderSidebar({ onAddHtmlBundle })

    const input = rendered.host.querySelector(
      'input[type="file"][accept=".html,.htm,text/html"]'
    )
    expect(input).toBeInstanceOf(HTMLInputElement)

    const file = new File(["<html><body>Hello</body></html>"], "career-launchpad-2026.html", {
      type: "text/html",
    })

    await act(async () => {
      setInputFiles(input as HTMLInputElement, [file])
      input?.dispatchEvent(new Event("change", { bubbles: true }))
    })
    await flushFrames()

    expect(onAddHtmlBundle).toHaveBeenCalledTimes(1)
    expect(onAddHtmlBundle).toHaveBeenCalledWith({
      fileEntries: [
        {
          file,
          relativePath: "career-launchpad-2026.html",
        },
      ],
      title: undefined,
    })

    expect(rendered.host.textContent).toContain("Imported career-launchpad-2026.html as an HTML node.")

    await rendered.cleanup()
  })

  it("imports the selected folder entry with its local dependencies", async () => {
    const onAddHtmlBundle = vi.fn(async (_input: HtmlBundleImportInput) => {})
    const rendered = await renderSidebar({ onAddHtmlBundle })

    const directoryInput = rendered.host.querySelector(
      'input[type="file"][webkitdirectory]'
    )
    expect(directoryInput).toBeInstanceOf(HTMLInputElement)

    const htmlFile = createRelativeFile(
      "index.html",
      '<html><head><link rel="stylesheet" href="./styles.css" /></head><body><img src="./hero.png" /></body></html>',
      "playground/landing/index.html"
    )
    const cssFile = createRelativeFile(
      "styles.css",
      '.hero { background-image: url("./hero.png"); }',
      "playground/landing/styles.css"
    )
    const imageFile = createRelativeFile(
      "hero.png",
      "pngdata",
      "playground/landing/hero.png"
    )

    await act(async () => {
      setInputFiles(directoryInput as HTMLInputElement, [htmlFile, cssFile, imageFile])
      directoryInput?.dispatchEvent(new Event("change", { bubbles: true }))
    })
    await flushFrames()

    expect(rendered.host.textContent).toContain("Selected folder scan")

    const entryButton = Array.from(rendered.host.querySelectorAll("button")).find((candidate) =>
      candidate.textContent?.trim() === "index.html"
    )
    expect(entryButton).toBeInstanceOf(HTMLButtonElement)

    await act(async () => {
      entryButton?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }))
    })
    await flushFrames()

    expect(onAddHtmlBundle).toHaveBeenCalledTimes(1)
    const firstCall = onAddHtmlBundle.mock.calls.at(0)?.[0] as
      | {
          title?: string
          fileEntries?: Array<{ relativePath: string }>
        }
      | undefined
    expect(firstCall?.title).toBeUndefined()
    expect(firstCall?.fileEntries).toHaveLength(3)
    expect(firstCall?.fileEntries?.map((entry) => entry.relativePath)).toEqual([
      "landing/hero.png",
      "landing/index.html",
      "landing/styles.css",
    ])

    await rendered.cleanup()
  })
})
