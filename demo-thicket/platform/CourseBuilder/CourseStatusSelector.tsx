import { CheckCircle2, Clock, FileText } from "lucide-react"

type CourseStatus = "draft" | "in_review" | "published" | "waitlist" | "archived"

interface StatusOption {
  value: CourseStatus
  label: string
  description: string
  icon: React.ElementType
  color: string
  bgColor: string
  borderColor: string
}

interface CourseStatusSelectorProps {
  value: CourseStatus
  onChange: (status: CourseStatus) => void
  disabled?: boolean
  disabledOptions?: CourseStatus[]
  warningMessage?: string
  editMode?: boolean
  originalStatus?: CourseStatus
  hasEnrollments?: boolean
  onUnpublishAttempt?: () => void
}

const statusOptions: StatusOption[] = [
  {
    value: "draft",
    label: "Draft",
    description: "Save your work. Course won't be visible to students yet.",
    icon: FileText,
    color: "text-neutral-700",
    bgColor: "bg-neutral-50",
    borderColor: "border-neutral-300",
  },
  {
    value: "in_review",
    label: "Ready for Review",
    description: "Submit to admin for approval before publishing.",
    icon: Clock,
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-300",
  },
  {
    value: "published",
    label: "Published",
    description: "Course is live and available for student enrollment.",
    icon: CheckCircle2,
    color: "text-success",
    bgColor: "bg-green-50",
    borderColor: "border-green-300",
  },
]

export function CourseStatusSelector({
  value,
  onChange,
  disabled = false,
  disabledOptions = [],
  warningMessage,
  editMode = false,
  originalStatus,
  hasEnrollments = false,
  onUnpublishAttempt,
}: CourseStatusSelectorProps) {
  const handleStatusChange = (newStatus: CourseStatus) => {
    if (
      editMode &&
      originalStatus === "published" &&
      newStatus === "draft" &&
      onUnpublishAttempt
    ) {
      onUnpublishAttempt()
      return
    }

    onChange(newStatus)
  }

  const getAvailableOptions = () => {
    if (editMode && originalStatus === "published" && !hasEnrollments) {
      return statusOptions.filter(
        (opt) => opt.value === "draft" || opt.value === "published"
      )
    }

    if (editMode && originalStatus === "draft") {
      return statusOptions.filter(
        (opt) => opt.value === "draft" || opt.value === "in_review"
      )
    }

    if (!editMode) {
      return statusOptions.filter(
        (opt) => opt.value === "draft" || opt.value === "in_review"
      )
    }

    return statusOptions.filter((opt) => opt.value === value)
  }

  const availableOptions = getAvailableOptions()

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-foreground font-display mb-2 text-lg font-bold">
          Choose Course Status
        </h3>
        <p className="text-muted-foreground text-sm">
          Select how you want your course to be available to students
        </p>
      </div>

      {warningMessage && (
        <div className="bg-amber-50 border-amber-200 rounded-lg border p-3 mb-4">
          <p className="text-amber-800 text-sm">{warningMessage}</p>
        </div>
      )}

      <div className="grid gap-3">
        {availableOptions.map((option) => {
          const Icon = option.icon
          const isSelected = value === option.value
          const isOptionDisabled = disabled || disabledOptions.includes(option.value)

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => !isOptionDisabled && handleStatusChange(option.value)}
              disabled={isOptionDisabled}
              className={`group w-full rounded-xl border-2 p-4 text-left transition-all ${isOptionDisabled ? "opacity-50 cursor-not-allowed" : "hover:shadow-sm"} ${
                isSelected
                  ? `${option.borderColor} ${option.bgColor} shadow-sm`
                  : "border-default bg-white hover:border-strong"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
                    isSelected
                      ? option.bgColor
                      : "bg-surface-100 group-hover:bg-surface-200"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${isSelected ? option.color : "text-muted-foreground"}`}
                    strokeWidth={2}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <h4
                    className={`font-display font-semibold ${isSelected ? option.color : "text-foreground"}`}
                  >
                    {option.label}
                  </h4>
                  <p
                    className={`mt-1 text-sm ${isSelected ? "text-muted-foreground" : "text-muted"}`}
                  >
                    {option.description}
                  </p>
                </div>

                <div className="shrink-0">
                  <div
                    className={`h-5 w-5 rounded-full border-2 transition-all ${
                      isSelected
                        ? `${option.borderColor} ${option.color.replace("text-", "bg-")}`
                        : "border-neutral-300 bg-white group-hover:border-neutral-400"
                    }`}
                  >
                    {isSelected && (
                      <div className="flex h-full w-full items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-white" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
