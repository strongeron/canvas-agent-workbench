import { Activity, Bot, FileText, PencilLine, User, X } from "lucide-react"

import type { CanvasActivityEvent } from "../../hooks/useCanvasActivityFeed"

interface CanvasActivityPanelProps {
  events: CanvasActivityEvent[]
  onClose: () => void
}

function relativeTime(iso: string) {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ""
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000))
  if (seconds < 5) return "just now"
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  return `${Math.round(minutes / 60)}h ago`
}

function kindMeta(event: CanvasActivityEvent) {
  switch (event.kind) {
    case "source-edit":
      return { icon: PencilLine, label: event.summary || event.action || "source edit" }
    case "file-lifecycle":
      return { icon: FileText, label: event.action || "file change" }
    case "user-action":
      return { icon: User, label: event.action || "edit" }
    case "operation-queued":
    case "operation-applied":
      return { icon: Bot, label: event.action || "agent operation" }
    default:
      return { icon: Activity, label: "state sync" }
  }
}

function actorBadge(actor: CanvasActivityEvent["actor"]) {
  if (actor === "agent") return { text: "Agent", className: "bg-violet-100 text-violet-700" }
  if (actor === "user") return { text: "You", className: "bg-brand-100 text-brand-700" }
  return { text: "System", className: "bg-surface-100 text-muted-foreground" }
}

export function CanvasActivityPanel({ events, onClose }: CanvasActivityPanelProps) {
  return (
    <div className="flex h-full w-80 shrink-0 flex-col border-l border-default bg-white" data-canvas-ignore="true">
      <div className="flex items-center justify-between border-b border-default px-4 py-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-brand-600" />
          <span className="text-sm font-semibold text-foreground">Activity</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground hover:bg-surface-100"
          aria-label="Close activity feed"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {events.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">
            No activity yet. User and agent edits appear here as they happen.
          </div>
        ) : (
          <ul className="space-y-1">
            {events.map((event) => {
              const { icon: Icon, label } = kindMeta(event)
              const badge = actorBadge(event.actor)
              return (
                <li
                  key={event.id}
                  className="flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-surface-50"
                >
                  <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${badge.className}`}
                      >
                        {badge.text}
                      </span>
                      <span className="truncate text-xs text-foreground">{label}</span>
                    </div>
                    <div className="mt-0.5 text-[10px] text-muted-foreground">
                      {relativeTime(event.createdAt)}
                      {event.sessionId ? ` · ${event.sessionId.slice(-6)}` : ""}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
