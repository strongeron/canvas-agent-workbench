import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import type {
  CanvasAgentDefinition,
  CanvasAgentSessionDebug,
  CanvasAgentSession,
  CanvasAgentTranscriptEntry,
  CanvasRemoteOperation,
  CanvasStateSnapshot,
} from "../types/canvas"

interface UseCanvasAgentBridgeOptions {
  projectId?: string
  snapshot: CanvasStateSnapshot
  replaceState: (state: CanvasStateSnapshot) => void
  applyRemoteOperation: (operation: CanvasRemoteOperation) => void
}

export interface CanvasAgentBridgeStatus {
  connectionState: "idle" | "connecting" | "connected" | "error"
  syncState: "idle" | "syncing" | "error"
  lastSyncAt: string | null
  lastEventAt: string | null
  lastRemoteStateAt: string | null
  error: string | null
}

export interface UseCanvasAgentBridgeResult {
  agents: CanvasAgentDefinition[]
  sessions: CanvasAgentSession[]
  status: CanvasAgentBridgeStatus
  outputBySession: Record<string, string>
  debugBySession: Record<string, CanvasAgentSessionDebug>
  refreshSessions: () => Promise<void>
  createSession: (agentId: string) => Promise<CanvasAgentSession | null>
  loadSessionOutput: (sessionId: string) => Promise<string>
  loadSessionDebug: (sessionId: string) => Promise<CanvasAgentSessionDebug | null>
  startSession: (sessionId: string, size?: { cols: number; rows: number }) => Promise<CanvasAgentSession | null>
  stopSession: (sessionId: string) => Promise<CanvasAgentSession | null>
  writeSessionInput: (sessionId: string, input: string) => Promise<void>
  resizeSession: (sessionId: string, size: { cols: number; rows: number }) => Promise<void>
}

function buildQuery(params: Record<string, string | undefined>) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value)
  })
  const query = search.toString()
  return query ? `?${query}` : ""
}

function trimSessionOutput(value: string) {
  return value.length <= 200_000 ? value : value.slice(value.length - 200_000)
}

function trimTranscriptEntries(entries: CanvasAgentTranscriptEntry[]) {
  return entries.length <= 120 ? entries : entries.slice(entries.length - 120)
}

