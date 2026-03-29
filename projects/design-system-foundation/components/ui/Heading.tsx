import type { ElementType, ReactNode } from "react"

import { cn } from "@/utils/cn"

export type HeadingLevel = "h1" | "h2" | "h3" | "h4"
export type HeadingTone = "default" | "muted" | "brand" | "inverse"
export type HeadingAlign = "left" | "center" | "right"

export interface HeadingProps {
  as?: HeadingLevel
  children?: ReactNode
  tone?: HeadingTone
  align?: HeadingAlign
  className?: string
}

const toneStyles: Record<HeadingTone, string> = {
  default: "text-foreground",
  muted: "text-muted-foreground",
  brand: "text-brand-600",
  inverse: "text-inverse",
}

const alignStyles: Record<HeadingAlign, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
}

const sizeStyles: Record<HeadingLevel, { fontSize: string; lineHeight: string }> = {
  h1: { fontSize: "var(--font-size-4xl)", lineHeight: "var(--line-height-4xl)" },
  h2: { fontSize: "var(--font-size-3xl)", lineHeight: "var(--line-height-3xl)" },
  h3: { fontSize: "var(--font-size-2xl)", lineHeight: "var(--line-height-2xl)" },
  h4: { fontSize: "var(--font-size-xl)", lineHeight: "var(--line-height-xl)" },
}

export function Heading({
  as: Component = "h2",
  children = "Build from primitives, not one-off sections.",
  tone = "default",
  align = "left",
  className,
}: HeadingProps) {
  return (
    <Component
      data-slot="primitive-heading"
      className={cn("tracking-tight", toneStyles[tone], alignStyles[align], className)}
      style={{
        fontFamily: "var(--font-family-display)",
        fontSize: sizeStyles[Component].fontSize,
        lineHeight: sizeStyles[Component].lineHeight,
        fontWeight: "var(--font-weight-display)",
      }}
    >
      {children}
    </Component>
  )
}
