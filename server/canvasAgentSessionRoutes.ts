import { execFile } from "node:child_process"
import { promises as fs } from "node:fs"
import type { ServerResponse } from "node:http"
import path from "node:path"

import type { CanvasAgentProjectStore } from "./canvasAgentProjectStore"
import { readJson, sendJson, type RouteHandler } from "./projectCanvasRoutes"

export interface CanvasAgentSseClient {
  id: string
  res: ServerResponse
}

export function writeSseEvent(res: ServerResponse, eventName: string, payload: unknown) {
  res.write(`event: ${eventName}\n`)
  res.write(`data: ${JSON.stringify(payload)}\n\n`)
}

interface CanvasAgentSessionRouteOptions {
  toolCommand: string
  defaultTerminal: { cols: number; rows: number }
  /** Injected for tests; open-terminal is macOS-only. */
  platform?: NodeJS.Platform
  projectStore: CanvasAgentProjectStore
  getSessions: (projectId: string) => any[]
  findSession: (sessionId: string) => any | null
  createSession: (input: {
    projectId: string
    agentId: string
    cwd?: unknown
    title?: unknown
    launchProfile?: unknown
  }) => Promise<any>
  bootstrapSession: (input: {
    projectId: string
    agentId: string
    cwd?: unknown
    title?: unknown
    surfaceId?: unknown
    reuseSession: boolean
    launchProfile?: unknown
  }) => Promise<any>
  startSession: (sessionId: string, body: any) => Promise<any>
  stopSession: (sessionId: string) => any
  updateSession: (sessionId: string, updates: Record<string, unknown>) => any
  pushTranscript: (sessionId: string, kind: string, text: string) => unknown
  getTranscript: (sessionId: string) => any[]
  getSessionOutput: (sessionId: string) => string
  getSessionPty: (
    sessionId: string
  ) => { write(data: string): void; resize(cols: number, rows: number): void } | undefined
  ensureSessionDir: (sessionId: string) => Promise<string>
  broadcastEvent: (projectId: string, eventName: string, payload: unknown) => void
  getEventClients: (projectId: string) => Set<CanvasAgentSseClient>
  getWorkspaceDebug: (projectId: string, limit: number) => { events: any[] }
  getStateHistory: (projectId: string) => any[]
}

/**
 * The session half of `/api/canvas-agent/*`: session CRUD and lifecycle
 * actions, PTY input/resize, bootstrap, per-session output/debug, macOS
 * open-terminal, and the SSE event stream. The session manager, PTY
 * registry, transcripts, and broadcast fan-out stay owned by vite.config.ts
 * and are injected. Endpoint URLs and response shapes are frozen — moved
 * verbatim from vite.config.ts (FOX2-75 slice 5).
 */
