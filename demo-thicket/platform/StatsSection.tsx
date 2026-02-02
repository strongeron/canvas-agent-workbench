import type { ReactNode } from "react"

interface StatsSectionProps {
  children: ReactNode
}

export function StatsSection({ children }: StatsSectionProps) {
  return (
    <div className="mb-8 rounded-2xl bg-surface-100 p-6 shadow-sm">
      {children}
    </div>
  )
}
