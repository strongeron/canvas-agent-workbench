import { Clock } from "lucide-react"

import { DatePicker } from "../../components/ui/date-picker"
import { TimePicker } from "../../components/ui/time-picker"
import { getFullTimezoneDisplay } from "../utils/timezoneHelpers"

interface ScheduleFormProps {
  startDate: string
  startTime: string
  lessonLength: number
  onStartDateChange: (value: string) => void
  onStartTimeChange: (value: string) => void
  instructorTimezone: string
  errors: {
    startDate?: string
    startTime?: string
  }
}

export function ScheduleForm({
  startDate,
  startTime,
  lessonLength,
  onStartDateChange,
  onStartTimeChange,
  instructorTimezone,
  errors,
}: ScheduleFormProps) {
  const getLessonLengthText = () => {
    if (lessonLength === 1) {
      return "for 1 hour"
    }
    return `for ${lessonLength} hours`
  }
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-foreground mb-2 text-xl font-bold">
          Pick a Start Date and Time
        </h2>
        <p className="text-muted-foreground mb-2 text-sm">
          All courses meet weekly, same day and time (in your timezone), {getLessonLengthText()}
        </p>
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-brand-200 bg-brand-100 p-3">
          <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-600" />
          <div className="text-sm">
            <p className="mb-1 font-medium text-brand-900">
              Times shown in: {getFullTimezoneDisplay(instructorTimezone)}
            </p>
            <p className="text-brand-700">
              Students will see lesson times automatically converted to their local timezone
            </p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <DatePicker
            label="Start Date"
            value={startDate}
            onChange={onStartDateChange}
            error={errors.startDate}
          />

          <TimePicker
            label="Start Time"
            value={startTime}
            onChange={onStartTimeChange}
            error={errors.startTime}
          />
        </div>
      </div>
    </div>
  )
}
