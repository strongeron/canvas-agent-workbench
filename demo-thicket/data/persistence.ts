import type { AuthorProfile, Course } from '@thicket/types'

import type { Transaction } from './earnings'
import type { InstructorSettings } from './instructors'
import type { Message, MessageThread } from './messages'
import { storage } from './storage-manager'
import type { EnrolledCourse, Student } from './students'

const SESSION_ID_START = 10000

export type SessionCourse = Course & {
  isSessionData?: boolean
}

export type SessionStudent = Student & {
  isSessionData?: boolean
}

export type SessionMessage = Message & {
  isSessionData?: boolean
}

export type SessionThread = MessageThread & {
  isSessionData?: boolean
}

export function getNextCourseId(existingCourses: Course[]): number {
  const maxOriginalId = Math.max(...existingCourses.map(c => c.id), 0)
  const sessionCourses = storage.get<SessionCourse[]>('marketplace_courses_session') || []
  const maxSessionId = sessionCourses.length > 0
    ? Math.max(...sessionCourses.map(c => c.id), SESSION_ID_START - 1)
    : SESSION_ID_START - 1

  return Math.max(maxOriginalId, maxSessionId) + 1
}

export function getNextStudentId(existingStudents: Student[]): number {
  const maxOriginalId = Math.max(...existingStudents.map(s => s.id), 0)
  const sessionStudents = storage.get<SessionStudent[]>('marketplace_students_session') || []
  const maxSessionId = sessionStudents.length > 0
    ? Math.max(...sessionStudents.map(s => s.id), SESSION_ID_START - 1)
    : SESSION_ID_START - 1

  return Math.max(maxOriginalId, maxSessionId) + 1
}

export function getNextMessageId(existingMessages: Message[]): number {
  const maxOriginalId = Math.max(...existingMessages.map(m => m.id), 0)
  const sessionMessages = storage.get<SessionMessage[]>('marketplace_messages_session') || []
  const maxSessionId = sessionMessages.length > 0
    ? Math.max(...sessionMessages.map(m => m.id), SESSION_ID_START - 1)
    : SESSION_ID_START - 1

  return Math.max(maxOriginalId, maxSessionId) + 1
}

export function getNextThreadId(existingThreads: MessageThread[]): number {
  const maxOriginalId = Math.max(...existingThreads.map(t => t.id), 0)
  const sessionThreads = storage.get<SessionThread[]>('marketplace_threads_session') || []
  const maxSessionId = Array.isArray(sessionThreads) && sessionThreads.length > 0
    ? Math.max(...sessionThreads.map(t => t.id), SESSION_ID_START - 1)
    : SESSION_ID_START - 1

  return Math.max(maxOriginalId, maxSessionId) + 1
}

export function loadSessionCourses(originalCourses: Course[]): Course[] {
  const sessionCourses = storage.get<SessionCourse[]>('marketplace_courses_session') || []

  const mergedCourses = [...originalCourses]

  sessionCourses.forEach(sessionCourse => {
    const existingIndex = mergedCourses.findIndex(c => c.id === sessionCourse.id)

    if (existingIndex >= 0) {
      mergedCourses[existingIndex] = { ...sessionCourse }
    } else {
      mergedCourses.push({ ...sessionCourse })
    }
  })

  return mergedCourses
}

export function saveSessionCourse(course: Course): boolean {
  const sessionCourses = storage.get<SessionCourse[]>('marketplace_courses_session') || []

  const existingIndex = sessionCourses.findIndex(c => c.id === course.id)

  if (existingIndex >= 0) {
    sessionCourses[existingIndex] = { ...course, isSessionData: true }
  } else {
    sessionCourses.push({ ...course, isSessionData: true })
  }

  return storage.set('marketplace_courses_session', sessionCourses)
}

export function deleteSessionCourse(courseId: number): boolean {
  const sessionCourses = storage.get<SessionCourse[]>('marketplace_courses_session') || []
  const filtered = sessionCourses.filter(c => c.id !== courseId)
  return storage.set('marketplace_courses_session', filtered)
}

export function archiveSessionCourse(course: Course): boolean {
  const archivedCourse = {
    ...course,
    state: 'archived' as const,
    isSessionData: true,
  }

  return saveSessionCourse(archivedCourse)
}

