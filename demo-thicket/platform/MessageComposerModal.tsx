import { MessageComposerModal as UnifiedMessageComposerModal } from "@thicket/platform/MessageComposer/MessageComposerModal"
import type { Course, Recipient } from "@thicket/platform/hooks/useMessageComposer"

interface StudentRecipient {
  id: number
  name: string
  email: string
  avatar_url: string
  enrolled_courses: {
    course_id: number
    [key: string]: unknown
  }[]
}

interface CourseOption {
  id: number
  title: string
}

interface TeacherInfo {
  id: number
  name: string
  avatar_url: string
}

export interface MessageComposerModalProps {
  isOpen: boolean
  onClose: () => void
  recipient: StudentRecipient | null
  availableCourses: CourseOption[]
  teacherInfo: TeacherInfo
  userRole: "teacher" | "student"
  onSent?: () => void
}

export function MessageComposerModal({
  isOpen,
  onClose,
  recipient,
  availableCourses,
  teacherInfo,
  userRole: _userRole,
  onSent,
}: MessageComposerModalProps) {
  if (!recipient) return null

  const recipientData: Recipient = {
    id: recipient.id,
    name: recipient.name,
    type: "student",
    avatar_url: recipient.avatar_url,
    course_ids: recipient.enrolled_courses.map((c) => c.course_id),
  }

  const courses: Course[] = availableCourses.map((c) => ({
    id: c.id,
    name: c.title,
    title: c.title,
  }))

  const displayCourses = courses.filter((course) =>
    recipientData.course_ids?.includes(course.id)
  )

  return (
    <UnifiedMessageComposerModal
      isOpen={isOpen}
      onClose={onClose}
      mode="teacher-individual"
      currentUser={{
        id: teacherInfo.id,
        name: teacherInfo.name,
        avatar_url: teacherInfo.avatar_url,
        type: "teacher",
      }}
      availableCourses={displayCourses.length > 0 ? displayCourses : courses}
      availableRecipients={[recipientData]}
      preselectedRecipient={recipientData}
      onSent={onSent}
    />
  )
}
