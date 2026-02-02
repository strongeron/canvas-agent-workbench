import { usePage } from "../shims/inertia-react"
import { BookOpen, Calendar, HelpCircle, Home, MessageSquare, Search, Settings } from "lucide-react"
import { useMemo } from "react"

import { getUnreadStudentMessageCount } from "../data/messages"
import { Sidebar, type NavItem } from "./Sidebar"
import type { AuthenticatedUser } from "./types"
import { getBaseDashboardPath } from "./utils/userRouteMapping"

interface StudentSidebarProps {
  authenticated_user: AuthenticatedUser
  onNavigate?: () => void
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

export function StudentSidebar({
  authenticated_user,
  onNavigate,
  isCollapsed = false,
  onToggleCollapse,
}: StudentSidebarProps) {
  const { url } = usePage()
  const basePath = getBaseDashboardPath(url)

  const unreadMessageCount = useMemo(
    () => getUnreadStudentMessageCount(authenticated_user.id),
    [authenticated_user.id]
  )

  const navItems: NavItem[] = [
    { label: "Dashboard", path: basePath, icon: Home },
    { label: "My Courses", path: `${basePath}/courses`, icon: BookOpen },
    { label: "Schedule", path: `${basePath}/schedule`, icon: Calendar },
    { label: "Browse Courses", path: `${basePath}/browse-courses`, icon: Search },
    { label: "Messages", path: `${basePath}/messages`, icon: MessageSquare, badge: unreadMessageCount },
    { label: "Settings", path: `${basePath}/settings`, icon: Settings },
    { label: "Questions", path: `${basePath}/questions`, icon: HelpCircle },
  ]

  return (
    <Sidebar
      authenticated_user={authenticated_user}
      navItems={navItems}
      onNavigate={onNavigate}
      isCollapsed={isCollapsed}
      onToggleCollapse={onToggleCollapse}
    />
  )
}
