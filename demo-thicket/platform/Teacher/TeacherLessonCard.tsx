import { Link } from "@inertiajs/react"
import { formatDistanceToNow, parseISO } from "date-fns"
import { Clock, Users } from "lucide-react"

import { Badge } from "@thicket/components/ui/badge"
import { CourseCover } from "@thicket/components/ui/course-cover"
import { LessonCTA } from "@thicket/platform/CTAs/LessonCTA"
import {
  FilesList,
  LessonStatusBadge,
  ObjectivesList,
  TopicsList,
  getContainerClasses,
} from "@thicket/platform/shared-lesson-card-primitives"
import { getLessonStatus } from "@thicket/platform/utils/scheduleUtils"
import type { ScheduledLesson } from "@thicket/platform/utils/scheduleUtils"
import {
  formatWithTimezoneAbbr,
} from "@thicket/platform/utils/timezoneHelpers"
import { teacher_course_path } from "@thicket/routes"

export type TeacherLessonCardMode = "dashboard" | "schedule" | "course-details"

interface TeacherLessonCardProps {
  lesson: ScheduledLesson
  mode: TeacherLessonCardMode
  showActions?: boolean
}

// getTeacherCTAConfig function moved to LessonCTA component

function convertScheduledLessonStatus(status: "live" | "upcoming" | "past"): "live" | "upcoming" | "upcoming-next" | "past" | "completed-with-recording" | "completed-no-recording" | "locked" {
  if (status === "past") return "past"
  return status
}

