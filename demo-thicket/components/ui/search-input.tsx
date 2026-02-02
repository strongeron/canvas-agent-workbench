import { Search, X } from "lucide-react"
import type { InputHTMLAttributes } from "react"

export interface SearchInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  value: string
  onClear?: () => void
}

export function SearchInput({
  value,
  onClear,
  placeholder = "Search...",
  className = "",
  ...props
}: SearchInputProps) {
  const handleClear = () => {
    if (onClear) {
      onClear()
    }
  }

  return (
    <div className="relative w-full">
      <Search className="text-muted pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2" />
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        className={`text-foreground placeholder:text-muted focus:ring-brand-300 focus:border-brand-300 border-default hover:border-strong disabled:bg-surface-100 disabled:text-disabled h-11 w-full rounded-lg border bg-white px-4 py-3 pl-10 transition-all duration-200 focus:ring-1 focus:outline-none disabled:cursor-not-allowed ${value ? "pr-10" : ""} ${className}`}
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transition-colors"
          aria-label="Clear search"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}
