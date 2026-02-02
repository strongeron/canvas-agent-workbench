import { Link } from "../../shims/inertia-react"
import { format, formatDistanceToNow, parseISO } from "date-fns"
import { Calendar, CircleCheck, Clock, ExternalLink, Lock, PlayCircle, Video } from "lucide-react"

import { Badge } from "../../components/ui/badge"
import { Button } from "../../components/ui/button"
import { CourseCover } from "../../components/ui/course-cover"
import {
  FilesList,
  ObjectivesList,
  TimezoneConversionBadge,
  TopicsList,
} from "../shared-lesson-card-primitives"
import {
  type LessonStatus,
  getCTAConfig,
  getLessonDetailedStatus,
} from "../utils/lessonHelpers"
import { formatWithTimezoneAbbr } from "../utils/timezoneHelpers"
import type { Assignment } from "../../types"

export type LessonCardMode = "dashboard" | "schedule" | "course-details" | "hero"

export interface UnifiedLessonData {
  id: number
  courseId: number
  courseTitle?: string
  courseCoverUrl?: string
  lessonId: number
  lessonTitle: string
  lessonDescription: string
  lessonPosition: number
  scheduledAt?: string
  wherebyRoomUrl?: string
  recordingUrl?: string
  startedAt?: string
  topics?: string[]
  isCompleted?: boolean
  isLocked?: boolean
  isNext?: boolean
  learningObjectives?: string[]
  assignments?: Assignment[]
  classmatesCount?: number
  enrolledStudentsCount?: number
  courseTimezone?: string
  userTimezone: string
}

interface LessonCardProps {
  lesson: UnifiedLessonData
  mode: LessonCardMode
}

function LessonStatusBadge({ status, isLive: _isLive }: { status: LessonStatus; isLive?: boolean }) {
  const config = {
    "completed-with-recording": {
      variant: "brand-filled" as const,
      icon: <CircleCheck className="h-3 w-3" />,
      text: "Completed",
      showPulse: false,
    },
    "completed-no-recording": {
      variant: "brand-filled" as const,
      icon: <CircleCheck className="h-3 w-3" />,
      text: "Completed",
      showPulse: false,
    },
    live: {
      variant: "brand-filled" as const,
      icon: null,
      text: "Live Now",
      showPulse: true,
    },
    "upcoming-next": {
      variant: "brand-filled" as const,
      icon: null,
      text: "Next Lesson",
      showPulse: false,
    },
    upcoming: {
      variant: "brand-outline" as const,
      icon: null,
      text: "Upcoming",
      showPulse: false,
    },
    locked: {
      variant: "secondary" as const,
      icon: <Lock className="h-3 w-3" />,
      text: "Locked",
      showPulse: false,
    },
    past: {
      variant: "brand-outline" as const,
      icon: null,
      text: "Past",
      showPulse: false,
    },
  }

  const badgeConfig = config[status]

  return (
    <Badge variant={badgeConfig.variant} size="sm">
      {badgeConfig.showPulse && <span className="h-2 w-2 rounded-full bg-current animate-pulse" />}
      {badgeConfig.icon}
      {badgeConfig.text}
    </Badge>
  )
}


