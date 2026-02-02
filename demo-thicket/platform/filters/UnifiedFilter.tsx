import { ChevronDown, type LucideIcon, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import {
  FILTER_BADGE_BASE,
  FILTER_BUTTON_BASE,
  FILTER_CLEAR_BUTTON,
  FILTER_DROPDOWN_BASE,
  FILTER_DROPDOWN_WIDTHS,
  FILTER_OPTION_BASE,
  FILTER_OPTION_SELECTED,
  FILTER_OPTION_UNSELECTED,
} from "./filterConstants"
import type {
  BadgeDisplay,
  DisplayMode,
  DropdownWidth,
  FilterMode,
  FilterOption,
} from "./types"

interface UnifiedFilterProps<T> {
  mode: FilterMode
  showBadge?: BadgeDisplay
  displayMode?: DisplayMode
  icon: LucideIcon
  label: string
  value: T | T[] | null
  options: FilterOption<T>[]
  onChange: (value: T | T[] | null) => void
  allLabel?: string
  clearLabel?: string
  truncateLength?: number
  dropdownWidth?: DropdownWidth
  compact?: boolean
  renderCustomBadge?: (count: number) => React.ReactNode
  renderCustomOption?: (
    option: FilterOption<T>,
    isSelected: boolean,
    handleSelect: () => void
  ) => React.ReactNode
}

export function UnifiedFilter<T extends string | number>({
  mode,
  showBadge = "count",
  displayMode = "dropdown",
  icon: Icon,
  label,
  value,
  options,
  onChange,
  allLabel = "All",
  clearLabel = "Clear Filter",
  truncateLength,
  dropdownWidth = "md",
  compact: _compact = false,
  renderCustomBadge,
  renderCustomOption,
}: UnifiedFilterProps<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const getBadgeDisplay = (): number | null => {
    if (showBadge === "never") return null

    if (mode === "single") {
      const hasValue = value !== null && value !== undefined
      if (!hasValue) return null
      if (showBadge === "count") return null
      if (showBadge === "always") return 1
    }

    if (mode === "multi") {
      const count = Array.isArray(value) ? value.length : 0
      if (count === 0) return null
      if (showBadge === "count" && count === 1) return null
      return count
    }

    return null
  }

  const getButtonLabel = (): string => {
    if (displayMode === "static") return label
    if (displayMode === "button") return label

    if (mode === "single" && value !== null) {
      const selectedOption = options.find((opt) => opt.value === value)
      return selectedOption?.label || label
    }

    if (mode === "multi" && Array.isArray(value) && value.length > 0) {
      if (value.length === 1) {
        const selectedOption = options.find((opt) => opt.value === value[0])
        return selectedOption?.label || label
      }
      return `${value.length} selected`
    }

    return allLabel
  }

  const handleSingleSelect = (optionValue?: T) => {
    onChange(optionValue ?? null)
    setIsOpen(false)
  }

  const handleMultiSelect = (optionValue: T) => {
    const currentValues = Array.isArray(value) ? value : []
    const newValues = currentValues.includes(optionValue)
      ? currentValues.filter((v) => v !== optionValue)
      : [...currentValues, optionValue]

    onChange(newValues.length > 0 ? newValues : null)
  }

  const handleClear = () => {
    onChange(null)
    setIsOpen(false)
  }

  const isOptionSelected = (optionValue: T): boolean => {
    if (mode === "single") {
      return value === optionValue
    }
    if (mode === "multi") {
      return Array.isArray(value) && value.includes(optionValue)
    }
    return false
  }

  const hasActiveFilter =
    mode === "single"
      ? value !== null
      : Array.isArray(value) && value.length > 0

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

  const badgeCount = getBadgeDisplay()
  const buttonLabel = getButtonLabel()
  const dropdownWidthClass = FILTER_DROPDOWN_WIDTHS[dropdownWidth]

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={FILTER_BUTTON_BASE}
      >
        <Icon className="h-4 w-4" strokeWidth={2.5} />
        <span
          className={truncateLength ? "truncate" : ""}
          style={truncateLength ? { maxWidth: `${truncateLength}px` } : undefined}
        >
          {buttonLabel}
        </span>
        {badgeCount !== null &&
          (renderCustomBadge ? (
            renderCustomBadge(badgeCount)
          ) : (
            <span className={FILTER_BADGE_BASE}>{badgeCount}</span>
          ))}
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          strokeWidth={2.5}
        />
      </button>

      {isOpen && (
        <div className={`${FILTER_DROPDOWN_BASE} ${dropdownWidthClass}`}>
          <div className="max-h-80 overflow-y-auto p-3">
            <div className={mode === "multi" ? "space-y-2" : "space-y-1"}>
              {mode === "single" && (
                <button
                  onClick={() => handleSingleSelect()}
                  className={`${FILTER_OPTION_BASE} ${
                    !value ? FILTER_OPTION_SELECTED : FILTER_OPTION_UNSELECTED
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={2.5} />
                  <span className="text-sm font-medium">{allLabel}</span>
                </button>
              )}

              {options.map((option) => {
                const isSelected = isOptionSelected(option.value)
                const OptionIcon = option.icon || Icon

                if (renderCustomOption) {
                  return (
                    <div key={String(option.value)}>
                      {renderCustomOption(option, isSelected, () => {
                        if (mode === "single") {
                          handleSingleSelect(option.value)
                        } else {
                          handleMultiSelect(option.value)
                        }
                      })}
                    </div>
                  )
                }

                if (mode === "multi") {
                  return (
                    <label
                      key={String(option.value)}
                      className={`${FILTER_OPTION_BASE} cursor-pointer ${
                        isSelected ? FILTER_OPTION_SELECTED : FILTER_OPTION_UNSELECTED
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleMultiSelect(option.value)}
                        className="accent-brand-600 border-default focus:ring-brand-300 h-4 w-4 rounded transition-colors"
                      />
                      <span className="text-sm font-medium">{option.label}</span>
                    </label>
                  )
                }

                return (
                  <button
                    onClick={() => handleSingleSelect(option.value)}
                    key={String(option.value)}
                    className={`${FILTER_OPTION_BASE} ${
                      isSelected ? FILTER_OPTION_SELECTED : FILTER_OPTION_UNSELECTED
                    }`}
                  >
                    <OptionIcon className="h-4 w-4 shrink-0" strokeWidth={2.5} />
                    <span className="text-sm font-medium line-clamp-2">
                      {option.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {hasActiveFilter && (
            <div className="border-default border-t p-3">
              <button onClick={handleClear} className={FILTER_CLEAR_BUTTON}>
                <X className="h-4 w-4" />
                {clearLabel}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
