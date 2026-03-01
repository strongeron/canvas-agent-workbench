interface ResolveCanvasMediaSrcOptions {
  preferDirect?: boolean
}

export function resolveCanvasMediaSrc(src: string, options?: ResolveCanvasMediaSrcOptions): string {
  const value = src.trim()
  if (!value) return value
  if (value.startsWith("/api/media/file/")) return value
  if (value.startsWith("/api/media/proxy?")) return value
  if (value.startsWith("data:") || value.startsWith("blob:")) return value

  try {
    const parsed = typeof window === "undefined"
      ? new URL(value, "http://localhost")
      : new URL(value, window.location.href)

    if (typeof window !== "undefined" && parsed.origin === window.location.origin) {
      return parsed.toString()
    }

    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      if (options?.preferDirect) {
        return parsed.toString()
      }
      return `/api/media/proxy?url=${encodeURIComponent(parsed.toString())}`
    }
    return value
  } catch {
    return value
  }
}
