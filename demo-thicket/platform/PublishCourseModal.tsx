import { Button } from "@thicket/components/ui/button"
import { Modal } from "@thicket/components/ui/modal/"
import { usePublishCourse } from "@thicket/platform/hooks/usePublishCourse"
import type { Course } from "@thicket/types"

interface PublishCourseModalProps {
  course: Course | null
  isOpen: boolean
  onClose: () => void
}

export function PublishCourseModal({
  course,
  isOpen,
  onClose,
}: PublishCourseModalProps) {
  const {
    isPublishing,
    selectedStatus,
    setSelectedStatus,
    statusOptions,
    enrollmentCount,
    hasEnrollments,
    getButtonLabel,
    handlePublish,
  } = usePublishCourse({
    course,
    onSuccess: onClose,
  })

  if (!course) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="medium"
      aria-labelledby="publish-course-title"
      aria-describedby="publish-course-description"
    >
      <Modal.Header
        id="publish-course-title"
        onClose={onClose}
        subtitle="Choose how you want to save this course"
      >
        Save Course
      </Modal.Header>
      <Modal.Body id="publish-course-description">
        <div className="space-y-6">
          <Modal.CourseCard
            variant="info"
            title={course.title}
            subtitle={`${course.lessons_count} lessons`}
          />

          {course.state === "published" && hasEnrollments && (
            <Modal.Warning variant="warning" title="Note">
              This course has {enrollmentCount} active enrollment{enrollmentCount !== 1 ? 's' : ''}. You cannot revert it to draft status.
            </Modal.Warning>
          )}

          <div className="space-y-3">
            <label className="text-foreground text-sm font-medium">
              Select Status
            </label>
            <div className="space-y-4">
              {statusOptions.map((option) => (
                <label
                  key={option.value}
                  className={`border-default hover:border-strong flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-all ${
                    selectedStatus === option.value
                      ? "bg-brand-50 border-brand-500 ring-brand-500 ring-2"
                      : "bg-surface-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="status"
                    value={option.value}
                    checked={selectedStatus === option.value}
                    onChange={(e) => setSelectedStatus(e.target.value as typeof selectedStatus)}
                    className="accent-brand-600 border-default focus:ring-brand-300 mt-1 h-4 w-4 transition-colors"
                  />
                  <div className="flex-1">
                    <div className="text-foreground font-medium">{option.label}</div>
                    <div className="text-muted-foreground text-sm">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer align="right">
        <Button
          variant="outline"
          onClick={onClose}
          disabled={isPublishing}
        >
          Cancel
        </Button>
        <Button
          variant="brand"
          onClick={handlePublish}
          disabled={isPublishing}
        >
          {getButtonLabel()}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
