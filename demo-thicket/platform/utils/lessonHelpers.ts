export type LessonStatus =
  | "live"
  | "upcoming"
  | "upcoming-next"
  | "past"
  | "completed-with-recording"
  | "completed-no-recording"
  | "locked"

function getLessonTimestamp(lesson: { scheduledAt?: string; scheduled_at?: string }) {
  return lesson.scheduledAt || lesson.scheduled_at
}

export function getLessonDetailedStatus(lesson: Record<string, any>): LessonStatus {
  if (lesson.isLocked) return "locked"
  if (lesson.isCompleted || lesson.is_completed) {
    return lesson.recordingUrl || lesson.recording_url
      ? "completed-with-recording"
      : "completed-no-recording"
  }

  const scheduledAt = getLessonTimestamp(lesson)
  if (!scheduledAt) return "upcoming"

  const target = new Date(scheduledAt).getTime()
  const now = Date.now()
  const diffMinutes = (target - now) / (1000 * 60)

  if (Math.abs(diffMinutes) <= 60) return "live"
  if (diffMinutes > 0) return lesson.isNext ? "upcoming-next" : "upcoming"
  return "past"
}

export function formatLessonDateTime(value?: string, mode: "relative" | "date" = "date") {
  if (!value) return "TBD"
  const date = new Date(value)
  if (mode === "relative") {
    const diffMs = date.getTime() - Date.now()
    const diffMin = Math.round(diffMs / (1000 * 60))
    if (Math.abs(diffMin) < 60) {
      return diffMin >= 0 ? `in ${diffMin} min` : `${Math.abs(diffMin)} min ago`
    }
    const diffHours = Math.round(diffMin / 60)
    if (Math.abs(diffHours) < 24) {
      return diffHours >= 0 ? `in ${diffHours} hr` : `${Math.abs(diffHours)} hr ago`
    }
    const diffDays = Math.round(diffHours / 24)
    return diffDays >= 0 ? `in ${diffDays} days` : `${Math.abs(diffDays)} days ago`
  }
  return date.toLocaleString()
}

export function getStatusBadgeConfig(status: LessonStatus) {
  const config: Record<LessonStatus, { text: string; variant: string }> = {
    "completed-with-recording": { text: "Completed", variant: "brand-filled" },
    "completed-no-recording": { text: "Completed", variant: "brand-filled" },
    live: { text: "Live", variant: "brand-filled" },
    "upcoming-next": { text: "Next", variant: "brand-outline" },
    upcoming: { text: "Upcoming", variant: "brand-outline" },
    locked: { text: "Locked", variant: "secondary" },
    past: { text: "Past", variant: "brand-outline" },
  }
  return config[status]
}

export function getCTAConfig(
  lesson: Record<string, any>,
  status: LessonStatus,
  _mode?: string,
) {
  const whereby =
    lesson.wherebyRoomUrl ||
    lesson.whereby_room_url ||
    lesson.room_url ||
    lesson.roomUrl
  const recording = lesson.recordingUrl || lesson.recording_url

  if (status === "live") {
    return {
      show: true,
      text: "Join lesson",
      icon: "video",
      variant: "brand",
      href: whereby,
    }
  }

  if (status === "completed-with-recording") {
    return {
      show: true,
      text: "Watch recording",
      icon: "video",
      variant: "secondary",
      href: recording,
    }
  }

  if (status === "locked") {
    return {
      show: true,
      text: "Locked",
      icon: "lock",
      variant: "secondary",
      disabled: true,
    }
  }

  if (status === "upcoming" || status === "upcoming-next") {
    return {
      show: true,
      text: "Upcoming",
      icon: "clock",
      variant: "secondary",
      disabled: true,
      helperText: "You can join when the session starts",
    }
  }

  return {
    show: false,
    text: "Past",
    icon: "clock",
    variant: "secondary",
  }
}

