import type { ReactNode } from "react"

import { Sidebar } from "../Sidebar"
import type { AuthenticatedUser } from "../types"

interface TeacherLayoutProps {
  children: ReactNode
  authenticated_user: AuthenticatedUser
  isCollapsed?: boolean
}

export function TeacherLayout({
  children,
  authenticated_user,
  isCollapsed = false,
}: TeacherLayoutProps) {
  return (
    <div className="flex min-h-screen bg-surface-100">
      <div className="hidden lg:block">
        <Sidebar
          authenticated_user={authenticated_user}
          navItems={[]}
          isCollapsed={isCollapsed}
        />
      </div>
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}

