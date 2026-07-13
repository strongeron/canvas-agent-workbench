import type { CanvasMcpHttpTransport } from "../../utils/mcpApp"
import { readProjectMeta, writeProjectMetaAtomic } from "./projectMeta"

// Localhost hosts that are considered safe by default. Public hosts and
// non-localhost private IPs require explicit user confirmation, mirroring the
// stdio allowlist flow.
const LOCALHOST_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"])

function normalizeOrigin(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null
    return parsed.origin
  } catch {
    return null
  }
}

function isLocalhostUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false
    const host = parsed.hostname.toLowerCase()
    return LOCALHOST_HOSTS.has(host)
  } catch {
    return false
  }
}

export function isBuiltInAllowedHttpTransport(transport: CanvasMcpHttpTransport) {
  return isLocalhostUrl(transport.url)
}

export async function readPersistedHttpAllowlist(projectDir: string, projectId: string) {
  const meta = await readProjectMeta(projectDir, projectId)
  return Array.isArray(meta.mcpAppHttpAllowlist)
    ? meta.mcpAppHttpAllowlist.filter(
        (entry): entry is string => typeof entry === "string" && !!entry.trim()
      )
    : []
}

export async function isHttpTransportAllowlisted(
  projectDir: string,
  projectId: string,
  transport: CanvasMcpHttpTransport
) {
  if (isBuiltInAllowedHttpTransport(transport)) return true
  const origin = normalizeOrigin(transport.url)
  if (!origin) return false
  const persisted = await readPersistedHttpAllowlist(projectDir, projectId)
  return persisted.includes(origin)
}

export async function persistAllowlistedHttpTransport(
  projectDir: string,
  projectId: string,
  transport: CanvasMcpHttpTransport
) {
  const origin = normalizeOrigin(transport.url)
  if (!origin) {
    throw new Error(`Invalid HTTP transport URL: ${transport.url}`)
  }
  const meta = await readProjectMeta(projectDir, projectId)
  const current = Array.isArray(meta.mcpAppHttpAllowlist) ? meta.mcpAppHttpAllowlist : []
  if (current.includes(origin)) return origin
  await writeProjectMetaAtomic(projectDir, {
    ...meta,
    mcpAppHttpAllowlist: [...current, origin],
  })
  return origin
}

export function describeHttpTransportSignature(transport: CanvasMcpHttpTransport) {
  return normalizeOrigin(transport.url) ?? transport.url
}
