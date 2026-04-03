import { useEffect, useMemo, useRef, useState } from "react"

interface UseAgentNativeWorkspaceSyncOptions<TPayload> {
  workspaceId: string
  workspaceKey: string
  payload: TPayload
  appliedOperationCursor?: number
  enabled?: boolean
}

export interface AgentNativeWorkspaceSyncStatus {
  syncState: "idle" | "syncing" | "error"
  lastSyncAt: string | null
  error: string | null
}

export function useAgentNativeWorkspaceSync<TPayload>({
  workspaceId,
  workspaceKey,
  payload,
  appliedOperationCursor = 0,
  enabled = true,
}: UseAgentNativeWorkspaceSyncOptions<TPayload>): AgentNativeWorkspaceSyncStatus {
  const clientIdRef = useRef(`agent-native-workspace-${Math.random().toString(36).slice(2, 10)}`)
  const [syncState, setSyncState] = useState<AgentNativeWorkspaceSyncStatus["syncState"]>("idle")
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || !workspaceId || !workspaceKey) return

    const timeoutId = window.setTimeout(() => {
      setSyncState("syncing")
      void (async () => {
        try {
          const response = await fetch(`/api/agent-native/workspaces/${encodeURIComponent(workspaceId)}/state`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              workspaceKey,
              clientId: clientIdRef.current,
              appliedOperationCursor,
              payload,
            }),
          })

          if (!response.ok) {
            throw new Error("Failed to sync workspace state.")
          }

          const data = await response.json()
          setLastSyncAt(typeof data.updatedAt === "string" ? data.updatedAt : new Date().toISOString())
          setSyncState("idle")
          setError(null)
        } catch (nextError) {
          setSyncState("error")
          setError(nextError instanceof Error ? nextError.message : "Workspace sync failed.")
        }
      })()
    }, 350)

    return () => window.clearTimeout(timeoutId)
  }, [appliedOperationCursor, enabled, payload, workspaceId, workspaceKey])

  return useMemo(
    () => ({
      syncState,
      lastSyncAt,
      error,
    }),
    [error, lastSyncAt, syncState]
  )
}
