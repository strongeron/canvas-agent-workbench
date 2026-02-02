import { AlertCircle, CheckCircle2, Clock, FileText } from "lucide-react"

import { Button } from "@thicket/components/ui/button"
import { Modal } from "@thicket/components/ui/modal/"

type CourseStatus = "draft" | "waitlist" | "published"

interface PublishConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  courseTitle: string
  status: CourseStatus
  mode: "create" | "edit"
  isSubmitting: boolean
}

export function PublishConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  courseTitle,
  status,
  mode,
  isSubmitting,
}: PublishConfirmationModalProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "published":
        return {
          icon: CheckCircle2,
          iconColor: "text-success",
          iconBg: "bg-green-50",
          title: "Submit Course for Review?",
          description:
            "Your course will be submitted for review by our team. Once approved, it will be published and available for students to enroll.",
          highlights: [
            "Review typically takes 1-2 business days",
            "You'll receive an email notification when complete",
            "Course will appear as 'In Review' in your dashboard",
            "Students can enroll after approval",
          ],
          confirmLabel: "Submit for Review",
        }
      case "waitlist":
        return {
          icon: Clock,
          iconColor: "text-amber-700",
          iconBg: "bg-amber-50",
          title: "Submit Course for Waitlist Review?",
          description:
            "Your course will be submitted for review. Once approved, students will be able to join the waitlist before enrollment opens.",
          highlights: [
            "Review typically takes 1-2 business days",
            "You'll receive an email notification when complete",
            "Course will appear as 'In Review' in your dashboard",
            "Students can join waitlist after approval",
          ],
          confirmLabel: "Submit for Review",
        }
      case "draft":
        return {
          icon: FileText,
          iconColor: "text-neutral-700",
          iconBg: "bg-neutral-50",
          title: "Save as Draft?",
          description:
            "Your course will be saved as a draft. Only you can see it, and you can continue editing anytime before publishing.",
          highlights: [
            "Draft is saved immediately",
            "Not visible to students",
            "No review required for drafts",
            "Publish when you're ready",
          ],
          confirmLabel: "Save Draft",
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon
  const requiresReview = status === "published" || status === "waitlist"

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="medium"
      aria-labelledby="publish-confirmation-title"
      aria-describedby="publish-confirmation-description"
    >
      <Modal.Header
        id="publish-confirmation-title"
        onClose={onClose}
      subtitle={mode === "edit" ? "Update existing course" : "Create new course"}
    >
        {config.title}
      </Modal.Header>
      <Modal.Body id="publish-confirmation-description">
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${config.iconBg}`}>
              <Icon className={`h-6 w-6 ${config.iconColor}`} strokeWidth={2} />
            </div>
            <div className="flex-1">
              <p className="text-muted-foreground text-sm leading-relaxed">
                {config.description}
              </p>
            </div>
          </div>

          <Modal.CourseCard
            variant="info"
            title={courseTitle}
            subtitle={`Status: ${status.charAt(0).toUpperCase() + status.slice(1)}`}
            className="bg-surface-50 border border-default"
          />

          {requiresReview && (
            <Modal.Warning variant="info" title="What happens next?" icon={AlertCircle}>
              <Modal.BulletList
                items={config.highlights}
                bulletColor="bg-brand-500"
                className="mt-3"
              />
            </Modal.Warning>
          )}

          {!requiresReview && (
            <div className="bg-surface-50 rounded-lg border border-default p-4">
              <Modal.BulletList
                items={config.highlights}
                bulletColor="bg-brand-500"
              />
            </div>
          )}
        </div>
      </Modal.Body>

      <Modal.Footer align="right">
        <Button
          variant="outline"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          variant="brand"
          onClick={onConfirm}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Submitting..." : config.confirmLabel}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
