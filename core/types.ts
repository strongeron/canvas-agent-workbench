/**
 * Gallery POC - Core Type Definitions
 *
 * Central type definitions for the component gallery system.
 * These types ensure consistency across variant definitions and registry.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Status Types
// ─────────────────────────────────────────────────────────────────────────────

export type ComponentStatus = "prod" | "wip" | "archive"

export interface GalleryComponentMeta {
  id: string
  sourceId: string
  status: ComponentStatus
}

// ─────────────────────────────────────────────────────────────────────────────
// Gallery Entry Types
// ─────────────────────────────────────────────────────────────────────────────

export type GalleryKind = "component" | "layout" | "page-pattern"

export type ComponentCategory = string

/**
 * Layout size for optimal component display in gallery grid
 */
export type ComponentLayoutSize =
  | "small" // 3-column grid (badges, buttons, inputs)
  | "medium" // 2-column grid (cards, widgets, modals)
  | "large" // 1-column grid (tables, lists, tabs)
  | "full" // Full width stack (filters, dropdowns, sidebars)

export type VariantCategory = string

/**
 * Slot definition for layouts and page patterns
 */
export interface SlotDefinition {
  name: string
  required: boolean
  description: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Interactive Props Schema Types
// ─────────────────────────────────────────────────────────────────────────────

export type PropControlType =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "select"
  | "radio"
  | "color"
  | "icon"
  | "json"

export interface PropSchema {
  type: PropControlType
  label?: string
  defaultValue?: any
  options?: Array<{ value: any; label: string }>
  min?: number
  max?: number
  step?: number
  placeholder?: string
  optional?: boolean
  description?: string
}

export interface InteractivePropsSchema {
  [propName: string]: PropSchema
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Generation Tracking (NEW for POC)
// ─────────────────────────────────────────────────────────────────────────────

export interface AIGenerationMeta {
  /** ISO timestamp when this version was generated */
  generatedAt: string

  /** The prompt/instruction that created this component */
  prompt?: string

  /** AI model used (e.g., "claude-3-opus", "gpt-4") */
  model?: string

  /** Iteration number in the design cycle (1 = first generation) */
  iteration: number

  /** Parent version ID if this is an iteration on a previous version */
  parentVersionId?: string

  /** Human feedback/notes about this version */
  feedback?: string

  /** Tags for categorization */
  tags?: string[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Component Variant Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ComponentVariant<TProps = any> {
  /** Display name for this variant */
  name: string

  /** Description of what this variant demonstrates */
  description: string

  /** Status: prod (in use), wip (development), archive (deprecated) */
  status?: ComponentStatus

  /** Props to pass to the component */
  props: TProps | Record<string, any>

  /** Category classification for this variant */
  category: VariantCategory

  /** Optional group for organizing variants */
  group?: string

  /** Interactive controls schema for live prop editing */
  interactiveSchema?: InteractivePropsSchema

  /** Whether this variant should be fully interactive */
  interactive?: boolean

  /** AI generation metadata (NEW) */
  aiMeta?: AIGenerationMeta

  /** Allow additional metadata */
  [key: string]: any
}

// ─────────────────────────────────────────────────────────────────────────────
// Gallery Entry Types
// ─────────────────────────────────────────────────────────────────────────────

export interface BaseGalleryMeta {
  id: string
  name: string
  category: ComponentCategory
  description?: string
  status?: ComponentStatus
  layoutSize?: ComponentLayoutSize
}

export interface GalleryEntry<TProps = any> extends BaseGalleryMeta {
  kind?: "component"
  importPath: string
  variants: ComponentVariant<TProps>[]
  meta?: GalleryComponentMeta
  allowOverflow?: boolean
}

export interface LayoutEntry<TProps = any> extends BaseGalleryMeta {
  kind: "layout"
  importPath: string
  variants: ComponentVariant<TProps>[]
  meta?: GalleryComponentMeta
  routePattern?: string
  layoutType?: "public" | "student" | "teacher"
  slots?: SlotDefinition[]
}

export interface PagePatternEntry<TProps = any> extends BaseGalleryMeta {
  kind: "page-pattern"
  importPath: string
  variants: ComponentVariant<TProps>[]
  meta?: GalleryComponentMeta
  routePattern?: string
  patternType?: "course-detail" | "dashboard" | "form" | "list" | "profile" | "browse"
  slots?: SlotDefinition[]
}

export type AnyGalleryEntry = GalleryEntry | LayoutEntry | PagePatternEntry

// ─────────────────────────────────────────────────────────────────────────────
// Component Rendering Configuration
// ─────────────────────────────────────────────────────────────────────────────

export type ComponentRenderBehavior =
  | "default"
  | "overlay" // Modal/dialog wrapper
  | "dropdown" // Extra padding for dropdown expansion
  | "fullWidth" // Spans full width
  | "cover" // Image cover with context
  | "toast" // Toast notification preview

// ─────────────────────────────────────────────────────────────────────────────
// Usage Analytics Types (NEW for POC)
// ─────────────────────────────────────────────────────────────────────────────

export interface ComponentUsageEntry {
  file: string
  line?: number
  variantName?: string
  propsUsed: string[]
}

export interface ComponentUsage {
  componentId: string
  usages: ComponentUsageEntry[]
  totalUsages: number
  lastScanned: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Design Token Types
// ─────────────────────────────────────────────────────────────────────────────

export interface DesignToken {
  name: string
  value: string
  cssVar: string
  category: string
  subcategory?: string
  description?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Snapshot Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ComponentSnapshot {
  id: string
  name: string
  description: string
  timestamp: string
  author?: string
  componentData: {
    componentId: string
    variantName: string
    props: Record<string, any>
  }
}
