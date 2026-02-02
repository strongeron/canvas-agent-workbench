import type { LucideIcon } from "lucide-react"
import { ImageOff, User } from "lucide-react"

interface ImagePlaceholderProps {
  type?: "course" | "instructor" | "default"
  icon?: LucideIcon
  text?: string
  className?: string
  size?: "sm" | "md" | "lg"
}

export function ImagePlaceholder({
  type = "default",
  icon: CustomIcon,
  className = "",
  size = "md",
}: ImagePlaceholderProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  }

  return (
    <div
      className={`bg-surface-100 flex h-full w-full items-center justify-center ${className} `}
    >
      {CustomIcon ? (
        <CustomIcon
          className={`${sizeClasses[size]} text-disabled opacity-50`}
          strokeWidth={1.5}
        />
      ) : type === "instructor" ? (
        <User
          className={`${sizeClasses[size]} text-disabled opacity-50`}
          strokeWidth={1.5}
        />
      ) : (
        <ImageOff
          className={`${sizeClasses[size]} text-disabled opacity-50`}
          strokeWidth={1.5}
        />
      )}
    </div>
  )
}
