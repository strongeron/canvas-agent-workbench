/**
 * Archive folder for deprecated components
 *
 * These components are preserved for reference and gallery tracking.
 * DO NOT import these in production code - use the active replacements instead.
 *
 * Archived components:
 * - FilterButton → replaced by UnifiedFilter
 * - CourseFilter → replaced by @/platform/components/filters/CourseFilter
 * - StudentActivityFilter → replaced by @/platform/components/filters/StudentActivityFilter
 */

export { FilterButton, type FilterOption } from "./FilterButton"
export { CourseFilter } from "./CourseFilter"
export { StudentActivityFilter } from "./StudentActivityFilter"
