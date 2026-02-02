import { Users } from "lucide-react"

import { UnifiedFilter } from "./UnifiedFilter"
import type { FilterOption } from "./types"

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
  const handleChange = (
    newValue: ActivityFilterValue | ActivityFilterValue[] | null
  ) => {
    const normalized = Array.isArray(newValue)
      ? newValue[0] ?? "all"
      : newValue ?? "all"
    onChange(normalized)
  }

  const filterValue = value === "all" ? null : value

  return (
    <UnifiedFilter
      mode="single"
      showBadge="never"
      displayMode="dropdown"
      icon={Users}
      label="All Students"
      value={filterValue}
      options={activityOptions}
      onChange={handleChange}
      allLabel="All Students"
      clearLabel="Clear Activity Filter"
      dropdownWidth="md"
    />
  )
}
