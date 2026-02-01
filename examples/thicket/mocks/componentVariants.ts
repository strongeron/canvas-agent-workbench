// @ts-nocheck

// UI Components
import { congratulationsModalGalleryEntry } from '../configs/modals/congratulations-modal.gallery'
import { publishCourseModalGalleryEntry } from '../configs/modals/publish-course-modal.gallery'
import { announcementComposerModalGalleryEntry } from '../configs/platform/announcement-composer-modal.gallery'
import { courseFiltersGalleryEntry } from '../configs/platform/course-filters.gallery'
import { statsCardGalleryEntry } from '../configs/platform/stats-card.gallery'
import { accordionGalleryEntry } from '../configs/ui/accordion.gallery'
import { autocompleteGalleryEntry } from '../configs/ui/autocomplete.gallery'
import { badgeGalleryEntry } from '../configs/ui/badge.gallery'
import { buttonGalleryEntry } from '../configs/ui/button.gallery'
import { inputGalleryEntry } from '../configs/ui/input.gallery'
import { selectGalleryEntry } from '../configs/ui/select.gallery'
import { textareaGalleryEntry } from '../configs/ui/textarea.gallery'
import { searchInputGalleryEntry } from '../configs/ui/search-input.gallery'
import { modalGalleryEntry } from '../configs/ui/modal.gallery'
import { confirmationModalGalleryEntry } from '../configs/ui/confirmation-modal.gallery'
import { timePickerGalleryEntry } from '../configs/ui/time-picker.gallery'
import { sonnerGalleryEntry } from '../configs/ui/sonner.gallery'
import { tooltipGalleryEntry } from '../configs/ui/tooltip.gallery'
import { dropdownMenuGalleryEntry } from '../configs/ui/dropdown-menu.gallery'
import { courseSelectorGalleryEntry } from '../configs/ui/course-selector.gallery'
import { breadcrumbGalleryEntry } from '../configs/ui/breadcrumb.gallery'
import { datePickerGalleryEntry } from '../configs/ui/date-picker.gallery'
import { tableGalleryEntry } from '../configs/ui/table.gallery'
import { emptyStateGalleryEntry } from '../configs/ui/empty-state.gallery'
import { notFoundGalleryEntry } from '../configs/ui/not-found.gallery'
import { photoUploadGalleryEntry } from '../configs/ui/photo-upload.gallery'
import { statusBadgeGalleryEntry } from '../configs/ui/status-badge.gallery'
import { transactionStatusBadgeGalleryEntry } from '../configs/ui/transaction-status-badge.gallery'
import { userAvatarGalleryEntry } from '../configs/ui/user-avatar.gallery'
import { imagePlaceholderGalleryEntry } from '../configs/ui/image-placeholder.gallery'
import { segmentedProgressBarGalleryEntry } from '../configs/ui/segmented-progress-bar.gallery'
import { showMoreButtonGalleryEntry } from '../configs/ui/show-more-button.gallery'
import { errorBoundaryGalleryEntry } from '../configs/ui/error-boundary.gallery'
import { logoMaskedGalleryEntry } from '../configs/ui/logo-masked.gallery'
import { fileUploadGalleryEntry } from '../configs/ui/file-upload.gallery'
import { courseCoverGalleryEntry } from '../configs/ui/course-cover.gallery'
import { skeletonGalleryEntry } from '../configs/ui/skeleton.gallery'

