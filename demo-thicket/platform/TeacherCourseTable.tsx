import { Link, router, usePage } from "@thicket/shims/inertia-react"
import { Archive, ArchiveX, Copy, Edit, Eye, Globe, MoreVertical, Users } from "lucide-react"

import { Badge } from "@thicket/components/ui/badge"
import { type Column, DataTable } from "@thicket/components/ui/data-table"
import {
  DropdownMenu,
  DropdownMenuItem,
} from "@thicket/components/ui/dropdown-menu"
import { StatusBadge } from "@thicket/components/ui/status-badge"
import {
  canArchiveCourse,
  canEditCourse,
  canUnpublishCourse,
  getEnrolledCount,
  getMockEnrollment,
  getWaitlistCount,
  hasWaitlist,
  isAtCapacity,
} from "@thicket/platform/utils/calculateTeacherStats"
import { getBaseDashboardPath } from "@thicket/platform/utils/userRouteMapping"
import type { Course } from "@thicket/types"
import { formatCurrency, formatDate } from "@thicket/utils/formatters"

interface TeacherCourseTableProps {
  courses: Course[]
  onPublish: (course: Course) => void
  onDuplicate: (course: Course) => void
  onArchive: (course: Course) => void
  onUnpublish: (course: Course) => void
  onEdit: (courseId: number) => void
}

export function TeacherCourseTable({
  courses,
  onPublish,
  onDuplicate,
  onArchive,
  onUnpublish,
  onEdit,
}: TeacherCourseTableProps) {
  const { url } = usePage()
  const basePath = getBaseDashboardPath(url)

  const handleRowClick = (course: Course, e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (
      target.closest("button") ||
      target.closest('a[href*="/edit"]') ||
      target.closest('[role="menu"]')
    ) {
      return
    }
    router.visit(`${basePath}/courses/${course.id}`)
  }

  const columns: Column<Course>[] = [
    {
      key: "title",
      label: "Course",
      sortable: true,
      renderCell: (course) => (
        <div className="group flex items-center gap-3">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-100">
            {course.cover_url ? (
              <img
                src={course.cover_url}
                alt={course.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <span className="text-muted text-xs">No image</span>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-foreground group-hover:text-brand-600 mb-1 line-clamp-2 font-semibold transition-colors">
              {course.title}
            </h3>
            <p className="text-muted line-clamp-1 text-xs">
              {course.lessons_count} lessons
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "id",
      label: "Enrollment",
      sortable: false,
      renderCell: (course) => {
        const count = getMockEnrollment(course.id)
        const atCapacity = isAtCapacity(count)
        const showWaitlist = hasWaitlist(count)
        const enrolledCount = getEnrolledCount(count)
        const waitlistCount = getWaitlistCount(count)

        if (count === 0) {
          return null
        }

        return (
          <div className="flex flex-col items-start gap-1.5">
            <Badge variant="secondary" size="sm" icon={Users}>
              {enrolledCount}{atCapacity ? ' max' : ''}
            </Badge>
            {showWaitlist && (
              <Badge variant="warning" size="sm" icon={Users}>
                {waitlistCount} waitlist
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      key: "starts_at",
      label: "Date",
      sortable: true,
      renderCell: (course) => (
        <span className="text-foreground text-sm font-medium">{formatDate(course.starts_at)}</span>
      ),
    },
    {
      key: "state",
      label: "Status",
      sortable: true,
      renderCell: (course) => <StatusBadge status={course.state} size="sm" />,
    },
    {
      key: "price",
      label: "Price",
      sortable: true,
      align: "right",
      renderCell: (course) => (
        <span className="text-foreground font-semibold">
          {formatCurrency(course.price)}
        </span>
      ),
    },
  ]

  const handleSortChange = (field: keyof Course, direction: "asc" | "desc") => {
    // DataTable handles sorting internally
    console.log(`Sort changed: ${String(field)} ${direction}`)
  }

  return (
    <DataTable
      columns={columns}
      data={courses}
      sortField="title"
      sortDirection="asc"
      onSortChange={handleSortChange}
      rowKey={(course) => course.id}
      onRowClick={handleRowClick}
      wrapperClassName={courses.some((c) => c.state === "draft") ? "has-draft" : ""}
      renderActions={(course) => {
        const enrollmentCount = getMockEnrollment(course.id)
        const canEdit = canEditCourse(course, enrollmentCount)
        const canArchive = canArchiveCourse(course, enrollmentCount)
        const canUnpublish = canUnpublishCourse(course, enrollmentCount)
        const canSendToReview = course.state === "draft"

        return (
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu
              trigger={
                <button
                  className="text-muted-foreground hover:text-foreground hover:bg-surface-100 rounded-lg p-2 transition-colors"
                  aria-label="Course actions"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              }
              align="right"
            >
              <Link href={`${basePath}/courses/${course.id}`}>
                <DropdownMenuItem icon={<Eye className="h-4 w-4" />}>
                  View Details
                </DropdownMenuItem>
              </Link>

              {(canSendToReview || canUnpublish || canEdit) && (
                <div className="border-default my-1 border-t" />
              )}

              {canSendToReview && (
                <DropdownMenuItem
                  onClick={() => onPublish(course)}
                  icon={<Globe className="h-4 w-4" />}
                >
                  Send to Review
                </DropdownMenuItem>
              )}

              {canUnpublish && (
                <DropdownMenuItem
                  onClick={() => onUnpublish(course)}
                  icon={<ArchiveX className="h-4 w-4" />}
                >
                  Unpublish
                </DropdownMenuItem>
              )}

              {canEdit && (
                <DropdownMenuItem
                  onClick={() => onEdit(course.id)}
                  icon={<Edit className="h-4 w-4" />}
                >
                  Edit
                </DropdownMenuItem>
              )}

              <div className="border-default my-1 border-t" />

              <DropdownMenuItem
                onClick={() => onDuplicate(course)}
                icon={<Copy className="h-4 w-4" />}
              >
                Duplicate
              </DropdownMenuItem>

              {canArchive && (
                <DropdownMenuItem
                  onClick={() => onArchive(course)}
                  icon={<Archive className="h-4 w-4" />}
                >
                  Archive
                </DropdownMenuItem>
              )}
            </DropdownMenu>
          </div>
        )
      }}
    />
  )
}
