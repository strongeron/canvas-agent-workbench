import path from "path"
import type { IPty } from "node-pty"

import type { CanvasAgentSession, CanvasAgentTranscriptEntry } from "../types/canvas"
import type {
  AgentNativeRuntimeAdapter,
  AgentNativeRuntimeSessionDraftInput,
} from "./agentNativeRuntimeAdapters"

type TranscriptKind = CanvasAgentTranscriptEntry["kind"]

interface SessionLaunchUpdates {
  agentCommand: string
  launchCommand: string
  mcpServerName: string | null
  mcpServerCommand: string | null
  mcpConfigPath: string | null
}

export interface CreateAgentNativeRuntimeSessionManagerOptions {
  config: {
    toolCommand: string
    mcpServerName: string
    mcpServerEntry: string
    defaultTerminal: {
      cols: number
      rows: number
    }
    shell: string
    platform: NodeJS.Platform
    cwdFallback: string
    windowsShell?: string
  }
  getRuntimeAdapter(runtimeId: string): AgentNativeRuntimeAdapter | null
  buildSessionDraft(
    adapter: AgentNativeRuntimeAdapter,
    input: AgentNativeRuntimeSessionDraftInput
  ): Omit<CanvasAgentSession, "id">
  resolveRuntimeSpawn(
    adapter: AgentNativeRuntimeAdapter,
    session: Pick<CanvasAgentSession, "cwd" | "agentCommand">,
    options: {
      shell: string
      platform: NodeJS.Platform
      cwdFallback: string
      windowsShell?: string
    }
  ): {
    shell: string
    args: string[]
    cwd: string
  }
  createSessionId(): string
  getSessions(projectId: string): CanvasAgentSession[]
  findSession(sessionId: string): CanvasAgentSession | null
  updateSession(
    sessionId: string,
    updates: Partial<CanvasAgentSession>
  ): CanvasAgentSession | null
  ensureSessionDir(sessionId: string): Promise<string>
  getSessionDir(sessionId: string): string
  prepareSessionLaunch(session: CanvasAgentSession): Promise<SessionLaunchUpdates>
  syncSessionArtifacts(sessionId: string): Promise<void>
  buildBootstrapContext(
    session: CanvasAgentSession,
    sessionDir: string,
    serverUrl: string
  ): Record<string, unknown>
  resolveServerUrl(): string
  buildAgentEnv(cwd: string, shell: string): Record<string, string>
  pushTranscript(
    sessionId: string,
    kind: TranscriptKind,
    text: string,
    meta?: Record<string, string | number | boolean | null> | undefined
  ): unknown
  appendOutput(session: CanvasAgentSession, chunk: string): void
  createPty(
    shell: string,
    args: string[],
    options: {
      name: string
      cols: number
      rows: number
      cwd: string
      env: Record<string, string>
    }
  ): IPty
  sessionPtysById: Map<string, IPty>
  sessionOutputById: Map<string, string>
}

