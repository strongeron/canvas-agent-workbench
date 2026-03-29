import type { ElementType, ReactNode } from "react"

import { cn } from "@/utils/cn"

export type StackDirection = "vertical" | "horizontal"
export type StackGap = "none" | "xs" | "sm" | "md" | "lg" | "xl"
export type StackAlign = "start" | "center" | "end" | "stretch"
export type StackJustify = "start" | "center" | "end" | "between"

export interface StackProps {
  as?: ElementType
  direction?: StackDirection
  gap?: StackGap
  align?: StackAlign
  justify?: StackJustify
  items?: string[]
  children?: ReactNode
  className?: string
}

const gapStyles: Record<StackGap, string> = {
  none: "0px",
  xs: "var(--space-100)",
  sm: "var(--space-200)",
  md: "var(--space-300)",
  lg: "var(--space-400)",
  xl: "var(--space-500)",
}

const alignStyles: Record<StackAlign, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
}

const justifyStyles: Record<StackJustify, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
}

function FallbackItems({ items, direction }: { items: string[]; direction: StackDirection }) {
  return (
    <>
      {items.map((item, index) => (
        <div
          key={`${item}-${index}`}
          className={cn(
            "rounded-[var(--radius)] border border-default bg-surface px-3 py-2 text-sm text-foreground",
            direction === "horizontal" ? "min-w-24" : "w-full"
          )}
        >
          {item}
        </div>
      ))}
    </>
  )
}

export function Stack({
  as: Component = "div",
  direction = "vertical",
  gap = "md",
  align = "stretch",
  justify = "start",
  items,
  children,
  className,
}: StackProps) {
  const fallbackItems = Array.isArray(items) && items.length > 0 ? items : []

  return (
    <Component
      data-slot="primitive-stack"
      className={cn(
        "flex w-full",
        direction === "horizontal" ? "flex-row flex-wrap" : "flex-col",
        alignStyles[align],
        justifyStyles[justify],
        className
      )}
      style={{ gap: gapStyles[gap] }}
    >
      {children || <FallbackItems items={fallbackItems} direction={direction} />}
    </Component>
  )
}
