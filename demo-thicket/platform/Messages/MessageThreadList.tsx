import { MessageSquare } from "lucide-react"
import { type ReactNode, useMemo } from "react"

import { EmptyState } from "@thicket/components/ui/empty-state"
import type { MessageThread } from "@thicket/types"

import { MessageThreadItem } from "./MessageThreadItem"

export interface MessageThreadListProps {
  threads: MessageThread[]
  selectedThreadId: number | null
  onSelectThread: (threadId: number) => void
  currentUserId?: number
  userType?: "teacher" | "student"
  headerContent?: ReactNode
  filterContent?: ReactNode
}

export function MessageThreadList({
  threads,
  selectedThreadId,
  onSelectThread,
  currentUserId,
  userType = "teacher",
  headerContent,
  filterContent,
}: MessageThreadListProps) {
  const filteredThreads = useMemo(() => threads, [threads])

  const emptyState = (
    <EmptyState
      icon={<MessageSquare />}
      title="No messages yet"
      description="Your conversations will appear here when you start messaging"
    />
  )

  if (threads.length === 0) {
    return emptyState
  }

  return (
    <div className="flex h-full flex-col">
      {headerContent && (
        <div className="flex-shrink-0 border-b border-default bg-surface-50 p-4">
          {headerContent}
        </div>
      )}

      {filterContent && (
        <div className="flex-shrink-0 border-b border-default bg-white p-4">
          {filterContent}
        </div>
      )}

      {filteredThreads.length === 0 ? (
        <div className="flex-1 overflow-y-auto">{emptyState}</div>
      ) : (
        <div className="flex-1 overflow-y-auto bg-white">
          {filteredThreads.map((thread) => (
            <MessageThreadItem
              key={thread.id}
              thread={thread}
              isSelected={thread.id === selectedThreadId}
              onSelect={() => onSelectThread(thread.id)}
              currentUserId={currentUserId}
              userType={userType}
            />
          ))}
        </div>
      )}
    </div>
  )
}
