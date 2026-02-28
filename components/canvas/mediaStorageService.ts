interface StoredMediaPayload {
  mediaUrl?: string
  provider?: string
  storedAt?: string
  mimeType?: string
}

interface StoreMediaResult {
  status: "ready" | "error"
  mediaUrl?: string
  provider?: string
  storedAt?: string
  mimeType?: string
  reason?: string
}

export interface MediaEmbedInfo {
  provider: "youtube" | "vimeo"
  embedUrl: string
  supportsClipEnd: boolean
}

export interface MediaPlaybackOptions {
  controls?: boolean
  autoplay?: boolean
  muted?: boolean
  loop?: boolean
  clipStartSec?: number
  clipEndSec?: number
}

function parseTimestampToSeconds(value: string | null): number | null {
  if (!value) return null
  const trimmed = value.trim().toLowerCase()
  if (!trimmed) return null
  if (/^\d+$/.test(trimmed)) {
    const seconds = Number(trimmed)
    return Number.isFinite(seconds) && seconds >= 0 ? seconds : null
  }

  const match = trimmed.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/)
  if (!match) return null
  const hours = Number(match[1] || 0)
  const minutes = Number(match[2] || 0)
  const seconds = Number(match[3] || 0)
  const total = hours * 3600 + minutes * 60 + seconds
  return total > 0 ? total : null
}

function toNonNegativeSeconds(value: number | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null
  if (value < 0) return 0
  return value
}

function toWholeSeconds(value: number | null): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null
  return Math.max(0, Math.floor(value))
}

function parseBooleanParam(value: string | null): boolean | null {
  if (!value) return null
  const normalized = value.trim().toLowerCase()
  if (normalized === "1" || normalized === "true" || normalized === "yes") return true
  if (normalized === "0" || normalized === "false" || normalized === "no") return false
  return null
}

function getYouTubeVideoId(url: URL): string | null {
  const host = url.hostname.toLowerCase()
  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0]
    return id || null
  }
  if (host.endsWith("youtube.com")) {
    if (url.pathname === "/watch") {
      return url.searchParams.get("v")
    }
    const match = url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?#]+)/)
    if (match?.[1]) return match[1]
  }
  return null
}

