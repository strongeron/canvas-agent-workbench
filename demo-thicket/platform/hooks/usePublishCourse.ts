import { useMemo, useState } from "react"

import type { Course } from "../../types"

type StatusOption = {
  value: "draft" | "published"
  label: string
  description: string
}

export function usePublishCourse({
  course,
  onSuccess,
}: {
  course: Course | null
  onSuccess?: () => void
}) {
  const [selectedStatus, setSelectedStatus] = useState<"draft" | "published">(
    (course?.state as "draft" | "published") || "draft",
  )
  const [isPublishing, setIsPublishing] = useState(false)

  const enrollmentCount = course?.enrollment_count ?? 0
  const hasEnrollments = enrollmentCount > 0

  const statusOptions: StatusOption[] = useMemo(
    () => [
      {
        value: "draft",
        label: "Keep as Draft",
        description: "Continue editing before publishing.",
      },
      {
        value: "published",
        label: "Publish Course",
        description: "Make this course available to students.",
      },
    ],
    [],
  )

  const getButtonLabel = () => (isPublishing ? "Saving..." : "Save Course")

  const handlePublish = () => {
    setIsPublishing(true)
    setTimeout(() => {
      setIsPublishing(false)
      onSuccess?.()
    }, 600)
  }

  return {
    isPublishing,
    selectedStatus,
    setSelectedStatus,
    statusOptions,
    enrollmentCount,
    hasEnrollments,
    getButtonLabel,
    handlePublish,
  }
}

