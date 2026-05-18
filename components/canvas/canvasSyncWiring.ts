// U6 — Sync wiring client (browser-side orchestration).
//
// This module is the glue between the U3 `SyncButton` `onSync` contract and
// the U5 `/api/canvas/project/sync` endpoint. It is PURE CLIENT code: it only
// uses `fetch` and the browser directory picker. The browser
// `FileSystemDirectoryHandle` is NEVER the write mechanism — the server writes
// via a path STRING. `showDirectoryPicker` is a convenience to obtain a
// directory NAME; for the actual sync the user-validated path string is what
// reaches the server. When the picker is unavailable / denied the caller
// falls back to an inline server-validated path-entry input (same mechanism
// as the sidebar's "Filesystem root (advanced)").
//
// First sync:  picker/path-entry → detect-components-dir → persist mapping →
//              POST /sync.
// Re-sync:     reuse the persisted (realpath-revalidated) mapping → POST /sync
//              (no picker).
//
// `SyncError` (class-tagged) is thrown so the U3 `syncErrorCopy` templates the
// inline message; the overwrite notice (affected slugs) is returned out-of-
// band via `onNotice` so it can render distinct from the error styling.

import type { SyncError, SyncErrorClass } from "./CanvasHtmlPropsPanel"

export interface PersistedSyncTarget {
  rootPath: string
  resolvedRealPath: string
  componentsDir: string
  format: "html" | "html+tsx"
  mappedAt: string
}

export interface DetectResult {
  resolvedComponentsDir: string
  candidates: Array<{ dir: string; exists: boolean }>
  resolvedRealPath: string
  frameworkSuggestion: "html" | "html+tsx"
  escapedDisplayPath: string
}

export interface SyncSelectionComponent {
  type: "component"
  slug: string
  /** Repo-relative or absolute Root A `<slug>.html` path. */
  sourcePath: string
  mtimeMs?: number
}

export interface SyncSelectionArtboard {
  type: "artboard"
  slug: string
  sourcePath: string
  mtimeMs?: number
  children: Array<{ slug: string; sourcePath: string; mtimeMs?: number }>
}

export type SyncSelection = SyncSelectionComponent | SyncSelectionArtboard

export interface SyncOverwriteNotice {
  /** Slugs/files that were overwritten in place (informational, non-error). */
  slugs: string[]
}

// Evaluated at CALL time (not module load) so the picker can be feature-
// detected after the page sets it up — and so tests can stub it.
export function canPickDirectory(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window
}

function makeSyncError(
  message: string,
  cls?: SyncErrorClass,
  offendingChildren?: string[]
): SyncError {
  const err = new Error(message) as SyncError
  if (cls) err.class = cls
  if (offendingChildren) err.offendingChildren = offendingChildren
  return err
}

/**
 * Map a server error `code` to a `SyncErrorClass` so the inline copy is
 * templated (U3 `syncErrorCopy`). Unknown codes fall through to the generic
 * template (raw message preserved).
 */
function classifyServerCode(code: string | undefined): SyncErrorClass | undefined {
  switch (code) {
    case "write-failed":
    case "mkdir-failed":
    case "stage-failed":
    case "partial-write":
      return "permission"
    case "stale-source":
    case "source-missing":
      return "stale-source"
    case "tsx-failed":
      return "normalization"
    default:
      if (code && code.startsWith("normalize-")) return "normalization"
      return undefined
  }
}

/**
 * Read the persisted mapping for a project and realpath-revalidate it
 * server-side. Returns the mapping plus whether it is still valid; an invalid
 * mapping (deleted/moved/symlink-swapped root) signals the caller to prompt a
 * re-pick — never a silent tree creation.
 */
export async function readSyncTarget(projectId: string): Promise<{
  syncTarget: PersistedSyncTarget | null
  valid: boolean
}> {
  const response = await fetch("/api/canvas/project/sync-target", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, mode: "read" }),
  })
  const payload = (await response.json().catch(() => ({}))) as {
    ok?: boolean
    syncTarget?: PersistedSyncTarget | null
    valid?: boolean
  }
  if (!response.ok || !payload.ok || !payload.syncTarget) {
    return { syncTarget: null, valid: false }
  }
  return { syncTarget: payload.syncTarget, valid: payload.valid === true }
}

