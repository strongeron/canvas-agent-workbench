import { usePage } from "@thicket/shims/inertia-react"
import { Mail } from "lucide-react"
import { useState } from "react"

import { Badge } from "@thicket/components/ui/badge"
import { Button } from "@thicket/components/ui/button"
import type { Student } from "@thicket/types"

import { MessageComposerModal } from "./MessageComposerModal"
import { SortableTable } from "./SortableTable"
import type { Column } from "./SortableTable"

interface StudentTableViewProps {
  students: Student[]
  onMessageSent?: () => void
  basePath?: string
  instructorCourses?: { id: number; title: string }[]
  teacherInfo?: { id: number; name: string; avatar_url: string }
}

export function StudentTableView({
  students,
  onMessageSent,
  basePath: _basePath = "/teacher",
  instructorCourses,
  teacherInfo,
}: StudentTableViewProps) {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const page = usePage()

  const pageTeacherInfo = teacherInfo || {
    id: (page.props.authenticated_user as { id?: number })?.id || 2,
    name: (page.props.authenticated_user as { name?: string })?.name ||
      "Teacher",
    avatar_url:
      (page.props.authenticated_user as { avatar_url?: string })?.avatar_url ||
      "",
  }

  const pageCourses =
    instructorCourses ||
    (page.props.instructor_courses as
      | { id: number; title: string }[]
      | undefined) ||
    []

  const handleMessageClick = (student: Student) => {
    setSelectedStudent(student)
    setShowMessageModal(true)
  }

  const formatLastActivity = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (diffInDays === 0) return "Today"
    if (diffInDays === 1) return "Yesterday"
    if (diffInDays < 7) return `${diffInDays} days ago`
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`
    return date.toLocaleDateString()
  }

  const isActive = (dateString: string) => {
    const date = new Date(dateString)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    return date > sevenDaysAgo
  }

  const columns: Column<Student>[] = [
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
            {isActive(student.last_activity) && (
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
      key: "email",
      label: "Email",
      sortable: true,
      responsive: "hidden lg:table-cell",
      className: "px-4 py-3 lg:px-6 lg:py-4",
      renderCell: (student) => (
        <div className="text-muted-foreground min-w-0 max-w-[180px] truncate text-sm xl:max-w-[240px]">
          {student.email}
        </div>
      ),
    },
    {
      key: "enrolled_courses",
      label: "Courses",
      sortable: true,
      responsive: "hidden sm:table-cell",
      className: "px-4 py-3 lg:px-6 lg:py-4",
      sortFn: (a, b, direction) => {
        const aLen = a.enrolled_courses.length
        const bLen = b.enrolled_courses.length
        return direction === "asc" ? aLen - bLen : bLen - aLen
      },
      renderCell: (student) => (
        <Badge variant="default" size="sm">
          {student.enrolled_courses.length}{" "}
          {student.enrolled_courses.length === 1 ? "course" : "courses"}
        </Badge>
      ),
    },
    {
      key: "overall_progress",
      label: "Progress",
      sortable: true,
      responsive: "hidden lg:table-cell",
      className: "px-4 py-3 lg:px-6 lg:py-4",
      renderCell: (student) => {
        const totalCompleted = student.enrolled_courses.reduce(
          (sum, enrollment) =>
            sum + (enrollment.completed_lessons?.length || 0),
          0
        )
        const totalLessons = student.enrolled_courses.reduce(
          (sum, enrollment) => sum + (enrollment.course_lessons_count || 0),
          0
        )

        return (
          <div className="flex flex-col gap-1.5">
            <div className="text-foreground text-sm font-semibold tabular-nums">
              {totalCompleted}/{totalLessons} ({student.overall_progress}%)
            </div>
            <div className="min-w-[120px] max-w-[140px]">
              <div className="h-2 overflow-hidden rounded-full bg-surface-100">
                <div
                  className="h-full rounded-full bg-brand-600 transition-all duration-300"
                  style={{ width: `${student.overall_progress}%` }}
                />
              </div>
            </div>
          </div>
        )
      },
    },
    {
      key: "last_activity",
      label: "Last Activity",
      sortable: true,
      responsive: "hidden xl:table-cell",
      className: "px-4 py-3 lg:px-6 lg:py-4",
      renderCell: (student) => (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">
            {formatLastActivity(student.last_activity)}
          </span>
          {isActive(student.last_activity) && (
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
      <SortableTable
        columns={columns}
        data={students}
        defaultSortField="name"
        defaultSortDirection="asc"
        rowKey={(student) => student.id}
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

      {selectedStudent && (
        <MessageComposerModal
          isOpen={showMessageModal}
          onClose={() => {
            setShowMessageModal(false)
            setSelectedStudent(null)
          }}
          recipient={selectedStudent}
          availableCourses={pageCourses}
          teacherInfo={pageTeacherInfo}
          userRole="teacher"
          onSent={() => {
            setShowMessageModal(false)
            setSelectedStudent(null)
            onMessageSent?.()
          }}
        />
      )}
    </>
  )
}