// Platform Components
import { studentCardGalleryEntry } from '../configs/platform/student-card.gallery'
import { viewToggleGalleryEntry } from '../configs/platform/view-toggle.gallery'
import { userProfileGalleryEntry } from '../configs/platform/user-profile.gallery'
import { stripeConnectCardGalleryEntry } from '../configs/platform/stripe-connect-card.gallery'
import { teacherCourseListGalleryEntry } from '../configs/platform/teacher-course-list.gallery'
import { teacherCourseTableGalleryEntry } from '../configs/platform/teacher-course-table.gallery'
import { studentTableViewGalleryEntry } from '../configs/platform/student-table-view.gallery'
import { newbieEmptyStateGalleryEntry } from '../configs/platform/newbie-empty-state.gallery'
import { stripeConnectionBannerGalleryEntry } from '../configs/platform/stripe-connection-banner.gallery'
import { stripeConnectionCompactBannerGalleryEntry } from '../configs/platform/stripe-connection-compact-banner.gallery'
import { stripeSuccessBannerGalleryEntry } from '../configs/platform/stripe-success-banner.gallery'
import { todaysSummaryGalleryEntry } from '../configs/platform/todays-summary.gallery'
import { statsSectionGalleryEntry } from '../configs/platform/stats-section.gallery'
import { dateRangeFilterGalleryEntry } from '../configs/platform/date-range-filter.gallery'
import { scheduleCourseFilterGalleryEntry } from '../configs/platform/schedule-course-filter.gallery'
import { sortableTableGalleryEntry } from '../configs/platform/sortable-table.gallery'
import { teacherSidebarGalleryEntry } from '../configs/platform/teacher-sidebar.gallery'
import { studentSidebarGalleryEntry } from '../configs/platform/student-sidebar.gallery'
import { educationEntryInputGalleryEntry } from '../configs/platform/education-entry-input.gallery'
import { credentialTableInputGalleryEntry } from '../configs/platform/credential-table-input.gallery'
import { teachingExperienceEntryInputGalleryEntry } from '../configs/platform/teaching-experience-entry-input.gallery'
import { fieldInstitutionFieldSetGalleryEntry } from '../configs/platform/field-institution-field-set.gallery'
import { lessonNumberCoverGalleryEntry } from '../configs/platform/lesson-number-cover.gallery'
import { lessonCoverGalleryEntry } from '../configs/platform/lesson-cover.gallery'
import { teacherHeroGalleryEntry } from '../configs/landing/teacher-hero.gallery'
import { missionSectionGalleryEntry } from '../configs/landing/mission-section.gallery'
import { howThicketWorksGalleryEntry } from '../configs/landing/how-thicket-works.gallery'
import { aboutHeroGalleryEntry } from '../configs/landing/about-hero.gallery'
import { approachSectionGalleryEntry } from '../configs/landing/approach-section.gallery'
import { courseHeroGalleryEntry } from '../configs/landing/course-hero.gallery'
import { coursePreviewCardGalleryEntry } from '../configs/landing/course-preview-card.gallery'
import { courseCardSimpleGalleryEntry } from '../configs/landing/course-card-simple.gallery'
import { courseScheduleGalleryEntry } from '../configs/landing/course-schedule.gallery'
import { instructorSidebarCardGalleryEntry } from '../configs/landing/instructor-sidebar-card.gallery'
import { learningObjectivesListGalleryEntry } from '../configs/landing/learning-objectives-list.gallery'
import { legalContentWrapperGalleryEntry } from '../configs/landing/legal-content-wrapper.gallery'
import { legalHeroGalleryEntry } from '../configs/landing/legal-hero.gallery'
import { platformOutputsGalleryEntry } from '../configs/landing/platform-outputs.gallery'
import { teacherFaqSectionGalleryEntry } from '../configs/landing/teacher-faq-section.gallery'
import { whyTeachSectionGalleryEntry } from '../configs/landing/why-teach-section.gallery'
import { courseTabScheduleTeacherGalleryEntry } from '../configs/teacher/course-tab-schedule.gallery'

// Layout Components
import { publicLayoutGalleryEntry } from '../configs/layouts/public-layout.gallery'
import { studentLayoutGalleryEntry } from '../configs/layouts/student-layout.gallery'
import { teacherLayoutGalleryEntry } from '../configs/layouts/teacher-layout.gallery'

// Page Patterns
import { formPageGalleryEntry } from '../configs/page-patterns/form-page.gallery'
import { courseDetailPageGalleryEntry } from '../configs/page-patterns/course-detail-page.gallery'
import { dashboardPageGalleryEntry } from '../configs/page-patterns/dashboard-page.gallery'
import { listPageGalleryEntry } from '../configs/page-patterns/list-page.gallery'
import { browsePageGalleryEntry } from '../configs/page-patterns/browse-page.gallery'

import type { LayoutEntry, PagePatternEntry } from '../registry/types'

