import { Users } from "lucide-react"

interface AnnouncementPreviewProps {
  recipientCount: number
  courseName?: string
  variant?: "info" | "warning"
}

export function AnnouncementPreview({
  recipientCount,
  courseName,
  variant = "info",
}: AnnouncementPreviewProps) {
  const variantStyles = {
    info: {
      container: "border-brand-200 bg-brand-50/50",
      text: "text-brand-900",
      subtitle: "text-brand-800",
      icon: "text-brand-700",
    },
    warning: {
      container: "border-yellow-200 bg-yellow-50",
      text: "text-yellow-900",
      subtitle: "text-yellow-800",
      icon: "text-yellow-700",
    },
  }

  const styles = variantStyles[variant]

  if (recipientCount === 0) {
    return (
      <div className="rounded-lg border border-dashed border-default bg-surface-50 p-4">
        <p className="text-muted-foreground text-sm">No students enrolled in this course yet.</p>
      </div>
    )
  }

  return (
    <div className={`rounded-lg border p-4 ${styles.container}`}>
      <div className="flex items-center gap-2 mb-2">
        <Users className={`h-4 w-4 ${styles.icon}`} />
        <p className={`text-sm font-semibold ${styles.text}`}>Recipients</p>
      </div>
      <p className={`text-sm ${styles.subtitle}`}>
        {variant === "warning" ? (
          <>
            This announcement will be sent to all {recipientCount} enrolled student
            {recipientCount !== 1 ? "s" : ""} {courseName ? `in ${courseName}` : "in this course"} and
            will appear in their messages and the course announcements tab.
          </>
        ) : (
          <>
            This announcement will be sent to all {recipientCount} enrolled student
            {recipientCount !== 1 ? "s" : ""} in this course.
          </>
        )}
      </p>
    </div>
  )
}
