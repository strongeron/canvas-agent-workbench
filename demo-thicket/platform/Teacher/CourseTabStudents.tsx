import { format, parseISO } from "date-fns"
import { Mail, Users } from "lucide-react"
import { useState } from "react"

import { Badge } from "../../components/ui/badge"
import { Button } from "../../components/ui/button"
import { EmptyState } from "../../components/ui/empty-state"
import { MessageComposerModal } from "../MessageComposerModal"
import { type Column, SortableTable } from "../SortableTable"
import type { Student } from "../../types"

interface CourseStudent {
  id: number
  name: string
  email: string
  avatar_url: string
  enrolled_at: string
  progress_percentage: number
  completed_lessons: number
  total_lessons: number
  last_accessed?: string
  timezone?: string
}

interface CourseTabStudentsProps {
  students: CourseStudent[]
  courseId: number
  courseTitle: string
  instructorId: number
  instructorName: string
  instructorAvatar: string
}

export function CourseTabStudents({
  students,
  courseId,
  courseTitle,
  instructorId,
  instructorName,
  instructorAvatar,
}: CourseTabStudentsProps) {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [showMessageModal, setShowMessageModal] = useState(false)

  const handleMessageClick = (student: CourseStudent) => {
    const studentForModal: Student = {
      id: student.id,
      name: student.name,
      email: student.email,
      avatar_url: student.avatar_url,
      enrolled_courses: [],
      overall_progress: student.progress_percentage,
      last_activity: student.last_accessed || student.enrolled_at,
      courses_completed: 0,
      join_date: student.enrolled_at,
      timezone: student.timezone,
    }
    setSelectedStudent(studentForModal)
    setShowMessageModal(true)
  }

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "MM/dd/yyyy")
    } catch {
      return "N/A"
    }
  }

  const formatLastAccessed = (dateString?: string) => {
    if (!dateString) return "Never"
    const date = new Date(dateString)
    const now = new Date()
    const diffInDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (diffInDays === 0) return "Today"
    if (diffInDays === 1) return "Yesterday"
    if (diffInDays < 7) return `${diffInDays} days ago`
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`
    return formatDate(dateString)
  }

  const isActive = (dateString?: string) => {
    if (!dateString) return false
    const date = new Date(dateString)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    return date > sevenDaysAgo
  }

  if (students.length === 0) {
    return (
      <EmptyState
        icon={<Users className="text-muted h-16 w-16" />}
        title="No students enrolled yet"
        description="Once students enroll in this course, they will appear here."
      />
    )
  }

  const columns: Column<CourseStudent>[] = [
    {
      key: "name",
      label: "Student",
      sortable: true,
      className: "px-4 py-3 lg:px-6 lg:py-4",
      renderCell: (student) => (
        <div className="flex items-center gap-2 lg:gap-3">
          <div className="relative flex-shrink-0">
            <img
              src={student.avatar_url}
              alt={student.name}
              className="h-8 w-8 rounded-full border-2 border-default object-cover lg:h-10 lg:w-10"
            />
            {isActive(student.last_accessed) && (
              <div className="absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 border-white bg-green-500 lg:h-2.5 lg:w-2.5" />
            )}
          </div>
          <div className="min-w-0">
            <div className="font-display text-foreground truncate text-sm font-semibold lg:text-base">
              {student.name}
            </div>
            {student.timezone && (
              <div className="text-muted hidden truncate text-xs lg:block">
                {student.timezone}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "enrolled_at",
      label: "Enrolled",
      sortable: true,
      responsive: "hidden sm:table-cell",
      className: "px-4 py-3 lg:px-6 lg:py-4",
      renderCell: (student) => (
        <div className="text-muted-foreground text-sm">
          {formatDate(student.enrolled_at)}
        </div>
      ),
    },
    {
      key: "progress_percentage",
      label: "Progress",
      sortable: true,
      className: "px-4 py-3 lg:px-6 lg:py-4",
      renderCell: (student) => (
        <div className="flex flex-col gap-1.5">
          <div className="text-foreground text-sm font-semibold tabular-nums">
            {student.completed_lessons}/{student.total_lessons} (
            {student.progress_percentage}%)
          </div>
          <div className="min-w-[100px] max-w-[120px]">
            <div className="h-2 overflow-hidden rounded-full bg-surface-100">
              <div
                className="h-full rounded-full bg-brand-600 transition-all duration-300"
                style={{ width: `${student.progress_percentage}%` }}
              />
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "last_accessed",
      label: "Last Accessed",
      sortable: true,
      responsive: "hidden lg:table-cell",
      className: "px-4 py-3 lg:px-6 lg:py-4",
      sortFn: (a, b, direction) => {
        const aTime = a.last_accessed
          ? new Date(a.last_accessed).getTime()
          : 0
        const bTime = b.last_accessed
          ? new Date(b.last_accessed).getTime()
          : 0
        return direction === "asc" ? aTime - bTime : bTime - aTime
      },
      renderCell: (student) => (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">
            {formatLastAccessed(student.last_accessed)}
          </span>
          {isActive(student.last_accessed) && (
            <Badge variant="brand" size="sm">
              Active
            </Badge>
          )}
        </div>
      ),
    },
  ]

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-foreground text-xl font-bold">
              Enrolled Students
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {students.length} {students.length === 1 ? "student" : "students"}{" "}
              enrolled in this course
            </p>
          </div>
        </div>

        <SortableTable
          columns={columns}
          data={students}
          defaultSortField="name"
          defaultSortDirection="asc"
          rowKey={(student) => student.id}
          minWidth="min-w-[700px]"
          renderActions={(student) => (
            <div className="flex items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="sm"
                rounded="lg"
                icon={Mail}
                onClick={() => handleMessageClick(student)}
                aria-label="Send message"
              >
                Message
              </Button>
            </div>
          )}
        />
      </div>

      {selectedStudent && (
        <MessageComposerModal
          isOpen={showMessageModal}
          onClose={() => {
            setShowMessageModal(false)
            setSelectedStudent(null)
          }}
          recipient={selectedStudent}
          availableCourses={[{ id: courseId, title: courseTitle }]}
          teacherInfo={{
            id: instructorId,
            name: instructorName,
            avatar_url: instructorAvatar,
          }}
          userRole="teacher"
          onSent={() => {
            setShowMessageModal(false)
            setSelectedStudent(null)
          }}
        />
      )}
    </>
  )
}
