// /api/canvas/project/detect-components-dir — probe a user-picked external
// root for its components directory and sniff its framework.
//
// ============================================================================
//  SECURITY HEADER — READ BEFORE EDITING
// ============================================================================
//
//  This endpoint reads INSIDE a user-picked external root (Root B). It only
//  ever:
//   - probes a FIXED, hard-coded ordered list of candidate subdirectories
//     (`src/components`, `app/components`, `components`, `src/ui`,
//     `lib/components`) — none of these path segments come from the request
//     body or from any file content;
//   - reads `<root>/package.json` and inspects ONLY the KEY NAMES of its
//     `dependencies` / `devDependencies` / `peerDependencies` maps for a
//     framework sniff.
//
//  CRITICAL INVARIANT: no value read from `package.json` (or any file) is
//  EVER used as a path segment / path join. A malicious `package.json` whose
//  dependency *value* is `"../../etc"` cannot influence which directory is
//  probed — only the presence of a known KEY (`react`) drives the suggestion.
//  Only the picked root is joined with the fixed candidate list.
//
//  The resolved components-dir path returned for panel display is
//  HTML-escaped (`escapedDisplayPath`) so it cannot inject markup when the
//  client renders it.
//
//  Like the sync endpoint this is reachable only behind the localhost/origin
//  guard in `vite.config.ts`; it never writes.
// ============================================================================

import { promises as fs } from "node:fs"
import path from "node:path"

/** Fixed, hard-coded probe order. NEVER sourced from the request or a file. */
const CANDIDATE_DIRS = [
  "src/components",
  "app/components",
  "components",
  "src/ui",
  "lib/components",
] as const

/**
 * The only dependency KEY NAMES that drive the framework sniff. We read the
 * key set of the dependency maps and check membership — we never read a
 * dependency *value* and never use any value in a path.
 */
const REACT_DEP_KEYS = ["react", "react-dom", "next", "@remix-run/react", "gatsby"]

export interface DetectComponentsDirBody {
  /** Absolute path to the user-picked external root (Root B). */
  rootPath?: unknown
}

export interface DetectComponentsDirOk {
  ok: true
  /**
   * The chosen components dir RELATIVE to `rootPath` (first existing
   * candidate), or `""` when none of the candidates exist (caller must show
   * the override input).
   */
  resolvedComponentsDir: string
  /**
   * Every candidate with an `exists` flag, in fixed probe order, so the panel
   * can offer an override pick when detection is ambiguous / none.
   */
  candidates: Array<{ dir: string; exists: boolean }>
  /** Absolute realpath of the picked root (for the persisted mapping). */
  resolvedRealPath: string
  /** `"html+tsx"` when a React-family dep KEY is present, else `"html"`. */
  frameworkSuggestion: "html" | "html+tsx"
  /**
   * The resolved components dir for panel display, HTML-escaped. Equals
   * `<rootPath>/<resolvedComponentsDir>` (or just `<rootPath>` when none).
   */
  escapedDisplayPath: string
}

export interface DetectComponentsDirErr {
  ok: false
  status: number
  code: string
  error: string
}

export type DetectComponentsDirResponse = DetectComponentsDirOk | DetectComponentsDirErr

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

async function isDirectory(absPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(absPath)
    return stat.isDirectory()
  } catch {
    return false
  }
}

/**
 * Read `<root>/package.json` and return ONLY the union of dependency KEY
 * names across `dependencies`, `devDependencies`, `peerDependencies`. Never
 * returns or inspects any value. A missing / malformed package.json yields an
 * empty set (no crash; just no framework sniff).
 */
async function readDependencyKeyNames(rootPath: string): Promise<Set<string>> {
  const keys = new Set<string>()
  let raw: string
  try {
    raw = await fs.readFile(path.join(rootPath, "package.json"), "utf8")
  } catch {
    return keys
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return keys
  }
  if (!parsed || typeof parsed !== "object") return keys
  const pkg = parsed as Record<string, unknown>
  for (const field of ["dependencies", "devDependencies", "peerDependencies"]) {
    const map = pkg[field]
    if (map && typeof map === "object" && !Array.isArray(map)) {
      // Only the KEY NAMES are read — values are never touched, so a
      // malicious value like "../../etc" cannot affect anything.
      for (const key of Object.keys(map as Record<string, unknown>)) {
        keys.add(key)
      }
    }
  }
  return keys
}

export async function applyCanvasProjectDetectComponentsDirRequest(
  body: DetectComponentsDirBody
): Promise<DetectComponentsDirResponse> {
  const rootPathRaw = typeof body.rootPath === "string" ? body.rootPath.trim() : ""
  if (!rootPathRaw) {
    return { ok: false, status: 400, code: "bad-input", error: "rootPath is required." }
  }
  if (rootPathRaw.includes("\0")) {
    return { ok: false, status: 400, code: "bad-path", error: "rootPath must not contain null bytes." }
  }

  const rootPath = path.resolve(rootPathRaw)

  let resolvedRealPath: string
  try {
    resolvedRealPath = await fs.realpath(rootPath)
  } catch (error) {
    return {
      ok: false,
      status: 404,
      code: "root-missing",
      error:
        error instanceof Error
          ? `Picked folder could not be resolved: ${error.message}`
          : "Picked folder could not be resolved.",
    }
  }
  if (!(await isDirectory(resolvedRealPath))) {
    return { ok: false, status: 400, code: "not-a-directory", error: "Picked path is not a directory." }
  }

  // Probe the FIXED candidate list against the realpath'd root. No request /
  // file value participates in these joins.
  const candidates: Array<{ dir: string; exists: boolean }> = []
  let resolvedComponentsDir = ""
  for (const dir of CANDIDATE_DIRS) {
    const exists = await isDirectory(path.join(resolvedRealPath, dir))
    candidates.push({ dir, exists })
    if (exists && resolvedComponentsDir === "") {
      resolvedComponentsDir = dir
    }
  }

  const depKeys = await readDependencyKeyNames(resolvedRealPath)
  const frameworkSuggestion: "html" | "html+tsx" = REACT_DEP_KEYS.some((k) => depKeys.has(k))
    ? "html+tsx"
    : "html"

  const displayPath = resolvedComponentsDir
    ? path.join(resolvedRealPath, resolvedComponentsDir)
    : resolvedRealPath

  return {
    ok: true,
    resolvedComponentsDir,
    candidates,
    resolvedRealPath,
    frameworkSuggestion,
    escapedDisplayPath: escapeHtml(displayPath),
  }
}
