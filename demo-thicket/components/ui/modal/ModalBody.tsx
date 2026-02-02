import type { ReactNode } from "react"

interface ModalBodyProps {
  children: ReactNode
  className?: string
  padding?: "none" | "small" | "medium" | "large"
  id?: string
}

// Full vertical padding (py-*) for modals without header
const paddingClasses = {
  none: "",
  small: "py-4",
  medium: "py-6",
  large: "py-8",
}
export function ModalBody({
  children,
  className = "",
  padding = "medium",
  id,
}: ModalBodyProps) {
  const paddingClass = paddingClasses[padding]

  return (
    <div id={id} className={`${paddingClass} ${className}`}>
      {children}
    </div>
  )
}
