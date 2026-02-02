import { Clock } from "lucide-react"
import type { ChangeEvent, FocusEvent, KeyboardEvent } from "react"
import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

const ITEM_HEIGHT = 40

interface TimePickerProps {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  disabled?: boolean
  format?: "12h" | "24h"
}

function generateHours24(): string[] {
  const hours: string[] = []
  for (let i = 0; i < 24; i++) {
    hours.push(i.toString().padStart(2, "0"))
  }
  return hours
}

function generateHours12(): string[] {
  const hours: string[] = []
  for (let i = 1; i <= 12; i++) {
    hours.push(i.toString().padStart(2, "0"))
  }
  return hours
}

function generateMinutes(): string[] {
  const minutes: string[] = []
  for (let i = 0; i < 60; i++) {
    minutes.push(i.toString().padStart(2, "0"))
  }
  return minutes
}

function formatTimeForDisplay(
  timeString: string,
  format: "12h" | "24h" = "12h",
): string {
  if (!timeString) return ""
  const [hours, minutes] = timeString.split(":")
  const hour = parseInt(hours)

  if (format === "24h") {
    return `${hours}:${minutes}`
  }

  const period = hour >= 12 ? "PM" : "AM"
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${displayHour}:${minutes} ${period}`
}

function formatTimeForEditing(
  timeString: string,
  format: "12h" | "24h",
): string {
  if (!timeString) return ""
  return formatTimeForDisplay(timeString, format)
}

function getCurrentTime(): string {
  const now = new Date()
  const hours = now.getHours().toString().padStart(2, "0")
  const minutes = now.getMinutes().toString().padStart(2, "0")
  return `${hours}:${minutes}`
}

function parseTimeInput(input: string): string | null {
  if (!input?.trim()) return null

  const trimmed = input.trim().toLowerCase()

  const pattern24Hour = /^([0-2]?[0-9]):?([0-5][0-9])$/
  const match24 = pattern24Hour.exec(trimmed)
  if (match24) {
    const hours = parseInt(match24[1])
    const minutes = parseInt(match24[2])

    if (hours >= 24 || minutes >= 60) return null

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
  }

  const pattern12Hour = /^(\d{1,2}):?(\d{2})?\s*(am?|pm?)?$/i
  const match12 = pattern12Hour.exec(trimmed)
  if (match12) {
    let hours = parseInt(match12[1])
    const minutes = match12[2] ? parseInt(match12[2]) : 0
    const period = match12[3] ? match12[3].toLowerCase() : null

    if (hours < 1 || hours > 12) {
      if (hours >= 0 && hours < 24 && !period) {
        return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
      }
      return null
    }

    if (minutes >= 60) return null

    if (period) {
      if (period.startsWith("p") && hours !== 12) {
        hours += 12
      } else if (period.startsWith("a") && hours === 12) {
        hours = 0
      }
    } else {
      if (hours !== 12) {
        const now = new Date()
        const currentHour = now.getHours()
        if (currentHour >= 12) {
          hours += 12
        }
      }
    }

    if (hours >= 24) hours = hours - 24

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
  }

  const compactPattern = /^(\d{1,4})\s*(am?|pm?)?$/i
  const compactMatch = compactPattern.exec(trimmed)
  if (compactMatch) {
    const digits = compactMatch[1]
    const period = compactMatch[2] ? compactMatch[2].toLowerCase() : null

    let hours: number, minutes: number

    if (digits.length <= 2) {
      hours = parseInt(digits)
      minutes = 0
    } else if (digits.length === 3) {
      hours = parseInt(digits[0])
      minutes = parseInt(digits.substring(1))
    } else {
      hours = parseInt(digits.substring(0, 2))
      minutes = parseInt(digits.substring(2))
    }

    if (period) {
      if (hours < 1 || hours > 12) return null
      if (period.startsWith("p") && hours !== 12) {
        hours += 12
      } else if (period.startsWith("a") && hours === 12) {
        hours = 0
      }
    } else {
      if (hours >= 24) return null
    }

    if (minutes >= 60) return null
    if (hours >= 24) return null

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
  }

  return null
}

function validateTime(timeString: string | null): {
  valid: boolean
  error?: string
} {
  if (!timeString) {
    return { valid: false, error: "Please enter a valid time" }
  }

  const [hours, minutes] = timeString.split(":").map((s) => parseInt(s))

  if (isNaN(hours) || isNaN(minutes)) {
    return { valid: false, error: "Invalid time format" }
  }

  if (hours < 0 || hours >= 24) {
    return { valid: false, error: "Hours must be between 0 and 23" }
  }

  if (minutes < 0 || minutes >= 60) {
    return { valid: false, error: "Minutes must be between 0 and 59" }
  }

  return { valid: true }
}

export const TimePicker = forwardRef<HTMLInputElement, TimePickerProps>(
  (
    { label, value, onChange, error, disabled, format: initialFormat = "12h" },
    ref,
  ) => {
    const [isOpen, setIsOpen] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [inputValue, setInputValue] = useState("")
    const [format, setFormat] = useState<"12h" | "24h">(initialFormat)
    const [period, setPeriod] = useState<"AM" | "PM">("AM")
    const [validationError, setValidationError] = useState<string | undefined>(
      error,
    )
    const dropdownRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const hourListRef = useRef<HTMLDivElement>(null)
    const minuteListRef = useRef<HTMLDivElement>(null)
    const hasInitializedRef = useRef(false)

    const currentTime = getCurrentTime()
    const displayValue = value || currentTime
    const [selectedHour24, selectedMinute] = displayValue.split(":")

    const selectedHour24Int = parseInt(selectedHour24)
    const selectedHour12 =
      selectedHour24Int === 0
        ? "12"
        : selectedHour24Int > 12
          ? (selectedHour24Int - 12).toString().padStart(2, "0")
          : selectedHour24

    const selectedHour = format === "24h" ? selectedHour24 : selectedHour12

    useEffect(() => {
      setValidationError(error)
    }, [error])

    useEffect(() => {
      if (!isEditing) {
        setInputValue(value ? formatTimeForDisplay(value, format) : "")
      }
    }, [value, format, isEditing])

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
      if (isOpen) {
        const hour24Int = parseInt(selectedHour24)
        setPeriod(hour24Int >= 12 ? "PM" : "AM")
      }
    }, [isOpen, selectedHour24])

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

    const hours = useMemo(
      () => (format === "24h" ? generateHours24() : generateHours12()),
      [format],
    )
    const minutes = useMemo(() => generateMinutes(), [])

    const hoursWithDuplicates = useMemo(() => {
      const duplicated = [...hours, ...hours, ...hours]
      return duplicated
    }, [hours])

    const minutesWithDuplicates = useMemo(() => {
      const duplicated = [...minutes, ...minutes, ...minutes]
      return duplicated
    }, [minutes])

    const handleInfiniteScroll = useCallback(
      (container: HTMLDivElement, itemCount: number) => {
        if (!container) return

        const containerHeight = container.clientHeight
        const scrollTop = container.scrollTop
        const middleSetStart = ITEM_HEIGHT * itemCount
        const middleSetEnd = ITEM_HEIGHT * itemCount * 2

        if (scrollTop < ITEM_HEIGHT * 2) {
          container.scrollTo({
            top: middleSetStart + scrollTop,
            behavior: "auto",
          })
        } else if (
          scrollTop >
          middleSetEnd - containerHeight - ITEM_HEIGHT * 2
        ) {
          container.scrollTo({
            top: middleSetStart + (scrollTop - middleSetEnd),
            behavior: "auto",
          })
        }
      },
      [],
    )

    useEffect(() => {
      if (
        isOpen &&
        hourListRef.current &&
        minuteListRef.current &&
        !hasInitializedRef.current
      ) {
        hasInitializedRef.current = true

        const hourToScroll = selectedHour
        const minuteToScroll = selectedMinute

        const hourIndex = hours.findIndex((h) => h === hourToScroll)
        if (hourIndex !== -1 && hourListRef.current) {
          const middleSetIndex = hours.length + hourIndex
          const containerHeight = hourListRef.current.clientHeight
          const scrollPosition =
            middleSetIndex * ITEM_HEIGHT - containerHeight / 2 + ITEM_HEIGHT / 2
          hourListRef.current.scrollTo({
            top: scrollPosition,
            behavior: "auto",
          })
        }

        const minuteIndex = minutes.findIndex((m) => m === minuteToScroll)
        if (minuteIndex !== -1 && minuteListRef.current) {
          const middleSetIndex = minutes.length + minuteIndex
          const containerHeight = minuteListRef.current.clientHeight
          const scrollPosition =
            middleSetIndex * ITEM_HEIGHT - containerHeight / 2 + ITEM_HEIGHT / 2
          minuteListRef.current.scrollTo({
            top: scrollPosition,
            behavior: "auto",
          })
        }
      }

      if (!isOpen) {
        hasInitializedRef.current = false
      }
    }, [isOpen, selectedHour, selectedMinute, hours, minutes])

    const handleHourSelect = (hour: string) => {
      let hourInt = parseInt(hour)

      if (format === "12h") {
        if (period === "PM" && hourInt !== 12) {
          hourInt += 12
        } else if (period === "AM" && hourInt === 12) {
          hourInt = 0
        }
      }

      const hour24 = hourInt.toString().padStart(2, "0")
      const newValue = `${hour24}:${selectedMinute}`
      onChange(newValue)
      setValidationError(undefined)
    }

    const handleMinuteSelect = (minute: string) => {
      const newValue = `${selectedHour24}:${minute}`
      onChange(newValue)
      setValidationError(undefined)
    }

    const handlePeriodChange = (newPeriod: "AM" | "PM") => {
      setPeriod(newPeriod)

      let hour24Int = parseInt(selectedHour24)

      if (newPeriod === "PM" && hour24Int < 12) {
        hour24Int += 12
      } else if (newPeriod === "AM" && hour24Int >= 12) {
        hour24Int -= 12
      }

      const newValue = `${hour24Int.toString().padStart(2, "0")}:${selectedMinute}`
      onChange(newValue)
      setValidationError(undefined)
    }

    const handleHourScroll = useCallback(() => {
      if (hourListRef.current) {
        handleInfiniteScroll(hourListRef.current, hours.length)
      }
    }, [hours.length, handleInfiniteScroll])

    const handleMinuteScroll = useCallback(() => {
      if (minuteListRef.current) {
        handleInfiniteScroll(minuteListRef.current, minutes.length)
      }
    }, [minutes.length, handleInfiniteScroll])

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value)
      setValidationError(undefined)
    }

    const handleInputFocus = (e: FocusEvent<HTMLInputElement>) => {
      setIsEditing(true)
      if (value) {
        setInputValue(formatTimeForEditing(value, format))
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

      const parsedTime = parseTimeInput(inputValue)
      const validation = validateTime(parsedTime)

      if (validation.valid && parsedTime) {
        onChange(parsedTime)
        setValidationError(undefined)
        setIsEditing(false)
      } else {
        setValidationError(validation.error)
        setInputValue(value ? formatTimeForDisplay(value, format) : "")
        setIsEditing(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault()
        inputRef.current?.blur()
      } else if (e.key === "Escape") {
        e.preventDefault()
        setInputValue(value ? formatTimeForDisplay(value, format) : "")
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

    const handleFormatChange = (newFormat: "12h" | "24h") => {
      setFormat(newFormat)
      if (!isEditing && value) {
        setInputValue(formatTimeForDisplay(value, newFormat))
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
            placeholder="Select time"
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
            aria-label="Open time picker"
          >
            <Clock className={`h-5 w-5 ${iconColor}`} />
          </button>

          {isOpen && !disabled && (
            <div className="border-default absolute z-50 mt-2 w-80 rounded-lg border bg-white shadow-lg">
              <div className="p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="font-display text-foreground text-lg font-semibold">
                    {formatTimeForDisplay(displayValue, format)}
                  </div>
                  <div className="bg-surface-100 flex shrink-0 items-center gap-1 rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() => handleFormatChange("12h")}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                        format === "12h"
                          ? "text-brand-700 bg-white shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      12h
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFormatChange("24h")}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                        format === "24h"
                          ? "text-brand-700 bg-white shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      24h
                    </button>
                  </div>
                </div>

                <div
                  className={`grid gap-3 ${format === "24h" ? "grid-cols-2" : "grid-cols-3"}`}
                >
                  <div>
                    <div className="text-muted-foreground mb-2 text-center text-xs font-semibold tracking-wide uppercase">
                      Hour
                    </div>
                    <div className="relative">
                      <div
                        ref={hourListRef}
                        onScroll={handleHourScroll}
                        className="scrollbar-hide border-default max-h-48 overflow-y-auto rounded-lg border"
                        style={{ scrollBehavior: "auto" }}
                      >
                        {hoursWithDuplicates.map((hour, index) => {
                          const isSelected = hour === selectedHour
                          return (
                            <button
                              key={`hour-${index}`}
                              type="button"
                              data-scroll-item
                              data-value={hour}
                              onClick={() => handleHourSelect(hour)}
                              className={`flex h-10 w-full items-center justify-center px-3 text-sm transition-none ${
                                isSelected
                                  ? "bg-brand-50 text-brand-700 font-semibold"
                                  : "text-foreground hover:bg-surface-100 opacity-60"
                              }`}
                            >
                              {hour}
                            </button>
                          )
                        })}
                      </div>
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white to-transparent" />
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" />
                    </div>
                  </div>

                  <div>
                    <div className="text-muted-foreground mb-2 text-center text-xs font-semibold tracking-wide uppercase">
                      Minute
                    </div>
                    <div className="relative">
                      <div
                        ref={minuteListRef}
                        onScroll={handleMinuteScroll}
                        className="scrollbar-hide border-default max-h-48 overflow-y-auto rounded-lg border"
                        style={{ scrollBehavior: "auto" }}
                      >
                        {minutesWithDuplicates.map((minute, index) => {
                          const isSelected = minute === selectedMinute
                          return (
                            <button
                              key={`minute-${index}`}
                              type="button"
                              data-scroll-item
                              data-value={minute}
                              onClick={() => handleMinuteSelect(minute)}
                              className={`flex h-10 w-full items-center justify-center px-3 text-sm transition-none ${
                                isSelected
                                  ? "bg-brand-50 text-brand-700 font-semibold"
                                  : "text-foreground hover:bg-surface-100 opacity-60"
                              }`}
                            >
                              {minute}
                            </button>
                          )
                        })}
                      </div>
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white to-transparent" />
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" />
                    </div>
                  </div>

                  {format === "12h" && (
                    <div>
                      <div className="text-muted-foreground mb-2 text-center text-xs font-semibold tracking-wide uppercase">
                        AM/PM
                      </div>
                      <div className="relative">
                        <div className="border-default flex flex-col gap-1 rounded-lg border p-1">
                          <button
                            type="button"
                            onClick={() => handlePeriodChange("AM")}
                            className={`flex h-10 w-full items-center justify-center rounded text-xs font-medium transition-none ${
                              period === "AM"
                                ? "bg-brand-50 text-brand-700 font-semibold"
                                : "text-foreground hover:bg-surface-100 opacity-60"
                            }`}
                          >
                            AM
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePeriodChange("PM")}
                            className={`flex h-10 w-full items-center justify-center rounded text-xs font-medium transition-none ${
                              period === "PM"
                                ? "bg-brand-50 text-brand-700 font-semibold"
                                : "text-foreground hover:bg-surface-100 opacity-60"
                            }`}
                          >
                            PM
                          </button>
                        </div>
                      </div>
                    </div>
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

TimePicker.displayName = "TimePicker"