async function persistSyncTarget(
  projectId: string,
  syncTarget: Omit<PersistedSyncTarget, "mappedAt"> & { mappedAt?: string }
): Promise<PersistedSyncTarget> {
  const withTimestamp: PersistedSyncTarget = {
    ...syncTarget,
    mappedAt: syncTarget.mappedAt ?? new Date().toISOString(),
  }
  const response = await fetch("/api/canvas/project/sync-target", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, mode: "write", syncTarget: withTimestamp }),
  })
  const payload = (await response.json().catch(() => ({}))) as {
    ok?: boolean
    syncTarget?: PersistedSyncTarget
    error?: string
  }
  if (!response.ok || !payload.ok || !payload.syncTarget) {
    throw makeSyncError(payload.error || "Failed to persist the sync mapping.")
  }
  return payload.syncTarget
}

/**
 * Probe a picked root for its components dir + framework. Returns the detect
 * result for the resolved-path display + override UI.
 */
export async function detectComponentsDir(rootPath: string): Promise<DetectResult> {
  const response = await fetch("/api/canvas/project/detect-components-dir", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rootPath }),
  })
  const payload = (await response.json().catch(() => ({}))) as
    | (DetectResult & { ok: true })
    | { ok?: false; error?: string }
  if (!response.ok || !("ok" in payload) || !payload.ok) {
    throw makeSyncError(
      ("error" in payload && payload.error) || "Folder could not be inspected.",
      "permission"
    )
  }
  return payload
}

/**
 * Open the browser directory picker to obtain a directory NAME/path STRING.
 * The handle is intentionally discarded — the server writes via a path string,
 * never a browser handle. Returns `null` on cancel; throws when unsupported so
 * the caller shows the inline path-entry fallback.
 */
export async function pickDirectoryPath(): Promise<string | null> {
  if (!canPickDirectory()) {
    throw makeSyncError(
      "Directory picker unavailable in this browser — enter the folder path below.",
      "permission"
    )
  }
  try {
    const picker = (
      window as unknown as {
        showDirectoryPicker?: () => Promise<{ name?: string }>
      }
    ).showDirectoryPicker
    const handle = await picker?.()
    if (!handle) return null
    // We deliberately only read `handle.name`. The browser handle cannot be
    // used by the Node sync endpoint; the server-validated path string is the
    // single write mechanism for ALL browsers.
    return handle.name ?? ""
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return null
    throw makeSyncError(
      error instanceof Error
        ? error.message
        : "Directory picker failed — enter the folder path below.",
      "permission"
    )
  }
}

interface SyncResponseOk {
  ok: true
  writtenPaths: string[]
  notWritten: string[]
  manifestPath: string
  perFile: Array<{ path: string; status: string }>
  partialFailure?: boolean
}

interface SyncResponseErr {
  ok?: false
  code?: string
  error?: string
  writtenPaths?: string[]
  notWritten?: string[]
  partialFailure?: boolean
}

/**
 * POST a resolved selection to the sync endpoint. Maps `{ ok, perFile,
 * notWritten }` to success (returns the overwrite notice) or throws a
 * class-tagged `SyncError` so the U3 state machine surfaces the templated
 * inline message.
 */
export async function postSync(input: {
  target: string
  componentsDir: string
  format: "html" | "html+tsx"
  selection: SyncSelection
}): Promise<SyncOverwriteNotice> {
  const response = await fetch("/api/canvas/project/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  const payload = (await response
    .json()
    .catch(() => ({}))) as SyncResponseOk | SyncResponseErr

  if (response.ok && payload.ok) {
    // The overwritten files = every written entry's slug (overwrite-by-slug).
    const slugs = (payload.perFile || [])
      .filter((entry) => entry.status === "written")
      .map((entry) => entry.path)
    return { slugs }
  }

  const errPayload = payload as SyncResponseErr
  const code = errPayload.code
  // A non-file-backed artboard child surfaces from the endpoint as a bad-path
  // error mentioning the offending child; surface it with the dedicated class.
  if (
    code === "bad-path" &&
    typeof errPayload.error === "string" &&
    /non-file-backed child/i.test(errPayload.error)
  ) {
    throw makeSyncError(errPayload.error, "non-file-backed-child")
  }
  throw makeSyncError(
    errPayload.error || "Sync failed.",
    classifyServerCode(code)
  )
}

