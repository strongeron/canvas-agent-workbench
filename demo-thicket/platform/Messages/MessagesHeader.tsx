import { Plus } from "lucide-react"

export interface MessagesHeaderProps {
  unreadCount: number
  onNewMessage: () => void
  disabled?: boolean
  title?: string
}

export function MessagesHeader({
  unreadCount,
  onNewMessage,
  disabled = false,
  title = "Messages",
}: MessagesHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <h1 className="font-display text-foreground mb-1 text-2xl font-bold">
          {title}
        </h1>
        <p className="text-muted-foreground text-sm">
          {unreadCount > 0
            ? `${unreadCount} unread message${unreadCount === 1 ? "" : "s"}`
            : "All caught up! No new messages."}
        </p>
      </div>
      <button
        onClick={onNewMessage}
        disabled={disabled}
        className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">New</span>
      </button>
    </div>
  )
}

