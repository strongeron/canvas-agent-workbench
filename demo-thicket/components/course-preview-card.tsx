import { Clock } from "lucide-react"

import { Badge } from "./ui/badge"
import { CourseCover } from "./ui/course-cover"
import { ImagePlaceholder } from "./ui/image-placeholder"
import type { Course } from "../types"
import { formatDuration } from "../utils/formatters"

interface CoursePreviewCardProps {
  course: Course
  className?: string
}

export function CoursePreviewCard({
  course,
  className = "",
}: CoursePreviewCardProps) {
  return (
    <div
      className={`flex h-full transform flex-col overflow-hidden rounded-xl border-2 border-neutral-200 bg-white shadow-lg transition-all duration-300 ${className}`}
    >
      <CourseCover
        coverUrl={course.cover_url}
        title={course.title}
        variant="card"
        aspectRatio="3/2"
        pointerEventsNone
      />

      <div className="flex min-h-0 flex-1 flex-col p-2">
        <div className="flex-1 space-y-1.5">
          <Badge variant="brand" size="xs">
            {course.category?.name ?? "General"}
          </Badge>

          <h3 className="font-display text-[11px] leading-tight font-bold text-neutral-900 sm:text-xs">
            {course.title}
          </h3>

          <div className="flex items-center gap-1 pt-0.5">
            <Clock className="text-muted-foreground h-3 w-3" strokeWidth={2} />
            <span className="text-muted-foreground text-[10px] font-medium sm:text-xs">
              {formatDuration(course.lessons_count)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1.5">
          <div className="bg-surface-100 h-6 w-6 shrink-0 overflow-hidden rounded-full border-2 border-neutral-200">
            {!course.instructor?.avatar_url ? (
              <ImagePlaceholder
                type="instructor"
                size="sm"
                className="rounded-full"
              />
            ) : (
              <img
                src={course.instructor.avatar_url}
                alt={course.instructor.name}
                className="h-full w-full object-cover object-center"
                loading="lazy"
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] font-semibold text-neutral-900 sm:text-xs">
              {course.instructor?.name ?? "TBD"}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
