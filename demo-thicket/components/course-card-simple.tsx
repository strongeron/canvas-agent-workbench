import { Link, router } from "../shims/inertia-react"
import { track } from "@plausible-analytics/tracker"
import { BookOpen, Clock } from "lucide-react"
import type { MouseEvent } from "react"

import { Badge } from "./ui/badge"
import { CourseCover } from "./ui/course-cover"
import { CourseCTA } from "../platform/CTAs/CourseCTA"
import { ImagePlaceholder } from "./ui/image-placeholder"
import { course_path } from "../routes"
import type { Course } from "../types"
import { formatDuration, formatScheduleTime } from "../utils/formatters"

interface CourseCardSimpleProps {
  course: Course
  studentId?: number
  isEnrolled?: boolean
  showCTA?: boolean
}

export function CourseCardSimple({ course, studentId, isEnrolled: _isEnrolled, showCTA = true }: CourseCardSimpleProps) {
  const isWaitlist = course.state === "waitlist"

  const handleEnroll = () => {
    router.replace({
      props: (currentProps) => ({
        ...currentProps,
        show_early_access: true,
        selected_course: course,
      }),
      preserveScroll: true,
      preserveState: true,
    })
  }

  const handleCardClick = (e: MouseEvent) => {
    track("course_card_clicked", {
      props: { course: course.title, state: course.state },
    })

    if (isWaitlist) {
      e.preventDefault()
      handleEnroll()
    }
  }

  const courseUrl = studentId
    ? `${course_path(course.id)}?student_id=${studentId}`
    : course_path(course.id)

  return (
    <Link
      href={courseUrl}
      onBefore={() => !isWaitlist}
      onStart={() =>
        track("course_card_details_clicked", {
          props: { course: course.title },
        })
      }
      onClick={handleCardClick}
      className="bg-surface-50 border-subtle hover:border-default flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg active:translate-y-0"
    >
      <CourseCover
        coverUrl={course.cover_url}
        title={course.title}
        variant="card"
        aspectRatio="4/3"
        pointerEventsNone
      />

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2">
          <Badge variant="brand" size="sm">
            {course.category?.name ?? "General"}
          </Badge>
        </div>

        <div
          className="mb-4 shrink-0"
          style={{
            transition: "min-height 300ms ease-in-out",
            willChange: "min-height",
          }}
        >
          <h3
            className="font-display line-clamp-3 text-lg leading-tight font-bold text-neutral-900"
            title={course.title}
          >
            {course.title}
          </h3>
        </div>

        <div className="flex-1" />

        <div className="flex flex-col border-t border-neutral-300 pt-4">
          <div className="text-muted-foreground mb-4 flex flex-col gap-2.5">
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <Clock className="h-3.5 w-3.5" strokeWidth={2} />
              {formatDuration(course.lessons_count)}
            </span>
            {course.starts_at && (
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <BookOpen className="h-3.5 w-3.5" strokeWidth={2} />
                {formatScheduleTime(course.starts_at)}
              </span>
            )}
          </div>

          <div className={`border-default flex items-center gap-3 border-t pt-4 ${showCTA ? "mb-5" : ""}`}>
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

          {showCTA && (
            <div className="mt-4" onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
            }}>
              <CourseCTA
                course={course}
                role="public"
                variant="card"
                authenticated_user={studentId ? { id: studentId } : undefined}
                is_enrolled={_isEnrolled}
                onEnrollClick={isWaitlist ? handleEnroll : undefined}
                size="md"
                fullWidth
              />
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
