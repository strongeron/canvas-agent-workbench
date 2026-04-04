import { describe, expect, it, vi } from "vitest"

import type { CanvasAgentSession } from "../types/canvas"
import { createAgentNativeRuntimeSessionManager } from "../utils/agentNativeRuntimeSessions"

describe("agent native runtime sessions", () => {
  function createHarness() {
    const sessionsByProject = new Map<string, CanvasAgentSession[]>([["demo", []]])
    const sessionPtysById = new Map<string, any>()
    const sessionOutputById = new Map<string, string>()
    const transcripts: Array<{ sessionId: string; kind: string; text: string }> = []

    const findSession = (sessionId: string) => {
      for (const sessions of sessionsByProject.values()) {
        const found = sessions.find((session) => session.id === sessionId)
        if (found) return found
      }
      return null
    }

    const manager = createAgentNativeRuntimeSessionManager({
      config: {
        toolCommand: "bin/canvas-agent",
        mcpServerName: "canvas",
        mcpServerEntry: "/tmp/bin/canvas-mcp-server",
        defaultTerminal: { cols: 96, rows: 28 },
        shell: "/bin/zsh",
        platform: "darwin",
        cwdFallback: "/tmp/gallery-poc",
        windowsShell: "cmd.exe",
      },
      getRuntimeAdapter: (runtimeId) =>
        runtimeId === "codex"
          ? ({
              id: "codex",
              label: "Codex CLI",
            } as any)
          : null,
      buildSessionDraft: (adapter, input) => ({
        projectId: input.projectId,
        agentId: adapter.id,
        agentLabel: adapter.label,
        title: input.title || "Codex session",
        cwd: input.cwd,
        agentCommand: "codex",
        launchCommand: `cd ${JSON.stringify(input.cwd)} && codex`,
        toolCommand: input.toolCommand,
        mcpServerName: input.mcpServerName,
        mcpServerCommand: `${process.execPath} ${input.mcpServerEntry}`,
        mcpConfigPath: null,
        startupGuidance: "test guidance",
        transport: "manual-cli",
        status: "configured",
        createdAt: input.now,
        updatedAt: input.now,
        cols: input.defaultTerminal.cols,
        rows: input.defaultTerminal.rows,
        pid: undefined,
        lastStartedAt: null,
        endedAt: null,
        exitCode: null,
        errorMessage: null,
      }),
      resolveRuntimeSpawn: () => ({
        shell: "/bin/zsh",
        args: ["-lic", "codex"],
        cwd: "/tmp/gallery-poc",
      }),
      createSessionId: () => "session-1",
      getSessions: (projectId) => {
        const existing = sessionsByProject.get(projectId)
        if (existing) return existing
        const next: CanvasAgentSession[] = []
        sessionsByProject.set(projectId, next)
        return next
      },
      findSession,
      updateSession: (sessionId, updates) => {
        const session = findSession(sessionId)
        if (!session) return null
        Object.assign(session, updates, { updatedAt: "2026-04-04T12:00:00.000Z" })
        return session
      },
      ensureSessionDir: async () => "/tmp/canvas-agent/session-1",
      getSessionDir: () => "/tmp/canvas-agent/session-1",
      prepareSessionLaunch: async () => ({
        agentCommand: "codex --ready",
        launchCommand: 'cd "/tmp/gallery-poc" && codex --ready',
        mcpServerName: "canvas",
        mcpServerCommand: `${process.execPath} /tmp/bin/canvas-mcp-server`,
        mcpConfigPath: null,
      }),
      syncSessionArtifacts: async () => {},
      buildBootstrapContext: (session, sessionDir, serverUrl) => ({
        projectId: session.projectId,
        sessionId: session.id,
        sessionDir,
        serverUrl,
      }),
      resolveServerUrl: () => "http://127.0.0.1:5178",
      buildAgentEnv: () => ({ PATH: process.env.PATH || "" }),
      pushTranscript: (sessionId, kind, text) => {
        transcripts.push({ sessionId, kind, text })
      },
      appendOutput: (session, chunk) => {
        sessionOutputById.set(
          session.id,
          `${sessionOutputById.get(session.id) || ""}${chunk}`
        )
      },
      createPty: () =>
        ({
          pid: 4321,
          kill: vi.fn(),
          onData: vi.fn(),
          onExit: vi.fn(),
        } as any),
      sessionPtysById,
      sessionOutputById,
    })

    return { manager, sessionsByProject, sessionPtysById, sessionOutputById, transcripts }
  }

  it("creates and bootstraps a session through the shared manager", async () => {
    const { manager, sessionsByProject, transcripts } = createHarness()

    const bootstrap = await manager.bootstrapSession({
      projectId: "demo",
      agentId: "codex",
      cwd: "/tmp/gallery-poc",
      surfaceId: "canvas",
    })

    expect(bootstrap.reused).toBe(false)
    expect(bootstrap.session.id).toBe("session-1")
    expect(bootstrap.context).toMatchObject({
      projectId: "demo",
      sessionId: "session-1",
      serverUrl: "http://127.0.0.1:5178",
    })
    expect(sessionsByProject.get("demo")).toHaveLength(1)
    expect(transcripts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sessionId: "session-1",
          kind: "session-created",
        }),
      ])
    )
  })

  it("starts and stops a pty-backed session through the shared manager", async () => {
    const { manager, sessionPtysById, sessionOutputById, transcripts } = createHarness()

    await manager.createSession({
      projectId: "demo",
      agentId: "codex",
      cwd: "/tmp/gallery-poc",
    })

    const started = await manager.startSession("session-1", { cols: 120, rows: 32 })
    expect(started?.status).toBe("running")
    expect(sessionPtysById.has("session-1")).toBe(true)
    expect(sessionOutputById.get("session-1")).toContain("[starting Codex CLI]")

    const stopped = manager.stopSession("session-1")
    expect(stopped?.status).toBe("stopped")
    expect(sessionPtysById.has("session-1")).toBe(false)
    expect(transcripts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "session-started" }),
        expect.objectContaining({ kind: "session-stopped" }),
      ])
    )
  })
})
