# ComponentRenderer - Original Thicket Implementation Reference

This document describes the full Thicket implementation of ComponentRenderer for reference.

## Component Map (130+ components)

The original implementation imports and maps 130+ components:

### UI Primitives (40+ components)
- Button, Input, Badge, Modal, Textarea, Select
- SearchInput, Autocomplete, DatePicker, TimePicker
- Tooltip, ConfirmationModal, DropdownMenu, Breadcrumb
- Table, EmptyState, PhotoUpload, StatusBadge, UserAvatar
- ImagePlaceholder, SegmentedProgressBar, ShowMoreButton
- CourseSelector, ErrorBoundary, LogoMasked, Skeleton
- And more...

### Platform Components (50+ components)
- StatsCard, StudentCard, ViewToggle, UserProfile
- StripeConnectCard, StatsSection, EnrolledCourseCard
- StudentEmptyState, CourseTabs, CourseTabHome/Schedule/Files/Classmates
- WherebyEmbed, WherebyRecordingEmbed, UpcomingLessonsWidget
- StripeCheckoutModal, EnrollmentSuccessModal
- And more...

### Messaging (10+ components)
- MessageThreadList, MessageThreadView, MessageThreadItem
- TeacherMessageComposerModal, StudentMessageComposerModal
- MessageComposerModal, MessageTypeToggle, RecipientSelector
- AnnouncementPreview, MessageForm

### Course Builder (15+ components)
- CourseInfoForm, LearningObjectivesForm, PricingForm
- ScheduleForm, CurriculumBuilder, LessonEditor
- AssignmentUploadZone, CourseReviewConfirmation
- ImageUploadZone, ProgressSteps, PreviewPanel
- CourseStatusSelector, UnpublishCourseModal

### Domain CTAs (4 components)
- LessonCTA, CourseCTA, AssignmentCTA, BillingCTA

## Rendering Behaviors

The renderer handles special cases:

### Overlay Components (Modals)
Wrapped in ModalPreview for safe preview:
- Modal, ConfirmationModal, StripeCheckoutModal, EnrollmentSuccessModal
- RescheduleModal, MessageComposerModal, AnnouncementComposerModal
- ArchiveCourseModal, CongratulationsModal, PublishCourseModal
- And more...

### Dropdown Components
Extra padding for dropdown expansion:
- DropdownMenu, Select, Autocomplete, DatePicker, TimePicker
- CourseSelector, CategoryFilter, UnifiedFilter
- And more...

### Full Width Components
Span full container width:
- Table, CourseTabHome, CourseTabSchedule, MessageThreadList
- StudentCourseTable, TeacherCourseList
- And more...

### Special Components
- Whereby embeds: Show placeholder with room URL
- Cover components: Render in context card
- Sonner toasts: Use special preview

## Props Processing

The renderer processes props before passing to components:
1. Icon string names → Lucide icon components
2. Select options HTML → React elements
3. Interactive variants → Remove readOnly
4. Skip render patterns → Show code example only

## Code Generation

Automatically generates import statement and JSX:
\`\`\`tsx
import { Button } from "@/components/ui/button"

<Button
  variant="brand"
  size="md"
  children="Click Me"
/>
\`\`\`

## Interactive Props

When variant has `interactiveSchema`, renders InteractivePropsPanel with:
- Live prop editing
- Schema-based controls
- Reset to defaults
- Copy current values
