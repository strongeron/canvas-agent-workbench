import { ArrowLeft } from "lucide-react"

export interface MobileBackButtonProps {
  onClick: () => void
  label?: string
  className?: string
}

export function MobileBackButton({
  onClick,
  label = "Back",
  className = "",
}: MobileBackButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`text-foreground hover:bg-surface-50 absolute left-4 top-4 z-10 flex items-center gap-2 rounded-lg bg-white px-3 py-2 shadow-lg transition-all duration-200 hover:shadow-xl lg:hidden border border-default ${className}`}
    >
      <ArrowLeft className="h-4 w-4" />
      <span className="text-sm font-semibold">{label}</span>
    </button>
  )
}

