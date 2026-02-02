import { usePage } from "../shims/inertia-react"
import { BookOpen, Calendar, Compass, DollarSign, Home, MessageSquare, Settings, Users } from "lucide-react"
import { useMemo } from "react"

import { getUnreadMessageCount } from "../data/messages"
import { Sidebar, type NavItem } from "./Sidebar"
import type { AuthenticatedUser } from "./types"
import { getBaseDashboardPath } from "./utils/userRouteMapping"

interface TeacherSidebarProps {
  authenticated_user: AuthenticatedUser
  onNavigate?: () => void
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

export function TeacherSidebar({
  authenticated_user,
  onNavigate,
  isCollapsed = false,
  onToggleCollapse,
}: TeacherSidebarProps) {
  const { url } = usePage()
  const basePath = getBaseDashboardPath(url)

  const unreadMessageCount = useMemo(
    () => getUnreadMessageCount(authenticated_user.id),
    [authenticated_user.id]
  )

  const navItems: NavItem[] = [
    { label: "Dashboard", path: basePath, icon: Home },
    { label: "Browse Courses", path: `${basePath}/browse-courses`, icon: Compass },
    { label: "My Courses", path: `${basePath}/courses`, icon: BookOpen },
    { label: "Schedule", path: `${basePath}/schedule`, icon: Calendar },
    { label: "Students", path: `${basePath}/students`, icon: Users },
    { label: "Messages", path: `${basePath}/messages`, icon: MessageSquare, badge: unreadMessageCount },
    { label: "Earnings", path: `${basePath}/earnings`, icon: DollarSign },
    { label: "Settings", path: `${basePath}/settings`, icon: Settings },
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
