import { Calendar, ChevronLeft, ChevronRight } from "lucide-react"
import type { ChangeEvent, FocusEvent, KeyboardEvent } from "react"
import { forwardRef, useEffect, useRef, useState } from "react"

interface DatePickerProps {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  minDate?: string
  disabled?: boolean
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

const MONTH_NAMES_SHORT = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
]

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function formatDateForDisplay(dateString: string): string {
  if (!dateString) return ""
  const date = new Date(dateString + "T00:00:00")
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatDateForEditing(dateString: string): string {
  if (!dateString) return ""
  const [year, month, day] = dateString.split("-")
  return `${month}/${day}/${year}`
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

function formatDateToLocalString(
  year: number,
  month: number,
  day: number,
): string {
  const yyyy = year.toString()
  const mm = (month + 1).toString().padStart(2, "0")
  const dd = day.toString().padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

function parseDateInput(input: string): string | null {
  if (!input?.trim()) return null

  const trimmed = input.trim()

  const patterns = [
    /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/,
    /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2})$/,
    /^(\d{1,2})[/\-.](\d{1,2})$/,
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
  ]

  for (const pattern of patterns) {
    const match = trimmed.match(pattern)
    if (match) {
      let month: number, day: number, year: number

      if (pattern === patterns[3]) {
        year = parseInt(match[1])
        month = parseInt(match[2])
        day = parseInt(match[3])
      } else {
        month = parseInt(match[1])
        day = parseInt(match[2])

        if (match[3]) {
          year = parseInt(match[3])
          if (year < 100) {
            year += 2000
          }
        } else {
          year = new Date().getFullYear()
        }
      }

      if (month < 1 || month > 12) return null
      if (day < 1 || day > 31) return null

      const daysInMonth = getDaysInMonth(year, month - 1)
      if (day > daysInMonth) return null

      return formatDateToLocalString(year, month - 1, day)
    }
  }

  const monthNamePattern = /^([a-z]{3,})\s+(\d{1,2}),?\s+(\d{4})$/i
  const monthNameMatch = monthNamePattern.exec(trimmed)
  if (monthNameMatch) {
    const monthName = monthNameMatch[1].toLowerCase()
    const day = parseInt(monthNameMatch[2])
    const year = parseInt(monthNameMatch[3])

    const monthIndex = MONTH_NAMES_SHORT.findIndex((m) =>
      monthName.startsWith(m),
    )
    if (monthIndex === -1) return null

    if (day < 1 || day > 31) return null
    const daysInMonth = getDaysInMonth(year, monthIndex)
    if (day > daysInMonth) return null

    return formatDateToLocalString(year, monthIndex, day)
  }

  const dayFirstPattern = /^(\d{1,2})\s+([a-z]{3,})\s+(\d{4})$/i
  const dayFirstMatch = dayFirstPattern.exec(trimmed)
  if (dayFirstMatch) {
    const day = parseInt(dayFirstMatch[1])
    const monthName = dayFirstMatch[2].toLowerCase()
    const year = parseInt(dayFirstMatch[3])

    const monthIndex = MONTH_NAMES_SHORT.findIndex((m) =>
      monthName.startsWith(m),
    )
    if (monthIndex === -1) return null

    if (day < 1 || day > 31) return null
    const daysInMonth = getDaysInMonth(year, monthIndex)
    if (day > daysInMonth) return null

    return formatDateToLocalString(year, monthIndex, day)
  }

  return null
}

function validateDate(
  dateString: string | null,
  minDate?: string,
): { valid: boolean; error?: string } {
  if (!dateString) {
    return { valid: false, error: "Please enter a valid date" }
  }

  const date = new Date(dateString + "T00:00:00")
  if (isNaN(date.getTime())) {
    return { valid: false, error: "Invalid date format" }
  }

  if (minDate) {
    const minDateObj = new Date(minDate + "T00:00:00")
    if (date < minDateObj) {
      return {
        valid: false,
        error: `Date must be on or after ${formatDateForDisplay(minDate)}`,
      }
    }
  }

  return { valid: true }
}

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  ({ label, value, onChange, error, minDate, disabled }, ref) => {
    const [isOpen, setIsOpen] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [inputValue, setInputValue] = useState("")
    const [validationError, setValidationError] = useState<string | undefined>(
      error,
    )
    const dropdownRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    const today = new Date()
    const todayString = formatDateToLocalString(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    )
    const minDateObj = minDate ? new Date(minDate + "T00:00:00") : today

    const selectedDate = value ? new Date(value + "T00:00:00") : null

    const getInitialViewDate = () => {
      if (selectedDate && selectedDate >= today) {
        return {
          year: selectedDate.getFullYear(),
          month: selectedDate.getMonth(),
        }
      }
      return { year: today.getFullYear(), month: today.getMonth() }
    }

    const initialView = getInitialViewDate()
    const [viewYear, setViewYear] = useState(initialView.year)
    const [viewMonth, setViewMonth] = useState(initialView.month)

    useEffect(() => {
      setValidationError(error)
    }, [error])

    useEffect(() => {
      if (!isEditing) {
        setInputValue(value ? formatDateForDisplay(value) : "")
      }
    }, [value, isEditing])

    const hasError = !!validationError

    const borderClass = hasError
      ? "border-error"
      : isOpen
        ? "border-brand-300"
        : "border-default hover:border-strong"

    const labelColor = "text-muted-foreground"
    const bgColor = "bg-white"
    const textColor = "text-foreground"
    const iconColor = "text-muted-foreground"
    const disabledColor = "bg-surface-100 text-disabled cursor-not-allowed"
    const messageColor = "text-error"

    useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false)
        }
      }

      if (isOpen) {
        document.addEventListener("mousedown", handleClickOutside)
        return () =>
          document.removeEventListener("mousedown", handleClickOutside)
      }
    }, [isOpen])

    const daysInMonth = getDaysInMonth(viewYear, viewMonth)
    const firstDayOfMonth = getFirstDayOfMonth(viewYear, viewMonth)
    const daysInPrevMonth = getDaysInMonth(viewYear, viewMonth - 1)

    const calendarDays: {
      date: Date
      isCurrentMonth: boolean
      dateString: string
    }[] = []

    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1
      const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear
      const day = daysInPrevMonth - i
      const date = new Date(prevYear, prevMonth, day)
      const dateString = formatDateToLocalString(prevYear, prevMonth, day)
      calendarDays.push({
        date,
        isCurrentMonth: false,
        dateString,
      })
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(viewYear, viewMonth, day)
      const dateString = formatDateToLocalString(viewYear, viewMonth, day)
      calendarDays.push({
        date,
        isCurrentMonth: true,
        dateString,
      })
    }

    const remainingDays = 42 - calendarDays.length
    for (let day = 1; day <= remainingDays; day++) {
      const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1
      const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear
      const date = new Date(nextYear, nextMonth, day)
      const dateString = formatDateToLocalString(nextYear, nextMonth, day)
      calendarDays.push({
        date,
        isCurrentMonth: false,
        dateString,
      })
    }

    const handlePrevMonth = () => {
      const targetMonth = viewMonth === 0 ? 11 : viewMonth - 1
      const targetYear = viewMonth === 0 ? viewYear - 1 : viewYear

      const targetDate = new Date(targetYear, targetMonth, 1)
      const minAllowedDate = new Date(today.getFullYear(), today.getMonth(), 1)

      if (targetDate >= minAllowedDate) {
        setViewMonth(targetMonth)
        setViewYear(targetYear)
      }
    }

    const handleNextMonth = () => {
      if (viewMonth === 11) {
        setViewMonth(0)
        setViewYear(viewYear + 1)
      } else {
        setViewMonth(viewMonth + 1)
      }
    }

    const isPrevMonthDisabled = () => {
      const targetMonth = viewMonth === 0 ? 11 : viewMonth - 1
      const targetYear = viewMonth === 0 ? viewYear - 1 : viewYear

      const targetDate = new Date(targetYear, targetMonth, 1)
      const minAllowedDate = new Date(today.getFullYear(), today.getMonth(), 1)

      return targetDate < minAllowedDate
    }

    const handleDateSelect = (dateString: string) => {
      const selectedDate = new Date(dateString + "T00:00:00")
      if (minDateObj && selectedDate < minDateObj) return
      onChange(dateString)
      setValidationError(undefined)
      setIsOpen(false)
      setIsEditing(false)
    }

    const isDateDisabled = (dateString: string): boolean => {
      const checkDate = new Date(dateString + "T00:00:00")
      return checkDate < minDateObj
    }

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value)
      setValidationError(undefined)
    }

    const handleInputFocus = (e: FocusEvent<HTMLInputElement>) => {
      setIsEditing(true)
      if (value) {
        setInputValue(formatDateForEditing(value))
      }
      e.target.select()
    }

    const handleInputBlur = () => {
      if (!inputValue.trim()) {
        setIsEditing(false)
        setInputValue("")
        onChange("")
        setValidationError(undefined)
        return
      }

      const parsedDate = parseDateInput(inputValue)
      const validation = validateDate(parsedDate, minDate)

      if (validation.valid && parsedDate) {
        onChange(parsedDate)
        setValidationError(undefined)
        setIsEditing(false)
      } else {
        setValidationError(validation.error)
        setInputValue(value ? formatDateForDisplay(value) : "")
        setIsEditing(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault()
        inputRef.current?.blur()
      } else if (e.key === "Escape") {
        e.preventDefault()
        setInputValue(value ? formatDateForDisplay(value) : "")
        setValidationError(error)
        setIsEditing(false)
        setIsOpen(false)
        inputRef.current?.blur()
      } else if (e.key === "ArrowDown" && !isOpen) {
        e.preventDefault()
        setIsOpen(true)
      }
    }

    const handleIconClick = (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!disabled) {
        setIsOpen(!isOpen)
        if (!isOpen) {
          inputRef.current?.focus()
        }
      }
    }

    return (
      <div className="w-full" ref={dropdownRef}>
        <label className={`mb-2 block text-sm font-medium ${labelColor}`}>
          {label}
        </label>
        <div className="relative">
          <input
            ref={(node) => {
              if (typeof ref === "function") {
                ref(node)
              } else if (ref) {
                ref.current = node
              }
              if (node) {
                inputRef.current = node
              }
            }}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder="Select date"
            className={`focus:ring-brand-300 focus:border-brand-300 ${textColor} placeholder:text-muted h-11 w-full appearance-none rounded-lg border text-base ${borderClass} ${disabled ? disabledColor : bgColor} px-4 py-3 pr-10 transition-all duration-200 focus:ring-1 focus:outline-none`}
            aria-label={label}
            aria-expanded={isOpen}
            aria-invalid={hasError}
            role="combobox"
          />
          <button
            type="button"
            onClick={handleIconClick}
            disabled={disabled}
            tabIndex={-1}
            className={`absolute top-0 right-0 flex h-full items-center px-3 ${disabled ? "cursor-not-allowed opacity-50" : "hover:text-foreground cursor-pointer"}`}
            aria-label="Open calendar"
          >
            <Calendar className={`h-5 w-5 ${iconColor}`} />
          </button>

          {isOpen && !disabled && (
            <div className="border-default absolute z-50 mt-2 w-80 rounded-lg border bg-white shadow-lg">
              <div className="p-4">
                <div className="mb-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    disabled={isPrevMonthDisabled()}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                      isPrevMonthDisabled()
                        ? "text-muted cursor-not-allowed opacity-40"
                        : "text-muted-foreground hover:bg-surface-100 hover:text-foreground"
                    }`}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div className="font-display text-foreground text-sm font-semibold">
                    {MONTHS[viewMonth]} {viewYear}
                  </div>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="text-muted-foreground hover:bg-surface-100 hover:text-foreground flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {DAYS.map((day) => (
                    <div
                      key={day}
                      className="text-muted-foreground text-center text-xs font-medium"
                    >
                      {day}
                    </div>
                  ))}
                  {calendarDays.map(
                    ({ date, isCurrentMonth, dateString }, index) => {
                      const isSelected = dateString === value
                      const isToday = dateString === todayString
                      const isDisabled = isDateDisabled(dateString)

                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() =>
                            !isDisabled && handleDateSelect(dateString)
                          }
                          disabled={isDisabled}
                          className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm ${
                            isDisabled
                              ? "text-muted cursor-not-allowed opacity-40"
                              : isSelected
                                ? "bg-brand-50 text-brand-700 font-semibold transition-colors"
                                : isToday && isCurrentMonth
                                  ? "border-brand-300 text-brand-600 hover:bg-surface-100 border font-medium transition-colors"
                                  : isCurrentMonth
                                    ? "text-foreground hover:bg-surface-100 transition-colors"
                                    : "text-muted hover:bg-surface-50 transition-colors"
                          }`}
                        >
                          {date.getDate()}
                        </button>
                      )
                    },
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        {validationError && (
          <p className={`mt-2 text-sm ${messageColor}`}>{validationError}</p>
        )}
      </div>
    )
  },
)

DatePicker.displayName = "DatePicker"
