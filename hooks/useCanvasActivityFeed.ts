import { useEffect, useMemo, useRef, useState } from "react"

import type { AgentWorkspaceEventKind } from "../types/agentNative"

export interface CanvasActivityEvent {
  id: string
  cursor: number
  kind: AgentWorkspaceEventKind
  actor: "user" | "agent" | "system"
  createdAt: string
  action?: string | null
  summary?: string | null
  sessionId?: string | null
}

interface RawEvent {
  id?: string
  cursor?: number
  kind?: string
  actor?: string
  createdAt?: string
  source?: string
  sourceClientId?: string | null
  metadata?: Record<string, unknown> | null
}

const MAX_EVENTS = 100
const POLL_MS = 2500

function normalize(raw: RawEvent): CanvasActivityEvent | null {
  if (!raw || typeof raw.id !== "string" || typeof raw.cursor !== "number") return null
  const meta = raw.metadata ?? {}
  return {
    id: raw.id,
    cursor: raw.cursor,
    kind: (raw.kind ?? "state-synced") as AgentWorkspaceEventKind,
    actor: (raw.actor as CanvasActivityEvent["actor"]) ?? "system",
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : new Date(0).toISOString(),
    action: typeof meta.action === "string" ? meta.action : null,
    summary: typeof meta.summary === "string" ? meta.summary : null,
    sessionId: typeof meta.sessionId === "string" ? (meta.sessionId as string) : null,
  }
}

/**
 * Polls the canvas workspace event feed (the same cursor-paged log external
 * MCP agents read via get_workspace_events, FOX2-47) and accumulates recent
 * activity for the in-app feed (FOX2-48). Only runs while `enabled` so a
 * closed panel costs nothing.
 */
export function useCanvasActivityFeed({
  workspaceKey,
  enabled,
}: {
  workspaceKey: string | null
  enabled: boolean
}) {
  const [events, setEvents] = useState<CanvasActivityEvent[]>([])
  const cursorRef = useRef(0)

  useEffect(() => {
    if (!enabled || !workspaceKey) return
    let cancelled = false

    const poll = async () => {
      try {
        const url =
          `/api/agent-native/workspaces/canvas/events?workspaceKey=${encodeURIComponent(workspaceKey)}` +
          (cursorRef.current > 0 ? `&cursor=${cursorRef.current}` : "")
        const response = await fetch(url)
        if (!response.ok) return
        const data = (await response.json()) as { events?: RawEvent[]; cursor?: number }
        if (cancelled) return
        const incoming = (data.events ?? [])
          .map(normalize)
          .filter((event): event is CanvasActivityEvent => event !== null)
        if (typeof data.cursor === "number") cursorRef.current = data.cursor
        if (incoming.length === 0) return
        setEvents((current) => {
          const seen = new Set(current.map((event) => event.id))
          const merged = [...current, ...incoming.filter((event) => !seen.has(event.id))]
          return merged.slice(-MAX_EVENTS)
        })
      } catch {
        // Feed is best-effort; a failed poll retries on the next tick.
      }
    }

    void poll()
    const interval = window.setInterval(() => void poll(), POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [enabled, workspaceKey])

  // Reset the cursor + buffer when the workspace changes so a switch doesn't
  // show another project's tail.
  useEffect(() => {
    cursorRef.current = 0
    setEvents([])
  }, [workspaceKey])

  const recent = useMemo(() => [...events].reverse(), [events])
  return { events: recent }
}
