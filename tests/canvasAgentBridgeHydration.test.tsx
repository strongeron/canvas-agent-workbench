// @vitest-environment jsdom

import { StrictMode, act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useCanvasAgentBridge } from "../hooks/useCanvasAgentBridge"
import type { CanvasStateSnapshot } from "../types/canvas"

const EMPTY_SNAPSHOT: CanvasStateSnapshot = {
  items: [],
  groups: [],
  selectedIds: [],
  nextZIndex: 1,
}

class FakeEventSource {
  static instances: FakeEventSource[] = []
  url: string
  constructor(url: string) {
    this.url = url
    FakeEventSource.instances.push(this)
  }
  addEventListener() {}
  removeEventListener() {}
  close() {}
  set onerror(_handler: unknown) {}
  set onopen(_handler: unknown) {}
}

function jsonResponse(payload: unknown) {
  return {
    ok: true,
    json: async () => payload,
  } as Response
}

describe("useCanvasAgentBridge hydration", () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>
  let statePosts: number

  beforeEach(() => {
    vi.stubGlobal("EventSource", FakeEventSource as unknown as typeof EventSource)
    statePosts = 0
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.includes("/api/canvas-agent/agents")) return jsonResponse({ ok: true, agents: [] })
        if (url.includes("/api/canvas-agent/sessions")) return jsonResponse({ ok: true, sessions: [] })
        if (url.includes("/api/agent-native/workspaces/canvas/state")) {
          if (init?.method === "POST") {
            statePosts += 1
            return jsonResponse({ ok: true, updatedAt: new Date().toISOString() })
          }
          return jsonResponse({ ok: true, state: null, updatedAt: null })
        }
        if (url.includes("/api/agent-native/workspaces/canvas/user-events")) {
          return jsonResponse({ ok: true, accepted: [] })
        }
        return jsonResponse({ ok: true })
      })
    )
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    container.remove()
    FakeEventSource.instances = []
    vi.unstubAllGlobals()
  })

  it("completes hydration and pushes the workspace up-sync under StrictMode double-mount", async () => {
    function Probe() {
      useCanvasAgentBridge({
        projectId: "demo",
        entries: [],
        snapshot: EMPTY_SNAPSHOT,
        themeSnapshot: { themes: [], activeThemeId: null, tokenValues: {} },
        replaceState: () => {},
        applyRemoteOperation: () => {},
        hasActiveCanvasFile: false,
      })
      return null
    }

    await act(async () => {
      root.render(
        <StrictMode>
          <Probe />
        </StrictMode>
      )
    })

    // StrictMode mounts effects twice; the first hydration is cancelled by the
    // double-mount cleanup. The regression: the didHydrate guard turned the
    // second run into a no-op, bridgeReady stayed false, and the debounced
    // up-sync POST never fired — agents saw "Last Sync: Never" forever.
    const deadline = Date.now() + 3000
    while (statePosts === 0 && Date.now() < deadline) {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100))
      })
    }

    expect(statePosts).toBeGreaterThan(0)
  })
})
