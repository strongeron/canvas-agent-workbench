// @vitest-environment jsdom

import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import { CanvasMcpAppPropsPanel } from "../components/canvas/CanvasMcpAppPropsPanel"
import type { CanvasMcpAppItem } from "../types/canvas"

interface Harness {
  container: HTMLDivElement
  root: Root
  cleanup: () => void
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

function setInputValue(element: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
  setter?.call(element, value)
  element.dispatchEvent(new Event("input", { bubbles: true }))
  element.dispatchEvent(new Event("change", { bubbles: true }))
}

function click(element: HTMLElement) {
  element.dispatchEvent(new MouseEvent("click", { bubbles: true }))
}

function makeMcpItem(overrides: Partial<CanvasMcpAppItem> = {}): CanvasMcpAppItem {
  return {
    id: "mcp-app-1",
    type: "mcp-app",
    appName: "Figma Remote MCP",
    transport: {
      kind: "http",
      url: "https://mcp.figma.com/mcp",
      headersRef: "figma-headers",
    },
    status: "disconnected",
    position: { x: 0, y: 0 },
    size: { width: 760, height: 480 },
    rotation: 0,
    zIndex: 1,
    ...overrides,
  }
}

describe("CanvasMcpAppPropsPanel", () => {
  let harness: Harness | null = null

  afterEach(() => {
    harness?.cleanup()
    harness = null
    vi.restoreAllMocks()
  })

  it("surfaces confirm-and-connect after a public HTTP transport requires confirmation", async () => {
    const onChange = vi.fn()
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          ok: false,
          code: "requires-user-confirm",
          error: "HTTP transport requires user confirmation: https://mcp.figma.com",
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          connectionStatus: "connected",
          tools: [{ name: "get_design_context" }],
          resources: [],
          prompts: [],
        }),
      } as Response)

    harness = await mount(
      <CanvasMcpAppPropsPanel
        projectId="demo"
        item={makeMcpItem()}
        onChange={onChange}
        onDelete={() => {}}
        onClose={() => {}}
      />
    )

    const connect = Array.from(harness.container.querySelectorAll("button")).find(
      (button) => button.textContent === "Connect"
    ) as HTMLButtonElement
    expect(connect).toBeTruthy()

    await act(async () => {
      click(connect)
      await Promise.resolve()
      await Promise.resolve()
    })

    const confirm = Array.from(harness.container.querySelectorAll("button")).find(
      (button) => button.textContent === "Confirm and Connect"
    ) as HTMLButtonElement
    expect(confirm).toBeTruthy()

    await act(async () => {
      click(confirm)
      await Promise.resolve()
      await Promise.resolve()
    })

    const firstBody = JSON.parse((fetchMock.mock.calls[0]?.[1] as RequestInit).body as string)
    const secondBody = JSON.parse((fetchMock.mock.calls[1]?.[1] as RequestInit).body as string)
    expect(firstBody).not.toHaveProperty("confirmed")
    expect(secondBody).toMatchObject({ confirmed: true })
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "connected",
        toolsCache: [{ name: "get_design_context" }],
      })
    )
  })

  it("shows the Figma import control and calls the import handler with the pasted URL", async () => {
    const onImportFigmaNode = vi.fn()
    harness = await mount(
      <CanvasMcpAppPropsPanel
        projectId="demo"
        item={makeMcpItem({
          status: "connected",
          toolsCache: [{ name: "get_design_context" }, { name: "get_screenshot" }],
        })}
        onChange={() => {}}
        onDelete={() => {}}
        onClose={() => {}}
        onImportFigmaNode={onImportFigmaNode}
      />
    )

    expect(harness.container.textContent).toContain("Figma Import")
    const urlInput = Array.from(harness.container.querySelectorAll("input")).find(
      (input) => input.placeholder === "Paste Figma frame or layer URL"
    ) as HTMLInputElement
    expect(urlInput).toBeTruthy()

    await act(async () => {
      setInputValue(urlInput, "https://www.figma.com/design/file?node-id=1-2")
      await Promise.resolve()
    })

    const importButton = Array.from(harness.container.querySelectorAll("button")).find(
      (button) => button.textContent === "Import Node"
    ) as HTMLButtonElement
    expect(importButton).toBeTruthy()

    await act(async () => {
      click(importButton)
      await Promise.resolve()
    })

    expect(onImportFigmaNode).toHaveBeenCalledWith("https://www.figma.com/design/file?node-id=1-2")
  })

  it("saves JSON header credentials as an object for remote MCP auth", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, ref: "figma-headers" }),
    } as Response)

    harness = await mount(
      <CanvasMcpAppPropsPanel
        projectId="demo"
        item={makeMcpItem()}
        onChange={() => {}}
        onDelete={() => {}}
        onClose={() => {}}
      />
    )

    const secretInput = Array.from(harness.container.querySelectorAll("input")).find(
      (input) => input.placeholder.includes("Authorization")
    ) as HTMLInputElement
    expect(secretInput).toBeTruthy()

    await act(async () => {
      setInputValue(
        secretInput,
        '{"Authorization":"Bearer figma-token","X-Figma-Region":"us-east-1"}'
      )
      await Promise.resolve()
    })

    const saveSecret = Array.from(harness.container.querySelectorAll("button")).find(
      (button) => button.textContent === "Save Secret"
    ) as HTMLButtonElement
    expect(saveSecret).toBeTruthy()

    await act(async () => {
      click(saveSecret)
      await Promise.resolve()
      await Promise.resolve()
    })

    const body = JSON.parse((fetchMock.mock.calls[0]?.[1] as RequestInit).body as string)
    expect(body).toEqual({
      projectId: "demo",
      ref: "figma-headers",
      secret: {
        Authorization: "Bearer figma-token",
        "X-Figma-Region": "us-east-1",
      },
    })
  })

  it("rejects malformed JSON credentials before posting them", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
    harness = await mount(
      <CanvasMcpAppPropsPanel
        projectId="demo"
        item={makeMcpItem()}
        onChange={() => {}}
        onDelete={() => {}}
        onClose={() => {}}
      />
    )

    const secretInput = Array.from(harness.container.querySelectorAll("input")).find(
      (input) => input.placeholder.includes("Authorization")
    ) as HTMLInputElement
    expect(secretInput).toBeTruthy()

    await act(async () => {
      setInputValue(secretInput, '{"Authorization":')
      await Promise.resolve()
    })

    const saveSecret = Array.from(harness.container.querySelectorAll("button")).find(
      (button) => button.textContent === "Save Secret"
    ) as HTMLButtonElement
    expect(saveSecret).toBeTruthy()

    await act(async () => {
      click(saveSecret)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(fetchMock).not.toHaveBeenCalled()
    expect(harness.container.textContent).toContain("Secret JSON is invalid.")
  })
})
