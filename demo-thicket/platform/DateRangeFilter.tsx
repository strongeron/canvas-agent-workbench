import { Calendar, ChevronDown, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import type { DateRangeFilter as DateRangeFilterType } from "./utils/scheduleUtils"
import { getDateRangeLabel } from "./utils/scheduleUtils"

import {
  FILTER_BADGE_BASE,
  FILTER_BUTTON_BASE,
  FILTER_CLEAR_BUTTON,
  FILTER_DROPDOWN_BASE,
  FILTER_OPTION_BASE,
  FILTER_OPTION_SELECTED,
  FILTER_OPTION_UNSELECTED,
} from "./filters/filterConstants"

interface DateRangeFilterProps {
  value: DateRangeFilterType
  onChange: (range: DateRangeFilterType) => void
}

const dateRangeOptions: DateRangeFilterType[] = [
  "today",
  "this_week",
  "next_2_weeks",
  "this_month",
  "all",
]

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedLabel = getDateRangeLabel(value)
  const hasActiveFilter = value !== "all"
  const showBadge = false

  const handleClick = (range: DateRangeFilterType) => {
    onChange(range)
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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={FILTER_BUTTON_BASE}
      >
        <Calendar className="h-4 w-4" strokeWidth={2.5} />
        <span>{selectedLabel}</span>
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
        <div className={`${FILTER_DROPDOWN_BASE} md:w-64`}>
          <div className="max-h-80 overflow-y-auto p-3">
            <div className="space-y-1">
              {dateRangeOptions.map((option) => {
                const isSelected = value === option

                return (
                  <button
                    onClick={() => handleClick(option)}
                    key={option}
                    className={`${FILTER_OPTION_BASE} ${
                      isSelected
                        ? FILTER_OPTION_SELECTED
                        : FILTER_OPTION_UNSELECTED
                    }`}
                  >
                    <Calendar className="h-4 w-4 shrink-0" strokeWidth={2.5} />
                    <span className="text-sm font-medium">
                      {getDateRangeLabel(option)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {hasActiveFilter && (
            <div className="border-default border-t p-3">
              <button
                onClick={() => handleClick("all")}
                className={FILTER_CLEAR_BUTTON}
              >
                <X className="h-4 w-4" />
                Clear Date Filter
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
