/**
 * Validate a projectId before using it in any filesystem path. Existing
 * project IDs in this repo use lowercase ASCII letters, digits, hyphens, and
 * underscores (see directories under projects/). Anything else — `..`,
 * forward / backward slashes, null bytes, leading dots — is a path-traversal
 * attempt and must be rejected at the API boundary, not silently joined into
 * a path.
 *
 * Returns the trimmed, validated projectId, or an empty string if invalid.
 */
const PROJECT_ID_PATTERN = /^[a-z0-9][a-z0-9_-]*$/i

export function sanitizeProjectId(value: unknown): string {
  if (typeof value !== "string") return ""
  const trimmed = value.trim()
  if (!trimmed) return ""
  if (trimmed.length > 128) return ""
  if (trimmed.includes("\0")) return ""
  if (!PROJECT_ID_PATTERN.test(trimmed)) return ""
  return trimmed
}
