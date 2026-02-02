import { useState } from "react"

import { Button } from "@thicket/components/ui/button"
import { Modal } from "@thicket/components/ui/modal/"
import type { Course } from "@thicket/types"

interface ArchiveCourseModalProps {
  course: Course | null
  isOpen: boolean
  onClose: () => void
  onConfirm: (course: Course) => Promise<void> | void
}

export function ArchiveCourseModal({
  course,
  isOpen,
  onClose,
  onConfirm,
}: ArchiveCourseModalProps) {
  const [isArchiving, setIsArchiving] = useState(false)

  if (!course) return null

  const handleArchive = async () => {
    setIsArchiving(true)
    try {
      await Promise.resolve(onConfirm(course))
    } finally {
      setIsArchiving(false)
      onClose()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="medium"
      aria-labelledby="archive-course-title"
      aria-describedby="archive-course-description"
    >
      <Modal.Header
        id="archive-course-title"
        onClose={onClose}
        subtitle="This action will hide the course from students"
      >
        Archive Course
      </Modal.Header>
      <Modal.Body id="archive-course-description">
        <div className="space-y-6">
          <Modal.CourseCard
            variant="info"
            title={course.title}
            subtitle={`${course.lessons_count} lessons`}
          />

          <Modal.Warning variant="warning" title="Archive Course">
            Archiving this course will hide it from students and the course catalog.
            You can restore it later by filtering for archived courses.
          </Modal.Warning>

          <Modal.Section title="What happens when you archive:">
            <Modal.BulletList
              items={[
                "Course will be hidden from the course catalog",
                "Students won't be able to enroll",
                "Course can be restored from the archived filter",
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
          disabled={isArchiving}
        >
          Cancel
        </Button>
        <Button
          variant="brand"
          onClick={() => {
            void handleArchive()
          }}
          disabled={isArchiving}
        >
          {isArchiving ? "Archiving..." : "Archive Course"}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
