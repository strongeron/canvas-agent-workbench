import type { ElementType, ReactNode } from "react"

import { cn } from "@/utils/cn"

export type BoxPadding = "none" | "sm" | "md" | "lg" | "xl"
export type BoxSurface = "transparent" | "subtle" | "default" | "brand" | "inverse"
export type BoxRadius = "none" | "sm" | "md" | "lg" | "xl"
export type BoxShadow = "none" | "sm" | "md" | "card"

export interface BoxProps {
  as?: ElementType
  children?: ReactNode
  padding?: BoxPadding
  surface?: BoxSurface
  border?: boolean
  radius?: BoxRadius
  shadow?: BoxShadow
  className?: string
}

const paddingStyles: Record<BoxPadding, string> = {
  none: "0px",
  sm: "var(--space-300)",
  md: "var(--space-400)",
  lg: "var(--space-500)",
  xl: "var(--space-600)",
}

const surfaceStyles: Record<BoxSurface, string> = {
  transparent: "bg-transparent text-foreground",
  subtle: "bg-surface-dim text-foreground",
  default: "bg-surface text-foreground",
  brand: "bg-brand-500 text-inverse",
  inverse: "bg-foreground text-inverse",
}

const radiusStyles: Record<BoxRadius, string> = {
  none: "0px",
  sm: "var(--radius-sm)",
  md: "var(--radius)",
  lg: "var(--radius-lg)",
  xl: "var(--radius-xl)",
}

const shadowStyles: Record<BoxShadow, string> = {
  none: "none",
  sm: "var(--shadow-sm)",
  md: "var(--shadow)",
  card: "var(--shadow-card)",
}

export function Box({
  as: Component = "div",
  children,
  padding = "md",
  surface = "default",
  border = false,
  radius = "lg",
  shadow = "none",
  className,
}: BoxProps) {
  return (
    <Component
      data-slot="primitive-box"
      className={cn(
        "w-full",
        surfaceStyles[surface],
        border ? "border border-default" : "border border-transparent",
        className
      )}
      style={{
        padding: paddingStyles[padding],
        borderRadius: radiusStyles[radius],
        boxShadow: shadowStyles[shadow],
      }}
    >
      {children}
    </Component>
  )
}
