import { Link } from "@thicket/shims/inertia-react"
import { format, isWithinInterval, parseISO } from "date-fns"
import { Calendar, Circle, Clock, Megaphone, Users, Video } from "lucide-react"

import { LearningObjectivesList } from "@thicket/components/learning-objectives-list"
import { Badge } from "@thicket/components/ui/badge"
import { Button } from "@thicket/components/ui/button"
import { getSessionThreads } from "@thicket/data/persistence"
import type { Course, LessonWithProgress } from "@thicket/types"

interface CourseTabHomeProps {
  course: Course & {
    curriculum_with_progress?: LessonWithProgress[]
  }
  enrolledStudentsCount: number
  averageProgress?: number
  userTimezone?: string
}

export function CourseTabHomeTeacher({
  course,
  enrolledStudentsCount,
  averageProgress: _averageProgress = 0,
  userTimezone: _userTimezone,
}: CourseTabHomeProps) {
  const allLessons = course.curriculum_with_progress || course.curriculum || []

  const upcomingLessons = allLessons
    .filter((lesson) => {
      if (!lesson.scheduled_at) return false
      const lessonDate = parseISO(lesson.scheduled_at)
      return lessonDate > new Date()
    })
    .sort((a, b) => {
      const dateA = a.scheduled_at ? parseISO(a.scheduled_at) : new Date()
      const dateB = b.scheduled_at ? parseISO(b.scheduled_at) : new Date()
      return dateA.getTime() - dateB.getTime()
    })

  const nextLesson = upcomingLessons[0]

  const liveLessons = allLessons.filter((lesson) => {
    if (!lesson.scheduled_at) return false
    const lessonDate = parseISO(lesson.scheduled_at)
    const now = new Date()
    const fifteenMinutesBefore = new Date(lessonDate.getTime() - 15 * 60 * 1000)
    const oneHourAfter = new Date(lessonDate.getTime() + 60 * 60 * 1000)
    return isWithinInterval(now, { start: fifteenMinutesBefore, end: oneHourAfter })
  })

  const liveLesson = liveLessons[0]

  const sessionThreads = getSessionThreads()
  const latestAnnouncement = sessionThreads
    .filter((thread) => {
      return (
        thread.course_id === course.id &&
        thread.conversation_type === "course_announcement"
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

              <div className="mt-3 pt-3 border-t border-brand-200">
                <p className="text-muted text-xs">
                  Sent to all {enrolledStudentsCount} enrolled student{enrolledStudentsCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {liveLesson && (
        <div className="rounded-xl border-2 border-success bg-success/5 p-6 shadow-md">
          <div className="mb-4 flex items-center gap-2">
            <Circle className="h-6 w-6 text-success animate-pulse fill-success" />
            <h2 className="font-display text-foreground text-xl font-bold">
              Live Now
            </h2>
          </div>
          <div className="flex items-center gap-4 rounded-lg bg-white p-4 border border-success/20">
            {course.cover_url && (
              <img
                src={course.cover_url}
                alt={course.title}
                className="h-16 w-16 rounded-lg object-cover flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-foreground mb-1 font-semibold">
                {liveLesson.title}
              </h3>
              <p className="text-muted-foreground text-sm mb-2">
                {course.title}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>
                  {liveLesson.scheduled_at && format(parseISO(liveLesson.scheduled_at), "h:mm a")}
                </span>
              </div>
            </div>
            {course.host_whereby_url && (
              <Link href={course.host_whereby_url} target="_blank" className="flex-shrink-0">
                <Button variant="brand" size="sm">
                  <Video className="mr-2 h-4 w-4" />
                  Join as Host
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}

      {!liveLesson && nextLesson && (
        <div className="rounded-lg border border-brand-200 bg-brand-50 p-6">
          <div className="mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-brand-600" />
            <h2 className="font-display text-foreground text-lg font-bold">
              Next Scheduled Lesson
            </h2>
          </div>
          <div className="flex items-center gap-4 rounded-lg bg-white p-4 border border-brand-200">
            {course.cover_url && (
              <img
                src={course.cover_url}
                alt={course.title}
                className="h-16 w-16 rounded-lg object-cover flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-foreground mb-1 font-semibold">
                {nextLesson.title}
              </h3>
              <p className="text-muted-foreground text-sm mb-2 line-clamp-1">
                {nextLesson.description}
              </p>
              {nextLesson.scheduled_at && (
                <div className="flex items-center gap-2">
                  <Badge variant="brand-outline" size="md">
                    {format(parseISO(nextLesson.scheduled_at), "EEEE, MMMM d 'at' h:mm a")}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-lg border border-default bg-white p-6">
          <div className="mb-2 flex items-center gap-2 text-brand-600">
            <Users className="h-5 w-5" />
            <span className="text-sm font-medium">Enrolled Students</span>
          </div>
          <p className="text-foreground text-3xl font-bold">{enrolledStudentsCount}</p>
        </div>

        <div className="rounded-lg border border-default bg-white p-6">
          <div className="mb-2 flex items-center gap-2 text-brand-600">
            <Calendar className="h-5 w-5" />
            <span className="text-sm font-medium">Total Lessons</span>
          </div>
          <p className="text-foreground text-3xl font-bold">{allLessons.length}</p>
        </div>
      </div>

      <div>
        <h2 className="font-display text-foreground mb-4 text-2xl font-bold">
          About This Course
        </h2>
        <p className="text-muted-foreground leading-relaxed">{course.description}</p>
      </div>

      {course.learning_objectives && course.learning_objectives.length > 0 && (
        <div>
          <h2 className="font-display text-foreground mb-4 text-2xl font-bold">
            Learning Objectives
          </h2>
          <LearningObjectivesList objectives={course.learning_objectives} />
        </div>
      )}
    </div>
  )
}
