import { Link, router } from "@inertiajs/react"
import type { LucideIcon } from "lucide-react"
import { Bell, CheckCircle, ShoppingCart, Video } from "lucide-react"

import { Button } from "@thicket/components/ui/button"
import { isLessonActive } from "@thicket/data/students"
import { course_path, student_course_path, student_lesson_room_path } from "@thicket/routes"
import type { Course, EnrolledCourseWithDetails } from "@thicket/types"

export type CourseCTARole = "student" | "teacher" | "public"
export type CourseCTAVariant = "sidebar" | "card" | "table"

interface CourseCTAConfig {
  show: boolean
  text: string
  icon?: LucideIcon
  variant: "brand" | "secondary" | "waitlist" | "waitlist-soft" | "enrolled" | "outline" | "ghost"
  href?: string
  onClick?: () => void
}

interface GetCourseCTAConfigParams {
  course: Course
  enrollment?: EnrolledCourseWithDetails["enrollment"]
  role: CourseCTARole
  variant: CourseCTAVariant
  authenticated_user?: { id: number }
  is_enrolled?: boolean
  onEnrollClick?: () => void
}

export function getCourseCTAConfig({
  course,
  enrollment,
  role,
  variant,
  authenticated_user,
  is_enrolled = false,
  onEnrollClick,
}: GetCourseCTAConfigParams): CourseCTAConfig {
  // Teacher role: no button
  if (role === "teacher") {
    return {
      show: false,
      text: "",
      variant: "ghost",
    }
  }

  // Student role with enrollment
  if (role === "student" && enrollment) {
    const hasActiveLesson = enrollment.next_lesson_date && isLessonActive(enrollment)

    if (hasActiveLesson && enrollment.whereby_room_url && enrollment.next_lesson_id) {
      return {
        show: true,
        text: variant === "table" ? "Join" : "Join Lesson",
        icon: Video,
        variant: "brand",
        href: student_lesson_room_path(course.id, enrollment.next_lesson_id),
      }
    }

    return {
      show: true,
      text: variant === "table" ? "Details" : "View Course",
      icon: undefined,
      variant: "outline",
      href: student_course_path(course.id),
    }
  }

  // Public role or student without enrollment
  if (course.state === "waitlist") {
    return {
      show: true,
      text: "Join Waitlist",
      icon: Bell,
      variant: variant === "card" ? "waitlist-soft" : "waitlist",
      onClick: onEnrollClick,
    }
  }

  if (course.state === "published") {
    if (authenticated_user && is_enrolled) {
      return {
        show: true,
        text: "View Course",
        icon: CheckCircle,
        variant: "enrolled",
        href: student_course_path(course.id),
      }
    }

    // For card variant, always show button with href (will be handled by parent Link)
    // For sidebar variant, use onClick for enrollment flow
    if (variant === "card") {
      return {
        show: true,
        text: "View Details",
        icon: undefined,
        variant: "brand",
        // Use href for card variant - parent will handle navigation
        href: course_path(course.id),
      }
    }

    return {
      show: true,
      text: `Enroll - $${course.price}`,
      icon: ShoppingCart,
      variant: "brand",
      onClick: onEnrollClick,
    }
  }

  // For card variant, show "View Details" even if state is not published/waitlist
  // This ensures buttons always show on course cards
  if (variant === "card") {
    return {
      show: true,
      text: "View Details",
      icon: undefined,
      variant: "brand",
      href: course_path(course.id),
    }
  }

  // Default: no button
  return {
    show: false,
    text: "",
    variant: "ghost",
  }
}

export interface CourseCTAProps {
  course: Course
  enrollment?: EnrolledCourseWithDetails["enrollment"]
  role?: CourseCTARole
  variant?: CourseCTAVariant
  authenticated_user?: { id: number }
  is_enrolled?: boolean
  onEnrollClick?: () => void
  size?: "sm" | "md" | "lg"
  fullWidth?: boolean
  className?: string
}

export function CourseCTA({
  course,
  enrollment,
  role = "public",
  variant = "card",
  authenticated_user,
  is_enrolled = false,
  onEnrollClick,
  size = "md",
  fullWidth,
  className = "",
}: CourseCTAProps) {
  const config = getCourseCTAConfig({
    course,
    enrollment,
    role,
    variant,
    authenticated_user,
    is_enrolled,
    onEnrollClick,
  })

  if (!config.show) {
    return null
  }

  const buttonProps = {
    variant: config.variant,
    size,
    fullWidth,
    className,
    icon: config.icon,
    rounded: variant === "table" ? "lg" : "lg" as const,
  }

  if (config.href) {
    // For card variant, don't wrap in Link (parent card is already a Link)
    // For other variants, wrap in Link
    if (variant === "card") {
      return (
        <Button {...buttonProps} onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          router.visit(config.href!)
        }}>
          {config.text}
        </Button>
      )
    }
    return (
      <Link href={config.href} className={fullWidth ? "w-full" : ""}>
        <Button {...buttonProps}>{config.text}</Button>
      </Link>
    )
  }

  if (config.onClick) {
    return (
      <Button {...buttonProps} onClick={config.onClick}>
        {config.text}
      </Button>
    )
  }

  return (
    <Button {...buttonProps}>
      {config.text}
    </Button>
  )
}

