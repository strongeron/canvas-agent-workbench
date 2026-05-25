export const MAX_MCP_APP_CALLER_DEPTH = 3

export function validateCallerDepth(value: unknown) {
  const depth = Number.isFinite(value) ? Number(value) : 0
  if (depth > MAX_MCP_APP_CALLER_DEPTH) {
    return {
      ok: false as const,
      status: 429,
      code: "recursion-too-deep",
      error: `Embedded MCP recursion depth ${depth} exceeds the limit of ${MAX_MCP_APP_CALLER_DEPTH}.`,
    }
  }
  return {
    ok: true as const,
    callerDepth: Math.max(0, depth),
  }
}
