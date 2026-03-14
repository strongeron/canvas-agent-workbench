import { Bot, Copy, RefreshCw, TerminalSquare } from "lucide-react"
import { useMemo, useState } from "react"
import { CopilotChat } from "@copilotkit/react-ui"

import type { UseCanvasAgentBridgeResult } from "../../hooks/useCanvasAgentBridge"

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
  const [actionError, setActionError] = useState<string | null>(null)

  const sessionCountLabel = useMemo(
    () => `${bridge.sessions.length} session${bridge.sessions.length === 1 ? "" : "s"}`,
    [bridge.sessions.length]
  )

  const handleCreateSession = async (agentId: string) => {
    setPendingAgentId(agentId)
    setActionError(null)
    try {
      await bridge.createSession(agentId)
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

  return (
    <div className="flex h-full w-[400px] shrink-0 flex-col border-l border-default bg-white" data-canvas-ignore="true">
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
              Current transport is manual CLI launch. The canvas bridge is live, but PTY streaming is
              the next step.
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

            <div className="space-y-2">
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

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            <div className="mb-2 text-sm font-semibold text-gray-950">Configured Sessions</div>
            <div className="space-y-3">
              {bridge.sessions.length === 0 ? (
                <div className="rounded-lg border border-dashed border-default px-3 py-4 text-sm text-gray-500">
                  No sessions configured yet.
                </div>
              ) : (
                bridge.sessions.map((session) => (
                  <div key={session.id} className="rounded-lg border border-default px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-gray-950">{session.title}</div>
                        <div className="mt-1 text-xs text-gray-500">
                          {session.agentLabel} · {session.status}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(session.launchCommand)}
                        className="inline-flex items-center gap-1 rounded-md border border-default px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </button>
                    </div>

                    <div className="mt-3 rounded-md bg-gray-950 px-3 py-2 font-mono text-[11px] leading-5 text-gray-100">
                      {session.launchCommand}
                    </div>

                    <div className="mt-2 text-[11px] text-gray-500">
                      CWD: {session.cwd}
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
