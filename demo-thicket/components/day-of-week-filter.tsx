import { router, usePage } from "@inertiajs/react"
import { Calendar, ChevronDown, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import {
  FILTER_BADGE_BASE,
  FILTER_BUTTON_BASE,
  FILTER_CLEAR_BUTTON,
  FILTER_DROPDOWN_BASE,
  FILTER_OPTION_BASE,
  FILTER_OPTION_SELECTED,
  FILTER_OPTION_UNSELECTED,
} from "@thicket/platform/filters/filterConstants"

type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6

const dayOptions: { value: DayOfWeek; label: string }[] = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
]

export function DayOfWeekFilter() {
  const props = usePage<{
    current_day_filter?: DayOfWeek | null
  }>().props

  const current_day_filter = props.current_day_filter ?? null

  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedDay = current_day_filter !== null
    ? dayOptions.find((day) => day.value === current_day_filter)
    : null

  const selectedLabel = selectedDay?.label ?? "All Days"
  const hasActiveFilter = current_day_filter !== null
  const showBadge = false

  const handleClick = (day?: DayOfWeek) => {
    router.replace({
      props: (currentProps) => ({
        ...currentProps,
        current_day_filter: day ?? null,
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
              <button
                onClick={() => handleClick()}
                className={`${FILTER_OPTION_BASE} ${
                  current_day_filter === null
                    ? FILTER_OPTION_SELECTED
                    : FILTER_OPTION_UNSELECTED
                }`}
              >
                <Calendar className="h-4 w-4 shrink-0" strokeWidth={2.5} />
                <span className="text-sm font-medium">All Days</span>
              </button>

              {dayOptions.map((day) => {
                const isSelected = current_day_filter === day.value

                return (
                  <button
                    onClick={() => handleClick(day.value)}
                    key={day.value}
                    className={`${FILTER_OPTION_BASE} ${
                      isSelected
                        ? FILTER_OPTION_SELECTED
                        : FILTER_OPTION_UNSELECTED
                    }`}
                  >
                    <Calendar className="h-4 w-4 shrink-0" strokeWidth={2.5} />
                    <span className="text-sm font-medium">{day.label}</span>
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
                Clear Day Filter
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
