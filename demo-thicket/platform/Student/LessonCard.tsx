import { Link } from "@inertiajs/react"
import { Calendar, Circle, CircleCheck, Clock, Download, FileText, Lock, PlayCircle, Video } from "lucide-react"

import { Badge } from "@thicket/components/ui/badge"
import { Button } from "@thicket/components/ui/button"
import {
  type LessonStatus,
  formatLessonDateTime,
  getCTAConfig,
  getLessonDetailedStatus,
  getStatusBadgeConfig,
} from "@thicket/platform/utils/lessonHelpers"
import { formatWithTimezoneAbbr } from "@thicket/platform/utils/timezoneHelpers"
import type { Assignment } from "@thicket/types"

export type LessonCardMode = "dashboard" | "schedule" | "course-details" | "hero"

export interface UnifiedLessonData {
  id: number
  courseId: number
  courseTitle?: string
  courseCoverUrl?: string
  lessonId: number
  lessonTitle: string
  lessonDescription?: string
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
  userTimezone: string
}

interface LessonCardProps {
  lesson: UnifiedLessonData
  mode: LessonCardMode
}

function LessonCountdown({ scheduledAt }: { scheduledAt: string }) {
  const distance = formatLessonDateTime(scheduledAt, "relative")

  return (
    <div className="flex items-center gap-1.5 text-sm text-brand-600">
      <Clock className="h-3.5 w-3.5" />
      <span className="font-medium">{distance}</span>
    </div>
  )
}