/**
 * The full first-sync / re-sync orchestration the panels invoke from the U3
 * `onSync`. `getPickedPath` resolves the directory path STRING (picker or the
 * inline server-validated entry); when a valid persisted mapping exists it is
 * reused and `getPickedPath` is never called (one-click re-sync).
 */
export async function runSync(input: {
  projectId: string
  selection: SyncSelection
  /** Chosen format from the panel toggle (component panel only; default html). */
  format: "html" | "html+tsx"
  /**
   * Resolve a directory path STRING when no valid mapping exists (picker or
   * inline path entry). Returning `null` aborts (user cancelled) — surfaced as
   * a benign abort, not an error toast.
   */
  getPickedPath: () => Promise<string | null>
  /**
   * Optional explicit componentsDir override (from the resolved-path Edit
   * affordance). When set it is used verbatim instead of detection's pick.
   */
  componentsDirOverride?: string
  /** Called with the detect result the first time a folder is resolved. */
  onDetect?: (result: DetectResult) => void
  /** Called with the persisted mapping after first-sync persistence. */
  onMapping?: (mapping: PersistedSyncTarget) => void
  /** Called with the non-blocking overwrite notice on success. */
  onNotice?: (notice: SyncOverwriteNotice) => void
}): Promise<void> {
  const { projectId, selection } = input

  // 1. Try the persisted mapping (realpath-revalidated server-side).
  const existing = await readSyncTarget(projectId)
  let mapping: PersistedSyncTarget | null =
    existing.syncTarget && existing.valid ? existing.syncTarget : null

  if (existing.syncTarget && !existing.valid) {
    // Persisted root missing / moved / symlink-swapped. Never silently create
    // a tree — the caller's button becomes "Choose folder" and prompts a
    // re-pick. We still attempt a fresh pick here so an explicit user pick can
    // recover in-flight.
    mapping = null
  }

  if (!mapping) {
    // First sync (or re-pick): resolve a directory path STRING.
    const pickedPath = await input.getPickedPath()
    if (pickedPath === null) {
      // User cancelled — benign abort. Throw a tagged error the caller can
      // recognise and treat as a no-op (button reverts to its steady label).
      const abort = makeSyncError("Folder selection cancelled.")
      ;(abort as SyncError & { aborted?: boolean }).aborted = true
      throw abort
    }
    const detected = await detectComponentsDir(pickedPath)
    input.onDetect?.(detected)
    const componentsDir =
      input.componentsDirOverride !== undefined
        ? input.componentsDirOverride
        : detected.resolvedComponentsDir
    mapping = await persistSyncTarget(projectId, {
      rootPath: pickedPath,
      resolvedRealPath: detected.resolvedRealPath,
      componentsDir,
      format: input.format,
    })
    input.onMapping?.(mapping)
  } else if (
    input.componentsDirOverride !== undefined &&
    input.componentsDirOverride !== mapping.componentsDir
  ) {
    // Re-sync with an explicit override → re-persist the changed subfolder.
    mapping = await persistSyncTarget(projectId, {
      rootPath: mapping.rootPath,
      resolvedRealPath: mapping.resolvedRealPath,
      componentsDir: input.componentsDirOverride,
      format: input.format,
    })
    input.onMapping?.(mapping)
  }

  // 2. POST the sync with the resolved target + componentsDir + format.
  const notice = await postSync({
    target: mapping.rootPath,
    componentsDir: mapping.componentsDir,
    format: input.format,
    selection,
  })
  input.onNotice?.(notice)
}

export function isAbortSyncError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error as SyncError & { aborted?: boolean }).aborted === true
  )
}
