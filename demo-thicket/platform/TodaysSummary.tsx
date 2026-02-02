import type { ScheduledLesson } from "@thicket/platform/utils/scheduleUtils"

interface TodaysSummaryProps {
  lessons: ScheduledLesson[]
  role?: "teacher" | "student"
}

export function TodaysSummary({ lessons, role = "teacher" }: TodaysSummaryProps) {
  const today = new Date()
  const todaysLessons = lessons.filter((lesson) => {
    const lessonDate = new Date(lesson.scheduledAt ?? "")
    return (
      lessonDate.getDate() === today.getDate() &&
      lessonDate.getMonth() === today.getMonth() &&
      lessonDate.getFullYear() === today.getFullYear()
    )
  })

  if (todaysLessons.length === 0) {
    return null
  }

  const totalCount = todaysLessons.reduce(
    (sum, lesson) => sum + (lesson.enrolledStudentsCount || 0),
    0
  )

  const firstLabel = role === "teacher" ? "Lessons" : "Lessons"
  const secondLabel = role === "teacher" ? "Students" : "Classmates"

  return (
    <div className="mb-6 rounded-lg bg-brand-50 p-4 border border-brand-200">
      <h3 className="text-brand-900 mb-3 text-sm font-semibold">Today&apos;s Schedule</h3>
      <div className="flex items-center gap-6">
        <div>
          <div className="text-brand-600 text-2xl font-bold">{todaysLessons.length}</div>
          <div className="text-brand-700 text-xs">
            {todaysLessons.length === 1 ? firstLabel.slice(0, -1) : firstLabel}
          </div>
        </div>
        {totalCount > 0 && (
          <div>
            <div className="text-brand-600 text-2xl font-bold">{totalCount}</div>
            <div className="text-brand-700 text-xs">
              {totalCount === 1 ? secondLabel.slice(0, -1) : secondLabel}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
