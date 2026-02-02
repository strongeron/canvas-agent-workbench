import type { ReactNode } from "react"

interface BrowsePageLayoutProps {
  header?: ReactNode
  filters?: ReactNode
  content?: ReactNode
  sidebar?: ReactNode
  hasSidebar?: boolean
}

export function BrowsePageLayout({
  header,
  filters,
  content,
  sidebar,
  hasSidebar,
}: BrowsePageLayoutProps) {
  return (
    <div className="space-y-6">
      {header}
      {filters}
      <div className={`grid gap-6 ${hasSidebar ? "lg:grid-cols-[1fr_320px]" : ""}`}>
        <div>{content}</div>
        {hasSidebar && <aside>{sidebar}</aside>}
      </div>
    </div>
  )
}