function getVimeoVideoId(url: URL): string | null {
  const host = url.hostname.toLowerCase()
  if (!host.endsWith("vimeo.com")) return null
  const match = url.pathname.match(/\/(\d+)(?:$|[/?#])/)
  return match?.[1] || null
}

export function getMediaEmbedInfo(src: string, options?: MediaPlaybackOptions): MediaEmbedInfo | null {
  try {
    const parsed = new URL(src)
    const youtubeId = getYouTubeVideoId(parsed)
    if (youtubeId) {
      const rawStartSeconds =
        toNonNegativeSeconds(options?.clipStartSec) ??
        parseTimestampToSeconds(parsed.searchParams.get("t")) ??
        parseTimestampToSeconds(parsed.searchParams.get("start"))
      const rawEndSeconds =
        toNonNegativeSeconds(options?.clipEndSec) ??
        parseTimestampToSeconds(parsed.searchParams.get("end"))
      const startSeconds = toWholeSeconds(rawStartSeconds)
      const endSeconds = toWholeSeconds(rawEndSeconds)
      const autoplay =
        options?.autoplay ?? parseBooleanParam(parsed.searchParams.get("autoplay")) ?? false
      const muted = options?.muted ?? parseBooleanParam(parsed.searchParams.get("mute")) ?? false
      const controls =
        options?.controls ?? parseBooleanParam(parsed.searchParams.get("controls")) ?? true
      const shouldLoop = options?.loop ?? parseBooleanParam(parsed.searchParams.get("loop")) ?? false
      const embedUrl = new URL(`https://www.youtube.com/embed/${youtubeId}`)
      embedUrl.searchParams.set("playsinline", "1")
      if (!controls) {
        embedUrl.searchParams.set("controls", "0")
      }
      if (autoplay) {
        embedUrl.searchParams.set("autoplay", "1")
      }
      if (muted) {
        embedUrl.searchParams.set("mute", "1")
      }
      if (startSeconds && startSeconds > 0) {
        embedUrl.searchParams.set("start", String(startSeconds))
      }
      if (endSeconds && endSeconds > 0) {
        embedUrl.searchParams.set("end", String(endSeconds))
      }
      if (shouldLoop) {
        embedUrl.searchParams.set("loop", "1")
        embedUrl.searchParams.set("playlist", youtubeId)
      }
      return {
        provider: "youtube",
        embedUrl: embedUrl.toString(),
        supportsClipEnd: true,
      }
    }

    const vimeoId = getVimeoVideoId(parsed)
    if (vimeoId) {
      const startSeconds = toWholeSeconds(
        toNonNegativeSeconds(options?.clipStartSec) ??
          parseTimestampToSeconds(parsed.searchParams.get("t")) ??
          parseTimestampToSeconds(parsed.searchParams.get("start"))
      )
      const autoplay =
        options?.autoplay ?? parseBooleanParam(parsed.searchParams.get("autoplay")) ?? false
      const muted = options?.muted ?? parseBooleanParam(parsed.searchParams.get("muted")) ?? false
      const controls =
        options?.controls ?? parseBooleanParam(parsed.searchParams.get("controls")) ?? true
      const shouldLoop = options?.loop ?? parseBooleanParam(parsed.searchParams.get("loop")) ?? false
      const embedUrl = new URL(`https://player.vimeo.com/video/${vimeoId}`)
      if (!controls) {
        embedUrl.searchParams.set("controls", "0")
      }
      if (autoplay) {
        embedUrl.searchParams.set("autoplay", "1")
      }
      if (muted) {
        embedUrl.searchParams.set("muted", "1")
      }
      if (shouldLoop) {
        embedUrl.searchParams.set("loop", "1")
      }
      const hash = startSeconds && startSeconds > 0 ? `#t=${startSeconds}s` : ""
      return {
        provider: "vimeo",
        embedUrl: `${embedUrl.toString()}${hash}`,
        supportsClipEnd: false,
      }
    }

    return null
  } catch {
    return null
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result)
      } else {
        reject(new Error("Failed to read file as data URL."))
      }
    }
    reader.onerror = () => {
      reject(reader.error ?? new Error("Failed to read file."))
    }
    reader.readAsDataURL(file)
  })
}

export function inferMediaKindFromFile(file: File): "image" | "video" | "gif" {
  const mime = file.type.toLowerCase()
  const name = file.name.toLowerCase()
  if (mime.includes("gif") || name.endsWith(".gif")) return "gif"
  if (mime.startsWith("video/") || /\.(mp4|webm|mov|m4v|ogg)$/.test(name)) return "video"
  return "image"
}

export function inferMediaKindFromSrc(src: string): "image" | "video" | "gif" {
  if (getMediaEmbedInfo(src)) return "video"
  const lower = src.toLowerCase()
  if (lower.endsWith(".gif") || lower.includes(".gif?")) return "gif"
  if (/\.(mp4|webm|mov|m4v|ogg)(\?|#|$)/.test(lower)) return "video"
  return "image"
}

export async function storeLocalMediaFile(file: File): Promise<StoreMediaResult> {
  try {
    const dataUrl = await readFileAsDataUrl(file)
    const response = await fetch("/api/media/store", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dataUrl,
        filename: file.name,
      }),
    })
    const payload = (await response.json().catch(() => null)) as
      | StoredMediaPayload
      | { error?: string }
      | null
    if (!response.ok) {
      return {
        status: "error",
        reason:
          payload && "error" in payload && typeof payload.error === "string"
            ? payload.error
            : `Media upload failed (${response.status}).`,
      }
    }
    const stored = payload as StoredMediaPayload | null
    if (!stored?.mediaUrl) {
      return { status: "error", reason: "Media upload succeeded but URL was missing." }
    }
    return {
      status: "ready",
      mediaUrl: stored.mediaUrl,
      provider: stored.provider,
      storedAt: stored.storedAt,
      mimeType: stored.mimeType,
    }
  } catch (error) {
    return {
      status: "error",
      reason: error instanceof Error ? error.message : "Failed to upload media file.",
    }
  }
}
