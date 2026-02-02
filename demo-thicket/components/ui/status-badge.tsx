import { cn } from "../../lib/utils"

type CourseState = "draft" | "in_review" | "waitlist" | "published" | "archived"

interface StatusBadgeProps {
  status: CourseState
  size?: "sm" | "md"
}

const statusConfig: Record<CourseState, { label: string; className: string }> =
  {
    draft: {
      label: "Draft",
      className: "bg-gray-100 text-gray-700 border-gray-200",
    },
    in_review: {
      label: "In Review",
      className: "bg-amber-100 text-amber-700 border-amber-200",
    },
    waitlist: {
      label: "Waitlist",
      className: "bg-yellow-100 text-yellow-700 border-yellow-200",
    },
    published: {
      label: "Published",
      className: "bg-green-100 text-green-700 border-green-200",
    },
    archived: {
      label: "Archived",
      className: "bg-red-100 text-red-700 border-red-200",
    },
  }

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status ?? "Unknown",
    className: "bg-gray-100 text-gray-700 border-gray-200",
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        size === "sm" && "px-2 py-0.5 text-xs",
        size === "md" && "px-2.5 py-1 text-sm",
        config.className,
      )}
    >
      {config.label}
    </span>
  )
}
