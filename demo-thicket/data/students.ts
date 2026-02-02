/**
 * EnrolledCourse type for source data layer.
 *
 * IMPORTANT: This type allows function references for dynamic values like
 * next_lesson_date and last_accessed. These functions MUST be resolved to
 * strings before passing data to Inertia pages.
 *
 * Use serializeEnrollment() or serializeStudent() utilities to convert
 * this source data format to the serialized format expected by the frontend.
 */
export interface EnrolledCourse {
  course_id: number
  enrolled_at: string
  progress_percentage: number
  completed_lessons: number[]
  next_lesson_id?: number
  next_lesson_date?: string | (() => string)
  whereby_room_url?: string
  last_accessed?: string | (() => string)
  lesson_recordings?: Record<number, string>
  lesson_start_times?: Record<number, string>
}

export function getDynamicLessonDate(): string {
  const now = new Date()
  now.setMinutes(now.getMinutes() + 5)
  return now.toISOString()
}

export function getDynamicLastAccessed(): string {
  const now = new Date()
  now.setMinutes(now.getMinutes() - 30)
  return now.toISOString()
}

export function resolveEnrollmentDate(date: string | (() => string) | undefined): string | undefined {
  if (typeof date === 'function') {
    return date()
  }
  return date
}

export function generateLessonStartTimes(completedLessons: number[]): Record<number, string> {
  const now = new Date()
  const startTimes: Record<number, string> = {}

  completedLessons.forEach((lessonId, index) => {
    const daysAgo = (completedLessons.length - index) * 7
    const lessonDate = new Date(now)
    lessonDate.setDate(lessonDate.getDate() - daysAgo)
    lessonDate.setHours(14, 0, 0, 0)
    startTimes[lessonId] = lessonDate.toISOString()
  })

  return startTimes
}

export interface Student {
  id: number
  name: string
  email: string
  avatar_url: string
  enrolled_courses: EnrolledCourse[]
  overall_progress: number
  last_activity: string
  courses_completed: number
  join_date: string
  bio?: string
  timezone?: string
}

