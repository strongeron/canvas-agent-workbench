import { Check, ChevronDown } from "lucide-react"
import { useEffect, useRef, useState } from "react"

interface SelectOption {
  value: string
  label: string
}

interface SelectOptGroup {
  label: string
  options: SelectOption[]
}

interface SelectProps {
  label: string
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  options?: SelectOption[]
  optgroups?: SelectOptGroup[]
  error?: string
  success?: string
  warning?: string
  hideLabel?: boolean
  disabled?: boolean
  placeholder?: string
  className?: string
  name?: string
}

export function Select({
  label,
  value: controlledValue,
  defaultValue = "",
  onChange,
  options = [],
  optgroups = [],
  error,
  success,
  warning,
  hideLabel = false,
  disabled = false,
  placeholder = "Select an option",
  className = "",
  name,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [internalValue, setInternalValue] = useState(defaultValue)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const isControlled = controlledValue !== undefined
  const currentValue = isControlled ? controlledValue : internalValue

  const hasError = !!error
  const hasSuccess = !!success && !error
  const hasWarning = !!warning && !error && !success

  const parsedOptions: SelectOption[] = []
  const parsedOptgroups: SelectOptGroup[] = []

  const allOptions = options.length > 0 ? options : parsedOptions
  const allOptgroups = optgroups.length > 0 ? optgroups : parsedOptgroups
  const hasOptgroups = allOptgroups.length > 0

  const findOptionLabel = (val: string): string => {
    if (!val) return placeholder
    const option = allOptions.find((opt) => opt.value === val)
    if (option) return option.label
    for (const group of allOptgroups) {
      const groupOption = group.options.find((opt) => opt.value === val)
      if (groupOption) return groupOption.label
    }
    return val
  }

  const selectedLabel = findOptionLabel(currentValue)

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
      return () => {
        document.removeEventListener("mousedown", handleClickOutside)
      }
    }
  }, [isOpen])

  const handleSelect = (value: string) => {
    if (!isControlled) {
      setInternalValue(value)
    }
    onChange?.(value)
    setIsOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      setIsOpen(!isOpen)
    } else if (e.key === "Escape") {
      setIsOpen(false)
    }
  }

  const borderClass = hasError
    ? "border-error"
    : hasSuccess
      ? "border-success"
      : hasWarning
        ? "border-warning"
        : "border-default hover:border-strong"

  const message = error ?? success ?? warning
  const messageColor = hasError
    ? "text-error"
    : hasSuccess
      ? "text-success"
      : "text-warning"

  const labelColor = "text-muted-foreground"
  const bgColor = "bg-white"
  const textColor = "text-foreground"
  const disabledStyles = disabled
    ? "bg-surface-100 text-disabled cursor-not-allowed"
    : ""

  return (
    <div className="w-full">
      <label
        className={`${
          hideLabel ? "sr-only" : `mb-2 block text-sm font-medium ${labelColor}`
        }`}
      >
        {label}
      </label>
      {name && <input type="hidden" name={name} value={currentValue} />}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={`flex h-11 w-full appearance-none items-center rounded-lg px-4 pr-10 text-left text-base ${bgColor} border ${textColor} placeholder:text-muted focus:ring-brand-300 focus:border-brand-300 transition-all duration-200 focus:ring-1 focus:outline-none ${disabledStyles} ${borderClass} ${className}`}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span
            className={`block truncate ${currentValue ? "" : "text-muted"}`}
            title={selectedLabel}
          >
            {selectedLabel}
          </span>
        </button>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <ChevronDown
            className={`text-muted h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </div>

        {isOpen && !disabled && (
          <div className="border-default absolute z-50 mt-1 w-full rounded-lg border bg-white shadow-lg">
            <ul
              className="max-h-60 overflow-auto py-1"
              role="listbox"
              aria-label={label}
            >
              {!hasOptgroups &&
                allOptions.map((option) => (
                  <li key={option.value}>
                    <button
                      type="button"
                      onClick={() => handleSelect(option.value)}
                      className={`flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-base transition-colors duration-150 outline-none ${
                        currentValue === option.value
                          ? "bg-brand-50 text-brand-700 font-medium"
                          : "text-foreground hover:bg-brand-50/50"
                      }`}
                      role="option"
                      aria-selected={currentValue === option.value}
                      title={option.label}
                    >
                      <span className="truncate">{option.label}</span>
                      {currentValue === option.value && (
                        <Check className="text-brand-600 h-4 w-4 flex-shrink-0" />
                      )}
                    </button>
                  </li>
                ))}

              {hasOptgroups &&
                allOptgroups.map((group, groupIndex) => (
                  <li key={groupIndex}>
                    {groupIndex > 0 && (
                      <div className="border-default mx-2 my-1 border-t" />
                    )}
                    <div className="text-muted-foreground px-4 py-2 text-xs font-semibold tracking-wide uppercase">
                      {group.label}
                    </div>
                    <ul>
                      {group.options.map((option) => (
                        <li key={option.value}>
                          <button
                            type="button"
                            onClick={() => handleSelect(option.value)}
                            className={`flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-base transition-colors duration-150 outline-none ${
                              currentValue === option.value
                                ? "bg-brand-50 text-brand-700 font-medium"
                                : "text-foreground hover:bg-brand-50/50"
                            }`}
                            role="option"
                            aria-selected={currentValue === option.value}
                            title={option.label}
                          >
                            <span className="truncate">{option.label}</span>
                            {currentValue === option.value && (
                              <Check className="text-brand-600 h-4 w-4 flex-shrink-0" />
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </div>
      {message && <p className={`mt-2 text-sm ${messageColor}`}>{message}</p>}
    </div>
  )
}

Select.displayName = "Select"
