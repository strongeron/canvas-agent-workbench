import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import type {
  CanvasAgentDefinition,
  CanvasAgentSession,
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
  refreshSessions: () => Promise<void>
  createSession: (agentId: string) => Promise<CanvasAgentSession | null>
}

function buildQuery(params: Record<string, string | undefined>) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value)
  })
  const query = search.toString()
  return query ? `?${query}` : ""
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
        setSessions((previous) => {
          const existingIndex = previous.findIndex((item) => item.id === session.id)
          if (existingIndex >= 0) {
            return previous.map((item, index) => (index === existingIndex ? session : item))
          }
          return [session, ...previous]
        })
      }
      return session
    },
    [projectId]
  )

  useEffect(() => {
    let cancelled = false

    if (!projectId) {
      setBridgeReady(false)
      setConnectionState("idle")
      setSyncState("idle")
      setLastRemoteStateAt(null)
      setSessions([])
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
      setSessions((previous) => {
        const existingIndex = previous.findIndex((item) => item.id === payload.session?.id)
        if (existingIndex >= 0) {
          return previous.map((item, index) =>
            index === existingIndex ? payload.session! : item
          )
        }
        return [payload.session!, ...previous]
      })
      setLastEventAt(new Date().toISOString())
    }

    const handleSessionUpdated = (event: MessageEvent) => {
      const payload = JSON.parse(event.data) as { session?: CanvasAgentSession }
      if (!payload.session) return
      setSessions((previous) =>
        previous.map((item) => (item.id === payload.session?.id ? payload.session! : item))
      )
      setLastEventAt(new Date().toISOString())
    }

    const handleCanvasOperation = (event: MessageEvent) => {
      const payload = JSON.parse(event.data) as {
        sourceClientId?: string
        operation?: CanvasRemoteOperation
      }
      if (!payload.operation || payload.sourceClientId === clientIdRef.current) {
        return
      }
      applyRemoteOperation(payload.operation)
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
    source.addEventListener("canvas-operation", handleCanvasOperation)

    return () => {
      source.removeEventListener("session-created", handleSessionCreated)
      source.removeEventListener("session-updated", handleSessionUpdated)
      source.removeEventListener("canvas-operation", handleCanvasOperation)
      source.close()
    }
  }, [applyRemoteOperation, projectId])

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
    refreshSessions,
    createSession,
  }
}
