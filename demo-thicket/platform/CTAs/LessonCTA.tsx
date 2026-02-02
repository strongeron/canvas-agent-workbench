import { Link } from "../../shims/inertia-react"
import { Clock, Lock, PlayCircle, Video } from "lucide-react"

import { Button } from "../../components/ui/button"
import type { LessonCardMode, LessonCardRole, UnifiedLessonData } from "../UnifiedLessonCard"
import { getLessonDetailedStatus, type LessonStatus } from "../utils/lessonHelpers"
import type { ScheduledLesson } from "../utils/scheduleUtils"

interface CTAConfig {
  show: boolean
  text: string
  icon?: "video" | "play" | "clock" | "lock"
  variant: "brand" | "secondary" | "ghost"
  disabled?: boolean
  href?: string
  action?: () => void
}

// Keep the existing getCTAConfig function from UnifiedLessonCard
function getCTAConfig(
  lesson: UnifiedLessonData | ScheduledLesson,
  status: LessonStatus,
  role: LessonCardRole,
  _mode: LessonCardMode
): CTAConfig {
  const isLive = status === "live"

  if (role === "teacher") {
    if (isLive && lesson.hostWherebyUrl) {
      return {
        show: true,
        text: "Join as Host",
        icon: "video",
        variant: "brand",
        action: () => {
          const windowFeatures = "width=1200,height=800,toolbar=no,menubar=no,location=no,status=no,scrollbars=yes,resizable=yes"
          window.open(lesson.hostWherebyUrl, "_blank", windowFeatures)
        },
      }
    }

    if (isLive && !lesson.hostWherebyUrl) {
      return {
        show: true,
        text: "Room Not Available",
        icon: "clock",
        variant: "ghost",
        disabled: true,
      }
    }

    if (status === "upcoming" || status === "upcoming-next") {
      return {
        show: true,
        text: "Upcoming Session",
        icon: "clock",
        variant: "secondary",
        disabled: true,
      }
    }

    if (status === "past" && lesson.recordingUrl) {
      return {
        show: true,
        text: "View Recording",
        icon: "play",
        variant: "secondary",
        action: () => {
          window.open(lesson.recordingUrl, "_blank")
        },
      }
    }

    return {
      show: false,
      text: "",
      variant: "secondary",
      disabled: true,
    }
  }

  if (isLive && (lesson.wherebyRoomUrl || (lesson as ScheduledLesson).wherebyRoomUrl)) {
    return {
      show: true,
      text: "Join Live Session",
      icon: "video",
      variant: "brand",
      href: `/student/courses/${lesson.courseId}/lessons/${lesson.lessonId}`,
    }
  }

  if (lesson.isLocked) {
    return {
      show: true,
      text: "Locked",
      icon: "lock",
      variant: "ghost",
      disabled: true,
    }
  }

  if ((status === "completed-with-recording" || status === "past") && lesson.recordingUrl) {
    return {
      show: true,
      text: "View Recording",
      icon: "play",
      variant: "secondary",
      href: `/student/courses/${lesson.courseId}/lessons/${lesson.lessonId}/recording`,
    }
  }

  if (status === "upcoming" || status === "upcoming-next") {
    return {
      show: true,
      text: "Upcoming",
      icon: "clock",
      variant: "secondary",
      disabled: true,
    }
  }

  return {
    show: false,
    text: "",
    variant: "secondary",
    disabled: true,
  }
}

export interface LessonCTAProps {
  lesson: UnifiedLessonData | ScheduledLesson
  status?: LessonStatus
  role: LessonCardRole
  mode?: LessonCardMode
  size?: "sm" | "md" | "lg"
  fullWidth?: boolean
  className?: string
  isLive?: boolean
}

const iconMap = {
  video: Video,
  play: PlayCircle,
  clock: Clock,
  lock: Lock,
}

export function LessonCTA({
  lesson,
  status,
  role,
  mode = "dashboard",
  size = "md",
  fullWidth,
  className = "",
  isLive: _isLive,
}: LessonCTAProps) {
  const lessonStatus = status || getLessonDetailedStatus(lesson)
  const config = getCTAConfig(lesson, lessonStatus, role, mode)

  if (!config.show) {
    return null
  }

  const IconComponent = config.icon ? iconMap[config.icon] : undefined

  const buttonContent = (
    <>
      {IconComponent && <IconComponent className="mr-2 h-4 w-4" />}
      {config.text}
    </>
  )

  const buttonProps = {
    variant: config.variant,
    size,
    disabled: config.disabled,
    fullWidth,
    className: className,
  }

  if (config.action) {
    return (
      <Button {...buttonProps} onClick={config.action}>
        {buttonContent}
      </Button>
    )
  }

  if (config.href) {
    return (
      <Link href={config.href} className={fullWidth ? "w-full" : ""}>
        <Button {...buttonProps}>{buttonContent}</Button>
      </Link>
    )
  }

  return (
    <Button {...buttonProps}>
      {buttonContent}
    </Button>
  )
}

