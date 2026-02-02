import { Link, usePage } from "@inertiajs/react"
import { Settings } from "lucide-react"

import { Tooltip } from "@thicket/components/ui/tooltip"
import { UserAvatar } from "@thicket/components/ui/user-avatar"
import type { AuthenticatedUser } from "@thicket/platform/types"
import { getBaseDashboardPath } from "@thicket/platform/utils/userRouteMapping"

interface UserProfileProps {
  user: AuthenticatedUser
  className?: string
  isCollapsed?: boolean
}

export function UserProfile({
  user,
  className = "",
  isCollapsed = false,
}: UserProfileProps) {
  const { url } = usePage()
  const roleLabel = user.role === "teacher" ? "Instructor" : "Student"
  const displayName = user.name ?? "User"
  const avatarUrl = user.avatar_url ?? ""

  const basePath = getBaseDashboardPath(url)
  const profileUrl = `${basePath}/profile/edit`

  if (isCollapsed) {
    return (
      <Tooltip content={`${displayName} (${roleLabel})`}>
        <Link href={profileUrl} className="mx-auto block">
          <UserAvatar
            src={avatarUrl}
            alt={displayName}
            size="lg"
            showTeacherBadge={user.role === "teacher"}
            ringOnHover
          />
        </Link>
      </Tooltip>
    )
  }

  return (
    <Link href={profileUrl}>
      <div
        className={`flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-all duration-200 hover:bg-surface-100 hover:shadow-sm ${className}`}
      >
        <UserAvatar
          src={avatarUrl}
          alt={displayName}
          size="lg"
          showTeacherBadge={user.role === "teacher"}
        />
        <div className="min-w-0 flex-1">
          <p className="text-foreground truncate text-base font-semibold">
            {displayName}
          </p>
          <p className="text-muted-foreground mt-0.5 truncate text-xs">
            {roleLabel}
          </p>
          <div className="mt-1 flex items-center gap-1.5">
            <Settings className="text-muted h-3.5 w-3.5" />
            <span className="text-muted text-xs font-medium">Profile</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
