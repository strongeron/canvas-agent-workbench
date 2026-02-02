import { formatDistanceToNow, parseISO } from "date-fns"
import { CircleCheck, Clock, Download, FileText, Globe, Image as ImageIcon, Lock } from "lucide-react"

import { Badge } from "../components/ui/badge"
import { CourseCover } from "../components/ui/course-cover"
import { formatFileSize } from "./utils/fileUpload"
import type { LessonStatus } from "./utils/lessonHelpers"
import {
  areInSameTimezone,
  formatWithTimezoneAbbr,
} from "./utils/timezoneHelpers"
import type { Assignment } from "../types"

export function LessonStatusBadge({ status, isLive: _isLive }: { status: LessonStatus; isLive?: boolean }) {
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

export function TimezoneConversionBadge({
  courseTimezone,
  userTimezone
}: {
  courseTimezone?: string;
  userTimezone: string
}) {
  if (!courseTimezone || areInSameTimezone(courseTimezone, userTimezone)) {
    return null
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-brand-600">
      <Globe className="h-3 w-3" />
      <span>Timezone converted</span>
    </div>
  )
}

export function LessonCountdown({ scheduledAt }: { scheduledAt: string }) {
  const distance = formatDistanceToNow(parseISO(scheduledAt), { addSuffix: true })

  return (
    <div className="flex items-center gap-1.5 text-sm text-brand-600">
      <Clock className="h-3.5 w-3.5" />
      <span className="font-medium">{distance}</span>
    </div>
  )
}

export function LessonTimeDisplay({
  displayTimestamp,
  userTimezone,
  courseTimezone,
  formatString = "EEE, MMM d 'at' h:mm a",
}: {
  displayTimestamp?: string
  userTimezone: string
  courseTimezone?: string
  formatString?: string
}) {
  if (!displayTimestamp) {
    return (
      <div className="text-sm text-muted-foreground">
        Schedule TBD
      </div>
    )
  }

  const formattedDateTime = formatWithTimezoneAbbr(displayTimestamp, userTimezone, formatString)

  return (
    <div className="text-left">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        <span>{formattedDateTime}</span>
      </div>
      <TimezoneConversionBadge
        courseTimezone={courseTimezone}
        userTimezone={userTimezone}
      />
    </div>
  )
}

// Re-export CourseCover as CourseCoverImage for backward compatibility
// Maps old size prop ("small" | "medium" | "large") to new size prop ("sm" | "md" | "lg")
export function CourseCoverImage({
  courseCoverUrl,
  courseTitle,
  size = "medium",
}: {
  courseCoverUrl?: string
  courseTitle?: string
  size?: "small" | "medium" | "large"
}) {
  const sizeMap: Record<"small" | "medium" | "large", "xs" | "sm" | "md" | "lg" | "xl"> = {
    small: "sm",
    medium: "md",
    large: "lg",
  }

  return (
    <CourseCover
      coverUrl={courseCoverUrl}
      title={courseTitle || "Course"}
      variant="icon"
      size={sizeMap[size]}
    />
  )
}

export function DateHeader({ date }: { date: string }) {
  return (
    <div className="py-2">
      <h3 className="font-display text-foreground text-base font-semibold">{date}</h3>
    </div>
  )
}

export function getContainerClasses(
  mode: "dashboard" | "schedule" | "course-details" | "hero",
  isLive: boolean,
  isCompleted: boolean,
  isLocked: boolean,
  status: LessonStatus
): string {
  if (mode === "dashboard") {
    return "rounded-lg border border-default bg-white p-4 hover:shadow-md transition-shadow"
  }

  if (mode === "schedule") {
    return `rounded-lg border p-4 hover:shadow-md transition-shadow ${
      isLive
        ? "border-success bg-success/5 shadow-md"
        : status === "past" || isCompleted
          ? "border-brand-200 bg-brand-50/30"
          : "border-default bg-white"
    }`
  }

  return `rounded-lg border bg-white p-4 sm:p-6 transition-all ${
    isCompleted
      ? "border-brand-200 bg-brand-50/30"
      : isLive
        ? "border-brand-500 bg-brand-50 shadow-lg ring-2 ring-brand-300"
        : isLocked
          ? "border-surface-200 bg-surface-50"
          : "border-default hover:shadow-md"
  }`
}

export function TopicsList({
  topics,
  isLocked = false,
}: {
  topics: string[]
  isLocked?: boolean
}) {
  if (!topics || topics.length === 0) return null

  return (
    <ul className="space-y-1.5">
      {topics.map((topic, index) => (
        <li key={index} className="flex items-start gap-2">
          <span className={`mt-1 text-sm ${isLocked ? "text-surface-300" : "text-muted-foreground"}`}>•</span>
          <span className={`text-sm leading-relaxed ${isLocked ? "text-surface-400" : "text-muted-foreground"}`}>
            {topic}
          </span>
        </li>
      ))}
    </ul>
  )
}

export function ObjectivesList({
  objectives,
  isLocked = false,
}: {
  objectives: string[]
  isLocked?: boolean
}) {
  if (!objectives || objectives.length === 0) return null

  return (
    <ul className="space-y-1.5">
      {objectives.map((objective, index) => (
        <li key={index} className="flex items-start gap-2">
          <span className={`mt-1 text-sm ${isLocked ? "text-surface-300" : "text-muted-foreground"}`}>•</span>
          <span className={`text-sm leading-relaxed ${isLocked ? "text-surface-400" : "text-muted-foreground"}`}>
            {objective}
          </span>
        </li>
      ))}
    </ul>
  )
}

export function FilesList({
  assignments,
  isLocked = false,
  showDownload = false,
  onDownload,
}: {
  assignments: Assignment[]
  isLocked?: boolean
  showDownload?: boolean
  onDownload?: (assignment: Assignment) => void
}) {
  if (!assignments || assignments.length === 0) return null

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) {
      return <ImageIcon className="h-4 w-4" />
    }
    return <FileText className="h-4 w-4" />
  }

  const getFileTypeBadge = (fileType: string) => {
    if (fileType.includes("pdf")) return { label: "PDF", color: "bg-red-100 text-red-700" }
    if (fileType.includes("image")) return { label: "IMAGE", color: "bg-blue-100 text-blue-700" }
    if (fileType.includes("word") || fileType.includes("document")) return { label: "DOC", color: "bg-blue-100 text-blue-700" }
    return { label: "FILE", color: "bg-gray-100 text-gray-700" }
  }

  return (
    <div className="space-y-2">
      <h5 className={`text-sm font-semibold ${isLocked ? "text-surface-400" : "text-muted-foreground"}`}>
        Resources & Assignments
      </h5>
      <ul className="space-y-2">
        {assignments.map((assignment) => {
          const badge = getFileTypeBadge(assignment.file_type)
          return (
            <li key={assignment.id} className="flex items-start gap-3">
              <div className={`mt-0.5 ${isLocked ? "text-surface-300" : "text-brand-600"}`}>
                {getFileIcon(assignment.file_type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm ${isLocked ? "text-surface-400" : "text-muted-foreground"} truncate`}>
                    {assignment.original_name}
                  </span>
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${badge.color}`}>
                    {badge.label}
                  </span>
                </div>
                <p className={`text-xs ${isLocked ? "text-surface-400" : "text-muted"}`}>
                  {formatFileSize(assignment.file_size)}
                </p>
              </div>
              {showDownload && !isLocked && onDownload && (
                <button
                  onClick={() => onDownload(assignment)}
                  className="text-brand-600 hover:text-brand-700 transition-colors shrink-0"
                  title="Download file"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