export function TeacherLessonCard({ lesson, mode, showActions = true }: TeacherLessonCardProps) {
  const status = getLessonStatus(lesson.scheduledAt)
  const isLive = status === "live"
  const isCompleted = lesson.isCompleted || false
  const lessonStatus = convertScheduledLessonStatus(status)
  
  // Convert to LessonStatus for LessonCTA
  let ctaStatus: "live" | "upcoming" | "upcoming-next" | "past" | "completed-with-recording" | "completed-no-recording" | "locked" = lessonStatus
  if (status === "past" && lesson.recordingUrl) {
    ctaStatus = "completed-with-recording"
  } else if (status === "past" && !lesson.recordingUrl) {
    ctaStatus = "past"
  }

  const displayTimestamp = isCompleted && lesson.scheduledAt
    ? lesson.scheduledAt
    : lesson.scheduledAt

  const formattedDateTime = displayTimestamp
    ? formatWithTimezoneAbbr(displayTimestamp, "America/New_York", "EEE, MMM d 'at' h:mm a")
    : "Schedule TBD"

  const containerClasses = getContainerClasses(mode, isLive, isCompleted, false, lessonStatus)

  if (mode === "dashboard") {
    return (
      <div className={containerClasses}>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 sm:gap-4 items-start">
          <div className="flex items-start gap-3 min-w-0">
            <CourseCover
              coverUrl={lesson.courseCoverUrl}
              title={lesson.courseTitle || "Course"}
              variant="icon"
              size="sm"
            />

            <div className="flex-1 min-w-0">
              <div className="mb-1 flex items-center gap-2 flex-wrap">
                <LessonStatusBadge status={lessonStatus} isLive={isLive} />
                <span className="text-muted text-xs">Lesson {lesson.lessonPosition}</span>
              </div>
              <h4 className="font-display text-foreground mb-0.5 text-sm font-semibold line-clamp-1">
                {lesson.lessonTitle}
              </h4>
              <Link
                href={teacher_course_path(lesson.courseId)}
                className="text-brand-600 hover:text-brand-700 text-xs font-medium transition-colors line-clamp-1 block mb-1"
              >
                {lesson.courseTitle}
              </Link>
              {lesson.lessonDescription && (
                <p className="text-muted-foreground text-xs mt-1 line-clamp-2">{lesson.lessonDescription}</p>
              )}
              {lesson.topics && lesson.topics.length > 0 && (
                <div className="mt-2">
                  <TopicsList topics={lesson.topics} />
                </div>
              )}
              {lesson.learningObjectives && lesson.learningObjectives.length > 0 && (
                <div className="mt-2">
                  <ObjectivesList objectives={lesson.learningObjectives} />
                </div>
              )}
              {lesson.enrolledStudentsCount !== undefined && (
                <Badge variant="secondary" className="flex items-center gap-1 text-xs mt-2 w-fit">
                  <Users className="h-3 w-3" />
                  {lesson.enrolledStudentsCount} {lesson.enrolledStudentsCount === 1 ? "student" : "students"}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-3 sm:text-right sm:min-w-[200px]">
            {showActions && (
              <div className="flex flex-col items-end gap-2">
                <LessonCTA
                  lesson={lesson}
                  status={ctaStatus}
                  role="teacher"
                  mode={mode}
                  size="sm"
                  className={isLive ? "bg-brand-600 hover:bg-brand-700 animate-pulse-subtle" : ""}
                  isLive={isLive}
                />
              </div>
            )}

            <div className="flex flex-col sm:items-end gap-1">
              <div className="text-sm text-muted-foreground">
                {formattedDateTime}
              </div>
              {status === "upcoming" && lesson.scheduledAt && (
                <div className="flex items-center gap-1.5 text-xs text-muted">
                  <Clock className="h-3 w-3" />
                  <span>in {formatDistanceToNow(parseISO(lesson.scheduledAt))}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={containerClasses}>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 items-start">
        <div className="flex items-start gap-4 min-w-0">
          <CourseCover
            coverUrl={lesson.courseCoverUrl}
            title={lesson.courseTitle || "Course"}
            variant="icon"
            size="md"
          />

          <div className="flex-1 min-w-0">
            <div className="mb-1 flex items-center gap-2 flex-wrap">
              <LessonStatusBadge status={lessonStatus} isLive={isLive} />
              <span className="text-muted text-xs">Lesson {lesson.lessonPosition}</span>
            </div>
            <h4 className="font-display text-foreground mb-1 text-base font-semibold">
              {lesson.lessonTitle}
            </h4>
            <Link
              href={teacher_course_path(lesson.courseId)}
              className="text-brand-600 hover:text-brand-700 text-sm font-medium transition-colors"
            >
              {lesson.courseTitle}
            </Link>
            {lesson.lessonDescription && (
              <p className="text-muted-foreground text-sm mt-1">{lesson.lessonDescription}</p>
            )}
            {lesson.enrolledStudentsCount !== undefined && (
              <Badge variant="secondary" className="flex items-center gap-1 mt-2 w-fit">
                <Users className="h-3 w-3" />
                {lesson.enrolledStudentsCount} {lesson.enrolledStudentsCount === 1 ? "student" : "students"}
              </Badge>
            )}

            {lesson.topics && lesson.topics.length > 0 && (
              <div className="mt-3">
                <TopicsList topics={lesson.topics} />
              </div>
            )}

            {lesson.learningObjectives && lesson.learningObjectives.length > 0 && (
              <div className="mt-3">
                <ObjectivesList objectives={lesson.learningObjectives} />
              </div>
            )}

            {lesson.assignments && lesson.assignments.length > 0 && (
              <div className="mt-3">
                <FilesList assignments={lesson.assignments} />
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:items-end gap-3 lg:text-right lg:min-w-[220px]">
          {showActions && (
            <div className="flex flex-col items-end gap-2">
              <LessonCTA
                lesson={lesson}
                status={ctaStatus}
                role="teacher"
                mode={mode}
                size="sm"
                className={isLive ? "bg-brand-600 hover:bg-brand-700 animate-pulse-subtle" : ""}
                isLive={isLive}
              />
            </div>
          )}

          <div className="flex flex-col lg:items-end gap-1">
            <div className="text-sm text-muted-foreground">
              {formattedDateTime}
            </div>
            {status === "upcoming" && (
              <div className="flex items-center gap-1.5 text-xs text-muted">
                <Clock className="h-3 w-3" />
                <span>in {formatDistanceToNow(parseISO(lesson.scheduledAt))}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