// Modal Components
import { archiveCourseModalGalleryEntry } from '../configs/platform/archive-course-modal.gallery'
import { courseLockModalGalleryEntry } from '../configs/platform/course-lock-modal.gallery'
import { unpublishCourseModalGalleryEntry as platformUnpublishCourseModalGalleryEntry } from '../configs/platform/unpublish-course-modal.gallery'
import { stripeConnectModalGalleryEntry } from '../configs/modals/stripe-connect-modal.gallery'
import { publishConfirmationModalGalleryEntry } from '../configs/modals/publish-confirmation-modal.gallery'
import { resetDraftModalGalleryEntry } from '../configs/modals/reset-draft-modal.gallery'

// Lesson Components
import { unifiedLessonCardGalleryEntry } from '../configs/lessons/unified-lesson-card.gallery'

// Domain CTAs
import { lessonCTAGalleryEntry } from '../configs/ctas/lesson-cta.gallery'
import { courseCTAGalleryEntry } from '../configs/ctas/course-cta.gallery'
import { assignmentCTAGalleryEntry } from '../configs/ctas/assignment-cta.gallery'
import { billingCTAGalleryEntry } from '../configs/ctas/billing-cta.gallery'

// Student Experience Components
import { enrolledCourseCardGalleryEntry } from '../configs/student/enrolled-course-card.gallery'
import { studentEmptyStateGalleryEntry } from '../configs/student/student-empty-state.gallery'
import { courseTabsGalleryEntry } from '../configs/student/course-tabs.gallery'

// Student Course Interaction Components
import { courseTabHomeGalleryEntry } from '../configs/student/course-tab-home.gallery'
import { courseTabScheduleGalleryEntry } from '../configs/student/course-tab-schedule.gallery'
import { courseTabFilesGalleryEntry } from '../configs/student/course-tab-files.gallery'
import { courseTabClassmatesGalleryEntry } from '../configs/student/course-tab-classmates.gallery'
import { courseTabMessageBoardGalleryEntry } from '../configs/student/course-tab-message-board.gallery'
import { wherebyEmbedGalleryEntry } from '../configs/student/whereby-embed.gallery'
import { wherebyRecordingEmbedGalleryEntry } from '../configs/student/whereby-recording-embed.gallery'
import { upcomingLessonsWidgetGalleryEntry } from '../configs/student/upcoming-lessons-widget.gallery'
import { stripeCheckoutModalGalleryEntry } from '../configs/student/stripe-checkout-modal.gallery'
import { enrollmentSuccessModalGalleryEntry } from '../configs/student/enrollment-success-modal.gallery'
import { studentCourseTableGalleryEntry } from '../configs/student/student-course-table.gallery'
import { lessonCardGalleryEntry } from '../configs/student/lesson-card.gallery'
import { lessonCardNewGalleryEntry } from '../configs/student/lesson-card-new.gallery'
import { courseTabAnnouncementsGalleryEntry } from '../configs/student/course-tab-announcements.gallery'
import { courseTabResourcesGalleryEntry } from '../configs/student/course-tab-resources.gallery'

// Teacher Course Management Components
import { progressStepsGalleryEntry } from '../configs/teacher/progress-steps.gallery'
import { imageUploadZoneGalleryEntry } from '../configs/teacher/image-upload-zone.gallery'
import { courseStatusSelectorGalleryEntry } from '../configs/teacher/course-status-selector.gallery'
import { browseSortGalleryEntry } from '../configs/teacher/browse-sort.gallery'
import { previewPanelGalleryEntry } from '../configs/teacher/preview-panel.gallery'

// Teacher Schedule Management Components
import { teacherUpcomingLessonsWidgetGalleryEntry } from '../configs/teacher/upcoming-lessons-widget.gallery'
import { rescheduleModalGalleryEntry } from '../configs/teacher/reschedule-modal.gallery'
import { teacherLessonCardGalleryEntry } from '../configs/teacher/teacher-lesson-card.gallery'
import { teacherMetricsSidebarGalleryEntry } from '../configs/teacher/teacher-metrics-sidebar.gallery'
import { liveLessonBannerGalleryEntry } from '../configs/teacher/live-lesson-banner.gallery'
import { teacherCourseTabAnnouncementsGalleryEntry } from '../configs/teacher/course-tab-announcements.gallery'
import { courseTabStudentsGalleryEntry } from '../configs/teacher/course-tab-students.gallery'
import { teacherCourseTabFilesGalleryEntry } from '../configs/teacher/course-tab-files.gallery'
import { teacherCourseTabHomeGalleryEntry } from '../configs/teacher/course-tab-home.gallery'