function LessonVisual({
  mode,
  courseCoverUrl,
  courseTitle,
  isCompleted,
  isLocked,
  isLive,
}: {
  mode: LessonCardMode
  courseCoverUrl?: string
  courseTitle?: string
  isCompleted?: boolean
  isLocked?: boolean
  isLive?: boolean
}) {
  if (mode === "course-details" || mode === "hero") {
    const iconBgColor = isCompleted
      ? "bg-brand-600"
      : isLive
        ? "bg-brand-600"
        : isLocked
          ? "bg-surface-100"
          : "bg-brand-50"

    const iconColor = isCompleted || isLive ? "text-white" : isLocked ? "text-surface-400" : "text-brand-600"

    return (
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${iconBgColor}`}>
        {isCompleted ? (
          <CircleCheck className={`h-5 w-5 ${iconColor}`} />
        ) : isLocked ? (
          <Lock className={`h-5 w-5 ${iconColor}`} />
        ) : isLive ? (
          <Circle className={`h-5 w-5 ${iconColor} animate-pulse`} />
        ) : (
          <Circle className={`h-5 w-5 ${iconColor}`} />
        )}
      </div>
    )
  }


  if (courseCoverUrl) {
    return (
      <img
        src={courseCoverUrl}
        alt={courseTitle || "Course"}
        className={`${mode === "dashboard" ? "h-12 w-12" : "h-16 w-16"} rounded-lg object-cover flex-shrink-0`}
      />
    )
  }

  return (
    <div
      className={`${mode === "dashboard" ? "h-12 w-12 rounded" : "h-16 w-16 rounded-lg"} bg-brand-100 flex items-center justify-center flex-shrink-0`}
    >
      <Calendar className={`${mode === "dashboard" ? "h-6 w-6" : "h-8 w-8"} text-brand-600`} />
    </div>
  )
}

function LessonStatusBadge({ status }: { status: LessonStatus }) {
  const config = getStatusBadgeConfig(status)

  return (
    <Badge variant={config.variant} size="sm">
      {config.showPulse && <span className="h-2 w-2 rounded-full bg-current animate-pulse" />}
      {status === "completed-with-recording" || status === "completed-no-recording" ? (
        <CircleCheck className="h-3 w-3" />
      ) : status === "locked" ? (
        <Lock className="h-3 w-3" />
      ) : null}
      {config.text}
    </Badge>
  )
}

export function LessonCard({ lesson, mode }: LessonCardProps) {
  const status = getLessonDetailedStatus(lesson)
  const isLive = status === "live"
  const ctaConfig = getCTAConfig(lesson, status, mode)

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

    const formatLessonTime = () => {
      if (!lesson.scheduledAt) return "Schedule TBD"

      if (isLive) {
        return "Happening now"
      }

      const distance = formatLessonDateTime(lesson.scheduledAt, "relative")
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
                <div className="text-foreground text-base font-semibold">{formatLessonTime()}</div>
              </div>
            </div>
          </div>

          {lesson.topics && lesson.topics.length > 0 && (
            <div className="mb-6">
              <h4 className="text-muted-foreground mb-3 text-base font-semibold">
                Topics We&apos;ll Cover:
              </h4>
              <ul className="grid gap-2 sm:grid-cols-2">
                {lesson.topics.map((topic, index) => (
                  <li key={index} className="text-muted-foreground flex items-start text-sm">
                    <span className="text-brand-600 mr-2 mt-1 flex-shrink-0">•</span>
                    <span>{topic}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {lesson.learningObjectives && lesson.learningObjectives.length > 0 && (
            <div className="mb-6">
              <h4 className="text-muted-foreground mb-3 text-base font-semibold">
                Learning Objectives:
              </h4>
              <ul className="space-y-2">
                {lesson.learningObjectives.slice(0, 4).map((objective, index) => (
                  <li key={index} className="text-muted-foreground flex items-start text-sm">
                    <span className="mr-2 mt-1 text-sm text-muted-foreground">•</span>
                    <span>{objective}</span>
                  </li>
                ))}
              </ul>
              {lesson.learningObjectives.length > 4 && (
                <p className="text-muted mt-2 text-xs">
                  + {lesson.learningObjectives.length - 4} more objectives
                </p>
              )}
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

  return (
    <div className={containerClasses}>
      <div className={`flex flex-col sm:flex-row items-start ${mode === "dashboard" ? "gap-3" : "gap-4"}`}>
        <div className="flex items-start gap-3 sm:gap-4 w-full sm:w-auto">
          <LessonVisual
            mode={mode}
            courseCoverUrl={lesson.courseCoverUrl}
            courseTitle={lesson.courseTitle}
            isCompleted={lesson.isCompleted}
            isLocked={lesson.isLocked}
            isLive={isLive}
          />

          <div className="flex-1 min-w-0 sm:hidden">
            <div className="mb-2 flex items-center gap-2 flex-wrap">
              <LessonStatusBadge status={status} />
              <span className="text-muted text-xs">Lesson {lesson.lessonPosition}</span>
            </div>

            <h4
              className={`font-display mb-1 font-semibold ${
                mode === "dashboard"
                  ? "text-sm line-clamp-1"
                  : mode === "schedule"
                    ? "text-base"
                    : "text-lg"
              } ${lesson.isLocked ? "text-surface-400" : "text-foreground"}`}
            >
              {lesson.lessonTitle}
            </h4>
          </div>
        </div>

        <div className="flex-1 min-w-0 w-full sm:w-auto hidden sm:block">
          <div className="mb-2">
            <div className="mb-1 flex items-center gap-2 flex-wrap">
              <LessonStatusBadge status={status} />
              <span className="text-muted text-xs">Lesson {lesson.lessonPosition}</span>
            </div>

            <h4
              className={`font-display mb-1 font-semibold ${
                mode === "dashboard"
                  ? "text-sm line-clamp-1"
                  : mode === "schedule"
                    ? "text-base"
                    : "text-lg"
              } ${lesson.isLocked ? "text-surface-400" : "text-foreground"}`}
            >
              {lesson.lessonTitle}
            </h4>

            {mode !== "dashboard" && lesson.courseTitle && (
              <p
                className={`text-sm mb-2  ${
                  lesson.isLocked ? "text-surface-400" : "text-muted-foreground"
                }`}
              >
                {lesson.courseTitle}
              </p>
            )}

            {mode !== "dashboard" && lesson.lessonDescription && (
              <p
                className={`text-sm mb-3 ${lesson.isLocked ? "text-surface-400" : "text-muted-foreground"}`}
              >
                {lesson.lessonDescription}
              </p>
            )}

            {mode === "course-details" && lesson.topics && lesson.topics.length > 0 && (
              <ul className="mb-4 ml-4 space-y-1">
                {lesson.topics.map((topic, idx) => (
                  <li
                    key={idx}
                    className={`text-sm ${lesson.isLocked ? "text-surface-400" : "text-muted-foreground"}`}
                  >
                    • {topic}
                  </li>
                ))}
              </ul>
            )}

            {lesson.learningObjectives && lesson.learningObjectives.length > 0 && (
              <div className={`mb-4 ${mode === "dashboard" ? "" : "rounded-lg border border-brand-200 bg-brand-50 p-3"}`}>
                {mode !== "dashboard" && (
                  <h5 className="mb-2 text-sm font-semibold text-brand-900">Learning Objectives:</h5>
                )}
                <ul className="space-y-1">
                  {(mode === "dashboard" ? lesson.learningObjectives.slice(0, 2) : lesson.learningObjectives).map((objective, idx) => (
                    <li
                      key={idx}
                      className={`flex items-start text-sm ${lesson.isLocked ? "text-surface-400" : mode === "dashboard" ? "text-muted-foreground" : "text-brand-800"}`}
                    >
                      <span className={`mr-2 mt-1 text-sm ${lesson.isLocked ? "text-surface-300" : "text-muted-foreground"}`}>•</span>
                      <span>{objective}</span>
                    </li>
                  ))}
                </ul>
                {mode === "dashboard" && lesson.learningObjectives.length > 2 && (
                  <p className="text-brand-600 mt-1 text-xs">
                    + {lesson.learningObjectives.length - 2} more objectives
                  </p>
                )}
              </div>
            )}

            {lesson.assignments && lesson.assignments.length > 0 && (
              <div className="mb-3 rounded-lg border border-brand-200 bg-brand-50 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-brand-600" />
                  <span className="text-sm font-semibold text-brand-900">
                    {lesson.assignments.length} Assignment{lesson.assignments.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="space-y-1">
                  {lesson.assignments.map((assignment) => (
                    <a
                      key={assignment.id}
                      href={assignment.file_url}
                      download
                      className="flex items-center gap-2 text-sm text-brand-700 hover:text-brand-800 transition-colors"
                    >
                      <Download className="h-3 w-3" />
                      {assignment.original_name}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {mode === "course-details" ? (
            <div className="mt-4 w-full">
              {lesson.scheduledAt && (
                <div className="mb-3 rounded-lg p-3 border border-brand-200 bg-brand-50">
                  <p className="text-sm text-brand-900">
                    <span className="font-semibold">
                      {lesson.isCompleted && lesson.startedAt ? "Started:" : "Scheduled:"}
                    </span>{" "}
                    {formatWithTimezoneAbbr(
                      lesson.isCompleted && lesson.startedAt ? lesson.startedAt : lesson.scheduledAt,
                      lesson.userTimezone,
                      "EEEE, MMMM d, yyyy 'at' h:mm a"
                    )}
                  </p>
                </div>
              )}
              <div className="flex flex-col gap-2">
                {ctaConfig.show && (
                  ctaConfig.disabled ? (
                    <Button
                      variant={ctaConfig.variant}
                      size="sm"
                      fullWidth
                      disabled={true}
                      className="opacity-70"
                    >
                      {ctaConfig.icon === "clock" && <Clock className="mr-1.5 h-3.5 w-3.5" />}
                      {ctaConfig.text}
                    </Button>
                  ) : ctaConfig.href ? (
                    <Link href={ctaConfig.href}>
                      <Button
                        variant={ctaConfig.variant}
                        size="sm"
                        fullWidth
                        className={`${
                          status === "live"
                            ? "bg-brand-600 hover:bg-brand-700 animate-pulse-subtle"
                            : ctaConfig.variant === "secondary"
                              ? "border-brand-200 text-brand-700 hover:bg-brand-50"
                              : ""
                        }`}
                      >
                        {ctaConfig.icon === "video" && <Video className="mr-1.5 h-3.5 w-3.5" />}
                        {ctaConfig.icon === "play" && <PlayCircle className="mr-1.5 h-3.5 w-3.5" />}
                        {ctaConfig.text}
                      </Button>
                    </Link>
                  ) : null
                )}
                {ctaConfig.helperText && (
                  <p className="text-muted text-center text-xs">
                    {ctaConfig.helperText}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                {lesson.scheduledAt && (
                  <div
                    className={`text-sm ${
                      isLive ? "text-success font-semibold" : "text-muted-foreground"
                    }`}
                  >
                    {formatWithTimezoneAbbr(lesson.scheduledAt, lesson.userTimezone, "EEE, MMM d 'at' h:mm a")}
                  </div>
                )}
                {(status === "upcoming" || status === "upcoming-next") && lesson.scheduledAt && mode === "schedule" && (
                  <LessonCountdown scheduledAt={lesson.scheduledAt} />
                )}
              </div>

              <div className="flex flex-col items-start sm:items-end gap-2 w-full sm:w-auto">
                {ctaConfig.show && (
                  ctaConfig.disabled ? (
                    <Button
                      variant={ctaConfig.variant}
                      size="sm"
                      disabled={true}
                      className="w-full sm:w-auto opacity-70"
                    >
                      {ctaConfig.icon === "clock" && <Clock className="mr-1.5 h-3.5 w-3.5" />}
                      {ctaConfig.text}
                    </Button>
                  ) : ctaConfig.href ? (
                    <Link href={ctaConfig.href} className="w-full sm:w-auto">
                      <Button
                        variant={ctaConfig.variant}
                        size="sm"
                        className={`w-full sm:w-auto ${
                          status === "live"
                            ? "bg-brand-600 hover:bg-brand-700 animate-pulse-subtle"
                            : ctaConfig.variant === "secondary"
                              ? "border-brand-200 text-brand-700 hover:bg-brand-50"
                              : ""
                        }`}
                      >
                        {ctaConfig.icon === "video" && <Video className="mr-1.5 h-3.5 w-3.5" />}
                        {ctaConfig.icon === "play" && <PlayCircle className="mr-1.5 h-3.5 w-3.5" />}
                        {ctaConfig.text}
                      </Button>
                    </Link>
                  ) : null
                )}
                {ctaConfig.helperText && mode === "schedule" && (
                  <p className="text-muted text-right text-xs">
                    {ctaConfig.helperText}
                  </p>
                )}
                {mode === "schedule" && lesson.scheduledAt && !ctaConfig.helperText && (
                  <div className="text-right">
                    <div className="text-xs text-muted">
                      {formatWithTimezoneAbbr(lesson.scheduledAt, lesson.userTimezone, "EEEE, MMMM d, yyyy 'at' h:mm a")}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
