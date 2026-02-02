import type { Assignment } from "@thicket/types"
import type { ScheduledLesson } from "./scheduleUtils"

export function lessonWithProgressToUnified(
  lesson: Record<string, any>,
  courseId: number,
  userTimezone?: string,
  courseTimezone?: string,
  courseCoverUrl?: string,
  assignments: Assignment[] = [],
  learningObjectives: string[] = [],
) {
  return {
    id: lesson.id ?? Date.now(),
    courseId,
    courseTitle: lesson.course_title || lesson.courseTitle,
    courseCoverUrl,
    lessonId: lesson.id ?? lesson.lesson_id ?? lesson.lessonId,
    lessonTitle: lesson.title || lesson.lesson_title || "Lesson",
    lessonDescription: lesson.description,
    lessonPosition: lesson.position ?? lesson.lesson_position ?? 1,
    scheduledAt: lesson.scheduled_at ?? lesson.scheduledAt,
    wherebyRoomUrl: lesson.whereby_room_url ?? lesson.wherebyRoomUrl,
    recordingUrl: lesson.recording_url ?? lesson.recordingUrl,
    startedAt: lesson.started_at ?? lesson.startedAt,
    topics: lesson.topics ?? [],
    isCompleted: lesson.is_completed ?? lesson.isCompleted,
    isLocked: lesson.is_locked ?? lesson.isLocked,
    learningObjectives,
    assignments,
    userTimezone: userTimezone || "UTC",
    courseTimezone,
  }
}

export function scheduledLessonToUnified(
  lesson: ScheduledLesson,
  userTimezone?: string,
  courseTimezone?: string,
) {
  return {
    id: lesson.lessonId,
    courseId: lesson.courseId,
    courseTitle: lesson.courseTitle,
    courseCoverUrl: lesson.courseCoverUrl,
    lessonId: lesson.lessonId,
    lessonTitle: lesson.lessonTitle || "Lesson",
    lessonPosition: lesson.lessonPosition ?? 1,
    scheduledAt: lesson.scheduledAt,
    recordingUrl: lesson.recordingUrl,
    wherebyRoomUrl: lesson.wherebyRoomUrl,
    userTimezone: userTimezone || "UTC",
    courseTimezone,
  }
}

