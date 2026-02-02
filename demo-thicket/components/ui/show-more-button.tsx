import { ChevronDown, ChevronUp } from "lucide-react"
import type { ButtonHTMLAttributes } from "react"

interface ShowMoreButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isExpanded: boolean
  onToggle: () => void
}

export function ShowMoreButton({
  isExpanded,
  onToggle,
  className = "",
  ...props
}: ShowMoreButtonProps) {
  return (
    <button
      onClick={onToggle}
      className={`font-display group border-brand-600 text-brand-600 hover:border-brand-700 hover:bg-brand-50 hover:text-brand-700 active:bg-brand-100 mx-auto flex items-center gap-2 rounded-full border-2 bg-white px-8 py-3 text-base font-semibold transition-all duration-200 focus:outline-none active:scale-[0.98] ${className}`}
      {...props}
    >
      <span>{isExpanded ? "Show Less" : "Show More"}</span>
      {isExpanded ? (
        <ChevronUp
          className="h-5 w-5 transition-transform duration-200 group-hover:-translate-y-0.5"
          strokeWidth={2.5}
        />
      ) : (
        <ChevronDown
          className="h-5 w-5 transition-transform duration-200 group-hover:translate-y-0.5"
          strokeWidth={2.5}
        />
      )}
    </button>
  )
}
