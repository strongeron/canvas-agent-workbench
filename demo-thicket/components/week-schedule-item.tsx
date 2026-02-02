import { format } from "date-fns"
import { CheckCircle, ChevronDown, ChevronUp, Circle, Lock } from "lucide-react"
import { useState } from "react"

import { LessonCTA } from "../platform/CTAs/LessonCTA"
import { FilesList, TopicsList } from "../platform/shared-lesson-card-primitives"
import { getLessonDetailedStatus } from "../platform/utils/lessonHelpers"
import type { Lesson } from "../types"
import type { LessonWithProgress } from "../types/serializers/StudentCoursesShow"

type WeekScheduleItemLesson = Lesson | LessonWithProgress

function isLessonWithProgress(lesson: WeekScheduleItemLesson): lesson is LessonWithProgress {
  return 'is_completed' in lesson && 'is_locked' in lesson
}

interface WeekScheduleItemProps {
  week: WeekScheduleItemLesson
  isFirst?: boolean
  courseId?: number
}

export function WeekScheduleItem({
  week,
  isFirst = false,
  courseId,
}: WeekScheduleItemProps) {
  const [isExpanded, setIsExpanded] = useState(isFirst)

  const hasAssignments = week.assignments && week.assignments.length > 0
  const isProgressView = isLessonWithProgress(week)
  const isLocked = isProgressView && week.is_locked
  const isCompleted = isProgressView && week.is_completed

  return (
    <div className={`overflow-hidden rounded-lg border transition-all duration-250 ${
      isLocked
        ? "border-surface-200 bg-surface-50"
        : "border-default bg-white"
    }`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex w-full items-center justify-between px-6 py-4 transition-colors duration-200 ${
          isLocked ? "cursor-default" : "hover:bg-surface-50"
        }`}
        disabled={isLocked}
      >
        <div className="flex items-center gap-4 text-left">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              isCompleted
                ? "bg-success-50"
                : isLocked
                  ? "bg-surface-100"
                  : "bg-brand-100"
            }`}
          >
            {isProgressView ? (
              isCompleted ? (
                <CheckCircle className="h-5 w-5 text-success-600" />
              ) : isLocked ? (
                <Lock className="h-5 w-5 text-surface-400" />
              ) : (
                <Circle className="h-5 w-5 text-brand-600" />
              )
            ) : (
              <span className="text-brand-700 text-sm font-bold">
                {week.position + 1}
              </span>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-sm font-medium ${
                isLocked ? "text-surface-400" : "text-muted-foreground"
              }`}>
                Lesson {week.position + 1}
              </span>
              {isProgressView && week.scheduled_at && (
                <span className="text-muted text-xs">
                  • {format(new Date(week.scheduled_at), "MMM d, h:mm a")}
                </span>
              )}
            </div>
            <h3 className={`font-display text-lg font-semibold ${
              isLocked ? "text-surface-400" : "text-foreground"
            }`}>
              {week.title}
            </h3>
            <p className={`mt-1 text-sm ${
              isLocked ? "text-surface-400" : "text-muted-foreground"
            }`}>
              {week.description}
            </p>
          </div>
        </div>
        <div className="ml-4 flex items-center gap-3 shrink-0">
          {isProgressView && !isLocked && week.whereby_room_url && courseId && (
            <div onClick={(e) => e.stopPropagation()}>
              <LessonCTA
                lesson={{
                  id: week.id,
                  courseId: courseId,
                  lessonId: week.id,
                  lessonTitle: week.title,
                  lessonDescription: week.description,
                  lessonPosition: week.position,
                  scheduledAt: week.scheduled_at,
                  wherebyRoomUrl: week.whereby_room_url,
                  isCompleted: isCompleted,
                  isLocked: isLocked,
                  userTimezone: "America/New_York",
                }}
                status={getLessonDetailedStatus({
                  id: week.id,
                  courseId: courseId,
                  lessonId: week.id,
                  lessonTitle: week.title,
                  lessonDescription: week.description,
                  lessonPosition: week.position,
                  scheduledAt: week.scheduled_at,
                  wherebyRoomUrl: week.whereby_room_url,
                  isCompleted: isCompleted,
                  isLocked: isLocked,
                  userTimezone: "America/New_York",
                })}
                role="student"
                mode="schedule"
                size="sm"
              />
            </div>
          )}
          {!isLocked && (
            <div>
              {isExpanded ? (
                <ChevronUp className="text-muted-foreground h-5 w-5" />
              ) : (
                <ChevronDown className="text-muted-foreground h-5 w-5" />
              )}
            </div>
          )}
        </div>
      </button>

      {isExpanded && !isLocked && (
        <div className="border-subtle border-t bg-white px-6 py-4">
          {week.topics && week.topics.length > 0 && (
            <div className="mb-4">
              <TopicsList topics={week.topics} isLocked={isLocked} />
            </div>
          )}

          {hasAssignments && (
            <div className={week.topics && week.topics.length > 0 ? "mt-6" : ""}>
              <FilesList
                assignments={week.assignments!}
                isLocked={isLocked}
                showDownload={true}
                onDownload={(assignment) => {
                  const link = document.createElement("a")
                  link.href = assignment.file_url
                  link.download = assignment.original_name
                  document.body.appendChild(link)
                  link.click()
                  document.body.removeChild(link)
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
