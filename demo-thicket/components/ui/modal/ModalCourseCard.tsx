import { BookOpen } from "lucide-react"
import type { ReactNode } from "react"

interface ModalCourseCardProps {
  title: string
  subtitle?: string
  coverUrl?: string
  children?: ReactNode
  className?: string
  /** Variant style: "card" for styled card with brand colors, "info" for minimal info display */
  variant?: "card" | "info"
}

export function ModalCourseCard({
  title,
  subtitle,
  coverUrl,
  children,
  className = "",
  variant = "card",
}: ModalCourseCardProps) {
  // Info variant: minimal display without image, border, or brand colors
  if (variant === "info") {
    return (
      <div className={`bg-surface-100 rounded-lg p-4 ${className}`}>
        <h3 className="text-foreground mb-1 font-semibold">{title}</h3>
        {subtitle && (
          <p className="text-muted-foreground text-sm">{subtitle}</p>
        )}
        {children}
      </div>
    )
  }

  // Card variant: styled card with brand colors, border, and optional image
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border border-brand-200 bg-brand-50/50 p-4 ${className}`}
    >
      {coverUrl ? (
        <img
          src={coverUrl}
          alt={title}
          className="h-14 w-14 flex-shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-brand-100">
          <BookOpen className="h-6 w-6 text-brand-700" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-foreground truncate text-sm font-semibold">{title}</p>
        {subtitle && (
          <p className="text-muted-foreground mt-0.5 text-xs">{subtitle}</p>
        )}
        {children}
      </div>
    </div>
  )
}
