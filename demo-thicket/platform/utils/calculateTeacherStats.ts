export function getMockEnrollment(courseId: number) {
  const seed = courseId % 7
  return seed * 7
}

export function isAtCapacity(enrolled: number) {
  return enrolled >= 30
}

export function hasWaitlist(enrolled: number) {
  return enrolled > 30
}

export function getEnrolledCount(enrolled: number) {
  return Math.min(enrolled, 30)
}

export function getWaitlistCount(enrolled: number) {
  return Math.max(0, enrolled - 30)
}

export function canArchiveCourse() {
  return true
}

export function canEditCourse() {
  return true
}

export function canUnpublishCourse() {
  return true
}

