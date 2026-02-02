import { router, usePage } from "@thicket/shims/inertia-react"
import { useMemo, useState } from "react"

import { useToast } from "@thicket/hooks/useToast"
import { archiveSessionCourse } from "@thicket/data/persistence"
import { ArchiveCourseModal } from "@thicket/platform/ArchiveCourseModal"
import { CourseFilters } from "@thicket/platform/CourseFilters"
import { PublishCourseModal } from "@thicket/platform/PublishCourseModal"
import { TeacherCourseTable } from "@thicket/platform/TeacherCourseTable"
import { UnpublishCourseModal } from "@thicket/platform/UnpublishCourseModal"
import { getBaseDashboardPath } from "@thicket/platform/utils/userRouteMapping"
import type { Course } from "@thicket/types"

interface TeacherCourseListProps {
  courses: Course[]
}

type CourseState = "draft" | "in_review" | "waitlist" | "published" | "archived"

export function TeacherCourseList({ courses }: TeacherCourseListProps) {
  const { url } = usePage()
  const basePath = getBaseDashboardPath(url)
  const [publishModalOpen, setPublishModalOpen] = useState(false)
  const [archiveModalOpen, setArchiveModalOpen] = useState(false)
  const [unpublishModalOpen, setUnpublishModalOpen] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [activeFilters, setActiveFilters] = useState<CourseState[]>([])
  const toast = useToast()

  const filteredCourses = useMemo(() => {
    if (activeFilters.length > 0) {
      return courses.filter((course) =>
        activeFilters.includes(course.state as CourseState)
      )
    }

    return courses.filter((course) => course.state !== "archived")
  }, [courses, activeFilters])

  const handlePublish = (course: Course) => {
    setSelectedCourse(course)
    setPublishModalOpen(true)
  }

  const handleDuplicate = (course: Course) => {
    router.post(`${basePath}/courses/${course.id}/duplicate`, {}, {
      onSuccess: () => {
        toast.success(`Course "${course.title}" has been duplicated successfully!`)
      },
      onError: () => {
        toast.error("Failed to duplicate course. Please try again.")
      },
    })
  }

  const handleArchive = (course: Course) => {
    setSelectedCourse(course)
    setArchiveModalOpen(true)
  }

  const handleArchiveConfirm = (course: Course) => {
    try {
      const success = archiveSessionCourse(course)
      if (success) {
        toast.success(`Course "${course.title}" has been archived successfully!`)
        router.reload()
      } else {
        toast.error("Failed to archive course. Please try again.")
      }
    } catch {
      toast.error("Failed to archive course. Please try again.")
    }
  }

  const handleUnpublish = (course: Course) => {
    setSelectedCourse(course)
    setUnpublishModalOpen(true)
  }

  const handleUnpublishConfirm = (course: Course) => {
    router.post(
      `${basePath}/courses/${course.id}/unpublish`,
      {},
      {
        onSuccess: () => {
          toast.success(`Course "${course.title}" has been unpublished and reverted to draft!`)
          router.reload()
        },
        onError: () => {
          toast.error("Failed to unpublish course. Please try again.")
        },
      }
    )
  }

  const handleEdit = (courseId: number) => {
    router.visit(`${basePath}/courses/${courseId}/edit`)
  }
  return (
    <>
      <div className="mb-6 space-y-4">
        <CourseFilters
          onFilterChange={setActiveFilters}
          activeFilters={activeFilters}
        />

        {filteredCourses.length === 0 && (
          <div className="bg-surface-50 rounded-lg border border-default p-8 text-center">
            <p className="text-muted-foreground">
              {activeFilters.length > 0
                ? "No courses match the selected filters."
                : "No courses found."}
            </p>
          </div>
        )}
      </div>

      {filteredCourses.length > 0 && (
        <TeacherCourseTable
          courses={filteredCourses}
          onPublish={handlePublish}
          onDuplicate={handleDuplicate}
          onArchive={handleArchive}
          onUnpublish={handleUnpublish}
          onEdit={handleEdit}
        />
      )}

      <PublishCourseModal
        course={selectedCourse}
        isOpen={publishModalOpen}
        onClose={() => {
          setPublishModalOpen(false)
          setSelectedCourse(null)
        }}
      />

      <ArchiveCourseModal
        course={selectedCourse}
        isOpen={archiveModalOpen}
        onClose={() => {
          setArchiveModalOpen(false)
          setSelectedCourse(null)
        }}
        onConfirm={handleArchiveConfirm}
      />

      <UnpublishCourseModal
        course={selectedCourse}
        isOpen={unpublishModalOpen}
        onClose={() => {
          setUnpublishModalOpen(false)
          setSelectedCourse(null)
        }}
        onConfirm={handleUnpublishConfirm}
      />
    </>
  )
}
