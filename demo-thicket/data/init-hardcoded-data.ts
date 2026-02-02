import type { CourseFile } from "../types"

import { getHardcodedCourse } from "./hardcoded-course"
import { getHardcodedCourseFiles } from "./hardcoded-course-files"
import { getHardcodedCourseStudents } from "./hardcoded-students"
import { storage } from "./storage-manager"
import type { Student } from "./students"

const HARDCODED_DATA_KEY = "marketplace_hardcoded_initialized"

export function initializeHardcodedData(): void {
  const alreadyInitialized = storage.get<boolean>(HARDCODED_DATA_KEY)

  if (alreadyInitialized) {
    return
  }

  const hardcodedCourse = getHardcodedCourse()

  const sessionCourses = storage.get<typeof hardcodedCourse[]>("marketplace_courses_session") || []
  const existingCourse = sessionCourses.find(c => c.id === hardcodedCourse.id)

  if (!existingCourse) {
    sessionCourses.push(hardcodedCourse)
    storage.set("marketplace_courses_session", sessionCourses)
  }

  const hardcodedFiles = getHardcodedCourseFiles()
  const courseFiles = storage.get<CourseFile[]>("marketplace_course_files_session") || []

  hardcodedFiles.forEach(file => {
    const existingFile = courseFiles.find(f => f.id === file.id)
    if (!existingFile) {
      courseFiles.push(file)
    }
  })

  storage.set("marketplace_course_files_session", courseFiles)

  const hardcodedStudents = getHardcodedCourseStudents()
  const sessionStudents = storage.get<Record<number, Partial<Student>>>("marketplace_students_session") || {}

  hardcodedStudents.forEach(student => {
    if (!sessionStudents[student.id]) {
      sessionStudents[student.id] = student
    }
  })

  storage.set("marketplace_students_session", sessionStudents)

  storage.set(HARDCODED_DATA_KEY, true)
}

export function resetHardcodedData(): void {
  storage.delete(HARDCODED_DATA_KEY)

  const sessionCourses = storage.get<any[]>("marketplace_courses_session") || []
  const filteredCourses = sessionCourses.filter(c => c.id !== 10001)
  storage.set("marketplace_courses_session", filteredCourses)

  const courseFiles = storage.get<CourseFile[]>("marketplace_course_files_session") || []
  const filteredFiles = courseFiles.filter(f => f.course_id !== 10001)
  storage.set("marketplace_course_files_session", filteredFiles)
}
