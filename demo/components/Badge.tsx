/**
 * Demo Badge Component
 */

import { clsx } from "clsx"

export interface BadgeProps {
  variant?: "default" | "success" | "warning" | "error" | "info"
  size?: "sm" | "md"
  children: React.ReactNode
}

export function Badge({ variant = "default", size = "md", children }: BadgeProps) {
  const baseStyles = "inline-flex items-center rounded-full font-medium"

  const variantStyles = {
    default: "bg-gray-100 text-gray-700",
    success: "bg-green-100 text-green-700",
    warning: "bg-amber-100 text-amber-700",
    error: "bg-red-100 text-red-700",
    info: "bg-blue-100 text-blue-700",
  }

  const sizeStyles = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-0.5 text-sm",
  }

  return (
    <span className={clsx(baseStyles, variantStyles[variant], sizeStyles[size])}>
      {children}
    </span>
  )
}
