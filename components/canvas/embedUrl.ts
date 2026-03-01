interface EmbedUrlNormalizationResult {
  url: string
  wasNormalized: boolean
  reason?: string
}

function decodePathPart(value: string | undefined): string {
  if (!value) return ""
  try {
    return decodeURIComponent(value.replace(/\+/g, " ")).trim()
  } catch {
    return value.trim()
  }
}

function isGoogleMapsHost(hostname: string) {
  const lower = hostname.toLowerCase()
  if (lower === "maps.google.com") return true
  if (lower.startsWith("maps.google.")) return true
  if (lower === "google.com") return true
  if (lower.endsWith(".google.com")) return true
  return false
}

function normalizeGoogleMapsUrl(raw: string): EmbedUrlNormalizationResult | null {
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return null
  }

  if (!isGoogleMapsHost(parsed.hostname)) return null

  const lowerPath = parsed.pathname.toLowerCase()
  if (!lowerPath.includes("/maps")) return null
  if (lowerPath.includes("/maps/embed")) {
    return { url: parsed.toString(), wasNormalized: false }
  }

  const embedUrl = new URL("https://www.google.com/maps")
  embedUrl.searchParams.set("output", "embed")

  const existingQ =
    parsed.searchParams.get("q") ||
    parsed.searchParams.get("query") ||
    parsed.searchParams.get("destination")

  const pathParts = parsed.pathname.split("/").filter(Boolean)
  const placeIndex = pathParts.findIndex((part) => part.toLowerCase() === "place")
  const placeFromPath =
    placeIndex >= 0 ? decodePathPart(pathParts[placeIndex + 1]) : ""

  const dirIndex = pathParts.findIndex((part) => part.toLowerCase() === "dir")
  const fromPathOrigin =
    dirIndex >= 0 ? decodePathPart(pathParts[dirIndex + 1]) : ""
  const fromPathDestination =
    dirIndex >= 0 ? decodePathPart(pathParts[dirIndex + 2]) : ""

  const queryValue = existingQ || placeFromPath
  if (queryValue) {
    embedUrl.searchParams.set("q", queryValue)
  }

  const origin =
    parsed.searchParams.get("origin") ||
    parsed.searchParams.get("saddr") ||
    fromPathOrigin
  const destination =
    parsed.searchParams.get("destination") ||
    parsed.searchParams.get("daddr") ||
    fromPathDestination
  if (origin) {
    embedUrl.searchParams.set("saddr", origin)
  }
  if (destination) {
    embedUrl.searchParams.set("daddr", destination)
  }

  const atMatch = parsed.pathname.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(\d+(?:\.\d+)?)z/i)
  if (atMatch) {
    embedUrl.searchParams.set("ll", `${atMatch[1]},${atMatch[2]}`)
    embedUrl.searchParams.set("z", `${Math.max(1, Math.min(22, Math.round(Number(atMatch[3]))))}`)
  } else {
    const ll = parsed.searchParams.get("ll")
    if (ll) embedUrl.searchParams.set("ll", ll)

    const z = parsed.searchParams.get("z") || parsed.searchParams.get("zoom")
    if (z) embedUrl.searchParams.set("z", z)
  }

  const layer = parsed.searchParams.get("layer")
  if (layer) embedUrl.searchParams.set("layer", layer)

  return {
    url: embedUrl.toString(),
    wasNormalized: true,
    reason: "Converted Google Maps page URL to iframe-friendly embed URL.",
  }
}

export function normalizeCanvasEmbedUrl(raw: string): EmbedUrlNormalizationResult {
  const value = raw.trim()
  if (!value) return { url: value, wasNormalized: false }

  const google = normalizeGoogleMapsUrl(value)
  if (google) return google

  return { url: value, wasNormalized: false }
}
