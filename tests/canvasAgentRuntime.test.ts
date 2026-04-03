import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

import { afterEach, describe, expect, it, vi } from "vitest"

async function loadRuntime() {
  // @ts-ignore local CLI runtime helper is ESM-only and intentionally consumed directly in tests
  return import("../bin/canvas-agent-runtime.mjs")
}

describe("canvas agent runtime", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it("builds the default Color Audit workspace key from the project id", async () => {
    const runtime = await loadRuntime()
    expect(runtime.buildDefaultColorAuditWorkspaceKey("demo")).toBe("gallery-demo:color-audit")
    expect(runtime.buildDefaultColorAuditWorkspaceKey("  thicket  ")).toBe("gallery-thicket:color-audit")
    expect(runtime.buildDefaultColorAuditWorkspaceKey("")).toBe("gallery-demo:color-audit")
    expect(runtime.buildDefaultNodeCatalogWorkspaceKey("demo")).toBe("gallery-demo-node-catalog")
    expect(runtime.buildDefaultNodeCatalogWorkspaceKey("  thicket  ")).toBe(
      "gallery-thicket-node-catalog"
    )
  })

  it("reads manifest, surface manifests, workspace state, export preview, and screenshot payloads from agent-native endpoints", async () => {
    const runtime = await loadRuntime()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ manifest: { version: 1, workspaces: [] } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ manifest: { surface: "color-audit", version: 1 } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ state: { surface: "color-audit", nodes: [{ id: "node-1" }] } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ state: { surface: "system-canvas", nodes: [{ id: "node-2" }] } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          state: {
            surface: "node-catalog",
            workspaceSections: [{ id: "canvas-workspace" }],
            nodeSections: [{ id: "starter-ramp" }],
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          exportPreview: {
            selectedFormat: "css-vars",
            selectedColorMode: "oklch",
            tokenCount: 1,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          state: {
            surface: "color-audit",
            rawState: { nodes: [], edges: [], selectedNodeId: null, selectedEdgeId: null, edgeUndoStack: [] },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          capture: {
            workspaceId: "color-audit",
            target: "desktop",
            mediaUrl: "/api/media/file/capture.png",
          },
        }),
      })

    vi.stubGlobal("fetch", fetchMock)

    const context = {
      serverUrl: "http://127.0.0.1:5178",
      projectId: "demo",
      colorAuditWorkspaceKey: "gallery-demo:color-audit",
      systemCanvasWorkspaceKey: "gallery-demo:system-canvas",
      nodeCatalogWorkspaceKey: "gallery-demo-node-catalog",
    }

    await expect(runtime.readAgentNativeManifest(context as any)).resolves.toEqual({
      version: 1,
      workspaces: [],
    })
    await expect(
      runtime.readAgentNativeWorkspaceManifest(
        context as any,
        "color-audit",
        context.colorAuditWorkspaceKey
      )
    ).resolves.toEqual({
      surface: "color-audit",
      version: 1,
    })
    await expect(runtime.readColorAuditState(context as any)).resolves.toEqual({
      surface: "color-audit",
      nodes: [{ id: "node-1" }],
    })
    await expect(runtime.readSystemCanvasState(context as any)).resolves.toEqual({
      surface: "system-canvas",
      nodes: [{ id: "node-2" }],
    })
    await expect(runtime.readNodeCatalogState(context as any)).resolves.toEqual({
      surface: "node-catalog",
      workspaceSections: [{ id: "canvas-workspace" }],
      nodeSections: [{ id: "starter-ramp" }],
    })
    await expect(runtime.readColorAuditExportPreview(context as any)).resolves.toEqual({
      selectedFormat: "css-vars",
      selectedColorMode: "oklch",
      tokenCount: 1,
    })
    await expect(runtime.captureWorkspaceScreenshot(context as any, "color-audit")).resolves.toEqual({
      workspaceId: "color-audit",
      target: "desktop",
      mediaUrl: "/api/media/file/capture.png",
    })

    expect(fetchMock).toHaveBeenCalledTimes(8)
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://127.0.0.1:5178/api/agent-native/manifest")
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "http://127.0.0.1:5178/api/agent-native/workspaces/color-audit/manifest?workspaceKey=gallery-demo%3Acolor-audit"
    )
    expect(fetchMock.mock.calls[2]?.[0]).toBe(
      "http://127.0.0.1:5178/api/agent-native/workspaces/color-audit/state?workspaceKey=gallery-demo%3Acolor-audit"
    )
    expect(fetchMock.mock.calls[3]?.[0]).toBe(
      "http://127.0.0.1:5178/api/agent-native/workspaces/system-canvas/state?workspaceKey=gallery-demo%3Asystem-canvas"
    )
    expect(fetchMock.mock.calls[4]?.[0]).toBe(
      "http://127.0.0.1:5178/api/agent-native/workspaces/node-catalog/state?workspaceKey=gallery-demo-node-catalog"
    )
    expect(fetchMock.mock.calls[5]?.[0]).toBe(
      "http://127.0.0.1:5178/api/agent-native/workspaces/color-audit/export-preview?workspaceKey=gallery-demo%3Acolor-audit"
    )
    expect(fetchMock.mock.calls[6]?.[0]).toBe(
      "http://127.0.0.1:5178/api/agent-native/workspaces/color-audit/state?workspaceKey=gallery-demo%3Acolor-audit"
    )
    expect(fetchMock.mock.calls[7]?.[0]).toBe(
      "http://127.0.0.1:5178/api/agent-native/workspaces/color-audit/screenshot"
    )
    expect(fetchMock.mock.calls[7]?.[1]).toMatchObject({
      method: "POST",
    })
  })

  it("reads workspace events from the agent-native endpoint", async () => {
    const runtime = await loadRuntime()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        workspaceId: "system-canvas",
        workspaceKey: "gallery-demo:system-canvas",
        cursor: 2,
        events: [
          {
            id: "event-1",
            workspaceId: "system-canvas",
            workspaceKey: "gallery-demo:system-canvas",
            kind: "operation-queued",
            actor: "agent",
            source: "canvas-agent-cli",
            createdAt: "2026-04-03T10:00:00.000Z",
          },
        ],
      }),
    })

    vi.stubGlobal("fetch", fetchMock)

    const context = {
      serverUrl: "http://127.0.0.1:5178",
      systemCanvasWorkspaceKey: "gallery-demo:system-canvas",
    }

    await expect(
      runtime.readAgentNativeWorkspaceEvents(
        context as any,
        "system-canvas",
        "gallery-demo:system-canvas",
        { cursor: 1, limit: 20 }
      )
    ).resolves.toEqual({
      events: [
        {
          id: "event-1",
          workspaceId: "system-canvas",
          workspaceKey: "gallery-demo:system-canvas",
          kind: "operation-queued",
          actor: "agent",
          source: "canvas-agent-cli",
          createdAt: "2026-04-03T10:00:00.000Z",
        },
      ],
      cursor: 2,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:5178/api/agent-native/workspaces/system-canvas/events?workspaceKey=gallery-demo%3Asystem-canvas&cursor=1&limit=20"
    )
  })

  it("queues Color Audit workspace operations through the agent-native endpoint", async () => {
    const runtime = await loadRuntime()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        operationId: "color-audit-operation-1",
        cursor: 1,
      }),
    })

    vi.stubGlobal("fetch", fetchMock)

    const context = {
      serverUrl: "http://127.0.0.1:5178",
      sessionId: "session-1",
      colorAuditWorkspaceKey: "gallery-demo:color-audit",
    }

    await expect(
      runtime.enqueueAgentNativeWorkspaceOperation(
        context as any,
        "color-audit",
        "gallery-demo:color-audit",
        {
          type: "generate-template",
          templateKitId: "shadcn",
          brandColor: "oklch(62% 0.19 255)",
        },
        { source: "canvas-agent-cli" }
      )
    ).resolves.toEqual({
      ok: true,
      operationId: "color-audit-operation-1",
      cursor: 1,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:5178/api/agent-native/workspaces/color-audit/operations",
      expect.objectContaining({
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          workspaceKey: "gallery-demo:color-audit",
          clientId: "session-1",
          source: "canvas-agent-cli",
          operation: {
            type: "generate-template",
            templateKitId: "shadcn",
            brandColor: "oklch(62% 0.19 255)",
          },
        }),
      })
    )
  })

  it("queues System Canvas workspace operations through the agent-native endpoint", async () => {
    const runtime = await loadRuntime()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        operationId: "system-canvas-operation-1",
        cursor: 3,
      }),
    })

    vi.stubGlobal("fetch", fetchMock)

    const context = {
      serverUrl: "http://127.0.0.1:5178",
      sessionId: "session-1",
      systemCanvasWorkspaceKey: "gallery-demo:system-canvas",
    }

    await expect(
      runtime.enqueueAgentNativeWorkspaceOperation(
        context as any,
        "system-canvas",
        "gallery-demo:system-canvas",
        {
          type: "generate-scale-graph",
        },
        { source: "canvas-agent-cli" }
      )
    ).resolves.toEqual({
      ok: true,
      operationId: "system-canvas-operation-1",
      cursor: 3,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:5178/api/agent-native/workspaces/system-canvas/operations",
      expect.objectContaining({
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          workspaceKey: "gallery-demo:system-canvas",
          clientId: "session-1",
          source: "canvas-agent-cli",
          operation: {
            type: "generate-scale-graph",
          },
        }),
      })
    )
  })

  it("captures a System Canvas screenshot using the current workspace snapshot payload", async () => {
    const runtime = await loadRuntime()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          state: {
            surface: "system-canvas",
            viewMode: "layout",
            nodes: [{ id: "node-2", label: "Layout / Stack Flow" }],
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          capture: {
            workspaceId: "system-canvas",
            target: "mobile",
            mediaUrl: "/api/media/file/system-canvas-mobile.png",
          },
        }),
      })

    vi.stubGlobal("fetch", fetchMock)

    const context = {
      serverUrl: "http://127.0.0.1:5178",
      projectId: "demo",
      systemCanvasWorkspaceKey: "gallery-demo:system-canvas",
    }

    await expect(
      runtime.captureWorkspaceScreenshot(context as any, "system-canvas", "mobile")
    ).resolves.toEqual({
      workspaceId: "system-canvas",
      target: "mobile",
      mediaUrl: "/api/media/file/system-canvas-mobile.png",
    })

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "http://127.0.0.1:5178/api/agent-native/workspaces/system-canvas/state?workspaceKey=gallery-demo%3Asystem-canvas"
    )
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "http://127.0.0.1:5178/api/agent-native/workspaces/system-canvas/screenshot"
    )
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: "POST",
    })
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body || "{}"))).toMatchObject({
      projectId: "demo",
      workspaceKey: "gallery-demo:system-canvas",
      target: "mobile",
      snapshot: {
        surface: "system-canvas",
        viewMode: "layout",
      },
    })
  })

  it("bootstraps an app-owned canvas agent session through the HTTP bootstrap endpoint", async () => {
    const runtime = await loadRuntime()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        bootstrap: {
          reused: true,
          surfaceId: "color-audit",
          session: {
            id: "canvas-agent-session-1",
            projectId: "demo",
            agentId: "codex",
          },
          context: {
            serverUrl: "http://127.0.0.1:5178",
            projectId: "demo",
            sessionId: "canvas-agent-session-1",
            sessionDir: "/tmp/canvas-agent/session-1",
            colorAuditWorkspaceKey: "gallery-demo:color-audit",
            systemCanvasWorkspaceKey: "gallery-demo:system-canvas",
            nodeCatalogWorkspaceKey: "gallery-demo-node-catalog",
          },
        },
      }),
    })

    vi.stubGlobal("fetch", fetchMock)

    await expect(
      runtime.bootstrapCanvasAgentSession({
        projectId: "demo",
        agentId: "codex",
        surfaceId: "color-audit",
        serverUrl: "http://127.0.0.1:5178",
      })
    ).resolves.toMatchObject({
      reused: true,
      surfaceId: "color-audit",
      session: {
        id: "canvas-agent-session-1",
      },
      context: {
        projectId: "demo",
        colorAuditWorkspaceKey: "gallery-demo:color-audit",
      },
    })

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:5178/api/canvas-agent/bootstrap",
      expect.objectContaining({
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          projectId: "demo",
          agentId: "codex",
          cwd: undefined,
          title: undefined,
          surfaceId: "color-audit",
          reuseSession: true,
        }),
      })
    )
  })

  it("falls back to the attached context file when env vars are not present", async () => {
    const runtime = await loadRuntime()
    const tempDir = await mkdtemp(path.join(tmpdir(), "canvas-agent-context-"))
    const contextFilePath = path.join(tempDir, "attached-session.json")

    vi.stubEnv("CANVAS_AGENT_CONTEXT_FILE", contextFilePath)
    vi.stubEnv("CANVAS_AGENT_SESSION_DIR", "")
    vi.stubEnv("CANVAS_AGENT_PROJECT_ID", "")
    vi.stubEnv("CANVAS_AGENT_SESSION_ID", "")
    vi.stubEnv("CANVAS_AGENT_SERVER_URL", "")
    vi.stubEnv("CANVAS_AGENT_COLOR_AUDIT_WORKSPACE_KEY", "")
    vi.stubEnv("CANVAS_AGENT_SYSTEM_CANVAS_WORKSPACE_KEY", "")
    vi.stubEnv("CANVAS_AGENT_NODE_CATALOG_WORKSPACE_KEY", "")

    await runtime.writeCanvasAgentAttachedContext({
      serverUrl: "http://127.0.0.1:5199",
      projectId: "demo",
      sessionId: "canvas-agent-session-2",
      sessionDir: "/tmp/canvas-agent/session-2",
      colorAuditWorkspaceKey: "gallery-demo:color-audit",
      systemCanvasWorkspaceKey: "gallery-demo:system-canvas",
      nodeCatalogWorkspaceKey: "gallery-demo-node-catalog",
    }, contextFilePath)

    expect(runtime.getCanvasAgentContextFromEnv()).toEqual({
      serverUrl: "http://127.0.0.1:5199",
      projectId: "demo",
      sessionId: "canvas-agent-session-2",
      sessionDir: "/tmp/canvas-agent/session-2",
      colorAuditWorkspaceKey: "gallery-demo:color-audit",
      systemCanvasWorkspaceKey: "gallery-demo:system-canvas",
      nodeCatalogWorkspaceKey: "gallery-demo-node-catalog",
    })

    await runtime.clearCanvasAgentAttachedContext(contextFilePath)
    await expect(readFile(contextFilePath, "utf8")).rejects.toMatchObject({ code: "ENOENT" })
    await rm(tempDir, { recursive: true, force: true })
  })
})
