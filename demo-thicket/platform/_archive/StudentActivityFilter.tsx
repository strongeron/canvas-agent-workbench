/**
 * @deprecated Legacy StudentActivityFilter - use @/platform/components/filters/StudentActivityFilter instead
 * Archived on: 2024-12-03
 * Reason: Migrated to UnifiedFilter-based version in filters/ folder
 */
import { Users } from "lucide-react"

import { FilterButton, type FilterOption } from "./FilterButton"

type ActivityFilterValue = "all" | "active" | "inactive"

interface StudentActivityFilterProps {
  value: ActivityFilterValue
  onChange: (value: ActivityFilterValue) => void
}

const activityOptions: FilterOption<ActivityFilterValue>[] = [
  { value: "active", label: "Active Only", icon: Users },
  { value: "inactive", label: "Inactive Only", icon: Users },
]

export function StudentActivityFilter({ value, onChange }: StudentActivityFilterProps) {
  const handleChange = (newValue: ActivityFilterValue | null) => {
    onChange(newValue ?? "all")
  }

  const filterValue = value === "all" ? null : value

  return (
    <FilterButton
      icon={Users}
      label="All Students"
      value={filterValue}
      options={activityOptions}
      onChange={handleChange}
      allLabel="All Students"
      clearLabel="Clear Activity Filter"
    />
  )
}
