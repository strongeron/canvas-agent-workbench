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
                serverUrl: "http://127.0.0.1:5188",
                projectId: "demo",
                sessionId: "canvas-agent-session-boot",
                sessionDir: "/tmp/canvas-agent/session-boot",
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

    server.listen(5188, "127.0.0.1")
    await once(server, "listening")

    const attachResult = await runCli(
      ["attach", "--project", "demo", "--surface", "color-audit", "--server", "http://127.0.0.1:5188", "--json"],
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
                serverUrl: "http://127.0.0.1:5189",
                projectId: "demo",
                sessionId: "canvas-agent-session-system",
                sessionDir: "/tmp/canvas-agent/session-system",
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

    server.listen(5189, "127.0.0.1")
    await once(server, "listening")

    const attachResult = await runCli(
      ["attach", "--project", "demo", "--surface", "system-canvas", "--server", "http://127.0.0.1:5189", "--json"],
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
})
