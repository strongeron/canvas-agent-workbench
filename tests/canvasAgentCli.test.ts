import { spawn } from "node:child_process"
import { once } from "node:events"
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises"
import { createServer } from "node:http"
import { tmpdir } from "node:os"
import path from "node:path"

import { afterEach, describe, expect, it } from "vitest"

const WORKSPACE_ROOT = "/Users/strongeron/Evil Martians/Open Source/gallery-poc"

function runCli(args: string[], env: Record<string, string> = {}) {
  return new Promise<{ stdout: string; stderr: string; exitCode: number | null }>((resolve) => {
    const child = spawn("node", ["bin/canvas-agent", ...args], {
      cwd: WORKSPACE_ROOT,
      env: {
        ...process.env,
        ...env,
      },
      stdio: ["ignore", "pipe", "pipe"],
    })

    let stdout = ""
    let stderr = ""
    child.stdout.setEncoding("utf8")
    child.stderr.setEncoding("utf8")
    child.stdout.on("data", (chunk) => {
      stdout += chunk
    })
    child.stderr.on("data", (chunk) => {
      stderr += chunk
    })

    child.on("exit", (exitCode) => {
      resolve({ stdout, stderr, exitCode })
    })
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
      let request
      try {
        request = JSON.parse(await readFile(requestPath, "utf8"))
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 10))
        continue
      }
      await rm(requestPath, { force: true })
      return {
        requestPath,
        resultPath,
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

describe("canvas-agent CLI bootstrap", () => {
  let tempDir = ""
  let server: ReturnType<typeof createServer> | null = null

  const listenOnRandomPort = async () => {
    server?.listen(0, "127.0.0.1")
    await once(server as ReturnType<typeof createServer>, "listening")
    const address = server?.address()
    if (!address || typeof address === "string") {
      throw new Error("CLI test server did not expose a TCP port.")
    }
    return address.port
  }

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

  it("attaches to a bootstrap session and persists local context", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "canvas-agent-cli-"))
    const contextFilePath = path.join(tempDir, "attached-session.json")
    let serverUrl = ""

    server = createServer((req, res) => {
      if (req.method === "POST" && req.url === "/api/canvas-agent/bootstrap") {
        res.statusCode = 200
        res.setHeader("content-type", "application/json")
        res.end(
          JSON.stringify({
            ok: true,
            bootstrap: {
              reused: false,
              surfaceId: "color-audit",
              session: {
                id: "canvas-agent-session-boot",
                projectId: "demo",
                agentId: "codex",
                agentLabel: "Codex",
              },
              context: {
                serverUrl,
                projectId: "demo",
                sessionId: "canvas-agent-session-boot",
                sessionDir: "/tmp/canvas-agent/session-boot",
                canvasWorkspaceKey: "gallery-demo:canvas",
                colorAuditWorkspaceKey: "gallery-demo:color-audit",
                systemCanvasWorkspaceKey: "gallery-demo:system-canvas",
                nodeCatalogWorkspaceKey: "gallery-demo-node-catalog",
              },
            },
          })
        )
        return
      }

      res.statusCode = 404
      res.end()
    })

    const port = await listenOnRandomPort()
    serverUrl = `http://127.0.0.1:${port}`

    const attachResult = await runCli(
      ["attach", "--project", "demo", "--surface", "color-audit", "--server", serverUrl, "--json"],
      {
        CANVAS_AGENT_CONTEXT_FILE: contextFilePath,
      }
    )

    expect(attachResult.exitCode).toBe(0)
    expect(attachResult.stderr).toBe("")
    const attachPayload = JSON.parse(attachResult.stdout)
    expect(attachPayload.session.id).toBe("canvas-agent-session-boot")
    expect(attachPayload.context.projectId).toBe("demo")
    expect(attachPayload.contextFilePath).toBe(contextFilePath)

    const storedContext = JSON.parse(await readFile(contextFilePath, "utf8"))
    expect(storedContext.sessionId).toBe("canvas-agent-session-boot")
    expect(storedContext.colorAuditWorkspaceKey).toBe("gallery-demo:color-audit")

    const detachResult = await runCli(["detach"], {
      CANVAS_AGENT_CONTEXT_FILE: contextFilePath,
    })

    expect(detachResult.exitCode).toBe(0)
    const detachPayload = JSON.parse(detachResult.stdout)
    expect(detachPayload.detached).toBe(true)
    await expect(readFile(contextFilePath, "utf8")).rejects.toMatchObject({ code: "ENOENT" })
  })

  it("reads canvas theme snapshots from the attached session context", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "canvas-agent-cli-themes-"))
    const contextFilePath = path.join(tempDir, "attached-session.json")
    const sessionDir = path.join(tempDir, "session")

    await mkdir(sessionDir, { recursive: true })
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
    await writeFile(
      contextFilePath,
      JSON.stringify(
        {
          serverUrl: "http://127.0.0.1:5178",
          projectId: "demo",
          sessionId: "canvas-agent-session-theme",
          sessionDir,
          canvasWorkspaceKey: "gallery-demo:canvas",
          colorAuditWorkspaceKey: "gallery-demo:color-audit",
          systemCanvasWorkspaceKey: "gallery-demo:system-canvas",
          nodeCatalogWorkspaceKey: "gallery-demo-node-catalog",
        },
        null,
        2
      )
    )

    const result = await runCli(["themes"], {
      CANVAS_AGENT_CONTEXT_FILE: contextFilePath,
    })

    expect(result.exitCode).toBe(0)
    expect(JSON.parse(result.stdout)).toEqual({
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
  })

  it("uses attached context to queue System Canvas operations without manual env setup", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "canvas-agent-cli-system-"))
    const contextFilePath = path.join(tempDir, "attached-session.json")
    let serverUrl = ""

    server = createServer((req, res) => {
      if (req.method === "POST" && req.url === "/api/canvas-agent/bootstrap") {
        res.statusCode = 200
        res.setHeader("content-type", "application/json")
        res.end(
          JSON.stringify({
            ok: true,
            bootstrap: {
              reused: false,
              surfaceId: "system-canvas",
              session: {
                id: "canvas-agent-session-system",
                projectId: "demo",
                agentId: "codex",
                agentLabel: "Codex",
              },
              context: {
                serverUrl,
                projectId: "demo",
                sessionId: "canvas-agent-session-system",
                sessionDir: "/tmp/canvas-agent/session-system",
                canvasWorkspaceKey: "gallery-demo:canvas",
                colorAuditWorkspaceKey: "gallery-demo:color-audit",
                systemCanvasWorkspaceKey: "gallery-demo:system-canvas",
                nodeCatalogWorkspaceKey: "gallery-demo-node-catalog",
              },
            },
          })
        )
        return
      }

      if (req.method === "POST" && req.url === "/api/agent-native/workspaces/system-canvas/operations") {
        res.statusCode = 200
        res.setHeader("content-type", "application/json")
        res.end(
          JSON.stringify({
            ok: true,
            operationId: "system-canvas-operation-1",
            cursor: 2,
          })
        )
        return
      }

      res.statusCode = 404
      res.end()
    })

    const port = await listenOnRandomPort()
    serverUrl = `http://127.0.0.1:${port}`

    const attachResult = await runCli(
      ["attach", "--project", "demo", "--surface", "system-canvas", "--server", serverUrl, "--json"],
      {
        CANVAS_AGENT_CONTEXT_FILE: contextFilePath,
      }
    )

    expect(attachResult.exitCode).toBe(0)

    const commandResult = await runCli(["generate-scale-graph"], {
      CANVAS_AGENT_CONTEXT_FILE: contextFilePath,
    })

    expect(commandResult.exitCode).toBe(0)
    expect(commandResult.stderr).toBe("")
    expect(JSON.parse(commandResult.stdout)).toMatchObject({
      ok: true,
      operationId: "system-canvas-operation-1",
      cursor: 2,
    })
  })

  it("reads workspace events through the attached session context", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "canvas-agent-cli-events-"))
    const contextFilePath = path.join(tempDir, "attached-session.json")
    let serverUrl = ""

    server = createServer((req, res) => {
      if (req.method === "POST" && req.url === "/api/canvas-agent/bootstrap") {
        res.statusCode = 200
        res.setHeader("content-type", "application/json")
        res.end(
          JSON.stringify({
            ok: true,
            bootstrap: {
              reused: false,
              surfaceId: "system-canvas",
              session: {
                id: "canvas-agent-session-events",
                projectId: "demo",
                agentId: "codex",
                agentLabel: "Codex",
              },
              context: {
                serverUrl,
                projectId: "demo",
                sessionId: "canvas-agent-session-events",
                sessionDir: "/tmp/canvas-agent/session-events",
                canvasWorkspaceKey: "gallery-demo:canvas",
                colorAuditWorkspaceKey: "gallery-demo:color-audit",
                systemCanvasWorkspaceKey: "gallery-demo:system-canvas",
                nodeCatalogWorkspaceKey: "gallery-demo-node-catalog",
              },
            },
          })
        )
        return
      }

      if (
        req.method === "GET" &&
        req.url ===
          "/api/agent-native/workspaces/system-canvas/events?workspaceKey=gallery-demo%3Asystem-canvas&limit=10"
      ) {
        res.statusCode = 200
        res.setHeader("content-type", "application/json")
        res.end(
          JSON.stringify({
            ok: true,
            workspaceId: "system-canvas",
            workspaceKey: "gallery-demo:system-canvas",
            cursor: 4,
            events: [
              {
                id: "event-1",
                workspaceId: "system-canvas",
                workspaceKey: "gallery-demo:system-canvas",
                kind: "operation-applied",
                actor: "agent",
                source: "canvas-agent-cli",
                createdAt: "2026-04-03T10:00:00.000Z",
              },
            ],
          })
        )
        return
      }

      res.statusCode = 404
      res.end()
    })

    const port = await listenOnRandomPort()
    serverUrl = `http://127.0.0.1:${port}`

    const attachResult = await runCli(
      ["attach", "--project", "demo", "--surface", "system-canvas", "--server", serverUrl, "--json"],
      {
        CANVAS_AGENT_CONTEXT_FILE: contextFilePath,
      }
    )

    expect(attachResult.exitCode).toBe(0)

    const commandResult = await runCli(["workspace-events", "system-canvas", "10"], {
      CANVAS_AGENT_CONTEXT_FILE: contextFilePath,
    })

    expect(commandResult.exitCode).toBe(0)
    expect(commandResult.stderr).toBe("")
    expect(JSON.parse(commandResult.stdout)).toEqual({
      events: [
        {
          id: "event-1",
          workspaceId: "system-canvas",
          workspaceKey: "gallery-demo:system-canvas",
          kind: "operation-applied",
          actor: "agent",
          source: "canvas-agent-cli",
          createdAt: "2026-04-03T10:00:00.000Z",
        },
      ],
      cursor: 4,
    })
  })

  it("lists stored canvas files through the attached session context", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "canvas-agent-cli-files-"))
    const contextFilePath = path.join(tempDir, "attached-session.json")
    let serverUrl = ""

    server = createServer((req, res) => {
      if (req.method === "POST" && req.url === "/api/canvas-agent/bootstrap") {
        res.statusCode = 200
        res.setHeader("content-type", "application/json")
        res.end(
          JSON.stringify({
            ok: true,
            bootstrap: {
              reused: false,
              surfaceId: "canvas",
              session: {
                id: "canvas-agent-session-files",
                projectId: "demo",
                agentId: "codex",
                agentLabel: "Codex",
              },
              context: {
                serverUrl,
                projectId: "demo",
                sessionId: "canvas-agent-session-files",
                sessionDir: "/tmp/canvas-agent/session-files",
                canvasWorkspaceKey: "gallery-demo:canvas",
                colorAuditWorkspaceKey: "gallery-demo:color-audit",
                systemCanvasWorkspaceKey: "gallery-demo:system-canvas",
                nodeCatalogWorkspaceKey: "gallery-demo-node-catalog",
              },
            },
          })
        )
        return
      }

      if (req.method === "GET" && req.url === "/api/projects/demo/canvases?surface=canvas") {
        res.statusCode = 200
        res.setHeader("content-type", "application/json")
        res.end(
          JSON.stringify({
            ok: true,
            files: [{ path: "boards/demo.canvas", title: "Demo", surface: "canvas" }],
          })
        )
        return
      }

      res.statusCode = 404
      res.end()
    })

    const port = await listenOnRandomPort()
    serverUrl = `http://127.0.0.1:${port}`

    const attachResult = await runCli(
      ["attach", "--project", "demo", "--surface", "canvas", "--server", serverUrl, "--json"],
      {
        CANVAS_AGENT_CONTEXT_FILE: contextFilePath,
      }
    )

    expect(attachResult.exitCode).toBe(0)

    const listResult = await runCli(["canvas-files", "canvas"], {
      CANVAS_AGENT_CONTEXT_FILE: contextFilePath,
    })

    expect(listResult.exitCode).toBe(0)
    expect(JSON.parse(listResult.stdout)).toEqual([
      { path: "boards/demo.canvas", title: "Demo", surface: "canvas" },
    ])
  })

  it("scans local HTML bundle libraries through the attached session context", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "canvas-agent-cli-html-scan-"))
    const contextFilePath = path.join(tempDir, "attached-session.json")
    let serverUrl = ""

    server = createServer((req, res) => {
      if (req.method === "POST" && req.url === "/api/canvas-agent/bootstrap") {
        res.statusCode = 200
        res.setHeader("content-type", "application/json")
        res.end(
          JSON.stringify({
            ok: true,
            bootstrap: {
              reused: false,
              surfaceId: "canvas",
              session: {
                id: "canvas-agent-session-html-scan",
                projectId: "demo",
                agentId: "codex",
                agentLabel: "Codex",
              },
              context: {
                serverUrl,
                projectId: "demo",
                sessionId: "canvas-agent-session-html-scan",
                sessionDir: "/tmp/canvas-agent/session-html-scan",
                canvasWorkspaceKey: "gallery-demo:canvas",
                colorAuditWorkspaceKey: "gallery-demo:color-audit",
                systemCanvasWorkspaceKey: "gallery-demo:system-canvas",
                nodeCatalogWorkspaceKey: "gallery-demo-node-catalog",
              },
            },
          })
        )
        return
      }

      if (
        req.method === "GET" &&
        req.url ===
          "/api/projects/demo/canvases/html-bundles?rootPath=%2FUsers%2Fstrongeron%2FEvil+Martians%2FClaude+Code%2Fplayground"
      ) {
        res.statusCode = 200
        res.setHeader("content-type", "application/json")
        res.end(
          JSON.stringify({
            ok: true,
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
          })
        )
        return
      }

      res.statusCode = 404
      res.end()
    })

    const port = await listenOnRandomPort()
    serverUrl = `http://127.0.0.1:${port}`

    const attachResult = await runCli(
      ["attach", "--project", "demo", "--surface", "canvas", "--server", serverUrl, "--json"],
      {
        CANVAS_AGENT_CONTEXT_FILE: contextFilePath,
      }
    )

    expect(attachResult.exitCode).toBe(0)

    const scanResult = await runCli(
      ["scan-html-bundles", "/Users/strongeron/Evil Martians/Claude Code/playground"],
      {
        CANVAS_AGENT_CONTEXT_FILE: contextFilePath,
      }
    )

    expect(scanResult.exitCode).toBe(0)
    expect(scanResult.stderr).toBe("")
    expect(JSON.parse(scanResult.stdout)).toEqual({
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
  })

  it("moves, duplicates, and deletes stored canvas files through the attached session context", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "canvas-agent-cli-file-ops-"))
    const contextFilePath = path.join(tempDir, "attached-session.json")
    let serverUrl = ""

    server = createServer((req, res) => {
      if (req.method === "POST" && req.url === "/api/canvas-agent/bootstrap") {
        res.statusCode = 200
        res.setHeader("content-type", "application/json")
        res.end(
          JSON.stringify({
            ok: true,
            bootstrap: {
              reused: false,
              surfaceId: "canvas",
              session: {
                id: "canvas-agent-session-file-ops",
                projectId: "demo",
                agentId: "codex",
                agentLabel: "Codex",
              },
              context: {
                serverUrl,
                projectId: "demo",
                sessionId: "canvas-agent-session-file-ops",
                sessionDir: "/tmp/canvas-agent/session-file-ops",
                canvasWorkspaceKey: "gallery-demo:canvas",
                colorAuditWorkspaceKey: "gallery-demo:color-audit",
                systemCanvasWorkspaceKey: "gallery-demo:system-canvas",
                nodeCatalogWorkspaceKey: "gallery-demo-node-catalog",
              },
            },
          })
        )
        return
      }

      if (req.method === "POST" && req.url === "/api/projects/demo/canvases/move") {
        res.statusCode = 200
        res.setHeader("content-type", "application/json")
        res.end(
          JSON.stringify({
            ok: true,
            file: {
              path: "boards/demo-renamed.canvas",
              document: { meta: { title: "Demo Renamed" } },
            },
          })
        )
        return
      }

      if (req.method === "POST" && req.url === "/api/projects/demo/canvases/duplicate") {
        res.statusCode = 200
        res.setHeader("content-type", "application/json")
        res.end(
          JSON.stringify({
            ok: true,
            file: {
              path: "archive/demo-copy.canvas",
              document: { meta: { title: "Demo Copy" } },
            },
          })
        )
        return
      }

      if (req.method === "POST" && req.url === "/api/projects/demo/canvases/delete") {
        res.statusCode = 200
        res.setHeader("content-type", "application/json")
        res.end(
          JSON.stringify({
            ok: true,
            path: "archive/demo-copy.canvas",
          })
        )
        return
      }

      res.statusCode = 404
      res.end()
    })

    const port = await listenOnRandomPort()
    serverUrl = `http://127.0.0.1:${port}`

    const attachResult = await runCli(
      ["attach", "--project", "demo", "--surface", "canvas", "--server", serverUrl, "--json"],
      {
        CANVAS_AGENT_CONTEXT_FILE: contextFilePath,
      }
    )

    expect(attachResult.exitCode).toBe(0)

    const moveResult = await runCli(
      ["move-canvas-file", "boards/demo.canvas", '{"title":"Demo Renamed"}'],
      {
        CANVAS_AGENT_CONTEXT_FILE: contextFilePath,
      }
    )
    expect(moveResult.exitCode).toBe(0)
    expect(JSON.parse(moveResult.stdout)).toEqual({
      path: "boards/demo-renamed.canvas",
      document: { meta: { title: "Demo Renamed" } },
    })

    const duplicateResult = await runCli(
      ["duplicate-canvas-file", "boards/demo-renamed.canvas", '{"title":"Demo Copy","folder":"archive"}'],
      {
        CANVAS_AGENT_CONTEXT_FILE: contextFilePath,
      }
    )
    expect(duplicateResult.exitCode).toBe(0)
    expect(JSON.parse(duplicateResult.stdout)).toEqual({
      path: "archive/demo-copy.canvas",
      document: { meta: { title: "Demo Copy" } },
    })

    const deleteResult = await runCli(["delete-canvas-file", "archive/demo-copy.canvas"], {
      CANVAS_AGENT_CONTEXT_FILE: contextFilePath,
    })
    expect(deleteResult.exitCode).toBe(0)
    expect(JSON.parse(deleteResult.stdout)).toEqual({
      ok: true,
      path: "archive/demo-copy.canvas",
    })
  })

  it("replaces an existing html node atomically through the attached session context", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "canvas-agent-cli-html-replace-"))
    const contextFilePath = path.join(tempDir, "attached-session.json")
    await Promise.all([
      mkdir(path.join(tempDir, "queue"), { recursive: true }),
      mkdir(path.join(tempDir, "results"), { recursive: true }),
    ])
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
                position: { x: 100, y: 80 },
                size: { width: 480, height: 320 },
                rotation: 0,
                zIndex: 1,
              },
            ],
            groups: [],
            nextZIndex: 2,
            selectedIds: [],
          },
        },
        null,
        2
      )
    )
    let serverUrl = ""
    let importedBundleRequestBody: Record<string, any> | null = null

    server = createServer((req, res) => {
      if (req.method === "POST" && req.url === "/api/canvas-agent/bootstrap") {
        res.statusCode = 200
        res.setHeader("content-type", "application/json")
        res.end(
          JSON.stringify({
            ok: true,
            bootstrap: {
              reused: false,
              surfaceId: "canvas",
              session: {
                id: "canvas-agent-session-html-replace",
                projectId: "demo",
                agentId: "codex",
                agentLabel: "Codex",
              },
              context: {
                serverUrl,
                projectId: "demo",
                sessionId: "canvas-agent-session-html-replace",
                sessionDir: tempDir,
                canvasWorkspaceKey: "gallery-demo:canvas",
                colorAuditWorkspaceKey: "gallery-demo:color-audit",
                systemCanvasWorkspaceKey: "gallery-demo:system-canvas",
                nodeCatalogWorkspaceKey: "gallery-demo-node-catalog",
              },
            },
          })
        )
        return
      }

      if (req.method === "POST" && req.url === "/api/projects/demo/canvases/html-bundle/import") {
        const chunks: Buffer[] = []
        req.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        })
        req.on("end", () => {
          importedBundleRequestBody = JSON.parse(Buffer.concat(chunks).toString("utf8"))
          res.statusCode = 200
          res.setHeader("content-type", "application/json")
          res.end(
            JSON.stringify({
              ok: true,
              htmlBundle: {
                assetRoot: "html/replaced-card",
                entryAsset: "html/replaced-card/index.html",
                entryUrl:
                  "/api/projects/demo/canvases/assets/file?path=boards%2Fdemo.canvas&asset=html%2Freplaced-card%2Findex.html",
                assetCount: 2,
                importedAt: "2026-04-19T18:00:00.000Z",
              },
            })
          )
        })
        return
      }

      res.statusCode = 404
      res.end()
    })

    const port = await listenOnRandomPort()
    serverUrl = `http://127.0.0.1:${port}`

    const attachResult = await runCli(
      ["attach", "--project", "demo", "--surface", "canvas", "--server", serverUrl, "--json"],
      {
        CANVAS_AGENT_CONTEXT_FILE: contextFilePath,
      }
    )
    expect(attachResult.exitCode).toBe(0)

    const commandPromise = runCli(
      [
        "import-html-bundle",
        "boards/demo.canvas",
        JSON.stringify({
          targetItemId: "html-node-1",
          bundle: {
            title: "Career Launchpad",
            files: [
              {
                relativePath: "index.html",
                textContent: "<!doctype html><html><body><h1>Updated</h1></body></html>",
              },
              {
                relativePath: "styles.css",
                textContent: "body { color: #111; }",
              },
            ],
          },
          item: {
            title: "Career Launchpad",
            background: "#ffffff",
          },
        }),
      ],
      {
        CANVAS_AGENT_CONTEXT_FILE: contextFilePath,
      }
    )

    const queued = await waitForQueuedCanvasOperation(tempDir)
    expect(importedBundleRequestBody).toMatchObject({
      path: "boards/demo.canvas",
      bundle: {
        replaceEntryAsset: "html/old-bundle/index.html",
      },
    })
    expect(queued.request).toMatchObject({
      toolName: "replace_html_bundle",
      operation: {
        type: "update_item",
        id: "html-node-1",
        updates: {
          src: "/api/projects/demo/canvases/assets/file?path=boards%2Fdemo.canvas&asset=html%2Freplaced-card%2Findex.html",
          entryAsset: "html/replaced-card/index.html",
          title: "Career Launchpad",
          background: "#ffffff",
        },
      },
    })

    await queued.respond({
      ok: true,
      updatedAt: "2026-04-19T18:00:01.000Z",
      state: {
        items: [],
        groups: [],
        nextZIndex: 1,
        selectedIds: [],
      },
    })

    const commandResult = await commandPromise
    expect(commandResult.exitCode).toBe(0)
    expect(commandResult.stderr).toBe("")
    expect(JSON.parse(commandResult.stdout)).toMatchObject({
      ok: true,
      targetItemId: "html-node-1",
      htmlBundle: {
        entryAsset: "html/replaced-card/index.html",
        assetCount: 2,
      },
      result: {
        ok: true,
      },
    })
  })

  it(
    "queues canvas group create, update, and delete operations through the attached session context",
    async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "canvas-agent-cli-group-ops-"))
    await Promise.all([
      mkdir(path.join(tempDir, "queue"), { recursive: true }),
      mkdir(path.join(tempDir, "results"), { recursive: true }),
    ])
    await writeFile(
      path.join(tempDir, "state.json"),
      JSON.stringify(
        {
          state: {
            items: [
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
            ],
            groups: [],
            nextZIndex: 3,
            selectedIds: [],
          },
        },
        null,
        2
      )
    )

    const cliEnv = {
      CANVAS_AGENT_SESSION_DIR: tempDir,
      CANVAS_AGENT_PROJECT_ID: "demo",
      CANVAS_AGENT_SESSION_ID: "canvas-agent-session-groups",
      CANVAS_AGENT_SERVER_URL: "http://127.0.0.1:5173",
    }

    const createPromise = runCli(
      [
        "create-group",
        JSON.stringify({
          itemIds: ["item-1", "item-2"],
          name: "Hero Cluster",
          select: true,
        }),
      ],
      cliEnv
    )
    const queuedCreate = await waitForQueuedCanvasOperation(tempDir)
    expect(queuedCreate.request).toMatchObject({
      toolName: "create-group",
      operation: {
        type: "create_group",
        itemIds: ["item-1", "item-2"],
        select: true,
        group: {
          name: "Hero Cluster",
        },
      },
    })
    const createdGroupId = queuedCreate.request.operation.group.id
    await queuedCreate.respond({ ok: true, updatedAt: "2026-04-19T18:10:00.000Z" })
    const createResult = await createPromise
    expect(createResult.exitCode).toBe(0)
    expect(createResult.stderr).toBe("")

    const updatePromise = runCli(
      ["update-group", createdGroupId, '{"name":"Hero Cluster Updated","isLocked":true}'],
      cliEnv
    )
    const queuedUpdate = await waitForQueuedCanvasOperation(tempDir)
    expect(queuedUpdate.request).toMatchObject({
      toolName: "update-group",
      operation: {
        type: "update_group",
        id: createdGroupId,
        updates: {
          name: "Hero Cluster Updated",
          isLocked: true,
        },
      },
    })
    await queuedUpdate.respond({ ok: true, updatedAt: "2026-04-19T18:10:01.000Z" })
    const updateResult = await updatePromise
    expect(updateResult.exitCode).toBe(0)
    expect(updateResult.stderr).toBe("")

    const deletePromise = runCli(["delete-group", createdGroupId], cliEnv)
    const queuedDelete = await waitForQueuedCanvasOperation(tempDir)
    expect(queuedDelete.request).toMatchObject({
      toolName: "delete-group",
      operation: {
        type: "delete_group",
        id: createdGroupId,
      },
    })
    await queuedDelete.respond({ ok: true, updatedAt: "2026-04-19T18:10:02.000Z" })
    const deleteResult = await deletePromise
    expect(deleteResult.exitCode).toBe(0)
    expect(deleteResult.stderr).toBe("")

    const setViewportPromise = runCli(
      [
        "set-canvas-viewport",
        JSON.stringify({
          viewport: {
            scale: 1.5,
            offset: { x: -240, y: 120 },
          },
        }),
      ],
      cliEnv
    )
    const queuedSetViewport = await waitForQueuedCanvasOperation(tempDir)
    expect(queuedSetViewport.request).toMatchObject({
      toolName: "set-canvas-viewport",
      operation: {
        type: "set_viewport",
        viewport: {
          scale: 1.5,
          offset: { x: -240, y: 120 },
        },
      },
    })
    await queuedSetViewport.respond({ ok: true, updatedAt: "2026-04-19T18:10:03.000Z" })
    const setViewportResult = await setViewportPromise
    expect(setViewportResult.exitCode).toBe(0)
    expect(setViewportResult.stderr).toBe("")

    const focusItemsPromise = runCli(
      [
        "focus-canvas-items",
        JSON.stringify({
          ids: ["item-1", "item-2"],
          padding: 96,
          select: true,
        }),
      ],
      cliEnv
    )
    const queuedFocusItems = await waitForQueuedCanvasOperation(tempDir)
    expect(queuedFocusItems.request).toMatchObject({
      toolName: "focus-canvas-items",
      operation: {
        type: "focus_items",
        ids: ["item-1", "item-2"],
        padding: 96,
        select: true,
      },
    })
    await queuedFocusItems.respond({ ok: true, updatedAt: "2026-04-19T18:10:04.000Z" })
    const focusItemsResult = await focusItemsPromise
    expect(focusItemsResult.exitCode).toBe(0)
    expect(focusItemsResult.stderr).toBe("")
    },
    15000
  )

  it("queues canvas batch create operations through the attached session context", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "canvas-agent-cli-batch-create-"))
    await Promise.all([
      mkdir(path.join(tempDir, "queue"), { recursive: true }),
      mkdir(path.join(tempDir, "results"), { recursive: true }),
    ])
    await writeFile(
      path.join(tempDir, "state.json"),
      JSON.stringify(
        {
          state: {
            items: [],
            groups: [],
            nextZIndex: 1,
            selectedIds: [],
          },
        },
        null,
        2
      )
    )

    const cliEnv = {
      CANVAS_AGENT_SESSION_DIR: tempDir,
      CANVAS_AGENT_PROJECT_ID: "demo",
      CANVAS_AGENT_SESSION_ID: "canvas-agent-session-batch-create",
      CANVAS_AGENT_SERVER_URL: "http://127.0.0.1:5173",
    }

    const commandPromise = runCli(
      [
        "create-items",
        JSON.stringify({
          items: [
            {
              id: "item-a",
              type: "markdown",
              title: "Brief",
              source: "# Brief",
              position: { x: 120, y: 80 },
              size: { width: 320, height: 220 },
              rotation: 0,
              zIndex: 1,
            },
            {
              id: "item-b",
              type: "markdown",
              title: "Notes",
              source: "## Notes",
              position: { x: 480, y: 80 },
              size: { width: 320, height: 220 },
              rotation: 0,
              zIndex: 2,
            },
          ],
          select: true,
        }),
      ],
      cliEnv
    )

    const queuedCreate = await waitForQueuedCanvasOperation(tempDir)
    expect(queuedCreate.request).toMatchObject({
      toolName: "create-items",
      operation: {
        type: "create_items",
        select: true,
        items: [
          { id: "item-a", type: "markdown", title: "Brief" },
          { id: "item-b", type: "markdown", title: "Notes" },
        ],
      },
    })
    await queuedCreate.respond({
      ok: true,
      updatedAt: "2026-04-20T10:00:00.000Z",
      state: {
        items: [],
        groups: [],
        nextZIndex: 3,
        selectedIds: ["item-a", "item-b"],
      },
    })

    const result = await commandPromise
    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe("")
    expect(JSON.parse(result.stdout)).toMatchObject({ ok: true })
  })

  it("reads workspace debug through the attached session context", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "canvas-agent-cli-debug-"))
    const contextFilePath = path.join(tempDir, "attached-session.json")

    server = createServer((req, res) => {
      if (req.method === "POST" && req.url === "/api/canvas-agent/bootstrap") {
        res.statusCode = 200
        res.setHeader("content-type", "application/json")
        res.end(
          JSON.stringify({
            ok: true,
            bootstrap: {
              reused: false,
              surfaceId: "canvas",
              session: {
                id: "canvas-agent-session-debug",
                projectId: "demo",
                agentId: "codex",
                agentLabel: "Codex",
              },
              context: {
                serverUrl: "http://127.0.0.1:5194",
                projectId: "demo",
                sessionId: "canvas-agent-session-debug",
                sessionDir: "/tmp/canvas-agent/session-debug",
                canvasWorkspaceKey: "gallery-demo:canvas",
                colorAuditWorkspaceKey: "gallery-demo:color-audit",
                systemCanvasWorkspaceKey: "gallery-demo:system-canvas",
                nodeCatalogWorkspaceKey: "gallery-demo-node-catalog",
              },
            },
          })
        )
        return
      }

      if (
        req.method === "GET" &&
        req.url ===
          "/api/agent-native/workspaces/canvas/debug?workspaceKey=gallery-demo%3Acanvas&limit=12"
      ) {
        res.statusCode = 200
        res.setHeader("content-type", "application/json")
        res.end(
          JSON.stringify({
            ok: true,
            workspaceId: "canvas",
            workspaceKey: "gallery-demo:canvas",
            debug: {
              workspaceId: "canvas",
              workspaceKey: "gallery-demo:canvas",
              cursor: 9,
              appliedCursor: 7,
              pendingOperationCount: 1,
              events: [
                {
                  id: "canvas-event-7",
                  workspaceId: "canvas",
                  workspaceKey: "gallery-demo:canvas",
                  kind: "state-synced",
                  actor: "agent",
                  source: "workspace-sync",
                  createdAt: "2026-04-04T09:10:00.000Z",
                },
              ],
            },
          })
        )
        return
      }

      res.statusCode = 404
      res.end()
    })

    server.listen(5194, "127.0.0.1")
    await once(server, "listening")

    const attachResult = await runCli(
      ["attach", "--project", "demo", "--surface", "canvas", "--server", "http://127.0.0.1:5194", "--json"],
      {
        CANVAS_AGENT_CONTEXT_FILE: contextFilePath,
      }
    )

    expect(attachResult.exitCode).toBe(0)

    const commandResult = await runCli(["workspace-debug", "canvas", "12"], {
      CANVAS_AGENT_CONTEXT_FILE: contextFilePath,
    })

    expect(commandResult.exitCode).toBe(0)
    expect(commandResult.stderr).toBe("")
    expect(JSON.parse(commandResult.stdout)).toEqual({
      workspaceId: "canvas",
      workspaceKey: "gallery-demo:canvas",
      cursor: 9,
      appliedCursor: 7,
      pendingOperationCount: 1,
      events: [
        {
          id: "canvas-event-7",
          workspaceId: "canvas",
          workspaceKey: "gallery-demo:canvas",
          kind: "state-synced",
          actor: "agent",
          source: "workspace-sync",
          createdAt: "2026-04-04T09:10:00.000Z",
        },
      ],
    })
  })

  it("queues deep System Canvas graph mutations through the attached session context", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "canvas-agent-cli-system-mutate-"))
    const contextFilePath = path.join(tempDir, "attached-session.json")

    server = createServer((req, res) => {
      if (req.method === "POST" && req.url === "/api/canvas-agent/bootstrap") {
        res.statusCode = 200
        res.setHeader("content-type", "application/json")
        res.end(
          JSON.stringify({
            ok: true,
            bootstrap: {
              reused: false,
              surfaceId: "system-canvas",
              session: {
                id: "canvas-agent-session-system-mutate",
                projectId: "demo",
                agentId: "codex",
                agentLabel: "Codex",
              },
              context: {
                serverUrl: "http://127.0.0.1:5191",
                projectId: "demo",
                sessionId: "canvas-agent-session-system-mutate",
                sessionDir: "/tmp/canvas-agent/session-system-mutate",
                canvasWorkspaceKey: "gallery-demo:canvas",
                colorAuditWorkspaceKey: "gallery-demo:color-audit",
                systemCanvasWorkspaceKey: "gallery-demo:system-canvas",
                nodeCatalogWorkspaceKey: "gallery-demo-node-catalog",
              },
            },
          })
        )
        return
      }

      if (req.method === "POST" && req.url === "/api/agent-native/workspaces/system-canvas/operations") {
        res.statusCode = 200
        res.setHeader("content-type", "application/json")
        res.end(
          JSON.stringify({
            ok: true,
            operationId: "system-canvas-operation-node-1",
            cursor: 5,
          })
        )
        return
      }

      res.statusCode = 404
      res.end()
    })

    server.listen(5191, "127.0.0.1")
    await once(server, "listening")

    const attachResult = await runCli(
      ["attach", "--project", "demo", "--surface", "system-canvas", "--server", "http://127.0.0.1:5191", "--json"],
      {
        CANVAS_AGENT_CONTEXT_FILE: contextFilePath,
      }
    )

    expect(attachResult.exitCode).toBe(0)

    const commandResult = await runCli(
      [
        "create-system-node",
        '{"node":{"id":"system-node-1","type":"semantic","label":"Agent Support","role":"surface","group":"system-support","position":{"x":120,"y":80}}}',
      ],
      {
        CANVAS_AGENT_CONTEXT_FILE: contextFilePath,
      }
    )

    expect(commandResult.exitCode).toBe(0)
    expect(commandResult.stderr).toBe("")
    expect(JSON.parse(commandResult.stdout)).toMatchObject({
      ok: true,
      operationId: "system-canvas-operation-node-1",
      cursor: 5,
    })
  })

  it("imports a local HTML bundle into a stored canvas file through the attached session context", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "canvas-agent-cli-html-bundle-"))
    const contextFilePath = path.join(tempDir, "attached-session.json")
    let serverUrl = ""

    server = createServer((req, res) => {
      if (req.method === "POST" && req.url === "/api/canvas-agent/bootstrap") {
        res.statusCode = 200
        res.setHeader("content-type", "application/json")
        res.end(
          JSON.stringify({
            ok: true,
            bootstrap: {
              reused: false,
              surfaceId: "canvas",
              session: {
                id: "canvas-agent-session-html-bundle",
                projectId: "demo",
                agentId: "codex",
                agentLabel: "Codex",
              },
              context: {
                serverUrl,
                projectId: "demo",
                sessionId: "canvas-agent-session-html-bundle",
                sessionDir: "/tmp/canvas-agent/session-html-bundle",
                canvasWorkspaceKey: "gallery-demo:canvas",
                colorAuditWorkspaceKey: "gallery-demo:color-audit",
                systemCanvasWorkspaceKey: "gallery-demo:system-canvas",
                nodeCatalogWorkspaceKey: "gallery-demo-node-catalog",
              },
            },
          })
        )
        return
      }

      if (req.method === "POST" && req.url === "/api/projects/demo/canvases/html-bundle/import") {
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
        return
      }

      res.statusCode = 404
      res.end()
    })

    const port = await listenOnRandomPort()
    serverUrl = `http://127.0.0.1:${port}`

    const attachResult = await runCli(
      ["attach", "--project", "demo", "--surface", "canvas", "--server", serverUrl, "--json"],
      {
        CANVAS_AGENT_CONTEXT_FILE: contextFilePath,
      }
    )

    expect(attachResult.exitCode).toBe(0)

    const importResult = await runCli(
      [
        "import-html-bundle",
        "boards/demo.canvas",
        JSON.stringify({
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
        }),
      ],
      {
        CANVAS_AGENT_CONTEXT_FILE: contextFilePath,
      }
    )

    expect(importResult.exitCode).toBe(0)
    expect(importResult.stderr).toBe("")
    expect(JSON.parse(importResult.stdout)).toEqual({
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
  })

  it("captures a focused canvas screenshot through the attached session context", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "canvas-agent-cli-canvas-screenshot-"))
    await writeFile(
      path.join(tempDir, "state.json"),
      JSON.stringify(
        {
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
        },
        null,
        2
      )
    )

    let screenshotRequestBody: Record<string, any> | null = null
    server = createServer(async (req, res) => {
      if (req.method === "POST" && req.url === "/api/agent-native/workspaces/canvas/screenshot") {
        const chunks: Buffer[] = []
        for await (const chunk of req) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        }
        screenshotRequestBody = JSON.parse(Buffer.concat(chunks).toString("utf8"))
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
        return
      }

      res.statusCode = 404
      res.end()
    })

    const port = await listenOnRandomPort()
    const cliEnv = {
      CANVAS_AGENT_SESSION_DIR: tempDir,
      CANVAS_AGENT_PROJECT_ID: "demo",
      CANVAS_AGENT_SESSION_ID: "canvas-agent-session-screenshot",
      CANVAS_AGENT_SERVER_URL: `http://127.0.0.1:${port}`,
      CANVAS_AGENT_CANVAS_WORKSPACE_KEY: "gallery-demo:canvas",
    }

    const commandResult = await runCli(["screenshot-canvas-items", "item-1", "desktop", "88"], cliEnv)

    expect(commandResult.exitCode).toBe(0)
    expect(commandResult.stderr).toBe("")
    expect(JSON.parse(commandResult.stdout)).toMatchObject({
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
    expect(screenshotRequestBody).toMatchObject({
      projectId: "demo",
      target: "desktop",
      focusItemIds: ["item-1"],
      focusPadding: 88,
      snapshot: {
        surface: "canvas",
        state: {
          items: [{ id: "item-1" }],
        },
      },
    })
  })
})
