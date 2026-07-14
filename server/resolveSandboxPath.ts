import { promises as fs } from "node:fs"
import path from "node:path"

// Generalized path-safety guard for an ARBITRARY user-picked root (Root B).
//
// This is the higher-risk twin of `resolveWorkspacePath` in
// `server/canvasAstWrite.ts`. The AST endpoints sandbox to the repo root
// (`__dirname`) and keep their own `resolveWorkspacePath(__dirname)` — that
// root is a fixed, trusted constant. This guard is for the Sync endpoint,
// which writes OUTSIDE the repo into a folder the user picked at runtime.
//
// INVARIANT: the two guards are SEPARATELY INSTANTIATED. The `sandboxRoot`
// parameter here is ALWAYS the user-picked Root B and is NEVER passed the
// repo root, and `resolveWorkspacePath` is NEVER passed Root B. Sharing the
// root parameter between the two would let a Sync request reach repo files
// (or an AST write reach the external tree); they must stay disjoint.
//
// Shape (mirrors `resolveWorkspacePath`):
//   1. `path.resolve(sandboxRoot, filePath)`
//   2. `path.relative(sandboxRoot, resolved)` — reject if it starts with
//      `..` or is absolute (lexical traversal guard)
//   3. extension allowlist
//   PLUS, because the root is untrusted and may contain symlinks:
//   4. `fs.realpath` containment — resolve symlinks on the deepest existing
//      ancestor and reject if the real path escapes the real sandbox root.
//      A symlinked subdir that points outside the sandbox is rejected even
//      though the lexical check passes.
//
// TOCTOU: step 4 is a check. Between the check and the eventual `fs.rename`
// an attacker could swap a path component for a symlink that escapes the
// sandbox (check-then-use race). `assertRealpathStable` re-runs the realpath
// containment check on the FINAL destination immediately before the rename
// and rejects on divergence, closing that window on this higher-risk root.

export interface ResolveSandboxPathOk {
  ok: true
  /** Absolute, lexically- and realpath-validated path inside the sandbox. */
  resolved: string
  /**
   * The realpath of the nearest existing ancestor at validation time. Pass
   * this to `assertRealpathStable` right before the rename so a symlink swap
   * during the stage→rename window is detected.
   */
  validatedRealRoot: string
}

export interface ResolveSandboxPathErr {
  ok: false
  code: "bad-path" | "bad-extension" | "escapes-sandbox" | "realpath-failed"
  error: string
}

export type ResolveSandboxPathResult = ResolveSandboxPathOk | ResolveSandboxPathErr

/**
 * Resolve `filePath` against `sandboxRoot`, rejecting traversal, disallowed
 * extensions, and symlink escapes. The sandbox root itself is realpath'd so a
 * symlinked picked root is handled correctly (we compare real-to-real).
 *
 * `sandboxRoot` MUST be the user-picked Root B — never the repo root.
 */
export async function resolveSandboxPath(
  filePath: string,
  sandboxRoot: string,
  allowedExtensions: string[]
): Promise<ResolveSandboxPathResult> {
  if (typeof filePath !== "string" || filePath.trim() === "") {
    return { ok: false, code: "bad-path", error: "filePath must be a non-empty string." }
  }
  if (typeof sandboxRoot !== "string" || sandboxRoot.trim() === "") {
    return { ok: false, code: "bad-path", error: "sandboxRoot must be a non-empty string." }
  }
  if (filePath.includes("\0")) {
    return { ok: false, code: "bad-path", error: "filePath must not contain null bytes." }
  }

  const resolved = path.resolve(sandboxRoot, filePath)
  const relative = path.relative(sandboxRoot, resolved)
  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) {
    return {
      ok: false,
      code: "bad-path",
      error: "filePath must resolve to a file strictly inside the sandbox root.",
    }
  }

  const extension = path.extname(resolved).toLowerCase()
  if (!allowedExtensions.includes(extension)) {
    return {
      ok: false,
      code: "bad-extension",
      error: `Extension ${extension || "(none)"} is not allowed (allowed: ${allowedExtensions.join(", ")}).`,
    }
  }

  // Realpath containment. The sandbox root must exist and be realpath'd so we
  // compare resolved-symlink to resolved-symlink. The target file itself may
  // not exist yet (first sync), so realpath the nearest EXISTING ancestor and
  // require it to stay under the real sandbox root.
  let realSandboxRoot: string
  try {
    realSandboxRoot = await fs.realpath(sandboxRoot)
  } catch (error) {
    return {
      ok: false,
      code: "realpath-failed",
      error:
        error instanceof Error
          ? `Sandbox root could not be resolved: ${error.message}`
          : "Sandbox root could not be resolved.",
    }
  }

  const realAncestor = await realpathNearestAncestor(resolved)
  if (!realAncestor) {
    return {
      ok: false,
      code: "realpath-failed",
      error: "No existing ancestor of the target path could be resolved.",
    }
  }
  if (!isContained(realAncestor, realSandboxRoot)) {
    return {
      ok: false,
      code: "escapes-sandbox",
      error: "Resolved real path escapes the sandbox root (symlink traversal rejected).",
    }
  }

  return { ok: true, resolved, validatedRealRoot: realSandboxRoot }
}

/**
 * Re-run the realpath containment check on `resolved` IMMEDIATELY before the
 * `fs.rename`. Rejects if the nearest existing ancestor's real path no longer
 * sits under `validatedRealRoot` (a symlink was swapped between validation
 * and write — the check-then-use / TOCTOU window). Call this per destination,
 * just before each rename.
 */
export async function assertRealpathStable(
  resolved: string,
  validatedRealRoot: string
): Promise<ResolveSandboxPathErr | null> {
  const realAncestor = await realpathNearestAncestor(resolved)
  if (!realAncestor) {
    return {
      ok: false,
      code: "realpath-failed",
      error: "Destination ancestor vanished before write (TOCTOU guard).",
    }
  }
  if (!isContained(realAncestor, validatedRealRoot)) {
    return {
      ok: false,
      code: "escapes-sandbox",
      error: "Destination real path diverged from the validated sandbox root before write (TOCTOU guard).",
    }
  }
  return null
}

/**
 * Realpath the nearest existing ancestor of `target`, then append the
 * non-existing tail. This lets us validate a not-yet-created file: every
 * existing path component is symlink-resolved, the missing tail is appended
 * lexically (it cannot itself be a symlink because it does not exist).
 */
async function realpathNearestAncestor(target: string): Promise<string | null> {
  let current = target
  const tail: string[] = []
  // Walk up until an existing path is found. Bounded by the absolute root.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const real = await fs.realpath(current)
      return tail.length === 0 ? real : path.join(real, ...tail.reverse())
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") {
        return null
      }
      const parent = path.dirname(current)
      if (parent === current) {
        return null
      }
      tail.push(path.basename(current))
      current = parent
    }
  }
}

/**
 * True when `child` is `root` itself or strictly nested under it. Uses
 * path-relative analysis so `/a/bc` is NOT treated as contained in `/a/b`.
 */
function isContained(child: string, root: string): boolean {
  if (child === root) return true
  const rel = path.relative(root, child)
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel)
}
