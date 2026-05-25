import type { McpCallRecord } from "../../utils/mcpApp"

interface CanvasMcpAppCallLogProps {
  records?: McpCallRecord[]
}

function summarizeResult(result: unknown) {
  if (result == null) return "No result"
  if (typeof result === "string") return result
  try {
    return JSON.stringify(result)
  } catch {
    return "Unserializable result"
  }
}

export function CanvasMcpAppCallLog({ records = [] }: CanvasMcpAppCallLogProps) {
  if (records.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-default bg-surface-50 px-3 py-4 text-xs text-muted-foreground">
        No tool calls yet.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {records.map((record) => (
        <div key={record.id} className="rounded-lg border border-default bg-white px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate text-xs font-semibold text-foreground">{record.toolName}</div>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                record.status === "success"
                  ? "bg-emerald-100 text-emerald-700"
                  : record.status === "error"
                    ? "bg-red-100 text-red-700"
                    : "bg-amber-100 text-amber-700"
              }`}
            >
              {record.status}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {new Date(record.startedAt).toLocaleString()}
          </div>
          {record.args && (
            <pre className="mt-2 overflow-x-auto rounded bg-surface-50 p-2 text-[10px] text-muted-foreground">
              {JSON.stringify(record.args, null, 2)}
            </pre>
          )}
          {(record.result || record.error) && (
            <div className="mt-2 line-clamp-4 text-[11px] text-foreground">
              {record.error || summarizeResult(record.result)}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
