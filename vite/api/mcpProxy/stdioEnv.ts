/**
 * Filter env before passing it to spawn. The persisted credentials object is
 * user-controlled, so we cannot forward it unfiltered: a value like
 * NODE_OPTIONS=--require=/tmp/evil.js or LD_PRELOAD=/tmp/x.so would let the
 * caller execute arbitrary code in the child process.
 *
 * Layers:
 *  1. Deny-list common code-injection vectors regardless of name shape.
 *  2. Allow only env names that match the canonical UPPER_SNAKE pattern.
 *  3. Seed the child env with a small allowlist of safe inherited vars from
 *     process.env (do NOT forward the full host environment — it leaks
 *     unrelated secrets).
 */
const DENYLIST = new Set([
  "NODE_OPTIONS",
  "LD_PRELOAD",
  "LD_LIBRARY_PATH",
  "LD_AUDIT",
  "DYLD_INSERT_LIBRARIES",
  "DYLD_LIBRARY_PATH",
  "DYLD_FRAMEWORK_PATH",
  "DYLD_FALLBACK_LIBRARY_PATH",
  "DYLD_FALLBACK_FRAMEWORK_PATH",
  "PYTHONPATH",
  "PYTHONSTARTUP",
  "PYTHONHOME",
  "PERL5LIB",
  "PERL5OPT",
  "RUBYOPT",
  "RUBYLIB",
])

const INHERIT_ALLOWLIST = ["PATH", "HOME", "USER", "LANG", "LC_ALL", "TZ", "SHELL"]

const NAME_PATTERN = /^[A-Z][A-Z0-9_]*$/

export function buildSafeStdioEnv(
  userEnv: Record<string, string> | undefined,
  hostEnv: NodeJS.ProcessEnv = process.env
): Record<string, string> {
  const out: Record<string, string> = {}

  for (const name of INHERIT_ALLOWLIST) {
    const value = hostEnv[name]
    if (typeof value === "string") out[name] = value
  }

  if (userEnv && typeof userEnv === "object" && !Array.isArray(userEnv)) {
    for (const [rawName, rawValue] of Object.entries(userEnv)) {
      if (typeof rawValue !== "string") continue
      const name = rawName
      if (DENYLIST.has(name)) continue
      if (!NAME_PATTERN.test(name)) continue
      out[name] = rawValue
    }
  }

  return out
}
