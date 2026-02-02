import { BookOpen, ChevronDown, LayoutGrid, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import {
  FILTER_BADGE_BASE,
  FILTER_BUTTON_BASE,
  FILTER_CLEAR_BUTTON,
  FILTER_DROPDOWN_BASE,
  FILTER_OPTION_BASE,
  FILTER_OPTION_SELECTED,
  FILTER_OPTION_UNSELECTED,
} from "./filters/filterConstants"

interface ScheduleCourseFilterProps {
  value: number | null
  onChange: (courseId: number | null) => void
  courseOptions: { id: number; title: string }[]
}

export function ScheduleCourseFilter({
  value,
  onChange,
  courseOptions,
}: ScheduleCourseFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const shouldHide = !courseOptions || courseOptions.length <= 1

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

  if (shouldHide) {
    return null
  }

  const selectedCourse = value
    ? courseOptions.find((course) => course.id === value)
    : null

  const selectedLabel = selectedCourse?.title ?? "All Courses"
  const hasActiveFilter = value !== null
  const showBadge = false

  const handleClick = (courseId?: number) => {
    onChange(courseId ?? null)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={FILTER_BUTTON_BASE}
      >
        <BookOpen className="h-4 w-4" strokeWidth={2.5} />
        <span className="max-w-[150px] truncate sm:max-w-[200px]">
          {selectedLabel}
        </span>
        {showBadge && hasActiveFilter && (
          <span className={FILTER_BADGE_BASE}>
            1
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
        <div className={`${FILTER_DROPDOWN_BASE} md:w-80`}>
          <div className="max-h-80 overflow-y-auto p-3">
            <div className="space-y-1">
              <button
                onClick={() => handleClick()}
                className={`${FILTER_OPTION_BASE} ${
                  !value
                    ? FILTER_OPTION_SELECTED
                    : FILTER_OPTION_UNSELECTED
                }`}
              >
                <LayoutGrid className="h-4 w-4 shrink-0" strokeWidth={2.5} />
                <span className="text-sm font-medium">All Courses</span>
              </button>

              {courseOptions.map((course) => {
                const isSelected = value === course.id

                return (
                  <button
                    onClick={() => handleClick(course.id)}
                    key={course.id}
                    className={`${FILTER_OPTION_BASE} ${
                      isSelected
                        ? FILTER_OPTION_SELECTED
                        : FILTER_OPTION_UNSELECTED
                    }`}
                  >
                    <BookOpen className="h-4 w-4 shrink-0" strokeWidth={2.5} />
                    <span className="text-sm font-medium line-clamp-2">
                      {course.title}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {hasActiveFilter && (
            <div className="border-default border-t p-3">
              <button
                onClick={() => handleClick()}
                className={FILTER_CLEAR_BUTTON}
              >
                <X className="h-4 w-4" />
                Clear Course Filter
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
