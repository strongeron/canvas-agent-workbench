export type ScheduledLesson = {
  courseId: number
  lessonId: number
  scheduledAt?: string
  courseTitle?: string
  lessonTitle?: string
  courseCoverUrl?: string
  recordingUrl?: string
  isCompleted?: boolean
  [key: string]: any
}

export type DateRangeFilter =
  | "today"
  | "this_week"
  | "next_2_weeks"
  | "this_month"
  | "all"

export function getLessonStatus(scheduledAt?: string): "live" | "upcoming" | "past" {
  if (!scheduledAt) return "upcoming"
  const now = Date.now()
  const target = new Date(scheduledAt).getTime()
  const diffMinutes = (target - now) / (1000 * 60)

  if (Math.abs(diffMinutes) <= 60) {
    return "live"
  }
  return diffMinutes > 0 ? "upcoming" : "past"
}

export function groupLessonsByDate(lessons: ScheduledLesson[]) {
  const grouped = new Map<string, ScheduledLesson[]>()
  lessons.forEach((lesson) => {
    const date = lesson.scheduledAt ? new Date(lesson.scheduledAt) : new Date()
    const label = date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
    if (!grouped.has(label)) grouped.set(label, [])
    grouped.get(label)!.push(lesson)
  })
  return grouped
}

export function getDateRangeLabel(range: DateRangeFilter) {
  const labels: Record<DateRangeFilter, string> = {
    today: "Today",
    this_week: "This Week",
    next_2_weeks: "Next 2 Weeks",
    this_month: "This Month",
    all: "All Dates",
  }
  return labels[range]
}

