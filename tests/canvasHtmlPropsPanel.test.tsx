// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import {
  CanvasHtmlPropsPanel,
  buildSlotComponentInsertion,
} from "../components/canvas/CanvasHtmlPropsPanel"
import type { CanvasHtmlSlotInfo } from "../utils/canvasHtmlEditor"
import {
  buildSlotNativePartInsertion,
  listSlotNativePartOptions,
} from "../utils/canvasNativeParts"
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

describe("native slot part helpers", () => {
  const mediaSlot: CanvasHtmlSlotInfo = {
    name: "media",
    canvasId: "x:2",
    tag: "figure",
    kind: "container",
    accepts: "image,svg,video",
    childElementCount: 1,
  }

  it("offers media parts for media-capable slots and hides them for text slots", () => {
    expect(listSlotNativePartOptions(mediaSlot).map((option) => option.kind)).toEqual([
      "div",
      "section",
      "header",
      "footer",
      "heading",
      "paragraph",
      "button",
      "link",
      "image",
      "svg",
      "video",
    ])
    expect(
      listSlotNativePartOptions({
        name: "title",
        canvasId: "x:3",
        tag: "h2",
        kind: "text",
        childElementCount: 0,
      })
    ).toEqual([])
  })

  it("builds media and native group insertion snippets", () => {
    expect(buildSlotNativePartInsertion(mediaSlot, "image")).toEqual({
      type: "insertChild",
      position: 1,
      childSource: '<img src="https://placehold.co/640x360/png?text=Media" alt="Media" />',
    })
    expect(
      buildSlotNativePartInsertion(mediaSlot, "image", {
        sourceUrl: "https://cdn.example.com/hero.jpg",
      })
    ).toEqual({
      type: "insertChild",
      position: 1,
      childSource: '<img src="https://cdn.example.com/hero.jpg" alt="Media" />',
    })
    expect(buildSlotNativePartInsertion(mediaSlot, "section")).toEqual({
      type: "insertChild",
      position: 1,
      childSource: "<section><h2>Media section</h2><p>Describe this section.</p></section>",
    })
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

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event("input", { bubbles: true }))
  input.dispatchEvent(new Event("change", { bubbles: true }))
}

const SLOT_HTML =
  '<!doctype html><html><body><article class="card">' +
  '<section data-slot="body" data-slot-kind="content"></section>' +
  "</article></body></html>"

const MEDIA_SLOT_HTML =
  '<!doctype html><html><body><article class="card">' +
  '<figure data-slot="media" data-slot-kind="container" data-slot-accepts="image,svg,video"></figure>' +
  "</article></body></html>"

const MEDIA_SLOT_WITH_IMAGE_HTML =
  '<!doctype html><html><body><article class="card">' +
  '<figure data-slot="media" data-slot-kind="container" data-slot-accepts="image,svg,video"><img src="https://placehold.co/640x360/png?text=Media" alt="Media" /></figure>' +
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

  it("inserts native html parts into container/media slots", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, primitives: [] }) }))
    )
    const onChange = vi.fn()
    harness = await mount(
      <CanvasHtmlPropsPanel
        sourceMode="inline"
        sourceHtml={MEDIA_SLOT_HTML}
        projectId="demo"
        onChange={onChange}
        onDelete={() => {}}
        onClose={() => {}}
      />
    )

    const select = harness.container.querySelector(
      "select[aria-label='HTML part for media']"
    ) as HTMLSelectElement
    expect(select).not.toBeNull()
    expect(select.querySelectorAll("option").length).toBeGreaterThan(4)

    await act(async () => {
      setSelectValue(select, "image")
    })
    const insertBtn = [...harness.container.querySelectorAll("button")].find(
      (b) => b.textContent === "Insert part"
    ) as HTMLButtonElement
    expect(insertBtn.disabled).toBe(false)
    await act(async () => {
      insertBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })

    const arg = onChange.mock.calls.at(-1)?.[0]
    expect(arg.sourceMode).toBe("inline")
    expect(arg.sourceHtml).toContain(
      '<figure data-slot="media" data-slot-kind="container" data-slot-accepts="image,svg,video"><img src="https://placehold.co/640x360/png?text=Media" alt="Media"></figure>'
    )
  })

  it("uses a custom source url for media slot insertion", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, primitives: [] }) }))
    )
    const onChange = vi.fn()
    harness = await mount(
      <CanvasHtmlPropsPanel
        sourceMode="inline"
        sourceHtml={MEDIA_SLOT_HTML}
        projectId="demo"
        onChange={onChange}
        onDelete={() => {}}
        onClose={() => {}}
      />
    )

    const select = harness.container.querySelector(
      "select[aria-label='HTML part for media']"
    ) as HTMLSelectElement
    expect(select).not.toBeNull()
    await act(async () => {
      setSelectValue(select, "image")
    })

    const urlInput = harness.container.querySelector(
      "input[aria-label='Source URL for media']"
    ) as HTMLInputElement
    expect(urlInput).not.toBeNull()
    await act(async () => {
      setInputValue(urlInput, "https://cdn.example.com/hero.jpg")
    })

    const insertBtn = [...harness.container.querySelectorAll("button")].find(
      (b) => b.textContent === "Insert part"
    ) as HTMLButtonElement
    await act(async () => {
      insertBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })

    const arg = onChange.mock.calls.at(-1)?.[0]
    expect(arg.sourceHtml).toContain(
      '<figure data-slot="media" data-slot-kind="container" data-slot-accepts="image,svg,video"><img src="https://cdn.example.com/hero.jpg" alt="Media"></figure>'
    )
  })

  it("removes the 'Save as component' affordance entirely (U3)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, primitives: [] }) }))
    )
    harness = await mount(
      <CanvasHtmlPropsPanel
        title="Promo Card"
        sourceMode="inline"
        sourceHtml={SLOT_HTML}
        sourceHtmlFilePath="projects/demo/components/PromoCard.html"
        projectId="demo"
        onChange={() => {}}
        onDelete={() => {}}
        onClose={() => {}}
      />
    )
    // No Save button, no Save dialog inputs — the whole step is gone.
    expect(
      harness.container.querySelector('button[aria-label="Save as component"]')
    ).toBeNull()
    expect(
      harness.container.querySelector('input[aria-label="Component name"]')
    ).toBeNull()
    expect(
      [...harness.container.querySelectorAll("button")].some((b) =>
        b.textContent?.includes("Save component")
      )
    ).toBe(false)
  })

  it("shows the Sync button only for file-backed items, labelled by sync history", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, primitives: [] }) }))
    )
    // Not file-backed → no Sync button.
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
      harness.container.querySelector('button[aria-label="Sync component"]')
    ).toBeNull()
    harness.cleanup()

    // File-backed, never synced → label "Sync".
    harness = await mount(
      <CanvasHtmlPropsPanel
        sourceMode="inline"
        sourceHtml={SLOT_HTML}
        sourceComponentSlug="promo-card"
        sourceComponentFilePath="projects/demo/components/PromoCard.html"
        projectId="demo"
        onChange={() => {}}
        onDelete={() => {}}
        onClose={() => {}}
      />
    )
    const syncBtn = harness.container.querySelector(
      'button[aria-label="Sync component"]'
    ) as HTMLButtonElement
    expect(syncBtn).not.toBeNull()
    expect(syncBtn.textContent).toContain("Sync")
    expect(syncBtn.textContent).not.toContain("Re-sync")
    harness.cleanup()

    // Synced before → steady label is "Re-sync".
    harness = await mount(
      <CanvasHtmlPropsPanel
        sourceMode="inline"
        sourceHtml={SLOT_HTML}
        sourceHtmlFilePath="projects/demo/components/PromoCard.html"
        syncedBefore
        projectId="demo"
        onChange={() => {}}
        onDelete={() => {}}
        onClose={() => {}}
      />
    )
    const reSyncBtn = harness.container.querySelector(
      'button[aria-label="Sync component"]'
    ) as HTMLButtonElement
    expect(reSyncBtn.textContent).toContain("Re-sync")
  })

  it("Sync button is inert (no state change) when onSync is undefined (U3)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, primitives: [] }) }))
    )
    harness = await mount(
      <CanvasHtmlPropsPanel
        sourceMode="inline"
        sourceHtml={SLOT_HTML}
        sourceComponentSlug="promo-card"
        projectId="demo"
        onChange={() => {}}
        onDelete={() => {}}
        onClose={() => {}}
      />
    )
    const syncBtn = harness.container.querySelector(
      'button[aria-label="Sync component"]'
    ) as HTMLButtonElement
    expect(syncBtn.getAttribute("data-sync-phase")).toBe("idle")
    await act(async () => {
      syncBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })
    // No onSync → stays idle, never disabled, label unchanged.
    expect(syncBtn.getAttribute("data-sync-phase")).toBe("idle")
    expect(syncBtn.disabled).toBe(false)
    expect(syncBtn.textContent).toContain("Sync")
  })

  it("Sync state machine: Sync → Syncing… → Synced ✓ → Re-sync", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, primitives: [] }) }))
    )
    vi.useFakeTimers()
    let resolveSync: (() => void) | null = null
    const onSync = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSync = resolve
        })
    )
    try {
      harness = await mount(
        <CanvasHtmlPropsPanel
          sourceMode="inline"
          sourceHtml={SLOT_HTML}
          sourceComponentSlug="promo-card"
          projectId="demo"
          onChange={() => {}}
          onDelete={() => {}}
          onClose={() => {}}
          onSync={onSync}
        />
      )
      const syncBtn = harness.container.querySelector(
        'button[aria-label="Sync component"]'
      ) as HTMLButtonElement
      expect(syncBtn.getAttribute("data-sync-phase")).toBe("idle")
      expect(syncBtn.textContent).toContain("Sync")

      // Click → Syncing…, disabled.
      await act(async () => {
        syncBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }))
      })
      expect(syncBtn.getAttribute("data-sync-phase")).toBe("syncing")
      expect(syncBtn.textContent).toContain("Syncing")
      expect(syncBtn.disabled).toBe(true)

      // Resolve → Synced ✓ (transient).
      await act(async () => {
        resolveSync?.()
        await Promise.resolve()
        await Promise.resolve()
      })
      expect(syncBtn.getAttribute("data-sync-phase")).toBe("synced")
      expect(syncBtn.textContent).toContain("Synced")

      // After the transient timeout → settles to Re-sync.
      await act(async () => {
        vi.advanceTimersByTime(2000)
      })
      expect(syncBtn.getAttribute("data-sync-phase")).toBe("idle")
      expect(syncBtn.textContent).toContain("Re-sync")
      expect(syncBtn.disabled).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it("Sync state machine: failure → Sync failed + inline templated error → prior label", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, primitives: [] }) }))
    )
    vi.useFakeTimers()
    const permissionError = Object.assign(new Error("EACCES: denied"), {
      class: "permission" as const,
    })
    const onSync = vi.fn(() => Promise.reject(permissionError))
    try {
      harness = await mount(
        <CanvasHtmlPropsPanel
          sourceMode="inline"
          sourceHtml={SLOT_HTML}
          sourceHtmlFilePath="projects/demo/components/PromoCard.html"
          syncedBefore
          projectId="demo"
          onChange={() => {}}
          onDelete={() => {}}
          onClose={() => {}}
          onSync={onSync}
        />
      )
      const syncBtn = harness.container.querySelector(
        'button[aria-label="Sync component"]'
      ) as HTMLButtonElement
      expect(syncBtn.textContent).toContain("Re-sync")

      await act(async () => {
        syncBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }))
        await Promise.resolve()
        await Promise.resolve()
      })
      expect(syncBtn.getAttribute("data-sync-phase")).toBe("failed")
      expect(syncBtn.textContent).toContain("Sync failed")
      // Templated per the `permission` error class, raw detail appended.
      const alert = harness.container.querySelector('[role="alert"]')
      expect(alert?.textContent).toContain("folder permissions")
      expect(alert?.textContent).toContain("EACCES: denied")

      // After the transient → reverts to the prior steady label (Re-sync).
      await act(async () => {
        vi.advanceTimersByTime(2500)
      })
      expect(syncBtn.getAttribute("data-sync-phase")).toBe("idle")
      expect(syncBtn.textContent).toContain("Re-sync")
      expect(harness.container.querySelector('[role="alert"]')).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it("updates slot metadata through the inspector controls", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, primitives: [] }) }))
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

    const nameInput = harness.container.querySelector(
      'input[aria-label="Slot name for body"]'
    ) as HTMLInputElement
    const kindSelect = harness.container.querySelector(
      'select[aria-label="Slot kind for body"]'
    ) as HTMLSelectElement
    const acceptsInput = harness.container.querySelector(
      'input[aria-label="Slot accepts for body"]'
    ) as HTMLInputElement
    expect(nameInput).not.toBeNull()
    expect(kindSelect).not.toBeNull()
    expect(acceptsInput).not.toBeNull()

    await act(async () => {
      setInputValue(nameInput, "copy")
      setSelectValue(kindSelect, "container")
      setInputValue(acceptsInput, "image,svg")
    })

    const applyButton = [...harness.container.querySelectorAll("button")].find(
      (button) => button.textContent === "Apply slot"
    ) as HTMLButtonElement
    await act(async () => {
      applyButton.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })

    const arg = onChange.mock.calls.at(-1)?.[0]
    expect(arg.sourceHtml).toContain(
      '<section data-slot="copy" data-slot-kind="container" data-slot-accepts="image,svg"></section>'
    )
  })

  it("shows file-backed html status when a source html file is attached", async () => {
    harness = await mount(
      <CanvasHtmlPropsPanel
        sourceMode="inline"
        sourceHtml={SLOT_HTML}
        sourceHtmlFilePath="projects/demo/components/PromoCard.html"
        sourceHtmlFileMtime={456}
        projectId="demo"
        onChange={() => {}}
        onDelete={() => {}}
        onClose={() => {}}
      />
    )

    const text = harness.container.textContent || ""
    expect(text).toContain("Saving will write to")
    expect(text).toContain("projects/demo/components/PromoCard.html")
  })

  // --- U6 Sync wiring (picker → detect → persist → POST; re-sync reuse) ---

  interface FetchCall {
    url: string
    body: Record<string, unknown>
  }

  function routeSyncFetch(options: {
    storedTarget?: Record<string, unknown> | null
    storedValid?: boolean
    detect?: Record<string, unknown>
    syncResponse?: { ok: boolean; status?: number; payload: Record<string, unknown> }
    calls: FetchCall[]
  }) {
    return vi.fn(async (url: string, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(String(init.body)) : {}
      options.calls.push({ url, body })
      if (url === "/api/canvas/registry/list") {
        return { ok: true, json: async () => ({ ok: true, primitives: [] }) }
      }
      if (url === "/api/canvas/project/sync-target") {
        if (body.mode === "write") {
          return {
            ok: true,
            json: async () => ({ ok: true, syncTarget: body.syncTarget }),
          }
        }
        return {
          ok: true,
          json: async () => ({
            ok: true,
            syncTarget: options.storedTarget ?? null,
            valid: options.storedValid === true,
          }),
        }
      }
      if (url === "/api/canvas/project/detect-components-dir") {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            resolvedComponentsDir: "src/components",
            candidates: [{ dir: "src/components", exists: true }],
            resolvedRealPath: "/real/picked",
            frameworkSuggestion: "html",
            escapedDisplayPath: "/real/picked/src/components",
            ...options.detect,
          }),
        }
      }
      if (url === "/api/canvas/project/sync") {
        const r = options.syncResponse ?? {
          ok: true,
          payload: {
            ok: true,
            writtenPaths: ["promo-card.html"],
            notWritten: [],
            manifestPath: "/real/picked/src/components/manifest.json",
            perFile: [{ path: "promo-card.html", status: "written" }],
          },
        }
        return { ok: r.ok, status: r.status ?? 200, json: async () => r.payload }
      }
      return { ok: true, json: async () => ({ ok: true }) }
    })
  }

  it("first component sync uses the server-validated path-entry value (not the picker basename) → detect → persist → POST", async () => {
    const calls: FetchCall[] = []
    vi.stubGlobal("fetch", routeSyncFetch({ storedTarget: null, calls }))
    vi.stubGlobal("window", window)
    // A realistic FileSystemDirectoryHandle exposes only the BASENAME, never
    // an absolute path. It must NOT become the value sent to the server.
    ;(window as unknown as { showDirectoryPicker: unknown }).showDirectoryPicker =
      vi.fn(async () => ({ name: "project" }))

    harness = await mount(
      <CanvasHtmlPropsPanel
        sourceMode="inline"
        sourceHtml={SLOT_HTML}
        sourceComponentSlug="promo-card"
        sourceComponentFilePath="projects/demo/components/promo-card.html"
        projectId="demo"
        syncSelection={{
          type: "component",
          slug: "promo-card",
          sourcePath: "projects/demo/components/promo-card.html",
          mtimeMs: 123,
        }}
        onChange={() => {}}
        onDelete={() => {}}
        onClose={() => {}}
      />
    )
    const syncBtn = harness.container.querySelector(
      'button[aria-label="Sync component"]'
    ) as HTMLButtonElement
    expect(syncBtn).not.toBeNull()

    // The path-entry input is the PRIMARY mechanism and is always rendered.
    const pathInput = harness.container.querySelector(
      'input[aria-label="Sync folder path"]'
    ) as HTMLInputElement
    expect(pathInput).not.toBeNull()
    await act(async () => {
      setInputValue(pathInput, "/Users/me/project")
    })

    await act(async () => {
      syncBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }))
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    const urls = calls.map((c) => c.url)
    expect(urls).toContain("/api/canvas/project/detect-components-dir")
    const writeCall = calls.find(
      (c) => c.url === "/api/canvas/project/sync-target" && c.body.mode === "write"
    )
    expect(writeCall).toBeTruthy()
    const persisted = writeCall!.body.syncTarget as Record<string, unknown>
    // The user-confirmed absolute path is what reaches the server — NOT the
    // picker handle basename ("project").
    expect(persisted.rootPath).toBe("/Users/me/project")
    expect(persisted.rootPath).not.toBe("project")
    expect(persisted.resolvedRealPath).toBe("/real/picked")
    expect(persisted.componentsDir).toBe("src/components")
    expect(persisted.mappedAt).toBeTruthy()
    const syncCall = calls.find((c) => c.url === "/api/canvas/project/sync")
    expect(syncCall).toBeTruthy()
    expect((syncCall!.body.selection as Record<string, unknown>).slug).toBe(
      "promo-card"
    )
  })

  it("the directory picker basename only prefills a confirmation hint — it is never the server value, and no sync fires until the absolute path is confirmed", async () => {
    const calls: FetchCall[] = []
    vi.stubGlobal("fetch", routeSyncFetch({ storedTarget: null, calls }))
    vi.stubGlobal("window", window)
    ;(window as unknown as { showDirectoryPicker: unknown }).showDirectoryPicker =
      vi.fn(async () => ({ name: "my-project" }))

    harness = await mount(
      <CanvasHtmlPropsPanel
        sourceMode="inline"
        sourceHtml={SLOT_HTML}
        sourceComponentSlug="promo-card"
        projectId="demo"
        syncSelection={{
          type: "component",
          slug: "promo-card",
          sourcePath: "projects/demo/components/promo-card.html",
        }}
        onChange={() => {}}
        onDelete={() => {}}
        onClose={() => {}}
      />
    )

    // Browse… uses the picker only as a hint.
    const browseBtn = Array.from(
      harness.container.querySelectorAll("button")
    ).find((b) => b.textContent?.includes("Browse")) as HTMLButtonElement
    expect(browseBtn).not.toBeNull()
    await act(async () => {
      browseBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }))
      await Promise.resolve()
      await Promise.resolve()
    })
    // The basename surfaces as a confirmation hint, NOT as a path.
    expect(harness.container.textContent).toContain("my-project")

    // Clicking Sync with no confirmed absolute path → benign abort, no POST.
    const syncBtn = harness.container.querySelector(
      'button[aria-label="Sync component"]'
    ) as HTMLButtonElement
    await act(async () => {
      syncBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }))
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(calls.some((c) => c.url === "/api/canvas/project/sync")).toBe(false)

    // Confirming the absolute path → the path-entry value is what is sent.
    const pathInput = harness.container.querySelector(
      'input[aria-label="Sync folder path"]'
    ) as HTMLInputElement
    await act(async () => {
      setInputValue(pathInput, "/Users/me/my-project")
    })
    await act(async () => {
      syncBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }))
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })
    const writeCall = calls.find(
      (c) => c.url === "/api/canvas/project/sync-target" && c.body.mode === "write"
    )
    expect((writeCall!.body.syncTarget as Record<string, unknown>).rootPath).toBe(
      "/Users/me/my-project"
    )
  })

  it("re-sync reuses the persisted mapping — no picker, one sync call", async () => {
    const calls: FetchCall[] = []
    vi.stubGlobal(
      "fetch",
      routeSyncFetch({
        storedTarget: {
          rootPath: "/picked/project",
          resolvedRealPath: "/real/picked",
          componentsDir: "src/components",
          format: "html",
          mappedAt: "2026-05-17T00:00:00.000Z",
        },
        storedValid: true,
        calls,
      })
    )
    const pickerSpy = vi.fn(async () => ({ name: "/should/not/be/called" }))
    ;(window as unknown as { showDirectoryPicker: unknown }).showDirectoryPicker =
      pickerSpy

    harness = await mount(
      <CanvasHtmlPropsPanel
        sourceMode="inline"
        sourceHtml={SLOT_HTML}
        sourceComponentSlug="promo-card"
        sourceComponentFilePath="projects/demo/components/promo-card.html"
        syncedBefore
        projectId="demo"
        syncSelection={{
          type: "component",
          slug: "promo-card",
          sourcePath: "projects/demo/components/promo-card.html",
        }}
        onChange={() => {}}
        onDelete={() => {}}
        onClose={() => {}}
      />
    )
    const syncBtn = harness.container.querySelector(
      'button[aria-label="Sync component"]'
    ) as HTMLButtonElement
    await act(async () => {
      syncBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }))
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(pickerSpy).not.toHaveBeenCalled()
    expect(
      calls.some((c) => c.url === "/api/canvas/project/detect-components-dir")
    ).toBe(false)
    expect(
      calls.filter((c) => c.url === "/api/canvas/project/sync")
    ).toHaveLength(1)
  })

  it("persisted root missing/realpath-mismatch → re-pick prompt, no silent tree", async () => {
    const calls: FetchCall[] = []
    vi.stubGlobal(
      "fetch",
      routeSyncFetch({
        storedTarget: {
          rootPath: "/old/moved",
          resolvedRealPath: "/old/moved",
          componentsDir: "src/components",
          format: "html",
          mappedAt: "2026-05-17T00:00:00.000Z",
        },
        storedValid: false, // realpath revalidation failed server-side
        calls,
      })
    )
    // Picker cancelled → user must explicitly re-pick.
    ;(window as unknown as { showDirectoryPicker: unknown }).showDirectoryPicker =
      vi.fn(async () => {
        throw new DOMException("aborted", "AbortError")
      })

    harness = await mount(
      <CanvasHtmlPropsPanel
        sourceMode="inline"
        sourceHtml={SLOT_HTML}
        sourceComponentSlug="promo-card"
        syncedBefore
        projectId="demo"
        syncSelection={{
          type: "component",
          slug: "promo-card",
          sourcePath: "projects/demo/components/promo-card.html",
        }}
        onChange={() => {}}
        onDelete={() => {}}
        onClose={() => {}}
      />
    )
    const syncBtn = harness.container.querySelector(
      'button[aria-label="Sync component"]'
    ) as HTMLButtonElement
    await act(async () => {
      syncBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }))
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    // No sync POST (no silent tree), and the re-pick prompt + button label.
    expect(calls.some((c) => c.url === "/api/canvas/project/sync")).toBe(false)
    expect(harness.container.textContent).toContain(
      "Sync folder not found or moved"
    )
    expect(syncBtn.textContent).toContain("Choose folder")
  })

  it("React detected → format toggle shows the HTML+TSX hint (not auto-applied)", async () => {
    const calls: FetchCall[] = []
    vi.stubGlobal(
      "fetch",
      routeSyncFetch({
        storedTarget: null,
        detect: { frameworkSuggestion: "html+tsx" },
        calls,
      })
    )
    ;(window as unknown as { showDirectoryPicker: unknown }).showDirectoryPicker =
      vi.fn(async () => ({ name: "react-app" }))

    harness = await mount(
      <CanvasHtmlPropsPanel
        sourceMode="inline"
        sourceHtml={SLOT_HTML}
        sourceComponentSlug="promo-card"
        projectId="demo"
        syncSelection={{
          type: "component",
          slug: "promo-card",
          sourcePath: "projects/demo/components/promo-card.html",
        }}
        onChange={() => {}}
        onDelete={() => {}}
        onClose={() => {}}
      />
    )
    const syncBtn = harness.container.querySelector(
      'button[aria-label="Sync component"]'
    ) as HTMLButtonElement
    const pathInput = harness.container.querySelector(
      'input[aria-label="Sync folder path"]'
    ) as HTMLInputElement
    await act(async () => {
      setInputValue(pathInput, "/Users/me/react-app")
    })
    await act(async () => {
      syncBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }))
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    // Hint visible; the persisted format stays "html" (no silent auto-switch).
    expect(harness.container.textContent).toContain("React detected")
    const writeCall = calls.find(
      (c) => c.url === "/api/canvas/project/sync-target" && c.body.mode === "write"
    )
    expect((writeCall!.body.syncTarget as Record<string, unknown>).format).toBe(
      "html"
    )
  })

  it("picker unavailable → inline server-path entry works with validation", async () => {
    const calls: FetchCall[] = []
    vi.stubGlobal("fetch", routeSyncFetch({ storedTarget: null, calls }))
    // No showDirectoryPicker on window → path-entry fallback rendered.
    delete (window as unknown as { showDirectoryPicker?: unknown })
      .showDirectoryPicker

    harness = await mount(
      <CanvasHtmlPropsPanel
        sourceMode="inline"
        sourceHtml={SLOT_HTML}
        sourceComponentSlug="promo-card"
        projectId="demo"
        syncSelection={{
          type: "component",
          slug: "promo-card",
          sourcePath: "projects/demo/components/promo-card.html",
        }}
        onChange={() => {}}
        onDelete={() => {}}
        onClose={() => {}}
      />
    )
    const pathInput = harness.container.querySelector(
      'input[aria-label="Sync folder path"]'
    ) as HTMLInputElement
    expect(pathInput).not.toBeNull()

    const syncBtn = harness.container.querySelector(
      'button[aria-label="Sync component"]'
    ) as HTMLButtonElement
    // Empty path → validation feedback, no sync.
    await act(async () => {
      syncBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }))
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(harness.container.textContent).toContain("Enter an absolute path")
    expect(calls.some((c) => c.url === "/api/canvas/project/sync")).toBe(false)

    // Valid absolute path → sync proceeds.
    await act(async () => {
      setInputValue(pathInput, "/Users/me/project")
    })
    await act(async () => {
      syncBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }))
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })
    const writeCall = calls.find(
      (c) => c.url === "/api/canvas/project/sync-target" && c.body.mode === "write"
    )
    expect((writeCall!.body.syncTarget as Record<string, unknown>).rootPath).toBe(
      "/Users/me/project"
    )
  })

  it("shows a non-blocking overwrite notice distinct from the error state", async () => {
    const calls: FetchCall[] = []
    vi.stubGlobal(
      "fetch",
      routeSyncFetch({
        storedTarget: {
          rootPath: "/picked/project",
          resolvedRealPath: "/real/picked",
          componentsDir: "src/components",
          format: "html",
          mappedAt: "2026-05-17T00:00:00.000Z",
        },
        storedValid: true,
        syncResponse: {
          ok: true,
          payload: {
            ok: true,
            writtenPaths: ["promo-card.html", "promo-card.css"],
            notWritten: [],
            manifestPath: "/real/picked/src/components/manifest.json",
            perFile: [
              { path: "promo-card.html", status: "written" },
              { path: "promo-card.css", status: "written" },
            ],
          },
        },
        calls,
      })
    )
    harness = await mount(
      <CanvasHtmlPropsPanel
        sourceMode="inline"
        sourceHtml={SLOT_HTML}
        sourceComponentSlug="promo-card"
        syncedBefore
        projectId="demo"
        syncSelection={{
          type: "component",
          slug: "promo-card",
          sourcePath: "projects/demo/components/promo-card.html",
        }}
        onChange={() => {}}
        onDelete={() => {}}
        onClose={() => {}}
      />
    )
    const syncBtn = harness.container.querySelector(
      'button[aria-label="Sync component"]'
    ) as HTMLButtonElement
    await act(async () => {
      syncBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }))
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    const notice = harness.container.querySelector(
      '[data-testid="sync-overwrite-notice"]'
    ) as HTMLElement
    expect(notice).not.toBeNull()
    expect(notice.textContent).toContain("promo-card.html")
    expect(notice.textContent).toContain("promo-card.css")
    // Distinct from the error styling — the notice is muted, not role=alert.
    expect(notice.getAttribute("role")).not.toBe("alert")
    expect(harness.container.querySelector('[role="alert"]')).toBeNull()
  })

  it("replaces the first matching media child when a new source url is provided", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, primitives: [] }) }))
    )
    const onChange = vi.fn()
    harness = await mount(
      <CanvasHtmlPropsPanel
        sourceMode="inline"
        sourceHtml={MEDIA_SLOT_WITH_IMAGE_HTML}
        projectId="demo"
        onChange={onChange}
        onDelete={() => {}}
        onClose={() => {}}
      />
    )

    const select = harness.container.querySelector(
      'select[aria-label="HTML part for media"]'
    ) as HTMLSelectElement
    const urlInput = harness.container.querySelector(
      'input[aria-label="Source URL for media"]'
    ) as HTMLInputElement | null
    await act(async () => {
      setSelectValue(select, "image")
    })
    const nextUrlInput = harness.container.querySelector(
      'input[aria-label="Source URL for media"]'
    ) as HTMLInputElement
    await act(async () => {
      setInputValue(nextUrlInput, "https://cdn.example.com/replaced.jpg")
    })
    const insertBtn = [...harness.container.querySelectorAll("button")].find(
      (b) => b.textContent === "Insert part"
    ) as HTMLButtonElement
    await act(async () => {
      insertBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    })

    const arg = onChange.mock.calls.at(-1)?.[0]
    expect(arg.sourceHtml).toContain('src="https://cdn.example.com/replaced.jpg"')
    expect(arg.sourceHtml.match(/<img /g)?.length).toBe(1)
    expect(urlInput).toBeNull()
  })
})
