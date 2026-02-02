import { GraduationCap } from "lucide-react"
import { useState } from "react"

import { cn } from "../../lib/utils"

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl"
type BadgePosition = "top-right" | "bottom-right" | "bottom-left" | "top-left"

interface UserAvatarProps {
  src?: string
  alt: string
  size?: AvatarSize
  showTeacherBadge?: boolean
  badgePosition?: BadgePosition
  className?: string
  ringOnHover?: boolean
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: "h-5 w-5",
  sm: "h-6 w-6",
  md: "h-10 w-10",
  lg: "h-12 w-12",
  xl: "h-16 w-16",
}

const textSizeClasses: Record<AvatarSize, string> = {
  xs: "text-[8px]",
  sm: "text-[10px]",
  md: "text-sm",
  lg: "text-base",
  xl: "text-xl",
}

const badgeClasses: Record<AvatarSize, { container: string; icon: string }> = {
  xs: { container: "h-3 w-3", icon: "h-1.5 w-1.5" },
  sm: { container: "h-3.5 w-3.5", icon: "h-2 w-2" },
  md: { container: "h-4 w-4", icon: "h-2.5 w-2.5" },
  lg: { container: "h-5 w-5", icon: "h-3.5 w-3.5" },
  xl: { container: "h-7 w-7", icon: "h-5 w-5" },
}

const badgePositionClasses: Record<BadgePosition, string> = {
  "top-right": "-top-0.5 -right-0.5",
  "bottom-right": "-bottom-0.5 -right-0.5",
  "bottom-left": "-bottom-0.5 -left-0.5",
  "top-left": "-top-0.5 -left-0.5",
}

function getInitials(name: string): string {
  if (!name || name.trim() === "") return "?"

  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase()
  }

  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

function getColorFromName(name: string): string {
  if (!name) return "bg-surface-300"

  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-yellow-500",
    "bg-red-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-teal-500",
    "bg-orange-500",
    "bg-cyan-500",
  ]

  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }

  return colors[Math.abs(hash) % colors.length]
}

export function UserAvatar({
  src,
  alt,
  size = "md",
  showTeacherBadge = false,
  badgePosition = "bottom-right",
  className = "",
  ringOnHover = false,
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false)
  const shouldShowFallback = !src || src.trim() === "" || imageError
  const initials = getInitials(alt)
  const bgColor = getColorFromName(alt)

  return (
    <div className="relative inline-block flex-shrink-0">
      {shouldShowFallback ? (
        <div
          className={cn(
            sizeClasses[size],
            bgColor,
            "flex items-center justify-center rounded-full font-semibold text-white select-none",
            textSizeClasses[size],
            ringOnHover &&
              "hover:ring-brand-500 transition-all duration-200 hover:ring-2 hover:ring-offset-2",
            className,
          )}
          aria-label={alt}
        >
          {initials}
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          onError={() => setImageError(true)}
          className={cn(
            sizeClasses[size],
            "rounded-full object-cover",
            ringOnHover &&
              "hover:ring-brand-500 transition-all duration-200 hover:ring-2 hover:ring-offset-2",
            className,
          )}
        />
      )}
      {showTeacherBadge && (
        <div
          className={cn(
            badgeClasses[size].container,
            badgePositionClasses[badgePosition],
            "bg-brand-100 absolute flex items-center justify-center rounded-full ring-2 ring-white",
          )}
        >
          <GraduationCap
            className={cn(badgeClasses[size].icon, "text-brand-700")}
          />
        </div>
      )}
    </div>
  )
}
