import { MessageComposerModal } from "../MessageComposer"
import type { Course, CurrentUser, Recipient } from "../hooks/useMessageComposer"

interface Student {
  id: number
  name: string
  avatar_url: string
  course_ids: number[]
}

interface CourseOption {
  id: number
  name: string
  enrolled_students?: number
}

export interface TeacherMessageComposerModalProps {
  isOpen: boolean
  onClose: () => void
  currentUser: CurrentUser
  availableStudents: Student[]
  availableCourses: CourseOption[]
  onSent?: () => void
}

export function TeacherMessageComposerModal({
  isOpen,
  onClose,
  currentUser,
  availableStudents,
  availableCourses,
  onSent,
}: TeacherMessageComposerModalProps) {
  const recipients: Recipient[] = availableStudents.map((s) => ({
    id: s.id,
    name: s.name,
    type: "student" as const,
    avatar_url: s.avatar_url,
    course_ids: s.course_ids,
  }))

  const courses: Course[] = availableCourses.map((c) => ({
    id: c.id,
    name: c.name,
    enrolled_students: c.enrolled_students,
  }))

  return (
    <MessageComposerModal
      isOpen={isOpen}
      onClose={onClose}
      mode="teacher-individual"
      currentUser={currentUser}
      availableCourses={courses}
      availableRecipients={recipients}
      onSent={onSent}
    />
  )
}
