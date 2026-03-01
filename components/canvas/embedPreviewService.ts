import type { EmbedFrameStatus } from "./embedFramePolicy"

export type EmbedPreviewMode = "auto" | "iframe" | "snapshot" | "live"
export type ResolvedEmbedPreviewMode = "iframe" | "snapshot" | "live"
export type EmbedSnapshotStatus = "idle" | "loading" | "ready" | "error"
export type EmbedLiveStatus = "idle" | "starting" | "active" | "error"
export type EmbedCaptureStatus = "idle" | "capturing" | "ready" | "error"
export type EmbedCaptureTarget = "desktop" | "mobile"
export type EmbedCaptureProvider = "auto" | "playwright" | "fetch"

interface EmbedSnapshotResponse {
  imageUrl?: string
  provider?: string
  capturedAt?: string
  reason?: string
}

interface EmbedLiveSessionResponse {
  sessionUrl?: string
  sessionId?: string
  provider?: string
  expiresAt?: string
  reason?: string
}

interface EmbedSnapshotCaptureItem {
  target?: string
  status?: "ready" | "error"
  mediaUrl?: string
  provider?: string
  capturedAt?: string
  reason?: string
  viewport?: {
    width?: number
    height?: number
  }
}

interface EmbedSnapshotCaptureResponse {
  ok?: boolean
  url?: string
  provider?: EmbedCaptureProvider
  captures?: EmbedSnapshotCaptureItem[]
  capturedAt?: string
  reason?: string
}

export function resolveEmbedPreviewMode(
  mode: EmbedPreviewMode | undefined,
  frameStatus: EmbedFrameStatus | undefined,
  url?: string
): ResolvedEmbedPreviewMode {
  const effectiveMode = mode ?? "auto"
  if (effectiveMode === "auto") {
    if (frameStatus === "blocked") return "snapshot"
    if (frameStatus === "error" && !isLocalEmbedUrl(url)) return "snapshot"
    return "iframe"
  }
  return effectiveMode
}

function isLocalEmbedUrl(url: string | undefined): boolean {
  if (!url) return false
  try {
    const parsed = typeof window === "undefined"
      ? new URL(url)
      : new URL(url, window.location.href)
    const host = parsed.hostname.toLowerCase()
    if (host === "localhost" || host === "0.0.0.0" || host === "::1") return true
    if (/^127\./.test(host)) return true
    if (host.endsWith(".local")) return true
    return false
  } catch {
    return false
  }
}

export async function requestEmbedSnapshot(
  url: string,
  options?: { width?: number; height?: number; force?: boolean },
  signal?: AbortSignal
): Promise<{
  status: "ready" | "error" | "unknown"
  imageUrl?: string
  provider?: string
  reason?: string
  capturedAt: string
  sourceUrl: string
}> {
  const sourceUrl = url.trim()
  const capturedAtFallback = new Date().toISOString()
  const captureResult = await captureEmbedSnapshots(
    sourceUrl,
    {
      targets: ["desktop"],
      provider: "auto",
      force: options?.force === true,
    },
    signal
  )

  if (captureResult.status === "unknown") {
    return { status: "unknown", capturedAt: capturedAtFallback, sourceUrl }
  }

  if (captureResult.status === "ready") {
    const firstReadyCapture = captureResult.captures.find(
      (capture) => capture.status === "ready" && !!capture.mediaUrl
    )
    if (firstReadyCapture?.mediaUrl) {
      return {
        status: "ready",
        imageUrl: firstReadyCapture.mediaUrl,
        provider: firstReadyCapture.provider || "capture-api",
        reason: captureResult.reason,
        capturedAt:
          firstReadyCapture.capturedAt ||
          captureResult.capturedAt ||
          capturedAtFallback,
        sourceUrl,
      }
    }
  }

  const captureReason =
    captureResult.status === "error" ? captureResult.reason : undefined

  try {
    const params = new URLSearchParams({
      url: sourceUrl,
      width: String(Math.max(200, Math.round(options?.width ?? 1280))),
      height: String(Math.max(120, Math.round(options?.height ?? 720))),
    })
    if (options?.force) {
      params.set("force", "1")
    }

    const response = await fetch(`/api/embed/snapshot?${params.toString()}`, {
      method: "GET",
      signal,
    })
    const payload = (await response.json().catch(() => null)) as
      | EmbedSnapshotResponse
      | { error?: string }
      | null
    const capturedAt =
      payload && "capturedAt" in payload && typeof payload.capturedAt === "string"
        ? payload.capturedAt
        : capturedAtFallback

    if (!response.ok) {
      const reason =
        payload && "error" in payload && typeof payload.error === "string"
          ? payload.error
          : `Snapshot failed (${response.status})`
      return {
        status: "error",
        reason: captureReason ? `${captureReason} ${reason}` : reason,
        capturedAt,
        sourceUrl,
      }
    }

    const snapshot = payload as EmbedSnapshotResponse | null
    if (!snapshot?.imageUrl) {
      return {
        status: "error",
        reason: captureReason
          ? `${captureReason} Snapshot provider did not return an image URL.`
          : "Snapshot provider did not return an image URL.",
        capturedAt,
        sourceUrl,
      }
    }

    return {
      status: "ready",
      imageUrl: snapshot.imageUrl,
      provider: snapshot.provider,
      reason: captureReason || snapshot.reason,
      capturedAt,
      sourceUrl,
    }
  } catch (error) {
    if (signal?.aborted) {
      return { status: "unknown", capturedAt: capturedAtFallback, sourceUrl }
    }
    return {
      status: "error",
      reason: captureReason
        ? `${captureReason} ${error instanceof Error ? error.message : "Failed to capture snapshot."}`
        : error instanceof Error
          ? error.message
          : "Failed to capture snapshot.",
      capturedAt: capturedAtFallback,
      sourceUrl,
    }
  }
}

