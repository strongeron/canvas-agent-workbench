import type { ReactNode } from "react"

interface CourseDetailLayoutProps {
  breadcrumb?: ReactNode
  hero?: ReactNode
  sidebar?: ReactNode
  tabs?: ReactNode
  tabContent?: ReactNode
  hasSidebar?: boolean
  sidebarPosition?: "right" | "bottom"
}

export function CourseDetailLayout({
  breadcrumb,
  hero,
  sidebar,
  tabs,
  tabContent,
  hasSidebar,
  sidebarPosition = "right",
}: CourseDetailLayoutProps) {
  return (
    <div className="space-y-6">
      {breadcrumb}
      {hero}
      {hasSidebar && sidebarPosition === "right" ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            {tabs}
            {tabContent}
          </div>
          <aside>{sidebar}</aside>
        </div>
      ) : (
        <div className="space-y-4">
          {tabs}
          {tabContent}
          {hasSidebar && <div>{sidebar}</div>}
        </div>
      )}
    </div>
  )
}

