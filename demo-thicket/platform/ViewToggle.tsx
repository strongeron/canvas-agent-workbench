import { LayoutGrid, Table } from "lucide-react"

type ViewMode = "card" | "table"

interface ViewToggleProps {
  view: ViewMode
  onChange: (view: ViewMode) => void
}

export function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div className="border-default inline-flex rounded-lg border bg-white p-1">
      <button
        onClick={() => onChange("card")}
        className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          view === "card"
            ? "bg-brand-600 text-white shadow-sm"
            : "text-muted-foreground hover:bg-surface-50 hover:text-foreground"
        }`}
        aria-label="Card view"
      >
        <LayoutGrid className="h-4 w-4" />
        <span className="hidden sm:inline">Cards</span>
      </button>
      <button
        onClick={() => onChange("table")}
        className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          view === "table"
            ? "bg-brand-600 text-white shadow-sm"
            : "text-muted-foreground hover:bg-surface-50 hover:text-foreground"
        }`}
        aria-label="Table view"
      >
        <Table className="h-4 w-4" />
        <span className="hidden sm:inline">Table</span>
      </button>
    </div>
  )
}