// Message/Communication Components
import { messageThreadListGalleryEntry } from '../configs/messages/message-thread-list.gallery'
import { messageThreadViewGalleryEntry } from '../configs/messages/message-thread-view.gallery'
import { messageThreadItemGalleryEntry } from '../configs/messages/message-thread-item.gallery'
import { teacherMessageComposerModalGalleryEntry } from '../configs/messages/teacher-message-composer-modal.gallery'
import { studentMessageComposerModalGalleryEntry } from '../configs/messages/student-message-composer-modal.gallery'
import { messageComposerModalGalleryEntry } from '../configs/messages/message-composer-modal.gallery'
import { messageTypeToggleGalleryEntry } from '../configs/messages/message-type-toggle.gallery'
import { courseSelectorComposerGalleryEntry } from '../configs/messages/course-selector-composer.gallery'
import { recipientSelectorGalleryEntry } from '../configs/messages/recipient-selector.gallery'
import { announcementPreviewGalleryEntry } from '../configs/messages/announcement-preview.gallery'
import { messageFormGalleryEntry } from '../configs/messages/message-form.gallery'
import { messagesHeaderGalleryEntry } from '../configs/messages/messages-header.gallery'
import { mobileBackButtonGalleryEntry } from '../configs/messages/mobile-back-button.gallery'

// CourseBuilder Components
import { courseInfoFormGalleryEntry } from '../configs/course-builder/course-info-form.gallery'
import { learningObjectivesFormGalleryEntry } from '../configs/course-builder/learning-objectives-form.gallery'
import { pricingFormGalleryEntry } from '../configs/course-builder/pricing-form.gallery'
import { scheduleFormGalleryEntry } from '../configs/course-builder/schedule-form.gallery'
import { curriculumBuilderGalleryEntry } from '../configs/course-builder/curriculum-builder.gallery'
import { lessonEditorGalleryEntry } from '../configs/course-builder/lesson-editor.gallery'
import { assignmentUploadZoneGalleryEntry } from '../configs/course-builder/assignment-upload-zone.gallery'
import { courseReviewConfirmationGalleryEntry } from '../configs/course-builder/course-review-confirmation.gallery'
import { unpublishCourseModalGalleryEntry } from '../configs/course-builder/unpublish-course-modal.gallery'

// Public/Marketing Components
import { categoryFilterGalleryEntry } from '../configs/public/category-filter.gallery'
import { instructorFilterGalleryEntry } from '../configs/public/instructor-filter.gallery'
import { priceFilterGalleryEntry } from '../configs/public/price-filter.gallery'
import { dayOfWeekFilterGalleryEntry as publicDayOfWeekFilterGalleryEntry } from '../configs/public/day-of-week-filter.gallery'
import { earlyAccessFormGalleryEntry } from '../configs/public/early-access-form.gallery'

// Filter Components
import { unifiedFilterGalleryEntry } from '../configs/filters/unified-filter.gallery'
import { courseFilterGalleryEntry } from '../configs/filters/course-filter.gallery'
import { studentActivityFilterGalleryEntry } from '../configs/filters/student-activity-filter.gallery'
import { dayOfWeekFilterGalleryEntry } from '../configs/filters/day-of-week-filter.gallery'
import { courseStatusFilterGalleryEntry } from '../configs/filters/course-status-filter.gallery'
import { galleryLayoutMeta } from '../registry/layoutMeta'
import type { ComponentEntry, ComponentVariant } from '../registry/types'

// Re-export types for backward compatibility
export type { ComponentEntry, ComponentVariant }

