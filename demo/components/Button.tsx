/**
 * Demo Button Component
 */

import { clsx } from "clsx"
import { Loader2 } from "lucide-react"

export interface ButtonProps {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive"
  size?: "sm" | "md" | "lg"
  children: React.ReactNode
  className?: string
  disabled?: boolean
  isLoading?: boolean
  fullWidth?: boolean
  onClick?: () => void
}

export function Button({
  variant = "primary",
  size = "md",
  children,
  className,
  disabled,
  isLoading,
  fullWidth,
  onClick,
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"

  const variantStyles = {
    primary:
      "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:bg-blue-300",
    secondary:
      "bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500 disabled:bg-gray-50 disabled:text-gray-400",
    outline:
      "border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500 disabled:bg-gray-50 disabled:text-gray-400",
    ghost:
      "text-gray-700 hover:bg-gray-100 focus:ring-gray-500 disabled:text-gray-400",
    destructive:
      "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:bg-red-300",
  }

  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm gap-1.5",
    md: "px-4 py-2 text-sm gap-2",
    lg: "px-6 py-3 text-base gap-2",
  }

  return (
    <button
      className={clsx(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && "w-full",
        (disabled || isLoading) && "cursor-not-allowed",
        className
      )}
      disabled={disabled || isLoading}
      onClick={onClick}
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
}
