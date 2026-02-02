import { MessageSquare, Send } from "lucide-react"
import { useState } from "react"

import { Button } from "@thicket/components/ui/button"
import { Textarea } from "@thicket/components/ui/textarea"
import { UserAvatar } from "@thicket/components/ui/user-avatar"

interface Message {
  id: number
  author: string
  avatar_url: string
  content: string
  created_at: string
  replies: number
  is_teacher?: boolean
}

export interface CourseTabMessageBoardProps {
  messages?: Message[]
}

export function CourseTabMessageBoard({ messages = [] }: CourseTabMessageBoardProps) {
  const [newMessage, setNewMessage] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    alert("Message board functionality coming soon")
    setNewMessage("")
  }

  return (
    <div>
      <h2 className="font-display text-foreground mb-6 text-2xl font-bold">
        Message Board
      </h2>

      <div className="mb-6 rounded-lg border border-default bg-white p-4">
        <form onSubmit={handleSubmit}>
          <Textarea
            placeholder="Ask a question or start a discussion..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            rows={3}
            className="mb-3"
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              variant="brand"
              size="sm"
              disabled={!newMessage.trim()}
            >
              <Send className="mr-2 h-4 w-4" />
              Post Message
            </Button>
          </div>
        </form>
      </div>

      {messages.length === 0 ? (
        <div className="bg-surface-50/30 p-12 text-center">
          <MessageSquare className="text-muted-foreground mx-auto mb-3 h-12 w-12" />
          <p className="text-muted-foreground">
            No messages yet. Start the conversation!
          </p>
        </div>
      ) : (
        <div className="divide-y divide-default bg-white">
          {messages.map((message) => (
            <div
              key={message.id}
              className="p-4"
            >
              <div className="mb-3 flex items-start gap-3">
                <UserAvatar
                  src={message.avatar_url}
                  alt={message.author}
                  size="md"
                  showTeacherBadge={message.is_teacher || false}
                />
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-foreground font-semibold">
                      {message.author}
                    </span>
                    {message.is_teacher && (
                      <span className="inline-flex items-center rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
                        Instructor
                      </span>
                    )}
                    <span className="text-muted-foreground text-xs">
                      {new Date(message.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {message.content}
                  </p>
                </div>
              </div>
              {message.replies > 0 && (
                <button className="text-brand-600 hover:text-brand-700 text-sm font-medium transition-colors">
                  View {message.replies} {message.replies === 1 ? "reply" : "replies"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
