import { CheckCircle2, Clock, FileText } from "lucide-react"

import { Button } from "@thicket/components/ui/button"

interface CourseReviewConfirmationProps {
  courseTitle: string
  status: "draft" | "in_review" | "published"
  onReturnToDashboard: () => void
}

export function CourseReviewConfirmation({
  courseTitle,
  status,
  onReturnToDashboard,
}: CourseReviewConfirmationProps) {
  const isUnderReview = status === "in_review"

  const getStatusConfig = () => {
    switch (status) {
      case "in_review":
        return {
          icon: Clock,
          iconColor: "text-amber-700",
          iconBg: "bg-amber-50",
          title: "Course Sent for Review!",
          description:
            "Thank you for sending your course for review! Our admin team will review it for quality, completeness, and alignment with platform guidelines. You'll receive a notification once it's approved and published.",
          timeline: [
            "Review typically takes 1-2 business days",
            "We check for quality and completeness",
            "You'll be notified via email when approved",
            "Course will be published once approved",
            "You can view your course status in your dashboard",
          ],
        }
      case "published":
        return {
          icon: CheckCircle2,
          iconColor: "text-success",
          iconBg: "bg-green-50",
          title: "Course published successfully",
          description:
            "Your course is now live and available for students to enroll!",
          timeline: [
            "Students can now enroll in your course",
            "You'll be notified of new enrollments",
            "Track your course performance in the dashboard",
          ],
        }
      case "draft":
        return {
          icon: FileText,
          iconColor: "text-neutral-700",
          iconBg: "bg-neutral-50",
          title: "Draft saved successfully",
          description:
            "Your course has been saved as a draft. You can continue editing it anytime before publishing.",
          timeline: [
            "Your draft is saved and ready to edit",
            "Publish when you're ready to submit for review",
            "Only you can see draft courses",
          ],
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  return (
    <div className="mx-auto max-w-2xl py-12">
      <div className="rounded-xl border border-default bg-white p-8 shadow-sm">
        <div className="text-center">
          <div
            className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full ${config.iconBg}`}
          >
            <Icon className={`h-10 w-10 ${config.iconColor}`} strokeWidth={2} />
          </div>

          <h2 className="font-display text-foreground mb-3 text-2xl font-bold">
            {config.title}
          </h2>

          <p className="text-muted-foreground mx-auto mb-2 max-w-xl text-base">
            {config.description}
          </p>

          <div className="bg-brand-50 border-brand-200 mx-auto mt-6 rounded-lg border p-4 text-left">
            <p className="text-brand-900 mb-3 text-sm font-semibold">Course Details:</p>
            <p className="text-brand-800 text-sm">
              <span className="font-medium">Title:</span> {courseTitle}
            </p>
            <p className="text-brand-800 mt-1 text-sm">
              <span className="font-medium">Status:</span>{" "}
              {status === "in_review" ? "Pending Review" : status.charAt(0).toUpperCase() + status.slice(1)}
            </p>
          </div>

          {isUnderReview && (
            <div className="bg-surface-50 border-default mx-auto mt-6 rounded-lg border p-4 text-left">
              <p className="text-foreground mb-3 text-sm font-semibold">What happens next?</p>
              <ul className="space-y-2">
                {config.timeline.map((item, index) => (
                  <li key={index} className="text-muted-foreground flex items-start gap-2 text-sm">
                    <span className="text-brand-500 mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-current" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8 flex justify-center gap-3">
            <Button variant="brand" size="md" onClick={onReturnToDashboard}>
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
