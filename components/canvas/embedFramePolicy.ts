export type EmbedFrameStatus = "unknown" | "checking" | "embeddable" | "blocked" | "error"

interface EmbedPreflightResponse {
  embeddable?: boolean
  reason?: string
  checkedAt?: string
}

interface EmbedPreflightResult {
  status: EmbedFrameStatus
  reason?: string
  checkedAt: string
  checkedUrl: string
}

export async function preflightEmbedFramePolicy(
  url: string,
  appOrigin: string,
  signal?: AbortSignal
): Promise<EmbedPreflightResult> {
  const checkedUrl = url.trim()
  const checkedAtFallback = new Date().toISOString()

  try {
    const response = await fetch(
      `/api/embed/preflight?url=${encodeURIComponent(checkedUrl)}&appOrigin=${encodeURIComponent(appOrigin)}`,
      { method: "GET", signal }
    )

    const payload = (await response.json().catch(() => null)) as EmbedPreflightResponse | { error?: string } | null
    const checkedAt = payload && "checkedAt" in payload && typeof payload.checkedAt === "string"
      ? payload.checkedAt
      : checkedAtFallback

    if (!response.ok) {
      const message = payload && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : `Preflight failed (${response.status})`
      return { status: "error", reason: message, checkedAt, checkedUrl }
    }

    const preflight = payload as EmbedPreflightResponse | null
    const embeddable = preflight?.embeddable === true
    return {
      status: embeddable ? "embeddable" : "blocked",
      reason: preflight?.reason,
      checkedAt,
      checkedUrl,
    }
  } catch (error) {
    if (signal?.aborted) {
      return { status: "unknown", checkedAt: checkedAtFallback, checkedUrl }
    }
    const message = error instanceof Error ? error.message : "Failed to check iframe policy."
    return { status: "error", reason: message, checkedAt: checkedAtFallback, checkedUrl }
  }
}

export function getEmbedFrameStatusLabel(status: EmbedFrameStatus | undefined): string {
  switch (status) {
    case "checking":
      return "Checking"
    case "embeddable":
      return "Embeddable"
    case "blocked":
      return "Blocked"
    case "error":
      return "Check failed"
    default:
      return "Unknown"
  }
}
