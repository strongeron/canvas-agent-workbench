import { Check } from "lucide-react"

import { cn } from "../../lib/utils"

interface LessonSegment {
  id: number
  position: number
  title: string
  isCompleted: boolean
  isCurrent: boolean
  scheduledAt?: string
}

interface SegmentedProgressBarProps {
  lessons: LessonSegment[]
  maxVisibleSegments?: number
  showLabels?: boolean
  compact?: boolean
  className?: string
}

export function SegmentedProgressBar({
  lessons,
  maxVisibleSegments,
  showLabels = false,
  compact = false,
  className,
}: SegmentedProgressBarProps) {
  const visibleLessons = maxVisibleSegments
    ? lessons.slice(0, maxVisibleSegments)
    : lessons
  const hasOverflow = maxVisibleSegments && lessons.length > maxVisibleSegments
  const overflowCount = hasOverflow ? lessons.length - maxVisibleSegments : 0

  const completedCount = lessons.filter((l) => l.isCompleted).length
  const progressPercentage = Math.round((completedCount / lessons.length) * 100)

  const segmentWidth = compact ? "w-14" : "w-16 sm:w-20"
  const segmentHeight = compact ? "h-10" : "h-12 sm:h-14"
  const fontSize = compact ? "text-xs" : "text-sm"
  const padding = compact ? "gap-2" : "gap-3 sm:gap-4"

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-foreground text-sm font-semibold">
          {completedCount}/{lessons.length} Lessons Completed (
          {progressPercentage}%)
        </span>
      </div>

      <div className={cn("flex flex-wrap items-center", padding)}>
        {visibleLessons.map((lesson) => (
          <div key={lesson.id} className="flex flex-col items-center">
            <div
              className={cn(
                "relative flex items-center justify-center rounded-lg transition-all duration-300",
                segmentWidth,
                segmentHeight,
                lesson.isCompleted &&
                  "bg-brand-600 hover:bg-brand-700 shadow-sm",
                lesson.isCurrent &&
                  !lesson.isCompleted &&
                  "border-brand-500 bg-brand-50 hover:bg-brand-100 animate-pulse border-2",
                !lesson.isCompleted &&
                  !lesson.isCurrent &&
                  "bg-surface-200 hover:bg-surface-300",
              )}
              role="img"
              aria-label={`Lesson ${lesson.position}: ${lesson.title}${
                lesson.isCompleted
                  ? " - Completed"
                  : lesson.isCurrent
                    ? " - Current"
                    : " - Not Started"
              }`}
              title={lesson.title}
            >
              {lesson.isCompleted ? (
                <Check
                  className="h-5 w-5 text-white"
                  strokeWidth={3}
                  aria-hidden="true"
                />
              ) : (
                <span
                  className={cn(
                    "font-bold",
                    fontSize,
                    lesson.isCurrent ? "text-brand-700" : "text-muted-foreground",
                  )}
                  aria-hidden="true"
                >
                  {lesson.position}
                </span>
              )}
            </div>

            {showLabels && (
              <span
                className={cn(
                  "text-muted mt-1.5 max-w-[80px] truncate text-center font-medium",
                  compact ? "text-[10px]" : "text-xs",
                )}
                title={lesson.title}
              >
                L{lesson.position}
              </span>
            )}
          </div>
        ))}

        {hasOverflow && (
          <div
            className={cn(
              "bg-surface-100 relative flex items-center justify-center rounded-lg",
              segmentWidth,
              segmentHeight,
            )}
            aria-label={`${overflowCount} more lessons`}
            title={`${overflowCount} more lessons`}
          >
            <span className={cn("text-muted font-bold", fontSize)}>
              +{overflowCount}
            </span>
          </div>
        )}
      </div>

      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        Progress: {completedCount} of {lessons.length} lessons completed,{" "}
        {progressPercentage} percent
      </div>
    </div>
  )
}
