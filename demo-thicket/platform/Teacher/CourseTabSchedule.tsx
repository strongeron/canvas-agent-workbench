import { Circle } from "lucide-react"

import { getAssignmentsByLessonId } from "@thicket/data/assignments"
import { UnifiedLessonCard, type UnifiedLessonData } from "@thicket/platform/UnifiedLessonCard"
import { DateHeader } from "@thicket/platform/shared-lesson-card-primitives"
import { type ScheduledLesson, getLessonStatus, groupLessonsByDate } from "@thicket/platform/utils/scheduleUtils"
import type { Lesson, LessonWithProgress } from "@thicket/types"

interface CourseTabScheduleTeacherProps {
  courseId: number
  lessons: (Lesson | LessonWithProgress)[]
  courseCoverUrl?: string
  learningObjectives?: string[]
  userTimezone?: string
  courseTimezone?: string
}

export function CourseTabScheduleTeacher({
  courseId,
  lessons,
  courseCoverUrl,
  learningObjectives,
  userTimezone,
  courseTimezone,
}: CourseTabScheduleTeacherProps) {
  const lessonsWithSchedule: UnifiedLessonData[] = lessons.map((lesson) => {
    const lessonWithProgress = lesson as LessonWithProgress
    const assignments = getAssignmentsByLessonId(lesson.id)
    return {
      id: lesson.id,
      courseId,
      lessonId: lesson.id,
      courseTitle: "",
      courseCoverUrl: courseCoverUrl || "",
      lessonTitle: lesson.title,
      lessonDescription: lesson.description,
      lessonPosition: lesson.position,
      scheduledAt: lessonWithProgress.scheduled_at || "",
      hostWherebyUrl: lessonWithProgress.whereby_room_url || "",
      recordingUrl: lessonWithProgress.recording_url || "",
      topics: lesson.topics || [],
      learningObjectives: learningObjectives || [],
      assignments,
      userTimezone: userTimezone || "America/New_York",
      courseTimezone: courseTimezone,
    }
  })

  const liveLessons = lessonsWithSchedule.filter((lesson) => {
    if (!lesson.scheduledAt) return false
    return getLessonStatus(lesson.scheduledAt) === "live"
  })

  const upcomingLessons = lessonsWithSchedule.filter((lesson) => {
    if (!lesson.scheduledAt) return false
    const status = getLessonStatus(lesson.scheduledAt)
    return status === "upcoming"
  })

  const pastLessons = lessonsWithSchedule.filter((lesson) => {
    if (!lesson.scheduledAt) return false
    const status = getLessonStatus(lesson.scheduledAt)
    return status === "past"
  })

  const groupedUpcoming = groupLessonsByDate(
    lessonsWithSchedule as unknown as ScheduledLesson[]
  ) as Map<string, UnifiedLessonData[]>

  return (
    <div className="space-y-8">
      {liveLessons.length > 0 && (
        <div>
          <div className="mb-4 flex items-center gap-2">
            <Circle className="h-5 w-5 text-success animate-pulse fill-success" />
            <h3 className="font-display text-foreground text-lg font-bold">
              Live Now
            </h3>
          </div>
          <div className="space-y-3">
            {liveLessons.map((lesson) => (
              <div key={lesson.lessonId} id={`lesson-${lesson.lessonId}`}>
                <UnifiedLessonCard
                  lesson={lesson}
                  mode="course-details"
                  role="teacher"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {upcomingLessons.length > 0 && (
        <div>
          <h3 className="font-display text-foreground mb-4 text-lg font-bold">
            Upcoming Lessons
          </h3>
          <div className="space-y-6">
            {Array.from(groupedUpcoming.entries()).map(([date, dateLessons]) => (
              <div key={date}>
                <DateHeader date={date} />
                <div className="space-y-3 mt-3">
                  {dateLessons.map((lesson) => (
                    <div key={lesson.lessonId} id={`lesson-${lesson.lessonId}`}>
                      <UnifiedLessonCard
                        lesson={lesson}
                        mode="course-details"
                        role="teacher"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pastLessons.length > 0 && (
        <div>
          <h3 className="font-display text-foreground mb-4 text-lg font-bold">
            Past Lessons
          </h3>
          <div className="space-y-3">
            {pastLessons.slice(0, 10).map((lesson) => (
              <div key={lesson.lessonId} id={`lesson-${lesson.lessonId}`}>
                <UnifiedLessonCard
                  lesson={lesson}
                  mode="course-details"
                  role="teacher"
                  showActions={false}
                />
              </div>
            ))}
          </div>
          {pastLessons.length > 10 && (
            <p className="text-muted-foreground mt-4 text-center text-sm">
              Showing 10 most recent past lessons
            </p>
          )}
        </div>
      )}

      {liveLessons.length === 0 && upcomingLessons.length === 0 && pastLessons.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-surface-200 bg-surface-50 p-12 text-center">
          <p className="text-muted-foreground">
            No lessons scheduled yet. Add lessons to your course curriculum to see them here.
          </p>
        </div>
      )}
    </div>
  )
}
