import { Link } from "../../shims/inertia-react"
import { Calendar, ChevronRight } from "lucide-react"

import { Button } from "../../components/ui/button"
import { TodaysSummary } from "../TodaysSummary"
import { UnifiedLessonCard, type UnifiedLessonData } from "../UnifiedLessonCard"
import { type ScheduledLesson } from "../utils/scheduleUtils"

export interface UpcomingLessonsWidgetProps {
  lessons: ScheduledLesson[]
  userTimezone?: string
}

export function UpcomingLessonsWidget({ lessons, userTimezone = "America/New_York" }: UpcomingLessonsWidgetProps) {
  const upcomingLessons = lessons.slice(0, 5)

  if (upcomingLessons.length === 0) {
    return null
  }

  const convertToUnified = (lesson: ScheduledLesson): UnifiedLessonData => ({
    id: lesson.lessonId,
    courseId: lesson.courseId,
    courseTitle: lesson.courseTitle,
    courseCoverUrl: lesson.courseCoverUrl,
    lessonId: lesson.lessonId,
    lessonTitle: lesson.lessonTitle,
    lessonDescription: lesson.lessonDescription,
    lessonPosition: lesson.lessonPosition,
    scheduledAt: lesson.scheduledAt,
    hostWherebyUrl: lesson.hostWherebyUrl,
    recordingUrl: lesson.recordingUrl,
    enrolledStudentsCount: lesson.enrolledStudentsCount,
    isCompleted: lesson.isCompleted,
    userTimezone,
  })

  return (
    <div className="rounded-xl border border-default bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-brand-600" />
          <h2 className="font-display text-foreground text-xl font-bold">
            Upcoming Lessons
          </h2>
        </div>
        <Link
          href="/teacher/schedule"
          className="text-brand-600 hover:text-brand-700 flex items-center gap-1 text-sm font-medium transition-colors"
        >
          View Schedule
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <TodaysSummary lessons={lessons} role="teacher" />

      <div className="space-y-4">
        {upcomingLessons.map((lesson) => (
          <UnifiedLessonCard
            key={`${lesson.courseId}-${lesson.lessonId}`}
            lesson={convertToUnified(lesson)}
            mode="schedule"
            role="teacher"
          />
        ))}
      </div>

      {lessons.length > 5 && (
        <div className="mt-4 text-center">
          <Link href="/teacher/schedule">
            <Button variant="ghost" size="sm" fullWidth>
              View All {lessons.length} Upcoming Lessons
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