export const STUDENTS: Student[] = [
  {
    id: 1,
    name: "Emily Rodriguez",
    email: "emily.rodriguez@example.com",
    avatar_url:
      "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=200",
    bio: "Art history enthusiast with a passion for Renaissance architecture and cultural studies. Excited to deepen my understanding of historical contexts.",
    timezone: "America/New_York",
    enrolled_courses: [
      {
        course_id: 1,
        enrolled_at: "2025-10-15T00:00:00.000Z",
        progress_percentage: 75,
        completed_lessons: [1, 2, 3, 4, 5, 6],
        next_lesson_id: 7,
        next_lesson_date: getDynamicLessonDate,
        whereby_room_url: "https://thicket-test.whereby.com/thicket-rooma8dea135-8796-47d7-bc3b-da4ed8ecb30e",
        last_accessed: getDynamicLastAccessed,
        lesson_recordings: {
          1: "https://thicket-test.whereby.com/recording/renaissance-arch-intro-rec-001",
          2: "https://thicket-test.whereby.com/recording/brunelleschi-dome-rec-002",
          3: "https://thicket-test.whereby.com/recording/alberti-theory-rec-003",
          4: "https://thicket-test.whereby.com/recording/florence-palaces-rec-004",
          5: "https://thicket-test.whereby.com/recording/high-renaissance-rome-rec-005",
          6: "https://thicket-test.whereby.com/recording/bramante-st-peters-rec-006",
        },
        lesson_start_times: generateLessonStartTimes([1, 2, 3, 4, 5, 6]),
      },
      {
        course_id: 5,
        enrolled_at: "2025-09-15T00:00:00.000Z",
        progress_percentage: 100,
        completed_lessons: [1, 2, 3, 4, 5],
        last_accessed: "2025-11-01T10:15:00.000Z",
        lesson_recordings: {
          1: "https://thicket-test.whereby.com/recording/impressionism-intro-rec-001",
          2: "https://thicket-test.whereby.com/recording/monet-light-rec-002",
          3: "https://thicket-test.whereby.com/recording/renoir-figure-rec-003",
          4: "https://thicket-test.whereby.com/recording/degas-movement-rec-004",
          5: "https://thicket-test.whereby.com/recording/impressionism-legacy-rec-005",
        },
        lesson_start_times: generateLessonStartTimes([1, 2, 3, 4, 5]),
      },
      {
        course_id: 2,
        enrolled_at: "2025-10-20T00:00:00.000Z",
        progress_percentage: 45,
        completed_lessons: [1, 2, 3],
        next_lesson_id: 4,
        next_lesson_date: "2025-11-09T15:00:00.000Z",
        whereby_room_url: "https://subdomain.whereby.com/modernist-masters-lesson-4?roomKey=def456",
        last_accessed: "2025-11-02T10:15:00.000Z",
        lesson_recordings: {
          1: "https://thicket-test.whereby.com/recording/modernist-intro-rec-001",
          2: "https://thicket-test.whereby.com/recording/bauhaus-principles-rec-002",
          3: "https://thicket-test.whereby.com/recording/brutalism-architecture-rec-003",
        },
        lesson_start_times: generateLessonStartTimes([1, 2, 3]),
      },
      {
        course_id: 3,
        enrolled_at: "2025-10-25T00:00:00.000Z",
        progress_percentage: 20,
        completed_lessons: [1],
        next_lesson_id: 2,
        next_lesson_date: "2025-11-14T17:00:00.000Z",
        whereby_room_url: "https://subdomain.whereby.com/gothic-cathedrals-lesson-2?roomKey=ghi789",
        last_accessed: "2025-10-28T16:45:00.000Z",
        lesson_recordings: {
          1: "https://thicket-test.whereby.com/recording/gothic-intro-rec-001",
        },
        lesson_start_times: generateLessonStartTimes([1]),
      },
    ],
    overall_progress: 60,
    last_activity: "2025-11-03T14:30:00.000Z",
    courses_completed: 2,
    join_date: "2025-09-01T00:00:00.000Z",
  },
  {
    id: 2,
    name: "Alex Morgan",
    email: "alex.morgan@example.com",
    avatar_url:
      "https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=200",
    bio: "New to the platform! Excited to explore courses in art, history, and culture.",
    timezone: "America/Los_Angeles",
    enrolled_courses: [],
    overall_progress: 0,
    last_activity: new Date().toISOString(),
    courses_completed: 0,
    join_date: new Date().toISOString(),
  },
  {
    id: 3,
    name: "Sarah Johnson",
    email: "sarah.johnson@example.com",
    avatar_url:
      "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=200",
    timezone: "America/New_York",
    enrolled_courses: [
      {
        course_id: 1,
        enrolled_at: "2025-10-10T00:00:00.000Z",
        progress_percentage: 38,
        completed_lessons: [1, 2, 3],
        next_lesson_id: 4,
        last_accessed: "2025-11-02T16:45:00.000Z",
      },
      {
        course_id: 3,
        enrolled_at: "2025-10-25T00:00:00.000Z",
        progress_percentage: 20,
        completed_lessons: [1],
        next_lesson_id: 2,
      },
      {
        course_id: 5,
        enrolled_at: "2025-10-28T00:00:00.000Z",
        progress_percentage: 10,
        completed_lessons: [],
        next_lesson_id: 1,
      },
    ],
    overall_progress: 23,
    last_activity: "2025-11-02T16:45:00.000Z",
    courses_completed: 0,
    join_date: "2025-09-15T00:00:00.000Z",
  },
  {
    id: 4,
    name: "James Wilson",
    email: "james.wilson@example.com",
    avatar_url:
      "https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=200",
    timezone: "America/New_York",
    enrolled_courses: [
      {
        course_id: 1,
        enrolled_at: "2025-10-22T00:00:00.000Z",
        progress_percentage: 100,
        completed_lessons: [1, 2, 3, 4, 5, 6, 7, 8],
        last_accessed: "2025-10-30T10:15:00.000Z",
        lesson_recordings: {
          1: "https://thicket-test.whereby.com/recording/renaissance-arch-intro-rec-001",
          2: "https://thicket-test.whereby.com/recording/brunelleschi-dome-rec-002",
          3: "https://thicket-test.whereby.com/recording/alberti-theory-rec-003",
          4: "https://thicket-test.whereby.com/recording/florence-palaces-rec-004",
          5: "https://thicket-test.whereby.com/recording/high-renaissance-rome-rec-005",
          6: "https://thicket-test.whereby.com/recording/bramante-st-peters-rec-006",
          7: "https://thicket-test.whereby.com/recording/michelangelo-architect-rec-007",
          8: "https://thicket-test.whereby.com/recording/legacy-influence-rec-008",
        },
        lesson_start_times: generateLessonStartTimes([1, 2, 3, 4, 5, 6, 7, 8]),
      },
      {
        course_id: 2,
        enrolled_at: "2025-10-22T00:00:00.000Z",
        progress_percentage: 65,
        completed_lessons: [1, 2, 3, 4],
        next_lesson_id: 5,
      },
    ],
    overall_progress: 82,
    last_activity: "2025-11-04T11:20:00.000Z",
    courses_completed: 3,
    join_date: "2025-08-20T00:00:00.000Z",
  },
  {
    id: 5,
    name: "Priya Patel",
    email: "priya.patel@example.com",
    avatar_url:
      "https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg?auto=compress&cs=tinysrgb&w=200",
    timezone: "Asia/Kolkata",
    enrolled_courses: [
      {
        course_id: 1,
        enrolled_at: "2025-09-30T00:00:00.000Z",
        progress_percentage: 62,
        completed_lessons: [1, 2, 3, 4, 5],
        next_lesson_id: 6,
        last_accessed: "2025-11-01T10:00:00.000Z",
      },
    ],
    overall_progress: 62,
    last_activity: "2025-11-01T10:00:00.000Z",
    courses_completed: 1,
    join_date: "2025-09-30T00:00:00.000Z",
  },
  {
    id: 6,
    name: "David Kim",
    email: "david.kim@example.com",
    avatar_url:
      "https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=200",
    timezone: "America/Los_Angeles",
    enrolled_courses: [
      {
        course_id: 1,
        enrolled_at: "2025-10-08T00:00:00.000Z",
        progress_percentage: 75,
        completed_lessons: [1, 2, 3, 4, 5, 6],
        next_lesson_id: 7,
        last_accessed: getDynamicLastAccessed,
      },
      {
        course_id: 2,
        enrolled_at: "2025-10-12T00:00:00.000Z",
        progress_percentage: 80,
        completed_lessons: [],
      },
      {
        course_id: 4,
        enrolled_at: "2025-10-15T00:00:00.000Z",
        progress_percentage: 40,
        completed_lessons: [],
      },
    ],
    overall_progress: 65,
    last_activity: new Date().toISOString(),
    courses_completed: 0,
    join_date: "2025-10-08T00:00:00.000Z",
  },
  {
    id: 7,
    name: "Olivia Martinez",
    email: "olivia.martinez@example.com",
    avatar_url:
      "https://images.pexels.com/photos/1065084/pexels-photo-1065084.jpeg?auto=compress&cs=tinysrgb&w=200",
    timezone: "America/Chicago",
    enrolled_courses: [
      {
        course_id: 1,
        enrolled_at: "2025-10-05T00:00:00.000Z",
        progress_percentage: 88,
        completed_lessons: [1, 2, 3, 4, 5, 6, 7],
        next_lesson_id: 8,
        last_accessed: "2025-11-04T13:00:00.000Z",
      },
      {
        course_id: 3,
        enrolled_at: "2025-10-08T00:00:00.000Z",
        progress_percentage: 70,
        completed_lessons: [],
      },
    ],
    overall_progress: 79,
    last_activity: "2025-11-04T13:00:00.000Z",
    courses_completed: 2,
    join_date: "2025-09-05T00:00:00.000Z",
  },
  {
    id: 8,
    name: "Lucas Anderson",
    email: "lucas.anderson@example.com",
    avatar_url:
      "https://images.pexels.com/photos/1024311/pexels-photo-1024311.jpeg?auto=compress&cs=tinysrgb&w=200",
    timezone: "America/Denver",
    enrolled_courses: [
      {
        course_id: 1,
        enrolled_at: "2025-10-28T00:00:00.000Z",
        progress_percentage: 12,
        completed_lessons: [1],
        next_lesson_id: 2,
        last_accessed: "2025-11-03T19:45:00.000Z",
      },
    ],
    overall_progress: 12,
    last_activity: "2025-11-03T19:45:00.000Z",
    courses_completed: 0,
    join_date: "2025-10-28T00:00:00.000Z",
  },
  {
    id: 9,
    name: "Sophia Lee",
    email: "sophia.lee@example.com",
    avatar_url:
      "https://images.pexels.com/photos/1858175/pexels-photo-1858175.jpeg?auto=compress&cs=tinysrgb&w=200",
    timezone: "America/Chicago",
    enrolled_courses: [
      {
        course_id: 1,
        enrolled_at: "2025-10-14T00:00:00.000Z",
        progress_percentage: 50,
        completed_lessons: [1, 2, 3, 4],
        next_lesson_id: 5,
        last_accessed: "2025-11-02T15:30:00.000Z",
      },
      {
        course_id: 5,
        enrolled_at: "2025-10-20T00:00:00.000Z",
        progress_percentage: 30,
        completed_lessons: [],
      },
    ],
    overall_progress: 40,
    last_activity: "2025-11-02T15:30:00.000Z",
    courses_completed: 1,
    join_date: "2025-10-01T00:00:00.000Z",
  },
  {
    id: 10,
    name: "Nathan Brown",
    email: "nathan.brown@example.com",
    avatar_url:
      "https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=200",
    timezone: "America/Denver",
    enrolled_courses: [
      {
        course_id: 2,
        enrolled_at: "2025-10-19T00:00:00.000Z",
        progress_percentage: 25,
        completed_lessons: [],
      },
    ],
    overall_progress: 25,
    last_activity: "2025-10-29T12:00:00.000Z",
    courses_completed: 0,
    join_date: "2025-10-19T00:00:00.000Z",
  },
  {
    id: 11,
    name: "Isabella Garcia",
    email: "isabella.garcia@example.com",
    avatar_url:
      "https://images.pexels.com/photos/3763188/pexels-photo-3763188.jpeg?auto=compress&cs=tinysrgb&w=200",
    timezone: "America/Los_Angeles",
    enrolled_courses: [
      {
        course_id: 1,
        enrolled_at: "2025-09-20T00:00:00.000Z",
        progress_percentage: 88,
        completed_lessons: [1, 2, 3, 4, 5, 6, 7],
        next_lesson_id: 8,
        last_accessed: getDynamicLastAccessed,
      },
    ],
    overall_progress: 88,
    last_activity: new Date().toISOString(),
    courses_completed: 2,
    join_date: "2025-09-15T00:00:00.000Z",
  },
  {
    id: 12,
    name: "Marcus Thompson",
    email: "marcus.thompson@example.com",
    avatar_url:
      "https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=200",
    timezone: "America/New_York",
    enrolled_courses: [
      {
        course_id: 1,
        enrolled_at: "2025-10-02T00:00:00.000Z",
        progress_percentage: 62,
        completed_lessons: [1, 2, 3, 4, 5],
        next_lesson_id: 6,
        last_accessed: "2025-11-03T09:15:00.000Z",
      },
    ],
    overall_progress: 62,
    last_activity: "2025-11-03T09:15:00.000Z",
    courses_completed: 0,
    join_date: "2025-09-28T00:00:00.000Z",
  },
  {
    id: 13,
    name: "Amara Okafor",
    email: "amara.okafor@example.com",
    avatar_url:
      "https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=200",
    timezone: "Europe/London",
    enrolled_courses: [
      {
        course_id: 1,
        enrolled_at: "2025-10-18T00:00:00.000Z",
        progress_percentage: 38,
        completed_lessons: [1, 2, 3],
        next_lesson_id: 4,
        last_accessed: "2025-10-30T14:20:00.000Z",
      },
    ],
    overall_progress: 38,
    last_activity: "2025-10-30T14:20:00.000Z",
    courses_completed: 1,
    join_date: "2025-10-10T00:00:00.000Z",
  },
  {
    id: 14,
    name: "Kenji Yamamoto",
    email: "kenji.yamamoto@example.com",
    avatar_url:
      "https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=200",
    timezone: "Asia/Tokyo",
    enrolled_courses: [
      {
        course_id: 1,
        enrolled_at: "2025-10-26T00:00:00.000Z",
        progress_percentage: 25,
        completed_lessons: [1, 2],
        next_lesson_id: 3,
        last_accessed: "2025-11-04T05:30:00.000Z",
      },
    ],
    overall_progress: 25,
    last_activity: "2025-11-04T05:30:00.000Z",
    courses_completed: 0,
    join_date: "2025-10-25T00:00:00.000Z",
  },
  {
    id: 15,
    name: "Elena Volkov",
    email: "elena.volkov@example.com",
    avatar_url:
      "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=200",
    timezone: "Europe/Paris",
    enrolled_courses: [
      {
        course_id: 1,
        enrolled_at: "2025-09-25T00:00:00.000Z",
        progress_percentage: 100,
        completed_lessons: [1, 2, 3, 4, 5, 6, 7, 8],
        last_accessed: "2025-11-01T18:45:00.000Z",
        lesson_recordings: {
          1: "https://thicket-test.whereby.com/recording/renaissance-arch-intro-rec-001",
          2: "https://thicket-test.whereby.com/recording/brunelleschi-dome-rec-002",
          3: "https://thicket-test.whereby.com/recording/alberti-theory-rec-003",
          4: "https://thicket-test.whereby.com/recording/florence-palaces-rec-004",
          5: "https://thicket-test.whereby.com/recording/high-renaissance-rome-rec-005",
          6: "https://thicket-test.whereby.com/recording/bramante-st-peters-rec-006",
          7: "https://thicket-test.whereby.com/recording/michelangelo-architect-rec-007",
          8: "https://thicket-test.whereby.com/recording/legacy-influence-rec-008",
        },
        lesson_start_times: generateLessonStartTimes([1, 2, 3, 4, 5, 6, 7, 8]),
      },
    ],
    overall_progress: 100,
    last_activity: "2025-11-01T18:45:00.000Z",
    courses_completed: 3,
    join_date: "2025-09-10T00:00:00.000Z",
  },
]

