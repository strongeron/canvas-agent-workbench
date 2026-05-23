// Persisted sync-target state (Root B mapping) — server-side normalization.
//
// `meta.syncTarget` records the user-confirmed external Root B mapping so a
// re-sync reuses it (and is the allowlist an agent's `target` must match).
// Shape: { rootPath, resolvedRealPath, componentsDir, format, mappedAt }.
//
// SECURITY: the client SUPPLIES `resolvedRealPath` but it MUST NOT be trusted
// or persisted as-is — a malicious/buggy client could pin an arbitrary
// realpath and defeat the re-sync revalidation (which compares the persisted
// value to a fresh `fs.realpath(rootPath)`). On write, the realpath is
// recomputed server-side from `rootPath`; if it does not resolve the write is
// rejected. `vite/api/**` may use fs/node.

import { promises as fs } from "node:fs"
import path from "node:path"

export interface SyncTargetState {
  rootPath: string
  resolvedRealPath: string
  componentsDir: string
  format: "html" | "html+tsx"
  mappedAt: string
}

/**
 * Lexically normalize a candidate sync target. Does NOT trust the client's
 * `resolvedRealPath` for anything authoritative — it is carried through for
 * read-path display only and is OVERWRITTEN on write by
 * `computeWrittenSyncTarget`. Returns null when `rootPath` is absent.
 */
export function normalizeSyncTargetState(
  syncTarget: unknown
): SyncTargetState | null {
  if (!syncTarget || typeof syncTarget !== "object") return null
  const s = syncTarget as Record<string, unknown>
  const rootPath =
    typeof s.rootPath === "string" && s.rootPath.trim()
      ? path.resolve(s.rootPath.trim())
      : ""
  if (!rootPath) return null
  const resolvedRealPath =
    typeof s.resolvedRealPath === "string" && s.resolvedRealPath.trim()
      ? s.resolvedRealPath.trim()
      : ""
  const componentsDir =
    typeof s.componentsDir === "string" ? s.componentsDir.trim() : ""
  const format = s.format === "html+tsx" ? "html+tsx" : "html"
  const mappedAt =
    typeof s.mappedAt === "string" && s.mappedAt.trim() ? s.mappedAt : ""
  return { rootPath, resolvedRealPath, componentsDir, format, mappedAt }
}

export type ComputeWrittenSyncTargetResult =
  | { ok: true; syncTarget: SyncTargetState }
  | { ok: false; error: string }

/**
 * Produce the sync target that will actually be persisted. The
 * client-supplied `resolvedRealPath` is DISCARDED and recomputed server-side
 * via `fs.realpath(rootPath)`. If the root does not resolve (deleted/moved/
 * never existed) the write is rejected — never persist a mapping that points
 * nowhere or whose realpath the client fabricated.
 */
export async function computeWrittenSyncTarget(
  syncTarget: unknown
): Promise<ComputeWrittenSyncTargetResult> {
  const normalized = normalizeSyncTargetState(syncTarget)
  if (!normalized) {
    return {
      ok: false,
      error: "syncTarget.rootPath is required to persist a mapping.",
    }
  }
  let resolvedRealPath: string
  try {
    resolvedRealPath = await fs.realpath(normalized.rootPath)
  } catch {
    return {
      ok: false,
      error: `Sync root could not be resolved (does not exist): ${normalized.rootPath}`,
    }
  }
  return {
    ok: true,
    // Server-computed realpath replaces whatever the client sent.
    syncTarget: { ...normalized, resolvedRealPath },
  }
}
