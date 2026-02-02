# Unified Filter Architecture

This directory contains a unified, flexible filter system with a single source of truth for all filter styling and behavior.

## Structure

```
filters/
├── README.md                      # This file
├── types.ts                       # Shared TypeScript types
├── filterConstants.ts             # Single source of truth for styling
├── UnifiedFilter.tsx              # Base component with all logic
├── CourseFilter.tsx               # Wrapper for course filtering
├── StudentActivityFilter.tsx      # Wrapper for activity filtering
└── index.ts                       # Clean exports
```

## Key Features

### 1. Single Source of Truth for Styling

**File:** `filterConstants.ts`

All filter styling is defined in one place. Update these constants to change ALL filters at once:

- `FILTER_BUTTON_BASE` - Pill button styles
- `FILTER_DROPDOWN_BASE` - Dropdown container styles
- `FILTER_OPTION_BASE` - Option item styles
- `FILTER_OPTION_SELECTED` - Selected state styles
- `FILTER_OPTION_UNSELECTED` - Unselected state styles
- `FILTER_BADGE_BASE` - Badge counter styles
- `FILTER_CLEAR_BUTTON` - Clear button styles
- `FILTER_DROPDOWN_WIDTHS` - Dropdown width options

**Example:** Change pill button background color for ALL filters:
```typescript
// In filterConstants.ts
export const FILTER_BUTTON_BASE =
  "... bg-surface-100 ..."  // Changed from bg-surface-50
```

Result: All 7+ filters update instantly.

### 2. UnifiedFilter Base Component

**File:** `UnifiedFilter.tsx`

A flexible component that handles both single-select and multi-select filters with configurable behavior.

**Key Props:**

```typescript
mode: "single" | "multi"
showBadge: "never" | "always" | "count"
displayMode: "dropdown" | "button" | "static"
```

**Badge Display Logic:**

- `"never"` - No badge shown (default for single-select)
- `"always"` - Always show badge when active
- `"count"` - Show count badge (hides if count === 1 in multi-select)

**Display Mode Logic:**

- `"dropdown"` - Show selected option label (e.g., "React Course")
- `"button"` - Always show static label (e.g., "Category")
- `"static"` - Show prop label, doesn't change

### 3. Wrapper Components

Thin wrappers that pre-configure UnifiedFilter for specific use cases:

**CourseFilter** - Course selection
```typescript
<UnifiedFilter
  mode="single"
  showBadge="never"
  displayMode="dropdown"
  // ... specific config
/>
```

**StudentActivityFilter** - Activity status
```typescript
<UnifiedFilter
  mode="single"
  showBadge="never"
  displayMode="dropdown"
  // ... specific config
/>
```

## Usage

### Import Filters

```typescript
import { CourseFilter, StudentActivityFilter } from "@/platform/components/filters"
```

### Use in Pages

```typescript
<CourseFilter
  value={selectedCourseId}
  onChange={setSelectedCourseId}
  courses={availableCourses}
/>

<StudentActivityFilter
  value={activityFilter}
  onChange={setActivityFilter}
/>
```

## How to Update All Filters

### Change Button Styles

Edit `filterConstants.ts`:
```typescript
export const FILTER_BUTTON_BASE =
  "... rounded-full ..."  // Change shape, color, etc.
```

### Remove Badge from Single-Select Filters

Already configured! All single-select filters use `showBadge="never"`.

### Add Multi-Select to a Filter

In the wrapper component, change:
```typescript
mode="single"        → mode="multi"
showBadge="never"    → showBadge="count"
value={id}           → value={[id1, id2]}
```

## Badge Display Matrix

| Filter Type | Mode | showBadge | Badge Behavior |
|-------------|------|-----------|----------------|
| Course | single | never | No badge |
| Category | single | never | No badge |
| Date Range | single | never | No badge |
| Activity | single | never | No badge |
| Course Status | multi | always | Shows count |

## Creating New Filters

1. Create wrapper component:
```typescript
import { UnifiedFilter } from "./UnifiedFilter"
import type { FilterOption } from "./types"

export function MyFilter({ value, onChange, options }) {
  return (
    <UnifiedFilter
      mode="single"
      showBadge="never"
      displayMode="dropdown"
      icon={MyIcon}
      label="My Filter"
      value={value}
      options={options}
      onChange={onChange}
    />
  )
}
```

2. Export from `index.ts`:
```typescript
export { MyFilter } from "./MyFilter"
```

3. Use in pages:
```typescript
import { MyFilter } from "@/platform/components/filters"
```

## Updated Standalone Filters

The following filters now use shared constants from `filterConstants.ts`:

- `DateRangeFilter` (`src/platform/components/DateRangeFilter.tsx`)
- `ScheduleCourseFilter` (`src/platform/components/ScheduleCourseFilter.tsx`)
- `CategoryFilter` (`src/components/category-filter.tsx`)
- `CourseStatusFilter` (`src/components/course-status-filter.tsx`)
- `DayOfWeekFilter` (`src/components/day-of-week-filter.tsx`)

These filters maintain their custom logic but use shared styling.

## Benefits

✅ **Single Source of Truth** - Update one file to change all filters
✅ **No Badge "1" for Single-Select** - All single-select filters hide the badge
✅ **Easy Multi-Select** - Change 2 props to enable multi-select
✅ **Type-Safe** - Full TypeScript support with generics
✅ **Consistent UX** - All filters behave the same way
✅ **Maintainable** - Clear component hierarchy
✅ **Flexible** - Configure per filter or change globally

## Examples

### Hide Badge Globally for Single-Select

Already configured! Default behavior in UnifiedFilter:
```typescript
if (mode === "single" && showBadge === "count") return null
```

### Change Dropdown Width for All Filters

Edit `filterConstants.ts`:
```typescript
export const FILTER_DROPDOWN_WIDTHS = {
  md: "md:w-80",  // Changed from md:w-64
}
```

### Add Custom Badge Rendering

```typescript
<UnifiedFilter
  renderCustomBadge={(count) => (
    <span className="custom-badge">{count} items</span>
  )}
/>
```

## Migration Status

✅ CourseFilter - Uses UnifiedFilter
✅ StudentActivityFilter - Uses UnifiedFilter
✅ DateRangeFilter - Uses shared constants
✅ ScheduleCourseFilter - Uses shared constants
✅ CategoryFilter - Uses shared constants
✅ CourseStatusFilter - Uses shared constants (multi-select)
✅ DayOfWeekFilter - Uses shared constants

All filters now have consistent styling and no hardcoded "1" badges for single selections.
