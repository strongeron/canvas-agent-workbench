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
// Exact names that are code-injection / shell-startup vectors regardless of the
// chosen server. BASH_ENV/ENV are sourced by non-interactive shells; IFS and
// the option vars rewrite shell parsing; HOSTALIASES/LOCPATH/GCONV_PATH are
// glibc loader vectors.
const DENY_EXACT = new Set([
  "NODE_OPTIONS",
  "BASH_ENV",
  "ENV",
  "IFS",
  "PROMPT_COMMAND",
  "CDPATH",
  "SHELLOPTS",
  "BASHOPTS",
  "GLOBIGNORE",
  "HOSTALIASES",
  "LOCPATH",
  "GCONV_PATH",
])

// Whole families that load code or hijack a runtime/tool: dynamic-linker vars,
// language runtime path/opt vars, the Node_/Git_ tool families, and exported
// bash functions (Shellshock).
const DENY_PREFIXES = ["LD_", "DYLD_", "PYTHON", "PERL", "RUBY", "NODE_", "GIT_", "BASH_FUNC_"]

// Names that are seeded from the host and must NOT be overridable by
// user-supplied creds (e.g. a cred named PATH would hijack the runner binary).
const INHERIT_ALLOWLIST = ["PATH", "HOME", "USER", "LANG", "LC_ALL", "TZ", "SHELL"]

const NAME_PATTERN = /^[A-Z][A-Z0-9_]*$/

function isDeniedEnvName(name: string): boolean {
  if (DENY_EXACT.has(name)) return true
  return DENY_PREFIXES.some((prefix) => name.startsWith(prefix))
}

export function buildSafeStdioEnv(
  userEnv: Record<string, string> | undefined,
  hostEnv: NodeJS.ProcessEnv = process.env
): Record<string, string> {
  const out: Record<string, string> = {}

  if (userEnv && typeof userEnv === "object" && !Array.isArray(userEnv)) {
    for (const [name, rawValue] of Object.entries(userEnv)) {
      if (typeof rawValue !== "string") continue
      if (!NAME_PATTERN.test(name)) continue
      if (isDeniedEnvName(name)) continue
      // Inherited names win — user creds may not override PATH/SHELL/HOME/etc.
      if (INHERIT_ALLOWLIST.includes(name)) continue
      // A newline in a value can inject extra entries / shell state in some
      // consumers; reject rather than forward control characters.
      if (/[\r\n\u0000]/.test(rawValue)) continue
      out[name] = rawValue
    }
  }

  // Seed inherited host vars LAST so they always win over any user entry.
  for (const name of INHERIT_ALLOWLIST) {
    const value = hostEnv[name]
    if (typeof value === "string") out[name] = value
  }

  return out
}
