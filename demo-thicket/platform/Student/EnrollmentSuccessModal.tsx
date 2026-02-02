import { ArrowRight, Calendar, CheckCircle, User } from "lucide-react"

import { Button } from "../../components/ui/button"
import { Modal } from "../../components/ui/modal"
import { useEnrollmentSuccess } from "../hooks/useEnrollmentSuccess"
import type { AuthorProfile, Course } from "../../types"

export interface EnrollmentSuccessModalProps {
  course: Course & { instructor?: AuthorProfile }
  onClose: () => void
}

export function EnrollmentSuccessModal({
  course,
  onClose,
}: EnrollmentSuccessModalProps) {
  const { handleGoToCourse, handleGoToDashboard, firstLessonDate } =
    useEnrollmentSuccess({ course, onClose })

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      size="medium"
      aria-labelledby="enrollment-success-title"
      aria-describedby="enrollment-success-description"
    >
      <Modal.Body id="enrollment-success-description" className="text-center">
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-50">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
          </div>

          <div>
            <h2
              id="enrollment-success-title"
              className="font-display text-foreground mb-2 text-2xl font-bold"
            >
              Successfully Enrolled!
            </h2>
            <p className="text-muted-foreground text-base">
              Welcome to {course.title}! Your learning journey begins now.
            </p>
          </div>

          <div className="space-y-4 rounded-xl border border-default bg-surface-50 p-6 text-left">
            <Modal.InfoSection
              icon={Calendar}
              title="First Lesson"
              description={firstLessonDate}
            />

            {course.instructor && (
              <Modal.InfoSection
                icon={User}
                title="Your Instructor"
                description={course.instructor.name}
              />
            )}
          </div>

          <div className="rounded-lg bg-blue-50 p-4 text-left">
            <h3 className="text-foreground mb-3 text-sm font-semibold">
              What&apos;s Next?
            </h3>
            <Modal.BulletList
              items={[
                "Access course materials and lesson schedule",
                "Join live sessions with your instructor",
                "Connect with fellow students",
              ]}
              bulletColor="text-blue-600"
              className="text-muted-foreground"
            />
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer align="left" className="flex-nowrap gap-3">
            <Button
              onClick={handleGoToDashboard}
              variant="brand"
          size="md"
          fullWidth={false}
              icon={ArrowRight}
            >
              Go to Dashboard
            </Button>
            <Button
              onClick={handleGoToCourse}
              variant="outline"
          size="md"
          fullWidth={false}
            >
              View Course
            </Button>
      </Modal.Footer>
      </Modal>
  )
}