export function resolveStudentEnrollmentDates(student: Student): Student {
  return {
    ...student,
    enrolled_courses: student.enrolled_courses.map(enrollment => ({
      ...enrollment,
      next_lesson_date: typeof enrollment.next_lesson_date === 'function'
        ? enrollment.next_lesson_date()
        : enrollment.next_lesson_date,
      last_accessed: typeof enrollment.last_accessed === 'function'
        ? enrollment.last_accessed()
        : enrollment.last_accessed,
    })),
  }
}

export function loadSessionStudents(originalStudents: Student[]): Student[] {
  const sessionData = storage.get<Record<number, Partial<Student>>>('marketplace_students_session') || {}

  return originalStudents.map(student => {
    const sessionStudent = sessionData[student.id]
    if (!sessionStudent) return resolveStudentEnrollmentDates(student)

    return resolveStudentEnrollmentDates({
      ...student,
      ...sessionStudent,
      enrolled_courses: sessionStudent.enrolled_courses || student.enrolled_courses,
    })
  })
}

export function saveStudentEnrollment(studentId: number, enrollment: EnrolledCourse): boolean {
  const sessionData = storage.get<Record<number, Partial<Student>>>('marketplace_students_session') || {}

  if (!sessionData[studentId]) {
    sessionData[studentId] = {
      id: studentId,
      enrolled_courses: [],
    }
  }

  const studentData = sessionData[studentId]
  const enrollments = studentData.enrolled_courses || []

  const existingIndex = enrollments.findIndex(e => e.course_id === enrollment.course_id)
  if (existingIndex >= 0) {
    enrollments[existingIndex] = enrollment
  } else {
    enrollments.push(enrollment)
  }

  studentData.enrolled_courses = enrollments
  sessionData[studentId] = studentData

  return storage.set('marketplace_students_session', sessionData)
}

export function updateStudentProgress(
  studentId: number,
  courseId: number,
  updates: Partial<EnrolledCourse>
): boolean {
  const sessionData = storage.get<Record<number, Partial<Student>>>('marketplace_students_session') || {}

  if (!sessionData[studentId]) return false

  const enrollments = sessionData[studentId].enrolled_courses || []
  const enrollmentIndex = enrollments.findIndex(e => e.course_id === courseId)

  if (enrollmentIndex < 0) return false

  enrollments[enrollmentIndex] = {
    ...enrollments[enrollmentIndex],
    ...updates,
  }

  sessionData[studentId].enrolled_courses = enrollments

  return storage.set('marketplace_students_session', sessionData)
}

export function loadSessionMessages(originalMessages: Message[]): Message[] {
  const sessionMessages = storage.get<SessionMessage[]>('marketplace_messages_session') || []
  return [...originalMessages, ...sessionMessages]
}

export function saveSessionMessage(message: Message): boolean {
  const sessionMessages = storage.get<SessionMessage[]>('marketplace_messages_session') || []
  sessionMessages.push({ ...message, isSessionData: true })
  return storage.set('marketplace_messages_session', sessionMessages)
}

export function loadSessionThreads(originalThreads: MessageThread[]): MessageThread[] {
  try {
    const sessionThreads = storage.get<SessionThread[]>('marketplace_threads_session') || []

    if (!Array.isArray(sessionThreads)) {
      console.warn('[persistence] Session threads data is not an array, returning original threads')
      return originalThreads
    }

    const mergedThreads = [...originalThreads]

    sessionThreads.forEach(sessionThread => {
      if (!sessionThread || typeof sessionThread !== 'object') {
        return
      }

      const existingIndex = mergedThreads.findIndex(t => t.id === sessionThread.id)

      if (existingIndex >= 0) {
        mergedThreads[existingIndex] = { ...sessionThread }
      } else {
        mergedThreads.push({ ...sessionThread })
      }
    })

    return mergedThreads
  } catch (error) {
    console.error('[persistence] Error loading session threads:', error)
    return originalThreads
  }
}

export function getSessionThreads(): MessageThread[] {
  try {
    const threads = storage.get<SessionThread[]>('marketplace_threads_session') || []
    return Array.isArray(threads) ? threads : []
  } catch (error) {
    console.error('[persistence] Error getting session threads:', error)
    return []
  }
}

