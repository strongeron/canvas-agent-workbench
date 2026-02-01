import { Calendar, Check, ChevronDown, ChevronUp, Copy } from "lucide-react"
import * as LucideIcons from "lucide-react"
import { Component as ReactComponent, useCallback, useEffect, useState } from "react"

import { BrowseSort } from "@/components/browse-sort"
import { EarlyAccessForm } from "@/components/early-access-form"
import { CategoryFilter } from "@/components/category-filter"
import { CourseStatusFilter } from "@/components/course-status-filter"
import { DayOfWeekFilter } from "@/components/day-of-week-filter"
import { Autocomplete } from "@/components/ui/autocomplete"
import { Badge } from "@/components/ui/badge"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { ConfirmationModal } from "@/components/ui/confirmation-modal"
import { CourseSelector } from "@/components/ui/course-selector"
import { DatePicker } from "@/components/ui/date-picker"
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { EmptyState } from "@/components/ui/empty-state"
import { NotFoundState } from "@/components/ui/not-found"
import { PhotoUpload } from "@/components/ui/photo-upload"
import { ErrorBoundary } from "@/components/ui/error-boundary"
import { ImagePlaceholder } from "@/components/ui/image-placeholder"
import { Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import { ModalHeader } from "@/components/ui/modal/ModalHeader"
import { ModalBody } from "@/components/ui/modal/ModalBody"
import { ModalFooter } from "@/components/ui/modal/ModalFooter"
import { ModalWarning } from "@/components/ui/modal/ModalWarning"
import { ModalCourseCard } from "@/components/ui/modal/ModalCourseCard"
import { ModalBulletList } from "@/components/ui/modal/ModalBulletList"
import { ModalInfoSection } from "@/components/ui/modal/ModalInfoSection"
import { ModalSection } from "@/components/ui/modal/ModalSection"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { SearchInput } from "@/components/ui/search-input"
import { TimePicker } from "@/components/ui/time-picker"
import { Toaster } from "@/components/ui/sonner"
import { Tooltip } from "@/components/ui/tooltip"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatusBadge } from "@/components/ui/status-badge"
import { TransactionStatusBadge } from "@/components/ui/transaction-status-badge"
import { UserAvatar } from "@/components/ui/user-avatar"
import { SegmentedProgressBar } from "@/components/ui/segmented-progress-bar"
import { ShowMoreButton } from "@/components/ui/show-more-button"
import { CourseCover } from "@/components/ui/course-cover"
import { LogoMasked } from "@/components/ui/logo-masked"
import { Skeleton } from "@/components/ui/skeleton"
import { CredentialTableInput } from "@/platform/components/CredentialTableInput"
import { EducationEntryInput } from "@/platform/components/EducationEntryInput"
import { AnnouncementPreview } from "@/platform/components/MessageComposer/AnnouncementPreview"
import { CourseSelector as MessageComposerCourseSelector } from "@/platform/components/MessageComposer/CourseSelector"
import { MessageTypeToggle } from "@/platform/components/MessageComposer/MessageTypeToggle"
import { MessageComposerModal } from "@/platform/components/MessageComposerModal"
import { MessageThreadItem } from "@/platform/components/Messages/MessageThreadItem"
import { MessageThreadList } from "@/platform/components/Messages/MessageThreadList"
import { StatsCard } from "@/platform/components/StatsCard"
import { StatsSection } from "@/platform/components/StatsSection"
import { StripeConnectCard } from "@/platform/components/StripeConnectCard"
import { StudentCard } from "@/platform/components/StudentCard"
import { ViewToggle } from "@/platform/components/ViewToggle"
import { UserProfile } from "@/platform/components/UserProfile"
import { EnrolledCourseCard } from "@/platform/components/Student/EnrolledCourseCard"
import { StudentEmptyState } from "@/platform/components/Student/StudentEmptyState"
import { CourseTabs } from "@/platform/components/Student/CourseTabs"
import { CourseTabHome } from "@/platform/components/Student/CourseTabHome"
import { CourseTabSchedule } from "@/platform/components/Student/CourseTabSchedule"
import { CourseTabFiles } from "@/platform/components/Student/CourseTabFiles"
import { CourseTabClassmates } from "@/platform/components/Student/CourseTabClassmates"
import { CourseTabMessageBoard } from "@/platform/components/Student/CourseTabMessageBoard"
import { WherebyEmbed } from "@/platform/components/Student/WherebyEmbed"
import { WherebyRecordingEmbed } from "@/platform/components/Student/WherebyRecordingEmbed"
import { UpcomingLessonsWidget } from "@/platform/components/Student/UpcomingLessonsWidget"
import { StripeCheckoutModal } from "@/platform/components/Student/StripeCheckoutModal"
import { EnrollmentSuccessModal } from "@/platform/components/Student/EnrollmentSuccessModal"
import { StudentCourseTable } from "@/platform/components/Student/StudentCourseTable"
import { UpcomingLessonsWidget as TeacherUpcomingLessonsWidget } from "@/platform/components/Teacher/UpcomingLessonsWidget"
import { RescheduleModal } from "@/platform/components/Teacher/RescheduleModal"
import { UnifiedLessonCard } from "@/platform/components/UnifiedLessonCard"
import { MessageThreadView } from "@/platform/components/Messages/MessageThreadView"
import { TeacherMessageComposerModal } from "@/platform/components/Messages/TeacherMessageComposerModal"
import { StudentMessageComposerModal } from "@/platform/components/Messages/StudentMessageComposerModal"
import { RecipientSelector } from "@/platform/components/MessageComposer/RecipientSelector"
import { MessageForm } from "@/platform/components/MessageComposer/MessageForm"
import { TeacherSidebar } from "@/platform/components/TeacherSidebar"
import { StudentSidebar } from "@/platform/components/StudentSidebar"
import { TeacherLessonCard } from "@/platform/components/Teacher/TeacherLessonCard"
import { TeacherMetricsSidebar } from "@/platform/components/Teacher/TeacherMetricsSidebar"
import { LiveLessonBanner } from "@/platform/components/Teacher/LiveLessonBanner"
import { TeachingExperienceEntryInput } from "@/platform/components/TeachingExperienceEntryInput"
import { FieldInstitutionFieldSet } from "@/platform/components/FieldInstitutionFieldSet"
import { LessonCard } from "@/platform/components/Student/LessonCard"
import { LessonCard as LessonCardNew } from "@/platform/components/Student/LessonCardNew"
import { CourseTabAnnouncementsStudent as StudentCourseTabAnnouncements } from "@/platform/components/Student/CourseTabAnnouncements"
import { CourseTabResources } from "@/platform/components/Student/CourseTabResources"
import { CourseTabAnnouncementsTeacher as TeacherCourseTabAnnouncements } from "@/platform/components/Teacher/CourseTabAnnouncements"
import { CourseTabStudents } from "@/platform/components/Teacher/CourseTabStudents"
import { CourseTabFilesTeacher } from "@/platform/components/Teacher/CourseTabFiles"
import { CourseTabHomeTeacher } from "@/platform/components/Teacher/CourseTabHome"
import { CourseTabScheduleTeacher } from "@/platform/components/Teacher/CourseTabSchedule"
import { AnnouncementComposerModal } from "@/platform/components/AnnouncementComposerModal"
import { ArchiveCourseModal } from "@/platform/components/ArchiveCourseModal"
import { CongratulationsModal } from "@/platform/components/CongratulationsModal"
import { CourseFilters } from "@/platform/components/CourseFilters"
import { DateRangeFilter } from "@/platform/components/DateRangeFilter"
import { NewbieEmptyState } from "@/platform/components/NewbieEmptyState"
import { SortableTable } from "@/platform/components/SortableTable"
import { CourseFilter } from "@/platform/components/filters/CourseFilter"
import { StudentActivityFilter } from "@/platform/components/filters/StudentActivityFilter"
import { UnifiedFilter } from "@/platform/components/filters/UnifiedFilter"
import { PublishConfirmationModal } from "@/platform/components/PublishConfirmationModal"
import { PublishCourseModal } from "@/platform/components/PublishCourseModal"
import { ResetDraftModal } from "@/platform/components/ResetDraftModal"
import { ScheduleCourseFilter } from "@/platform/components/ScheduleCourseFilter"
import { StripeConnectModal } from "@/platform/components/StripeConnectModal"
import { StripeConnectionBanner } from "@/platform/components/StripeConnectionBanner"
import { StripeConnectionCompactBanner } from "@/platform/components/StripeConnectionCompactBanner"
import { StripeSuccessBanner } from "@/platform/components/StripeSuccessBanner"
import { TeacherCourseList } from "@/platform/components/TeacherCourseList"
import { TeacherCourseTable } from "@/platform/components/TeacherCourseTable"
import { StudentTableView } from "@/platform/components/StudentTableView"
import { TodaysSummary } from "@/platform/components/TodaysSummary"
import { CourseInfoForm } from "@/platform/components/CourseBuilder/CourseInfoForm"
import { LearningObjectivesForm } from "@/platform/components/CourseBuilder/LearningObjectivesForm"
import { PricingForm } from "@/platform/components/CourseBuilder/PricingForm"
import { ScheduleForm } from "@/platform/components/CourseBuilder/ScheduleForm"
import { CurriculumBuilder } from "@/platform/components/CourseBuilder/CurriculumBuilder"
import { LessonEditor } from "@/platform/components/CourseBuilder/LessonEditor"
import { AssignmentUploadZone } from "@/platform/components/CourseBuilder/AssignmentUploadZone"
import { CourseReviewConfirmation } from "@/platform/components/CourseBuilder/CourseReviewConfirmation"
import { ImageUploadZone } from "@/platform/components/CourseBuilder/ImageUploadZone"
import { ProgressSteps } from "@/platform/components/CourseBuilder/ProgressSteps"
import { PreviewPanel } from "@/platform/components/CourseBuilder/PreviewPanel"
import { CourseStatusSelector } from "@/platform/components/CourseBuilder/CourseStatusSelector"
import { UnpublishCourseModal } from "@/platform/components/CourseBuilder/UnpublishCourseModal"
import { LessonCTA } from "@/platform/components/CTAs/LessonCTA"
import { CourseCTA } from "@/platform/components/CTAs/CourseCTA"
import { AssignmentCTA } from "@/platform/components/CTAs/AssignmentCTA"
import { BillingCTA } from "@/platform/components/CTAs/BillingCTA"
import { LessonNumberCover } from "@/platform/components/LessonNumberCover"
import { LessonCover } from "@/platform/components/LessonCover"