export function createAgentNativeRuntimeSessionManager(
  options: CreateAgentNativeRuntimeSessionManagerOptions
) {
  const createSession = async (input: {
    projectId: string
    agentId: string
    cwd?: string
    title?: string
  }) => {
    const runtimeAdapter = options.getRuntimeAdapter(input.agentId)
    if (!runtimeAdapter) {
      throw new Error(`Unknown agent: ${input.agentId}`)
    }

    const now = new Date().toISOString()
    const safeCwd =
      typeof input.cwd === "string" && input.cwd.trim()
        ? path.resolve(input.cwd.trim())
        : options.config.cwdFallback

    const session: CanvasAgentSession = {
      id: options.createSessionId(),
      ...options.buildSessionDraft(runtimeAdapter, {
        projectId: input.projectId,
        cwd: safeCwd,
        title: input.title,
        now,
        toolCommand: options.config.toolCommand,
        mcpServerName: options.config.mcpServerName,
        mcpServerEntry: options.config.mcpServerEntry,
        defaultTerminal: options.config.defaultTerminal,
      }),
    }

    options.getSessions(input.projectId).unshift(session)
    const launchUpdates = await options.prepareSessionLaunch(session)
    Object.assign(session, launchUpdates)
    options.pushTranscript(session.id, "session-created", `Created ${runtimeAdapter.label} session.`, {
      agentId: runtimeAdapter.id,
    })
    return session
  }

  const findReusableSessionForBootstrap = (input: {
    projectId: string
    agentId: string
    cwd?: string
  }) => {
    const safeCwd =
      typeof input.cwd === "string" && input.cwd.trim() ? path.resolve(input.cwd.trim()) : null
    const sessions = options.getSessions(input.projectId)
    return (
      sessions.find((session) => {
        if (session.agentId !== input.agentId) return false
        if (safeCwd && session.cwd !== safeCwd) return false
        return true
      }) || null
    )
  }

  const bootstrapSession = async (input: {
    projectId: string
    agentId: string
    cwd?: string
    title?: string
    surfaceId?: string | null
    reuseSession?: boolean
  }) => {
    let session =
      input.reuseSession === false
        ? null
        : findReusableSessionForBootstrap({
            projectId: input.projectId,
            agentId: input.agentId,
            cwd: input.cwd,
          })
    const reused = Boolean(session)

    if (!session) {
      session = await createSession(input)
    }

    const sessionDir = await options.ensureSessionDir(session.id)
    const launchUpdates = await options.prepareSessionLaunch(session)
    const preparedSession = options.updateSession(session.id, launchUpdates) || {
      ...session,
      ...launchUpdates,
    }
    await options.syncSessionArtifacts(preparedSession.id)

    return {
      reused,
      surfaceId:
        typeof input.surfaceId === "string" && input.surfaceId.trim() ? input.surfaceId.trim() : null,
      session: preparedSession,
      context: options.buildBootstrapContext(
        preparedSession,
        sessionDir,
        options.resolveServerUrl()
      ),
    }
  }

  const stopSession = (sessionId: string, reason: "stopped" | "error" = "stopped") => {
    const ptyProcess = options.sessionPtysById.get(sessionId)
    const session = options.findSession(sessionId)

    if (ptyProcess) {
      try {
        ptyProcess.kill()
      } catch (error) {
        console.warn(`[canvas agent] Failed to kill session ${sessionId}:`, error)
      }
      options.sessionPtysById.delete(sessionId)
    }

    const nextSession = options.updateSession(sessionId, {
      transport: "pty",
      status: reason === "error" ? "error" : "stopped",
      endedAt: new Date().toISOString(),
    })

    if (session) {
      options.pushTranscript(
        sessionId,
        reason === "error" ? "session-error" : "session-stopped",
        reason === "error" ? "Session stopped with an error." : "Session stopped by request.",
        { status: nextSession?.status || session.status }
      )
    }

    return nextSession
  }

  const startSession = async (
    sessionId: string,
    dimensions?: { cols?: number; rows?: number } | null
  ) => {
    const session = options.findSession(sessionId)
    if (!session) {
      throw new Error("Canvas agent session not found.")
    }
    if (options.sessionPtysById.has(sessionId)) {
      return session
    }

    const runtimeAdapter = options.getRuntimeAdapter(session.agentId)
    if (!runtimeAdapter) {
      throw new Error(`Unknown agent: ${session.agentId}`)
    }

    const cols = Math.max(
      40,
      Number(dimensions?.cols || session.cols || options.config.defaultTerminal.cols)
    )
    const rows = Math.max(
      10,
      Number(dimensions?.rows || session.rows || options.config.defaultTerminal.rows)
    )

    const launchUpdates = await options.prepareSessionLaunch(session)
    const preparedSession = options.updateSession(sessionId, launchUpdates) || {
      ...session,
      ...launchUpdates,
    }

    const spawnConfig = options.resolveRuntimeSpawn(runtimeAdapter, preparedSession, {
      shell: options.config.shell,
      platform: options.config.platform,
      cwdFallback: options.config.cwdFallback,
      windowsShell: options.config.windowsShell,
    })
    const sessionEnv = options.buildAgentEnv(spawnConfig.cwd, spawnConfig.shell)
    sessionEnv.CANVAS_AGENT_PROJECT_ID = preparedSession.projectId
    sessionEnv.CANVAS_AGENT_SERVER_URL = options.resolveServerUrl()
    sessionEnv.CANVAS_AGENT_SESSION_ID = preparedSession.id
    sessionEnv.CANVAS_AGENT_SESSION_DIR = options.getSessionDir(preparedSession.id)
    sessionEnv.CANVAS_AGENT_TOOL_COMMAND = preparedSession.toolCommand || options.config.toolCommand

    const ptyProcess = options.createPty(spawnConfig.shell, spawnConfig.args, {
      name: "xterm-256color",
      cols,
      rows,
      cwd: spawnConfig.cwd,
      env: sessionEnv,
    })

    options.sessionPtysById.set(sessionId, ptyProcess)
    options.sessionOutputById.set(sessionId, "")

    const runningSession = options.updateSession(sessionId, {
      transport: "pty",
      status: "running",
      pid: ptyProcess.pid,
      cols,
      rows,
      lastStartedAt: new Date().toISOString(),
      endedAt: null,
      exitCode: null,
      errorMessage: null,
    })

    options.pushTranscript(
      sessionId,
      "session-started",
      `Started ${runtimeAdapter.label} session at ${cols}x${rows}.`,
      { cols, rows, pid: ptyProcess.pid }
    )

    ptyProcess.onData((data) => {
      options.appendOutput((runningSession || session) as CanvasAgentSession, data)
    })

    ptyProcess.onExit(({ exitCode, signal }) => {
      options.sessionPtysById.delete(sessionId)
      options.updateSession(sessionId, {
        status: "exited",
        endedAt: new Date().toISOString(),
        exitCode: Number.isFinite(exitCode) ? exitCode : null,
        pid: undefined,
      })
      options.pushTranscript(
        sessionId,
        "session-exited",
        `Session exited${Number.isFinite(exitCode) ? ` with code ${exitCode}` : ""}${signal ? ` (${signal})` : ""}.`,
        {
          exitCode: Number.isFinite(exitCode) ? exitCode : null,
          signal: signal || null,
        }
      )
      const message = `\r\n[session exited${Number.isFinite(exitCode) ? `: ${exitCode}` : ""}${signal ? `, signal ${signal}` : ""}]\r\n`
      options.appendOutput((runningSession || session) as CanvasAgentSession, message)
    })

    options.appendOutput((runningSession || session) as CanvasAgentSession, `[starting ${runtimeAdapter.label}]\r\n`)
    options.appendOutput(
      (runningSession || session) as CanvasAgentSession,
      `[canvas tool] ${session.toolCommand || options.config.toolCommand} help\r\n`
    )

    return runningSession || session
  }

  return {
    createSession,
    bootstrapSession,
    startSession,
    stopSession,
  }
}