export function saveSessionThread(thread: MessageThread): boolean {
  try {
    const sessionThreads = storage.get<SessionThread[]>('marketplace_threads_session') || []

    if (!Array.isArray(sessionThreads)) {
      console.warn('[persistence] Session threads data is not an array, creating new array')
      return storage.set('marketplace_threads_session', [{ ...thread, isSessionData: true }])
    }

    const existingIndex = sessionThreads.findIndex(t => t.id === thread.id)

    if (existingIndex >= 0) {
      sessionThreads[existingIndex] = { ...thread, isSessionData: true }
    } else {
      sessionThreads.push({ ...thread, isSessionData: true })
    }

    return storage.set('marketplace_threads_session', sessionThreads)
  } catch (error) {
    console.error('[persistence] Error saving session thread:', error)
    return false
  }
}

export function updateThreadUnreadCount(threadId: number, unreadCount: number): boolean {
  try {
    const sessionThreads = storage.get<SessionThread[]>('marketplace_threads_session') || []

    if (!Array.isArray(sessionThreads)) {
      console.warn('[persistence] Session threads data is not an array')
      return false
    }

    const threadIndex = sessionThreads.findIndex(t => t.id === threadId)

    if (threadIndex < 0) return false

    sessionThreads[threadIndex].unread_count = unreadCount

    return storage.set('marketplace_threads_session', sessionThreads)
  } catch (error) {
    console.error('[persistence] Error updating thread unread count:', error)
    return false
  }
}

export function saveSessionTransaction(transaction: Transaction): boolean {
  const sessionTransactions = storage.get<Transaction[]>('marketplace_earnings_session') || []
  sessionTransactions.push(transaction)
  return storage.set('marketplace_earnings_session', sessionTransactions)
}

export function loadSessionTransactions(): Transaction[] {
  return storage.get<Transaction[]>('marketplace_earnings_session') || []
}

export function resetAllSessionData(): boolean {
  return storage.clear()
}

export function exportSessionData(): Record<string, unknown> {
  return storage.export()
}

export function importSessionData(data: Record<string, unknown>): boolean {
  return storage.import(data)
}

export interface RescheduledLesson {
  courseId: number
  lessonId: number
  originalScheduledAt: string
  newScheduledAt: string
  rescheduledAt: string
  rescheduledBy: number
}

export function loadRescheduledLessons(): RescheduledLesson[] {
  return storage.get<RescheduledLesson[]>('marketplace_reschedules_session') || []
}

export function saveRescheduledLesson(reschedule: RescheduledLesson): boolean {
  const reschedules = storage.get<RescheduledLesson[]>('marketplace_reschedules_session') || []

  const existingIndex = reschedules.findIndex(
    r => r.courseId === reschedule.courseId && r.lessonId === reschedule.lessonId
  )

  if (existingIndex >= 0) {
    reschedules[existingIndex] = reschedule
  } else {
    reschedules.push(reschedule)
  }

  return storage.set('marketplace_reschedules_session', reschedules)
}

export function getRescheduledTime(courseId: number, lessonId: number): string | null {
  const reschedules = loadRescheduledLessons()
  const reschedule = reschedules.find(
    r => r.courseId === courseId && r.lessonId === lessonId
  )
  return reschedule ? reschedule.newScheduledAt : null
}

export function clearOldReschedules(): boolean {
  const reschedules = loadRescheduledLessons()
  const now = new Date()
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const filtered = reschedules.filter(r => {
    const rescheduledDate = new Date(r.rescheduledAt)
    return rescheduledDate > oneMonthAgo
  })

  return storage.set('marketplace_reschedules_session', filtered)
}

export function saveStudentProfile(studentId: number, updates: Partial<Student>): boolean {
  const sessionData = storage.get<Record<number, Partial<Student>>>('marketplace_students_session') || {}

  if (!sessionData[studentId]) {
    sessionData[studentId] = { id: studentId }
  }

  sessionData[studentId] = {
    ...sessionData[studentId],
    ...updates,
    id: studentId,
  }

  return storage.set('marketplace_students_session', sessionData)
}

export function loadSessionInstructors(originalInstructors: AuthorProfile[]): AuthorProfile[] {
  const sessionData = storage.get<Record<number, Partial<AuthorProfile>>>('marketplace_instructors_session') || {}

  return originalInstructors.map(instructor => {
    const sessionInstructor = sessionData[instructor.id]
    if (!sessionInstructor) return instructor

    return {
      ...instructor,
      ...sessionInstructor,
    }
  })
}