import type { ComponentVariant } from "../mocks/componentVariants"
import {
  isOverlayComponent,
  isFullWidthComponent,
  isDropdownComponent,
  isWherebyComponent,
  isCoverComponent,
} from "../registry/types"

import { EarlyAccessFormPreview } from "./EarlyAccessFormPreview"
import { InteractivePropsPanel } from "./InteractivePropsPanel"
import { ModalPreview } from "./ModalPreview"
import { SonnerPreview } from "./SonnerPreview"

import { cn } from "@/lib/utils"

type RenderMode =
  | "card"      // Default: full card with header, content area, and footer
  | "minimal"   // Just the component with minimal wrapper (for canvas)
  | "raw"       // Completely raw component, no wrapper at all

interface ComponentRendererProps {
  componentName: string
  importPath: string
  variant: ComponentVariant
  allowOverflow?: boolean
  /** Hide the default header (name, description, status) - useful when parent provides its own header */
  hideHeader?: boolean
  /** Hide the footer (Show Code, Copy buttons) - useful for simplified previews */
  hideFooter?: boolean
  /**
   * Render mode controls how much wrapping is applied:
   * - "card" (default): Full card with header, content area, and footer
   * - "minimal": Just the component with minimal padding, no card styling
   * - "raw": Completely raw component, no wrapper at all
   */
  renderMode?: RenderMode
  /** Background color for the content area (only applies to card and minimal modes) */
  backgroundColor?: "white" | "transparent" | "surface"
  /** External prop overrides (for canvas mode) */
  propsOverride?: Record<string, any>
  /** Callback when interactive props change (for canvas mode) */
  onPropsChange?: (props: Record<string, any>) => void
  /** Show interactive controls panel */
  showInteractivePanel?: boolean
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class ComponentErrorBoundary extends ReactComponent<
  { children: React.ReactNode; componentName: string; variantName: string },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; componentName: string; variantName: string }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(
      `[ComponentRenderer] Error rendering ${this.props.componentName} (${this.props.variantName}):`,
      error,
      errorInfo
    )
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border-2 border-dashed border-error bg-error-surface p-6">
          <div className="mb-2">
            <p className="text-error-text text-sm font-semibold">
              Error rendering {this.props.componentName}
            </p>
            <p className="text-error-text text-xs">
              Variant: {this.props.variantName}
            </p>
          </div>
          {this.state.error && (
            <div className="rounded bg-error/10 p-3">
              <p className="text-error-text font-mono text-xs">
                {this.state.error.message}
              </p>
            </div>
          )}
        </div>
      )
    }

    return this.props.children
  }
}

