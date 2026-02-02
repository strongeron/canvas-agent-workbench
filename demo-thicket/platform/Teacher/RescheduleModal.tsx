import { format } from "date-fns"
import { Calendar, Clock } from "lucide-react"
import { useState } from "react"

import { Button } from "@thicket/components/ui/button"
import { DatePicker } from "@thicket/components/ui/date-picker"
import { Modal } from "@thicket/components/ui/modal/"
import { TimePicker } from "@thicket/components/ui/time-picker"
import type { ScheduledLesson } from "@thicket/platform/utils/scheduleUtils"

export interface RescheduleModalProps {
  lesson: ScheduledLesson
  onClose: () => void
  onConfirm: (lessonId: number, courseId: number, newDateTime: string) => void
}

export function RescheduleModal({ lesson, onClose, onConfirm }: RescheduleModalProps) {
  const scheduledAt = lesson.scheduledAt || new Date().toISOString()
  const currentDate = format(new Date(scheduledAt), "yyyy-MM-dd")
  const currentTime = format(new Date(scheduledAt), "HH:mm")

  const [newDate, setNewDate] = useState(currentDate)
  const [newTime, setNewTime] = useState(currentTime)
  const [error, setError] = useState("")

  const handleConfirm = () => {
    if (!newDate || !newTime) {
      setError("Please select both date and time")
      return
    }

    const newDateTime = new Date(`${newDate}T${newTime}:00.000Z`)
    const now = new Date()

    if (newDateTime < now) {
      setError("Cannot schedule a lesson in the past")
      return
    }

    onConfirm(lesson.lessonId, lesson.courseId, newDateTime.toISOString())
    onClose()
  }

  const hasChanges = newDate !== currentDate || newTime !== currentTime

  return (
    <Modal
      isOpen
      onClose={onClose}
      aria-labelledby="reschedule-title"
      aria-describedby="reschedule-description"
    >
      <Modal.Header
        title="Reschedule Lesson"
        subtitle="Choose a new date and time for this lesson"
        onClose={onClose}
      />

      <Modal.Body id="reschedule-description">
        <div className="space-y-6">
          <div className="rounded-lg bg-surface-50 p-4">
            <div className="mb-2">
              <span className="text-muted text-xs font-medium uppercase">Current Schedule</span>
            </div>
            <h3 className="font-display text-foreground mb-1 font-semibold">
              {lesson.lessonTitle}
            </h3>
            <p className="text-muted-foreground mb-2 text-sm">{lesson.courseTitle}</p>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-brand-600" />
                <span>{format(new Date(scheduledAt), "MMMM d, yyyy")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-brand-600" />
                <span>{format(new Date(scheduledAt), "h:mm a")}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <DatePicker
              label="New Date"
              value={newDate}
              onChange={setNewDate}
            />

            <TimePicker
              label="New Time"
              value={newTime}
              onChange={setNewTime}
            />
          </div>

          {error && (
            <Modal.Warning variant="error">
              {error}
            </Modal.Warning>
          )}

          {hasChanges && (
            <div className="rounded-lg bg-brand-50 p-3">
              <p className="text-brand-800 text-sm">
                <strong>New schedule:</strong>{" "}
                {format(new Date(`${newDate}T${newTime}`), "EEEE, MMMM d 'at' h:mm a")}
              </p>
            </div>
          )}

          <p className="text-muted text-center text-xs">
            Students will need to check the schedule for the updated time
          </p>
        </div>
      </Modal.Body>

      <Modal.Footer align="right">
        <Button
          variant="ghost"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          variant="brand"
          onClick={handleConfirm}
          disabled={!hasChanges}
        >
          Confirm Reschedule
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
