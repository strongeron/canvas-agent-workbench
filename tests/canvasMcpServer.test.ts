import { spawn } from "node:child_process"
import { once } from "node:events"
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises"
import { createServer } from "node:http"
import { tmpdir } from "node:os"
import path from "node:path"

import { afterEach, describe, expect, it } from "vitest"
import { listCanvasHtmlSlots } from "../utils/canvasHtmlEditor"

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

async function waitForQueuedCanvasOperation(sessionDir: string, timeoutMs = 10000) {
  const startedAt = Date.now()
  const queueDir = path.join(sessionDir, "queue")
  const resultsDir = path.join(sessionDir, "results")

  while (Date.now() - startedAt < timeoutMs) {
    const entries = await readdir(queueDir).catch(() => [])
    const nextEntry = entries.find((entry) => entry.endsWith(".json"))
    if (nextEntry) {
      const requestPath = path.join(queueDir, nextEntry)
      const resultPath = path.join(resultsDir, nextEntry)
      const request = JSON.parse(await readFile(requestPath, "utf8"))
      await rm(requestPath, { force: true })
      return {
        request,
        async respond(payload: unknown) {
          await writeFile(resultPath, JSON.stringify(payload, null, 2))
        },
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 25))
  }

  throw new Error(`Timed out waiting for queued canvas operation in ${sessionDir}`)
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
    await writeFile(
      path.join(tempDir, "state.json"),
      JSON.stringify(
        {
          state: {
            items: [
              {
                id: "html-node-1",
                type: "html",
                src: "/api/projects/demo/canvases/assets/file?path=boards%2Fdemo.canvas&asset=html%2Fold-bundle%2Findex.html",
                title: "Old Bundle",
                entryAsset: "html/old-bundle/index.html",
                position: { x: 40, y: 40 },
                size: { width: 480, height: 320 },
                rotation: 0,
                zIndex: 0,
              },
              {
                id: "item-1",
                type: "component",
                componentId: "button",
                variantIndex: 0,
                position: { x: 100, y: 80 },
                size: { width: 120, height: 48 },
                rotation: 0,
                zIndex: 1,
              },
              {
                id: "item-2",
                type: "component",
                componentId: "card",
                variantIndex: 0,
                position: { x: 280, y: 120 },
                size: { width: 180, height: 96 },
                rotation: 0,
                zIndex: 2,
              },
              {
                id: "artboard-1",
                type: "artboard",
                name: "Board",
                position: { x: 40, y: 440 },
                size: { width: 640, height: 360 },
                rotation: 0,
                zIndex: 3,
                layout: {
                  display: "flex",
                  direction: "column",
                  align: "stretch",
                  justify: "start",
                  gap: 16,
                  padding: 24,
                },
              },
              {
                id: "markdown-1",
                type: "markdown",
                source: "# Hello\n\nParagraph",
                title: "Notes",
                position: { x: 720, y: 80 },
                size: { width: 320, height: 240 },
                rotation: 0,
                zIndex: 4,
                sourcePath: "projects/demo/content/notes.md",
                sourceFileMtime: 700,
              },
              {
                id: "mermaid-1",
                type: "mermaid",
                source: "flowchart LR\n  A[Start] --> B[Ship]",
                title: "Flow",
                mermaidTheme: "default",
                position: { x: 720, y: 360 },
                size: { width: 320, height: 220 },
                rotation: 0,
                zIndex: 5,
              },
              {
                id: "media-1",
                type: "media",
                src: "video.mp4",
                mediaKind: "video",
                position: { x: 1080, y: 80 },
                size: { width: 360, height: 220 },
                rotation: 0,
                zIndex: 6,
                controls: true,
                muted: true,
                clipStartSec: 2,
                clipEndSec: 10,
                objectFit: "cover",
              },
              {
                id: "mcp-app-1",
                type: "mcp-app",
                appName: "Filesystem MCP",
                transport: {
                  kind: "stdio",
                  command: "npx",
                  args: ["-y", "@modelcontextprotocol/server-filesystem"],
                },
                status: "connected",
                toolsCache: [
                  {
                    name: "read_file",
                    description: "Read a file",
                    inputSchema: {
                      type: "object",
                      properties: {
                        path: { type: "string" },
                      },
                    },
                  },
                ],
                recentCalls: [
                  {
                    id: "mcp-call-1",
                    nodeId: "mcp-app-1",
                    toolName: "read_file",
                    status: "success",
                    startedAt: "2026-05-24T10:00:00.000Z",
                    finishedAt: "2026-05-24T10:00:00.100Z",
                    args: { path: "/tmp/demo.txt" },
                    result: { content: "hello" },
                  },
                ],
                position: { x: 1080, y: 360 },
                size: { width: 420, height: 260 },
                rotation: 0,
                zIndex: 7,
              },
            ],
            groups: [],
            nextZIndex: 8,
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
    await writeFile(
      path.join(tempDir, "primitives.json"),
      JSON.stringify(
        [
          {
            primitiveId: "button",
            entryId: "button",
            name: "Button",
            variants: [
              { name: "Default", description: "", props: {}, category: "default" },
              { name: "Secondary", description: "", props: {}, category: "default" },
            ],
          },
          {
            primitiveId: "card",
            entryId: "card",
            name: "Card",
            variants: [{ name: "Default", description: "", props: {}, category: "default" }],
          },
        ],
        null,
        2
      )
    )

    const queuedOperations: unknown[] = []
    let importedHtmlBundleRequestBody: Record<string, any> | null = null
    let canvasScreenshotRequestBody: Record<string, any> | null = null
    let tokenWriteRequestBody: Record<string, any> | null = null
    let htmlReadRequestBody: Record<string, any> | null = null
    let htmlWriteRequestBody: Record<string, any> | null = null
    let markdownWriteRequestBody: Record<string, any> | null = null
    let componentCreateRequestBody: Record<string, any> | null = null
    let syncTargetRequestBody: Record<string, any> | null = null
    let detectComponentsDirRequestBody: Record<string, any> | null = null
    let projectSyncRequestBody: Record<string, any> | null = null
    let mcpAppConnectRequestBody: Record<string, any> | null = null
    let mcpAppInvokeToolRequestBody: Record<string, any> | null = null
    let mcpAppDisconnectRequestBody: Record<string, any> | null = null
    let mcpAppLogRequestBody: Record<string, any> | null = null
    // Mutable so a test step can simulate a stale/invalid persisted mapping
    // (the read endpoint realpath-revalidates and returns `valid`).
    let syncTargetValid = true

    server = createServer((req, res) => {
      const requestUrl = new URL(req.url || "/", "http://127.0.0.1")
      if (req.method === "POST" && requestUrl.pathname === "/api/canvas/tokens/list") {
        res.statusCode = 200
        res.setHeader("content-type", "application/json")
        res.end(
          JSON.stringify({
            ok: true,
            projectId: "demo",
            filePath: "projects/demo/tokens.css",
            mtimeMs: 123,
            tokens: [{ name: "--color-brand-600", value: "#2563eb", category: "color" }],
            sourceCss: ":root { --color-brand-600: #2563eb; }",
          })
        )
        return
      }

      if (req.method === "POST" && requestUrl.pathname === "/api/canvas/tokens/write") {
        const chunks: Buffer[] = []
        req.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        })
        req.on("end", () => {
          tokenWriteRequestBody = JSON.parse(Buffer.concat(chunks).toString("utf8"))
          res.statusCode = 200
          res.setHeader("content-type", "application/json")
          res.end(
            JSON.stringify({
              ok: true,
              projectId: "demo",
              filePath: "projects/demo/tokens.css",
              mtimeMs: 124,
              appliedMutations: 1,
              tokens: [{ name: "--color-brand-600", value: "#1d4ed8", category: "color" }],
              sourceCss: ":root { --color-brand-600: #1d4ed8; }",
            })
          )
        })
        return
      }

      if (req.method === "POST" && requestUrl.pathname === "/api/canvas/ast/load") {
        res.statusCode = 200
        res.setHeader("content-type", "application/json")
        res.end(
          JSON.stringify({
            ok: true,
            kind: "html",
            filePath: "projects/demo/components/Card.html",
            source: "<article class=\"card\">Hello</article>",
            sourceHtml: "<article class=\"card\">Hello</article>",
            mtimeMs: 456,
          })
        )
        return
      }

      if (req.method === "POST" && requestUrl.pathname === "/api/canvas/ast/read") {
        const chunks: Buffer[] = []
        req.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        })
        req.on("end", () => {
          htmlReadRequestBody = JSON.parse(Buffer.concat(chunks).toString("utf8"))
          res.statusCode = 200
          res.setHeader("content-type", "application/json")
          res.end(
            JSON.stringify({
              ok: true,
              node: {
                canvasId: htmlReadRequestBody?.canvasId,
                tag: "article",
                attributes: [{ name: "class", value: "card", kind: "literal-string" }],
                textContent: "Hello",
              },
            })
          )
        })
        return
      }

      if (req.method === "POST" && requestUrl.pathname === "/api/canvas/ast/write") {
        const chunks: Buffer[] = []
        req.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        })
        req.on("end", () => {
          htmlWriteRequestBody = JSON.parse(Buffer.concat(chunks).toString("utf8"))
          res.statusCode = 200
          res.setHeader("content-type", "application/json")
          res.end(
            JSON.stringify({
              ok: true,
              kind: "html",
              sourceHtml: "<article class=\"card featured\">Hello</article>",
              appliedMutations: 1,
              mtimeMs: 457,
              filePath: "projects/demo/components/Card.html",
            })
          )
        })
        return
      }

      if (req.method === "POST" && requestUrl.pathname === "/api/canvas/markdown/write") {
        const chunks: Buffer[] = []
        req.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        })
        req.on("end", () => {
          markdownWriteRequestBody = JSON.parse(Buffer.concat(chunks).toString("utf8"))
          res.statusCode = 200
          res.setHeader("content-type", "application/json")
          res.end(
            JSON.stringify({
              ok: true,
              source: "# Hello\n\nUpdated paragraph",
              mtimeMs: 701,
            })
          )
        })
        return
      }

      if (req.method === "POST" && requestUrl.pathname === "/api/canvas/component/create") {
        const chunks: Buffer[] = []
        req.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        })
        req.on("end", () => {
          componentCreateRequestBody = JSON.parse(Buffer.concat(chunks).toString("utf8"))
          const isTsx = componentCreateRequestBody?.format === "tsx"
          res.statusCode = 200
          res.setHeader("content-type", "application/json")
          res.end(
            JSON.stringify({
              ok: true,
              projectId: "demo",
              primitive: {
                id: isTsx ? "primitive/badge" : "primitive/promo-card",
                displayName: isTsx ? "Badge" : "PromoCard",
                category: "ui",
                kind: isTsx ? "tsx" : "html",
                componentSlug: isTsx ? "badge" : "promo-card",
                filePath: isTsx ? "components/Badge.tsx" : "components/PromoCard.html",
              },
              files: [
                {
                  filePath: isTsx ? "components/Badge.tsx" : "components/PromoCard.html",
                  mtimeMs: 789,
                },
              ],
            })
          )
        })
        return
      }

      if (req.method === "POST" && requestUrl.pathname === "/api/canvas/project/sync-target") {
        const chunks: Buffer[] = []
        req.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        })
        req.on("end", () => {
          syncTargetRequestBody = JSON.parse(Buffer.concat(chunks).toString("utf8"))
          res.statusCode = 200
          res.setHeader("content-type", "application/json")
          res.end(
            JSON.stringify({
              ok: true,
              // The user-confirmed allowlisted Root B mapping.
              syncTarget: {
                rootPath: "/tmp/allowlisted-root-b",
                resolvedRealPath: "/tmp/allowlisted-root-b",
                componentsDir: "src/components",
                format: "html",
                mappedAt: "2026-05-17T10:00:00.000Z",
              },
              valid: syncTargetValid,
              ...(syncTargetValid
                ? { resolvedRealPath: "/tmp/allowlisted-root-b" }
                : {}),
            })
          )
        })
        return
      }

      if (
        req.method === "POST" &&
        requestUrl.pathname === "/api/canvas/project/detect-components-dir"
      ) {
        const chunks: Buffer[] = []
        req.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        })
        req.on("end", () => {
          detectComponentsDirRequestBody = JSON.parse(Buffer.concat(chunks).toString("utf8"))
          res.statusCode = 200
          res.setHeader("content-type", "application/json")
          res.end(
            JSON.stringify({
              ok: true,
              resolvedComponentsDir: "src/components",
              candidates: [{ dir: "src/components", exists: true }],
              resolvedRealPath: "/tmp/allowlisted-root-b",
              frameworkSuggestion: "html",
              escapedDisplayPath: "/tmp/allowlisted-root-b/src/components",
            })
          )
        })
        return
      }

      if (req.method === "POST" && requestUrl.pathname === "/api/canvas/project/sync") {
        const chunks: Buffer[] = []
        req.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        })
        req.on("end", () => {
          projectSyncRequestBody = JSON.parse(Buffer.concat(chunks).toString("utf8"))
          res.statusCode = 200
          res.setHeader("content-type", "application/json")
          res.end(
            JSON.stringify({
              ok: true,
              writtenPaths: ["promo-card.html", "promo-card.css", "manifest.json"],
              notWritten: [],
              manifestPath: "/tmp/allowlisted-root-b/src/components/manifest.json",
              perFile: [
                { path: "promo-card.html", status: "written" },
                { path: "promo-card.css", status: "written" },
                { path: "manifest.json", status: "written" },
              ],
            })
          )
        })
        return
      }

      if (req.method === "POST" && requestUrl.pathname === "/api/canvas/mcp-app/connect") {
        const chunks: Buffer[] = []
        req.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        })
        req.on("end", () => {
          mcpAppConnectRequestBody = JSON.parse(Buffer.concat(chunks).toString("utf8"))
          res.statusCode = 200
          res.setHeader("content-type", "application/json")
          res.end(
            JSON.stringify({
              ok: true,
              status: "connected",
              tools: [
                {
                  name: "search_docs",
                  description: "Search remote docs",
                  inputSchema: { type: "object", properties: { q: { type: "string" } } },
                },
              ],
              resources: [],
              prompts: [],
              lastError: null,
            })
          )
        })
        return
      }

      if (req.method === "POST" && requestUrl.pathname === "/api/canvas/mcp-app/invoke-tool") {
        const chunks: Buffer[] = []
        req.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        })
        req.on("end", () => {
          mcpAppInvokeToolRequestBody = JSON.parse(Buffer.concat(chunks).toString("utf8"))
          res.statusCode = 200
          res.setHeader("content-type", "application/json")
          res.end(
            JSON.stringify({
              ok: true,
              callerDepth: 0,
              result: { content: [{ type: "text", text: "done" }] },
              recentCalls: [
                {
                  id: "mcp-call-2",
                  nodeId: "mcp-app-1",
                  toolName: "read_file",
                  status: "success",
                  startedAt: "2026-05-24T10:05:00.000Z",
                  finishedAt: "2026-05-24T10:05:00.100Z",
                  args: { path: "/tmp/demo.txt", token: "[redacted]" },
                  result: { content: "done" },
                },
              ],
            })
          )
        })
        return
      }

      if (req.method === "POST" && requestUrl.pathname === "/api/canvas/mcp-app/disconnect") {
        const chunks: Buffer[] = []
        req.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        })
        req.on("end", () => {
          mcpAppDisconnectRequestBody = JSON.parse(Buffer.concat(chunks).toString("utf8"))
          res.statusCode = 200
          res.setHeader("content-type", "application/json")
          res.end(
            JSON.stringify({
              ok: true,
              recentCalls: [
                {
                  id: "mcp-call-3",
                  nodeId: "mcp-app-1",
                  toolName: "read_file",
                  status: "success",
                  startedAt: "2026-05-24T10:06:00.000Z",
                  finishedAt: "2026-05-24T10:06:00.100Z",
                },
              ],
            })
          )
        })
        return
      }

      if (req.method === "POST" && requestUrl.pathname === "/api/canvas/mcp-app/log") {
        const chunks: Buffer[] = []
        req.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        })
        req.on("end", () => {
          mcpAppLogRequestBody = JSON.parse(Buffer.concat(chunks).toString("utf8"))
          res.statusCode = 200
          res.setHeader("content-type", "application/json")
          res.end(
            JSON.stringify({
              ok: true,
              recentCalls: [
                {
                  id: "mcp-call-4",
                  nodeId: "mcp-app-1",
                  toolName: "read_file",
                  status: "success",
                  startedAt: "2026-05-24T10:07:00.000Z",
                  finishedAt: "2026-05-24T10:07:00.100Z",
                },
              ],
            })
          )
        })
        return
      }

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

      if (req.method === "POST" && requestUrl.pathname === "/api/agent-native/workspaces/canvas/screenshot") {
        const chunks: Buffer[] = []
        req.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        })
        req.on("end", () => {
          canvasScreenshotRequestBody = JSON.parse(Buffer.concat(chunks).toString("utf8"))
          res.statusCode = 200
          res.setHeader("content-type", "application/json")
          res.end(
            JSON.stringify({
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
            })
          )
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
                        : requestUrl.pathname === "/api/projects/demo/canvases/html-bundles"
                          ? {
                              ok: true,
                              result: {
                                rootPath: "/Users/strongeron/Evil Martians/Claude Code/playground",
                                scannedAt: "2026-04-12T16:00:00.000Z",
                                entries: [
                                  {
                                    id: "landing",
                                    directoryPath:
                                      "/Users/strongeron/Evil Martians/Claude Code/playground/landing",
                                    relativeDirectory: "landing",
                                    entryFiles: ["index.html", "preview.html"],
                                    defaultEntryFile: "index.html",
                                  },
                                ],
                              },
                            }
                        : req.method === "POST" &&
                            requestUrl.pathname === "/api/projects/demo/canvases/html-bundle/import"
                          ? null
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

      if (req.method === "POST" && requestUrl.pathname === "/api/projects/demo/canvases/html-bundle/import") {
        const chunks: Buffer[] = []
        req.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        })
        req.on("end", () => {
          importedHtmlBundleRequestBody = JSON.parse(Buffer.concat(chunks).toString("utf8"))
          res.statusCode = 200
          res.setHeader("content-type", "application/json")
          res.end(
            JSON.stringify({
              ok: true,
              htmlBundle: {
                assetRoot: "html/marketing-card",
                entryAsset: "html/marketing-card/index.html",
                entryUrl:
                  "/api/projects/demo/canvases/assets/file?path=boards%2Fdemo.canvas&asset=html%2Fmarketing-card%2Findex.html",
                assetCount: 3,
                importedAt: "2026-04-12T15:00:00.000Z",
              },
            })
          )
        })
        return
      }

      res.statusCode = payload && "error" in payload ? 404 : 200
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
        "workspace://surface/canvas/themes"
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
      expect(promptsList.result?.prompts?.map((prompt) => prompt.name)).toContain(
        "replace-html-bundle"
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

      const canvasThemes = (await sendRpc({
        jsonrpc: "2.0",
        id: "4a",
        method: "tools/call",
        params: {
          name: "get_canvas_themes",
          arguments: {},
        },
      })) as { result?: { structuredContent?: Record<string, any> } }

      expect(canvasThemes.result?.structuredContent?.activeThemeId).toBe("default")
      expect(canvasThemes.result?.structuredContent?.themes?.[0]?.label).toBe("Default")
      expect(canvasThemes.result?.structuredContent?.tokenValues?.["--color-brand-600"]).toBe(
        "#2563eb"
      )

      const listedTokens = (await sendRpc({
        jsonrpc: "2.0",
        id: "4b-tokens-list",
        method: "tools/call",
        params: {
          name: "list_design_tokens",
          arguments: { projectId: "demo" },
        },
      })) as { result?: { structuredContent?: Record<string, any> } }

      expect(listedTokens.result?.structuredContent?.tokens?.[0]?.name).toBe("--color-brand-600")
      expect(listedTokens.result?.structuredContent?.mtimeMs).toBe(123)

      const updatedToken = (await sendRpc({
        jsonrpc: "2.0",
        id: "4c-token-update",
        method: "tools/call",
        params: {
          name: "update_design_token",
          arguments: {
            projectId: "demo",
            name: "--color-brand-600",
            value: "#1d4ed8",
            mtimeMs: 123,
          },
        },
      })) as { result?: { structuredContent?: Record<string, any> } }

      expect(tokenWriteRequestBody).toMatchObject({
        projectId: "demo",
        mutation: { type: "set", name: "--color-brand-600", value: "#1d4ed8" },
        mtimeMs: 123,
      })
      expect(updatedToken.result?.structuredContent?.tokens?.[0]?.value).toBe("#1d4ed8")

      const readHtmlNodeResult = (await sendRpc({
        jsonrpc: "2.0",
        id: "4d-html-read",
        method: "tools/call",
        params: {
          name: "read_html_node",
          arguments: {
            filePath: "projects/demo/components/Card.html",
            canvasId: "abc123:0",
          },
        },
      })) as { result?: { structuredContent?: Record<string, any> } }

      expect(htmlReadRequestBody).toMatchObject({
        sourceHtml: "<article class=\"card\">Hello</article>",
        canvasId: "abc123:0",
        sourceId: "projects/demo/components/Card.html",
      })
      expect(readHtmlNodeResult.result?.structuredContent?.node?.tag).toBe("article")
      expect(readHtmlNodeResult.result?.structuredContent?.mtimeMs).toBe(456)

      const updatedHtmlNode = (await sendRpc({
        jsonrpc: "2.0",
        id: "4e-html-update",
        method: "tools/call",
        params: {
          name: "update_html_node",
          arguments: {
            filePath: "projects/demo/components/Card.html",
            canvasId: "abc123:0",
            mtimeMs: 456,
            mutations: [{ type: "setClassName", value: "card featured" }],
          },
        },
      })) as { result?: { structuredContent?: Record<string, any> } }

      expect(htmlWriteRequestBody).toMatchObject({
        filePath: "projects/demo/components/Card.html",
        canvasId: "abc123:0",
        sourceId: "projects/demo/components/Card.html",
        mtimeMs: 456,
        mutations: [{ type: "setClassName", value: "card featured" }],
      })
      expect(updatedHtmlNode.result?.structuredContent?.sourceHtml).toContain("featured")

      const structuralMutation = (await sendRpc({
        jsonrpc: "2.0",
        id: "4e-structural",
        method: "tools/call",
        params: {
          name: "apply_structural_mutation",
          arguments: {
            filePath: "projects/demo/components/Card.html",
            canvasId: "abc123:0",
            mtimeMs: 456,
            mutation: { type: "wrapSelection", wrapperTag: "section" },
          },
        },
      })) as { result?: { structuredContent?: Record<string, any> } }

      expect(htmlWriteRequestBody).toMatchObject({
        filePath: "projects/demo/components/Card.html",
        canvasId: "abc123:0",
        mutations: [{ type: "wrapSelection", wrapperTag: "section" }],
      })
      expect(structuralMutation.result?.structuredContent?.appliedMutations).toBe(1)

      const slotSourceHtml =
        '<!doctype html><html><body><article><section data-slot="body" data-slot-kind="container"></section></article></body></html>'
      const slotCanvasId =
        listCanvasHtmlSlots(slotSourceHtml, { sourceId: "inline-slot-source" })[0]?.canvasId || ""
      const insertNativeSlotPart = (await sendRpc({
        jsonrpc: "2.0",
        id: "4e-slot-part",
        method: "tools/call",
        params: {
          name: "insert_native_slot_part",
          arguments: {
            sourceHtml: slotSourceHtml,
            sourceId: "inline-slot-source",
            canvasId: slotCanvasId,
            part: "button",
            sourceUrl: "https://example.com/ignored-for-button",
          },
        },
      })) as { result?: { structuredContent?: Record<string, any> } }

      expect(htmlWriteRequestBody).toMatchObject({
        sourceHtml: slotSourceHtml,
        canvasId: slotCanvasId,
        sourceId: "inline-slot-source",
        mutations: [
          {
            type: "insertChild",
            position: 0,
            childSource: '<button type="button">Body action</button>',
          },
        ],
      })
      expect(insertNativeSlotPart.result?.structuredContent?.ok).toBe(true)

      const insertMediaSlotPart = (await sendRpc({
        jsonrpc: "2.0",
        id: "4e-slot-media-part",
        method: "tools/call",
        params: {
          name: "insert_native_slot_part",
          arguments: {
            sourceHtml:
              '<!doctype html><html><body><article><figure data-slot="media" data-slot-kind="container" data-slot-accepts="image,svg,video"></figure></article></body></html>',
            sourceId: "inline-media-slot-source",
            canvasId:
              listCanvasHtmlSlots(
                '<!doctype html><html><body><article><figure data-slot="media" data-slot-kind="container" data-slot-accepts="image,svg,video"></figure></article></body></html>',
                { sourceId: "inline-media-slot-source" }
              )[0]?.canvasId || "",
            part: "image",
            sourceUrl: "https://cdn.example.com/hero.jpg",
          },
        },
      })) as { result?: { structuredContent?: Record<string, any> } }

      expect(htmlWriteRequestBody).toMatchObject({
        sourceId: "inline-media-slot-source",
        mutations: [
          {
            type: "insertChild",
            childSource: '<img src="https://cdn.example.com/hero.jpg" alt="Media" />',
          },
        ],
      })
      expect(insertMediaSlotPart.result?.structuredContent?.ok).toBe(true)

      const markdownUpdatePromise = sendRpc({
        jsonrpc: "2.0",
        id: "4e-markdown-update",
        method: "tools/call",
        params: {
          name: "update_markdown_block",
          arguments: {
            itemId: "markdown-1",
            action: "update",
            blockIndex: 1,
            newText: "Updated paragraph",
          },
        },
      }) as Promise<{ result?: { structuredContent?: Record<string, any> } }>

      const queuedMarkdownUpdate = await waitForQueuedCanvasOperation(tempDir)
      expect(markdownWriteRequestBody).toMatchObject({
        action: "update",
        filePath: "projects/demo/content/notes.md",
        mtimeMs: 700,
        blockIndex: 1,
        newText: "Updated paragraph",
      })
      expect(queuedMarkdownUpdate.request).toMatchObject({
        toolName: "update_markdown_block",
        operation: {
          type: "update_item",
          id: "markdown-1",
          updates: {
            source: "# Hello\n\nUpdated paragraph",
            sourceFileMtime: 701,
          },
        },
      })
      await queuedMarkdownUpdate.respond({
        ok: true,
        updatedAt: "2026-05-14T20:00:00.000Z",
        state: { items: [], groups: [], nextZIndex: 1, selectedIds: [] },
      })
      const markdownUpdate = await markdownUpdatePromise
      expect(markdownUpdate.result?.structuredContent?.mtimeMs).toBe(701)

      const cycleVariantPromise = sendRpc({
        jsonrpc: "2.0",
        id: "4e-cycle-variant",
        method: "tools/call",
        params: {
          name: "cycle_component_variant",
          arguments: {
            itemId: "item-1",
            direction: "next",
          },
        },
      }) as Promise<{ result?: { structuredContent?: Record<string, any> } }>

      const queuedVariantCycle = await waitForQueuedCanvasOperation(tempDir)
      expect(queuedVariantCycle.request).toMatchObject({
        toolName: "cycle_component_variant",
        operation: {
          type: "update_item",
          id: "item-1",
          updates: {
            variantIndex: 1,
          },
        },
      })
      await queuedVariantCycle.respond({
        ok: true,
        updatedAt: "2026-05-14T20:00:01.000Z",
        state: { items: [], groups: [], nextZIndex: 1, selectedIds: [] },
      })
      const cycledVariant = await cycleVariantPromise
      expect(cycledVariant.result?.structuredContent?.variantIndex).toBe(1)

      const artboardLayoutPromise = sendRpc({
        jsonrpc: "2.0",
        id: "4e-artboard-layout",
        method: "tools/call",
        params: {
          name: "update_artboard_layout",
          arguments: {
            itemId: "artboard-1",
            layout: {
              gap: 28,
              padding: 32,
            },
          },
        },
      }) as Promise<{ result?: { structuredContent?: Record<string, any> } }>

      const queuedArtboardLayout = await waitForQueuedCanvasOperation(tempDir)
      expect(queuedArtboardLayout.request).toMatchObject({
        toolName: "update_artboard_layout",
        operation: {
          type: "update_item",
          id: "artboard-1",
          updates: {
            layout: expect.objectContaining({
              gap: 28,
              padding: 32,
            }),
          },
        },
      })
      await queuedArtboardLayout.respond({
        ok: true,
        updatedAt: "2026-05-14T20:00:02.000Z",
        state: { items: [], groups: [], nextZIndex: 1, selectedIds: [] },
      })
      const artboardLayoutUpdate = await artboardLayoutPromise
      expect(artboardLayoutUpdate.result?.structuredContent?.layout?.gap).toBe(28)

      const mermaidLabelPromise = sendRpc({
        jsonrpc: "2.0",
        id: "4e-mermaid-label",
        method: "tools/call",
        params: {
          name: "update_mermaid_label",
          arguments: {
            itemId: "mermaid-1",
            nodeId: "B",
            label: "Review",
          },
        },
      }) as Promise<{ result?: { structuredContent?: Record<string, any> } }>

      const queuedMermaidLabel = await waitForQueuedCanvasOperation(tempDir)
      expect(queuedMermaidLabel.request).toMatchObject({
        toolName: "update_mermaid_label",
        operation: {
          type: "update_item",
          id: "mermaid-1",
          updates: {
            source: "flowchart LR\n  A[Start] --> B[Review]",
          },
        },
      })
      await queuedMermaidLabel.respond({
        ok: true,
        updatedAt: "2026-05-14T20:00:03.000Z",
        state: { items: [], groups: [], nextZIndex: 1, selectedIds: [] },
      })
      const mermaidLabelUpdate = await mermaidLabelPromise
      expect(mermaidLabelUpdate.result?.structuredContent?.changed).toBe(true)

      const mediaCropPromise = sendRpc({
        jsonrpc: "2.0",
        id: "4e-media-crop",
        method: "tools/call",
        params: {
          name: "update_media_crop",
          arguments: {
            itemId: "media-1",
            updates: {
              crop: { x: 0.1, y: 0, w: 0.5, h: 0.5 },
              clipStartSec: 4.5,
              clipEndSec: 12,
              objectFit: "contain",
            },
          },
        },
      }) as Promise<{ result?: { structuredContent?: Record<string, any> } }>

      const queuedMediaCrop = await waitForQueuedCanvasOperation(tempDir)
      expect(queuedMediaCrop.request).toMatchObject({
        toolName: "update_media_crop",
        operation: {
          type: "update_item",
          id: "media-1",
          updates: {
            crop: { x: 0.1, y: 0, w: 0.5, h: 0.5 },
            clipStartSec: 4.5,
            clipEndSec: 12,
            objectFit: "contain",
          },
        },
      })
      await queuedMediaCrop.respond({
        ok: true,
        updatedAt: "2026-05-14T20:00:04.000Z",
        state: { items: [], groups: [], nextZIndex: 1, selectedIds: [] },
      })
      const mediaCropUpdate = await mediaCropPromise
      expect(mediaCropUpdate.result?.structuredContent?.updates?.objectFit).toBe("contain")
      expect(mediaCropUpdate.result?.structuredContent?.updates?.crop).toEqual({
        x: 0.1,
        y: 0,
        w: 0.5,
        h: 0.5,
      })

      const createdHtmlComponentPromise = sendRpc({
        jsonrpc: "2.0",
        id: "4f-component-html",
        method: "tools/call",
        params: {
          name: "create_component_from_html",
          arguments: {
            projectId: "demo",
            name: "Promo Card",
            sourceHtml: "<article>Promo</article>",
            sourceCss: "article { padding: 16px; }",
          },
        },
      }) as Promise<{ result?: { structuredContent?: Record<string, any> } }>

      const queuedHtmlComponentCreate = await waitForQueuedCanvasOperation(tempDir)
      expect(queuedHtmlComponentCreate.request).toMatchObject({
        toolName: "create_component_from_html",
        operation: {
          type: "create_item",
          item: {
            type: "html",
            sourceMode: "inline",
            sourceHtml: "<article>Promo</article>",
            sourcePath: "projects/demo/components/PromoCard.html",
          },
        },
      })
      await queuedHtmlComponentCreate.respond({
        ok: true,
        updatedAt: "2026-05-05T18:00:00.000Z",
        state: { items: [], groups: [], nextZIndex: 1, selectedIds: [] },
      })
      const createdHtmlComponent = await createdHtmlComponentPromise

      expect(componentCreateRequestBody).toMatchObject({
        projectId: "demo",
        name: "Promo Card",
        format: "html",
        sourceHtml: "<article>Promo</article>",
      })
      expect(createdHtmlComponent.result?.structuredContent?.component?.primitive?.kind).toBe("html")
      expect(createdHtmlComponent.result?.structuredContent?.item?.sourceMode).toBe("inline")

      const createdTsxComponentPromise = sendRpc({
        jsonrpc: "2.0",
        id: "4g-component-tsx",
        method: "tools/call",
        params: {
          name: "create_component_from_tsx",
          arguments: {
            projectId: "demo",
            name: "Badge",
            sourceTsx: "export function Badge() { return <span>Badge</span> }",
          },
        },
      }) as Promise<{ result?: { structuredContent?: Record<string, any> } }>

      const queuedTsxComponentCreate = await waitForQueuedCanvasOperation(tempDir)
      expect(queuedTsxComponentCreate.request).toMatchObject({
        toolName: "create_component_from_tsx",
        operation: {
          type: "create_item",
          item: {
            type: "html",
            sourceMode: "react",
            sourcePath: "projects/demo/components/Badge.tsx",
          },
        },
      })
      expect(queuedTsxComponentCreate.request.operation.item.sourceReact).toContain("import { Badge }")
      await queuedTsxComponentCreate.respond({
        ok: true,
        updatedAt: "2026-05-05T18:00:01.000Z",
        state: { items: [], groups: [], nextZIndex: 1, selectedIds: [] },
      })
      const createdTsxComponent = await createdTsxComponentPromise

      expect(componentCreateRequestBody).toMatchObject({
        projectId: "demo",
        name: "Badge",
        format: "tsx",
        sourceTsx: "export function Badge() { return <span>Badge</span> }",
      })
      expect(createdTsxComponent.result?.structuredContent?.component?.primitive?.kind).toBe("tsx")

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

      const scannedHtmlBundles = (await sendRpc({
        jsonrpc: "2.0",
        id: "5d-html-scan",
        method: "tools/call",
        params: {
          name: "scan_html_bundles",
          arguments: {
            rootPath: "/Users/strongeron/Evil Martians/Claude Code/playground",
          },
        },
      })) as { result?: { structuredContent?: Record<string, any> } }

      expect(scannedHtmlBundles.result?.structuredContent?.rootPath).toBe(
        "/Users/strongeron/Evil Martians/Claude Code/playground"
      )
      expect(scannedHtmlBundles.result?.structuredContent?.entries?.[0]?.defaultEntryFile).toBe(
        "index.html"
      )

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

      const importedHtmlBundle = (await sendRpc({
        jsonrpc: "2.0",
        id: "5e-html",
        method: "tools/call",
        params: {
          name: "import_html_bundle",
          arguments: {
            path: "boards/demo.canvas",
            createItem: false,
            bundle: {
              title: "Marketing Card",
              files: [
                {
                  path: "index.html",
                  content:
                    "<!doctype html><html><head><link rel='stylesheet' href='styles/site.css'></head><body><div class='card'>Hello</div><script src='scripts/app.js'></script></body></html>",
                },
                {
                  path: "styles/site.css",
                  content: ".card { color: #0f172a; }",
                },
                {
                  path: "scripts/app.js",
                  content: "document.body.dataset.ready = 'true'",
                },
              ],
            },
          },
        },
      })) as { result?: { structuredContent?: Record<string, any> } }

      expect(importedHtmlBundle.result?.structuredContent?.htmlBundle?.entryAsset).toBe(
        "html/marketing-card/index.html"
      )
      expect(importedHtmlBundle.result?.structuredContent?.htmlBundle?.assetCount).toBe(3)

      const replacedHtmlBundlePromise = sendRpc({
        jsonrpc: "2.0",
        id: "5e-html-replace",
        method: "tools/call",
        params: {
          name: "import_html_bundle",
          arguments: {
            path: "boards/demo.canvas",
            targetItemId: "html-node-1",
            bundle: {
              title: "Marketing Card",
              files: [
                {
                  relativePath: "index.html",
                  textContent:
                    "<!doctype html><html><body><main class='card'>Updated</main></body></html>",
                },
                {
                  relativePath: "styles/site.css",
                  textContent: ".card { color: #111827; }",
                },
              ],
            },
            item: {
              title: "Marketing Card",
              background: "#ffffff",
            },
          },
        },
      }) as Promise<{ result?: { structuredContent?: Record<string, any> } }>

      const queuedCanvasReplace = await waitForQueuedCanvasOperation(tempDir)
      expect(importedHtmlBundleRequestBody).toMatchObject({
        path: "boards/demo.canvas",
        bundle: {
          replaceEntryAsset: "html/old-bundle/index.html",
        },
      })
      expect(queuedCanvasReplace.request).toMatchObject({
        toolName: "replace_html_bundle",
        operation: {
          type: "update_item",
          id: "html-node-1",
          updates: {
            entryAsset: "html/marketing-card/index.html",
            title: "Marketing Card",
            background: "#ffffff",
          },
        },
      })

      await queuedCanvasReplace.respond({
        ok: true,
        updatedAt: "2026-04-19T18:00:01.000Z",
        state: {
          items: [],
          groups: [],
          nextZIndex: 1,
          selectedIds: [],
        },
      })

      const replacedHtmlBundle = await replacedHtmlBundlePromise
      expect(replacedHtmlBundle.result?.structuredContent?.targetItemId).toBe("html-node-1")
      expect(replacedHtmlBundle.result?.structuredContent?.htmlBundle?.entryAsset).toBe(
        "html/marketing-card/index.html"
      )
      expect(replacedHtmlBundle.result?.structuredContent?.result?.ok).toBe(true)

      const createGroupPromise = sendRpc({
        jsonrpc: "2.0",
        id: "5e-group-create",
        method: "tools/call",
        params: {
          name: "create_group",
          arguments: {
            itemIds: ["item-1", "item-2"],
            name: "Hero Cluster",
            select: true,
          },
        },
      }) as Promise<{ result?: { structuredContent?: Record<string, any> } }>

      const queuedCreateGroup = await waitForQueuedCanvasOperation(tempDir)
      expect(queuedCreateGroup.request).toMatchObject({
        toolName: "create_group",
        operation: {
          type: "create_group",
          itemIds: ["item-1", "item-2"],
          select: true,
          group: {
            name: "Hero Cluster",
          },
        },
      })
      const createdGroupId = queuedCreateGroup.request.operation.group.id
      await queuedCreateGroup.respond({
        ok: true,
        updatedAt: "2026-04-19T18:20:00.000Z",
        state: { items: [], groups: [], nextZIndex: 1, selectedIds: [] },
      })
      const createGroupResult = await createGroupPromise
      expect(createGroupResult.result?.structuredContent?.group?.id).toBe(createdGroupId)
      expect(createGroupResult.result?.structuredContent?.ok).toBe(true)

      const batchCreatePromise = sendRpc({
        jsonrpc: "2.0",
        id: "5e-items-create",
        method: "tools/call",
        params: {
          name: "create_items",
          arguments: {
            items: [
              {
                id: "batch-item-1",
                type: "markdown",
                title: "Brief",
                source: "# Brief",
                position: { x: 80, y: 420 },
                size: { width: 280, height: 180 },
                rotation: 0,
                zIndex: 3,
              },
              {
                id: "batch-item-2",
                type: "markdown",
                title: "Notes",
                source: "## Notes",
                position: { x: 400, y: 420 },
                size: { width: 280, height: 180 },
                rotation: 0,
                zIndex: 4,
              },
            ],
            select: true,
          },
        },
      }) as Promise<{ result?: { structuredContent?: Record<string, any> } }>

      const queuedBatchCreate = await waitForQueuedCanvasOperation(tempDir)
      expect(queuedBatchCreate.request).toMatchObject({
        toolName: "create_items",
        operation: {
          type: "create_items",
          select: true,
          items: [
            { id: "batch-item-1", type: "markdown", title: "Brief" },
            { id: "batch-item-2", type: "markdown", title: "Notes" },
          ],
        },
      })
      await queuedBatchCreate.respond({
        ok: true,
        updatedAt: "2026-04-19T18:20:00.500Z",
        state: { items: [], groups: [], nextZIndex: 1, selectedIds: ["batch-item-1", "batch-item-2"] },
      })
      const batchCreateResult = await batchCreatePromise
      expect(batchCreateResult.result?.structuredContent?.ok).toBe(true)

      // U7: create_native_component_shell is FILE-BACKED. It POSTs the shared
      // builder markup to /api/canvas/component/create FIRST, then enqueues the
      // canvas item bound to the written file path + slug (parity with the UI
      // U3 path so agent and UI shells cannot diverge).
      componentCreateRequestBody = null
      const nativeShellPromise = sendRpc({
        jsonrpc: "2.0",
        id: "5e-native-shell",
        method: "tools/call",
        params: {
          name: "create_native_component_shell",
          arguments: {
            template: "card",
            title: "Promo Card",
            projectId: "demo",
            artboardId: "artboard-1",
            select: true,
          },
        },
      }) as Promise<{ result?: { structuredContent?: Record<string, any> } }>

      const queuedNativeShell = await waitForQueuedCanvasOperation(tempDir)
      expect(queuedNativeShell.request).toMatchObject({
        toolName: "create_native_component_shell",
        operation: {
          type: "create_item",
          select: true,
          item: {
            type: "html",
            sourceMode: "inline",
            parentId: "artboard-1",
            // bound to the file written by /api/canvas/component/create
            sourcePath: "projects/demo/components/PromoCard.html",
            sourceHtmlFilePath: "projects/demo/components/PromoCard.html",
            sourceComponentSlug: "promo-card",
            sourceComponentFilePath: "projects/demo/components/PromoCard.html",
          },
        },
      })
      expect(queuedNativeShell.request.operation.item.sourceHtml).toContain('data-slot="media"')
      expect(queuedNativeShell.request.operation.item.sourceHtml).toContain(
        'data-slot-accepts="image,svg,video"'
      )
      await queuedNativeShell.respond({
        ok: true,
        updatedAt: "2026-04-19T18:20:00.750Z",
        state: { items: [], groups: [], nextZIndex: 1, selectedIds: ["html-shell-1"] },
      })
      const nativeShellResult = await nativeShellPromise
      expect(componentCreateRequestBody).toMatchObject({
        projectId: "demo",
        name: "Promo Card",
        format: "html",
        sourceHtml: expect.stringContaining('data-slot="media"'),
      })
      expect(nativeShellResult.result?.structuredContent?.result?.ok).toBe(true)
      expect(nativeShellResult.result?.structuredContent?.item?.type).toBe("html")
      expect(
        nativeShellResult.result?.structuredContent?.component?.primitive?.componentSlug
      ).toBe("promo-card")

      // MCP-app tools: register/list/invoke/log/disconnect all flow through
      // the same localhost-guarded proxy the UI uses.
      mcpAppConnectRequestBody = null
      const registerMcpAppPromise = sendRpc({
        jsonrpc: "2.0",
        id: "5e-register-mcp-app",
        method: "tools/call",
        params: {
          name: "register_mcp_app",
          arguments: {
            appName: "Docs MCP",
            transport: {
              kind: "http",
              url: "http://127.0.0.1:4010/mcp",
            },
            select: true,
          },
        },
      }) as Promise<{ result?: { structuredContent?: Record<string, any> } }>

      const queuedMcpCreate = await waitForQueuedCanvasOperation(tempDir)
      expect(queuedMcpCreate.request).toMatchObject({
        toolName: "register_mcp_app",
        operation: {
          type: "create_item",
          select: true,
          item: {
            type: "mcp-app",
            appName: "Docs MCP",
            transport: {
              kind: "http",
              url: "http://127.0.0.1:4010/mcp",
            },
            status: "disconnected",
          },
        },
      })
      const createdMcpAppId = queuedMcpCreate.request.operation.item.id
      await queuedMcpCreate.respond({
        ok: true,
        updatedAt: "2026-05-24T10:00:00.200Z",
        state: { items: [], groups: [], nextZIndex: 1, selectedIds: [createdMcpAppId] },
      })

      const queuedMcpStatus = await waitForQueuedCanvasOperation(tempDir)
      expect(queuedMcpStatus.request).toMatchObject({
        toolName: "register_mcp_app_connect",
        operation: {
          type: "update_item",
          id: createdMcpAppId,
          updates: {
            status: "connected",
            toolsCache: [{ name: "search_docs" }],
          },
        },
      })
      await queuedMcpStatus.respond({
        ok: true,
        updatedAt: "2026-05-24T10:00:00.300Z",
        state: { items: [], groups: [], nextZIndex: 1, selectedIds: [createdMcpAppId] },
      })

      const registerMcpAppResult = await registerMcpAppPromise
      expect(mcpAppConnectRequestBody).toMatchObject({
        projectId: "demo",
        nodeId: createdMcpAppId,
        appName: "Docs MCP",
        transport: {
          kind: "http",
          url: "http://127.0.0.1:4010/mcp",
        },
      })
      expect(registerMcpAppResult.result?.structuredContent?.item?.type).toBe("mcp-app")
      expect(registerMcpAppResult.result?.structuredContent?.connect?.status).toBe("connected")

      const listMcpAppToolsResult = (await sendRpc({
        jsonrpc: "2.0",
        id: "5e-list-mcp-app-tools",
        method: "tools/call",
        params: {
          name: "list_mcp_app_tools",
          arguments: {
            nodeId: "mcp-app-1",
          },
        },
      })) as { result?: { structuredContent?: Record<string, any> } }
      expect(listMcpAppToolsResult.result?.structuredContent?.status).toBe("connected")
      expect(listMcpAppToolsResult.result?.structuredContent?.tools?.[0]?.name).toBe("read_file")

      mcpAppInvokeToolRequestBody = null
      const invokeMcpAppToolPromise = sendRpc({
        jsonrpc: "2.0",
        id: "5e-invoke-mcp-app-tool",
        method: "tools/call",
        params: {
          name: "invoke_mcp_app_tool",
          arguments: {
            nodeId: "mcp-app-1",
            toolName: "read_file",
            args: {
              path: "/tmp/demo.txt",
              token: "secret-value",
            },
          },
        },
      }) as Promise<{ result?: { structuredContent?: Record<string, any> } }>

      const queuedMcpInvoke = await waitForQueuedCanvasOperation(tempDir)
      expect(queuedMcpInvoke.request).toMatchObject({
        toolName: "invoke_mcp_app_tool",
        operation: {
          type: "update_item",
          id: "mcp-app-1",
        },
      })
      await queuedMcpInvoke.respond({
        ok: true,
        updatedAt: "2026-05-24T10:05:00.300Z",
        state: { items: [], groups: [], nextZIndex: 1, selectedIds: ["mcp-app-1"] },
      })

      const invokeMcpAppToolResult = await invokeMcpAppToolPromise
      expect(mcpAppInvokeToolRequestBody).toMatchObject({
        projectId: "demo",
        nodeId: "mcp-app-1",
        toolName: "read_file",
        args: {
          path: "/tmp/demo.txt",
          token: "secret-value",
        },
        callerDepth: 0,
      })
      expect(invokeMcpAppToolResult.result?.structuredContent?.result?.content?.[0]?.text).toBe("done")
      expect(invokeMcpAppToolResult.result?.structuredContent?.recentCalls?.[0]?.args?.token).toBe(
        "[redacted]"
      )

      const getMcpAppLogResult = (await sendRpc({
        jsonrpc: "2.0",
        id: "5e-get-mcp-app-log",
        method: "tools/call",
        params: {
          name: "get_mcp_app_log",
          arguments: {
            nodeId: "mcp-app-1",
            limit: 1,
          },
        },
      })) as { result?: { structuredContent?: Record<string, any> } }
      expect(mcpAppLogRequestBody).toMatchObject({
        projectId: "demo",
        nodeId: "mcp-app-1",
        limit: 1,
      })
      expect(getMcpAppLogResult.result?.structuredContent?.recentCalls?.[0]?.toolName).toBe(
        "read_file"
      )

      mcpAppDisconnectRequestBody = null
      const disconnectMcpAppPromise = sendRpc({
        jsonrpc: "2.0",
        id: "5e-disconnect-mcp-app",
        method: "tools/call",
        params: {
          name: "disconnect_mcp_app",
          arguments: {
            nodeId: "mcp-app-1",
          },
        },
      }) as Promise<{ result?: { structuredContent?: Record<string, any> } }>

      const queuedMcpDisconnect = await waitForQueuedCanvasOperation(tempDir)
      expect(queuedMcpDisconnect.request).toMatchObject({
        toolName: "disconnect_mcp_app",
        operation: {
          type: "update_item",
          id: "mcp-app-1",
          updates: {
            status: "disconnected",
          },
        },
      })
      await queuedMcpDisconnect.respond({
        ok: true,
        updatedAt: "2026-05-24T10:06:00.300Z",
        state: { items: [], groups: [], nextZIndex: 1, selectedIds: ["mcp-app-1"] },
      })

      const disconnectMcpAppResult = await disconnectMcpAppPromise
      expect(mcpAppDisconnectRequestBody).toMatchObject({
        projectId: "demo",
        nodeId: "mcp-app-1",
      })
      expect(disconnectMcpAppResult.result?.structuredContent?.disconnect?.ok).toBe(true)

      // --- U7: sync_to_project allowlist + reuse of the U5 handler ---------
      // Temporarily rewrite the live state so a file-backed html component is
      // resolvable (matching the UI sync-selection shape), then restore it so
      // downstream assertions see the original state.
      const originalStateJson = await readFile(
        path.join(tempDir, "state.json"),
        "utf8"
      )
      await writeFile(
        path.join(tempDir, "state.json"),
        JSON.stringify(
          {
            state: {
              items: [
                {
                  id: "promo-card-item",
                  type: "html",
                  title: "Promo Card",
                  sourceMode: "inline",
                  sourceHtmlFilePath: "projects/demo/components/PromoCard.html",
                  sourceHtmlFileMtime: 789,
                  sourceComponentSlug: "promo-card",
                  sourceComponentFilePath: "projects/demo/components/PromoCard.html",
                  position: { x: 0, y: 0 },
                  size: { width: 320, height: 200 },
                  rotation: 0,
                  zIndex: 1,
                },
              ],
              groups: [],
              nextZIndex: 2,
              selectedIds: ["promo-card-item"],
            },
          },
          null,
          2
        )
      )

      // Error: target NOT in the user-confirmed allowlist → distinct
      // allowlist rejection (NOT a traversal/symlink rejection).
      const blockedSyncResult = (await sendRpc({
        jsonrpc: "2.0",
        id: "5e-sync-blocked",
        method: "tools/call",
        params: {
          name: "sync_to_project",
          arguments: {
            selection: "promo-card-item",
            target: "/tmp/some-other-root",
            projectId: "demo",
          },
        },
      })) as { result?: { isError?: boolean; content?: Array<{ text: string }> } }
      expect(blockedSyncResult.result?.isError).toBe(true)
      expect(blockedSyncResult.result?.content?.[0]?.text).toContain("not-allowlisted")

      // Happy: allowlisted target (here omitted → reuses the persisted
      // mapping) → reuses the U5 sync handler, same Root B output as the UI.
      projectSyncRequestBody = null
      const okSyncResult = (await sendRpc({
        jsonrpc: "2.0",
        id: "5e-sync-ok",
        method: "tools/call",
        params: {
          name: "sync_to_project",
          arguments: {
            selection: "promo-card-item",
            projectId: "demo",
          },
        },
      })) as { result?: { structuredContent?: Record<string, any> } }

      // Allowlist resolution reused the persisted mapping (target omitted).
      expect(syncTargetRequestBody).toMatchObject({ projectId: "demo", mode: "read" })
      // The U5 sync endpoint received the UI-shaped component selection.
      expect(projectSyncRequestBody).toMatchObject({
        target: "/tmp/allowlisted-root-b",
        componentsDir: "src/components",
        selection: {
          type: "component",
          slug: "promo-card",
          sourcePath: "projects/demo/components/PromoCard.html",
          mtimeMs: 789,
        },
      })
      expect(okSyncResult.result?.structuredContent?.ok).toBe(true)
      expect(okSyncResult.result?.structuredContent?.writtenPaths).toEqual([
        "promo-card.html",
        "promo-card.css",
        "manifest.json",
      ])
      expect(okSyncResult.result?.structuredContent?.reusedMapping).toBe(true)

      // Stale/invalid persisted mapping: the read endpoint realpath-
      // revalidates and returns `valid: false`. The agent has no folder
      // picker, so sync_to_project must REJECT (re-pick required) instead of
      // proceeding to publish into a moved/missing/symlink-swapped root.
      syncTargetValid = false
      projectSyncRequestBody = null
      const staleSyncResult = (await sendRpc({
        jsonrpc: "2.0",
        id: "5e-sync-stale",
        method: "tools/call",
        params: {
          name: "sync_to_project",
          arguments: {
            selection: "promo-card-item",
            projectId: "demo",
          },
        },
      })) as { result?: { isError?: boolean; content?: Array<{ text: string }> } }
      expect(staleSyncResult.result?.isError).toBe(true)
      expect(staleSyncResult.result?.content?.[0]?.text).toContain(
        "stale-sync-target"
      )
      // It bailed BEFORE hitting the sync endpoint.
      expect(projectSyncRequestBody).toBeNull()
      syncTargetValid = true

      // Restore the original live state for the downstream assertions.
      await writeFile(path.join(tempDir, "state.json"), originalStateJson)

      const updateGroupPromise = sendRpc({
        jsonrpc: "2.0",
        id: "5e-group-update",
        method: "tools/call",
        params: {
          name: "update_group",
          arguments: {
            id: createdGroupId,
            updates: {
              name: "Hero Cluster Updated",
              isLocked: true,
            },
          },
        },
      }) as Promise<{ result?: { structuredContent?: Record<string, any> } }>

      const queuedUpdateGroup = await waitForQueuedCanvasOperation(tempDir)
      expect(queuedUpdateGroup.request).toMatchObject({
        toolName: "update_group",
        operation: {
          type: "update_group",
          id: createdGroupId,
          updates: {
            name: "Hero Cluster Updated",
            isLocked: true,
          },
        },
      })
      await queuedUpdateGroup.respond({
        ok: true,
        updatedAt: "2026-04-19T18:20:01.000Z",
        state: { items: [], groups: [], nextZIndex: 1, selectedIds: [] },
      })
      const updateGroupResult = await updateGroupPromise
      expect(updateGroupResult.result?.structuredContent?.ok).toBe(true)

      const deleteGroupPromise = sendRpc({
        jsonrpc: "2.0",
        id: "5e-group-delete",
        method: "tools/call",
        params: {
          name: "delete_group",
          arguments: {
            id: createdGroupId,
          },
        },
      }) as Promise<{ result?: { structuredContent?: Record<string, any> } }>

      const queuedDeleteGroup = await waitForQueuedCanvasOperation(tempDir)
      expect(queuedDeleteGroup.request).toMatchObject({
        toolName: "delete_group",
        operation: {
          type: "delete_group",
          id: createdGroupId,
        },
      })
      await queuedDeleteGroup.respond({
        ok: true,
        updatedAt: "2026-04-19T18:20:02.000Z",
        state: { items: [], groups: [], nextZIndex: 1, selectedIds: [] },
      })
      const deleteGroupResult = await deleteGroupPromise
      expect(deleteGroupResult.result?.structuredContent?.ok).toBe(true)

      const setViewportPromise = sendRpc({
        jsonrpc: "2.0",
        id: "5e-viewport-set",
        method: "tools/call",
        params: {
          name: "set_canvas_viewport",
          arguments: {
            viewport: {
              scale: 1.25,
              offset: { x: -180, y: 96 },
            },
          },
        },
      }) as Promise<{ result?: { structuredContent?: Record<string, any> } }>

      const queuedSetViewport = await waitForQueuedCanvasOperation(tempDir)
      expect(queuedSetViewport.request).toMatchObject({
        toolName: "set_canvas_viewport",
        operation: {
          type: "set_viewport",
          viewport: {
            scale: 1.25,
            offset: { x: -180, y: 96 },
          },
        },
      })
      await queuedSetViewport.respond({
        ok: true,
        updatedAt: "2026-04-19T18:20:03.000Z",
        state: { items: [], groups: [], nextZIndex: 1, selectedIds: [] },
      })
      const setViewportResult = await setViewportPromise
      expect(setViewportResult.result?.structuredContent?.viewport).toMatchObject({
        scale: 1.25,
        offset: { x: -180, y: 96 },
      })

      const focusItemsPromise = sendRpc({
        jsonrpc: "2.0",
        id: "5e-focus-items",
        method: "tools/call",
        params: {
          name: "focus_canvas_items",
          arguments: {
            ids: ["item-1", "item-2"],
            padding: 88,
            select: true,
          },
        },
      }) as Promise<{ result?: { structuredContent?: Record<string, any> } }>

      const queuedFocusItems = await waitForQueuedCanvasOperation(tempDir)
      expect(queuedFocusItems.request).toMatchObject({
        toolName: "focus_canvas_items",
        operation: {
          type: "focus_items",
          ids: ["item-1", "item-2"],
          padding: 88,
          select: true,
        },
      })
      await queuedFocusItems.respond({
        ok: true,
        updatedAt: "2026-04-19T18:20:04.000Z",
        state: { items: [], groups: [], nextZIndex: 1, selectedIds: [] },
      })
      const focusItemsResult = await focusItemsPromise
      expect(focusItemsResult.result?.structuredContent?.ids).toEqual(["item-1", "item-2"])
      expect(focusItemsResult.result?.structuredContent?.padding).toBe(88)

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

      const focusedCanvasScreenshot = (await sendRpc({
        jsonrpc: "2.0",
        id: "7-canvas-focused",
        method: "tools/call",
        params: {
          name: "capture_canvas_items_screenshot",
          arguments: {
            ids: ["html-node-1"],
            padding: 88,
          },
        },
      })) as { result?: { structuredContent?: Record<string, any> } }

      expect(focusedCanvasScreenshot.result?.structuredContent?.mediaUrl).toBe(
        "/api/media/file/canvas-item.png"
      )
      expect(focusedCanvasScreenshot.result?.structuredContent?.cropRect).toEqual({
        x: 128,
        y: 96,
        width: 640,
        height: 512,
      })
      expect(canvasScreenshotRequestBody).toEqual(
        expect.objectContaining({
          projectId: "demo",
          target: "desktop",
          focusItemIds: ["html-node-1"],
          focusPadding: 88,
          snapshot: expect.objectContaining({
            items: expect.arrayContaining([
              expect.objectContaining({ id: "html-node-1" }),
            ]),
          }),
        })
      )

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

      const replaceHtmlPrompt = (await sendRpc({
        jsonrpc: "2.0",
        id: 16.5,
        method: "prompts/get",
        params: {
          name: "replace-html-bundle",
          arguments: {},
        },
      })) as { result?: { messages?: Array<{ content?: { text?: string } }> } }

      expect(replaceHtmlPrompt.result?.messages?.[0]?.content?.text).toContain("targetItemId")
      expect(replaceHtmlPrompt.result?.messages?.[0]?.content?.text).toContain(
        "capture_canvas_items_screenshot"
      )
      expect(
        promptsList.result?.prompts?.map((prompt) => prompt.name)
      ).toContain("canvas-layout-review")

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
