/**
 * Gallery Type Definitions
 *
 * Central type definitions for the component gallery system.
 * These types ensure consistency across variant definitions and registry.
 */

import type { GalleryComponentMeta } from "@thicket/platform/gallery/types"

/**
 * Gallery item kind discriminator
 */
export type GalleryKind = 'component' | 'layout' | 'page-pattern'

/**
 * Component categories - high-level groupings for navigation
 */
export type ComponentCategory = string

/**
 * Layout size for optimal component display in gallery grid
 */
export type ComponentLayoutSize =
  | "small"   // 3-column grid (badges, buttons, inputs)
  | "medium"  // 2-column grid (cards, widgets, modals)
  | "large"   // 1-column grid (tables, lists, tabs)
  | "full"    // Full width stack (filters, dropdowns, sidebars)

/**
 * Variant categories - classification of what the variant demonstrates
 */
export type VariantCategory = string

/**
 * Slot definition for layouts and page patterns
 */
export interface SlotDefinition {
  /** Slot name (e.g., "header", "sidebar", "main") */
  name: string
  /** Whether this slot is required */
  required: boolean
  /** Description of what this slot contains */
  description: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Interactive Props Schema Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Prop control type for interactive gallery
 */
export type PropControlType =
  | 'text'           // Free text input
  | 'textarea'       // Multi-line text
  | 'number'         // Numeric input with min/max
  | 'boolean'        // Toggle switch
  | 'select'         // Dropdown with options
  | 'radio'          // Radio button group
  | 'color'          // Color picker (for tokens)
  | 'icon'           // Icon picker (Lucide icons)
  | 'json'           // JSON editor for objects

/**
 * Schema for a single interactive prop
 */
export interface PropSchema {
  /** Control type to render */
  type: PropControlType
  /** Human-readable label */
  label?: string
  /** Default value */
  defaultValue?: any
  /** For select/radio: available options */
  options?: Array<{ value: any; label: string }>
  /** For number: min value */
  min?: number
  /** For number: max value */
  max?: number
  /** For number: step value */
  step?: number
  /** For text/textarea: placeholder */
  placeholder?: string
  /** Whether this prop can be cleared/undefined */
  optional?: boolean
  /** Description shown on hover */
  description?: string
}

/**
 * Interactive props schema for a component
 */
export interface InteractivePropsSchema {
  [propName: string]: PropSchema
}

// ─────────────────────────────────────────────────────────────────────────────
// Component Variant Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single variant of a component with specific props
 */
export interface ComponentVariant<TProps = any> {
  /** Display name for this variant */
  name: string

  /** Description of what this variant demonstrates */
  description: string

  /** Optional status for this variant (prod/wip/archive) */
  status?: GalleryComponentMeta["status"]

  /** Props to pass to the component when rendering this variant */
  props: TProps | Record<string, any>

  /** Category classification for this variant */
  category: VariantCategory

  /** Optional group for organizing variants (e.g., "student", "teacher") */
  group?: string

  /**
   * Interactive controls schema. When defined, enables live prop editing.
   * Only define for props that make sense to edit interactively.
   */
  interactiveSchema?: InteractivePropsSchema

  /**
   * Whether this variant should be fully interactive (user can type, click, etc.)
   * When true, removes readOnly from inputs and allows full interaction.
   * @default false
   */
  interactive?: boolean

