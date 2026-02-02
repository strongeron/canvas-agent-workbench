/**
 * @deprecated Legacy CourseFilter - use @/platform/components/filters/CourseFilter instead
 * Archived on: 2024-12-03
 * Reason: Migrated to UnifiedFilter-based version in filters/ folder
 */
import { BookOpen, LayoutGrid } from "lucide-react"

import { FilterButton, type FilterOption } from "./FilterButton"

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
    <FilterButton
      icon={LayoutGrid}
      label="All Courses"
      value={value}
      options={options}
      onChange={onChange}
      allLabel="All Courses"
      clearLabel="Clear Course Filter"
      truncateLength={150}
      compact={compact}
    />
  )
}
