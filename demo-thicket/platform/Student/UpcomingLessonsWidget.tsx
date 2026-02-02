import { Link } from "@thicket/shims/inertia-react"
import { Calendar, ChevronRight } from "lucide-react"

import { Button } from "@thicket/components/ui/button"
import { UnifiedLessonCard } from "@thicket/platform/UnifiedLessonCard"
import { scheduledLessonToUnified } from "@thicket/platform/utils/lessonDataTransformers"
import { type ScheduledLesson, groupLessonsByDate } from "@thicket/platform/utils/scheduleUtils"

export interface UpcomingLessonsWidgetProps {
  lessons: ScheduledLesson[]
  userTimezone?: string
  courseTimezones?: Record<number, string>
}

function DateHeader({ date }: { date: string }) {
  return (
    <div className="py-2">
      <h3 className="font-display text-foreground text-base font-semibold">{date}</h3>
    </div>
  )
}

export function UpcomingLessonsWidget({ lessons, userTimezone, courseTimezones }: UpcomingLessonsWidgetProps) {
  const upcomingLessons = lessons.slice(0, 3)

  if (upcomingLessons.length === 0) {
    return null
  }

  const groupedLessons = groupLessonsByDate(upcomingLessons)

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
          href="/student/schedule"
          className="text-brand-600 hover:text-brand-700 flex items-center gap-1 text-sm font-medium transition-colors"
        >
          View Schedule
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="space-y-5">
        {Array.from(groupedLessons.entries()).map(([date, dateLessons]) => (
          <div key={date}>
            <DateHeader date={date} />
            <div className="space-y-4 mt-2">
              {dateLessons.map((lesson) => (
                <UnifiedLessonCard
                  key={`${lesson.courseId}-${lesson.lessonId}`}
                  lesson={scheduledLessonToUnified(
                    lesson,
                    userTimezone,
                    courseTimezones?.[lesson.courseId]
                  )}
                  mode="schedule"
                  role="student"
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {lessons.length > 3 && (
        <div className="mt-4 text-center">
          <Link href="/student/schedule">
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