  /** Allow additional metadata for gallery tooling */
  [key: string]: any
}

/**
 * Base metadata shared across all gallery entry types
 */
export interface BaseGalleryMeta {
  /** Unique identifier (e.g., "ui/button", "layouts/student", "page-patterns/course-detail") */
  id: string
  /** Display name */
  name: string
  /** High-level category for navigation/grouping */
  category: ComponentCategory
  /** Optional description */
  description?: string
  /** Optional status (active/wip/archive) */
  status?: 'active' | 'wip' | 'archive'
  /** Optimal layout size for displaying in gallery */
  layoutSize?: ComponentLayoutSize
}

/**
 * A gallery entry representing a component with all its variants
 */
export interface GalleryEntry<TProps = any> extends BaseGalleryMeta {
  /** Kind discriminator - defaults to 'component' for backward compatibility */
  kind?: 'component'
  /** Import path for the component (e.g., "@thicket/components/ui/button") */
  importPath: string
  /** All variants of this component */
  variants: ComponentVariant<TProps>[]
  /** Optional metadata (status/source tracking) */
  meta?: GalleryComponentMeta
  /**
   * Allow component to overflow container (for dropdowns, popovers, tooltips)
   * When true, removes overflow-hidden and adds z-index layering
   * @default false
   */
  allowOverflow?: boolean
}

/**
 * Layout-specific metadata
 */
export interface LayoutMeta {
  /** Kind discriminator - always 'layout' */
  kind: 'layout'
  /** Optional route pattern this layout uses (e.g., "/student/*") */
  routePattern?: string
  /** Layout context type */
  layoutType?: 'public' | 'student' | 'teacher'
  /** Slot definitions for this layout */
  slots?: SlotDefinition[]
}

/**
 * Page pattern-specific metadata
 */
export interface PagePatternMeta {
  /** Kind discriminator - always 'page-pattern' */
  kind: 'page-pattern'
  /** Optional route pattern this pattern uses (e.g., "/courses/:id") */
  routePattern?: string
  /** Pattern type classification */
  patternType?: 'course-detail' | 'dashboard' | 'form' | 'list' | 'profile' | 'browse'
  /** Slot definitions for this pattern */
  slots?: SlotDefinition[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Domain Types (lightweight placeholders for demo data)
// ─────────────────────────────────────────────────────────────────────────────

export interface Category {
  [key: string]: any
}

export interface AuthorProfile {
  [key: string]: any
}

export interface Course {
  [key: string]: any
}

export interface Lesson {
  [key: string]: any
}

export interface LessonWithProgress {
  [key: string]: any
}

export interface Student {
  [key: string]: any
}

export interface Assignment {
  [key: string]: any
}

export interface Message {
  [key: string]: any
}

export interface MessageThread {
  [key: string]: any
}

export interface CourseFile {
  [key: string]: any
}

export interface EnrolledCourseWithDetails {
  [key: string]: any
}

export interface CoursesIndex {
  [key: string]: any
}

/**
 * A gallery entry representing a layout component with all its variants
 */
export interface LayoutEntry<TProps = any> extends BaseGalleryMeta, LayoutMeta {
  /** Import path for the layout component (e.g., "@thicket/platform/layouts/StudentLayout") */
  importPath: string
  /** All variants of this layout */
  variants: ComponentVariant<TProps>[]
  /** Optional metadata (status/source tracking) */
  meta?: GalleryComponentMeta
}

/**
 * A gallery entry representing a page pattern with all its variants
 */
export interface PagePatternEntry<TProps = any> extends BaseGalleryMeta, PagePatternMeta {
  /** Import path for the pattern component (e.g., "@thicket/platform/layouts/patterns/CourseDetailLayout") */
  importPath: string
  /** All variants of this pattern */
  variants: ComponentVariant<TProps>[]
  /** Optional metadata (status/source tracking) */
  meta?: GalleryComponentMeta
}

/**
 * Union type of all gallery entry types
 */
export type AnyGalleryEntry = GalleryEntry | LayoutEntry | PagePatternEntry

/**
 * Legacy type alias for backward compatibility
 * @deprecated Use GalleryEntry instead
 */
export type ComponentEntry = Omit<GalleryEntry, 'id' | 'kind'>

// ─────────────────────────────────────────────────────────────────────────────
// Component Rendering Behavior Configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Rendering behavior classification for components in the gallery.
 * Centralizes the logic that was previously scattered as hardcoded arrays.
 */
export type ComponentRenderBehavior =
  | 'default'       // Standard rendering
  | 'overlay'       // Modal/dialog that needs ModalPreview wrapper
  | 'dropdown'      // Needs extra padding for dropdown expansion
  | 'fullWidth'     // Spans full width of container
  | 'whereby'       // Video embed placeholder
  | 'cover'         // Course/lesson cover with context wrapper
  | 'toast'         // Uses ToastPreview

/**
 * Component rendering configuration.
 * Use this to define special rendering behaviors for components.
 */
export interface ComponentRenderConfig {
  /** Component name as it appears in componentMap */
  name: string
  /** Rendering behavior classification */
  behavior: ComponentRenderBehavior
}

/**
 * Centralized configuration for component rendering behaviors.
 * This replaces the hardcoded arrays in ComponentRenderer.tsx
 */
export const COMPONENT_RENDER_CONFIG: Record<string, ComponentRenderBehavior> = {
  // Overlay components (modals, dialogs)
  Modal: 'overlay',
  ConfirmationModal: 'overlay',
  StripeCheckoutModal: 'overlay',
  EnrollmentSuccessModal: 'overlay',
  RescheduleModal: 'overlay',
  TeacherMessageComposerModal: 'overlay',
  StudentMessageComposerModal: 'overlay',
  MessageComposerModal: 'overlay',
  AnnouncementComposerModal: 'overlay',
  ArchiveCourseModal: 'overlay',
  CongratulationsModal: 'overlay',
  PublishConfirmationModal: 'overlay',
  PublishCourseModal: 'overlay',
  ResetDraftModal: 'overlay',
  StripeConnectModal: 'overlay',
  UnpublishCourseModal: 'overlay',
  EarlyAccessForm: 'overlay',

  // Whereby video embeds
  WherebyEmbed: 'whereby',
  WherebyRecordingEmbed: 'whereby',

  // Cover components
  CourseCover: 'cover',
  LessonCover: 'cover',
  LessonNumberCover: 'cover',

  // Full width components
  CourseTabHome: 'fullWidth',
  CourseTabHomeTeacher: 'fullWidth',
  CourseTabSchedule: 'fullWidth',
  TeacherCourseTabSchedule: 'fullWidth',
  CourseTabFiles: 'fullWidth',
  CourseTabFilesTeacher: 'fullWidth',
  CourseTabClassmates: 'fullWidth',
  CourseTabMessageBoard: 'fullWidth',
  StudentCourseTable: 'fullWidth',
  TeacherCourseTable: 'fullWidth',
  EmptyState: 'fullWidth',
  Table: 'fullWidth',
  MessageThreadList: 'fullWidth',
  MessageThreadView: 'fullWidth',
  CourseTabStudents: 'fullWidth',
  StudentCourseTabAnnouncements: 'fullWidth',
  TeacherCourseTabAnnouncements: 'fullWidth',
  CourseTabResources: 'fullWidth',
  TeacherCourseList: 'fullWidth',
  StudentTableView: 'fullWidth',
  CourseTabs: 'fullWidth',

  // Dropdown components (need extra padding for expansion)
  DropdownMenu: 'dropdown',
  UnifiedFilter: 'dropdown',
  CourseFilter: 'dropdown',
  Select: 'dropdown',
  Autocomplete: 'dropdown',
  DatePicker: 'dropdown',
  TimePicker: 'dropdown',
  CourseSelector: 'dropdown',
  CategoryFilter: 'dropdown',
  InstructorFilter: 'dropdown',
  PriceFilter: 'dropdown',
  DayOfWeekFilter: 'dropdown',
  CourseStatusFilter: 'dropdown',
  StudentActivityFilter: 'dropdown',
  ScheduleCourseFilter: 'dropdown',
  DateRangeFilter: 'dropdown',
}

/**
 * Helper to get rendering behavior for a component
 */
export function getComponentRenderBehavior(componentName: string): ComponentRenderBehavior {
  return COMPONENT_RENDER_CONFIG[componentName] ?? 'default'
}

/**
 * Helper to check if component is overlay
 */
export function isOverlayComponent(componentName: string): boolean {
  return getComponentRenderBehavior(componentName) === 'overlay'
}

/**
 * Helper to check if component is full width
 */
export function isFullWidthComponent(componentName: string): boolean {
  return getComponentRenderBehavior(componentName) === 'fullWidth'
}

/**
 * Helper to check if component is dropdown
 */
export function isDropdownComponent(componentName: string): boolean {
  return getComponentRenderBehavior(componentName) === 'dropdown'
}

/**
 * Helper to check if component is video embed
 */
export function isWherebyComponent(componentName: string): boolean {
  return getComponentRenderBehavior(componentName) === 'whereby'
}

/**
 * Helper to check if component is cover
 */
export function isCoverComponent(componentName: string): boolean {
  return getComponentRenderBehavior(componentName) === 'cover'
}
