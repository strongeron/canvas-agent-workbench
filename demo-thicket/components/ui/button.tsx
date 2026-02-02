import type { LucideIcon } from "lucide-react"
import type { ButtonHTMLAttributes, ReactNode } from "react"

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "brand"
    | "primary"
    | "secondary"
    | "waitlist"
    | "waitlist-soft"
    | "enrolled"
    | "outline"
    | "ghost"
    | "cta"
    | "warning"
  children: ReactNode
  isLoading?: boolean
  rounded?: "full" | "lg" | "xl"
  icon?: LucideIcon
  iconStrokeWidth?: number
  size?: "sm" | "md" | "lg"
  fullWidth?: boolean
}

export function Button({
  variant = "primary",
  children,
  isLoading = false,
  rounded = "full",
  className = "",
  disabled,
  icon: Icon,
  iconStrokeWidth,
  size = "md",
  fullWidth,
  ...props
}: ButtonProps) {
  const defaultFullWidth = variant !== "cta"
  const actualFullWidth = fullWidth ?? defaultFullWidth

  const strokeWidth =
    iconStrokeWidth ??
    (variant === "brand" ||
    variant === "primary" ||
    variant === "waitlist" ||
    variant === "waitlist-soft" ||
    variant === "cta"
      ? 2.5
      : 2)

  const roundedClass =
    rounded === "full"
      ? "rounded-full"
      : rounded === "xl"
        ? "rounded-xl"
        : "rounded-lg"

  const sizeStyles = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-sm",
    lg: "px-8 py-4 text-lg",
  }

  const widthClass = actualFullWidth ? "w-full" : "w-auto"

  // Enrolled variant is always disabled
  const isDisabled = disabled || isLoading || variant === "enrolled"

  const baseStyles = `
    ${sizeStyles[size]} ${roundedClass} ${widthClass}
    font-semibold font-display
    transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-brand-500
    cursor-pointer
    disabled:cursor-not-allowed disabled:pointer-events-none
    flex items-center justify-center gap-2
  `

  const variantStyles = {
    brand: `
      bg-brand-600 text-inverse
      hover:bg-brand-700
      active:bg-brand-800 active:scale-[0.98]
      disabled:opacity-50
    `,
    primary: `
      bg-brand-600 text-inverse
      hover:bg-brand-700
      active:bg-brand-800 active:scale-[0.98]
      disabled:opacity-50
    `,
    secondary: `
      bg-surface-100 text-muted-foreground border border-default
      hover:bg-surface-200
      active:bg-surface-300
      disabled:opacity-50
    `,
    waitlist: `
      bg-white text-brand-600 border-2 border-brand-600
      hover:bg-brand-50 hover:text-brand-700 hover:border-brand-700
      active:bg-brand-100 active:scale-[0.98]
      disabled:opacity-50
    `,
    "waitlist-soft": `
      bg-brand-100 text-brand-700 border-2 border-transparent
      hover:bg-brand-200 hover:text-brand-800
      active:bg-brand-200 active:scale-[0.98]
      disabled:opacity-50
    `,
    enrolled: `
      bg-surface-50 text-disabled border-2 border-subtle
    `,
    outline: `
      bg-transparent text-muted-foreground border border-default
      hover:bg-surface-100 hover:border-strong
      active:bg-surface-200
      disabled:opacity-50
    `,
    ghost: `
      bg-transparent text-muted-foreground
      hover:bg-surface-100
      active:bg-surface-200
      disabled:opacity-50
    `,
    cta: `
      bg-brand-600 text-inverse shadow-sm
      hover:bg-brand-700 hover:shadow-md
      active:bg-brand-800 active:scale-[0.98]
      disabled:opacity-50
    `,
    warning: `
      bg-amber-600 text-white
      hover:bg-amber-700
      active:bg-amber-800 active:scale-[0.98]
      disabled:opacity-50
    `,
  }

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      disabled={isDisabled}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Loading...
        </>
      ) : (
        <>
          {Icon && (
            <Icon
              className="h-5 w-5 shrink-0"
              strokeWidth={strokeWidth}
              style={{ strokeLinecap: "round", strokeLinejoin: "round" }}
            />
          )}
          {children}
        </>
      )}
    </button>
  )
}
