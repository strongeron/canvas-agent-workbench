import { BookOpen, LayoutGrid } from "lucide-react"

import { UnifiedFilter } from "./UnifiedFilter"
import type { FilterOption } from "./types"

interface CourseFilterProps {
  value: number | null
  onChange: (courseId: number | null) => void
  courses: { id: number; title: string }[] | { id: number; name: string }[]
  compact?: boolean
}

export function CourseFilter({ value, onChange, courses, compact = false }: CourseFilterProps) {
  if (!courses || courses.length === 0) {
    return null
  }

  const options: FilterOption<number>[] = courses.map((course) => ({
    value: course.id,
    label: "title" in course ? course.title : course.name,
    icon: BookOpen,
  }))

  return (
    <UnifiedFilter
      mode="single"
      showBadge="never"
      displayMode="dropdown"
      icon={LayoutGrid}
      label="All Courses"
      value={value}
      options={options}
      onChange={(val) => onChange(Array.isArray(val) ? val[0] ?? null : val)}
      allLabel="All Courses"
      clearLabel="Clear Course Filter"
      truncateLength={150}
      dropdownWidth="md"
      compact={compact}
    />
  )
}
