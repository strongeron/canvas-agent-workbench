import { format } from "date-fns"

import type { Course } from "../../types"

export function useEnrollmentSuccess({
  course,
  onClose,
}: {
  course: Course & { instructor?: any }
  onClose: () => void
}) {
  const firstLessonDate = course.starts_at
    ? format(new Date(course.starts_at), "MMM d, yyyy")
    : "Schedule TBD"

  const handleGoToCourse = () => {
    onClose()
  }

  const handleGoToDashboard = () => {
    onClose()
  }

  return {
    firstLessonDate,
    handleGoToCourse,
    handleGoToDashboard,
  }
}