const componentMap: Record<string, React.ComponentType<any>> = {
  BrowseSort,
  CategoryFilter,
  DayOfWeekFilter,
  CourseStatusFilter,
  Button,
  Input,
  Badge,
  Modal,
  Textarea,
  Select,
  SearchInput,
  Autocomplete,
  DatePicker,
  TimePicker,
  Tooltip,
  ConfirmationModal,
  DropdownMenu,
  Breadcrumb,
  Table,
  EmptyState,
  NotFoundState,
  PhotoUpload,
  StatusBadge,
  UserAvatar,
  ImagePlaceholder,
  SegmentedProgressBar,
  ShowMoreButton,
  CourseSelector,
  ErrorBoundary,
  LogoMasked,
  Toaster,
  'Toaster (Sonner)': Toaster,
  TransactionStatusBadge,
  StatsCard,
  StudentCard,
  ViewToggle,
  UserProfile,
  StripeConnectCard,
  StatsSection,
  EnrolledCourseCard,
  StudentEmptyState,
  CourseTabs,
  CourseTabHome,
  CourseTabSchedule,
  CourseTabFiles,
  CourseTabClassmates,
  CourseTabMessageBoard,
  WherebyEmbed,
  WherebyRecordingEmbed,
  UpcomingLessonsWidget,
  StripeCheckoutModal,
  EnrollmentSuccessModal,
  StudentCourseTable,
  TeacherUpcomingLessonsWidget,
  RescheduleModal,
  UnifiedLessonCard,
  MessageThreadList,
  MessageThreadView,
  MessageThreadItem,
  TeacherMessageComposerModal,
  StudentMessageComposerModal,
  MessageComposerModal,
  MessageTypeToggle,
  'CourseSelector (Composer)': MessageComposerCourseSelector,
  RecipientSelector,
  AnnouncementPreview,
  MessageForm,
  TeacherSidebar,
  StudentSidebar,
  TeacherLessonCard,
  TeacherMetricsSidebar,
  LiveLessonBanner,
  EducationEntryInput,
  CredentialTableInput,
  TeachingExperienceEntryInput,
  FieldInstitutionFieldSet,
  LessonCard,
  LessonCardNew,
  StudentCourseTabAnnouncements,
  CourseTabAnnouncements: StudentCourseTabAnnouncements,
  CourseTabResources,
  TeacherCourseTabAnnouncements,
  CourseTabStudents,
  CourseTabFilesTeacher,
  CourseTabHomeTeacher,
  CourseTabScheduleTeacher,
  AnnouncementComposerModal,
  ArchiveCourseModal,
  CongratulationsModal,
  CourseFilters,
  DateRangeFilter,
  NewbieEmptyState,
  SortableTable,
  UnifiedFilter,
  CourseFilter,
  StudentActivityFilter,
  PublishConfirmationModal,
  PublishCourseModal,
  ResetDraftModal,
  ScheduleCourseFilter,
  StripeConnectModal,
  StripeConnectionBanner,
  StripeConnectionCompactBanner,
  StripeSuccessBanner,
  TeacherCourseList,
  TeacherCourseTable,
  StudentTableView,
  TodaysSummary,
  CourseInfoForm,
  LearningObjectivesForm,
  PricingForm,
  ScheduleForm,
  CurriculumBuilder,
  LessonEditor,
  AssignmentUploadZone,
  CourseReviewConfirmation,
  ImageUploadZone,
  ProgressSteps,
  PreviewPanel,
  CourseStatusSelector,
  UnpublishCourseModal,
  LessonCTA,
  CourseCTA,
  AssignmentCTA,
  BillingCTA,
  CourseCover,
  LessonNumberCover,
  LessonCover,
  Skeleton,
  EarlyAccessForm: EarlyAccessFormPreview,
}

