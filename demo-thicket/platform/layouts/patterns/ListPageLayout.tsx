import type { ReactNode } from "react"

interface ListPageLayoutProps {
  header?: ReactNode
  filters?: ReactNode
  list?: ReactNode
  sidebar?: ReactNode
  hasSidebar?: boolean
}

export function ListPageLayout({
  header,
  filters,
  list,
  sidebar,
  hasSidebar,
}: ListPageLayoutProps) {
  return (
    <div className="space-y-6">
      {header}
      {filters}
      <div className={`grid gap-6 ${hasSidebar ? "lg:grid-cols-[1fr_320px]" : ""}`}>
        <div>{list}</div>
        {hasSidebar && <aside>{sidebar}</aside>}
      </div>
    </div>
  )
}

