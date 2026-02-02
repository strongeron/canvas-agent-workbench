import { BookOpen, Clock } from "lucide-react"

import { CourseCover } from "./ui/course-cover"
import { CourseCTA } from "../platform/CTAs/CourseCTA"
import { formatDuration, formatScheduleTime } from "../utils/formatters"
import type { Course } from "../types"

interface CourseHeroProps {
  title: string
  description: string
  imageUrl?: string
  durationWeeks: number
  startsAt: string | null
  lessonLength?: number
  course?: Course
  authenticated_user?: { id: number }
  is_enrolled?: boolean
  onEnrollClick?: () => void
  showCTA?: boolean
}

export function CourseHero({
  title,
  description,
  imageUrl,
  durationWeeks,
  startsAt,
  lessonLength = 1,
  course,
  authenticated_user,
  is_enrolled = false,
  onEnrollClick,
  showCTA = false,
}: CourseHeroProps) {
  const getLessonLengthText = () => {
    if (lessonLength === 1) {
      return "1 hour per session"
    }
    return `${lessonLength} hours per session`
  }
  return (
    <section className="bg-linear-to-br from-white to-surface-50 border-default shadow-card overflow-hidden rounded-2xl border">
      <CourseCover
        coverUrl={imageUrl}
        title={title}
        variant="card"
        aspectRatio="video"
        showOverlay
      />

      <div className="p-8">
        <h1 className="text-foreground font-display mb-3 text-3xl leading-tight font-bold">
          {title}
        </h1>
        <p className="text-muted-foreground mb-6 text-base leading-relaxed">
          {description}
        </p>

        <div className="text-muted-foreground flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <span className="text-sm font-medium">
              {formatDuration(durationWeeks)}
            </span>
          </div>
          {startsAt && (
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              <span className="text-sm font-medium">
                {formatScheduleTime(startsAt)}
              </span>
            </div>
          )}
          {lessonLength && lessonLength !== 1 && (
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <span className="text-sm font-medium">
                {getLessonLengthText()}
              </span>
            </div>
          )}
        </div>

        {showCTA && course && (
          <div className="mt-6">
            <CourseCTA
              course={course}
              role="public"
              variant="card"
              authenticated_user={authenticated_user}
              is_enrolled={is_enrolled}
              onEnrollClick={onEnrollClick}
              size="lg"
            />
          </div>
        )}
      </div>
    </section>
  )
}
