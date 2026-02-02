export { COURSES } from "./courses"
export { CATEGORIES } from "./categories"
export {
  INSTRUCTORS,
  INSTRUCTOR_SETTINGS,
  calculateProfileCompletion,
} from "./instructors"
export { UPLOADS, addUpload, deleteUpload, getUploadsByCourse } from "./uploads"
export { DRAFTS, deleteDraft, getDraft, saveDraft } from "./drafts"
export {
  addAssignment,
  clearAssignments,
  getAssignments,
  getAssignmentsByLessonId,
  removeAssignment,
  removeAssignmentsByLessonId,
  updateAssignment,
} from "./assignments"
export {
  STUDENTS,
  enrollStudentInCourse,
  getDynamicLastAccessed,
  getDynamicLessonDate,
  getEnrolledCoursesByStudent,
  getEnrolledStudentsCount,
  getStudentById,
  getStudentsByCourseId,
  getStudentsByInstructor,
  hasUpcomingLesson,
  isLessonActive,
  resolveEnrollmentDate,
} from "./students"
export {
  MESSAGES,
  MESSAGE_THREADS,
  getCourseAnnouncements,
  getStudentThreads,
  getUnreadMessageCount,
  getUnreadStudentMessageCount,
} from "./messages"
export {
  EARNINGS_DATA,
  filterEarningsByPeriod,
} from "./earnings"
export { StorageManager, storage } from "./storage-manager"
export {
  deleteSessionCourse,
  saveSessionMessage,
  loadSessionThreads,
  saveSessionThread,
  updateThreadUnreadCount,
  saveSessionTransaction,
  loadSessionTransactions,
  resetAllSessionData,
  exportSessionData,
  importSessionData,
  getNextCourseId,
  getNextStudentId,
  getNextMessageId,
  getNextThreadId,
  loadStripeConnection,
  saveStripeConnection,
  loadInstructorSettings,
  loadSessionCourses,
  loadSessionInstructors,
  loadSessionMessages,
  loadSessionStudents,
  loadUserVisits,
  markCoursesPageVisited,
  resolveStudentEnrollmentDates,
  saveInstructorProfile,
  saveInstructorSettings,
  saveSessionCourse,
  saveStudentEnrollment,
  saveStudentProfile,
  updateStudentProgress,
} from "./persistence"
export { getHardcodedCourse, getHardcodedCourseEnrolledCount } from "./hardcoded-course"
export { getHardcodedCourseStudents } from "./hardcoded-students"
export { getHardcodedCourseFiles } from "./hardcoded-course-files"
export { initializeHardcodedData, resetHardcodedData } from "./init-hardcoded-data"
