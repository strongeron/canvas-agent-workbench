import { Link } from "@inertiajs/react"
import { format } from "date-fns"
import { BookOpen } from "lucide-react"

import { Badge } from "@thicket/components/ui/badge"
import { CourseCover } from "@thicket/components/ui/course-cover"
import { CourseCTA } from "@thicket/platform/CTAs/CourseCTA"
import { ImagePlaceholder } from "@thicket/components/ui/image-placeholder"
import { type Column, SortableTable } from "@thicket/platform/SortableTable"
import { student_course_path } from "@thicket/routes"
import type { EnrolledCourseWithDetails } from "@thicket/types"
import { formatDuration } from "@thicket/utils/formatters"

export interface StudentCourseTableProps {
  enrolledCourses: EnrolledCourseWithDetails[]
}

export function StudentCourseTable({ enrolledCourses }: StudentCourseTableProps) {
  const getStatusBadge = (progressPercentage: number) => {
    if (progressPercentage === 100) {
      return <Badge variant="brand-filled" size="sm">Completed</Badge>
    }
    if (progressPercentage > 0) {
      return <Badge variant="brand-outline" size="sm">Enrolled</Badge>
    }
    return <Badge variant="secondary" size="sm">Not Started</Badge>
  }

  const columns: Column<EnrolledCourseWithDetails>[] = [
    {
      key: "course_title" as keyof EnrolledCourseWithDetails,
      label: "Course",
      sortable: true,
      sortFn: (a, b, direction) => {
        const comparison = a.course.title.toLowerCase().localeCompare(b.course.title.toLowerCase())
        return direction === "asc" ? comparison : -comparison
      },
      renderCell: (enrolledCourse) => (
        <Link
          href={student_course_path(enrolledCourse.course.id)}
          className="flex items-center gap-3 group"
        >
          <CourseCover
            coverUrl={enrolledCourse.course.cover_url}
            title={enrolledCourse.course.title}
            variant="card"
            size="fixed"
            fixedSize={{ width: 64, height: 64 }}
            placeholderSize="sm"
            className="rounded-lg shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h3 className="text-foreground mb-1 line-clamp-2 font-semibold group-hover:text-brand-600 transition-colors">
              {enrolledCourse.course.title}
            </h3>
            <div className="flex items-center gap-2">
              <div className="border-default bg-surface-100 h-6 w-6 shrink-0 overflow-hidden rounded-full border">
                {!enrolledCourse.course.instructor?.avatar_url ? (
                  <ImagePlaceholder
                    type="instructor"
                    size="sm"
                    className="rounded-full"
                  />
                ) : (
                  <img
                    src={enrolledCourse.course.instructor.avatar_url}
                    alt={enrolledCourse.course.instructor.name}
                    className="pointer-events-none h-full w-full object-cover object-center"
                    loading="lazy"
                  />
                )}
              </div>
              <span className="text-muted truncate text-xs">
                {enrolledCourse.course.instructor?.name ?? "TBD"}
              </span>
            </div>
          </div>
        </Link>
      ),
    },
    {
      key: "enrollment_progress" as keyof EnrolledCourseWithDetails,
      label: "Progress",
      sortable: true,
      sortFn: (a, b, direction) => {
        const comparison = a.enrollment.progress_percentage - b.enrollment.progress_percentage
        return direction === "asc" ? comparison : -comparison
      },
      renderCell: (enrolledCourse) => (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-foreground text-sm font-semibold">
              {enrolledCourse.enrollment.completed_lessons.length}/{enrolledCourse.course.lessons_count} ({enrolledCourse.enrollment.progress_percentage}%)
            </span>
          </div>
          <div className="h-2 w-32 overflow-hidden rounded-full bg-surface-100">
            <div
              className="h-full rounded-full bg-brand-600 transition-all duration-300"
              style={{ width: `${enrolledCourse.enrollment.progress_percentage}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      key: "enrollment_status" as keyof EnrolledCourseWithDetails,
      label: "Status",
      sortable: true,
      responsive: "hidden lg:table-cell",
      sortFn: (a, b, direction) => {
        const getStatusValue = (percentage: number) => {
          if (percentage === 100) return 3
          if (percentage > 0) return 2
          return 1
        }
        const comparison = getStatusValue(a.enrollment.progress_percentage) - getStatusValue(b.enrollment.progress_percentage)
        return direction === "asc" ? comparison : -comparison
      },
      renderCell: (enrolledCourse) => getStatusBadge(enrolledCourse.enrollment.progress_percentage),
    },
    {
      key: "course_length" as keyof EnrolledCourseWithDetails,
      label: "Length",
      sortable: true,
      responsive: "hidden xl:table-cell",
      sortFn: (a, b, direction) => {
        const comparison = a.course.lessons_count - b.course.lessons_count
        return direction === "asc" ? comparison : -comparison
      },
      renderCell: (enrolledCourse) => (
        <span className="text-foreground flex items-center gap-1.5 text-sm font-medium">
          <BookOpen className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
          {formatDuration(enrolledCourse.course.lessons_count)}
        </span>
      ),
    },
    {
      key: "enrollment_date" as keyof EnrolledCourseWithDetails,
      label: "Enrolled",
      sortable: true,
      responsive: "hidden lg:table-cell",
      sortFn: (a, b, direction) => {
        const dateA = new Date(a.enrollment.enrolled_at).getTime()
        const dateB = new Date(b.enrollment.enrolled_at).getTime()
        return direction === "asc" ? dateA - dateB : dateB - dateA
      },
      renderCell: (enrolledCourse) => (
        <span className="text-foreground text-sm font-medium">
          {format(new Date(enrolledCourse.enrollment.enrolled_at), 'MM/dd/yyyy')}
        </span>
      ),
    },
  ]

  return (
    <>
      <div className="hidden md:block">
        <SortableTable
          columns={columns}
          data={enrolledCourses}
          rowKey={(row) => row.course.id.toString()}
          defaultSortDirection="desc"
          renderActions={(enrolledCourse) => (
            <CourseCTA
              course={enrolledCourse.course}
              enrollment={enrolledCourse.enrollment}
              role="student"
              variant="table"
              size="sm"
            />
          )}
        />
      </div>

      <div className="md:hidden space-y-4">
        {enrolledCourses.map((enrolledCourse) => {
          const { course, enrollment } = enrolledCourse

          return (
            <div
              key={course.id}
              className="overflow-hidden rounded-xl border border-default bg-white shadow-sm"
            >
              <Link href={student_course_path(course.id)}>
                <CourseCover
                  coverUrl={course.cover_url}
                  title={course.title}
                  variant="card"
                  aspectRatio="video"
                />
              </Link>

              <div className="p-4 space-y-4">
                <div>
                  <Link href={student_course_path(course.id)}>
                    <h3 className="text-foreground mb-2 text-lg font-semibold line-clamp-2">
                      {course.title}
                    </h3>
                  </Link>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="border-default bg-surface-100 h-8 w-8 shrink-0 overflow-hidden rounded-full border">
                      {!course.instructor?.avatar_url ? (
                        <ImagePlaceholder
                          type="instructor"
                          size="sm"
                          className="rounded-full"
                        />
                      ) : (
                        <img
                          src={course.instructor.avatar_url}
                          alt={course.instructor.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      )}
                    </div>
                    <span className="text-muted-foreground text-sm font-medium">
                      {course.instructor?.name ?? "TBD"}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Status</span>
                    {getStatusBadge(enrollment.progress_percentage)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5" strokeWidth={2} />
                      Duration
                    </span>
                    <span className="text-foreground font-medium">
                      {formatDuration(course.lessons_count)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Enrolled</span>
                    <span className="text-foreground text-sm font-medium">
                      {format(new Date(enrollment.enrolled_at), 'MM/dd/yyyy')}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-default">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-muted-foreground text-sm font-medium">Progress</span>
                    <span className="text-foreground text-sm font-semibold">
                      {enrollment.completed_lessons.length}/{course.lessons_count} ({enrollment.progress_percentage}%)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-100">
                    <div
                      className="h-full rounded-full bg-brand-600 transition-all duration-300"
                      style={{ width: `${enrollment.progress_percentage}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <CourseCTA
                    course={course}
                    enrollment={enrollment}
                    role="student"
                    variant="table"
                    size="md"
                    fullWidth
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
