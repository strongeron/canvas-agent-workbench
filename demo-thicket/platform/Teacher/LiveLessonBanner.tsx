import { Circle } from "lucide-react"

import { UnifiedLessonCard, type UnifiedLessonData } from "@thicket/platform/UnifiedLessonCard"
import type { ScheduledLesson } from "@thicket/platform/utils/scheduleUtils"

interface LiveLessonBannerProps {
  lessons: ScheduledLesson[]
  userTimezone?: string
}

export function LiveLessonBanner({ lessons, userTimezone = "America/New_York" }: LiveLessonBannerProps) {
  if (lessons.length === 0) {
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
    userTimezone,
  })

  return (
    <div className="mb-8 rounded-xl border-2 border-success bg-success/5 p-6 shadow-md">
      <div className="mb-4 flex items-center gap-2">
        <Circle className="h-6 w-6 text-success animate-pulse fill-success" />
        <h2 className="font-display text-foreground text-xl font-bold">Live Now</h2>
      </div>
      <div className="space-y-3">
        {lessons.map((lesson) => (
          <UnifiedLessonCard
            key={`${lesson.courseId}-${lesson.lessonId}`}
            lesson={convertToUnified(lesson)}
            mode="live-banner"
            role="teacher"
          />
        ))}
      </div>
    </div>
  )
}
