import { Lock, Users } from "lucide-react"

import { Button } from "../components/ui/button"
import { Modal } from "../components/ui/modal"

type CourseLockReason = "in_review" | "has_enrollments"

interface CourseLockModalProps {
  isOpen: boolean
  onClose: () => void
  reason: CourseLockReason
  courseName: string
  onCreateVersion?: () => void
}

export function CourseLockModal({
  isOpen,
  onClose,
  reason,
  courseName,
  onCreateVersion,
}: CourseLockModalProps) {
  const config = {
    in_review: {
      icon: Lock,
      title: "Course Under Review",
      message:
        "This course is currently being reviewed by administrators. You cannot make changes until the review process is complete.",
      showCreateVersion: false,
    },
    has_enrollments: {
      icon: Users,
      title: "Course Has Active Enrollments",
      message:
        "This course has active students enrolled and cannot be edited. To make updates, please create a new course version.",
      showCreateVersion: true,
    },
  }

  const { icon: Icon, title, message, showCreateVersion } = config[reason]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      aria-labelledby="course-lock-title"
      aria-describedby="course-lock-description"
    >
      <Modal.Header title={title} onClose={onClose} />
      <Modal.Body id="course-lock-description">
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
              <Icon className="h-6 w-6 text-warning" />
            </div>
          </div>

          <div className="text-center">
            <p className="mb-1 text-sm text-muted-foreground">Course:</p>
            <p className="text-lg font-semibold">{courseName}</p>
          </div>

          <Modal.Warning variant="warning">
            {message}
          </Modal.Warning>
        </div>
      </Modal.Body>

      <Modal.Footer align="right">
        {showCreateVersion ? (
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="brand"
              onClick={() => {
                onCreateVersion?.()
                onClose()
              }}
            >
              Create New Version
            </Button>
          </>
        ) : (
          <Button variant="brand" onClick={onClose} className="w-full">
            Got It
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  )
}
