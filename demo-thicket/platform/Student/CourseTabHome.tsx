import { format, isWithinInterval, parseISO } from "date-fns"
import { Calendar, Circle, Megaphone } from "lucide-react"

import { LearningObjectivesList } from "@thicket/components/learning-objectives-list"
import { Badge } from "@thicket/components/ui/badge"
import { getAssignmentsByLessonId } from "@thicket/data/assignments"
import { getSessionThreads } from "@thicket/data/persistence"
import { LessonCard } from "@thicket/platform/Student/LessonCardNew"
import { UnifiedLessonCard } from "@thicket/platform/UnifiedLessonCard"
import { lessonWithProgressToUnified } from "@thicket/platform/utils/lessonDataTransformers"
import type { AuthorProfile, Course, LessonWithProgress } from "@thicket/types"

export interface CourseTabHomeProps {
  course: Course & {
    curriculum_with_progress?: LessonWithProgress[]
  }
  instructor: AuthorProfile
  announcements: {
    id: number
    title: string
    content: string
    created_at: string
    author: string
  }[]
  nextLesson?: LessonWithProgress | null
  classmatesCount?: number
  userTimezone?: string
}

export function CourseTabHome({
  course,
  instructor,
  announcements: _announcements,
  nextLesson,
  classmatesCount,
  userTimezone,
}: CourseTabHomeProps) {
  const allLessons = course.curriculum_with_progress || []

  const liveLessons = allLessons.filter((lesson) => {
    if (!lesson.scheduled_at || lesson.is_completed) return false
    const lessonDate = parseISO(lesson.scheduled_at)
    const now = new Date()
    const fifteenMinutesBefore = new Date(lessonDate.getTime() - 15 * 60 * 1000)
    const oneHourAfter = new Date(lessonDate.getTime() + 60 * 60 * 1000)
    return isWithinInterval(now, { start: fifteenMinutesBefore, end: oneHourAfter })
  })

  const liveLesson = liveLessons.length > 0 ? liveLessons[0] : null
  const unifiedLiveLesson = liveLesson
    ? lessonWithProgressToUnified(
        liveLesson,
        course.id,
        userTimezone,
        course.course_timezone,
        course.cover_url,
        getAssignmentsByLessonId(liveLesson.id),
        course.learning_objectives
      )
    : null

  const nextLessonIsLive = nextLesson && liveLesson && nextLesson.id === liveLesson.id

  const unifiedNextLesson = nextLesson && !nextLessonIsLive
    ? {
        ...lessonWithProgressToUnified(
          nextLesson,
          course.id,
          userTimezone,
          course.course_timezone,
          course.cover_url,
          getAssignmentsByLessonId(nextLesson.id),
          course.learning_objectives
        ),
        isNext: true,
      }
    : null

  const sessionThreads = getSessionThreads()
  const latestAnnouncement = sessionThreads
    .filter((thread) => {
      return (
        thread.course_id === course.id &&
        thread.conversation_type === "course_announcement" &&
        thread.participants.some((p) => p.id === (instructor?.id || 0) && p.type === "teacher")
      )
    })
    .sort((a, b) => {
      return new Date(b.last_message_timestamp).getTime() - new Date(a.last_message_timestamp).getTime()
    })[0]

  return (
    <div className="space-y-8">
      {latestAnnouncement && latestAnnouncement.messages[0] && (
        <div className="rounded-xl border-2 border-brand-200 bg-brand-50 p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              {course.cover_url ? (
                <img
                  src={course.cover_url}
                  alt={course.title}
                  className="h-12 w-12 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-100">
                  <Megaphone className="h-6 w-6 text-brand-600" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="brand-filled" size="sm">
                  <Megaphone className="h-3 w-3" />
                  Latest Announcement
                </Badge>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {format(parseISO(latestAnnouncement.last_message_timestamp), "MMM d, yyyy")}
                  </span>
                </div>
              </div>

              <h3 className="text-foreground font-semibold text-lg mb-2">
                {latestAnnouncement.subject}
              </h3>

              <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">
                {latestAnnouncement.messages[0].body}
              </p>
            </div>
          </div>
        </div>
      )}

      {unifiedLiveLesson && (
        <div className="rounded-xl border-2 border-success bg-success/5 p-6 shadow-md">
          <div className="mb-4 flex items-center gap-2">
            <Circle className="h-6 w-6 text-success animate-pulse fill-success" />
            <h2 className="font-display text-foreground text-xl font-bold">
              Live Now
            </h2>
          </div>
          <UnifiedLessonCard
            lesson={unifiedLiveLesson}
            mode="live-banner"
            role="student"
          />
        </div>
      )}

      {unifiedNextLesson && !liveLesson && (
        <div>
          <h2 className="font-display text-foreground mb-4 text-xl font-semibold">
            Next Lesson
          </h2>
          <LessonCard
            lesson={{ ...unifiedNextLesson, classmatesCount }}
            mode="schedule"
          />
        </div>
      )}

      <div>
        <h2 className="font-display text-foreground mb-4 text-2xl font-bold">
          About This Course
        </h2>
        <p className="text-muted-foreground leading-relaxed">{course.description}</p>
      </div>

      {course.learning_objectives && course.learning_objectives.length > 0 && (
        <div>
          <h2 className="font-display text-foreground mb-4 text-2xl font-bold">
            What You&apos;ll Learn
          </h2>
          <LearningObjectivesList objectives={course.learning_objectives} />
        </div>
      )}
    </div>
  )
}
