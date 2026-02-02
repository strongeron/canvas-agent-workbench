/**
 * Gallery Layout Metadata - Canonical Source
 *
 * This file is the single source of truth for gallery component layout metadata.
 * Layout metadata controls how components are displayed in the gallery grid.
 *
 * ## Fields
 *
 * ### layoutSize
 * Determines the grid layout for the component gallery display:
 * - `small` - 3-column grid (badges, buttons, inputs, small primitives)
 * - `medium` - 2-column grid (cards, modals, widgets, standard components)
 * - `large` - 1-column grid (tables, tabs, complex layouts, full-width content)
 * - `full` - Vertical stack (filters, forms, sidebars, no grid)
 *
 * ### allowOverflow
 * When `true`, removes `overflow-hidden` constraint and adds z-index layering.
 * Required for components with absolutely positioned overlays:
 * - Dropdowns, select menus, autocomplete
 * - Date pickers, time pickers
 * - Tooltips, popovers
 * - Any component with menu overlays
 *
 * ## Maintenance
 *
 * ## Automation
 *
 * Extract current metadata from gallery files:
 * ```bash
 * npm run gallery:extract-layout-meta
 * ```
 *
 * Validate all galleries have metadata:
 * ```bash
 * npm run gallery:layout:check
 * ```
 */

import type { ComponentLayoutSize } from './types'

export interface LayoutMeta {
  layoutSize: ComponentLayoutSize
  allowOverflow?: boolean
}

