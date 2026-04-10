import { spawn } from "node:child_process"
import { once } from "node:events"
import { mkdtemp, readFile, rm } from "node:fs/promises"
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
})
