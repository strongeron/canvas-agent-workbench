import { MessageComposerModal } from "@thicket/platform/MessageComposer"
import type { Course, CurrentUser, Recipient } from "@thicket/platform/hooks/useMessageComposer"

interface RecipientOption {
  id: number
  name: string
  type: "teacher" | "student"
  avatar_url: string
  course_ids?: number[]
}

interface CourseOption {
  id: number
  name: string
  instructor?: {
    id: number
    name: string
    avatar_url: string
  }
}

export interface StudentMessageComposerModalProps {
  isOpen: boolean
  onClose: () => void
  currentUser: CurrentUser
  availableRecipients: RecipientOption[]
  availableCourses: CourseOption[]
  onSent?: () => void
}

export function StudentMessageComposerModal({
  isOpen,
  onClose,
  currentUser,
  availableRecipients,
  availableCourses,
  onSent,
}: StudentMessageComposerModalProps) {
  const recipients: Recipient[] = availableRecipients.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    avatar_url: r.avatar_url,
    course_ids: r.course_ids,
  }))

  const courses: Course[] = availableCourses.map((c) => ({
    id: c.id,
    name: c.name,
    instructor: c.instructor,
  }))

  return (
    <MessageComposerModal
      isOpen={isOpen}
      onClose={onClose}
      mode="student-message"
      currentUser={currentUser}
      availableCourses={courses}
      availableRecipients={recipients}
      onSent={onSent}
    />
  )
}
