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
  none: "gap-0",
  xs: "gap-1",
  sm: "gap-2",
  md: "gap-3",
  lg: "gap-4",
  xl: "gap-6",
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
        gapStyles[gap],
        alignStyles[align],
        justifyStyles[justify],
        className
      )}
    >
      {children || <FallbackItems items={fallbackItems} direction={direction} />}
    </Component>
  )
}
