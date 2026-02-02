import { MessageComposerModal } from "./MessageComposer"
import type { Course, Recipient } from "./hooks/useMessageComposer"

interface CourseInfo {
  id: number
  title: string
  cover_url?: string
}

interface TeacherInfo {
  id: number
  name: string
  avatar_url: string
}

interface StudentInfo {
  id: number
  name: string
  avatar_url: string
}

interface AnnouncementComposerModalProps {
  isOpen: boolean
  onClose: () => void
  course: CourseInfo
  enrolledStudents: StudentInfo[]
  teacherInfo: TeacherInfo
  onSent?: () => void
}

export function AnnouncementComposerModal({
  isOpen,
  onClose,
  course,
  enrolledStudents,
  teacherInfo,
  onSent,
}: AnnouncementComposerModalProps) {
  const recipients: Recipient[] = enrolledStudents.map((s) => ({
    id: s.id,
    name: s.name,
    type: "student" as const,
    avatar_url: s.avatar_url,
    course_ids: [course.id],
  }))

  const courseData: Course = {
    id: course.id,
    name: course.title,
    title: course.title,
    enrolled_students: enrolledStudents.length,
  }

  return (
    <MessageComposerModal
      isOpen={isOpen}
      onClose={onClose}
      mode="announcement-only"
      currentUser={{
        id: teacherInfo.id,
        name: teacherInfo.name,
        avatar_url: teacherInfo.avatar_url,
        type: "teacher",
      }}
      availableCourses={[courseData]}
      availableRecipients={recipients}
      preselectedCourse={courseData}
      onSent={onSent}
    />
  )
}