export const galleryLayoutMeta: Record<string, LayoutMeta> = {
  'course-builder/assignment-upload-zone': { layoutSize: 'medium' },
  'course-builder/course-info-form': { layoutSize: 'full' },
  'course-builder/course-review-confirmation': { layoutSize: 'large' },
  'course-builder/curriculum-builder': { layoutSize: 'large' },
  'course-builder/learning-objectives-form': { layoutSize: 'full' },
  'course-builder/lesson-editor': { layoutSize: 'large' },
  'course-builder/pricing-form': { layoutSize: 'full' },
  'course-builder/schedule-form': { layoutSize: 'full' },
  'filters/course-filter': { layoutSize: 'full', allowOverflow: true },
  'filters/course-status-filter': { layoutSize: 'full', allowOverflow: true },
  'filters/day-of-week-filter': { layoutSize: 'full', allowOverflow: true },
  'filters/student-activity-filter': { layoutSize: 'full', allowOverflow: true },
  'filters/unified-filter': { layoutSize: 'full', allowOverflow: true },
  'format': { layoutSize: 'medium' },
  'lessons/unified-lesson-card': { layoutSize: 'medium' },
  'messages/message-composer-modal': { layoutSize: 'medium' },
  'messages/message-thread-item': { layoutSize: 'medium' },
  'messages/message-thread-list': { layoutSize: 'large' },
  'messages/message-thread-view': { layoutSize: 'large' },
  'messages/student-message-composer-modal': { layoutSize: 'medium' },
  'messages/teacher-message-composer-modal': { layoutSize: 'medium' },
  'modals/congratulations-modal': { layoutSize: 'medium' },
  'modals/publish-confirmation-modal': { layoutSize: 'medium' },
  'modals/publish-course-modal': { layoutSize: 'medium' },
  'modals/reset-draft-modal': { layoutSize: 'medium' },
  'modals/stripe-connect-modal': { layoutSize: 'medium' },
  'platform/announcement-composer-modal': { layoutSize: 'medium' },
  'platform/archive-course-modal': { layoutSize: 'medium' },
  'platform/course-filters': { layoutSize: 'full' },
  'platform/date-range-filter': { layoutSize: 'full' },
  'platform/education-entry-input': { layoutSize: 'full' },
  'platform/lesson-cover': { layoutSize: 'medium' },
  'platform/lesson-number-cover': { layoutSize: 'small' },
  'platform/newbie-empty-state': { layoutSize: 'large' },
  'platform/schedule-course-filter': { layoutSize: 'full' },
  'platform/sortable-table': { layoutSize: 'large' },
  'platform/stats-card': { layoutSize: 'medium' },
  'platform/stats-section': { layoutSize: 'large' },
  'platform/stripe-connect-card': { layoutSize: 'medium' },
  'platform/stripe-connection-banner': { layoutSize: 'full' },
  'platform/stripe-connection-compact-banner': { layoutSize: 'full' },
  'platform/stripe-success-banner': { layoutSize: 'full' },
  'platform/student-card': { layoutSize: 'medium' },
  'platform/student-sidebar': { layoutSize: 'full' },
  'platform/student-table-view': { layoutSize: 'large' },
  'platform/teacher-course-list': { layoutSize: 'large' },
  'platform/teacher-course-table': { layoutSize: 'large' },
  'platform/teacher-sidebar': { layoutSize: 'full' },
  'platform/teaching-experience-entry-input': { layoutSize: 'full' },
  'platform/todays-summary': { layoutSize: 'large' },
  'platform/user-profile': { layoutSize: 'large' },
  'platform/view-toggle': { layoutSize: 'medium' },
  'public/category-filter': { layoutSize: 'full', allowOverflow: true },
  'public/day-of-week-filter': { layoutSize: 'full', allowOverflow: true },
  'public/instructor-filter': { layoutSize: 'full', allowOverflow: true },
  'public/price-filter': { layoutSize: 'full', allowOverflow: true },
  'student/course-tab-announcements': { layoutSize: 'large' },
  'student/course-tab-classmates': { layoutSize: 'large' },
  'student/course-tab-files': { layoutSize: 'large' },
  'student/course-tab-home': { layoutSize: 'large' },
  'student/course-tab-message-board': { layoutSize: 'large' },
  'student/course-tab-resources': { layoutSize: 'large' },
  'student/course-tab-schedule': { layoutSize: 'large' },
  'student/enrolled-course-card': { layoutSize: 'medium' },
  'student/enrollment-success-modal': { layoutSize: 'medium' },
  'student/lesson-card': { layoutSize: 'medium' },
  'student/lesson-card-new': { layoutSize: 'medium' },
  'student/stripe-checkout-modal': { layoutSize: 'medium' },
  'student/student-course-table': { layoutSize: 'large' },
  'student/student-empty-state': { layoutSize: 'large' },
  'student/upcoming-lessons-widget': { layoutSize: 'medium' },
  'student/whereby-embed': { layoutSize: 'large' },
  'student/whereby-recording-embed': { layoutSize: 'large' },
  'teacher/browse-sort': { layoutSize: 'full' },
  'teacher/course-status-selector': { layoutSize: 'full', allowOverflow: true },
  'teacher/course-tab-announcements': { layoutSize: 'large' },
  'teacher/course-tab-files': { layoutSize: 'large' },
  'teacher/course-tab-home': { layoutSize: 'large' },
  'teacher/course-tab-students': { layoutSize: 'large' },
  'teacher/image-upload-zone': { layoutSize: 'medium' },
  'teacher/live-lesson-banner': { layoutSize: 'large' },
  'teacher/preview-panel': { layoutSize: 'medium' },
  'teacher/progress-steps': { layoutSize: 'full' },
  'teacher/reschedule-modal': { layoutSize: 'medium' },
  'teacher/teacher-lesson-card': { layoutSize: 'medium' },
  'teacher/teacher-metrics-sidebar': { layoutSize: 'full' },
  'teacher/upcoming-lessons-widget': { layoutSize: 'medium' },
  // Domain CTAs
  'ctas/assignment-cta': { layoutSize: 'medium' },
  'ctas/billing-cta': { layoutSize: 'medium' },
  'ctas/course-cta': { layoutSize: 'medium' },
  'ctas/lesson-cta': { layoutSize: 'medium' },
  // Course builder modals
  'course-builder/unpublish-course-modal': { layoutSize: 'medium' },
  // Landing / marketing blocks
  'landing.about-hero': { layoutSize: 'large' },
  'landing.approach-section': { layoutSize: 'large' },
  'landing.course-card-simple': { layoutSize: 'medium' },
  'landing.course-hero': { layoutSize: 'large' },
  'landing.course-preview-card': { layoutSize: 'medium' },
  'landing.course-schedule': { layoutSize: 'large' },
  'landing.how-thicket-works': { layoutSize: 'large' },
  'landing.instructor-sidebar-card': { layoutSize: 'medium' },
  'landing.learning-objectives-list': { layoutSize: 'medium' },
  'landing.legal-content-wrapper': { layoutSize: 'full' },
  'landing.legal-hero': { layoutSize: 'large' },
  'landing.mission-section': { layoutSize: 'full' },
  'landing.platform-outputs': { layoutSize: 'large' },
  'landing.teacher-faq-section': { layoutSize: 'large' },
  'landing.teacher-hero': { layoutSize: 'large' },
  'landing.why-teach-section': { layoutSize: 'large' },
  // Layouts
  'layouts/public': { layoutSize: 'full' },
  'layouts/student': { layoutSize: 'full' },
  'layouts/teacher': { layoutSize: 'full' },
  // Messages & communication components
  'messages/announcement-preview': { layoutSize: 'medium' },
  'messages/course-selector-composer': { layoutSize: 'medium', allowOverflow: true },
  'messages/message-form': { layoutSize: 'medium' },
  'messages/message-type-toggle': { layoutSize: 'small' },
  'messages/messages-header': { layoutSize: 'medium' },
  'messages/mobile-back-button': { layoutSize: 'small' },
  'messages/recipient-selector': { layoutSize: 'medium' },
  // Page patterns
  'page-patterns/browse-page': { layoutSize: 'full' },
  'page-patterns/course-detail': { layoutSize: 'full' },
  'page-patterns/dashboard': { layoutSize: 'full' },
  'page-patterns/form-page': { layoutSize: 'full' },
  'page-patterns/list-page': { layoutSize: 'full' },
  // Platform patterns
  'platform/credential-table-input': { layoutSize: 'large' },
  'platform/field-institution-field-set': { layoutSize: 'full' },
  // Student patterns
  'home': { layoutSize: 'large' },
  'teacher/course-tab-schedule': { layoutSize: 'large' },
  // UI primitives with gallery entries
  'ui/error-boundary': { layoutSize: 'small' },
  'ui/logo-masked': { layoutSize: 'small' },
  '90001': { layoutSize: 'medium', allowOverflow: true },
  'ui/autocomplete': { layoutSize: 'full', allowOverflow: true },
  'ui/badge': { layoutSize: 'small' },
  'ui/breadcrumb': { layoutSize: 'small' },
  'ui/button': { layoutSize: 'small' },
  'ui/confirmation-modal': { layoutSize: 'medium' },
  'ui/course-cover': { layoutSize: 'medium' },
  'ui/course-selector': { layoutSize: 'full', allowOverflow: true },
  'ui/date-picker': { layoutSize: 'full', allowOverflow: true },
  'ui/dropdown-menu': { layoutSize: 'full', allowOverflow: true },
  'ui/empty-state': { layoutSize: 'large' },
  'ui/not-found': { layoutSize: 'medium' },
  'ui/photo-upload': { layoutSize: 'medium' },
  'ui/file-upload': { layoutSize: 'medium' },
  'ui/image-placeholder': { layoutSize: 'small' },
  'ui/input': { layoutSize: 'small' },
  'ui/modal': { layoutSize: 'medium' },
  'ui/search-input': { layoutSize: 'small' },
  'ui/segmented-progress-bar': { layoutSize: 'small' },
  'ui/select': { layoutSize: 'full', allowOverflow: true },
  'ui/show-more-button': { layoutSize: 'small' },
  'ui/status-badge': { layoutSize: 'small' },
  'ui/table': { layoutSize: 'large' },
  'ui/textarea': { layoutSize: 'small' },
  'ui/time-picker': { layoutSize: 'full', allowOverflow: true },
  'ui/tooltip': { layoutSize: 'small', allowOverflow: true },
  'ui/transaction-status-badge': { layoutSize: 'small' },
  'ui/user-avatar': { layoutSize: 'small' },
}