export function useCanvasAgentBridge({
  projectId,
  snapshot,
  replaceState,
  applyRemoteOperation,
}: UseCanvasAgentBridgeOptions): UseCanvasAgentBridgeResult {
  const clientIdRef = useRef(`canvas-client-${Math.random().toString(36).slice(2, 10)}`)
  const [agents, setAgents] = useState<CanvasAgentDefinition[]>([])
  const [sessions, setSessions] = useState<CanvasAgentSession[]>([])
  const [connectionState, setConnectionState] =
    useState<CanvasAgentBridgeStatus["connectionState"]>("idle")
  const [syncState, setSyncState] = useState<CanvasAgentBridgeStatus["syncState"]>("idle")
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)
  const [lastEventAt, setLastEventAt] = useState<string | null>(null)
  const [lastRemoteStateAt, setLastRemoteStateAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [bridgeReady, setBridgeReady] = useState(false)
  const [outputBySession, setOutputBySession] = useState<Record<string, string>>({})
  const [debugBySession, setDebugBySession] = useState<Record<string, CanvasAgentSessionDebug>>({})

  const upsertSession = useCallback((session: CanvasAgentSession) => {
    setSessions((previous) => {
      const existingIndex = previous.findIndex((item) => item.id === session.id)
      if (existingIndex >= 0) {
        return previous.map((item, index) => (index === existingIndex ? session : item))
      }
      return [session, ...previous]
    })
  }, [])

  const refreshSessions = useCallback(async () => {
    if (!projectId) {
      setSessions([])
      return
    }

    const response = await fetch(
      `/api/canvas-agent/sessions${buildQuery({ projectId })}`
    )
    if (!response.ok) {
      throw new Error("Failed to load canvas agent sessions.")
    }
    const data = await response.json()
    setSessions(Array.isArray(data.sessions) ? data.sessions : [])
  }, [projectId])

  const loadAgents = useCallback(async () => {
    const response = await fetch("/api/canvas-agent/agents")
    if (!response.ok) {
      throw new Error("Failed to load canvas agents.")
    }
    const data = await response.json()
    setAgents(Array.isArray(data.agents) ? data.agents : [])
  }, [])

  const createSession = useCallback(
    async (agentId: string) => {
      if (!projectId) return null
      const response = await fetch("/api/canvas-agent/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          agentId,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(
          typeof data.error === "string" ? data.error : "Failed to create canvas agent session."
        )
      }

      const data = await response.json()
      const session = (data.session ?? null) as CanvasAgentSession | null
      if (session) {
        upsertSession(session)
      }
      return session
    },
    [projectId, upsertSession]
  )

  const loadSessionOutput = useCallback(async (sessionId: string) => {
    const response = await fetch(`/api/canvas-agent/sessions/${encodeURIComponent(sessionId)}/output`)
    if (!response.ok) {
      throw new Error("Failed to load session output.")
    }
    const data = await response.json()
    const output = typeof data.output === "string" ? data.output : ""
    setOutputBySession((previous) => ({
      ...previous,
      [sessionId]: trimSessionOutput(output),
    }))
    if (data.session) {
      upsertSession(data.session as CanvasAgentSession)
    }
    return output
  }, [upsertSession])

  const loadSessionDebug = useCallback(
    async (sessionId: string) => {
      const response = await fetch(`/api/canvas-agent/sessions/${encodeURIComponent(sessionId)}/debug`)
      if (!response.ok) {
        throw new Error("Failed to load session debug state.")
      }
      const data = await response.json()
      const debug = (data.debug ?? null) as CanvasAgentSessionDebug | null
      if (!debug) return null

      setOutputBySession((previous) => ({
        ...previous,
        [sessionId]: trimSessionOutput(debug.output ?? ""),
      }))
      setDebugBySession((previous) => ({
        ...previous,
        [sessionId]: {
          ...debug,
          transcript: trimTranscriptEntries(Array.isArray(debug.transcript) ? debug.transcript : []),
        },
      }))
      upsertSession(debug.session)
      return debug
    },
    [upsertSession]
  )

  const postSessionAction = useCallback(
    async <T,>(sessionId: string, action: string, payload?: Record<string, unknown>) => {
      const response = await fetch(
        `/api/canvas-agent/sessions/${encodeURIComponent(sessionId)}/${action}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload ?? {}),
        }
      )
      const data = await response.json().catch(() => ({} as T & { error?: string }))
      if (!response.ok) {
        throw new Error(
          typeof (data as { error?: string }).error === "string"
            ? (data as { error?: string }).error
            : "Canvas agent session action failed."
        )
      }
      return data as T
    },
    []
  )

  const startSession = useCallback(
    async (sessionId: string, size?: { cols: number; rows: number }) => {
      const data = await postSessionAction<{ session?: CanvasAgentSession }>(
        sessionId,
        "start",
        size
      )
      const session = data.session ?? null
      if (session) {
        upsertSession(session)
        await loadSessionOutput(sessionId)
      }
      return session
    },
    [loadSessionOutput, postSessionAction, upsertSession]
  )

  const stopSession = useCallback(
    async (sessionId: string) => {
      const data = await postSessionAction<{ session?: CanvasAgentSession }>(sessionId, "stop")
      const session = data.session ?? null
      if (session) {
        upsertSession(session)
      }
      return session
    },
    [postSessionAction, upsertSession]
  )

  const writeSessionInput = useCallback(
    async (sessionId: string, input: string) => {
      await postSessionAction(sessionId, "input", { input })
    },
    [postSessionAction]
  )

  const resizeSession = useCallback(
    async (sessionId: string, size: { cols: number; rows: number }) => {
      const data = await postSessionAction<{ session?: CanvasAgentSession }>(
        sessionId,
        "resize",
        size
      )
      if (data.session) {
        upsertSession(data.session)
      }
    },
    [postSessionAction, upsertSession]
  )

  useEffect(() => {
    let cancelled = false

    if (!projectId) {
      setBridgeReady(false)
      setConnectionState("idle")
      setSyncState("idle")
      setLastRemoteStateAt(null)
      setSessions([])
      setDebugBySession({})
      setOutputBySession({})
      return () => {
        cancelled = true
      }
    }

    setBridgeReady(false)
    setError(null)

    void (async () => {
      try {
        await Promise.all([
          loadAgents(),
          refreshSessions(),
          (async () => {
            const response = await fetch(
              `/api/canvas-agent/state${buildQuery({ projectId })}`
            )
            if (!response.ok) {
              throw new Error("Failed to load canvas agent state.")
            }
            const data = await response.json()
            if (cancelled) return

            const remoteState = data.state as CanvasStateSnapshot | null | undefined
            const hasLocalState = snapshot.items.length > 0 || snapshot.groups.length > 0
            if (remoteState && !hasLocalState) {
              replaceState(remoteState)
            }

            setLastRemoteStateAt(
              typeof data.updatedAt === "string" ? data.updatedAt : null
            )
          })(),
        ])
        if (!cancelled) {
          setBridgeReady(true)
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "Canvas agent bridge failed.")
          setBridgeReady(true)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [
    loadAgents,
    projectId,
    refreshSessions,
    replaceState,
    snapshot.groups.length,
    snapshot.items.length,
  ])

  useEffect(() => {
    if (!projectId) return

    const query = buildQuery({
      projectId,
      clientId: clientIdRef.current,
    })
    const source = new EventSource(`/api/canvas-agent/events${query}`)
    setConnectionState("connecting")

    const handleSessionCreated = (event: MessageEvent) => {
      const payload = JSON.parse(event.data) as { session?: CanvasAgentSession }
      if (!payload.session) return
      upsertSession(payload.session)
      setLastEventAt(new Date().toISOString())
    }

    const handleSessionUpdated = (event: MessageEvent) => {
      const payload = JSON.parse(event.data) as { session?: CanvasAgentSession }
      if (!payload.session) return
      upsertSession(payload.session)
      setLastEventAt(new Date().toISOString())
    }

    const handleSessionOutput = (event: MessageEvent) => {
      const payload = JSON.parse(event.data) as { sessionId?: string; chunk?: string }
      if (!payload.sessionId || typeof payload.chunk !== "string") return
      setOutputBySession((previous) => ({
        ...previous,
        [payload.sessionId!]: trimSessionOutput(
          `${previous[payload.sessionId!] || ""}${payload.chunk}`
        ),
      }))
      setLastEventAt(new Date().toISOString())
    }

    const handleSessionTranscript = (event: MessageEvent) => {
      const payload = JSON.parse(event.data) as {
        sessionId?: string
        entry?: CanvasAgentTranscriptEntry
      }
      if (!payload.sessionId || !payload.entry) return
      const entry = payload.entry
      setDebugBySession((previous) => {
        const existing = previous[payload.sessionId!]
        if (!existing) return previous
        return {
          ...previous,
          [payload.sessionId!]: {
            ...existing,
            transcript: trimTranscriptEntries([...existing.transcript, entry]),
          },
        }
      })
      setLastEventAt(new Date().toISOString())
    }

    const handleCanvasOperation = (event: MessageEvent) => {
      const payload = JSON.parse(event.data) as {
        sourceClientId?: string
        sessionId?: string
        operation?: CanvasRemoteOperation
      }
      if (!payload.operation || payload.sourceClientId === clientIdRef.current) {
        return
      }
      applyRemoteOperation(payload.operation)
      if (payload.sessionId) {
        void loadSessionDebug(payload.sessionId).catch(() => {
          // Session debug is supplemental; ignore fetch failures here.
        })
      }
      setLastEventAt(new Date().toISOString())
    }

    source.addEventListener("open", () => {
      setConnectionState("connected")
      setError(null)
    })
    source.addEventListener("error", () => {
      setConnectionState("error")
    })
    source.addEventListener("session-created", handleSessionCreated)
    source.addEventListener("session-updated", handleSessionUpdated)
    source.addEventListener("session-output", handleSessionOutput)
    source.addEventListener("session-transcript", handleSessionTranscript)
    source.addEventListener("canvas-operation", handleCanvasOperation)

    return () => {
      source.removeEventListener("session-created", handleSessionCreated)
      source.removeEventListener("session-updated", handleSessionUpdated)
      source.removeEventListener("session-output", handleSessionOutput)
      source.removeEventListener("session-transcript", handleSessionTranscript)
      source.removeEventListener("canvas-operation", handleCanvasOperation)
      source.close()
    }
  }, [applyRemoteOperation, loadSessionDebug, projectId, upsertSession])

  useEffect(() => {
    if (!projectId || !bridgeReady) return

    const timeoutId = window.setTimeout(() => {
      setSyncState("syncing")
      void (async () => {
        try {
          const response = await fetch("/api/canvas-agent/state", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              projectId,
              clientId: clientIdRef.current,
              state: snapshot,
            }),
          })

          if (!response.ok) {
            throw new Error("Failed to sync canvas state.")
          }

          const data = await response.json()
          setLastSyncAt(typeof data.updatedAt === "string" ? data.updatedAt : new Date().toISOString())
          setSyncState("idle")
          setError(null)
        } catch (nextError) {
          setSyncState("error")
          setError(nextError instanceof Error ? nextError.message : "Canvas sync failed.")
        }
      })()
    }, 350)

    return () => window.clearTimeout(timeoutId)
  }, [bridgeReady, projectId, snapshot])

  const status = useMemo<CanvasAgentBridgeStatus>(
    () => ({
      connectionState,
      syncState,
      lastSyncAt,
      lastEventAt,
      lastRemoteStateAt,
      error,
    }),
    [connectionState, error, lastEventAt, lastRemoteStateAt, lastSyncAt, syncState]
  )

  return {
    agents,
    sessions,
    status,
    outputBySession,
    debugBySession,
    refreshSessions,
    createSession,
    loadSessionOutput,
    loadSessionDebug,
    startSession,
    stopSession,
    writeSessionInput,
    resizeSession,
  }
}
