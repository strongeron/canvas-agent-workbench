import type { ReactNode } from "react"

interface ModalSectionProps {
  children: ReactNode
  title?: string
  className?: string
  spacing?: "tight" | "normal" | "loose"
}

const spacingClasses = {
  tight: "space-y-2",
  normal: "space-y-4",
  loose: "space-y-6",
}

export function ModalSection({
  children,
  title,
  className = "",
  spacing = "normal",
}: ModalSectionProps) {
  return (
    <div className={`${spacingClasses[spacing]} ${className}`}>
      {title && (
        <h3 className="text-foreground text-sm font-semibold">{title}</h3>
      )}
      {children}
    </div>
  )
}
