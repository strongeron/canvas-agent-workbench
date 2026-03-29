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

const sizeStyles: Record<
  PrimitiveButtonSize,
  {
    minHeight: string
    paddingInline: string
    fontSize: string
    lineHeight: string
  }
> = {
  sm: {
    minHeight: "var(--size-control-sm)",
    paddingInline: "var(--space-300)",
    fontSize: "var(--font-size-sm)",
    lineHeight: "var(--line-height-sm)",
  },
  md: {
    minHeight: "var(--size-control-md)",
    paddingInline: "var(--space-300)",
    fontSize: "var(--font-size-base)",
    lineHeight: "var(--line-height-base)",
  },
  lg: {
    minHeight: "var(--size-control-lg)",
    paddingInline: "var(--space-400)",
    fontSize: "var(--font-size-lg)",
    lineHeight: "var(--line-height-lg)",
  },
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
        "inline-flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        variantStyles[variant],
        fullWidth && "w-full",
        className
      )}
      style={{
        minHeight: sizeStyles[size].minHeight,
        paddingInline: sizeStyles[size].paddingInline,
        fontSize: sizeStyles[size].fontSize,
        lineHeight: sizeStyles[size].lineHeight,
        borderRadius: "var(--radius)",
        fontWeight: "var(--font-weight-sans-medium)",
      }}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
