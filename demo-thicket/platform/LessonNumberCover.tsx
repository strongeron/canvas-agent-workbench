import { cn } from "@thicket/lib/utils"

export type LessonNumberCoverStatus = "completed" | "locked" | "upcoming" | "live"

export interface LessonNumberCoverProps {
  /** Lesson number to display */
  lessonNumber: number
  /** Status for styling */
  status?: LessonNumberCoverStatus
  /** Custom className */
  className?: string
}

/**
 * Pure visual component for displaying a lesson number as a cover.
 * 
 * This is a presentational component with no business logic.
 * It fills its container and displays a large, centered number
 * with status-based styling.
 */
export function LessonNumberCover({
  lessonNumber,
  status = "upcoming",
  className = "",
}: LessonNumberCoverProps) {
  const getBackgroundClasses = () => {
    switch (status) {
      case "completed":
        return "bg-success-50"
      case "locked":
        return "bg-surface-100"
      case "live":
        return "bg-brand-600"
      case "upcoming":
      default:
        return "bg-brand-100"
    }
  }

  const getTextColor = () => {
    switch (status) {
      case "completed":
        return "text-success-700"
      case "locked":
        return "text-surface-400"
      case "live":
        return "text-white"
      case "upcoming":
      default:
        return "text-brand-700"
    }
  }

  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center",
        getBackgroundClasses(),
        className
      )}
    >
      <span className={cn("text-2xl font-bold", getTextColor())}>
        {lessonNumber}
      </span>
    </div>
  )
}

