import type { ButtonHTMLAttributes, ReactNode } from "react"

import { cn } from "@/utils/cn"

export type PrimitiveButtonVariant = "primary" | "secondary" | "ghost" | "danger"
export type PrimitiveButtonSize = "sm" | "md" | "lg"

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode
  variant?: PrimitiveButtonVariant
  size?: PrimitiveButtonSize
  fullWidth?: boolean
}

const variantStyles: Record<PrimitiveButtonVariant, string> = {
  primary: "bg-brand-600 text-inverse hover:bg-brand-700",
  secondary: "border border-default bg-surface text-foreground hover:bg-surface-dim",
  ghost: "bg-transparent text-foreground hover:bg-surface-dim",
  danger: "bg-error text-inverse hover:opacity-90",
}

const sizeStyles: Record<PrimitiveButtonSize, string> = {
  sm: "min-h-9 px-3 text-sm",
  md: "min-h-10 px-4 text-sm",
  lg: "min-h-12 px-5 text-base",
}

export function Button({
  children = "Primary action",
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      data-slot="primitive-button"
      className={cn(
        "inline-flex items-center justify-center rounded-[var(--radius)] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && "w-full",
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
