import { Link } from "../shims/inertia-react"
import { CircleCheck, Clock, Lock, Users } from "lucide-react"

import { Badge } from "../components/ui/badge"
import { CourseCover } from "../components/ui/course-cover"
import { LessonCTA } from "./CTAs/LessonCTA"
import {
  type LessonStatus,
  getLessonDetailedStatus,
} from "./utils/lessonHelpers"
import {
  areInSameTimezone,
  formatWithTimezoneAbbr,
} from "./utils/timezoneHelpers"
import type { Assignment } from "../types"

export type LessonCardRole = "teacher" | "student"
export type LessonCardMode = "dashboard" | "schedule" | "course-details" | "hero" | "live-banner"
export type LessonCardVariant = "default" | "minimalistic"

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
  hostWherebyUrl?: string
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

export interface UnifiedLessonCardProps {
  lesson: UnifiedLessonData
  mode: LessonCardMode
  role: LessonCardRole
  showActions?: boolean
  variant?: LessonCardVariant
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

function TimezoneConversionBadge({
  courseTimezone,
  userTimezone,
}: {
  courseTimezone?: string
  userTimezone: string
}) {
  if (!courseTimezone || areInSameTimezone(courseTimezone, userTimezone)) {
    return null
  }

  return (
    <div className="text-xs text-brand-600 mt-0.5">
      Timezone converted
    </div>
  )
}


function TopicsList({ topics, isLocked = false }: { topics: string[]; isLocked?: boolean }) {
  if (!topics || topics.length === 0) return null

  return (
    <ul className="space-y-1.5">
      {topics.map((topic, index) => (
        <li key={index} className="flex items-start gap-2">
          <span className={`text-sm ${isLocked ? "text-surface-300" : "text-muted-foreground"}`}>•</span>
          <span className={`text-sm leading-relaxed ${isLocked ? "text-surface-400" : "text-muted-foreground"}`}>
            {topic}
          </span>
        </li>
      ))}
    </ul>
  )
}

function ObjectivesList({ objectives, isLocked = false }: { objectives: string[]; isLocked?: boolean }) {
  if (!objectives || objectives.length === 0) return null

  return (
    <ul className="space-y-1.5">
      {objectives.map((objective, index) => (
        <li key={index} className="flex items-start gap-2">
          <span className={`text-sm ${isLocked ? "text-surface-300" : "text-muted-foreground"}`}>•</span>
          <span className={`text-sm leading-relaxed ${isLocked ? "text-surface-400" : "text-muted-foreground"}`}>
            {objective}
          </span>
        </li>
      ))}
    </ul>
  )
}

// getCTAConfig function moved to LessonCTA component

function getContainerClasses(mode: LessonCardMode, isLive: boolean, isCompleted: boolean, isLocked: boolean): string {
  if (mode === "live-banner") {
    return "flex items-center gap-4 rounded-lg bg-white p-4 border border-success/20"
  }

  if (mode === "dashboard") {
    return "rounded-lg border border-default bg-white p-4 hover:shadow-md transition-shadow"
  }

  if (mode === "schedule") {
    return `rounded-lg border p-4 hover:shadow-md transition-shadow ${
      isLive
        ? "border-success bg-success/5"
        : isCompleted
          ? "border-brand-200 bg-brand-50/30"
          : "border-default bg-white"
    }`
  }

  return `rounded-lg border bg-white p-4 sm:p-6 transition-all ${
    isCompleted
      ? "border-brand-200 bg-brand-50/30"
      : isLive
        ? "border-brand-500 bg-brand-50 ring-2 ring-brand-300"
        : isLocked
          ? "border-surface-200 bg-surface-50"
          : "border-default hover:shadow-md"
  }`
}

export function UnifiedLessonCard({ lesson, mode, role, showActions = true, variant }: UnifiedLessonCardProps) {
  const status = getLessonDetailedStatus(lesson)
  const isLive = status === "live"
  const userTimezone = lesson.userTimezone || "UTC"

  // Determine variant based on mode if not explicitly provided
  const effectiveVariant = variant || (mode === "course-details" ? "default" : "minimalistic")

  const displayTimestamp = lesson.isCompleted && lesson.startedAt ? lesson.startedAt : lesson.scheduledAt

  const formattedDateTime = displayTimestamp
    ? formatWithTimezoneAbbr(displayTimestamp, userTimezone, "EEE, MMM d 'at' h:mm a")
    : "Schedule TBD"

  const containerClasses = getContainerClasses(mode, isLive, lesson.isCompleted || false, lesson.isLocked || false)

  const courseDetailsUrl = role === "student"
    ? `/student/courses/${lesson.courseId}?tab=schedule#lesson-${lesson.lessonId}`
    : `/teacher/courses/${lesson.courseId}?tab=schedule#lesson-${lesson.lessonId}`

  const shouldShowCourseLink = mode === "schedule" || mode === "dashboard"

  if (mode === "live-banner") {
    return (
      <div className={containerClasses}>
        <CourseCover coverUrl={lesson.courseCoverUrl} title={lesson.courseTitle || "Course"} variant="icon" size="md" />

        <div className="flex-1 min-w-0">
          <h3 className="text-foreground mb-1 font-semibold">{lesson.courseTitle}</h3>
          <p className="text-muted-foreground text-sm mb-2">{lesson.lessonTitle}</p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{displayTimestamp ? formatWithTimezoneAbbr(displayTimestamp, lesson.userTimezone, "h:mm a") : "TBD"}</span>
            </div>
            {lesson.enrolledStudentsCount !== undefined && role === "teacher" && (
              <Badge variant="secondary" size="sm" icon={Users}>
                {lesson.enrolledStudentsCount} {lesson.enrolledStudentsCount === 1 ? "student" : "students"}
              </Badge>
            )}
          </div>
        </div>

        {showActions && (
          <div className="shrink-0">
            <LessonCTA
              lesson={lesson}
              status={status}
              role={role}
              mode={mode}
              size="sm"
              className={isLive ? "animate-pulse-subtle" : ""}
              isLive={isLive}
            />
          </div>
        )}
      </div>
    )
  }

  if (mode === "dashboard") {
    return (
      <div className={containerClasses}>
        <div className="flex items-start gap-3">
          <Link href={courseDetailsUrl} className="shrink-0">
            <CourseCover coverUrl={lesson.courseCoverUrl} title={lesson.courseTitle || "Course"} variant="icon" size="sm" />
          </Link>

          <div className="flex-1 min-w-0">
            <Link href={courseDetailsUrl} className="block hover:opacity-80 transition-opacity">
              <div className="mb-1 flex items-center gap-2 flex-wrap">
                <LessonStatusBadge status={status} isLive={isLive} />
                <span className="text-muted text-xs">Lesson {lesson.lessonPosition}</span>
              </div>
              <h4 className="font-display text-foreground mb-0.5 text-sm font-semibold line-clamp-1">
                {lesson.lessonTitle}
              </h4>
            </Link>
            {lesson.courseTitle && role === "teacher" && (
              <Link
                href={`/teacher/courses/${lesson.courseId}`}
                className="text-brand-600 hover:text-brand-700 text-xs font-medium transition-colors line-clamp-1 block mb-1"
              >
                {lesson.courseTitle}
              </Link>
            )}
            {lesson.lessonDescription && (
              <p className="text-muted-foreground text-xs mt-1 line-clamp-2">{lesson.lessonDescription}</p>
            )}
            {lesson.enrolledStudentsCount !== undefined && role === "teacher" && (
              <Badge variant="secondary" size="sm" icon={Users} className="mt-2">
                {lesson.enrolledStudentsCount} {lesson.enrolledStudentsCount === 1 ? "student" : "students"}
              </Badge>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            {showActions && (
              <LessonCTA
                lesson={lesson}
                status={status}
                role={role}
                mode={mode}
                size="sm"
                className={isLive ? "bg-brand-600 hover:bg-brand-700 animate-pulse-subtle" : ""}
                isLive={isLive}
              />
            )}

            <div className="text-right">
              <div className="text-sm text-muted-foreground whitespace-nowrap">{formattedDateTime}</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (effectiveVariant === "minimalistic") {
    return (
      <div className={containerClasses}>
        <div className="flex items-start gap-4">
          {shouldShowCourseLink ? (
            <Link href={courseDetailsUrl} className="shrink-0">
              <CourseCover coverUrl={lesson.courseCoverUrl} title={lesson.courseTitle || "Course"} variant="icon" size="md" />
            </Link>
          ) : (
            <CourseCover coverUrl={lesson.courseCoverUrl} title={lesson.courseTitle || "Course"} variant="icon" size="md" />
          )}

          {shouldShowCourseLink ? (
            <Link href={courseDetailsUrl} className="flex-1 min-w-0 hover:opacity-80 transition-opacity">
            <div className="mb-1 flex items-center gap-2 flex-wrap">
              <LessonStatusBadge status={status} isLive={isLive} />
              <span className="text-muted text-xs">Lesson {lesson.lessonPosition}</span>
            </div>

            <h4 className={`font-display mb-0.5 font-semibold text-base ${lesson.isLocked ? "text-surface-400" : "text-foreground"}`}>
              {lesson.lessonTitle}
            </h4>

            {lesson.lessonDescription && (
              <p className={`text-sm line-clamp-1 ${lesson.isLocked ? "text-surface-400" : "text-muted-foreground"}`}>
                {lesson.lessonDescription}
              </p>
            )}
            {lesson.enrolledStudentsCount !== undefined && role === "teacher" && (
              <Badge variant="secondary" size="sm" icon={Users} className="mt-2">
                {lesson.enrolledStudentsCount} {lesson.enrolledStudentsCount === 1 ? "student" : "students"}
              </Badge>
            )}
            </Link>
          ) : (
            <div className="flex-1 min-w-0">
              <div className="mb-1 flex items-center gap-2 flex-wrap">
                <LessonStatusBadge status={status} isLive={isLive} />
                <span className="text-muted text-xs">Lesson {lesson.lessonPosition}</span>
              </div>

              <h4 className={`font-display mb-0.5 font-semibold text-base ${lesson.isLocked ? "text-surface-400" : "text-foreground"}`}>
                {lesson.lessonTitle}
              </h4>

              {lesson.lessonDescription && (
                <p className={`text-sm line-clamp-1 ${lesson.isLocked ? "text-surface-400" : "text-muted-foreground"}`}>
                  {lesson.lessonDescription}
                </p>
              )}
              {lesson.enrolledStudentsCount !== undefined && role === "teacher" && (
                <Badge variant="secondary" size="sm" icon={Users} className="mt-2">
                  {lesson.enrolledStudentsCount} {lesson.enrolledStudentsCount === 1 ? "student" : "students"}
                </Badge>
              )}
            </div>
          )}

          <div className="flex flex-col items-end gap-2 shrink-0 min-w-[180px]">
            {showActions && (
              <LessonCTA
                lesson={lesson}
                status={status}
                role={role}
                mode={mode}
                size="sm"
                className={isLive ? "bg-brand-600 hover:bg-brand-700 animate-pulse-subtle" : ""}
                isLive={isLive}
              />
            )}

            <div className="text-right">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground whitespace-nowrap">
                <Clock className="h-3.5 w-3.5" />
                <span>{formattedDateTime}</span>
              </div>
              <TimezoneConversionBadge courseTimezone={lesson.courseTimezone} userTimezone={lesson.userTimezone} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={containerClasses}>
      <div className="flex flex-col sm:flex-row items-start gap-4">
        <CourseCover coverUrl={lesson.courseCoverUrl} title={lesson.courseTitle || "Course"} variant="icon" size="md" />

        <div className="flex-1 min-w-0">
          <div className="mb-2 flex items-center gap-2 flex-wrap">
            <LessonStatusBadge status={status} isLive={isLive} />
            <span className="text-muted text-xs">Lesson {lesson.lessonPosition}</span>
          </div>

          <h4 className={`font-display mb-1 font-semibold text-base ${lesson.isLocked ? "text-surface-400" : "text-foreground"}`}>
            {lesson.lessonTitle}
          </h4>

          {lesson.courseTitle && role === "teacher" && (
            <Link
              href={`/teacher/courses/${lesson.courseId}`}
              className="text-brand-600 hover:text-brand-700 text-sm font-medium transition-colors block mb-2"
            >
              {lesson.courseTitle}
            </Link>
          )}

          {lesson.lessonDescription && (
            <p className={`text-sm mb-3 ${lesson.isLocked ? "text-surface-400" : "text-muted-foreground"}`}>
              {lesson.lessonDescription}
            </p>
          )}

          {effectiveVariant === "default" && lesson.topics && lesson.topics.length > 0 && (
            <div className="mb-3">
              <TopicsList topics={lesson.topics} isLocked={lesson.isLocked} />
            </div>
          )}

          {effectiveVariant === "default" && lesson.learningObjectives && lesson.learningObjectives.length > 0 && (
            <div className="mb-3">
              <ObjectivesList objectives={lesson.learningObjectives} isLocked={lesson.isLocked} />
            </div>
          )}

          {lesson.enrolledStudentsCount !== undefined && role === "teacher" && (
            <Badge variant="secondary" size="sm" icon={Users} className="mt-2">
              {lesson.enrolledStudentsCount} {lesson.enrolledStudentsCount === 1 ? "student" : "students"}
            </Badge>
          )}
        </div>

        <div className="flex flex-col items-start sm:items-end gap-2 w-full sm:w-auto sm:min-w-[200px]">
          {showActions && (
            <div className="w-full sm:w-auto">
              <LessonCTA
                lesson={lesson}
                status={status}
                role={role}
                mode={mode}
                size="sm"
                className={`w-full sm:w-auto ${isLive ? "bg-brand-600 hover:bg-brand-700 animate-pulse-subtle" : ""}`}
                isLive={isLive}
              />
            </div>
          )}

          <div className="text-left sm:text-right">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground whitespace-nowrap">
              <Clock className="h-3.5 w-3.5" />
              <span>{formattedDateTime}</span>
            </div>
            <TimezoneConversionBadge courseTimezone={lesson.courseTimezone} userTimezone={lesson.userTimezone} />
          </div>
        </div>
      </div>
    </div>
  )
}
