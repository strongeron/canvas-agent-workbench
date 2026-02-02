import { X } from "lucide-react"

type CourseState = "draft" | "in_review" | "waitlist" | "published" | "archived"

interface CourseFiltersProps {
  onFilterChange: (filters: CourseState[]) => void
  activeFilters: CourseState[]
}

export function CourseFilters({
  onFilterChange,
  activeFilters,
}: CourseFiltersProps) {

  const filterOptions: { value: CourseState; label: string }[] = [
    { value: "draft", label: "Draft" },
    { value: "in_review", label: "In Review" },
    { value: "waitlist", label: "Waitlist" },
    { value: "published", label: "Published" },
    { value: "archived", label: "Archived" },
  ]

  const toggleFilter = (filter: CourseState) => {
    if (activeFilters.includes(filter)) {
      onFilterChange(activeFilters.filter((f) => f !== filter))
    } else {
      onFilterChange([...activeFilters, filter])
    }
  }

  const clearAllFilters = () => {
    onFilterChange([])
  }

  const hasActiveFilters = activeFilters.length > 0

  return (
    <div className="flex flex-wrap items-center gap-3">
      {filterOptions.map((option) => (
        <button
          key={option.value}
          onClick={() => toggleFilter(option.value)}
          className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
            activeFilters.includes(option.value)
              ? "bg-brand-600 border-brand-600 text-white"
              : "border-default text-muted-foreground hover:border-strong hover:bg-surface-100"
          }`}
        >
          {option.label}
        </button>
      ))}

      {hasActiveFilters && (
        <button
          onClick={clearAllFilters}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm font-medium transition-colors"
        >
          <X className="h-4 w-4" />
          Clear filters
        </button>
      )}
    </div>
  )
}
