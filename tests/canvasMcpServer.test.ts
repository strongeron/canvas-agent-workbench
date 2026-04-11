import { spawn } from "node:child_process"
import { once } from "node:events"
import { mkdtemp, mkdir, rm } from "node:fs/promises"
import { createServer } from "node:http"
import { tmpdir } from "node:os"
import path from "node:path"

import { afterEach, describe, expect, it } from "vitest"

const WORKSPACE_ROOT = "/Users/strongeron/Evil Martians/Open Source/gallery-poc"

function encodeRpcMessage(payload: unknown) {
  const body = JSON.stringify(payload)
  return `Content-Length: ${Buffer.byteLength(body, "utf8")}\r\n\r\n${body}`
}

function createRpcReader(target: NodeJS.ReadableStream) {
  let buffer = Buffer.alloc(0)
  const queue: unknown[] = []
  const waiters: Array<(value: unknown) => void> = []

  const flush = () => {
    while (queue.length > 0 && waiters.length > 0) {
      const next = queue.shift()
      const resolve = waiters.shift()
      resolve?.(next)
    }
  }

  target.on("data", (chunk) => {
    buffer = Buffer.concat([buffer, Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)])

    while (true) {
      const headerEnd = buffer.indexOf("\r\n\r\n")
      if (headerEnd < 0) break

      const headerBlock = buffer.slice(0, headerEnd).toString("utf8")
      const match = /content-length:\s*(\d+)/i.exec(headerBlock)
      if (!match) {
        buffer = Buffer.alloc(0)
        break
      }

      const contentLength = Number.parseInt(match[1] ?? "", 10)
      const start = headerEnd + 4
      const end = start + contentLength
      if (buffer.length < end) break

      const body = buffer.slice(start, end).toString("utf8")
      buffer = buffer.slice(end)
      queue.push(JSON.parse(body))
      flush()
    }
  })

  return () =>
    new Promise<unknown>((resolve) => {
      waiters.push(resolve)
      flush()
    })
}

