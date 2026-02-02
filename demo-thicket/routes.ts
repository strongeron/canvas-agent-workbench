export function root_path(options?: { anchor?: string }) {
  return options?.anchor ? `/#${options.anchor}` : "/"
}

export function about_us_path() {
  return "/about"
}

export function contacts_path() {
  return "/contact"
}

export function teach_path() {
  return "/teach"
}

export function teacher_application_path() {
  return "/teach/apply"
}

export function privacy_path() {
  return "/privacy"
}

export function terms_path() {
  return "/terms"
}

export function course_path(id?: number | string) {
  return id ? `/courses/${id}` : "/courses"
}

export function student_course_path(id: number | string) {
  return `/student/courses/${id}`
}

export function student_lesson_room_path(courseId: number | string, lessonId: number | string) {
  return `/student/courses/${courseId}/lessons/${lessonId}`
}

export function teacher_course_path(id: number | string) {
  return `/teacher/courses/${id}`
}

export function teacher_profile_path(id: number | string) {
  return `/teachers/${id}`
}

export function early_access_signups_path() {
  return "/early-access"
}

