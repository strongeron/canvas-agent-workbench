import { useState } from "react"

import { Button } from "@thicket/components/ui/button"
import { Modal } from "@thicket/components/ui/modal/"
import type { Course } from "@thicket/types"

export interface UnpublishCourseModalProps {
  course: Course | null
  isOpen: boolean
  onClose: () => void
  onConfirm: (course: Course) => Promise<void> | void
}

export function UnpublishCourseModal({
  course,
  isOpen,
  onClose,
  onConfirm,
}: UnpublishCourseModalProps) {
  const [isUnpublishing, setIsUnpublishing] = useState(false)

  if (!course) return null

  const handleUnpublish = async () => {
    setIsUnpublishing(true)
    try {
      await Promise.resolve(onConfirm(course))
    } finally {
      setIsUnpublishing(false)
      onClose()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      aria-labelledby="unpublish-course-title"
      aria-describedby="unpublish-course-description"
    >
      <Modal.Header
        title="Unpublish Course"
        subtitle="This course will revert to draft status"
        onClose={onClose}
      />
      <Modal.Body id="unpublish-course-description">
        <div className="space-y-6">
          <Modal.CourseCard
            variant="info"
            title={course.title}
            subtitle={`${course.lessons_count} lessons`}
          />

          <Modal.Warning variant="warning">
            Unpublishing this course will revert it to draft status and hide it from the course catalog.
          </Modal.Warning>

          <Modal.Section title="What happens when you unpublish:">
            <Modal.BulletList
              items={[
                "Course will be hidden from the course catalog",
                "Course status will change to Draft",
                "You can edit and re-publish the course",
                "All course data will be preserved",
              ]}
            />
          </Modal.Section>
        </div>
      </Modal.Body>

      <Modal.Footer align="right">
        <Button
          variant="outline"
          onClick={onClose}
          disabled={isUnpublishing}
        >
          Cancel
        </Button>
        <Button
          variant="brand"
          onClick={() => {
            void handleUnpublish()
          }}
          disabled={isUnpublishing}
        >
          {isUnpublishing ? "Unpublishing..." : "Unpublish Course"}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
