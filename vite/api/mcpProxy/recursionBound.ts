export const MAX_MCP_APP_CALLER_DEPTH = 3

/**
 * Validate a server-side in-flight depth before issuing a new MCP-app tool
 * call. Replaces the previous client-supplied depth header, which was trivially
 * bypassed by any external MCP server calling back into our proxy with no
 * header.
 *
 * Tradeoff vs. the correlationId chain spec: this enforces depth *per
 * registry entry* (a single connection) rather than across the global call
 * graph. It still bounds the agent-of-agents fork-bomb scenario the original
 * spec was protecting against, with the upside that it cannot be bypassed
 * by a peer dropping or rewriting headers.
 */
export function validateInFlightDepth(inflight: number) {
  if (inflight >= MAX_MCP_APP_CALLER_DEPTH) {
    return {
      ok: false as const,
      status: 429,
      code: "recursion-too-deep",
      error: `Embedded MCP in-flight depth ${inflight} would exceed the limit of ${MAX_MCP_APP_CALLER_DEPTH}.`,
    }
  }
  return { ok: true as const, depth: inflight + 1 }
}