export function getStudentById(id: number): Student | undefined {
  return STUDENTS.find((student) => student.id === id)
}

export function getEnrolledCoursesByStudent(studentId: number): EnrolledCourse[] {
  const student = getStudentById(studentId)
  return student?.enrolled_courses || []
}

export function hasUpcomingLesson(
  enrollment: Pick<EnrolledCourse, "next_lesson_date">
): boolean {
  if (!enrollment.next_lesson_date) return false
  const dateStr = resolveEnrollmentDate(enrollment.next_lesson_date)
  if (!dateStr) return false
  const lessonDate = new Date(dateStr)
  const now = new Date()
  const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  return lessonDate >= now && lessonDate <= oneDayFromNow
}

export function isLessonActive(
  enrollment: Pick<EnrolledCourse, "next_lesson_date">
): boolean {
  if (!enrollment.next_lesson_date) return false
  const dateStr = resolveEnrollmentDate(enrollment.next_lesson_date)
  if (!dateStr) return false
  const lessonDate = new Date(dateStr)
  const now = new Date()
  const oneHourBefore = new Date(lessonDate.getTime() - 60 * 60 * 1000)
  const oneHourAfter = new Date(lessonDate.getTime() + 60 * 60 * 1000)
  return now >= oneHourBefore && now <= oneHourAfter
}

