import { Bot, Copy, Play, RefreshCw, Square, TerminalSquare } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { CopilotChat } from "@copilotkit/react-ui"

import type { UseCanvasAgentBridgeResult } from "../../hooks/useCanvasAgentBridge"
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

  const sessionCountLabel = useMemo(
    () => `${bridge.sessions.length} session${bridge.sessions.length === 1 ? "" : "s"}`,
    [bridge.sessions.length]
  )

  const activeSession =
    bridge.sessions.find((session) => session.id === activeSessionId) ?? bridge.sessions[0] ?? null
  const activeOutput = activeSession ? bridge.outputBySession[activeSession.id] ?? "" : ""

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

  const handleCreateSession = async (agentId: string) => {
    setPendingAgentId(agentId)
    setActionError(null)
    try {
      const session = await bridge.createSession(agentId)
      if (session) {
        setActiveSessionId(session.id)
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
        cols: activeSession.cols ?? 96,
        rows: activeSession.rows ?? 28,
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
    if (!activeSession || activeSession.status !== "running") return
    try {
      await bridge.resizeSession(activeSession.id, size)
    } catch {
      // Ignore transient resize failures during panel mount/unmount.
    }
  }

  return (
    <div className="flex h-full w-[480px] shrink-0 flex-col border-l border-default bg-white" data-canvas-ignore="true">
      <div className="border-b border-default px-4 py-3">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-950">Canvas Agents</div>
            <div className="text-xs text-gray-500">
              {projectId ? `Project: ${projectId}` : "Select a project to enable agent sync"}
            </div>
          </div>
          <div className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-600">
            {sessionCountLabel}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-lg bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setTab("copilot")}
            className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
              tab === "copilot"
                ? "bg-white text-gray-950 shadow-sm"
                : "text-gray-600 hover:text-gray-950"
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
                ? "bg-white text-gray-950 shadow-sm"
                : "text-gray-600 hover:text-gray-950"
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
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-default px-4 py-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-default bg-gray-50 px-3 py-2">
                <div className="text-gray-500">Bridge</div>
                <div className="mt-1 font-medium text-gray-900 capitalize">
                  {bridge.status.connectionState}
                </div>
              </div>
              <div className="rounded-lg border border-default bg-gray-50 px-3 py-2">
                <div className="text-gray-500">Canvas Sync</div>
                <div className="mt-1 font-medium text-gray-900 capitalize">
                  {bridge.status.syncState}
                </div>
              </div>
              <div className="rounded-lg border border-default bg-gray-50 px-3 py-2">
                <div className="text-gray-500">Last Sync</div>
                <div className="mt-1 font-medium text-gray-900">
                  {formatTimestamp(bridge.status.lastSyncAt)}
                </div>
              </div>
              <div className="rounded-lg border border-default bg-gray-50 px-3 py-2">
                <div className="text-gray-500">Last Event</div>
                <div className="mt-1 font-medium text-gray-900">
                  {formatTimestamp(bridge.status.lastEventAt)}
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
              PTY transport is enabled. Start a session to run Claude Code or Codex directly inside
              the canvas panel. On first launch, the agent may ask you to trust this workspace
              before continuing.
            </div>

            {(actionError || bridge.status.error) && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {actionError || bridge.status.error}
              </div>
            )}
          </div>

          <div className="border-b border-default px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-950">Available Agents</div>
              <button
                type="button"
                onClick={handleRefresh}
                className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-950"
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
                      <div className="text-sm font-medium text-gray-950">{agent.label}</div>
                      <div className="mt-1 text-xs text-gray-500">{agent.description}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCreateSession(agent.id)}
                      disabled={!projectId || pendingAgentId === agent.id}
                      className="rounded-md bg-gray-950 px-3 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      {pendingAgentId === agent.id ? "Creating..." : "New session"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-b border-default px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-950">Active Session</div>
              {activeSession && (
                <div className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-700 capitalize">
                  {activeSession.status}
                </div>
              )}
            </div>

            {activeSession ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-gray-950">{activeSession.title}</div>
                    <div className="mt-1 text-xs text-gray-500">
                      {activeSession.agentLabel} · PID {activeSession.pid ?? "—"} ·{" "}
                      {activeSession.cols ?? "—"}x{activeSession.rows ?? "—"}
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
                        className="inline-flex items-center gap-1 rounded-md bg-gray-950 px-3 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-300"
                      >
                        <Play className="h-3.5 w-3.5" />
                        Start
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleCopy(activeSession.launchCommand)}
                      className="inline-flex items-center gap-1 rounded-md border border-default px-2 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </button>
                  </div>
                </div>
                <div className="mt-3 rounded-md bg-gray-950 px-3 py-2 font-mono text-[11px] leading-5 text-gray-100">
                  {activeSession.launchCommand}
                </div>
                <div className="mt-2 text-[11px] text-gray-500">
                  CWD: {activeSession.cwd}
                </div>
                {activeSession.errorMessage && (
                  <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {activeSession.errorMessage}
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-lg border border-dashed border-default px-3 py-4 text-sm text-gray-500">
                No session selected.
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 px-4 py-3">
            <div className="mb-2 text-sm font-semibold text-gray-950">Terminal</div>
            <CanvasAgentTerminal
              sessionId={activeSession?.id}
              output={activeOutput}
              running={activeSession?.status === "running"}
              onInput={handleTerminalInput}
              onResize={handleTerminalResize}
            />
          </div>

          <div className="border-t border-default px-4 py-3">
            <div className="mb-2 text-sm font-semibold text-gray-950">Configured Sessions</div>
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {bridge.sessions.length === 0 ? (
                <div className="rounded-lg border border-dashed border-default px-3 py-4 text-sm text-gray-500">
                  No sessions configured yet.
                </div>
              ) : (
                bridge.sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`rounded-lg border px-3 py-3 transition ${
                      activeSession?.id === session.id
                        ? "border-gray-900 bg-gray-50"
                        : "border-default hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setActiveSessionId(session.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="text-sm font-medium text-gray-950">{session.title}</div>
                        <div className="mt-1 text-xs text-gray-500">
                          {session.agentLabel} · {session.status}
                        </div>
                        <div className="mt-2 text-[11px] text-gray-500">
                          {session.cwd}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          void handleCopy(session.launchCommand)
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-default px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </button>
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
