import { Form, router, usePage } from "../shims/inertia-react"
import { track } from "@plausible-analytics/tracker"
import { useEffect } from "react"

import { Button } from "./ui/button"
import { CourseCover } from "./ui/course-cover"
import { Input } from "./ui/input"
import { Modal } from "./ui/modal"
import { early_access_signups_path } from "../routes"
import type { Course } from "../types"

function SuccessMessage({
  title,
  message,
}: {
  title: string
  message: string
}) {
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
        {title}
      </h3>
      <p className="text-muted-foreground">{message}</p>
    </div>
  )
}

function CourseInfo({ course }: { course: Course }) {
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

export function EarlyAccessForm() {
  const { show_early_access, selected_course, shared } = usePage<{
    show_early_access: boolean
    selected_course: Course
    shared?: { modal_success?: { title: string; message: string } }
  }>().props
  const isGeneralInterest = !selected_course

  const selectedCourseTitle = selected_course?.title

  useEffect(() => {
    if (show_early_access) {
      track("modal_join_form_opened", {
        props: { course: selectedCourseTitle },
      })
    }
  }, [show_early_access, selectedCourseTitle])

  const handleCloseEarlyAccess = () => {
    router.replace({
      props: (currentProps) => ({
        ...currentProps,
        selected_course: undefined,
        show_early_access: false,
        shared: undefined,
      }),
      preserveScroll: true,
      preserveState: true,
    })
  }

  const modalTitles = isGeneralInterest
    ? {
        title: "Join Early Access",
        subtitle: "Be the first to know when we launch",
      }
    : {
        title: "Join Course Waitlist",
        subtitle: "Get notified when this course opens for enrollment",
      }

  return (
    <Modal
      isOpen={show_early_access}
      onClose={handleCloseEarlyAccess}
      aria-labelledby="early-access-title"
      aria-describedby="early-access-description"
    >
      {shared?.modal_success ? (
        <Modal.Body>
          <SuccessMessage {...shared?.modal_success} />
        </Modal.Body>
      ) : (
        <>
          <Modal.Header
            title={modalTitles.title}
            subtitle={modalTitles.subtitle}
            onClose={handleCloseEarlyAccess}
          />
          <Modal.Body id="early-access-description">
            <Form
              method="post"
              action={early_access_signups_path()}
              options={{ only: ["shared"] }}
              onSuccess={() => {
                track("modal_join_form_submitted", {
                  props: { course: selected_course?.title },
                })
              }}
            >
              {({ errors, processing }) => (
                <div className="space-y-6">
                  {selected_course && <CourseInfo course={selected_course} />}

                  <p className="text-muted-foreground text-sm">
                    {isGeneralInterest
                      ? "Join our early access list to be the first to know when Thicket launches."
                      : "Let us know you're interested in this course and we'll notify you when enrollment opens."}
                  </p>

                  {selected_course && (
                    <input
                      type="hidden"
                      name="course_id"
                      value={selected_course.id}
                    />
                  )}

                  <Input
                    type="email"
                    name="email"
                    label="Email"
                    placeholder="Enter your email"
                    required
                    error={errors.email}
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
                      id="newsletter_consent"
                      className="accent-brand-600 border-default focus:ring-brand-300 h-4 w-4 cursor-pointer rounded transition-colors"
                    />
                    <label
                      htmlFor="newsletter_consent"
                      className="text-muted-foreground cursor-pointer text-sm leading-snug"
                    >
                      Join our mailing list
                    </label>
                  </div>

                  <Button
                    type="submit"
                    variant="brand"
                    disabled={processing}
                    rounded="lg"
                    className="w-full"
                  >
                    {processing ? "Submitting..." : "Join Early Access"}
                  </Button>
                </div>
              )}
            </Form>
          </Modal.Body>
        </>
      )}
    </Modal>
  )
}