// Base UI Components (26 components)
export const uiComponents: ComponentEntry[] = [
  buttonGalleryEntry,
  inputGalleryEntry,
  selectGalleryEntry,
  badgeGalleryEntry,
  textareaGalleryEntry,
  searchInputGalleryEntry,
  autocompleteGalleryEntry,
  modalGalleryEntry,
  confirmationModalGalleryEntry,
  tooltipGalleryEntry,
  dropdownMenuGalleryEntry,
  courseSelectorGalleryEntry,
  breadcrumbGalleryEntry,
  datePickerGalleryEntry,
  timePickerGalleryEntry,
  tableGalleryEntry,
  emptyStateGalleryEntry,
  notFoundGalleryEntry,
  photoUploadGalleryEntry,
  statusBadgeGalleryEntry,
  userAvatarGalleryEntry,
  imagePlaceholderGalleryEntry,
  segmentedProgressBarGalleryEntry,
  showMoreButtonGalleryEntry,
  transactionStatusBadgeGalleryEntry,
  errorBoundaryGalleryEntry,
  logoMaskedGalleryEntry,
  sonnerGalleryEntry,
  accordionGalleryEntry,
  fileUploadGalleryEntry,
  skeletonGalleryEntry,
]

// Platform Shared Components (25 components)
export const platformComponents: ComponentEntry[] = [
  statsCardGalleryEntry,
  studentCardGalleryEntry,
  viewToggleGalleryEntry,
  userProfileGalleryEntry,
  stripeConnectCardGalleryEntry,
  lessonNumberCoverGalleryEntry,
  lessonCoverGalleryEntry,
  courseFiltersGalleryEntry,
  teacherCourseListGalleryEntry,
  teacherCourseTableGalleryEntry,
  studentTableViewGalleryEntry,
  newbieEmptyStateGalleryEntry,
  stripeConnectionBannerGalleryEntry,
  stripeConnectionCompactBannerGalleryEntry,
  stripeSuccessBannerGalleryEntry,
  todaysSummaryGalleryEntry,
  statsSectionGalleryEntry,
  dateRangeFilterGalleryEntry,
  scheduleCourseFilterGalleryEntry,
  sortableTableGalleryEntry,
  unifiedFilterGalleryEntry,
  courseFilterGalleryEntry,
  studentActivityFilterGalleryEntry,
  dayOfWeekFilterGalleryEntry,
  courseStatusFilterGalleryEntry,
  teacherSidebarGalleryEntry,
  studentSidebarGalleryEntry,
  educationEntryInputGalleryEntry,
  credentialTableInputGalleryEntry,
  teachingExperienceEntryInputGalleryEntry,
  fieldInstitutionFieldSetGalleryEntry,
  // Landing
  aboutHeroGalleryEntry,
  approachSectionGalleryEntry,
  courseHeroGalleryEntry,
  coursePreviewCardGalleryEntry,
  courseCardSimpleGalleryEntry,
  courseScheduleGalleryEntry,
  instructorSidebarCardGalleryEntry,
  learningObjectivesListGalleryEntry,
  legalContentWrapperGalleryEntry,
  legalHeroGalleryEntry,
  platformOutputsGalleryEntry,
  teacherFaqSectionGalleryEntry,
  whyTeachSectionGalleryEntry,
  teacherHeroGalleryEntry,
  missionSectionGalleryEntry,
  howThicketWorksGalleryEntry,
  courseTabScheduleTeacherGalleryEntry,
]

// Modal Components - All modals grouped together, sorted alphabetically
export const modalComponents: ComponentEntry[] = [
  // Base UI Modals
  modalGalleryEntry,
  confirmationModalGalleryEntry,
  // Course Management Modals
  archiveCourseModalGalleryEntry,
  courseLockModalGalleryEntry,
  publishCourseModalGalleryEntry,
  publishConfirmationModalGalleryEntry,
  resetDraftModalGalleryEntry,
  unpublishCourseModalGalleryEntry,
  platformUnpublishCourseModalGalleryEntry,
  // Student Modals
  enrollmentSuccessModalGalleryEntry,
  stripeCheckoutModalGalleryEntry,
  // Teacher Modals
  congratulationsModalGalleryEntry,
  stripeConnectModalGalleryEntry,
  rescheduleModalGalleryEntry,
  // Communication Modals
  announcementComposerModalGalleryEntry,
  messageComposerModalGalleryEntry,
  studentMessageComposerModalGalleryEntry,
  teacherMessageComposerModalGalleryEntry,
  // Public Modals
  earlyAccessFormGalleryEntry,
]

// Lesson Components (1 component - platform DNA)
export const lessonComponents: ComponentEntry[] = [unifiedLessonCardGalleryEntry]