describe("canvas MCP server", () => {
  let tempDir = ""
  let server: ReturnType<typeof createServer> | null = null

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server?.close((error) => {
          if (error) reject(error)
          else resolve()
        })
      })
      server = null
    }

    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true })
      tempDir = ""
    }
  })

  it("exposes manifest, Canvas surface reads, prompts, and screenshot capture over stdio MCP", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "canvas-mcp-test-"))
    await mkdir(path.join(tempDir, "queue"), { recursive: true })
    await mkdir(path.join(tempDir, "results"), { recursive: true })

    const queuedOperations: unknown[] = []

    server = createServer((req, res) => {
      const requestUrl = new URL(req.url || "/", "http://127.0.0.1")
      if (
        req.method === "POST" &&
        (requestUrl.pathname === "/api/agent-native/workspaces/color-audit/operations" ||
          requestUrl.pathname === "/api/agent-native/workspaces/system-canvas/operations")
      ) {
        const chunks: Buffer[] = []
        req.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        })
        req.on("end", () => {
          queuedOperations.push(JSON.parse(Buffer.concat(chunks).toString("utf8")))
          res.statusCode = 200
          res.setHeader("content-type", "application/json")
          res.end(JSON.stringify({ ok: true, operationId: "color-audit-operation-1", cursor: 1 }))
        })
        return
      }

      const payload =
        requestUrl.pathname === "/api/agent-native/manifest"
          ? {
              manifest: {
                version: 1,
                workspaces: [
                  { id: "canvas" },
                  { id: "color-audit" },
                  { id: "system-canvas" },
                  { id: "node-catalog" },
                ],
              },
            }
          : requestUrl.pathname === "/api/agent-native/workspaces/color-audit/manifest"
            ? {
                manifest: {
                  surface: "color-audit",
                  version: 1,
                  resources: [{ id: "color-audit-state" }],
                },
              }
            : requestUrl.pathname === "/api/agent-native/workspaces/color-audit/state"
              ? {
                  state: {
                    rawState: {
                      nodes: [],
                      edges: [],
                      selectedNodeId: null,
                      selectedEdgeId: null,
                      edgeUndoStack: [],
                    },
                    surface: "color-audit",
                    selection: {
                      selectedNodeId: "node-1",
                      selectedEdgeId: null,
                    },
                    nodes: [{ id: "node-1", label: "Brand Seed" }],
                  },
                }
              : requestUrl.pathname === "/api/agent-native/workspaces/system-canvas/state"
                ? {
                    state: {
                      rawState: {
                        nodes: [],
                        edges: [],
                        selectedNodeId: null,
                        selectedEdgeId: null,
                        edgeUndoStack: [],
                      },
                      surface: "system-canvas",
                      viewMode: "system",
                      nodes: [{ id: "node-2", label: "Type / Base Scale" }],
                    },
                  }
                : requestUrl.pathname === "/api/agent-native/workspaces/node-catalog/state"
                  ? {
                      state: {
                        surface: "node-catalog",
                        workspaceSections: [
                          {
                            id: "canvas-workspace",
                            label: "Canvas Workspace",
                          },
                        ],
                        nodeSections: [
                          {
                            id: "starter-ramp",
                            label: "Starter Ramp",
                          },
                        ],
                      },
                    }
                  : requestUrl.pathname === "/api/agent-native/workspaces/system-canvas/events"
                    ? {
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
                            source: "canvas-agent-mcp",
                            createdAt: "2026-04-03T10:00:00.000Z",
                          },
                        ],
                      }
                    : requestUrl.pathname === "/api/agent-native/workspaces/canvas/debug"
                      ? {
                          ok: true,
                          workspaceId: "canvas",
                          workspaceKey: "gallery-demo:canvas",
                          debug: {
                            workspaceId: "canvas",
                            workspaceKey: "gallery-demo:canvas",
                            cursor: 7,
                            appliedCursor: 5,
                            pendingOperationCount: 1,
                            events: [
                              {
                                id: "canvas-event-6",
                                workspaceId: "canvas",
                                workspaceKey: "gallery-demo:canvas",
                                kind: "operation-applied",
                                actor: "agent",
                                source: "canvas-agent-mcp",
                                createdAt: "2026-04-04T09:00:00.000Z",
                              },
                            ],
                          },
                        }
                  : requestUrl.pathname === "/api/agent-native/workspaces/color-audit/export-preview"
                  ? {
                      exportPreview: {
                        selectedFormat: "css-vars",
                        selectedColorMode: "oklch",
                        tokenCount: 1,
                      },
                    }
                  : requestUrl.pathname === "/api/agent-native/workspaces/color-audit/screenshot"
                    ? {
                        capture: {
                          workspaceId: "color-audit",
                          target: "desktop",
                          mediaUrl: "/api/media/file/color-audit.png",
                        },
                      }
                    : requestUrl.pathname === "/api/projects/demo/canvases"
                      ? {
                          ok: true,
                          files: [
                            {
                              path: "boards/demo.canvas",
                              title: "Demo",
                              surface: "canvas",
                            },
                          ],
                        }
                      : requestUrl.pathname === "/api/projects/demo/canvases/file"
                        ? {
                            ok: true,
                            file: {
                              path: "boards/demo.canvas",
                              document: {
                                meta: {
                                  title: "Demo",
                                },
                              },
                            },
                          }
                        : req.method === "POST" &&
                            requestUrl.pathname === "/api/projects/demo/canvases/create"
                          ? {
                              ok: true,
                              file: {
                                path: "boards/new.canvas",
                                document: {
                                  meta: {
                                    title: "New File",
                                  },
                                },
                              },
                            }
                        : req.method === "POST" &&
                            requestUrl.pathname === "/api/projects/demo/canvases/move"
                          ? {
                              ok: true,
                              file: {
                                path: "boards/demo-renamed.canvas",
                                document: {
                                  meta: {
                                    title: "Demo Renamed",
                                  },
                                },
                              },
                            }
                        : req.method === "POST" &&
                            requestUrl.pathname === "/api/projects/demo/canvases/duplicate"
                          ? {
                              ok: true,
                              file: {
                                path: "archive/demo-copy.canvas",
                                document: {
                                  meta: {
                                    title: "Demo Copy",
                                  },
                                },
                              },
                            }
                        : req.method === "POST" &&
                            requestUrl.pathname === "/api/projects/demo/canvases/delete"
                          ? {
                              ok: true,
                              path: "archive/demo-copy.canvas",
                            }
                    : { error: `Unhandled path: ${requestUrl.pathname}` }

      res.statusCode = "error" in payload ? 404 : 200
      res.setHeader("content-type", "application/json")
      res.end(JSON.stringify(payload))
    })

    server.listen(0, "127.0.0.1")
    await once(server, "listening")
    const address = server.address()
    if (!address || typeof address === "string") {
      throw new Error("Expected TCP address for MCP test server.")
    }

    const child = spawn("node", ["bin/canvas-mcp-server"], {
      cwd: WORKSPACE_ROOT,
      env: {
        ...process.env,
        CANVAS_AGENT_SESSION_DIR: tempDir,
        CANVAS_AGENT_PROJECT_ID: "demo",
        CANVAS_AGENT_SESSION_ID: "session-1",
        CANVAS_AGENT_SERVER_URL: `http://127.0.0.1:${address.port}`,
        CANVAS_AGENT_COLOR_AUDIT_WORKSPACE_KEY: "gallery-demo:color-audit",
      },
      stdio: ["pipe", "pipe", "pipe"],
    })

    let stderr = ""
    child.stderr.setEncoding("utf8")
    child.stderr.on("data", (chunk) => {
      stderr += chunk
    })

    const readRpcMessage = createRpcReader(child.stdout)
    const sendRpc = async (payload: Record<string, unknown>) => {
      child.stdin.write(encodeRpcMessage(payload))
      return readRpcMessage()
    }

    try {
      const initialize = (await sendRpc({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: { protocolVersion: "2025-03-26" },
      })) as { result?: Record<string, any> }

      expect(initialize.result?.capabilities?.resources?.listChanged).toBe(false)
      expect(initialize.result?.capabilities?.prompts?.listChanged).toBe(false)

      const resourcesList = (await sendRpc({
        jsonrpc: "2.0",
        id: 2,
        method: "resources/list",
      })) as { result?: { resources?: Array<{ uri: string }> } }

      expect(resourcesList.result?.resources?.map((resource) => resource.uri)).toContain(
        "workspace://project/canvases/index"
      )
      expect(resourcesList.result?.resources?.map((resource) => resource.uri)).toContain(
        "workspace://surface/canvas/debug"
      )
      expect(resourcesList.result?.resources?.map((resource) => resource.uri)).toContain(
        "workspace://surface/color-audit/state"
      )
      expect(resourcesList.result?.resources?.map((resource) => resource.uri)).toContain(
        "workspace://surface/system-canvas/state"
      )
      expect(resourcesList.result?.resources?.map((resource) => resource.uri)).toContain(
        "workspace://surface/system-canvas/events"
      )
      expect(resourcesList.result?.resources?.map((resource) => resource.uri)).toContain(
        "workspace://surface/node-catalog/state"
      )
      expect(resourcesList.result?.resources?.map((resource) => resource.uri)).toContain(
        "workspace://surface/node-catalog/manifest"
      )

      const promptsList = (await sendRpc({
        jsonrpc: "2.0",
        id: 3,
        method: "prompts/list",
      })) as { result?: { prompts?: Array<{ name: string }> } }

      expect(promptsList.result?.prompts?.map((prompt) => prompt.name)).toContain(
        "build-color-audit-palette"
      )
      expect(promptsList.result?.prompts?.map((prompt) => prompt.name)).toContain(
        "review-scale-system"
      )
      expect(promptsList.result?.prompts?.map((prompt) => prompt.name)).toContain(
        "review-node-system"
      )

      const colorAuditState = (await sendRpc({
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: {
          name: "get_color_audit_state",
          arguments: {},
        },
      })) as { result?: { structuredContent?: Record<string, any> } }

      expect(colorAuditState.result?.structuredContent?.surface).toBe("color-audit")
      expect(colorAuditState.result?.structuredContent?.nodes?.[0]?.label).toBe("Brand Seed")

      const exportResource = (await sendRpc({
        jsonrpc: "2.0",
        id: 5,
        method: "resources/read",
        params: {
          uri: "workspace://surface/color-audit/export-preview",
        },
      })) as { result?: { contents?: Array<{ text: string }> } }

      const exportPayload = JSON.parse(exportResource.result?.contents?.[0]?.text || "{}")
      expect(exportPayload.tokenCount).toBe(1)
      expect(exportPayload.selectedColorMode).toBe("oklch")

      const projectCanvasFiles = (await sendRpc({
        jsonrpc: "2.0",
        id: "5b",
        method: "tools/call",
        params: {
          name: "list_canvas_files",
          arguments: {
            surface: "canvas",
          },
        },
      })) as { result?: { structuredContent?: Array<Record<string, any>> } }

      expect(projectCanvasFiles.result?.structuredContent?.[0]?.path).toBe("boards/demo.canvas")

      const projectCanvasFileResource = (await sendRpc({
        jsonrpc: "2.0",
        id: "5c",
        method: "resources/read",
        params: {
          uri: "workspace://project/canvases/index",
        },
      })) as { result?: { contents?: Array<{ text: string }> } }

      const projectCanvasFilePayload = JSON.parse(
        projectCanvasFileResource.result?.contents?.[0]?.text || "[]"
      )
      expect(projectCanvasFilePayload[0]?.title).toBe("Demo")

      const openedCanvasFile = (await sendRpc({
        jsonrpc: "2.0",
        id: "5d",
        method: "tools/call",
        params: {
          name: "open_canvas_file",
          arguments: {
            path: "boards/demo.canvas",
          },
        },
      })) as { result?: { structuredContent?: Record<string, any> } }

      expect(openedCanvasFile.result?.structuredContent?.document?.meta?.title).toBe("Demo")

      const createdCanvasFile = (await sendRpc({
        jsonrpc: "2.0",
        id: "5e",
        method: "tools/call",
        params: {
          name: "create_canvas_file",
          arguments: {
            title: "New File",
            surface: "canvas",
          },
        },
      })) as { result?: { structuredContent?: Record<string, any> } }

      expect(createdCanvasFile.result?.structuredContent?.path).toBe("boards/new.canvas")

      const movedCanvasFile = (await sendRpc({
        jsonrpc: "2.0",
        id: "5f",
        method: "tools/call",
        params: {
          name: "move_canvas_file",
          arguments: {
            path: "boards/demo.canvas",
            title: "Demo Renamed",
          },
        },
      })) as { result?: { structuredContent?: Record<string, any> } }

      expect(movedCanvasFile.result?.structuredContent?.path).toBe("boards/demo-renamed.canvas")

      const duplicatedCanvasFile = (await sendRpc({
        jsonrpc: "2.0",
        id: "5g",
        method: "tools/call",
        params: {
          name: "duplicate_canvas_file",
          arguments: {
            path: "boards/demo-renamed.canvas",
            title: "Demo Copy",
            folder: "archive",
          },
        },
      })) as { result?: { structuredContent?: Record<string, any> } }

      expect(duplicatedCanvasFile.result?.structuredContent?.path).toBe("archive/demo-copy.canvas")

      const deletedCanvasFile = (await sendRpc({
        jsonrpc: "2.0",
        id: "5h",
        method: "tools/call",
        params: {
          name: "delete_canvas_file",
          arguments: {
            path: "archive/demo-copy.canvas",
          },
        },
      })) as { result?: { structuredContent?: Record<string, any> } }

      expect(deletedCanvasFile.result?.structuredContent?.ok).toBe(true)

      const systemState = (await sendRpc({
        jsonrpc: "2.0",
        id: 6,
        method: "tools/call",
        params: {
          name: "get_system_canvas_state",
          arguments: {},
        },
      })) as { result?: { structuredContent?: Record<string, any> } }

      expect(systemState.result?.structuredContent?.surface).toBe("system-canvas")
      expect(systemState.result?.structuredContent?.nodes?.[0]?.label).toBe("Type / Base Scale")

      const screenshot = (await sendRpc({
        jsonrpc: "2.0",
        id: 7,
        method: "tools/call",
        params: {
          name: "capture_workspace_screenshot",
          arguments: {
            workspaceId: "color-audit",
          },
        },
      })) as { result?: { structuredContent?: Record<string, any> } }

      expect(screenshot.result?.structuredContent?.mediaUrl).toBe("/api/media/file/color-audit.png")

      const nodeCatalogState = (await sendRpc({
        jsonrpc: "2.0",
        id: 8,
        method: "tools/call",
        params: {
          name: "get_node_catalog_state",
          arguments: {},
        },
      })) as { result?: { structuredContent?: Record<string, any> } }

      expect(nodeCatalogState.result?.structuredContent?.surface).toBe("node-catalog")
      expect(nodeCatalogState.result?.structuredContent?.workspaceSections?.[0]?.label).toBe(
        "Canvas Workspace"
      )

      const nodeCatalogSections = (await sendRpc({
        jsonrpc: "2.0",
        id: 9,
        method: "resources/read",
        params: {
          uri: "workspace://surface/node-catalog/sections",
        },
      })) as { result?: { contents?: Array<{ text: string }> } }

      const sectionsPayload = JSON.parse(nodeCatalogSections.result?.contents?.[0]?.text || "{}")
      expect(sectionsPayload.workspaceSections?.[0]?.id).toBe("canvas-workspace")
      expect(sectionsPayload.nodeSections?.[0]?.id).toBe("starter-ramp")

      const systemEvents = (await sendRpc({
        jsonrpc: "2.0",
        id: 10,
        method: "tools/call",
        params: {
          name: "get_workspace_events",
          arguments: {
            workspaceId: "system-canvas",
            limit: 10,
          },
        },
      })) as { result?: { structuredContent?: Record<string, any> } }

      expect(systemEvents.result?.structuredContent?.events?.[0]?.id).toBe("event-1")
      expect(systemEvents.result?.structuredContent?.events?.[0]?.kind).toBe("operation-queued")

      const canvasDebug = (await sendRpc({
        jsonrpc: "2.0",
        id: 11,
        method: "tools/call",
        params: {
          name: "get_workspace_debug",
          arguments: {
            workspaceId: "canvas",
            limit: 12,
          },
        },
      })) as { result?: { structuredContent?: Record<string, any> } }

      expect(canvasDebug.result?.structuredContent?.workspaceId).toBe("canvas")
      expect(canvasDebug.result?.structuredContent?.pendingOperationCount).toBe(1)
      expect(canvasDebug.result?.structuredContent?.events?.[0]?.id).toBe("canvas-event-6")

      const generateTemplate = (await sendRpc({
        jsonrpc: "2.0",
        id: 12,
        method: "tools/call",
        params: {
          name: "generate_template",
          arguments: {
            templateKitId: "shadcn",
            brandColor: "oklch(62% 0.19 255)",
          },
        },
      })) as { result?: { structuredContent?: Record<string, any> } }

      expect(generateTemplate.result?.structuredContent?.ok).toBe(true)
      expect(queuedOperations).toHaveLength(1)
      expect(queuedOperations[0]).toMatchObject({
        workspaceKey: "gallery-demo:color-audit",
        source: "canvas-agent-mcp",
        operation: {
          type: "generate-template",
          templateKitId: "shadcn",
          brandColor: "oklch(62% 0.19 255)",
        },
      })

      const generateScaleGraph = (await sendRpc({
        jsonrpc: "2.0",
        id: 13,
        method: "tools/call",
        params: {
          name: "generate_scale_graph",
          arguments: {},
        },
      })) as { result?: { structuredContent?: Record<string, any> } }

      expect(generateScaleGraph.result?.structuredContent?.ok).toBe(true)
      expect(queuedOperations).toHaveLength(2)
      expect(queuedOperations[1]).toMatchObject({
        workspaceKey: "gallery-demo:system-canvas",
        source: "canvas-agent-mcp",
        operation: {
          type: "generate-scale-graph",
        },
      })

      const createSystemNode = (await sendRpc({
        jsonrpc: "2.0",
        id: 14,
        method: "tools/call",
        params: {
          name: "create_system_node",
          arguments: {
            node: {
              id: "system-node-1",
              type: "semantic",
              label: "Agent Support",
              role: "surface",
              group: "system-support",
              position: { x: 120, y: 80 },
            },
          },
        },
      })) as { result?: { structuredContent?: Record<string, any> } }

      expect(createSystemNode.result?.structuredContent?.ok).toBe(true)
      expect(queuedOperations).toHaveLength(3)
      expect(queuedOperations[2]).toMatchObject({
        workspaceKey: "gallery-demo:system-canvas",
        source: "canvas-agent-mcp",
        operation: {
          type: "create-node",
          node: {
            id: "system-node-1",
            label: "Agent Support",
          },
        },
      })

      const prompt = (await sendRpc({
        jsonrpc: "2.0",
        id: 15,
        method: "prompts/get",
        params: {
          name: "review-scale-system",
          arguments: {},
        },
      })) as { result?: { messages?: Array<{ content?: { text?: string } }> } }

      expect(prompt.result?.messages?.[0]?.content?.text).toContain(
        "workspace://surface/system-canvas/state"
      )
      expect(prompt.result?.messages?.[0]?.content?.text).toContain(
        "workspace://surface/system-canvas/viewport/screenshot"
      )

      const nodePrompt = (await sendRpc({
        jsonrpc: "2.0",
        id: 16,
        method: "prompts/get",
        params: {
          name: "review-node-system",
          arguments: {},
        },
      })) as { result?: { messages?: Array<{ content?: { text?: string } }> } }

      expect(nodePrompt.result?.messages?.[0]?.content?.text).toContain(
        "workspace://surface/node-catalog/state"
      )
      expect(nodePrompt.result?.messages?.[0]?.content?.text).toContain(
        "workspace://surface/node-catalog/sections"
      )

      const canvasDebugResource = (await sendRpc({
        jsonrpc: "2.0",
        id: 17,
        method: "resources/read",
        params: {
          uri: "workspace://surface/canvas/debug",
        },
      })) as { result?: { contents?: Array<{ text: string }> } }

      const canvasDebugPayload = JSON.parse(canvasDebugResource.result?.contents?.[0]?.text || "{}")
      expect(canvasDebugPayload.workspaceKey).toBe("gallery-demo:canvas")
      expect(canvasDebugPayload.cursor).toBe(7)
    } finally {
      child.kill("SIGTERM")
      await once(child, "exit")
    }

    expect(stderr).toBe("")
  })
})
