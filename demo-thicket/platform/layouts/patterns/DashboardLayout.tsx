import type { ReactNode } from "react"

interface DashboardLayoutProps {
  header?: ReactNode
  stats?: ReactNode
  filters?: ReactNode
  content?: ReactNode
  sidebar?: ReactNode
  emptyState?: ReactNode
  isEmpty?: boolean
  hasSidebar?: boolean
}

export function DashboardLayout({
  header,
  stats,
  filters,
  content,
  sidebar,
  emptyState,
  isEmpty,
  hasSidebar,
}: DashboardLayoutProps) {
  return (
    <div className="space-y-6">
      {header}
      {stats}
      {filters}
      {isEmpty ? emptyState : (
        <div className={`grid gap-6 ${hasSidebar ? "lg:grid-cols-[1fr_320px]" : ""}`}>
          <div>{content}</div>
          {hasSidebar && <aside>{sidebar}</aside>}
        </div>
      )}
    </div>
  )
}