export function ComponentRenderer({
  componentName,
  importPath,
  variant,
  allowOverflow = false,
  hideHeader = false,
  hideFooter = false,
  renderMode = "card",
  backgroundColor = "white",
  propsOverride,
  onPropsChange,
  showInteractivePanel,
}: ComponentRendererProps) {
  const [showCode, setShowCode] = useState(false)
  const [copied, setCopied] = useState(false)

  // Interactive props state management
  const [internalProps, setInternalProps] = useState<Record<string, any>>(variant.props)

  // Sync internal props when variant changes (useState doesn't reinitialize on prop changes)
  useEffect(() => {
    setInternalProps(variant.props)
  }, [variant.props])

  // Determine if we should show interactive controls
  const hasInteractiveSchema = !!variant.interactiveSchema
  const shouldShowPanel = showInteractivePanel ?? (hasInteractiveSchema && renderMode === "card")

  // Use external override if provided, otherwise use internal state
  const currentProps = propsOverride ?? internalProps

  const handlePropChange = useCallback((propName: string, value: any) => {
    const newProps = { ...currentProps, [propName]: value }
    setInternalProps(newProps)
    onPropsChange?.(newProps)
  }, [currentProps, onPropsChange])

  const handleReset = useCallback(() => {
    setInternalProps(variant.props)
    onPropsChange?.(variant.props)
  }, [variant.props, onPropsChange])

  const Component = componentMap[componentName]

  // Check for special preview modes that don't require the component in componentMap
  const hasSonnerPreview = variant.props.__useSonnerPreview === true

  if (!Component && !hasSonnerPreview) {
    return (
      <div className="rounded-xl border-2 border-dashed border-error bg-error-surface p-6">
        <p className="text-error-text text-sm font-medium">
          Component "{componentName}" not found
        </p>
      </div>
    )
  }

  // Special handling for Modal primitives - render them directly
  if (componentName === 'Modal' && variant.category === 'primitive') {
    const primitiveName = variant.name.replace('Modal.', '')
    const exampleCode = (variant as any).__exampleCode
    
    // Render the actual primitive component
    let PrimitiveComponent: React.ComponentType<any> | null = null
    let primitiveProps: any = {}
    
    if (primitiveName === 'Header') {
      PrimitiveComponent = ModalHeader
      primitiveProps = { onClose: () => {}, children: 'Modal Title', subtitle: 'Optional subtitle' }
    } else if (primitiveName === 'Body') {
      PrimitiveComponent = ModalBody
      primitiveProps = { children: <p className="text-muted-foreground">Modal content goes here. Body has default padding (p-6).</p> }
    } else if (primitiveName.startsWith('Footer')) {
      PrimitiveComponent = ModalFooter
      // Determine alignment from variant name
      let align: "left" | "center" | "right" | "between" = 'right'
      let bordered = true
      
      if (primitiveName.includes('Left')) {
        align = 'left'
      } else if (primitiveName.includes('Center')) {
        align = 'center'
      } else if (primitiveName.includes('Between')) {
        align = 'between'
      } else if (primitiveName.includes('Without Border')) {
        bordered = false
      }
      
      if (primitiveName.includes('Between')) {
        primitiveProps = { 
          align, 
          bordered,
          children: (
            <>
              <button className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:bg-surface-100">Back</button>
              <div className="flex gap-3">
                <button className="px-4 py-2 rounded-lg border border-default text-sm">Skip</button>
                <button className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm">Next</button>
              </div>
            </>
          )
        }
      } else if (primitiveName.includes('Center')) {
        primitiveProps = { 
          align, 
          bordered,
          children: (
            <button className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm">Continue</button>
          )
        }
      } else if (primitiveName.includes('Left')) {
        primitiveProps = { 
          align, 
          bordered,
          children: (
            <>
              <button className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm">Go to Dashboard</button>
              <button className="px-4 py-2 rounded-lg border border-default text-sm">View Course</button>
            </>
          )
        }
      } else {
        primitiveProps = { 
          align, 
          bordered,
          children: (
            <>
              <button className="px-4 py-2 rounded-lg border border-default text-sm">Cancel</button>
              <button className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm">Confirm</button>
            </>
          )
        }
      }
    } else if (primitiveName === 'Warning') {
      PrimitiveComponent = ModalWarning
      primitiveProps = { variant: 'info', title: 'Information', children: 'This is an informational message.' }
    } else if (primitiveName === 'CourseCard') {
      PrimitiveComponent = ModalCourseCard
      primitiveProps = { title: 'Introduction to React', subtitle: '8 weeks • Advanced Level', variant: 'card' }
    } else if (primitiveName === 'BulletList') {
      PrimitiveComponent = ModalBulletList
      primitiveProps = { items: ['First item', 'Second item', 'Third item'] }
    } else if (primitiveName === 'InfoSection') {
      PrimitiveComponent = ModalInfoSection
      primitiveProps = { icon: Calendar, title: 'First Lesson', description: 'January 15, 2024' }
    } else if (primitiveName === 'Section') {
      PrimitiveComponent = ModalSection
      primitiveProps = { title: 'Course Details', spacing: 'normal', children: <p className="text-muted-foreground">Section content goes here</p> }
    }
    
    return (
      <div className="rounded-xl border border-default bg-white shadow-sm">
        <div className="border-b border-default bg-surface-50 px-4 py-3">
          <div className="mb-1 flex items-start justify-between">
            <h4 className="text-foreground text-sm font-semibold">
              {variant.name}
            </h4>
            <span className="text-muted rounded-full bg-white px-2 py-0.5 text-xs font-medium">
              {variant.category}
            </span>
          </div>
          <p className="text-muted-foreground text-xs">{variant.description}</p>
        </div>
        <div className="p-6 space-y-4">
          {PrimitiveComponent && (
            <div className="rounded-lg border border-default bg-surface-50 p-4">
              <PrimitiveComponent {...primitiveProps} />
            </div>
          )}
          {exampleCode && (
            <div className="space-y-2">
              <p className="text-muted-foreground text-sm font-medium">
                Code example:
              </p>
              <pre className="overflow-x-auto rounded-lg bg-neutral-900 p-4">
                <code className="text-xs text-neutral-100">
                  {exampleCode}
                </code>
              </pre>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (variant.props.__skipRender) {
    const exampleCode = variant.props.__exampleCode
    return (
      <div className="rounded-xl border border-default bg-white shadow-sm">
        <div className="border-b border-default bg-surface-50 px-4 py-3">
          <div className="mb-1 flex items-start justify-between">
            <h4 className="text-foreground text-sm font-semibold">
              {variant.name}
            </h4>
            <span className="text-muted rounded-full bg-white px-2 py-0.5 text-xs font-medium">
              {variant.category}
            </span>
          </div>
          <p className="text-muted-foreground text-xs">{variant.description}</p>
        </div>
        <div className="p-6">
          {exampleCode ? (
            <div className="space-y-3">
              <p className="text-muted-foreground text-sm">
                Code example:
              </p>
              <pre className="overflow-x-auto rounded-lg bg-neutral-900 p-4">
                <code className="text-xs text-neutral-100">
                  {exampleCode}
                </code>
              </pre>
              <p className="text-muted text-xs">
                This is a pattern/documentation example. Use the code above as a reference.
              </p>
            </div>
          ) : (
          <div className="flex min-h-[120px] items-center justify-center">
            <div className="text-center">
              <p className="text-muted-foreground text-sm">
                This component requires complex children and cannot be demonstrated with simple props.
              </p>
              <p className="text-muted mt-2 text-xs">
                See other components in the gallery for complete examples.
              </p>
            </div>
          </div>
          )}
        </div>
      </div>
    )
  }

  // Use currentProps (which may be overridden) for rendering
  const processedProps = { ...currentProps }
  delete processedProps.__skipRender

  const useSonnerPreview = processedProps.__useSonnerPreview
  delete processedProps.__useSonnerPreview

  // For interactive variants, ensure inputs are not read-only
  if (variant.interactive) {
    delete processedProps.readOnly
  }

  if (typeof processedProps.icon === 'string') {
    const IconComponent = (LucideIcons as any)[processedProps.icon]
    if (IconComponent) {
      processedProps.icon = IconComponent
    }
  }

  if (componentName === 'Select' && typeof processedProps.children === 'string') {
    const optionsHtml = processedProps.children
    const parser = new DOMParser()
    const doc = parser.parseFromString(optionsHtml, 'text/html')
    const options = Array.from(doc.querySelectorAll('option'))
    const optgroups = Array.from(doc.querySelectorAll('optgroup'))

    if (optgroups.length > 0) {
      processedProps.children = (
        <>
          {optgroups.map((optgroup, i) => (
            <optgroup key={i} label={optgroup.label}>
              {Array.from(optgroup.querySelectorAll('option')).map((opt, j) => (
                <option key={j} value={opt.value}>
                  {opt.textContent}
                </option>
              ))}
            </optgroup>
          ))}
        </>
      )
    } else {
      processedProps.children = options.map((opt, i) => (
        <option key={i} value={opt.value}>
          {opt.textContent}
        </option>
      ))
    }
  }

  if (componentName === 'Tooltip' && typeof processedProps.children === 'string') {
    processedProps.children = (
      <Button variant="secondary" size="sm">
        Hover me
      </Button>
    )
  }

  if (componentName === 'DropdownMenu' && typeof processedProps.trigger === 'string') {
    processedProps.trigger = (
      <Button variant="ghost" size="sm">
        Options
      </Button>
    )
    processedProps.children = (
      <>
        <DropdownMenuItem>Edit</DropdownMenuItem>
        <DropdownMenuItem>Duplicate</DropdownMenuItem>
        <DropdownMenuItem variant="danger">Delete</DropdownMenuItem>
      </>
    )
  }

  const codeSnippet = `import { ${componentName} } from "${importPath}"

<${componentName}
${Object.entries(variant.props)
  .map(([key, value]) => {
    if (typeof value === 'string') {
      return `  ${key}="${value}"`
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      return `  ${key}={${value}}`
    } else if (typeof value === 'object') {
      return `  ${key}={${JSON.stringify(value)}}`
    }
    return `  ${key}={...}`
  })
  .join('\n')}
/>`

  const handleCopy = () => {
    navigator.clipboard.writeText(codeSnippet)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Use centralized rendering behavior helpers from registry/types.ts
  const isOverlay = isOverlayComponent(componentName)
  const isWhereby = isWherebyComponent(componentName)
  const isCover = isCoverComponent(componentName)
  const isFullWidth = isFullWidthComponent(componentName)
  const isDropdown = isDropdownComponent(componentName)

  // Helper to render just the component content
  const renderComponentContent = () => {
    if (useSonnerPreview) {
      return (
        <SonnerPreview
          toastType={processedProps.toastType}
          message={processedProps.message}
          description={processedProps.description}
          action={processedProps.action}
          promiseConfig={processedProps.promiseConfig}
          toasts={processedProps.toasts}
        />
      )
    }

    if (isOverlay) {
      return (
        <ModalPreview
          Component={Component}
          props={processedProps}
          title={processedProps.title as string || 'Modal Preview'}
          subtitle={processedProps.subtitle as string | undefined}
          size={processedProps.size as "small" | "medium" | "large" | undefined}
        />
      )
    }

    if (isWhereby) {
      return (
        <div className="w-full max-w-2xl rounded-lg border-2 border-brand-200 bg-surface-50 p-8 text-center">
          <div className="mb-3 flex justify-center">
            <div className="rounded-full bg-brand-100 p-3">
              <svg className="h-8 w-8 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <h3 className="text-foreground mb-2 font-semibold">
            {componentName === 'WherebyEmbed' ? 'Video Room Integration' : 'Recording Player'}
          </h3>
          <p className="text-muted-foreground text-sm">
            This component loads the Whereby video platform dynamically. In production, it displays a fully interactive video room.
          </p>
          <div className="mt-4 text-xs text-muted">
            Room URL: {processedProps.roomUrl || processedProps.recordingUrl}
          </div>
        </div>
      )
    }

    if (isCover && componentName === 'LessonCover' && !processedProps.coverUrl) {
      return (
        <div className="w-full max-w-md">
          <div className="overflow-hidden rounded-lg border border-default bg-white shadow-sm">
            <Component {...processedProps} />
            <div className="border-t border-default bg-white p-4">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-muted text-xs">Lesson {processedProps.lessonNumber || 1}</span>
              </div>
              <h4 className="font-display text-foreground mb-1 text-base font-semibold">
                {processedProps.title || 'Lesson Title'}
              </h4>
              <p className="text-muted-foreground text-sm line-clamp-2">
                Lesson description goes here. This shows how the cover looks in a real lesson card context.
              </p>
            </div>
          </div>
        </div>
      )
    }

    if (isCover && componentName === 'CourseCover' && processedProps.variant === 'card') {
      return (
        <div className="w-full max-w-sm">
          <div className="overflow-hidden rounded-xl border border-default bg-white shadow-sm">
            <Component {...processedProps} />
            <div className="p-4">
              <h4 className="font-display text-foreground mb-2 text-lg font-semibold line-clamp-2">
                {processedProps.title || 'Course Title'}
              </h4>
              <p className="text-muted-foreground text-sm line-clamp-2">
                Course description showing how the cover looks in context.
              </p>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className={isFullWidth ? 'w-full' : ''}>
        <Component {...processedProps} />
      </div>
    )
  }

  // RAW mode: Just the component, no wrapper at all
  if (renderMode === "raw") {
    return (
      <ComponentErrorBoundary componentName={componentName} variantName={variant.name}>
        {renderComponentContent()}
      </ComponentErrorBoundary>
    )
  }

  // MINIMAL mode: Component with optional subtle background, no card chrome
  if (renderMode === "minimal") {
    const bgClass = backgroundColor === "transparent"
      ? ""
      : backgroundColor === "surface"
        ? "bg-surface-50"
        : "bg-white"

    return (
      <ComponentErrorBoundary componentName={componentName} variantName={variant.name}>
        <div className={cn(
          "flex items-center justify-center",
          bgClass,
          allowOverflow ? "overflow-visible" : "overflow-hidden"
        )}>
          {renderComponentContent()}
        </div>
      </ComponentErrorBoundary>
    )
  }

  // CARD mode (default): Full card with header, content, and footer
  return (
    <ComponentErrorBoundary componentName={componentName} variantName={variant.name}>
      <div className={cn(
        "group border border-default shadow-sm transition-all hover:shadow-md",
        backgroundColor === "transparent" ? "bg-transparent" : backgroundColor === "surface" ? "bg-surface-50" : "bg-white",
        hideHeader ? "rounded-b-xl border-t-0" : "rounded-xl",
        allowOverflow ? "overflow-visible" : "overflow-hidden"
      )}>
        {!hideHeader && (
        <div className="border-b border-default bg-surface-50 px-4 py-3">
          <div className="mb-1 flex items-start justify-between">
            <h4 className="text-foreground text-sm font-semibold">
              {variant.name}
            </h4>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  (variant.status ?? "prod") === "prod"
                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                    : "bg-surface-200 text-muted-foreground ring-1 ring-border-default"
                )}
              >
                {(variant.status ?? "prod").toString().toUpperCase()}
              </span>
              <span className="text-muted rounded-full bg-white px-2 py-0.5 text-xs font-medium">
                {variant.category}
              </span>
            </div>
          </div>
          <p className="text-muted-foreground text-xs">{variant.description}</p>
        </div>
        )}

        <div className={cn(
          "p-6",
          allowOverflow && "relative z-10",
          isDropdown && "pb-64"
        )}>
          <div className={cn(
            "flex items-center justify-center",
            isFullWidth ? 'min-h-[200px]' : 'min-h-[120px]',
            allowOverflow && "relative"
          )}>
            {renderComponentContent()}
          </div>
        </div>

        {/* Interactive Props Panel */}
        {shouldShowPanel && variant.interactiveSchema && (
          <InteractivePropsPanel
            schema={variant.interactiveSchema}
            values={currentProps}
            onChange={handlePropChange}
            onReset={handleReset}
          />
        )}

        {!hideFooter && (
      <div className="border-t border-default bg-surface-50 px-4 py-2">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowCode(!showCode)}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs font-medium transition-colors"
          >
            {showCode ? (
              <>
                <ChevronUp className="h-3 w-3" />
                Hide Code
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" />
                Show Code
              </>
            )}
          </button>

          <button
            onClick={handleCopy}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs font-medium transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-success" />
                <span className="text-success">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                Copy
              </>
            )}
          </button>
        </div>

        {showCode && (
          <div className="mt-3 overflow-hidden rounded-lg border border-default bg-neutral-900">
            <pre className="overflow-x-auto p-4">
              <code className="text-xs text-neutral-100">{codeSnippet}</code>
            </pre>
          </div>
        )}
      </div>
        )}
      </div>
    </ComponentErrorBoundary>
  )
}