export function enrollStudentInCourse(studentId: number, courseId: number): boolean {
  const student = getStudentById(studentId)
  if (!student) return false

  const isAlreadyEnrolled = student.enrolled_courses.some(
    (e) => e.course_id === courseId
  )
  if (isAlreadyEnrolled) return false

  const now = new Date().toISOString()
  const nextWeek = new Date()
  nextWeek.setDate(nextWeek.getDate() + 7)

  const newEnrollment: EnrolledCourse = {
    course_id: courseId,
    enrolled_at: now,
    progress_percentage: 0,
    completed_lessons: [],
    next_lesson_id: 1,
    next_lesson_date: nextWeek.toISOString(),
    last_accessed: now,
    whereby_room_url: `https://thicket.whereby.com/course-${courseId}-lesson-1`,
  }

  student.enrolled_courses.push(newEnrollment)
  return true
}

export function getStudentsByInstructor(instructorId: number, allCourses: { id: number; instructor: { id: number } }[]): Student[] {
  const instructorCourseIds = allCourses
    .filter(course => course.instructor.id === instructorId)
    .map(course => course.id)

  if (instructorCourseIds.length === 0) return []

  return STUDENTS.filter(student =>
    student.enrolled_courses.some(enrollment =>
      instructorCourseIds.includes(enrollment.course_id)
    )
  )
}

export function getStudentsByCourseId(courseId: number): Student[] {
  return STUDENTS.filter(student =>
    student.enrolled_courses.some(enrollment =>
      enrollment.course_id === courseId
    )
  )
}

export function getEnrolledStudentsCount(courseId: number): number {
  return getStudentsByCourseId(courseId).length
}
