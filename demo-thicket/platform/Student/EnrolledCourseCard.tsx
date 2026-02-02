import { Link } from "@thicket/shims/inertia-react"
import { format } from "date-fns"
import { BookOpen, Calendar } from "lucide-react"

import { Badge } from "@thicket/components/ui/badge"
import { CourseCover } from "@thicket/components/ui/course-cover"
import { CourseCTA } from "@thicket/platform/CTAs/CourseCTA"
import { ImagePlaceholder } from "@thicket/components/ui/image-placeholder"
import { student_course_path } from "@thicket/routes"
import type { EnrolledCourseWithDetails } from "@thicket/types"
import { formatDuration } from "@thicket/utils/formatters"

export interface EnrolledCourseCardProps {
  enrolledCourse: EnrolledCourseWithDetails
}

export function EnrolledCourseCard({ enrolledCourse }: EnrolledCourseCardProps) {
  const { course, enrollment } = enrolledCourse

  const completedLessons = enrollment.completed_lessons.length
  const totalLessons = course.lessons_count
  const isCompleted = enrollment.progress_percentage === 100

  return (
    <Link
      href={student_course_path(course.id)}
      className={`border-subtle hover:border-default flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg active:translate-y-0 ${
        isCompleted ? "bg-brand-50" : "bg-surface-50"
      }`}
    >
      <CourseCover
        coverUrl={course.cover_url}
        title={course.title}
        variant="card"
        aspectRatio="4/3"
        pointerEventsNone
      />

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3">
          <Badge variant="brand" size="sm">
            {course.category?.name ?? "General"}
          </Badge>
        </div>

        <div className="mb-4 min-h-[4.5rem]">
          <h3
            className="font-display line-clamp-3 text-lg leading-tight font-bold text-neutral-900"
            title={course.title}
          >
            {course.title}
          </h3>
        </div>

        <div className="text-muted-foreground mb-4 flex flex-col gap-2">
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <BookOpen className="h-3.5 w-3.5" strokeWidth={2} />
            {formatDuration(course.lessons_count)}
          </span>
          {enrollment.next_lesson_date && (
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <Calendar className="h-3.5 w-3.5" strokeWidth={2} />
              {format(new Date(enrollment.next_lesson_date), "MMM d, h:mm a")}
            </span>
          )}
        </div>

        <div className="flex-1" />

        <div className="space-y-4">
          <div className="border-default border-t pt-4">
            <div className="mb-2 flex items-center justify-between">
              {isCompleted ? (
                <Badge variant="brand-filled" size="sm">Completed</Badge>
              ) : enrollment.progress_percentage > 0 ? (
                <Badge variant="brand-outline" size="sm">Enrolled</Badge>
              ) : (
                <Badge variant="secondary" size="sm">Not Started</Badge>
              )}
              <p className="text-muted-foreground text-xs font-medium">
                {completedLessons}/{totalLessons} Lessons
              </p>
            </div>
          </div>

          <div className="border-default flex items-center gap-3 border-t pt-4">
            <div className="border-default bg-surface-100 h-10 w-10 shrink-0 overflow-hidden rounded-full border-2">
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
                  className="pointer-events-none h-full w-full object-cover object-center"
                  loading="lazy"
                />
              )}
            </div>
            <span className="text-foreground truncate text-sm font-medium">
              {course.instructor?.name ?? "TBD"}
            </span>
          </div>

          <div>
            <CourseCTA
              course={course}
              enrollment={enrollment}
              role="student"
              variant="card"
              size="md"
              fullWidth
            />
          </div>
        </div>
      </div>
    </Link>
  )
}