export function LessonCard({ lesson, mode }: LessonCardProps) {
  const status = getLessonDetailedStatus(lesson)
  const isLive = status === "live"
  const ctaConfig = getCTAConfig(lesson, status, mode)

  const displayTimestamp = lesson.isCompleted && lesson.startedAt
    ? lesson.startedAt
    : lesson.scheduledAt

  const getTimeDisplay = () => {
    if (!displayTimestamp) return "Schedule TBD"

    if (isLive && mode === "schedule") {
      const lessonDate = parseISO(displayTimestamp)
      const now = new Date()
      const minutesAgo = Math.floor((now.getTime() - lessonDate.getTime()) / (1000 * 60))

      if (minutesAgo >= 0 && minutesAgo <= 5) {
        return "Starting now"
      }
      if (minutesAgo > 5) {
        return `Started ${formatDistanceToNow(lessonDate, { addSuffix: true })}`
      }
      return format(lessonDate, "h:mm a")
    }

    return formatWithTimezoneAbbr(displayTimestamp, lesson.userTimezone)
  }

  const formattedDateTime = getTimeDisplay()

  if (mode === "hero") {
    const statusConfig = {
      live: {
        label: "Live Now",
        color: "bg-success text-white",
        borderColor: "border-success",
      },
      next: {
        label: "Next Lesson",
        color: "bg-brand-500 text-white",
        borderColor: "border-brand-500",
      },
      upcoming: {
        label: "Upcoming",
        color: "bg-brand-500 text-white",
        borderColor: "border-brand-500",
      },
      completed: {
        label: "Completed",
        color: "bg-surface-300 text-muted-foreground",
        borderColor: "border-default",
      },
      locked: {
        label: "Locked",
        color: "bg-surface-300 text-muted",
        borderColor: "border-default",
      },
    }

    const config = lesson.isLocked
      ? statusConfig.locked
      : lesson.isCompleted
        ? statusConfig.completed
        : isLive
          ? statusConfig.live
          : lesson.isNext
            ? statusConfig.next
            : statusConfig.upcoming

    const formatTimeDisplay = () => {
      if (!lesson.scheduledAt) return "Schedule TBD"

      if (isLive) {
        return "Happening now"
      }

      const distance = formatDistanceToNow(parseISO(lesson.scheduledAt), { addSuffix: true })
      return distance
    }

    return (
      <div className={`rounded-xl border-2 ${config.borderColor} bg-white overflow-hidden shadow-lg`}>
        <div className="p-6 md:p-8">
          <div className="mb-2 flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${config.color}`}>
              {isLive && <span className="h-2 w-2 rounded-full bg-current animate-pulse" />}
              {config.label}
            </span>
            <span className="text-muted text-sm">Lesson {lesson.lessonPosition}</span>
          </div>

          <h3 className="font-display text-foreground mb-3 text-2xl md:text-3xl font-bold">
            {lesson.lessonTitle}
          </h3>

          {lesson.lessonDescription && (
            <p className="text-muted-foreground mb-6 text-base">{lesson.lessonDescription}</p>
          )}

          <div className="mb-6 rounded-lg bg-surface-50 border border-default p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-white p-2 border border-default">
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="text-muted mb-1 text-xs font-medium uppercase tracking-wide">
                  Scheduled
                </div>
                <div className="text-foreground text-base font-semibold">{formatTimeDisplay()}</div>
              </div>
            </div>
          </div>

          {lesson.lessonDescription && (
            <p className="text-muted-foreground mb-4 text-base">{lesson.lessonDescription}</p>
          )}

          {lesson.topics && lesson.topics.length > 0 && (
            <div className="mb-4">
              <TopicsList topics={lesson.topics} />
            </div>
          )}

          {lesson.learningObjectives && lesson.learningObjectives.length > 0 && (
            <div className="mb-4">
              <ObjectivesList objectives={lesson.learningObjectives} />
            </div>
          )}

          {ctaConfig.show && ctaConfig.href ? (
            <Link href={ctaConfig.href}>
              <Button
                variant={ctaConfig.variant}
                size="lg"
                fullWidth
                icon={ctaConfig.icon === "video" ? Video : PlayCircle}
                className="shadow-lg"
              >
                {ctaConfig.text}
              </Button>
            </Link>
          ) : ctaConfig.show ? (
            <Button
              variant={ctaConfig.variant}
              size="lg"
              fullWidth
              icon={ctaConfig.icon === "lock" ? Lock : Clock}
              disabled={ctaConfig.disabled}
            >
              {ctaConfig.text}
            </Button>
          ) : null}

          {ctaConfig.helperText && (
            <p className="text-muted mt-3 text-center text-xs">
              {ctaConfig.helperText}
            </p>
          )}
        </div>
      </div>
    )
  }

  const containerClasses =
    mode === "dashboard"
      ? "rounded-lg border border-default bg-white p-4 hover:shadow-md transition-shadow"
      : mode === "schedule"
        ? `rounded-lg border p-4 hover:shadow-md transition-shadow ${
            isLive
              ? "border-success bg-success/5 shadow-md"
              : status === "past" || lesson.isCompleted
                ? "border-brand-200 bg-brand-50/30"
                : "border-default bg-white"
          }`
        : `rounded-lg border bg-white p-4 sm:p-6 transition-all ${
            lesson.isCompleted
              ? "border-brand-200 bg-brand-50/30"
              : isLive
                ? "border-brand-500 bg-brand-50 shadow-lg ring-2 ring-brand-300"
                : lesson.isLocked
                  ? "border-surface-200 bg-surface-50"
                  : "border-default hover:shadow-md"
          }`

  if (mode === "course-details") {
    return (
      <div className={containerClasses}>
        <div className="flex items-start gap-3">
          <CourseCover
            coverUrl={lesson.courseCoverUrl}
            title={lesson.courseTitle || "Course"}
            variant="icon"
            size="md"
          />

          <div className="flex-1 min-w-0">
            <div className="mb-2 flex items-center gap-2 flex-wrap">
              <LessonStatusBadge status={status} isLive={isLive} />
              <span className="text-muted text-xs">Lesson {lesson.lessonPosition}</span>
            </div>

            <h4 className={`font-display mb-1 font-semibold text-base ${lesson.isLocked ? "text-surface-400" : "text-foreground"}`}>
              {lesson.lessonTitle}
            </h4>

            {lesson.lessonDescription && (
              <p className={`text-sm mb-3 ${lesson.isLocked ? "text-surface-400" : "text-muted-foreground"}`}>
                {lesson.lessonDescription}
              </p>
            )}

            {lesson.topics && lesson.topics.length > 0 && (
              <div className="mb-3">
                <TopicsList topics={lesson.topics} isLocked={lesson.isLocked} />
              </div>
            )}

            {lesson.learningObjectives && lesson.learningObjectives.length > 0 && (
              <div className="mb-3">
                <ObjectivesList objectives={lesson.learningObjectives} isLocked={lesson.isLocked} />
              </div>
            )}

            {lesson.assignments && lesson.assignments.length > 0 && (
              <div className="mb-3">
                <FilesList
                  assignments={lesson.assignments}
                  isLocked={lesson.isLocked}
                />
              </div>
            )}

            {ctaConfig.show && ctaConfig.href && (
              <Link href={ctaConfig.href} className="block mb-2">
                <Button
                  variant={ctaConfig.variant}
                  size="sm"
                  fullWidth
                  className={ctaConfig.variant === "secondary" ? "border-brand-200 text-brand-700 hover:bg-brand-50" : ""}
                >
                  {ctaConfig.icon === "video" && <Video className="mr-1.5 h-3.5 w-3.5" />}
                  {ctaConfig.icon === "play" && <PlayCircle className="mr-1.5 h-3.5 w-3.5" />}
                  {ctaConfig.text}
                </Button>
              </Link>
            )}

            {displayTimestamp && (
              <div className="text-left">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{formattedDateTime}</span>
                </div>
                <TimezoneConversionBadge
                  courseTimezone={lesson.courseTimezone}
                  userTimezone={lesson.userTimezone}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={containerClasses}>
      <div className="flex flex-col sm:flex-row items-start gap-4">
        <div className="flex items-start gap-3 sm:gap-4 w-full sm:w-auto">
          {lesson.courseCoverUrl ? (
            <img
              src={lesson.courseCoverUrl}
              alt={lesson.courseTitle || "Course"}
              className="h-16 w-16 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div className="h-16 w-16 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
              <Calendar className="h-8 w-8 text-brand-600" />
            </div>
          )}

          <div className="flex-1 min-w-0 sm:hidden">
            <div className="mb-2 flex items-center gap-2 flex-wrap">
              <LessonStatusBadge status={status} isLive={isLive} />
              <span className="text-muted text-xs">Lesson {lesson.lessonPosition}</span>
            </div>

            <h4 className={`font-display mb-1 font-semibold text-base ${lesson.isLocked ? "text-surface-400" : "text-foreground"}`}>
              {lesson.lessonTitle}
            </h4>
          </div>
        </div>

        <div className="flex-1 min-w-0 w-full sm:w-auto hidden sm:block">
          <div className="mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <LessonStatusBadge status={status} isLive={isLive} />
              <span className="text-muted text-xs">Lesson {lesson.lessonPosition}</span>
            </div>

            <h4 className={`font-display mb-1 font-semibold text-base ${lesson.isLocked ? "text-surface-400" : "text-foreground"}`}>
              {lesson.lessonTitle}
            </h4>
          </div>

          {lesson.courseTitle && (
            <p className={`text-sm mb-2 ${lesson.isLocked ? "text-surface-400" : "text-muted-foreground"}`}>
              {lesson.courseTitle}
            </p>
          )}

          {lesson.lessonDescription && (
            <p className={`text-sm mb-2 ${lesson.isLocked ? "text-surface-400" : "text-muted-foreground"}`}>
              {lesson.lessonDescription}
            </p>
          )}

          {lesson.topics && lesson.topics.length > 0 && mode !== "dashboard" && (
            <div className="mb-2">
              <TopicsList topics={lesson.topics} isLocked={lesson.isLocked} />
            </div>
          )}

          {lesson.learningObjectives && lesson.learningObjectives.length > 0 && mode !== "dashboard" && (
            <div className="mb-2">
              <ObjectivesList objectives={lesson.learningObjectives} isLocked={lesson.isLocked} />
            </div>
          )}
        </div>

        <div className="flex flex-col items-start sm:items-end gap-2 w-full sm:w-auto sm:flex-shrink-0">
          {ctaConfig.show && ctaConfig.href && (
            <Link href={ctaConfig.href} className="w-full sm:w-auto">
              <Button
                variant={ctaConfig.variant}
                size="sm"
                className={`w-full sm:w-auto ${ctaConfig.variant === "secondary" ? "border-brand-200 text-brand-700 hover:bg-brand-50" : ""}`}
              >
                {ctaConfig.icon === "video" && <Video className="mr-1.5 h-3.5 w-3.5" />}
                {ctaConfig.icon === "play" && <PlayCircle className="mr-1.5 h-3.5 w-3.5" />}
                {ctaConfig.text}
              </Button>
            </Link>
          )}

          {ctaConfig.show && !ctaConfig.href && (
            <Button
              variant={ctaConfig.variant}
              size="sm"
              disabled={ctaConfig.disabled}
              className={`w-full sm:w-auto ${ctaConfig.disabled ? "opacity-70" : ""}`}
            >
              {ctaConfig.icon === "clock" && <Clock className="mr-1.5 h-3.5 w-3.5" />}
              {ctaConfig.icon === "lock" && <Lock className="mr-1.5 h-3.5 w-3.5" />}
              {ctaConfig.text}
            </Button>
          )}

          {ctaConfig.secondaryCta && mode === "schedule" && (
            <Link href={ctaConfig.secondaryCta.href} className="w-full sm:w-auto">
              <Button
                variant="secondary"
                size="sm"
                className="w-full sm:w-auto border-brand-200 text-brand-700 hover:bg-brand-50"
              >
                {ctaConfig.secondaryCta.icon === "external" && <ExternalLink className="mr-1.5 h-3.5 w-3.5" />}
                {ctaConfig.secondaryCta.icon === "video" && <Video className="mr-1.5 h-3.5 w-3.5" />}
                {ctaConfig.secondaryCta.icon === "play" && <PlayCircle className="mr-1.5 h-3.5 w-3.5" />}
                {ctaConfig.secondaryCta.text}
              </Button>
            </Link>
          )}

          {displayTimestamp && (
            <div className="text-left sm:text-right w-full">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground whitespace-nowrap">
                <Clock className="h-3.5 w-3.5" />
                <span>{formattedDateTime}</span>
              </div>
              <TimezoneConversionBadge
                courseTimezone={lesson.courseTimezone}
                userTimezone={lesson.userTimezone}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