// Domain CTAs (4 components)
export const domainCTAs: ComponentEntry[] = [
  lessonCTAGalleryEntry,
  courseCTAGalleryEntry,
  assignmentCTAGalleryEntry,
  billingCTAGalleryEntry,
]

// Student Experience Components (3 components)
export const studentExperienceComponents: ComponentEntry[] = [
  enrolledCourseCardGalleryEntry,
  studentEmptyStateGalleryEntry,
  courseTabsGalleryEntry,
]

// Student Course Interaction Components (15 components)
export const studentCourseInteractionComponents: ComponentEntry[] = [
  courseTabHomeGalleryEntry,
  courseTabScheduleGalleryEntry,
  courseTabFilesGalleryEntry,
  courseTabClassmatesGalleryEntry,
  courseTabMessageBoardGalleryEntry,
  wherebyEmbedGalleryEntry,
  wherebyRecordingEmbedGalleryEntry,
  upcomingLessonsWidgetGalleryEntry,
  studentCourseTableGalleryEntry,
  lessonCardGalleryEntry,
  lessonCardNewGalleryEntry,
  courseTabAnnouncementsGalleryEntry,
  courseTabResourcesGalleryEntry,
]

// Teacher Course Management Components (5 components)
export const teacherCourseManagementComponents: ComponentEntry[] = [
  progressStepsGalleryEntry,
  imageUploadZoneGalleryEntry,
  courseStatusSelectorGalleryEntry,
  browseSortGalleryEntry,
  previewPanelGalleryEntry,
]

// Teacher Schedule Management Components (9 components)
export const teacherScheduleComponents: ComponentEntry[] = [
  teacherUpcomingLessonsWidgetGalleryEntry,
  teacherLessonCardGalleryEntry,
  teacherMetricsSidebarGalleryEntry,
  liveLessonBannerGalleryEntry,
  teacherCourseTabAnnouncementsGalleryEntry,
  courseTabStudentsGalleryEntry,
  teacherCourseTabFilesGalleryEntry,
  teacherCourseTabHomeGalleryEntry,
]

// Communication Components (11 components)
export const communicationComponents: ComponentEntry[] = [
  messageThreadListGalleryEntry,
  messageThreadViewGalleryEntry,
  messageThreadItemGalleryEntry,
  messageTypeToggleGalleryEntry,
  courseSelectorComposerGalleryEntry,
  recipientSelectorGalleryEntry,
  announcementPreviewGalleryEntry,
  messageFormGalleryEntry,
   messagesHeaderGalleryEntry,
   mobileBackButtonGalleryEntry,
]

// CourseBuilder Components (9 components)
export const courseBuilderComponents: ComponentEntry[] = [
  courseInfoFormGalleryEntry,
  learningObjectivesFormGalleryEntry,
  pricingFormGalleryEntry,
  scheduleFormGalleryEntry,
  curriculumBuilderGalleryEntry,
  lessonEditorGalleryEntry,
  assignmentUploadZoneGalleryEntry,
  courseReviewConfirmationGalleryEntry,
]

// Public/Marketing Components (5 components)
export const publicComponents: ComponentEntry[] = [
  categoryFilterGalleryEntry,
  instructorFilterGalleryEntry,
  priceFilterGalleryEntry,
  publicDayOfWeekFilterGalleryEntry,
  earlyAccessFormGalleryEntry,
]

// Aggregated component list before metadata merge
const rawComponents: ComponentEntry[] = [
  ...uiComponents,
  ...platformComponents,
  ...modalComponents,
  ...lessonComponents,
  ...domainCTAs,
  ...studentExperienceComponents,
  ...studentCourseInteractionComponents,
  ...teacherCourseManagementComponents,
  ...teacherScheduleComponents,
  ...communicationComponents,
  ...courseBuilderComponents,
  ...publicComponents,
]

/**
 * Apply centralized layout metadata to all components.
 *
 * The galleryLayoutMeta from layoutMeta.ts is the single source of truth.
 * Central metadata overrides inline values for consistency.
 * Inline values in .gallery.ts files act as fallback if metadata is missing.
 */
