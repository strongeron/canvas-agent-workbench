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
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
  xl: "p-8",
}

const surfaceStyles: Record<BoxSurface, string> = {
  transparent: "bg-transparent text-foreground",
  subtle: "bg-surface-dim text-foreground",
  default: "bg-surface text-foreground",
  brand: "bg-brand-500 text-inverse",
  inverse: "bg-foreground text-inverse",
}

const radiusStyles: Record<BoxRadius, string> = {
  none: "rounded-none",
  sm: "rounded",
  md: "rounded-[var(--radius)]",
  lg: "rounded-[var(--radius-lg)]",
  xl: "rounded-2xl",
}

const shadowStyles: Record<BoxShadow, string> = {
  none: "",
  sm: "shadow-sm",
  md: "shadow",
  card: "shadow-card",
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
        paddingStyles[padding],
        surfaceStyles[surface],
        radiusStyles[radius],
        shadowStyles[shadow],
        border ? "border border-default" : "border border-transparent",
        className
      )}
    >
      {children}
    </Component>
  )
}