export function createCanvasAgentSessionRoutes({
  toolCommand: defaultToolCommand,
  defaultTerminal,
  platform = process.platform,
  projectStore,
  getSessions,
  findSession,
  createSession,
  bootstrapSession,
  startSession,
  stopSession,
  updateSession,
  pushTranscript,
  getTranscript,
  getSessionOutput,
  getSessionPty,
  ensureSessionDir,
  broadcastEvent,
  getEventClients,
  getWorkspaceDebug,
  getStateHistory,
}: CanvasAgentSessionRouteOptions): RouteHandler {
  return async function handleCanvasAgentSessionRoutes(req, res, pathname) {
    if (req.method === "GET" && pathname === "/api/canvas-agent/sessions") {
      const requestUrl = new URL(req.url || "", "http://localhost")
      const projectId = requestUrl.searchParams.get("projectId")?.trim()
      if (!projectId) {
        sendJson(res, 400, { error: "projectId query param is required." })
        return true
      }

      sendJson(res, 200, {
        ok: true,
        sessions: getSessions(projectId),
      })
      return true
    }

    if (req.method === "POST" && pathname === "/api/canvas-agent/bootstrap") {
      try {
        const body = await readJson(req)
        const projectId = typeof body.projectId === "string" ? body.projectId.trim() : ""
        const agentId =
          typeof body.agentId === "string" && body.agentId.trim() ? body.agentId.trim() : "codex"

        if (!projectId) {
          sendJson(res, 400, { error: "projectId is required." })
          return true
        }

        const bootstrap = await bootstrapSession({
          projectId,
          agentId,
          cwd: body.cwd,
          title: body.title,
          surfaceId: body.surfaceId,
          reuseSession: body.reuseSession !== false,
          launchProfile: body.launchProfile,
        })

        sendJson(res, 200, { ok: true, bootstrap })
      } catch (error: any) {
        sendJson(res, 400, {
          error: error?.message || "Failed to bootstrap canvas agent session.",
        })
      }
      return true
    }

    if (req.method === "POST" && pathname === "/api/canvas-agent/sessions") {
      try {
        const body = await readJson(req)
        const projectId = typeof body.projectId === "string" ? body.projectId.trim() : ""
        const agentId = typeof body.agentId === "string" ? body.agentId.trim() : ""

        if (!projectId || !agentId) {
          sendJson(res, 400, { error: "projectId and agentId are required." })
          return true
        }

        const session = await createSession({
          projectId,
          agentId,
          cwd: body.cwd,
          title: body.title,
          launchProfile: body.launchProfile,
        })

        broadcastEvent(projectId, "session-created", { session })
        sendJson(res, 200, { ok: true, session })
      } catch (error: any) {
        sendJson(res, 400, {
          error: error?.message || "Failed to create canvas agent session.",
        })
      }
      return true
    }

    const sessionOutputMatch = pathname.match(/^\/api\/canvas-agent\/sessions\/([^/]+)\/output$/)
    if (req.method === "GET" && sessionOutputMatch) {
      const sessionId = decodeURIComponent(sessionOutputMatch[1])
      const session = findSession(sessionId)
      if (!session) {
        sendJson(res, 404, { error: "Canvas agent session not found." })
        return true
      }

      sendJson(res, 200, {
        ok: true,
        session,
        output: getSessionOutput(sessionId),
      })
      return true
    }

    const sessionOpenTerminalMatch = pathname.match(
      /^\/api\/canvas-agent\/sessions\/([^/]+)\/open-terminal$/
    )
    if (req.method === "POST" && sessionOpenTerminalMatch) {
      const sessionId = decodeURIComponent(sessionOpenTerminalMatch[1])
      const session = findSession(sessionId)
      if (!session) {
        sendJson(res, 404, { error: "Canvas agent session not found." })
        return true
      }
      if (platform !== "darwin") {
        sendJson(res, 400, {
          error: "Open in Terminal is only available on macOS. Copy the launch command instead.",
        })
        return true
      }
      const launchCommand =
        typeof session.launchCommand === "string" ? session.launchCommand.trim() : ""
      if (!launchCommand) {
        sendJson(res, 400, { error: "Session has no launch command." })
        return true
      }
      try {
        // The command comes from the server-side session record only — the
        // request carries just the session id, so this endpoint cannot run
        // arbitrary input. A .command file avoids AppleScript quoting of
        // the (heavily nested-quoted) launch command: `open` hands it to
        // Terminal, which executes it in a new window.
        const sessionDir = await ensureSessionDir(sessionId)
        const scriptPath = path.join(sessionDir, "open-terminal.command")
        await fs.writeFile(scriptPath, `#!/bin/zsh\n${launchCommand}\n`, { mode: 0o755 })
        await new Promise((resolve, reject) => {
          execFile("open", [scriptPath], (error) => (error ? reject(error) : resolve(undefined)))
        })
        sendJson(res, 200, { ok: true, sessionId })
      } catch (error: any) {
        sendJson(res, 500, {
          error: error?.message || "Failed to open Terminal for this session.",
        })
      }
      return true
    }

    const sessionDebugMatch = pathname.match(/^\/api\/canvas-agent\/sessions\/([^/]+)\/debug$/)
    if (req.method === "GET" && sessionDebugMatch) {
      const sessionId = decodeURIComponent(sessionDebugMatch[1])
      const session = findSession(sessionId)
      if (!session) {
        sendJson(res, 404, { error: "Canvas agent session not found." })
        return true
      }

      const stateRecord = projectStore.getState(session.projectId)
      const primitives = projectStore.getPrimitives(session.projectId)
      const workspaceDebug = getWorkspaceDebug(session.projectId, 80)
      const toolCommand = session.toolCommand || defaultToolCommand
      sendJson(res, 200, {
        ok: true,
        debug: {
          session,
          output: getSessionOutput(sessionId),
          transcript: getTranscript(sessionId),
          projectState: stateRecord?.state || null,
          primitives,
          stateHistory: getStateHistory(session.projectId),
          workspaceEvents: workspaceDebug.events,
          toolCommand,
          toolExamples: [
            `${toolCommand} attach --project ${session.projectId} --surface color-audit`,
            `${toolCommand} workspace-manifest`,
            `${toolCommand} surface-manifest color-audit`,
            `${toolCommand} color-audit-state`,
            `${toolCommand} color-audit-export`,
            `${toolCommand} system-canvas-state`,
            `${toolCommand} state`,
            `${toolCommand} context`,
            `${toolCommand} primitives`,
            `${toolCommand} create-item ./payload.json`,
            `${toolCommand} update-item item-id ./updates.json`,
            `${toolCommand} transcript`,
          ],
        },
      })
      return true
    }

    const sessionActionMatch = pathname.match(
      /^\/api\/canvas-agent\/sessions\/([^/]+)\/(start|stop|input|resize)$/
    )
    if (req.method === "POST" && sessionActionMatch) {
      try {
        const sessionId = decodeURIComponent(sessionActionMatch[1])
        const action = sessionActionMatch[2]
        const session = findSession(sessionId)
        if (!session) {
          sendJson(res, 404, { error: "Canvas agent session not found." })
          return true
        }

        const body = await readJson(req)

        if (action === "start") {
          try {
            const startedSession = await startSession(sessionId, body)
            sendJson(res, 200, {
              ok: true,
              session: startedSession,
            })
          } catch (error: any) {
            pushTranscript(
              sessionId,
              "session-error",
              error?.message || "Failed to start agent session."
            )
            const failedSession = updateSession(sessionId, {
              transport: "pty",
              status: "error",
              errorMessage: error?.message || "Failed to start agent session.",
              endedAt: new Date().toISOString(),
            })
            sendJson(res, 500, {
              error: error?.message || "Failed to start agent session.",
              session: failedSession,
            })
          }
          return true
        }

        if (action === "stop") {
          const stoppedSession = stopSession(sessionId)
          sendJson(res, 200, {
            ok: true,
            session: stoppedSession,
          })
          return true
        }

        const ptyProcess = getSessionPty(sessionId)
        if (!ptyProcess) {
          sendJson(res, 409, { error: "Canvas agent session is not running." })
          return true
        }

        if (action === "input") {
          const input = typeof body.input === "string" ? body.input : ""
          if (!input) {
            sendJson(res, 400, { error: "input is required." })
            return true
          }
          ptyProcess.write(input)
          sendJson(res, 200, { ok: true })
          return true
        }

        if (action === "resize") {
          const cols = Math.max(40, Number(body.cols || session.cols || defaultTerminal.cols))
          const rows = Math.max(10, Number(body.rows || session.rows || defaultTerminal.rows))
          ptyProcess.resize(cols, rows)
          const resizedSession = updateSession(sessionId, { cols, rows })
          sendJson(res, 200, {
            ok: true,
            session: resizedSession,
          })
          return true
        }
      } catch (error: any) {
        sendJson(res, 500, {
          error: error?.message || "Failed to update canvas agent session.",
        })
        return true
      }
    }

    if (req.method === "GET" && pathname === "/api/canvas-agent/events") {
      const requestUrl = new URL(req.url || "", "http://localhost")
      const projectId = requestUrl.searchParams.get("projectId")?.trim()
      const clientId =
        requestUrl.searchParams.get("clientId")?.trim() ||
        `canvas-agent-client-${Math.random().toString(36).slice(2, 8)}`

      if (!projectId) {
        sendJson(res, 400, { error: "projectId query param is required." })
        return true
      }

      res.statusCode = 200
      res.setHeader("Content-Type", "text/event-stream")
      res.setHeader("Cache-Control", "no-cache, no-transform")
      res.setHeader("Connection", "keep-alive")
      res.setHeader("X-Accel-Buffering", "no")
      res.flushHeaders?.()

      const client: CanvasAgentSseClient = {
        id: clientId,
        res,
      }
      const clients = getEventClients(projectId)
      clients.add(client)

      writeSseEvent(res, "hello", {
        clientId,
        projectId,
        connectedAt: new Date().toISOString(),
      })

      const pingTimer = setInterval(() => {
        writeSseEvent(res, "ping", { at: new Date().toISOString() })
      }, 15000)
      let cleanedUp = false

      const cleanup = () => {
        if (cleanedUp) return
        cleanedUp = true
        clearInterval(pingTimer)
        clients.delete(client)
        res.end()
      }

      req.on("close", cleanup)
      req.on("end", cleanup)
      return true
    }

    return false
  }
}
