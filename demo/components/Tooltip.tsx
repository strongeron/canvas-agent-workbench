import type { ReactNode } from "react"

export interface TooltipProps {
  content: string
  children: ReactNode
}

export function Tooltip({ content, children }: TooltipProps) {
  return (
    <span title={content} className="inline-flex">
      {children}
    </span>
  )
}
