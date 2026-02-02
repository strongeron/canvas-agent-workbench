import { isWithinInterval, parseISO } from "date-fns"
import { Circle } from "lucide-react"

import { getAssignmentsByLessonId } from "@thicket/data/assignments"
import { UnifiedLessonCard } from "@thicket/platform/UnifiedLessonCard"
import { lessonWithProgressToUnified } from "@thicket/platform/utils/lessonDataTransformers"
import type { LessonWithProgress } from "@thicket/types"

export interface CourseTabScheduleProps {
  courseId: number
  lessons: LessonWithProgress[]
  courseCoverUrl?: string
  learningObjectives?: string[]
  userTimezone?: string
  courseTimezone?: string
}

export function CourseTabSchedule({
  courseId,
  lessons,
  courseCoverUrl,
  learningObjectives,
  userTimezone,
  courseTimezone
}: CourseTabScheduleProps) {
  const firstIncompleteIndex = lessons.findIndex(lesson => !lesson.is_completed)

  const liveLessons = lessons.filter((lesson) => {
    if (!lesson.scheduled_at || lesson.is_completed) return false
    const lessonDate = parseISO(lesson.scheduled_at)
    const now = new Date()
    const fifteenMinutesBefore = new Date(lessonDate.getTime() - 15 * 60 * 1000)
    const oneHourAfter = new Date(lessonDate.getTime() + 60 * 60 * 1000)
    return isWithinInterval(now, { start: fifteenMinutesBefore, end: oneHourAfter })
  })

  const liveLessonIds = new Set(liveLessons.map(l => l.id))

  const otherLessons = lessons.filter((lesson) => {
    if (liveLessonIds.has(lesson.id)) return false
    if (!lesson.scheduled_at) return true
    if (lesson.is_completed) return true
    return true
  })

  return (
    <div>
      {liveLessons.length > 0 && (
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-2">
            <Circle className="h-5 w-5 text-success animate-pulse fill-success" />
            <h3 className="font-display text-foreground text-lg font-bold">
              Live Now
            </h3>
          </div>
          <div className="space-y-3">
            {liveLessons.map((lesson) => {
              const assignments = getAssignmentsByLessonId(lesson.id)
              const unifiedLesson = lessonWithProgressToUnified(
                lesson,
                courseId,
                userTimezone,
                courseTimezone,
                courseCoverUrl,
                assignments,
                learningObjectives
              )

              return (
                <div key={lesson.id} id={`lesson-${lesson.id}`}>
                  <UnifiedLessonCard
                    lesson={unifiedLesson}
                    mode="course-details"
                    role="student"
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {otherLessons.map((lesson, index) => {
          const assignments = getAssignmentsByLessonId(lesson.id)
          const unifiedLesson = lessonWithProgressToUnified(
            lesson,
            courseId,
            userTimezone,
            courseTimezone,
            courseCoverUrl,
            assignments,
            learningObjectives
          )

          if (firstIncompleteIndex !== -1 && index === firstIncompleteIndex) {
            unifiedLesson.isNext = true
          }

          return (
            <div key={lesson.id} id={`lesson-${lesson.id}`}>
              <UnifiedLessonCard
                lesson={unifiedLesson}
                mode="course-details"
                role="student"
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
