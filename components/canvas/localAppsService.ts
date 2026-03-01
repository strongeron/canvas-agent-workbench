export interface LocalAppEntry {
  port: number
  url: string
  finalUrl?: string
  status?: number
  live?: boolean
  contentType?: string
  server?: string
  embeddable?: boolean
  blockedBy?: string | null
  reason?: string
}

interface LocalAppsResponse {
  apps?: LocalAppEntry[]
  source?: string
  scannedPorts?: number
}

export async function fetchLocalApps(
  appOrigin: string,
  options?: { force?: boolean },
  signal?: AbortSignal
): Promise<{
  status: "ready" | "error" | "unknown"
  apps: LocalAppEntry[]
  source?: string
  scannedPorts?: number
  reason?: string
}> {
  try {
    const params = new URLSearchParams({
      appOrigin,
    })
    if (options?.force) params.set("force", "1")
    const response = await fetch(`/api/embed/local-apps?${params.toString()}`, {
      method: "GET",
      signal,
    })
    const payload = (await response.json().catch(() => null)) as
      | LocalAppsResponse
      | { error?: string }
      | null
    if (!response.ok) {
      return {
        status: "error",
        apps: [],
        reason:
          payload && "error" in payload && typeof payload.error === "string"
            ? payload.error
            : `Failed to discover localhost apps (${response.status}).`,
      }
    }
    const data = payload as LocalAppsResponse | null
    return {
      status: "ready",
      apps: data?.apps || [],
      source: data?.source,
      scannedPorts: data?.scannedPorts,
    }
  } catch (error) {
    if (signal?.aborted) {
      return {
        status: "unknown",
        apps: [],
      }
    }
    return {
      status: "error",
      apps: [],
      reason: error instanceof Error ? error.message : "Failed to discover localhost apps.",
    }
  }
}
