import { useEffect, useRef, useState } from "react"

export interface AgentNativeWorkspaceOperationRecord<TOperation> {
  id: string
  cursor: number
  workspaceId: string
  workspaceKey: string
  createdAt: string
  sourceClientId?: string | null
  source?: string | null
  operation: TOperation
}

interface UseAgentNativeWorkspaceOperationsOptions<TOperation> {
  workspaceId: string
  workspaceKey: string
  enabled?: boolean
  pollMs?: number
  onOperations: (operations: AgentNativeWorkspaceOperationRecord<TOperation>[]) => void
}

export function useAgentNativeWorkspaceOperations<TOperation>({
  workspaceId,
  workspaceKey,
  enabled = true,
  pollMs = 900,
  onOperations,
}: UseAgentNativeWorkspaceOperationsOptions<TOperation>) {
  const cursorRef = useRef(0)
  const onOperationsRef = useRef(onOperations)
  const [lastAppliedCursor, setLastAppliedCursor] = useState(0)

  useEffect(() => {
    onOperationsRef.current = onOperations
  }, [onOperations])

  useEffect(() => {
    cursorRef.current = 0
    setLastAppliedCursor(0)
  }, [workspaceId, workspaceKey])

  useEffect(() => {
    if (!enabled || !workspaceId || !workspaceKey) return

    let cancelled = false
    let timeoutId: number | null = null

    const scheduleNextPoll = () => {
      if (cancelled) return
      timeoutId = window.setTimeout(() => {
        void poll()
      }, pollMs)
    }

    const poll = async () => {
      try {
        const requestUrl = new URL(
          `/api/agent-native/workspaces/${encodeURIComponent(workspaceId)}/operations`,
          window.location.origin
        )
        requestUrl.searchParams.set("workspaceKey", workspaceKey)
        requestUrl.searchParams.set("cursor", String(cursorRef.current))

        const response = await fetch(requestUrl.toString())
        if (!response.ok) {
          scheduleNextPoll()
          return
        }

        const payload = await response.json()
        const operations = Array.isArray(payload?.operations) ? payload.operations : []
        const nextCursor = Number.isFinite(payload?.cursor)
          ? Math.max(cursorRef.current, Number(payload.cursor))
          : cursorRef.current

        cursorRef.current = nextCursor
        setLastAppliedCursor(nextCursor)

        if (operations.length > 0) {
          onOperationsRef.current(operations)
        }
      } catch {
        // Swallow transient polling failures and retry on the next interval.
      } finally {
        scheduleNextPoll()
      }
    }

    void poll()

    return () => {
      cancelled = true
      if (timeoutId != null) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [enabled, pollMs, workspaceId, workspaceKey])

  return {
    lastAppliedCursor,
  }
}
