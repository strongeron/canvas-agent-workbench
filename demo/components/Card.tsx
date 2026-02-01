/**
 * Demo Card Component
 */

import { clsx } from "clsx"

export interface CardProps {
  title?: string
  description?: string
  children?: React.ReactNode
  variant?: "default" | "bordered" | "elevated"
  padding?: "none" | "sm" | "md" | "lg"
}

export function Card({
  title,
  description,
  children,
  variant = "default",
  padding = "md",
}: CardProps) {
  const baseStyles = "rounded-xl bg-white"

  const variantStyles = {
    default: "border border-gray-200",
    bordered: "border-2 border-gray-300",
    elevated: "shadow-lg",
  }

  const paddingStyles = {
    none: "",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  }

  return (
    <div className={clsx(baseStyles, variantStyles[variant], paddingStyles[padding])}>
      {(title || description) && (
        <div className={clsx(children && "mb-4")}>
          {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
          {description && (
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          )}
        </div>
      )}
      {children}
    </div>
  )
}
