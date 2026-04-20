import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
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

  it("builds the default workspace keys from the project id", async () => {
    const runtime = await loadRuntime()
    expect(runtime.buildDefaultCanvasWorkspaceKey("demo")).toBe("gallery-demo:canvas")
    expect(runtime.buildDefaultCanvasWorkspaceKey("  thicket  ")).toBe("gallery-thicket:canvas")
    expect(runtime.buildDefaultCanvasWorkspaceKey("")).toBe("gallery-demo:canvas")
    expect(runtime.buildDefaultColorAuditWorkspaceKey("demo")).toBe("gallery-demo:color-audit")
    expect(runtime.buildDefaultColorAuditWorkspaceKey("  thicket  ")).toBe("gallery-thicket:color-audit")
    expect(runtime.buildDefaultColorAuditWorkspaceKey("")).toBe("gallery-demo:color-audit")
    expect(runtime.buildDefaultNodeCatalogWorkspaceKey("demo")).toBe("gallery-demo-node-catalog")
    expect(runtime.buildDefaultNodeCatalogWorkspaceKey("  thicket  ")).toBe(
      "gallery-thicket-node-catalog"
    )
  })

  it("reads the canvas theme snapshot from the local session state envelope", async () => {
    const runtime = await loadRuntime()
    const sessionDir = await mkdtemp(path.join(tmpdir(), "canvas-agent-runtime-theme-"))

    try {
      await writeFile(
        path.join(sessionDir, "state.json"),
        JSON.stringify(
          {
            state: {
              items: [],
              groups: [],
              nextZIndex: 1,
              selectedIds: [],
            },
            themeSnapshot: {
              themes: [
                {
                  id: "default",
                  label: "Default",
                  vars: { "--color-brand-600": "#2563eb" },
                },
              ],
              activeThemeId: "default",
              tokenValues: { "--color-brand-600": "#2563eb" },
            },
          },
          null,
          2
        )
      )

      await expect(runtime.readCanvasAgentThemes({ sessionDir } as any)).resolves.toEqual({
        themes: [
          {
            id: "default",
            label: "Default",
            vars: { "--color-brand-600": "#2563eb" },
          },
        ],
        activeThemeId: "default",
        tokenValues: { "--color-brand-600": "#2563eb" },
      })
    } finally {
      await rm(sessionDir, { recursive: true, force: true })
    }
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
      canvasWorkspaceKey: "gallery-demo:canvas",
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
      canvasWorkspaceKey: "gallery-demo:canvas",
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

  it("reads and writes stored canvas files through project file endpoints", async () => {
    const runtime = await loadRuntime()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          files: [{ path: "boards/demo.canvas", surface: "canvas", title: "Demo" }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          file: { path: "boards/demo.canvas", document: { meta: { title: "Demo" } } },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          file: { path: "boards/new.canvas", document: { meta: { title: "New Board" } } },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          file: { path: "boards/demo.canvas", document: { meta: { title: "Demo Saved" } } },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          file: { path: "boards/demo.canvas", document: { meta: { favorite: true } } },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          file: { path: "boards/renamed-demo.canvas", document: { meta: { title: "Renamed Demo" } } },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          file: { path: "boards/duplicate-demo.canvas", document: { meta: { title: "Duplicate Demo" } } },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          path: "boards/demo.canvas",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          htmlBundle: {
            entryAsset: "html/landing/index.html",
            entryUrl:
              "/api/projects/demo/canvases/assets/file?path=boards%2Fdemo.canvas&asset=html%2Flanding%2Findex.html",
            assetCount: 3,
            importedAt: "2026-04-12T12:00:00.000Z",
          },
        }),
      })

    vi.stubGlobal("fetch", fetchMock)

    const context = {
      serverUrl: "http://127.0.0.1:5178",
      projectId: "demo",
    }

    await expect(runtime.listProjectCanvasFiles(context as any, { surface: "canvas" })).resolves.toEqual([
      { path: "boards/demo.canvas", surface: "canvas", title: "Demo" },
    ])
    await expect(runtime.openProjectCanvasFile(context as any, "boards/demo.canvas")).resolves.toEqual({
      path: "boards/demo.canvas",
      document: { meta: { title: "Demo" } },
    })
    await expect(
      runtime.createProjectCanvasFile(context as any, { title: "New Board", surface: "canvas" })
    ).resolves.toEqual({
      path: "boards/new.canvas",
      document: { meta: { title: "New Board" } },
    })
    await expect(
      runtime.saveProjectCanvasFile(
        context as any,
        "boards/demo.canvas",
        { meta: { title: "Demo Saved" }, document: { items: [] } },
        [{ itemId: "media-1", dataUrl: "data:image/png;base64,AA==" }]
      )
    ).resolves.toEqual({
      path: "boards/demo.canvas",
      document: { meta: { title: "Demo Saved" } },
    })
    await expect(
      runtime.updateProjectCanvasFileMetadata(context as any, "boards/demo.canvas", { favorite: true })
    ).resolves.toEqual({
      path: "boards/demo.canvas",
      document: { meta: { favorite: true } },
    })
    await expect(
      runtime.moveProjectCanvasFile(context as any, "boards/demo.canvas", {
        title: "Renamed Demo",
      })
    ).resolves.toEqual({
      path: "boards/renamed-demo.canvas",
      document: { meta: { title: "Renamed Demo" } },
    })
    await expect(
      runtime.duplicateProjectCanvasFile(context as any, "boards/demo.canvas", {
        title: "Duplicate Demo",
      })
    ).resolves.toEqual({
      path: "boards/duplicate-demo.canvas",
      document: { meta: { title: "Duplicate Demo" } },
    })
    await expect(
      runtime.deleteProjectCanvasFile(context as any, "boards/demo.canvas")
    ).resolves.toEqual({
      ok: true,
      path: "boards/demo.canvas",
    })
    await expect(
      runtime.importProjectCanvasHtmlBundle(context as any, "boards/demo.canvas", {
        title: "Landing",
        directoryPath: "/tmp/landing",
      })
    ).resolves.toEqual({
      entryAsset: "html/landing/index.html",
      entryUrl:
        "/api/projects/demo/canvases/assets/file?path=boards%2Fdemo.canvas&asset=html%2Flanding%2Findex.html",
      assetCount: 3,
      importedAt: "2026-04-12T12:00:00.000Z",
    })

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "http://127.0.0.1:5178/api/projects/demo/canvases?surface=canvas"
    )
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "http://127.0.0.1:5178/api/projects/demo/canvases/file?path=boards%2Fdemo.canvas"
    )
    expect(fetchMock.mock.calls[2]?.[0]).toBe("http://127.0.0.1:5178/api/projects/demo/canvases/create")
    expect(fetchMock.mock.calls[3]?.[0]).toBe("http://127.0.0.1:5178/api/projects/demo/canvases/save")
    expect(fetchMock.mock.calls[4]?.[0]).toBe("http://127.0.0.1:5178/api/projects/demo/canvases/metadata")
    expect(fetchMock.mock.calls[5]?.[0]).toBe("http://127.0.0.1:5178/api/projects/demo/canvases/move")
    expect(fetchMock.mock.calls[6]?.[0]).toBe("http://127.0.0.1:5178/api/projects/demo/canvases/duplicate")
    expect(fetchMock.mock.calls[7]?.[0]).toBe("http://127.0.0.1:5178/api/projects/demo/canvases/delete")
    expect(fetchMock.mock.calls[8]?.[0]).toBe(
      "http://127.0.0.1:5178/api/projects/demo/canvases/html-bundle/import"
    )
  })

  it("reads workspace debug payloads from the agent-native endpoint", async () => {
    const runtime = await loadRuntime()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        workspaceId: "canvas",
        workspaceKey: "gallery-demo:canvas",
        debug: {
          workspaceId: "canvas",
          workspaceKey: "gallery-demo:canvas",
          cursor: 5,
          appliedCursor: 3,
          pendingOperationCount: 1,
          events: [
            {
              id: "canvas-event-4",
              workspaceId: "canvas",
              workspaceKey: "gallery-demo:canvas",
              kind: "operation-applied",
              actor: "agent",
              source: "canvas-agent-cli",
              createdAt: "2026-04-04T09:00:00.000Z",
            },
          ],
        },
      }),
    })

    vi.stubGlobal("fetch", fetchMock)

    const context = {
      serverUrl: "http://127.0.0.1:5178",
      canvasWorkspaceKey: "gallery-demo:canvas",
    }

    await expect(
      runtime.readAgentNativeWorkspaceDebug(context as any, "canvas", "gallery-demo:canvas", {
        limit: 25,
      })
    ).resolves.toEqual({
      workspaceId: "canvas",
      workspaceKey: "gallery-demo:canvas",
      cursor: 5,
      appliedCursor: 3,
      pendingOperationCount: 1,
      events: [
        {
          id: "canvas-event-4",
          workspaceId: "canvas",
          workspaceKey: "gallery-demo:canvas",
          kind: "operation-applied",
          actor: "agent",
          source: "canvas-agent-cli",
          createdAt: "2026-04-04T09:00:00.000Z",
        },
      ],
    })

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:5178/api/agent-native/workspaces/canvas/debug?workspaceKey=gallery-demo%3Acanvas&limit=25"
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
      canvasWorkspaceKey: "gallery-demo:canvas",
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
      canvasWorkspaceKey: "gallery-demo:canvas",
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
      canvasWorkspaceKey: "gallery-demo:canvas",
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

  it("captures a focused Canvas screenshot using item ids and padding", async () => {
    const runtime = await loadRuntime()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          state: {
            surface: "canvas",
            state: {
              items: [
                {
                  id: "item-1",
                  type: "html",
                  position: { x: 120, y: 160 },
                  size: { width: 480, height: 320 },
                },
              ],
              groups: [],
              nextZIndex: 2,
              selectedIds: [],
            },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          capture: {
            workspaceId: "canvas",
            target: "desktop",
            mediaUrl: "/api/media/file/canvas-item.png",
            cropRect: {
              x: 128,
              y: 96,
              width: 640,
              height: 512,
            },
          },
        }),
      })

    vi.stubGlobal("fetch", fetchMock)

    const context = {
      serverUrl: "http://127.0.0.1:5178",
      projectId: "demo",
      canvasWorkspaceKey: "gallery-demo:canvas",
    }

    await expect(
      runtime.captureCanvasItemsScreenshot(context as any, ["item-1"], "desktop", 88)
    ).resolves.toEqual({
      workspaceId: "canvas",
      target: "desktop",
      mediaUrl: "/api/media/file/canvas-item.png",
      cropRect: {
        x: 128,
        y: 96,
        width: 640,
        height: 512,
      },
    })

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "http://127.0.0.1:5178/api/agent-native/workspaces/canvas/state?workspaceKey=gallery-demo%3Acanvas"
    )
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "http://127.0.0.1:5178/api/agent-native/workspaces/canvas/screenshot"
    )
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body || "{}"))).toMatchObject({
      projectId: "demo",
      target: "desktop",
      focusItemIds: ["item-1"],
      focusPadding: 88,
      snapshot: {
        surface: "canvas",
        state: {
          items: [
            {
              id: "item-1",
            },
          ],
        },
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
            canvasWorkspaceKey: "gallery-demo:canvas",
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
        canvasWorkspaceKey: "gallery-demo:canvas",
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
    vi.stubEnv("CANVAS_AGENT_CANVAS_WORKSPACE_KEY", "")
    vi.stubEnv("CANVAS_AGENT_COLOR_AUDIT_WORKSPACE_KEY", "")
    vi.stubEnv("CANVAS_AGENT_SYSTEM_CANVAS_WORKSPACE_KEY", "")
    vi.stubEnv("CANVAS_AGENT_NODE_CATALOG_WORKSPACE_KEY", "")

    await runtime.writeCanvasAgentAttachedContext({
      serverUrl: "http://127.0.0.1:5199",
      projectId: "demo",
      sessionId: "canvas-agent-session-2",
      sessionDir: "/tmp/canvas-agent/session-2",
      canvasWorkspaceKey: "gallery-demo:canvas",
      colorAuditWorkspaceKey: "gallery-demo:color-audit",
      systemCanvasWorkspaceKey: "gallery-demo:system-canvas",
      nodeCatalogWorkspaceKey: "gallery-demo-node-catalog",
    }, contextFilePath)

    expect(runtime.getCanvasAgentContextFromEnv()).toEqual({
      serverUrl: "http://127.0.0.1:5199",
      projectId: "demo",
      sessionId: "canvas-agent-session-2",
      sessionDir: "/tmp/canvas-agent/session-2",
      canvasWorkspaceKey: "gallery-demo:canvas",
      colorAuditWorkspaceKey: "gallery-demo:color-audit",
      systemCanvasWorkspaceKey: "gallery-demo:system-canvas",
      nodeCatalogWorkspaceKey: "gallery-demo-node-catalog",
    })

    await runtime.clearCanvasAgentAttachedContext(contextFilePath)
    await expect(readFile(contextFilePath, "utf8")).rejects.toMatchObject({ code: "ENOENT" })
    await rm(tempDir, { recursive: true, force: true })
  })

  it("scans local HTML bundle libraries through project file endpoints", async () => {
    const runtime = await loadRuntime()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        result: {
          rootPath: "/Users/strongeron/Evil Martians/Claude Code/playground",
          scannedAt: "2026-04-12T16:00:00.000Z",
          entries: [
            {
              id: "landing",
              directoryPath: "/Users/strongeron/Evil Martians/Claude Code/playground/landing",
              relativeDirectory: "landing",
              entryFiles: ["index.html", "preview.html"],
              defaultEntryFile: "index.html",
            },
          ],
        },
      }),
    })

    vi.stubGlobal("fetch", fetchMock)

    const context = {
      serverUrl: "http://127.0.0.1:5178",
      projectId: "demo",
    }

    await expect(
      runtime.scanProjectCanvasHtmlBundles(
        context as any,
        "/Users/strongeron/Evil Martians/Claude Code/playground"
      )
    ).resolves.toEqual({
      rootPath: "/Users/strongeron/Evil Martians/Claude Code/playground",
      scannedAt: "2026-04-12T16:00:00.000Z",
      entries: [
        {
          id: "landing",
          directoryPath: "/Users/strongeron/Evil Martians/Claude Code/playground/landing",
          relativeDirectory: "landing",
          entryFiles: ["index.html", "preview.html"],
          defaultEntryFile: "index.html",
        },
      ],
    })

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:5178/api/projects/demo/canvases/html-bundles?rootPath=%2FUsers%2Fstrongeron%2FEvil+Martians%2FClaude+Code%2Fplayground"
    )
  })
})
