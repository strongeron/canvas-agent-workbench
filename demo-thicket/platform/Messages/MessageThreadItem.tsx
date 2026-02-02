import { BookOpen, Megaphone, Users } from "lucide-react"

import { Badge } from "../../components/ui/badge"
import { UserAvatar } from "../../components/ui/user-avatar"
import { isAnnouncementThread } from "../../data/messages"
import type { MessageThread } from "../../types"
import { formatDate } from "../../utils/formatters"

interface MessageThreadItemProps {
  thread: MessageThread
  isSelected: boolean
  onSelect: () => void
  currentUserId?: number
  userType?: "teacher" | "student"
}

export function MessageThreadItem({
  thread,
  isSelected,
  onSelect,
  currentUserId,
  userType = "teacher",
}: MessageThreadItemProps) {
  const isAnnouncement = isAnnouncementThread(thread)
  const participant = thread.participants.find(
    (p) => currentUserId ? p.id !== currentUserId : p.type !== userType
  )
  const studentCount = isAnnouncement
    ? thread.recipient_count || thread.participants.filter((p) => p.type === "student").length
    : 0

  return (
    <button
      onClick={onSelect}
      className={`group relative w-full text-left transition-colors duration-200 border-b border-surface-100 last:border-b-0 ${
        isSelected
          ? "bg-brand-50"
          : thread.unread_count > 0
          ? "bg-white hover:bg-surface-50"
          : "bg-white hover:bg-surface-50"
      }`}
    >
      <div className="flex items-start gap-3 p-3">
        <div className="relative">
          {isAnnouncement && thread.course_id ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100">
              <Megaphone className="h-5 w-5 text-brand-600" />
            </div>
          ) : (
            <UserAvatar
              src={participant?.avatar_url || ""}
              alt={participant?.name || ""}
              size="md"
              showTeacherBadge={participant?.type === "teacher"}
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {isAnnouncement ? (
                <p
                  className={`truncate text-sm text-foreground ${
                    thread.unread_count > 0 ? "font-bold" : "font-semibold"
                  }`}
                >
                  {thread.course_name}
                </p>
              ) : (
                <>
                  <p
                    className={`truncate text-sm text-foreground ${
                      thread.unread_count > 0 ? "font-bold" : "font-semibold"
                    }`}
                  >
                    {participant?.name}
                  </p>
                  {participant?.type === "teacher" && (
                    <span className="flex-shrink-0 inline-flex items-center rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                      Instructor
                    </span>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <time className="text-xs text-muted">
                {formatDate(thread.last_message_timestamp)}
              </time>
            </div>
          </div>
          <p
            className={`mb-1 truncate text-sm text-foreground ${
              thread.unread_count > 0 ? "font-bold" : "font-medium"
            }`}
          >
            {thread.subject}
          </p>
          <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed mb-2">
            {thread.last_message}
          </p>
          <div className="flex items-center gap-2">
            {isAnnouncement ? (
              <>
                <Badge icon={Megaphone} size="xs" variant="brand-filled">
                  Announcement
                </Badge>
                {studentCount > 0 && (
                  <Badge icon={Users} size="xs" variant="brand">
                    {studentCount} student{studentCount !== 1 ? "s" : ""}
                  </Badge>
                )}
              </>
            ) : thread.course_name ? (
              <Badge icon={BookOpen} size="xs" variant="brand">
                {thread.course_name}
              </Badge>
            ) : (
              <Badge icon={BookOpen} size="xs" variant="secondary">
                Direct Message
              </Badge>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}
