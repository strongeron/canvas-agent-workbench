import { Link, usePage } from "@inertiajs/react"
import { LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react"

import { Badge } from "@thicket/components/ui/badge"
import { LogoMasked } from "@thicket/components/ui/logo-masked"
import { Tooltip } from "@thicket/components/ui/tooltip"
import { UserProfile } from "@thicket/platform/UserProfile"
import type { AuthenticatedUser } from "@thicket/platform/types"
import { getBaseDashboardPath } from "@thicket/platform/utils/userRouteMapping"

export interface NavItem {
  label: string
  path: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
}

interface SidebarProps {
  authenticated_user: AuthenticatedUser
  navItems: NavItem[]
  onNavigate?: () => void
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

export function Sidebar({
  authenticated_user,
  navItems,
  onNavigate,
  isCollapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const { url } = usePage()
  const basePath = getBaseDashboardPath(url)

  const isActive = (path: string) => {
    if (path === basePath) {
      return url === path
    }
    return url.startsWith(path)
  }

  return (
    <div className="relative flex h-full flex-col">
      {/* Header with Logo and Collapse Button */}
      <div className={`border-b border-default transition-all duration-300 ${isCollapsed ? "px-3 py-4" : "px-6 py-5"}`}>
        <div className="flex items-center justify-between gap-3">
          <Link
            href={basePath}
            className={`block shrink-0 transition-all duration-300 hover:opacity-80 ${isCollapsed ? "mx-auto" : ""}`}
          >
            <div className="transition-all duration-300">
              <LogoMasked variant={isCollapsed ? "icon" : "full"} className={isCollapsed ? "" : "h-6 w-auto"} />
            </div>
          </Link>
          {onToggleCollapse && !isCollapsed && (
            <Tooltip content={"Collapse sidebar"}>
              <button
                onClick={onToggleCollapse}
                className="shrink-0 text-muted-foreground transition-all duration-300 hover:text-foreground hover:opacity-70"
                aria-label="Collapse sidebar"
                aria-expanded={!isCollapsed}
              >
                <PanelLeftClose className="h-5 w-5 opacity-50" />
              </button>
            </Tooltip>
          )}
          {onToggleCollapse && isCollapsed && (
            <Tooltip content={"Expand sidebar"}>
              <button
                onClick={onToggleCollapse}
                className="absolute right-0 top-[26px] z-10 -translate-y-1/2 translate-x-1/2 rounded-md border border-default bg-white p-1.5 text-muted-foreground shadow-sm transition-all duration-300 hover:bg-surface-50 hover:text-foreground hover:shadow-md"
                aria-label="Expand sidebar"
                aria-expanded={!isCollapsed}
              >
                <PanelLeftOpen className="h-4 w-4 opacity-50" />
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* User Profile Section */}
      <div className={`border-b border-default transition-all duration-300 ${isCollapsed ? "px-3 py-4" : "px-6 py-5"}`}>
        <UserProfile user={authenticated_user} isCollapsed={isCollapsed} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.path)

            const linkContent = (
              <Link
                href={item.path}
                onClick={onNavigate}
                className={`relative flex items-center gap-3 rounded-lg py-3 transition-all duration-300 ${
                  isCollapsed ? "justify-center px-2" : "px-4"
                } ${
                  active
                    ? isCollapsed
                      ? "bg-brand-50 text-brand-700"
                      : "border-l-4 border-brand-600 bg-brand-50 text-brand-700"
                    : "text-muted-foreground hover:bg-surface-100"
                }`}
              >
                <div className="relative">
                  <Icon className={`shrink-0 ${isCollapsed ? "h-6 w-6" : "h-5 w-5"}`} />
                  {isCollapsed && item.badge && item.badge > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-500 px-1.5 text-xs font-semibold text-white shadow-sm ring-2 ring-white">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </div>
                {!isCollapsed && (
                  <>
                    <span className="flex-1 font-medium">{item.label}</span>
                    {item.badge && item.badge > 0 && (
                      <Badge variant="brand">{item.badge}</Badge>
                    )}
                  </>
                )}
              </Link>
            )

            return (
              <li key={item.path}>
                {isCollapsed ? (
                  <Tooltip content={item.badge && item.badge > 0 ? `${item.label} (${item.badge})` : item.label}>
                    {linkContent}
                  </Tooltip>
                ) : (
                  linkContent
                )}
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Sign Out Button */}
      <div className="border-t border-default p-4">
        {isCollapsed ? (
          <Tooltip content={"Sign Out"}>
            <button
              onClick={() => alert("Sign out functionality coming soon")}
              className="text-muted-foreground hover:bg-surface-100 flex w-full items-center justify-center rounded-lg px-2 py-3 transition-all duration-300"
              aria-label="Sign Out"
            >
              <LogOut className="h-6 w-6" />
            </button>
          </Tooltip>
        ) : (
          <button
            onClick={() => alert("Sign out functionality coming soon")}
            className="text-muted-foreground hover:bg-surface-100 flex w-full items-center gap-3 rounded-lg px-4 py-3 transition-all duration-300"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        )}
      </div>
    </div>
  )
}