export function saveInstructorProfile(instructorId: number, updates: Partial<AuthorProfile>): boolean {
  const sessionData = storage.get<Record<number, Partial<AuthorProfile>>>('marketplace_instructors_session') || {}

  if (!sessionData[instructorId]) {
    sessionData[instructorId] = { }
  }

  sessionData[instructorId] = {
    ...sessionData[instructorId],
    ...updates,
  }

  return storage.set('marketplace_instructors_session', sessionData)
}

export interface StripeConnectionData {
  instructorId: number
  connected: boolean
  accountId?: string
  connectedDate?: string
}

export function loadStripeConnection(instructorId: number): StripeConnectionData {
  const sessionData = storage.get<Record<number, StripeConnectionData>>('marketplace_stripe_session') || {}
  return sessionData[instructorId] || {
    instructorId,
    connected: false,
  }
}

export function saveStripeConnection(data: StripeConnectionData): boolean {
  const sessionData = storage.get<Record<number, StripeConnectionData>>('marketplace_stripe_session') || {}
  sessionData[data.instructorId] = data
  return storage.set('marketplace_stripe_session', sessionData)
}

export function loadInstructorSettings(instructorId: number, baseSettings: InstructorSettings): InstructorSettings {
  const stripeData = loadStripeConnection(instructorId)
  const sessionSettings = storage.get<Record<number, Partial<InstructorSettings>>>('marketplace_instructor_settings_session') || {}
  const savedSettings = sessionSettings[instructorId] || {}

  return {
    ...baseSettings,
    ...savedSettings,
    stripe_connected: stripeData.connected,
    stripe_account_id: stripeData.accountId,
    stripe_connected_date: stripeData.connectedDate,
  }
}

export function saveInstructorSettings(instructorId: number, updates: Partial<InstructorSettings>): boolean {
  const sessionSettings = storage.get<Record<number, Partial<InstructorSettings>>>('marketplace_instructor_settings_session') || {}

  if (!sessionSettings[instructorId]) {
    sessionSettings[instructorId] = {}
  }

  sessionSettings[instructorId] = {
    ...sessionSettings[instructorId],
    ...updates,
  }

  return storage.set('marketplace_instructor_settings_session', sessionSettings)
}

export interface UserVisitData {
  first_visit_courses_page: boolean
}

export function loadUserVisits(userId: number): UserVisitData {
  const visits = storage.get<Record<number, UserVisitData>>('marketplace_user_visits_session') || {}
  return visits[userId] || {
    first_visit_courses_page: true,
  }
}

export function markCoursesPageVisited(userId: number): boolean {
  const visits = storage.get<Record<number, UserVisitData>>('marketplace_user_visits_session') || {}

  visits[userId] = {
    ...visits[userId],
    first_visit_courses_page: false,
  }

  return storage.set('marketplace_user_visits_session', visits)
}

export interface LessonTimestamp {
  studentId: number
  courseId: number
  lessonId: number
  startedAt: string
  completedAt?: string
}

export function loadLessonTimestamps(studentId: number, courseId: number): Record<number, LessonTimestamp> {
  const allTimestamps = storage.get<Record<string, LessonTimestamp>>('marketplace_lesson_timestamps_session') || {}
  const result: Record<number, LessonTimestamp> = {}

  Object.values(allTimestamps).forEach(timestamp => {
    if (timestamp.studentId === studentId && timestamp.courseId === courseId) {
      result[timestamp.lessonId] = timestamp
    }
  })

  return result
}

export function saveLessonTimestamp(timestamp: LessonTimestamp): boolean {
  const allTimestamps = storage.get<Record<string, LessonTimestamp>>('marketplace_lesson_timestamps_session') || {}
  const key = `${timestamp.studentId}-${timestamp.courseId}-${timestamp.lessonId}`
  allTimestamps[key] = timestamp
  return storage.set('marketplace_lesson_timestamps_session', allTimestamps)
}

export function getLessonTimestamp(studentId: number, courseId: number, lessonId: number): LessonTimestamp | null {
  const allTimestamps = storage.get<Record<string, LessonTimestamp>>('marketplace_lesson_timestamps_session') || {}
  const key = `${studentId}-${courseId}-${lessonId}`
  return allTimestamps[key] || null
}