export async function captureEmbedSnapshots(
  url: string,
  options?: {
    targets?: EmbedCaptureTarget[]
    provider?: EmbedCaptureProvider
    force?: boolean
  },
  signal?: AbortSignal
): Promise<{
  status: "ready" | "error" | "unknown"
  captures: Array<{
    target: EmbedCaptureTarget
    status: "ready" | "error"
    mediaUrl?: string
    provider?: string
    capturedAt?: string
    reason?: string
    viewport?: {
      width?: number
      height?: number
    }
  }>
  reason?: string
  capturedAt?: string
}> {
  try {
    const response = await fetch("/api/embed/snapshot/capture", {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: url.trim(),
        targets: options?.targets && options.targets.length > 0 ? options.targets : ["desktop"],
        provider: options?.provider || "auto",
        force: options?.force === true,
      }),
    })

    const payload = (await response.json().catch(() => null)) as
      | EmbedSnapshotCaptureResponse
      | { error?: string }
      | null

    if (!response.ok) {
      return {
        status: "error",
        captures: [],
        reason:
          payload && "error" in payload && typeof payload.error === "string"
            ? payload.error
            : `Snapshot capture failed (${response.status})`,
      }
    }

    const capturePayload = payload as EmbedSnapshotCaptureResponse | null
    const captures = (capturePayload?.captures || [])
      .map((capture) => {
        const target: EmbedCaptureTarget =
          capture.target === "mobile" ? "mobile" : "desktop"
        const status: "ready" | "error" =
          capture.status === "error" ? "error" : "ready"
        return {
          target,
          status,
          mediaUrl: capture.mediaUrl,
          provider: capture.provider,
          capturedAt: capture.capturedAt,
          reason: capture.reason,
          viewport: capture.viewport,
        }
      })
      .filter((capture) => capture.status === "error" || !!capture.mediaUrl)

    const hasReady = captures.some((capture) => capture.status === "ready" && capture.mediaUrl)
    return {
      status: hasReady ? "ready" : "error",
      captures,
      reason:
        capturePayload?.reason ||
        (!hasReady ? "No captures returned from the provider." : undefined),
      capturedAt: capturePayload?.capturedAt,
    }
  } catch (error) {
    if (signal?.aborted) {
      return { status: "unknown", captures: [] }
    }
    return {
      status: "error",
      captures: [],
      reason: error instanceof Error ? error.message : "Failed to capture snapshots.",
    }
  }
}

export async function startEmbedLiveSession(
  url: string,
  signal?: AbortSignal
): Promise<{
  status: "active" | "unavailable" | "error" | "unknown"
  sessionUrl?: string
  sessionId?: string
  provider?: string
  reason?: string
  startedAt: string
  sourceUrl: string
  expiresAt?: string
}> {
  const sourceUrl = url.trim()
  const startedAt = new Date().toISOString()
  try {
    const response = await fetch("/api/embed/live-session", {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: sourceUrl }),
    })
    const payload = (await response.json().catch(() => null)) as
      | EmbedLiveSessionResponse
      | { error?: string }
      | null

    if (response.status === 501) {
      return {
        status: "unavailable",
        reason:
          payload && "error" in payload && typeof payload.error === "string"
            ? payload.error
            : "No live embed provider is configured.",
        startedAt,
        sourceUrl,
      }
    }

    if (!response.ok) {
      return {
        status: "error",
        reason:
          payload && "error" in payload && typeof payload.error === "string"
            ? payload.error
            : `Live session failed (${response.status})`,
        startedAt,
        sourceUrl,
      }
    }

    const session = payload as EmbedLiveSessionResponse | null
    if (!session?.sessionUrl) {
      return {
        status: "error",
        reason: "Live session provider did not return a session URL.",
        startedAt,
        sourceUrl,
      }
    }

    return {
      status: "active",
      sessionUrl: session.sessionUrl,
      sessionId: session.sessionId,
      provider: session.provider,
      reason: session.reason,
      startedAt,
      sourceUrl,
      expiresAt: session.expiresAt,
    }
  } catch (error) {
    if (signal?.aborted) {
      return { status: "unknown", startedAt, sourceUrl }
    }
    return {
      status: "error",
      reason: error instanceof Error ? error.message : "Failed to start live session.",
      startedAt,
      sourceUrl,
    }
  }
}

export async function stopEmbedLiveSession(sessionId: string): Promise<void> {
  try {
    await fetch(`/api/embed/live-session/${encodeURIComponent(sessionId)}`, {
      method: "DELETE",
    })
  } catch {
    // Fire-and-forget cleanup. We intentionally ignore errors.
  }
}

export function getEmbedPreviewModeLabel(mode: EmbedPreviewMode | undefined): string {
  switch (mode ?? "auto") {
    case "iframe":
      return "Iframe"
    case "snapshot":
      return "Snapshot"
    case "live":
      return "Live"
    default:
      return "Auto"
  }
}
