import { useEffect, useRef, useState } from "react"

import type { McpCallRecord, McpToolDescriptor } from "../../utils/mcpApp"
import { parseJsonObjectInput } from "../../utils/mcpApp"

interface CanvasMcpAppToolPaletteProps {
  projectId: string
  nodeId: string
  tools?: McpToolDescriptor[]
  recentCalls?: McpCallRecord[]
  onCallsUpdate: (calls: McpCallRecord[]) => void
}

// Merge a freshly returned recentCalls snapshot into the prior one by id,
// keeping the most-recent record per id and bounded by the same 100-record
// cap the server uses. Avoids the wholesale-replace race where a slow
// in-flight call returns a stale snapshot that drops records belonging to
// a parallel-but-already-completed call.
export function mergeRecentCallsById(
  prior: McpCallRecord[],
  next: McpCallRecord[]
): McpCallRecord[] {
  const byId = new Map<string, McpCallRecord>()
  for (const record of prior) {
    if (record?.id) byId.set(record.id, record)
  }
  for (const record of next) {
    if (!record?.id) continue
    const existing = byId.get(record.id)
    if (!existing) {
      byId.set(record.id, record)
      continue
    }
    // Prefer the more-progressed record (finished > running) so a stale
    // snapshot cannot overwrite a completed record back into "running".
    if (existing.status === "running" && record.status !== "running") {
      byId.set(record.id, record)
    }
  }
  return Array.from(byId.values())
    .sort((a, b) => (b.startedAt ?? "").localeCompare(a.startedAt ?? ""))
    .slice(0, 100)
}

export function CanvasMcpAppToolPalette({
  projectId,
  nodeId,
  tools = [],
  recentCalls = [],
  onCallsUpdate,
}: CanvasMcpAppToolPaletteProps) {
  const [busyToolName, setBusyToolName] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  // Keep the prior recentCalls available in a ref so the invoke handler can
  // merge into the latest snapshot without depending on stale closure state.
  const recentCallsRef = useRef<McpCallRecord[]>(recentCalls)
  useEffect(() => {
    recentCallsRef.current = recentCalls
  }, [recentCalls])

  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  if (tools.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-default bg-surface-50 px-3 py-4 text-xs text-muted-foreground">
        Connect the app to load its tool palette.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {tools.map((tool) => (
        <div key={tool.name} className="rounded-lg border border-default bg-white p-3">
          <div className="text-sm font-semibold text-foreground">{tool.name}</div>
          {tool.description && (
            <div className="mt-1 text-xs text-muted-foreground">{tool.description}</div>
          )}
          <textarea
            value={drafts[tool.name] ?? "{}"}
            onChange={(event) =>
              setDrafts((current) => ({ ...current, [tool.name]: event.target.value }))
            }
            rows={4}
            spellCheck={false}
            className="mt-3 w-full rounded-md border border-default bg-surface-50 px-3 py-2 font-mono text-[11px] text-foreground focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="truncate text-[11px] text-muted-foreground">
              {tool.inputSchema ? "JSON object arguments" : "No schema provided"}
            </div>
            <button
              type="button"
              disabled={busyToolName === tool.name}
              onClick={async () => {
                setBusyToolName(tool.name)
                setError(null)
                try {
                  const args = parseJsonObjectInput(drafts[tool.name] ?? "{}")
                  const response = await fetch("/api/canvas/mcp-app/invoke-tool", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      projectId,
                      nodeId,
                      toolName: tool.name,
                      args,
                    }),
                  })
                  const payload = await response.json().catch(() => ({}))
                  if (!response.ok || !payload?.ok) {
                    throw new Error(payload?.error || "Tool invocation failed.")
                  }
                  const incoming = Array.isArray(payload.recentCalls) ? payload.recentCalls : []
                  const merged = mergeRecentCallsById(recentCallsRef.current, incoming)
                  recentCallsRef.current = merged
                  if (mountedRef.current) onCallsUpdate(merged)
                } catch (invokeError) {
                  if (mountedRef.current) {
                    setError(
                      invokeError instanceof Error ? invokeError.message : "Tool invocation failed."
                    )
                  }
                } finally {
                  if (mountedRef.current) {
                    setBusyToolName((current) => (current === tool.name ? null : current))
                  }
                }
              }}
              className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busyToolName === tool.name ? "Invoking..." : "Invoke"}
            </button>
          </div>
        </div>
      ))}
      {error && <div className="text-xs text-red-600">{error}</div>}
    </div>
  )
}
