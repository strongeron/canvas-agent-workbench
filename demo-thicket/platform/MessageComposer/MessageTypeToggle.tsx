import { Megaphone, User } from "lucide-react"

interface MessageTypeToggleProps {
  value: "individual" | "announcement"
  onChange: (value: "individual" | "announcement") => void
  disabled?: boolean
}

export function MessageTypeToggle({ value, onChange, disabled = false }: MessageTypeToggleProps) {
  return (
    <div>
      <label className="text-foreground mb-2 block text-sm font-medium">Message Type</label>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => onChange("individual")}
          disabled={disabled}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            value === "individual"
              ? "border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-500/20"
              : "border-default bg-white text-muted-foreground hover:border-surface-300 hover:bg-surface-50"
          }`}
        >
          <User className="h-4 w-4" />
          Individual Message
        </button>
        <button
          type="button"
          onClick={() => onChange("announcement")}
          disabled={disabled}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            value === "announcement"
              ? "border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-500/20"
              : "border-default bg-white text-muted-foreground hover:border-surface-300 hover:bg-surface-50"
          }`}
        >
          <Megaphone className="h-4 w-4" />
          Course Announcement
        </button>
      </div>
    </div>
  )
}
