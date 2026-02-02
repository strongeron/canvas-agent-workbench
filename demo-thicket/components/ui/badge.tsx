import type { LucideIcon } from "lucide-react"

interface BadgeProps {
  icon?: LucideIcon
  children: React.ReactNode
  size?: "xs" | "sm" | "md" | "lg"
  variant?:
    | "default"
    | "brand"
    | "brand-filled"
    | "brand-outline"
    | "filled"
    | "primary"
    | "secondary"
    | "success"
    | "info"
    | "warning"
    | "neutral"
  className?: string
}

export function Badge({
  icon: Icon,
  children,
  size = "md",
  variant = "default",
  className = "",
}: BadgeProps) {
  const sizeStyles = {
    xs: "px-2 py-1 text-[10px] gap-1",
    sm: "px-2 py-1 text-xs gap-1",
    md: "px-3 py-1 text-sm gap-2",
    lg: "px-4 py-2 text-base gap-2",
  }

  const iconSizes = {
    xs: "w-2.5 h-2.5",
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  }

  const variantStyles = {
    default: "bg-neutral-100 text-muted-foreground",
    brand: "bg-brand-50 text-brand-primary border border-brand-200",
    "brand-filled": "bg-brand-400 text-white border border-brand-400",
    "brand-outline": "bg-transparent text-brand-700 border border-brand-400",
    filled:
      "bg-linear-to-br from-brand-50 to-brand-100 text-brand-700 border border-brand-200",
    primary: "bg-brand-100 text-brand-700 border border-brand-200",
    secondary: "bg-surface-100 text-muted-foreground border border-default",
    success: "bg-green-100 text-green-700 border border-green-200",
    info: "bg-blue-100 text-blue-700 border border-blue-200",
    warning: "bg-amber-100 text-amber-700 border border-amber-200",
    neutral: "bg-neutral-100 text-neutral-700 border border-neutral-200",
  }

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium text-nowrap ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {Icon && <Icon className={iconSizes[size]} />}
      {children}
    </span>
  )
}
