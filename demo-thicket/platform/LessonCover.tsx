import { CourseCover, type CourseCoverProps } from "../components/ui/course-cover"
import { LessonNumberCover } from "./LessonNumberCover"

export type LessonCoverStatus = "completed" | "locked" | "upcoming" | "live"

export interface LessonCoverProps extends Omit<CourseCoverProps, "children"> {
  /** Lesson number to display when no coverUrl */
  lessonNumber: number
  /** Lesson status for badge styling */
  lessonStatus?: LessonCoverStatus
}

/**
 * Domain-level component for lesson covers.
 * 
 * If coverUrl exists, shows the image.
 * If no coverUrl, shows LessonNumberCover as the fallback.
 * 
 * This component encapsulates the lesson-specific logic while keeping
 * CourseCover generic and reusable.
 */
export function LessonCover({
  coverUrl,
  title,
  lessonNumber,
  lessonStatus = "upcoming",
  ...rest
}: LessonCoverProps) {
  if (coverUrl) {
    return <CourseCover coverUrl={coverUrl} title={title} {...rest} />
  }

  return (
    <CourseCover title={title} {...rest}>
      <LessonNumberCover lessonNumber={lessonNumber} status={lessonStatus} />
    </CourseCover>
  )
}

