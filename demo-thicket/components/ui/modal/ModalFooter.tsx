import type { ReactNode } from "react"

interface ModalFooterProps {
  children: ReactNode
  className?: string
  align?: "left" | "center" | "right" | "between"
  bordered?: boolean
}

const alignClasses = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
  between: "justify-between",
}

export function ModalFooter({
  children,
  className = "",
  align = "right",
  bordered = true,
}: ModalFooterProps) {
  return (
    <div
      className={`flex gap-3 pt-6 pb-6 ${bordered ? "border-t border-default" : ""} ${alignClasses[align]} ${className}`}
    >
      {children}
    </div>
  )
}
