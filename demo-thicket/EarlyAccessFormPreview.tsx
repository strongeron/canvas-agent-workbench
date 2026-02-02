import { useState } from "react"

import { Button } from "./components/ui/button"
import { CourseCover } from "./components/ui/course-cover"
import { Input } from "./components/ui/input"
import { Modal } from "./components/ui/modal/"

interface EarlyAccessFormPreviewProps {
  isOpen: boolean
  onClose: () => void
  variant: "general" | "course-waitlist" | "success"
  course?: {
    id: number
    title: string
    cover_url?: string
    instructor?: { name: string }
  }
}

function SuccessMessage() {
  return (
    <div className="text-center">
      <div className="bg-success-surface mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
        <svg
          className="text-success-text h-8 w-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      <h3 className="text-foreground font-display mb-2 text-xl font-bold">
        You&apos;re on the list!
      </h3>
      <p className="text-muted-foreground">
        We&apos;ll notify you when enrollment opens.
      </p>
    </div>
  )
}

function CourseInfo({ course }: { course: NonNullable<EarlyAccessFormPreviewProps["course"]> }) {
  return (
    <div className="bg-surface-50 border-default flex gap-3 rounded-lg border p-3">
      <CourseCover
        coverUrl={course.cover_url}
        title={course.title}
        variant="card"
        size="fixed"
        fixedSize={{ width: 80, height: 80 }}
        placeholderSize="sm"
        className="rounded-lg shrink-0"
      />
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <h3 className="text-foreground font-display mb-1 line-clamp-2 text-sm font-bold">
          {course.title}
        </h3>
        <p className="text-muted text-xs">{course.instructor?.name}</p>
      </div>
    </div>
  )
}

export function EarlyAccessFormPreview({
  isOpen,
  onClose,
  variant,
  course,
}: EarlyAccessFormPreviewProps) {
  const [submitted, setSubmitted] = useState(false)

  const isGeneralInterest = variant === "general"
  const showSuccess = variant === "success" || submitted

  const modalTitles = isGeneralInterest
    ? {
        title: "Join Early Access",
        subtitle: "Be the first to know when we launch",
      }
    : {
        title: "Join Course Waitlist",
        subtitle: "Get notified when this course opens for enrollment",
      }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
  }

  const handleClose = () => {
    setSubmitted(false)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      aria-labelledby="early-access-title"
      aria-describedby="early-access-description"
    >
      {showSuccess ? (
        <Modal.Body>
          <SuccessMessage />
        </Modal.Body>
      ) : (
        <>
          <Modal.Header
            title={modalTitles.title}
            subtitle={modalTitles.subtitle}
            onClose={handleClose}
          />
          <Modal.Body id="early-access-description">
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                {course && <CourseInfo course={course} />}

                <p className="text-muted-foreground text-sm">
                  {isGeneralInterest
                    ? "Join our early access list to be the first to know when Thicket launches."
                    : "Let us know you're interested in this course and we'll notify you when enrollment opens."}
                </p>

                <Input
                  type="email"
                  name="email"
                  label="Email"
                  placeholder="Enter your email"
                  required
                />

                <div>
                  <label className="text-muted-foreground mb-2 block text-sm font-medium">
                    Tell us more (optional)
                  </label>
                  <textarea
                    name="comment"
                    className="border-default text-foreground placeholder:text-muted hover:border-strong focus:ring-brand-500 w-full resize-none rounded-lg border bg-white px-4 py-3 transition-all focus:border-transparent focus:ring-2 focus:outline-none"
                    rows={3}
                    placeholder="What subjects interest you most?"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="newsletter_consent"
                    id="newsletter_consent_preview"
                    className="accent-brand-600 border-default focus:ring-brand-300 h-4 w-4 cursor-pointer rounded transition-colors"
                  />
                  <label
                    htmlFor="newsletter_consent_preview"
                    className="text-muted-foreground cursor-pointer text-sm leading-snug"
                  >
                    Join our mailing list
                  </label>
                </div>

                <Button
                  type="submit"
                  variant="brand"
                  rounded="lg"
                  className="w-full"
                >
                  Join Early Access
                </Button>
              </div>
            </form>
          </Modal.Body>
        </>
      )}
    </Modal>
  )
}

export default EarlyAccessFormPreview
