import type { ElementType, ReactNode } from "react"

import { cn } from "@/utils/cn"

export type TextTone = "default" | "muted" | "brand" | "inverse" | "error"
export type TextSize = "xs" | "sm" | "base" | "lg" | "xl" | "2xl"
export type TextWeight = "regular" | "medium" | "semibold" | "bold"
export type TextAlign = "left" | "center" | "right"

export interface TextProps {
  as?: ElementType
  children?: ReactNode
  tone?: TextTone
  size?: TextSize
  weight?: TextWeight
  align?: TextAlign
  className?: string
}

const toneStyles: Record<TextTone, string> = {
  default: "text-foreground",
  muted: "text-muted-foreground",
  brand: "text-brand-600",
  inverse: "text-inverse",
  error: "text-error",
}

const weightStyles: Record<TextWeight, string> = {
  regular: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
}

const alignStyles: Record<TextAlign, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
}

const sizeStyles: Record<TextSize, { fontSize: string; lineHeight: string }> = {
  xs: { fontSize: "var(--font-size-xs)", lineHeight: "var(--line-height-xs)" },
  sm: { fontSize: "var(--font-size-sm)", lineHeight: "var(--line-height-sm)" },
  base: { fontSize: "var(--font-size-base)", lineHeight: "var(--line-height-base)" },
  lg: { fontSize: "var(--font-size-lg)", lineHeight: "var(--line-height-lg)" },
  xl: { fontSize: "var(--font-size-xl)", lineHeight: "var(--line-height-xl)" },
  "2xl": { fontSize: "var(--font-size-2xl)", lineHeight: "var(--line-height-2xl)" },
}

export function Text({
  as: Component = "p",
  children = "Design systems work when the primitive layer stays predictable.",
  tone = "default",
  size = "base",
  weight = "regular",
  align = "left",
  className,
}: TextProps) {
  return (
    <Component
      data-slot="primitive-text"
      className={cn(toneStyles[tone], weightStyles[weight], alignStyles[align], className)}
      style={{
        fontFamily: "var(--font-family-sans)",
        fontSize: sizeStyles[size].fontSize,
        lineHeight: sizeStyles[size].lineHeight,
      }}
    >
      {children}
    </Component>
  )
}
