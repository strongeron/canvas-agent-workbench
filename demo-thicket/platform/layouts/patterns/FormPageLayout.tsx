import type { ReactNode } from "react"

interface FormPageLayoutProps {
  header?: ReactNode
  form?: ReactNode
  sidebar?: ReactNode
  helper?: ReactNode
  hasSidebar?: boolean
}

export function FormPageLayout({
  header,
  form,
  sidebar,
  helper,
  hasSidebar,
}: FormPageLayoutProps) {
  return (
    <div className="space-y-6">
      {header}
      {helper}
      <div className={`grid gap-6 ${hasSidebar ? "lg:grid-cols-[1fr_320px]" : ""}`}>
        <div>{form}</div>
        {hasSidebar && <aside>{sidebar}</aside>}
      </div>
    </div>
  )
}

