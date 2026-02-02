import { router } from "@inertiajs/react"
import { ChevronDown, ChevronUp, Megaphone, Send, Users } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { Badge } from "@thicket/components/ui/badge"
import { EmptyState } from "@thicket/components/ui/empty-state"
import { UserAvatar } from "@thicket/components/ui/user-avatar"
import { useToast } from "@thicket/hooks/useToast"
import { isAnnouncementThread } from "@thicket/data/messages"
import { getNextMessageId, saveSessionMessage, saveSessionThread, updateThreadUnreadCount } from "@thicket/data/persistence"
import type { Message, MessageThread } from "@thicket/types"

export interface MessageThreadViewProps {
  thread: MessageThread | null
  currentUserId: number
  userType?: "teacher" | "student"
  onMessageSent?: () => void
}

export function MessageThreadView({
  thread,
  currentUserId,
  userType = "teacher",
  onMessageSent,
}: MessageThreadViewProps) {
  const [replyBody, setReplyBody] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [showAllStudents, setShowAllStudents] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const toast = useToast()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })

    if (thread && thread.unread_count > 0) {
      updateThreadUnreadCount(thread.id, 0)

      const updatedThread: MessageThread = {
        ...thread,
        unread_count: 0,
      }
      saveSessionThread(updatedThread)
    }
  }, [thread])

  if (!thread) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-surface-50/30 p-12">
        <EmptyState
          icon={<Send />}
          title="No conversation selected"
          description="Choose a conversation from the list to start messaging"
        />
      </div>
    )
  }

  const isAnnouncement = thread ? isAnnouncementThread(thread) : false
  const students = thread ? thread.participants.filter(p => p.type === "student") : []
  const studentCount = thread?.recipient_count || students.length
  const displayedStudents = showAllStudents ? students : students.slice(0, 3)
  const hasMoreStudents = students.length > 3

  const handleSendReply = () => {
    if (!replyBody.trim()) {
      toast.error("Please type a message")
      return
    }

    if (!thread) return

    setIsSending(true)

    const recipient = thread.participants.find(
      (p) => !(p.id === currentUserId && p.type === userType)
    )

    if (!recipient) {
      toast.error("Could not find message recipient")
      setIsSending(false)
      return
    }

    const newMessageId = getNextMessageId(thread.messages)
    const timestamp = new Date().toISOString()

    const newMessage: Message = {
      id: newMessageId,
      thread_id: thread.id,
      sender_id: currentUserId,
      sender_type: userType,
      recipient_id: recipient.id,
      recipient_type: recipient.type,
      subject: `Re: ${thread.subject}`,
      body: replyBody.trim(),
      timestamp,
      is_read: false,
      conversation_type: thread.conversation_type,
      parent_message_id: thread.messages[thread.messages.length - 1]?.id || null,
      course_id: thread.course_id,
    }

    const success = saveSessionMessage(newMessage)

    if (success) {
      const updatedThread: MessageThread = {
        ...thread,
        messages: [...thread.messages, newMessage],
        last_message: replyBody.trim().substring(0, 100),
        last_message_timestamp: timestamp,
      }

      saveSessionThread(updatedThread)

      toast.success("Reply sent successfully!")
      setReplyBody("")
      setIsSending(false)

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
      }, 100)

      onMessageSent?.()
      router.reload({ only: ['threads', 'selectedThread'] })
    } else {
      toast.error("Failed to send message")
      setIsSending(false)
    }
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex-shrink-0 border-b border-default bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-foreground text-lg font-semibold leading-tight">
                {thread.subject}
              </h2>
              {isAnnouncement && (
                <Badge variant="brand-filled" size="sm">
                  <Megaphone className="h-3 w-3" />
                  Announcement
                </Badge>
              )}
            </div>
            {thread.course_name && (
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-md bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                <span>{thread.course_name}</span>
              </div>
            )}
            {isAnnouncement ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-2">
                    <Users className="h-4 w-4 text-brand-600" />
                    <span className="text-sm font-medium text-brand-900">
                      {studentCount} student{studentCount !== 1 ? 's' : ''} enrolled
                    </span>
                  </div>
                  {hasMoreStudents && (
                    <button
                      onClick={() => setShowAllStudents(!showAllStudents)}
                      className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50 transition-colors"
                    >
                      {showAllStudents ? (
                        <>
                          Show less <ChevronUp className="h-3 w-3" />
                        </>
                      ) : (
                        <>
                          Show all <ChevronDown className="h-3 w-3" />
                        </>
                      )}
                    </button>
                  )}
                </div>
                {displayedStudents.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    {displayedStudents.map((student) => (
                      <div
                        key={`${student.type}-${student.id}`}
                        className="flex items-center gap-2 rounded-lg bg-surface-50 px-2.5 py-1.5"
                      >
                        <UserAvatar
                          src={student.avatar_url}
                          alt={student.name}
                          size="xs"
                          showTeacherBadge={false}
                        />
                        <span className="text-xs font-medium text-muted-foreground">
                          {student.name}
                        </span>
                      </div>
                    ))}
                    {!showAllStudents && hasMoreStudents && (
                      <div className="flex items-center rounded-lg bg-surface-100 px-2.5 py-1.5">
                        <span className="text-xs font-medium text-muted">
                          +{students.length - 3} more
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {thread.participants.map((participant) => {
                  const isInstructor = participant.type === "teacher"
                  return (
                    <div
                      key={`${participant.type}-${participant.id}`}
                      className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 ${
                        isInstructor ? "bg-brand-50" : "bg-surface-50"
                      }`}
                    >
                      <UserAvatar
                        src={participant.avatar_url}
                        alt={participant.name}
                        size="sm"
                        showTeacherBadge={isInstructor}
                      />
                      <span className={`text-sm font-medium ${isInstructor ? "text-brand-900" : "text-muted-foreground"}`}>
                        {participant.name}
                      </span>
                      {isInstructor && (
                        <span className="inline-flex items-center rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
                          Instructor
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-surface-50/30 flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {thread.messages.map((message, index) => {
            const isCurrentUser =
              message.sender_id === currentUserId &&
              message.sender_type === userType
            const sender = thread.participants.find(
              (p) =>
                p.id === message.sender_id && p.type === message.sender_type
            )

            return (
              <div
                key={`${thread.id}-${message.id}-${index}`}
                className={`flex items-start gap-3 rounded-lg p-3 -mx-3 transition-colors ${
                  isCurrentUser ? "bg-brand-50" : ""
                }`}
              >
                <UserAvatar
                  src={sender?.avatar_url || ""}
                  alt={sender?.name || ""}
                  size="md"
                  showTeacherBadge={sender?.type === "teacher"}
                />
                <div className="flex-1 min-w-0">
                  <div className="mb-1 flex items-baseline gap-2">
                    <span className="text-foreground text-sm font-semibold">
                      {sender?.name}
                      {isCurrentUser && (
                        <span className="ml-2 text-xs text-brand-600 font-medium">(You)</span>
                      )}
                    </span>
                    <time className="text-muted text-xs">
                      {new Date(message.timestamp).toLocaleTimeString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        }
                      )}
                    </time>
                  </div>
                  <div className="text-foreground text-sm leading-relaxed">
                    {message.body}
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {!isAnnouncement && (
        <div className="flex-shrink-0 border-t border-default bg-white p-4 shadow-top">
          <div className="flex gap-3">
            <input
              type="text"
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="Type your reply..."
              className="flex-1 rounded-lg border border-default px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  if (replyBody.trim()) {
                    handleSendReply()
                  }
                }
              }}
            />
            <button
              onClick={handleSendReply}
              disabled={isSending || !replyBody.trim()}
              className="rounded-full bg-brand-600 p-3 text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
      {isAnnouncement && (
        <div className="flex-shrink-0 border-t border-default bg-yellow-50 p-4">
          <div className="flex items-center gap-2 text-sm text-yellow-800">
            <Megaphone className="h-4 w-4" />
            <span>This is an announcement. Replies are not available.</span>
          </div>
        </div>
      )}
    </div>
  )
}
