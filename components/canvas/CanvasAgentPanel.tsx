import { Bot, Copy, Play, RefreshCw, Square, TerminalSquare } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { CopilotChat } from "@copilotkit/react-ui"

import type { UseCanvasAgentBridgeResult } from "../../hooks/useCanvasAgentBridge"
import type { CanvasAgentLaunchProfile } from "../../types/canvas"
import { AGENT_NATIVE_WORKSPACE_DEFINITIONS } from "../../utils/agentNativeManifest"
import { CanvasAgentTerminal } from "./CanvasAgentTerminal"

interface CanvasAgentPanelProps {
  projectId?: string
  instructions: string
  bridge: UseCanvasAgentBridgeResult
}

function formatTimestamp(value: string | null) {
  if (!value) return "Never"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Never"
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function formatLaunchProfile(profile: CanvasAgentLaunchProfile | undefined) {
  return profile === "full" ? "Full env" : "Lean"
}

function buildTranscriptText(
  entries: NonNullable<UseCanvasAgentBridgeResult["debugBySession"][string]>["transcript"]
) {
  return entries
    .map((entry) => `[${entry.at}] ${entry.kind}: ${entry.text}`)
    .join("\n")
}

export function CanvasAgentPanel({
  projectId,
  instructions,
  bridge,
}: CanvasAgentPanelProps) {
  const [tab, setTab] = useState<"copilot" | "cli">("copilot")
  const [pendingAgentId, setPendingAgentId] = useState<string | null>(null)
  const [pendingSessionActionId, setPendingSessionActionId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  // Last dimensions the fitted xterm reported. The PTY must start at these,
  // not the stored 96x28 default, or the TUI hard-wraps mid-word at a width
  // wider than the visible terminal (FOX2-53).
  const terminalSizeRef = useRef<{ cols: number; rows: number } | null>(null)
  const activeSessionSectionRef = useRef<HTMLDivElement>(null)

  const sessionCountLabel = useMemo(
    () => `${bridge.sessions.length} session${bridge.sessions.length === 1 ? "" : "s"}`,
    [bridge.sessions.length]
  )

  const activeSession =
    bridge.sessions.find((session) => session.id === activeSessionId) ?? bridge.sessions[0] ?? null
  const activeOutput = activeSession ? bridge.outputBySession[activeSession.id] ?? "" : ""
  const activeDebug = activeSession ? bridge.debugBySession[activeSession.id] ?? null : null

  useEffect(() => {
    if (bridge.sessions.length === 0) {
      setActiveSessionId(null)
      return
    }
    if (!activeSessionId || !bridge.sessions.some((session) => session.id === activeSessionId)) {
      setActiveSessionId(bridge.sessions[0].id)
    }
  }, [activeSessionId, bridge.sessions])

  useEffect(() => {
    if (!activeSession) return
    if (Object.prototype.hasOwnProperty.call(bridge.outputBySession, activeSession.id)) return
    void bridge.loadSessionOutput(activeSession.id).catch(() => {
      // Surface session/action failures through the panel status instead.
    })
  }, [activeSession, bridge])

  useEffect(() => {
    if (!activeSession) return
    if (Object.prototype.hasOwnProperty.call(bridge.debugBySession, activeSession.id)) return
    void bridge.loadSessionDebug(activeSession.id).catch(() => {
      // Surface session/action failures through the panel status instead.
    })
  }, [activeSession, bridge])

  const handleCreateSession = async (agentId: string, launchProfile: CanvasAgentLaunchProfile) => {
    setPendingAgentId(`${agentId}:${launchProfile}`)
    setActionError(null)
    try {
      const session = await bridge.createSession(agentId, { launchProfile })
      if (session) {
        setActiveSessionId(session.id)
        // A configured-but-idle session is invisible feedback — start it right
        // away and bring the Active Session block (and its terminal) into view
        // so the click has a visible result.
        activeSessionSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
        await bridge.startSession(session.id, {
          cols: terminalSizeRef.current?.cols ?? session.cols ?? 96,
          rows: terminalSizeRef.current?.rows ?? session.rows ?? 28,
        })
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to create session.")
    } finally {
      setPendingAgentId(null)
    }
  }

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setActionError(null)
    } catch {
      setActionError("Clipboard is not available in this browser.")
    }
  }

  const handleRefresh = async () => {
    setActionError(null)
    try {
      await bridge.refreshSessions()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to refresh sessions.")
    }
  }

  const handleStartSession = async () => {
    if (!activeSession) return
    setPendingSessionActionId(activeSession.id)
    setActionError(null)
    try {
      await bridge.startSession(activeSession.id, {
        cols: terminalSizeRef.current?.cols ?? activeSession.cols ?? 96,
        rows: terminalSizeRef.current?.rows ?? activeSession.rows ?? 28,
      })
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to start session.")
    } finally {
      setPendingSessionActionId(null)
    }
  }

  const handleStopSession = async () => {
    if (!activeSession) return
    setPendingSessionActionId(activeSession.id)
    setActionError(null)
    try {
      await bridge.stopSession(activeSession.id)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to stop session.")
    } finally {
      setPendingSessionActionId(null)
    }
  }

  const handleTerminalInput = async (input: string) => {
    if (!activeSession || activeSession.status !== "running") return
    try {
      await bridge.writeSessionInput(activeSession.id, input)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to write to session.")
    }
  }

  const handleTerminalResize = async (size: { cols: number; rows: number }) => {
    terminalSizeRef.current = size
    if (!activeSession || activeSession.status !== "running") return
    try {
      await bridge.resizeSession(activeSession.id, size)
    } catch {
      // Ignore transient resize failures during panel mount/unmount.
    }
  }

  const handleOpenInTerminal = async (sessionId: string) => {
    setActionError(null)
    try {
      // The external launch reuses the same session dir and MCP config — stop
      // the in-panel PTY first so two agent processes never share a session.
      const session = bridge.sessions.find((item) => item.id === sessionId)
      if (session?.status === "running") {
        await bridge.stopSession(sessionId)
      }
      const response = await fetch(
        `/api/canvas-agent/sessions/${encodeURIComponent(sessionId)}/open-terminal`,
        { method: "POST" }
      )
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to open Terminal.")
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to open Terminal.")
    }
  }

  const handleCreateExternalSession = async (
    agentId: string,
    launchProfile: CanvasAgentLaunchProfile
  ) => {
    setPendingAgentId(`${agentId}:${launchProfile}:external`)
    setActionError(null)
    try {
      const session = await bridge.createSession(agentId, { launchProfile })
      if (session) {
        setActiveSessionId(session.id)
        await handleOpenInTerminal(session.id)
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to open Terminal.")
    } finally {
      setPendingAgentId(null)
    }
  }

  const handleCopyTranscript = async () => {
    if (!activeDebug) return
    await handleCopy(buildTranscriptText(activeDebug.transcript))
  }

  const handleCopyDebug = async () => {
    if (!activeDebug) return
    await handleCopy(JSON.stringify(activeDebug, null, 2))
  }

  return (
    <div className="flex h-full w-[480px] shrink-0 flex-col border-l border-default bg-white" data-canvas-ignore="true">
      <div className="border-b border-default px-4 py-3">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-foreground">Canvas Agents</div>
            <div className="text-xs text-muted-foreground">
              {projectId ? `Project: ${projectId}` : "Select a project to enable agent sync"}
            </div>
          </div>
          <div className="rounded-full bg-surface-100 px-2 py-1 text-[11px] font-medium text-muted-foreground">
            {sessionCountLabel}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-lg bg-surface-100 p-1">
          <button
            type="button"
            onClick={() => setTab("copilot")}
            className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
              tab === "copilot"
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Bot className="h-4 w-4" />
            Copilot
          </button>
          <button
            type="button"
            onClick={() => setTab("cli")}
            className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
              tab === "cli"
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <TerminalSquare className="h-4 w-4" />
            CLI
          </button>
        </div>
      </div>

      {tab === "copilot" ? (
        <CopilotChat
          instructions={instructions}
          suggestions="manual"
          className="h-full w-full"
        />
      ) : (
        // The CLI tab stacks stats, agents, surfaces, session, terminal, and
        // sessions — taller than any viewport. Without its own scroll region
        // the page body scrolls instead, clipping the panel and hiding the
        // session list / launch commands entirely (FOX2-39 MT-04 report).
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
          <div className="border-b border-default px-4 py-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-default bg-surface-50 px-3 py-2">
                <div className="text-muted-foreground">Bridge</div>
                <div className="mt-1 font-medium text-foreground capitalize">
                  {bridge.status.connectionState}
                </div>
              </div>
              <div className="rounded-lg border border-default bg-surface-50 px-3 py-2">
                <div className="text-muted-foreground">Canvas Sync</div>
                <div className="mt-1 font-medium text-foreground capitalize">
                  {bridge.status.syncState}
                </div>
              </div>
              <div className="rounded-lg border border-default bg-surface-50 px-3 py-2">
                <div className="text-muted-foreground">Last Sync</div>
                <div className="mt-1 font-medium text-foreground">
                  {formatTimestamp(bridge.status.lastSyncAt)}
                </div>
              </div>
              <div className="rounded-lg border border-default bg-surface-50 px-3 py-2">
                <div className="text-muted-foreground">Last Event</div>
                <div className="mt-1 font-medium text-foreground">
                  {formatTimestamp(bridge.status.lastEventAt)}
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs text-brand-900">
              PTY transport is enabled. Start a session to run Claude Code or Codex directly inside
              the canvas panel. Lean sessions load only the canvas MCP server (fast startup, full
              context budget); choose Full env to bring your global skills and MCP tools along.
            </div>

            {(actionError || bridge.status.error) && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {actionError || bridge.status.error}
              </div>
            )}
          </div>

          <div className="border-b border-default px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-semibold text-foreground">Available Agents</div>
              <button
                type="button"
                onClick={handleRefresh}
                className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {bridge.agents.map((agent) => (
                <div key={agent.id} className="rounded-lg border border-default px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-foreground">{agent.label}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{agent.description}</div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="rounded-full bg-surface-100 px-2 py-0.5 text-[10px] font-semibold text-foreground">
                          {agent.transport === "pty" ? "PTY" : "CLI"}
                        </span>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                          {agent.mcpSupport === "native" ? "Native MCP" : "Planned MCP"}
                        </span>
                        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                          {agent.configScope === "project"
                            ? "Project config"
                            : agent.configScope === "global"
                              ? "Global config"
                              : agent.configScope === "session"
                                ? "Session config"
                                : "User config"}
                        </span>
                        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                          {agent.configMode === "strict-config-file"
                            ? "Strict MCP file"
                            : "Inline MCP overrides"}
                        </span>
                      </div>
                      {agent.guardNotes && (
                        <div className="mt-2 text-[11px] leading-5 text-muted-foreground">
                          {agent.guardNotes}
                        </div>
                      )}
                    </div>
                    <div className="grid shrink-0 grid-cols-[1fr_auto] items-stretch gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleCreateSession(agent.id, "lean")}
                        disabled={!projectId || pendingAgentId === `${agent.id}:lean`}
                        title="Lean session in the panel terminal: only the canvas MCP server is loaded — no global skills, plugins, or MCP servers competing for startup and context budget."
                        className="rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:bg-surface-200"
                      >
                        {pendingAgentId === `${agent.id}:lean` ? "Creating..." : "New session"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCreateExternalSession(agent.id, "lean")}
                        disabled={!projectId || pendingAgentId === `${agent.id}:lean:external`}
                        title="Open a lean session in macOS Terminal instead of the panel."
                        className="inline-flex items-center justify-center rounded-md border border-default px-2 py-1.5 text-foreground hover:bg-surface-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <TerminalSquare className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCreateSession(agent.id, "full")}
                        disabled={!projectId || pendingAgentId === `${agent.id}:full`}
                        title="Full environment in the panel terminal: your global skills, plugins, and MCP servers are loaded too, with the canvas server added on top. Slower startup, larger context."
                        className="rounded-md border border-default px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {pendingAgentId === `${agent.id}:full` ? "Creating..." : "Full env"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCreateExternalSession(agent.id, "full")}
                        disabled={!projectId || pendingAgentId === `${agent.id}:full:external`}
                        title="Open a full-environment session in macOS Terminal instead of the panel."
                        className="inline-flex items-center justify-center rounded-md border border-default px-2 py-1.5 text-foreground hover:bg-surface-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <TerminalSquare className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-b border-default px-4 py-3">
            <div className="mb-2 text-sm font-semibold text-foreground">Workspace Surfaces</div>
            <div className="grid grid-cols-1 gap-2">
              {AGENT_NATIVE_WORKSPACE_DEFINITIONS.map((workspace) => (
                <div key={workspace.id} className="rounded-lg border border-default bg-surface-50 px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-foreground">{workspace.label}</div>
                      <div className="mt-1 text-xs leading-5 text-muted-foreground">
                        {workspace.description}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          workspace.syncMode === "live-bridge"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {workspace.syncMode === "live-bridge" ? "Live bridge" : "Manifest only"}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          workspace.mutationMode === "remote-operations"
                            ? "bg-sky-100 text-sky-700"
                            : workspace.mutationMode === "export-only"
                              ? "bg-violet-100 text-violet-700"
                              : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {workspace.mutationMode === "remote-operations"
                          ? "Writable"
                          : workspace.mutationMode === "export-only"
                            ? "Export only"
                            : "Read only"}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 text-[11px] text-muted-foreground">Route: {workspace.route}</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {workspace.entities.map((entity) => (
                      <span
                        key={`${workspace.id}-${entity}`}
                        className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-muted-foreground"
                      >
                        {entity}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div ref={activeSessionSectionRef} className="border-b border-default px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-semibold text-foreground">Active Session</div>
              {activeSession && (
                <div className="rounded-full bg-surface-100 px-2 py-1 text-[11px] font-medium text-foreground capitalize">
                  {activeSession.status}
                </div>
              )}
            </div>

            {activeSession ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-foreground">{activeSession.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {activeSession.agentLabel} ·{" "}
                      {formatLaunchProfile(activeSession.launchProfile)} · PID{" "}
                      {activeSession.pid ?? "—"} · {activeSession.cols ?? "—"}x
                      {activeSession.rows ?? "—"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeSession.status === "running" ? (
                      <button
                        type="button"
                        onClick={handleStopSession}
                        disabled={pendingSessionActionId === activeSession.id}
                        className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Square className="h-3.5 w-3.5" />
                        Stop
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleStartSession}
                        disabled={pendingSessionActionId === activeSession.id}
                        className="inline-flex items-center gap-1 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:bg-surface-200"
                      >
                        <Play className="h-3.5 w-3.5" />
                        Start
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleCopy(activeSession.launchCommand)}
                      className="inline-flex items-center gap-1 rounded-md border border-default px-2 py-1.5 text-xs font-medium text-foreground hover:bg-surface-50"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleOpenInTerminal(activeSession.id)}
                      title="Open this session in macOS Terminal"
                      className="inline-flex items-center gap-1 rounded-md border border-default px-2 py-1.5 text-xs font-medium text-foreground hover:bg-surface-50"
                    >
                      <TerminalSquare className="h-3.5 w-3.5" />
                      Terminal
                    </button>
                  </div>
                </div>
                <div className="mt-3 max-h-40 overflow-y-auto whitespace-pre-wrap break-all rounded-md bg-foreground px-3 py-2 font-mono text-[11px] leading-5 text-muted">
                  {activeSession.launchCommand}
                </div>
                <div className="mt-2 text-[11px] text-muted-foreground">
                  CWD: {activeSession.cwd}
                </div>
                <div className="mt-3 rounded-md border border-default bg-surface-50 px-3 py-2">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Canvas Tool Adapter
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="font-mono text-[11px] text-foreground">
                      {activeSession.toolCommand}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(activeSession.toolCommand)}
                      className="inline-flex items-center gap-1 rounded-md border border-default px-2 py-1 text-xs font-medium text-foreground hover:bg-white"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </button>
                  </div>
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    Inside Codex or Claude, use `{activeSession.toolCommand} help` to inspect state
                    and apply canvas operations directly.
                  </div>
                </div>
                <div className="mt-3 rounded-md border border-default bg-surface-50 px-3 py-2">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    MCP Server
                  </div>
                  <div className="mt-2 font-mono text-[11px] text-foreground">
                    {activeSession.mcpServerCommand ?? "Not configured"}
                  </div>
                  {activeSession.mcpConfigPath && (
                    <div className="mt-2 text-[11px] text-muted-foreground">
                      Config: {activeSession.mcpConfigPath}
                    </div>
                  )}
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    The embedded agent session is launched with the canvas MCP server attached, so
                    it can read primitives and mutate the board directly.
                  </div>
                </div>
                {activeSession.startupGuidance && (
                  <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
                      MCP-first guidance
                    </div>
                    <div className="mt-2 text-[11px] leading-5 text-emerald-900">
                      {activeSession.startupGuidance}
                    </div>
                  </div>
                )}
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyTranscript}
                    disabled={!activeDebug}
                    className="inline-flex items-center gap-1 rounded-md border border-default px-2 py-1.5 text-xs font-medium text-foreground hover:bg-surface-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy transcript
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyDebug}
                    disabled={!activeDebug}
                    className="inline-flex items-center gap-1 rounded-md border border-default px-2 py-1.5 text-xs font-medium text-foreground hover:bg-surface-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy debug JSON
                  </button>
                </div>
                {activeDebug && (
                  <div className="mt-3 rounded-md border border-default bg-surface-50 px-3 py-2">
                    <div className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                      <span>{activeDebug.transcript.length} transcript entries</span>
                      <span>{activeDebug.stateHistory.length} state events</span>
                      <span>{activeDebug.workspaceEvents?.length || 0} workspace events</span>
                    </div>
                    <div className="mt-2 max-h-36 overflow-y-auto rounded bg-white p-2 font-mono text-[11px] leading-5 text-foreground">
                      {activeDebug.transcript.length === 0 ? (
                        <div className="text-muted-foreground">No transcript captured yet.</div>
                      ) : (
                        activeDebug.transcript.slice(-8).map((entry) => (
                          <div key={entry.id}>
                            <span className="text-muted">{formatTimestamp(entry.at)}</span>{" "}
                            <span className="font-semibold text-foreground">{entry.kind}</span>{" "}
                            <span>{entry.text}</span>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="mt-2 max-h-28 overflow-y-auto rounded bg-white p-2 font-mono text-[11px] leading-5 text-foreground">
                      {(activeDebug.workspaceEvents?.length || 0) === 0 ? (
                        <div className="text-muted-foreground">No workspace events captured yet.</div>
                      ) : (
                        activeDebug.workspaceEvents?.slice(-6).map((entry) => (
                          <div key={entry.id}>
                            <span className="text-muted">{formatTimestamp(entry.createdAt)}</span>{" "}
                            <span className="font-semibold text-foreground">{entry.kind}</span>{" "}
                            <span>{entry.source}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
                {activeSession.errorMessage && (
                  <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {activeSession.errorMessage}
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-lg border border-dashed border-default px-3 py-4 text-sm text-muted-foreground">
                No session selected.
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 px-4 py-3">
            <div className="mb-2 text-sm font-semibold text-foreground">Terminal</div>
            <CanvasAgentTerminal
              sessionId={activeSession?.id}
              output={activeOutput}
              outputEvents={bridge.outputEvents}
              running={activeSession?.status === "running"}
              onInput={handleTerminalInput}
              onResize={handleTerminalResize}
            />
          </div>

          <div className="border-t border-default px-4 py-3">
            <div className="mb-2 text-sm font-semibold text-foreground">Configured Sessions</div>
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {bridge.sessions.length === 0 ? (
                <div className="rounded-lg border border-dashed border-default px-3 py-4 text-sm text-muted-foreground">
                  No sessions configured yet.
                </div>
              ) : (
                bridge.sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`rounded-lg border px-3 py-3 transition ${
                      activeSession?.id === session.id
                        ? "border-foreground bg-surface-50"
                        : "border-default hover:bg-surface-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setActiveSessionId(session.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="text-sm font-medium text-foreground">{session.title}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {session.agentLabel} · {formatLaunchProfile(session.launchProfile)} ·{" "}
                          {session.status}
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                          {session.cwd}
                        </div>
                      </button>
                      <div className="flex shrink-0 flex-col gap-1">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            void handleCopy(session.launchCommand)
                          }}
                          className="inline-flex items-center gap-1 rounded-md border border-default px-2 py-1 text-xs font-medium text-foreground hover:bg-surface-50"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copy
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            void handleOpenInTerminal(session.id)
                          }}
                          title="Open this session in macOS Terminal"
                          className="inline-flex items-center gap-1 rounded-md border border-default px-2 py-1 text-xs font-medium text-foreground hover:bg-surface-50"
                        >
                          <TerminalSquare className="h-3.5 w-3.5" />
                          Terminal
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
