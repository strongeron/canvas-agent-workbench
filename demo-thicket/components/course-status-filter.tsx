import { router, usePage } from "@inertiajs/react"
import { ChevronDown, Filter, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import {
  FILTER_BADGE_BASE,
  FILTER_BUTTON_BASE,
  FILTER_CLEAR_BUTTON,
  FILTER_DROPDOWN_BASE,
} from "@thicket/platform/filters/filterConstants"

type CourseState = "draft" | "in_review" | "waitlist" | "published" | "archived"

const statusOptions: { value: CourseState; label: string }[] = [
  { value: "published", label: "Open" },
  { value: "waitlist", label: "Waitlist" },
]

export function CourseStatusFilter() {
  const props = usePage<{
    current_status_filters?: CourseState[]
  }>().props

  const current_status_filters = props.current_status_filters || []

  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const handleToggleStatus = (status: CourseState) => {
    const newFilters = current_status_filters.includes(status)
      ? current_status_filters.filter((s) => s !== status)
      : [...current_status_filters, status]

    router.replace({
      props: (currentProps) => ({
        ...currentProps,
        current_status_filters: newFilters,
      }),
      preserveScroll: true,
      preserveState: true,
    })
  }

  const handleClearAll = () => {
    router.replace({
      props: (currentProps) => ({
        ...currentProps,
        current_status_filters: [],
      }),
      preserveScroll: true,
      preserveState: true,
    })
    setIsOpen(false)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  const hasActiveFilters = current_status_filters.length > 0

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={FILTER_BUTTON_BASE}
      >
        <Filter className="h-4 w-4" strokeWidth={2.5} />
        <span>All</span>
        {hasActiveFilters && (
          <span className={FILTER_BADGE_BASE}>
            {current_status_filters.length}
          </span>
        )}
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          strokeWidth={2.5}
        />
      </button>

      {isOpen && (
        <div className={`${FILTER_DROPDOWN_BASE} md:w-64`}>
          <div className="max-h-80 overflow-y-auto p-3">
            <div className="space-y-2">
              {statusOptions.map((option) => {
                const isSelected = current_status_filters.includes(option.value)

                return (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                      isSelected
                        ? "bg-brand-50 text-brand-700"
                        : "text-foreground hover:bg-surface-100"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleStatus(option.value)}
                      className="accent-brand-600 border-default focus:ring-brand-300 h-4 w-4 rounded transition-colors"
                    />
                    <span className="text-sm font-medium">{option.label}</span>
                  </label>
                )
              })}
            </div>
          </div>

          {hasActiveFilters && (
            <div className="border-default border-t p-3">
              <button
                onClick={handleClearAll}
                className={FILTER_CLEAR_BUTTON}
              >
                <X className="h-4 w-4" />
                Clear Status Filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
