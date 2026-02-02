import { format, parseISO } from "date-fns"
import { Calendar, Megaphone } from "lucide-react"

import { Badge } from "../../components/ui/badge"
import { EmptyState } from "../../components/ui/empty-state"
import { getSessionThreads } from "../../data/persistence"

interface CourseTabAnnouncementsProps {
  courseId: number
  courseCoverUrl?: string
  courseTitle: string
}

export function CourseTabAnnouncementsTeacher({
  courseId,
  courseCoverUrl,
  courseTitle,
}: CourseTabAnnouncementsProps) {
  const sessionThreads = getSessionThreads()
  const allThreads = [...sessionThreads]

  const announcements = allThreads
    .filter((thread) => thread.course_id === courseId && thread.conversation_type === "course_announcement")
    .sort((a, b) => {
      return new Date(b.last_message_timestamp).getTime() - new Date(a.last_message_timestamp).getTime()
    })

  if (announcements.length === 0) {
    return (
      <div className="bg-gradient-to-br from-surface-50 to-white rounded-xl p-8">
        <EmptyState
          icon={<Megaphone className="h-16 w-16" />}
          title="No Announcements Yet"
          description="You haven't made any announcements for this course. Use the 'Make an Announcement' button to broadcast messages to all enrolled students."
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h2 className="font-display text-foreground text-2xl font-bold mb-2">
          Course Announcements
        </h2>
        <p className="text-muted-foreground text-sm">
          All announcements you&apos;ve sent to students in {courseTitle}
        </p>
      </div>

      <div className="space-y-4">
        {announcements.map((announcement) => {
          const message = announcement.messages[0]
          if (!message) return null

          return (
            <div
              key={announcement.id}
              className="relative bg-gradient-to-br from-white to-surface-50 border border-default rounded-xl p-6 shadow-sm hover:shadow-md transition-all overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-brand-100/30 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  {courseCoverUrl ? (
                    <img
                      src={courseCoverUrl}
                      alt={courseTitle}
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-100">
                      <Megaphone className="h-6 w-6 text-brand-600" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="brand-filled" size="sm">
                      <Megaphone className="h-3 w-3" />
                      Announcement
                    </Badge>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {format(parseISO(announcement.last_message_timestamp), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-foreground font-semibold text-lg mb-2">
                    {announcement.subject}
                  </h3>

                  <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {message.body}
                  </p>

                  <div className="mt-4 pt-4 border-t border-default">
                    <p className="text-muted text-xs">
                      Sent to all enrolled students
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