export const allComponents: ComponentEntry[] = rawComponents.map((entry) => {
  // Only GalleryEntry type has 'id' field
  if (!('id' in entry)) {
    // Legacy ComponentEntry without id - skip merge
    return entry
  }

  const meta = galleryLayoutMeta[entry.id]

  if (!meta) {
    // No central metadata, keep component as-is (uses inline fallback)
    return entry
  }

  // Central metadata takes precedence
  return {
    ...entry,
    layoutSize: meta.layoutSize ?? entry.layoutSize,
    allowOverflow: typeof meta.allowOverflow === 'boolean'
      ? meta.allowOverflow
      : entry.allowOverflow,
  }
})

// Helper functions for component lookup
export function getComponentByName(name: string): ComponentEntry | undefined {
  return allComponents.find((c) => c.name === name)
}

export function getComponentById(componentId: string): ComponentEntry | null {
  const component = allComponents.find((c) => 'id' in c && c.id === componentId)
  return component || null
}

export function searchComponents(query: string): ComponentEntry[] {
  const lowerQuery = query.toLowerCase()
  return allComponents.filter(
    (component) =>
      component.name.toLowerCase().includes(lowerQuery) ||
      component.category.toLowerCase().includes(lowerQuery) ||
      component.variants.some(
        (v) =>
          v.name.toLowerCase().includes(lowerQuery) ||
          v.description.toLowerCase().includes(lowerQuery)
      )
  )
}

// Category-based organization (for gallery UI)
export const componentsByCategory: Record<string, ComponentEntry[]> = {
  'Base UI': uiComponents,
  'Platform Shared': platformComponents,
  'Modals & Overlays': modalComponents,
  'Unified Lesson Card': lessonComponents,
  'Domain CTAs': domainCTAs,
  'Student Experience': studentExperienceComponents,
  'Student Course Interaction': studentCourseInteractionComponents,
  'Teacher Course Management': teacherCourseManagementComponents,
  'Teacher Schedule Management': teacherScheduleComponents,
  Communication: communicationComponents,
  'Course Management': courseBuilderComponents,
  'Public/Marketing': publicComponents,
}

// Layout Components Registry
export const allLayouts: LayoutEntry[] = [
  publicLayoutGalleryEntry,
  studentLayoutGalleryEntry,
  teacherLayoutGalleryEntry,
]

// Page Patterns Registry
export const allPagePatterns: PagePatternEntry[] = [
  formPageGalleryEntry,
  courseDetailPageGalleryEntry,
  dashboardPageGalleryEntry,
  listPageGalleryEntry,
  browsePageGalleryEntry,
]

// Helper functions for layouts
export function getLayoutById(layoutId: string): LayoutEntry | null {
  const layout = allLayouts.find((l) => l.id === layoutId)
  return layout || null
}

// Helper functions for page patterns
export function getPagePatternById(patternId: string): PagePatternEntry | null {
  const pattern = allPagePatterns.find((p) => p.id === patternId)
  return pattern || null
}

// Combined helper for any gallery entry (component, layout, or pattern)
export function getGalleryEntryById(entryId: string): ComponentEntry | LayoutEntry | PagePatternEntry | null {
  const component = getComponentById(entryId)
  if (component) return component
  
  const layout = getLayoutById(entryId)
  if (layout) return layout
  
  const pattern = getPagePatternById(entryId)
  if (pattern) return pattern
  
  return null
}

// Category-based organization for layouts (for gallery UI)
export const layoutsByCategory: Record<string, LayoutEntry[]> = {
  'Layouts': allLayouts,
}

// Category-based organization for page patterns (for gallery UI)
export const patternsByCategory: Record<string, PagePatternEntry[]> = {
  'Page Patterns': allPagePatterns,
}

// Helper to get layouts by context
export function getLayoutsByContext(context: 'all' | 'public' | 'student' | 'teacher'): LayoutEntry[] {
  if (context === 'all') return allLayouts
  return allLayouts.filter((layout) => layout.layoutType === context)
}

// Helper to get patterns by context
export function getPatternsByContext(context: 'all' | 'public' | 'student' | 'teacher' | 'global'): PagePatternEntry[] {
  if (context === 'all') return allPagePatterns
  // Patterns are typically global, but we can filter by patternType if needed
  if (context === 'global') return allPagePatterns
  return allPagePatterns.filter((pattern) => {
    // Map context to patternType if needed
    return true // For now, all patterns are global
  })
}
// @ts-nocheck
